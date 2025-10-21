// tests/unit/pages/PromptModelPage.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import PromptModelPage from '@/app/project/[id]/configure/prompt-model/page'
import * as projectsApi from '@/lib/api/projects'

// Mock next/navigation
const mockPush = jest.fn()
const mockRouter = { push: mockPush }

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: jest.fn(() => '/project/project-123/configure/prompt-model'),
  notFound: jest.fn(),
}))

// Mock validators
jest.mock('@/lib/validators', () => ({
  validateProjectId: jest.fn(() => true),
}))

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

// Mock API functions
jest.mock('@/lib/api/projects', () => ({
  getProject: jest.fn(),
  getPromptTemplates: jest.fn(),
  updatePromptSettings: jest.fn(),
}))

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

function setup(params = { id: 'project-123' }) {
  const queryClient = createTestQueryClient()
  const user = userEvent.setup()

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <PromptModelPage params={params} />
    </QueryClientProvider>
  )

  return { user, ...utils }
}

describe('PromptModelPage - 測試 1: 基本渲染與表單互動', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Mock project data
    ;(projectsApi.getProject as jest.Mock).mockResolvedValue({
      id: 'project-123',
      project_name: 'Test Project',
      prompt_template_id: 'default',
      prompt_content: '預設 Prompt 內容...' + 'x'.repeat(180), // 200字
      gemini_model: 'gemini-1.5-flash',
    })

    // Mock templates
    ;(projectsApi.getPromptTemplates as jest.Mock).mockResolvedValue([
      { id: 'default', name: '預設範本', content: '預設 Prompt 內容...' + 'x'.repeat(180) },
      { id: 'custom-1', name: '自訂範本 1', content: '自訂內容...' + 'x'.repeat(188) },
    ])
  })

  it('應該正確渲染所有表單元素', async () => {
    setup()

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText('載入中...')).not.toBeInTheDocument()
    })

    // 驗證頁面標題
    expect(screen.getByText('Prompt 與模型設定')).toBeInTheDocument()

    // 驗證 Prompt 範本下拉選單
    expect(screen.getByLabelText('選擇範本')).toBeInTheDocument()

    // 驗證 Prompt 編輯器
    expect(screen.getByLabelText('Prompt 內容')).toBeInTheDocument()

    // 驗證模型選擇按鈕
    expect(screen.getByLabelText('Gemini 1.5 Pro')).toBeInTheDocument()
    expect(screen.getByLabelText('Gemini 1.5 Flash')).toBeInTheDocument()

    // 驗證步驟指示器（應該顯示當前為步驟 3，即 index 2）
    const currentStep = screen.getByTestId('step-2')
    expect(currentStep).toBeInTheDocument()
    expect(currentStep.querySelector('.current')).toBeInTheDocument()

    // 驗證導航按鈕
    expect(screen.getByText('上一步')).toBeInTheDocument()
    expect(screen.getByText('下一步')).toBeInTheDocument()
  })
})

describe('PromptModelPage - 測試 2: Prompt 範本選擇與載入', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    ;(projectsApi.getProject as jest.Mock).mockResolvedValue({
      id: 'project-123',
      prompt_template_id: 'default',
      prompt_content: '預設 Prompt 內容...' + 'x'.repeat(180),
      gemini_model: 'gemini-1.5-flash',
    })

    ;(projectsApi.getPromptTemplates as jest.Mock).mockResolvedValue([
      { id: 'default', name: '預設範本', content: '預設 Prompt 內容...' + 'x'.repeat(180) },
      { id: 'custom-1', name: '自訂範本 1', content: '自訂內容...' + 'x'.repeat(188) },
    ])
  })

  it('選擇範本後應該載入範本內容', async () => {
    const { user } = setup()

    await waitFor(() => {
      expect(screen.queryByText('載入中...')).not.toBeInTheDocument()
    })

    // Find template selector
    const templateSelect = screen.getByLabelText('選擇範本')

    // Change to custom template
    await user.selectOptions(templateSelect, 'custom-1')

    // Verify prompt content updated
    await waitFor(() => {
      const promptEditor = screen.getByLabelText('Prompt 內容') as HTMLTextAreaElement
      expect(promptEditor.value).toContain('自訂內容')
    })

    // Verify character count updated (自訂內容... = 7 chars + 188 x's = 195 chars)
    expect(screen.getByText(/目前字數: 195/)).toBeInTheDocument()
  })
})

describe('PromptModelPage - 測試 3: Prompt 內容驗證與錯誤處理', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    ;(projectsApi.getProject as jest.Mock).mockResolvedValue({
      id: 'project-123',
      prompt_template_id: 'default',
      prompt_content: '預設內容',
      gemini_model: 'gemini-1.5-flash',
    })

    ;(projectsApi.getPromptTemplates as jest.Mock).mockResolvedValue([
      { id: 'default', name: '預設範本', content: '預設內容' },
    ])
  })

  it('Prompt 內容少於 200 字時應該顯示錯誤', async () => {
    const { user } = setup()

    await waitFor(() => {
      expect(screen.queryByText('載入中...')).not.toBeInTheDocument()
    })

    // Clear editor and type short content
    const promptEditor = screen.getByLabelText('Prompt 內容') as HTMLTextAreaElement
    await user.clear(promptEditor)
    await user.type(promptEditor, '太短')

    // Try to proceed
    const nextButton = screen.getByText('下一步')
    await user.click(nextButton)

    // Verify error message
    await waitFor(() => {
      expect(screen.getByText('Prompt 長度必須在 200-1000 字之間')).toBeInTheDocument()
    })

    // Verify cannot proceed
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('Prompt 內容超過 1000 字時應該顯示錯誤', async () => {
    const { user } = setup()

    await waitFor(() => {
      expect(screen.queryByText('載入中...')).not.toBeInTheDocument()
    })

    const longContent = 'x'.repeat(1001)
    const promptEditor = screen.getByLabelText('Prompt 內容') as HTMLTextAreaElement

    await user.clear(promptEditor)
    await user.type(promptEditor, longContent)

    const nextButton = screen.getByText('下一步')
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText('Prompt 長度必須在 200-1000 字之間')).toBeInTheDocument()
    })

    expect(mockPush).not.toHaveBeenCalled()
  })
})

describe('PromptModelPage - 測試 4: Gemini 模型選擇', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    ;(projectsApi.getProject as jest.Mock).mockResolvedValue({
      id: 'project-123',
      prompt_template_id: 'default',
      prompt_content: '預設 Prompt 內容...' + 'x'.repeat(180),
      gemini_model: 'gemini-1.5-flash',
    })

    ;(projectsApi.getPromptTemplates as jest.Mock).mockResolvedValue([
      { id: 'default', name: '預設範本', content: '預設 Prompt 內容...' + 'x'.repeat(180) },
    ])
  })

  it('選擇模型後應該更新狀態', async () => {
    const { user } = setup()

    await waitFor(() => {
      expect(screen.queryByText('載入中...')).not.toBeInTheDocument()
    })

    // Find and click pro model
    const proModelOption = screen.getByLabelText('Gemini 1.5 Pro') as HTMLInputElement
    await user.click(proModelOption)

    // Verify pro is selected
    await waitFor(() => {
      expect(proModelOption).toBeChecked()
    })

    // Verify flash is not selected
    const flashModelOption = screen.getByLabelText('Gemini 1.5 Flash') as HTMLInputElement
    expect(flashModelOption).not.toBeChecked()

    // Verify model info displayed
    expect(screen.getByText(/高品質、適合複雜內容、成本較高/)).toBeInTheDocument()
  })

  it('應該顯示模型對比表格', async () => {
    setup()

    await waitFor(() => {
      expect(screen.queryByText('載入中...')).not.toBeInTheDocument()
    })

    // Verify comparison table
    expect(screen.getByText('品質')).toBeInTheDocument()
    expect(screen.getByText('速度')).toBeInTheDocument()
    expect(screen.getByText('成本')).toBeInTheDocument()
    expect(screen.getByText('適合場景')).toBeInTheDocument()
  })
})
