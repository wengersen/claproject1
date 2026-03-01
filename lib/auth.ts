import jwt from 'jsonwebtoken'
import bcryptjs from 'bcryptjs'
import type { JWTPayload } from '@/types/auth'

/**
 * 认证模块
 * 提供 JWT token 生成、密码加密等功能
 */

const JWT_SECRET = process.env.JWT_SECRET || 'nutrapaw-dev-secret-key-change-in-production'
const TOKEN_EXPIRY = '7d' // 7 天

/**
 * 密码加密
 * 使用 bcryptjs，salt rounds = 10
 */
export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, 10)
}

/**
 * 验证密码
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash)
}

/**
 * 生成 JWT session token
 */
export function generateSessionToken(userId: string, username: string): string {
  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    userId,
    username,
    type: 'session',
  }

  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY })
}

/**
 * 验证 JWT token
 * @returns 如果有效，返回 payload；否则返回 null
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload
    return payload
  } catch {
    return null
  }
}

/**
 * 获取 token 的过期时间（秒）
 * 默认 7 天 = 604800 秒
 */
export function getTokenExpirySeconds(): number {
  return 7 * 24 * 60 * 60 // 7 days in seconds
}
