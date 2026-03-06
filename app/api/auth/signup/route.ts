import { NextRequest, NextResponse } from 'next/server'
import { createUser } from '@/lib/resultStore'
import { generateSessionToken, getTokenExpirySeconds } from '@/lib/auth'
import { validateSignupForm } from '@/lib/validators'
import type { AuthResponse } from '@/types/auth'

/**
 * 用户注册端点
 * POST /api/auth/signup
 *
 * 请求体：
 * {
 *   "username": "user123",
 *   "email": "user@example.com",
 *   "password": "password123",
 *   "nickname": "张三" (可选)
 * }
 *
 * 响应：
 * {
 *   "success": true,
 *   "user": { ... },
 *   "sessionToken": "...",
 *   "expiresIn": 604800
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      username: string
      email: string
      password: string
      nickname?: string
    }
    const { username, email, password, nickname } = body

    // 表单验证
    const validationError = validateSignupForm(username, email, password, nickname)
    if (validationError) {
      return NextResponse.json(
        { error: validationError.message },
        { status: 400 }
      )
    }

    // 创建用户
    const user = await createUser(username, email, password, nickname)
    if (!user) {
      return NextResponse.json(
        { error: '用户名或邮箱已被注册' },
        { status: 409 } // Conflict
      )
    }

    // 生成 session token
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
    console.error('[signup API error]', err)
    const message = err instanceof Error ? err.message : '注册失败'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
