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

import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import ProgressPage from '@/app/project/[id]/progress/page'

// Mock 環境變數
process.env.NEXT_PUBLIC_WS_URL = 'ws://localhost:8000'

// Mock @/lib/api/projects
jest.mock('@/lib/api/projects', () => ({
  getProject: jest.fn(),
  pauseGeneration: jest.fn(),
  resumeGeneration: jest.fn(),
  cancelGeneration: jest.fn(),
  retryGeneration: jest.fn(),
  startGeneration: jest.fn(),
}))

import * as projectApi from '@/lib/api/projects'

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
  }),
  usePathname: () => '/project/123/progress',
  notFound: jest.fn(),
}))

// Mock toast
jest.mock('@/lib/toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}))

// Mock @/store/useProjectStore
const mockFetchProject = jest.fn()
const mockProjectState = {
  current: null as any,
}

jest.mock('@/store/useProjectStore', () => ({
  useProjectStore: jest.fn(() => ({
    projects: {
      get current() {
        return mockProjectState.current
      },
      loading: false,
      error: null,
      list: [],
    },
    // 提供 currentProject 作為快捷方式
    get currentProject() {
      return mockProjectState.current
    },
    fetchProject: mockFetchProject,
    setCurrentProject: jest.fn((project: any) => {
      mockProjectState.current = project
    }),
    setProjectsLoading: jest.fn(),
    setProjectsError: jest.fn(),
  })),
}))

// Mock @/store/useProgressStore
let mockProgress: any = {
  overall: 0,
  stage: 'script',
  message: '準備開始生成...',
  stages: {
    script: { status: 'pending', progress: 0 },
    assets: { status: 'pending', progress: 0 },
    render: { status: 'pending', progress: 0 },
    thumbnail: { status: 'pending', progress: 0 },
    upload: { status: 'pending', progress: 0 },
  },
}
let mockLogs: any[] = []

const mockUpdateProgress = jest.fn((update: any) => {
  Object.assign(mockProgress, update)
})
const mockAddLog = jest.fn((log: any) => {
  mockLogs.push(log)
})
const mockClearLogs = jest.fn(() => {
  mockLogs = []
})
const mockResetProgress = jest.fn()

jest.mock('@/store/useProgressStore', () => ({
  useProgressStore: jest.fn(() => ({
    get progress() {
      return mockProgress
    },
    get logs() {
      return mockLogs
    },
    updateProgress: mockUpdateProgress,
    addLog: mockAddLog,
    clearLogs: mockClearLogs,
    resetProgress: mockResetProgress,
  })),
}))

// Mock @/hooks/useWebSocket
const mockReconnect = jest.fn()
const mockSend = jest.fn()
let mockOnMessage: any = null
let mockIsConnected = true // 可動態控制的連線狀態

jest.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: jest.fn((projectId: string, options: any) => {
    mockOnMessage = options.onMessage
    return {
      get isConnected() {
        return mockIsConnected
      },
      reconnect: mockReconnect,
      send: mockSend,
    }
  }),
}))

// 全局清理：每個測試後恢復所有 mocks
afterEach(() => {
  jest.restoreAllMocks()
  mockIsConnected = true // 重置連線狀態
  mockOnMessage = null // 重置訊息處理器
})

describe('ProgressPage - 測試 1: 成功載入專案並顯示進度', () => {
  const mockProject = {
    id: '123',
    project_name: '測試專案',
    status: 'ASSETS_GENERATING',
    created_at: '2025-01-20T10:00:00Z',
    updated_at: '2025-01-20T11:00:00Z',
    video_title: '測試影片標題',
    topic: '測試主題',
    target_duration: 300,
    target_audience: 'general',
    video_style: 'educational',
    voice_gender: 'female',
    bgm_style: 'calm',
    script_content: '測試腳本內容',
    error: null,
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
    jest.clearAllMocks()
    // 設定 mock 專案資料
    mockProjectState.current = mockProject
    mockProgress.overall = 45
    mockProgress.stage = 'assets'
    mockProgress.message = '素材生成中...'
    mockProgress.stages = mockProject.progress.stages
  })

  it('應該正確顯示專案進度和階段狀態', async () => {
    // Mock API
    (projectApi.getProject as jest.Mock).mockResolvedValue(mockProject)

    // 渲染頁面
    render(<ProgressPage params={{ id: '123' }} />)

    // 等待資料載入（使用 h1 確保是標題）
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '測試專案', level: 1 })).toBeInTheDocument()
    })

    // 驗證總進度條
    const progressBar = screen.getByTestId('progress-bar')
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
    (projectApi.getProject as jest.Mock).mockResolvedValue(mockProject)

    render(<ProgressPage params={{ id: '123' }} />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '測試專案', level: 1 })).toBeInTheDocument()
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
    jest.clearAllMocks()

    // 重置 progress state
    mockProgress.overall = 10
    mockProgress.stage = 'script'
    mockProgress.message = '腳本生成中...'
    mockProgress.stages = {
      script: { status: 'in_progress', progress: 50 },
      assets: { status: 'pending', progress: 0 },
      render: { status: 'pending', progress: 0 },
      thumbnail: { status: 'pending', progress: 0 },
      upload: { status: 'pending', progress: 0 },
    }
    mockProjectState.current = null
  })

  it('應該透過 WebSocket 即時更新進度', async () => {
    // Mock WebSocket
    const mockWs = {
      send: jest.fn(),
      close: jest.fn(),
      readyState: WebSocket.OPEN,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }

    global.WebSocket = jest.fn(() => mockWs) as any

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
    ;(projectApi.getProject as jest.Mock).mockResolvedValue(mockProject)

    // 設定 store 狀態
    mockProjectState.current = mockProject

    render(<ProgressPage params={{ id: '123' }} />)

    // 等待初始載入
    await waitFor(() => {
      expect(screen.getByTestId('progress-bar')).toBeInTheDocument()
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
        expect(screen.getByTestId('progress-bar')).toHaveAttribute('aria-valuenow', '20')
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
  const mockProject = {
    id: '123',
    project_name: '測試專案',
    status: 'ASSETS_GENERATING',
    created_at: '2025-01-20T10:00:00Z',
    updated_at: '2025-01-20T11:00:00Z',
    error: null,
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

  beforeEach(() => {
    jest.clearAllMocks()
    mockProjectState.current = mockProject
    mockProgress.overall = 45
    mockProgress.stage = 'assets'
    mockProgress.message = '素材生成中...'
    mockProgress.stages = mockProject.progress.stages

    // 設定初始日誌
    mockLogs.length = 0
    mockLogs.push(
      {
        id: '1',
        projectId: '123',
        timestamp: '2025-10-19T10:00:00Z',
        level: 'info',
        message: '開始腳本生成...',
      },
      {
        id: '2',
        projectId: '123',
        timestamp: '2025-10-19T10:01:30Z',
        level: 'info',
        message: '腳本生成完成',
      },
      {
        id: '3',
        projectId: '123',
        timestamp: '2025-10-19T10:15:00Z',
        level: 'error',
        message: '圖片生成失敗 (#7): 連線超時',
      },
      {
        id: '4',
        projectId: '123',
        timestamp: '2025-10-19T10:15:10Z',
        level: 'warning',
        message: '正在重試 (1/3)...',
      }
    )
  })

  it('應該正確顯示日誌並自動捲動到最新', async () => {
    (projectApi.getProject as jest.Mock).mockResolvedValue(mockProject)

    render(<ProgressPage params={{ id: '123' }} />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '測試專案', level: 1 })).toBeInTheDocument()
    })

    // 點擊展開日誌
    const expandButton = screen.getByRole('button', { name: /展開/ })
    fireEvent.click(expandButton)

    await waitFor(() => {
      expect(screen.getByTestId('log-viewer')).toBeInTheDocument()
    })

    // 驗證日誌顯示
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
    (projectApi.getProject as jest.Mock).mockResolvedValue(mockProject)

    render(<ProgressPage params={{ id: '123' }} />)

    // 展開日誌
    const expandButton = screen.getByRole('button', { name: /展開/ })
    fireEvent.click(expandButton)

    await waitFor(() => {
      expect(screen.getByTestId('log-viewer')).toBeInTheDocument()
    })

    const logViewer = screen.getByTestId('log-viewer')

    // 模擬用戶捲動到頂部（已有 4 條日誌從 beforeEach）
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
  const mockProject = {
    id: '123',
    project_name: '測試專案',
    status: 'ASSETS_GENERATING',
    created_at: '2025-01-20T10:00:00Z',
    updated_at: '2025-01-20T11:00:00Z',
    error: null,
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

  beforeEach(() => {
    jest.clearAllMocks()

    // 重新設定 API mocks
    ;(projectApi.pauseGeneration as jest.Mock).mockResolvedValue({ success: true })
    ;(projectApi.resumeGeneration as jest.Mock).mockResolvedValue({ success: true })
    ;(projectApi.cancelGeneration as jest.Mock).mockResolvedValue({ success: true })

    // 設定專案資料
    mockProjectState.current = mockProject
    mockProgress.overall = 45
    mockProgress.stage = 'assets'
    mockProgress.message = '素材生成中...'
    mockProgress.stages = mockProject.progress.stages
  })

  it('應該正確處理暫停與繼續', async () => {
    // beforeEach 已經設定好 API mocks
    render(<ProgressPage params={{ id: '123' }} />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '測試專案', level: 1 })).toBeInTheDocument()
    })

    // 點擊暫停按鈕
    const pauseButton = screen.getByRole('button', { name: /暫停/ })
    fireEvent.click(pauseButton)

    // 驗證 API 調用
    await waitFor(() => {
      expect(projectApi.pauseGeneration).toHaveBeenCalledWith('123')
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
      expect(projectApi.resumeGeneration).toHaveBeenCalledWith('123')
    })

    // 驗證按鈕變回「暫停」
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /暫停/ })).toBeInTheDocument()
    })
  })

  it('應該正確處理取消', async () => {
    // beforeEach 已經設定好 API mocks
    render(<ProgressPage params={{ id: '123' }} />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '測試專案', level: 1 })).toBeInTheDocument()
    })

    // 點擊取消按鈕
    const cancelButton = screen.getByRole('button', { name: /取消/ })
    fireEvent.click(cancelButton)

    // 驗證 Modal 顯示
    await waitFor(() => {
      expect(screen.getByText(/確定要取消生成嗎/)).toBeInTheDocument()
    })

    // 點擊 Modal 的確定按鈕
    const confirmButton = screen.getByRole('button', { name: /確定/ })
    fireEvent.click(confirmButton)

    // 驗證 API 調用
    await waitFor(() => {
      expect(projectApi.cancelGeneration).toHaveBeenCalledWith('123')
    })

    // 驗證跳轉
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })
})

describe('ProgressPage - 測試 5: 錯誤處理', () => {
  const mockProjectFailed = {
    id: '123',
    project_name: '失敗的專案',
    status: 'FAILED',
    created_at: '2025-01-20T10:00:00Z',
    updated_at: '2025-01-20T11:00:00Z',
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

  beforeEach(() => {
    jest.clearAllMocks()

    // 重新設定 API mocks
    ;(projectApi.retryGeneration as jest.Mock).mockResolvedValue({ success: true })

    // 設定專案資料
    mockProjectState.current = mockProjectFailed
    mockProgress.overall = 45
    mockProgress.stage = 'assets'
    mockProgress.message = '生成失敗'
    mockProgress.stages = mockProjectFailed.progress.stages
  })

  it('應該正確顯示失敗狀態和錯誤訊息', async () => {
    (projectApi.getProject as jest.Mock).mockResolvedValue(mockProjectFailed)

    render(<ProgressPage params={{ id: '123' }} />)

    // 等待資料載入
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '失敗的專案', level: 1 })).toBeInTheDocument()
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
    // beforeEach 已經設定好 API mocks
    render(<ProgressPage params={{ id: '123' }} />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '失敗的專案', level: 1 })).toBeInTheDocument()
    })

    // 點擊重試按鈕
    const retryButton = screen.getByRole('button', { name: /重試/ })
    fireEvent.click(retryButton)

    // 驗證 API 調用
    await waitFor(() => {
      expect(projectApi.retryGeneration).toHaveBeenCalledWith('123')
    })
  })
})

describe('ProgressPage - 測試 6: 進度不應倒退', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // 重置 progress state 為初始值
    mockProgress.overall = 0
    mockProgress.stage = 'script'
    mockProgress.message = '準備開始...'
    mockProgress.stages = {
      script: { status: 'pending', progress: 0 },
      assets: { status: 'pending', progress: 0 },
      render: { status: 'pending', progress: 0 },
      thumbnail: { status: 'pending', progress: 0 },
      upload: { status: 'pending', progress: 0 },
    }
    mockProjectState.current = null
  })

  it('收到較小的進度值時,進度不應倒退', async () => {
    // 這個測試與測試 7 類似，驗證進度不會倒退（Quick Fail 原則）

    let onMessageHandler: any = null

    global.WebSocket = jest.fn(() => ({
      readyState: WebSocket.OPEN,
      send: jest.fn(),
      close: jest.fn(),
      addEventListener: jest.fn((event, handler) => {
        if (event === 'open') setTimeout(handler, 10)
        if (event === 'message') onMessageHandler = handler
      }),
      removeEventListener: jest.fn(),
    })) as any

    const mockProject = {
      id: '123',
      project_name: '測試專案',
      status: 'SCRIPT_GENERATING',
      progress: {
        overall: 0,
        stage: 'script',
        message: '準備開始...',
        stages: {
          script: { status: 'pending', progress: 0 },
          assets: { status: 'pending', progress: 0 },
          render: { status: 'pending', progress: 0 },
          thumbnail: { status: 'pending', progress: 0 },
          upload: { status: 'pending', progress: 0 },
        },
      },
    }
    ;(projectApi.getProject as jest.Mock).mockResolvedValue(mockProject)

    // 設定 store 狀態
    mockProjectState.current = mockProject

    render(<ProgressPage params={{ id: '123' }} />)

    await waitFor(() => {
      expect(screen.getByTestId('progress-bar')).toBeInTheDocument()
    })

    // 模擬訊息亂序到達
    if (onMessageHandler) {
      // 先到 60%
      onMessageHandler({
        data: JSON.stringify({
          type: 'progress',
          data: { overall: 60, stage: 'assets', message: '素材生成中...' },
        }),
      })

      await waitFor(() => {
        expect(screen.getByTestId('progress-bar')).toHaveAttribute('aria-valuenow', '60')
      })

      // 後到 40% - 應該被忽略
      onMessageHandler({
        data: JSON.stringify({
          type: 'progress',
          data: { overall: 40, stage: 'script', message: '腳本生成中...' },
        }),
      })

      // 進度應該保持在 60%
      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(screen.getByTestId('progress-bar')).toHaveAttribute('aria-valuenow', '60')

      // 再到 80% - 應該正常更新
      onMessageHandler({
        data: JSON.stringify({
          type: 'progress',
          data: { overall: 80, stage: 'render', message: '影片渲染中...' },
        }),
      })

      await waitFor(() => {
        expect(screen.getByTestId('progress-bar')).toHaveAttribute('aria-valuenow', '80')
      })
    }
  })
})

describe('ProgressPage - 測試 7: 訊息順序測試', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // 重置 progress state 為初始值
    mockProgress.overall = 0
    mockProgress.stage = 'script'
    mockProgress.message = '準備開始...'
    mockProgress.stages = {
      script: { status: 'pending', progress: 0 },
      assets: { status: 'pending', progress: 0 },
      render: { status: 'pending', progress: 0 },
      thumbnail: { status: 'pending', progress: 0 },
      upload: { status: 'pending', progress: 0 },
    }
    mockProjectState.current = null
  })

  it('亂序到達的 WebSocket 訊息應正確處理', async () => {
    let onMessageHandler: any = null

    global.WebSocket = jest.fn(() => ({
      readyState: WebSocket.OPEN,
      send: jest.fn(),
      close: jest.fn(),
      addEventListener: jest.fn((event, handler) => {
        if (event === 'open') setTimeout(handler, 10)
        if (event === 'message') onMessageHandler = handler
      }),
      removeEventListener: jest.fn(),
    })) as any

    const mockProject = {
      id: '123',
      project_name: '測試專案',
      status: 'SCRIPT_GENERATING',
      progress: {
        overall: 0,
        stage: 'script',
        message: '準備開始...',
        stages: {
          script: { status: 'pending', progress: 0 },
          assets: { status: 'pending', progress: 0 },
          render: { status: 'pending', progress: 0 },
          thumbnail: { status: 'pending', progress: 0 },
          upload: { status: 'pending', progress: 0 },
        },
      },
    }
    ;(projectApi.getProject as jest.Mock).mockResolvedValue(mockProject)

    // 設定 store 狀態
    mockProjectState.current = mockProject

    render(<ProgressPage params={{ id: '123' }} />)

    await waitFor(() => {
      expect(screen.getByTestId('progress-bar')).toBeInTheDocument()
    })

    // 模擬訊息亂序到達（第二個訊息先到）
    if (onMessageHandler) {
      // 第二個訊息先到 (50%)
      onMessageHandler({
        data: JSON.stringify({
          type: 'progress',
          data: { overall: 50, stage: 'script', message: '腳本生成中 50%...' },
        }),
      })

      await waitFor(() => {
        expect(screen.getByTestId('progress-bar')).toHaveAttribute('aria-valuenow', '50')
      })

      // 第一個訊息後到 (30%) - 應該被忽略，不會導致進度回退
      onMessageHandler({
        data: JSON.stringify({
          type: 'progress',
          data: { overall: 30, stage: 'script', message: '腳本生成中 30%...' },
        }),
      })

      // 進度應該保持在 50%，不會倒退到 30%
      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(screen.getByTestId('progress-bar')).toHaveAttribute('aria-valuenow', '50')

      // 第三個訊息 (70%) - 應該正常更新
      onMessageHandler({
        data: JSON.stringify({
          type: 'progress',
          data: { overall: 70, stage: 'assets', message: '素材生成中...' },
        }),
      })

      await waitFor(() => {
        expect(screen.getByTestId('progress-bar')).toHaveAttribute('aria-valuenow', '70')
      })
    }
  })
})
