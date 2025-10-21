import { render, screen, fireEvent } from '@testing-library/react'
import { ProjectList } from '@/components/feature/ProjectList'

describe('ProjectList', () => {
  const mockProjects = [
    {
      id: 'proj-001',
      project_name: '測試專案 1',
      status: 'COMPLETED' as const,
      created_at: '2025-01-15T10:00:00Z',
      updated_at: '2025-01-15T11:30:00Z',
    },
    {
      id: 'proj-002',
      project_name: '測試專案 2',
      status: 'IN_PROGRESS' as const,
      created_at: '2025-01-16T09:00:00Z',
      updated_at: '2025-01-16T10:00:00Z',
    },
  ]

  const mockPagination = {
    total: 2,
    limit: 20,
    offset: 0,
  }

  const defaultProps = {
    projects: mockProjects,
    pagination: mockPagination,
    status: null,
    onStatusChange: jest.fn(),
    sortBy: 'updated_at',
    order: 'desc' as const,
    onSort: jest.fn(),
    onPageChange: jest.fn(),
    onDelete: jest.fn(),
    onView: jest.fn(),
    onContinue: jest.fn(),
  }

  it('should display project list', () => {
    const { container } = render(<ProjectList {...defaultProps} />)

    expect(screen.getByText('測試專案 1')).toBeInTheDocument()
    expect(screen.getByText('測試專案 2')).toBeInTheDocument()

    // 檢查狀態標籤 (在 table 中)
    const table = container.querySelector('table')
    expect(table).toHaveTextContent('已完成')
    expect(table).toHaveTextContent('進行中')
  })

  it('should call onStatusChange when filter is changed', () => {
    const mockOnStatusChange = jest.fn()

    render(<ProjectList {...defaultProps} onStatusChange={mockOnStatusChange} />)

    const filterSelect = screen.getByLabelText('狀態篩選')
    fireEvent.change(filterSelect, { target: { value: 'COMPLETED' } })

    expect(mockOnStatusChange).toHaveBeenCalledWith('COMPLETED')
  })

  it('should call onSort when column header is clicked', () => {
    const mockOnSort = jest.fn()

    render(<ProjectList {...defaultProps} onSort={mockOnSort} />)

    const createdAtHeader = screen.getByText('創建時間')
    fireEvent.click(createdAtHeader)

    expect(mockOnSort).toHaveBeenCalledWith('created_at', 'asc')
  })

  it('should display pagination controls', () => {
    const mockPagination = {
      total: 50,
      limit: 20,
      offset: 0,
    }

    render(<ProjectList {...defaultProps} pagination={mockPagination} />)

    // 應該顯示「第 1 頁,共 3 頁」
    expect(screen.getByText(/第 1 頁/)).toBeInTheDocument()
    expect(screen.getByText(/共 3 頁/)).toBeInTheDocument()
  })

  it('should show confirmation before delete', async () => {
    const mockOnDelete = jest.fn()
    window.confirm = jest.fn(() => true)

    render(<ProjectList {...defaultProps} onDelete={mockOnDelete} />)

    const deleteButton = screen.getAllByLabelText('刪除專案')[0]
    fireEvent.click(deleteButton)

    expect(window.confirm).toHaveBeenCalledWith('確定要刪除此專案嗎?此操作無法復原。')
    expect(mockOnDelete).toHaveBeenCalledWith('proj-001')
  })

  it('should display empty state when no projects', () => {
    render(
      <ProjectList
        {...defaultProps}
        projects={[]}
        pagination={{ total: 0, limit: 20, offset: 0 }}
      />
    )

    expect(screen.getByText('還沒有任何專案')).toBeInTheDocument()
    expect(screen.getByText('開始第一個專案')).toBeInTheDocument()
  })
})
