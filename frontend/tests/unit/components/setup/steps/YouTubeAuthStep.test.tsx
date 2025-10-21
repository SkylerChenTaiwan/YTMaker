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

  // ==================== Modal 功能測試 ====================

  it('should close modal when click cancel button', () => {
    render(<YouTubeAuthStep />)

    // 打開 Modal
    fireEvent.click(screen.getByText('稍後設定'))
    expect(
      screen.getByText(/未連結 YouTube 帳號,您仍可生成影片但無法自動上傳/i)
    ).toBeInTheDocument()

    // 點擊取消
    fireEvent.click(screen.getByText('取消'))

    // Modal 應該關閉
    expect(
      screen.queryByText(/未連結 YouTube 帳號/i)
    ).not.toBeInTheDocument()
  })

  it('should not show skip modal by default', () => {
    render(<YouTubeAuthStep />)

    // Modal 不應該顯示
    expect(screen.queryByText('跳過 YouTube 授權')).not.toBeInTheDocument()
  })

  // ==================== 安全性測試 ====================

  it('should ignore messages with wrong type', () => {
    render(<YouTubeAuthStep />)

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: window.location.origin,
          data: {
            type: 'wrong-type',
            channel_name: '測試頻道',
            channel_id: 'UC123456',
            thumbnail_url: 'https://example.com/avatar.jpg',
          },
        })
      )
    })

    // 不應該更新狀態
    expect(mockSetYouTubeAuth).not.toHaveBeenCalled()
  })

  it('should handle message with missing fields', () => {
    render(<YouTubeAuthStep />)

    // 缺少 channel_id
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: window.location.origin,
          data: {
            type: 'youtube-auth-success',
            channel_name: '測試頻道',
            thumbnail_url: 'https://example.com/avatar.jpg',
          },
        })
      )
    })

    // 應該仍然呼叫，但帶有 undefined
    expect(mockSetYouTubeAuth).toHaveBeenCalledWith({
      connected: true,
      channel_name: '測試頻道',
      channel_id: undefined,
      thumbnail_url: 'https://example.com/avatar.jpg',
    })
  })

  it('should handle message with no data', () => {
    render(<YouTubeAuthStep />)

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: window.location.origin,
          data: null,
        })
      )
    })

    // 不應該崩潰，也不應該更新狀態
    expect(mockSetYouTubeAuth).not.toHaveBeenCalled()
  })

  // ==================== 視窗參數測試 ====================

  it('should open OAuth window with correct dimensions and position', () => {
    // Mock window.screen 尺寸
    Object.defineProperty(window, 'screen', {
      writable: true,
      value: { width: 1920, height: 1080 },
    })

    render(<YouTubeAuthStep />)

    const connectButton = screen.getByRole('button', {
      name: '連結 YouTube 帳號',
    })
    fireEvent.click(connectButton)

    // 計算預期的位置
    const expectedLeft = (1920 - 600) / 2 // 660
    const expectedTop = (1080 - 700) / 2 // 190

    expect(mockWindowOpen).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/youtube/auth'),
      'youtube-auth',
      `width=600,height=700,left=${expectedLeft},top=${expectedTop}`
    )
  })

  it('should use correct API endpoint from environment variable', () => {
    const originalEnv = process.env.NEXT_PUBLIC_API_BASE_URL
    process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.com'

    render(<YouTubeAuthStep />)

    const connectButton = screen.getByRole('button', {
      name: '連結 YouTube 帳號',
    })
    fireEvent.click(connectButton)

    expect(mockWindowOpen).toHaveBeenCalledWith(
      'https://api.example.com/api/v1/youtube/auth',
      'youtube-auth',
      expect.any(String)
    )

    // 恢復環境變數
    process.env.NEXT_PUBLIC_API_BASE_URL = originalEnv
  })

  // ==================== useEffect cleanup 測試 ====================

  it('should cleanup event listener on unmount', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener')
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')

    const { unmount } = render(<YouTubeAuthStep />)

    // 找出 message listener (YouTubeAuthStep 添加的)
    const messageListenerCall = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === 'message'
    )
    expect(messageListenerCall).toBeDefined()
    const messageHandler = messageListenerCall![1]

    // unmount 元件
    unmount()

    // 確認有移除 message listener
    expect(removeEventListenerSpy).toHaveBeenCalledWith('message', messageHandler)

    addEventListenerSpy.mockRestore()
    removeEventListenerSpy.mockRestore()
  })

  it('should not respond to messages after unmount', () => {
    const { unmount } = render(<YouTubeAuthStep />)

    // unmount 元件
    unmount()

    // 嘗試發送訊息
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

    // 不應該更新狀態
    expect(mockSetYouTubeAuth).not.toHaveBeenCalled()
  })

  // ==================== 條件渲染測試 ====================

  it('should not show "變更頻道" button when not connected', () => {
    render(<YouTubeAuthStep />)

    expect(screen.queryByText('變更頻道')).not.toBeInTheDocument()
  })

  it('should not show "連結 YouTube 帳號" button when already connected', () => {
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

    expect(
      screen.queryByRole('button', { name: '連結 YouTube 帳號' })
    ).not.toBeInTheDocument()
  })

  it('should always show "稍後設定" button regardless of connection status', () => {
    const { rerender } = render(<YouTubeAuthStep />)

    // 未連結時應該顯示
    expect(screen.getByText('稍後設定')).toBeInTheDocument()

    // 已連結時也應該顯示
    mockUseAuthStore.mockReturnValue({
      youtube: {
        connected: true,
        channel_name: '已連結頻道',
        channel_id: 'UC999999',
        thumbnail_url: 'https://example.com/existing-avatar.jpg',
      },
      setYouTubeAuth: mockSetYouTubeAuth,
    } as any)

    rerender(<YouTubeAuthStep />)
    expect(screen.getByText('稍後設定')).toBeInTheDocument()
  })

  // ==================== Edge Cases 測試 ====================

  it('should handle empty channel_name', () => {
    mockUseAuthStore.mockReturnValue({
      youtube: {
        connected: true,
        channel_name: '',
        channel_id: 'UC999999',
        thumbnail_url: 'https://example.com/avatar.jpg',
      },
      setYouTubeAuth: mockSetYouTubeAuth,
    } as any)

    render(<YouTubeAuthStep />)

    // 應該顯示空字串（但不崩潰）- React 會移除尾隨空格
    expect(screen.getByText('已連結:')).toBeInTheDocument()
  })

  it('should handle special characters in channel_name', () => {
    mockUseAuthStore.mockReturnValue({
      youtube: {
        connected: true,
        channel_name: '<script>alert("XSS")</script>',
        channel_id: 'UC123',
        thumbnail_url: 'https://example.com/avatar.jpg',
      },
      setYouTubeAuth: mockSetYouTubeAuth,
    } as any)

    render(<YouTubeAuthStep />)

    // 應該安全渲染特殊字元（React 自動轉義）
    expect(
      screen.getByText(/已連結: <script>alert\("XSS"\)<\/script>/)
    ).toBeInTheDocument()
  })

  it('should handle very long channel_name', () => {
    const longName = 'A'.repeat(200)
    mockUseAuthStore.mockReturnValue({
      youtube: {
        connected: true,
        channel_name: longName,
        channel_id: 'UC123',
        thumbnail_url: 'https://example.com/avatar.jpg',
      },
      setYouTubeAuth: mockSetYouTubeAuth,
    } as any)

    render(<YouTubeAuthStep />)

    // 應該顯示完整名稱（不崩潰）
    expect(screen.getByText(new RegExp(`已連結: ${longName}`))).toBeInTheDocument()
  })

  it('should handle empty thumbnail_url', () => {
    mockUseAuthStore.mockReturnValue({
      youtube: {
        connected: true,
        channel_name: '測試頻道',
        channel_id: 'UC123',
        thumbnail_url: '',
      },
      setYouTubeAuth: mockSetYouTubeAuth,
    } as any)

    render(<YouTubeAuthStep />)

    const img = screen.getByAltText('頻道頭像')
    expect(img).toHaveAttribute('src', '')
  })

  // ==================== 整合測試 ====================

  it('should handle complete OAuth flow from start to finish', async () => {
    const { rerender } = render(<YouTubeAuthStep />)

    // 1. 初始狀態：未連結
    expect(
      screen.getByRole('button', { name: '連結 YouTube 帳號' })
    ).toBeInTheDocument()

    // 2. 點擊連結按鈕
    fireEvent.click(screen.getByRole('button', { name: '連結 YouTube 帳號' }))
    expect(mockWindowOpen).toHaveBeenCalled()

    // 3. 模擬成功的 OAuth callback
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: window.location.origin,
          data: {
            type: 'youtube-auth-success',
            channel_name: '我的頻道',
            channel_id: 'UCabc123',
            thumbnail_url: 'https://example.com/my-avatar.jpg',
          },
        })
      )
    })

    // 4. 驗證狀態更新
    await waitFor(() => {
      expect(mockSetYouTubeAuth).toHaveBeenCalledWith({
        connected: true,
        channel_name: '我的頻道',
        channel_id: 'UCabc123',
        thumbnail_url: 'https://example.com/my-avatar.jpg',
      })
    })

    // 5. 更新 mock 為已連結狀態並重新渲染
    mockUseAuthStore.mockReturnValue({
      youtube: {
        connected: true,
        channel_name: '我的頻道',
        channel_id: 'UCabc123',
        thumbnail_url: 'https://example.com/my-avatar.jpg',
      },
      setYouTubeAuth: mockSetYouTubeAuth,
    } as any)

    rerender(<YouTubeAuthStep />)

    // 6. 驗證顯示已連結狀態
    expect(screen.getByText('已連結: 我的頻道')).toBeInTheDocument()
    expect(screen.getByText('變更頻道')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: '連結 YouTube 帳號' })
    ).not.toBeInTheDocument()
  })
})
