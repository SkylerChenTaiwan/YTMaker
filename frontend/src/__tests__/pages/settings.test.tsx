import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import SettingsPage from '@/app/settings/page'
import { systemApi } from '@/lib/api/system'
import { youtubeApi } from '@/lib/api/youtube'
import { message, Modal } from 'antd'

// Mock the layout components
jest.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

jest.mock('@/components/layout/Breadcrumb', () => ({
  Breadcrumb: () => <div>Breadcrumb</div>,
}))

// Mock API modules
jest.mock('@/lib/api/system')
jest.mock('@/lib/api/youtube')

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

// Mock window.open for OAuth tests
global.open = jest.fn()

// Mock URL.createObjectURL and revokeObjectURL for export tests
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = jest.fn()

// Mock document.createElement for export tests
const mockClick = jest.fn()
const originalCreateElement = document.createElement.bind(document)
document.createElement = jest.fn((tagName) => {
  const element = originalCreateElement(tagName)
  if (tagName === 'a') {
    element.click = mockClick
  }
  return element
})

describe('SettingsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Close any open modals
    document.body.innerHTML = ''

    // Default mocks
    ;(systemApi.getAPIKeys as jest.Mock).mockResolvedValue({
      gemini: null,
      stability_ai: null,
      did: null,
    })
    ;(systemApi.getQuotas as jest.Mock).mockResolvedValue({
      did: null,
      youtube: null,
    })
    ;(systemApi.getPreferences as jest.Mock).mockResolvedValue({
      voice_gender: 'male',
      voice_speed: 1.0,
      default_privacy: 'public',
      project_retention_days: -1,
      keep_intermediate_files: true,
      notification_on_complete: true,
      notification_on_error: true,
    })
    ;(systemApi.clearCache as jest.Mock) = jest.fn().mockResolvedValue({ success: true })
    ;(systemApi.resetSettings as jest.Mock) = jest.fn().mockResolvedValue({ success: true })
    ;(youtubeApi.getChannels as jest.Mock).mockResolvedValue([])
  })

  describe('測試 1：Tab 切換功能', () => {
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

  describe('測試 2：API Key 新增與測試連線', () => {
    it('應該正確儲存 API Key 並測試連線', async () => {
      const user = userEvent.setup()

      ;(systemApi.testAPIKey as jest.Mock).mockResolvedValue({
        is_valid: true,
        message: '連線成功',
      })
      ;(systemApi.saveAPIKey as jest.Mock).mockResolvedValue({
        success: true,
      })

      render(<SettingsPage />)

      // 等待頁面載入
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'API 金鑰' })).toBeInTheDocument()
      })

      // 點擊第一個「編輯」按鈕（Google Gemini）
      const editButtons = screen.getAllByRole('button', { name: /編\s*輯/ })
      await user.click(editButtons[0])

      // 等待 Modal 開啟
      let modal: HTMLElement
      await waitFor(() => {
        modal = screen.getByRole('dialog')
        expect(modal).toBeInTheDocument()
      })

      // 在 Modal 內部查詢元素
      const modalQueries = within(modal!)

      // 輸入 API Key
      const input = modalQueries.getByPlaceholderText('輸入 API Key')
      await user.type(input, 'test-api-key-123')

      // 點擊測試連線
      const testButton = modalQueries.getByRole('button', { name: '測試連線' })
      await user.click(testButton)

      // 驗證 API 被調用
      await waitFor(() => {
        expect(systemApi.testAPIKey).toHaveBeenCalledWith('gemini', 'test-api-key-123')
      })

      // 驗證成功訊息顯示
      await waitFor(() => {
        expect(modalQueries.getByText(/連線成功/)).toBeInTheDocument()
      })

      // 點擊儲存
      const saveButton = modalQueries.getByRole('button', { name: /儲\s*存/ })
      await user.click(saveButton)

      // 驗證儲存 API 被調用
      await waitFor(() => {
        expect(systemApi.saveAPIKey).toHaveBeenCalledWith('gemini', 'test-api-key-123')
        expect(message.success).toHaveBeenCalledWith('API Key 已儲存')
      })
    })
  })

  describe('測試 3：API Key 測試失敗處理', () => {
    it('應該正確處理 API Key 測試失敗', async () => {
      const user = userEvent.setup()

      ;(systemApi.testAPIKey as jest.Mock).mockRejectedValue(
        new Error('API Key 無效或已過期')
      )

      render(<SettingsPage />)

      // 等待頁面載入
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'API 金鑰' })).toBeInTheDocument()
      })

      // 點擊編輯按鈕
      const editButtons = screen.getAllByRole('button', { name: /編\s*輯/ })
      await user.click(editButtons[0])

      // 等待 Modal 開啟
      let modal: HTMLElement
      await waitFor(() => {
        modal = screen.getByRole('dialog')
      })

      // 在 Modal 內部查詢元素
      const modalQueries = within(modal!)

      // 輸入無效的 API Key
      const input = modalQueries.getByPlaceholderText('輸入 API Key')
      await user.type(input, 'invalid-key')

      // 點擊測試連線
      const testButton = modalQueries.getByRole('button', { name: '測試連線' })
      await user.click(testButton)

      // 驗證錯誤訊息顯示
      await waitFor(() => {
        expect(modalQueries.getByText(/API Key 無效或已過期/)).toBeInTheDocument()
      })

      // 驗證儲存按鈕仍然可用
      const saveButton = modalQueries.getByRole('button', { name: /儲\s*存/ })
      expect(saveButton).not.toBeDisabled()
    })
  })

  describe('測試 4：API 配額顯示', () => {
    it('應該正確顯示 API 配額並顯示警告', async () => {
      ;(systemApi.getQuotas as jest.Mock).mockResolvedValue({
        did: {
          used_minutes: 75,
          total_minutes: 90,
          usage_percent: 83.3,
          reset_date: '2025-11-01',
        },
        youtube: {
          used_units: 9500,
          total_units: 10000,
          usage_percent: 95,
          reset_date: '2025-10-20',
        },
      })

      render(<SettingsPage />)

      // 等待配額資訊載入
      await waitFor(() => {
        expect(screen.getByText('API 配額')).toBeInTheDocument()
      })

      // 驗證 D-ID 配額顯示
      expect(screen.getByText('D-ID')).toBeInTheDocument()
      expect(screen.getByText(/75.*\/.*90.*分鐘/)).toBeInTheDocument()

      // 驗證 YouTube 配額顯示
      expect(screen.getByText('YouTube')).toBeInTheDocument()
      expect(screen.getByText(/9,500.*\/.*10,000.*units/)).toBeInTheDocument()

      // 驗證警告訊息顯示（配額 > 80%）
      const warnings = screen.getAllByText(/配額即將用盡，請注意使用/)
      expect(warnings.length).toBeGreaterThan(0)
    })
  })

  describe('測試 5：YouTube 授權流程', () => {
    it('應該正確執行 YouTube 授權流程', async () => {
      const user = userEvent.setup()
      const mockAuthWindow = { closed: false }

      ;(window.open as jest.Mock).mockReturnValue(mockAuthWindow)
      ;(youtubeApi.startAuth as jest.Mock).mockResolvedValue({
        auth_url: 'https://accounts.google.com/oauth',
      })

      render(<SettingsPage />)

      // 切換到 YouTube 授權 Tab
      const youtubeTab = screen.getByRole('tab', { name: 'YouTube 授權' })
      await user.click(youtubeTab)

      // 等待 Tab 內容載入
      await waitFor(() => {
        expect(screen.getByText('連結新的 YouTube 帳號')).toBeInTheDocument()
      })

      // 點擊連結帳號按鈕
      const connectButton = screen.getByRole('button', { name: '連結新的 YouTube 帳號' })
      await user.click(connectButton)

      // 驗證 OAuth API 被調用
      await waitFor(() => {
        expect(youtubeApi.startAuth).toHaveBeenCalled()
      })

      // 驗證 window.open 被調用
      expect(window.open).toHaveBeenCalledWith(
        'https://accounts.google.com/oauth',
        'YouTube Authorization',
        'width=600,height=700'
      )
    })
  })

  describe('測試 6：移除 YouTube 授權', () => {
    it('應該正確移除 YouTube 授權', async () => {
      const user = userEvent.setup()

      ;(youtubeApi.getChannels as jest.Mock).mockResolvedValue([
        {
          id: 'channel-1',
          name: '我的頻道',
          thumbnail: 'https://example.com/thumb.jpg',
          subscriber_count: 10000,
          authorized_at: '2025-10-19T10:45:00Z',
          auth_status: 'active',
        },
      ])
      ;(youtubeApi.removeChannel as jest.Mock).mockResolvedValue({ success: true })

      // Mock Modal.confirm
      const mockConfirm = jest.spyOn(Modal, 'confirm').mockImplementation((config: any) => {
        // 立即執行 onOk
        if (config.onOk) {
          config.onOk()
        }
        return {} as any
      })

      render(<SettingsPage />)

      // 切換到 YouTube 授權 Tab
      const youtubeTab = screen.getByRole('tab', { name: 'YouTube 授權' })
      await user.click(youtubeTab)

      // 等待頻道卡片載入
      await waitFor(() => {
        expect(screen.getByText('我的頻道')).toBeInTheDocument()
      })

      // 點擊移除授權按鈕
      const removeButton = screen.getByRole('button', { name: '移除授權' })
      await user.click(removeButton)

      // 驗證確認對話框被調用
      expect(mockConfirm).toHaveBeenCalled()

      // 驗證 API 被調用
      await waitFor(() => {
        expect(youtubeApi.removeChannel).toHaveBeenCalledWith('channel-1')
        expect(message.success).toHaveBeenCalledWith('授權已移除')
      })

      mockConfirm.mockRestore()
    })
  })

  describe('測試 7：偏好設定儲存', () => {
    it('應該正確儲存偏好設定', async () => {
      const user = userEvent.setup()

      ;(systemApi.savePreferences as jest.Mock).mockResolvedValue({ success: true })

      render(<SettingsPage />)

      // 切換到偏好設定 Tab
      const preferencesTab = screen.getByRole('tab', { name: '偏好設定' })
      await user.click(preferencesTab)

      // 等待 Tab 內容載入
      await waitFor(() => {
        expect(screen.getByText('預設語音性別')).toBeInTheDocument()
      })

      // 點擊儲存按鈕（不需要實際修改值，因為預設值已經存在）
      const saveButton = screen.getByRole('button', { name: '儲存變更' })
      await user.click(saveButton)

      // 驗證 API 被調用
      await waitFor(() => {
        expect(systemApi.savePreferences).toHaveBeenCalled()
        expect(message.success).toHaveBeenCalledWith('設定已儲存')
      })
    })
  })

  describe('測試 8：清除所有專案資料', () => {
    it('應該要求確認文字才能清除資料', async () => {
      const user = userEvent.setup()

      ;(systemApi.clearAllData as jest.Mock).mockResolvedValue({ success: true })

      render(<SettingsPage />)

      // 切換到偏好設定 Tab
      const preferencesTab = screen.getByRole('tab', { name: '偏好設定' })
      await user.click(preferencesTab)

      // 點擊清除所有專案資料按鈕
      const clearButton = screen.getByRole('button', { name: '清除所有專案資料' })
      await user.click(clearButton)

      // 等待 Modal 出現
      await waitFor(() => {
        expect(screen.getByText('確認清除所有專案資料')).toBeInTheDocument()
      })

      // 確認刪除按鈕應該是禁用的
      const confirmButton = screen.getByRole('button', { name: '確認刪除' })
      expect(confirmButton).toBeDisabled()

      // 輸入確認文字
      const input = screen.getByPlaceholderText('DELETE ALL')
      await user.type(input, 'DELETE ALL')

      // 確認按鈕應該變成可用
      await waitFor(() => {
        expect(confirmButton).not.toBeDisabled()
      })

      // 點擊確認刪除
      await user.click(confirmButton)

      // 驗證 API 被調用
      await waitFor(() => {
        expect(systemApi.clearAllData).toHaveBeenCalled()
        expect(message.success).toHaveBeenCalledWith('所有資料已清除')
      })
    })
  })

  describe('測試 9：資料匯出功能', () => {
    it('應該正確匯出資料為 JSON 檔案', async () => {
      const user = userEvent.setup()

      const mockExportData = {
        export_date: '2025-10-19T12:00:00Z',
        projects: [{ id: '1', name: 'Test Project' }],
        configurations: [],
        templates: [],
      }

      ;(systemApi.exportData as jest.Mock).mockResolvedValue(mockExportData)

      render(<SettingsPage />)

      // 切換到偏好設定 Tab
      const preferencesTab = screen.getByRole('tab', { name: '偏好設定' })
      await user.click(preferencesTab)

      // 點擊匯出按鈕
      const exportButton = screen.getByRole('button', { name: '匯出所有專案資料' })
      await user.click(exportButton)

      // 驗證 API 被調用
      await waitFor(() => {
        expect(systemApi.exportData).toHaveBeenCalled()
      })

      // 驗證檔案下載流程
      expect(URL.createObjectURL).toHaveBeenCalled()
      expect(mockClick).toHaveBeenCalled()
      expect(URL.revokeObjectURL).toHaveBeenCalled()
      expect(message.success).toHaveBeenCalledWith('資料已匯出')
    })
  })

  describe('測試 10：資料匯入功能', () => {
    it('應該正確匯入 JSON 檔案', async () => {
      const user = userEvent.setup()

      const mockImportResult = {
        imported_projects: 1,
        imported_configurations: 0,
        imported_templates: 0,
      }

      ;(systemApi.importData as jest.Mock).mockResolvedValue(mockImportResult)

      render(<SettingsPage />)

      // 切換到偏好設定 Tab
      const preferencesTab = screen.getByRole('tab', { name: '偏好設定' })
      await user.click(preferencesTab)

      // 點擊匯入按鈕
      const importButton = screen.getByRole('button', { name: '匯入專案資料' })
      await user.click(importButton)

      // 模擬檔案選擇
      const fileInput = document.getElementById('import-file') as HTMLInputElement
      const file = new File(
        [JSON.stringify({ projects: [{ id: '1', name: 'Test' }] })],
        'export.json',
        { type: 'application/json' }
      )

      Object.defineProperty(fileInput, 'files', {
        value: [file],
      })

      fireEvent.change(fileInput)

      // 驗證 API 被調用
      await waitFor(() => {
        expect(systemApi.importData).toHaveBeenCalled()
        expect(message.success).toHaveBeenCalledWith(
          expect.stringContaining('匯入成功：1 個專案')
        )
      })
    })
  })

  describe('測試 11：完整設定流程（E2E）', () => {
    it('應該完成完整的系統設定流程', async () => {
      const user = userEvent.setup()

      // Mock 所有 API
      ;(systemApi.getAPIKeys as jest.Mock).mockResolvedValue({
        gemini: 'test-key-123',
        stability_ai: null,
        did: null,
      })
      ;(systemApi.testAPIKey as jest.Mock).mockResolvedValue({
        is_valid: true,
        message: '連線成功',
      })
      ;(systemApi.saveAPIKey as jest.Mock).mockResolvedValue({ success: true })
      ;(systemApi.getQuotas as jest.Mock).mockResolvedValue({
        did: { used_minutes: 50, total_minutes: 90, usage_percent: 55.5, reset_date: '2025-11-01' },
      })
      ;(youtubeApi.getChannels as jest.Mock).mockResolvedValue([
        {
          id: 'channel-1',
          name: '我的頻道',
          thumbnail: 'https://example.com/thumb.jpg',
          subscriber_count: 10000,
          authorized_at: '2025-10-19T10:45:00Z',
        },
      ])
      ;(systemApi.savePreferences as jest.Mock).mockResolvedValue({ success: true })

      render(<SettingsPage />)

      // 步驟 1: 驗證 API 金鑰 Tab 已載入
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'API 金鑰' })).toBeInTheDocument()
        expect(screen.getByText('Google Gemini API')).toBeInTheDocument()
      })

      // 步驟 2: 切換到 YouTube 授權 Tab
      const youtubeTab = screen.getByRole('tab', { name: 'YouTube 授權' })
      await user.click(youtubeTab)

      await waitFor(() => {
        expect(screen.getByText('我的頻道')).toBeInTheDocument()
      })

      // 步驟 3: 切換到偏好設定 Tab
      const preferencesTab = screen.getByRole('tab', { name: '偏好設定' })
      await user.click(preferencesTab)

      await waitFor(() => {
        expect(screen.getByText('預設語音性別')).toBeInTheDocument()
      })

      // 步驟 4: 儲存偏好設定
      const saveButton = screen.getByRole('button', { name: '儲存變更' })
      await user.click(saveButton)

      await waitFor(() => {
        expect(message.success).toHaveBeenCalledWith('設定已儲存')
      })

      // 驗證所有 API 都被正確調用
      expect(systemApi.getAPIKeys).toHaveBeenCalled()
      expect(systemApi.getQuotas).toHaveBeenCalled()
      expect(youtubeApi.getChannels).toHaveBeenCalled()
      expect(systemApi.getPreferences).toHaveBeenCalled()
    })
  })

  describe('額外覆蓋率測試', () => {
    it('應該能清除快取', async () => {
      const user = userEvent.setup()

      ;(systemApi.clearCache as jest.Mock) = jest.fn().mockResolvedValue({ success: true })
      const confirmSpy = jest.spyOn(Modal, 'confirm')

      render(<SettingsPage />)

      // 切換到偏好設定 Tab
      const preferencesTab = screen.getByRole('tab', { name: '偏好設定' })
      await user.click(preferencesTab)

      // 點擊清除快取按鈕
      const clearCacheButton = screen.getByRole('button', { name: /清除所有快取/ })
      await user.click(clearCacheButton)

      // 驗證顯示確認對話框
      expect(confirmSpy).toHaveBeenCalled()

      // 模擬確認
      const confirmCall = confirmSpy.mock.calls[0][0]
      await confirmCall.onOk?.()

      // 驗證 API 被調用
      await waitFor(() => {
        expect(systemApi.clearCache).toHaveBeenCalled()
        expect(message.success).toHaveBeenCalledWith('快取已清除')
      })

      confirmSpy.mockRestore()
    })

    it('應該能重置設定', async () => {
      const user = userEvent.setup()

      ;(systemApi.resetSettings as jest.Mock) = jest.fn().mockResolvedValue({ success: true })
      const confirmSpy = jest.spyOn(Modal, 'confirm')

      render(<SettingsPage />)

      // 切換到偏好設定 Tab
      const preferencesTab = screen.getByRole('tab', { name: '偏好設定' })
      await user.click(preferencesTab)

      // 點擊重置設定按鈕
      const resetButton = screen.getByRole('button', { name: /重置所有設定/ })
      await user.click(resetButton)

      // 驗證顯示確認對話框
      expect(confirmSpy).toHaveBeenCalled()

      // 模擬確認
      const confirmCall = confirmSpy.mock.calls[0][0]
      await confirmCall.onOk?.()

      // 驗證 API 被調用
      await waitFor(() => {
        expect(systemApi.resetSettings).toHaveBeenCalled()
        expect(message.success).toHaveBeenCalledWith('設定已重置')
      })

      confirmSpy.mockRestore()
    })

    it('應該處理資料導出錯誤', async () => {
      const user = userEvent.setup()

      ;(systemApi.exportData as jest.Mock).mockRejectedValue(new Error('導出失敗'))

      render(<SettingsPage />)

      // 切換到偏好設定 Tab
      const preferencesTab = screen.getByRole('tab', { name: '偏好設定' })
      await user.click(preferencesTab)

      // 點擊匯出按鈕
      const exportButton = screen.getByRole('button', { name: /匯出所有專案資料/ })
      await user.click(exportButton)

      // 驗證錯誤訊息
      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('導出失敗')
      })
    })

    it('應該處理資料導入錯誤', async () => {
      const user = userEvent.setup()

      ;(systemApi.importData as jest.Mock).mockRejectedValue(new Error('導入失敗'))

      render(<SettingsPage />)

      // 切換到偏好設定 Tab
      const preferencesTab = screen.getByRole('tab', { name: '偏好設定' })
      await user.click(preferencesTab)

      // 模擬檔案上傳
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File([JSON.stringify({ test: 'data' })], 'test.json', {
        type: 'application/json',
      })
      Object.defineProperty(fileInput, 'files', {
        value: [file],
      })

      fireEvent.change(fileInput)

      // 驗證錯誤訊息
      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('導入失敗')
      })
    })

    it('應該處理未設定 API Key 的測試連線', async () => {
      const user = userEvent.setup()

      // API Keys 都是 null
      ;(systemApi.getAPIKeys as jest.Mock).mockResolvedValue({
        gemini: null,
        stability_ai: null,
        did: null,
      })

      render(<SettingsPage />)

      await waitFor(() => {
        expect(screen.getByText('Google Gemini API')).toBeInTheDocument()
      })

      // 直接點擊測試連線（沒有設定 API Key）
      const testButtons = screen.getAllByRole('button', { name: '測試連線' })
      await user.click(testButtons[0])

      // 驗證錯誤訊息
      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('請先設定 API Key')
      })
    })
  })
})
