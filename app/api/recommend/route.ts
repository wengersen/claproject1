import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { filterCandidates } from '@/lib/catfoods'
import type { RecommendRequest, CatFood, FeedingGuide, CatProfile, LifeStage } from '@/types/cat'
import type { SlimProductRecommendation, SlimRecommendResult } from '@/lib/productMap'
import { calcAgeMonthsFromBirthday } from '@/lib/formatters'
import { detectConflicts } from '@/lib/conflictDetector'

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
  timeout: 120_000,   // SDK 层 120s（保底）
  maxRetries: 0,      // 禁用自动重试，避免双倍超时
})

// ─── 喂食克数计算 ────────────────────────────────────────
function calcDailyGrams(
  weightKg: number,
  ageMonths: number,
  neutered: boolean,
  calories: number
): { base: number; min: number; max: number } {
  if (calories <= 0) return { base: 0, min: 0, max: 0 }
  const coeff = ageMonths < 12 ? 110 : ageMonths >= 84 ? 50 : neutered ? 55 : 65
  const base = Math.round((weightKg * coeff) / calories * 100)
  return { base, min: Math.round(base * 0.9), max: Math.round(base * 1.1) }
}

// ─── feedingGuide 确定性模板 ─────────────────────────────
function buildFeedingGuideTemplate(ageStage: LifeStage): {
  frequency: string
  suitablePeriod: string
  transitionTip: string
} {
  switch (ageStage) {
    case 'kitten':
      return {
        frequency: '每日 3-4 次，少量多餐',
        suitablePeriod: '适合 2-12 月龄幼猫使用',
        transitionTip: '建议用 7-10 天逐步过渡：前 3 天新粮占 25%，中间 3 天占 50%，最后逐步增至 100%',
      }
    case 'senior':
      return {
        frequency: '每日 2-3 次，定时定量',
        suitablePeriod: '适合 7 岁以上老年猫长期使用',
        transitionTip: '老年猫肠胃较敏感，建议用 10-14 天缓慢过渡，每次只增加约 20% 新粮比例',
      }
    default: // adult
      return {
        frequency: '每日 2 次，早晚各一次',
        suitablePeriod: '适合 1-7 岁成年猫长期使用',
        transitionTip: '建议用 7-10 天逐步过渡：前 3 天新粮占 25%，中间 3 天占 50%，最后逐步增至 100%',
      }
  }
}

// ─── SSE 工具函数 ─────────────────────────────────────────
function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

// ─── 流式 JSON 对象提取器 ─────────────────────────────────
// LLM 输出 { "dryFood": [ {item}, {item} ], "wetFood": [ {item} ] }
// 我们要实时提取 depth=2 的子对象（即数组中的 {} 推荐项）。
class StreamingJsonExtractor {
  private depth = 0
  private inString = false
  private escapeNext = false
  private itemStart = -1
  private pos = 0  // 全局字符位置
  private itemBuffer = ''  // 当前正在捕获的子对象的字符

  /** 追加新文本，返回本轮提取到的完整 JSON 对象字符串数组（depth=2 的子对象） */
  feed(chunk: string): string[] {
    const results: string[] = []
    for (const ch of chunk) {
      this.pos++

      // 处理字符串内的转义
      if (this.escapeNext) {
        this.escapeNext = false
        if (this.itemStart >= 0) this.itemBuffer += ch
        continue
      }
      if (ch === '\\' && this.inString) {
        this.escapeNext = true
        if (this.itemStart >= 0) this.itemBuffer += ch
        continue
      }
      if (ch === '"') {
        this.inString = !this.inString
        if (this.itemStart >= 0) this.itemBuffer += ch
        continue
      }
      if (this.inString) {
        if (this.itemStart >= 0) this.itemBuffer += ch
        continue
      }

      // 非字符串区域
      if (ch === '{') {
        this.depth++
        // depth 刚进入 2 = 数组中的一个推荐对象开始
        if (this.depth === 2) {
          this.itemStart = this.pos
          this.itemBuffer = '{'
          continue
        }
      } else if (ch === '}') {
        this.depth--
        // depth 从 2 回到 1 = 一个推荐对象结束
        if (this.depth === 1 && this.itemStart >= 0) {
          this.itemBuffer += '}'
          results.push(this.itemBuffer)
          this.itemStart = -1
          this.itemBuffer = ''
          continue
        }
      }

      if (this.itemStart >= 0) this.itemBuffer += ch
    }
    return results
  }
}

// ─── 系统提示 ────────────────────────────────────────────
const SYSTEM_PROMPT = `你是一位专业的猫咪营养顾问。根据猫咪信息和候选产品，进行智能排序并生成个性化推荐。

规则：
1. 只能从候选列表推荐，严禁创造产品
2. highlights 3-4个关键词，每个3-5字
3. warnings 注意事项，无则空数组
4. 主粮最多4款，罐头最多3款
5. dryFood 每项包含 personalNote：针对该猫的喂食注意事项（1-2句）
6. 严格输出JSON，不要多余文字

输出格式：
{
  "dryFood": [
    {
      "productId": "产品ID",
      "rank": 1,
      "highlights": ["亮点1", "亮点2", "亮点3"],
      "warnings": [],
      "personalNote": "针对该猫的个性化喂食注意事项（1-2句）"
    }
  ],
  "wetFood": [
    {
      "productId": "产品ID",
      "rank": 1,
      "highlights": ["亮点1", "亮点2"],
      "warnings": []
    }
  ]
}`

// ─── 主路由 ──────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const t0 = Date.now()
  const log = (msg: string) => console.log(`[recommend] ${msg} +${Date.now() - t0}ms`)

  // ── 1. 解析请求 ──────────────────────────────────────
  let body: RecommendRequest
  try {
    body = await req.json() as RecommendRequest
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 })
  }

  const { catProfile, healthTags, customInput } = body

  if (!catProfile || !healthTags || healthTags.length === 0) {
    return NextResponse.json({ error: '参数不完整' }, { status: 400 })
  }

  if (!process.env.DEEPSEEK_API_KEY) {
    return NextResponse.json({ error: '服务配置错误：缺少 DEEPSEEK_API_KEY' }, { status: 500 })
  }

  // ── 2. 需求冲突检测（优先客观数据） ─────────────────
  const conflictResult = detectConflicts(catProfile, healthTags)
  const effectiveTags = conflictResult.correctedTags
  if (conflictResult.hasConflicts) {
    log(`conflicts detected: ${conflictResult.conflicts.map(c => c.type).join(', ')}`)
    log(`tags corrected: [${healthTags.join(',')}] → [${effectiveTags.join(',')}]`)
  }

  // ── 3. 数据库筛选（使用纠偏后的标签） ───────────────
  const { dryFoods, wetFoods } = filterCandidates(catProfile, effectiveTags)
  log(`filterCandidates done — dry:${dryFoods.length} wet:${wetFoods.length}`)

  if (dryFoods.length === 0 && wetFoods.length === 0) {
    return NextResponse.json({ error: '暂无匹配产品' }, { status: 404 })
  }

  const userMessage = buildUserMessage(catProfile, effectiveTags, customInput, dryFoods, wetFoods)
  log(`userMessage built — ${userMessage.length} chars`)

  // ── 3. 创建 SSE 流 ───────────────────────────────────
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(sseEvent(event, data)))
        } catch { /* client disconnected */ }
      }

      // 立即推送 progress:start（融入猫名增加情绪价值）
      const name = catProfile.name || '你的猫咪'
      send('progress', { step: 'start', message: `正在分析 ${name} 的营养需求...` })

      // 如有冲突，立即推送冲突事件（让前端在推荐加载前就能展示提示）
      if (conflictResult.hasConflicts) {
        send('conflicts', {
          conflicts: conflictResult.conflicts,
          correctedTags: conflictResult.correctedTags,
          originalTags: conflictResult.originalTags,
        })
      }

      try {
        // ── 4. 流式调用 DeepSeek（逐条推送） ──────────
        log('calling DeepSeek streaming...')
        send('progress', { step: 'llm', message: `正在为 ${name} 匹配最佳配方...` })

        const openaiStream = await client.chat.completions.create({
          model: 'deepseek-chat',
          max_tokens: 3000,
          temperature: 0,
          stream: true,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userMessage },
          ],
        })

        // 准备逐条解析所需的上下文
        const productMap = new Map<string, CatFood>(
          [...dryFoods, ...wetFoods].map((f) => [f.id, f])
        )
        const ageMonths = calcAgeMonthsFromBirthday(catProfile.birthday)
        const feedingTemplate = buildFeedingGuideTemplate(catProfile.ageStage as LifeStage)

        type LLMItem = {
          productId: string; rank: number
          highlights: string[]; warnings: string[]
          personalNote?: string
        }

        // 将 LLM 项转为 SlimProductRecommendation 的辅助函数
        const toSlimItem = (item: LLMItem, isDry: boolean): SlimProductRecommendation | null => {
          const product = productMap.get(item.productId)
          if (!product) return null
          let feedingGuide: FeedingGuide | undefined
          if (isDry) {
            const grams = calcDailyGrams(catProfile.weightKg, ageMonths, catProfile.neutered, product.calories)
            feedingGuide = {
              dailyGramsBase: grams.base,
              dailyGramsMin: grams.min,
              dailyGramsMax: grams.max,
              frequency: feedingTemplate.frequency,
              suitablePeriod: feedingTemplate.suitablePeriod,
              transitionTip: feedingTemplate.transitionTip,
              personalNote: item.personalNote || '',
            }
          }
          return {
            productId: item.productId,
            rank: item.rank,
            highlights: item.highlights || [],
            warnings: item.warnings || [],
            feedingGuide,
          }
        }

        // ── 5. 逐 token 接收 + 实时解析 ──────────────
        const extractor = new StreamingJsonExtractor()
        let fullText = ''
        let tokenCount = 0

        // 追踪当前解析到的区域（dryFood / wetFood）
        let currentSection: 'unknown' | 'dryFood' | 'wetFood' = 'unknown'
        const streamedDry: SlimProductRecommendation[] = []
        const streamedWet: SlimProductRecommendation[] = []

        for await (const chunk of openaiStream) {
          const delta = chunk.choices?.[0]?.delta?.content ?? ''
          if (!delta) continue

          fullText += delta
          tokenCount++

          // 进度推送：用已解析的推荐项数量代替 tokens（对用户隐藏技术细节）
          if (tokenCount % 20 === 0) {
            const foundCount = streamedDry.length + streamedWet.length
            const msg = foundCount > 0
              ? `深度评估中，已为 ${name} 筛选 ${foundCount} 款好粮...`
              : `正在为 ${name} 匹配最佳配方...`
            send('progress', { step: 'generating', message: msg, progress: tokenCount })
          }

          // 检测当前区域切换（简单文本匹配）
          if (fullText.includes('"wetFood"') && currentSection !== 'wetFood') {
            currentSection = 'wetFood'
          } else if (fullText.includes('"dryFood"') && currentSection === 'unknown') {
            currentSection = 'dryFood'
          }

          // 尝试从增量文本中提取完整的推荐对象（depth=2 子对象）
          const objects = extractor.feed(delta)
          for (const objStr of objects) {
            try {
              const parsed = JSON.parse(objStr)
              if (!parsed.productId) continue  // 不是推荐项，跳过

              const isDry = currentSection === 'dryFood' || currentSection === 'unknown'
              const slim = toSlimItem(parsed as LLMItem, isDry)
              if (slim) {
                if (isDry && streamedDry.length < 4) {
                  streamedDry.push(slim)
                  send('dry-item', slim)
                  log(`streamed dry-item #${streamedDry.length}: ${slim.productId}`)
                } else if (!isDry && streamedWet.length < 3) {
                  streamedWet.push(slim)
                  send('wet-item', slim)
                  log(`streamed wet-item #${streamedWet.length}: ${slim.productId}`)
                }
              }
            } catch {
              // JSON 解析失败，跳过
            }
          }
        }

        log(`DeepSeek done — tokens: ${tokenCount}`)

        // ── 6. Fallback：如果逐条推送失败，用完整文本重新解析 ──
        if (streamedDry.length === 0 && streamedWet.length === 0) {
          log('streaming parse yielded 0 items, falling back to full-text parse')
          send('progress', { step: 'parsing', message: `方案即将就绪，主人请稍等 ✨` })

          const jsonMatch = fullText.match(/\{[\s\S]*\}/)
          if (!jsonMatch) throw new Error('无法解析推荐结果，请重试')

          type LLMResult = { dryFood: LLMItem[]; wetFood: LLMItem[] }
          const llmResult = JSON.parse(jsonMatch[0]) as LLMResult

          for (const item of (llmResult.dryFood || []).slice(0, 4)) {
            const slim = toSlimItem(item, true)
            if (slim) { streamedDry.push(slim); send('dry-item', slim) }
          }
          for (const item of (llmResult.wetFood || []).slice(0, 3)) {
            const slim = toSlimItem(item, false)
            if (slim) { streamedWet.push(slim); send('wet-item', slim) }
          }
        }

        // ── 7. 推送最终完整结果（前端用于保底 + 存储） ──
        const result: SlimRecommendResult = {
          catProfile,
          healthTags: effectiveTags,                       // 存储纠偏后的标签
          originalHealthTags: conflictResult.hasConflicts  // 有冲突时保留原始标签
            ? conflictResult.originalTags
            : undefined,
          dryFood: streamedDry.sort((a, b) => a.rank - b.rank),
          wetFood: streamedWet.sort((a, b) => a.rank - b.rank),
          generatedAt: new Date().toISOString(),
          disclaimer: '本推荐仅供参考，不构成兽医诊断或治疗建议。若猫咪有明显健康问题，请优先咨询兽医。处方粮需在兽医指导下使用。',
          conflicts: conflictResult.hasConflicts ? conflictResult.conflicts : undefined,
        }

        log(`response ready — dry:${result.dryFood.length} wet:${result.wetFood.length}`)
        send('result', result)
        send('done', { success: true })

      } catch (err) {
        log(`ERROR: ${err instanceof Error ? err.message : String(err)}`)
        console.error('[recommend SSE error]', err)
        const errMsg = err instanceof Error ? err.message : '服务异常，请重试'
        send('error', { message: errMsg })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // 关闭 nginx 缓冲（Vercel 重要）
    },
  })
}

// ─── 辅助函数 ────────────────────────────────────────────
function buildUserMessage(
  catProfile: CatProfile,
  healthTags: string[],
  customInput: string | undefined,
  dryFoods: CatFood[],
  wetFoods: CatFood[]
): string {
  const tagLabels: Record<string, string> = {
    urinary: '泌尿道健康', weight: '体重管理', digest: '消化敏感',
    skin: '皮毛养护', joint: '关节健康', picky: '挑食猫咪',
    allergy: '过敏体质', nutrition: '增重/营养补充',
    senior: '老年猫护理', kitten: '幼猫发育', balanced: '日常均衡',
  }

  // 精简版：只保留 LLM 决策必需的字段，减少 ~45% 输入 token
  const formatFood = (food: CatFood) => {
    return `- ID:${food.id} | ${food.brand} ${food.productName} | ${food.type === 'dry' ? '主粮' : '罐头'}
  磷:${food.phosphorusLevel} 镁:${food.magnesiumLevel} 热量:${food.calories}kcal/100g
  功效:${food.functionalTags.map((t) => tagLabels[t] || t).join('、')}
  价格:¥${food.priceMin}-${food.priceMax}/${food.priceUnit === 'per_kg' ? 'kg' : '罐'}`
  }

  const ageMonths = calcAgeMonthsFromBirthday(catProfile.birthday)
  return `## 猫咪信息
名字: ${catProfile.name}
品种: ${catProfile.breed}
年龄: ${ageMonths}个月（${catProfile.ageStage === 'kitten' ? '幼猫' : catProfile.ageStage === 'adult' ? '成猫' : '老年猫'}）
体重: ${catProfile.weightKg}kg
性别: ${catProfile.gender === 'male' ? '公猫' : '母猫'} | 绝育: ${catProfile.neutered ? '已绝育' : '未绝育'}

## 健康需求
${healthTags.map((t) => tagLabels[t] || t).join('、')}
${customInput ? `用户补充描述: ${customInput}` : ''}

## 候选主粮产品（${dryFoods.length}款）
${dryFoods.map(formatFood).join('\n\n')}

## 候选罐头产品（${wetFoods.length}款）
${wetFoods.map(formatFood).join('\n\n')}

请从候选产品中选出最适合的主粮（最多4款）和罐头（最多3款），按推荐优先级排序并生成个性化推荐理由。`
}