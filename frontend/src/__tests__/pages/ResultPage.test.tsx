/**
 * ResultPage 單元測試
 *
 * 測試結果頁面的核心功能:
 * - 成功載入並顯示專案結果
 * - YouTube 播放器嵌入 (公開影片)
 * - 本地影片播放器 (私人影片)
 * - 下載功能 (影片、封面、所有素材)
 * - 下載進度顯示
 * - 排程發布資訊
 * - 錯誤狀態處理
 * - 操作按鈕導航
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ResultPage from '@/app/project/[id]/result/page'

// Mock next/navigation
const mockPush = jest.fn()
const mockRouter = {
  push: mockPush,
  back: jest.fn(),
  refresh: jest.fn(),
}

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/project/test-123/result',
  notFound: jest.fn(),
}))

// Mock @/lib/api/projects
const mockGetProjectResult = jest.fn()
const mockDownloadFile = jest.fn()

jest.mock('@/lib/api/projects', () => ({
  getProjectResult: (...args: any[]) => mockGetProjectResult(...args),
  downloadVideo: (...args: any[]) => mockDownloadFile(...args),
  downloadThumbnail: (...args: any[]) => mockDownloadFile(...args),
  downloadAssets: (...args: any[]) => mockDownloadFile(...args),
}))

// Mock toast
jest.mock('@/lib/toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}))

// Setup helper
function setup() {
  return {
    user: userEvent.setup(),
  }
}

describe('ResultPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('測試 1: 結果頁面基本渲染', () => {
    it('應該正確渲染所有結果資訊', async () => {
      // 1. Mock project result data
      const mockResult = {
        id: 'project-123',
        project_name: '測試專案',
        youtube_video_id: 'dQw4w9WgXcQ',
        youtube_url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
        youtube_title: '我的測試影片',
        youtube_description: '這是測試描述',
        youtube_tags: ['AI', '測試', '自動化'],
        privacy: 'public',
        publish_type: 'immediate',
        published_at: '2025-10-19T10:00:00Z',
        status: 'completed',
      }

      // 2. Mock API
      mockGetProjectResult.mockResolvedValue(mockResult)

      // 3. Render page
      render(<ResultPage params={{ id: 'project-123' }} />)

      // 4. Wait for data to load
      await waitFor(() => {
        expect(mockGetProjectResult).toHaveBeenCalledWith('project-123')
      })

      // 5. Verify success message
      await waitFor(() => {
        expect(
          screen.getByText('影片已成功生成並上傳到 YouTube！')
        ).toBeInTheDocument()
      })

      // 6. Verify YouTube link
      const youtubeLink = screen.getByText('在 YouTube 上觀看')
      expect(youtubeLink).toHaveAttribute(
        'href',
        'https://youtube.com/watch?v=dQw4w9WgXcQ'
      )
      expect(youtubeLink).toHaveAttribute('target', '_blank')

      // 7. Verify video info
      expect(screen.getByText('我的測試影片')).toBeInTheDocument()
      expect(screen.getByText('這是測試描述')).toBeInTheDocument()
      expect(screen.getByText('AI')).toBeInTheDocument()
      expect(screen.getByText('測試')).toBeInTheDocument()
      expect(screen.getByText('自動化')).toBeInTheDocument()

      // 8. Verify status badge
      expect(screen.getByText('公開')).toBeInTheDocument()
    })
  })

  describe('測試 2: YouTube 播放器嵌入 (公開影片)', () => {
    it('公開影片應該顯示 YouTube 播放器', async () => {
      const mockResult = {
        id: 'project-123',
        project_name: '測試專案',
        youtube_video_id: 'dQw4w9WgXcQ',
        privacy: 'public',
        status: 'completed',
      }

      mockGetProjectResult.mockResolvedValue(mockResult)

      render(<ResultPage params={{ id: 'project-123' }} />)

      // Verify YouTube iframe
      await waitFor(() => {
        const iframe = screen.getByTestId('youtube-player')
        expect(iframe).toHaveAttribute(
          'src',
          expect.stringContaining('youtube.com/embed/dQw4w9WgXcQ')
        )
        expect(iframe).toHaveAttribute('allowFullScreen')
      })

      // Verify aspect ratio container
      const videoContainer = screen.getByTestId('video-container')
      expect(videoContainer).toHaveClass('aspect-video')
    })
  })

  describe('測試 3: 本地影片播放器 (私人影片)', () => {
    it('私人影片應該使用本地播放器', async () => {
      const mockResult = {
        id: 'project-123',
        project_name: '測試專案',
        privacy: 'private',
        local_video_url: '/api/v1/projects/project-123/video',
        status: 'completed',
      }

      mockGetProjectResult.mockResolvedValue(mockResult)

      render(<ResultPage params={{ id: 'project-123' }} />)

      // Verify local video player
      await waitFor(() => {
        const videoPlayer = screen.getByTestId('local-video-player')
        expect(videoPlayer).toBeInTheDocument()
        expect(videoPlayer).toHaveAttribute(
          'src',
          expect.stringContaining('project-123')
        )

        // Verify controls
        expect(videoPlayer).toHaveAttribute('controls')
      })
    })
  })

  describe('測試 4: 下載功能', () => {
    it('應該能下載影片、封面和所有素材', async () => {
      const { user } = setup()

      const mockResult = {
        id: 'project-123',
        project_name: '測試專案',
        status: 'completed',
        youtube_video_id: 'test-video',
      }

      mockGetProjectResult.mockResolvedValue(mockResult)

      // Mock download function to return blob
      mockDownloadFile.mockResolvedValue({
        data: new Blob(['test']),
      })

      // Mock URL.createObjectURL
      global.URL.createObjectURL = jest.fn(() => 'blob:mock-url')
      global.URL.revokeObjectURL = jest.fn()

      // Mock document.createElement for download trigger
      const mockClick = jest.fn()
      const originalCreateElement = document.createElement.bind(document)
      document.createElement = jest.fn((tagName: string) => {
        if (tagName === 'a') {
          const mockLink = originalCreateElement('a')
          mockLink.click = mockClick
          return mockLink
        }
        return originalCreateElement(tagName)
      })

      render(<ResultPage params={{ id: 'project-123' }} />)

      await waitFor(() => {
        expect(screen.getByText('測試專案')).toBeInTheDocument()
      })

      // 1. Download video
      const downloadVideoBtn = screen.getByRole('button', { name: /下載影片/i })
      await user.click(downloadVideoBtn)

      await waitFor(() => {
        expect(mockDownloadFile).toHaveBeenCalled()
        expect(mockClick).toHaveBeenCalled()
      })

      // Reset mocks
      mockClick.mockClear()
      mockDownloadFile.mockClear()

      // 2. Download thumbnail
      const downloadThumbnailBtn = screen.getByRole('button', {
        name: /下載封面/i,
      })
      await user.click(downloadThumbnailBtn)

      await waitFor(() => {
        expect(mockDownloadFile).toHaveBeenCalled()
        expect(mockClick).toHaveBeenCalled()
      })

      // Reset mocks
      mockClick.mockClear()
      mockDownloadFile.mockClear()

      // 3. Download all assets
      const downloadAllBtn = screen.getByRole('button', {
        name: /下載所有素材/i,
      })
      await user.click(downloadAllBtn)

      await waitFor(() => {
        expect(mockDownloadFile).toHaveBeenCalled()
        expect(mockClick).toHaveBeenCalled()
      })
    })
  })

  describe('測試 5: 下載進度顯示', () => {
    it('下載大檔案時應該顯示進度', async () => {
      const { user } = setup()

      const mockResult = {
        id: 'project-123',
        project_name: '測試專案',
        status: 'completed',
        youtube_video_id: 'test',
      }

      mockGetProjectResult.mockResolvedValue(mockResult)

      // Mock download with progress
      let resolveDownload: any
      const downloadPromise = new Promise((resolve) => {
        resolveDownload = resolve
      })

      mockDownloadFile.mockImplementation((projectId, onDownloadProgress) => {
        // Simulate immediate progress event
        onDownloadProgress({ loaded: 25, total: 100 })

        // Return pending promise
        return downloadPromise
      })

      // Mock URL and download trigger
      global.URL.createObjectURL = jest.fn(() => 'blob:mock-url')
      const mockClick = jest.fn()
      const originalCreateElement = document.createElement.bind(document)
      document.createElement = jest.fn((tagName: string) => {
        if (tagName === 'a') {
          const mockLink = originalCreateElement('a')
          mockLink.click = mockClick
          return mockLink
        }
        return originalCreateElement(tagName)
      })

      render(<ResultPage params={{ id: 'project-123' }} />)

      await waitFor(() => {
        expect(screen.getByText('測試專案')).toBeInTheDocument()
      })

      const downloadBtn = screen.getByRole('button', { name: /下載影片/i })
      await user.click(downloadBtn)

      // Verify progress shown
      await waitFor(() => {
        expect(screen.getByText(/下載中 25%/i)).toBeInTheDocument()
      })

      // Complete download
      resolveDownload({ data: new Blob(['test']) })

      // Verify completion
      await waitFor(() => {
        expect(screen.queryByText(/下載中/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('測試 6: 排程發布資訊顯示', () => {
    it('排程發布應該顯示排程時間', async () => {
      const mockResult = {
        id: 'project-123',
        project_name: '測試專案',
        publish_type: 'scheduled',
        scheduled_date: '2025-10-25T10:00:00Z',
        privacy: 'public',
        status: 'completed',
        youtube_video_id: 'test-video',
      }

      mockGetProjectResult.mockResolvedValue(mockResult)

      render(<ResultPage params={{ id: 'project-123' }} />)

      // Verify scheduled badge
      await waitFor(() => {
        expect(screen.getByText('已排程')).toBeInTheDocument()
      })

      // Verify scheduled time label exists
      expect(screen.getByText(/排程時間/i)).toBeInTheDocument()

      // Verify scheduled time value (more specific selector)
      const scheduledTimeSection = screen.getByText(/排程時間/i).closest('div')
      expect(scheduledTimeSection).toHaveTextContent(/2025/)
    })
  })

  describe('測試 7: 錯誤狀態處理', () => {
    it('專案未完成時應該顯示錯誤訊息', async () => {
      const mockResult = {
        id: 'project-123',
        project_name: '測試專案',
        status: 'processing',
      }

      mockGetProjectResult.mockResolvedValue(mockResult)

      render(<ResultPage params={{ id: 'project-123' }} />)

      await waitFor(() => {
        expect(
          screen.getByText(/專案尚未完成，無法查看結果/i)
        ).toBeInTheDocument()
      })

      expect(
        screen.getByRole('button', { name: /返回主控台/i })
      ).toBeInTheDocument()

      // Should not show result content
      expect(screen.queryByTestId('youtube-player')).not.toBeInTheDocument()
      expect(
        screen.queryByTestId('local-video-player')
      ).not.toBeInTheDocument()
    })

    it('找不到專案時應該顯示 404', async () => {
      mockGetProjectResult.mockRejectedValue({
        response: { status: 404 },
      })

      render(<ResultPage params={{ id: 'non-existent' }} />)

      await waitFor(() => {
        expect(screen.getByText(/找不到專案/i)).toBeInTheDocument()
      })

      expect(
        screen.getByRole('button', { name: /返回主控台/i })
      ).toBeInTheDocument()
    })
  })

  describe('測試 8: 操作按鈕功能', () => {
    it('操作按鈕應該正確導航', async () => {
      const { user } = setup()

      const mockResult = {
        id: 'project-123',
        project_name: '測試專案',
        youtube_video_id: 'dQw4w9WgXcQ',
        youtube_url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
        status: 'completed',
      }

      mockGetProjectResult.mockResolvedValue(mockResult)

      // Mock window.open
      global.open = jest.fn()

      render(<ResultPage params={{ id: 'project-123' }} />)

      await waitFor(() => {
        expect(screen.getByText('測試專案')).toBeInTheDocument()
      })

      // 1. Test "編輯 YouTube 資訊" button
      const editYouTubeBtn = screen.getByRole('button', {
        name: /編輯 YouTube 資訊/i,
      })
      await user.click(editYouTubeBtn)

      expect(global.open).toHaveBeenCalledWith(
        'https://studio.youtube.com/video/dQw4w9WgXcQ/edit',
        '_blank'
      )

      // 2. Test "生成新影片" button
      const newProjectBtn = screen.getByRole('button', { name: /生成新影片/i })
      await user.click(newProjectBtn)

      expect(mockPush).toHaveBeenCalledWith('/project/new')

      // Reset
      mockPush.mockClear()

      // 3. Test "返回主控台" button
      const backBtn = screen.getByRole('button', { name: /返回主控台/i })
      await user.click(backBtn)

      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  describe('測試 9: 完整結果頁面流程 (整合測試)', () => {
    it('應該能從進度監控頁查看結果', async () => {
      const { user } = setup()

      // Mock initial progress state (simulating from progress page)
      const mockResult = {
        id: 'project-123',
        project_name: '整合測試專案',
        youtube_video_id: 'test-video-id',
        youtube_url: 'https://youtube.com/watch?v=test-video-id',
        youtube_title: '整合測試影片',
        youtube_description: '這是整合測試的描述',
        youtube_tags: ['整合', '測試', 'E2E'],
        privacy: 'public',
        publish_type: 'immediate',
        published_at: '2025-10-22T10:00:00Z',
        status: 'completed',
      }

      mockGetProjectResult.mockResolvedValue(mockResult)

      // Simulate navigation from progress page (project just completed)
      // In real scenario, user would click "查看結果" from progress page
      render(<ResultPage params={{ id: 'project-123' }} />)

      // Wait for result to load
      await waitFor(() => {
        expect(mockGetProjectResult).toHaveBeenCalledWith('project-123')
      })

      // Verify success message displayed
      await waitFor(() => {
        expect(
          screen.getByText('影片已成功生成並上傳到 YouTube！')
        ).toBeInTheDocument()
      })

      // Verify project name displayed
      expect(screen.getByText('整合測試專案')).toBeInTheDocument()

      // Verify video info section
      expect(screen.getByText('整合測試影片')).toBeInTheDocument()
      expect(screen.getByText('這是整合測試的描述')).toBeInTheDocument()
      expect(screen.getByText('整合')).toBeInTheDocument()
      expect(screen.getByText('測試')).toBeInTheDocument()

      // Verify YouTube player is rendered
      const youtubePlayer = screen.getByTestId('youtube-player')
      expect(youtubePlayer).toBeInTheDocument()
      expect(youtubePlayer).toHaveAttribute(
        'src',
        expect.stringContaining('test-video-id')
      )

      // Verify download buttons are present
      expect(screen.getByRole('button', { name: /下載影片/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /下載封面/i })).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /下載所有素材/i })
      ).toBeInTheDocument()

      // Verify action buttons
      expect(
        screen.getByRole('button', { name: /編輯 YouTube 資訊/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /生成新影片/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /返回主控台/i })
      ).toBeInTheDocument()

      // Test complete workflow: download a file
      global.URL.createObjectURL = jest.fn(() => 'blob:mock-url')
      global.URL.revokeObjectURL = jest.fn()
      const mockClick = jest.fn()
      const originalCreateElement = document.createElement.bind(document)
      document.createElement = jest.fn((tagName: string) => {
        if (tagName === 'a') {
          const mockLink = originalCreateElement('a')
          mockLink.click = mockClick
          return mockLink
        }
        return originalCreateElement(tagName)
      })

      mockDownloadFile.mockResolvedValue({ data: new Blob(['test']) })

      const downloadVideoBtn = screen.getByRole('button', { name: /下載影片/i })
      await user.click(downloadVideoBtn)

      await waitFor(() => {
        expect(mockDownloadFile).toHaveBeenCalled()
        expect(mockClick).toHaveBeenCalled()
      })

      // Test navigation: return to dashboard
      const backBtn = screen.getByRole('button', { name: /返回主控台/i })
      await user.click(backBtn)

      expect(mockPush).toHaveBeenCalledWith('/')
    })

    it('應該正確顯示私人影片和公開影片的不同播放器', async () => {
      // Test 1: Private video should show local player
      const privateResult = {
        id: 'project-private',
        project_name: '私人影片測試',
        privacy: 'private',
        local_video_url: '/api/v1/projects/project-private/video',
        status: 'completed',
      }

      mockGetProjectResult.mockResolvedValue(privateResult)

      const { unmount } = render(<ResultPage params={{ id: 'project-private' }} />)

      // Verify local player shown for private video
      await waitFor(() => {
        expect(screen.getByTestId('local-video-player')).toBeInTheDocument()
      })

      // Verify YouTube player NOT shown
      expect(screen.queryByTestId('youtube-player')).not.toBeInTheDocument()

      // Clean up first render
      unmount()

      // Test 2: Public video should show YouTube player
      const publicResult = {
        id: 'project-public',
        project_name: '公開影片測試',
        privacy: 'public',
        youtube_video_id: 'public-video-id',
        youtube_url: 'https://youtube.com/watch?v=public-video-id',
        status: 'completed',
      }

      mockGetProjectResult.mockResolvedValue(publicResult)

      render(<ResultPage params={{ id: 'project-public' }} />)

      // Verify YouTube player shown for public video
      await waitFor(() => {
        expect(screen.getByTestId('youtube-player')).toBeInTheDocument()
      })

      // Verify local player NOT shown
      expect(screen.queryByTestId('local-video-player')).not.toBeInTheDocument()
    })
  })
})
