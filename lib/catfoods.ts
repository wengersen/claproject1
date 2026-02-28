import type { CatFood, CatProfile, HealthTag, LifeStage } from '@/types/cat'
import data from '@/data/catfoods.json'

// 类型断言（JSON 数据）
const allFoods = data as CatFood[]

/**
 * Layer 1 硬筛选：
 * 根据猫咪生命阶段 + 健康标签，从数据库筛选候选产品集
 * 防止 LLM 幻觉：只允许从候选集内推荐
 */
export function filterCandidates(
  profile: CatProfile,
  healthTags: HealthTag[]
): { dryFoods: CatFood[]; wetFoods: CatFood[] } {
  const { ageStage } = profile

  // 基础筛选：生命阶段匹配 + 国内可购买
  let candidates = allFoods.filter(
    (food) =>
      food.availableInChina &&
      food.lifeStage.includes(ageStage as LifeStage)
  )

  // 健康标签加权筛选
  // 如果有泌尿道标签，优先筛选低磷/低镁产品
  if (healthTags.includes('urinary')) {
    const urinäryCandidates = candidates.filter(
      (food) =>
        food.phosphorusLevel === 'low' ||
        food.magnesiumLevel === 'low' ||
        food.functionalTags.includes('urinary')
    )
    // 至少保留一部分结果，防止候选集为空
    if (urinäryCandidates.length >= 4) {
      candidates = urinäryCandidates
    }
  }

  // 如果有体重管理标签
  if (healthTags.includes('weight')) {
    const weightCandidates = candidates.filter(
      (food) =>
        food.functionalTags.includes('weight') ||
        food.calories < 360
    )
    if (weightCandidates.length >= 3) {
      candidates = candidates.filter(
        (food) =>
          food.functionalTags.includes('weight') ||
          food.calories < 380 // 稍宽松以保证候选集
      )
    }
  }

  // 如果有过敏标签，筛选低过敏原或单一蛋白质产品
  if (healthTags.includes('allergy')) {
    const allergyCandidates = candidates.filter((food) =>
      food.functionalTags.includes('allergy') ||
      food.proteinSource.length === 1
    )
    if (allergyCandidates.length >= 3) {
      candidates = allergyCandidates
    }
  }

  // 老年猫：筛选低磷产品
  if (healthTags.includes('senior') || ageStage === 'senior') {
    const seniorCandidates = candidates.filter(
      (food) =>
        food.phosphorusLevel === 'low' ||
        food.functionalTags.includes('senior')
    )
    if (seniorCandidates.length >= 3) {
      candidates = seniorCandidates
    }
  }

  // 按标签匹配度排序（匹配标签越多越靠前）
  const scored = candidates.map((food) => ({
    food,
    score: healthTags.filter((tag) => food.functionalTags.includes(tag)).length,
  }))
  scored.sort((a, b) => b.score - a.score)

  const sorted = scored.map((s) => s.food)

  return {
    dryFoods: sorted.filter((f) => f.type === 'dry').slice(0, 8),
    wetFoods: sorted.filter((f) => f.type === 'wet').slice(0, 6),
  }
}

/** 根据 ID 获取产品 */
export function getFoodById(id: string): CatFood | undefined {
  return allFoods.find((f) => f.id === id)
}

/** 获取全部产品 */
export function getAllFoods(): CatFood[] {
  return allFoods
}
