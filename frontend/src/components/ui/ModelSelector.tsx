// src/components/ui/ModelSelector.tsx
'use client'

import { cn } from '@/lib/cn'

interface ModelSelectorProps {
  selected: 'gemini-1.5-pro' | 'gemini-1.5-flash'
  onChange: (model: 'gemini-1.5-pro' | 'gemini-1.5-flash') => void
  className?: string
}

export function ModelSelector({ selected, onChange, className }: ModelSelectorProps) {
  const models = [
    {
      id: 'gemini-1.5-pro' as const,
      name: 'Gemini 1.5 Pro',
      quality: '⭐⭐⭐',
      speed: '中等',
      cost: '較高',
      description: '高品質、適合複雜內容、成本較高',
    },
    {
      id: 'gemini-1.5-flash' as const,
      name: 'Gemini 1.5 Flash',
      quality: '⭐⭐',
      speed: '快速',
      cost: '較低',
      description: '快速生成、適合大量生產、成本較低',
    },
  ]

  return (
    <div className={className}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {models.map((model) => (
          <label
            key={model.id}
            className={cn(
              'border-2 rounded-lg p-4 cursor-pointer transition-all',
              selected === model.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            )}
          >
            <input
              type="radio"
              name="model"
              value={model.id}
              checked={selected === model.id}
              onChange={(e) => onChange(e.target.value as typeof model.id)}
              className="sr-only"
              data-testid={`model-${model.id.replace(/\./g, '-')}`}
              aria-label={model.name}
            />
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-lg">{model.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{model.description}</p>
              </div>
              {selected === model.id && (
                <span className="text-blue-500 text-2xl">✓</span>
              )}
            </div>
          </label>
        ))}
      </div>

      {/* Comparison Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">特性</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Gemini 1.5 Pro</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Gemini 1.5 Flash</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t">
              <td className="px-4 py-2 text-sm">品質</td>
              <td className="px-4 py-2 text-sm">⭐⭐⭐</td>
              <td className="px-4 py-2 text-sm">⭐⭐</td>
            </tr>
            <tr className="border-t">
              <td className="px-4 py-2 text-sm">速度</td>
              <td className="px-4 py-2 text-sm">中等</td>
              <td className="px-4 py-2 text-sm">快速</td>
            </tr>
            <tr className="border-t">
              <td className="px-4 py-2 text-sm">成本</td>
              <td className="px-4 py-2 text-sm">較高</td>
              <td className="px-4 py-2 text-sm">較低</td>
            </tr>
            <tr className="border-t">
              <td className="px-4 py-2 text-sm">適合場景</td>
              <td className="px-4 py-2 text-sm">高品質內容</td>
              <td className="px-4 py-2 text-sm">大量生產</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
