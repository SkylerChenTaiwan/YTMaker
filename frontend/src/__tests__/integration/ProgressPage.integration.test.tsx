/**
 * ProgressPage 整合測試
 *
 * 測試 10: 完整生成流程
 */

import { render, screen, waitFor, act } from '@testing-library/react'
import ProgressPage from '@/app/project/[id]/progress/page'
import { useProgressStore } from '@/store/useProgressStore'

// Mock localStorage for Zustand persist
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock as any

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
  useRouter: () => ({ push: mockPush }),
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

// Mock validators
jest.mock('@/lib/validators', () => ({
  validateProjectId: () => true,
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

// 不 mock progressStore - 使用真實的 Zustand store 以觸發 re-render

// Mock @/hooks/useWebSocket
const mockReconnect = jest.fn()
const mockSend = jest.fn()
let mockOnMessage: any = null

jest.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: jest.fn((projectId: string, options: any) => {
    mockOnMessage = options.onMessage
    return {
      isConnected: true,
      reconnect: mockReconnect,
      send: mockSend,
    }
  }),
}))

describe('ProgressPage - 測試 10: 完整生成流程', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // 重置 stores
    mockProjectState.current = null
    useProgressStore.getState().resetProgress()
  })

  it('應該正確處理從開始到完成的完整流程', async () => {
    // 初始狀態: SCRIPT_GENERATING
    const mockProjectInitial = {
      id: '123',
      project_name: '完整測試專案',
      status: 'SCRIPT_GENERATING',
      progress: {
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
      },
    }
    ;(projectApi.getProject as jest.Mock).mockResolvedValue(mockProjectInitial)

    // 設定 store 狀態
    mockProjectState.current = mockProjectInitial

    render(<ProgressPage params={{ id: '123' }} />)

    // 1. 驗證初始載入
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '完整測試專案', level: 1 })).toBeInTheDocument()
    })

    expect(screen.getByTestId('progress-bar')).toHaveAttribute('aria-valuenow', '0')

    // 等待 useWebSocket 設定 mockOnMessage
    await waitFor(() => {
      expect(mockOnMessage).not.toBeNull()
    })

    // 2. 階段 1: 腳本生成 (0% → 25%)
    await act(async () => {
      if (mockOnMessage) {
        mockOnMessage({
          type: 'progress',
          data: {
            overall: 5,
            stage: 'script',
            message: '開始生成腳本...',
            stages: {
              script: { status: 'in_progress', progress: 20 },
            },
          },
        })
      }
    })

    await waitFor(() => {
      expect(screen.getByTestId('progress-bar')).toHaveAttribute('aria-valuenow', '5')
    })

    // 3. 腳本生成完成
    await act(async () => {
      if (mockOnMessage) {
        mockOnMessage({
          type: 'progress',
          data: {
            overall: 25,
            stage: 'script',
            message: '腳本生成完成',
            stages: {
              script: { status: 'completed', progress: 100 },
            },
          },
        })
      }
    })

    await act(async () => {
      if (mockOnMessage) {
        mockOnMessage({
          type: 'log',
          data: {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: '腳本生成完成',
          },
        })
      }
    })

    await waitFor(() => {
      expect(screen.getByTestId('progress-bar')).toHaveAttribute('aria-valuenow', '25')
    })

    // 4. 階段 2: 素材生成 (25% → 60%)
    await act(async () => {
      if (mockOnMessage) {
        mockOnMessage({
          type: 'progress',
          data: {
            overall: 30,
            stage: 'assets',
            message: '開始生成素材...',
            stages: {
              assets: {
                status: 'in_progress',
                progress: 10,
                subtasks: {
                  audio: { status: 'in_progress', progress: 0 },
                  images: { status: 'pending', progress: 0, total: 15 },
                  avatar: { status: 'pending', progress: 0 },
                },
              },
            },
          },
        })
      }
    })

    await waitFor(() => {
      expect(screen.getByText('語音合成')).toBeInTheDocument()
    })

    // 語音合成完成
    await act(async () => {
      if (mockOnMessage) {
        mockOnMessage({
          type: 'progress',
          data: {
            overall: 35,
            stage: 'assets',
            message: '語音合成完成',
            stages: {
              assets: {
                status: 'in_progress',
                progress: 30,
                subtasks: {
                  audio: { status: 'completed', progress: 100 },
                  images: { status: 'in_progress', progress: 0, total: 15 },
                },
              },
            },
          },
        })
      }
    })

    // 圖片生成進度 (1/15 → 15/15)
    for (let i = 1; i <= 15; i++) {
      await act(async () => {
        if (mockOnMessage) {
          mockOnMessage({
            type: 'progress',
            data: {
              overall: 35 + i * 1.5,
              stage: 'assets',
              message: `圖片生成中 (${i}/15)...`,
              stages: {
                assets: {
                  status: 'in_progress',
                  progress: 30 + i * 4,
                  subtasks: {
                    images: { status: 'in_progress', progress: i, total: 15 },
                  },
                },
              },
            },
          })
        }
      })

      if (i === 15) {
        await waitFor(() => {
          expect(screen.getByText('圖片生成中 (15/15)...')).toBeInTheDocument()
        })
      }
    }

    // 5. 素材生成完成
    await act(async () => {
      if (mockOnMessage) {
        mockOnMessage({
          type: 'progress',
          data: {
            overall: 60,
            stage: 'assets',
            message: '素材生成完成',
            stages: {
              assets: { status: 'completed', progress: 100 },
            },
          },
        })
      }
    })

    await waitFor(() => {
      expect(screen.getByTestId('progress-bar')).toHaveAttribute('aria-valuenow', '60')
    })

    // 6. 階段 3: 影片渲染 (60% → 80%)
    await act(async () => {
      if (mockOnMessage) {
        mockOnMessage({
          type: 'progress',
          data: {
            overall: 65,
            stage: 'render',
            message: '開始渲染影片...',
            stages: {
              render: { status: 'in_progress', progress: 25 },
            },
          },
        })
      }
    })

    await waitFor(() => {
      expect(screen.getByText('開始渲染影片...')).toBeInTheDocument()
    })

    // 渲染完成
    await act(async () => {
      if (mockOnMessage) {
        mockOnMessage({
          type: 'progress',
          data: {
            overall: 80,
            stage: 'render',
            message: '影片渲染完成',
            stages: {
              render: { status: 'completed', progress: 100 },
            },
          },
        })
      }
    })

    // 7. 階段 4: 封面生成 (80% → 90%)
    await act(async () => {
      if (mockOnMessage) {
        mockOnMessage({
          type: 'progress',
          data: {
            overall: 85,
            stage: 'thumbnail',
            message: '生成封面...',
            stages: {
              thumbnail: { status: 'in_progress', progress: 50 },
            },
          },
        })
      }
    })

    await act(async () => {
      if (mockOnMessage) {
        mockOnMessage({
          type: 'progress',
          data: {
            overall: 90,
            stage: 'thumbnail',
            message: '封面生成完成',
            stages: {
              thumbnail: { status: 'completed', progress: 100 },
            },
          },
        })
      }
    })

    // 8. 階段 5: YouTube 上傳 (90% → 100%)
    await act(async () => {
      if (mockOnMessage) {
        mockOnMessage({
          type: 'progress',
          data: {
            overall: 95,
            stage: 'upload',
            message: '上傳到 YouTube...',
            stages: {
              upload: { status: 'in_progress', progress: 50 },
            },
          },
        })
      }
    })

    await act(async () => {
      if (mockOnMessage) {
        mockOnMessage({
          type: 'progress',
          data: {
            overall: 100,
            stage: 'upload',
            message: '上傳完成',
            stages: {
              upload: { status: 'completed', progress: 100 },
            },
          },
        })
      }
    })

    await act(async () => {
      if (mockOnMessage) {
        mockOnMessage({
          type: 'progress',
          data: {
            overall: 100,
            stage: 'upload',
            message: '影片生成完成!',
            stages: {
              upload: { status: 'completed', progress: 100 },
            },
          },
        })
      }
    })

    // 9. 驗證完成狀態
    await waitFor(() => {
      expect(screen.getByTestId('progress-bar')).toHaveAttribute('aria-valuenow', '100')
    })

    // 驗證所有階段都已完成
    const allStageIcons = [
      screen.getByTestId('stage-script-icon'),
      screen.getByTestId('stage-assets-icon'),
      screen.getByTestId('stage-render-icon'),
      screen.getByTestId('stage-thumbnail-icon'),
      screen.getByTestId('stage-upload-icon'),
    ]

    allStageIcons.forEach((icon) => {
      expect(icon).toHaveClass('text-green-500')
    })

    // 10. 驗證「查看結果」按鈕顯示
    // (這需要 mock currentProject.status === 'COMPLETED')
  }, 30000) // 設定 30 秒超時，因為這是一個長測試
})
