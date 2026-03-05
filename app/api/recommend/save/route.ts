import { NextRequest, NextResponse } from 'next/server'
import { saveRecommendation, getUserById, createUserFromJwt } from '@/lib/resultStore'
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
    const body = await req.json() as { sessionToken?: string; result?: RecommendResult & { id?: string } }
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

    // 若服务端内存 Map 重启后为空（clientHash 路径登录场景），
    // 从 JWT payload 重建最小用户对象写回，确保其他依赖内存的操作不出错
    if (!getUserById(payload.userId)) {
      createUserFromJwt(payload.userId, payload.username)
    }

    // 验证结果数据
    if (!result || !result.catProfile) {
      return NextResponse.json(
        { error: '推荐结果格式不正确' },
        { status: 400 }
      )
    }

    // 确保 result 有 id（前端已注入，此处兜底自生）
    if (!result.id) {
      result.id = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
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
