// tests/unit/pages/project/new-ui-interactions.test.tsx
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import NewProjectPage from '@/app/project/new/page'
import { projectsApi } from '@/services/api/projects'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

// Note: toast is globally mocked in jest.setup.js

/**
 * 測試 9：UI 互動與狀態管理
 *
 * 目的：測試表單的 UI 互動、狀態變化和錯誤處理
 */
describe('測試 9：UI 互動與狀態管理', () => {
  let queryClient: QueryClient
  let mockRouterPush: jest.Mock

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    mockRouterPush = (useRouter as jest.Mock)().push as jest.Mock
    jest.clearAllMocks()
  })

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    )
  }

  it('9.1 初始狀態：預設為貼上模式，下一步按鈕禁用', () => {
    renderWithQueryClient(<NewProjectPage />)

    // 檢查預設為貼上模式
    const pasteOption = screen.getByDisplayValue('paste')
    expect(pasteOption).toBeInTheDocument()

    // 下一步按鈕應該被禁用（因為沒有內容）
    const nextButton = screen.getByRole('button', { name: '下一步' })
    expect(nextButton).toBeDisabled()

    // 應該顯示字數統計為 0
    expect(screen.getByText(/目前字數: 0/)).toBeInTheDocument()
  })

  it('9.2 文字來源切換：paste ↔ upload', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<NewProjectPage />)

    // 初始為 paste 模式
    expect(screen.getByPlaceholderText(/貼上文字內容/)).toBeInTheDocument()

    // 切換到 upload 模式
    const sourceSelect = screen.getByLabelText('文字來源')
    await user.click(sourceSelect)
    await user.selectOptions(sourceSelect, 'upload')

    // 應該顯示檔案上傳界面
    await waitFor(() => {
      expect(screen.getByLabelText('上傳檔案')).toBeInTheDocument()
      expect(screen.queryByPlaceholderText(/貼上文字內容/)).not.toBeInTheDocument()
    })

    // 切換回 paste 模式
    await user.click(sourceSelect)
    await user.selectOptions(sourceSelect, 'paste')

    // 應該重新顯示文字輸入區
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/貼上文字內容/)).toBeInTheDocument()
      expect(screen.queryByLabelText('上傳檔案')).not.toBeInTheDocument()
    })
  })

  it('9.3 專案名稱輸入與即時驗證', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<NewProjectPage />)

    const nameInput = screen.getByLabelText('專案名稱')

    // 輸入專案名稱
    await user.type(nameInput, '我的測試專案')

    // 驗證輸入值
    expect(nameInput).toHaveValue('我的測試專案')
  })

  it('9.4 錯誤訊息顯示與清除', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<NewProjectPage />)

    // 不輸入專案名稱，輸入文字內容後提交
    const contentTextarea = screen.getByPlaceholderText(/貼上文字內容/)
    const testContent = '測試文字。'.repeat(125) // 625 字
    await user.type(contentTextarea, testContent)

    // 點擊下一步
    const nextButton = screen.getByRole('button', { name: '下一步' })
    await user.click(nextButton)

    // 應該顯示錯誤訊息
    await waitFor(() => {
      expect(screen.getByText('專案名稱不能為空')).toBeInTheDocument()
    })

    // 輸入專案名稱後，錯誤訊息應該消失
    const nameInput = screen.getByLabelText('專案名稱')
    await user.type(nameInput, '測試專案')

    // 再次提交（這次應該成功）
    await user.click(nextButton)

    // 錯誤訊息不應該再顯示
    await waitFor(() => {
      expect(screen.queryByText('專案名稱不能為空')).not.toBeInTheDocument()
    })
  })

  it('9.5 字數統計即時更新（貼上模式）', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<NewProjectPage />)

    const contentTextarea = screen.getByPlaceholderText(/貼上文字內容/)

    // 輸入文字並檢查字數更新
    await user.type(contentTextarea, '測試')
    expect(screen.getByText(/目前字數: 2/)).toBeInTheDocument()

    await user.type(contentTextarea, '文字內容')
    expect(screen.getByText(/目前字數: 6/)).toBeInTheDocument()
  })

  it('9.6 字數警告：不足 500 字', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<NewProjectPage />)

    const contentTextarea = screen.getByPlaceholderText(/貼上文字內容/)
    await user.type(contentTextarea, '測試'.repeat(100)) // 200 字

    // 應該顯示還需要多少字
    await waitFor(() => {
      expect(screen.getByText(/還需要 300 字/)).toBeInTheDocument()
    })

    // 下一步按鈕應該被禁用
    const nextButton = screen.getByRole('button', { name: '下一步' })
    expect(nextButton).toBeDisabled()
  })

  it('9.7 字數警告：超過 10000 字', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<NewProjectPage />)

    const contentTextarea = screen.getByPlaceholderText(/貼上文字內容/)
    const longContent = '測試文字。'.repeat(2501) // 超過 10000 字
    await user.type(contentTextarea, longContent)

    // 應該顯示超過多少字
    await waitFor(() => {
      expect(screen.getByText(/超過/)).toBeInTheDocument()
    })

    // 下一步按鈕應該被禁用
    const nextButton = screen.getByRole('button', { name: '下一步' })
    expect(nextButton).toBeDisabled()
  })

  it('9.8 提交中時按鈕狀態與 loading 效果', async () => {
    const user = userEvent.setup()

    // Mock API 為延遲回應
    const createProjectSpy = jest.spyOn(projectsApi, 'createProject')
    createProjectSpy.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    )

    renderWithQueryClient(<NewProjectPage />)

    // 輸入有效資料
    const nameInput = screen.getByLabelText('專案名稱')
    await user.type(nameInput, '測試專案')

    const contentTextarea = screen.getByPlaceholderText(/貼上文字內容/)
    await user.type(contentTextarea, '測試文字。'.repeat(125)) // 625 字

    // 點擊下一步
    const nextButton = screen.getByRole('button', { name: '下一步' })
    await user.click(nextButton)

    // 按鈕應該顯示 loading 狀態（根據 Button 組件的實作）
    // 取消按鈕應該被禁用
    await waitFor(() => {
      const cancelButton = screen.getByRole('button', { name: '取消' })
      expect(cancelButton).toBeDisabled()
    })

    createProjectSpy.mockRestore()
  })
})

/**
 * 測試 10：Toast 訊息驗證
 *
 * 目的：驗證各種操作會正確顯示 toast 訊息
 */
describe('測試 10：Toast 訊息驗證', () => {
  let queryClient: QueryClient
  let createProjectSpy: jest.SpyInstance
  let toastSuccessSpy: jest.Mock
  let toastErrorSpy: jest.Mock

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    createProjectSpy = jest.spyOn(projectsApi, 'createProject')
    toastSuccessSpy = (toast.success as jest.Mock)
    toastErrorSpy = (toast.error as jest.Mock)
    jest.clearAllMocks()
  })

  afterEach(() => {
    createProjectSpy.mockRestore()
  })

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    )
  }

  it('10.1 API 成功：顯示成功 toast', async () => {
    const user = userEvent.setup()

    createProjectSpy.mockResolvedValue({
      id: 'test-id',
      project_name: '測試專案',
      status: 'INITIALIZED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    renderWithQueryClient(<NewProjectPage />)

    // 輸入有效資料並提交
    const nameInput = screen.getByLabelText('專案名稱')
    await user.type(nameInput, '測試專案')

    const contentTextarea = screen.getByPlaceholderText(/貼上文字內容/)
    await user.type(contentTextarea, '測試文字。'.repeat(125))

    const nextButton = screen.getByRole('button', { name: '下一步' })
    await user.click(nextButton)

    // 應該顯示成功 toast
    await waitFor(() => {
      expect(toastSuccessSpy).toHaveBeenCalledWith('專案創建成功！')
    })
  })

  it('10.2 API 失敗：顯示錯誤 toast', async () => {
    const user = userEvent.setup()

    createProjectSpy.mockRejectedValue(new Error('伺服器錯誤'))

    renderWithQueryClient(<NewProjectPage />)

    // 輸入有效資料並提交
    const nameInput = screen.getByLabelText('專案名稱')
    await user.type(nameInput, '測試專案')

    const contentTextarea = screen.getByPlaceholderText(/貼上文字內容/)
    await user.type(contentTextarea, '測試文字。'.repeat(125))

    const nextButton = screen.getByRole('button', { name: '下一步' })
    await user.click(nextButton)

    // 應該顯示錯誤 toast
    await waitFor(() => {
      expect(toastErrorSpy).toHaveBeenCalledWith('伺服器錯誤')
    })
  })

  it('10.3 檔案上傳成功：顯示成功 toast', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<NewProjectPage />)

    // 切換到上傳模式
    const sourceSelect = screen.getByLabelText('文字來源')
    await user.selectOptions(sourceSelect, 'upload')

    // 上傳有效檔案
    const content = '測試文字。'.repeat(125) // 625 字
    const file = new File([content], 'test.txt', { type: 'text/plain' })

    const fileInput = screen.getByLabelText('上傳檔案') as HTMLInputElement
    await user.upload(fileInput, file)

    // 應該顯示成功 toast
    await waitFor(() => {
      expect(toastSuccessSpy).toHaveBeenCalledWith('檔案載入成功')
    })
  })

  it('10.4 檔案格式錯誤：顯示錯誤 toast', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<NewProjectPage />)

    // 切換到上傳模式
    const sourceSelect = screen.getByLabelText('文字來源')
    await user.selectOptions(sourceSelect, 'upload')

    // 上傳不支援的檔案
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })

    const fileInput = screen.getByLabelText('上傳檔案') as HTMLInputElement
    await user.upload(fileInput, file)

    // 應該顯示錯誤 toast
    await waitFor(() => {
      expect(toastErrorSpy).toHaveBeenCalledWith('檔案必須為 TXT 或 MD 格式')
    })
  })

  it('10.5 檔案大小超過限制：顯示錯誤 toast', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<NewProjectPage />)

    // 切換到上傳模式
    const sourceSelect = screen.getByLabelText('文字來源')
    await user.selectOptions(sourceSelect, 'upload')

    // 上傳過大檔案
    const largeContent = 'a'.repeat(11 * 1024 * 1024) // 11MB
    const file = new File([largeContent], 'large.txt', { type: 'text/plain' })

    const fileInput = screen.getByLabelText('上傳檔案') as HTMLInputElement
    await user.upload(fileInput, file)

    // 應該顯示錯誤 toast
    await waitFor(() => {
      expect(toastErrorSpy).toHaveBeenCalledWith('檔案大小不能超過 10MB')
    })
  })

  it('10.6 檔案內容長度不符：顯示錯誤 toast', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<NewProjectPage />)

    // 切換到上傳模式
    const sourceSelect = screen.getByLabelText('文字來源')
    await user.selectOptions(sourceSelect, 'upload')

    // 上傳內容太少的檔案
    const shortContent = '短內容'
    const file = new File([shortContent], 'short.txt', { type: 'text/plain' })

    const fileInput = screen.getByLabelText('上傳檔案') as HTMLInputElement
    await user.upload(fileInput, file)

    // 應該顯示錯誤 toast
    await waitFor(() => {
      expect(toastErrorSpy).toHaveBeenCalledWith('文字長度必須在 500-10000 字之間')
    })
  })
})

/**
 * 測試 11：檔案上傳邊界條件
 *
 * 目的：測試檔案上傳的各種邊界情況
 */
describe('測試 11：檔案上傳邊界條件', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    jest.clearAllMocks()
  })

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    )
  }

  it('11.1 上傳多個檔案時只取第一個', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<NewProjectPage />)

    // 切換到上傳模式
    const sourceSelect = screen.getByLabelText('文字來源')
    await user.selectOptions(sourceSelect, 'upload')

    // 上傳多個檔案
    const file1 = new File(['測試文字。'.repeat(125)], 'file1.txt', { type: 'text/plain' })
    const file2 = new File(['其他內容。'.repeat(125)], 'file2.txt', { type: 'text/plain' })

    const fileInput = screen.getByLabelText('上傳檔案') as HTMLInputElement
    await user.upload(fileInput, [file1, file2])

    // 應該只載入第一個檔案的內容
    await waitFor(() => {
      expect(screen.getByText(/已載入內容/)).toBeInTheDocument()
      // 檢查字數是第一個檔案的字數
      expect(screen.getByText(/625 字/)).toBeInTheDocument()
    })
  })

  it('11.2 正好 500 字的檔案應該被接受', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<NewProjectPage />)

    // 切換到上傳模式
    const sourceSelect = screen.getByLabelText('文字來源')
    await user.selectOptions(sourceSelect, 'upload')

    // 上傳正好 500 字的檔案
    const content = '測試文字'.repeat(125) // 正好 500 字
    const file = new File([content], 'test.txt', { type: 'text/plain' })

    const fileInput = screen.getByLabelText('上傳檔案') as HTMLInputElement
    await user.upload(fileInput, file)

    // 應該成功載入
    await waitFor(() => {
      expect(screen.getByText(/已載入內容/)).toBeInTheDocument()
      expect(screen.getByText(/500 字/)).toBeInTheDocument()
    })
  })

  it('11.3 正好 10000 字的檔案應該被接受', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<NewProjectPage />)

    // 切換到上傳模式
    const sourceSelect = screen.getByLabelText('文字來源')
    await user.selectOptions(sourceSelect, 'upload')

    // 上傳正好 10000 字的檔案
    const content = '測試文字'.repeat(2500) // 正好 10000 字
    const file = new File([content], 'test.txt', { type: 'text/plain' })

    const fileInput = screen.getByLabelText('上傳檔案') as HTMLInputElement
    await user.upload(fileInput, file)

    // 應該成功載入
    await waitFor(() => {
      expect(screen.getByText(/已載入內容/)).toBeInTheDocument()
      expect(screen.getByText(/10000 字/)).toBeInTheDocument()
    })
  })

  it('11.4 .md 檔案（無 MIME type）應該根據副檔名被接受', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<NewProjectPage />)

    // 切換到上傳模式
    const sourceSelect = screen.getByLabelText('文字來源')
    await user.selectOptions(sourceSelect, 'upload')

    // 上傳 .md 檔案（可能沒有正確的 MIME type）
    const content = '測試文字。'.repeat(125)
    const file = new File([content], 'test.md', { type: '' })

    const fileInput = screen.getByLabelText('上傳檔案') as HTMLInputElement
    await user.upload(fileInput, file)

    // 應該成功載入（因為副檔名是 .md）
    await waitFor(() => {
      expect(screen.getByText(/已載入內容/)).toBeInTheDocument()
    })
  })
})
