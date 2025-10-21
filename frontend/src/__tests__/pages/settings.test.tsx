import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import SettingsPage from '@/app/settings/page'

// Mock the layout components
jest.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

jest.mock('@/components/layout/Breadcrumb', () => ({
  Breadcrumb: () => <div>Breadcrumb</div>,
}))

// Mock API modules
jest.mock('@/lib/api/system', () => ({
  systemApi: {
    getAPIKeys: jest.fn().mockResolvedValue({
      gemini: null,
      stability_ai: null,
      did: null,
    }),
    getQuotas: jest.fn().mockResolvedValue({
      did: null,
      youtube: null,
    }),
    testAPIKey: jest.fn().mockResolvedValue({ is_valid: true, message: '連線成功' }),
    saveAPIKey: jest.fn().mockResolvedValue({ success: true }),
    deleteAPIKey: jest.fn().mockResolvedValue({ success: true }),
    getPreferences: jest.fn().mockResolvedValue({
      voice_gender: 'male',
      voice_speed: 1.0,
      default_privacy: 'public',
      project_retention_days: -1,
      keep_intermediate_files: true,
      notification_on_complete: true,
      notification_on_error: true,
    }),
    savePreferences: jest.fn().mockResolvedValue({ success: true }),
  },
}))

jest.mock('@/lib/api/youtube', () => ({
  youtubeApi: {
    startAuth: jest.fn().mockResolvedValue({ auth_url: 'https://example.com/auth' }),
    getChannels: jest.fn().mockResolvedValue([]),
    removeChannel: jest.fn().mockResolvedValue({ success: true }),
  },
}))

// Mock Ant Design message
jest.mock('antd', () => {
  const actual = jest.requireActual('antd')
  return {
    ...actual,
    message: {
      success: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      warning: jest.fn(),
    },
  }
})

describe('SettingsPage', () => {
  describe('Tab 切換功能', () => {
    it('應該正確切換 Tab 並顯示對應內容', async () => {
      render(<SettingsPage />)

      // 預設顯示 API 金鑰 Tab
      await waitFor(() => {
        const apiTab = screen.getByRole('tab', { name: 'API 金鑰' })
        expect(apiTab).toHaveAttribute('aria-selected', 'true')
      })

      // 點擊 YouTube 授權 Tab
      const youtubeTab = screen.getByRole('tab', { name: 'YouTube 授權' })
      fireEvent.click(youtubeTab)
      await waitFor(() => {
        expect(screen.getByText('連結新的 YouTube 帳號')).toBeInTheDocument()
      })

      // 點擊偏好設定 Tab
      const preferencesTab = screen.getByRole('tab', { name: '偏好設定' })
      fireEvent.click(preferencesTab)
      await waitFor(() => {
        expect(screen.getByText('預設語音性別')).toBeInTheDocument()
      })
    })

    it('應該正確顯示 Tab 標籤', async () => {
      render(<SettingsPage />)

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'API 金鑰' })).toBeInTheDocument()
        expect(screen.getByRole('tab', { name: 'YouTube 授權' })).toBeInTheDocument()
        expect(screen.getByRole('tab', { name: '偏好設定' })).toBeInTheDocument()
      })
    })

    it('應該顯示頁面標題', async () => {
      render(<SettingsPage />)

      await waitFor(() => {
        expect(screen.getByText('系統設定')).toBeInTheDocument()
      })
    })
  })
})
