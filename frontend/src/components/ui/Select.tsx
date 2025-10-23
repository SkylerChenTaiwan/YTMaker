import React, { useId } from 'react'
import { cn } from '@/lib/cn'

export interface SelectOption {
  label: string
  value: string
}

export interface SelectProps
  extends Omit<
    React.SelectHTMLAttributes<HTMLSelectElement>,
    'onChange'
  > {
  /** 選項列表 */
  options: SelectOption[]
  /** 錯誤狀態 */
  error?: boolean
  /** 錯誤訊息 */
  errorMessage?: string
  /** 標籤 */
  label?: string
  /** 幫助文字 */
  helperText?: string
  /** 變更回調 */
  onChange?: (value: string) => void
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      options,
      error = false,
      errorMessage,
      label,
      helperText,
      id,
      onChange,
      ...props
    },
    ref
  ) => {
    const autoId = useId()
    const selectId = id || autoId

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange?.(e.target.value)
    }

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block mb-2 text-sm font-medium text-gray-700"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'block w-full px-4 py-2 text-base border rounded-md transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'disabled:bg-gray-100 disabled:cursor-not-allowed',
            'bg-white',
            error
              ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500',
            className
          )}
          onChange={handleChange}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errorMessage && error && (
          <p className="mt-1 text-sm text-red-500">{errorMessage}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'
