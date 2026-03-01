'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogEntryModal } from '@/components/pets/LogEntryModal'
import {
  APPETITE_LABEL,
  ENERGY_LABEL,
  DRINKING_LABEL,
  STOOL_LABEL,
  VOMITING_LABEL,
  HEALTH_STATUS_CONFIG,
  getLogStatusIndicator,
  type Pet,
  type PetHealthLog,
  type HealthAssessment,
} from '@/types/pet'
import {
  getPets,
  getLogs,
  getAssessment,
  saveAssessment,
  getRecentLogs,
  generateId,
} from '@/lib/petLocalStore'

export default function PetHealthPage() {
  const params = useParams()
  const router = useRouter()
  const petId = params.petId as string

  const [pet, setPet] = useState<Pet | null>(null)
  const [logs, setLogs] = useState<PetHealthLog[]>([])
  const [assessment, setAssessment] = useState<HealthAssessment | null>(null)
  const [showLogModal, setShowLogModal] = useState(false)
  const [sessionToken, setSessionToken] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(true)
  const [assessmentLoading, setAssessmentLoading] = useState(false)
  const [assessmentError, setAssessmentError] = useState('')

  // 从 localStorage 读取推荐来源（若 pet.resultId 存在）
  const [linkedResult, setLinkedResult] = useState<{
    catName: string; breed: string; generatedAt: string
  } | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('sessionToken') ?? ''
    const userStr = localStorage.getItem('user')
    if (!token || !userStr) { router.push('/profile'); return }

    let parsedUser: { username: string; nickname?: string } | null = null
    try { parsedUser = JSON.parse(userStr) } catch { router.push('/profile'); return }
    if (!parsedUser) { router.push('/profile'); return }

    setSessionToken(token)
    setUsername(parsedUser.username)

    // 从 localStorage 查找宠物
    const allPets = getPets(parsedUser.username)
    const found = allPets.find((p) => p.id === petId)
    if (!found) { router.push('/profile'); return }

    setPet(found)
    setLogs(getLogs(petId))

    // 检查 48h 内的评估缓存
    const cached = getAssessment(petId)
    if (cached) setAssessment(cached)

    // 加载推荐来源
    if (found.resultId) {
      try {
        const resultRaw = localStorage.getItem(`result_${found.resultId}`)
        if (resultRaw) {
          const result = JSON.parse(resultRaw)
          if (result?.catProfile) {
            setLinkedResult({
              catName: result.catProfile.name,
              breed: result.catProfile.breed,
              generatedAt: result.generatedAt,
            })
          }
        }
      } catch { /* ignore */ }
    }

    setLoading(false)
  }, [petId, router])

  async function handleGenerateAssessment() {
    if (!pet) return
    setAssessmentLoading(true)
    setAssessmentError('')

    // 再次检查缓存（防止重复点击）
    const cached = getAssessment(petId)
    if (cached) {
      setAssessment(cached)
      setAssessmentLoading(false)
      return
    }

    try {
      const recentLogs = getRecentLogs(petId, 10)
      const res = await fetch(`/api/pets/${petId}/assessment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ pet, logs: recentLogs }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAssessmentError(data.error ?? '生成失败，请稍后重试')
        return
      }
      const newAssessment = data.assessment as HealthAssessment
      // 客户端持久化评估结果
      saveAssessment(petId, newAssessment)
      setAssessment(newAssessment)
    } catch {
      setAssessmentError('网络错误，请检查连接')
    } finally {
      setAssessmentLoading(false)
    }
  }

  function handleLogSuccess() {
    setShowLogModal(false)
    // 重新从 localStorage 读取日志（LogEntryModal 已写入）
    setLogs(getLogs(petId))
    // 新日志写入后评估已被 clearAssessment 清除，同步 state
    setAssessment(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF8F3] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-5xl animate-bounce">🐾</div>
          <p className="text-[#78746C] text-[14px]">加载中...</p>
        </div>
      </div>
    )
  }

  if (!pet) return null

  const ageYears = Math.floor(pet.ageMonths / 12)
  const ageStr = ageYears > 0
    ? `${ageYears}岁${pet.ageMonths % 12 > 0 ? `${pet.ageMonths % 12}个月` : ''}`
    : `${pet.ageMonths}个月`

  const latestLog = logs[0]
  const latestStatus = latestLog ? getLogStatusIndicator(latestLog) : null
  const statusCfg = latestStatus ? HEALTH_STATUS_CONFIG[latestStatus] : null

  return (
    <div className="min-h-screen bg-[#FFF8F3]">
      {/* 顶栏 */}
      <div className="sticky top-0 z-40 bg-[#FFF8F3]/90 backdrop-blur-md border-b border-[#E8E6E1]">
        <div className="max-w-[680px] mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/profile"
            className="flex items-center gap-1.5 text-[#78746C] hover:text-[#E8721A] text-[14px] transition-colors"
          >
            ← 返回档案
          </Link>
          <button
            onClick={() => setShowLogModal(true)}
            className="bg-[#E8721A] text-white px-4 py-2 rounded-xl text-[13px] font-semibold hover:bg-[#C45C0A] transition-colors shadow-sm"
          >
            + 记录今日状况
          </button>
        </div>
      </div>

      <div className="max-w-[680px] mx-auto px-4 py-6 space-y-5">
        {/* 宠物基本信息卡 */}
        <div className="bg-white border border-[#E8E6E1] rounded-2xl px-6 py-5 flex items-center gap-4">
          <div className="w-16 h-16 bg-[#FFD9B5] rounded-full flex items-center justify-center text-3xl shrink-0">
            🐱
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[22px] font-bold text-[#1A1815]">{pet.name}</h1>
              {statusCfg && (
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${statusCfg.bg} ${statusCfg.color}`}>
                  {statusCfg.emoji} {statusCfg.label}
                </span>
              )}
            </div>
            <p className="text-[13px] text-[#78746C] mt-1">
              {pet.breed} · {ageStr} · {pet.gender === 'male' ? '公猫' : '母猫'} · {pet.neutered ? '已绝育' : '未绝育'}
            </p>
            <p className="text-[12px] text-[#A8A49C] mt-0.5">
              基准体重 {pet.weightKg}kg
              {logs.length > 0 && ` · 共 ${logs.length} 条记录`}
            </p>
          </div>
        </div>

        {/* 推荐来源卡（若 pet 从推荐流程创建） */}
        {linkedResult && pet.resultId && (
          <Link
            href={`/result/${pet.resultId}`}
            className="flex items-center gap-3 bg-white border border-[#E8E6E1] rounded-2xl px-5 py-3.5 hover:border-[#FFB87A] hover:shadow-sm transition-all group"
          >
            <span className="text-lg">📋</span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[#4A4641] group-hover:text-[#E8721A] transition-colors">
                推荐来源：{linkedResult.catName} · {linkedResult.breed}
              </p>
              <p className="text-[11px] text-[#A8A49C] mt-0.5">
                {new Date(linkedResult.generatedAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })} 生成
              </p>
            </div>
            <span className="text-[12px] text-[#E8721A] font-medium shrink-0 group-hover:underline">
              查看推荐 →
            </span>
          </Link>
        )}

        {/* AI 健康评估卡 */}
        <div className="bg-[#FFF8F3] border border-[#FFD9B5] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between border-b border-[#FFD9B5]">
            <div className="flex items-center gap-2">
              <span className="text-lg">✨</span>
              <span className="text-[15px] font-semibold text-[#1A1815]">AI 健康评估</span>
            </div>
            {assessment && (
              <span className="text-[11px] text-[#A8A49C]">
                基于 {assessment.basedOnLogs} 条记录 · 48h 内有效
              </span>
            )}
          </div>

          <div className="px-6 py-5">
            {!assessment && !assessmentLoading && (
              <div className="text-center py-4 space-y-3">
                <p className="text-[14px] text-[#78746C]">
                  {logs.length === 0
                    ? '先记录一次状态，即可生成 AI 健康分析'
                    : '基于健康记录生成 AI 分析报告'}
                </p>
                <button
                  onClick={handleGenerateAssessment}
                  disabled={logs.length === 0}
                  className="bg-[#E8721A] text-white px-5 py-2.5 rounded-xl text-[14px] font-semibold hover:bg-[#C45C0A] disabled:bg-[#D1CEC7] disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  生成健康评估
                </button>
                {assessmentError && (
                  <p className="text-[12px] text-red-500">{assessmentError}</p>
                )}
              </div>
            )}

            {assessmentLoading && (
              <div className="text-center py-6 space-y-3">
                <div className="text-4xl animate-pulse">🤔</div>
                <p className="text-[14px] text-[#78746C]">AI 正在分析健康数据...</p>
              </div>
            )}

            {assessment && !assessmentLoading && (
              <div className="space-y-4">
                {/* 总体状态 */}
                <div className={`flex items-center gap-3 p-3 rounded-xl border ${HEALTH_STATUS_CONFIG[assessment.overallStatus].bg}`}>
                  <span className="text-xl">{HEALTH_STATUS_CONFIG[assessment.overallStatus].emoji}</span>
                  <div>
                    <p className={`text-[14px] font-bold ${HEALTH_STATUS_CONFIG[assessment.overallStatus].color}`}>
                      {HEALTH_STATUS_CONFIG[assessment.overallStatus].label}
                    </p>
                    <p className="text-[13px] text-[#4A4641] mt-0.5">{assessment.summary}</p>
                  </div>
                </div>

                {/* 关键发现 */}
                {assessment.keyFindings.length > 0 && (
                  <div>
                    <p className="text-[12px] font-semibold text-[#A8A49C] uppercase tracking-wide mb-2">关键发现</p>
                    <ul className="space-y-1.5">
                      {assessment.keyFindings.map((finding, i) => (
                        <li key={i} className="flex items-start gap-2 text-[13px] text-[#4A4641]">
                          <span className="text-[#E8721A] mt-0.5 shrink-0">•</span>
                          {finding}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 饮食建议 */}
                {assessment.dietaryAdvice && (
                  <div className="bg-white rounded-xl px-4 py-3 border border-[#E8E6E1]">
                    <p className="text-[12px] font-semibold text-[#A8A49C] uppercase tracking-wide mb-1.5">🍽️ 饮食建议</p>
                    <p className="text-[13px] text-[#4A4641] leading-relaxed">{assessment.dietaryAdvice}</p>
                  </div>
                )}

                {/* 护理注意 */}
                {assessment.careTips.length > 0 && (
                  <div>
                    <p className="text-[12px] font-semibold text-[#A8A49C] uppercase tracking-wide mb-2">💡 护理建议</p>
                    <ul className="space-y-1.5">
                      {assessment.careTips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-[13px] text-[#4A4641]">
                          <span className="text-amber-500 mt-0.5 shrink-0">→</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 重新生成 */}
                <button
                  onClick={() => { saveAssessment(petId, null); setAssessment(null) }}
                  disabled={assessmentLoading}
                  className="text-[12px] text-[#A8A49C] hover:text-[#E8721A] transition-colors"
                >
                  🔄 清除缓存，重新生成
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 历史日志 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[16px] font-bold text-[#1A1815]">健康记录</h2>
            {logs.length > 0 && (
              <span className="text-[12px] text-[#A8A49C]">共 {logs.length} 条</span>
            )}
          </div>

          {logs.length === 0 ? (
            <div className="bg-white border border-dashed border-[#E8E6E1] rounded-2xl px-6 py-10 text-center">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-[14px] text-[#78746C]">还没有健康记录</p>
              <p className="text-[12px] text-[#A8A49C] mt-1">点击「记录今日状况」开始追踪</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => {
                const status = getLogStatusIndicator(log)
                const cfg = HEALTH_STATUS_CONFIG[status]
                return (
                  <div
                    key={log.id}
                    className="bg-white border border-[#E8E6E1] rounded-2xl px-5 py-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-3 h-3 rounded-full shrink-0 mt-0.5 ${
                          status === 'excellent' || status === 'good' ? 'bg-green-500' :
                          status === 'attention' ? 'bg-amber-500' : 'bg-red-500'
                        }`} />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[14px] font-semibold text-[#1A1815]">
                              {log.date}
                            </span>
                            {log.weightKg && (
                              <span className="text-[12px] text-[#E8721A] font-medium">
                                {log.weightKg}kg
                              </span>
                            )}
                            <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                              {cfg.label}
                            </span>
                          </div>
                          <p className="text-[12px] text-[#78746C] mt-1">
                            {APPETITE_LABEL[log.appetite]} · {ENERGY_LABEL[log.energy]} · {DRINKING_LABEL[log.drinking]}
                            {log.stool !== 'no_info' && ` · ${STOOL_LABEL[log.stool]}`}
                            {log.vomiting !== 'none' && ` · ${VOMITING_LABEL[log.vomiting]}`}
                          </p>
                          {log.notes && (
                            <p className="text-[12px] text-[#A8A49C] mt-1 italic">"{log.notes}"</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* LogEntryModal */}
      {showLogModal && (
        <LogEntryModal
          petName={pet.name}
          petId={petId}
          userId={username}
          onSuccess={handleLogSuccess}
          onClose={() => setShowLogModal(false)}
        />
      )}
    </div>
  )
}
