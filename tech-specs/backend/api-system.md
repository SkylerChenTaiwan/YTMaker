# 系統初始化 API

## 關聯文件
- [API 總覽與規範](./overview.md)
- [認證與授權](./auth.md)
- [安全措施](./security.md)

---

## 1.3 系統初始化 API

### 1.3.1 檢查系統初始化狀態

**端點：** `GET /api/v1/system/init-status`
**說明：** 檢查系統是否已完成首次設定

**回應：**
```json
{
  "success": true,
  "data": {
    "is_initialized": true,
    "api_keys_configured": {
      "gemini": true,
      "stability_ai": true,
      "did": true
    },
    "youtube_connected": true
  }
}
```

---

### 1.3.2 儲存 API Key

**端點：** `POST /api/v1/system/api-keys`
**說明：** 儲存外部服務的 API Key

**請求：**
```json
{
  "provider": "gemini",
  "api_key": "AIzaSy..."
}
```

**回應：**
```json
{
  "success": true,
  "message": "API Key 已儲存"
}
```

---

### 1.3.3 測試 API Key

**端點：** `POST /api/v1/system/api-keys/test`
**說明：** 測試 API Key 是否有效

**請求：**
```json
{
  "provider": "gemini",
  "api_key": "AIzaSy..."
}
```

**回應：**
```json
{
  "success": true,
  "data": {
    "is_valid": true,
    "message": "連線成功"
  }
}
```
