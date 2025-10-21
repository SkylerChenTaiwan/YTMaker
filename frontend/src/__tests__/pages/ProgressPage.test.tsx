/**
 * ProgressPage 單元測試
 *
 * 測試進度監控頁面的核心功能:
 * - 成功載入專案並顯示進度
 * - WebSocket 即時進度更新
 * - 日誌顯示與自動捲動
 * - 暫停與取消功能
 * - 錯誤處理
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import ProgressPage from '@/app/project/[id]/progress/page'
import * as projectApi from '@/lib/api/projects'

// Mock next/navigation
const mockPush = vi.fn()
const mockBack = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
  usePathname: () => '/project/123/progress',
}))

// Mock toast
vi.mock('@/services/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

describe('ProgressPage - 測試 1: 成功載入專案並顯示進度', () => {
  const mockProject = {
    id: '123',
    project_name: '測試專案',
    status: 'ASSETS_GENERATING',
    progress: {
      overall: 45,
      stage: 'assets',
      message: '素材生成中...',
      stages: {
        script: { status: 'completed', progress: 100 },
        assets: {
          status: 'in_progress',
          progress: 65,
          subtasks: {
            audio: { status: 'completed', progress: 100 },
            images: { status: 'in_progress', progress: 10, total: 15 },
            avatar: { status: 'pending', progress: 0 },
          },
        },
        render: { status: 'pending', progress: 0 },
        thumbnail: { status: 'pending', progress: 0 },
        upload: { status: 'pending', progress: 0 },
      },
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('應該正確顯示專案進度和階段狀態', async () => {
    // Mock API
    vi.spyOn(projectApi, 'getProject').mockResolvedValue(mockProject)

    // 渲染頁面
    render(<ProgressPage params={{ id: '123' }} />)

    // 等待資料載入
    await waitFor(() => {
      expect(screen.getByText('測試專案')).toBeInTheDocument()
    })

    // 驗證總進度條
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveAttribute('aria-valuenow', '45')

    // 驗證當前階段
    expect(screen.getByText('素材生成中...')).toBeInTheDocument()

    // 驗證腳本階段 (已完成)
    expect(screen.getByText('腳本生成')).toBeInTheDocument()
    const scriptIcon = screen.getByTestId('stage-script-icon')
    expect(scriptIcon).toHaveClass('text-green-500')

    // 驗證素材階段 (進行中)
    expect(screen.getByText('素材生成')).toBeInTheDocument()
    expect(screen.getByText('65%')).toBeInTheDocument()
    expect(screen.getByText(/圖片生成.*10\/15/)).toBeInTheDocument()

    // 驗證其他階段 (等待中)
    expect(screen.getByText('影片渲染')).toBeInTheDocument()
    const renderIcon = screen.getByTestId('stage-render-icon')
    expect(renderIcon).toHaveClass('text-gray-400')
  })

  it('應該正確顯示子任務進度', async () => {
    vi.spyOn(projectApi, 'getProject').mockResolvedValue(mockProject)

    render(<ProgressPage params={{ id: '123' }} />)

    await waitFor(() => {
      expect(screen.getByText('測試專案')).toBeInTheDocument()
    })

    // 驗證語音合成 (已完成)
    expect(screen.getByText('語音合成')).toBeInTheDocument()
    const audioIcon = screen.getByTestId('subtask-audio-icon')
    expect(audioIcon).toHaveClass('text-green-500')

    // 驗證圖片生成 (進行中, 10/15)
    expect(screen.getByText(/圖片生成.*10\/15/)).toBeInTheDocument()
    const imagesIcon = screen.getByTestId('subtask-images-icon')
    expect(imagesIcon).toHaveClass('text-blue-500')

    // 驗證虛擬主播 (等待中)
    expect(screen.getByText('虛擬主播生成')).toBeInTheDocument()
    const avatarIcon = screen.getByTestId('subtask-avatar-icon')
    expect(avatarIcon).toHaveClass('text-gray-400')
  })
})
