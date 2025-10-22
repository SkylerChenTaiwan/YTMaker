import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CreateBatchModal } from '../CreateBatchModal'
import * as batchApi from '@/services/batchApi'
import { useConfigStore } from '@/store/useConfigStore'

// Mock batchApi
jest.mock('@/services/batchApi', () => ({
  createBatchTask: jest.fn(),
}))

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

describe('CreateBatchModal - 測試 2：新增批次任務 Modal 驗證', () => {
  const mockOnClose = jest.fn()
  const mockOnSuccess = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()

    // 設置 mock prompt templates
    useConfigStore.setState({
      promptTemplates: [
        {
          id: 'template-001',
          name: '教學影片範本',
          content: '這是教學影片的 prompt',
          is_default: false,
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
          usage_count: 0,
        },
      ],
    })
  })

  it('should show validation errors when submitting empty form', async () => {
    render(<CreateBatchModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />)

    // 檢查 Modal 是否開啟
    expect(screen.getByText('新增批次任務')).toBeInTheDocument()

    // 不填寫任何欄位,直接提交
    const submitButton = screen.getByText('開始批次處理')
    fireEvent.click(submitButton)

    // 等待驗證錯誤顯示
    await waitFor(() => {
      expect(screen.getByText(/任務名稱為必填/)).toBeInTheDocument()
    })

    // 應該顯示其他必填欄位的錯誤
    expect(screen.getByText(/至少需上傳一個文字檔案/)).toBeInTheDocument()
  })

  it('should validate file types', async () => {
    render(<CreateBatchModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />)

    // 嘗試上傳非 .txt 檔案
    const fileInput = screen.getByLabelText(/文字內容檔案|上傳檔案/)
    const invalidFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })

    fireEvent.change(fileInput, { target: { files: [invalidFile] } })

    await waitFor(() => {
      expect(screen.getByText(/只能上傳.*txt.*文字檔案/i)).toBeInTheDocument()
    })
  })

  it('should accept valid .txt files', async () => {
    render(<CreateBatchModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />)

    const fileInput = screen.getByLabelText(/文字內容檔案|上傳檔案/)
    const validFile1 = new File(['content 1'], 'file1.txt', { type: 'text/plain' })
    const validFile2 = new File(['content 2'], 'file2.txt', { type: 'text/plain' })

    fireEvent.change(fileInput, { target: { files: [validFile1, validFile2] } })

    await waitFor(() => {
      expect(screen.getByText(/已選擇.*2.*個檔案/i)).toBeInTheDocument()
    })
  })

  it('should submit form successfully with valid data', async () => {
    const mockResponse = {
      batch_id: 'batch-003',
      total_projects: 3,
      status: 'QUEUED',
    }

    ;(batchApi.createBatchTask as jest.Mock).mockResolvedValue(mockResponse)

    render(<CreateBatchModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />)

    // 填寫表單
    const nameInput = screen.getByLabelText(/任務名稱/)
    fireEvent.change(nameInput, { target: { value: '測試批次任務' } })

    // 上傳檔案
    const fileInput = screen.getByLabelText(/文字內容檔案|上傳檔案/)
    const file1 = new File(['content 1'], 'file1.txt', { type: 'text/plain' })
    const file2 = new File(['content 2'], 'file2.txt', { type: 'text/plain' })
    const file3 = new File(['content 3'], 'file3.txt', { type: 'text/plain' })

    fireEvent.change(fileInput, { target: { files: [file1, file2, file3] } })

    // 選擇 Prompt 範本
    const promptSelect = screen.getByLabelText(/Prompt.*範本/)
    fireEvent.change(promptSelect, { target: { value: 'template-001' } })

    // 選擇 Gemini 模型
    const modelSelect = screen.getByLabelText(/Gemini.*模型/)
    fireEvent.change(modelSelect, { target: { value: 'gemini-1.5-flash' } })

    // 提交表單
    const submitButton = screen.getByText('開始批次處理')
    fireEvent.click(submitButton)

    // 等待 API 呼叫
    await waitFor(() => {
      expect(batchApi.createBatchTask).toHaveBeenCalledWith(
        expect.objectContaining({
          task_name: '測試批次任務',
          files: expect.arrayContaining([file1, file2, file3]),
          prompt_template_id: 'template-001',
          gemini_model: 'gemini-1.5-flash',
        })
      )
    })

    // 應該呼叫 onSuccess 回調
    expect(mockOnSuccess).toHaveBeenCalled()

    // 應該跳轉到批次詳情頁
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/batch/batch-003')
    })
  })

  it('should handle API errors', async () => {
    const errorMessage = '建立批次任務失敗'
    ;(batchApi.createBatchTask as jest.Mock).mockRejectedValue(new Error(errorMessage))

    render(<CreateBatchModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />)

    // 填寫表單 (簡化版)
    const nameInput = screen.getByLabelText(/任務名稱/)
    fireEvent.change(nameInput, { target: { value: '測試批次任務' } })

    const fileInput = screen.getByLabelText(/文字內容檔案|上傳檔案/)
    const file = new File(['content'], 'file1.txt', { type: 'text/plain' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    // 提交表單
    const submitButton = screen.getByText('開始批次處理')
    fireEvent.click(submitButton)

    // 應該顯示錯誤訊息
    await waitFor(() => {
      expect(screen.getByText(new RegExp(errorMessage))).toBeInTheDocument()
    })

    // 不應該呼叫 onSuccess
    expect(mockOnSuccess).not.toHaveBeenCalled()
  })

  it('should close modal when cancel button is clicked', () => {
    render(<CreateBatchModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />)

    const cancelButton = screen.getByText('取消')
    fireEvent.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should not render when open is false', () => {
    render(<CreateBatchModal open={false} onClose={mockOnClose} onSuccess={mockOnSuccess} />)

    expect(screen.queryByText('新增批次任務')).not.toBeInTheDocument()
  })
})
