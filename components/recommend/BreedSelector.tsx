'use client'

import { useState, useRef, useEffect } from 'react'
import { CAT_BREEDS } from '@/types/cat'

interface BreedSelectorProps {
  value: string
  onChange: (breed: string) => void
}

const HOT_BREEDS = ['英国短毛猫', '布偶猫', '橘猫（田园猫）', '美国短毛猫', '暹罗猫']

export function BreedSelector({ value, onChange }: BreedSelectorProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const filtered = CAT_BREEDS.filter((b) =>
    b.toLowerCase().includes(query.toLowerCase())
  )

  // 点击外部关闭
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function select(breed: string) {
    onChange(breed)
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <label className="block text-[12px] font-semibold text-[#78746C] mb-2 uppercase tracking-wide">
        品种
      </label>

      {/* 选中后显示 */}
      {value && !open ? (
        <div
          className="flex items-center justify-between bg-white border border-[#E8721A] rounded-xl px-4 py-3 cursor-pointer"
          onClick={() => setOpen(true)}
        >
          <span className="text-[15px] font-medium text-[#2E2B27]">{value}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onChange('')
            }}
            className="text-[#A8A49C] hover:text-[#4A4641] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="bg-white border border-[#E8E6E1] focus-within:border-[#E8721A] focus-within:ring-4 focus-within:ring-[#E8721A]/10 rounded-xl transition-all duration-200">
          {/* 搜索框 */}
          <div className="flex items-center gap-2 px-4 py-3">
            <svg className="w-4 h-4 text-[#A8A49C] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
              placeholder="搜索品种，例如：英短、橘猫..."
              className="flex-1 bg-transparent outline-none text-[15px] text-[#2E2B27] placeholder:text-[#D1CEC7]"
            />
          </div>

          {/* 热门品种快捷选 */}
          {!open && !query && (
            <div className="px-4 pb-3 flex flex-wrap gap-2">
              {HOT_BREEDS.map((breed) => (
                <button
                  key={breed}
                  type="button"
                  onClick={() => select(breed)}
                  className="bg-[#F4F3F0] rounded-full px-3 py-1 text-[13px] text-[#4A4641] hover:bg-[#FFD9B5] hover:text-[#9A4208] transition-colors duration-150 cursor-pointer"
                >
                  {breed}
                </button>
              ))}
            </div>
          )}

          {/* 下拉列表 */}
          {open && (
            <div className="border-t border-[#F4F3F0] max-h-[200px] overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-4 py-3 text-[14px] text-[#A8A49C]">没有找到匹配品种</div>
              ) : (
                filtered.map((breed) => (
                  <button
                    key={breed}
                    type="button"
                    onClick={() => select(breed)}
                    className="w-full text-left px-4 py-3 text-[14px] hover:bg-[#FFF8F3] hover:text-[#E8721A] transition-colors duration-100 cursor-pointer"
                  >
                    {breed}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
