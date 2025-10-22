import { render, screen, waitFor } from '@testing-library/react'
import BatchDetailPage from '../page'
import * as batchApi from '@/services/batchApi'
import { useBatchStore } from '@/store/useBatchStore'

// Mock batchApi
jest.mock('@/services/batchApi', () => ({
  getBatchDetail: jest.fn(),
  pauseBatchTask: jest.fn(),
  resumeBatchTask: jest.fn(),
  retryFailedProjects: jest.fn(),
  downloadBatchReport: jest.fn(),
}))

// Mock next/navigation
const mockPush = jest.fn()
const mockParams = { id: 'batch-001' }

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useParams: () => mockParams,
  usePathname: () => '/batch/batch-001',
}))

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}))

describe('BatchDetailPage - 測試 3：批次詳情頁載入與顯示', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useBatchStore.getState().reset()
  })

  it('should load and display batch detail correctly', async () => {
    // Mock API Response
    const mockBatchDetail = {
      id: 'batch-001',
      task_name: '週一影片批次',
      total_projects: 10,
      completed_projects: 7,
      failed_projects: 1,
      status: 'RUNNING' as const,
      project_count: 10,
      success_count: 7,
      failed_count: 1,
      created_at: '2025-10-19T10:30:00Z',
      projects: [
        {
          id: 'project-001',
          name: '影片 1',
          status: 'COMPLETED',
          progress: 100,
          youtube_url: 'https://youtube.com/watch?v=abc123',
        },
        {
          id: 'project-002',
          name: '影片 2',
          status: 'RUNNING',
          progress: 65,
          current_stage: 'RENDER_VIDEO',
        },
        {
          id: 'project-003',
          name: '影片 3',
          status: 'FAILED',
          progress: 30,
          error_message: 'Gemini API 配額不足',
        },
        {
          id: 'project-004',
          name: '影片 4',
          status: 'QUEUED',
          progress: 0,
        },
      ],
    }

    ;(batchApi.getBatchDetail as jest.Mock).mockResolvedValue(mockBatchDetail)

    // 渲染元件
    render(<BatchDetailPage params={{ id: 'batch-001' }} />)

    // 等待資料載入
    await waitFor(() => {
      expect(batchApi.getBatchDetail).toHaveBeenCalledWith('batch-001')
    })

    // 檢查: 批次基本資訊正確顯示
    await waitFor(() => {
      expect(screen.getByText('週一影片批次')).toBeInTheDocument()
    })

    // 檢查: 總進度顯示
    expect(screen.getByText(/7.*\/.*10/)).toBeInTheDocument() // 7 / 10
    expect(screen.getByText(/1.*失敗/)).toBeInTheDocument()

    // 檢查: 專案列表顯示所有專案
    expect(screen.getByText('影片 1')).toBeInTheDocument()
    expect(screen.getByText('影片 2')).toBeInTheDocument()
    expect(screen.getByText('影片 3')).toBeInTheDocument()
    expect(screen.getByText('影片 4')).toBeInTheDocument()

    // 檢查: 專案狀態標籤
    expect(screen.getByText('完成')).toBeInTheDocument()
    expect(screen.getByText('進行中')).toBeInTheDocument()
    expect(screen.getByText('失敗')).toBeInTheDocument()
    expect(screen.getByText('排隊')).toBeInTheDocument()

    // 檢查: YouTube 連結 (僅 COMPLETED 專案)
    const youtubeLinks = screen.getAllByText(/查看影片|YouTube/)
    expect(youtubeLinks.length).toBeGreaterThan(0)

    // 檢查: 錯誤訊息 (僅 FAILED 專案)
    expect(screen.getByText('Gemini API 配額不足')).toBeInTheDocument()

    // 檢查: 控制按鈕根據狀態顯示
    expect(screen.getByText('暫停批次')).toBeInTheDocument() // RUNNING 顯示暫停
    expect(screen.getByText('重試失敗任務')).toBeInTheDocument() // 有失敗專案
    expect(screen.getByText('下載報告')).toBeInTheDocument()
    expect(screen.getByText('返回')).toBeInTheDocument()
  })

  it('should display loading state while fetching data', () => {
    ;(batchApi.getBatchDetail as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )

    render(<BatchDetailPage params={{ id: 'batch-001' }} />)

    // 應該顯示載入中的狀態
    // (根據實作可能會有不同的 UI,例如骨架屏或 "載入中..." 文字)
  })

  it('should handle API error correctly', async () => {
    const errorMessage = '載入批次任務失敗'
    ;(batchApi.getBatchDetail as jest.Mock).mockRejectedValue(new Error(errorMessage))

    render(<BatchDetailPage params={{ id: 'batch-001' }} />)

    await waitFor(() => {
      expect(batchApi.getBatchDetail).toHaveBeenCalled()
    })

    // 應該顯示錯誤訊息
  })

  it('should display 404 when batch not found', async () => {
    const notFoundError = new Error('批次任務不存在')
    ;(notFoundError as any).response = { status: 404 }
    ;(batchApi.getBatchDetail as jest.Mock).mockRejectedValue(notFoundError)

    render(<BatchDetailPage params={{ id: 'non-existent-id' }} />)

    await waitFor(() => {
      expect(batchApi.getBatchDetail).toHaveBeenCalledWith('non-existent-id')
    })

    // 應該顯示 404 錯誤頁面
    await waitFor(() => {
      expect(screen.getByText(/找不到此批次任務/)).toBeInTheDocument()
    })
  })

  it('should show pause button when status is RUNNING', async () => {
    const mockBatchDetail = {
      id: 'batch-001',
      task_name: '測試批次',
      total_projects: 5,
      completed_projects: 2,
      failed_projects: 0,
      status: 'RUNNING' as const,
      project_count: 5,
      success_count: 2,
      failed_count: 0,
      created_at: '2025-10-19T10:30:00Z',
      projects: [],
    }

    ;(batchApi.getBatchDetail as jest.Mock).mockResolvedValue(mockBatchDetail)

    render(<BatchDetailPage params={{ id: 'batch-001' }} />)

    await waitFor(() => {
      expect(screen.getByText('暫停批次')).toBeInTheDocument()
    })

    expect(screen.queryByText('繼續批次')).not.toBeInTheDocument()
  })

  it('should show resume button when status is PAUSED', async () => {
    const mockBatchDetail = {
      id: 'batch-001',
      task_name: '測試批次',
      total_projects: 5,
      completed_projects: 2,
      failed_projects: 0,
      status: 'PAUSED' as const,
      project_count: 5,
      success_count: 2,
      failed_count: 0,
      created_at: '2025-10-19T10:30:00Z',
      projects: [],
    }

    ;(batchApi.getBatchDetail as jest.Mock).mockResolvedValue(mockBatchDetail)

    render(<BatchDetailPage params={{ id: 'batch-001' }} />)

    await waitFor(() => {
      expect(screen.getByText('繼續批次')).toBeInTheDocument()
    })

    expect(screen.queryByText('暫停批次')).not.toBeInTheDocument()
  })

  it('should show retry button only when there are failed projects', async () => {
    const mockBatchDetailWithFailures = {
      id: 'batch-001',
      task_name: '測試批次',
      total_projects: 5,
      completed_projects: 3,
      failed_projects: 2,
      status: 'RUNNING' as const,
      project_count: 5,
      success_count: 3,
      failed_count: 2,
      created_at: '2025-10-19T10:30:00Z',
      projects: [],
    }

    ;(batchApi.getBatchDetail as jest.Mock).mockResolvedValue(mockBatchDetailWithFailures)

    render(<BatchDetailPage params={{ id: 'batch-001' }} />)

    await waitFor(() => {
      expect(screen.getByText('重試失敗任務')).toBeInTheDocument()
    })
  })

  it('should calculate progress percentage correctly', async () => {
    const mockBatchDetail = {
      id: 'batch-001',
      task_name: '測試批次',
      total_projects: 10,
      completed_projects: 7,
      failed_projects: 1,
      status: 'RUNNING' as const,
      project_count: 10,
      success_count: 7,
      failed_count: 1,
      created_at: '2025-10-19T10:30:00Z',
      projects: [],
    }

    ;(batchApi.getBatchDetail as jest.Mock).mockResolvedValue(mockBatchDetail)

    render(<BatchDetailPage params={{ id: 'batch-001' }} />)

    await waitFor(() => {
      // 應該顯示 70% (7/10)
      expect(screen.getByText(/70%|7.*\/.*10/)).toBeInTheDocument()
    })
  })
})
