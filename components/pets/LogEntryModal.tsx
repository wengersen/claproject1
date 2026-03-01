'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { AppetiteLevel, EnergyLevel, DrinkingLevel, StoolCondition, VomitingFrequency } from '@/types/pet'

interface LogEntryModalProps {
  petName: string
  petId: string
  sessionToken: string
  onSuccess: () => void
  onClose: () => void
}

// 选项组配置
const OPTION_GROUPS = {
  appetite: {
    label: '食欲',
    options: [
      { value: 'excellent', label: '😋 良好' },
      { value: 'normal',    label: '😐 一般' },
      { value: 'poor',      label: '😞 很差' },
    ] as { value: AppetiteLevel; label: string }[],
  },
  energy: {
    label: '精神状态',
    options: [
      { value: 'active',    label: '⚡ 活跃' },
      { value: 'normal',    label: '😊 正常' },
      { value: 'lethargic', label: '😴 萎靡' },
    ] as { value: EnergyLevel; label: string }[],
  },
  drinking: {
    label: '饮水量',
    options: [
      { value: 'lots',   label: '💧💧 偏多' },
      { value: 'normal', label: '💧 正常' },
      { value: 'little', label: '🏜️ 偏少' },
    ] as { value: DrinkingLevel; label: string }[],
  },
  stool: {
    label: '大便状态',
    options: [
      { value: 'normal',  label: '✅ 正常' },
      { value: 'loose',   label: '💦 稀软' },
      { value: 'hard',    label: '🪨 干硬' },
      { value: 'no_info', label: '❓ 不清楚' },
    ] as { value: StoolCondition; label: string }[],
  },
  vomiting: {
    label: '呕吐情况',
    options: [
      { value: 'none',       label: '✅ 无' },
      { value: 'occasional', label: '⚠️ 偶尔' },
      { value: 'frequent',   label: '🚨 频繁' },
    ] as { value: VomitingFrequency; label: string }[],
  },
}

export function LogEntryModal({ petName, petId, sessionToken, onSuccess, onClose }: LogEntryModalProps) {
  const today = new Date().toISOString().split('T')[0]

  const [date, setDate] = useState(today)
  const [weightKg, setWeightKg] = useState('')
  const [appetite, setAppetite] = useState<AppetiteLevel>('normal')
  const [energy, setEnergy] = useState<EnergyLevel>('normal')
  const [drinking, setDrinking] = useState<DrinkingLevel>('normal')
  const [stool, setStool] = useState<StoolCondition>('normal')
  const [vomiting, setVomiting] = useState<VomitingFrequency>('none')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`/api/pets/${petId}/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          date,
          appetite,
          energy,
          drinking,
          stool,
          vomiting,
          weightKg: weightKg ? parseFloat(weightKg) : undefined,
          notes: notes.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || '保存失败，请重试')
        return
      }

      onSuccess()
    } catch {
      setError('网络错误，请检查连接')
    } finally {
      setLoading(false)
    }
  }

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[460px] relative animate-slide-up my-8">
        {/* 头部 */}
        <div className="flex items-center justify-between px-7 pt-7 pb-0">
          <div>
            <h2 className="text-[20px] font-bold text-[#1A1815]">记录 {petName} 的状态</h2>
            <p className="text-[13px] text-[#A8A49C] mt-0.5">定期记录，追踪健康变化</p>
          </div>
          <button
            onClick={onClose}
            className="text-[#A8A49C] hover:text-[#4A4641] transition-colors text-xl w-8 h-8 flex items-center justify-center"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-7 pb-7 pt-5 space-y-5">
          {/* 日期 + 体重 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-[#78746C] mb-1.5 uppercase tracking-wide">
                日期
              </label>
              <input
                type="date"
                value={date}
                max={today}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-[#E8E6E1] rounded-xl px-3 py-2.5 text-[14px] text-[#1A1815] focus:outline-none focus:border-[#E8721A] focus:ring-4 focus:ring-[#E8721A]/10 transition-all"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#78746C] mb-1.5 uppercase tracking-wide">
                体重（kg）<span className="font-normal ml-1 normal-case">可选</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="20"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="如：4.5"
                className="w-full border border-[#E8E6E1] rounded-xl px-3 py-2.5 text-[14px] text-[#1A1815] placeholder-[#D1CEC7] focus:outline-none focus:border-[#E8721A] focus:ring-4 focus:ring-[#E8721A]/10 transition-all"
              />
            </div>
          </div>

          {/* 指标选择 */}
          {(Object.entries(OPTION_GROUPS) as [
            keyof typeof OPTION_GROUPS,
            typeof OPTION_GROUPS[keyof typeof OPTION_GROUPS]
          ][]).map(([key, group]) => {
            const currentValue = { appetite, energy, drinking, stool, vomiting }[key]
            const setters = { appetite: setAppetite, energy: setEnergy, drinking: setDrinking, stool: setStool, vomiting: setVomiting }

            return (
              <div key={key}>
                <label className="block text-[12px] font-semibold text-[#78746C] mb-2 uppercase tracking-wide">
                  {group.label}
                </label>
                <div className="flex gap-2 flex-wrap">
                  {group.options.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => (setters[key] as (v: string) => void)(opt.value)}
                      className={`px-3 py-2 rounded-xl text-[13px] font-medium border transition-all ${
                        currentValue === opt.value
                          ? 'bg-[#E8721A] text-white border-[#E8721A] shadow-sm'
                          : 'bg-white text-[#4A4641] border-[#E8E6E1] hover:border-[#FFB87A]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}

          {/* 备注 */}
          <div>
            <label className="block text-[12px] font-semibold text-[#78746C] mb-1.5 uppercase tracking-wide">
              备注 <span className="font-normal normal-case">可选</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="例如：今天很活跃，玩了很久；最近换了新猫粮..."
              rows={2}
              className="w-full border border-[#E8E6E1] rounded-xl px-4 py-3 text-[14px] text-[#1A1815] placeholder-[#D1CEC7] focus:outline-none focus:border-[#E8721A] focus:ring-4 focus:ring-[#E8721A]/10 transition-all resize-none"
            />
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
              <span className="text-red-500 shrink-0">⚠️</span>
              <p className="text-[13px] text-red-700">{error}</p>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-[#E8E6E1] text-[14px] font-medium text-[#78746C] hover:bg-[#F4F3F0] transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-[#E8721A] text-white text-[14px] font-semibold shadow-[0_4px_24px_rgba(232,114,26,0.25)] hover:bg-[#C45C0A] disabled:bg-[#D1CEC7] disabled:cursor-not-allowed transition-all"
            >
              {loading ? '保存中...' : '保存记录'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
