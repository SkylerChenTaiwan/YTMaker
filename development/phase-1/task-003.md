# Task-003: API 基礎架構與錯誤處理

> **建立日期：** 2025-01-19
> **狀態：** ⏳ 未開始
> **預計時間：** 5 小時
> **優先級：** P0

---

## 關聯文件

### 技術規格
- **API 設計:** `tech-specs/backend/api-design.md`
- **後端架構:** `tech-specs/backend/overview.md`
- **安全規格:** `tech-specs/backend/security.md`

### 相關任務
- **前置任務:** Task-001 ✅, Task-002 ✅
- **後續任務:** Task-004 (專案管理 API), Task-005 (配置管理 API)
- **並行任務:** 無

---

## 任務目標

### 簡述
設定 FastAPI 應用的基礎架構，包含統一錯誤處理、中間件、CORS 配置、依賴注入、健康檢查端點。

### 詳細說明
建立後端 API 的核心基礎設施：
- FastAPI 應用初始化與配置
- 統一的錯誤處理機制
- 請求/回應中間件（日誌、計時）
- CORS 設定
- 全局依賴注入
- 健康檢查和版本資訊端點
- 請求驗證與序列化

### 成功標準
- [ ] FastAPI 應用可以啟動
- [ ] 錯誤回應格式統一
- [ ] 中間件正常運作
- [ ] CORS 設定正確
- [ ] 健康檢查端點可用

---

## 測試要求

### 單元測試

#### 測試 1：統一錯誤格式

**測試檔案：** `tests/unit/test_errors.py`

```python
def test_validation_error_format():
    """測試驗證錯誤的格式"""
    from app.core.errors import ValidationError

    error = ValidationError("Invalid input", field="email")

    assert error.status_code == 400
    assert error.error_code == "VALIDATION_ERROR"
    assert "Invalid input" in str(error)
```

**預期錯誤格式：**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": {
      "field": "email"
    }
  }
}
```

---

#### 測試 2：中間件記錄請求

**測試內容：**
```python
def test_logging_middleware(test_client):
    """測試日誌中間件記錄請求"""
    response = test_client.get("/health")

    assert response.status_code == 200
    # 檢查日誌是否記錄請求
```

---

### 整合測試

#### API 測試 1：健康檢查端點

**Endpoint:** `GET /health`

**成功回應 (200):**
```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "timestamp": "2025-01-19T10:00:00Z"
}
```

**測試案例：**
- [ ] 正常回應 200
- [ ] 包含所有健康檢查項目
- [ ] 回應時間 < 100ms

---

#### API 測試 2：版本資訊

**Endpoint:** `GET /api/v1/version`

**成功回應 (200):**
```json
{
  "version": "1.0.0",
  "api_version": "v1",
  "build_date": "2025-01-19"
}
```

---

## 實作規格

### 需要建立/修改的檔案

#### 1. 錯誤處理核心

**檔案：** `app/core/errors.py`

```python
from fastapi import HTTPException
from typing import Optional, Dict, Any

class AppException(HTTPException):
    """應用程式基礎例外類別"""
    def __init__(
        self,
        status_code: int,
        error_code: str,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ):
        self.error_code = error_code
        self.details = details or {}
        super().__init__(status_code=status_code, detail=message)

class ValidationError(AppException):
    """驗證錯誤"""
    def __init__(self, message: str, field: Optional[str] = None):
        details = {"field": field} if field else {}
        super().__init__(
            status_code=400,
            error_code="VALIDATION_ERROR",
            message=message,
            details=details
        )

class NotFoundError(AppException):
    """資源不存在"""
    def __init__(self, resource: str, resource_id: str):
        super().__init__(
            status_code=404,
            error_code="NOT_FOUND",
            message=f"{resource} not found",
            details={"resource": resource, "id": resource_id}
        )

class UnauthorizedError(AppException):
    """未授權"""
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(
            status_code=401,
            error_code="UNAUTHORIZED",
            message=message
        )

class ForbiddenError(AppException):
    """禁止訪問"""
    def __init__(self, message: str = "Forbidden"):
        super().__init__(
            status_code=403,
            error_code="FORBIDDEN",
            message=message
        )
```

---

#### 2. 全局錯誤處理器

**檔案：** `app/core/exception_handlers.py`

```python
from fastapi import Request
from fastapi.responses import JSONResponse
from app.core.errors import AppException
import logging

logger = logging.getLogger(__name__)

async def app_exception_handler(request: Request, exc: AppException):
    """處理應用程式例外"""
    logger.error(f"Application error: {exc.error_code} - {exc.detail}")

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.error_code,
                "message": exc.detail,
                "details": exc.details
            }
        }
    )

async def general_exception_handler(request: Request, exc: Exception):
    """處理未預期的例外"""
    logger.exception(f"Unhandled exception: {exc}")

    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An internal error occurred"
            }
        }
    )

async def validation_exception_handler(request: Request, exc):
    """處理 Pydantic 驗證錯誤"""
    errors = []
    for error in exc.errors():
        errors.append({
            "field": ".".join(str(loc) for loc in error["loc"]),
            "message": error["msg"],
            "type": error["type"]
        })

    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request validation failed",
                "details": {"errors": errors}
            }
        }
    )
```

---

#### 3. 請求日誌中間件

**檔案：** `app/middleware/logging.py`

```python
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import time
import logging

logger = logging.getLogger(__name__)

class LoggingMiddleware(BaseHTTPMiddleware):
    """請求日誌中間件"""

    async def dispatch(self, request: Request, call_next):
        start_time = time.time()

        # 記錄請求
        logger.info(f"Request: {request.method} {request.url.path}")

        response = await call_next(request)

        # 記錄回應
        process_time = time.time() - start_time
        logger.info(
            f"Response: {response.status_code} "
            f"({process_time:.3f}s) "
            f"{request.method} {request.url.path}"
        )

        # 添加處理時間 header
        response.headers["X-Process-Time"] = str(process_time)

        return response
```

---

#### 4. 依賴注入

**檔案：** `app/api/deps.py`

```python
from typing import Generator
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import SessionLocal

def get_db() -> Generator:
    """獲取資料庫 session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 未來可以添加更多依賴，例如：
# - get_current_user (認證)
# - get_redis_client (Redis)
# - rate_limit (速率限制)
```

---

#### 5. 更新 main.py

**檔案：** `app/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from app.core.errors import AppException
from app.core.exception_handlers import (
    app_exception_handler,
    general_exception_handler,
    validation_exception_handler
)
from app.middleware.logging import LoggingMiddleware
from app.config import settings
import logging

# 設定日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# 建立應用
app = FastAPI(
    title="YTMaker API",
    version="1.0.0",
    description="YouTube 影片自動化生產系統 API",
    docs_url="/docs",
    redoc_url="/redoc"
)

# 添加中間件
app.add_middleware(LoggingMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 註冊例外處理器
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# 健康檢查端點
@app.get("/health")
async def health_check():
    """健康檢查"""
    # TODO: 添加資料庫和 Redis 連線檢查
    return {
        "status": "healthy",
        "version": "1.0.0"
    }

@app.get("/")
async def root():
    """根端點"""
    return {
        "message": "YTMaker API",
        "version": "1.0.0",
        "docs": "/docs"
    }

# API 版本資訊
@app.get("/api/v1/version")
async def api_version():
    """API 版本資訊"""
    return {
        "version": "1.0.0",
        "api_version": "v1"
    }
```

---

#### 6. 回應模型

**檔案：** `app/schemas/response.py`

```python
from pydantic import BaseModel
from typing import Optional, Any, Generic, TypeVar

T = TypeVar('T')

class SuccessResponse(BaseModel, Generic[T]):
    """成功回應"""
    success: bool = True
    data: T

class ErrorDetail(BaseModel):
    """錯誤詳情"""
    code: str
    message: str
    details: Optional[dict] = None

class ErrorResponse(BaseModel):
    """錯誤回應"""
    success: bool = False
    error: ErrorDetail

# 使用範例：
# @app.get("/endpoint", response_model=SuccessResponse[SomeModel])
# async def endpoint():
#     return SuccessResponse(data=some_data)
```

---

## 開發指引

### 開發步驟

**1. 建立核心錯誤類別**
```bash
cd backend/app
mkdir core middleware
touch core/errors.py core/exception_handlers.py
touch middleware/logging.py
```

**2. 實作錯誤處理**
- 定義所有錯誤類別
- 實作錯誤處理器
- 統一錯誤格式

**3. 實作中間件**
- 日誌中間件
- 計時中間件
- CORS 設定

**4. 更新 main.py**
- 註冊中間件
- 註冊錯誤處理器
- 添加健康檢查

**5. 測試**
```bash
# 測試健康檢查
curl http://localhost:8000/health

# 測試錯誤處理
curl http://localhost:8000/api/v1/nonexistent

# 查看日誌
tail -f logs/app.log
```

---

### 注意事項

**錯誤處理：**
- [ ] 所有錯誤都有唯一的錯誤碼
- [ ] 錯誤訊息對使用者友善
- [ ] 不洩漏敏感資訊
- [ ] 記錄詳細錯誤到日誌

**中間件：**
- [ ] 中間件順序正確
- [ ] 不影響效能
- [ ] 錯誤也能被中間件處理

**CORS：**
- [ ] 允許的 origin 正確
- [ ] 開發環境允許 localhost:3000
- [ ] 生產環境需要更新

---

## 完成檢查清單

### 開發完成
- [ ] 錯誤類別定義完成
- [ ] 錯誤處理器實作完成
- [ ] 中間件實作完成
- [ ] 依賴注入設定完成
- [ ] 健康檢查端點完成

### 測試完成
- [ ] 錯誤格式測試通過
- [ ] 中間件測試通過
- [ ] 健康檢查測試通過
- [ ] API 文件正確生成

### 文件同步
- [ ] 錯誤碼已記錄
- [ ] API 文件已更新

### Git
- [ ] 在 feature/task-003-api-foundation 分支
- [ ] Commit 訊息清楚

---

## 時間分配

- **錯誤處理實作：** 1.5 小時
- **中間件實作：** 1 小時
- **依賴注入與配置：** 1 小時
- **測試：** 1 小時
- **文件與驗證：** 0.5 小時

**總計：** 5 小時
