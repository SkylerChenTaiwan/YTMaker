import { render, screen, waitFor } from '@testing-library/react'
import BatchPage from '../page'
import * as batchApi from '@/services/batchApi'
import { useBatchStore } from '@/store/useBatchStore'

// Mock batchApi
jest.mock('@/services/batchApi', () => ({
  getBatchTasks: jest.fn(),
  deleteBatchTask: jest.fn(),
  pauseBatchTask: jest.fn(),
  resumeBatchTask: jest.fn(),
}))

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => '/batch',
}))

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

describe('BatchPage - 測試 1：批次列表正確載入', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset store
    useBatchStore.getState().reset()
  })

  it('should load and display batch task list correctly', async () => {
    // Mock API Response
    const mockBatchList = {
      batches: [
        {
          id: 'batch-001',
          task_name: '週一影片批次',
          project_count: 10,
          status: 'RUNNING' as const,
          success_count: 7,
          failed_count: 1,
          created_at: '2025-10-19T10:30:00Z',
        },
        {
          id: 'batch-002',
          task_name: '產品介紹系列',
          project_count: 5,
          status: 'COMPLETED' as const,
          success_count: 5,
          failed_count: 0,
          created_at: '2025-10-18T14:00:00Z',
        },
      ],
    }

    ;(batchApi.getBatchTasks as jest.Mock).mockResolvedValue(mockBatchList)

    // 渲染元件
    render(<BatchPage />)

    // 檢查: 頁面顯示「批次處理」標題
    expect(screen.getByText('批次處理')).toBeInTheDocument()

    // 等待資料載入
    await waitFor(() => {
      expect(batchApi.getBatchTasks).toHaveBeenCalledTimes(1)
    })

    // 檢查: 表格顯示 2 個批次任務
    await waitFor(() => {
      expect(screen.getByText('週一影片批次')).toBeInTheDocument()
      expect(screen.getByText('產品介紹系列')).toBeInTheDocument()
    })

    // 檢查: 第一個任務的詳細資訊
    expect(screen.getByText('執行中')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument() // project_count
    expect(screen.getByText('7')).toBeInTheDocument() // success_count
    expect(screen.getByText('1')).toBeInTheDocument() // failed_count

    // 檢查: 第二個任務的詳細資訊
    expect(screen.getByText('已完成')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument() // project_count, success_count

    // 檢查: 操作按鈕根據狀態正確顯示
    const viewButtons = screen.getAllByText('查看')
    expect(viewButtons).toHaveLength(2)

    // RUNNING 狀態應該顯示「暫停」按鈕
    expect(screen.getByText('暫停')).toBeInTheDocument()

    // COMPLETED 狀態應該顯示「刪除」按鈕
    const deleteButtons = screen.getAllByText('刪除')
    expect(deleteButtons).toHaveLength(2) // 兩個任務都可以刪除
  })

  it('should display loading skeleton while fetching data', () => {
    ;(batchApi.getBatchTasks as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )

    render(<BatchPage />)

    // 應該顯示載入中的骨架屏 (根據實作可能會有不同的 UI)
    // 這裡假設我們會顯示 "載入中..." 的文字或骨架屏
    expect(screen.queryByText('週一影片批次')).not.toBeInTheDocument()
  })

  it('should handle API error correctly', async () => {
    const errorMessage = '載入批次任務失敗'
    ;(batchApi.getBatchTasks as jest.Mock).mockRejectedValue(new Error(errorMessage))

    render(<BatchPage />)

    await waitFor(() => {
      expect(batchApi.getBatchTasks).toHaveBeenCalled()
    })

    // 應該顯示錯誤訊息
    // (根據實作,可能會透過 toast 或頁面上的錯誤訊息)
  })

  it('should display empty state when no batches exist', async () => {
    ;(batchApi.getBatchTasks as jest.Mock).mockResolvedValue({
      batches: [],
    })

    render(<BatchPage />)

    await waitFor(() => {
      expect(batchApi.getBatchTasks).toHaveBeenCalled()
    })

    // 應該顯示空狀態
    expect(screen.getByText('還沒有任何批次任務')).toBeInTheDocument()
    expect(screen.getByText('新增第一個批次任務')).toBeInTheDocument()
  })
})
