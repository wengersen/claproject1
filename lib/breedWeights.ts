/**
 * 品种标准体重表
 *
 * 用于冲突检测引擎：判断猫咪是否超重/偏瘦。
 * 数据来源：各品种猫协会（CFA/TICA）公布的成猫健康体重范围。
 * 注意：幼猫（<12月龄）体重标准另行处理，不适用此表。
 *
 * weightMinKg / weightMaxKg = 成年猫健康体重范围（kg）
 * 超出 weightMaxKg × 1.2 判定为超重
 * 低于 weightMinKg × 0.8 判定为偏瘦
 */

export interface BreedWeightRange {
  breed: string
  weightMinKg: number   // 成猫标准体重下限（kg）
  weightMaxKg: number   // 成猫标准体重上限（kg）
}

/**
 * 品种标准体重数据
 * 与 types/cat.ts 中 CAT_BREEDS 一一对应（22 个品种）
 */
export const BREED_WEIGHT_TABLE: BreedWeightRange[] = [
  { breed: '英国短毛猫',       weightMinKg: 3.5, weightMaxKg: 7.0 },
  { breed: '美国短毛猫',       weightMinKg: 3.0, weightMaxKg: 6.0 },
  { breed: '布偶猫',           weightMinKg: 3.5, weightMaxKg: 9.0 },
  { breed: '缅因猫',           weightMinKg: 5.0, weightMaxKg: 11.0 },
  { breed: '暹罗猫',           weightMinKg: 2.5, weightMaxKg: 5.0 },
  { breed: '波斯猫',           weightMinKg: 3.0, weightMaxKg: 5.5 },
  { breed: '金渐层',           weightMinKg: 3.5, weightMaxKg: 7.0 },
  { breed: '银渐层',           weightMinKg: 3.5, weightMaxKg: 7.0 },
  { breed: '苏格兰折耳猫',     weightMinKg: 2.5, weightMaxKg: 5.5 },
  { breed: '无毛猫（斯芬克斯）', weightMinKg: 3.0, weightMaxKg: 5.5 },
  { breed: '挪威森林猫',       weightMinKg: 4.0, weightMaxKg: 9.0 },
  { breed: '孟加拉猫',         weightMinKg: 3.5, weightMaxKg: 7.0 },
  { breed: '俄罗斯蓝猫',       weightMinKg: 3.0, weightMaxKg: 5.5 },
  { breed: '阿比西尼亚猫',     weightMinKg: 2.5, weightMaxKg: 5.0 },
  { breed: '缅甸猫',           weightMinKg: 3.0, weightMaxKg: 5.5 },
  { breed: '橘猫（田园猫）',   weightMinKg: 3.0, weightMaxKg: 6.0 },
  { breed: '狸花猫（田园猫）', weightMinKg: 3.0, weightMaxKg: 5.5 },
  { breed: '黑猫（田园猫）',   weightMinKg: 3.0, weightMaxKg: 5.5 },
  { breed: '白猫（田园猫）',   weightMinKg: 3.0, weightMaxKg: 5.5 },
  { breed: '三花猫（田园猫）', weightMinKg: 2.5, weightMaxKg: 5.0 },
  { breed: '混血猫',           weightMinKg: 3.0, weightMaxKg: 6.0 },
  { breed: '其他/不确定',       weightMinKg: 3.0, weightMaxKg: 6.0 },
]

// 预构建查找表（O(1) 查询）
const breedWeightMap = new Map<string, BreedWeightRange>(
  BREED_WEIGHT_TABLE.map((b) => [b.breed, b])
)

/**
 * 根据品种名获取标准体重范围
 * 找不到时返回通用范围（3.0-6.0kg）
 */
export function getBreedWeightRange(breed: string): BreedWeightRange {
  return breedWeightMap.get(breed) ?? { breed, weightMinKg: 3.0, weightMaxKg: 6.0 }
}

/**
 * 判断猫咪体重状态
 * - overweight: 超出品种标准上限 × 1.2
 * - underweight: 低于品种标准下限 × 0.8
 * - normal: 健康范围内
 *
 * 幼猫（<12月龄）的体重标准按成猫比例折算：
 *   月龄折算系数 = 0.3 + (月龄 / 12) × 0.7
 *   即 0 月龄 ≈ 成猫的 30%，12 月龄 = 100%
 */
export type WeightStatus = 'overweight' | 'underweight' | 'normal'

export function assessWeightStatus(
  breed: string,
  weightKg: number,
  ageMonths: number
): { status: WeightStatus; breedRange: BreedWeightRange; effectiveMin: number; effectiveMax: number } {
  const breedRange = getBreedWeightRange(breed)

  // 幼猫体重折算
  let effectiveMin = breedRange.weightMinKg
  let effectiveMax = breedRange.weightMaxKg

  if (ageMonths < 12) {
    const ratio = 0.3 + (ageMonths / 12) * 0.7
    effectiveMin = Math.round(breedRange.weightMinKg * ratio * 10) / 10
    effectiveMax = Math.round(breedRange.weightMaxKg * ratio * 10) / 10
  }

  // 判断阈值：超重 = 超出上限 × 1.2，偏瘦 = 低于下限 × 0.8
  const overweightThreshold = effectiveMax * 1.2
  const underweightThreshold = effectiveMin * 0.8

  let status: WeightStatus = 'normal'
  if (weightKg > overweightThreshold) {
    status = 'overweight'
  } else if (weightKg < underweightThreshold) {
    status = 'underweight'
  }

  return { status, breedRange, effectiveMin, effectiveMax }
}
