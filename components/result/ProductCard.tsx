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

      <div className="p-5 md:p-6">
        <div className="flex gap-4">
          {/* 产品图片 */}
          <div className="w-20 h-20 md:w-24 md:h-24 bg-[#F4F3F0] rounded-xl flex items-center justify-center shrink-0">
            <span className="text-4xl">{product.type === 'dry' ? '🐟' : '🥫'}</span>
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
                <h3 className="text-[17px] font-semibold text-[#2E2B27] leading-snug">
                  {product.productName}
                </h3>
                {product.weightOptions && (
                  <p className="text-[12px] text-[#A8A49C] mt-0.5">
                    规格：{product.weightOptions.join(' / ')}
                  </p>
                )}
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

            {/* 推荐理由 */}
            <div className="mt-3 bg-[#FFF8F3] rounded-xl px-4 py-3 border-l-4 border-[#E8721A]">
              <div className="flex gap-2">
                <span className="text-[#E8721A] text-[14px] shrink-0">✦</span>
                <p className="text-[13px] text-[#4A4641] leading-relaxed italic">{reason}</p>
              </div>
            </div>

            {/* 成分亮点 */}
            <div className="mt-3 flex flex-wrap gap-2">
              {highlights.map((h, i) => (
                <span
                  key={i}
                  className="bg-[#FFF8F3] border border-[#FFB87A] text-[#9A4208] rounded-full px-2.5 py-1 text-[12px]"
                >
                  {h}
                </span>
              ))}
              {product.grainFree && !highlights.includes('无谷物') && (
                <span className="bg-[#F0FDF4] text-[#166534] rounded-full px-2.5 py-1 text-[12px]">
                  无谷物
                </span>
              )}
            </div>

            {/* 警告 */}
            {warnings && warnings.length > 0 && (
              <div className="mt-3 flex gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                <span className="text-amber-500 shrink-0">⚠️</span>
                <p className="text-[12px] text-amber-800">{warnings.join('；')}</p>
              </div>
            )}

            {/* 喂食建议区块（仅主粮 dry food + 有 feedingGuide 数据时展示） */}
            {product.type === 'dry' && feedingGuide && feedingGuide.dailyGramsBase > 0 && (
              <div className="mt-4 bg-[#F4F3F0] rounded-xl px-4 py-3 space-y-2">
                <p className="text-[11px] font-semibold text-[#78746C] uppercase tracking-wide">每日喂食建议</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[22px] font-bold font-mono text-[#E8721A]">
                    {feedingGuide.dailyGramsMin}–{feedingGuide.dailyGramsMax}
                  </span>
                  <span className="text-[13px] text-[#78746C]">克/天</span>
                  <span className="text-[11px] text-[#A8A49C] ml-1">
                    （基准 {feedingGuide.dailyGramsBase}g）
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {feedingGuide.frequency && (
                    <div>
                      <p className="text-[10px] text-[#A8A49C]">喂食频次</p>
                      <p className="text-[12px] text-[#4A4641]">{feedingGuide.frequency}</p>
                    </div>
                  )}
                  {feedingGuide.suitablePeriod && (
                    <div>
                      <p className="text-[10px] text-[#A8A49C]">适合期间</p>
                      <p className="text-[12px] text-[#4A4641]">{feedingGuide.suitablePeriod}</p>
                    </div>
                  )}
                </div>
                {feedingGuide.transitionTip && (
                  <p className="text-[12px] text-[#78746C] flex items-start gap-1.5">
                    <span className="text-[#E8721A] shrink-0">⇄</span>
                    {feedingGuide.transitionTip}
                  </p>
                )}
                {feedingGuide.personalNote && (
                  <p className="text-[12px] text-[#A8A49C] italic border-t border-[#E8E6E1] pt-2">
                    {feedingGuide.personalNote}
                  </p>
                )}
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
