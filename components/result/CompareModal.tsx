'use client'

import { useState } from 'react'
import { ProductRecommendation } from '@/types/cat'
import type { HealthTag } from '@/types/cat'
import { formatPrice, formatBrandTier, formatNutrientLevel } from '@/lib/formatters'

interface CompareModalProps {
  comparing: ProductRecommendation[]
  onClose: () => void
  healthTags?: HealthTag[]
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

const ROW_EXPLANATIONS: Record<string, { base: string; tags?: Partial<Record<HealthTag, string>> }> = {
  phosphorus: {
    base: '磷是猫咪必需矿物质，但摄入过多会加重肾脏过滤负担。成猫干粮磷含量建议在 0.5–1.0% 范围内。',
    tags: {
      urinary: '泌尿道敏感猫咪应优先选低磷产品，减少肾脏代谢压力，有助降低草酸钙结晶风险。',
      senior: '老年猫肾功能减弱，建议选择磷含量偏低的产品，以延缓肾脏衰老进程。',
    },
  },
  magnesium: {
    base: '镁参与猫咪骨骼和神经功能，但过高的镁摄入与鸟粪石（磷酸铵镁）尿结晶风险有关。',
    tags: {
      urinary: '泌尿道问题猫咪应选低镁产品。镁含量偏高会促进鸟粪石结晶形成，加剧下泌尿道疾病症状。',
    },
  },
  calories: {
    base: '热量（kcal/100g）反映该产品的能量密度。相同喂食量下，热量越高摄入能量越多。',
    tags: {
      weight: '体重管理猫咪应优先选低热量产品，同等饱腹感下减少热量摄入，有助于健康减重。',
      kitten: '幼猫生长发育旺盛，需要更高的能量密度支撑体格发育，优先选热量较高的产品。',
      nutrition: '增重/营养补充猫咪需要更高热量密度，选热量较高的产品有助于快速补充能量、恢复体重。',
    },
  },
  protein: {
    base: '蛋白质来源决定氨基酸谱系和消化率。优质肉类蛋白（鸡、鱼、牛）的消化率高于植物蛋白。',
    tags: {
      allergy: '过敏猫咪需注意蛋白质来源。若已知过敏源（如鸡肉），应选用水解蛋白或新型蛋白（鸭、兔、鲱鱼）产品。',
      digest: '消化敏感猫咪适合单一蛋白质来源，多种混合蛋白更易引起肠胃负担，建议选来源简单的产品。',
    },
  },
  grain: {
    base: '无谷物配方去除小麦、玉米等谷物，减少潜在过敏原，通常用豌豆、薯类等替代淀粉来源。',
    tags: {
      allergy: '过敏体质猫咪建议优先选无谷物产品，谷物蛋白（麸质等）是常见过敏原之一。',
      digest: '消化敏感猫咪选无谷物产品可降低谷物淀粉带来的消化负担，有助于粪便成形。',
    },
  },
  stage: {
    base: '不同生命阶段配方针对营养需求定制：幼猫粮蛋白质和热量更高，老年猫粮磷更低、关节营养更丰富。',
    tags: {
      kitten: '幼猫必须选用幼猫（kitten）阶段配方，成猫粮营养浓度不足，无法支撑幼猫的快速生长。',
      senior: '老年猫建议选用老年猫（senior）专用配方，关节、肾脏支持更完善，更易消化吸收。',
    },
  },
}

const LEVEL_ORDER = ['very_low', 'low', 'moderate', 'high', 'very_high']

function getHighlightClass(
  rowKey: string,
  rec: ProductRecommendation,
  comparing: ProductRecommendation[],
  healthTags: HealthTag[]
): string {
  if (rowKey === 'calories') {
    const wantsHigh = healthTags.includes('kitten') || healthTags.includes('nutrition')
    const wantsLow = healthTags.includes('weight')
    const cals = comparing.map((r) => r.product.calories)
    const target = wantsHigh ? Math.max(...cals) : Math.min(...cals)
    if (rec.product.calories === target && (wantsHigh || wantsLow || true)) {
      return 'text-[#E8721A] font-semibold bg-[#FFF8F3]'
    }
  }

  if (rowKey === 'phosphorus' && (healthTags.includes('urinary') || healthTags.includes('senior'))) {
    const levels = comparing.map((r) => LEVEL_ORDER.indexOf(r.product.phosphorusLevel))
    const minIdx = Math.min(...levels)
    if (LEVEL_ORDER.indexOf(rec.product.phosphorusLevel) === minIdx) {
      return 'text-[#E8721A] font-semibold bg-[#FFF8F3]'
    }
  }

  if (rowKey === 'magnesium' && healthTags.includes('urinary')) {
    const levels = comparing.map((r) => LEVEL_ORDER.indexOf(r.product.magnesiumLevel))
    const minIdx = Math.min(...levels)
    if (LEVEL_ORDER.indexOf(rec.product.magnesiumLevel) === minIdx) {
      return 'text-[#E8721A] font-semibold bg-[#FFF8F3]'
    }
  }

  return 'text-[#4A4641]'
}

const EXPLAINABLE_KEYS = new Set(Object.keys(ROW_EXPLANATIONS))

export function CompareModal({ comparing, onClose, healthTags = [] }: CompareModalProps) {
  const [explainRow, setExplainRow] = useState<string | null>(null)

  function getExplanation(key: string): string {
    const entry = ROW_EXPLANATIONS[key]
    if (!entry) return ''
    for (const tag of healthTags) {
      if (entry.tags?.[tag]) return entry.tags[tag]!
    }
    return entry.base
  }

  const explainRowLabel = COMPARE_ROWS.find((r) => r.key === explainRow)?.label ?? ''

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
                    <span className="flex items-center gap-1.5">
                      {row.label}
                      {EXPLAINABLE_KEYS.has(row.key) && (
                        <button
                          onClick={() => setExplainRow(explainRow === row.key ? null : row.key)}
                          className={[
                            'w-4 h-4 rounded-full text-[10px] flex items-center justify-center border transition-colors shrink-0',
                            explainRow === row.key
                              ? 'bg-[#E8721A] text-white border-[#E8721A]'
                              : 'text-[#A8A49C] border-[#D1CEC7] hover:border-[#E8721A] hover:text-[#E8721A]',
                          ].join(' ')}
                          aria-label={`查看${row.label}说明`}
                        >
                          ⓘ
                        </button>
                      )}
                    </span>
                  </td>
                  {comparing.map((rec) => {
                    const value = row.render(rec)
                    const highlightClass = getHighlightClass(row.key, rec, comparing, healthTags)

                    return (
                      <td
                        key={rec.product.id}
                        className={['px-4 py-3.5 text-[14px]', highlightClass].join(' ')}
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

        {/* 成分说明 bottom sheet */}
        {explainRow && (
          <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-[#E8E6E1] rounded-b-3xl px-6 py-5 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] z-20 animate-slide-up">
            <div className="flex items-start justify-between gap-3 mb-2">
              <p className="text-[14px] font-semibold text-[#1A1815]">{explainRowLabel} 说明</p>
              <button
                onClick={() => setExplainRow(null)}
                className="text-[#A8A49C] hover:text-[#4A4641] transition-colors text-[18px] leading-none shrink-0"
              >
                ✕
              </button>
            </div>
            <p className="text-[13px] text-[#4A4641] leading-relaxed">
              {getExplanation(explainRow)}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
