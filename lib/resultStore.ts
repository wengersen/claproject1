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
 * 从 JWT payload 重建最小用户对象写入内存 Map
 * 用于服务端重启后（Map 已清空），clientHash 路径登录的用户仍能正常保存推荐。
 * 不写入 emailLookup（无 email 信息），不影响注册唯一性校验。
 */
export function createUserFromJwt(userId: string, username: string): void {
  if (usersStore.has(userId)) return // 已存在则跳过
  const now = new Date().toISOString()
  const ghost: User = {
    id: userId,
    username,
    email: '',         // 无 email，仅作内存占位
    passwordHash: '',  // 无密码 hash，不影响保存逻辑
    nickname: username,
    createdAt: now,
    updatedAt: now,
  }
  usersStore.set(userId, ghost)
  usernameLookup.set(username, userId)
  console.log(`[resultStore] Ghost user rebuilt from JWT: ${username}`)
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
 * 注意：不再校验 usersStore 内是否存在该用户。
 * JWT 验证已在调用方（API route）完成，只要 token 有效即可保存。
 * 这样可以兼容"clientHash 路径登录"（服务端 Map 重启后为空，但 JWT 依然有效）的场景。
 */
export async function saveRecommendation(
  userId: string,
  result: RecommendResult
): Promise<boolean> {
  const recommendation: StoredRecommendation = {
    id: uuidv4(),
    userId,
    // result.id 在调用方写入 localStorage 前已由客户端生成，此处必然有值
    resultId: result.id!,
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
