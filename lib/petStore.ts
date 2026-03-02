/**
 * 宠物健康日志存储层
 * 与 resultStore.ts 保持一致的内存 Map 模式（MVP 阶段）
 * v1.3 新增
 */

import { v4 as uuidv4 } from 'uuid'
import type { Pet, PetHealthLog, HealthAssessment } from '@/types/pet'

// ─── 内存存储 ─────────────────────────────────────────────────────────────────

const petsById = new Map<string, Pet>()
const petIdsByUserId = new Map<string, string[]>()      // userId → petId[]
const logsByPetId = new Map<string, PetHealthLog[]>()   // petId → PetHealthLog[]
const assessmentByPetId = new Map<string, HealthAssessment>() // petId → assessment

// ─── Pet CRUD ─────────────────────────────────────────────────────────────────

export function createPet(
  userId: string,
  data: Omit<Pet, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Pet {
  const now = new Date().toISOString()
  const pet: Pet = { id: uuidv4(), userId, ...data, createdAt: now, updatedAt: now }
  petsById.set(pet.id, pet)
  const existing = petIdsByUserId.get(userId) ?? []
  petIdsByUserId.set(userId, [...existing, pet.id])
  return pet
}

export function getPetsByUserId(userId: string): Pet[] {
  const ids = petIdsByUserId.get(userId) ?? []
  return ids
    .map((id) => petsById.get(id))
    .filter((p): p is Pet => p !== undefined)
}

export function getPetById(petId: string): Pet | null {
  return petsById.get(petId) ?? null
}

/** 检查该宠物是否属于该用户 */
export function isPetOwner(petId: string, userId: string): boolean {
  return petsById.get(petId)?.userId === userId
}

// ─── 日志 CRUD ────────────────────────────────────────────────────────────────

export function addHealthLog(
  data: Omit<PetHealthLog, 'id' | 'createdAt'>
): PetHealthLog {
  const log: PetHealthLog = {
    id: uuidv4(),
    ...data,
    createdAt: new Date().toISOString(),
  }
  const existing = logsByPetId.get(data.petId) ?? []
  // 同一天只保留最新一条（覆盖）
  const filtered = existing.filter((l) => l.date !== data.date)
  logsByPetId.set(data.petId, [...filtered, log])
  return log
}

/** 返回某宠物的所有日志，按日期降序排列 */
export function getLogsByPetId(petId: string): PetHealthLog[] {
  const logs = logsByPetId.get(petId) ?? []
  return [...logs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
}

/** 获取最近 N 条日志（用于 AI 评估） */
export function getRecentLogs(petId: string, limit = 10): PetHealthLog[] {
  return getLogsByPetId(petId).slice(0, limit)
}

// ─── AI 评估缓存 ──────────────────────────────────────────────────────────────

/** 获取缓存的评估（自动检查有效期） */
export function getCachedAssessment(petId: string): HealthAssessment | null {
  const a = assessmentByPetId.get(petId)
  if (!a) return null
  if (new Date(a.expiresAt) < new Date()) {
    assessmentByPetId.delete(petId)
    return null
  }
  return a
}

/** 写入评估缓存（48h 有效） */
export function setAssessment(
  petId: string,
  data: Omit<HealthAssessment, 'id' | 'petId' | 'generatedAt' | 'expiresAt'>
): HealthAssessment {
  const assessment: HealthAssessment = {
    id: uuidv4(),
    petId,
    generatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    ...data,
  }
  assessmentByPetId.set(petId, assessment)
  return assessment
}
