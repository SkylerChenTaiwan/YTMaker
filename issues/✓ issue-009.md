# [已解決] Issue-009: YouTube OAuth 授權流程完全失效

**建立日期：** 2025-10-23
**發現時機：** 使用者測試
**相關 Task：** Task-020 (YouTube 授權功能)
**類型：** Bug - 功能完全失效
**優先級：** P0 (緊急) - 核心功能無法使用

---

## 1. 問題描述

### 簡述
點擊「連結 YouTube 帳號」按鈕時，會再次啟動 3000 port（重新啟動應用程式），而非正確執行 OAuth 授權流程。

### 詳細說明
在 Setup 流程中（`YouTubeAuthStep.tsx`）或設定頁面中（`YouTubeAuthTab.tsx`），點擊連結 YouTube 按鈕後：
- **實際結果：** 開啟新視窗並再次啟動整個應用程式（port 3000）
- **預期結果：** 開啟 Google OAuth 授權頁面，完成授權後關閉視窗並更新狀態

### 發現時機
使用者在執行初始設定流程時發現。

---

## 2. 重現步驟

### 前置條件
- 應用程式正常啟動（frontend: 3000, backend: 8000）
- 未連結任何 YouTube 帳號

### 重現步驟
1. 開啟應用程式首頁
2. 進入 Setup 流程或 Settings 頁面
3. 點擊「連結 YouTube 帳號」按鈕
4. 觀察彈出視窗的行為

### 實際結果
- 彈出視窗開啟 `http://localhost:3000/api/v1/youtube/auth`
- Next.js 嘗試處理這個路由但找不到
- 視窗顯示 Next.js 應用程式首頁（重新載入）

### 預期結果
- 彈出視窗開啟 `http://localhost:8000/api/v1/youtube/auth-url` 取得 auth_url
- 重新導向到 Google OAuth 授權頁面
- 使用者完成授權
- 重新導向回 callback 頁面
- 前端接收到授權成功訊息並更新狀態

---

## 3. 影響評估

### 影響範圍
- ❌ Setup 流程中的 YouTube 授權步驟完全無法使用
- ❌ Settings 頁面的 YouTube 授權功能完全無法使用
- ❌ 使用者無法連結 YouTube 帳號
- ❌ 無法使用自動上傳 YouTube 功能
- ⚠️ 影響完整的產品核心流程

### 頻率
100% - 每次點擊都會發生

### 嚴重程度
**Critical (P0)** - 核心功能完全無法使用

### 替代方案
目前無替代方案，使用者完全無法連結 YouTube 帳號。

---

## 4. 根因分析

### 問題來源

經過程式碼分析，發現有**三個主要問題**：

#### 問題 1: `YouTubeAuthStep.tsx` 使用錯誤的 endpoint

**檔案：** `frontend/src/components/setup/steps/YouTubeAuthStep.tsx:44`

```typescript
window.open(
  `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/youtube/auth`,  // ❌ 錯誤
  'youtube-auth',
  `width=${width},height=${height},left=${left},top=${top}`
)
```

**問題：**
- 使用的 endpoint `/api/v1/youtube/auth` 在 backend 不存在
- `NEXT_PUBLIC_API_BASE_URL` 預設是 `http://localhost:3000`（前端），不是 backend
- 導致開啟前端應用程式而非 OAuth 頁面

#### 問題 2: `YouTubeAuthTab.tsx` 使用的 API 不完整

**檔案：** `frontend/src/components/settings/YouTubeAuthTab.tsx:29`

```typescript
const { auth_url } = await youtubeApi.startAuth()
```

**檢查 `frontend/src/lib/api/youtube.ts:7`：**
```typescript
async startAuth() {
  const res = await apiClient.post('/api/v1/youtube/auth/start')  // ❌ 錯誤
  return res.data.data
}
```

**問題：**
- Backend 的 endpoint 是 **`GET /api/v1/youtube/auth-url`**
- 前端呼叫的是 **`POST /api/v1/youtube/auth/start`**
- 完全不匹配，導致 API 呼叫失敗

#### 問題 3: Backend 缺少完整的 OAuth 流程 endpoints

**現有的 Backend Endpoints (`backend/app/api/v1/youtube.py`)：**
- ✅ `GET /youtube/auth-url` - 取得授權 URL
- ✅ `POST /youtube/auth-callback` - 處理 callback
- ✅ `GET /youtube/accounts` - 列出帳號
- ✅ `DELETE /youtube/accounts/{account_id}` - 刪除帳號

**缺少的：**
- ❌ `GET /youtube/auth` - 直接導向到 Google OAuth（應該要有）
- ❌ Callback 頁面路由（處理 Google 重新導向）

### 根本原因類型
**設計錯誤 + 實作不一致**

1. **前端與後端 API 設計不一致**
   - Frontend 期望的 endpoints 與 Backend 實作不匹配
   - 沒有統一的 API 規格文件約束

2. **缺少完整的 OAuth 流程實作**
   - 缺少 `/youtube/auth` endpoint 直接啟動流程
   - 缺少 callback 頁面處理 Google 重新導向

3. **環境變數配置錯誤**
   - `NEXT_PUBLIC_API_BASE_URL` 應該指向 backend (port 8000)
   - 但目前可能指向 frontend 自己 (port 3000)

---

## 5. 解決方案

### 方案概述
需要重新設計並實作完整的 YouTube OAuth 流程，確保前後端 API 一致。

### 詳細步驟

#### Step 1: 更新 Backend - 新增 OAuth 流程 endpoints

**檔案：** `backend/app/api/v1/youtube.py`

**新增兩個 endpoints：**

```python
@router.get("/auth")
async def start_auth(
    youtube_service: YouTubeAuthService = Depends(get_youtube_service),
):
    """
    啟動 YouTube OAuth 授權流程
    直接重新導向到 Google OAuth 頁面
    """
    auth_url = youtube_service.get_authorization_url()
    return RedirectResponse(url=auth_url)


@router.get("/callback")
async def oauth_callback(
    code: str,
    db: Session = Depends(get_db),
    youtube_service: YouTubeAuthService = Depends(get_youtube_service),
):
    """
    處理 Google OAuth callback
    儲存 token 後關閉視窗並通知 opener
    """
    try:
        account = await youtube_service.handle_oauth_callback(code, db)

        # 回傳 HTML 頁面，通知 opener 並關閉視窗
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>授權成功</title>
        </head>
        <body>
            <h1>授權成功！</h1>
            <p>正在關閉視窗...</p>
            <script>
                if (window.opener) {{
                    window.opener.postMessage({{
                        type: 'youtube-auth-success',
                        channel_name: '{account.channel_name}',
                        channel_id: '{account.channel_id}',
                        thumbnail_url: '{account.thumbnail_url}'
                    }}, window.location.origin);
                }}
                setTimeout(() => window.close(), 1000);
            </script>
        </body>
        </html>
        """
        return HTMLResponse(content=html_content)

    except ValueError as e:
        # 授權失敗
        error_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>授權失敗</title>
        </head>
        <body>
            <h1>授權失敗</h1>
            <p>{str(e)}</p>
            <button onclick="window.close()">關閉</button>
        </body>
        </html>
        """
        return HTMLResponse(content=error_html, status_code=400)
```

**需要匯入：**
```python
from fastapi.responses import RedirectResponse, HTMLResponse
```

#### Step 2: 修正 Frontend - YouTubeAuthStep

**檔案：** `frontend/src/components/setup/steps/YouTubeAuthStep.tsx`

**修正 `handleConnect` 函數：**

```typescript
const handleConnect = () => {
  const width = 600
  const height = 700
  const left = window.screen.width / 2 - width / 2
  const top = window.screen.height / 2 - height / 2

  // 修正：使用正確的 backend URL
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  window.open(
    `${backendUrl}/api/v1/youtube/auth`,  // ✅ 正確的 endpoint
    'youtube-auth',
    `width=${width},height=${height},left=${left},top=${top}`
  )
}
```

#### Step 3: 修正 Frontend - YouTubeAuthTab

**檔案：** `frontend/src/components/settings/YouTubeAuthTab.tsx`

**修正 `handleConnect` 函數：**

```typescript
const handleConnect = async () => {
  setIsConnecting(true)
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

    // 直接開啟 OAuth 視窗
    const authWindow = window.open(
      `${backendUrl}/api/v1/youtube/auth`,  // ✅ 直接使用 /auth endpoint
      'YouTube Authorization',
      'width=600,height=700'
    )

    // 監聽授權成功訊息
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return

      if (event.data.type === 'youtube-auth-success') {
        setIsConnecting(false)
        message.success('YouTube 帳號已連結')
        loadChannels()
        window.removeEventListener('message', handleMessage)
      }
    }

    window.addEventListener('message', handleMessage)

    // 輪詢檢查視窗是否關閉
    const checkAuth = setInterval(() => {
      if (authWindow?.closed) {
        clearInterval(checkAuth)
        setIsConnecting(false)
        window.removeEventListener('message', handleMessage)
      }
    }, 1000)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '授權失敗'
    message.error(errorMessage)
    setIsConnecting(false)
  }
}
```

#### Step 4: 移除不需要的 API 函數

**檔案：** `frontend/src/lib/api/youtube.ts`

**移除錯誤的 `startAuth`：**

```typescript
// ❌ 移除這個
async startAuth() {
  const res = await apiClient.post('/api/v1/youtube/auth/start')
  return res.data.data
}
```

或者保留並修正為：

```typescript
async startAuth() {
  // 只是回傳正確的 URL，實際上可以不需要這個函數
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  return { auth_url: `${backendUrl}/api/v1/youtube/auth` }
}
```

#### Step 5: 設定環境變數

**檔案：** `frontend/.env.local` (新增)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**檔案：** `frontend/.env.example` (更新文件)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

#### Step 6: 更新 Spec 文件

**需要更新的 spec：**
- `tech-specs/backend/api-youtube.md` - 新增 `/auth` 和 `/callback` endpoints
- `tech-specs/frontend/page-setup.md` - 更新 YouTube 授權流程說明
- `tech-specs/frontend/page-settings.md` - 更新 YouTube 授權流程說明

---

## 6. 測試計劃

### 單元測試

#### Backend 測試
**檔案：** `backend/tests/api/test_youtube.py`

新增測試：
```python
def test_auth_endpoint_redirects():
    """測試 /auth endpoint 正確重新導向"""
    response = client.get("/api/v1/youtube/auth")
    assert response.status_code == 307  # Redirect
    assert "accounts.google.com" in response.headers["location"]


def test_callback_returns_html():
    """測試 callback 回傳 HTML 並包含 postMessage"""
    response = client.get("/api/v1/youtube/callback?code=test_code")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "youtube-auth-success" in response.text
```

#### Frontend 測試
**檔案：** `frontend/src/components/setup/steps/__tests__/YouTubeAuthStep.test.tsx`

更新測試：
```typescript
it('should open OAuth window with correct backend URL', () => {
  const { getByText } = render(<YouTubeAuthStep />)
  const button = getByText('連結 YouTube 帳號')

  fireEvent.click(button)

  expect(window.open).toHaveBeenCalledWith(
    'http://localhost:8000/api/v1/youtube/auth',
    expect.any(String),
    expect.any(String)
  )
})
```

### 整合測試

**新增：** `backend/tests/integrations/test_youtube_oauth_flow.py`

```python
def test_complete_oauth_flow():
    """測試完整的 OAuth 流程"""

    # 1. 取得 auth URL
    response = client.get("/api/v1/youtube/auth")
    assert response.status_code == 307

    # 2. 模擬 Google callback
    mock_code = "test_authorization_code"
    response = client.get(f"/api/v1/youtube/callback?code={mock_code}")
    assert response.status_code == 200
    assert "授權成功" in response.text

    # 3. 驗證帳號已儲存
    response = client.get("/api/v1/youtube/accounts")
    assert len(response.json()["data"]["accounts"]) > 0
```

### E2E 測試

**新增：** `frontend/tests/e2e/youtube-auth.spec.ts`

```typescript
test('complete YouTube OAuth flow', async ({ page, context }) => {
  // 1. 開啟設定頁面
  await page.goto('http://localhost:3000/settings')

  // 2. 點擊連結按鈕
  const [authPage] = await Promise.all([
    context.waitForEvent('page'),
    page.click('text=連結新的 YouTube 帳號')
  ])

  // 3. 驗證開啟的是 backend URL
  expect(authPage.url()).toContain('localhost:8000/api/v1/youtube/auth')

  // 4. 應該重新導向到 Google
  await authPage.waitForURL(/accounts\.google\.com/)

  // 5. 模擬授權完成（實際測試中需要 mock）
  // ...
})
```

### 手動測試

#### 測試案例 1：Setup 流程中授權
1. 清空資料庫
2. 啟動前後端
3. 開啟 `http://localhost:3000/setup`
4. 到達 YouTube 授權步驟
5. 點擊「連結 YouTube 帳號」
6. 驗證：
   - ✅ 彈出視窗開啟 Google OAuth 頁面
   - ✅ 完成授權後視窗自動關閉
   - ✅ 主頁面顯示已連結的頻道資訊

#### 測試案例 2：Settings 頁面授權
1. 開啟 `http://localhost:3000/settings`
2. 切換到 YouTube 授權 tab
3. 點擊「連結新的 YouTube 帳號」
4. 驗證同上

#### 測試案例 3：多帳號連結
1. 重複測試案例 2 多次
2. 驗證可以連結多個不同的 YouTube 帳號

---

## 7. 風險評估

### 實作風險
- **中風險：** OAuth callback 的 CORS 設定可能需要調整
- **低風險：** postMessage 的 origin 驗證需要正確

### 相容性風險
- **低風險：** 所有現代瀏覽器都支援 window.postMessage

### 回歸風險
- **低風險：** 修改範圍明確，不影響其他功能

---

## 8. 預防措施

### 如何避免類似問題

1. **建立 API Contract**
   - 在實作前先定義清楚的 API 規格
   - 使用 OpenAPI/Swagger 自動生成文件
   - 前後端共用同一份 API 定義

2. **加強整合測試**
   - 必須有完整的前後端整合測試
   - 測試完整的使用者流程，而非只測試單一元件

3. **環境變數驗證**
   - 啟動時檢查必要的環境變數是否設定
   - 提供清楚的錯誤訊息

4. **Code Review 檢查清單**
   - 新增 API endpoint 必須同時更新前端
   - 前端呼叫 API 必須驗證 backend 有對應實作

---

## 9. 相關資源

### 相關文件
- Tech Spec: `tech-specs/backend/api-youtube.md`
- Task: `development/phase-1/task-020.md` (YouTube 授權功能)

### 相關 Issues
- 無

### 參考連結
- [Google OAuth 2.0 文件](https://developers.google.com/identity/protocols/oauth2)
- [FastAPI Redirect Response](https://fastapi.tiangolo.com/advanced/custom-response/#redirectresponse)

---

## 10. 時間記錄

- **2025-10-23：** Issue 建立，根因分析完成
- **預計修復時間：** 3-4 小時

---

## 變更歷史

| 日期 | 變更內容 | 修改者 |
|------|---------|--------|
| 2025-10-23 | 建立 Issue | Claude Code |
