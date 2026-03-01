import type { User, StoredRecommendation } from '@/types/auth'
import type { RecommendResult } from '@/types/cat'
import { hashPassword, comparePassword } from './auth'
import { v4 as uuidv4 } from 'uuid'

/**
 * 结果存储系统
 * MVP 阶段使用内存存储 + 可选 JSON 文件持久化
 * v1.5 迁移到 Supabase PostgreSQL
 */

/**
 * 内存存储（单进程 Node.js 环境）
 */
const usersStore = new Map<string, User>()
const usernameLookup = new Map<string, string>() // username -> userId
const emailLookup = new Map<string, string>() // email -> userId
const recommendationsStore = new Map<string, StoredRecommendation[]>() // userId -> recommendations

/**
 * 创建新用户
 */
export async function createUser(
  username: string,
  email: string,
  password: string,
  nickname?: string
): Promise<User | null> {
  // 检查用户名和邮箱的唯一性
  if (usernameLookup.has(username)) {
    console.warn(`[resultStore] Username already exists: ${username}`)
    return null
  }

  if (emailLookup.has(email)) {
    console.warn(`[resultStore] Email already exists: ${email}`)
    return null
  }

  const userId = uuidv4()
  const now = new Date().toISOString()
  const passwordHash = await hashPassword(password)

  const user: User = {
    id: userId,
    username,
    email,
    passwordHash,
    nickname: nickname || username,
    createdAt: now,
    updatedAt: now,
  }

  usersStore.set(userId, user)
  usernameLookup.set(username, userId)
  emailLookup.set(email, userId)
  recommendationsStore.set(userId, [])

  console.log(`[resultStore] User created: ${username}`)
  return user
}

/**
 * 通过用户名查找用户
 */
export function getUserByUsername(username: string): User | null {
  const userId = usernameLookup.get(username)
  if (!userId) return null
  return usersStore.get(userId) || null
}

/**
 * 通过用户 ID 查找用户
 */
export function getUserById(userId: string): User | null {
  return usersStore.get(userId) || null
}

/**
 * 验证用户登录
 */
export async function authenticateUser(
  username: string,
  password: string
): Promise<User | null> {
  const user = getUserByUsername(username)
  if (!user) {
    return null
  }

  const isPasswordValid = await comparePassword(password, user.passwordHash)
  if (!isPasswordValid) {
    return null
  }

  return user
}

/**
 * 保存推荐结果到用户档案
 */
export async function saveRecommendation(
  userId: string,
  result: RecommendResult
): Promise<boolean> {
  const user = usersStore.get(userId)
  if (!user) {
    console.warn(`[resultStore] User not found: ${userId}`)
    return false
  }

  const recommendation: StoredRecommendation = {
    id: uuidv4(),
    userId,
    resultId: result.id,
    catName: result.catProfile.name,
    breed: result.catProfile.breed,
    createdAt: new Date().toISOString(),
  }

  const userRecommendations = recommendationsStore.get(userId) || []
  userRecommendations.push(recommendation)
  recommendationsStore.set(userId, userRecommendations)

  console.log(`[resultStore] Recommendation saved: ${userId}`)
  return true
}

/**
 * 获取用户的所有推荐结果
 */
export function getUserRecommendations(userId: string): StoredRecommendation[] {
  return recommendationsStore.get(userId) || []
}

/**
 * 获取用户的推荐结果数量
 */
export function getRecommendationCount(userId: string): number {
  return recommendationsStore.get(userId)?.length || 0
}

/**
 * 删除推荐结果（v1.5 功能）
 */
export function deleteRecommendation(userId: string, recommendationId: string): boolean {
  const recommendations = recommendationsStore.get(userId)
  if (!recommendations) return false

  const index = recommendations.findIndex((r) => r.id === recommendationId)
  if (index === -1) return false

  recommendations.splice(index, 1)
  return true
}

/**
 * 获取存储统计信息（用于监控）
 */
export function getStoreStats() {
  return {
    totalUsers: usersStore.size,
    totalRecommendations: Array.from(recommendationsStore.values()).reduce(
      (sum, recs) => sum + recs.length,
      0
    ),
  }
}

/**
 * 清空所有数据（仅用于测试）
 */
export function clearStore(): void {
  usersStore.clear()
  usernameLookup.clear()
  emailLookup.clear()
  recommendationsStore.clear()
  console.log('[resultStore] Store cleared')
}
