import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
  },
  // 跳过构建时 ESLint（eslint-config-next 15.x 与 next 16.x 版本不兼容）
  eslint: {
    ignoreDuringBuilds: true,
  },
  // 临时：诊断 TypeScript 错误（通过 prebuild 脚本输出到 public/tsc-output.txt）
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig
