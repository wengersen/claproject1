import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: 'NutraPaw — 猫咪专属营养顾问',
  description: '基于你家猫的品种、年龄和健康状态，AI 为你推荐最适合的猫粮和罐头。告别选粮焦虑。',
  keywords: ['猫粮推荐', '猫咪营养', '宠物食品', '泌尿道健康', '猫粮选择'],
  openGraph: {
    title: 'NutraPaw — 猫咪专属营养顾问',
    description: '3分钟，获取你家猫的专属食谱推荐',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-[#FFF8F3]">
        {children}
      </body>
    </html>
  )
}
