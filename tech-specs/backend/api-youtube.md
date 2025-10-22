# YouTube 授權 API

## 關聯文件
- [API 總覽與規範](./overview.md)
- [資料模型](./database.md)
- [認證與授權](./auth.md)
- [第三方整合](./integrations.md)

---

## 1.6 YouTube 授權 API

### 1.6.1 啟動 OAuth 授權流程（推薦使用）

**端點：** `GET /api/v1/youtube/auth`
**說明：** 直接啟動 YouTube OAuth 授權流程，重新導向到 Google 授權頁面

**流程：**
1. 前端開啟彈出視窗，URL 為此 endpoint
2. Backend 生成 OAuth URL 並重新導向到 Google
3. 使用者在 Google 頁面完成授權
4. Google 重新導向回 `/api/v1/youtube/callback`
5. Backend 儲存 token 並回傳 HTML 頁面
6. HTML 頁面通過 `postMessage` 通知前端並自動關閉視窗

**回應：** `307 Redirect` 到 Google OAuth 頁面

**前端使用範例：**
```typescript
const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
window.open(
  `${backendUrl}/api/v1/youtube/auth`,
  'YouTube Authorization',
  'width=600,height=700'
)
```

---

### 1.6.2 處理 OAuth Callback（自動呼叫）

**端點：** `GET /api/v1/youtube/callback?code={authorization_code}`
**說明：** 處理 Google OAuth callback，儲存授權 Token，並回傳 HTML 頁面

**參數：**
- `code` (query): Google OAuth 授權碼

**成功回應：** `200 OK` (HTML)
- 顯示授權成功訊息
- 通過 `postMessage` 傳送頻道資訊給 opener
- 2 秒後自動關閉視窗

**PostMessage 格式：**
```javascript
{
  type: 'youtube-auth-success',
  channel_name: '頻道名稱',
  channel_id: 'channel-id',
  thumbnail_url: 'https://...'
}
```

**失敗回應：** `400 Bad Request` 或 `409 Conflict` (HTML)
- 顯示錯誤訊息
- 提供關閉按鈕

---

### 1.6.3 取得 OAuth 授權 URL（舊版，保留相容）

**端點：** `GET /api/v1/youtube/auth-url`
**說明：** 取得 Google OAuth 授權 URL（僅回傳 URL，不重新導向）

**回應：**
```json
{
  "success": true,
  "data": {
    "auth_url": "https://accounts.google.com/o/oauth2/v2/auth?..."
  }
}
```

**注意：** 此 endpoint 保留用於舊版相容，新開發建議使用 `GET /api/v1/youtube/auth`

---

### 1.6.4 儲存 OAuth 授權碼（舊版，保留相容）

**端點：** `POST /api/v1/youtube/auth-callback`
**說明：** 處理 OAuth 回呼，儲存授權 Token（JSON API 版本）

**請求：**
```json
{
  "code": "authorization-code"
}
```

**回應：**
```json
{
  "success": true,
  "data": {
    "channel_name": "頻道名稱",
    "channel_id": "channel-id"
  }
}
```

**注意：** 此 endpoint 保留用於舊版相容，新開發建議使用 `GET /api/v1/youtube/callback`

---

### 1.6.5 取得已連結的 YouTube 帳號

**端點：** `GET /api/v1/youtube/accounts`
**說明：** 取得所有已連結的 YouTube 帳號

**回應：**
```json
{
  "success": true,
  "data": {
    "accounts": [
      {
        "id": "uuid",
        "channel_name": "頻道名稱",
        "channel_id": "channel-id",
        "subscriber_count": 1000,
        "is_authorized": true,
        "authorized_at": "2025-01-15T10:30:00Z"
      }
    ]
  }
}
```

---

### 1.6.6 移除 YouTube 授權

**端點：** `DELETE /api/v1/youtube/accounts/:id`
**說明：** 移除 YouTube 授權

**回應：**
```json
{
  "success": true,
  "message": "授權已移除"
}
```
