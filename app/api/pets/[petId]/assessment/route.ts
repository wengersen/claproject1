/**
 * POST /api/pets/[petId]/assessment
 * 触发 AI 健康评估（带 48h 缓存）
 * 使用最近 10 条日志生成分析
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import {
  isPetOwner,
  getPetById,
  getRecentLogs,
  getCachedAssessment,
  setAssessment,
} from '@/lib/petStore'
import type { HealthAssessment, HealthStatus } from '@/types/pet'

function getTokenFromRequest(req: NextRequest): string | null {
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  return null
}

const APPETITE_ZH: Record<string, string> = {
  excellent: '良好', normal: '一般', poor: '差',
}
const ENERGY_ZH: Record<string, string> = {
  active: '活跃', normal: '正常', lethargic: '萎靡',
}
const DRINKING_ZH: Record<string, string> = {
  lots: '偏多', normal: '正常', little: '偏少',
}
const STOOL_ZH: Record<string, string> = {
  normal: '正常', loose: '稀软', hard: '干硬', no_info: '不明',
}
const VOMITING_ZH: Record<string, string> = {
  none: '无', occasional: '偶尔', frequent: '频繁',
}

export async function POST(
  req: NextRequest,
  { params }: { params: { petId: string } }
) {
  const token = getTokenFromRequest(req)
  if (!token) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const payload = verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Token 已过期' }, { status: 401 })

  const { petId } = params
  if (!isPetOwner(petId, payload.userId)) {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  // 返回有效缓存
  const cached = getCachedAssessment(petId)
  if (cached) return NextResponse.json({ assessment: cached })

  const pet = getPetById(petId)
  if (!pet) return NextResponse.json({ error: '宠物不存在' }, { status: 404 })

  const logs = getRecentLogs(petId, 10)
  if (logs.length === 0) {
    return NextResponse.json({ error: '暂无健康记录，请先记录至少一次状态' }, { status: 400 })
  }

  // 构建日志描述
  const logsDesc = logs
    .map((l) =>
      `- ${l.date}：` +
      (l.weightKg ? `体重 ${l.weightKg}kg，` : '') +
      `食欲${APPETITE_ZH[l.appetite]}，精神${ENERGY_ZH[l.energy]}，` +
      `饮水${DRINKING_ZH[l.drinking]}，大便${STOOL_ZH[l.stool]}，` +
      `呕吐${VOMITING_ZH[l.vomiting]}` +
      (l.notes ? `，备注：${l.notes}` : '')
    )
    .join('\n')

  const ageYears = Math.floor(pet.ageMonths / 12)
  const ageStr = ageYears > 0 ? `${ageYears}岁${pet.ageMonths % 12 > 0 ? `${pet.ageMonths % 12}个月` : ''}` : `${pet.ageMonths}个月`

  const prompt = `你是一位专业的猫咪营养师和健康顾问。以下是一只猫咪的健康记录，请为主人提供专业分析。

猫咪信息：
- 名字：${pet.name}
- 品种：${pet.breed}
- 月龄：${ageStr}（${pet.ageMonths}个月）
- 性别：${pet.gender === 'male' ? '公猫' : '母猫'}，${pet.neutered ? '已绝育' : '未绝育'}
- 基准体重：${pet.weightKg}kg

最近 ${logs.length} 条健康记录（从新到旧）：
${logsDesc}

请综合分析，以 JSON 格式返回以下字段（只返回 JSON，不要其他文字）：
{
  "overallStatus": "excellent|good|attention|concern",
  "summary": "一句话总结（20字以内）",
  "keyFindings": ["发现1", "发现2"],
  "dietaryAdvice": "针对性饮食建议（50-100字）",
  "careTips": ["护理建议1", "护理建议2"]
}

评估标准：
- excellent：各项指标均优秀，无需调整
- good：整体良好，有一两项轻微关注点
- attention：有明显需要改善的指标，建议调整喂养方式
- concern：多项指标异常，建议尽快咨询兽医`

  // 调用 DeepSeek API
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: '服务配置错误，请联系管理员' }, { status: 500 })
  }

  let assessmentData: Omit<HealthAssessment, 'id' | 'petId' | 'generatedAt' | 'expiresAt'>

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 600,
        temperature: 0.3,
      }),
    })

    const data = await response.json()
    const content: string = data.choices?.[0]?.message?.content ?? ''

    // 解析 JSON 响应
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('无法解析 AI 响应')

    const parsed = JSON.parse(jsonMatch[0]) as {
      overallStatus: HealthStatus
      summary: string
      keyFindings: string[]
      dietaryAdvice: string
      careTips: string[]
    }

    assessmentData = {
      basedOnLogs: logs.length,
      overallStatus: parsed.overallStatus ?? 'good',
      summary: parsed.summary ?? '健康状态分析完成',
      keyFindings: Array.isArray(parsed.keyFindings) ? parsed.keyFindings : [],
      dietaryAdvice: parsed.dietaryAdvice ?? '',
      careTips: Array.isArray(parsed.careTips) ? parsed.careTips : [],
    }
  } catch {
    // AI 调用失败时返回基础评估
    assessmentData = {
      basedOnLogs: logs.length,
      overallStatus: 'good',
      summary: '评估生成暂时失败，请稍后重试',
      keyFindings: ['AI 分析服务暂时不可用'],
      dietaryAdvice: '请稍后重新生成评估',
      careTips: [],
    }
  }

  const assessment = setAssessment(petId, assessmentData)
  return NextResponse.json({ assessment })
}
