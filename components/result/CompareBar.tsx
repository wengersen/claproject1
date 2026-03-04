'use client'

import type { ProductRecommendation } from '@/types/cat'

interface CompareBarProps {
  comparing: ProductRecommendation[]
  onRemove: (id: string) => void
  onOpenModal: () => void
}

export function CompareBar({ comparing, onRemove, onOpenModal }: CompareBarProps) {
  if (comparing.length < 2) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E8E6E1] shadow-xl">
      <div className="max-w-[900px] mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* 已选产品 */}
        <div className="flex items-center gap-2 overflow-x-auto flex-1 min-w-0">
          <span className="text-[13px] text-[#78746C] shrink-0">对比：</span>
          {comparing.map((rec) => (
            <span
              key={rec.product.id}
              className="flex items-center gap-1.5 bg-[#FFF8F3] border border-[#FFB87A] rounded-full px-3 py-1 text-[12px] text-[#9A4208] shrink-0"
            >
              {rec.product.brand} {rec.product.productName.slice(0, 8)}...
              <button
                onClick={() => onRemove(rec.product.id)}
                className="text-[#A8A49C] hover:text-[#4A4641] transition-colors ml-0.5"
              >
                ×
              </button>
            </span>
          ))}
        </div>

        {/* 对比按钮 */}
        <button
          onClick={onOpenModal}
          className="shrink-0 bg-[#E8721A] text-white px-5 py-2.5 rounded-xl text-[14px] font-semibold shadow-warm hover:bg-[#C45C0A] transition-colors duration-150"
        >
          查看对比 ({comparing.length})
        </button>
      </div>
    </div>
  )
}
