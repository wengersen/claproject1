'use client'

import { useEffect, useState } from 'react'

interface LoadingStateProps {
  catName: string
  streamProgress?: string  // 来自 SSE 的实时状态文字（可选）
}

const FALLBACK_MESSAGES = [
  (name: string) => `正在分析 ${name} 的营养需求...`,
  () => '匹配 50+ 款猫粮配方...',
  () => '评估蛋白质与脂肪比例...',
  () => '检查泌尿道健康指标...',
  (name: string) => `为 ${name} 生成专属推荐方案...`,
]

// SSE 进度步骤对应的进度百分比
const STEP_PROGRESS: Record<string, number> = {
  start: 10,
  llm: 20,
  generating: 30,   // 会随 token 数量动态更新
  parsing: 90,
}

export function LoadingState({ catName, streamProgress }: LoadingStateProps) {
  const [fallbackIndex, setFallbackIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(true)

  // 无 SSE 进度时：轮播兜底文字
  useEffect(() => {
    if (streamProgress) return  // 有真实进度就不轮播
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setFallbackIndex((i) => (i + 1) % FALLBACK_MESSAGES.length)
        setVisible(true)
      }, 300)
    }, 2000)
    return () => clearInterval(interval)
  }, [streamProgress])

  // 无 SSE 进度时：进度条缓慢增长动画
  useEffect(() => {
    if (streamProgress) return  // 有真实进度就由 SSE 控制
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        setProgress((p) => {
          if (p >= 25) { clearInterval(interval); return 25 }  // 最多自动走到 25%
          return p + Math.random() * 5
        })
      }, 300)
      return () => clearInterval(interval)
    }, 100)
    return () => clearTimeout(timer)
  }, [streamProgress])

  // 有 SSE 进度时：根据步骤关键词更新进度条
  useEffect(() => {
    if (!streamProgress) return
    const lower = streamProgress.toLowerCase()
    if (lower.includes('连接')) setProgress(5)
    else if (lower.includes('分析')) setProgress(STEP_PROGRESS.start)
    else if (lower.includes('ai 正在') && !lower.includes('tokens')) setProgress(STEP_PROGRESS.llm)
    else if (lower.includes('tokens')) {
      // 提取 token 数量，映射到 20~85%
      const m = streamProgress.match(/(\d+)\s*tokens/)
      if (m) {
        const tokens = parseInt(m[1])
        // 假设最多 3000 tokens，映射到 20~85%
        const pct = 20 + Math.min((tokens / 3000) * 65, 65)
        setProgress(Math.round(pct))
      }
    }
    else if (lower.includes('整理')) setProgress(STEP_PROGRESS.parsing)
  }, [streamProgress])

  // 显示文字：SSE 进度 > 兜底轮播
  const displayText = streamProgress || FALLBACK_MESSAGES[fallbackIndex](catName || '它')

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-8 py-16">
      {/* 猫爪动画 */}
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 flex items-center justify-center animate-paw-pulse">
          <span className="text-6xl">🐾</span>
        </div>
        <div className="absolute inset-0 rounded-full border-4 border-[#FFD9B5] border-t-[#E8721A] animate-spin" style={{ animationDuration: '2s' }} />
      </div>

      {/* 动态文字 */}
      <div className="text-center space-y-2">
        <h3
          className={[
            'text-[18px] font-semibold text-[#2E2B27] transition-all duration-300',
            visible || streamProgress ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1',
          ].join(' ')}
        >
          {displayText}
        </h3>
        <p className="text-[13px] text-[#A8A49C]">
          {streamProgress ? '正在实时生成，请耐心等待...' : '通常需要 30~60 秒'}
        </p>
      </div>

      {/* 进度条 */}
      <div className="w-60">
        <div className="bg-[#E8E6E1] rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-[#E8721A] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.min(progress, 95)}%` }}
          />
        </div>
        {progress > 0 && (
          <p className="text-[11px] text-[#A8A49C] text-right mt-1">{Math.round(progress)}%</p>
        )}
      </div>

      {/* 背景装饰 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <span className="absolute -bottom-8 -right-8 text-[200px] opacity-[0.03] rotate-12 select-none">🐱</span>
        <span className="absolute -top-8 -left-8 text-[200px] opacity-[0.03] -rotate-12 select-none">🐾</span>
      </div>
    </div>
  )
}