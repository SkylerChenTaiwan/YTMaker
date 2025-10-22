/**
 * 配置管理頁面測試
 *
 * 測試項目:
 * 1. 成功載入配置列表
 * 2. 刪除配置成功
 * 3. 空狀態處理
 */

import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import ConfigurationsPage from '../page'
import * as api from '@/lib/api/configurationsApi'

// Mock API
jest.mock('@/lib/api/configurationsApi')

// Mock data
const mockConfigurations = [
  {
    id: 'config-1',
    name: '預設配置',
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
    usage_count: 10,
  },
  {
    id: 'config-2',
    name: '自訂配置 A',
    configuration_data: {
      subtitle: {
        position: 'top' as const,
        font_size: 28,
        color: '#FFFFFF',
        bg_color: '#000000',
        bg_opacity: 0.8,
      },
    },
    created_at: '2025-01-16T14:20:00Z',
    last_used_at: '2025-01-16T15:10:00Z',
    usage_count: 5,
  },
  {
    id: 'config-3',
    name: '自訂配置 B',
    configuration_data: {
      subtitle: {
        position: 'center' as const,
        font_size: 36,
        color: '#FFFFFF',
        bg_color: '#000000',
        bg_opacity: 0.6,
      },
    },
    created_at: '2025-01-17T09:00:00Z',
    last_used_at: null,
    usage_count: 0,
  },
]

// Helper function to render with providers
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

describe('ConfigurationsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('應成功載入並顯示配置列表', async () => {
    // Mock API
    jest.spyOn(api, 'getConfigurations').mockResolvedValue({
      success: true,
      data: { configurations: mockConfigurations },
    })

    // Render
    renderWithProviders(<ConfigurationsPage />)

    // Wait for data
    await waitFor(() => {
      expect(screen.getByText('預設配置')).toBeInTheDocument()
    })

    // Assertions
    expect(screen.getByText('自訂配置 A')).toBeInTheDocument()
    expect(screen.getByText('自訂配置 B')).toBeInTheDocument()

    // 檢查操作按鈕 (每個配置都有 4 個按鈕)
    const previewButtons = screen.getAllByRole('button', { name: /預覽/ })
    expect(previewButtons).toHaveLength(3)

    const editButtons = screen.getAllByRole('button', { name: /編輯/ })
    expect(editButtons).toHaveLength(3)

    const copyButtons = screen.getAllByRole('button', { name: /複製/ })
    expect(copyButtons).toHaveLength(3)

    const deleteButtons = screen.getAllByRole('button', { name: /刪除/ })
    expect(deleteButtons).toHaveLength(3)
  })

  it('應顯示刪除確認 Modal', async () => {
    jest.spyOn(api, 'getConfigurations').mockResolvedValue({
      success: true,
      data: { configurations: mockConfigurations },
    })

    const { user } = renderWithProviders(<ConfigurationsPage />)

    // 等待配置列表載入
    await waitFor(() => {
      expect(screen.getByText('預設配置')).toBeInTheDocument()
    })

    // 點擊刪除按鈕
    const deleteButtons = screen.getAllByRole('button', { name: /刪除/ })
    await user.click(deleteButtons[0])

    // 確認 Modal 出現並包含配置名稱
    await waitFor(
      () => {
        expect(screen.getByText(/確定要刪除配置/)).toBeInTheDocument()
        expect(screen.getByText(/預設配置/)).toBeInTheDocument()
      },
      { timeout: 3000 }
    )
  })

  it('應正確顯示空狀態', async () => {
    jest.spyOn(api, 'getConfigurations').mockResolvedValue({
      success: true,
      data: { configurations: [] },
    })

    renderWithProviders(<ConfigurationsPage />)

    await waitFor(() => {
      expect(screen.getByText(/還沒有任何配置/)).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /新增第一個配置/ })).toBeInTheDocument()

    // 不應該顯示表格
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
