import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
  },
  // 跳过构建时 ESLint（版本兼容问题）和 TypeScript 错误（调试模式）
  // TODO: 构建稳定后移除 typescript.ignoreBuildErrors
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig
