# Task-006: System API 實作

> **建立日期：** 2025-10-19
> **狀態：** ⏳ 未開始
> **預計時間：** 5 小時
> **優先級：** P0 (必須)

---

## 關聯文件

### 產品設計
- **使用者流程：** `product-design/flows.md#Flow-0` (首次啟動設定流程)
  - 步驟 3-8: API Keys 設定與測試
  - 步驟 11: 完成設定並儲存
- **使用者流程：** `product-design/flows.md#Flow-9` (系統設定管理)
  - API Keys 管理
  - 配額查詢

### 技術規格
- **API 規格：** `tech-specs/backend/api-system.md`
  - 1.3.1: 檢查系統初始化狀態
  - 1.3.2: 儲存 API Key
  - 1.3.3: 測試 API Key
- **API 設計規範：** `tech-specs/backend/api-design.md`
  - RESTful 設計原則
  - 錯誤處理規範
  - 輸入驗證規範
- **資料模型：** `tech-specs/backend/database.md`
  - SystemSettings 資料表設計
- **安全措施：** `tech-specs/backend/security.md`
  - API Key 加密儲存
  - Keychain 整合

### 相關任務
- **前置任務:** Task-002 ✅ (資料庫設計), Task-003 ✅ (API 基礎架構)
- **後續任務:** Task-020 (首次設定頁面), Task-026 (系統設定頁面)
- **並行任務:** Task-004, 005, 007, 008, 009 (可並行開發)

---

## 任務目標

### 簡述
實作系統管理 API，包含：
1. **API Keys 管理** - 儲存、測試、查詢 API Keys（Gemini, Stability AI, D-ID）
2. **系統初始化檢查** - 檢查首次啟動狀態
3. **配額查詢** - 查詢各服務的 API 配額狀態
4. **Keychain 整合** - 使用系統 Keychain 安全儲存敏感資訊（macOS/Linux/Windows）

### 成功標準
- [ ] 4 個 API 端點全部實作完成
- [ ] Keychain 整合完成（跨平台：macOS Keychain、Linux Secret Service、Windows Credential Manager）
- [ ] SystemService 業務邏輯完整（包含 API Key 驗證邏輯）
- [ ] 配額監控邏輯完成（D-ID 90 分鐘/月、YouTube 10,000 units/日）
- [ ] 單元測試覆蓋率 > 80%
- [ ] 所有測試通過（包含 Keychain mock 測試）

---

## 測試要求

### 單元測試

#### 測試 1：成功儲存 Gemini API Key

**目的：** 驗證 API Key 可以成功儲存到 Keychain

**輸入：**
```json
POST /api/v1/system/api-keys
{
  "provider": "gemini",
  "api_key": "AIzaSyDXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
}
```

**預期輸出：**
```json
Status: 200 OK
{
  "success": true,
  "message": "API Key 已儲存"
}
```

**驗證點：**
- [ ] 回傳 200 狀態碼
- [ ] API Key 已儲存到 Keychain（使用 keyring 套件）
- [ ] Keychain 服務名稱為 "ytmaker"
- [ ] Keychain 金鑰名稱為 "gemini_api_key"
- [ ] 實際儲存的是加密後的值（不是明文）
- [ ] SystemSettings 資料表更新 "api_keys_configured.gemini" 為 true

---

#### 測試 2：API Key 格式驗證

**目的：** 驗證系統拒絕不合法的 API Key 格式

**輸入：**
```json
POST /api/v1/system/api-keys
{
  "provider": "gemini",
  "api_key": "short"
}
```

**預期輸出：**
```json
Status: 400 Bad Request
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "API Key 長度必須至少 10 個字元",
    "field": "api_key"
  }
}
```

**驗證點：**
- [ ] 回傳 400 狀態碼
- [ ] 錯誤訊息清楚說明問題
- [ ] 未儲存到 Keychain
- [ ] 未更新 SystemSettings

---

#### 測試 3：成功測試 Gemini API 連線

**目的：** 驗證可以測試 API Key 的有效性

**前置條件：**
- Keychain 中已儲存 "gemini_api_key"

**輸入：**
```json
POST /api/v1/system/api-keys/test
{
  "provider": "gemini"
}
```

**預期輸出：**
```json
Status: 200 OK
{
  "success": true,
  "data": {
    "is_valid": true,
    "message": "連線成功"
  }
}
```

**驗證點：**
- [ ] 回傳 200 狀態碼
- [ ] 從 Keychain 讀取 API Key
- [ ] 調用 Gemini API 進行測試請求（簡單的 generateContent）
- [ ] API 回應成功視為有效
- [ ] 如果失敗，回傳具體錯誤訊息

---

#### 測試 4：API Key 不存在時測試連線

**目的：** 驗證測試不存在的 API Key 時的錯誤處理

**前置條件：**
- Keychain 中未儲存 "stability_ai_api_key"

**輸入：**
```json
POST /api/v1/system/api-keys/test
{
  "provider": "stability_ai"
}
```

**預期輸出：**
```json
Status: 404 Not Found
{
  "success": false,
  "error": {
    "code": "API_KEY_NOT_FOUND",
    "message": "尚未設定 Stability AI 的 API Key"
  }
}
```

**驗證點：**
- [ ] 回傳 404 狀態碼
- [ ] 錯誤訊息清楚說明問題
- [ ] 不嘗試調用外部 API

---

#### 測試 5：檢查系統初始化狀態（已初始化）

**目的：** 驗證系統可以正確檢查初始化狀態

**前置條件：**
- Keychain 中已儲存 gemini_api_key, stability_ai_api_key, did_api_key
- SystemSettings 中 youtube_connected = true

**輸入：**
```json
GET /api/v1/system/init-status
```

**預期輸出：**
```json
Status: 200 OK
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

**驗證點：**
- [ ] 回傳 200 狀態碼
- [ ] 檢查所有 3 個 API Keys 是否存在於 Keychain
- [ ] 檢查 SystemSettings 中的 youtube_connected 狀態
- [ ] is_initialized 為 true 當所有 API Keys 都已設定
- [ ] 正確回報每個 API Key 的設定狀態

---

#### 測試 6：檢查系統初始化狀態（部分初始化）

**目的：** 驗證系統可以正確檢查部分初始化狀態

**前置條件：**
- Keychain 中只儲存了 gemini_api_key
- SystemSettings 中 youtube_connected = false

**輸入：**
```json
GET /api/v1/system/init-status
```

**預期輸出：**
```json
Status: 200 OK
{
  "success": true,
  "data": {
    "is_initialized": false,
    "api_keys_configured": {
      "gemini": true,
      "stability_ai": false,
      "did": false
    },
    "youtube_connected": false
  }
}
```

**驗證點：**
- [ ] 回傳 200 狀態碼
- [ ] is_initialized 為 false（因為有 API Key 未設定）
- [ ] 正確回報每個 API Key 的設定狀態
- [ ] youtube_connected 正確反映資料庫狀態

---

#### 測試 7：查詢 API 配額狀態

**目的：** 驗證可以查詢各服務的配額狀態

**前置條件：**
- SystemSettings 中已有配額使用記錄
- D-ID 本月已使用 30 分鐘
- YouTube 今日已使用 2000 units

**輸入：**
```json
GET /api/v1/system/quota
```

**預期輸出：**
```json
Status: 200 OK
{
  "success": true,
  "data": {
    "did": {
      "total": 90,
      "used": 30,
      "remaining": 60,
      "unit": "minutes",
      "reset_date": "2025-11-01T00:00:00Z"
    },
    "youtube": {
      "total": 10000,
      "used": 2000,
      "remaining": 8000,
      "unit": "units",
      "reset_date": "2025-10-21T00:00:00Z"
    }
  }
}
```

**驗證點：**
- [ ] 回傳 200 狀態碼
- [ ] D-ID 配額計算正確（月度重置）
- [ ] YouTube 配額計算正確（每日重置）
- [ ] reset_date 計算正確（D-ID: 下個月 1 號、YouTube: 明天）
- [ ] 配額資料從 SystemSettings 讀取

---

### 整合測試

#### 測試 8：完整的首次設定流程

**目的：** 驗證 Flow-0 的完整流程

**流程：**
1. 檢查初始化狀態 → is_initialized: false
2. 儲存 Gemini API Key → 成功
3. 測試 Gemini API 連線 → 成功
4. 儲存 Stability AI API Key → 成功
5. 測試 Stability AI API 連線 → 成功
6. 儲存 D-ID API Key → 成功
7. 測試 D-ID API 連線 → 成功
8. 檢查初始化狀態 → is_initialized: true（假設 YouTube 也已連結）

**驗證點：**
- [ ] 整個流程無錯誤
- [ ] 所有 API Keys 成功儲存到 Keychain
- [ ] 所有連線測試通過
- [ ] 最終 is_initialized 為 true

---

### Keychain 跨平台測試

#### 測試 9：Keychain 跨平台相容性

**目的：** 驗證 keyring 套件在不同平台正常運作

**測試平台：**
- macOS: Keychain Access
- Linux: Secret Service (GNOME Keyring, KWallet)
- Windows: Credential Manager

**驗證點：**
- [ ] macOS: 可在 Keychain Access.app 中看到 "ytmaker" 項目
- [ ] Linux: 可在 seahorse 或 KWalletManager 中看到項目
- [ ] Windows: 可在控制台 > 認證管理員中看到項目
- [ ] 儲存後重啟應用可正常讀取
- [ ] 刪除後再次儲存不會報錯

---

## 實作規格

### 需要建立/修改的檔案

#### 1. API Router: `backend/app/api/v1/system.py`

**職責：** 處理系統管理相關的 HTTP 請求

**方法：**

```python
from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.system import (
    APIKeyRequest,
    APIKeyTestRequest,
    InitStatusResponse,
    QuotaResponse
)
from app.services.system_service import SystemService
from app.core.dependencies import get_system_service

router = APIRouter(prefix="/system", tags=["system"])

@router.get("/init-status", response_model=InitStatusResponse)
async def get_init_status(
    system_service: SystemService = Depends(get_system_service)
):
    """
    檢查系統初始化狀態

    回傳：
    - is_initialized: 是否完成初始化（所有 API Keys 已設定）
    - api_keys_configured: 各 API Key 的設定狀態
    - youtube_connected: YouTube 是否已連結
    """
    return await system_service.check_init_status()

@router.post("/api-keys", status_code=status.HTTP_200_OK)
async def save_api_key(
    data: APIKeyRequest,
    system_service: SystemService = Depends(get_system_service)
):
    """
    儲存 API Key 到 Keychain

    參數：
    - provider: 服務提供者（gemini, stability_ai, did）
    - api_key: API Key 字串（最少 10 字元）
    """
    await system_service.save_api_key(data.provider, data.api_key)
    return {"success": True, "message": "API Key 已儲存"}

@router.post("/api-keys/test")
async def test_api_key(
    data: APIKeyTestRequest,
    system_service: SystemService = Depends(get_system_service)
):
    """
    測試 API Key 是否有效

    參數：
    - provider: 服務提供者

    回傳：
    - is_valid: 是否有效
    - message: 測試結果訊息
    """
    result = await system_service.test_api_key(data.provider)
    return {"success": True, "data": result}

@router.get("/quota", response_model=QuotaResponse)
async def get_quota(
    system_service: SystemService = Depends(get_system_service)
):
    """
    查詢 API 配額狀態

    回傳：
    - did: D-ID 配額（90 分鐘/月）
    - youtube: YouTube 配額（10,000 units/日）
    """
    return await system_service.get_quota_status()
```

---

#### 2. Service: `backend/app/services/system_service.py`

**職責：** 系統管理業務邏輯

**方法：**

```python
from sqlalchemy.orm import Session
from app.models.system_settings import SystemSettings
from app.security.keychain import KeychainManager
from app.integrations.gemini_client import GeminiClient
from app.integrations.stability_client import StabilityClient
from app.integrations.did_client import DIDClient
from fastapi import HTTPException, status
from datetime import datetime, timedelta
from typing import Dict, Any

class SystemService:
    def __init__(self, db: Session):
        self.db = db
        self.keychain = KeychainManager()

    async def check_init_status(self) -> Dict[str, Any]:
        """
        檢查系統初始化狀態

        Returns:
            初始化狀態資訊
        """
        # 檢查各 API Key 是否已設定
        gemini_configured = self.keychain.get_api_key("gemini") is not None
        stability_configured = self.keychain.get_api_key("stability_ai") is not None
        did_configured = self.keychain.get_api_key("did") is not None

        # 檢查 YouTube 連結狀態
        youtube_setting = self.db.query(SystemSettings).filter(
            SystemSettings.key == "youtube_connected"
        ).first()
        youtube_connected = youtube_setting.value == "true" if youtube_setting else False

        # 判斷是否完成初始化（所有 API Keys 都已設定）
        is_initialized = all([
            gemini_configured,
            stability_configured,
            did_configured
        ])

        return {
            "is_initialized": is_initialized,
            "api_keys_configured": {
                "gemini": gemini_configured,
                "stability_ai": stability_configured,
                "did": did_configured
            },
            "youtube_connected": youtube_connected
        }

    async def save_api_key(self, provider: str, api_key: str):
        """
        儲存 API Key 到 Keychain

        Args:
            provider: 服務提供者（gemini, stability_ai, did）
            api_key: API Key 字串

        Raises:
            HTTPException: 如果儲存失敗
        """
        # 驗證 provider
        valid_providers = ["gemini", "stability_ai", "did"]
        if provider not in valid_providers:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "INVALID_PROVIDER",
                    "message": f"無效的服務提供者：{provider}"
                }
            )

        # 驗證 API Key 長度
        if len(api_key) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "INVALID_INPUT",
                    "message": "API Key 長度必須至少 10 個字元",
                    "field": "api_key"
                }
            )

        # 儲存到 Keychain
        try:
            self.keychain.save_api_key(provider, api_key)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "code": "KEYCHAIN_ERROR",
                    "message": f"儲存 API Key 失敗：{str(e)}"
                }
            )

    async def test_api_key(self, provider: str) -> Dict[str, Any]:
        """
        測試 API Key 是否有效

        Args:
            provider: 服務提供者

        Returns:
            測試結果 {"is_valid": bool, "message": str}

        Raises:
            HTTPException: 如果 API Key 不存在
        """
        # 從 Keychain 讀取 API Key
        api_key = self.keychain.get_api_key(provider)
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "API_KEY_NOT_FOUND",
                    "message": f"尚未設定 {self._get_provider_name(provider)} 的 API Key"
                }
            )

        # 根據 provider 測試連線
        try:
            if provider == "gemini":
                client = GeminiClient(api_key)
                await client.test_connection()
            elif provider == "stability_ai":
                client = StabilityClient(api_key)
                await client.test_connection()
            elif provider == "did":
                client = DIDClient(api_key)
                await client.test_connection()

            return {
                "is_valid": True,
                "message": "連線成功"
            }
        except Exception as e:
            return {
                "is_valid": False,
                "message": f"連線失敗：{str(e)}"
            }

    async def get_quota_status(self) -> Dict[str, Any]:
        """
        查詢 API 配額狀態

        Returns:
            配額資訊
        """
        # 查詢 D-ID 本月使用量
        did_usage_setting = self.db.query(SystemSettings).filter(
            SystemSettings.key == "did_monthly_usage"
        ).first()
        did_used = int(did_usage_setting.value) if did_usage_setting else 0

        # 查詢 YouTube 今日使用量
        youtube_usage_setting = self.db.query(SystemSettings).filter(
            SystemSettings.key == "youtube_daily_usage"
        ).first()
        youtube_used = int(youtube_usage_setting.value) if youtube_usage_setting else 0

        # 計算重置日期
        now = datetime.utcnow()
        did_reset_date = (now.replace(day=1) + timedelta(days=32)).replace(day=1)  # 下個月 1 號
        youtube_reset_date = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)  # 明天 00:00

        return {
            "did": {
                "total": 90,
                "used": did_used,
                "remaining": 90 - did_used,
                "unit": "minutes",
                "reset_date": did_reset_date.isoformat() + "Z"
            },
            "youtube": {
                "total": 10000,
                "used": youtube_used,
                "remaining": 10000 - youtube_used,
                "unit": "units",
                "reset_date": youtube_reset_date.isoformat() + "Z"
            }
        }

    def _get_provider_name(self, provider: str) -> str:
        """取得服務提供者的顯示名稱"""
        names = {
            "gemini": "Gemini",
            "stability_ai": "Stability AI",
            "did": "D-ID"
        }
        return names.get(provider, provider)
```

---

#### 3. Keychain Manager: `backend/app/security/keychain.py`

**職責：** 跨平台 Keychain 整合

**方法：**

```python
import keyring
from typing import Optional

class KeychainManager:
    """
    跨平台 Keychain 管理器

    使用 keyring 套件統一處理：
    - macOS: Keychain Access
    - Linux: Secret Service (GNOME Keyring, KWallet)
    - Windows: Credential Manager
    """

    SERVICE_NAME = "ytmaker"

    def save_api_key(self, provider: str, api_key: str):
        """
        儲存 API Key 到系統 Keychain

        Args:
            provider: 服務提供者（gemini, stability_ai, did）
            api_key: API Key 字串

        Raises:
            Exception: 如果儲存失敗
        """
        key_name = f"{provider}_api_key"
        try:
            keyring.set_password(self.SERVICE_NAME, key_name, api_key)
        except Exception as e:
            raise Exception(f"無法儲存到 Keychain：{str(e)}")

    def get_api_key(self, provider: str) -> Optional[str]:
        """
        從 Keychain 讀取 API Key

        Args:
            provider: 服務提供者

        Returns:
            API Key 字串，如果不存在則回傳 None
        """
        key_name = f"{provider}_api_key"
        try:
            return keyring.get_password(self.SERVICE_NAME, key_name)
        except Exception:
            return None

    def delete_api_key(self, provider: str):
        """
        從 Keychain 刪除 API Key

        Args:
            provider: 服務提供者
        """
        key_name = f"{provider}_api_key"
        try:
            keyring.delete_password(self.SERVICE_NAME, key_name)
        except Exception:
            pass  # 如果不存在就忽略
```

---

#### 4. Pydantic Schemas: `backend/app/schemas/system.py`

**職責：** Request/Response 資料驗證

```python
from pydantic import BaseModel, Field
from typing import Literal, Dict
from datetime import datetime

class APIKeyRequest(BaseModel):
    provider: Literal["gemini", "stability_ai", "did"]
    api_key: str = Field(..., min_length=10, description="API Key（至少 10 字元）")

class APIKeyTestRequest(BaseModel):
    provider: Literal["gemini", "stability_ai", "did"]

class InitStatusResponse(BaseModel):
    success: bool = True
    data: Dict

class QuotaInfo(BaseModel):
    total: int
    used: int
    remaining: int
    unit: str
    reset_date: str

class QuotaResponse(BaseModel):
    success: bool = True
    data: Dict[str, QuotaInfo]
```

---

#### 5. 資料模型: `backend/app/models/system_settings.py`

**職責：** SystemSettings 資料模型

```python
from sqlalchemy import Column, String, Text, TIMESTAMP
from sqlalchemy.sql import func
from app.core.database import Base

class SystemSettings(Base):
    __tablename__ = "system_settings"

    key = Column(String(100), primary_key=True)
    value = Column(Text, nullable=False)
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())
```

---

#### 6. 測試檔案: `backend/tests/api/test_system.py`

**職責：** System API 測試

```python
import pytest
from fastapi.testclient import TestClient
from app.main import app
from unittest.mock import Mock, patch

client = TestClient(app)

def test_save_api_key_success():
    """測試 1：成功儲存 Gemini API Key"""
    with patch('app.security.keychain.KeychainManager.save_api_key') as mock_save:
        response = client.post("/api/v1/system/api-keys", json={
            "provider": "gemini",
            "api_key": "AIzaSyDXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
        })

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "已儲存" in data["message"]
        mock_save.assert_called_once()

def test_save_api_key_too_short():
    """測試 2：API Key 格式驗證"""
    response = client.post("/api/v1/system/api-keys", json={
        "provider": "gemini",
        "api_key": "short"
    })

    assert response.status_code == 400
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "INVALID_INPUT"

def test_test_api_key_success():
    """測試 3：成功測試 Gemini API 連線"""
    with patch('app.security.keychain.KeychainManager.get_api_key') as mock_get, \
         patch('app.integrations.gemini_client.GeminiClient.test_connection') as mock_test:

        mock_get.return_value = "valid_api_key"
        mock_test.return_value = None  # 測試成功

        response = client.post("/api/v1/system/api-keys/test", json={
            "provider": "gemini"
        })

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["is_valid"] is True

def test_test_api_key_not_found():
    """測試 4：API Key 不存在時測試連線"""
    with patch('app.security.keychain.KeychainManager.get_api_key') as mock_get:
        mock_get.return_value = None

        response = client.post("/api/v1/system/api-keys/test", json={
            "provider": "stability_ai"
        })

        assert response.status_code == 404
        data = response.json()
        assert data["error"]["code"] == "API_KEY_NOT_FOUND"

def test_get_init_status_initialized():
    """測試 5：檢查系統初始化狀態（已初始化）"""
    with patch('app.security.keychain.KeychainManager.get_api_key') as mock_get:
        # 模擬所有 API Keys 都已設定
        mock_get.side_effect = lambda provider: f"{provider}_key"

        response = client.get("/api/v1/system/init-status")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["is_initialized"] is True

def test_get_init_status_partial():
    """測試 6：檢查系統初始化狀態（部分初始化）"""
    with patch('app.security.keychain.KeychainManager.get_api_key') as mock_get:
        # 只有 gemini 已設定
        def mock_get_key(provider):
            return "gemini_key" if provider == "gemini" else None

        mock_get.side_effect = mock_get_key

        response = client.get("/api/v1/system/init-status")

        assert response.status_code == 200
        data = response.json()
        assert data["data"]["is_initialized"] is False
        assert data["data"]["api_keys_configured"]["gemini"] is True
        assert data["data"]["api_keys_configured"]["stability_ai"] is False

def test_get_quota():
    """測試 7：查詢 API 配額狀態"""
    response = client.get("/api/v1/system/quota")

    assert response.status_code == 200
    data = response.json()
    assert "did" in data["data"]
    assert "youtube" in data["data"]
    assert data["data"]["did"]["total"] == 90
    assert data["data"]["youtube"]["total"] == 10000
```

---

#### 7. Keychain 測試: `backend/tests/security/test_keychain.py`

**職責：** Keychain 功能測試

```python
import pytest
from app.security.keychain import KeychainManager
from unittest.mock import Mock, patch

def test_save_api_key():
    """測試儲存 API Key"""
    manager = KeychainManager()

    with patch('keyring.set_password') as mock_set:
        manager.save_api_key("gemini", "test_api_key")
        mock_set.assert_called_once_with(
            "ytmaker",
            "gemini_api_key",
            "test_api_key"
        )

def test_get_api_key():
    """測試讀取 API Key"""
    manager = KeychainManager()

    with patch('keyring.get_password') as mock_get:
        mock_get.return_value = "test_api_key"

        result = manager.get_api_key("gemini")

        assert result == "test_api_key"
        mock_get.assert_called_once_with("ytmaker", "gemini_api_key")

def test_get_api_key_not_found():
    """測試讀取不存在的 API Key"""
    manager = KeychainManager()

    with patch('keyring.get_password') as mock_get:
        mock_get.return_value = None

        result = manager.get_api_key("stability_ai")

        assert result is None
```

---

### API 端點規格

#### POST /api/v1/system/api-keys

**儲存 API Key**

**請求：**
```json
{
  "provider": "gemini" | "stability_ai" | "did",
  "api_key": "string (min 10 chars)"
}
```

**回應：**
- **200 OK** - 儲存成功
- **400 Bad Request** - 輸入驗證失敗
- **500 Internal Server Error** - Keychain 錯誤

---

#### POST /api/v1/system/api-keys/test

**測試 API Key 連線**

**請求：**
```json
{
  "provider": "gemini" | "stability_ai" | "did"
}
```

**回應：**
- **200 OK** - 測試成功（包含 is_valid 和 message）
- **404 Not Found** - API Key 不存在

---

#### GET /api/v1/system/init-status

**檢查初始化狀態**

**回應：**
- **200 OK** - 回傳初始化狀態

---

#### GET /api/v1/system/quota

**查詢配額狀態**

**回應：**
- **200 OK** - 回傳 D-ID 和 YouTube 配額資訊

---

## 開發指引

### TDD 開發流程

#### 第 1 步：環境準備（10 分鐘）
1. 確認 Task-002 和 Task-003 已完成
2. 安裝依賴套件：`pip install keyring`
3. 確認測試環境可運行：`pytest`
4. 閱讀 `tech-specs/backend/api-system.md`

#### 第 2 步：建立基礎架構（20 分鐘）
1. 建立 `app/schemas/system.py` - Pydantic models
2. 建立 `app/models/system_settings.py` - SQLAlchemy model
3. 建立 `app/security/keychain.py` - Keychain 管理器
4. 建立 `app/services/system_service.py` - Service 骨架
5. 建立 `app/api/v1/system.py` - Router 骨架
6. 在 `app/main.py` 註冊 router

#### 第 3 步：撰寫 Keychain 測試（15 分鐘）
1. 建立 `tests/security/test_keychain.py`
2. 撰寫基本的儲存/讀取測試（使用 mock）
3. 執行測試 → 失敗（預期）

#### 第 4 步：實作 Keychain Manager（30 分鐘）
1. 實作 `KeychainManager.save_api_key()`
2. 實作 `KeychainManager.get_api_key()`
3. 實作 `KeychainManager.delete_api_key()`
4. 執行測試 → 通過 ✅

#### 第 5 步：撰寫 API 測試 - 儲存功能（20 分鐘）
1. 建立 `tests/api/test_system.py`
2. 撰寫「測試 1：成功儲存 API Key」
3. 撰寫「測試 2：API Key 格式驗證」
4. 執行測試 → 失敗

#### 第 6 步：實作儲存 API Key 功能（30 分鐘）
1. 實作 `SystemService.save_api_key()`
2. 實作 API router `/api-keys` POST 端點
3. 加入輸入驗證（Pydantic）
4. 執行測試 → 通過 ✅

#### 第 7 步：撰寫測試連線測試（20 分鐘）
1. 撰寫「測試 3：成功測試連線」
2. 撰寫「測試 4：API Key 不存在」
3. 執行測試 → 失敗

#### 第 8 步：實作測試連線功能（40 分鐘）
1. 實作 `SystemService.test_api_key()`
2. 實作各 Client 的 `test_connection()` 方法（簡單的 API 請求）
   - `GeminiClient.test_connection()`
   - `StabilityClient.test_connection()`
   - `DIDClient.test_connection()`
3. 實作 API router `/api-keys/test` POST 端點
4. 執行測試 → 通過 ✅

#### 第 9 步：撰寫初始化狀態測試（15 分鐘）
1. 撰寫「測試 5：已初始化」
2. 撰寫「測試 6：部分初始化」
3. 執行測試 → 失敗

#### 第 10 步：實作初始化狀態檢查（25 分鐘）
1. 實作 `SystemService.check_init_status()`
2. 實作 API router `/init-status` GET 端點
3. 執行測試 → 通過 ✅

#### 第 11 步：撰寫配額查詢測試（10 分鐘）
1. 撰寫「測試 7：查詢配額」
2. 執行測試 → 失敗

#### 第 12 步：實作配額查詢功能（30 分鐘）
1. 實作 `SystemService.get_quota_status()`
2. 實作配額計算邏輯（月度/每日重置）
3. 實作 API router `/quota` GET 端點
4. 執行測試 → 通過 ✅

#### 第 13 步：整合測試（20 分鐘）
1. 撰寫「測試 8：完整首次設定流程」
2. 執行端到端流程測試
3. 確保所有步驟正常銜接 ✅

#### 第 14 步：重構與優化（15 分鐘）
1. 檢查程式碼重複
2. 提取共用邏輯
3. 改善錯誤訊息
4. 再次執行所有測試

#### 第 15 步：文件與檢查（15 分鐘）
1. 更新 OpenAPI 文檔註釋
2. 檢查測試覆蓋率：`pytest --cov`
3. 執行 linter：`ruff check .`
4. 格式化程式碼：`ruff format .`

---

### 注意事項

#### Keychain 安全性
- ⚠️ **絕對不要**在日誌中記錄 API Keys（即使是部分）
- ⚠️ keyring 套件會自動處理加密，無需手動加密
- ⚠️ 確保 Keychain 存取權限正確設定
- ⚠️ 測試時使用 mock，避免真實儲存測試資料到系統 Keychain

#### 跨平台相容性
- 💡 macOS: 需要用戶授權 Keychain 存取（首次會彈窗）
- 💡 Linux: 需要 GNOME Keyring 或 KWallet 服務運行
- 💡 Windows: Credential Manager 是內建的
- 💡 提供清楚的錯誤訊息，指引用戶安裝必要的服務

#### API 測試連線
- ✅ Gemini: 使用簡單的 `generateContent("test")` 請求
- ✅ Stability AI: 使用 GET `/v1/user/account` 請求
- ✅ D-ID: 使用 GET `/credits` 請求
- ✅ 測試失敗不應拋出例外，而是回傳 `is_valid: false`

#### 配額監控
- 🔗 D-ID 配額每月 1 號重置
- 🔗 YouTube 配額每日重置（太平洋時間午夜）
- 🔗 配額使用量需在每次調用 API 後更新 SystemSettings

---

### 完成檢查清單

#### 功能完整性
- [ ] POST /api/v1/system/api-keys 可正常運作
- [ ] POST /api/v1/system/api-keys/test 可正常運作
- [ ] GET /api/v1/system/init-status 可正常運作
- [ ] GET /api/v1/system/quota 可正常運作
- [ ] Keychain 整合完成（macOS/Linux/Windows）
- [ ] API Key 驗證邏輯完整

#### 測試
- [ ] 所有單元測試通過（7 個測試）
- [ ] Keychain 測試通過（3 個測試）
- [ ] 整合測試通過（1 個測試）
- [ ] 測試覆蓋率 > 80%
- [ ] 測試可獨立執行

#### 錯誤處理（參考 `error-codes.md`）
- [ ] API Key 測試失敗時的錯誤處理：
  - `GEMINI_INVALID_API_KEY`
  - `STABILITY_INVALID_API_KEY`
  - `DID_INVALID_API_KEY`
  - `YOUTUBE_INVALID_TOKEN`
- [ ] 所有錯誤回應包含完整錯誤資訊：
  - `error.code`：錯誤碼
  - `error.message`：人類可讀的錯誤訊息
  - `error.is_retryable`：是否可重試
  - `error.details`：額外錯誤詳情（如 API 回應）
  - `error.trace_id`：追蹤 ID
  - `error.timestamp`：錯誤發生時間
- [ ] 所有錯誤都記錄結構化日誌（使用 `StructuredLogger`）
- [ ] API Key 測試失敗時返回 200，但 `is_valid: false` 及錯誤原因

#### 程式碼品質
- [ ] Ruff check 無錯誤：`ruff check .`
- [ ] 程式碼已格式化：`ruff format .`
- [ ] 無 type 錯誤（如使用 mypy）
- [ ] 無安全性警告

#### 文件
- [ ] API 文檔已更新（OpenAPI/Swagger）
- [ ] 函數都有 docstring
- [ ] 錯誤訊息清楚易懂

#### 整合
- [ ] 在本地環境手動測試完整流程
- [ ] 使用 Postman/curl 測試所有 API
- [ ] 在 macOS Keychain Access 確認資料正確儲存
- [ ] 測試 API Key 測試連線功能（使用真實 API Key）

#### Spec 同步
- [ ] 如果實作與 spec 有差異，已更新 `tech-specs/backend/api-system.md`
- [ ] 如果有新的依賴套件，已更新 `requirements.txt`

---

## 預估時間分配

- 環境準備與閱讀：10 分鐘
- 建立基礎架構：20 分鐘
- Keychain 測試與實作：45 分鐘
- API 儲存功能：50 分鐘
- API 測試連線功能：60 分鐘
- 初始化狀態檢查：40 分鐘
- 配額查詢功能：40 分鐘
- 整合測試：20 分鐘
- 重構優化：15 分鐘
- 文件檢查：15 分鐘

**總計：約 5 小時**

---

## 參考資源

### 套件文檔
- [keyring](https://pypi.org/project/keyring/) - Python Keychain 整合
- [FastAPI](https://fastapi.tiangolo.com/) - Web 框架
- [Pydantic](https://docs.pydantic.dev/) - 資料驗證

### 外部 API 文檔
- [Gemini API](https://ai.google.dev/api) - Google Gemini
- [Stability AI API](https://platform.stability.ai/docs/api-reference) - Stable Diffusion
- [D-ID API](https://docs.d-id.com/reference/welcome) - Virtual Avatar

### 專案內部文件
- `tech-specs/backend/api-system.md` - System API 規格
- `tech-specs/backend/security.md` - 安全措施
- `tech-specs/backend/api-design.md` - API 設計規範

---

**準備好了嗎？** 開始使用 TDD 方式實作這個 task！🚀
