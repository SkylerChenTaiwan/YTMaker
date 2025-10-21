// src/components/ui/DateTimePicker.tsx
'use client'

import { cn } from '@/lib/cn'

interface DateTimePickerProps {
  date?: string
  time?: string
  onDateChange: (date: string) => void
  onTimeChange: (time: string) => void
  error?: string
  className?: string
}

export function DateTimePicker({
  date,
  time,
  onDateChange,
  onTimeChange,
  error,
  className,
}: DateTimePickerProps) {
  // Get minimum date (today)
  const getMinDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          排程日期
        </label>
        <input
          type="date"
          value={date || ''}
          onChange={(e) => onDateChange(e.target.value)}
          min={getMinDate()}
          className={cn(
            'w-full border rounded-lg px-3 py-2',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            error ? 'border-red-500' : 'border-gray-300'
          )}
          aria-label="排程日期"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          排程時間
        </label>
        <input
          type="time"
          value={time || ''}
          onChange={(e) => onTimeChange(e.target.value)}
          className={cn(
            'w-full border rounded-lg px-3 py-2',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            error ? 'border-red-500' : 'border-gray-300'
          )}
          aria-label="排程時間"
        />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <p className="text-sm text-gray-500">
        時區: {Intl.DateTimeFormat().resolvedOptions().timeZone} (本地時區)
      </p>
    </div>
  )
}
