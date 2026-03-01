/**
 * 宠物健康日志系统 — 类型定义
 * v1.3 新增
 */

// ─── 宠物档案 ────────────────────────────────────────────────────────────────

export interface Pet {
  id: string
  userId: string
  name: string
  breed: string
  gender: 'male' | 'female'
  neutered: boolean
  ageMonths: number     // 创建时填写的月龄（不自动递增）
  weightKg: number      // 基准体重
  createdAt: string
  updatedAt: string
}

// ─── 健康日志 ─────────────────────────────────────────────────────────────────

export type AppetiteLevel = 'excellent' | 'normal' | 'poor'
export type EnergyLevel = 'active' | 'normal' | 'lethargic'
export type DrinkingLevel = 'lots' | 'normal' | 'little'
export type StoolCondition = 'normal' | 'loose' | 'hard' | 'no_info'
export type VomitingFrequency = 'none' | 'occasional' | 'frequent'

export interface PetHealthLog {
  id: string
  petId: string
  userId: string
  date: string          // YYYY-MM-DD，同一天只允许一条记录
  weightKg?: number     // 可选：用户未必每次都称重
  appetite: AppetiteLevel
  energy: EnergyLevel
  drinking: DrinkingLevel
  stool: StoolCondition
  vomiting: VomitingFrequency
  notes?: string        // 自由文字备注
  createdAt: string
}

// ─── AI 健康评估 ───────────────────────────────────────────────────────────────

export type HealthStatus = 'excellent' | 'good' | 'attention' | 'concern'

export interface HealthAssessment {
  id: string
  petId: string
  generatedAt: string
  expiresAt: string     // 缓存 48h
  basedOnLogs: number   // 本次评估使用的日志条数
  overallStatus: HealthStatus
  summary: string       // AI 一句话总结
  keyFindings: string[] // 2-3条关键发现
  dietaryAdvice: string // 饮食调整建议
  careTips: string[]    // 日常护理注意事项
}

// ─── 标签展示辅助 ─────────────────────────────────────────────────────────────

export const APPETITE_LABEL: Record<AppetiteLevel, string> = {
  excellent: '食欲良好',
  normal: '食欲一般',
  poor: '食欲差',
}

export const ENERGY_LABEL: Record<EnergyLevel, string> = {
  active: '精神活跃',
  normal: '精神正常',
  lethargic: '精神萎靡',
}

export const DRINKING_LABEL: Record<DrinkingLevel, string> = {
  lots: '饮水偏多',
  normal: '饮水正常',
  little: '饮水偏少',
}

export const STOOL_LABEL: Record<StoolCondition, string> = {
  normal: '大便正常',
  loose: '大便稀软',
  hard: '大便干硬',
  no_info: '不清楚',
}

export const VOMITING_LABEL: Record<VomitingFrequency, string> = {
  none: '无呕吐',
  occasional: '偶尔呕吐',
  frequent: '频繁呕吐',
}

export const HEALTH_STATUS_CONFIG: Record<HealthStatus, {
  label: string
  emoji: string
  color: string
  bg: string
}> = {
  excellent: { label: '状态极佳', emoji: '🟢', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  good:      { label: '整体良好', emoji: '🟢', color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
  attention: { label: '需要关注', emoji: '🟡', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  concern:   { label: '建议就医', emoji: '🔴', color: 'text-red-600',   bg: 'bg-red-50 border-red-200' },
}

/**
 * 根据日志综合分析，返回一个简单的状态颜色指示
 * 用于 Profile 页宠物卡片的快速预览
 */
export function getLogStatusIndicator(log: PetHealthLog): HealthStatus {
  const warnings: number =
    (log.appetite === 'poor' ? 2 : log.appetite === 'normal' ? 0 : 0) +
    (log.energy === 'lethargic' ? 2 : 0) +
    (log.drinking === 'little' ? 1 : 0) +
    (log.stool === 'loose' || log.stool === 'hard' ? 1 : 0) +
    (log.vomiting === 'frequent' ? 3 : log.vomiting === 'occasional' ? 1 : 0)

  if (warnings >= 5) return 'concern'
  if (warnings >= 3) return 'attention'
  if (warnings >= 1) return 'good'
  return 'excellent'
}
