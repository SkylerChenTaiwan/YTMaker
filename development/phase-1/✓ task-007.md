# [v] Task-007: YouTube API 實作

> **建立日期：** 2025-10-19
> **狀態：** ✅ 已完成
> **預計時間：** 6 小時
> **優先級:** P0 (必須)

---

## 關聯文件

### 產品設計
- **使用者流程：** `product-design/flows.md#Flow-0` (首次啟動) - 步驟 9-10
- **使用者流程：** `product-design/flows.md#Flow-9` (YouTube 授權管理) - 步驟 6a

### 技術規格
- **API 規格：** `tech-specs/backend/api-youtube.md` - 完整的 4 個端點設計
- **認證授權：** `tech-specs/backend/auth.md#4.2.2-OAuth-Token-管理`
- **資料模型：** `tech-specs/backend/database.md#2.1.4-YouTubeAccount`
- **第三方整合：** `tech-specs/backend/integrations.md` (YouTube Data API v3)

### 相關任務
- **前置任務:** Task-002 ✅ (資料庫), Task-003 ✅ (API 基礎架構)
- **後續任務:** Task-013 (YouTube 上傳整合), Task-020 (首次設定頁面), Task-026 (系統設定頁面)
- **並行任務:** Task-004~006, 008, 009 (可並行開發)

---

## 任務目標

### 簡述
實作 YouTube OAuth 2.0 授權流程、YouTube 帳號管理、Token 安全儲存與自動更新機制。提供完整的授權 URL 生成、OAuth callback 處理、多帳號管理、授權移除功能。

### 成功標準
- [ ] 4 個 API 端點全部實作完成並測試通過
- [ ] OAuth 2.0 授權流程完整且符合 Google 規範
- [ ] Access Token 和 Refresh Token 加密儲存到資料庫
- [ ] Token 自動更新機制正常運作
- [ ] 支援多個 YouTube 帳號連結
- [ ] YouTubeAuthService 業務邏輯完整
- [ ] 單元測試覆蓋率 > 80%
- [ ] 整合測試覆蓋完整 OAuth 流程

---

## 測試要求

### 單元測試

#### 測試 1：成功取得 OAuth 授權 URL

**目的：** 驗證系統可正確生成 Google OAuth 授權 URL

**輸入：**
```http
GET /api/v1/youtube/auth-url
```

**預期輸出：**
```json
HTTP 200 OK
{
  "success": true,
  "data": {
    "auth_url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...&scope=https://www.googleapis.com/auth/youtube.upload&response_type=code&access_type=offline&prompt=consent"
  }
}
```

**驗證點：**
- [ ] 回傳 200 狀態碼
- [ ] auth_url 包含正確的 client_id
- [ ] auth_url 包含正確的 redirect_uri
- [ ] scope 包含 `https://www.googleapis.com/auth/youtube.upload`
- [ ] access_type 設定為 `offline` (以取得 refresh token)
- [ ] prompt 設定為 `consent` (確保每次都要求授權)
- [ ] response_type 為 `code`

---

#### 測試 2：成功處理 OAuth Callback 並儲存 Token

**目的：** 驗證系統可正確處理 Google OAuth callback，取得並儲存 Token

**前置條件：**
- Mock Google OAuth Token Exchange API
- Mock YouTube Data API (channels.list)

**輸入：**
```http
POST /api/v1/youtube/auth-callback
Content-Type: application/json

{
  "code": "mock-authorization-code-12345"
}
```

**Mock API 回應：**
```python
# Mock Token Exchange
{
  "access_token": "ya29.mock-access-token",
  "refresh_token": "1//mock-refresh-token",
  "expires_in": 3600,
  "token_type": "Bearer"
}

# Mock YouTube Channels API
{
  "items": [
    {
      "id": "UC_mock_channel_id",
      "snippet": {
        "title": "測試頻道",
        "thumbnails": {
          "default": {"url": "https://example.com/thumb.jpg"}
        }
      },
      "statistics": {
        "subscriberCount": "1000"
      }
    }
  ]
}
```

**預期輸出：**
```json
HTTP 201 Created
{
  "success": true,
  "data": {
    "id": "uuid-v4",
    "channel_name": "測試頻道",
    "channel_id": "UC_mock_channel_id",
    "subscriber_count": 1000,
    "is_authorized": true,
    "authorized_at": "2025-10-19T10:00:00Z"
  }
}
```

**驗證點：**
- [ ] 回傳 201 狀態碼
- [ ] 資料庫 youtube_accounts 表中新增了記錄
- [ ] access_token 使用 Fernet 加密儲存
- [ ] refresh_token 使用 Fernet 加密儲存
- [ ] token_expires_at 正確計算 (當前時間 + 3600 秒)
- [ ] channel_name, channel_id, subscriber_count 正確儲存
- [ ] is_authorized 設為 True
- [ ] 呼叫 Google Token Exchange API 使用正確的參數
- [ ] 呼叫 YouTube channels.list API 取得頻道資訊

---

#### 測試 3：OAuth Callback 處理失敗情況

**目的：** 驗證錯誤處理機制

**情境 3a：無效的 Authorization Code**

**輸入：**
```http
POST /api/v1/youtube/auth-callback
Content-Type: application/json

{
  "code": "invalid-code"
}
```

**Mock API 回應：**
```python
# Google Token Exchange 回傳 400
{
  "error": "invalid_grant",
  "error_description": "Bad Request"
}
```

**預期輸出：**
```json
HTTP 400 Bad Request
{
  "success": false,
  "error": {
    "code": "OAUTH_EXCHANGE_FAILED",
    "message": "OAuth 授權碼交換失敗：invalid_grant"
  }
}
```

**驗證點：**
- [ ] 回傳 400 狀態碼
- [ ] 錯誤訊息清楚說明問題
- [ ] 未在資料庫中建立記錄
- [ ] 錯誤已記錄到日誌

**情境 3b：重複連結相同頻道**

**前置條件：**
- 資料庫中已存在 channel_id 為 "UC_existing" 的記錄

**輸入：**
```http
POST /api/v1/youtube/auth-callback
Content-Type: application/json

{
  "code": "mock-code-for-existing-channel"
}
```

**預期輸出：**
```json
HTTP 409 Conflict
{
  "success": false,
  "error": {
    "code": "CHANNEL_ALREADY_LINKED",
    "message": "此 YouTube 頻道已經連結"
  }
}
```

**驗證點：**
- [ ] 回傳 409 狀態碼
- [ ] 未建立重複記錄
- [ ] 舊記錄的 token 未被覆蓋

---

#### 測試 4：列出所有已連結的 YouTube 帳號

**目的：** 驗證系統可正確回傳所有已連結帳號

**前置條件：**
- 資料庫中存在 2 個 YouTube 帳號記錄

**輸入：**
```http
GET /api/v1/youtube/accounts
```

**預期輸出：**
```json
HTTP 200 OK
{
  "success": true,
  "data": {
    "accounts": [
      {
        "id": "uuid-1",
        "channel_name": "頻道 A",
        "channel_id": "UC_channel_a",
        "subscriber_count": 1000,
        "is_authorized": true,
        "authorized_at": "2025-10-19T10:00:00Z"
      },
      {
        "id": "uuid-2",
        "channel_name": "頻道 B",
        "channel_id": "UC_channel_b",
        "subscriber_count": 5000,
        "is_authorized": true,
        "authorized_at": "2025-10-19T11:00:00Z"
      }
    ]
  }
}
```

**驗證點：**
- [ ] 回傳 200 狀態碼
- [ ] 回傳所有 YouTube 帳號記錄
- [ ] 回傳資料不包含 access_token 和 refresh_token (安全性)
- [ ] 按 authorized_at 降序排列（最新的在前）

**情境 4a：無任何連結帳號**

**預期輸出：**
```json
HTTP 200 OK
{
  "success": true,
  "data": {
    "accounts": []
  }
}
```

**驗證點：**
- [ ] 回傳空陣列，不是錯誤

---

#### 測試 5：移除 YouTube 授權

**目的：** 驗證系統可正確移除授權並刪除 Token

**前置條件：**
- 資料庫中存在 id 為 "uuid-to-delete" 的 YouTube 帳號

**輸入：**
```http
DELETE /api/v1/youtube/accounts/uuid-to-delete
```

**預期輸出：**
```json
HTTP 200 OK
{
  "success": true,
  "message": "授權已移除"
}
```

**驗證點：**
- [ ] 回傳 200 狀態碼
- [ ] 資料庫中該記錄已刪除
- [ ] 加密的 token 資料已清除

**情境 5a：移除不存在的帳號**

**輸入：**
```http
DELETE /api/v1/youtube/accounts/non-existent-uuid
```

**預期輸出：**
```json
HTTP 404 Not Found
{
  "success": false,
  "error": {
    "code": "ACCOUNT_NOT_FOUND",
    "message": "找不到指定的 YouTube 帳號"
  }
}
```

**驗證點：**
- [ ] 回傳 404 狀態碼
- [ ] 錯誤訊息清楚

---

### 整合測試

#### 測試 6：完整 OAuth 授權流程

**目的：** 驗證從取得授權 URL 到完成授權的完整流程

**流程：**
1. 呼叫 GET /api/v1/youtube/auth-url → 取得授權 URL
2. 模擬用戶完成 Google 授權 → 取得 authorization code
3. 呼叫 POST /api/v1/youtube/auth-callback (使用 code) → 儲存 Token
4. 呼叫 GET /api/v1/youtube/accounts → 確認帳號已連結
5. 呼叫 DELETE /api/v1/youtube/accounts/:id → 移除授權
6. 再次呼叫 GET /api/v1/youtube/accounts → 確認帳號已移除

**驗證點：**
- [ ] 整個流程無錯誤
- [ ] 每個步驟的回應正確
- [ ] 資料庫狀態正確變化

---

#### 測試 7：Token 自動更新機制

**目的：** 驗證 Access Token 過期時可自動使用 Refresh Token 更新

**前置條件：**
- 資料庫中存在一個 YouTube 帳號
- Access Token 已過期 (token_expires_at < 當前時間)

**觸發方式：**
- YouTubeAuthService 嘗試使用過期的 Access Token

**Mock API 回應：**
```python
# Mock Token Refresh
{
  "access_token": "ya29.new-access-token",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

**預期行為：**
1. 系統檢測到 Access Token 已過期
2. 自動呼叫 Google OAuth Token Refresh API
3. 使用 Refresh Token 取得新的 Access Token
4. 更新資料庫中的 access_token 和 token_expires_at
5. 重試原始 API 呼叫

**驗證點：**
- [ ] 檢測到 Token 過期
- [ ] 自動呼叫 Token Refresh API
- [ ] 新的 Access Token 加密儲存到資料庫
- [ ] token_expires_at 正確更新
- [ ] 原始 API 呼叫成功完成
- [ ] 整個過程對用戶透明（無需重新授權）

---

## 實作規格

### 需要建立/修改的檔案

#### 1. API 路由檔案: `backend/app/api/v1/youtube.py`

**職責：** 處理 YouTube 授權相關的 HTTP 請求

**方法：**

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.schemas.youtube import (
    AuthUrlResponse,
    AuthCallbackRequest,
    YouTubeAccountResponse,
    YouTubeAccountListResponse
)
from app.services.youtube_auth_service import YouTubeAuthService
from app.database import get_db

router = APIRouter(prefix="/youtube", tags=["youtube"])

@router.get("/auth-url", response_model=AuthUrlResponse)
async def get_auth_url(
    youtube_service: YouTubeAuthService = Depends()
):
    """
    取得 Google OAuth 授權 URL

    Returns:
        AuthUrlResponse: 包含 auth_url 的回應
    """
    auth_url = youtube_service.get_authorization_url()
    return AuthUrlResponse(
        success=True,
        data={"auth_url": auth_url}
    )

@router.post("/auth-callback", response_model=YouTubeAccountResponse, status_code=status.HTTP_201_CREATED)
async def handle_auth_callback(
    request: AuthCallbackRequest,
    db: Session = Depends(get_db),
    youtube_service: YouTubeAuthService = Depends()
):
    """
    處理 OAuth callback，儲存授權 Token

    Args:
        request: 包含 authorization code 的請求
        db: 資料庫 session
        youtube_service: YouTube 授權服務

    Returns:
        YouTubeAccountResponse: 已連結的頻道資訊

    Raises:
        HTTPException 400: OAuth 授權碼交換失敗
        HTTPException 409: 頻道已經連結
    """
    try:
        account = await youtube_service.handle_oauth_callback(request.code, db)
        return YouTubeAccountResponse(
            success=True,
            data=account
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "OAUTH_EXCHANGE_FAILED",
                "message": str(e)
            }
        )
    except Exception as e:
        if "already linked" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "CHANNEL_ALREADY_LINKED",
                    "message": "此 YouTube 頻道已經連結"
                }
            )
        raise

@router.get("/accounts", response_model=YouTubeAccountListResponse)
async def list_accounts(
    db: Session = Depends(get_db),
    youtube_service: YouTubeAuthService = Depends()
):
    """
    取得所有已連結的 YouTube 帳號

    Returns:
        YouTubeAccountListResponse: 帳號列表
    """
    accounts = youtube_service.list_accounts(db)
    return YouTubeAccountListResponse(
        success=True,
        data={"accounts": accounts}
    )

@router.delete("/accounts/{account_id}")
async def delete_account(
    account_id: str,
    db: Session = Depends(get_db),
    youtube_service: YouTubeAuthService = Depends()
):
    """
    移除 YouTube 授權

    Args:
        account_id: YouTube 帳號 ID

    Returns:
        成功訊息

    Raises:
        HTTPException 404: 帳號不存在
    """
    success = youtube_service.delete_account(account_id, db)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "ACCOUNT_NOT_FOUND",
                "message": "找不到指定的 YouTube 帳號"
            }
        )

    return {
        "success": True,
        "message": "授權已移除"
    }
```

---

#### 2. Service 業務邏輯: `backend/app/services/youtube_auth_service.py`

**職責：** YouTube OAuth 授權業務邏輯、Token 管理

**方法：**

```python
from datetime import datetime, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from cryptography.fernet import Fernet
import os

from app.models.youtube_account import YouTubeAccount
from app.core.config import settings

class YouTubeAuthService:
    """YouTube OAuth 授權服務"""

    # OAuth 配置
    SCOPES = ['https://www.googleapis.com/auth/youtube.upload']

    def __init__(self):
        """初始化 YouTube 授權服務"""
        self.client_config = {
            "web": {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uris": [settings.GOOGLE_REDIRECT_URI],
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token"
            }
        }

        # 初始化加密器（用於加密 Token）
        self.cipher = Fernet(settings.ENCRYPTION_KEY.encode())

    def get_authorization_url(self) -> str:
        """
        生成 Google OAuth 授權 URL

        Returns:
            str: OAuth 授權 URL
        """
        flow = Flow.from_client_config(
            self.client_config,
            scopes=self.SCOPES,
            redirect_uri=settings.GOOGLE_REDIRECT_URI
        )

        auth_url, _ = flow.authorization_url(
            access_type='offline',  # 取得 refresh token
            prompt='consent'        # 強制顯示授權畫面
        )

        return auth_url

    async def handle_oauth_callback(
        self,
        code: str,
        db: Session
    ) -> dict:
        """
        處理 OAuth callback，交換 Token 並儲存

        Args:
            code: OAuth authorization code
            db: 資料庫 session

        Returns:
            dict: 頻道資訊

        Raises:
            ValueError: Token 交換失敗
            Exception: 頻道已連結
        """
        # 1. 使用 authorization code 交換 access token
        flow = Flow.from_client_config(
            self.client_config,
            scopes=self.SCOPES,
            redirect_uri=settings.GOOGLE_REDIRECT_URI
        )

        try:
            flow.fetch_token(code=code)
        except Exception as e:
            raise ValueError(f"OAuth 授權碼交換失敗：{str(e)}")

        credentials = flow.credentials

        # 2. 使用 access token 取得頻道資訊
        youtube = build('youtube', 'v3', credentials=credentials)

        try:
            channels_response = youtube.channels().list(
                part='snippet,statistics',
                mine=True
            ).execute()
        except Exception as e:
            raise ValueError(f"取得 YouTube 頻道資訊失敗：{str(e)}")

        if not channels_response.get('items'):
            raise ValueError("找不到 YouTube 頻道")

        channel = channels_response['items'][0]
        channel_id = channel['id']
        channel_name = channel['snippet']['title']
        subscriber_count = int(channel['statistics'].get('subscriberCount', 0))

        # 3. 檢查頻道是否已連結
        existing = db.query(YouTubeAccount).filter(
            YouTubeAccount.channel_id == channel_id
        ).first()

        if existing:
            raise Exception("Channel already linked")

        # 4. 加密並儲存 Token
        encrypted_access_token = self._encrypt_token(credentials.token)
        encrypted_refresh_token = self._encrypt_token(credentials.refresh_token)

        # 5. 建立 YouTubeAccount 記錄
        account = YouTubeAccount(
            channel_id=channel_id,
            channel_name=channel_name,
            subscriber_count=subscriber_count,
            access_token=encrypted_access_token,
            refresh_token=encrypted_refresh_token,
            token_expires_at=datetime.utcnow() + timedelta(seconds=credentials.expiry.timestamp()),
            is_authorized=True,
            authorized_at=datetime.utcnow()
        )

        db.add(account)
        db.commit()
        db.refresh(account)

        # 6. 回傳頻道資訊（不包含 token）
        return {
            "id": str(account.id),
            "channel_name": account.channel_name,
            "channel_id": account.channel_id,
            "subscriber_count": account.subscriber_count,
            "is_authorized": account.is_authorized,
            "authorized_at": account.authorized_at.isoformat()
        }

    def list_accounts(self, db: Session) -> List[dict]:
        """
        列出所有已連結的 YouTube 帳號

        Args:
            db: 資料庫 session

        Returns:
            List[dict]: 帳號列表
        """
        accounts = db.query(YouTubeAccount).order_by(
            YouTubeAccount.authorized_at.desc()
        ).all()

        return [
            {
                "id": str(account.id),
                "channel_name": account.channel_name,
                "channel_id": account.channel_id,
                "subscriber_count": account.subscriber_count,
                "is_authorized": account.is_authorized,
                "authorized_at": account.authorized_at.isoformat()
            }
            for account in accounts
        ]

    def delete_account(self, account_id: str, db: Session) -> bool:
        """
        刪除 YouTube 帳號授權

        Args:
            account_id: 帳號 ID
            db: 資料庫 session

        Returns:
            bool: 是否成功刪除
        """
        account = db.query(YouTubeAccount).filter(
            YouTubeAccount.id == account_id
        ).first()

        if not account:
            return False

        db.delete(account)
        db.commit()

        return True

    def get_valid_credentials(self, account_id: str, db: Session):
        """
        取得有效的 OAuth credentials（自動更新 token 如果過期）

        Args:
            account_id: YouTube 帳號 ID
            db: 資料庫 session

        Returns:
            google.oauth2.credentials.Credentials: 有效的 credentials

        Raises:
            ValueError: 帳號不存在
        """
        account = db.query(YouTubeAccount).filter(
            YouTubeAccount.id == account_id
        ).first()

        if not account:
            raise ValueError("YouTube 帳號不存在")

        # 解密 token
        access_token = self._decrypt_token(account.access_token)
        refresh_token = self._decrypt_token(account.refresh_token)

        # 檢查 token 是否過期
        if datetime.utcnow() >= account.token_expires_at:
            # Token 已過期，使用 refresh token 更新
            access_token, expires_in = self._refresh_access_token(refresh_token)

            # 更新資料庫
            account.access_token = self._encrypt_token(access_token)
            account.token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
            db.commit()

        # 建立 credentials 物件
        from google.oauth2.credentials import Credentials

        credentials = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri=self.client_config['web']['token_uri'],
            client_id=self.client_config['web']['client_id'],
            client_secret=self.client_config['web']['client_secret'],
            scopes=self.SCOPES
        )

        return credentials

    def _encrypt_token(self, token: str) -> str:
        """加密 token"""
        return self.cipher.encrypt(token.encode()).decode()

    def _decrypt_token(self, encrypted_token: str) -> str:
        """解密 token"""
        return self.cipher.decrypt(encrypted_token.encode()).decode()

    def _refresh_access_token(self, refresh_token: str) -> tuple[str, int]:
        """
        使用 refresh token 取得新的 access token

        Args:
            refresh_token: Refresh token

        Returns:
            tuple: (新的 access token, 過期秒數)
        """
        import requests

        response = requests.post(
            'https://oauth2.googleapis.com/token',
            data={
                'client_id': settings.GOOGLE_CLIENT_ID,
                'client_secret': settings.GOOGLE_CLIENT_SECRET,
                'refresh_token': refresh_token,
                'grant_type': 'refresh_token'
            }
        )

        if response.status_code != 200:
            raise ValueError(f"Token 更新失敗：{response.text}")

        data = response.json()
        return data['access_token'], data['expires_in']
```

---

#### 3. Pydantic Schemas: `backend/app/schemas/youtube.py`

**職責：** Request/Response 資料驗證

```python
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

# ===== Request Schemas =====

class AuthCallbackRequest(BaseModel):
    """OAuth callback 請求"""
    code: str = Field(..., description="OAuth authorization code")

# ===== Response Schemas =====

class AuthUrlData(BaseModel):
    """授權 URL 資料"""
    auth_url: str

class AuthUrlResponse(BaseModel):
    """授權 URL 回應"""
    success: bool = True
    data: AuthUrlData

class YouTubeAccountData(BaseModel):
    """YouTube 帳號資料"""
    id: str
    channel_name: str
    channel_id: str
    subscriber_count: int
    is_authorized: bool
    authorized_at: str  # ISO 8601 格式

class YouTubeAccountResponse(BaseModel):
    """YouTube 帳號回應"""
    success: bool = True
    data: YouTubeAccountData

class YouTubeAccountListData(BaseModel):
    """YouTube 帳號列表資料"""
    accounts: List[YouTubeAccountData]

class YouTubeAccountListResponse(BaseModel):
    """YouTube 帳號列表回應"""
    success: bool = True
    data: YouTubeAccountListData
```

---

#### 4. 資料模型: `backend/app/models/youtube_account.py`

**職責：** YouTubeAccount 資料模型（已在 Task-002 建立，此處僅列出供參考）

```python
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime

from app.database import Base

class YouTubeAccount(Base):
    """YouTube 帳號模型"""
    __tablename__ = "youtube_accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    channel_name = Column(String(200), nullable=False)
    channel_id = Column(String(100), nullable=False, unique=True, index=True)

    # Token（加密儲存）
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=False)
    token_expires_at = Column(DateTime, nullable=False)

    # 帳號資訊
    subscriber_count = Column(Integer, default=0)
    is_authorized = Column(Boolean, default=True)
    authorized_at = Column(DateTime, nullable=False, default=datetime.utcnow)
```

---

#### 5. 配置檔案: `backend/app/core/config.py`

**職責：** 環境變數與配置（新增 YouTube 相關配置）

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # ... 其他配置 ...

    # Google OAuth 配置
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    GOOGLE_REDIRECT_URI: str = "http://localhost:3000/oauth/callback"

    # Token 加密金鑰（Fernet key）
    ENCRYPTION_KEY: str  # 使用 Fernet.generate_key() 生成

    class Config:
        env_file = ".env"

settings = Settings()
```

---

#### 6. 測試檔案: `backend/tests/api/test_youtube.py`

**職責：** API 端點測試

```python
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, MagicMock
from app.main import app
from app.database import get_db

client = TestClient(app)

# ===== 單元測試 =====

def test_get_auth_url_success():
    """測試 1：成功取得 OAuth 授權 URL"""
    response = client.get("/api/v1/youtube/auth-url")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "auth_url" in data["data"]

    auth_url = data["data"]["auth_url"]
    assert "accounts.google.com/o/oauth2" in auth_url
    assert "scope=https://www.googleapis.com/auth/youtube.upload" in auth_url
    assert "access_type=offline" in auth_url
    assert "prompt=consent" in auth_url

@patch('app.services.youtube_auth_service.build')
@patch('app.services.youtube_auth_service.Flow')
def test_auth_callback_success(mock_flow, mock_build):
    """測試 2：成功處理 OAuth Callback"""
    # Mock Flow
    mock_flow_instance = MagicMock()
    mock_flow_instance.credentials.token = "mock-access-token"
    mock_flow_instance.credentials.refresh_token = "mock-refresh-token"
    mock_flow_instance.credentials.expiry.timestamp.return_value = 3600
    mock_flow.from_client_config.return_value = mock_flow_instance

    # Mock YouTube API
    mock_youtube = MagicMock()
    mock_youtube.channels().list().execute.return_value = {
        "items": [{
            "id": "UC_mock_channel_id",
            "snippet": {"title": "測試頻道"},
            "statistics": {"subscriberCount": "1000"}
        }]
    }
    mock_build.return_value = mock_youtube

    response = client.post(
        "/api/v1/youtube/auth-callback",
        json={"code": "mock-authorization-code"}
    )

    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["channel_name"] == "測試頻道"
    assert data["data"]["channel_id"] == "UC_mock_channel_id"
    assert data["data"]["subscriber_count"] == 1000

def test_auth_callback_invalid_code():
    """測試 3a：無效的 Authorization Code"""
    with patch('app.services.youtube_auth_service.Flow') as mock_flow:
        mock_flow.from_client_config.return_value.fetch_token.side_effect = Exception("invalid_grant")

        response = client.post(
            "/api/v1/youtube/auth-callback",
            json={"code": "invalid-code"}
        )

        assert response.status_code == 400
        data = response.json()
        assert data["error"]["code"] == "OAUTH_EXCHANGE_FAILED"

def test_list_accounts_success():
    """測試 4：列出所有已連結帳號"""
    # 假設資料庫中有 2 個帳號（需要 fixture 或 test database）
    response = client.get("/api/v1/youtube/accounts")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "accounts" in data["data"]
    assert isinstance(data["data"]["accounts"], list)

def test_delete_account_success():
    """測試 5：移除 YouTube 授權"""
    # 需要先建立一個測試帳號
    account_id = "test-account-id"

    response = client.delete(f"/api/v1/youtube/accounts/{account_id}")

    # 假設帳號存在
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True

def test_delete_account_not_found():
    """測試 5a：移除不存在的帳號"""
    response = client.delete("/api/v1/youtube/accounts/non-existent-id")

    assert response.status_code == 404
    data = response.json()
    assert data["error"]["code"] == "ACCOUNT_NOT_FOUND"
```

---

#### 7. Service 測試檔案: `backend/tests/services/test_youtube_auth_service.py`

**職責：** YouTubeAuthService 業務邏輯測試

```python
import pytest
from unittest.mock import Mock, patch
from app.services.youtube_auth_service import YouTubeAuthService
from datetime import datetime, timedelta

@pytest.fixture
def youtube_service():
    return YouTubeAuthService()

def test_get_authorization_url(youtube_service):
    """測試生成授權 URL"""
    auth_url = youtube_service.get_authorization_url()

    assert "accounts.google.com" in auth_url
    assert "scope" in auth_url
    assert "access_type=offline" in auth_url

@patch('app.services.youtube_auth_service.requests.post')
def test_refresh_access_token(mock_post, youtube_service):
    """測試 7：Token 自動更新機制"""
    mock_post.return_value.status_code = 200
    mock_post.return_value.json.return_value = {
        "access_token": "new-access-token",
        "expires_in": 3600
    }

    new_token, expires_in = youtube_service._refresh_access_token("mock-refresh-token")

    assert new_token == "new-access-token"
    assert expires_in == 3600

    # 驗證 API 呼叫參數
    mock_post.assert_called_once()
    call_kwargs = mock_post.call_args[1]
    assert call_kwargs['data']['grant_type'] == 'refresh_token'
    assert call_kwargs['data']['refresh_token'] == "mock-refresh-token"
```

---

### API 端點規格

#### 1. GET /api/v1/youtube/auth-url

**說明：** 取得 Google OAuth 授權 URL

**查詢參數：** 無

**回應：**
- **200 OK** - 成功取得授權 URL
- **500 Internal Server Error** - 伺服器錯誤

---

#### 2. POST /api/v1/youtube/auth-callback

**說明：** 處理 OAuth callback，儲存授權 Token

**請求 Body：**
```json
{
  "code": "string"
}
```

**回應：**
- **201 Created** - 授權成功，頻道已連結
- **400 Bad Request** - Authorization code 無效
- **409 Conflict** - 頻道已經連結

---

#### 3. GET /api/v1/youtube/accounts

**說明：** 取得所有已連結的 YouTube 帳號

**查詢參數：** 無

**回應：**
- **200 OK** - 成功取得帳號列表（可能為空陣列）

---

#### 4. DELETE /api/v1/youtube/accounts/:id

**說明：** 移除 YouTube 授權

**路徑參數：**
- `id` (UUID) - YouTube 帳號 ID

**回應：**
- **200 OK** - 授權已移除
- **404 Not Found** - 帳號不存在

---

### OAuth 2.0 流程圖

```
用戶端                          後端                        Google OAuth
  |                              |                              |
  |--- GET /youtube/auth-url --->|                              |
  |                              |                              |
  |<-- auth_url -----------------|                              |
  |                              |                              |
  |- 開啟 auth_url (瀏覽器) ---->|                              |
  |                              |                              |
  |                              |<-- 用戶授權 ---------------->|
  |                              |                              |
  |<-- 重定向 (code) ------------|<-- redirect_uri?code=... ----|
  |                              |                              |
  |- POST /youtube/auth-callback-|                              |
  |   {code: "..."}              |                              |
  |                              |--- POST /token ------------->|
  |                              |    (code, client_id, ...)    |
  |                              |                              |
  |                              |<-- access_token, refresh_token|
  |                              |                              |
  |                              |--- GET channels.list ------->|
  |                              |    (Authorization: Bearer...) |
  |                              |                              |
  |                              |<-- 頻道資訊 ------------------|
  |                              |                              |
  |                              |- 加密並儲存 token 到 DB      |
  |                              |                              |
  |<-- 頻道資訊 (201 Created) ---|                              |
```

---

### Token 更新流程圖

```
YouTubeAuthService                  資料庫                    Google OAuth
        |                              |                              |
        |- get_valid_credentials() --->|                              |
        |                              |                              |
        |<-- YouTubeAccount ----------|                              |
        |    (access_token, refresh_token, expires_at)               |
        |                              |                              |
        |- 檢查 token 是否過期         |                              |
        |   (utcnow >= expires_at?)    |                              |
        |                              |                              |
        |- 如果過期:                   |                              |
        |   _refresh_access_token() -->|                              |
        |                              |                              |
        |                              |--- POST /token ------------->|
        |                              |    (refresh_token, ...)      |
        |                              |                              |
        |                              |<-- new access_token ---------|
        |                              |                              |
        |-- 更新 DB ------------------>|                              |
        |   (新 access_token, 新 expires_at)                          |
        |                              |                              |
        |<-- Credentials 物件 ---------|                              |
```

---

## 開發指引

### TDD 開發流程

#### 第 1 步：環境準備（10 分鐘）
1. 確認 Task-002 (資料庫) 和 Task-003 (API 基礎) 已完成
2. 安裝依賴套件：
   ```bash
   pip install google-auth-oauthlib google-api-python-client cryptography
   ```
3. 設定環境變數（`.env` 檔案）：
   ```bash
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/oauth/callback
   ENCRYPTION_KEY=$(python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
   ```
4. 閱讀 `tech-specs/backend/api-youtube.md` 和 `auth.md`

#### 第 2 步：撰寫第一個測試（15 分鐘）
1. 建立 `tests/api/test_youtube.py`
2. 撰寫「測試 1：成功取得 OAuth 授權 URL」
3. 執行測試 → 失敗（預期，因為還沒實作）

#### 第 3 步：實作基礎架構（30 分鐘）
1. 建立 `app/schemas/youtube.py` - Pydantic models
2. 建立 `app/services/youtube_auth_service.py` - Service 骨架
3. 建立 `app/api/v1/youtube.py` - Router 骨架
4. 在 `app/main.py` 註冊 router：
   ```python
   from app.api.v1 import youtube
   app.include_router(youtube.router, prefix="/api/v1")
   ```

#### 第 4 步：實作 OAuth URL 生成（20 分鐘）
1. 實作 `YouTubeAuthService.get_authorization_url()`
2. 實作 `GET /api/v1/youtube/auth-url` 端點
3. 執行測試 1 → 通過 ✅

#### 第 5 步：撰寫 OAuth Callback 測試（20 分鐘）
1. 撰寫「測試 2：成功處理 OAuth Callback」
2. 設定 Mock (Flow, YouTube API)
3. 執行測試 → 失敗

#### 第 6 步：實作 OAuth Callback（60 分鐘）
1. 實作 `YouTubeAuthService.handle_oauth_callback()`
   - Token 交換
   - 取得頻道資訊
   - 檢查重複
   - 加密儲存 Token
2. 實作 Token 加密/解密方法
3. 實作 `POST /api/v1/youtube/auth-callback` 端點
4. 執行測試 2 → 通過 ✅

#### 第 7 步：撰寫錯誤處理測試（15 分鐘）
1. 撰寫「測試 3a：無效的 Authorization Code」
2. 撰寫「測試 3b：重複連結相同頻道」
3. 執行測試 → 失敗

#### 第 8 步：實作錯誤處理（20 分鐘）
1. 加入 try-except 錯誤處理
2. 實作重複頻道檢查
3. 執行測試 3a, 3b → 通過 ✅

#### 第 9 步：實作帳號列表與刪除（30 分鐘）
1. 撰寫「測試 4：列出所有已連結帳號」
2. 撰寫「測試 5：移除 YouTube 授權」
3. 實作 `list_accounts()` 和 `delete_account()`
4. 執行測試 4, 5 → 通過 ✅

#### 第 10 步：實作 Token 自動更新（40 分鐘）
1. 撰寫「測試 7：Token 自動更新機制」
2. 實作 `get_valid_credentials()` 方法
3. 實作 `_refresh_access_token()` 方法
4. 執行測試 7 → 通過 ✅

#### 第 11 步：整合測試（30 分鐘）
1. 撰寫「測試 6：完整 OAuth 授權流程」
2. 使用測試資料庫執行完整流程
3. 執行測試 6 → 通過 ✅

#### 第 12 步：重構與優化（20 分鐘）
1. 檢查程式碼重複
2. 提取共用邏輯
3. 改善錯誤訊息
4. 再次執行所有測試

#### 第 13 步：文件與檢查（20 分鐘）
1. 添加 docstring 到所有方法
2. 檢查測試覆蓋率：`pytest --cov=app.services.youtube_auth_service --cov=app.api.v1.youtube`
3. 執行 linter：`ruff check .`
4. 格式化程式碼：`ruff format .`

---

### 注意事項

#### 安全性
- ⚠️ **絕對不要**在日誌中記錄 access_token 或 refresh_token
- ⚠️ **絕對不要**在 API 回應中回傳 token（除了內部使用）
- ⚠️ Token 必須使用 Fernet 加密儲存到資料庫
- ⚠️ ENCRYPTION_KEY 必須妥善保管，遺失將無法解密 token
- ⚠️ OAuth redirect_uri 必須與 Google Console 設定一致

#### Google OAuth 設定
- 💡 需要在 Google Cloud Console 建立 OAuth 2.0 憑證
- 💡 redirect_uri 設定：`http://localhost:3000/oauth/callback` (開發環境)
- 💡 Scopes 設定：`https://www.googleapis.com/auth/youtube.upload`
- 💡 測試時使用 Google 測試帳號

#### Token 管理
- 💡 Access Token 有效期通常為 1 小時
- 💡 Refresh Token 長期有效（除非用戶撤銷授權）
- 💡 定期檢查 token 是否過期，自動更新
- 💡 處理 Token 更新失敗情況（提示用戶重新授權）

#### 測試
- ✅ 使用 Mock 避免真實 API 呼叫
- ✅ 測試所有錯誤情境（無效 code、重複頻道、token 過期等）
- ✅ 使用測試資料庫（不影響開發資料）
- ✅ 測試加密/解密邏輯正確性

#### 與其他模組整合
- 🔗 Task-013（YouTube 上傳）會使用 `get_valid_credentials()` 取得授權
- 🔗 Task-020（首次設定頁面）會呼叫 `/youtube/auth-url` 和 `/youtube/auth-callback`
- 🔗 Task-026（系統設定頁面）會呼叫 `/youtube/accounts` 和 DELETE 端點

---

### 完成檢查清單

#### 功能完整性
- [ ] GET /api/v1/youtube/auth-url 實作完成
- [ ] POST /api/v1/youtube/auth-callback 實作完成
- [ ] GET /api/v1/youtube/accounts 實作完成
- [ ] DELETE /api/v1/youtube/accounts/:id 實作完成
- [ ] OAuth 2.0 流程符合 Google 規範
- [ ] Token 加密儲存正常運作
- [ ] Token 自動更新機制正常運作
- [ ] 支援多個 YouTube 帳號連結
- [ ] 錯誤處理完整（無效 code、重複頻道、token 過期等）

#### 測試
- [ ] 所有 7 個測試通過（5 個單元測試 + 2 個整合測試）
- [ ] 測試覆蓋率 > 80%
- [ ] Mock 正確設定（不呼叫真實 API）
- [ ] 錯誤情境測試完整

#### 程式碼品質
- [ ] Ruff check 無錯誤：`ruff check .`
- [ ] 程式碼已格式化：`ruff format .`
- [ ] 所有方法都有 docstring
- [ ] 無 type 錯誤（如使用 mypy）
- [ ] 無硬編碼的敏感資訊

#### 安全性
- [ ] Token 使用 Fernet 加密儲存
- [ ] API 回應不包含 token
- [ ] 日誌不包含 token
- [ ] ENCRYPTION_KEY 使用環境變數
- [ ] OAuth client_secret 使用環境變數

#### 文件
- [ ] API 端點都有 docstring
- [ ] 複雜邏輯有註解
- [ ] README 已更新（如需要）
- [ ] `.env.example` 已更新（包含新的環境變數）

#### 整合
- [ ] 在本地環境測試 OAuth 流程（使用真實 Google OAuth）
- [ ] 測試 Token 自動更新機制
- [ ] 測試多帳號連結
- [ ] 測試授權移除
- [ ] 資料庫記錄正確建立與刪除

#### Spec 同步
- [ ] 如果實作與 spec 有差異，已更新 `tech-specs/backend/api-youtube.md`
- [ ] 如果有新的依賴套件，已更新 `requirements.txt`
- [ ] 如果有新的環境變數，已更新文件

---

## 預估時間分配

- 環境準備：10 分鐘
- 撰寫測試：70 分鐘
- 實作功能：200 分鐘
- 重構優化：20 分鐘
- 文件檢查：20 分鐘

**總計：約 5.3 小時**（預留 0.7 小時 buffer = 6 小時）

---

## 參考資源

### Google 官方文檔
- [OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [YouTube Data API v3](https://developers.google.com/youtube/v3)
- [google-auth-oauthlib 套件](https://google-auth-oauthlib.readthedocs.io/)

### 相關套件文檔
- [google-api-python-client](https://github.com/googleapis/google-api-python-client) - YouTube API 客戶端
- [cryptography (Fernet)](https://cryptography.io/en/latest/fernet/) - Token 加密
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/) - 安全性最佳實踐

### 專案內部文件
- `tech-specs/backend/api-youtube.md` - YouTube API 規格
- `tech-specs/backend/auth.md` - 認證與授權設計
- `tech-specs/backend/database.md` - YouTubeAccount 資料模型
- `product-design/flows.md` - 使用者流程（Flow-0, Flow-9）

---

**準備好了嗎？** 開始使用 TDD 方式實作 YouTube OAuth 授權功能！🚀
