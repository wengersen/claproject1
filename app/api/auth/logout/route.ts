import { NextRequest, NextResponse } from 'next/server'

/**
 * 用户登出端点
 * POST /api/auth/logout
 *
 * 注意：在 JWT 系统中，服务器端无需做任何操作。
 * 客户端只需删除本地的 sessionToken 即可。
 * 此端点主要用于记录日志和清理服务器端资源（如需）。
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sessionToken } = body

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'sessionToken is required' },
        { status: 400 }
      )
    }

    // 可选：在这里记录登出事件
    console.log('[logout] User logged out')

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[logout API error]', err)
    const message = err instanceof Error ? err.message : '登出失败'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
