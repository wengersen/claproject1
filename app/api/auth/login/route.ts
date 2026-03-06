import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/resultStore'
import { generateSessionToken, getTokenExpirySeconds } from '@/lib/auth'
import { validateLoginForm } from '@/lib/validators'
import type { AuthResponse } from '@/types/auth'

/**
 * 用户登录端点
 * POST /api/auth/login
 *
 * 请求体：
 * { "username": "user123", "password": "password123" }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      username: string
      password: string
    }
    const { username, password } = body

    // 表单验证（用户名/密码格式）
    const validationError = validateLoginForm(username, password)
    if (validationError) {
      return NextResponse.json({ error: validationError.message }, { status: 400 })
    }

    const user = await authenticateUser(username, password)
    if (!user) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 })
    }

    const sessionToken = generateSessionToken(user.id, user.username)
    const expiresIn = getTokenExpirySeconds()

    const response: AuthResponse = {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        nickname: user.nickname,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      sessionToken,
      expiresIn,
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('[login API error]', err)
    const message = err instanceof Error ? err.message : '登录失败'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}