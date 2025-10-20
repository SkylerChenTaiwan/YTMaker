// tests/unit/pages/not-found.test.tsx
import { render, screen } from '@testing-library/react'
import NotFound from '@/app/not-found'

describe('404 Page', () => {
  it('should render 404 message', () => {
    render(<NotFound />)

    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByText('找不到頁面')).toBeInTheDocument()
  })

  it('should render error description', () => {
    render(<NotFound />)

    expect(
      screen.getByText(/您訪問的頁面不存在,可能已被移除或 URL 不正確/)
    ).toBeInTheDocument()
  })

  it('should have a link back to home', () => {
    render(<NotFound />)

    const homeLink = screen.getByText('返回主控台').closest('a')
    expect(homeLink).toBeInTheDocument()
    expect(homeLink).toHaveAttribute('href', '/')
  })

  it('should have correct layout structure', () => {
    const { container } = render(<NotFound />)

    // 檢查根容器樣式
    const rootDiv = container.firstChild
    expect(rootDiv).toHaveClass(
      'flex',
      'flex-col',
      'items-center',
      'justify-center',
      'min-h-screen',
      'bg-gray-50'
    )
  })

  it('should have proper heading hierarchy', () => {
    render(<NotFound />)

    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1).toHaveTextContent('404')

    const h2 = screen.getByRole('heading', { level: 2 })
    expect(h2).toHaveTextContent('找不到頁面')
  })

  it('should style the back to home button correctly', () => {
    render(<NotFound />)

    const backButton = screen.getByText('返回主控台')
    expect(backButton).toHaveClass(
      'inline-block',
      'px-6',
      'py-3',
      'bg-primary',
      'text-white',
      'rounded-lg',
      'hover:bg-primary-hover',
      'transition-colors',
      'no-underline'
    )
  })

  it('should render with proper text styling', () => {
    render(<NotFound />)

    const errorCode = screen.getByText('404')
    expect(errorCode).toHaveClass('text-6xl', 'font-bold', 'text-gray-800', 'mb-4')

    const title = screen.getByText('找不到頁面')
    expect(title).toHaveClass('text-2xl', 'font-semibold', 'text-gray-700', 'mb-4')

    const description = screen.getByText(/您訪問的頁面不存在/)
    expect(description).toHaveClass('text-gray-600', 'mb-8')
  })

  it('should be centered on the page', () => {
    const { container } = render(<NotFound />)

    const centerWrapper = container.querySelector('.text-center')
    expect(centerWrapper).toBeInTheDocument()
  })
})
