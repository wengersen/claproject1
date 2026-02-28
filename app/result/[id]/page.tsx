'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ProductCard } from '@/components/result/ProductCard'
import { CompareBar } from '@/components/result/CompareBar'
import { CompareModal } from '@/components/result/CompareModal'
import { HEALTH_TAG_CONFIG, type RecommendResult, type ProductRecommendation } from '@/types/cat'

export default function ResultPage() {
  const params = useParams()
  const router = useRouter()
  const [result, setResult] = useState<RecommendResult | null>(null)
  const [comparing, setComparing] = useState<ProductRecommendation[]>([])
  const [showModal, setShowModal] = useState(false)
  const [copied, setCopied] = useState(false)

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
      <header className="sticky top-0 z-50 bg-[#FFF8F3]/90 backdrop-blur-md border-b border-[#E8E6E1]">
        <div className="max-w-[900px] mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-[#E8721A] font-bold text-[18px]">
            🐾 NutraPaw
          </Link>
          <div className="flex items-center gap-2">
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
          </div>
        </div>

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
    </div>
  )
}
