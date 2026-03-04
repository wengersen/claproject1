import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
  },
  // 跳过构建时 ESLint（eslint-config-next 15.x 与 next 16.x 版本不兼容）
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
