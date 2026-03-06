import { NextResponse } from 'next/server'

/**
 * 用户登出端点
 * POST /api/auth/logout
 *
 * JWT 系统中服务端无需做任何操作，客户端清除 localStorage 即可。
 * 此路由仅作占位保留，供未来接入服务端 token 黑名单或审计日志使用。
 * 当前客户端通过 useAuth.logout() 直接清除本地存储，不调用此端点。
 */
export async function POST() {
  return NextResponse.json({ success: true })
}