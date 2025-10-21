// tests/unit/pages/YouTubeSettingsPage.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import YouTubeConfigPage from '@/app/project/[id]/configure/youtube/page'
import * as projectsApi from '@/lib/api/projects'

// Mock next/navigation
const mockPush = jest.fn()
const mockRouter = { push: mockPush }

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
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

function setup(params = { id: 'project-123' }) {
  const queryClient = createTestQueryClient()
  const user = userEvent.setup()

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <YouTubeConfigPage params={params} />
    </QueryClientProvider>
  )

  return { user, ...utils }
}

describe('YouTubeSettingsPage - 測試 6: YouTube 設定表單渲染', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    ;(projectsApi.getProject as jest.Mock).mockResolvedValue({
      id: 'project-123',
      project_name: 'Test Project',
      youtube_title: '',
      youtube_description: '',
      youtube_tags: [],
      privacy: 'public',
      publish_type: 'immediate',
      ai_content_flag: true,
    })
  })

  it('應該正確渲染 YouTube 設定表單', async () => {
    setup()

    await waitFor(() => {
      expect(screen.queryByText('載入中...')).not.toBeInTheDocument()
    })

    // Verify page title
    expect(screen.getByText('YouTube 設定')).toBeInTheDocument()

    // Verify form fields
    expect(screen.getByLabelText(/影片標題/)).toBeInTheDocument()
    expect(screen.getByLabelText('影片描述')).toBeInTheDocument()
    expect(screen.getByLabelText('標籤')).toBeInTheDocument()

    // Verify privacy options
    expect(screen.getByLabelText('公開')).toBeInTheDocument()
    expect(screen.getByLabelText(/不公開/)).toBeInTheDocument()
    expect(screen.getByLabelText('私人')).toBeInTheDocument()

    // Verify publish type
    expect(screen.getByLabelText('立即發布')).toBeInTheDocument()
    expect(screen.getByLabelText('排程發布')).toBeInTheDocument()

    // Verify AI content flag
    const aiContentCheckbox = screen.getByLabelText(/此影片包含 AI 生成的內容/)
    expect(aiContentCheckbox).toBeChecked()
    expect(aiContentCheckbox).toBeDisabled()
  })
})

describe('YouTubeSettingsPage - 測試 7: YouTube 資訊表單驗證', () => {
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

  it('標題為空時應該顯示錯誤', async () => {
    const { user } = setup()

    await waitFor(() => {
      expect(screen.queryByText('載入中...')).not.toBeInTheDocument()
    })

    const titleInput = screen.getByTestId('youtube-title')
    await user.clear(titleInput)

    const submitButton = screen.getByText('開始生成')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('標題不能為空')).toBeInTheDocument()
    })

    expect(mockPush).not.toHaveBeenCalled()
  })

  it('標題超過 100 字元時應該顯示錯誤', async () => {
    const { user } = setup()

    await waitFor(() => {
      expect(screen.queryByText('載入中...')).not.toBeInTheDocument()
    })

    const titleInput = screen.getByTestId('youtube-title')
    await user.clear(titleInput)
    await user.type(titleInput, 'x'.repeat(101))

    const submitButton = screen.getByText('開始生成')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('標題不能超過 100 字元')).toBeInTheDocument()
    })
  })

  it('描述超過 5000 字元時應該顯示錯誤', async () => {
    const { user } = setup()

    await waitFor(() => {
      expect(screen.queryByText('載入中...')).not.toBeInTheDocument()
    })

    const descInput = screen.getByTestId('youtube-description')
    await user.clear(descInput)
    await user.type(descInput, 'x'.repeat(5001))

    const submitButton = screen.getByText('開始生成')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/描述不能超過 5000 字元/)).toBeInTheDocument()
    })
  })
})

describe('YouTubeSettingsPage - 測試 8: 標籤輸入功能', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    ;(projectsApi.getProject as jest.Mock).mockResolvedValue({
      id: 'project-123',
      youtube_title: 'Test Video',
      youtube_description: '',
      youtube_tags: [],
      privacy: 'public',
      publish_type: 'immediate',
      ai_content_flag: true,
    })
  })

  it('應該能新增和刪除標籤', async () => {
    const { user } = setup()

    await waitFor(() => {
      expect(screen.queryByText('載入中...')).not.toBeInTheDocument()
    })

    const tagInput = screen.getByTestId('youtube-tags-input')

    // Add first tag
    await user.type(tagInput, '科技{Enter}')
    expect(screen.getByText('科技')).toBeInTheDocument()

    // Add second tag
    await user.type(tagInput, '教學{Enter}')
    expect(screen.getByText('教學')).toBeInTheDocument()

    // Add third tag
    await user.type(tagInput, 'AI{Enter}')
    expect(screen.getByText('AI')).toBeInTheDocument()

    // Remove second tag
    const removeButtons = screen.getAllByLabelText('移除標籤')
    await user.click(removeButtons[1]) // Remove "教學"

    await waitFor(() => {
      expect(screen.queryByText('教學')).not.toBeInTheDocument()
    })
    expect(screen.getByText('科技')).toBeInTheDocument()
    expect(screen.getByText('AI')).toBeInTheDocument()
  })

  it('標籤數量不應超過 30 個', async () => {
    const { user } = setup()

    await waitFor(() => {
      expect(screen.queryByText('載入中...')).not.toBeInTheDocument()
    })

    const tagInput = screen.getByTestId('youtube-tags-input')

    // Add 30 tags
    for (let i = 1; i <= 30; i++) {
      await user.type(tagInput, `標籤${i}{Enter}`)
    }

    // Try to add 31st tag
    await user.type(tagInput, '標籤31{Enter}')

    await waitFor(() => {
      expect(screen.getByText('標籤數量不能超過 30 個')).toBeInTheDocument()
    })
    expect(screen.queryByText('標籤31')).not.toBeInTheDocument()
  })
})

describe('YouTubeSettingsPage - 測試 9: 排程發布功能', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    ;(projectsApi.getProject as jest.Mock).mockResolvedValue({
      id: 'project-123',
      youtube_title: 'Test Video',
      youtube_description: '',
      youtube_tags: [],
      privacy: 'public',
      publish_type: 'immediate',
      ai_content_flag: true,
    })
  })

  it('選擇排程發布應該顯示日期時間選擇器', async () => {
    const { user } = setup()

    await waitFor(() => {
      expect(screen.queryByText('載入中...')).not.toBeInTheDocument()
    })

    // Initially date/time pickers should not be visible
    expect(screen.queryByLabelText('排程日期')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('排程時間')).not.toBeInTheDocument()

    // Select scheduled publish
    const scheduledOption = screen.getByLabelText('排程發布')
    await user.click(scheduledOption)

    // Verify date/time pickers appear
    await waitFor(() => {
      expect(screen.getByLabelText('排程日期')).toBeInTheDocument()
      expect(screen.getByLabelText('排程時間')).toBeInTheDocument()
    })
  })

  it('選擇未來時間應該通過驗證', async () => {
    const { user } = setup()

    await waitFor(() => {
      expect(screen.queryByText('載入中...')).not.toBeInTheDocument()
    })

    const scheduledOption = screen.getByLabelText('排程發布')
    await user.click(scheduledOption)

    await waitFor(() => {
      expect(screen.getByLabelText('排程日期')).toBeInTheDocument()
    })

    // Mock current time as 2025-10-19 12:00
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2025-10-19T12:00:00'))

    // Select future date and time
    const dateInput = screen.getByLabelText('排程日期')
    const timeInput = screen.getByLabelText('排程時間')

    await user.type(dateInput, '2025-10-25')
    await user.type(timeInput, '10:00')

    ;(projectsApi.updateYouTubeSettings as jest.Mock).mockResolvedValue({})
    ;(projectsApi.startGeneration as jest.Mock).mockResolvedValue({})

    const submitButton = screen.getByText('開始生成')
    await user.click(submitButton)

    // Should not show error
    await waitFor(() => {
      expect(screen.queryByText(/排程日期必須為未來時間/)).not.toBeInTheDocument()
    })

    jest.useRealTimers()
  })

  it('選擇過去時間應該顯示錯誤', async () => {
    const { user } = setup()

    await waitFor(() => {
      expect(screen.queryByText('載入中...')).not.toBeInTheDocument()
    })

    const scheduledOption = screen.getByLabelText('排程發布')
    await user.click(scheduledOption)

    await waitFor(() => {
      expect(screen.getByLabelText('排程日期')).toBeInTheDocument()
    })

    jest.useFakeTimers()
    jest.setSystemTime(new Date('2025-10-19T12:00:00'))

    const dateInput = screen.getByLabelText('排程日期')
    const timeInput = screen.getByLabelText('排程時間')

    await user.type(dateInput, '2020-01-01')
    await user.type(timeInput, '10:00')

    const submitButton = screen.getByText('開始生成')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('排程日期必須為未來時間')).toBeInTheDocument()
    })

    jest.useRealTimers()
  })
})
