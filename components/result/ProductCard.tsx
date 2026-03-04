'use client'

import type { ProductRecommendation } from '@/types/cat'
import { formatPrice, estimateMonthlyDryCost, formatBrandTier } from '@/lib/formatters'

interface ProductCardProps {
  recommendation: ProductRecommendation
  isTop?: boolean
  isComparing?: boolean
  onToggleCompare?: () => void
  layout?: 'horizontal' | 'vertical'
  onSetAsMainFood?: () => void
  isCurrentMainFood?: boolean
}

export function ProductCard({
  recommendation,
  isTop = false,
  isComparing = false,
  onToggleCompare,
  layout = 'horizontal',
  onSetAsMainFood,
  isCurrentMainFood = false,
}: ProductCardProps) {
  const { product, reason, highlights, warnings, feedingGuide } = recommendation

  if (layout === 'vertical') {
    return (
      <div
        className={[
          'relative bg-white rounded-2xl border transition-all duration-200 overflow-hidden',
          'hover:shadow-md hover:-translate-y-0.5',
          isTop ? 'border-2 border-[#E8721A]' : 'border border-[#E8E6E1]',
          isComparing ? 'ring-2 ring-[#E8721A]/30' : '',
        ].join(' ')}
      >
        {/* 产品图片 */}
        <div className="w-full h-40 bg-[#F4F3F0] flex items-center justify-center rounded-t-xl">
          <span className="text-5xl">🥫</span>
        </div>

        <div className="p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[#A8A49C] mb-1">
            {product.brand} · {formatBrandTier(product.brandTier)}
          </div>
          <h3 className="text-[16px] font-semibold text-[#2E2B27] leading-tight line-clamp-2">
            {product.productName}
          </h3>

          {product.weightOptions && (
            <p className="text-[12px] text-[#A8A49C] mt-1">
              规格：{product.weightOptions.join(' / ')}
            </p>
          )}

          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-[20px] font-bold font-mono text-[#E8721A]">
              {formatPrice(product).split('/')[0]}
            </span>
            <span className="text-[12px] text-[#A8A49C]">
              /{product.priceUnit === 'per_kg' ? 'kg' : '罐'}
            </span>
          </div>

          <p className="text-[13px] text-[#78746C] mt-3 leading-relaxed line-clamp-3">{reason}</p>

          {onToggleCompare && (
            <button
              onClick={onToggleCompare}
              className={[
                'mt-4 w-full py-2 rounded-lg text-[13px] font-medium transition-colors duration-150',
                isComparing
                  ? 'bg-[#FFF8F3] text-[#E8721A] border border-[#E8721A]'
                  : 'bg-[#F4F3F0] text-[#78746C] hover:bg-[#FFF8F3] hover:text-[#E8721A]',
              ].join(' ')}
            >
              {isComparing ? '✓ 已加入对比' : '+ 加入对比'}
            </button>
          )}
        </div>
      </div>
    )
  }

  // 横向布局（主粮）
  return (
    <div
      className={[
        'relative bg-white rounded-2xl border transition-all duration-200',
        'hover:shadow-md hover:-translate-y-0.5',
        isTop ? 'border-2 border-[#E8721A]' : 'border border-[#E8E6E1]',
        isComparing ? 'ring-2 ring-[#E8721A]/30' : '',
      ].join(' ')}
    >
      {/* 最优推荐 badge */}
      {isTop && (
        <div className="absolute top-0 left-0 bg-[#E8721A] text-white text-[11px] font-semibold px-3 py-1.5 rounded-tl-2xl rounded-br-xl z-10">
          ✦ 最优推荐
        </div>
      )}

      <div className="p-4">
        <div className="flex gap-4">
          {/* 产品图片 */}
          <div className="w-14 h-14 bg-[#F4F3F0] rounded-xl flex items-center justify-center shrink-0 mt-1">
            <span className="text-3xl">{product.type === 'dry' ? '🐟' : '🥫'}</span>
          </div>

          {/* 主要信息 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-[#A8A49C] mb-0.5">
                  {product.brand} · {formatBrandTier(product.brandTier)}
                  {product.grainFree && (
                    <span className="ml-2 bg-[#F0FDF4] text-[#166534] px-1.5 py-0.5 rounded text-[10px]">
                      无谷物
                    </span>
                  )}
                </div>
                <h3 className="text-[16px] font-semibold text-[#2E2B27] leading-snug">
                  {product.productName}
                </h3>
              </div>

              {/* 价格 */}
              <div className="text-right shrink-0">
                <div className="flex items-baseline gap-0.5 justify-end">
                  <span className="text-[22px] font-bold font-mono text-[#2E2B27]">
                    {formatPrice(product).split('/')[0]}
                  </span>
                  <span className="text-[12px] text-[#A8A49C]">
                    /{product.priceUnit === 'per_kg' ? 'kg' : '罐'}
                  </span>
                </div>
                {product.type === 'dry' && (
                  <p className="text-[11px] text-[#A8A49C] mt-0.5">
                    {estimateMonthlyDryCost(product)}
                  </p>
                )}
              </div>
            </div>

            {/* 推荐理由（精简，限 2 行） */}
            <p className="mt-2 text-[12px] text-[#78746C] leading-snug line-clamp-2">{reason}</p>

            {/* Tags：成分亮点 */}
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {highlights.map((h, i) => (
                <span
                  key={i}
                  className="bg-[#FFF8F3] border border-[#FFB87A] text-[#9A4208] rounded-full px-2.5 py-0.5 text-[12px]"
                >
                  {h}
                </span>
              ))}
              {product.grainFree && !highlights.includes('无谷物') && (
                <span className="bg-[#F0FDF4] text-[#166534] rounded-full px-2.5 py-0.5 text-[12px]">
                  无谷物
                </span>
              )}
            </div>

            {/* 喂食建议：喂食量 + 频次 + 适合期间 + 个性化备注 */}
            {product.type === 'dry' && feedingGuide && feedingGuide.dailyGramsBase > 0 && (
              <div className="mt-2.5 bg-[#F4F3F0] rounded-xl px-3 py-2.5 space-y-1.5">
                {/* 第一行：喂食量 + 频次 */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-[13px] text-[#78746C]">
                    每日喂食：
                    <span className="font-bold text-[#E8721A] font-mono">
                      {feedingGuide.dailyGramsMin}–{feedingGuide.dailyGramsMax}g
                    </span>
                  </span>
                  {feedingGuide.frequency && (
                    <span className="text-[12px] text-[#A8A49C]">{feedingGuide.frequency}</span>
                  )}
                </div>
                {/* 第二行：适合期间 */}
                {feedingGuide.suitablePeriod && (
                  <p className="text-[12px] text-[#A8A49C]">适合期间：{feedingGuide.suitablePeriod}</p>
                )}
                {/* 第三行：个性化备注 */}
                {feedingGuide.personalNote && (
                  <p className="text-[12px] text-[#78746C] italic border-t border-[#E8E6E1] pt-1.5">
                    {feedingGuide.personalNote}
                  </p>
                )}
              </div>
            )}

            {/* 注意事项 */}
            {warnings && warnings.length > 0 && (
              <div className="mt-2 flex gap-1.5 items-start">
                <span className="text-amber-500 text-[12px] shrink-0 mt-px">⚠️</span>
                <p className="text-[12px] text-amber-700 leading-snug">{warnings.join('；')}</p>
              </div>
            )}

            {/* 底部操作栏：对比 + 设为主食 */}
            <div className="mt-3 flex items-center justify-between gap-3">
              {onToggleCompare && (
                <button
                  onClick={onToggleCompare}
                  className={[
                    'text-[13px] font-medium transition-colors duration-150 px-3 py-1.5 rounded-lg',
                    isComparing
                      ? 'text-[#E8721A] bg-[#FFF8F3] border border-[#E8721A]'
                      : 'text-[#78746C] hover:text-[#E8721A] hover:bg-[#FFF8F3]',
                  ].join(' ')}
                >
                  {isComparing ? '✓ 已加入对比' : '+ 加入对比'}
                </button>
              )}
              {onSetAsMainFood && product.type === 'dry' && (
                <button
                  onClick={onSetAsMainFood}
                  disabled={isCurrentMainFood}
                  className={[
                    'text-[13px] font-medium px-4 py-1.5 rounded-lg border transition-all duration-150',
                    isCurrentMainFood
                      ? 'bg-green-50 text-green-700 border-green-200 cursor-default'
                      : 'bg-[#FFF8F3] text-[#E8721A] border-[#FFB87A] hover:bg-[#E8721A] hover:text-white hover:border-[#E8721A]',
                  ].join(' ')}
                >
                  {isCurrentMainFood ? '✓ 当前主食' : '设为当前主食'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
