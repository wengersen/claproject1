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

  // ── 健康标签加权筛选 ──────────────────────────────────────────────────────
  // 策略：各标签独立评分（0/1/2分），最终按总分排序，避免多标签串行缩减导致候选集过小。
  // 同时对"强匹配"产品做加权，确保关键筛选条件优先级高于通用产品。

  const scored = candidates.map((food) => {
    // 基础分：功效标签匹配数（每匹配1个 +1分）
    let score = healthTags.filter((tag) => food.functionalTags.includes(tag)).length

    // 额外加权：泌尿道 —— 低磷/低镁优先（+2分）
    if (healthTags.includes('urinary')) {
      if (food.phosphorusLevel === 'low') score += 2
      if (food.magnesiumLevel === 'low') score += 1
    }

    // 额外加权：体重管理 —— 低热量（< 360 kcal）优先（+2分），< 380 kcal（+1分）
    // 修复原Bug：不再先筛后放宽，改为统一打分保证候选集完整
    if (healthTags.includes('weight')) {
      if (food.calories < 360) score += 2
      else if (food.calories < 380) score += 1
    }

    // 额外加权：过敏 —— 单一蛋白质来源优先（+2分）
    if (healthTags.includes('allergy')) {
      if (food.proteinSource.length === 1) score += 2
    }

    // 额外加权：老年猫 —— 低磷优先（+2分）
    if (healthTags.includes('senior') || ageStage === 'senior') {
      if (food.phosphorusLevel === 'low') score += 2
    }

    return { food, score }
  })

  // 按总分降序排列（分数相同时保持原始顺序）
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
