import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { YouTubeAuthStep } from '@/components/setup/steps/YouTubeAuthStep'
import { useAuthStore } from '@/store/useAuthStore'

// Mock useAuthStore
jest.mock('@/store/useAuthStore')
const mockUseAuthStore = useAuthStore as jest.MockedFunction<
  typeof useAuthStore
>

describe('YouTubeAuthStep', () => {
  const mockSetYouTubeAuth = jest.fn()
  let mockWindowOpen: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    mockWindowOpen = jest.spyOn(window, 'open').mockImplementation()

    mockUseAuthStore.mockReturnValue({
      youtube: {
        connected: false,
        channel_name: '',
        channel_id: '',
        thumbnail_url: '',
      },
      setYouTubeAuth: mockSetYouTubeAuth,
    } as any)
  })

  afterEach(() => {
    mockWindowOpen.mockRestore()
  })

  it('should initiate OAuth flow when click connect button', () => {
    render(<YouTubeAuthStep />)

    const connectButton = screen.getByRole('button', {
      name: '連結 YouTube 帳號',
    })
    fireEvent.click(connectButton)

    expect(mockWindowOpen).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/youtube/auth'),
      'youtube-auth',
      expect.stringContaining('width=600,height=700')
    )
  })

  it('should display connected status after successful auth', async () => {
    render(<YouTubeAuthStep />)

    // 模擬 OAuth callback
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: window.location.origin,
          data: {
            type: 'youtube-auth-success',
            channel_name: '測試頻道',
            channel_id: 'UC123456',
            thumbnail_url: 'https://example.com/avatar.jpg',
          },
        })
      )
    })

    await waitFor(() => {
      expect(mockSetYouTubeAuth).toHaveBeenCalledWith({
        connected: true,
        channel_name: '測試頻道',
        channel_id: 'UC123456',
        thumbnail_url: 'https://example.com/avatar.jpg',
      })
    })
  })

  it('should display connected state when YouTube is already connected', () => {
    mockUseAuthStore.mockReturnValue({
      youtube: {
        connected: true,
        channel_name: '已連結頻道',
        channel_id: 'UC999999',
        thumbnail_url: 'https://example.com/existing-avatar.jpg',
      },
      setYouTubeAuth: mockSetYouTubeAuth,
    } as any)

    render(<YouTubeAuthStep />)

    expect(screen.getByText('已連結: 已連結頻道')).toBeInTheDocument()
    expect(screen.getByText('頻道 ID: UC999999')).toBeInTheDocument()
    expect(screen.getByAltText('頻道頭像')).toHaveAttribute(
      'src',
      'https://example.com/existing-avatar.jpg'
    )
    expect(screen.getByText('變更頻道')).toBeInTheDocument()
  })

  it('should allow changing channel when already connected', () => {
    mockUseAuthStore.mockReturnValue({
      youtube: {
        connected: true,
        channel_name: '已連結頻道',
        channel_id: 'UC999999',
        thumbnail_url: 'https://example.com/existing-avatar.jpg',
      },
      setYouTubeAuth: mockSetYouTubeAuth,
    } as any)

    render(<YouTubeAuthStep />)

    const changeButton = screen.getByText('變更頻道')
    fireEvent.click(changeButton)

    expect(mockWindowOpen).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/youtube/auth'),
      'youtube-auth',
      expect.stringContaining('width=600,height=700')
    )
  })

  it('should allow skip YouTube auth', () => {
    render(<YouTubeAuthStep />)

    fireEvent.click(screen.getByText('稍後設定'))

    // 顯示確認 Modal
    expect(
      screen.getByText(/未連結 YouTube 帳號,您仍可生成影片但無法自動上傳/i)
    ).toBeInTheDocument()

    fireEvent.click(screen.getByText('確定'))

    // Modal 應該關閉
    expect(
      screen.queryByText(/未連結 YouTube 帳號/i)
    ).not.toBeInTheDocument()
  })

  it('should ignore messages from different origins', () => {
    render(<YouTubeAuthStep />)

    // 發送來自不同 origin 的訊息
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://evil.com',
          data: {
            type: 'youtube-auth-success',
            channel_name: 'Hacked',
            channel_id: 'EVIL',
            thumbnail_url: 'https://evil.com/hack.jpg',
          },
        })
      )
    })

    // 不應該更新狀態
    expect(mockSetYouTubeAuth).not.toHaveBeenCalled()
  })
})
