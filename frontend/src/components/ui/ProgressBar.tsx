/**
 * ProgressBar 元件
 *
 * 功能:
 * - 顯示進度條
 * - 支援百分比顯示
 * - 支援不同狀態 (normal, success, error)
 */

import React from 'react'
import { cn } from '@/lib/utils/cn'

interface ProgressBarProps {
  value: number // 0-100
  showPercentage?: boolean
  status?: 'normal' | 'success' | 'error'
  className?: string
  'data-testid'?: string
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  showPercentage = false,
  status = 'normal',
  className,
  'data-testid': dataTestId,
}) => {
  const clampedValue = Math.min(100, Math.max(0, value))

  const statusColors = {
    normal: 'bg-blue-500',
    success: 'bg-green-500',
    error: 'bg-red-500',
  }

  return (
    <div className={cn('w-full', className)}>
      <div
        className="w-full h-3 bg-gray-200 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        data-testid={dataTestId}
      >
        <div
          className={cn('h-full transition-all duration-300 ease-in-out', statusColors[status])}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      {showPercentage && (
        <div className="mt-1 text-sm text-gray-600 text-right">{clampedValue}%</div>
      )}
    </div>
  )
}
