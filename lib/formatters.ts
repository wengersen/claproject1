import type { CatFood, BrandTier, NutrientLevel } from '@/types/cat'

/** 格式化价格区间 */
export function formatPrice(food: CatFood): string {
  const { priceMin, priceMax, priceUnit } = food
  const unit = priceUnit === 'per_kg' ? '/kg' : '/罐'
  if (priceMin === priceMax) return `¥${priceMin}${unit}`
  return `¥${priceMin}-${priceMax}${unit}`
}

/** 估算每月消费（干粮，成猫约 50g/天） */
export function estimateMonthlyDryCost(food: CatFood): string {
  if (food.type !== 'dry') return ''
  const dailyGrams = 50
  const monthlyKg = (dailyGrams * 30) / 1000
  const avgPrice = (food.priceMin + food.priceMax) / 2
  const monthly = Math.round(avgPrice * monthlyKg)
  return `约¥${monthly}/月`
}

/** 品牌档位中文 */
export function formatBrandTier(tier: BrandTier): string {
  const map: Record<BrandTier, string> = {
    premium: '高端',
    mid: '中端',
    budget: '经济',
  }
  return map[tier]
}

/** 营养水平中文 */
export function formatNutrientLevel(level: NutrientLevel): { label: string; color: string } {
  const map: Record<NutrientLevel, { label: string; color: string }> = {
    low: { label: '低', color: 'text-green-600' },
    mid: { label: '中', color: 'text-yellow-600' },
    high: { label: '高', color: 'text-red-500' },
  }
  return map[level]
}

/** 生成结果 ID */
export function generateResultId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** 截断文字 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}
