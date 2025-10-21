import { render, screen } from '@testing-library/react'
import { StatsCards } from '@/components/feature/StatsCards'

describe('StatsCards', () => {
  const mockStats = {
    total_projects: 15,
    completed_projects: 12,
    in_progress_projects: 2,
    failed_projects: 1,
    this_month_generated: 5,
    scheduled_videos: 3,
    api_quota: {
      did_remaining_minutes: 60,
      did_total_minutes: 90,
      youtube_remaining_units: 8000,
      youtube_total_units: 10000,
    },
  }

  it('should display all statistics cards correctly', () => {
    render(<StatsCards stats={mockStats} />)

    // 驗證總影片數
    expect(screen.getByText('總影片數')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()

    // 驗證本月生成數
    expect(screen.getByText('本月生成數')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()

    // 驗證已排程影片
    expect(screen.getByText('已排程影片')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()

    // 驗證 API 配額
    expect(screen.getByText('API 配額剩餘')).toBeInTheDocument()
  })

  it('should calculate and display API quota percentage', () => {
    render(<StatsCards stats={mockStats} />)

    // D-ID 配額: 60/90 = 66.67%
    const quotaText = screen.getByText(/67%/)
    expect(quotaText).toBeInTheDocument()
  })

  it('should display quota details in subtitle', () => {
    render(<StatsCards stats={mockStats} />)

    // 驗證配額詳細資訊
    expect(screen.getByText(/D-ID: 60\/90 分鐘/)).toBeInTheDocument()
  })
})

describe('StatsCards - Quota Warning', () => {
  it('should display red color when quota is less than 10%', () => {
    const lowQuotaStats = {
      total_projects: 15,
      completed_projects: 12,
      in_progress_projects: 2,
      failed_projects: 1,
      this_month_generated: 5,
      scheduled_videos: 3,
      api_quota: {
        did_remaining_minutes: 5, // 5/90 = 5.56% < 10%
        did_total_minutes: 90,
        youtube_remaining_units: 500,
        youtube_total_units: 10000,
      },
    }

    const { container } = render(<StatsCards stats={lowQuotaStats} />)

    // 驗證有紅色圖示
    const redIcon = container.querySelector('.text-red-500')
    expect(redIcon).toBeInTheDocument()
  })

  it('should display orange color when quota is between 10-30%', () => {
    const mediumQuotaStats = {
      total_projects: 15,
      completed_projects: 12,
      in_progress_projects: 2,
      failed_projects: 1,
      this_month_generated: 5,
      scheduled_videos: 3,
      api_quota: {
        did_remaining_minutes: 20, // 20/90 = 22.22%
        did_total_minutes: 90,
        youtube_remaining_units: 2000,
        youtube_total_units: 10000,
      },
    }

    const { container } = render(<StatsCards stats={mediumQuotaStats} />)

    // 驗證有橘色圖示
    const orangeIcon = container.querySelector('.text-orange-500')
    expect(orangeIcon).toBeInTheDocument()
  })
})

describe('StatsCards - Responsive Layout', () => {
  const mockStats = {
    total_projects: 15,
    completed_projects: 12,
    in_progress_projects: 2,
    failed_projects: 1,
    this_month_generated: 5,
    scheduled_videos: 3,
    api_quota: {
      did_remaining_minutes: 60,
      did_total_minutes: 90,
      youtube_remaining_units: 8000,
      youtube_total_units: 10000,
    },
  }

  it('should have correct grid classes', () => {
    const { container } = render(<StatsCards stats={mockStats} />)

    const gridContainer = container.querySelector('.grid')
    expect(gridContainer).toHaveClass('grid-cols-1') // 手機
    expect(gridContainer).toHaveClass('md:grid-cols-2') // 平板
    expect(gridContainer).toHaveClass('lg:grid-cols-4') // 桌面
  })
})
