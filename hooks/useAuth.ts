'use client'

import { useState, useEffect, useCallback } from 'react'

// ─── 类型 ────────────────────────────────────────────────
export interface AuthUser {
  username: string
  nickname?: string
  email?: string
}

export interface UseAuthReturn {
  user: AuthUser | null
  sessionToken: string | null
  isLoggedIn: boolean
  /** 登录：将 user 与 token 写入 localStorage */
  login: (user: AuthUser, token: string) => void
  /** 退出登录：清除 user、token，可选清空推荐缓存 */
  logout: () => void
  /** 是否已完成初始化（避免 SSR 与 hydration 不一致） */
  initialized: boolean
}

// localStorage key 常量
const USER_KEY = 'user'
const TOKEN_KEY = 'sessionToken'
const CREDENTIALS_KEY = 'nutrapaw_user_auth'

/**
 * useAuth —— 集中管理登录态
 *
 * 读写 localStorage 中的 user / sessionToken；
 * 所有页面通过此 hook 获取用户信息，不再分散 useEffect。
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  // 初始化：从 localStorage 恢复状态（仅在客户端执行）
  useEffect(() => {
    try {
      const rawUser = localStorage.getItem(USER_KEY)
      const rawToken = localStorage.getItem(TOKEN_KEY)
      if (rawUser) setUser(JSON.parse(rawUser) as AuthUser)
      if (rawToken) setSessionToken(rawToken)
    } catch {
      // localStorage 不可用或数据损坏时静默忽略
    } finally {
      setInitialized(true)
    }
  }, [])

  const login = useCallback((newUser: AuthUser, token: string) => {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(newUser))
      localStorage.setItem(TOKEN_KEY, token)
    } catch { /* ignore */ }
    setUser(newUser)
    setSessionToken(token)
  }, [])

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(USER_KEY)
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(CREDENTIALS_KEY)
    } catch { /* ignore */ }
    setUser(null)
    setSessionToken(null)
  }, [])

  return {
    user,
    sessionToken,
    isLoggedIn: !!user && !!sessionToken,
    login,
    logout,
    initialized,
  }
}
