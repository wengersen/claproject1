import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/resultStore'
import { comparePassword, generateSessionToken, getTokenExpirySeconds } from '@/lib/auth'
import { validateLoginForm } from '@/lib/validators'
import type { AuthResponse } from '@/types/auth'

/**
 * 用户登录端点
 * POST /api/auth/login
 *
 * 请求体（标准）：
 * { "username": "user123", "password": "password123" }
 *
 * 请求体（客户端凭证路径，跨 Vercel Redeploy 免重注册）：
 * {
 *   "username": "user123",
 *   "password": "password123",
 *   "clientHash": "<bcrypt hash stored in localStorage>",
 *   "clientId": "<user id>",
 *   "clientNickname": "昵称",
 *   "clientEmail": "email@example.com",
 *   "clientCreatedAt": "ISO 8601 timestamp"
 * }
 *
 * 说明：clientHash 由注册时服务端返回并存入 localStorage。
 * 登录时客户端直接带上 hash，服务端做 bcrypt.compare 即可，
 * 无需查询 Map（Map 在 Redeploy 后已清空也不影响登录）。
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      username: string
      password: string
      clientHash?: string
      clientId?: string
      clientNickname?: string
      clientEmail?: string
      clientCreatedAt?: string
    }
    const {
      username,
      password,
      clientHash,
      clientId,
      clientNickname,
      clientEmail,
      clientCreatedAt,
    } = body

    // 表单验证（用户名/密码格式）
    const validationError = validateLoginForm(username, password)
    if (validationError) {
      return NextResponse.json({ error: validationError.message }, { status: 400 })
    }

    if (clientHash) {
      // ── 客户端凭证路径：直接用 localStorage 中保存的 hash 验证 ──
      const isValid = await comparePassword(password, clientHash)
      if (!isValid) {
        return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 })
      }
      const now = new Date().toISOString()
      const userId = clientId ?? username
      const sessionToken = generateSessionToken(userId, username)
      const expiresIn = getTokenExpirySeconds()
      const response: AuthResponse = {
        success: true,
        user: {
          id: userId,
          username,
          email: clientEmail ?? '',
          nickname: clientNickname ?? username,
          createdAt: clientCreatedAt ?? now,
          updatedAt: now,
        },
        sessionToken,
        expiresIn,
      }
      return NextResponse.json(response)
    }

    // ── 服务端 Map 路径（新注册 / Redeploy 前仍有 Map 数据时） ──
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
