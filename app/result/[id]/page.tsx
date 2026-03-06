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
import type { ConflictItem } from '@/lib/conflictDetector'
import { formatAgeFromBirthday } from '@/lib/formatters'
import type { AuthResponse } from '@/types/auth'
import type { Pet } from '@/types/pet'
import { getPets, savePet, generateId, setCurrentMainFood } from '@/lib/petLocalStore'
import { useAuth } from '@/hooks/useAuth'

type AuthModal = 'signup' | 'login' | null
type PetAddStatus = 'idle' | 'added' | 'error'
// 未登录时点"加入档案"的 pending 意图标记
type PendingAction = 'addPet' | null
// 对比上限 toast 显示状态
type CompareToast = 'hidden' | 'visible'



export default function ResultPage() {
  const params = useParams()
  const router = useRouter()
  // resultId = URL 中的 id 参数，也是 localStorage key 的后缀
  const resultId = params.id as string
  const { user: savedUser, sessionToken, logout, login } = useAuth()
  const [result, setResult] = useState<RecommendResult | null>(null)
  const [comparing, setComparing] = useState<ProductRecommendation[]>([])
  const [showModal, setShowModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [authModal, setAuthModal] = useState<AuthModal>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [petAddStatus, setPetAddStatus] = useState<PetAddStatus>('idle')
  const [addedPetId, setAddedPetId] = useState<string | null>(null)
  const [linkedPet, setLinkedPet] = useState<Pet | null>(null)
  const [setFoodConfirm, setSetFoodConfirm] = useState<ProductRecommendation | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [notFound, setNotFound] = useState(false)
  const [compareToast, setCompareToast] = useState<CompareToast>('hidden')

  useEffect(() => {
    const stored = localStorage.getItem(`result_${resultId}`)
    if (!stored) {
      // 数据不在本地（他人分享链接，或已清除缓存）
      // 显示友好提示，不强制 redirect
      setNotFound(true)
      return
    }
    try {
      setResult(JSON.parse(stored))
    } catch {
      setNotFound(true)
    }
  }, [resultId, router])

  function toggleCompare(rec: ProductRecommendation) {
    setComparing((prev) => {
      const exists = prev.find((r) => r.product.id === rec.product.id)
      if (exists) return prev.filter((r) => r.product.id !== rec.product.id)
      if (prev.length >= 3) {
        // 已满3个：显示 toast 提示
        setCompareToast('visible')
        setTimeout(() => setCompareToast('hidden'), 2500)
        return prev
      }
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
      if (res.ok) {
        setSaveStatus('saved')
        // saved 状态永久保留，不再自动复位为 idle
      } else {
        setSaveStatus('error')
        setTimeout(() => setSaveStatus('idle'), 3000)
      }
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  function handleAuthSuccess(authResponse: AuthResponse) {
    const { username, nickname, email } = authResponse.user
    // 同步登录态到 useAuth（写入 localStorage + 更新 React state）
    login({ username, nickname, email }, authResponse.sessionToken)
    setAuthModal(null)
    // 保存推荐
    doSaveRecommendation(authResponse.sessionToken)
    // 处理登录前的 pending 意图（如：加入档案）
    if (pendingAction === 'addPet') {
      setPendingAction(null)
      doAddToPetProfile(username)
    }
  }

  function handleSaveClick() {
    if (savedUser && sessionToken) {
      doSaveRecommendation(sessionToken)
    } else {
      setAuthModal('login')
    }
  }

  function handleLogout() {
    logout()
    setSaveStatus('idle')
  }

  function handleSetAsMainFood(rec: ProductRecommendation) {
    if (!savedUser || !linkedPet) return
    setSetFoodConfirm(rec)
  }

  function confirmSetMainFood() {
    if (!setFoodConfirm || !linkedPet || !savedUser) return
    setCurrentMainFood(savedUser.username, linkedPet.id, {
      productId: setFoodConfirm.product.id,
      productName: setFoodConfirm.product.productName,
      brand: setFoodConfirm.product.brand,
    })
    // 刷新 linkedPet 以更新当前主食状态
    const updated = getPets(savedUser.username).find((p) => p.id === linkedPet.id)
    if (updated) setLinkedPet(updated)
    setSetFoodConfirm(null)
  }

  // 当 result 和 savedUser 就绪后，检查是否已有关联此推荐或同名猫的宠物档案
  useEffect(() => {
    if (!result || !savedUser) return
    const pets = getPets(savedUser.username)
    // 优先匹配同一 resultId（URL id），其次匹配同名猫（跨推荐场景）
    const found = pets.find(
      (p) => p.resultId === resultId || p.name === result.catProfile.name
    )
    if (found) {
      setLinkedPet(found)
      setAddedPetId(found.id)
      setPetAddStatus('added')
    }
  }, [result, savedUser, resultId])

  // 核心加档案逻辑，可以传入外部 username（登录刚完成时 savedUser 还未 re-render）
  function doAddToPetProfile(username: string) {
    if (!result) return
    const { catProfile } = result
    const existingPets = getPets(username)
    const duplicate = existingPets.find(
      (p) => p.resultId === resultId || p.name === catProfile.name
    )
    if (duplicate) {
      setAddedPetId(duplicate.id)
      setPetAddStatus('added')
      return
    }
    try {
      const now = new Date().toISOString()
      const newPet: Pet = {
        id: generateId(),
        userId: username,
        name: catProfile.name,
        breed: catProfile.breed,
        gender: catProfile.gender,
        neutered: catProfile.neutered,
        birthday: catProfile.birthday ?? '',
        weightKg: catProfile.weightKg,
        resultId,
        foodHistory: [],
        createdAt: now,
        updatedAt: now,
      }
      savePet(username, newPet)
      setLinkedPet(newPet)
      setAddedPetId(newPet.id)
      setPetAddStatus('added')
    } catch {
      setPetAddStatus('error')
      setTimeout(() => setPetAddStatus('idle'), 4000)
    }
  }

  function handleAddToPetProfile() {
    if (!result) return
    // 未登录：记录 pending 意图，弹登录框
    if (!savedUser) {
      setPendingAction('addPet')
      setAuthModal('login')
      return
    }
    const { catProfile } = result
    // 去重：检查同名或同 resultId 的宠物是否已存在
    const existingPets = getPets(savedUser.username)
    const duplicate = existingPets.find(
      (p) => p.resultId === resultId || p.name === catProfile.name
    )
    if (duplicate) {
      setAddedPetId(duplicate.id)
      setPetAddStatus('added')
      return
    }
    try {
      const now = new Date().toISOString()
      const newPet: Pet = {
        id: generateId(),
        userId: savedUser.username,
        name: catProfile.name,
        breed: catProfile.breed,
        gender: catProfile.gender,
        neutered: catProfile.neutered,
        birthday: catProfile.birthday ?? '',
        weightKg: catProfile.weightKg,
        resultId,   // 关联推荐来源：使用 URL 中的 resultId（客户端生成，唯一）
        foodHistory: [],
        createdAt: now,
        updatedAt: now,
      }
      savePet(savedUser.username, newPet)
      setLinkedPet(newPet)
      setAddedPetId(newPet.id)
      setPetAddStatus('added')
    } catch {
      setPetAddStatus('error')
      setTimeout(() => setPetAddStatus('idle'), 4000)
    }
  }

  // 分享链接但数据不在本地（他人打开，或缓存已清除）
  if (notFound) {
    return (
      <div className="min-h-screen bg-[#FFF8F3] flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-xl max-w-[440px] w-full p-6 md:p-10 text-center space-y-5">
          <div className="text-5xl">🐱</div>
          <div>
            <h2 className="text-[20px] font-bold text-[#1A1815]">推荐结果已过期</h2>
            <p className="text-[14px] text-[#78746C] mt-2 leading-relaxed">
              该推荐结果保存在分享者的本地设备上，<br />
              无法直接查看。请重新为你的猫咪生成专属方案！
            </p>
          </div>
          <Link
            href="/recommend"
            className="inline-flex items-center gap-2 bg-[#E8721A] text-white px-6 py-3 rounded-xl text-[15px] font-semibold shadow-[0_4px_20px_rgba(232,114,26,0.3)] hover:bg-[#C45C0A] transition-colors"
          >
            为我的猫生成推荐 →
          </Link>
          <p className="text-[12px] text-[#A8A49C]">
            完全免费 · 无需注册 · 30秒完成
          </p>
        </div>
      </div>
    )
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

  const { catProfile, healthTags, dryFood, wetFood, disclaimer, conflicts, originalHealthTags } = result

  return (
    <div className="min-h-screen bg-[#FFF8F3]">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-[#FFF8F3]/90 backdrop-blur-md border-b border-[#E8E6E1]">
        <div className="max-w-[900px] mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-[#E8721A] font-bold text-[18px]">
            🐾 NutraPaw
          </Link>
          <div className="flex items-center gap-2">
            {savedUser ? (
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
            ) : (
              <button
                onClick={() => setAuthModal('login')}
                className="px-3 py-1.5 rounded-lg text-[13px] font-medium border border-[#E8721A] text-[#E8721A] hover:bg-[#E8721A] hover:text-white transition-all duration-150"
              >
                登录/注册
              </button>
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
                {catProfile.birthday
                  ? formatAgeFromBirthday(catProfile.birthday)
                  : (catProfile as unknown as { ageMonths?: number }).ageMonths
                    ? `${(catProfile as unknown as { ageMonths: number }).ageMonths}个月`
                    : ''} · {' '}
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
              {/* 未登录时同时显示登录和注册两个入口 */}
              {!savedUser && saveStatus === 'idle' && (
                <div className="mt-2 flex items-center justify-center gap-2">
                  <button
                    onClick={() => setAuthModal('login')}
                    className="text-[12px] text-[#E8721A] font-medium hover:underline"
                  >
                    登录
                  </button>
                  <span className="text-[11px] text-[#D1CEC7]">|</span>
                  <button
                    onClick={() => setAuthModal('signup')}
                    className="text-[12px] text-[#A8A49C] hover:text-[#78746C] hover:underline"
                  >
                    注册
                  </button>
                  <span className="text-[11px] text-[#A8A49C]">后永久保存</span>
                </div>
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

        {/* 需求冲突纠偏提示卡（有冲突时显示，紧跟猫咪信息卡之后） */}
        {conflicts && conflicts.length > 0 && (
          <div className="space-y-3">
            {(conflicts as ConflictItem[]).map((conflict, idx) => (
              <div key={idx} className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
                <div className="flex gap-3">
                  <span className="text-blue-500 text-xl shrink-0 mt-0.5">🔍</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-blue-800 mb-1">营养方案已为您调整</p>
                    <p className="text-[13px] text-blue-700 leading-relaxed">{conflict.message}</p>

                    {/* 标签变更对比 */}
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-blue-500 font-medium uppercase tracking-wide">您的选择</span>
                      <span className="text-[12px] text-blue-600 bg-blue-100 px-2.5 py-1 rounded-full line-through decoration-blue-400">
                        {HEALTH_TAG_CONFIG[conflict.originalTag]?.emoji} {HEALTH_TAG_CONFIG[conflict.originalTag]?.label}
                      </span>
                      {conflict.correctedTag ? (
                        <>
                          <span className="text-blue-400 text-[12px] font-medium">→</span>
                          <span className="text-[11px] text-blue-500 font-medium uppercase tracking-wide">实际推荐</span>
                          <span className="text-[12px] text-blue-900 bg-blue-200 font-semibold px-2.5 py-1 rounded-full">
                            {HEALTH_TAG_CONFIG[conflict.correctedTag]?.emoji} {HEALTH_TAG_CONFIG[conflict.correctedTag]?.label}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-blue-400 text-[12px] font-medium">→</span>
                          <span className="text-[12px] text-blue-500 italic">已移除（不适用）</span>
                        </>
                      )}
                    </div>

                    {/* 若有多个原始标签且被纠偏，展示调整前后的完整需求 */}
                    {originalHealthTags && originalHealthTags.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-blue-200 flex flex-wrap gap-2">
                        <span className="text-[11px] text-blue-400 self-center">实际方向：</span>
                        {healthTags.map((tag) => {
                          const config = HEALTH_TAG_CONFIG[tag]
                          return (
                            <span key={tag} className="bg-blue-100 text-blue-700 rounded-full px-2.5 py-0.5 text-[12px]">
                              {config.emoji} {config.label}
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
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
                  onSetAsMainFood={savedUser && linkedPet ? () => handleSetAsMainFood(rec) : undefined}
                  isCurrentMainFood={linkedPet?.currentMainFood?.productId === rec.product.id}
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
        <CompareModal comparing={comparing} onClose={() => setShowModal(false)} healthTags={healthTags} />
      )}

      {/* 设为当前主食 — 确认底部弹窗 */}
      {setFoodConfirm && linkedPet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSetFoodConfirm(null)} />
          <div className="relative bg-white rounded-t-3xl w-full max-w-[640px] px-6 pt-5 pb-10">
            <div className="w-10 h-1 bg-[#E8E6E1] rounded-full mx-auto mb-5" />
            <h3 className="text-[18px] font-bold text-[#1A1815] mb-1.5">设为当前主食？</h3>
            <p className="text-[14px] text-[#4A4641] mb-1">
              {setFoodConfirm.product.brand} {setFoodConfirm.product.productName}
            </p>
            <p className="text-[13px] text-[#A8A49C] mb-6">
              {linkedPet.currentMainFood
                ? `将替换当前主食「${linkedPet.currentMainFood.productName}」，旧主食记入换粮历程`
                : `将为 ${linkedPet.name} 设置首个主食记录`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setSetFoodConfirm(null)}
                className="flex-1 py-3 rounded-xl border border-[#E8E6E1] text-[14px] font-medium text-[#78746C] hover:bg-[#F4F3F0] transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmSetMainFood}
                className="flex-1 py-3 rounded-xl bg-[#E8721A] text-white text-[14px] font-semibold hover:bg-[#C45C0A] transition-colors"
              >
                确认设置
              </button>
            </div>
          </div>
        </div>
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

      {/* 对比上限 Toast */}
      <div
        className={`fixed bottom-28 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
          compareToast === 'visible'
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        <div className="bg-[#1A1815] text-white text-[13px] font-medium px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 whitespace-nowrap">
          <span>⚠️</span>
          <span>最多同时对比 3 款产品</span>
        </div>
      </div>
    </div>
  )
}
