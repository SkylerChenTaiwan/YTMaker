// tests/unit/pages/project/new-file-upload.test.tsx
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import NewProjectPage from '@/app/project/new/page'
import { toast } from 'sonner'

// Note: Next.js navigation and toast are globally mocked in jest.setup.js

// Polyfill File.text() for JSDOM
if (typeof File.prototype.text === 'undefined') {
  File.prototype.text = function() {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => {
        resolve(reader.result as string)
      }
      reader.readAsText(this)
    })
  }
}

/**
 * 測試 3：檔案上傳驗證
 *
 * 目的：驗證上傳檔案的格式和大小限制
 *
 * 策略：
 * - 使用真實的 QueryClient
 * - 使用全局 mock 的 toast
 * - 測試真實的檔案處理邏輯
 */
describe('測試 3：檔案上傳驗證', () => {
  let queryClient: QueryClient
  let toastSuccessSpy: jest.Mock
  let toastErrorSpy: jest.Mock

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    toastSuccessSpy = (toast.success as jest.Mock)
    toastErrorSpy = (toast.error as jest.Mock)
    jest.clearAllMocks()
  })

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    )
  }

  it('3.1 成功：上傳有效的 .txt 檔案', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<NewProjectPage />)

    // 切換到上傳檔案模式
    const sourceSelect = screen.getByLabelText('文字來源')
    await user.selectOptions(sourceSelect, 'upload')

    // 創建測試檔案（750 字）
    const content = '這是測試內容。'.repeat(125) // 750 字
    const file = new File([content], 'content.txt', { type: 'text/plain' })

    // 上傳檔案 - 使用 fireEvent 避免 timeout
    const fileInput = screen.getByLabelText('上傳檔案') as HTMLInputElement

    await act(async () => {
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })
      fireEvent.change(fileInput)
    })

    // 等待處理完成 - 檢查 toast 和內容
    await waitFor(() => {
      expect(toastSuccessSpy).toHaveBeenCalledWith('檔案載入成功')
    })

    // 應該顯示已載入的內容
    expect(screen.getByText(/已載入內容/)).toBeInTheDocument()
    expect(screen.getByText(new RegExp(`${content.length} 字`))).toBeInTheDocument()
  })

  it('3.2 成功：上傳有效的 .md 檔案', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<NewProjectPage />)

    const sourceSelect = screen.getByLabelText('文字來源')
    await user.selectOptions(sourceSelect, 'upload')

    const content = '# 標題\n\n內容...'.repeat(100) // 大約 1500 字
    const file = new File([content], 'content.md', { type: 'text/markdown' })

    const fileInput = screen.getByLabelText('上傳檔案') as HTMLInputElement

    await act(async () => {
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })
      fireEvent.change(fileInput)
    })

    await waitFor(() => {
      expect(toastSuccessSpy).toHaveBeenCalledWith('檔案載入成功')
    })

    expect(screen.getByText(/已載入內容/)).toBeInTheDocument()
  })

  it('3.3 失敗：檔案大小超過 10MB', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<NewProjectPage />)

    const sourceSelect = screen.getByLabelText('文字來源')
    await user.selectOptions(sourceSelect, 'upload')

    // 創建大於 10MB 的檔案
    const largeContent = 'a'.repeat(11 * 1024 * 1024)
    const file = new File([largeContent], 'large.txt', { type: 'text/plain' })

    const fileInput = screen.getByLabelText('上傳檔案') as HTMLInputElement
    await user.upload(fileInput, file)

    // 應該顯示錯誤訊息
    await waitFor(() => {
      expect(toastErrorSpy).toHaveBeenCalledWith('檔案大小不能超過 10MB')
    })

    // 內容不應該被載入
    expect(screen.queryByText(/已載入內容/)).not.toBeInTheDocument()
  })

  it('3.4 失敗：不支援的檔案格式（PDF）', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<NewProjectPage />)

    const sourceSelect = screen.getByLabelText('文字來源')
    await user.selectOptions(sourceSelect, 'upload')

    // PDF 檔案不被支援
    const file = new File(['內容'], 'document.pdf', { type: 'application/pdf' })

    const fileInput = screen.getByLabelText('上傳檔案') as HTMLInputElement

    await act(async () => {
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })
      fireEvent.change(fileInput)
    })

    await waitFor(() => {
      expect(toastErrorSpy).toHaveBeenCalledWith('檔案必須為 TXT 或 MD 格式')
    })

    expect(screen.queryByText(/已載入內容/)).not.toBeInTheDocument()
  })

  it('3.5 失敗：檔案內容長度不符（少於 500 字）', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<NewProjectPage />)

    const sourceSelect = screen.getByLabelText('文字來源')
    await user.selectOptions(sourceSelect, 'upload')

    // 創建少於 500 字的檔案
    const shortContent = '很短的內容'
    const file = new File([shortContent], 'short.txt', { type: 'text/plain' })

    const fileInput = screen.getByLabelText('上傳檔案') as HTMLInputElement

    await act(async () => {
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })
      fireEvent.change(fileInput)
    })

    await waitFor(() => {
      expect(toastErrorSpy).toHaveBeenCalledWith('文字長度必須在 500-10000 字之間')
    })

    expect(screen.queryByText(/已載入內容/)).not.toBeInTheDocument()
  })

  it('3.6 失敗：檔案內容長度不符（超過 10000 字）', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<NewProjectPage />)

    const sourceSelect = screen.getByLabelText('文字來源')
    await user.selectOptions(sourceSelect, 'upload')

    // 創建超過 10000 字的檔案
    const longContent = '測試文字。'.repeat(2501) // 超過 10000 字
    const file = new File([longContent], 'long.txt', { type: 'text/plain' })

    const fileInput = screen.getByLabelText('上傳檔案') as HTMLInputElement

    await act(async () => {
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })
      fireEvent.change(fileInput)
    })

    await waitFor(() => {
      expect(toastErrorSpy).toHaveBeenCalledWith('文字長度必須在 500-10000 字之間')
    })

    expect(screen.queryByText(/已載入內容/)).not.toBeInTheDocument()
  })

  it('3.7 檔案內容自動填入並更新字數統計', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<NewProjectPage />)

    const sourceSelect = screen.getByLabelText('文字來源')
    await user.selectOptions(sourceSelect, 'upload')

    const content = '測試文字。'.repeat(125) // 625 字
    const file = new File([content], 'test.txt', { type: 'text/plain' })

    const fileInput = screen.getByLabelText('上傳檔案') as HTMLInputElement

    await act(async () => {
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })
      fireEvent.change(fileInput)
    })

    await waitFor(() => {
      expect(toastSuccessSpy).toHaveBeenCalledWith('檔案載入成功')
    })

    expect(screen.getByText(/已載入內容/)).toBeInTheDocument()
    expect(screen.getByText(/625 字/)).toBeInTheDocument()

    // 檔案內容應該顯示在預覽區（前 500 字）
    const contentPreview = content.slice(0, 500)
    expect(screen.getByText(contentPreview, { exact: false })).toBeInTheDocument()
  })

  it('3.8 上傳後應該自動啟用下一步按鈕（如果有專案名稱）', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<NewProjectPage />)

    // 先輸入專案名稱
    const nameInput = screen.getByLabelText('專案名稱')
    await user.type(nameInput, '測試專案')

    // 切換到上傳模式
    const sourceSelect = screen.getByLabelText('文字來源')
    await user.selectOptions(sourceSelect, 'upload')

    // 上傳有效檔案
    const content = '測試文字。'.repeat(125)
    const file = new File([content], 'test.txt', { type: 'text/plain' })

    const fileInput = screen.getByLabelText('上傳檔案') as HTMLInputElement

    await act(async () => {
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })
      fireEvent.change(fileInput)
    })

    // 等待檔案處理完成
    await waitFor(() => {
      expect(toastSuccessSpy).toHaveBeenCalledWith('檔案載入成功')
    })

    // 下一步按鈕應該被啟用
    const nextButton = screen.getByRole('button', { name: '下一步' })
    expect(nextButton).not.toBeDisabled()
  })
})
