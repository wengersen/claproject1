import { NextRequest, NextResponse } from 'next/server'
import { saveRecommendation } from '@/lib/resultStore'
import { verifyToken } from '@/lib/auth'
import type { RecommendResult } from '@/types/cat'

/**
 * 保存推荐结果到用户档案
 * POST /api/recommend/save
 *
 * 请求体：
 * {
 *   "sessionToken": "jwt_token_here",
 *   "result": { RecommendResult 对象 }
 * }
 *
 * 响应：
 * {
 *   "success": true,
 *   "message": "推荐已保存"
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sessionToken, result } = body

    // 验证 token
    if (!sessionToken) {
      return NextResponse.json(
        { error: '未授权：需要登录' },
        { status: 401 }
      )
    }

    const payload = verifyToken(sessionToken)
    if (!payload) {
      return NextResponse.json(
        { error: '无效或过期的 token' },
        { status: 401 }
      )
    }

    // 验证结果数据
    if (!result || !result.id) {
      return NextResponse.json(
        { error: '推荐结果格式不正确' },
        { status: 400 }
      )
    }

    // 保存推荐
    const success = await saveRecommendation(payload.userId, result as RecommendResult)
    if (!success) {
      return NextResponse.json(
        { error: '保存失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '推荐已保存到您的档案',
    })
  } catch (err) {
    console.error('[recommend/save API error]', err)
    const message = err instanceof Error ? err.message : '保存失败'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
