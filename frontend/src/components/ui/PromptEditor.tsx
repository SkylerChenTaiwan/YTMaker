// src/components/ui/PromptEditor.tsx
'use client'

import { useRef, useEffect, forwardRef } from 'react'
import { cn } from '@/lib/cn'

interface PromptEditorProps {
  value: string
  onChange: (value: string) => void
  error?: string
  placeholder?: string
  className?: string
  'data-testid'?: string
}

export const PromptEditor = forwardRef<HTMLTextAreaElement, PromptEditorProps>(
  ({ value, onChange, error, placeholder = '輸入 Prompt 內容 (200-1000 字)', className, 'data-testid': testId }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Auto-resize textarea
    useEffect(() => {
      const textarea = textareaRef.current
      if (textarea) {
        textarea.style.height = 'auto'
        textarea.style.height = `${textarea.scrollHeight}px`
      }
    }, [value])

    return (
      <div className={className}>
        <textarea
          ref={textareaRef}
          className={cn(
            'w-full min-h-[200px] border rounded-lg p-3 font-mono text-sm',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            'transition-colors duration-200',
            error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
          )}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          data-testid={testId}
          aria-label="Prompt 內容"
        />
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      </div>
    )
  }
)

PromptEditor.displayName = 'PromptEditor'
