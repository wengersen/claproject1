'use client'

import { useEffect, useState } from 'react'

interface LoadingStateProps {
  catName: string
}

const LOADING_MESSAGES = [
  (name: string) => `正在分析 ${name} 的营养需求...`,
  () => '匹配 50+ 款猫粮配方...',
  () => '评估蛋白质与脂肪比例...',
  () => '检查泌尿道健康指标...',
  (name: string) => `为 ${name} 生成专属推荐方案...`,
]

export function LoadingState({ catName }: LoadingStateProps) {
  const [messageIndex, setMessageIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(true)

  // 轮播文字
  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setMessageIndex((i) => (i + 1) % LOADING_MESSAGES.length)
        setVisible(true)
      }, 300)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  // 进度条动画
  useEffect(() => {
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        setProgress((p) => {
          if (p >= 95) {
            clearInterval(interval)
            return 95
          }
          return p + Math.random() * 8
        })
      }, 200)
      return () => clearInterval(interval)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-8 py-16">
      {/* 猫爪动画 */}
      <div className="relative w-24 h-24">
        {/* 主体爪印 */}
        <div className="absolute inset-0 flex items-center justify-center animate-paw-pulse">
          <span className="text-6xl">🐾</span>
        </div>
        {/* 旋转光圈 */}
        <div className="absolute inset-0 rounded-full border-4 border-[#FFD9B5] border-t-[#E8721A] animate-spin" style={{ animationDuration: '2s' }} />
      </div>

      {/* 动态文字 */}
      <div className="text-center space-y-2">
        <h3
          className={[
            'text-[18px] font-semibold text-[#2E2B27] transition-all duration-300',
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1',
          ].join(' ')}
        >
          {LOADING_MESSAGES[messageIndex](catName || '它')}
        </h3>
        <p className="text-[13px] text-[#A8A49C]">通常需要 10-20 秒</p>
      </div>

      {/* 进度条 */}
      <div className="w-60">
        <div className="bg-[#E8E6E1] rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-[#E8721A] rounded-full transition-all duration-300 ease-out"
            style={{ width: `${Math.min(progress, 95)}%` }}
          />
        </div>
      </div>

      {/* 背景装饰 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <span className="absolute -bottom-8 -right-8 text-[200px] opacity-[0.03] rotate-12 select-none">
          🐱
        </span>
        <span className="absolute -top-8 -left-8 text-[200px] opacity-[0.03] -rotate-12 select-none">
          🐾
        </span>
      </div>
    </div>
  )
}
