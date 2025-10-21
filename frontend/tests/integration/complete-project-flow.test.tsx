// tests/integration/complete-project-flow.test.tsx
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import NewProjectPage from '@/app/project/new/page'
import VisualConfigPage from '@/app/project/[id]/configure/visual/page'
import { projectsApi, type Project } from '@/services/api/projects'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

/**
 * 測試 17：完整專案建立流程（真正的 E2E）
 *
 * 目的：測試從建立專案到視覺配置的完整端到端流程
 *
 * 策略：
 * - 使用真實的 QueryClient
 * - 模擬完整的使用者操作
 * - 測試跨頁面的資料流動
 * - 驗證所有狀態變化
 */
describe('測試 17：完整專案建立流程（E2E）', () => {
  let queryClient: QueryClient
  let createProjectSpy: jest.SpyInstance
  let mockRouterPush: jest.Mock
  let toastSuccessSpy: jest.Mock

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    createProjectSpy = jest.spyOn(projectsApi, 'createProject')
    mockRouterPush = (useRouter as jest.Mock)().push as jest.Mock
    toastSuccessSpy = (toast.success as jest.Mock)
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

  it('17.1 完整流程：貼上文字 → 創建專案 → 視覺配置 → 下一步', async () => {
    const user = userEvent.setup()

    // Mock API 成功回應
    const mockProject: Project = {
      id: 'aaaaaaaa-1234-4234-8234-123456789012',
      project_name: '完整測試專案',
      status: 'INITIALIZED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    createProjectSpy.mockResolvedValue(mockProject)

    // === 階段 1：建立專案（Page-3） ===
    renderWithQueryClient(<NewProjectPage />)

    // 輸入專案名稱
    const nameInput = screen.getByLabelText('專案名稱')
    await user.type(nameInput, '完整測試專案')

    // 貼上文字內容
    const contentTextarea = screen.getByPlaceholderText(/貼上文字內容/)
    const testContent = '這是完整測試的內容。'.repeat(125) // 1500 字
    await user.type(contentTextarea, testContent)

    // 驗證字數統計
    await waitFor(() => {
      expect(screen.getByText(/目前字數: 1500/)).toBeInTheDocument()
    })

    // 點擊下一步
    const nextButton = screen.getByRole('button', { name: '下一步' })
    await user.click(nextButton)

    // 應該調用 API 並顯示成功 toast
    await waitFor(() => {
      expect(createProjectSpy).toHaveBeenCalledWith({
        project_name: '完整測試專案',
        content_text: testContent,
        content_source: 'paste',
      })
      expect(toastSuccessSpy).toHaveBeenCalledWith('專案創建成功！')
    })

    // 應該跳轉到視覺配置頁面
    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith(
        `/project/${mockProject.id}/configure/visual`
      )
    })

    // === 階段 2：視覺配置（Page-4） ===
    // 清除之前的渲染
    jest.clearAllMocks()

    // 渲染視覺配置頁面
    render(<VisualConfigPage params={{ id: mockProject.id }} />)

    // 驗證頁面載入
    await waitFor(() => {
      expect(screen.getByText('字幕設定')).toBeInTheDocument()
      expect(screen.getByText('Logo 設定')).toBeInTheDocument()
    })

    // 配置字幕
    const fontSelect = screen.getByLabelText('字型')
    await user.selectOptions(fontSelect, 'Arial')

    // 配置應該更新預覽
    const preview = screen.getByText('範例字幕')
    expect(preview).toHaveStyle({ fontFamily: 'Arial' })

    // 點擊下一步到 prompt-model 頁面
    const visualNextButton = screen.getByRole('button', { name: '下一步' })
    await user.click(visualNextButton)

    // 應該跳轉到下一個配置頁面
    expect(mockRouterPush).toHaveBeenCalledWith(
      `/project/${mockProject.id}/configure/prompt-model`
    )
  })

  it('17.2 完整流程：上傳檔案 → 創建專案 → Logo 配置', async () => {
    const user = userEvent.setup()

    // Mock API
    const mockProject: Project = {
      id: 'bbbbbbbb-1234-4234-8234-123456789012',
      project_name: '檔案上傳測試',
      status: 'INITIALIZED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    createProjectSpy.mockResolvedValue(mockProject)

    // === 階段 1：建立專案（上傳模式） ===
    renderWithQueryClient(<NewProjectPage />)

    // 輸入專案名稱
    const nameInput = screen.getByLabelText('專案名稱')
    await user.type(nameInput, '檔案上傳測試')

    // 切換到上傳模式
    const sourceSelect = screen.getByLabelText('文字來源')
    await user.selectOptions(sourceSelect, 'upload')

    // 上傳檔案
    const content = '測試文字內容。'.repeat(125) // 750 字
    const file = new File([content], 'test.txt', { type: 'text/plain' })

    const fileInput = screen.getByLabelText('上傳檔案') as HTMLInputElement
    await user.upload(fileInput, file)

    // 等待檔案載入
    await waitFor(() => {
      expect(screen.getByText(/已載入內容/)).toBeInTheDocument()
    })

    // 點擊下一步
    const nextButton = screen.getByRole('button', { name: '下一步' })
    await user.click(nextButton)

    // 應該創建專案
    await waitFor(() => {
      expect(createProjectSpy).toHaveBeenCalled()
    })

    // === 階段 2：視覺配置（上傳 Logo） ===
    jest.clearAllMocks()
    render(<VisualConfigPage params={{ id: mockProject.id }} />)

    await waitFor(() => {
      expect(screen.getByText('Logo 設定')).toBeInTheDocument()
    })

    // 上傳 Logo
    const logoFile = new File(['logo'], 'logo.png', { type: 'image/png' })
    const logoInput = screen.getByLabelText('上傳 Logo') as HTMLInputElement
    await user.upload(logoInput, logoFile)

    // Logo 應該上傳成功
    await waitFor(() => {
      expect(toastSuccessSpy).toHaveBeenCalledWith('Logo 已上傳')
    })

    // Logo 配置選項應該顯示
    await waitFor(() => {
      expect(screen.getByText(/大小:/)).toBeInTheDocument()
      expect(screen.getByText(/透明度:/)).toBeInTheDocument()
    })

    // 調整 Logo 大小
    const sizeSlider = screen.getByDisplayValue('100') as HTMLInputElement
    await user.clear(sizeSlider)
    await user.type(sizeSlider, '150')

    // Logo 預覽應該更新
    await waitFor(() => {
      const logo = screen.getByAltText('Logo')
      expect(logo).toHaveStyle({ width: '150px', height: '150px' })
    })
  })
})

/**
 * 測試 18：錯誤恢復流程
 *
 * 目的：測試使用者遇到錯誤後能否正確恢復
 */
describe('測試 18：錯誤恢復流程', () => {
  let queryClient: QueryClient
  let createProjectSpy: jest.SpyInstance
  let toastErrorSpy: jest.Mock

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    createProjectSpy = jest.spyOn(projectsApi, 'createProject')
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

  it('18.1 錯誤 → 修正 → 成功流程', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<NewProjectPage />)

    // 第一次嘗試：專案名稱為空
    const contentTextarea = screen.getByPlaceholderText(/貼上文字內容/)
    await user.type(contentTextarea, '測試內容。'.repeat(125))

    const nextButton = screen.getByRole('button', { name: '下一步' })
    await user.click(nextButton)

    // 應該顯示錯誤
    await waitFor(() => {
      expect(screen.getByText('專案名稱不能為空')).toBeInTheDocument()
    })

    // 修正錯誤：輸入專案名稱
    const nameInput = screen.getByLabelText('專案名稱')
    await user.type(nameInput, '修正後的專案')

    // Mock API 成功
    createProjectSpy.mockResolvedValue({
      id: 'cccccccc-1234-4234-8234-123456789012',
      project_name: '修正後的專案',
      status: 'INITIALIZED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    // 再次提交
    await user.click(nextButton)

    // 應該成功
    await waitFor(() => {
      expect(createProjectSpy).toHaveBeenCalled()
    })
  })

  it('18.2 API 失敗 → 重試 → 成功', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<NewProjectPage />)

    // 輸入有效資料
    const nameInput = screen.getByLabelText('專案名稱')
    await user.type(nameInput, '測試專案')

    const contentTextarea = screen.getByPlaceholderText(/貼上文字內容/)
    await user.type(contentTextarea, '測試內容。'.repeat(125))

    // 第一次 API 呼叫失敗
    createProjectSpy.mockRejectedValueOnce(new Error('網路錯誤'))

    const nextButton = screen.getByRole('button', { name: '下一步' })
    await user.click(nextButton)

    // 應該顯示錯誤 toast
    await waitFor(() => {
      expect(toastErrorSpy).toHaveBeenCalledWith('網路錯誤')
    })

    // 第二次 API 呼叫成功
    createProjectSpy.mockResolvedValueOnce({
      id: 'dddddddd-1234-4234-8234-123456789012',
      project_name: '測試專案',
      status: 'INITIALIZED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    // 重試
    jest.clearAllMocks()
    await user.click(nextButton)

    // 應該成功
    await waitFor(() => {
      expect(createProjectSpy).toHaveBeenCalled()
    })
  })

  it('18.3 返回上一步重新編輯', async () => {
    const user = userEvent.setup()
    const mockRouterBack = (useRouter as jest.Mock)().back as jest.Mock

    // 渲染視覺配置頁面
    render(<VisualConfigPage params={{ id: 'eeeeeeee-1234-4234-8234-123456789012' }} />)

    await waitFor(() => {
      expect(screen.getByText('字幕設定')).toBeInTheDocument()
    })

    // 點擊上一步
    const backButton = screen.getByRole('button', { name: '上一步' })
    await user.click(backButton)

    // 應該返回上一頁
    expect(mockRouterBack).toHaveBeenCalled()
  })
})

/**
 * 測試 19：邊界條件測試
 *
 * 目的：測試各種邊界值
 */
describe('測試 19：邊界條件測試', () => {
  let queryClient: QueryClient
  let createProjectSpy: jest.SpyInstance

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    createProjectSpy = jest.spyOn(projectsApi, 'createProject')
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

  it('19.1 正好 500 字應該可以提交', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<NewProjectPage />)

    const nameInput = screen.getByLabelText('專案名稱')
    await user.type(nameInput, '邊界測試')

    const contentTextarea = screen.getByPlaceholderText(/貼上文字內容/)
    const content = '測試文字'.repeat(125) // 正好 500 字
    await user.type(contentTextarea, content)

    // 驗證字數
    await waitFor(() => {
      expect(screen.getByText(/目前字數: 500/)).toBeInTheDocument()
    })

    // 下一步按鈕應該啟用
    const nextButton = screen.getByRole('button', { name: '下一步' })
    expect(nextButton).not.toBeDisabled()

    // Mock API
    createProjectSpy.mockResolvedValue({
      id: 'ffffffff-1234-4234-8234-123456789012',
      project_name: '邊界測試',
      status: 'INITIALIZED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    // 應該可以提交
    await user.click(nextButton)

    await waitFor(() => {
      expect(createProjectSpy).toHaveBeenCalled()
    })
  })

  it('19.2 正好 10000 字應該可以提交', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<NewProjectPage />)

    const nameInput = screen.getByLabelText('專案名稱')
    await user.type(nameInput, '上限測試')

    const contentTextarea = screen.getByPlaceholderText(/貼上文字內容/)
    const content = '測試文字'.repeat(2500) // 正好 10000 字
    await user.type(contentTextarea, content)

    // 驗證字數
    await waitFor(() => {
      expect(screen.getByText(/目前字數: 10000/)).toBeInTheDocument()
    })

    // 下一步按鈕應該啟用
    const nextButton = screen.getByRole('button', { name: '下一步' })
    expect(nextButton).not.toBeDisabled()

    // Mock API
    createProjectSpy.mockResolvedValue({
      id: '10000000-1234-4234-8234-123456789012',
      project_name: '上限測試',
      status: 'INITIALIZED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    // 應該可以提交
    await user.click(nextButton)

    await waitFor(() => {
      expect(createProjectSpy).toHaveBeenCalled()
    })
  })

  it('19.3 499 字應該被拒絕', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<NewProjectPage />)

    const nameInput = screen.getByLabelText('專案名稱')
    await user.type(nameInput, '不足測試')

    const contentTextarea = screen.getByPlaceholderText(/貼上文字內容/)
    // 124 * 4 = 496 字
    const content = '測試文字'.repeat(124) + '測試文' // 正好 499 字
    await user.type(contentTextarea, content)

    // 驗證字數
    await waitFor(() => {
      expect(screen.getByText(/目前字數: 499/)).toBeInTheDocument()
    })

    // 下一步按鈕應該被禁用
    const nextButton = screen.getByRole('button', { name: '下一步' })
    expect(nextButton).toBeDisabled()

    // 應該顯示警告
    expect(screen.getByText(/還需要 1 字/)).toBeInTheDocument()
  })

  it('19.4 10001 字應該被拒絕', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<NewProjectPage />)

    const nameInput = screen.getByLabelText('專案名稱')
    await user.type(nameInput, '超過測試')

    const contentTextarea = screen.getByPlaceholderText(/貼上文字內容/)
    // 2500 * 4 + 1 = 10001 字
    const content = '測試文字'.repeat(2500) + '多' // 正好 10001 字
    await user.type(contentTextarea, content)

    // 驗證字數
    await waitFor(() => {
      expect(screen.getByText(/目前字數: 10001/)).toBeInTheDocument()
    })

    // 下一步按鈕應該被禁用
    const nextButton = screen.getByRole('button', { name: '下一步' })
    expect(nextButton).toBeDisabled()

    // 應該顯示警告
    expect(screen.getByText(/超過 1 字/)).toBeInTheDocument()
  })
})

/**
 * 測試 20：資料持久化（跨頁面）
 *
 * 目的：驗證資料在頁面間正確傳遞
 */
describe('測試 20：資料持久化（跨頁面）', () => {
  let queryClient: QueryClient
  let createProjectSpy: jest.SpyInstance

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    createProjectSpy = jest.spyOn(projectsApi, 'createProject')
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

  it('20.1 專案 ID 應該正確傳遞到視覺配置頁面', async () => {
    const user = userEvent.setup()

    const mockProject: Project = {
      id: '11111111-1234-4234-8234-123456789012',
      project_name: '資料傳遞測試',
      status: 'INITIALIZED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    createProjectSpy.mockResolvedValue(mockProject)

    // 建立專案
    renderWithQueryClient(<NewProjectPage />)

    const nameInput = screen.getByLabelText('專案名稱')
    await user.type(nameInput, '資料傳遞測試')

    const contentTextarea = screen.getByPlaceholderText(/貼上文字內容/)
    await user.type(contentTextarea, '測試內容。'.repeat(125))

    const nextButton = screen.getByRole('button', { name: '下一步' })
    await user.click(nextButton)

    // 驗證 router.push 被調用時使用了正確的 ID
    const mockRouterPush = (useRouter as jest.Mock)().push as jest.Mock
    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith(
        `/project/${mockProject.id}/configure/visual`
      )
    })

    // 驗證視覺配置頁面可以用該 ID 載入
    render(<VisualConfigPage params={{ id: mockProject.id }} />)

    await waitFor(() => {
      expect(screen.getByText('字幕設定')).toBeInTheDocument()
    })
  })
})
