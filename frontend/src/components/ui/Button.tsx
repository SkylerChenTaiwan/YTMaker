import React from 'react'
import { cn } from '@/lib/cn'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** 按鈕類型 */
  variant?: 'primary' | 'secondary' | 'danger' | 'text'
  /** 按鈕尺寸 */
  size?: 'small' | 'medium' | 'large'
  /** 是否載入中 */
  loading?: boolean
  /** 圖示 */
  icon?: React.ReactNode
}

const Spinner: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={cn('animate-spin', className)}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
)

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = 'primary',
      size = 'medium',
      disabled = false,
      loading = false,
      icon,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      'inline-flex items-center justify-center rounded font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

    const variantClasses = {
      primary:
        'bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500',
      secondary:
        'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500',
      danger:
        'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
      text: 'bg-transparent text-blue-500 hover:bg-blue-50 focus:ring-blue-500',
    }

    const sizeClasses = {
      small: 'px-3 py-1.5 text-sm',
      medium: 'px-4 py-2 text-base',
      large: 'px-6 py-3 text-lg',
    }

    return (
      <button
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Spinner className="w-4 h-4 mr-2" />}
        {!loading && icon && <span className="mr-2">{icon}</span>}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
