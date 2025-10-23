import React, { useId } from 'react'
import { cn } from '@/lib/cn'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** 錯誤狀態 */
  error?: boolean
  /** 錯誤訊息 */
  errorMessage?: string
  /** 標籤 */
  label?: string
  /** 幫助文字 */
  helperText?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      error = false,
      errorMessage,
      label,
      helperText,
      id,
      ...props
    },
    ref
  ) => {
    const autoId = useId()
    const inputId = id || autoId

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block mb-2 text-sm font-medium text-gray-700"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'block w-full px-4 py-2 text-base border rounded-md transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'disabled:bg-gray-100 disabled:cursor-not-allowed',
            error
              ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500',
            className
          )}
          {...props}
        />
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

Input.displayName = 'Input'
