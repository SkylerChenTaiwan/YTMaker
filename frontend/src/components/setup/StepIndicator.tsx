import React from 'react'
import { cn } from '@/lib/cn'

interface StepIndicatorProps {
  current: number
  total: number
  steps: Array<{ title: string }>
}

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={3}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
)

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  current,
  total,
  steps,
}) => {
  return (
    <div className="flex items-center justify-between w-full px-4 py-6">
      {steps.map((step, index) => (
        <React.Fragment key={index}>
          {/* 步驟容器 */}
          <div
            className="flex flex-col items-center"
            data-testid={`step-${index}`}
          >
            {/* 步驟圖示 */}
            <div
              className={cn(
                'step-circle w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all',
                index < current && 'completed bg-green-500 text-white',
                index === current && 'current bg-blue-500 text-white',
                index > current && 'pending bg-gray-300 text-gray-500'
              )}
            >
              {index < current ? (
                <CheckIcon className="w-6 h-6" />
              ) : (
                <span>{index + 1}</span>
              )}
            </div>

            {/* 步驟標題 */}
            <span
              className={cn(
                'mt-2 text-sm hidden md:inline',
                index === current && 'font-semibold text-blue-600',
                index < current && 'text-green-600',
                index > current && 'text-gray-400'
              )}
            >
              {step.title}
            </span>
          </div>

          {/* 連接線 */}
          {index < total - 1 && (
            <div
              className={cn(
                'h-1 flex-1 mx-2 transition-all',
                index < current - 1 ? 'bg-green-500' : 'bg-gray-300'
              )}
              data-testid={`connector-${index}`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}
