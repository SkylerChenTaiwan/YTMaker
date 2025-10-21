# 子任務 3: YouTube OAuth 授權步驟

> **優先級:** P0 (必須)
> **預估時間:** 2 小時
> **可並行:** ✅ 可以 (與子任務 1, 2 並行,但依賴 AuthStore)
> **依賴:** AuthStore (已完成), Modal 元件 (已完成)

---

## 目標

1. 實作 YouTube OAuth 授權元件
2. 處理 OAuth 回調訊息
3. 實作「稍後設定」功能
4. 撰寫並通過測試

---

## 需要建立的檔案

### 1. YouTube Auth Step 元件

#### `frontend/src/components/setup/steps/YouTubeAuthStep.tsx`

**功能:**
- 顯示「連結 YouTube 帳號」按鈕
- 開啟 OAuth 授權視窗
- 監聽 OAuth callback 訊息
- 顯示已連結狀態 (頻道名稱、頭像)
- 提供「變更頻道」功能
- 提供「稍後設定」功能 (顯示確認 Modal)

**程式碼骨架:**
```tsx
export const YouTubeAuthStep: React.FC = () => {
  const [showSkipModal, setShowSkipModal] = useState(false)
  const { youtube, setYouTubeAuth } = useAuthStore()

  // 監聽 OAuth callback
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // 安全檢查: 驗證 origin
      if (event.origin !== window.location.origin) {
        return
      }

      if (event.data.type === 'youtube-auth-success') {
        setYouTubeAuth({
          connected: true,
          channel_name: event.data.channel_name,
          channel_id: event.data.channel_id,
          thumbnail_url: event.data.thumbnail_url,
        })
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [setYouTubeAuth])

  const handleConnect = () => {
    const width = 600
    const height = 700
    const left = window.screen.width / 2 - width / 2
    const top = window.screen.height / 2 - height / 2

    window.open(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/youtube/auth`,
      'youtube-auth',
      `width=${width},height=${height},left=${left},top=${top}`
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">連結 YouTube 帳號</h2>
        <p className="text-gray-600">
          連結您的 YouTube 頻道以自動上傳影片
        </p>
      </div>

      {youtube.connected ? (
        {/* 已連結狀態 */}
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center">
            <img
              src={youtube.thumbnail_url}
              alt="頻道頭像"
              className="w-16 h-16 rounded-full"
            />
            <div className="ml-4 flex-1">
              <p className="font-medium text-gray-900">
                已連結：{youtube.channel_name}
              </p>
              <p className="text-sm text-gray-500">
                頻道 ID: {youtube.channel_id}
              </p>
            </div>
          </div>
          <Button
            variant="text"
            onClick={handleConnect}
            className="mt-3"
          >
            變更頻道
          </Button>
        </div>
      ) : (
        {/* 未連結狀態 */}
        <Button
          variant="primary"
          onClick={handleConnect}
          className="w-full"
        >
          連結 YouTube 帳號
        </Button>
      )}

      <button
        className="text-blue-500 hover:underline text-sm"
        onClick={() => setShowSkipModal(true)}
      >
        稍後設定
      </button>

      {/* 跳過確認 Modal */}
      <Modal
        visible={showSkipModal}
        title="跳過 YouTube 授權"
        onOk={() => {
          setShowSkipModal(false)
          // 這裡可以觸發導航到下一步的邏輯
          // 但實際導航應該由父元件處理
        }}
        onCancel={() => setShowSkipModal(false)}
        okText="確定"
        cancelText="取消"
      >
        <p>未連結 YouTube 帳號,您仍可生成影片但無法自動上傳</p>
      </Modal>
    </div>
  )
}
```

#### `frontend/tests/unit/components/setup/steps/YouTubeAuthStep.test.tsx`

**測試案例 (根據 Task 文件的測試 5):**

```tsx
describe('YouTubeAuthStep', () => {
  it('should initiate OAuth flow when click connect button', () => {
    const mockOpen = jest.spyOn(window, 'open').mockImplementation()

    render(<YouTubeAuthStep />)

    const connectButton = screen.getByText('連結 YouTube 帳號')
    fireEvent.click(connectButton)

    expect(mockOpen).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/youtube/auth'),
      'youtube-auth',
      expect.stringContaining('width=600,height=700')
    )
  })

  it('should display connected status after successful auth', async () => {
    render(<YouTubeAuthStep />)

    // 模擬 OAuth callback
    act(() => {
      window.dispatchEvent(new MessageEvent('message', {
        origin: window.location.origin,
        data: {
          type: 'youtube-auth-success',
          channel_name: '測試頻道',
          channel_id: 'UC123456',
          thumbnail_url: 'https://example.com/avatar.jpg'
        }
      }))
    })

    await waitFor(() => {
      expect(screen.getByText('已連結：測試頻道')).toBeInTheDocument()
      expect(screen.getByAltText('頻道頭像')).toHaveAttribute(
        'src',
        'https://example.com/avatar.jpg'
      )
      expect(screen.getByText('變更頻道')).toBeInTheDocument()
    })
  })

  it('should allow skip YouTube auth', () => {
    render(<YouTubeAuthStep />)

    fireEvent.click(screen.getByText('稍後設定'))

    // 顯示確認 Modal
    expect(
      screen.getByText(/未連結 YouTube 帳號,您仍可生成影片但無法自動上傳/i)
    ).toBeInTheDocument()

    fireEvent.click(screen.getByText('確定'))

    // Modal 應該關閉
    expect(
      screen.queryByText(/未連結 YouTube 帳號/i)
    ).not.toBeInTheDocument()
  })

  it('should ignore messages from different origins', () => {
    const mockSetYouTubeAuth = jest.fn()
    jest.spyOn(useAuthStore, 'getState').mockReturnValue({
      setYouTubeAuth: mockSetYouTubeAuth,
    } as any)

    render(<YouTubeAuthStep />)

    // 發送來自不同 origin 的訊息
    act(() => {
      window.dispatchEvent(new MessageEvent('message', {
        origin: 'https://evil.com',
        data: {
          type: 'youtube-auth-success',
          channel_name: 'Hacked',
        }
      }))
    })

    // 不應該更新狀態
    expect(mockSetYouTubeAuth).not.toHaveBeenCalled()
  })
})
```

---

## 實作步驟

### Step 1: 實作基本元件結構 (30 分鐘)
- 建立元件骨架
- 實作「連結」按鈕
- 實作 window.open 邏輯

### Step 2: 實作 OAuth 回調監聽 (40 分鐘)
- 設置 message event listener
- 驗證 origin 安全性
- 更新 Store 狀態
- 顯示已連結狀態

### Step 3: 實作「稍後設定」功能 (20 分鐘)
- 建立 Modal
- 處理跳過邏輯

### Step 4: 撰寫測試 (30 分鐘)
- 6 個測試案例
- Mock window.open
- Mock MessageEvent
- 確保測試通過

---

## 驗收標準

- [ ] YouTubeAuthStep: 6/6 測試通過
- [ ] OAuth 視窗正確開啟
- [ ] callback 訊息正確處理
- [ ] 已連結狀態正確顯示
- [ ] 「變更頻道」功能正常
- [ ] 「稍後設定」Modal 正常
- [ ] **安全性:** 驗證 message origin
- [ ] 無 TypeScript 錯誤

---

## 安全性注意事項

⚠️ **重要:** 必須驗證 `event.origin` 防止 XSS 攻擊

```tsx
// ✅ 正確
if (event.origin !== window.location.origin) {
  return
}

// ❌ 錯誤 (不驗證 origin)
if (event.data.type === 'youtube-auth-success') {
  // ...
}
```

---

## 完成後動作

```bash
git add frontend/src/components/setup/steps/YouTubeAuthStep.tsx
git add frontend/tests/unit/components/setup/steps/YouTubeAuthStep.test.tsx
git commit -m "feat: 實作 YouTube OAuth 授權步驟 [task-020]"
git push
```
