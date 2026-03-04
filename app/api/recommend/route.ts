import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { filterCandidates } from '@/lib/catfoods'
import type { RecommendRequest, RecommendResult, ProductRecommendation, CatFood, FeedingGuide, CatProfile } from '@/types/cat'
import { generateResultId, calcAgeMonthsFromBirthday } from '@/lib/formatters'

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
})

// 服务端喂食克数计算（不依赖 LLM，公式驱动）
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

// 系统提示 — 防幻觉核心指令
const SYSTEM_PROMPT = `你是一位专业的猫咪营养顾问。你的任务是从用户提供的候选猫粮产品列表中，根据猫咪的具体信息和健康需求，进行智能排序并生成个性化推荐理由。

重要规则：
1. 你只能从我提供的候选产品列表中推荐，严禁自行创造或添加任何不在列表中的产品
2. 推荐理由必须用通俗易懂的中文，避免晦涩的专业术语
3. 每条推荐理由2-3句话，聚焦于"为什么这款产品特别适合这只猫"
4. highlights 是成分/功效关键词，3-4个，简短（3-5字每个）
5. warnings 是注意事项，如无则为空数组
6. dryFood 每项必须包含 feedingGuide 字段（见格式说明）
7. 输出严格按照要求的 JSON 格式，不要添加任何额外文字

输出格式（JSON）：
{
  "dryFood": [
    {
      "productId": "产品ID",
      "rank": 1,
      "reason": "推荐理由（2-3句）",
      "highlights": ["亮点1", "亮点2", "亮点3"],
      "warnings": ["注意事项（如有）"],
      "feedingGuide": {
        "frequency": "每日喂食次数和时间安排，如'每日2-3次，早中晚各一次'",
        "suitablePeriod": "该产品适合使用的阶段和时长，如'成猫全年期均可长期使用'",
        "transitionTip": "换粮过渡建议，如'建议7-10天完成过渡，逐步增加新粮比例'",
        "personalNote": "针对该猫具体情况的个性化注意事项，1-2句"
      }
    }
  ],
  "wetFood": [
    {
      "productId": "产品ID",
      "rank": 1,
      "reason": "推荐理由",
      "highlights": ["亮点1", "亮点2"],
      "warnings": []
    }
  ]
}`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as RecommendRequest
    const { catProfile, healthTags, customInput } = body

    // 参数验证
    if (!catProfile || !healthTags || healthTags.length === 0) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 })
    }

    // Layer 1：数据库硬筛选
    const { dryFoods, wetFoods } = filterCandidates(catProfile, healthTags)

    if (dryFoods.length === 0 && wetFoods.length === 0) {
      return NextResponse.json({ error: '暂无匹配产品' }, { status: 404 })
    }

    // 构建用户请求消息
    const userMessage = buildUserMessage(catProfile, healthTags, customInput, dryFoods, wetFoods)

    // Layer 2：LLM 智能排序 + 理由生成
    const message = await client.chat.completions.create({
      model: 'deepseek-chat',
      max_tokens: 3500,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    })

    const rawText = message.choices[0]?.message?.content
    if (!rawText) {
      throw new Error('LLM 返回格式异常')
    }

    // 解析 LLM 返回的 JSON
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('无法解析推荐结果')
    }

    const llmResult = JSON.parse(jsonMatch[0]) as {
      dryFood: Array<{
        productId: string
        rank: number
        reason: string
        highlights: string[]
        warnings: string[]
        feedingGuide?: {
          frequency: string
          suitablePeriod: string
          transitionTip: string
          personalNote: string
        }
      }>
      wetFood: Array<{
        productId: string
        rank: number
        reason: string
        highlights: string[]
        warnings: string[]
      }>
    }

    // 构建最终结果（合并数据库数据 + LLM 输出）
    const productMap = new Map<string, CatFood>(
      [...dryFoods, ...wetFoods].map((f) => [f.id, f])
    )

    const ageMonths = calcAgeMonthsFromBirthday(catProfile.birthday)

    const mapRecommendations = (items: typeof llmResult.dryFood, isDry: boolean): ProductRecommendation[] =>
      items
        .flatMap((item): ProductRecommendation[] => {
          const product = productMap.get(item.productId)
          if (!product) return []

          let feedingGuide: FeedingGuide | undefined
          if (isDry && item.feedingGuide) {
            const grams = calcDailyGrams(catProfile.weightKg, ageMonths, catProfile.neutered, product.calories)
            feedingGuide = {
              dailyGramsBase: grams.base,
              dailyGramsMin: grams.min,
              dailyGramsMax: grams.max,
              frequency: item.feedingGuide.frequency,
              suitablePeriod: item.feedingGuide.suitablePeriod,
              transitionTip: item.feedingGuide.transitionTip,
              personalNote: item.feedingGuide.personalNote,
            }
          }

          return [{
            product,
            rank: item.rank,
            reason: item.reason,
            highlights: item.highlights || [],
            warnings: item.warnings || [],
            feedingGuide,
          }]
        })
        .sort((a, b) => a.rank - b.rank)
        .slice(0, 5)

    const result: RecommendResult = {
      id: generateResultId(),
      catProfile,
      healthTags,
      dryFood: mapRecommendations(llmResult.dryFood || [], true),
      wetFood: mapRecommendations(llmResult.wetFood || [], false),
      generatedAt: new Date().toISOString(),
      disclaimer:
        '本推荐仅供参考，不构成兽医诊断或治疗建议。若猫咪有明显健康问题，请优先咨询兽医。处方粮需在兽医指导下使用。',
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('[recommend API error]', err)
    const message = err instanceof Error ? err.message : '服务异常'
    return NextResponse.json({ error: message }, { status: 500 })
  }
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
    urinary: '泌尿道健康',
    weight: '体重管理',
    digest: '消化敏感',
    skin: '皮毛养护',
    joint: '关节健康',
    picky: '挑食猫咪',
    allergy: '过敏体质',
    nutrition: '增重/营养补充',
    senior: '老年猫护理',
    kitten: '幼猫发育',
    balanced: '日常均衡',
  }

  const formatFood = (food: CatFood) =>
    `- ID: ${food.id}
  产品: ${food.brand} ${food.productName}
  类型: ${food.type === 'dry' ? '主粮' : '罐头'} | 品牌档位: ${food.brandTier}
  蛋白质来源: ${food.proteinSource.join('、')}
  无谷物: ${food.grainFree ? '是' : '否'}
  磷含量: ${food.phosphorusLevel} | 镁含量: ${food.magnesiumLevel}
  热量: ${food.calories} kcal/100g
  功效标签: ${food.functionalTags.map((t) => tagLabels[t] || t).join('、')}
  价格: ¥${food.priceMin}-${food.priceMax}/${food.priceUnit === 'per_kg' ? 'kg' : '罐'}
  备注: ${food.notes || '无'}`

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

请根据以上猫咪信息，从候选产品中选出最适合的主粮（3-5款）和罐头（2-3款），按推荐优先级排序，并生成个性化推荐理由。`
}
