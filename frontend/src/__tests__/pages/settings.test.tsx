import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import SettingsPage from '@/app/settings/page'

// Mock the layout components
jest.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

jest.mock('@/components/layout/Breadcrumb', () => ({
  Breadcrumb: () => <div>Breadcrumb</div>,
}))

describe('SettingsPage', () => {
  describe('Tab 切換功能', () => {
    it('應該正確切換 Tab 並顯示對應內容', () => {
      render(<SettingsPage />)

      // 預設顯示 API 金鑰 Tab
      expect(screen.getByText('Google Gemini API')).toBeInTheDocument()

      // 點擊 YouTube 授權 Tab
      const youtubeTab = screen.getByText('YouTube 授權')
      fireEvent.click(youtubeTab)
      expect(screen.getByText('連結新的 YouTube 帳號')).toBeInTheDocument()

      // 點擊偏好設定 Tab
      const preferencesTab = screen.getByText('偏好設定')
      fireEvent.click(preferencesTab)
      expect(screen.getByText('預設語音性別')).toBeInTheDocument()
    })

    it('應該正確顯示 Tab 標籤', () => {
      render(<SettingsPage />)

      expect(screen.getByText('API 金鑰')).toBeInTheDocument()
      expect(screen.getByText('YouTube 授權')).toBeInTheDocument()
      expect(screen.getByText('偏好設定')).toBeInTheDocument()
    })

    it('應該顯示頁面標題', () => {
      render(<SettingsPage />)

      expect(screen.getByText('系統設定')).toBeInTheDocument()
    })
  })
})
