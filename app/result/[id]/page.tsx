'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ProductCard } from '@/components/result/ProductCard'
import { CompareBar } from '@/components/result/CompareBar'
import { CompareModal } from '@/components/result/CompareModal'
import { SignupModal } from '@/components/auth/SignupModal'
import { LoginModal } from '@/components/auth/LoginModal'
import { HEALTH_TAG_CONFIG, type RecommendResult, type ProductRecommendation } from '@/types/cat'
import type { AuthResponse } from '@/types/auth'
import type { Pet } from '@/types/pet'
import { savePet, generateId } from '@/lib/petLocalStore'

type AuthModal = 'signup' | 'login' | null
type PetAddStatus = 'idle' | 'added' | 'error'

export default function ResultPage() {
  const params = useParams()
  const router = useRouter()
  const [result, setResult] = useState<RecommendResult | null>(null)
  const [comparing, setComparing] = useState<ProductRecommendation[]>([])
  const [showModal, setShowModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [authModal, setAuthModal] = useState<AuthModal>(null)
  const [savedUser, setSavedUser] = useState<{ username: string; nickname?: string } | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [petAddStatus, setPetAddStatus] = useState<PetAddStatus>('idle')
  const [addedPetId, setAddedPetId] = useState<string | null>(null)

  useEffect(() => {
    const id = params.id as string
    const stored = localStorage.getItem(`result_${id}`)
    if (!stored) {
      router.push('/recommend')
      return
    }
    try {
      setResult(JSON.parse(stored))
    } catch {
      router.push('/recommend')
    }
    // 检查已登录状态
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try { setSavedUser(JSON.parse(userStr)) } catch { /* ignore */ }
    }
  }, [params.id, router])

  function toggleCompare(rec: ProductRecommendation) {
    setComparing((prev) => {
      const exists = prev.find((r) => r.product.id === rec.product.id)
      if (exists) return prev.filter((r) => r.product.id !== rec.product.id)
      if (prev.length >= 3) return prev // 最多3个
      return [...prev, rec]
    })
  }

  async function handleShare() {
    const url = window.location.href
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function doSaveRecommendation(sessionToken: string) {
    if (!result) return
    setSaveStatus('saving')
    try {
      const res = await fetch('/api/recommend/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken, result }),
      })
      setSaveStatus(res.ok ? 'saved' : 'error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  function handleAuthSuccess(authResponse: AuthResponse) {
    const user = authResponse.user
    setSavedUser({ username: user.username, nickname: user.nickname })
    setAuthModal(null)
    doSaveRecommendation(authResponse.sessionToken)
  }

  function handleSaveClick() {
    if (savedUser) {
      const sessionToken = localStorage.getItem('sessionToken')
      if (sessionToken) doSaveRecommendation(sessionToken)
    } else {
      setAuthModal('signup')
    }
  }

  function handleLogout() {
    localStorage.removeItem('sessionToken')
    localStorage.removeItem('user')
    setSavedUser(null)
    setSaveStatus('idle')
  }

  function handleAddToPetProfile() {
    if (!result) return
    // 检查登录状态（需要 username 作为 localStorage 分区 key）
    const userStr = localStorage.getItem('user')
    if (!userStr) {
      setAuthModal('login')
      return
    }
    try {
      const parsedUser = JSON.parse(userStr) as { username: string }
      const { catProfile } = result
      const now = new Date().toISOString()
      const newPet: Pet = {
        id: generateId(),
        userId: parsedUser.username,
        name: catProfile.name,
        breed: catProfile.breed,
        gender: catProfile.gender,
        neutered: catProfile.neutered,
        ageMonths: catProfile.ageMonths,
        weightKg: catProfile.weightKg,
        resultId: result.id,   // 关联推荐来源，用于档案页"推荐来源"卡片
        createdAt: now,
        updatedAt: now,
      }
      savePet(parsedUser.username, newPet)
      setAddedPetId(newPet.id)
      setPetAddStatus('added')
    } catch {
      setPetAddStatus('error')
      setTimeout(() => setPetAddStatus('idle'), 4000)
    }
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-[#FFF8F3] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-4xl animate-paw-pulse">🐾</div>
          <p className="text-[#78746C]">加载中...</p>
        </div>
      </div>
    )
  }

  const { catProfile, healthTags, dryFood, wetFood, disclaimer } = result

  return (
    <div className="min-h-screen bg-[#FFF8F3]">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-[#FFF8F3]/90 backdrop-blur-md border-b border-[#E8E6E1]">
        <div className="max-w-[900px] mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-[#E8721A] font-bold text-[18px]">
            🐾 NutraPaw
          </Link>
          <div className="flex items-center gap-2">
            {savedUser && (
              <>
                <Link
                  href="/profile"
                  className="text-[13px] text-[#78746C] hover:text-[#E8721A] transition-colors px-3 py-1.5 rounded-lg hover:bg-[#FFF8F3] hidden sm:flex items-center gap-1"
                >
                  👤 {savedUser.nickname || savedUser.username}
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-[12px] text-[#A8A49C] hover:text-[#78746C] transition-colors px-2 py-1.5 rounded-lg"
                >
                  退出
                </button>
              </>
            )}
            <Link
              href="/recommend"
              className="text-[14px] text-[#78746C] hover:text-[#E8721A] transition-colors px-3 py-2 rounded-lg hover:bg-[#FFF8F3]"
            >
              重新评估
            </Link>
            <button
              onClick={handleShare}
              className="text-[14px] text-[#78746C] hover:text-[#E8721A] transition-colors px-3 py-2 rounded-lg hover:bg-[#FFF8F3] flex items-center gap-1.5"
            >
              {copied ? '✓ 已复制' : '🔗 分享'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[900px] mx-auto px-4 py-8 space-y-10 pb-24">
        {/* 猫咪信息摘要栏 */}
        <div className="bg-white border border-[#E8E6E1] rounded-2xl p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-5">
            {/* 猫咪头像 */}
            <div className="w-16 h-16 bg-[#FFD9B5] rounded-full flex items-center justify-center text-3xl shrink-0">
              🐱
            </div>

            {/* 基本信息 */}
            <div className="flex-1">
              <h2 className="text-[22px] font-bold text-[#1A1815]">{catProfile.name} 的专属推荐</h2>
              <p className="text-[14px] text-[#78746C] mt-1">
                {catProfile.breed} · {' '}
                {catProfile.ageMonths < 12
                  ? `${catProfile.ageMonths}个月幼猫`
                  : `${Math.floor(catProfile.ageMonths / 12)}岁`} · {' '}
                {catProfile.weightKg}kg · {' '}
                {catProfile.neutered ? '已绝育' : '未绝育'} · {' '}
                {catProfile.gender === 'male' ? '公猫' : '母猫'}
              </p>

              {/* 健康需求标签 */}
              <div className="flex flex-wrap gap-2 mt-3">
                {healthTags.map((tag) => {
                  const config = HEALTH_TAG_CONFIG[tag]
                  return (
                    <span
                      key={tag}
                      className="bg-[#FFF8F3] border border-[#FFB87A] text-[#9A4208] rounded-full px-3 py-1 text-[12px]"
                    >
                      {config.emoji} {config.label}
                    </span>
                  )
                })}
              </div>
            </div>

            {/* 保存推荐按钮 */}
            <div className="shrink-0 text-center">
              <button
                onClick={handleSaveClick}
                disabled={saveStatus === 'saving' || saveStatus === 'saved'}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-semibold transition-all duration-150 ${
                  saveStatus === 'saved'
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : saveStatus === 'error'
                    ? 'bg-red-50 border border-red-200 text-red-700'
                    : 'bg-[#E8721A] text-white shadow-[0_4px_16px_rgba(232,114,26,0.25)] hover:bg-[#C45C0A] hover:-translate-y-px'
                }`}
              >
                {saveStatus === 'saving' && '保存中...'}
                {saveStatus === 'saved' && '✓ 已保存'}
                {saveStatus === 'error' && '保存失败'}
                {saveStatus === 'idle' && '💾 保存推荐'}
              </button>
              {!savedUser && saveStatus === 'idle' && (
                <p className="text-[11px] text-[#A8A49C] mt-1.5">注册后永久保存</p>
              )}
            </div>
          </div>
        </div>

        {/* ── 加入健康档案横幅（已登录时显示） ── */}
        {savedUser && petAddStatus === 'idle' && (
          <div className="bg-gradient-to-r from-[#FFF8F3] to-[#FFD9B5]/40 border border-[#FFB87A] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <span className="text-2xl shrink-0">📋</span>
              <div>
                <p className="text-[15px] font-semibold text-[#1A1815]">
                  将 {catProfile.name} 加入健康档案
                </p>
                <p className="text-[13px] text-[#78746C] mt-0.5">
                  定期记录健康状态，让 AI 追踪成长变化并给出专属建议
                </p>
              </div>
            </div>
            <button
              onClick={handleAddToPetProfile}
              className="shrink-0 px-5 py-2.5 rounded-xl bg-[#E8721A] text-white text-[14px] font-semibold shadow-[0_4px_16px_rgba(232,114,26,0.2)] hover:bg-[#C45C0A] transition-all whitespace-nowrap"
            >
              加入档案 →
            </button>
          </div>
        )}
        {savedUser && petAddStatus === 'added' && addedPetId && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3 flex-1">
              <span className="text-xl">✅</span>
              <p className="text-[14px] font-semibold text-green-700">
                {catProfile.name} 已加入健康档案！现在可以开始记录日常状态了。
              </p>
            </div>
            <a
              href={`/profile/pets/${addedPetId}`}
              className="shrink-0 px-4 py-2 rounded-xl border border-green-300 text-green-700 text-[13px] font-semibold hover:bg-green-100 transition-colors whitespace-nowrap"
            >
              去查看档案 →
            </a>
          </div>
        )}
        {savedUser && petAddStatus === 'error' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
            <span className="text-amber-500 shrink-0">⚠️</span>
            <p className="text-[13px] text-amber-700">加入档案失败，请稍后重试</p>
          </div>
        )}

        {/* 主粮推荐 */}
        {dryFood.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-5">
              <h2 className="text-[22px] font-bold text-[#1A1815]">主粮推荐</h2>
              <span className="bg-[#F4F3F0] text-[#78746C] rounded-full px-2.5 py-0.5 text-[12px] font-medium">
                {dryFood.length} 款
              </span>
            </div>
            <div className="space-y-4">
              {dryFood.map((rec, i) => (
                <ProductCard
                  key={rec.product.id}
                  recommendation={rec}
                  isTop={i === 0}
                  isComparing={comparing.some((r) => r.product.id === rec.product.id)}
                  onToggleCompare={() => toggleCompare(rec)}
                  layout="horizontal"
                />
              ))}
            </div>
          </section>
        )}

        {/* 罐头推荐 */}
        {wetFood.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-5">
              <h2 className="text-[22px] font-bold text-[#1A1815]">罐头推荐</h2>
              <span className="bg-[#F4F3F0] text-[#78746C] rounded-full px-2.5 py-0.5 text-[12px] font-medium">
                {wetFood.length} 款
              </span>
              <span className="text-[13px] text-[#A8A49C]">可搭配主粮补充水分</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {wetFood.map((rec, i) => (
                <ProductCard
                  key={rec.product.id}
                  recommendation={rec}
                  isTop={i === 0}
                  isComparing={comparing.some((r) => r.product.id === rec.product.id)}
                  onToggleCompare={() => toggleCompare(rec)}
                  layout="vertical"
                />
              ))}
            </div>
          </section>
        )}

        {/* 免责声明 */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex gap-3">
            <span className="text-amber-500 text-xl shrink-0">⚠️</span>
            <div>
              <p className="text-[14px] font-medium text-amber-800 mb-1">温馨提示</p>
              <p className="text-[13px] text-amber-700 leading-relaxed">{disclaimer}</p>
            </div>
          </div>
        </div>

        {/* 再次推荐 CTA */}
        <div className="bg-[#1A1815] rounded-2xl p-7 text-center">
          <h3 className="text-[20px] font-bold text-white mb-2">
            {catProfile.name} 的情况有变化？
          </h3>
          <p className="text-[14px] text-[#A8A49C] mb-5">重新填写信息，获取最新推荐方案</p>
          <Link
            href="/recommend"
            className="inline-flex items-center gap-2 bg-[#E8721A] text-white px-6 py-3 rounded-xl text-[15px] font-semibold shadow-warm hover:bg-[#C45C0A] transition-colors"
          >
            重新评估 →
          </Link>
        </div>
      </main>

      {/* 底部对比浮动栏 */}
      <CompareBar
        comparing={comparing}
        onRemove={(id) => setComparing((prev) => prev.filter((r) => r.product.id !== id))}
        onOpenModal={() => setShowModal(true)}
      />

      {/* 对比弹窗 */}
      {showModal && comparing.length >= 2 && (
        <CompareModal comparing={comparing} onClose={() => setShowModal(false)} />
      )}

      {/* 注册弹窗 */}
      {authModal === 'signup' && (
        <SignupModal
          onSuccess={handleAuthSuccess}
          onSwitchToLogin={() => setAuthModal('login')}
          onClose={() => setAuthModal(null)}
        />
      )}

      {/* 登录弹窗 */}
      {authModal === 'login' && (
        <LoginModal
          onSuccess={handleAuthSuccess}
          onSwitchToSignup={() => setAuthModal('signup')}
          onClose={() => setAuthModal(null)}
        />
      )}
    </div>
  )
}
