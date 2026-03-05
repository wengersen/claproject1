/**
 * 前端产品查表工具
 *
 * catfoods.json 会被 bundled 进前端 JS（~15KB gzip），
 * 这样 SSE 只需传 productId + 动态字段，前端在此合并完整数据。
 */

import type { CatFood, ProductRecommendation, FeedingGuide, RecommendResult } from '@/types/cat'
import type { ConflictItem } from '@/lib/conflictDetector'
import data from '@/data/catfoods.json'

// ─── 产品查找表 ─────────────────────────────────────────
const allFoods = data as CatFood[]
const productMap = new Map<string, CatFood>(allFoods.map((f) => [f.id, f]))

export function getProductById(id: string): CatFood | undefined {
  return productMap.get(id)
}

// ─── Slim 类型（API SSE 传输用，不含完整 CatFood）────────
export interface SlimProductRecommendation {
  productId: string
  rank: number
  highlights: string[]
  warnings: string[]
  feedingGuide?: FeedingGuide
}

export interface SlimRecommendResult {
  catProfile: RecommendResult['catProfile']
  healthTags: RecommendResult['healthTags']
  dryFood: SlimProductRecommendation[]
  wetFood: SlimProductRecommendation[]
  generatedAt: string
  disclaimer: string
  conflicts?: ConflictItem[]          // 需求冲突纠偏信息（有冲突时携带）
  originalHealthTags?: RecommendResult['healthTags']  // 用户原始选择（对比展示用）
}

// ─── Hydrate：瘦数据 → 完整数据 ─────────────────────────

function hydrateItem(slim: SlimProductRecommendation): ProductRecommendation | null {
  const product = productMap.get(slim.productId)
  if (!product) {
    console.warn(`[hydrate] product not found: ${slim.productId}`)
    return null
  }
  return {
    product,
    rank: slim.rank,
    reason: product.reason,
    highlights: slim.highlights,
    warnings: slim.warnings,
    feedingGuide: slim.feedingGuide,
  }
}

/**
 * 将 API 返回的 SlimRecommendResult 合并为前端可用的完整 RecommendResult。
 * 找不到的 productId 会被静默跳过（不应发生，但做防御）。
 */
export function hydrateSlimResult(slim: SlimRecommendResult): RecommendResult {
  return {
    catProfile: slim.catProfile,
    healthTags: slim.healthTags,
    dryFood: slim.dryFood.map(hydrateItem).filter((r): r is ProductRecommendation => r !== null),
    wetFood: slim.wetFood.map(hydrateItem).filter((r): r is ProductRecommendation => r !== null),
    generatedAt: slim.generatedAt,
    disclaimer: slim.disclaimer,
    conflicts: slim.conflicts,
    originalHealthTags: slim.originalHealthTags,
  }
}
