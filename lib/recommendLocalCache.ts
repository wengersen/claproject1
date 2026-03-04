/**
 * 客户端推荐结果缓存
 *
 * 解决问题：同一输入不重复调用 LLM
 * 原理：输入指纹（breed+age+weight+...+tags）→ resultId 映射
 * 存储位置：localStorage['nutrapaw_recommend_cache']
 *
 * 缓存策略：
 * - 无过期时间（输入不变，结果不变）
 * - 最多保留 20 条映射（LRU 淘汰）
 */

interface CacheMapping {
  inputHash: string
  resultId: string
  createdAt: string
}

const CACHE_KEY = 'nutrapaw_recommend_cache'
const MAX_ENTRIES = 20

/**
 * 生成输入指纹（纯客户端，不依赖 crypto 模块）
 * 使用简单 hash 算法（djb2），足够区分不同输入
 */
export function generateInputHash(params: {
  breed: string
  birthday: string
  weightKg: number
  gender: string
  neutered: boolean
  healthTags: string[]
  customInput?: string
}): string {
  const sortedTags = [...params.healthTags].sort().join('|')
  const combined = [
    params.breed,
    params.birthday,
    params.weightKg,
    params.gender,
    params.neutered,
    sortedTags,
    params.customInput || '',
  ].join(':')

  // djb2 hash
  let hash = 5381
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) + hash + combined.charCodeAt(i)) >>> 0
  }
  return hash.toString(36)
}

/**
 * 验证 resultData 是否为合法的 RecommendResult 结构
 * 只检查关键字段，避免深度遍历开销
 */
function isValidRecommendResult(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  // 必须包含 id、recommendations 数组，且至少有 1 条推荐
  if (typeof d.id !== 'string' || !d.id) return false
  if (!Array.isArray(d.recommendations) || d.recommendations.length === 0) return false
  // 每条推荐至少要有 rank 和 food.id
  const first = d.recommendations[0] as Record<string, unknown>
  if (typeof first !== 'object' || first === null) return false
  const food = first.food as Record<string, unknown>
  if (!food || typeof food !== 'object') return false
  if (!food.id) return false
  return true
}

/**
 * 查找缓存的推荐结果 ID
 * @returns resultId（如果命中、localStorage 中结果仍存在且结构完整），否则 null
 */
export function getCachedResultId(inputHash: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const mappings: CacheMapping[] = JSON.parse(raw)
    const found = mappings.find((m) => m.inputHash === inputHash)
    if (!found) return null

    // 验证结果是否仍然存在于 localStorage
    const resultData = localStorage.getItem(`result_${found.resultId}`)
    if (!resultData) {
      // 结果已被清除，移除映射
      removeCacheMapping(inputHash)
      return null
    }

    // ✅ #15 — 验证 JSON 结构完整性，防止损坏数据导致结果页崩溃
    let parsed: unknown
    try {
      parsed = JSON.parse(resultData)
    } catch {
      // JSON 无法解析，清除损坏条目
      localStorage.removeItem(`result_${found.resultId}`)
      removeCacheMapping(inputHash)
      return null
    }
    if (!isValidRecommendResult(parsed)) {
      // 结构不完整（截断写入或旧格式），清除并重新生成
      localStorage.removeItem(`result_${found.resultId}`)
      removeCacheMapping(inputHash)
      return null
    }

    return found.resultId
  } catch {
    return null
  }
}

/**
 * 保存输入指纹 → resultId 映射
 */
export function saveCacheMapping(inputHash: string, resultId: string): void {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    let mappings: CacheMapping[] = raw ? JSON.parse(raw) : []

    // 去重：如果同一个 inputHash 已存在，更新它
    mappings = mappings.filter((m) => m.inputHash !== inputHash)

    // 添加到头部（最新的在前）
    mappings.unshift({
      inputHash,
      resultId,
      createdAt: new Date().toISOString(),
    })

    // LRU 淘汰：超过上限则移除最旧的
    if (mappings.length > MAX_ENTRIES) {
      mappings = mappings.slice(0, MAX_ENTRIES)
    }

    localStorage.setItem(CACHE_KEY, JSON.stringify(mappings))
  } catch { /* ignore */ }
}

/**
 * 移除指定映射
 */
function removeCacheMapping(inputHash: string): void {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return
    const mappings: CacheMapping[] = JSON.parse(raw)
    const filtered = mappings.filter((m) => m.inputHash !== inputHash)
    localStorage.setItem(CACHE_KEY, JSON.stringify(filtered))
  } catch { /* ignore */ }
}
