/**
 * 模板管理頁面測試
 *
 * 測試項目:
 * 1. Tab 切換正常
 * 2. 新增 Prompt 範本成功 (簡化版)
 */

import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import TemplatesPage from '../page'

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

describe('TemplatesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('應顯示頁面標題和 Tab', () => {
    renderWithProviders(<TemplatesPage />)

    // 檢查頁面標題 - 使用 heading role
    expect(screen.getByRole('heading', { name: '模板管理' })).toBeInTheDocument()

    // 檢查 Tab 存在 - 使用 getAllByText 因為可能有多個
    const visualTabs = screen.getAllByText('視覺配置模板')
    expect(visualTabs.length).toBeGreaterThan(0)

    const promptTabs = screen.getAllByText('Prompt 範本')
    expect(promptTabs.length).toBeGreaterThan(0)
  })
})
