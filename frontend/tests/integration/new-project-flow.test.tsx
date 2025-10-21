// tests/integration/new-project-flow.test.tsx
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NewProjectPage from '@/app/project/new/page'

/**
 * 測試 7：完整新增專案流程（整合測試）
 *
 * 目的：驗證從新增專案到視覺配置的完整流程
 */
describe('測試 7：完整新增專案流程', () => {
  const mockPush = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock Next.js router
    jest.mock('next/navigation', () => ({
      useRouter: () => ({
        push: mockPush,
      }),
    }))

    // Mock API
    jest.mock('@tanstack/react-query', () => ({
      useMutation: () => ({
        mutate: jest.fn((data) => {
          // 模擬成功創建專案
          setTimeout(() => {
            mockPush('/project/test-id/configure/visual')
          }, 100)
        }),
        isPending: false,
      }),
    }))
  })

  it('7.1 完整流程：輸入專案名稱 -> 貼上文字 -> 創建成功 -> 跳轉', async () => {
    const user = userEvent.setup()
    render(<NewProjectPage />)

    // Step 1: 輸入專案名稱
    const nameInput = screen.getByLabelText('專案名稱')
    await user.type(nameInput, '測試專案')

    // 驗證輸入
    expect(nameInput).toHaveValue('測試專案')

    // Step 2: 確認預設為貼上模式
    expect(screen.getByLabelText('貼上文字')).toBeInTheDocument()

    // Step 3: 貼上文字內容（1000 字）
    const contentTextarea = screen.getByPlaceholderText(/貼上文字內容/)
    const testContent = '這是測試內容。'.repeat(200) // 1200 字
    await user.type(contentTextarea, testContent)

    // Step 4: 驗證字數統計
    await waitFor(() => {
      expect(screen.getByText(/目前字數: 1200/)).toBeInTheDocument()
    })

    // Step 5: 下一步按鈕應該啟用
    const nextButton = screen.getByRole('button', { name: '下一步' })
    expect(nextButton).not.toBeDisabled()

    // Step 6: 點擊下一步
    await user.click(nextButton)

    // Step 7: 應該調用 API（通過 mutation）並跳轉
    await waitFor(
      () => {
        expect(mockPush).toHaveBeenCalledWith(
          expect.stringContaining('/configure/visual')
        )
      },
      { timeout: 3000 }
    )
  })

  it('7.2 完整流程：上傳檔案模式', async () => {
    const user = userEvent.setup()
    render(<NewProjectPage />)

    // Step 1: 輸入專案名稱
    const nameInput = screen.getByLabelText('專案名稱')
    await user.type(nameInput, '測試專案（檔案上傳）')

    // Step 2: 切換到上傳檔案
    const uploadRadio = screen.getByLabelText('上傳檔案')
    await user.click(uploadRadio)

    // Step 3: 上傳檔案
    const content = '測試文字。'.repeat(125) // 625 字
    const file = new File([content], 'test.txt', { type: 'text/plain' })

    const fileInput = screen.getByLabelText('上傳檔案')
    await user.upload(fileInput as HTMLInputElement, file)

    // Step 4: 等待檔案處理完成
    await waitFor(() => {
      expect(screen.getByText(/已載入內容/)).toBeInTheDocument()
      expect(screen.getByText(/625 字/)).toBeInTheDocument()
    })

    // Step 5: 點擊下一步
    const nextButton = screen.getByRole('button', { name: '下一步' })
    await user.click(nextButton)

    // Step 6: 應該跳轉
    await waitFor(
      () => {
        expect(mockPush).toHaveBeenCalled()
      },
      { timeout: 3000 }
    )
  })

  it('7.3 錯誤處理：專案名稱為空', async () => {
    const user = userEvent.setup()
    render(<NewProjectPage />)

    // 不輸入專案名稱，直接貼上文字
    const contentTextarea = screen.getByPlaceholderText(/貼上文字內容/)
    const testContent = '這是測試內容。'.repeat(200)
    await user.type(contentTextarea, testContent)

    // 點擊下一步
    const nextButton = screen.getByRole('button', { name: '下一步' })
    await user.click(nextButton)

    // 應該顯示錯誤訊息
    await waitFor(() => {
      expect(screen.getByText('專案名稱不能為空')).toBeInTheDocument()
    })

    // 不應該跳轉
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('7.4 錯誤處理：文字長度不足', async () => {
    const user = userEvent.setup()
    render(<NewProjectPage />)

    // 輸入專案名稱
    const nameInput = screen.getByLabelText('專案名稱')
    await user.type(nameInput, '測試專案')

    // 貼上少於 500 字的內容
    const contentTextarea = screen.getByPlaceholderText(/貼上文字內容/)
    await user.type(contentTextarea, '很短的內容')

    // 下一步按鈕應該被禁用
    const nextButton = screen.getByRole('button', { name: '下一步' })
    expect(nextButton).toBeDisabled()

    // 應該顯示字數警告
    await waitFor(() => {
      expect(screen.getByText(/還需要/)).toBeInTheDocument()
    })
  })

  it('7.5 錯誤處理：文字長度超過限制', async () => {
    const user = userEvent.setup()
    render(<NewProjectPage />)

    // 輸入專案名稱
    const nameInput = screen.getByLabelText('專案名稱')
    await user.type(nameInput, '測試專案')

    // 貼上超過 10000 字的內容
    const contentTextarea = screen.getByPlaceholderText(/貼上文字內容/)
    const longContent = '測試文字。'.repeat(2501) // 超過 10000 字
    await user.type(contentTextarea, longContent)

    // 下一步按鈕應該被禁用
    const nextButton = screen.getByRole('button', { name: '下一步' })
    expect(nextButton).toBeDisabled()

    // 應該顯示字數警告
    await waitFor(() => {
      expect(screen.getByText(/超過/)).toBeInTheDocument()
    })
  })

  it('7.6 UI 互動：字數即時更新', async () => {
    const user = userEvent.setup()
    render(<NewProjectPage />)

    const contentTextarea = screen.getByPlaceholderText(/貼上文字內容/)

    // 輸入一些文字
    await user.type(contentTextarea, '測試')

    // 字數應該即時更新
    await waitFor(() => {
      expect(screen.getByText(/目前字數: 2/)).toBeInTheDocument()
    })

    // 繼續輸入
    await user.type(contentTextarea, '文字')

    await waitFor(() => {
      expect(screen.getByText(/目前字數: 4/)).toBeInTheDocument()
    })
  })

  it('7.7 UI 互動：取消按鈕應返回主控台', async () => {
    const user = userEvent.setup()
    render(<NewProjectPage />)

    const cancelButton = screen.getByRole('button', { name: '取消' })
    await user.click(cancelButton)

    // 應該跳轉到主控台
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })
})

/**
 * 測試 8：響應式設計
 */
describe('測試 8：響應式設計', () => {
  it('8.1 頁面應該有正確的響應式類名', () => {
    render(<NewProjectPage />)

    // 主容器應該有最大寬度限制
    const container = screen.getByRole('main') || document.querySelector('.max-w-2xl')
    expect(container).toBeInTheDocument()
  })

  it('8.2 文字輸入區應該有合適的高度', () => {
    render(<NewProjectPage />)

    const textarea = screen.getByPlaceholderText(/貼上文字內容/)
    expect(textarea).toHaveClass('h-64')
  })
})
