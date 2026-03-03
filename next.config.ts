import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
  },
  // ESLint 9 + eslint-config-next 版本兼容性问题，构建时跳过 lint
  // 本地开发仍可手动运行 next lint
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
