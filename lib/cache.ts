import type { RecommendResult } from '@/types/cat'
import type { CacheEntry, CacheKey } from '@/types/cache'
import crypto from 'crypto'

/**
 * 推荐结果缓存系统
 *
 * 使用场景：
 * - 缓存推荐结果，避免重复调用 LLM
 * - 针对相同品种和健康标签的组合，5 分钟内返回缓存结果
 * - 自动清理过期缓存
 *
 * 缓存键生成：MD5(breed + sorted(healthTags))
 * 缓存有效期：5 分钟（300000ms）
 */
class RecommendCache {
  private cache = new Map<CacheKey, CacheEntry>()
  private readonly TTL = 5 * 60 * 1000 // 5 分钟

  /**
   * 生成缓存键
   * @param breed 猫咪品种
   * @param healthTags 健康标签数组
   * @returns 缓存键（MD5 哈希）
   */
  generateCacheKey(breed: string, healthTags: string[]): CacheKey {
    const sortedTags = [...healthTags].sort().join('|')
    const combined = `${breed}:${sortedTags}`
    return crypto.createHash('md5').update(combined).digest('hex')
  }

  /**
   * 从缓存获取推荐结果
   * @param key 缓存键
   * @returns 推荐结果，如果已过期或不存在则返回 null
   */
  get(key: CacheKey): RecommendResult | null {
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    // 检查是否过期
    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(key)
      return null
    }

    return entry.result
  }

  /**
   * 将推荐结果存入缓存
   * @param key 缓存键
   * @param result 推荐结果
   */
  set(key: CacheKey, result: RecommendResult): void {
    // 如果缓存已满（>100 条），触发 LRU 清理
    if (this.cache.size > 100) {
      this.evictOldest()
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now(),
    })
  }

  /**
   * 移除最旧的缓存条目（LRU）
   */
  private evictOldest(): void {
    let oldestKey: CacheKey | null = null
    let oldestTime = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  /**
   * 清理所有过期的缓存
   */
  cleanupExpired(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.TTL) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: 100,
      ttl: this.TTL,
    }
  }

  /**
   * 清空所有缓存（用于测试或手动刷新）
   */
  clear(): void {
    this.cache.clear()
  }
}

// 全局单例实例
export const recommendCache = new RecommendCache()

// 定期清理过期缓存（每 5 分钟一次）
if (typeof global !== 'undefined' && !global._cacheCleanupInterval) {
  global._cacheCleanupInterval = setInterval(() => {
    recommendCache.cleanupExpired()
  }, 5 * 60 * 1000)
}

export type { RecommendCache }
