// src/components/ui/TagsInput.tsx
'use client'

import { useState, KeyboardEvent } from 'react'
import { cn } from '@/lib/cn'

interface TagsInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  maxTags?: number
  placeholder?: string
  className?: string
  'data-testid'?: string
}

export function TagsInput({
  tags,
  onChange,
  maxTags = 30,
  placeholder = '輸入標籤後按 Enter',
  className,
  'data-testid': testId,
}: TagsInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState('')

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  const addTag = () => {
    const trimmed = inputValue.trim()

    if (!trimmed) {
      return
    }

    if (tags.length >= maxTags) {
      setError(`標籤數量不能超過 ${maxTags} 個`)
      return
    }

    if (tags.includes(trimmed)) {
      setError('此標籤已存在')
      return
    }

    onChange([...tags, trimmed])
    setInputValue('')
    setError('')
  }

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index))
    setError('')
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag, index) => (
          <span
            key={index}
            className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(index)}
              className="ml-2 hover:text-blue-900 focus:outline-none"
              aria-label="移除標籤"
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <input
        type="text"
        className={cn(
          'w-full border rounded-lg px-3 py-2',
          'focus:outline-none focus:ring-2 focus:ring-blue-500',
          error ? 'border-red-500' : 'border-gray-300'
        )}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        data-testid={testId}
        aria-label="標籤"
      />

      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}

      <p className="text-sm text-gray-500 mt-1">
        已新增 {tags.length} / {maxTags} 個標籤
      </p>
    </div>
  )
}
