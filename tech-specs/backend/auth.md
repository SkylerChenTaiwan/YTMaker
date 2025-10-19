# 認證與授權

> **關聯文件:** [overview.md](./overview.md), [security.md](./security.md)

---

## 1. 認證策略

### 本地端應用特性

**無需用戶認證**
- 單用戶模式
- API 僅監聽 `localhost`
- 不暴露於公網

**理由:**
- 本地端應用,運行在用戶自己的電腦
- 無需區分不同用戶
- 簡化架構,提升效能

---

## 2. API Key 管理

### 2.1 儲存方式

**使用作業系統 Keychain**

**支援的系統:**
- **macOS:** Keychain
- **Linux:** Secret Service API (via libsecret)
- **Windows:** Credential Manager

**理由:**
- ✅ 安全加密儲存
- ✅ 作業系統層級保護
- ✅ 不寫入明文檔案
- ✅ 不寫入日誌

---

### 2.2 實作方式

**使用 `keyring` 函式庫**

```python
# app/security/keychain_manager.py
import keyring
from typing import Optional

class KeychainManager:
    """作業系統 Keychain 管理器"""

    SERVICE_NAME = "YTMaker"

    @staticmethod
    def set_api_key(service: str, api_key: str) -> None:
        """儲存 API Key 到 Keychain

        Args:
            service: 服務名稱 (gemini, stability, did, youtube)
            api_key: API Key 值
        """
        keyring.set_password(
            KeychainManager.SERVICE_NAME,
            service,
            api_key
        )

    @staticmethod
    def get_api_key(service: str) -> Optional[str]:
        """從 Keychain 讀取 API Key

        Args:
            service: 服務名稱 (gemini, stability, did, youtube)

        Returns:
            API Key 或 None (如果不存在)
        """
        return keyring.get_password(
            KeychainManager.SERVICE_NAME,
            service
        )

    @staticmethod
    def delete_api_key(service: str) -> None:
        """從 Keychain 刪除 API Key

        Args:
            service: 服務名稱
        """
        try:
            keyring.delete_password(
                KeychainManager.SERVICE_NAME,
                service
            )
        except keyring.errors.PasswordDeleteError:
            pass  # 如果不存在,忽略錯誤

    @staticmethod
    def list_services() -> list[str]:
        """列出已儲存的服務

        Returns:
            服務名稱列表
        """
        # keyring 不提供列出所有 key 的功能
        # 需要手動定義支援的服務列表
        return ["gemini", "stability", "did", "youtube"]

    @staticmethod
    def check_api_key_exists(service: str) -> bool:
        """檢查 API Key 是否存在

        Args:
            service: 服務名稱

        Returns:
            True 如果存在,False 如果不存在
        """
        return KeychainManager.get_api_key(service) is not None
```

---

### 2.3 API 端點

#### 設定 API Key

**端點:** `POST /api/v1/settings/api-keys/{service}`

**請求 Body:**
```json
{
  "api_key": "sk-xxxxxxxxxxxxxxxxxxxxx"
}
```

**回應範例:**
```json
{
  "success": true,
  "message": "API Key 已成功儲存"
}
```

**實作:**
```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

class APIKeyRequest(BaseModel):
    api_key: str

@router.post("/settings/api-keys/{service}")
async def set_api_key(service: str, request: APIKeyRequest):
    """設定 API Key"""
    if service not in ["gemini", "stability", "did", "youtube"]:
        raise HTTPException(status_code=400, detail="不支援的服務")

    KeychainManager.set_api_key(service, request.api_key)

    return {
        "success": True,
        "message": f"{service} API Key 已成功儲存"
    }
```

---

#### 檢查 API Key 是否存在

**端點:** `GET /api/v1/settings/api-keys/{service}/exists`

**回應範例:**
```json
{
  "exists": true,
  "service": "gemini"
}
```

**實作:**
```python
@router.get("/settings/api-keys/{service}/exists")
async def check_api_key_exists(service: str):
    """檢查 API Key 是否存在"""
    exists = KeychainManager.check_api_key_exists(service)

    return {
        "exists": exists,
        "service": service
    }
```

---

#### 刪除 API Key

**端點:** `DELETE /api/v1/settings/api-keys/{service}`

**回應範例:**
```json
{
  "success": true,
  "message": "API Key 已刪除"
}
```

**實作:**
```python
@router.delete("/settings/api-keys/{service}")
async def delete_api_key(service: str):
    """刪除 API Key"""
    KeychainManager.delete_api_key(service)

    return {
        "success": True,
        "message": f"{service} API Key 已刪除"
    }
```

---

## 3. YouTube OAuth 管理

### 3.1 OAuth 流程

**OAuth 2.0 Authorization Code Flow**

```
1. 用戶點擊「連結 YouTube 帳號」
   ↓
2. 後端生成授權 URL (含 redirect_uri, scope, state)
   ↓
3. 前端開啟瀏覽器,用戶授權
   ↓
4. Google 重定向回 redirect_uri?code=xxx&state=xxx
   ↓
5. 後端接收 code,交換 access_token 和 refresh_token
   ↓
6. 儲存 tokens 到 Keychain
   ↓
7. 完成授權
```

---

### 3.2 實作範例

```python
# app/services/youtube_auth_service.py
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
import json

class YouTubeAuthService:
    """YouTube OAuth 授權服務"""

    SCOPES = [
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube'
    ]

    @staticmethod
    def get_authorization_url(client_config: dict, redirect_uri: str) -> tuple[str, str]:
        """取得授權 URL

        Args:
            client_config: OAuth 客戶端配置
            redirect_uri: 重定向 URI

        Returns:
            (authorization_url, state)
        """
        flow = Flow.from_client_config(
            client_config,
            scopes=YouTubeAuthService.SCOPES,
            redirect_uri=redirect_uri
        )

        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true'
        )

        return authorization_url, state

    @staticmethod
    def exchange_code_for_tokens(
        client_config: dict,
        redirect_uri: str,
        code: str
    ) -> dict:
        """交換授權碼為 Tokens

        Args:
            client_config: OAuth 客戶端配置
            redirect_uri: 重定向 URI
            code: 授權碼

        Returns:
            {
                "access_token": "...",
                "refresh_token": "...",
                "token_uri": "...",
                "client_id": "...",
                "client_secret": "...",
                "scopes": [...]
            }
        """
        flow = Flow.from_client_config(
            client_config,
            scopes=YouTubeAuthService.SCOPES,
            redirect_uri=redirect_uri
        )

        flow.fetch_token(code=code)

        credentials = flow.credentials

        return {
            "access_token": credentials.token,
            "refresh_token": credentials.refresh_token,
            "token_uri": credentials.token_uri,
            "client_id": credentials.client_id,
            "client_secret": credentials.client_secret,
            "scopes": credentials.scopes
        }

    @staticmethod
    def save_credentials(channel_id: str, credentials: dict) -> None:
        """儲存 YouTube 憑證到 Keychain

        Args:
            channel_id: YouTube 頻道 ID
            credentials: 憑證字典
        """
        KeychainManager.set_api_key(
            f"youtube_channel_{channel_id}",
            json.dumps(credentials)
        )

    @staticmethod
    def get_credentials(channel_id: str) -> Optional[dict]:
        """從 Keychain 讀取 YouTube 憑證

        Args:
            channel_id: YouTube 頻道 ID

        Returns:
            憑證字典或 None
        """
        credentials_json = KeychainManager.get_api_key(
            f"youtube_channel_{channel_id}"
        )

        if credentials_json:
            return json.loads(credentials_json)

        return None
```

---

### 3.3 API 端點

#### 取得授權 URL

**端點:** `GET /api/v1/auth/youtube/authorize`

**回應範例:**
```json
{
  "authorization_url": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "state": "random_state_string"
}
```

---

#### 處理 OAuth 回調

**端點:** `POST /api/v1/auth/youtube/callback`

**請求 Body:**
```json
{
  "code": "authorization_code",
  "state": "random_state_string"
}
```

**回應範例:**
```json
{
  "success": true,
  "channel_id": "UCxxxxxxxxxxxxx",
  "channel_name": "我的頻道"
}
```

---

## 4. 安全性考量

### 4.1 API Key 保護

- ✅ 不寫入日誌檔案
- ✅ 不返回給前端
- ✅ 使用作業系統加密儲存
- ✅ 定期提醒用戶更新

### 4.2 OAuth Token 保護

- ✅ Refresh Token 儲存於 Keychain
- ✅ Access Token 僅在記憶體中
- ✅ 定期檢查 Token 有效性
- ✅ Token 過期自動刷新

---

## 總結

### 認證策略
- **無需用戶認證** - 單用戶本地端應用
- **API Key 管理** - 作業系統 Keychain 安全儲存
- **YouTube OAuth** - 標準 OAuth 2.0 流程

### 安全性
- ✅ 敏感資料加密儲存
- ✅ 不寫入日誌
- ✅ API 僅監聽 localhost
- ✅ 輸入驗證

---

**下一步:** 詳見 [security.md](./security.md)、[api-design.md](./api-design.md)
