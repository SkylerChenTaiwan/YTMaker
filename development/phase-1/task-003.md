# Task-003: API 基礎架構與錯誤處理

> **建立日期:** 2025-10-19
> **狀態:** ⏳ 未開始
> **預計時間:** 5 小時
> **優先級:** P0 (必須)

---

## 關聯文件

### 產品設計
- **產品概述:** `product-design/overview.md` - 了解整體系統架構
- **使用者流程:** `product-design/flows.md` - 了解 API 的使用場景

### 技術規格
- **技術框架:** `tech-specs/framework.md` - FastAPI 技術棧選擇
- **API 設計規範:** `tech-specs/backend/api-design.md` - RESTful 設計原則、錯誤格式、HTTP 狀態碼
- **API 設計規範 - 錯誤處理:** `tech-specs/backend/api-design.md#4-錯誤碼定義`
- **安全性規範:** `tech-specs/backend/security.md#9-安全措施` - 輸入驗證、錯誤訊息安全
- **安全性規範 - 錯誤訊息:** `tech-specs/backend/security.md#94-錯誤訊息安全`
- **安全性規範 - CORS:** `tech-specs/backend/security.md#97-cors-設定`

### 相關任務
- **前置任務:** Task-001 ✅ (專案初始化), Task-002 ✅ (資料庫設計)
- **後續任務:** Task-004 ~ 009 (所有 API 端點實作) - 這些任務將依賴此基礎架構
- **依賴關係:** 所有 API 端點都依賴此基礎架構的錯誤處理和中間件

---

## 任務目標

### 簡述
建立完整的 FastAPI 基礎架構,實作全局錯誤處理機制、統一的請求/回應格式、日誌中間件、CORS 配置,以及基礎的健康檢查端點。這是所有後續 API 開發的基礎。

### 成功標準
- [x] FastAPI 應用初始化與基本配置完成
- [x] 統一的回應格式實作（成功/錯誤）
- [x] 全局異常處理器實作（處理所有標準錯誤類型）
- [x] 自訂業務異常類別定義
- [x] 請求/回應日誌中間件完成
- [x] CORS 配置正確（僅允許 localhost）
- [x] 健康檢查端點實作（基本和詳細版本）
- [x] 錯誤回應格式統一且符合 spec
- [x] 單元測試覆蓋率 > 80%
- [x] 所有測試通過

---

## 測試要求

### 單元測試

#### 測試 1: 成功回應格式驗證

**目的:** 驗證成功回應符合統一格式

**測試場景:**
- 使用測試端點返回成功資料
- 驗證回應結構符合 `{"success": true, "data": {...}}`

**輸入:**
```
GET /api/v1/test/success
```

**預期輸出:**
```json
Status: 200 OK
{
  "success": true,
  "data": {
    "message": "test data"
  }
}
```

**驗證點:**
- [ ] 回傳 200 狀態碼
- [ ] 回應包含 `success` 欄位且為 `true`
- [ ] 回應包含 `data` 欄位
- [ ] 回應格式為有效的 JSON

---

#### 測試 2: 驗證錯誤處理（400 Bad Request）

**目的:** 驗證輸入驗證錯誤的處理

**測試場景:**
- 發送格式錯誤的請求
- 驗證回傳統一的錯誤格式

**輸入:**
```
POST /api/v1/test/validation
Content-Type: application/json
{
  "invalid_field": "value"
}
```

**預期輸出:**
```json
Status: 400 Bad Request
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "請求資料驗證失敗",
    "details": {
      "field": "required_field",
      "issue": "Field required"
    }
  },
  "timestamp": "2025-10-19T10:30:00Z",
  "path": "/api/v1/test/validation"
}
```

**驗證點:**
- [ ] 回傳 400 狀態碼
- [ ] 錯誤格式包含 `success`, `error`, `timestamp`, `path` 欄位
- [ ] `error.code` 為 "VALIDATION_ERROR"
- [ ] `error.details` 包含驗證錯誤詳情
- [ ] `timestamp` 為 ISO 8601 格式
- [ ] `path` 為請求路徑

---

#### 測試 3: 404 Not Found 處理

**目的:** 驗證資源不存在的錯誤處理

**測試場景:**
- 請求不存在的端點
- 驗證返回標準 404 錯誤

**輸入:**
```
GET /api/v1/nonexistent-endpoint
```

**預期輸出:**
```json
Status: 404 Not Found
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "請求的資源不存在"
  },
  "timestamp": "2025-10-19T10:30:00Z",
  "path": "/api/v1/nonexistent-endpoint"
}
```

**驗證點:**
- [ ] 回傳 404 狀態碼
- [ ] 錯誤訊息清楚且不洩漏系統資訊
- [ ] 包含請求路徑資訊

---

#### 測試 4: 500 Internal Server Error 處理

**目的:** 驗證未預期錯誤的處理

**測試場景:**
- 觸發後端內部錯誤（例如除以零）
- 驗證錯誤被捕獲且不洩漏敏感資訊

**輸入:**
```
GET /api/v1/test/error
```

**預期輸出:**
```json
Status: 500 Internal Server Error
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "伺服器內部錯誤,請稍後再試"
  },
  "timestamp": "2025-10-19T10:30:00Z",
  "path": "/api/v1/test/error"
}
```

**驗證點:**
- [ ] 回傳 500 狀態碼
- [ ] 錯誤訊息**不包含**堆疊追蹤或系統路徑
- [ ] 完整錯誤已記錄到日誌檔案
- [ ] 使用者只看到安全的錯誤訊息

---

#### 測試 5: 自訂業務異常處理

**目的:** 驗證自訂業務異常的處理

**測試場景:**
- 拋出自訂業務異常（例如 `ProjectNotFoundError`）
- 驗證異常被正確轉換為 HTTP 回應

**輸入:**
```python
# 在業務邏輯中拋出自訂異常
raise ProjectNotFoundError(project_id="123")
```

**預期輸出:**
```json
Status: 404 Not Found
{
  "success": false,
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "message": "找不到指定的專案",
    "details": {
      "project_id": "123"
    }
  },
  "timestamp": "2025-10-19T10:30:00Z",
  "path": "/api/v1/projects/123"
}
```

**驗證點:**
- [ ] 回傳正確的 HTTP 狀態碼（404）
- [ ] 錯誤碼與異常類別對應
- [ ] 錯誤訊息清楚
- [ ] `details` 包含相關上下文資訊

---

#### 測試 6: CORS 配置驗證

**目的:** 驗證 CORS 正確配置

**測試場景:**
- 從允許的來源發送 OPTIONS 預檢請求
- 從不允許的來源發送請求

**輸入 A（允許的來源）:**
```
OPTIONS /api/v1/projects
Origin: http://localhost:3000
Access-Control-Request-Method: POST
```

**預期輸出 A:**
```
Status: 200 OK
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH
Access-Control-Allow-Headers: *
Access-Control-Allow-Credentials: true
```

**輸入 B（不允許的來源）:**
```
OPTIONS /api/v1/projects
Origin: http://evil.com
Access-Control-Request-Method: POST
```

**預期輸出 B:**
```
Status: 200 OK
(No CORS headers)
```

**驗證點:**
- [ ] localhost:3000 的請求有正確的 CORS headers
- [ ] 不允許的來源沒有 CORS headers
- [ ] 允許 credentials（cookies）
- [ ] 允許所有標準 HTTP 方法

---

#### 測試 7: 日誌中間件功能

**目的:** 驗證請求/回應日誌正確記錄

**測試場景:**
- 發送 API 請求
- 驗證日誌中記錄了請求資訊和處理時間

**輸入:**
```
GET /api/v1/projects?limit=10
```

**預期日誌輸出:**
```
[2025-10-19 10:30:00] INFO: GET /api/v1/projects?limit=10 - 200 - 45ms
```

**驗證點:**
- [ ] 日誌包含 HTTP 方法（GET）
- [ ] 日誌包含完整路徑和查詢參數
- [ ] 日誌包含 HTTP 狀態碼（200）
- [ ] 日誌包含處理時間（ms）
- [ ] 日誌不包含敏感資料（API Keys）

---

#### 測試 8: 健康檢查端點（基本版）

**目的:** 驗證基本健康檢查端點

**測試場景:**
- 請求基本健康檢查
- 驗證伺服器正常運行

**輸入:**
```
GET /health
```

**預期輸出:**
```json
Status: 200 OK
{
  "status": "healthy",
  "timestamp": "2025-10-19T10:30:00Z"
}
```

**驗證點:**
- [ ] 回傳 200 狀態碼
- [ ] `status` 為 "healthy"
- [ ] 包含 ISO 8601 格式的時間戳

---

#### 測試 9: 健康檢查端點（詳細版）

**目的:** 驗證詳細健康檢查端點（包含依賴服務狀態）

**測試場景:**
- 請求詳細健康檢查
- 驗證資料庫和 Redis 連線狀態

**輸入:**
```
GET /api/v1/health
```

**預期輸出（所有服務正常）:**
```json
Status: 200 OK
{
  "status": "healthy",
  "services": {
    "database": {
      "status": "connected",
      "latency_ms": 5
    },
    "redis": {
      "status": "connected",
      "latency_ms": 2
    }
  },
  "timestamp": "2025-10-19T10:30:00Z"
}
```

**預期輸出（Redis 斷線）:**
```json
Status: 503 Service Unavailable
{
  "status": "unhealthy",
  "services": {
    "database": {
      "status": "connected",
      "latency_ms": 5
    },
    "redis": {
      "status": "disconnected",
      "error": "Connection refused"
    }
  },
  "timestamp": "2025-10-19T10:30:00Z"
}
```

**驗證點:**
- [ ] 所有服務正常時回傳 200
- [ ] 任一服務異常時回傳 503
- [ ] 包含每個服務的連線狀態
- [ ] 包含連線延遲資訊（正常時）
- [ ] 包含錯誤訊息（異常時）

---

### 整合測試

#### 測試 10: 端到端錯誤處理流程

**目的:** 驗證錯誤從業務邏輯到 HTTP 回應的完整流程

**流程:**
1. 建立測試端點,拋出各種類型的異常
2. 驗證每種異常都被正確處理
3. 驗證錯誤日誌正確記錄
4. 驗證回應格式一致

**測試案例:**
- ValidationError（Pydantic）→ 400
- 自訂業務異常（ProjectNotFoundError）→ 404
- 資料庫異常（IntegrityError）→ 409
- 未預期異常（Exception）→ 500

**驗證點:**
- [ ] 所有異常類型都被捕獲
- [ ] HTTP 狀態碼正確映射
- [ ] 錯誤格式統一
- [ ] 錯誤日誌完整記錄（包含堆疊追蹤）
- [ ] 使用者回應不洩漏敏感資訊

---

### 檔案系統錯誤處理測試

#### 測試 11: 檔案權限不足時的錯誤處理

**目的:** 驗證檔案權限不足時返回明確錯誤

**測試場景:**
- 模擬上傳目錄無寫入權限
- 嘗試保存上傳檔案
- 驗證返回明確的權限錯誤

**測試代碼:**
```python
@pytest.mark.integration
def test_file_permission_denied():
    """檔案權限不足時應返回明確錯誤"""

    upload_dir = Path('./uploads/test-readonly')
    upload_dir.mkdir(exist_ok=True)

    # 移除寫入權限
    os.chmod(upload_dir, 0o444)

    try:
        with pytest.raises(FilePermissionError) as exc_info:
            file_service.save_uploaded_file(
                b'test content',
                str(upload_dir / 'test.txt')
            )

        # 錯誤訊息應包含路徑
        assert str(upload_dir) in str(exc_info.value)
    finally:
        # 恢復權限以便清理
        os.chmod(upload_dir, 0o755)
        upload_dir.rmdir()
```

**預期輸出:**
```json
Status: 500 Internal Server Error
{
  "success": false,
  "error": {
    "code": "FILE_PERMISSION_ERROR",
    "message": "檔案權限不足,無法寫入",
    "details": {
      "path": "./uploads/test-readonly/test.txt"
    }
  },
  "timestamp": "2025-10-19T10:30:00Z",
  "path": "/api/v1/upload"
}
```

**驗證點:**
- [ ] 回傳正確的錯誤狀態碼（500）
- [ ] 錯誤訊息包含檔案路徑
- [ ] 錯誤訊息清楚指出權限問題
- [ ] 不洩漏系統內部路徑結構
- [ ] 完整錯誤記錄到日誌

---

#### 測試 12: 並發檔案存取處理

**目的:** 驗證多個請求同時存取同一檔案時的檔案鎖定機制

**測試場景:**
- 多個請求同時上傳並寫入檔案
- 驗證檔案鎖定機制正確運作
- 確保所有寫入都被正確保存

**測試代碼:**
```python
@pytest.mark.integration
async def test_concurrent_file_access():
    """多個請求同時存取同一檔案應正確處理檔案鎖定"""

    test_file = Path('./uploads/shared-file.txt')
    test_file.write_text('initial content')

    async def write_to_file(content):
        # 使用檔案鎖定
        async with file_service.lock_file(test_file):
            current = test_file.read_text()
            await asyncio.sleep(0.1)  # 模擬處理時間
            test_file.write_text(current + content)

    # 並發寫入
    await asyncio.gather(
        write_to_file(' A'),
        write_to_file(' B'),
        write_to_file(' C')
    )

    # 最終內容應包含所有寫入 (順序可能不同)
    final_content = test_file.read_text()
    assert 'A' in final_content
    assert 'B' in final_content
    assert 'C' in final_content

    # 不應有內容遺失
    assert len(final_content) == len('initial content ABC')
```

**驗證點:**
- [ ] 所有並發寫入都成功完成
- [ ] 無內容遺失或覆蓋
- [ ] 檔案鎖定機制正確運作
- [ ] 無死鎖情況發生
- [ ] 檔案最終狀態一致

---

## 實作規格

### 需要建立/修改的檔案

#### 1. 主應用程式: `backend/app/main.py`

**職責:** FastAPI 應用初始化、中間件註冊、全局異常處理器

**程式碼骨架:**

```python
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import time
import logging

from app.api.v1 import health
from app.core.exceptions import (
    AppException,
    ValidationException,
    NotFoundException,
    ConflictException
)
from app.core.config import settings
from app.core.database import init_db, close_db

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """應用生命週期管理"""
    # 啟動時初始化資料庫
    logger.info("初始化資料庫連線...")
    init_db()
    logger.info("應用啟動完成")

    yield

    # 關閉時清理資源
    logger.info("關閉資料庫連線...")
    close_db()
    logger.info("應用關閉完成")

app = FastAPI(
    title="YTMaker API",
    version="1.0.0",
    description="YouTube 影片自動化生產系統 API",
    lifespan=lifespan
)

# CORS 配置（僅允許 localhost）
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 請求日誌中間件
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """記錄所有 HTTP 請求和處理時間"""
    start_time = time.time()

    # 記錄請求資訊
    logger.info(f"收到請求: {request.method} {request.url.path}")

    # 處理請求
    response = await call_next(request)

    # 計算處理時間
    process_time = (time.time() - start_time) * 1000

    # 記錄回應資訊
    logger.info(
        f"{request.method} {request.url.path} - "
        f"{response.status_code} - {process_time:.0f}ms"
    )

    return response

# 全局異常處理器

@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    """處理自訂業務異常"""
    logger.warning(
        f"業務異常: {exc.error_code} - {exc.message}",
        extra={"path": request.url.path, "details": exc.details}
    )

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.error_code,
                "message": exc.message,
                "details": exc.details
            },
            "timestamp": exc.timestamp.isoformat(),
            "path": request.url.path
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """處理所有未捕獲的異常"""
    # 記錄完整錯誤到日誌（包含堆疊追蹤）
    logger.error(
        f"未處理的異常: {type(exc).__name__} - {str(exc)}",
        exc_info=True,
        extra={"path": request.url.path}
    )

    # 返回安全的錯誤訊息給使用者
    from datetime import datetime, timezone
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "伺服器內部錯誤,請稍後再試"
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "path": request.url.path
        }
    )

# 註冊路由
app.include_router(health.router, tags=["health"])

# 根路徑
@app.get("/")
async def root():
    return {
        "success": True,
        "data": {
            "message": "YTMaker API",
            "version": "1.0.0",
            "docs": "/docs"
        }
    }
```

---

#### 2. 自訂異常類別: `backend/app/core/exceptions.py`

**職責:** 定義所有業務異常類別

**程式碼骨架:**

```python
from datetime import datetime, timezone
from typing import Optional, Dict, Any


class AppException(Exception):
    """基礎應用異常類別"""

    def __init__(
        self,
        message: str,
        error_code: str,
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}
        self.timestamp = datetime.now(timezone.utc)
        super().__init__(self.message)


class ValidationException(AppException):
    """驗證錯誤異常"""

    def __init__(self, message: str = "請求資料驗證失敗", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="VALIDATION_ERROR",
            status_code=400,
            details=details
        )


class NotFoundException(AppException):
    """資源不存在異常"""

    def __init__(self, message: str = "請求的資源不存在", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="NOT_FOUND",
            status_code=404,
            details=details
        )


class ConflictException(AppException):
    """資源衝突異常"""

    def __init__(self, message: str = "資源衝突", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="CONFLICT",
            status_code=409,
            details=details
        )


class UnauthorizedException(AppException):
    """未授權異常"""

    def __init__(self, message: str = "未授權的請求", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="UNAUTHORIZED",
            status_code=401,
            details=details
        )


class QuotaExceededException(AppException):
    """配額超限異常"""

    def __init__(self, message: str = "API 配額已用盡", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="QUOTA_EXCEEDED",
            status_code=429,
            details=details
        )


# 業務特定異常

class ProjectNotFoundException(NotFoundException):
    """專案不存在"""

    def __init__(self, project_id: str):
        super().__init__(
            message="找不到指定的專案",
            details={"project_id": project_id}
        )


class ProjectNotCompletedException(AppException):
    """專案尚未完成"""

    def __init__(self, project_id: str):
        super().__init__(
            message="專案尚未完成生成",
            error_code="PROJECT_NOT_COMPLETED",
            status_code=400,
            details={"project_id": project_id}
        )


class APIKeyInvalidException(UnauthorizedException):
    """API Key 無效"""

    def __init__(self, provider: str):
        super().__init__(
            message=f"{provider} API Key 無效或已過期",
            details={"provider": provider}
        )


class ExternalAPIException(AppException):
    """外部 API 錯誤"""

    def __init__(self, provider: str, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=f"{provider} API 錯誤: {message}",
            error_code=f"{provider.upper()}_API_ERROR",
            status_code=500,
            details=details
        )
```

---

#### 3. 回應模型: `backend/app/schemas/common.py`

**職責:** 定義統一的回應格式

**程式碼骨架:**

```python
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, Generic, TypeVar
from datetime import datetime

T = TypeVar('T')


class SuccessResponse(BaseModel, Generic[T]):
    """成功回應格式"""
    success: bool = Field(default=True, description="是否成功")
    data: T = Field(..., description="回應資料")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "data": {"message": "操作成功"}
            }
        }


class ErrorDetail(BaseModel):
    """錯誤詳細資訊"""
    code: str = Field(..., description="錯誤碼")
    message: str = Field(..., description="錯誤訊息")
    details: Optional[Dict[str, Any]] = Field(default=None, description="額外詳細資訊")


class ErrorResponse(BaseModel):
    """錯誤回應格式"""
    success: bool = Field(default=False, description="是否成功")
    error: ErrorDetail = Field(..., description="錯誤資訊")
    timestamp: datetime = Field(..., description="錯誤發生時間")
    path: str = Field(..., description="請求路徑")

    class Config:
        json_schema_extra = {
            "example": {
                "success": False,
                "error": {
                    "code": "NOT_FOUND",
                    "message": "請求的資源不存在",
                    "details": {"resource_id": "123"}
                },
                "timestamp": "2025-10-19T10:30:00Z",
                "path": "/api/v1/projects/123"
            }
        }


class HealthStatus(BaseModel):
    """健康檢查狀態"""
    status: str = Field(..., description="健康狀態")
    timestamp: datetime = Field(..., description="檢查時間")


class ServiceStatus(BaseModel):
    """服務狀態"""
    status: str = Field(..., description="服務狀態 (connected/disconnected)")
    latency_ms: Optional[int] = Field(default=None, description="延遲（毫秒）")
    error: Optional[str] = Field(default=None, description="錯誤訊息")


class DetailedHealthStatus(BaseModel):
    """詳細健康檢查狀態"""
    status: str = Field(..., description="整體健康狀態")
    services: Dict[str, ServiceStatus] = Field(..., description="各服務狀態")
    timestamp: datetime = Field(..., description="檢查時間")
```

---

#### 4. 健康檢查端點: `backend/app/api/v1/health.py`

**職責:** 提供健康檢查端點

**程式碼骨架:**

```python
from fastapi import APIRouter, status, Response
from datetime import datetime, timezone
import time

from app.schemas.common import HealthStatus, DetailedHealthStatus, ServiceStatus
from app.core.database import get_db
from app.core.redis import get_redis

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthStatus,
    summary="基本健康檢查",
    description="檢查 API 伺服器是否正常運行"
)
async def health_check():
    """基本健康檢查端點"""
    return HealthStatus(
        status="healthy",
        timestamp=datetime.now(timezone.utc)
    )


@router.get(
    "/api/v1/health",
    response_model=DetailedHealthStatus,
    summary="詳細健康檢查",
    description="檢查 API 伺服器及相關服務（資料庫、Redis）的狀態"
)
async def detailed_health_check(response: Response):
    """詳細健康檢查端點（包含資料庫和 Redis）"""

    services = {}
    overall_healthy = True

    # 檢查資料庫連線
    try:
        db = next(get_db())
        start_time = time.time()
        db.execute("SELECT 1")
        latency = int((time.time() - start_time) * 1000)

        services["database"] = ServiceStatus(
            status="connected",
            latency_ms=latency
        )
    except Exception as e:
        overall_healthy = False
        services["database"] = ServiceStatus(
            status="disconnected",
            error=str(e)
        )

    # 檢查 Redis 連線
    try:
        redis_client = get_redis()
        start_time = time.time()
        redis_client.ping()
        latency = int((time.time() - start_time) * 1000)

        services["redis"] = ServiceStatus(
            status="connected",
            latency_ms=latency
        )
    except Exception as e:
        overall_healthy = False
        services["redis"] = ServiceStatus(
            status="disconnected",
            error=str(e)
        )

    # 設定 HTTP 狀態碼
    if not overall_healthy:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return DetailedHealthStatus(
        status="healthy" if overall_healthy else "unhealthy",
        services=services,
        timestamp=datetime.now(timezone.utc)
    )
```

---

#### 5. 配置管理: `backend/app/core/config.py`

**職責:** 應用配置管理（環境變數）

**程式碼骨架:**

```python
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """應用配置"""

    # 應用基本配置
    APP_NAME: str = "YTMaker"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # API 配置
    API_V1_PREFIX: str = "/api/v1"

    # CORS 配置
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]

    # 資料庫配置
    DATABASE_URL: str = "sqlite:///./ytmaker.db"

    # Redis 配置
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0

    # 日誌配置
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/app.log"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
```

---

#### 6. 測試檔案: `backend/tests/api/test_error_handling.py`

**職責:** 錯誤處理測試

**程式碼骨架:**

```python
import pytest
from fastapi.testclient import TestClient
from datetime import datetime

from app.main import app
from app.core.exceptions import ProjectNotFoundException

client = TestClient(app)


def test_success_response_format():
    """測試 1: 成功回應格式"""
    response = client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] == "healthy"
    assert "timestamp" in data


def test_validation_error_handling():
    """測試 2: 驗證錯誤處理"""
    # 這個測試需要有一個測試端點
    # 實作時會在 test router 中添加
    pass


def test_not_found_error():
    """測試 3: 404 錯誤處理"""
    response = client.get("/api/v1/nonexistent")

    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert "error" in data
    assert data["error"]["code"] == "NOT_FOUND"
    assert "timestamp" in data
    assert "path" in data


def test_internal_error_handling():
    """測試 4: 500 錯誤處理"""
    # 需要建立測試端點觸發內部錯誤
    pass


def test_custom_exception_handling():
    """測試 5: 自訂業務異常處理"""
    # 測試 ProjectNotFoundException 等自訂異常
    pass


def test_cors_allowed_origin():
    """測試 6: CORS 允許的來源"""
    response = client.options(
        "/api/v1/health",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET"
        }
    )

    assert response.status_code == 200
    assert "access-control-allow-origin" in response.headers
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"


def test_logging_middleware():
    """測試 7: 日誌中間件"""
    # 測試日誌是否正確記錄
    # 需要檢查日誌檔案內容
    pass


def test_basic_health_check():
    """測試 8: 基本健康檢查"""
    response = client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "timestamp" in data

    # 驗證時間戳格式
    timestamp = datetime.fromisoformat(data["timestamp"].replace("Z", "+00:00"))
    assert isinstance(timestamp, datetime)


def test_detailed_health_check():
    """測試 9: 詳細健康檢查"""
    response = client.get("/api/v1/health")

    # 根據服務狀態,可能是 200 或 503
    assert response.status_code in [200, 503]
    data = response.json()

    assert "status" in data
    assert "services" in data
    assert "database" in data["services"]
    assert "redis" in data["services"]
    assert "timestamp" in data

    # 檢查服務狀態結構
    for service_name, service_status in data["services"].items():
        assert "status" in service_status
        assert service_status["status"] in ["connected", "disconnected"]
```

---

### API 端點規格

#### GET /health

**描述:** 基本健康檢查

**回應:**
- **200 OK** - 伺服器正常運行

**回應範例:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-19T10:30:00Z"
}
```

---

#### GET /api/v1/health

**描述:** 詳細健康檢查（包含依賴服務狀態）

**回應:**
- **200 OK** - 所有服務正常
- **503 Service Unavailable** - 任一服務異常

**回應範例（正常）:**
```json
{
  "status": "healthy",
  "services": {
    "database": {
      "status": "connected",
      "latency_ms": 5
    },
    "redis": {
      "status": "connected",
      "latency_ms": 2
    }
  },
  "timestamp": "2025-10-19T10:30:00Z"
}
```

**回應範例（異常）:**
```json
{
  "status": "unhealthy",
  "services": {
    "database": {
      "status": "connected",
      "latency_ms": 5
    },
    "redis": {
      "status": "disconnected",
      "error": "Connection refused"
    }
  },
  "timestamp": "2025-10-19T10:30:00Z"
}
```

---

### 錯誤回應格式統一規範

所有 API 錯誤都必須遵循以下格式:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "使用者友善的錯誤訊息",
    "details": {
      "field": "additional_context"
    }
  },
  "timestamp": "2025-10-19T10:30:00Z",
  "path": "/api/v1/endpoint"
}
```

**欄位說明:**
- `success`: 固定為 `false`
- `error.code`: 錯誤碼（大寫、底線分隔）
- `error.message`: 清楚的錯誤訊息（不洩漏系統資訊）
- `error.details`: 可選,提供額外上下文資訊
- `timestamp`: ISO 8601 格式的時間戳
- `path`: 請求路徑

---

## 開發指引

### TDD 開發流程

#### 第 1 步: 環境準備（10 分鐘）
1. 確認 Task-001 和 Task-002 已完成
2. 確認 FastAPI 和依賴已安裝
3. 確認測試環境可運行：`pytest`
4. 閱讀 `tech-specs/backend/api-design.md` 和 `tech-specs/backend/security.md`

#### 第 2 步: 建立專案結構（15 分鐘）
1. 建立目錄結構:
   ```bash
   mkdir -p backend/app/core
   mkdir -p backend/app/api/v1
   mkdir -p backend/app/schemas
   mkdir -p backend/tests/api
   ```
2. 建立 `__init__.py` 檔案:
   ```bash
   touch backend/app/__init__.py
   touch backend/app/core/__init__.py
   touch backend/app/api/__init__.py
   touch backend/app/api/v1/__init__.py
   touch backend/app/schemas/__init__.py
   ```

#### 第 3 步: 撰寫第一個測試（20 分鐘）
1. 建立 `tests/api/test_error_handling.py`
2. 撰寫「測試 8：基本健康檢查」
3. 執行測試 → 失敗（預期,因為還沒實作）
   ```bash
   pytest tests/api/test_error_handling.py::test_basic_health_check -v
   ```

#### 第 4 步: 實作基礎配置（20 分鐘）
1. 建立 `app/core/config.py` - Settings 類別
2. 建立 `app/core/exceptions.py` - 異常類別定義
3. 建立 `app/schemas/common.py` - 回應模型

#### 第 5 步: 實作健康檢查端點（30 分鐘）
1. 建立 `app/api/v1/health.py` - 健康檢查 router
2. 實作 `GET /health` 端點
3. 執行測試 → 通過 ✅
   ```bash
   pytest tests/api/test_error_handling.py::test_basic_health_check -v
   ```

#### 第 6 步: 實作 FastAPI 主應用（40 分鐘）
1. 建立 `app/main.py` - FastAPI app 初始化
2. 註冊 CORS 中間件
3. 註冊健康檢查 router
4. 執行測試 → 通過 ✅

#### 第 7 步: 實作全局異常處理器（45 分鐘）
1. 在 `main.py` 中添加異常處理器:
   - `@app.exception_handler(AppException)`
   - `@app.exception_handler(Exception)`
2. 撰寫「測試 3：404 錯誤處理」
3. 撰寫「測試 4：500 錯誤處理」
4. 撰寫「測試 5：自訂業務異常」
5. 執行所有測試 → 通過 ✅

#### 第 8 步: 實作日誌中間件（30 分鐘）
1. 在 `main.py` 中添加 `@app.middleware("http")` 日誌中間件
2. 配置日誌格式（包含時間、方法、路徑、狀態碼、處理時間）
3. 測試日誌輸出（手動檢查日誌檔案）
4. 撰寫「測試 7：日誌中間件」

#### 第 9 步: 實作詳細健康檢查（30 分鐘）
1. 在 `health.py` 中實作 `GET /api/v1/health` 端點
2. 添加資料庫連線檢查
3. 添加 Redis 連線檢查
4. 撰寫「測試 9：詳細健康檢查」
5. 執行測試 → 通過 ✅

#### 第 10 步: 測試 CORS 配置（20 分鐘）
1. 撰寫「測試 6：CORS 配置驗證」
2. 測試允許的來源（localhost:3000）
3. 測試不允許的來源
4. 執行測試 → 通過 ✅

#### 第 11 步: 驗證錯誤處理（30 分鐘）
1. 建立測試端點（用於觸發各種錯誤）
2. 撰寫「測試 2：驗證錯誤處理」
3. 測試 Pydantic ValidationError 處理
4. 執行所有測試 → 通過 ✅

#### 第 12 步: 整合測試（20 分鐘）
1. 撰寫「測試 10：端到端錯誤處理流程」
2. 測試各種異常類型的完整流程
3. 驗證錯誤日誌記錄
4. 執行所有測試 → 通過 ✅

#### 第 13 步: 程式碼品質檢查（20 分鐘）
1. 檢查測試覆蓋率：
   ```bash
   pytest --cov=app --cov-report=html
   ```
2. 確保覆蓋率 > 80%
3. 執行 linter：
   ```bash
   ruff check backend/app
   ```
4. 格式化程式碼：
   ```bash
   ruff format backend/app
   ```

---

### 注意事項

#### 安全性
- ⚠️ **絕對不要**在錯誤回應中洩漏系統路徑或堆疊追蹤
- ⚠️ **絕對不要**在日誌中記錄 API Keys 或敏感資料
- ⚠️ 錯誤訊息要對使用者友善,但不洩漏內部實作細節
- ⚠️ 完整的錯誤資訊只記錄在後端日誌檔案中

#### CORS 配置
- 💡 生產環境只允許 Electron 應用的來源
- 💡 不要使用 `allow_origins=["*"]`（安全風險）
- 💡 確保 `allow_credentials=True`（支援 cookies）

#### 日誌記錄
- ✅ 所有 API 請求都要記錄（方法、路徑、狀態碼、處理時間）
- ✅ 錯誤要記錄完整堆疊追蹤（僅在後端日誌）
- ✅ 使用適當的日誌級別（INFO、WARNING、ERROR）
- ❌ 不要記錄敏感資料（密碼、API Keys、Tokens）

#### 異常處理
- ✅ 使用自訂異常類別（繼承自 `AppException`）
- ✅ 每種業務錯誤都定義對應的異常類別
- ✅ 異常要包含清楚的錯誤訊息和上下文資訊
- ✅ 未預期的異常要捕獲並返回安全的錯誤訊息

#### 效能
- 💡 日誌中間件不應顯著影響回應時間（< 5ms overhead）
- 💡 健康檢查應該快速回應（< 100ms）
- 💡 詳細健康檢查可以稍慢（< 500ms）

#### 與其他模組整合
- 🔗 Task-004 ~ 009（所有 API 端點）將使用這裡的錯誤處理機制
- 🔗 Task-016（WebSocket）將使用這裡的日誌配置
- 🔗 所有後續 API 開發都應使用統一的回應格式

---

### 完成檢查清單

#### 功能完整性
- [ ] FastAPI 應用可正常啟動（`uvicorn app.main:app --reload`）
- [ ] GET /health 端點可正常運作
- [ ] GET /api/v1/health 端點可正常運作
- [ ] 所有異常類別已定義（AppException 及子類別）
- [ ] 全局異常處理器已實作（AppException、Exception）
- [ ] 日誌中間件正常記錄所有請求
- [ ] CORS 配置正確（僅允許 localhost）

#### 測試
- [ ] 所有單元測試通過（9 個測試）
- [ ] 整合測試通過（1 個測試）
- [ ] 測試覆蓋率 > 80%
   ```bash
   pytest --cov=app tests/
   ```
- [ ] 測試可獨立執行（不依賴順序）

#### 程式碼品質
- [ ] Ruff check 無錯誤：
   ```bash
   ruff check backend/app
   ```
- [ ] 程式碼已格式化：
   ```bash
   ruff format backend/app
   ```
- [ ] 無 type 錯誤（如使用 mypy）：
   ```bash
   mypy backend/app
   ```
- [ ] 所有函數都有 docstring

#### 文件
- [ ] API 文檔可訪問（http://localhost:8000/docs）
- [ ] 所有端點都有清楚的描述和範例
- [ ] 錯誤格式在文檔中有說明

#### 整合
- [ ] 在本地環境手動測試健康檢查端點：
   ```bash
   curl http://localhost:8000/health
   curl http://localhost:8000/api/v1/health
   ```
- [ ] 測試觸發各種錯誤類型
- [ ] 檢查日誌檔案正確記錄（`logs/app.log`）
- [ ] 檢查 CORS headers：
   ```bash
   curl -H "Origin: http://localhost:3000" \
        -H "Access-Control-Request-Method: GET" \
        -X OPTIONS http://localhost:8000/api/v1/health -v
   ```

#### Spec 同步
- [ ] 實作的錯誤格式與 `api-design.md` 一致
- [ ] HTTP 狀態碼使用符合 `api-design.md` 規範
- [ ] 錯誤碼與 `api-design.md#4-錯誤碼定義` 對應
- [ ] 安全措施符合 `security.md` 規範

---

## 預估時間分配

- 環境準備與專案結構：25 分鐘
- 基礎配置與模型：20 分鐘
- 健康檢查端點：30 分鐘
- FastAPI 主應用：40 分鐘
- 全局異常處理：45 分鐘
- 日誌中間件：30 分鐘
- 詳細健康檢查：30 分鐘
- CORS 測試：20 分鐘
- 驗證錯誤處理：30 分鐘
- 整合測試：20 分鐘
- 程式碼品質檢查：20 分鐘

**總計：約 5 小時**

---

## 參考資源

### FastAPI 官方文檔
- [FastAPI 基礎](https://fastapi.tiangolo.com/tutorial/)
- [處理錯誤](https://fastapi.tiangolo.com/tutorial/handling-errors/)
- [中間件](https://fastapi.tiangolo.com/tutorial/middleware/)
- [CORS](https://fastapi.tiangolo.com/tutorial/cors/)

### 相關套件文檔
- [Pydantic](https://docs.pydantic.dev/) - 資料驗證
- [pytest](https://docs.pytest.org/) - 測試框架
- [Ruff](https://docs.astral.sh/ruff/) - Python linter

### 專案內部文件
- `tech-specs/backend/api-design.md` - API 設計規範
- `tech-specs/backend/security.md` - 安全性規範
- `tech-specs/framework.md` - 技術框架選擇

---

**準備好了嗎？** 開始使用 TDD 方式實作這個基礎架構任務！🚀

這個基礎架構將成為所有後續 API 開發的堅實基礎,確保：
- ✅ 統一的錯誤處理
- ✅ 清晰的 API 回應格式
- ✅ 完整的請求日誌
- ✅ 良好的測試覆蓋率
- ✅ 符合安全最佳實踐
