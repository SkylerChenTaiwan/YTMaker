# 認證與授權 (Authentication & Authorization)

## 關聯文件
- [API 設計 - 系統初始化](./api-system.md)
- [API 設計 - YouTube 授權](./api-youtube.md)
- [安全措施](./security.md)
- [資料模型](./database.md)

---

## 4. 認證與授權

### 4.1 無需用戶認證

本系統為本地端單用戶應用，不需要用戶認證機制。

---

### 4.2 API Key 管理

#### 4.2.1 儲存方式

**作業系統 Keychain：**
- macOS: Keychain
- Linux: Secret Service API
- Windows: Credential Manager

**儲存流程：**
1. 用戶輸入 API Key
2. 調用 `POST /api/v1/system/api-keys`
3. 後端使用 `keyring` 套件儲存到 Keychain
4. 資料庫僅儲存 Provider 名稱（不儲存 API Key）

**讀取流程：**
1. 後端從 Keychain 讀取 API Key
2. 調用外部 API

---

#### 4.2.2 OAuth Token 管理

**YouTube OAuth Token：**
- Access Token 和 Refresh Token 加密儲存到資料庫
- 加密方式：Fernet (AES-128)
- 定期檢查 Token 是否過期
- 自動使用 Refresh Token 更新 Access Token

**Token 更新流程：**
1. 檢測到 Access Token 過期（401 Unauthorized）
2. 使用 Refresh Token 調用 OAuth Token Endpoint
3. 取得新的 Access Token
4. 更新資料庫中的 Token
5. 重試原始請求

**安全措施：**
- Token 在資料庫中加密儲存（使用 Fernet）
- Token 不寫入日誌檔案
- Token 過期時自動更新，不需要用戶重新授權
