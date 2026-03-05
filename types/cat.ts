// ============================================================
// 核心类型定义 — 猫咪营养顾问系统
// ============================================================

/** 生命阶段 */
export type LifeStage = 'kitten' | 'adult' | 'senior'

/** 产品类型 */
export type ProductType = 'dry' | 'wet'

/** 品牌档位 */
export type BrandTier = 'premium' | 'mid' | 'budget'

/** 磷/镁含量等级 */
export type NutrientLevel = 'low' | 'mid' | 'high'

/**
 * 健康标签 — 与前端展示和数据库筛选完全对应
 * urinary   = 泌尿道健康
 * weight    = 体重管理
 * digest    = 消化敏感
 * skin      = 皮毛养护
 * joint     = 关节健康
 * picky     = 挑食猫咪
 * allergy   = 过敏体质
 * nutrition = 增重/营养补充
 * senior    = 老年猫护理
 * kitten    = 幼猫发育
 * balanced  = 日常均衡（无特殊需求）
 */
export type HealthTag =
  | 'urinary'
  | 'weight'
  | 'digest'
  | 'skin'
  | 'joint'
  | 'picky'
  | 'allergy'
  | 'nutrition'
  | 'senior'
  | 'kitten'
  | 'balanced'

/** 购买链接（预留，MVP 为空数组） */
export interface BuyLink {
  platform: 'taobao' | 'jd' | 'pdd' | 'official' | 'other'
  url: string
  price?: number
}

/** 猫粮/罐头数据库条目 */
export interface CatFood {
  id: string
  brand: string                      // 品牌名（中文）
  brandEn?: string                   // 品牌英文名
  brandTier: BrandTier               // 品牌档位
  productName: string                // 产品名（中文）
  productNameEn?: string             // 产品英文名
  type: ProductType                  // dry=主粮 / wet=罐头
  lifeStage: LifeStage[]             // 适用生命阶段（可多个）
  proteinSource: string[]            // 主要蛋白质来源，如 ['鸡肉', '三文鱼']
  grainFree: boolean                 // 是否无谷物
  keyIngredients: string[]           // 关键功能成分标签
  phosphorusLevel: NutrientLevel     // 磷含量（泌尿道筛选关键）
  magnesiumLevel: NutrientLevel      // 镁含量（泌尿道筛选关键）
  calories: number                   // 热量 kcal/100g（干物质基础）
  functionalTags: HealthTag[]        // 适用健康场景（Layer 1 筛选依据）
  priceMin: number                   // 价格区间下限（元/kg 或 元/罐）
  priceMax: number                   // 价格区间上限
  priceUnit: 'per_kg' | 'per_can'   // 价格单位
  priceSource?: string               // 价格数据来源，如 "淘宝旗舰店" | "京东自营"
  priceUpdatedAt?: string            // 价格更新时间，如 "2025-03"
  weightOptions?: string[]           // 可购规格，如 ['1.5kg', '5kg']
  availableInChina: boolean          // 国内是否易购买（入库必须为 true）
  buyLinks: BuyLink[]                // 购买链接（预留）
  reason: string                     // 产品核心特点描述（静态文案，不依赖LLM）
  notes?: string                     // 备注（特殊说明/注意事项）
  imageUrl?: string                  // 产品图片（预留）
}

/** 猫咪档案 — 用户填写的基本信息 */
export interface CatProfile {
  name: string                       // 猫咪名字
  breed: string                      // 品种（来自预设列表或自定义）
  birthday: string                   // 生日（YYYY-MM-DD），月龄由此实时计算
  ageStage: LifeStage                // 生命阶段（由 birthday 计算月龄后推断）
  weightKg: number                   // 体重（公斤）
  gender: 'male' | 'female'          // 性别
  neutered: boolean                  // 是否绝育
}

/** 推荐请求参数 */
export interface RecommendRequest {
  catProfile: CatProfile
  healthTags: HealthTag[]
  customInput?: string               // 用户自定义输入（自然语言）
}

/** 每日喂食建议（仅主粮产品携带） */
export interface FeedingGuide {
  dailyGramsBase: number   // 基准克数（公式计算）
  dailyGramsMin: number    // 最少克数（基准 -10%）
  dailyGramsMax: number    // 最多克数（基准 +10%）
  frequency: string        // 喂食频次（LLM 生成）如"每日2-3次"
  suitablePeriod: string   // 适合使用期间（LLM 生成）
  transitionTip: string    // 换粮过渡建议（LLM 生成）
  personalNote: string     // 个性化注意事项（LLM 生成）
}

/** 单条产品推荐结果 */
export interface ProductRecommendation {
  product: CatFood
  rank: number                       // 推荐排名（1=最优）
  reason: string                     // 个性化推荐理由（2-3句，通俗中文）
  highlights: string[]               // 成分/功效亮点（3-4个关键词）
  warnings: string[]                 // 注意事项（如有）
  matchScore?: number                // 匹配度分数（0-100，供内部排序）
  feedingGuide?: FeedingGuide        // 喂食建议（仅 dry food 携带）
}

/** 完整推荐结果 */
export interface RecommendResult {
  id?: string                        // 客户端生成的 resultId（API 不再下发，由 localStorage key 承担）
  catProfile: CatProfile
  healthTags: HealthTag[]            // 实际用于推荐的标签（已纠偏）
  originalHealthTags?: HealthTag[]   // 用户原始选择的标签（有冲突时才存在）
  dryFood: ProductRecommendation[]   // 主粮推荐（3-5款）
  wetFood: ProductRecommendation[]   // 罐头推荐（2-3款）
  generatedAt: string                // ISO 时间戳
  disclaimer: string                 // 免责声明
  conflicts?: import('@/lib/conflictDetector').ConflictItem[]  // 需求冲突纠偏信息
}

// ============================================================
// 前端展示用常量
// ============================================================

/** 健康标签展示配置 */
export const HEALTH_TAG_CONFIG: Record<
  HealthTag,
  { label: string; description: string; emoji: string; color: string }
> = {
  urinary:   { label: '泌尿道健康', description: '减少泌尿道结晶风险，促进饮水', emoji: '💧', color: 'bg-blue-50 border-blue-200' },
  weight:    { label: '体重管理',   description: '控制卡路里，保持健康体型',      emoji: '⚖️', color: 'bg-green-50 border-green-200' },
  digest:    { label: '消化敏感',   description: '温和配方，减少肠胃不适',        emoji: '🌿', color: 'bg-orange-50 border-orange-200' },
  skin:      { label: '皮毛养护',   description: 'Omega-3 丰富，亮泽毛发',       emoji: '✨', color: 'bg-purple-50 border-purple-200' },
  joint:     { label: '关节健康',   description: '适合中老年猫，支持关节灵活',    emoji: '🦴', color: 'bg-teal-50 border-teal-200' },
  picky:     { label: '挑食猫咪',   description: '口味多样，提升进食意愿',        emoji: '🎯', color: 'bg-yellow-50 border-yellow-200' },
  allergy:   { label: '过敏体质',   description: '有限食材，降低过敏风险',        emoji: '🛡️', color: 'bg-rose-50 border-rose-200' },
  nutrition: { label: '增重/营养',  description: '高蛋白高热量，适合偏瘦/术后猫', emoji: '💪', color: 'bg-amber-50 border-amber-200' },
  senior:    { label: '老年猫护理', description: '低磷易消化，支持老年健康',      emoji: '👴', color: 'bg-slate-50 border-slate-200' },
  kitten:    { label: '幼猫发育',   description: '高蛋白高热量，促进健康成长',    emoji: '🍼', color: 'bg-pink-50 border-pink-200' },
  balanced:  { label: '日常均衡',   description: '无特殊需求，全面营养均衡',      emoji: '😺', color: 'bg-neutral-50 border-neutral-200' },
}

/** 猫咪常见品种列表 */
export const CAT_BREEDS = [
  '英国短毛猫',
  '美国短毛猫',
  '布偶猫',
  '缅因猫',
  '暹罗猫',
  '波斯猫',
  '金渐层',
  '银渐层',
  '苏格兰折耳猫',
  '无毛猫（斯芬克斯）',
  '挪威森林猫',
  '孟加拉猫',
  '俄罗斯蓝猫',
  '阿比西尼亚猫',
  '缅甸猫',
  '橘猫（田园猫）',
  '狸花猫（田园猫）',
  '黑猫（田园猫）',
  '白猫（田园猫）',
  '三花猫（田园猫）',
  '混血猫',
  '其他/不确定',
] as const

/** 由月龄推断生命阶段 */
export function inferLifeStage(ageMonths: number): LifeStage {
  if (ageMonths < 12) return 'kitten'
  if (ageMonths < 84) return 'adult'   // 7岁 = 84个月
  return 'senior'
}

/** 品牌档位中文标签 */
export const BRAND_TIER_LABEL: Record<BrandTier, string> = {
  premium: '高端',
  mid:     '中端',
  budget:  '经济',
}