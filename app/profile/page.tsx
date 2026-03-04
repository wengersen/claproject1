'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { StoredRecommendation } from '@/types/auth'
import type { Pet } from '@/types/pet'
import { AddPetModal } from '@/components/pets/AddPetModal'
import { getPets } from '@/lib/petLocalStore'
import { formatAgeFromBirthday } from '@/lib/formatters'
import { useAuth } from '@/hooks/useAuth'

export default function ProfilePage() {
  const router = useRouter()
  const { user, logout, initialized } = useAuth()
  const [recommendations, setRecommendations] = useState<StoredRecommendation[]>([])
  const [pets, setPets] = useState<Pet[]>([])
  const [showAddPet, setShowAddPet] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!initialized) return
    if (!user) {
      router.push('/')
      return
    }

    // 直接从 localStorage 读取宠物列表（无需 API，数据持久化在本地）
    setPets(getPets(user.username))

    // 从 localStorage 读取所有保存的推荐结果
    // resultId = localStorage key 后缀（result_<resultId>），不再依赖 data.id
    const savedRecs: StoredRecommendation[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('result_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '')
          if (data && data.catProfile) {
            const resultId = key.replace(/^result_/, '')
            savedRecs.push({
              id: key,
              userId: '',
              resultId,
              catName: data.catProfile?.name || '未知',
              breed: data.catProfile?.breed || '未知',
              createdAt: data.generatedAt || new Date().toISOString(),
            })
          }
        } catch { /* ignore */ }
      }
    }

    // 按时间倒序
    savedRecs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    setRecommendations(savedRecs)
    setLoading(false)
  }, [initialized, user, router])

  function handleLogout() {
    logout()
    router.push('/')
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  function handlePetAdded(pet: Pet) {
    setPets((prev) => [pet, ...prev])
    setShowAddPet(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF8F3] flex items-center justify-center">
        <div className="text-4xl animate-paw-pulse">🐾</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-[#FFF8F3]">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-[#FFF8F3]/90 backdrop-blur-md border-b border-[#E8E6E1]">
        <div className="max-w-[900px] mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-[#E8721A] font-bold text-[18px]">
            🐾 NutraPaw
          </Link>
          <button
            onClick={handleLogout}
            className="text-[14px] text-[#78746C] hover:text-[#E8721A] transition-colors px-3 py-2 rounded-lg"
          >
            退出登录
          </button>
        </div>
      </header>

      <main className="max-w-[900px] mx-auto px-4 py-8 space-y-8">
        {/* 用户信息卡片 */}
        <div className="bg-white border border-[#E8E6E1] rounded-2xl p-7">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-[#FFD9B5] rounded-full flex items-center justify-center text-3xl shrink-0">
              🐾
            </div>
            <div>
              <h1 className="text-[22px] font-bold text-[#1A1815]">
                {user.nickname || user.username}
              </h1>
              <p className="text-[14px] text-[#78746C] mt-0.5">@{user.username}</p>
              {user.email && (
                <p className="text-[13px] text-[#A8A49C] mt-0.5">{user.email}</p>
              )}
            </div>
            <div className="ml-auto flex gap-6 text-center">
              <div>
                <p className="text-[28px] font-mono font-bold text-[#E8721A]">{pets.length}</p>
                <p className="text-[11px] text-[#A8A49C] uppercase tracking-wide">只猫咪</p>
              </div>
              <div>
                <p className="text-[28px] font-mono font-bold text-[#E8721A]">{recommendations.length}</p>
                <p className="text-[11px] text-[#A8A49C] uppercase tracking-wide">次推荐</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── 我的猫咪 ── */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[20px] font-bold text-[#1A1815]">我的猫咪</h2>
            <button
              onClick={() => setShowAddPet(true)}
              className="text-[14px] text-[#E8721A] font-semibold hover:underline flex items-center gap-1"
            >
              + 添加猫咪
            </button>
          </div>

          {pets.length === 0 ? (
            <div className="bg-white border border-[#E8E6E1] rounded-2xl p-10 text-center">
              <div className="text-5xl mb-4">🐱</div>
              <h3 className="text-[16px] font-semibold text-[#1A1815] mb-2">还没有猫咪档案</h3>
              <p className="text-[13px] text-[#78746C] mb-5">
                完成一次推荐后可一键加入档案，或点击下方手动创建
              </p>
              <button
                onClick={() => setShowAddPet(true)}
                className="inline-flex items-center gap-2 bg-[#E8721A] text-white px-5 py-2.5 rounded-xl text-[14px] font-semibold shadow-[0_4px_16px_rgba(232,114,26,0.2)] hover:bg-[#C45C0A] transition-colors"
              >
                + 创建档案
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {pets.map((pet) => (
                <Link
                  key={pet.id}
                  href={`/profile/pets/${pet.id}`}
                  className="flex items-center gap-4 bg-white border border-[#E8E6E1] rounded-2xl p-5 hover:border-[#FFB87A] hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 group"
                >
                  <div className="w-12 h-12 bg-[#FFD9B5] rounded-full flex items-center justify-center text-2xl shrink-0">
                    🐱
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[16px] font-semibold text-[#1A1815] group-hover:text-[#E8721A] transition-colors">
                      {pet.name}
                    </p>
                    <p className="text-[13px] text-[#78746C] mt-0.5">
                      {pet.breed} · {formatAgeFromBirthday(pet.birthday)} · {pet.weightKg}kg ·{' '}
                      {pet.gender === 'male' ? '公猫' : '母猫'} ·{' '}
                      {pet.neutered ? '已绝育' : '未绝育'}
                    </p>
                  </div>
                  <div className="shrink-0 text-[#E8721A] text-[14px] font-medium group-hover:underline">
                    查看档案 →
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ── 推荐历史 ── */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[20px] font-bold text-[#1A1815]">推荐历史</h2>
            <Link
              href="/recommend"
              className="text-[14px] text-[#E8721A] font-semibold hover:underline"
            >
              + 新增推荐
            </Link>
          </div>

          {recommendations.length === 0 ? (
            <div className="bg-white border border-[#E8E6E1] rounded-2xl p-12 text-center">
              <div className="text-5xl mb-4">🐱</div>
              <h3 className="text-[18px] font-semibold text-[#1A1815] mb-2">还没有推荐记录</h3>
              <p className="text-[14px] text-[#78746C] mb-6">
                填写你家猫咪的信息，获取专属营养推荐方案
              </p>
              <Link
                href="/recommend"
                className="inline-flex items-center gap-2 bg-[#E8721A] text-white px-6 py-3 rounded-xl text-[15px] font-semibold shadow-[0_4px_24px_rgba(232,114,26,0.25)] hover:bg-[#C45C0A] transition-colors"
              >
                立即获取推荐 →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recommendations.map((rec) => (
                <Link
                  key={rec.id}
                  href={`/result/${rec.resultId}`}
                  className="block bg-white border border-[#E8E6E1] rounded-2xl p-5 hover:border-[#FFB87A] hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#FFD9B5] rounded-full flex items-center justify-center text-2xl shrink-0">
                      🐱
                    </div>
                    <div className="flex-1">
                      <p className="text-[16px] font-semibold text-[#1A1815] group-hover:text-[#E8721A] transition-colors">
                        {rec.catName}
                      </p>
                      <p className="text-[13px] text-[#78746C] mt-0.5">{rec.breed}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[12px] text-[#A8A49C]">{formatDate(rec.createdAt)}</p>
                      <p className="text-[13px] text-[#E8721A] mt-0.5 font-medium group-hover:underline">
                        查看推荐 →
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* 底部 CTA */}
        <div className="bg-[#1A1815] rounded-2xl p-7 text-center">
          <h3 className="text-[18px] font-bold text-white mb-2">家里有新猫咪？</h3>
          <p className="text-[13px] text-[#A8A49C] mb-5">为每只猫咪生成专属推荐方案</p>
          <Link
            href="/recommend"
            className="inline-flex items-center gap-2 bg-[#E8721A] text-white px-6 py-3 rounded-xl text-[15px] font-semibold hover:bg-[#C45C0A] transition-colors"
          >
            新增推荐 →
          </Link>
        </div>
      </main>

      {/* 添加猫咪弹窗 */}
      {showAddPet && user && (
        <AddPetModal
          username={user.username}
          onSuccess={handlePetAdded}
          onClose={() => setShowAddPet(false)}
        />
      )}
    </div>
  )
}
