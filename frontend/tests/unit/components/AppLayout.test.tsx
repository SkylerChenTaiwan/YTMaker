// tests/unit/components/AppLayout.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppLayout } from '@/components/layout/AppLayout'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/'),
}))

describe('AppLayout Component', () => {
  it('should render navigation bar and main content', () => {
    render(
      <AppLayout>
        <div>測試內容</div>
      </AppLayout>
    )

    // 檢查導航列存在
    expect(screen.getByRole('navigation')).toBeInTheDocument()

    // 檢查主內容區
    expect(screen.getByText('測試內容')).toBeInTheDocument()
  })

  it('should render logo', () => {
    render(
      <AppLayout>
        <div />
      </AppLayout>
    )

    expect(screen.getByText('YTMaker')).toBeInTheDocument()
  })

  it('should render navigation links', () => {
    render(
      <AppLayout>
        <div />
      </AppLayout>
    )

    expect(screen.getByText('主控台')).toBeInTheDocument()
    expect(screen.getByText('配置管理')).toBeInTheDocument()
    expect(screen.getByText('模板管理')).toBeInTheDocument()
    expect(screen.getByText('系統設定')).toBeInTheDocument()
    expect(screen.getByText('批次處理')).toBeInTheDocument()
  })

  it('should render footer', () => {
    render(
      <AppLayout>
        <div />
      </AppLayout>
    )

    expect(screen.getByText(/© 2025 YTMaker/)).toBeInTheDocument()
  })

  it('should render children in main content area', () => {
    const testContent = '這是測試內容'
    render(
      <AppLayout>
        <div data-testid="test-content">{testContent}</div>
      </AppLayout>
    )

    const mainElement = screen.getByRole('main')
    const testElement = screen.getByTestId('test-content')

    expect(mainElement).toContainElement(testElement)
    expect(testElement).toHaveTextContent(testContent)
  })

  it('should have correct layout structure', () => {
    const { container } = render(
      <AppLayout>
        <div />
      </AppLayout>
    )

    // 檢查根容器
    const rootDiv = container.firstChild
    expect(rootDiv).toHaveClass('min-h-screen', 'flex', 'flex-col')

    // 檢查主內容區
    const main = screen.getByRole('main')
    expect(main).toHaveClass('flex-1', 'bg-gray-50')
  })
})

describe('NavigationBar Component', () => {
  beforeEach(() => {
    // Reset mock before each test
    jest.clearAllMocks()
  })

  it('should highlight active link based on current path', () => {
    const { usePathname } = require('next/navigation')
    usePathname.mockReturnValue('/configurations')

    render(
      <AppLayout>
        <div />
      </AppLayout>
    )

    const configurationsLink = screen.getByText('配置管理').closest('a')
    expect(configurationsLink).toHaveClass('bg-primary', 'text-white')

    const dashboardLink = screen.getByText('主控台').closest('a')
    expect(dashboardLink).not.toHaveClass('bg-primary', 'text-white')
  })

  it('should show hamburger menu button on mobile', () => {
    render(
      <AppLayout>
        <div />
      </AppLayout>
    )

    const hamburgerButton = screen.getByLabelText('開啟選單')
    expect(hamburgerButton).toBeInTheDocument()
  })

  it('should toggle mobile menu on hamburger click', async () => {
    const user = userEvent.setup()

    render(
      <AppLayout>
        <div />
      </AppLayout>
    )

    const hamburgerButton = screen.getByLabelText('開啟選單')

    // 初始狀態: 選單不可見或不存在
    expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument()

    // 點擊漢堡選單
    await user.click(hamburgerButton)

    // 選單應該打開
    expect(screen.getByTestId('mobile-menu')).toBeInTheDocument()

    // 再次點擊關閉
    await user.click(hamburgerButton)
    expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument()
  })

  it('should close mobile menu when clicking a link', async () => {
    const user = userEvent.setup()

    render(
      <AppLayout>
        <div />
      </AppLayout>
    )

    const hamburgerButton = screen.getByLabelText('開啟選單')

    // 打開選單
    await user.click(hamburgerButton)
    expect(screen.getByTestId('mobile-menu')).toBeInTheDocument()

    // 點擊選單中的連結
    const mobileMenu = screen.getByTestId('mobile-menu')
    const mobileLink = mobileMenu.querySelector('a')
    if (mobileLink) {
      await user.click(mobileLink)
    }

    // 選單應該關閉
    expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument()
  })

  it('should have all navigation links in mobile menu', async () => {
    const user = userEvent.setup()

    render(
      <AppLayout>
        <div />
      </AppLayout>
    )

    const hamburgerButton = screen.getByLabelText('開啟選單')
    await user.click(hamburgerButton)

    const mobileMenu = screen.getByTestId('mobile-menu')

    // 檢查所有連結都在手機版選單中
    expect(mobileMenu).toHaveTextContent('主控台')
    expect(mobileMenu).toHaveTextContent('配置管理')
    expect(mobileMenu).toHaveTextContent('模板管理')
    expect(mobileMenu).toHaveTextContent('系統設定')
    expect(mobileMenu).toHaveTextContent('批次處理')
  })
})
