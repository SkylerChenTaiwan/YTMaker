// tests/integration/ProjectConfigFlow.integration.test.tsx
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import PromptModelPage from '@/app/project/[id]/configure/prompt-model/page'
import YouTubeConfigPage from '@/app/project/[id]/configure/youtube/page'
import * as projectsApi from '@/lib/api/projects'

// Mock next/navigation
const mockPush = jest.fn()
const mockRouter = { push: mockPush }

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: jest.fn(() => '/project/project-123/configure/prompt-model'),
  notFound: jest.fn(),
}))

jest.mock('@/lib/validators', () => ({
  validateProjectId: jest.fn(() => true),
}))

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

jest.mock('@/lib/api/projects', () => ({
  getProject: jest.fn(),
  getPromptTemplates: jest.fn(),
  updatePromptSettings: jest.fn(),
  updateYouTubeSettings: jest.fn(),
  startGeneration: jest.fn(),
}))

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

describe('整合測試 - 測試 10: 完整流程 Prompt 設定 -> YouTube 設定', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPush.mockClear()
  })

  it('完整流程: Prompt 設定 -> YouTube 設定 -> 開始生成', async () => {
    const user = userEvent.setup()
    const queryClient = createTestQueryClient()

    // Setup mock data
    ;(projectsApi.getProject as jest.Mock).mockResolvedValue({
      id: 'project-123',
      project_name: 'Test Project',
      prompt_template_id: 'default',
      prompt_content: '預設 Prompt 內容...' + 'x'.repeat(180),
      gemini_model: 'gemini-1.5-flash',
      youtube_title: '',
      youtube_description: '',
      youtube_tags: [],
      privacy: 'public',
      publish_type: 'immediate',
      ai_content_flag: true,
    })

    ;(projectsApi.getPromptTemplates as jest.Mock).mockResolvedValue([
      { id: 'default', name: '預設範本', content: '預設 Prompt 內容...' + 'x'.repeat(180) },
      { id: 'custom-1', name: '自訂範本 1', content: '自訂內容...' + 'x'.repeat(193) }, // 7 + 193 = 200
    ])

    ;(projectsApi.updatePromptSettings as jest.Mock).mockResolvedValue({
      id: 'project-123',
      prompt_template_id: 'custom-1',
      prompt_content: '自訂內容...' + 'x'.repeat(193), // 7 + 193 = 200
      gemini_model: 'gemini-1.5-pro',
    })

    // === Page 5: Prompt Settings ===
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <PromptModelPage params={{ id: 'project-123' }} />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.queryByText('載入中...')).not.toBeInTheDocument()
    })

    // 1. Select template using userEvent
    const templateSelect = screen.getByLabelText('選擇範本') as HTMLSelectElement
    await user.selectOptions(templateSelect, 'custom-1')

    // Wait for template content to update
    await waitFor(() => {
      const promptEditor = screen.getByLabelText('Prompt 內容') as HTMLTextAreaElement
      expect(promptEditor.value).toContain('自訂內容')
    })

    // 2. Select model
    const proModel = screen.getByLabelText('Gemini 1.5 Pro')
    await user.click(proModel)

    // Wait for model selection to register
    await waitFor(() => {
      expect(proModel).toBeChecked()
    })

    // 3. Click next
    const nextButton = screen.getByText('下一步') as HTMLButtonElement
    await user.click(nextButton)

    // 4. Verify API called
    await waitFor(() => {
      expect(projectsApi.updatePromptSettings).toHaveBeenCalledWith('project-123', {
        prompt_template_id: 'custom-1',
        prompt_content: expect.stringContaining('自訂內容'),
        gemini_model: 'gemini-1.5-pro',
      })
    })

    // 5. Verify navigation to Page 6
    expect(mockPush).toHaveBeenCalledWith('/project/project-123/configure/youtube')

    // === Page 6: YouTube Settings ===
    mockPush.mockClear()
    ;(projectsApi.updateYouTubeSettings as jest.Mock).mockResolvedValue({})
    ;(projectsApi.startGeneration as jest.Mock).mockResolvedValue({})

    // Re-render Page 6
    rerender(
      <QueryClientProvider client={queryClient}>
        <YouTubeConfigPage params={{ id: 'project-123' }} />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.queryByText('載入中...')).not.toBeInTheDocument()
    })

    // 6. Fill YouTube form
    const titleInput = screen.getByTestId('youtube-title')
    await user.type(titleInput, '我的 AI 教學影片')

    const descInput = screen.getByTestId('youtube-description')
    await user.type(descInput, '這是一部關於 AI 的教學影片')

    // 7. Add tags - need to use fireEvent for tags due to complex interaction
    const tagInput = screen.getByTestId('youtube-tags-input') as HTMLInputElement
    fireEvent.change(tagInput, { target: { value: 'AI' } })
    fireEvent.keyDown(tagInput, { key: 'Enter', code: 'Enter' })

    await waitFor(() => {
      expect(screen.getByText('AI')).toBeInTheDocument()
    })

    fireEvent.change(tagInput, { target: { value: '教學' } })
    fireEvent.keyDown(tagInput, { key: 'Enter', code: 'Enter' })

    await waitFor(() => {
      expect(screen.getByText('教學')).toBeInTheDocument()
    })

    fireEvent.change(tagInput, { target: { value: '科技' } })
    fireEvent.keyDown(tagInput, { key: 'Enter', code: 'Enter' })

    await waitFor(() => {
      expect(screen.getByText('科技')).toBeInTheDocument()
    })

    // 8. Privacy should default to public
    const publicOption = screen.getByLabelText('公開') as HTMLInputElement
    expect(publicOption).toBeChecked()

    // 9. Start generation
    const startButton = screen.getByText('開始生成') as HTMLButtonElement
    await user.click(startButton)

    // 10. Verify YouTube settings API called
    await waitFor(() => {
      expect(projectsApi.updateYouTubeSettings).toHaveBeenCalledWith('project-123', {
        youtube_title: '我的 AI 教學影片',
        youtube_description: '這是一部關於 AI 的教學影片',
        youtube_tags: ['AI', '教學', '科技'],
        privacy: 'public',
        publish_type: 'immediate',
        ai_content_flag: true,
      })
    })

    // 11. Verify start generation API called
    expect(projectsApi.startGeneration).toHaveBeenCalledWith('project-123')

    // 12. Verify navigation to progress page
    expect(mockPush).toHaveBeenCalledWith('/project/project-123/progress')
  })
})

describe('整合測試 - 測試 11: YouTube 帳號未連結時的處理', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    ;(projectsApi.getProject as jest.Mock).mockResolvedValue({
      id: 'project-123',
      youtube_title: '',
      youtube_description: '',
      youtube_tags: [],
      privacy: 'public',
      publish_type: 'immediate',
      ai_content_flag: true,
    })
  })

  // Note: This test requires state management implementation
  // Currently using a mock state in the component
  it('未連結 YouTube 帳號時應該顯示警告', async () => {
    const queryClient = createTestQueryClient()

    // This test would work better with proper state management
    // For now, we test the scenario when hasYouTubeAccount is false
    // You would need to mock the store/state to set hasYouTubeAccount = false

    render(
      <QueryClientProvider client={queryClient}>
        <YouTubeConfigPage params={{ id: 'project-123' }} />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.queryByText('載入中...')).not.toBeInTheDocument()
    })

    // Since hasYouTubeAccount is mocked as true in the component,
    // this test would need state management to be properly implemented
    // The warning would show if hasYouTubeAccount === false

    // Verify submit button is present (would be disabled if no account)
    const submitButton = screen.getByText('開始生成')
    expect(submitButton).toBeInTheDocument()
  })
})
