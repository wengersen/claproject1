/**
 * 宠物健康档案 — 客户端 localStorage 存储工具
 *
 * 解决 Vercel Serverless 冷启动擦除内存的问题。
 * 所有宠物、日志、评估数据均持久化在浏览器 localStorage，
 * 与推荐结果 `result_${id}` 存储模式保持一致。
 *
 * Key 规范：
 *   nutrapaw_pets_${username}      → Pet[]
 *   nutrapaw_logs_${petId}         → PetHealthLog[]
 *   nutrapaw_assessment_${petId}   → HealthAssessment | null
 */

import type { Pet, PetHealthLog, HealthAssessment } from '@/types/pet'

// ─── Key 工厂 ──────────────────────────────────────────────────────────────

const petsKey  = (username: string) => `nutrapaw_pets_${username}`
const logsKey  = (petId: string)    => `nutrapaw_logs_${petId}`
const assessKey = (petId: string)   => `nutrapaw_assessment_${petId}`

// ─── ID 生成 ───────────────────────────────────────────────────────────────

/**
 * 生成唯一 ID（优先用 crypto.randomUUID，回退到时间戳 + 随机数）
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

// ─── 宠物 CRUD ─────────────────────────────────────────────────────────────

/**
 * 获取指定用户的全部宠物（按创建时间降序）
 */
export function getPets(username: string): Pet[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(petsKey(username))
    if (!raw) return []
    const pets = JSON.parse(raw) as Pet[]
    return [...pets].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  } catch {
    return []
  }
}

/**
 * 保存（创建或更新）一只宠物
 */
export function savePet(username: string, pet: Pet): void {
  if (typeof window === 'undefined') return
  try {
    const existing = getPets(username)
    const idx = existing.findIndex((p) => p.id === pet.id)
    if (idx >= 0) {
      existing[idx] = { ...pet, updatedAt: new Date().toISOString() }
    } else {
      existing.push(pet)
    }
    localStorage.setItem(petsKey(username), JSON.stringify(existing))
  } catch { /* ignore */ }
}

/**
 * 删除一只宠物及其所有日志和评估
 */
export function deletePet(username: string, petId: string): void {
  if (typeof window === 'undefined') return
  try {
    const existing = getPets(username).filter((p) => p.id !== petId)
    localStorage.setItem(petsKey(username), JSON.stringify(existing))
    localStorage.removeItem(logsKey(petId))
    localStorage.removeItem(assessKey(petId))
  } catch { /* ignore */ }
}

// ─── 健康日志 CRUD ─────────────────────────────────────────────────────────

/**
 * 获取宠物的所有日志（按日期降序）
 */
export function getLogs(petId: string): PetHealthLog[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(logsKey(petId))
    if (!raw) return []
    const logs = JSON.parse(raw) as PetHealthLog[]
    return [...logs].sort((a, b) => b.date.localeCompare(a.date))
  } catch {
    return []
  }
}

/**
 * 保存一条健康日志（同一天只保留最新一条）
 */
export function saveLog(log: PetHealthLog): void {
  if (typeof window === 'undefined') return
  try {
    const existing = getLogs(log.petId)
    // 同日期去重：过滤掉同一天的旧记录
    const deduped = existing.filter((l) => l.date !== log.date)
    deduped.push(log)
    localStorage.setItem(logsKey(log.petId), JSON.stringify(deduped))
  } catch { /* ignore */ }
}

/**
 * 获取最近 N 条日志（用于 AI 评估，已按日期降序）
 */
export function getRecentLogs(petId: string, limit = 10): PetHealthLog[] {
  return getLogs(petId).slice(0, limit)
}

// ─── AI 健康评估 ────────────────────────────────────────────────────────────

/**
 * 获取宠物的缓存评估（超过 48h 则视为过期，返回 null）
 */
export function getAssessment(petId: string): HealthAssessment | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(assessKey(petId))
    if (!raw) return null
    const assessment = JSON.parse(raw) as HealthAssessment
    // 检查 48h 缓存
    if (new Date(assessment.expiresAt) <= new Date()) {
      localStorage.removeItem(assessKey(petId))
      return null
    }
    return assessment
  } catch {
    return null
  }
}

/**
 * 保存 AI 评估结果
 */
export function saveAssessment(petId: string, assessment: HealthAssessment | null): void {
  if (typeof window === 'undefined') return
  try {
    if (assessment === null) {
      localStorage.removeItem(assessKey(petId))
    } else {
      localStorage.setItem(assessKey(petId), JSON.stringify(assessment))
    }
  } catch { /* ignore */ }
}

/**
 * 清除宠物的评估缓存（添加新日志后调用，提示用户重新生成）
 */
export function clearAssessment(petId: string): void {
  saveAssessment(petId, null)
}
