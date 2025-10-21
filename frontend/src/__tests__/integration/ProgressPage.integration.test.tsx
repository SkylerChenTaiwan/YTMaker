/**
 * ProgressPage 整合測試
 *
 * 測試 10: 完整生成流程
 */

import { render, screen, waitFor } from '@testing-library/react'
import ProgressPage from '@/app/project/[id]/progress/page'
import * as projectApi from '@/lib/api/projects'

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/project/123/progress',
  notFound: jest.fn(),
}))

// Mock toast
jest.mock('@/services/toast', () => ({
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

describe('ProgressPage - 測試 10: 完整生成流程', () => {
  let onMessageHandler: any = null
  let wsReadyState = WebSocket.OPEN

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock WebSocket
    global.WebSocket = jest.fn(() => ({
      readyState: wsReadyState,
      send: jest.fn(),
      close: jest.fn(),
      addEventListener: jest.fn((event, handler) => {
        if (event === 'open') setTimeout(handler, 10)
        if (event === 'message') onMessageHandler = handler
      }),
      removeEventListener: jest.fn(),
    })) as any
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

    jest.spyOn(projectApi, 'getProject').mockResolvedValue(mockProjectInitial)

    render(<ProgressPage params={{ id: '123' }} />)

    // 1. 驗證初始載入
    await waitFor(() => {
      expect(screen.getByText('完整測試專案')).toBeInTheDocument()
    })

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')

    // 2. 階段 1: 腳本生成 (0% → 25%)
    if (onMessageHandler) {
      onMessageHandler({
        data: JSON.stringify({
          type: 'progress',
          data: {
            overall: 5,
            stage: 'script',
            message: '開始生成腳本...',
            stages: {
              script: { status: 'in_progress', progress: 20 },
            },
          },
        }),
      })
    }

    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '5')
    })

    // 3. 腳本生成完成
    if (onMessageHandler) {
      onMessageHandler({
        data: JSON.stringify({
          type: 'stage_complete',
          data: { stage: 'script', overall: 25 },
        }),
      })

      onMessageHandler({
        data: JSON.stringify({
          type: 'log',
          data: {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: '腳本生成完成',
          },
        }),
      })
    }

    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25')
      const scriptIcon = screen.getByTestId('stage-script-icon')
      expect(scriptIcon).toHaveClass('text-green-500')
    })

    // 4. 階段 2: 素材生成 (25% → 60%)
    if (onMessageHandler) {
      onMessageHandler({
        data: JSON.stringify({
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
        }),
      })
    }

    await waitFor(() => {
      expect(screen.getByText('語音合成')).toBeInTheDocument()
    })

    // 語音合成完成
    if (onMessageHandler) {
      onMessageHandler({
        data: JSON.stringify({
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
        }),
      })
    }

    // 圖片生成進度 (1/15 → 15/15)
    for (let i = 1; i <= 15; i++) {
      if (onMessageHandler) {
        onMessageHandler({
          data: JSON.stringify({
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
          }),
        })
      }

      if (i === 15) {
        await waitFor(() => {
          expect(screen.getByText(/圖片生成.*15\/15/)).toBeInTheDocument()
        })
      }
    }

    // 5. 素材生成完成
    if (onMessageHandler) {
      onMessageHandler({
        data: JSON.stringify({
          type: 'stage_complete',
          data: { stage: 'assets', overall: 60 },
        }),
      })
    }

    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '60')
    })

    // 6. 階段 3: 影片渲染 (60% → 80%)
    if (onMessageHandler) {
      onMessageHandler({
        data: JSON.stringify({
          type: 'progress',
          data: {
            overall: 65,
            stage: 'render',
            message: '開始渲染影片...',
            stages: {
              render: { status: 'in_progress', progress: 25 },
            },
          },
        }),
      })
    }

    await waitFor(() => {
      expect(screen.getByText('開始渲染影片...')).toBeInTheDocument()
    })

    // 渲染完成
    if (onMessageHandler) {
      onMessageHandler({
        data: JSON.stringify({
          type: 'stage_complete',
          data: { stage: 'render', overall: 80 },
        }),
      })
    }

    // 7. 階段 4: 封面生成 (80% → 90%)
    if (onMessageHandler) {
      onMessageHandler({
        data: JSON.stringify({
          type: 'progress',
          data: {
            overall: 85,
            stage: 'thumbnail',
            message: '生成封面...',
            stages: {
              thumbnail: { status: 'in_progress', progress: 50 },
            },
          },
        }),
      })

      onMessageHandler({
        data: JSON.stringify({
          type: 'stage_complete',
          data: { stage: 'thumbnail', overall: 90 },
        }),
      })
    }

    // 8. 階段 5: YouTube 上傳 (90% → 100%)
    if (onMessageHandler) {
      onMessageHandler({
        data: JSON.stringify({
          type: 'progress',
          data: {
            overall: 95,
            stage: 'upload',
            message: '上傳到 YouTube...',
            stages: {
              upload: { status: 'in_progress', progress: 50 },
            },
          },
        }),
      })

      onMessageHandler({
        data: JSON.stringify({
          type: 'stage_complete',
          data: { stage: 'upload', overall: 100 },
        }),
      })

      onMessageHandler({
        data: JSON.stringify({
          type: 'progress',
          data: {
            overall: 100,
            stage: 'upload',
            message: '影片生成完成!',
            stages: {
              upload: { status: 'completed', progress: 100 },
            },
          },
        }),
      })
    }

    // 9. 驗證完成狀態
    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
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
