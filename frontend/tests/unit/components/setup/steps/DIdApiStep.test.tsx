import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DIdApiStep } from '@/components/setup/steps/DIdApiStep'
import { systemApi } from '@/services/api/systemApi'
import { useAuthStore } from '@/store/useAuthStore'

// Mock systemApi
jest.mock('@/services/api/systemApi')
const mockSystemApi = systemApi as jest.Mocked<typeof systemApi>

// Mock useAuthStore
jest.mock('@/store/useAuthStore')
const mockUseAuthStore = useAuthStore as jest.MockedFunction<
  typeof useAuthStore
>

describe('DIdApiStep', () => {
  const mockSetApiKey = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAuthStore.mockReturnValue({
      apiKeys: {
        gemini: { value: '', tested: false },
        stabilityAI: { value: '', tested: false },
        dId: { value: '', tested: false },
      },
      setApiKey: mockSetApiKey,
    } as any)
  })

  it('should toggle API key visibility', () => {
    render(<DIdApiStep />)

    const input = screen.getByPlaceholderText(/輸入.*D-ID.*API.*Key/i)
    const toggleButton = screen.getByLabelText('顯示/隱藏密碼')

    // 初始狀態為隱藏 (type="password")
    expect(input).toHaveAttribute('type', 'password')

    // 點擊眼睛圖示切換顯示
    fireEvent.click(toggleButton)
    expect(input).toHaveAttribute('type', 'text')

    // 再次點擊切換回隱藏
    fireEvent.click(toggleButton)
    expect(input).toHaveAttribute('type', 'password')
  })

  it('should validate API key format', () => {
    render(<DIdApiStep />)

    const input = screen.getByPlaceholderText(/輸入.*D-ID.*API.*Key/i)

    // 輸入空值
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.blur(input)

    // 應該顯示錯誤訊息 - 使用更精確的選擇器 (text-red-500 text-sm mt-1)
    const errorElements = screen.getAllByText(/請輸入.*D-ID.*API.*Key/i)
    const errorMessage = errorElements.find(
      (el) => el.className && el.className.includes('text-red-500')
    )
    expect(errorMessage).toBeInTheDocument()

    // 輸入有效值
    fireEvent.change(input, { target: { value: 'did-key-...' } })

    // 錯誤訊息應該消失
    const updatedErrorElements = screen.queryAllByText(
      /請輸入.*D-ID.*API.*Key/i
    )
    const updatedErrorMessage = updatedErrorElements.find(
      (el) => el.className && el.className.includes('text-red-500')
    )
    expect(updatedErrorMessage).toBeUndefined()
  })

  it('should test connection successfully', async () => {
    // Mock API 成功回應
    mockSystemApi.testApiKey.mockResolvedValue({
      success: true,
      message: '連線成功',
    })

    render(<DIdApiStep />)

    const input = screen.getByPlaceholderText(/輸入.*D-ID.*API.*Key/i)
    const testButton = screen.getByText('測試連線')

    // 輸入 API Key
    fireEvent.change(input, { target: { value: 'test-key-123' } })

    // 點擊測試連線
    fireEvent.click(testButton)

    // 驗證按鈕顯示載入狀態
    expect(testButton).toHaveTextContent('測試中...')
    expect(testButton).toBeDisabled()

    // 等待 API 回應
    await waitFor(() => {
      expect(screen.getByText('連線成功')).toBeInTheDocument()
      expect(screen.getByTestId('success-icon')).toBeInTheDocument()
    })

    // 驗證 API 被正確調用
    expect(mockSystemApi.testApiKey).toHaveBeenCalledWith({
      provider: 'did',
      apiKey: 'test-key-123',
    })

    // 驗證 store 被更新
    expect(mockSetApiKey).toHaveBeenCalledWith('did', 'test-key-123', true)
  })

  it('should handle connection test failure', async () => {
    // Mock API 失敗回應
    mockSystemApi.testApiKey.mockRejectedValue(
      new Error('API Key 無效')
    )

    render(<DIdApiStep />)

    const input = screen.getByPlaceholderText(/輸入.*D-ID.*API.*Key/i)
    const testButton = screen.getByText('測試連線')

    fireEvent.change(input, { target: { value: 'invalid-key' } })
    fireEvent.click(testButton)

    await waitFor(() => {
      expect(screen.getByText(/API Key 無效/i)).toBeInTheDocument()
      expect(screen.getByTestId('error-icon')).toBeInTheDocument()
    })
  })

  it('should disable test button when API key is empty', () => {
    render(<DIdApiStep />)

    const testButton = screen.getByText('測試連線')

    // API Key 為空時,測試按鈕應該禁用
    expect(testButton).toBeDisabled()
  })

  it('should enable test button when API key is provided', () => {
    render(<DIdApiStep />)

    const input = screen.getByPlaceholderText(/輸入.*D-ID.*API.*Key/i)
    const testButton = screen.getByText('測試連線')

    // 輸入 API Key
    fireEvent.change(input, { target: { value: 'test-key' } })

    // 測試按鈕應該啟用
    expect(testButton).not.toBeDisabled()
  })
})
