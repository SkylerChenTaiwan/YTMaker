/**
 * 配置管理整合測試
 *
 * 測試項目:
 * 1. 配置複製並跳轉到視覺化配置頁面
 */

import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import ConfigurationsPage from '@/app/configurations/page'
import * as api from '@/lib/api/configurationsApi'

// Mock API
jest.mock('@/lib/api/configurationsApi')

// Mock data
const mockConfigurations = [
  {
    id: 'config-1',
    name: '測試配置',
    configuration_data: {
      subtitle: {
        position: 'bottom' as const,
        font_size: 32,
        color: '#FFFFFF',
        bg_color: '#000000',
        bg_opacity: 0.7,
      },
    },
    created_at: '2025-01-15T10:30:00Z',
    last_used_at: '2025-01-15T11:45:00Z',
    usage_count: 5,
  },
]

// Helper function
function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  const user = userEvent.setup()

  return {
    user,
    ...render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    ),
  }
}

describe('配置管理整合測試', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('應成功複製配置並跳轉到視覺化配置頁面', async () => {
    // Mock router
    const mockPush = jest.fn()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    })

    // Mock API responses
    jest.spyOn(api, 'getConfigurations').mockResolvedValue({
      success: true,
      data: { configurations: mockConfigurations },
    })

    jest.spyOn(api, 'copyConfiguration').mockResolvedValue({
      success: true,
      data: { id: 'copied-config-id', name: '測試配置 (副本)' },
    })

    const { user } = renderWithProviders(<ConfigurationsPage />)

    // 1. 等待配置列表載入
    await waitFor(() => {
      expect(screen.getByText('測試配置')).toBeInTheDocument()
    })

    // 2. 點擊複製按鈕
    const copyButtons = screen.getAllByRole('button', { name: /複製/ })
    await user.click(copyButtons[0])

    // 3. 驗證 API 被呼叫
    await waitFor(() => {
      expect(api.copyConfiguration).toHaveBeenCalledWith('config-1')
    })

    // 4. 驗證跳轉到視覺化配置頁面
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        '/project/new/configure/visual?templateId=copied-config-id'
      )
    })
  })

  it('應處理複製失敗的情況', async () => {
    // Mock API responses
    jest.spyOn(api, 'getConfigurations').mockResolvedValue({
      success: true,
      data: { configurations: mockConfigurations },
    })

    jest.spyOn(api, 'copyConfiguration').mockRejectedValue(new Error('複製失敗'))

    const { user } = renderWithProviders(<ConfigurationsPage />)

    // 等待配置列表載入
    await waitFor(() => {
      expect(screen.getByText('測試配置')).toBeInTheDocument()
    })

    // 點擊複製按鈕
    const copyButtons = screen.getAllByRole('button', { name: /複製/ })
    await user.click(copyButtons[0])

    // 驗證 API 被呼叫
    await waitFor(() => {
      expect(api.copyConfiguration).toHaveBeenCalledWith('config-1')
    })

    // Toast 錯誤訊息會被 sonner mock 處理，這裡不需要額外驗證
  })
})
