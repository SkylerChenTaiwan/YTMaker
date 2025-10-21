/**
 * StageProgress 組件單元測試
 *
 * 測試階段進度組件的核心功能：
 * - 5 個階段的顯示
 * - 階段狀態圖示與顏色
 * - 進行中階段顯示進度條
 * - 子任務顯示（素材階段）
 * - 響應式設計
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { StageProgress } from '@/components/feature/StageProgress/StageProgress'

describe('StageProgress', () => {
  const mockStages = {
    script: { status: 'completed' as const, progress: 100 },
    assets: { status: 'in_progress' as const, progress: 50 },
    render: { status: 'pending' as const, progress: 0 },
    thumbnail: { status: 'pending' as const, progress: 0 },
    upload: { status: 'pending' as const, progress: 0 },
  }

  it('應該顯示所有 5 個階段', () => {
    render(<StageProgress stages={mockStages} currentStage="assets" />)

    expect(screen.getByText('腳本生成')).toBeInTheDocument()
    expect(screen.getByText('素材生成')).toBeInTheDocument()
    expect(screen.getByText('影片渲染')).toBeInTheDocument()
    expect(screen.getByText('封面生成')).toBeInTheDocument()
    expect(screen.getByText('YouTube 上傳')).toBeInTheDocument()
  })

  it('應該為 completed 階段顯示綠色勾選圖示', () => {
    render(<StageProgress stages={mockStages} currentStage="assets" />)

    const scriptIcon = screen.getByTestId('stage-script-icon')
    expect(scriptIcon).toHaveClass('text-green-500')
    expect(scriptIcon).toHaveTextContent('✓')
  })

  it('應該為 in_progress 階段顯示藍色進行中圖示', () => {
    render(<StageProgress stages={mockStages} currentStage="assets" />)

    const assetsIcon = screen.getByTestId('stage-assets-icon')
    expect(assetsIcon).toHaveClass('text-blue-500')
    expect(assetsIcon).toHaveTextContent('⏳')
  })

  it('應該為 pending 階段顯示灰色暫停圖示', () => {
    render(<StageProgress stages={mockStages} currentStage="assets" />)

    const renderIcon = screen.getByTestId('stage-render-icon')
    expect(renderIcon).toHaveClass('text-gray-400')
    expect(renderIcon).toHaveTextContent('⏸️')
  })

  it('應該為 failed 階段顯示紅色失敗圖示', () => {
    const failedStages = {
      ...mockStages,
      assets: { status: 'failed' as const, progress: 50 },
    }

    render(<StageProgress stages={failedStages} currentStage="assets" />)

    const assetsIcon = screen.getByTestId('stage-assets-icon')
    expect(assetsIcon).toHaveClass('text-red-500')
    expect(assetsIcon).toHaveTextContent('✗')
  })

  it('應該為進行中的階段顯示進度條', () => {
    render(<StageProgress stages={mockStages} currentStage="assets" />)

    // 應該有進度條
    const progressBars = screen.getAllByRole('progressbar')
    expect(progressBars.length).toBeGreaterThan(0)

    // 進度條應該顯示正確的進度值
    const assetsProgressBar = progressBars.find((bar) =>
      bar.getAttribute('aria-valuenow') === '50'
    )
    expect(assetsProgressBar).toBeDefined()
  })

  it('應該不為 completed 階段顯示進度條', () => {
    const completedOnlyStages = {
      script: { status: 'completed' as const, progress: 100 },
      assets: { status: 'pending' as const, progress: 0 },
      render: { status: 'pending' as const, progress: 0 },
      thumbnail: { status: 'pending' as const, progress: 0 },
      upload: { status: 'pending' as const, progress: 0 },
    }

    render(<StageProgress stages={completedOnlyStages} currentStage="script" />)

    // 不應該有進度條（因為沒有 in_progress 階段）
    const progressBars = screen.queryAllByRole('progressbar')
    expect(progressBars).toHaveLength(0)
  })

  it('應該顯示子任務（素材階段）', () => {
    const stagesWithSubtasks = {
      ...mockStages,
      assets: {
        status: 'in_progress' as const,
        progress: 50,
        subtasks: {
          audio: { status: 'completed' as const, progress: 100 },
          images: { status: 'in_progress' as const, progress: 5, total: 15 },
          avatar: { status: 'pending' as const, progress: 0 },
        },
      },
    }

    render(<StageProgress stages={stagesWithSubtasks} currentStage="assets" />)

    expect(screen.getByText('語音合成')).toBeInTheDocument()
    expect(screen.getByText(/圖片生成/)).toBeInTheDocument()
    expect(screen.getByText(/5\/15/)).toBeInTheDocument() // 圖片進度
    expect(screen.getByText('虛擬主播生成')).toBeInTheDocument()
  })

  it('應該為子任務顯示正確的圖示', () => {
    const stagesWithSubtasks = {
      ...mockStages,
      assets: {
        status: 'in_progress' as const,
        progress: 50,
        subtasks: {
          audio: { status: 'completed' as const, progress: 100 },
          images: { status: 'in_progress' as const, progress: 5, total: 15 },
          avatar: { status: 'pending' as const, progress: 0 },
        },
      },
    }

    render(<StageProgress stages={stagesWithSubtasks} currentStage="assets" />)

    const audioIcon = screen.getByTestId('subtask-audio-icon')
    expect(audioIcon).toHaveClass('text-green-500')
    expect(audioIcon).toHaveTextContent('✓')

    const imagesIcon = screen.getByTestId('subtask-images-icon')
    expect(imagesIcon).toHaveClass('text-blue-500')
    expect(imagesIcon).toHaveTextContent('⏳')

    const avatarIcon = screen.getByTestId('subtask-avatar-icon')
    expect(avatarIcon).toHaveClass('text-gray-400')
    expect(avatarIcon).toHaveTextContent('⏸️')
  })

  it('應該在沒有子任務時不顯示子任務區域', () => {
    render(<StageProgress stages={mockStages} currentStage="script" />)

    // 不應該有子任務相關的文字
    expect(screen.queryByText('語音合成')).not.toBeInTheDocument()
    expect(screen.queryByText(/圖片生成/)).not.toBeInTheDocument()
    expect(screen.queryByText('虛擬主播生成')).not.toBeInTheDocument()
  })

  it('應該正確處理所有階段都完成的狀態', () => {
    const allCompletedStages = {
      script: { status: 'completed' as const, progress: 100 },
      assets: { status: 'completed' as const, progress: 100 },
      render: { status: 'completed' as const, progress: 100 },
      thumbnail: { status: 'completed' as const, progress: 100 },
      upload: { status: 'completed' as const, progress: 100 },
    }

    render(<StageProgress stages={allCompletedStages} currentStage="upload" />)

    // 所有階段圖示都應該是綠色勾選
    const scriptIcon = screen.getByTestId('stage-script-icon')
    const assetsIcon = screen.getByTestId('stage-assets-icon')
    const renderIcon = screen.getByTestId('stage-render-icon')
    const thumbnailIcon = screen.getByTestId('stage-thumbnail-icon')
    const uploadIcon = screen.getByTestId('stage-upload-icon')

    expect(scriptIcon).toHaveClass('text-green-500')
    expect(assetsIcon).toHaveClass('text-green-500')
    expect(renderIcon).toHaveClass('text-green-500')
    expect(thumbnailIcon).toHaveClass('text-green-500')
    expect(uploadIcon).toHaveClass('text-green-500')
  })

  it('應該正確處理部分失敗的狀態', () => {
    const partialFailedStages = {
      script: { status: 'completed' as const, progress: 100 },
      assets: { status: 'failed' as const, progress: 50 },
      render: { status: 'pending' as const, progress: 0 },
      thumbnail: { status: 'pending' as const, progress: 0 },
      upload: { status: 'pending' as const, progress: 0 },
    }

    render(<StageProgress stages={partialFailedStages} currentStage="assets" />)

    const scriptIcon = screen.getByTestId('stage-script-icon')
    const assetsIcon = screen.getByTestId('stage-assets-icon')

    expect(scriptIcon).toHaveClass('text-green-500')
    expect(assetsIcon).toHaveClass('text-red-500')
  })

  it('應該顯示標題「生成階段」', () => {
    render(<StageProgress stages={mockStages} currentStage="assets" />)

    expect(screen.getByText('生成階段')).toBeInTheDocument()
  })

  it('應該正確處理子任務失敗狀態', () => {
    const stagesWithFailedSubtask = {
      ...mockStages,
      assets: {
        status: 'failed' as const,
        progress: 30,
        subtasks: {
          audio: { status: 'completed' as const, progress: 100 },
          images: { status: 'failed' as const, progress: 3, total: 15 },
          avatar: { status: 'pending' as const, progress: 0 },
        },
      },
    }

    render(<StageProgress stages={stagesWithFailedSubtask} currentStage="assets" />)

    const imagesIcon = screen.getByTestId('subtask-images-icon')
    expect(imagesIcon).toHaveClass('text-red-500')
    expect(imagesIcon).toHaveTextContent('✗')
  })
})
