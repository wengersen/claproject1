/**
 * 表单验证函数集合
 * 用于用户名、邮箱、密码等字段的验证
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/

export interface ValidationError {
  field: string
  message: string
}

/**
 * 验证用户名
 * 要求：3-20 字符，仅包含英文字母、数字和下划线
 */
export function validateUsername(username: string): ValidationError | null {
  if (!username || username.trim().length === 0) {
    return { field: 'username', message: '用户名不能为空' }
  }

  if (username.length < 3) {
    return { field: 'username', message: '用户名至少需要 3 个字符' }
  }

  if (username.length > 20) {
    return { field: 'username', message: '用户名最多 20 个字符' }
  }

  if (!USERNAME_REGEX.test(username)) {
    return {
      field: 'username',
      message: '用户名仅可包含英文字母、数字和下划线',
    }
  }

  return null
}

/**
 * 验证邮箱
 */
export function validateEmail(email: string): ValidationError | null {
  if (!email || email.trim().length === 0) {
    return { field: 'email', message: '邮箱不能为空' }
  }

  if (!EMAIL_REGEX.test(email)) {
    return { field: 'email', message: '邮箱格式不正确' }
  }

  if (email.length > 255) {
    return { field: 'email', message: '邮箱过长' }
  }

  return null
}

/**
 * 验证密码
 * 要求：至少 6 个字符
 */
export function validatePassword(password: string): ValidationError | null {
  if (!password) {
    return { field: 'password', message: '密码不能为空' }
  }

  if (password.length < 6) {
    return { field: 'password', message: '密码至少需要 6 个字符' }
  }

  if (password.length > 128) {
    return { field: 'password', message: '密码过长' }
  }

  return null
}

/**
 * 验证昵称（可选）
 */
export function validateNickname(nickname: string | undefined): ValidationError | null {
  if (!nickname) {
    return null // 昵称可选
  }

  if (nickname.length > 50) {
    return { field: 'nickname', message: '昵称最多 50 个字符' }
  }

  return null
}

/**
 * 验证注册表单
 */
export function validateSignupForm(
  username: string,
  email: string,
  password: string,
  nickname?: string
): ValidationError | null {
  let error: ValidationError | null

  error = validateUsername(username)
  if (error) return error

  error = validateEmail(email)
  if (error) return error

  error = validatePassword(password)
  if (error) return error

  error = validateNickname(nickname)
  if (error) return error

  return null
}

/**
 * 验证登录表单
 */
export function validateLoginForm(username: string, password: string): ValidationError | null {
  if (!username || username.trim().length === 0) {
    return { field: 'username', message: '用户名不能为空' }
  }

  if (!password) {
    return { field: 'password', message: '密码不能为空' }
  }

  return null
}
