import type { RecommendResult } from './cat'

/**
 * 推荐结果缓存条目
 */
export interface CacheEntry {
  result: RecommendResult
  timestamp: number
}

/**
 * 缓存键生成规则
 * 基于：品种 + 排序后的健康标签
 */
export type CacheKey = string
