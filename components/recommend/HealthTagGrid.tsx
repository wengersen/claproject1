'use client'

import {
  Droplets, Scale, Leaf, Sparkles, Bone, Target,
  Shield, Dumbbell, HeartPulse, Baby, Sun, Check,
} from 'lucide-react'
import type { HealthTag } from '@/types/cat'
import { HEALTH_TAG_CONFIG } from '@/types/cat'

// ─── Figma lucide 图标映射 ──────────────────────────────────────────
const TAG_ICON: Record<HealthTag, { icon: React.ElementType; color: string }> = {
  urinary:   { icon: Droplets,   color: 'text-blue-500' },
  weight:    { icon: Scale,      color: 'text-orange-500' },
  digest:    { icon: Leaf,       color: 'text-green-500' },
  skin:      { icon: Sparkles,   color: 'text-yellow-500' },
  joint:     { icon: Bone,       color: 'text-slate-400' },
  picky:     { icon: Target,     color: 'text-red-500' },
  allergy:   { icon: Shield,     color: 'text-rose-400' },
  nutrition: { icon: Dumbbell,   color: 'text-orange-600' },
  senior:    { icon: HeartPulse, color: 'text-purple-500' },
  kitten:    { icon: Baby,       color: 'text-cyan-500' },
  balanced:  { icon: Sun,        color: 'text-yellow-600' },
}

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
      if (tag === 'balanced') {
        onChange(['balanced'])
      } else {
        onChange([...selected.filter((t) => t !== 'balanced'), tag])
      }
    }
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {ALL_TAGS.map(([tag, config]) => {
        const isSelected = selected.includes(tag)
        const { icon: Icon, color } = TAG_ICON[tag]
        return (
          <div
            key={tag}
            onClick={() => toggle(tag)}
            className={[
              'relative rounded-xl p-3.5 border transition-all cursor-pointer select-none',
              isSelected
                ? 'border-[#E8721A] bg-orange-50/50 shadow-[0_2px_10px_rgba(232,114,26,0.08)]'
                : 'border-gray-200 bg-white active:bg-gray-50',
            ].join(' ')}
          >
            {/* 右上角勾选徽章 */}
            {isSelected && (
              <div className="absolute -top-2 -right-2 w-[22px] h-[22px] bg-[#E8721A] rounded-full flex items-center justify-center shadow-sm z-10">
                <Check size={14} className="text-white" strokeWidth={3} />
              </div>
            )}

            {/* 彩色 lucide 图标（圆形白底容器） */}
            <div className={[
              'w-8 h-8 rounded-full flex items-center justify-center bg-white shadow-sm mb-2',
              isSelected ? 'border border-orange-100' : 'border border-gray-100',
            ].join(' ')}>
              <Icon size={18} className={color} />
            </div>

            {/* 标签名 */}
            <h4 className={[
              'font-medium text-[14px] mt-1',
              isSelected ? 'text-orange-900' : 'text-gray-900',
            ].join(' ')}>
              {config.label}
            </h4>

            {/* 描述文字 */}
            <p className="text-[11px] text-gray-500 mt-1 leading-[1.4] line-clamp-2">
              {config.description}
            </p>
          </div>
        )
      })}
    </div>
  )
}