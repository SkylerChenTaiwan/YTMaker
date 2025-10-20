// tests/unit/components/Breadcrumb.test.tsx
import { render, screen } from '@testing-library/react'
import { Breadcrumb } from '@/components/layout/Breadcrumb'

describe('Breadcrumb Component', () => {
  it('should render breadcrumb items correctly', () => {
    const items = [
      { label: '主控台', href: '/' },
      { label: '新增專案', href: '/project/new' },
      { label: '視覺化配置' }, // 最後一項沒有 href
    ]

    render(<Breadcrumb items={items} />)

    // 檢查所有項目都顯示
    expect(screen.getByText('主控台')).toBeInTheDocument()
    expect(screen.getByText('新增專案')).toBeInTheDocument()
    expect(screen.getByText('視覺化配置')).toBeInTheDocument()
  })

  it('should render links for items with href', () => {
    const items = [
      { label: '主控台', href: '/' },
      { label: '新增專案', href: '/project/new' },
      { label: '視覺化配置' },
    ]

    render(<Breadcrumb items={items} />)

    // 檢查前兩項是連結
    const homeLink = screen.getByText('主控台').closest('a')
    expect(homeLink).toBeInTheDocument()
    expect(homeLink).toHaveAttribute('href', '/')

    const projectLink = screen.getByText('新增專案').closest('a')
    expect(projectLink).toBeInTheDocument()
    expect(projectLink).toHaveAttribute('href', '/project/new')
  })

  it('should not render link for last item (current page)', () => {
    const items = [
      { label: '主控台', href: '/' },
      { label: '新增專案', href: '/project/new' },
      { label: '視覺化配置' },
    ]

    render(<Breadcrumb items={items} />)

    // 檢查最後一項不是連結 (當前頁面)
    const currentPage = screen.getByText('視覺化配置')
    expect(currentPage.closest('a')).not.toBeInTheDocument()
    expect(currentPage.tagName).toBe('SPAN')
  })

  it('should render separator between items', () => {
    const items = [
      { label: '主控台', href: '/' },
      { label: '新增專案' },
    ]

    const { container } = render(<Breadcrumb items={items} />)

    // 檢查分隔符號 "/"
    const separators = container.querySelectorAll('[aria-hidden="true"]')
    expect(separators).toHaveLength(1)
    expect(separators[0].textContent).toBe('/')
  })

  it('should handle single item breadcrumb', () => {
    const items = [{ label: '主控台' }]

    const { container } = render(<Breadcrumb items={items} />)

    expect(screen.getByText('主控台')).toBeInTheDocument()

    // 單一項目不應該有分隔符號
    const separators = container.querySelectorAll('[aria-hidden="true"]')
    expect(separators).toHaveLength(0)
  })

  it('should render correct number of separators', () => {
    const items = [
      { label: '主控台', href: '/' },
      { label: '新增專案', href: '/project/new' },
      { label: '視覺化配置', href: '/project/123/configure/visual' },
      { label: '字幕設定' },
    ]

    const { container } = render(<Breadcrumb items={items} />)

    // 4 個項目應該有 3 個分隔符號
    const separators = container.querySelectorAll('[aria-hidden="true"]')
    expect(separators).toHaveLength(3)
  })

  it('should have proper accessibility attributes', () => {
    const items = [
      { label: '主控台', href: '/' },
      { label: '新增專案' },
    ]

    render(<Breadcrumb items={items} />)

    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(nav).toBeInTheDocument()
  })

  it('should render empty breadcrumb with no items', () => {
    const items: { label: string; href?: string }[] = []

    const { container } = render(<Breadcrumb items={items} />)

    const list = container.querySelector('ol')
    expect(list?.children).toHaveLength(0)
  })

  it('should apply correct CSS classes', () => {
    const items = [
      { label: '主控台', href: '/' },
      { label: '新增專案' },
    ]

    render(<Breadcrumb items={items} />)

    // 檢查有 href 的項目有正確的樣式類別
    const linkElement = screen.getByText('主控台')
    expect(linkElement).toHaveClass('text-primary', 'hover:underline', 'transition-colors')

    // 檢查沒有 href 的項目有正確的樣式類別
    const spanElement = screen.getByText('新增專案')
    expect(spanElement).toHaveClass('text-gray-600', 'font-medium')
  })
})
