/**
 * 需求冲突检测引擎
 *
 * 当用户选择的健康需求与猫咪客观数据（体重/年龄）矛盾时，
 * 系统自动修正 healthTags 并生成面向用户的温和解释文案。
 *
 * 4 条矛盾规则：
 * 1. 超重 + 选了"增重/营养"        → 替换为"体重管理"
 * 2. 偏瘦 + 选了"体重管理"          → 替换为"增重/营养"
 * 3. 幼猫(<12月龄) + 选了"老年猫护理" → 移除
 * 4. 老年猫(≥84月龄) + 选了"幼猫发育"  → 移除
 */

import type { CatProfile, HealthTag } from '@/types/cat'
import { assessWeightStatus } from '@/lib/breedWeights'
import { calcAgeMonthsFromBirthday } from '@/lib/formatters'

/** 单条冲突描述 */
export interface ConflictItem {
  /** 冲突类型标识 */
  type: 'weight_overweight_nutrition' | 'weight_underweight_diet' | 'kitten_senior_tag' | 'senior_kitten_tag'
  /** 原始标签 */
  originalTag: HealthTag
  /** 修正后标签（null = 直接移除） */
  correctedTag: HealthTag | null
  /** 面向用户的温和解释文案（顾问口吻） */
  message: string
}

/** 冲突检测结果 */
export interface ConflictDetectionResult {
  /** 是否存在冲突 */
  hasConflicts: boolean
  /** 冲突详情列表 */
  conflicts: ConflictItem[]
  /** 修正后的 healthTags（供后续筛选/LLM 使用） */
  correctedTags: HealthTag[]
  /** 原始 healthTags（用于前端对比展示） */
  originalTags: HealthTag[]
}

/**
 * 检测用户选择的健康需求与猫咪客观数据是否矛盾
 */
export function detectConflicts(
  catProfile: CatProfile,
  healthTags: HealthTag[]
): ConflictDetectionResult {
  const conflicts: ConflictItem[] = []
  let correctedTags = [...healthTags]
  const ageMonths = calcAgeMonthsFromBirthday(catProfile.birthday)
  const catName = catProfile.name || '你的猫咪'
  const genderWord = catProfile.gender === 'female' ? '她' : '他'

  // ── 规则 1 & 2：体重相关冲突 ──────────────────────────
  const { status: weightStatus, breedRange, effectiveMin, effectiveMax } =
    assessWeightStatus(catProfile.breed, catProfile.weightKg, ageMonths)

  const isKitten = ageMonths < 12
  const rangeLabel = isKitten
    ? `${effectiveMin}–${effectiveMax}kg（${ageMonths}月龄参考范围）`
    : `${breedRange.weightMinKg}–${breedRange.weightMaxKg}kg`

  // 规则1：超重 + 选了"增重/营养" → 替换为"体重管理"
  if (weightStatus === 'overweight' && correctedTags.includes('nutrition')) {
    conflicts.push({
      type: 'weight_overweight_nutrition',
      originalTag: 'nutrition',
      correctedTag: 'weight',
      message:
        `根据 ${catName} 的品种和体重综合分析，${genderWord}目前体重 ${catProfile.weightKg}kg，` +
        `已超出${catProfile.breed}标准体重范围（${rangeLabel}）。` +
        `虽然您选择了「增重/营养补充」，但过度摄入热量可能加重代谢负担。` +
        `我们建议优先关注体重管理，以下推荐已按「体重管理」方向为您调整。`,
    })
    correctedTags = correctedTags.filter((t) => t !== 'nutrition')
    if (!correctedTags.includes('weight')) correctedTags.push('weight')
  }

  // 规则2：偏瘦 + 选了"体重管理" → 替换为"增重/营养"
  if (weightStatus === 'underweight' && correctedTags.includes('weight')) {
    conflicts.push({
      type: 'weight_underweight_diet',
      originalTag: 'weight',
      correctedTag: 'nutrition',
      message:
        `根据 ${catName} 的品种和体重综合分析，${genderWord}目前体重 ${catProfile.weightKg}kg，` +
        `低于${catProfile.breed}标准体重范围（${rangeLabel}）。` +
        `虽然您选择了「体重管理」，但对偏瘦猫咪进行限食可能影响健康发育。` +
        `我们建议优先补充营养帮助${catName}恢复健康体重，以下推荐已按「增重/营养补充」方向为您调整。`,
    })
    correctedTags = correctedTags.filter((t) => t !== 'weight')
    if (!correctedTags.includes('nutrition')) correctedTags.push('nutrition')
  }

  // ── 规则 3 & 4：年龄相关冲突 ──────────────────────────

  // 规则3：幼猫(<12月龄) + 选了"老年猫护理" → 移除
  if (ageMonths < 12 && correctedTags.includes('senior')) {
    const ageLabel = ageMonths < 1 ? '不到 1 个月' : `${ageMonths} 个月`
    conflicts.push({
      type: 'kitten_senior_tag',
      originalTag: 'senior',
      correctedTag: null,
      message:
        `${catName} 目前仅 ${ageLabel}大，正处于幼猫快速生长阶段。` +
        `「老年猫护理」方案针对低磷低热量需求设计，不适合幼猫的高营养需求。` +
        `已为您移除该需求，推荐方案将聚焦于其他已选需求。`,
    })
    correctedTags = correctedTags.filter((t) => t !== 'senior')
  }

  // 规则4：老年猫(≥84月龄) + 选了"幼猫发育" → 移除
  if (ageMonths >= 84 && correctedTags.includes('kitten')) {
    const ageYears = Math.floor(ageMonths / 12)
    conflicts.push({
      type: 'senior_kitten_tag',
      originalTag: 'kitten',
      correctedTag: null,
      message:
        `${catName} 目前已 ${ageYears} 岁，属于老年猫阶段。` +
        `「幼猫发育」方案含有高热量高蛋白配比，长期给老年猫食用可能增加肾脏和代谢负担。` +
        `已为您移除该需求，推荐方案将聚焦于其他已选需求。`,
    })
    correctedTags = correctedTags.filter((t) => t !== 'kitten')
  }

  // 兜底：修正后若标签为空，补"日常均衡"
  if (correctedTags.length === 0) {
    correctedTags.push('balanced')
  }

  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
    correctedTags,
    originalTags: [...healthTags],
  }
}