'use client'

import { ProductRecommendation } from '@/types/cat'
import { formatPrice, formatBrandTier, formatNutrientLevel } from '@/lib/formatters'

interface CompareModalProps {
  comparing: ProductRecommendation[]
  onClose: () => void
}

const COMPARE_ROWS = [
  { label: '品牌', key: 'brand', render: (rec: ProductRecommendation) => rec.product.brand },
  { label: '品牌档位', key: 'tier', render: (rec: ProductRecommendation) => formatBrandTier(rec.product.brandTier) },
  { label: '价格', key: 'price', render: (rec: ProductRecommendation) => formatPrice(rec.product) },
  { label: '蛋白质来源', key: 'protein', render: (rec: ProductRecommendation) => rec.product.proteinSource.join('、') },
  { label: '无谷物', key: 'grain', render: (rec: ProductRecommendation) => rec.product.grainFree ? '✅ 是' : '❌ 否' },
  { label: '热量 (kcal/100g)', key: 'calories', render: (rec: ProductRecommendation) => `${rec.product.calories}` },
  { label: '磷含量', key: 'phosphorus', render: (rec: ProductRecommendation) => formatNutrientLevel(rec.product.phosphorusLevel).label },
  { label: '镁含量', key: 'magnesium', render: (rec: ProductRecommendation) => formatNutrientLevel(rec.product.magnesiumLevel).label },
  { label: '适用阶段', key: 'stage', render: (rec: ProductRecommendation) => rec.product.lifeStage.map(s => s === 'kitten' ? '幼猫' : s === 'adult' ? '成猫' : '老年猫').join('、') },
  { label: '功效', key: 'tags', render: (rec: ProductRecommendation) => rec.product.keyIngredients.slice(0, 3).join('、') },
]

export function CompareModal({ comparing, onClose }: CompareModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4 pb-4">
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 弹窗 */}
      <div className="relative bg-white rounded-3xl w-full max-w-[860px] max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E8E6E1] shrink-0">
          <h2 className="text-[20px] font-bold text-[#1A1815]">产品对比</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F4F3F0] text-[#78746C] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 对比表格 */}
        <div className="overflow-auto flex-1">
          <table className="w-full">
            <thead className="sticky top-0 bg-white z-10">
              <tr>
                <th className="text-left px-6 py-4 text-[13px] font-medium text-[#A8A49C] w-32 border-b border-[#E8E6E1]">
                  对比维度
                </th>
                {comparing.map((rec) => (
                  <th
                    key={rec.product.id}
                    className="px-4 py-4 border-b border-[#E8E6E1] min-w-[180px]"
                  >
                    <div className="text-[13px] font-semibold text-[#2E2B27] text-left leading-tight">
                      {rec.product.productName.slice(0, 16)}
                      {rec.product.productName.length > 16 ? '...' : ''}
                    </div>
                    <div className="text-[11px] text-[#A8A49C] text-left mt-0.5">{rec.product.brand}</div>
                    {rec.rank === 1 && (
                      <span className="inline-block mt-1 bg-[#E8721A] text-white text-[10px] px-2 py-0.5 rounded-full">
                        最优推荐
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map((row, idx) => (
                <tr key={row.key} className={idx % 2 === 0 ? 'bg-[#FAFAF8]' : 'bg-white'}>
                  <td className="px-6 py-3.5 text-[13px] text-[#78746C] font-medium">
                    {row.label}
                  </td>
                  {comparing.map((rec) => {
                    const value = row.render(rec)
                    // 热量：最低的高亮
                    const isCalRow = row.key === 'calories'
                    const minCal = isCalRow
                      ? Math.min(...comparing.map((r) => r.product.calories))
                      : null
                    const isBest = isCalRow && rec.product.calories === minCal

                    return (
                      <td
                        key={rec.product.id}
                        className={[
                          'px-4 py-3.5 text-[14px]',
                          isBest
                            ? 'text-[#E8721A] font-semibold bg-[#FFF8F3]'
                            : 'text-[#4A4641]',
                        ].join(' ')}
                      >
                        {value}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
