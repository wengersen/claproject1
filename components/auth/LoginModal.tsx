'use client'

import { useState } from 'react'
import type { AuthResponse } from '@/types/auth'

interface LoginModalProps {
  onSuccess: (authResponse: AuthResponse) => void
  onSwitchToSignup: () => void
  onClose: () => void
}

export function LoginModal({ onSuccess, onSwitchToSignup, onClose }: LoginModalProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '登录失败，请重试')
        return
      }

      // 保存 sessionToken 到 localStorage
      localStorage.setItem('sessionToken', data.sessionToken)
      localStorage.setItem('user', JSON.stringify(data.user))

      onSuccess(data as AuthResponse)
    } catch {
      setError('网络错误，请检查连接后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    // 遮罩层
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* 弹窗主体 */}
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-[420px] p-8 relative animate-slide-up">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#A8A49C] hover:text-[#4A4641] transition-colors text-xl leading-none"
          aria-label="关闭"
        >
          ✕
        </button>

        {/* 头部 */}
        <div className="text-center mb-7">
          <div className="text-4xl mb-3">🐾</div>
          <h2 className="text-[22px] font-bold text-[#1A1815]">欢迎回来</h2>
          <p className="text-[14px] text-[#78746C] mt-1.5">
            登录后查看你的推荐历史
          </p>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 用户名 */}
          <div>
            <label className="block text-[13px] font-semibold text-[#4A4641] mb-1.5">
              用户名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="你的用户名"
              className="w-full border border-[#E8E6E1] rounded-xl px-4 py-3 text-[15px] text-[#1A1815] placeholder-[#D1CEC7] focus:outline-none focus:border-[#E8721A] focus:ring-4 focus:ring-[#E8721A]/10 transition-all"
              required
              disabled={loading}
            />
          </div>

          {/* 密码 */}
          <div>
            <label className="block text-[13px] font-semibold text-[#4A4641] mb-1.5">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="你的密码"
              className="w-full border border-[#E8E6E1] rounded-xl px-4 py-3 text-[15px] text-[#1A1815] placeholder-[#D1CEC7] focus:outline-none focus:border-[#E8721A] focus:ring-4 focus:ring-[#E8721A]/10 transition-all"
              required
              disabled={loading}
            />
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
              <span className="text-red-500 shrink-0 mt-0.5">⚠️</span>
              <p className="text-[13px] text-red-700">{error}</p>
            </div>
          )}

          {/* 登录按钮 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#E8721A] text-white font-semibold py-3.5 rounded-xl text-[15px] shadow-[0_4px_24px_rgba(232,114,26,0.25)] hover:bg-[#C45C0A] hover:shadow-[0_6px_32px_rgba(232,114,26,0.35)] hover:-translate-y-px active:bg-[#9A4208] disabled:bg-[#D1CEC7] disabled:cursor-not-allowed transition-all duration-150"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        {/* 切换注册 */}
        <p className="text-center text-[13px] text-[#78746C] mt-5">
          还没有账号？{' '}
          <button
            onClick={onSwitchToSignup}
            className="text-[#E8721A] font-semibold hover:underline"
          >
            立即注册
          </button>
        </p>
      </div>
    </div>
  )
}
