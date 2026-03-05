'use client'

import { useEffect, useState, useRef } from 'react'

interface LoadingStateProps {
  catName: string
  streamProgress?: string  // 来自 SSE 的实时状态文字（可选）
}

const FALLBACK_MESSAGES = [
  (name: string) => `正在解析 ${name} 的健康档案与营养需求...`,
  () => '从数百款宠物食品数据库中筛选候选方案...',
  () => '专业营养师模型分析蛋白质 · 脂肪 · 矿物质配比...',
  () => '交叉验证 12 项核心健康指标，排除不适配成分...',
  (name: string) => `根据 ${name} 的体型与年龄阶段量身定制推荐方案...`,
  () => '对候选产品进行品质可信度综合评分...',
]

// SSE 进度步骤对应的进度百分比
const STEP_PROGRESS: Record<string, number> = {
  start: 10,
  llm: 18,
  generating: 25,   // 基准值，会随时间逐步增长
  parsing: 90,
}

export function LoadingState({ catName, streamProgress }: LoadingStateProps) {
  const [fallbackIndex, setFallbackIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(true)
  const generatingStartRef = useRef<number | null>(null)

  // 始终轮播文案（不受 streamProgress 影响）
  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setFallbackIndex((i) => (i + 1) % FALLBACK_MESSAGES.length)
        setVisible(true)
      }, 300)
    }, 2800)
    return () => clearInterval(interval)
  }, [])

  // 无 SSE 进度时：进度条缓慢增长动画（最多走到 25%）
  useEffect(() => {
    if (streamProgress) return  // 有真实进度就由 SSE 控制
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        setProgress((p) => {
          if (p >= 25) { clearInterval(interval); return 25 }
          return p + Math.random() * 5
        })
      }, 300)
      return () => clearInterval(interval)
    }, 100)
    return () => clearTimeout(timer)
  }, [streamProgress])

  // 有 SSE 进度时：根据步骤关键词更新进度条（不再依赖 tokens）
  useEffect(() => {
    if (!streamProgress) return
    const lower = streamProgress.toLowerCase()

    if (lower.includes('连接')) {
      setProgress(5)
    } else if (lower.includes('营养需求')) {
      setProgress(STEP_PROGRESS.start)
    } else if (lower.includes('匹配最佳')) {
      setProgress(STEP_PROGRESS.llm)
      generatingStartRef.current = Date.now()
    } else if (lower.includes('深度评估') || lower.includes('筛选')) {
      // 用"已筛选 N 款"来推进进度：每款产品约推进 8%
      const m = streamProgress.match(/筛选\s*(\d+)\s*款/)
      if (m) {
        const count = parseInt(m[1])
        // 1款=33%, 2款=41%, 3款=49%, ... 7款=81%
        setProgress(Math.min(25 + count * 8, 85))
      } else {
        // 基于时间的缓慢增长（25% → 70%，30s 内）
        if (!generatingStartRef.current) generatingStartRef.current = Date.now()
        const elapsed = (Date.now() - generatingStartRef.current) / 1000
        const timePct = 25 + Math.min((elapsed / 30) * 45, 45)
        setProgress(Math.round(timePct))
      }
    } else if (lower.includes('就绪') || lower.includes('整理')) {
      setProgress(STEP_PROGRESS.parsing)
    } else if (lower.includes('已完成') || lower.includes('产品评估')) {
      // 来自前端增量计数
      const m = streamProgress.match(/(\d+)\s*款/)
      if (m) {
        const count = parseInt(m[1])
        setProgress(Math.min(25 + count * 8, 85))
      }
    }
  }, [streamProgress])

  // 显示文字：始终使用轮播文案（streamProgress 只用于进度条，不展示给用户）
  const displayText = FALLBACK_MESSAGES[fallbackIndex](catName || '它')

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
          {streamProgress
            ? '营养顾问正在为您的猫咪深度定制，请稍候 🐾'
            : 'NutraPaw 专业营养评估通常需要 20~40 秒'}
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