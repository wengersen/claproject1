'use client'

import type { HealthTag } from '@/types/cat'
import { HEALTH_TAG_CONFIG } from '@/types/cat'

interface HealthTagGridProps {
  selected: HealthTag[]
  onChange: (tags: HealthTag[]) => void
}

const ALL_TAGS = Object.entries(HEALTH_TAG_CONFIG) as [
  HealthTag,
  (typeof HEALTH_TAG_CONFIG)[HealthTag]
][]

export function HealthTagGrid({ selected, onChange }: HealthTagGridProps) {
  function toggle(tag: HealthTag) {
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag))
    } else {
      // 如果选了 balanced，清除其他；如果选了其他，清除 balanced
      if (tag === 'balanced') {
        onChange(['balanced'])
      } else {
        onChange([...selected.filter((t) => t !== 'balanced'), tag])
      }
    }
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {ALL_TAGS.map(([tag, config]) => {
        const isSelected = selected.includes(tag)
        return (
          <button
            key={tag}
            type="button"
            onClick={() => toggle(tag)}
            className={[
              'relative text-left p-4 rounded-xl border transition-all duration-150',
              'flex items-start gap-3',
              isSelected
                ? 'border-[#E8721A] bg-[#FFF8F3] scale-[1.01]'
                : 'border-[#E8E6E1] bg-white hover:border-[#FFB87A] hover:bg-[#FFF8F3] hover:scale-[1.01]',
            ].join(' ')}
          >
            {/* 选中勾号 */}
            {isSelected && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-[#E8721A] rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}

            {/* 图标 */}
            <span className="text-xl shrink-0 leading-none mt-0.5">{config.emoji}</span>

            {/* 文字 */}
            <div className="min-w-0">
              <div
                className={[
                  'text-[14px] font-medium leading-tight',
                  isSelected ? 'text-[#E8721A]' : 'text-[#2E2B27]',
                ].join(' ')}
              >
                {config.label}
              </div>
              <div className="text-[11px] text-[#A8A49C] mt-0.5 leading-tight line-clamp-2">
                {config.description}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
