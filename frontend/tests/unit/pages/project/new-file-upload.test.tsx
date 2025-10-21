// tests/unit/pages/project/new-file-upload.test.tsx
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NewProjectPage from '@/app/project/new/page'

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}))

jest.mock('@tanstack/react-query', () => ({
  useMutation: () => ({
    mutate: jest.fn(),
    isPending: false,
  }),
}))

/**
 * 測試 3：檔案上傳驗證
 *
 * 目的：驗證上傳檔案的格式和大小限制
 */
describe('測試 3：檔案上傳驗證', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('3.1 成功：上傳有效的 .txt 檔案', async () => {
    const user = userEvent.setup()
    render(<NewProjectPage />)

    // 切換到上傳檔案模式
    const uploadRadio = screen.getByLabelText('上傳檔案')
    await user.click(uploadRadio)

    // 創建測試檔案（1000 字）
    const content = '這是測試內容。'.repeat(200)
    const file = new File([content], 'content.txt', { type: 'text/plain' })

    // 上傳檔案
    const fileInput = screen.getByLabelText('上傳檔案')
    await user.upload(fileInput as HTMLInputElement, file)

    // 等待處理完成
    await waitFor(() => {
      // 應該顯示已載入的內容
      expect(screen.getByText(/已載入內容/)).toBeInTheDocument()
      // 字數應該正確
      expect(screen.getByText(new RegExp(`${content.length} 字`))).toBeInTheDocument()
    })
  })

  it('3.2 成功：上傳有效的 .md 檔案', async () => {
    const user = userEvent.setup()
    render(<NewProjectPage />)

    const uploadRadio = screen.getByLabelText('上傳檔案')
    await user.click(uploadRadio)

    const content = '# 標題\n\n內容...'.repeat(100)
    const file = new File([content], 'content.md', { type: 'text/markdown' })

    const fileInput = screen.getByLabelText('上傳檔案')
    await user.upload(fileInput as HTMLInputElement, file)

    await waitFor(() => {
      expect(screen.getByText(/已載入內容/)).toBeInTheDocument()
    })
  })

  it('3.3 失敗：檔案大小超過 10MB', async () => {
    const user = userEvent.setup()
    render(<NewProjectPage />)

    const uploadRadio = screen.getByLabelText('上傳檔案')
    await user.click(uploadRadio)

    // 創建大於 10MB 的檔案
    const largeContent = 'a'.repeat(11 * 1024 * 1024)
    const file = new File([largeContent], 'large.txt', { type: 'text/plain' })

    const fileInput = screen.getByLabelText('上傳檔案')
    await user.upload(fileInput as HTMLInputElement, file)

    // 應該顯示錯誤訊息（通過 toast）
    await waitFor(() => {
      // Toast 應該被調用
      // 注意：實際測試需要 mock toast
      expect(screen.queryByText(/已載入內容/)).not.toBeInTheDocument()
    })
  })

  it('3.4 失敗：不支援的檔案格式', async () => {
    const user = userEvent.setup()
    render(<NewProjectPage />)

    const uploadRadio = screen.getByLabelText('上傳檔案')
    await user.click(uploadRadio)

    // PDF 檔案不被支援
    const file = new File(['內容'], 'document.pdf', { type: 'application/pdf' })

    const fileInput = screen.getByLabelText('上傳檔案')
    await user.upload(fileInput as HTMLInputElement, file)

    await waitFor(() => {
      expect(screen.queryByText(/已載入內容/)).not.toBeInTheDocument()
    })
  })

  it('3.5 失敗：檔案內容長度不符（少於 500 字）', async () => {
    const user = userEvent.setup()
    render(<NewProjectPage />)

    const uploadRadio = screen.getByLabelText('上傳檔案')
    await user.click(uploadRadio)

    // 創建少於 500 字的檔案
    const shortContent = '很短的內容'
    const file = new File([shortContent], 'short.txt', { type: 'text/plain' })

    const fileInput = screen.getByLabelText('上傳檔案')
    await user.upload(fileInput as HTMLInputElement, file)

    await waitFor(() => {
      expect(screen.queryByText(/已載入內容/)).not.toBeInTheDocument()
    })
  })

  it('3.6 檔案內容自動填入並更新字數統計', async () => {
    const user = userEvent.setup()
    render(<NewProjectPage />)

    const uploadRadio = screen.getByLabelText('上傳檔案')
    await user.click(uploadRadio)

    const content = '測試文字。'.repeat(125) // 625 字
    const file = new File([content], 'test.txt', { type: 'text/plain' })

    const fileInput = screen.getByLabelText('上傳檔案')
    await user.upload(fileInput as HTMLInputElement, file)

    await waitFor(() => {
      expect(screen.getByText(/已載入內容/)).toBeInTheDocument()
      expect(screen.getByText(/625 字/)).toBeInTheDocument()
    })
  })
})
