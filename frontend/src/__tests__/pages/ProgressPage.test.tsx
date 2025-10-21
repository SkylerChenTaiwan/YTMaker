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

describe('ProgressPage - 測試 2: WebSocket 即時進度更新', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('應該透過 WebSocket 即時更新進度', async () => {
    // Mock WebSocket
    const mockWs = {
      send: vi.fn(),
      close: vi.fn(),
      readyState: WebSocket.OPEN,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }

    global.WebSocket = vi.fn(() => mockWs) as any

    // Mock initial project
    const mockProject = {
      id: '123',
      project_name: '測試專案',
      status: 'SCRIPT_GENERATING',
      progress: {
        overall: 10,
        stage: 'script',
        message: '腳本生成中...',
        stages: {
          script: { status: 'in_progress', progress: 50 },
          assets: { status: 'pending', progress: 0 },
          render: { status: 'pending', progress: 0 },
          thumbnail: { status: 'pending', progress: 0 },
          upload: { status: 'pending', progress: 0 },
        },
      },
    }

    vi.spyOn(projectApi, 'getProject').mockResolvedValue(mockProject)

    render(<ProgressPage params={{ id: '123' }} />)

    // 等待初始載入
    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    // 模擬 WebSocket 發送進度更新訊息
    const onMessageHandler = mockWs.addEventListener.mock.calls.find(
      (call) => call[0] === 'message'
    )?.[1]

    if (onMessageHandler) {
      // 發送進度更新 1
      onMessageHandler({
        data: JSON.stringify({
          type: 'progress',
          data: {
            overall: 20,
            stage: 'script',
            message: '腳本生成中 (50%)...',
          },
        }),
      })

      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '20')
      })

      // 發送階段完成訊息
      onMessageHandler({
        data: JSON.stringify({
          type: 'stage_complete',
          data: {
            stage: 'script',
            overall: 25,
          },
        }),
      })

      await waitFor(() => {
        const scriptIcon = screen.getByTestId('stage-script-icon')
        expect(scriptIcon).toHaveClass('text-green-500')
      })
    }
  })
})

describe('ProgressPage - 測試 3: 日誌顯示與自動捲動', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

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
        assets: { status: 'in_progress', progress: 50 },
        render: { status: 'pending', progress: 0 },
        thumbnail: { status: 'pending', progress: 0 },
        upload: { status: 'pending', progress: 0 },
      },
    },
  }

  it('應該正確顯示日誌並自動捲動到最新', async () => {
    vi.spyOn(projectApi, 'getProject').mockResolvedValue(mockProject)

    render(<ProgressPage params={{ id: '123' }} />)

    await waitFor(() => {
      expect(screen.getByText('測試專案')).toBeInTheDocument()
    })

    // 點擊展開日誌
    const expandButton = screen.getByRole('button', { name: /展開/ })
    fireEvent.click(expandButton)

    await waitFor(() => {
      expect(screen.getByTestId('log-viewer')).toBeInTheDocument()
    })

    // 使用 useProgressStore 添加日誌
    const { useProgressStore } = await import('@/store/useProgressStore')
    const addLog = useProgressStore.getState().addLog

    addLog({
      timestamp: '2025-10-19T10:00:00Z',
      level: 'info',
      message: '開始腳本生成...',
    })
    addLog({
      timestamp: '2025-10-19T10:01:30Z',
      level: 'info',
      message: '腳本生成完成',
    })
    addLog({
      timestamp: '2025-10-19T10:15:00Z',
      level: 'error',
      message: '圖片生成失敗 (#7): 連線超時',
    })
    addLog({
      timestamp: '2025-10-19T10:15:10Z',
      level: 'warning',
      message: '正在重試 (1/3)...',
    })

    await waitFor(() => {
      expect(screen.getByText(/開始腳本生成/)).toBeInTheDocument()
    })

    // 驗證錯誤訊息樣式
    const errorLog = screen.getByText(/圖片生成失敗/)
    expect(errorLog).toHaveClass('text-red-500')

    // 驗證警告訊息樣式
    const warningLog = screen.getByText(/正在重試/)
    expect(warningLog).toHaveClass('text-yellow-500')
  })

  it('用戶手動捲動後,應暫停自動捲動', async () => {
    vi.spyOn(projectApi, 'getProject').mockResolvedValue(mockProject)

    render(<ProgressPage params={{ id: '123' }} />)

    // 展開日誌
    const expandButton = screen.getByRole('button', { name: /展開/ })
    fireEvent.click(expandButton)

    await waitFor(() => {
      expect(screen.getByTestId('log-viewer')).toBeInTheDocument()
    })

    const logViewer = screen.getByTestId('log-viewer')

    // 添加一些日誌
    const { useProgressStore } = await import('@/store/useProgressStore')
    const addLog = useProgressStore.getState().addLog

    for (let i = 0; i < 5; i++) {
      addLog({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `日誌訊息 ${i}`,
      })
    }

    // 模擬用戶捲動到頂部
    Object.defineProperty(logViewer, 'scrollTop', { value: 0, writable: true })
    Object.defineProperty(logViewer, 'scrollHeight', { value: 1000, writable: true })
    Object.defineProperty(logViewer, 'clientHeight', { value: 264, writable: true })

    fireEvent.scroll(logViewer)

    // 驗證自動捲動暫停提示
    await waitFor(() => {
      expect(screen.getByText('自動捲動已暫停')).toBeInTheDocument()
    })
  })
})

describe('ProgressPage - 測試 4: 暫停與取消功能', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

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
        assets: { status: 'in_progress', progress: 50 },
        render: { status: 'pending', progress: 0 },
        thumbnail: { status: 'pending', progress: 0 },
        upload: { status: 'pending', progress: 0 },
      },
    },
  }

  it('應該正確處理暫停與繼續', async () => {
    const pauseMock = vi.spyOn(projectApi, 'pauseGeneration').mockResolvedValue({ success: true })
    const resumeMock = vi
      .spyOn(projectApi, 'resumeGeneration')
      .mockResolvedValue({ success: true })
    vi.spyOn(projectApi, 'getProject').mockResolvedValue(mockProject)

    render(<ProgressPage params={{ id: '123' }} />)

    await waitFor(() => {
      expect(screen.getByText('測試專案')).toBeInTheDocument()
    })

    // 點擊暫停按鈕
    const pauseButton = screen.getByRole('button', { name: /暫停/ })
    fireEvent.click(pauseButton)

    // 驗證 API 調用
    await waitFor(() => {
      expect(pauseMock).toHaveBeenCalledWith('123')
    })

    // 驗證按鈕變為「繼續」
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /繼續/ })).toBeInTheDocument()
    })

    // 點擊繼續按鈕
    const resumeButton = screen.getByRole('button', { name: /繼續/ })
    fireEvent.click(resumeButton)

    // 驗證 API 調用
    await waitFor(() => {
      expect(resumeMock).toHaveBeenCalledWith('123')
    })

    // 驗證按鈕變回「暫停」
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /暫停/ })).toBeInTheDocument()
    })
  })

  it('應該正確處理取消', async () => {
    const cancelMock = vi.spyOn(projectApi, 'cancelGeneration').mockResolvedValue({ success: true })
    vi.spyOn(projectApi, 'getProject').mockResolvedValue(mockProject)

    render(<ProgressPage params={{ id: '123' }} />)

    await waitFor(() => {
      expect(screen.getByText('測試專案')).toBeInTheDocument()
    })

    // 點擊取消按鈕
    const cancelButton = screen.getByRole('button', { name: /取消/ })
    fireEvent.click(cancelButton)

    // 驗證 Modal 顯示
    await waitFor(() => {
      expect(screen.getByText('確定要取消生成嗎?')).toBeInTheDocument()
    })

    // 點擊 Modal 的確定按鈕
    const confirmButton = screen.getByRole('button', { name: /確定/ })
    fireEvent.click(confirmButton)

    // 驗證 API 調用
    await waitFor(() => {
      expect(cancelMock).toHaveBeenCalledWith('123')
    })

    // 驗證跳轉
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })
})

describe('ProgressPage - 測試 5: 錯誤處理', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProjectFailed = {
    id: '123',
    project_name: '失敗的專案',
    status: 'FAILED',
    error: {
      stage: 'assets',
      message: 'Stability AI API 錯誤: 圖片生成超時 (圖片 #7)',
      code: 'STABILITY_AI_TIMEOUT',
      timestamp: '2025-10-19T10:15:00Z',
    },
    progress: {
      overall: 45,
      stage: 'assets',
      message: '生成失敗',
      stages: {
        script: { status: 'completed', progress: 100 },
        assets: { status: 'failed', progress: 50 },
        render: { status: 'pending', progress: 0 },
        thumbnail: { status: 'pending', progress: 0 },
        upload: { status: 'pending', progress: 0 },
      },
    },
  }

  it('應該正確顯示失敗狀態和錯誤訊息', async () => {
    vi.spyOn(projectApi, 'getProject').mockResolvedValue(mockProjectFailed)

    render(<ProgressPage params={{ id: '123' }} />)

    // 等待資料載入
    await waitFor(() => {
      expect(screen.getByText('失敗的專案')).toBeInTheDocument()
    })

    // 驗證失敗圖示
    expect(screen.getByTestId('failure-icon')).toHaveClass('text-red-500')

    // 驗證錯誤訊息
    expect(screen.getByText(/Stability AI API 錯誤/)).toBeInTheDocument()

    // 驗證按鈕存在
    expect(screen.getByRole('button', { name: /重試/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /返回主控台/ })).toBeInTheDocument()
  })

  it('應該正確處理重試', async () => {
    const retryMock = vi.spyOn(projectApi, 'retryGeneration').mockResolvedValue({ success: true })
    vi.spyOn(projectApi, 'getProject').mockResolvedValue(mockProjectFailed)

    render(<ProgressPage params={{ id: '123' }} />)

    await waitFor(() => {
      expect(screen.getByText('失敗的專案')).toBeInTheDocument()
    })

    // 點擊重試按鈕
    const retryButton = screen.getByRole('button', { name: /重試/ })
    fireEvent.click(retryButton)

    // 驗證 API 調用
    await waitFor(() => {
      expect(retryMock).toHaveBeenCalledWith('123')
    })
  })
})
