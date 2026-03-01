/**
 * 用户账户信息
 */
export interface User {
  id: string
  username: string
  email: string
  passwordHash: string
  nickname?: string
  createdAt: string
  updatedAt: string
}

/**
 * 用户注册请求
 */
export interface SignupRequest {
  username: string
  email: string
  password: string
  nickname?: string
}

/**
 * 用户登录请求
 */
export interface LoginRequest {
  username: string
  password: string
}

/**
 * 认证响应（含 JWT token）
 * passwordHash 仅在注册响应中存在，用于客户端持久化凭证（跨 Vercel Redeploy 免重注册）
 */
export interface AuthResponse {
  success: boolean
  user: Omit<User, 'passwordHash'>
  sessionToken: string
  expiresIn: number // 秒数，通常是 7 天 = 604800
  passwordHash?: string // 注册时返回，供客户端存入 nutrapaw_user_auth
}

/**
 * JWT payload 结构
 */
export interface JWTPayload {
  userId: string
  username: string
  type: 'session'
  iat: number
  exp: number
}

/**
 * 已保存的推荐结果
 */
export interface StoredRecommendation {
  id: string
  userId: string
  resultId: string
  catName: string
  breed: string
  createdAt: string
}

/**
 * 用户档案响应
 */
export interface UserProfileResponse {
  user: Omit<User, 'passwordHash'>
  recommendations: StoredRecommendation[]
  totalCount: number
}
