'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { LoginModal } from './LoginModal'
import { SignupModal } from './SignupModal'
import type { AuthResponse } from '@/types/auth'

interface StoredUser {
  username: string
  nickname?: string
}

/**
 * 全站导航认证区（PRD §14）
 * 未登录：单按钮"登录/注册"，默认打开登录弹窗
 * 已登录：用户名（→ /profile）+ 退出按钮
 * mounted 状态防 SSR/CSR 水合不一致
 */
export function AuthNav() {
  const [user, setUser] = useState<StoredUser | null>(null)
  const [modal, setModal] = useState<'login' | 'signup' | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const raw = localStorage.getItem('user')
    if (raw) {
      try { setUser(JSON.parse(raw)) } catch { /* ignore */ }
    }
  }, [])

  function handleLogout() {
    localStorage.removeItem('sessionToken')
    localStorage.removeItem('user')
    setUser(null)
  }

  function handleAuthSuccess(res: AuthResponse) {
    localStorage.setItem('sessionToken', res.sessionToken)
    localStorage.setItem('user', JSON.stringify(res.user))
    setUser(res.user)
    setModal(null)
  }

  // SSR 占位，避免服务端/客户端渲染不一致
  if (!mounted) return <div className="w-24 h-8" />

  if (user) {
    return (
      <div className="flex items-center gap-1">
        <Link
          href="/profile"
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[14px] text-[#78746C] hover:text-[#E8721A] transition-colors"
        >
          <span className="w-7 h-7 bg-[#FFD9B5] rounded-full flex items-center justify-center text-sm shrink-0">
            🐾
          </span>
          <span className="max-w-[72px] truncate hidden sm:inline">
            {user.nickname || user.username}
          </span>
        </Link>
        <button
          onClick={handleLogout}
          className="px-2 py-1.5 rounded-lg text-[13px] text-[#A8A49C] hover:text-[#E8721A] transition-colors"
        >
          退出
        </button>
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => setModal('login')}
        className="px-3 py-1.5 rounded-lg text-[14px] font-medium border border-[#E8721A] text-[#E8721A] hover:bg-[#E8721A] hover:text-white transition-all duration-150"
      >
        登录/注册
      </button>

      {modal === 'login' && (
        <LoginModal
          onSuccess={handleAuthSuccess}
          onSwitchToSignup={() => setModal('signup')}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'signup' && (
        <SignupModal
          onSuccess={handleAuthSuccess}
          onSwitchToLogin={() => setModal('login')}
          onClose={() => setModal(null)}
        />
      )}
    </>
  )
}
