# Task-013: API Keys 與 YouTube 授權管理

> **建立日期：** 2025-01-19
> **狀態：** ⏳ 未開始
> **預計時間：** 6 小時
> **優先級：** P0

---

## 關聯文件

### 技術規格
- **認證授權:** `tech-specs/backend/auth.md` (完整文件)
- **第三方整合:** `tech-specs/backend/integrations.md`
- **API 設計:** `tech-specs/backend/api-design.md`
- **安全性:** `tech-specs/backend/security.md`

### 產品設計
- **首次啟動流程:** `product-design/flows.md` (Flow-0)
- **系統設定:** `product-design/flows.md` (Flow-9)

### 相關任務
- **前置任務:** Task-003 (API 基礎架構)
- **後續任務:** Task-017 (首次啟動設定精靈), Task-022 (系統設定頁面)
- **依賴任務:** Task-009 (YouTube API 整合)

---

## 任務目標

### 簡述
實作 API Keys 的安全儲存管理和 YouTube OAuth 2.0 授權流程，確保所有敏感資料使用作業系統 Keychain 加密儲存。

### 詳細說明
本任務負責實作系統的認證與授權管理，包括：
- 使用作業系統 Keychain（macOS Keychain、Linux Secret Service、Windows Credential Manager）安全儲存 API Keys
- 實作 YouTube OAuth 2.0 授權流程（Authorization Code Flow）
- 提供 API Keys 管理的 CRUD 端點
- 實作 YouTube 憑證的取得、儲存和刷新機制
- 提供 API 配額監控功能

### 成功標準
- [ ] 可透過 API 儲存、讀取、刪除 API Keys（Gemini、Stability AI、D-ID）
- [ ] API Keys 儲存於作業系統 Keychain，不寫入檔案或日誌
- [ ] YouTube OAuth 流程完整可用（授權 URL 生成、callback 處理、token 交換）
- [ ] YouTube 憑證可自動刷新
- [ ] 所有端點都有完整的錯誤處理
- [ ] 單元測試覆蓋率 > 80%

---

## 測試要求

### 測試環境設定

**前置條件：**
- FastAPI 應用可運行
- 作業系統支援 Keychain（macOS、Linux with libsecret、或 Windows）
- 有效的 Gemini、Stability AI、D-ID API Keys（用於測試）
- YouTube OAuth 客戶端 ID 和 Secret（用於測試）

**測試資料準備：**
```python
# tests/test_data/api_keys.py
TEST_API_KEYS = {
    "gemini": "test_gemini_key_xxxxxxxxxxxxx",
    "stability": "test_stability_key_xxxxxxxxxxxxx",
    "did": "test_did_key_xxxxxxxxxxxxx"
}

TEST_YOUTUBE_CREDENTIALS = {
    "access_token": "ya29.a0AfB_xxxxx",
    "refresh_token": "1//0xxxxx",
    "token_uri": "https://oauth2.googleapis.com/token",
    "client_id": "xxxxx.apps.googleusercontent.com",
    "client_secret": "GOCSPX-xxxxx",
    "scopes": [
        "https://www.googleapis.com/auth/youtube.upload",
        "https://www.googleapis.com/auth/youtube"
    ]
}
```

---

### 單元測試

#### 測試 1：Keychain Manager - 儲存和讀取 API Key

**測試檔案:** `tests/unit/test_keychain_manager.py`

**測試程式碼：**
```python
import pytest
from app.security.keychain_manager import KeychainManager

def test_set_and_get_api_key():
    """測試儲存和讀取 API Key"""
    # Arrange
    service = "gemini"
    api_key = "test_key_12345"

    # Act
    KeychainManager.set_api_key(service, api_key)
    retrieved_key = KeychainManager.get_api_key(service)

    # Assert
    assert retrieved_key == api_key

    # Cleanup
    KeychainManager.delete_api_key(service)

def test_get_nonexistent_api_key():
    """測試讀取不存在的 API Key"""
    # Act
    result = KeychainManager.get_api_key("nonexistent_service")

    # Assert
    assert result is None

def test_delete_api_key():
    """測試刪除 API Key"""
    # Arrange
    service = "test_service"
    KeychainManager.set_api_key(service, "test_key")

    # Act
    KeychainManager.delete_api_key(service)
    result = KeychainManager.get_api_key(service)

    # Assert
    assert result is None

def test_check_api_key_exists():
    """測試檢查 API Key 是否存在"""
    # Arrange
    service = "gemini"
    KeychainManager.set_api_key(service, "test_key")

    # Act
    exists = KeychainManager.check_api_key_exists(service)

    # Assert
    assert exists is True

    # Cleanup
    KeychainManager.delete_api_key(service)
```

**預期結果：**
- 所有測試通過
- API Keys 正確儲存於作業系統 Keychain
- 無明文資料寫入檔案或日誌

---

#### 測試 2：API Keys 管理端點

**測試檔案:** `tests/unit/test_api_keys_endpoints.py`

**測試程式碼：**
```python
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_set_api_key_success():
    """測試設定 API Key 成功"""
    # Arrange
    service = "gemini"
    payload = {"api_key": "test_gemini_key_12345"}

    # Act
    response = client.post(f"/api/v1/settings/api-keys/{service}", json=payload)

    # Assert
    assert response.status_code == 200
    assert response.json()["success"] is True

    # Cleanup
    client.delete(f"/api/v1/settings/api-keys/{service}")

def test_set_api_key_invalid_service():
    """測試設定不支援的服務"""
    # Arrange
    service = "invalid_service"
    payload = {"api_key": "test_key"}

    # Act
    response = client.post(f"/api/v1/settings/api-keys/{service}", json=payload)

    # Assert
    assert response.status_code == 400
    assert "不支援的服務" in response.json()["detail"]

def test_check_api_key_exists():
    """測試檢查 API Key 是否存在"""
    # Arrange
    service = "stability"
    client.post(f"/api/v1/settings/api-keys/{service}", json={"api_key": "test_key"})

    # Act
    response = client.get(f"/api/v1/settings/api-keys/{service}/exists")

    # Assert
    assert response.status_code == 200
    assert response.json()["exists"] is True
    assert response.json()["service"] == service

    # Cleanup
    client.delete(f"/api/v1/settings/api-keys/{service}")

def test_delete_api_key():
    """測試刪除 API Key"""
    # Arrange
    service = "did"
    client.post(f"/api/v1/settings/api-keys/{service}", json={"api_key": "test_key"})

    # Act
    response = client.delete(f"/api/v1/settings/api-keys/{service}")

    # Assert
    assert response.status_code == 200
    assert response.json()["success"] is True

    # Verify deletion
    check_response = client.get(f"/api/v1/settings/api-keys/{service}/exists")
    assert check_response.json()["exists"] is False
```

**預期結果：**
- 所有 CRUD 操作正確運作
- 錯誤處理正確
- API Keys 不出現在 response body 中（除了設定時）

---

#### 測試 3：YouTube OAuth 流程

**測試檔案:** `tests/unit/test_youtube_auth.py`

**測試程式碼：**
```python
import pytest
from app.services.youtube_auth_service import YouTubeAuthService

@pytest.fixture
def mock_client_config():
    return {
        "web": {
            "client_id": "test_client_id.apps.googleusercontent.com",
            "client_secret": "test_client_secret",
            "redirect_uris": ["http://localhost:8000/api/v1/auth/youtube/callback"],
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token"
        }
    }

def test_get_authorization_url(mock_client_config):
    """測試生成授權 URL"""
    # Act
    auth_url, state = YouTubeAuthService.get_authorization_url(
        mock_client_config,
        "http://localhost:8000/api/v1/auth/youtube/callback"
    )

    # Assert
    assert "accounts.google.com/o/oauth2" in auth_url
    assert "scope=" in auth_url
    assert "youtube" in auth_url
    assert state is not None
    assert len(state) > 0

def test_save_and_get_credentials():
    """測試儲存和讀取 YouTube 憑證"""
    # Arrange
    channel_id = "UCtest123456"
    credentials = {
        "access_token": "test_access_token",
        "refresh_token": "test_refresh_token",
        "token_uri": "https://oauth2.googleapis.com/token"
    }

    # Act
    YouTubeAuthService.save_credentials(channel_id, credentials)
    retrieved = YouTubeAuthService.get_credentials(channel_id)

    # Assert
    assert retrieved is not None
    assert retrieved["access_token"] == credentials["access_token"]
    assert retrieved["refresh_token"] == credentials["refresh_token"]

    # Cleanup
    from app.security.keychain_manager import KeychainManager
    KeychainManager.delete_api_key(f"youtube_channel_{channel_id}")
```

**預期結果：**
- 授權 URL 正確生成
- State 參數正確生成（用於防止 CSRF）
- YouTube 憑證正確儲存和讀取

---

### 整合測試

#### 測試 4：完整 OAuth 流程（模擬）

**測試檔案:** `tests/integration/test_youtube_oauth_flow.py`

**測試程式碼：**
```python
import pytest
from fastapi.testclient import TestClient
from app.main import app
from unittest.mock import patch, MagicMock

client = TestClient(app)

@patch('app.services.youtube_auth_service.Flow')
def test_complete_oauth_flow(mock_flow):
    """測試完整的 OAuth 流程（模擬）"""
    # Mock Flow 行為
    mock_flow_instance = MagicMock()
    mock_flow.from_client_config.return_value = mock_flow_instance

    mock_flow_instance.authorization_url.return_value = (
        "https://accounts.google.com/o/oauth2/auth?...",
        "test_state_12345"
    )

    mock_credentials = MagicMock()
    mock_credentials.token = "test_access_token"
    mock_credentials.refresh_token = "test_refresh_token"
    mock_credentials.client_id = "test_client_id"
    mock_flow_instance.credentials = mock_credentials

    # Step 1: 取得授權 URL
    response = client.get("/api/v1/auth/youtube/authorize")
    assert response.status_code == 200
    assert "authorization_url" in response.json()
    assert "state" in response.json()

    # Step 2: 處理 callback
    callback_payload = {
        "code": "test_authorization_code",
        "state": "test_state_12345"
    }
    response = client.post("/api/v1/auth/youtube/callback", json=callback_payload)

    # Assert
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert "channel_id" in response.json()
```

**預期結果：**
- 完整流程可執行
- Tokens 正確儲存
- 無錯誤發生

---

## 實作規格

### 需要建立的檔案

#### 1. Keychain Manager
**檔案:** `backend/app/security/keychain_manager.py`

```python
"""
作業系統 Keychain 管理器
支援 macOS Keychain、Linux Secret Service、Windows Credential Manager
"""
import keyring
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class KeychainManager:
    """作業系統 Keychain 管理器"""

    SERVICE_NAME = "YTMaker"

    @staticmethod
    def set_api_key(service: str, api_key: str) -> None:
        """儲存 API Key 到 Keychain

        Args:
            service: 服務名稱 (gemini, stability, did, youtube_channel_{channel_id})
            api_key: API Key 值
        """
        try:
            keyring.set_password(
                KeychainManager.SERVICE_NAME,
                service,
                api_key
            )
            logger.info(f"API Key for {service} saved successfully")
        except Exception as e:
            logger.error(f"Failed to save API Key for {service}: {e}")
            raise

    @staticmethod
    def get_api_key(service: str) -> Optional[str]:
        """從 Keychain 讀取 API Key

        Args:
            service: 服務名稱

        Returns:
            API Key 或 None (如果不存在)
        """
        try:
            return keyring.get_password(
                KeychainManager.SERVICE_NAME,
                service
            )
        except Exception as e:
            logger.error(f"Failed to get API Key for {service}: {e}")
            return None

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
            logger.info(f"API Key for {service} deleted successfully")
        except keyring.errors.PasswordDeleteError:
            logger.warning(f"API Key for {service} does not exist, skipping deletion")
            pass
        except Exception as e:
            logger.error(f"Failed to delete API Key for {service}: {e}")
            raise

    @staticmethod
    def list_services() -> list[str]:
        """列出支援的服務

        Returns:
            服務名稱列表
        """
        return ["gemini", "stability", "did"]

    @staticmethod
    def check_api_key_exists(service: str) -> bool:
        """檢查 API Key 是否存在

        Args:
            service: 服務名稱

        Returns:
            True 如果存在, False 如果不存在
        """
        return KeychainManager.get_api_key(service) is not None
```

---

#### 2. YouTube Auth Service
**檔案:** `backend/app/services/youtube_auth_service.py`

```python
"""
YouTube OAuth 授權服務
"""
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from app.security.keychain_manager import KeychainManager
import json
from typing import Optional, Tuple
import logging

logger = logging.getLogger(__name__)

class YouTubeAuthService:
    """YouTube OAuth 授權服務"""

    SCOPES = [
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube'
    ]

    @staticmethod
    def get_authorization_url(
        client_config: dict,
        redirect_uri: str
    ) -> Tuple[str, str]:
        """取得授權 URL

        Args:
            client_config: OAuth 客戶端配置
            redirect_uri: 重定向 URI

        Returns:
            (authorization_url, state)
        """
        try:
            flow = Flow.from_client_config(
                client_config,
                scopes=YouTubeAuthService.SCOPES,
                redirect_uri=redirect_uri
            )

            authorization_url, state = flow.authorization_url(
                access_type='offline',
                include_granted_scopes='true',
                prompt='consent'  # 強制顯示同意畫面以取得 refresh_token
            )

            logger.info("Authorization URL generated successfully")
            return authorization_url, state

        except Exception as e:
            logger.error(f"Failed to generate authorization URL: {e}")
            raise

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
            憑證字典
        """
        try:
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
                "scopes": list(credentials.scopes)
            }

        except Exception as e:
            logger.error(f"Failed to exchange code for tokens: {e}")
            raise

    @staticmethod
    def save_credentials(channel_id: str, credentials: dict) -> None:
        """儲存 YouTube 憑證到 Keychain

        Args:
            channel_id: YouTube 頻道 ID
            credentials: 憑證字典
        """
        try:
            KeychainManager.set_api_key(
                f"youtube_channel_{channel_id}",
                json.dumps(credentials)
            )
            logger.info(f"YouTube credentials saved for channel {channel_id}")

        except Exception as e:
            logger.error(f"Failed to save YouTube credentials: {e}")
            raise

    @staticmethod
    def get_credentials(channel_id: str) -> Optional[dict]:
        """從 Keychain 讀取 YouTube 憑證

        Args:
            channel_id: YouTube 頻道 ID

        Returns:
            憑證字典或 None
        """
        try:
            credentials_json = KeychainManager.get_api_key(
                f"youtube_channel_{channel_id}"
            )

            if credentials_json:
                return json.loads(credentials_json)

            return None

        except Exception as e:
            logger.error(f"Failed to get YouTube credentials: {e}")
            return None

    @staticmethod
    def refresh_access_token(channel_id: str) -> Optional[str]:
        """刷新 Access Token

        Args:
            channel_id: YouTube 頻道 ID

        Returns:
            新的 Access Token 或 None
        """
        try:
            credentials_data = YouTubeAuthService.get_credentials(channel_id)
            if not credentials_data:
                return None

            credentials = Credentials(**credentials_data)

            # 刷新 token
            from google.auth.transport.requests import Request
            credentials.refresh(Request())

            # 更新儲存的憑證
            updated_credentials = {
                "access_token": credentials.token,
                "refresh_token": credentials.refresh_token,
                "token_uri": credentials.token_uri,
                "client_id": credentials.client_id,
                "client_secret": credentials.client_secret,
                "scopes": list(credentials.scopes)
            }

            YouTubeAuthService.save_credentials(channel_id, updated_credentials)
            logger.info(f"Access token refreshed for channel {channel_id}")

            return credentials.token

        except Exception as e:
            logger.error(f"Failed to refresh access token: {e}")
            return None

    @staticmethod
    def get_channel_info(channel_id: str) -> Optional[dict]:
        """取得頻道資訊

        Args:
            channel_id: YouTube 頻道 ID

        Returns:
            頻道資訊字典或 None
        """
        try:
            credentials_data = YouTubeAuthService.get_credentials(channel_id)
            if not credentials_data:
                return None

            credentials = Credentials(**credentials_data)
            youtube = build("youtube", "v3", credentials=credentials)

            request = youtube.channels().list(
                part="snippet,statistics",
                id=channel_id
            )
            response = request.execute()

            if response["items"]:
                channel = response["items"][0]
                return {
                    "id": channel["id"],
                    "title": channel["snippet"]["title"],
                    "description": channel["snippet"]["description"],
                    "subscriber_count": channel["statistics"].get("subscriberCount", "0"),
                    "video_count": channel["statistics"].get("videoCount", "0")
                }

            return None

        except Exception as e:
            logger.error(f"Failed to get channel info: {e}")
            return None
```

---

#### 3. API Keys 管理端點
**檔案:** `backend/app/api/v1/endpoints/settings.py`

```python
"""
系統設定相關端點
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.security.keychain_manager import KeychainManager
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

class APIKeyRequest(BaseModel):
    api_key: str

class APIKeyExistsResponse(BaseModel):
    exists: bool
    service: str

class APIKeyResponse(BaseModel):
    success: bool
    message: str

SUPPORTED_SERVICES = ["gemini", "stability", "did"]

@router.post("/api-keys/{service}", response_model=APIKeyResponse)
async def set_api_key(service: str, request: APIKeyRequest):
    """設定 API Key

    Args:
        service: 服務名稱 (gemini, stability, did)
        request: API Key 請求 body

    Returns:
        成功訊息
    """
    if service not in SUPPORTED_SERVICES:
        raise HTTPException(
            status_code=400,
            detail=f"不支援的服務: {service}. 支援的服務: {', '.join(SUPPORTED_SERVICES)}"
        )

    try:
        KeychainManager.set_api_key(service, request.api_key)
        return APIKeyResponse(
            success=True,
            message=f"{service} API Key 已成功儲存"
        )
    except Exception as e:
        logger.error(f"Failed to set API key for {service}: {e}")
        raise HTTPException(status_code=500, detail="儲存 API Key 失敗")

@router.get("/api-keys/{service}/exists", response_model=APIKeyExistsResponse)
async def check_api_key_exists(service: str):
    """檢查 API Key 是否存在

    Args:
        service: 服務名稱

    Returns:
        存在狀態
    """
    exists = KeychainManager.check_api_key_exists(service)
    return APIKeyExistsResponse(exists=exists, service=service)

@router.delete("/api-keys/{service}", response_model=APIKeyResponse)
async def delete_api_key(service: str):
    """刪除 API Key

    Args:
        service: 服務名稱

    Returns:
        成功訊息
    """
    try:
        KeychainManager.delete_api_key(service)
        return APIKeyResponse(
            success=True,
            message=f"{service} API Key 已刪除"
        )
    except Exception as e:
        logger.error(f"Failed to delete API key for {service}: {e}")
        raise HTTPException(status_code=500, detail="刪除 API Key 失敗")

@router.get("/api-keys", response_model=dict)
async def list_api_keys_status():
    """列出所有服務的 API Key 狀態

    Returns:
        各服務的 API Key 存在狀態
    """
    status = {}
    for service in SUPPORTED_SERVICES:
        status[service] = KeychainManager.check_api_key_exists(service)

    return {"services": status}
```

---

#### 4. YouTube 授權端點
**檔案:** `backend/app/api/v1/endpoints/auth.py`

```python
"""
認證授權相關端點
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.youtube_auth_service import YouTubeAuthService
from app.config import settings
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

class OAuthCallbackRequest(BaseModel):
    code: str
    state: str

class AuthorizationURLResponse(BaseModel):
    authorization_url: str
    state: str

class OAuthCallbackResponse(BaseModel):
    success: bool
    channel_id: str
    channel_name: str

@router.get("/youtube/authorize", response_model=AuthorizationURLResponse)
async def get_youtube_authorization_url():
    """取得 YouTube OAuth 授權 URL

    Returns:
        授權 URL 和 state
    """
    try:
        # 從配置讀取 OAuth 客戶端設定
        client_config = {
            "web": {
                "client_id": settings.YOUTUBE_CLIENT_ID,
                "client_secret": settings.YOUTUBE_CLIENT_SECRET,
                "redirect_uris": [settings.YOUTUBE_REDIRECT_URI],
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token"
            }
        }

        auth_url, state = YouTubeAuthService.get_authorization_url(
            client_config,
            settings.YOUTUBE_REDIRECT_URI
        )

        return AuthorizationURLResponse(
            authorization_url=auth_url,
            state=state
        )

    except Exception as e:
        logger.error(f"Failed to generate authorization URL: {e}")
        raise HTTPException(status_code=500, detail="生成授權 URL 失敗")

@router.post("/youtube/callback", response_model=OAuthCallbackResponse)
async def handle_youtube_oauth_callback(request: OAuthCallbackRequest):
    """處理 YouTube OAuth callback

    Args:
        request: OAuth callback 請求 (含 code 和 state)

    Returns:
        頻道資訊
    """
    try:
        # 從配置讀取 OAuth 客戶端設定
        client_config = {
            "web": {
                "client_id": settings.YOUTUBE_CLIENT_ID,
                "client_secret": settings.YOUTUBE_CLIENT_SECRET,
                "redirect_uris": [settings.YOUTUBE_REDIRECT_URI],
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token"
            }
        }

        # 交換授權碼為 tokens
        credentials = YouTubeAuthService.exchange_code_for_tokens(
            client_config,
            settings.YOUTUBE_REDIRECT_URI,
            request.code
        )

        # 使用 credentials 取得頻道資訊
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build

        creds = Credentials(**credentials)
        youtube = build("youtube", "v3", credentials=creds)

        # 取得當前用戶的頻道
        channels_response = youtube.channels().list(
            part="snippet",
            mine=True
        ).execute()

        if not channels_response["items"]:
            raise HTTPException(status_code=400, detail="找不到 YouTube 頻道")

        channel = channels_response["items"][0]
        channel_id = channel["id"]
        channel_name = channel["snippet"]["title"]

        # 儲存憑證
        YouTubeAuthService.save_credentials(channel_id, credentials)

        return OAuthCallbackResponse(
            success=True,
            channel_id=channel_id,
            channel_name=channel_name
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to handle OAuth callback: {e}")
        raise HTTPException(status_code=500, detail="處理 OAuth callback 失敗")

@router.get("/youtube/channels", response_model=list)
async def list_connected_youtube_channels():
    """列出已連結的 YouTube 頻道

    Returns:
        頻道列表
    """
    # 這裡需要實作頻道列表管理
    # 可以將頻道 ID 列表儲存在資料庫或配置檔案中
    # 簡化實作：返回空列表，實際使用時需要維護頻道列表
    return []
```

---

#### 5. 配置更新
**檔案:** `backend/app/config.py`

在現有的 `Settings` 類別中新增：

```python
# YouTube OAuth 設定
YOUTUBE_CLIENT_ID: str = ""
YOUTUBE_CLIENT_SECRET: str = ""
YOUTUBE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/youtube/callback"
```

並更新 `.env.example`:
```env
# YouTube OAuth
YOUTUBE_CLIENT_ID=your_client_id.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=GOCSPX-your_client_secret
YOUTUBE_REDIRECT_URI=http://localhost:8000/api/v1/auth/youtube/callback
```

---

#### 6. 註冊路由
**檔案:** `backend/app/api/v1/__init__.py`

```python
from fastapi import APIRouter
from app.api.v1.endpoints import settings, auth

api_router = APIRouter()

api_router.include_router(
    settings.router,
    prefix="/settings",
    tags=["settings"]
)

api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["auth"]
)
```

並在 `backend/app/main.py` 中：

```python
from app.api.v1 import api_router

app.include_router(api_router, prefix="/api/v1")
```

---

## 開發指引

### 開發步驟

**1. 安裝依賴**
```bash
cd backend
source venv/bin/activate
pip install keyring google-auth-oauthlib google-api-python-client
```

**2. 實作 Keychain Manager**
- 建立 `app/security/keychain_manager.py`
- 實作所有方法
- 測試跨平台相容性

**3. 實作 YouTube Auth Service**
- 建立 `app/services/youtube_auth_service.py`
- 實作 OAuth 流程
- 測試授權和 token 刷新

**4. 實作 API 端點**
- 建立 `app/api/v1/endpoints/settings.py`
- 建立 `app/api/v1/endpoints/auth.py`
- 註冊路由

**5. 撰寫測試**
- 單元測試 (Keychain Manager, YouTube Auth Service)
- 整合測試 (API 端點)
- 執行測試確保覆蓋率 > 80%

**6. 更新文件**
- 更新 API 文件
- 記錄 OAuth 設定步驟

---

### 注意事項

**安全性：**
- [ ] API Keys 絕不寫入日誌
- [ ] API Keys 不返回給前端（除了設定時驗證）
- [ ] 使用 HTTPS（production 環境）
- [ ] OAuth state 參數防止 CSRF

**錯誤處理：**
- [ ] Keychain 不可用時的 fallback（可考慮加密檔案）
- [ ] OAuth 流程中斷的處理
- [ ] Token 過期自動刷新

**測試：**
- [ ] 測試跨平台 Keychain 相容性
- [ ] 測試 OAuth 流程各種錯誤情況
- [ ] 測試 Token 刷新邏輯

---

## 完成檢查清單

### 開發完成
- [ ] Keychain Manager 實作完成
- [ ] YouTube Auth Service 實作完成
- [ ] API Keys 管理端點實作完成
- [ ] YouTube OAuth 端點實作完成
- [ ] 配置檔案已更新

### 測試完成
- [ ] 單元測試通過（Keychain Manager）
- [ ] 單元測試通過（API 端點）
- [ ] 整合測試通過（OAuth 流程）
- [ ] 測試覆蓋率 > 80%

### 文件同步
- [ ] API 文件已更新
- [ ] OAuth 設定步驟已記錄
- [ ] Spec 與程式碼同步

### Git
- [ ] 程式碼已 commit
- [ ] Commit 訊息符合規範
- [ ] 已推送到 remote

---

## 時間分配建議

- **Keychain Manager 實作：** 1 小時
- **YouTube Auth Service 實作：** 1.5 小時
- **API 端點實作：** 1.5 小時
- **測試撰寫：** 1.5 小時
- **跨平台測試與除錯：** 0.5 小時

**總計：** 6 小時
