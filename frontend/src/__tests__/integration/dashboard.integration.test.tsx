import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import DashboardPage from '@/app/page'
import * as api from '@/services/api'

jest.mock('@/services/api', () => ({
  projectsApi: {
    getProjects: jest.fn(),
    deleteProject: jest.fn(),
  },
  statsApi: {
    getStats: jest.fn(),
  },
}))

const mockPush = jest.fn()
const mockReplace = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => '/',
}))

describe('DashboardPage Integration', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    jest.clearAllMocks()
  })

  describe('測試 1: 完整頁面載入流程', () => {
    it('should load statistics and projects successfully', async () => {
      const mockStats = {
        total_projects: 15,
        this_month_generated: 5,
        scheduled_videos: 3,
        api_quota: {
          did_remaining_minutes: 60,
          did_total_minutes: 90,
          youtube_remaining_units: 8000,
          youtube_total_units: 10000,
        },
      }

      const mockProjects = [
        {
          id: 'proj-001',
          project_name: '測試專案 1',
          status: 'COMPLETED' as const,
          created_at: '2025-01-15T10:00:00Z',
          updated_at: '2025-01-15T11:30:00Z',
        },
      ]

      ;(api.statsApi.getStats as jest.Mock).mockResolvedValue(mockStats)
      ;(api.projectsApi.getProjects as jest.Mock).mockResolvedValue({
        projects: mockProjects,
        pagination: { total: 1, limit: 20, offset: 0 },
      })

      render(
        <QueryClientProvider client={queryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      // 等待統計卡片載入
      await waitFor(() => {
        expect(screen.getByText('總影片數')).toBeInTheDocument()
        expect(screen.getByText('15')).toBeInTheDocument()
      })

      // 等待專案列表載入
      await waitFor(() => {
        expect(screen.getByText('測試專案 1')).toBeInTheDocument()
      })
    })
  })

  describe('測試 2: 篩選功能整合測試', () => {
    it('should filter projects when filter is changed', async () => {
      const mockStats = {
        total_projects: 15,
        this_month_generated: 5,
        scheduled_videos: 3,
        api_quota: {
          did_remaining_minutes: 60,
          did_total_minutes: 90,
          youtube_remaining_units: 8000,
          youtube_total_units: 10000,
        },
      }

      const mockAllProjects = [
        {
          id: 'proj-001',
          project_name: '完成的專案',
          status: 'COMPLETED' as const,
          created_at: '2025-01-15T10:00:00Z',
          updated_at: '2025-01-15T11:30:00Z',
        },
        {
          id: 'proj-002',
          project_name: '進行中專案',
          status: 'IN_PROGRESS' as const,
          created_at: '2025-01-16T10:00:00Z',
          updated_at: '2025-01-16T11:30:00Z',
        },
      ]

      const mockCompletedProjects = [
        {
          id: 'proj-001',
          project_name: '完成的專案',
          status: 'COMPLETED' as const,
          created_at: '2025-01-15T10:00:00Z',
          updated_at: '2025-01-15T11:30:00Z',
        },
      ]

      ;(api.statsApi.getStats as jest.Mock).mockResolvedValue(mockStats)
      ;(api.projectsApi.getProjects as jest.Mock)
        .mockResolvedValueOnce({
          projects: mockAllProjects,
          pagination: { total: 2, limit: 20, offset: 0 },
        })
        .mockResolvedValueOnce({
          projects: mockCompletedProjects,
          pagination: { total: 1, limit: 20, offset: 0 },
        })

      render(
        <QueryClientProvider client={queryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('完成的專案')).toBeInTheDocument()
        expect(screen.getByText('進行中專案')).toBeInTheDocument()
      })

      // 選擇篩選
      const filterSelect = screen.getByLabelText('狀態篩選')
      fireEvent.change(filterSelect, { target: { value: 'COMPLETED' } })

      // 驗證 API 被正確調用
      await waitFor(() => {
        expect(api.projectsApi.getProjects).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'COMPLETED',
          })
        )
      })

      // 驗證只顯示已完成的專案
      await waitFor(() => {
        expect(screen.getByText('完成的專案')).toBeInTheDocument()
      })
    })
  })

  describe('測試 3: 刪除專案後重新載入', () => {
    it('should reload list after deleting project', async () => {
      window.confirm = jest.fn(() => true)

      const mockStats = {
        total_projects: 15,
        this_month_generated: 5,
        scheduled_videos: 3,
        api_quota: {
          did_remaining_minutes: 60,
          did_total_minutes: 90,
          youtube_remaining_units: 8000,
          youtube_total_units: 10000,
        },
      }

      const mockProjects = [
        {
          id: 'proj-001',
          project_name: '測試專案 1',
          status: 'COMPLETED' as const,
          created_at: '2025-01-15T10:00:00Z',
          updated_at: '2025-01-15T11:30:00Z',
        },
      ]

      ;(api.statsApi.getStats as jest.Mock).mockResolvedValue(mockStats)
      ;(api.projectsApi.deleteProject as jest.Mock).mockResolvedValue({})
      ;(api.projectsApi.getProjects as jest.Mock).mockResolvedValue({
        projects: mockProjects,
        pagination: { total: 1, limit: 20, offset: 0 },
      })

      render(
        <QueryClientProvider client={queryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('測試專案 1')).toBeInTheDocument()
      })

      // 點擊刪除
      const deleteButton = screen.getByLabelText('刪除專案')
      fireEvent.click(deleteButton)

      // 驗證 API 被調用
      await waitFor(() => {
        expect(api.projectsApi.deleteProject).toHaveBeenCalledWith('proj-001')
      })

      // 驗證列表重新載入
      expect(api.projectsApi.getProjects).toHaveBeenCalledTimes(2)
    })
  })

  describe('測試 4: 錯誤處理', () => {
    it('should display error message when API fails', async () => {
      ;(api.statsApi.getStats as jest.Mock).mockResolvedValue({
        total_projects: 0,
        this_month_generated: 0,
        scheduled_videos: 0,
        api_quota: {
          did_remaining_minutes: 0,
          did_total_minutes: 90,
          youtube_remaining_units: 0,
          youtube_total_units: 10000,
        },
      })
      ;(api.projectsApi.getProjects as jest.Mock).mockRejectedValue(new Error('Network error'))

      render(
        <QueryClientProvider client={queryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('無法載入專案列表')).toBeInTheDocument()
      })

      const retryButton = screen.getByText('重新載入')
      expect(retryButton).toBeInTheDocument()
    })
  })

  describe('測試 5: 按鈕點擊導航', () => {
    it('should navigate to new project page when clicking new project button', async () => {
      const mockStats = {
        total_projects: 0,
        this_month_generated: 0,
        scheduled_videos: 0,
        api_quota: {
          did_remaining_minutes: 60,
          did_total_minutes: 90,
          youtube_remaining_units: 8000,
          youtube_total_units: 10000,
        },
      }

      ;(api.statsApi.getStats as jest.Mock).mockResolvedValue(mockStats)
      ;(api.projectsApi.getProjects as jest.Mock).mockResolvedValue({
        projects: [],
        pagination: { total: 0, limit: 20, offset: 0 },
      })

      render(
        <QueryClientProvider client={queryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('新增專案')).toBeInTheDocument()
      })

      const newProjectButton = screen.getByText('新增專案')
      fireEvent.click(newProjectButton)

      expect(mockPush).toHaveBeenCalledWith('/project/new')
    })

    it('should navigate to result page when clicking view button', async () => {
      const mockStats = {
        total_projects: 1,
        this_month_generated: 1,
        scheduled_videos: 0,
        api_quota: {
          did_remaining_minutes: 60,
          did_total_minutes: 90,
          youtube_remaining_units: 8000,
          youtube_total_units: 10000,
        },
      }

      const mockProjects = [
        {
          id: 'proj-001',
          project_name: '測試專案',
          status: 'COMPLETED' as const,
          created_at: '2025-01-15T10:00:00Z',
          updated_at: '2025-01-15T11:30:00Z',
        },
      ]

      ;(api.statsApi.getStats as jest.Mock).mockResolvedValue(mockStats)
      ;(api.projectsApi.getProjects as jest.Mock).mockResolvedValue({
        projects: mockProjects,
        pagination: { total: 1, limit: 20, offset: 0 },
      })

      render(
        <QueryClientProvider client={queryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('測試專案')).toBeInTheDocument()
      })

      const viewButton = screen.getByLabelText('查看專案')
      fireEvent.click(viewButton)

      expect(mockPush).toHaveBeenCalledWith('/project/proj-001/result')
    })

    it('should navigate to progress page when clicking continue button', async () => {
      const mockStats = {
        total_projects: 1,
        this_month_generated: 0,
        scheduled_videos: 0,
        api_quota: {
          did_remaining_minutes: 60,
          did_total_minutes: 90,
          youtube_remaining_units: 8000,
          youtube_total_units: 10000,
        },
      }

      const mockProjects = [
        {
          id: 'proj-002',
          project_name: '進行中專案',
          status: 'IN_PROGRESS' as const,
          created_at: '2025-01-15T10:00:00Z',
          updated_at: '2025-01-15T11:30:00Z',
        },
      ]

      ;(api.statsApi.getStats as jest.Mock).mockResolvedValue(mockStats)
      ;(api.projectsApi.getProjects as jest.Mock).mockResolvedValue({
        projects: mockProjects,
        pagination: { total: 1, limit: 20, offset: 0 },
      })

      render(
        <QueryClientProvider client={queryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('進行中專案')).toBeInTheDocument()
      })

      const continueButton = screen.getByLabelText('繼續專案')
      fireEvent.click(continueButton)

      expect(mockPush).toHaveBeenCalledWith('/project/proj-002/progress')
    })
  })

  describe('測試 6: 排序功能', () => {
    it('should sort projects when clicking sort header', async () => {
      const mockStats = {
        total_projects: 2,
        this_month_generated: 2,
        scheduled_videos: 0,
        api_quota: {
          did_remaining_minutes: 60,
          did_total_minutes: 90,
          youtube_remaining_units: 8000,
          youtube_total_units: 10000,
        },
      }

      const mockProjects = [
        {
          id: 'proj-001',
          project_name: '專案 1',
          status: 'COMPLETED' as const,
          created_at: '2025-01-15T10:00:00Z',
          updated_at: '2025-01-15T11:30:00Z',
        },
        {
          id: 'proj-002',
          project_name: '專案 2',
          status: 'COMPLETED' as const,
          created_at: '2025-01-16T10:00:00Z',
          updated_at: '2025-01-16T11:30:00Z',
        },
      ]

      ;(api.statsApi.getStats as jest.Mock).mockResolvedValue(mockStats)
      ;(api.projectsApi.getProjects as jest.Mock).mockResolvedValue({
        projects: mockProjects,
        pagination: { total: 2, limit: 20, offset: 0 },
      })

      render(
        <QueryClientProvider client={queryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('專案 1')).toBeInTheDocument()
      })

      // 點擊創建時間排序
      const createdAtHeader = screen.getByText(/創建時間/)
      fireEvent.click(createdAtHeader)

      await waitFor(() => {
        expect(api.projectsApi.getProjects).toHaveBeenCalledWith(
          expect.objectContaining({
            sort_by: 'created_at',
            order: 'asc',
          })
        )
      })
    })
  })

  describe('測試 7: 分頁功能', () => {
    it('should navigate to next page when clicking next button', async () => {
      const mockStats = {
        total_projects: 25,
        this_month_generated: 5,
        scheduled_videos: 0,
        api_quota: {
          did_remaining_minutes: 60,
          did_total_minutes: 90,
          youtube_remaining_units: 8000,
          youtube_total_units: 10000,
        },
      }

      const mockProjects = Array.from({ length: 20 }, (_, i) => ({
        id: `proj-${i + 1}`,
        project_name: `專案 ${i + 1}`,
        status: 'COMPLETED' as const,
        created_at: '2025-01-15T10:00:00Z',
        updated_at: '2025-01-15T11:30:00Z',
      }))

      ;(api.statsApi.getStats as jest.Mock).mockResolvedValue(mockStats)
      ;(api.projectsApi.getProjects as jest.Mock).mockResolvedValue({
        projects: mockProjects,
        pagination: { total: 25, limit: 20, offset: 0 },
      })

      render(
        <QueryClientProvider client={queryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('專案 1')).toBeInTheDocument()
      })

      const nextButton = screen.getByLabelText('下一頁')
      fireEvent.click(nextButton)

      await waitFor(() => {
        expect(api.projectsApi.getProjects).toHaveBeenCalledWith(
          expect.objectContaining({
            offset: 20, // page 2 = offset 20
          })
        )
      })
    })
  })

  describe('測試 8: 刪除失敗錯誤處理', () => {
    it('should show error alert when delete fails', async () => {
      window.confirm = jest.fn(() => true)
      window.alert = jest.fn()

      const mockStats = {
        total_projects: 1,
        this_month_generated: 1,
        scheduled_videos: 0,
        api_quota: {
          did_remaining_minutes: 60,
          did_total_minutes: 90,
          youtube_remaining_units: 8000,
          youtube_total_units: 10000,
        },
      }

      const mockProjects = [
        {
          id: 'proj-001',
          project_name: '測試專案',
          status: 'COMPLETED' as const,
          created_at: '2025-01-15T10:00:00Z',
          updated_at: '2025-01-15T11:30:00Z',
        },
      ]

      ;(api.statsApi.getStats as jest.Mock).mockResolvedValue(mockStats)
      ;(api.projectsApi.getProjects as jest.Mock).mockResolvedValue({
        projects: mockProjects,
        pagination: { total: 1, limit: 20, offset: 0 },
      })
      ;(api.projectsApi.deleteProject as jest.Mock).mockRejectedValue(
        new Error('Delete failed')
      )

      render(
        <QueryClientProvider client={queryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('測試專案')).toBeInTheDocument()
      })

      const deleteButton = screen.getByLabelText('刪除專案')
      fireEvent.click(deleteButton)

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('刪除失敗,請稍後再試')
      })
    })
  })

  describe('測試 9: 空狀態顯示', () => {
    it('should show empty state when no projects exist', async () => {
      const mockStats = {
        total_projects: 0,
        this_month_generated: 0,
        scheduled_videos: 0,
        api_quota: {
          did_remaining_minutes: 60,
          did_total_minutes: 90,
          youtube_remaining_units: 8000,
          youtube_total_units: 10000,
        },
      }

      ;(api.statsApi.getStats as jest.Mock).mockResolvedValue(mockStats)
      ;(api.projectsApi.getProjects as jest.Mock).mockResolvedValue({
        projects: [],
        pagination: { total: 0, limit: 20, offset: 0 },
      })

      render(
        <QueryClientProvider client={queryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('還沒有任何專案')).toBeInTheDocument()
      })
    })
  })
})
