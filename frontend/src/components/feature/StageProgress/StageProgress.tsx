/**
 * StageProgress 元件
 *
 * 功能:
 * - 顯示 5 個生成階段的進度 (腳本、素材、渲染、封面、上傳)
 * - 顯示子任務進度 (語音合成、圖片生成、虛擬主播)
 * - 即時更新階段狀態
 */

import React from 'react'
import { cn } from '@/lib/utils/cn'
import { ProgressBar } from '@/components/ui/ProgressBar'

interface SubTask {
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  progress: number
  total?: number
}

interface Stage {
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  progress: number
  subtasks?: {
    audio?: SubTask
    images?: SubTask
    avatar?: SubTask
  }
}

interface StageProgressProps {
  stages: {
    script: Stage
    assets: Stage
    render: Stage
    thumbnail: Stage
    upload: Stage
  }
  currentStage: string
}

const stageLabels = {
  script: '腳本生成',
  assets: '素材生成',
  render: '影片渲染',
  thumbnail: '封面生成',
  upload: 'YouTube 上傳',
}

const stageIcons = {
  pending: '⏸️',
  in_progress: '⏳',
  completed: '✓',
  failed: '✗',
}

const stageIconColors = {
  pending: 'text-gray-400',
  in_progress: 'text-blue-500',
  completed: 'text-green-500',
  failed: 'text-red-500',
}

export const StageProgress: React.FC<StageProgressProps> = ({ stages, currentStage }) => {
  const renderSubtasks = (subtasks: Stage['subtasks']) => {
    if (!subtasks) return null

    return (
      <div className="ml-8 mt-2 space-y-1 text-sm">
        {subtasks.audio && (
          <div className="flex items-center">
            <span
              className={cn('mr-2', stageIconColors[subtasks.audio.status])}
              data-testid="subtask-audio-icon"
            >
              {stageIcons[subtasks.audio.status]}
            </span>
            <span>語音合成</span>
          </div>
        )}
        {subtasks.images && (
          <div className="flex items-center">
            <span
              className={cn('mr-2', stageIconColors[subtasks.images.status])}
              data-testid="subtask-images-icon"
            >
              {stageIcons[subtasks.images.status]}
            </span>
            <span>
              圖片生成{' '}
              {subtasks.images.total && `(${subtasks.images.progress}/${subtasks.images.total})`}
            </span>
          </div>
        )}
        {subtasks.avatar && (
          <div className="flex items-center">
            <span
              className={cn('mr-2', stageIconColors[subtasks.avatar.status])}
              data-testid="subtask-avatar-icon"
            >
              {stageIcons[subtasks.avatar.status]}
            </span>
            <span>虛擬主播生成</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-4 md:mb-6">
      <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">生成階段</h2>

      <div className="space-y-3 md:space-y-4">
        {Object.entries(stages).map(([key, stage]) => (
          <div key={key} className="border-l-4 border-gray-200 pl-3 md:pl-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center flex-1">
                <span
                  className={cn('text-xl md:text-2xl mr-2 md:mr-3', stageIconColors[stage.status])}
                  data-testid={`stage-${key}-icon`}
                >
                  {stageIcons[stage.status]}
                </span>
                <div className="flex-1">
                  <p className="text-sm md:text-base font-medium">
                    {stageLabels[key as keyof typeof stageLabels]}
                  </p>
                  {stage.status === 'in_progress' && (
                    <div className="mt-2 max-w-xs">
                      <ProgressBar value={stage.progress} showPercentage />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 子任務 */}
            {key === 'assets' && renderSubtasks(stage.subtasks)}
          </div>
        ))}
      </div>
    </div>
  )
}
