'use client'

interface Step {
  label: string
}

interface ProgressStepsProps {
  steps: Step[]
  currentStep: number // 1-based
}

export function ProgressSteps({ steps, currentStep }: ProgressStepsProps) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, index) => {
        const stepNum = index + 1
        const isCompleted = stepNum < currentStep
        const isCurrent = stepNum === currentStep
        const isPending = stepNum > currentStep

        return (
          <div key={index} className="flex items-center">
            {/* 步骤圆点 */}
            <div className="flex flex-col items-center gap-1">
              <div
                className={[
                  'w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-semibold transition-all duration-300',
                  isCompleted
                    ? 'bg-[#E8721A] text-white'
                    : isCurrent
                    ? 'bg-[#E8721A] text-white ring-4 ring-[#E8721A]/20'
                    : 'bg-white border-2 border-[#D1CEC7] text-[#A8A49C]',
                ].join(' ')}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  stepNum
                )}
              </div>
              <span
                className={[
                  'text-[11px] whitespace-nowrap font-medium transition-colors duration-300',
                  isCompleted || isCurrent ? 'text-[#E8721A]' : 'text-[#A8A49C]',
                  isCurrent ? 'font-semibold' : '',
                ].join(' ')}
              >
                {step.label}
              </span>
            </div>

            {/* 连接线（最后一个不显示） */}
            {index < steps.length - 1 && (
              <div
                className={[
                  'h-[2px] w-16 md:w-24 mx-1 mb-5 transition-colors duration-300',
                  isCompleted ? 'bg-[#E8721A]' : 'bg-[#E8E6E1]',
                ].join(' ')}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
