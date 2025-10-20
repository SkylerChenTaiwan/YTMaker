# YouTube 授權 API

## 關聯文件
- [API 總覽與規範](./overview.md)
- [資料模型](./database.md)
- [認證與授權](./auth.md)
- [第三方整合](./integrations.md)

---

## 1.6 YouTube 授權 API

### 1.6.1 取得 OAuth 授權 URL

**端點：** `GET /api/v1/youtube/auth-url`
**說明：** 取得 Google OAuth 授權 URL

**回應：**
```json
{
  "success": true,
  "data": {
    "auth_url": "https://accounts.google.com/o/oauth2/v2/auth?..."
  }
}
```

---

### 1.6.2 儲存 OAuth 授權碼

**端點：** `POST /api/v1/youtube/auth-callback`
**說明：** 處理 OAuth 回呼，儲存授權 Token

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

---

### 1.6.3 取得已連結的 YouTube 帳號

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

### 1.6.4 移除 YouTube 授權

**端點：** `DELETE /api/v1/youtube/accounts/:id`
**說明：** 移除 YouTube 授權

**回應：**
```json
{
  "success": true,
  "message": "授權已移除"
}
```
