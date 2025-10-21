import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter, useSearchParams } from 'next/navigation'
import SetupPage from '@/app/setup/page'
import { useAuthStore } from '@/store/useAuthStore'

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))

// Mock useAuthStore
jest.mock('@/store/useAuthStore')

describe('Setup Page Navigation', () => {
  const mockPush = jest.fn()
  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
  const mockUseSearchParams = useSearchParams as jest.MockedFunction<
    typeof useSearchParams
  >
  const mockUseAuthStore = useAuthStore as jest.MockedFunction<
    typeof useAuthStore
  >

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()

    // Mock router
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    } as any)

    // Mock default searchParams (step=0)
    mockUseSearchParams.mockReturnValue({
      get: jest.fn((key: string) => (key === 'step' ? '0' : null)),
    } as any)

    // Mock default auth store state
    mockUseAuthStore.mockReturnValue({
      apiKeys: {
        gemini: { value: '', tested: false },
        stabilityAI: { value: '', tested: false },
        dId: { value: '', tested: false },
      },
      youtube: {
        connected: false,
        channel_name: '',
        channel_id: '',
        thumbnail_url: '',
      },
    } as any)
  })

  it('should navigate to next step when click next button', () => {
    render(<SetupPage />)

    // 初始在步驟 0 (歡迎頁)
    expect(screen.getByText('歡迎使用 YTMaker')).toBeInTheDocument()

    // 點擊「下一步」進入步驟 1
    const nextButton = screen.getByText('下一步')
    fireEvent.click(nextButton)

    expect(mockPush).toHaveBeenCalledWith('/setup?step=1')
  })

  it('should navigate to previous step when click back button', () => {
    // 從步驟 1 開始
    mockUseSearchParams.mockReturnValue({
      get: jest.fn((key: string) => (key === 'step' ? '1' : null)),
    } as any)

    render(<SetupPage />)

    expect(screen.getByText('Gemini API Key')).toBeInTheDocument()

    // 點擊「上一步」
    const backButton = screen.getByText('上一步')
    fireEvent.click(backButton)

    expect(mockPush).toHaveBeenCalledWith('/setup?step=0')
  })

  it('should not show back button on first step', () => {
    render(<SetupPage />)

    expect(screen.queryByText('上一步')).not.toBeInTheDocument()
  })

  it('should disable next button if required fields not completed', () => {
    // 從步驟 1 開始 (Gemini API step)
    mockUseSearchParams.mockReturnValue({
      get: jest.fn((key: string) => (key === 'step' ? '1' : null)),
    } as any)

    // Mock store: API key 未測試
    mockUseAuthStore.mockReturnValue({
      apiKeys: {
        gemini: { value: '', tested: false },
        stabilityAI: { value: '', tested: false },
        dId: { value: '', tested: false },
      },
      youtube: {
        connected: false,
        channel_name: '',
        channel_id: '',
        thumbnail_url: '',
      },
    } as any)

    render(<SetupPage />)

    const nextButton = screen.getByText('下一步')

    // API Key 未測試時,下一步按鈕禁用
    expect(nextButton).toBeDisabled()
  })

  it('should enable next button when API key is tested', () => {
    // 從步驟 1 開始 (Gemini API step)
    mockUseSearchParams.mockReturnValue({
      get: jest.fn((key: string) => (key === 'step' ? '1' : null)),
    } as any)

    // Mock store: API key 已測試
    mockUseAuthStore.mockReturnValue({
      apiKeys: {
        gemini: { value: 'test-key', tested: true },
        stabilityAI: { value: '', tested: false },
        dId: { value: '', tested: false },
      },
      youtube: {
        connected: false,
        channel_name: '',
        channel_id: '',
        thumbnail_url: '',
      },
    } as any)

    render(<SetupPage />)

    const nextButton = screen.getByText('下一步')

    // API Key 已測試時,下一步按鈕啟用
    expect(nextButton).not.toBeDisabled()
  })

  it('should sync URL with current step', () => {
    render(<SetupPage />)

    // 點擊下一步
    const nextButton = screen.getByText('下一步')
    fireEvent.click(nextButton)

    // URL 應該更新
    expect(mockPush).toHaveBeenCalledWith('/setup?step=1')
  })

  it('should set cookie and redirect when complete', () => {
    // 從步驟 5 (完成頁) 開始
    mockUseSearchParams.mockReturnValue({
      get: jest.fn((key: string) => (key === 'step' ? '5' : null)),
    } as any)

    render(<SetupPage />)

    // 在完成頁點擊「進入主控台」
    const enterButton = screen.getByText('進入主控台')
    fireEvent.click(enterButton)

    // 應該設置 cookie
    expect(document.cookie).toContain('setup-completed=true')

    // 應該導航到主控台
    expect(mockPush).toHaveBeenCalledWith('/')
  })

  it('should read step from URL query parameter', () => {
    // 設置 URL query parameter step=2
    mockUseSearchParams.mockReturnValue({
      get: jest.fn((key: string) => (key === 'step' ? '2' : null)),
    } as any)

    render(<SetupPage />)

    // 應該顯示步驟 2 (Stability AI)
    expect(screen.getByText('Stability AI API Key')).toBeInTheDocument()
  })

  it('should show correct button text on last step', () => {
    // 從步驟 5 (完成頁) 開始
    mockUseSearchParams.mockReturnValue({
      get: jest.fn((key: string) => (key === 'step' ? '5' : null)),
    } as any)

    render(<SetupPage />)

    // 最後一步應該顯示「進入主控台」而不是「下一步」
    expect(screen.queryByText('下一步')).not.toBeInTheDocument()
    expect(screen.getByText('進入主控台')).toBeInTheDocument()
  })
})
