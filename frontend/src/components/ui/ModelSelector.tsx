// src/components/ui/ModelSelector.tsx
'use client'

import { cn } from '@/lib/cn'
import { Select } from './Select'
import type { GeminiModel } from '@/lib/api/gemini'
import { extractModelId } from '@/lib/api/gemini'

interface ModelSelectorProps {
  models: GeminiModel[]
  selected: string
  onChange: (model: string) => void
  loading?: boolean
  error?: string | null
  className?: string
}

export function ModelSelector({
  models,
  selected,
  onChange,
  loading = false,
  error = null,
  className,
}: ModelSelectorProps) {
  if (loading) {
    return (
      <div className={cn('flex items-center justify-center py-8', className)}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-3 text-sm text-gray-600">載入模型列表中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn('', className)}>
        <div className="border-2 border-red-300 bg-red-50 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">無法載入模型列表</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              {error.includes('API Key') && (
                <p className="mt-2 text-sm text-red-700">
                  請前往<span className="font-medium">系統設定</span>配置 Gemini API Key
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (models.length === 0) {
    return (
      <div className={cn('', className)}>
        <div className="border-2 border-yellow-300 bg-yellow-50 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">沒有可用的模型</h3>
              <p className="mt-1 text-sm text-yellow-700">
                目前沒有可用的 Gemini 模型。請檢查 API Key 設定或稍後再試。
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 找到選中的模型以顯示詳細資訊
  const selectedModel = models.find((m) => {
    const modelId = extractModelId(m.name)
    return selected === modelId || selected === m.name
  })

  // 準備選單選項
  const selectOptions = models.map((model) => ({
    value: extractModelId(model.name),
    label: model.display_name,
  }))

  return (
    <div className={className}>
      <Select
        label="選擇模型"
        value={selected}
        onChange={onChange}
        options={selectOptions}
        data-testid="model-selector"
      />

      {/* 顯示選中模型的詳細資訊 */}
      {selectedModel && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-semibold text-blue-900">{selectedModel.display_name}</h4>
            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
              {extractModelId(selectedModel.name)}
            </span>
          </div>
          <p className="text-sm text-blue-800">{selectedModel.description}</p>
        </div>
      )}

      <p className="mt-3 text-xs text-gray-500">
        共 {models.length} 個可用模型 · 模型列表會自動從 Google API 更新
      </p>
    </div>
  )
}
