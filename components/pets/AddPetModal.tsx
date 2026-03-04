'use client'

import { useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import type { Pet } from '@/types/pet'
import { savePet, generateId } from '@/lib/petLocalStore'
import { BreedSelector } from '@/components/recommend/BreedSelector'

interface AddPetModalProps {
  /** 当前登录用户的 username，用于 localStorage key 分区 */
  username: string
  onSuccess: (pet: Pet) => void
  onClose: () => void
}

export function AddPetModal({ username, onSuccess, onClose }: AddPetModalProps) {
  const [name, setName] = useState('')
  const [breed, setBreed] = useState('')
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [neutered, setNeutered] = useState(true)
  const [birthday, setBirthday] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!breed) {
      setError('请选择猫咪品种')
      return
    }
    if (!birthday) {
      setError('请选择生日日期')
      return
    }
    const weight = parseFloat(weightKg)
    if (isNaN(weight) || weight < 0.5 || weight > 20) {
      setError('请输入有效的体重（0.5-20 kg）')
      return
    }

    const now = new Date().toISOString()
    const newPet: Pet = {
      id: generateId(),
      userId: username,
      name: name.trim(),
      breed: breed.trim(),
      gender,
      neutered,
      birthday,
      weightKg: weight,
      foodHistory: [],
      createdAt: now,
      updatedAt: now,
    }

    savePet(username, newPet)
    onSuccess(newPet)
  }

  const GENDER_OPTIONS = [
    { value: 'male' as const, label: '♂ 公猫' },
    { value: 'female' as const, label: '♀ 母猫' },
  ]
  const NEUTERED_OPTIONS = [
    { value: true, label: '✅ 已绝育' },
    { value: false, label: '❌ 未绝育' },
  ]

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[440px] relative animate-slide-up my-8">
        {/* 头部 */}
        <div className="flex items-center justify-between px-7 pt-7 pb-0">
          <div>
            <h2 className="text-[20px] font-bold text-[#1A1815]">添加猫咪档案</h2>
            <p className="text-[13px] text-[#A8A49C] mt-0.5">建立健康档案，追踪成长变化</p>
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
          {/* 名字 */}
          <div>
            <label className="block text-[12px] font-semibold text-[#78746C] mb-1.5 uppercase tracking-wide">
              名字
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如：橘墩"
              required
              className="w-full border border-[#E8E6E1] rounded-xl px-3 py-2.5 text-[14px] text-[#1A1815] placeholder-[#D1CEC7] focus:outline-none focus:border-[#E8721A] focus:ring-4 focus:ring-[#E8721A]/10 transition-all"
            />
          </div>

          {/* 品种选择器 */}
          <BreedSelector value={breed} onChange={setBreed} />

          {/* 生日 + 体重 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-[#78746C] mb-1.5 uppercase tracking-wide">
                生日
              </label>
              <input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                required
                max={new Date().toISOString().slice(0, 10)}
                min="2006-01-01"
                className="w-full border border-[#E8E6E1] rounded-xl px-3 py-2.5 text-[14px] text-[#1A1815] focus:outline-none focus:border-[#E8721A] focus:ring-4 focus:ring-[#E8721A]/10 transition-all"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#78746C] mb-1.5 uppercase tracking-wide">
                体重（kg）
              </label>
              <input
                type="number"
                step="0.1"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="如：4.5"
                required
                min="0.5"
                max="20"
                className="w-full border border-[#E8E6E1] rounded-xl px-3 py-2.5 text-[14px] text-[#1A1815] placeholder-[#D1CEC7] focus:outline-none focus:border-[#E8721A] focus:ring-4 focus:ring-[#E8721A]/10 transition-all"
              />
            </div>
          </div>

          {/* 性别 */}
          <div>
            <label className="block text-[12px] font-semibold text-[#78746C] mb-2 uppercase tracking-wide">
              性别
            </label>
            <div className="flex gap-2">
              {GENDER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setGender(opt.value)}
                  className={`flex-1 py-2.5 rounded-xl text-[13px] font-medium border transition-all ${
                    gender === opt.value
                      ? 'bg-[#E8721A] text-white border-[#E8721A] shadow-sm'
                      : 'bg-white text-[#4A4641] border-[#E8E6E1] hover:border-[#FFB87A]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 绝育 */}
          <div>
            <label className="block text-[12px] font-semibold text-[#78746C] mb-2 uppercase tracking-wide">
              绝育状态
            </label>
            <div className="flex gap-2">
              {NEUTERED_OPTIONS.map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setNeutered(opt.value)}
                  className={`flex-1 py-2.5 rounded-xl text-[13px] font-medium border transition-all ${
                    neutered === opt.value
                      ? 'bg-[#E8721A] text-white border-[#E8721A] shadow-sm'
                      : 'bg-white text-[#4A4641] border-[#E8E6E1] hover:border-[#FFB87A]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
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
              className="flex-1 py-3 rounded-xl bg-[#E8721A] text-white text-[14px] font-semibold shadow-[0_4px_24px_rgba(232,114,26,0.25)] hover:bg-[#C45C0A] transition-all"
            >
              创建档案
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
