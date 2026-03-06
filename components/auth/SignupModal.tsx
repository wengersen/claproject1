'use client'

import { useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import type { AuthResponse } from '@/types/auth'

interface SignupModalProps {
  onSuccess: (authResponse: AuthResponse) => void
  onSwitchToLogin: () => void
  onClose: () => void
}

/** 简单密码强度：返回 0=弱 1=中 2=强 */
function getPasswordStrength(pwd: string): 0 | 1 | 2 {
  if (pwd.length < 6) return 0
  const hasUpper = /[A-Z]/.test(pwd)
  const hasLower = /[a-z]/.test(pwd)
  const hasDigit = /[0-9]/.test(pwd)
  const hasSpecial = /[^A-Za-z0-9]/.test(pwd)
  const score = [hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length
  if (pwd.length >= 10 && score >= 3) return 2
  if (pwd.length >= 6 && score >= 2) return 1
  return 0
}

const STRENGTH_CONFIG = [
  { label: '弱', color: 'bg-red-400', text: 'text-red-500' },
  { label: '中', color: 'bg-amber-400', text: 'text-amber-500' },
  { label: '强', color: 'bg-green-500', text: 'text-green-600' },
] as const

export function SignupModal({ onSuccess, onSwitchToLogin, onClose }: SignupModalProps) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, nickname }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '注册失败，请重试')
        return
      }

      // 注册成功后由父组件的 onSuccess → useAuth.login 统一写入 localStorage
      onSuccess(data as AuthResponse)
    } catch {
      setError('网络错误，请检查连接后重试')
    } finally {
      setLoading(false)
    }
  }

  const modal = (
    // 遮罩层 —— 通过 createPortal 挂到 body，避免 nav backdrop-blur 破坏 fixed 定位
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* 弹窗主体：SignupModal 字段较多，加 my-8 保证小屏可滚动 */}
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[420px] p-6 md:p-8 relative animate-slide-up my-8">
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
          <h2 className="text-[22px] font-bold text-[#1A1815]">保存你的推荐</h2>
          <p className="text-[14px] text-[#78746C] mt-1.5">
            注册后可保存推荐记录、建立猫咪健康档案
          </p>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 用户名 */}
          <div>
            <label className="block text-[13px] font-semibold text-[#4A4641] mb-1.5">
              用户名 <span className="text-[#E8721A]">*</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="3-20位英文字母、数字或下划线"
              className="w-full border border-[#E8E6E1] rounded-xl px-4 py-3 text-[15px] text-[#1A1815] placeholder-[#D1CEC7] focus:outline-none focus:border-[#E8721A] focus:ring-4 focus:ring-[#E8721A]/10 transition-all"
              required
              disabled={loading}
            />
          </div>

          {/* 邮箱 */}
          <div>
            <label className="block text-[13px] font-semibold text-[#4A4641] mb-1.5">
              邮箱 <span className="text-[#E8721A]">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full border border-[#E8E6E1] rounded-xl px-4 py-3 text-[15px] text-[#1A1815] placeholder-[#D1CEC7] focus:outline-none focus:border-[#E8721A] focus:ring-4 focus:ring-[#E8721A]/10 transition-all"
              required
              disabled={loading}
            />
          </div>

          {/* 密码 + 实时强度提示 */}
          <div>
            <label className="block text-[13px] font-semibold text-[#4A4641] mb-1.5">
              密码 <span className="text-[#E8721A]">*</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少6位"
              className="w-full border border-[#E8E6E1] rounded-xl px-4 py-3 text-[15px] text-[#1A1815] placeholder-[#D1CEC7] focus:outline-none focus:border-[#E8721A] focus:ring-4 focus:ring-[#E8721A]/10 transition-all"
              required
              minLength={6}
              disabled={loading}
            />
            {/* 密码强度指示器（仅有内容时显示） */}
            {password.length > 0 && (() => {
              const strength = getPasswordStrength(password)
              const cfg = STRENGTH_CONFIG[strength]
              return (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex gap-1 flex-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-200 ${
                          i <= strength ? cfg.color : 'bg-[#E8E6E1]'
                        }`}
                      />
                    ))}
                  </div>
                  <span className={`text-[12px] font-medium shrink-0 ${cfg.text}`}>
                    {cfg.label}
                  </span>
                </div>
              )
            })()}
          </div>

          {/* 昵称（可选） */}
          <div>
            <label className="block text-[13px] font-semibold text-[#4A4641] mb-1.5">
              昵称
              <span className="text-[#A8A49C] font-normal ml-1">（可选）</span>
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="如：橘子妈妈"
              className="w-full border border-[#E8E6E1] rounded-xl px-4 py-3 text-[15px] text-[#1A1815] placeholder-[#D1CEC7] focus:outline-none focus:border-[#E8721A] focus:ring-4 focus:ring-[#E8721A]/10 transition-all"
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

          {/* 注册按钮 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#E8721A] text-white font-semibold py-3.5 rounded-xl text-[15px] shadow-[0_4px_24px_rgba(232,114,26,0.25)] hover:bg-[#C45C0A] hover:shadow-[0_6px_32px_rgba(232,114,26,0.35)] hover:-translate-y-px active:bg-[#9A4208] disabled:bg-[#D1CEC7] disabled:cursor-not-allowed transition-all duration-150"
          >
            {loading ? '注册中...' : '立即注册并保存推荐'}
          </button>
        </form>

        {/* 切换登录 */}
        <p className="text-center text-[13px] text-[#78746C] mt-5">
          已有账号？{' '}
          <button
            onClick={onSwitchToLogin}
            className="text-[#E8721A] font-semibold hover:underline"
          >
            登录
          </button>
        </p>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
