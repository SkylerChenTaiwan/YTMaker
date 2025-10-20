# 後端日誌規範

> **版本：** 1.0
> **最後更新：** 2025-10-20
> **狀態：** ✅ Approved

---

## 目錄

1. [結構化日誌](#1-結構化日誌)
2. [StructuredLogger 實作](#2-structuredlogger-實作)
3. [使用範例](#3-使用範例)
4. [日誌等級](#4-日誌等級)
5. [輪替與保存](#5-輪替與保存)

---

## 1. 結構化日誌

### 1.1 日誌格式

所有日誌必須使用 **JSON 格式**，包含以下標準欄位：

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `trace_id` | string | ✅ | 追蹤 ID（每個請求唯一） |
| `timestamp` | string | ✅ | ISO 8601 格式時間戳記 |
| `level` | string | ✅ | 日誌等級（info, warning, error） |
| `message` | string | ✅ | 日誌訊息 |
| `project_id` | string | 🟡 | 專案 ID（如果相關） |
| `user_id` | string | 🟡 | 用戶 ID（如果相關） |
| `api` | string | 🟡 | API 名稱（如果是 API 呼叫） |
| `duration_ms` | number | 🟡 | 執行時間（毫秒） |
| `error_code` | string | 🟡 | 錯誤碼（如果是錯誤） |
| `details` | object | 🟡 | 額外資訊（dict） |

### 1.2 範例日誌

```json
{
  "trace_id": "abc-123-def-456",
  "timestamp": "2025-10-20T10:30:15.123Z",
  "level": "error",
  "message": "Gemini API quota exceeded",
  "project_id": "proj_12345",
  "user_id": "user_67890",
  "api": "gemini",
  "error_code": "GEMINI_QUOTA_EXCEEDED",
  "details": {
    "quota_used": 1000,
    "quota_total": 1000,
    "reset_date": "2025-10-21T00:00:00Z"
  }
}
```

---

## 2. StructuredLogger 實作

### 2.1 核心實作

```python
import logging
import uuid
import json
from contextvars import ContextVar
from datetime import datetime
from typing import Any, Dict, Optional

# 每個請求都有唯一的 trace_id
trace_id_var: ContextVar[str] = ContextVar('trace_id', default='')

class StructuredLogger:
    """結構化日誌記錄器"""

    def __init__(self, name: str):
        self.logger = logging.getLogger(name)

    def log(self, level: str, message: str, **extra):
        """記錄結構化日誌"""
        trace_id = trace_id_var.get()
        log_data = {
            "trace_id": trace_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": level,
            "message": message,
            **extra
        }

        # 輸出 JSON 格式
        self.logger.log(
            getattr(logging, level.upper()),
            json.dumps(log_data, ensure_ascii=False, default=str)
        )

    def info(self, message: str, **extra):
        """記錄 INFO 級別日誌"""
        self.log("info", message, **extra)

    def warning(self, message: str, **extra):
        """記錄 WARNING 級別日誌"""
        self.log("warning", message, **extra)

    def error(self, message: str, **extra):
        """記錄 ERROR 級別日誌"""
        self.log("error", message, **extra)

    def debug(self, message: str, **extra):
        """記錄 DEBUG 級別日誌（僅開發環境）"""
        self.log("debug", message, **extra)
```

### 2.2 Trace ID 管理

```python
from fastapi import FastAPI, Request
import uuid

app = FastAPI()

@app.middleware("http")
async def add_trace_id(request: Request, call_next):
    """為每個請求生成唯一的 trace_id"""
    # 檢查是否有現有的 trace_id (來自上游服務)
    trace_id = request.headers.get("X-Trace-ID") or str(uuid.uuid4())

    # 設定到 context variable
    trace_id_var.set(trace_id)

    # 執行請求
    response = await call_next(request)

    # 在回應中返回 trace_id
    response.headers["X-Trace-ID"] = trace_id

    return response
```

---

## 3. 使用範例

### 3.1 API 請求日誌

```python
from app.utils.logging import StructuredLogger

logger = StructuredLogger(__name__)

@app.post("/api/v1/projects")
async def create_project(request: CreateProjectRequest):
    # 記錄請求開始
    logger.info("API request started", extra={
        "endpoint": "/api/v1/projects",
        "method": "POST",
        "user_id": request.user_id
    })

    # ... 處理邏輯 ...

    # 記錄請求完成
    logger.info("API request completed", extra={
        "endpoint": "/api/v1/projects",
        "method": "POST",
        "project_id": project.id,
        "duration_ms": 1234
    })
```

### 3.2 外部 API 呼叫日誌

```python
logger = StructuredLogger(__name__)

# 呼叫前記錄
logger.info("Calling external API", extra={
    "api": "gemini",
    "model": "gemini-1.5-flash",
    "prompt_length": len(prompt),
    "project_id": project_id
})

start_time = time.time()

try:
    response = await gemini_client.generate(prompt)

    # 成功時記錄
    logger.info("External API call succeeded", extra={
        "api": "gemini",
        "duration_ms": int((time.time() - start_time) * 1000),
        "response_length": len(response.text),
        "project_id": project_id
    })

except GeminiQuotaExceededError as e:
    # 錯誤時記錄
    logger.error("External API call failed", extra={
        "api": "gemini",
        "error_code": "GEMINI_QUOTA_EXCEEDED",
        "duration_ms": int((time.time() - start_time) * 1000),
        "project_id": project_id,
        "details": {
            "quota_used": e.quota_used,
            "quota_total": e.quota_total
        }
    })
    raise
```

### 3.3 錯誤處理日誌

```python
logger = StructuredLogger(__name__)

try:
    avatar_video = generate_avatar_strict(audio_url, avatar_image_url)
except AvatarGenerationError as e:
    # 記錄詳細錯誤
    logger.error("Avatar generation failed", extra={
        "error_code": e.reason,
        "is_retryable": e.is_retryable,
        "details": e.details,
        "project_id": project_id,
        "audio_url": audio_url,
        "avatar_image_url": avatar_image_url
    })

    # 更新專案狀態並重新拋出
    raise
```

### 3.4 Celery 任務日誌

```python
from celery import Task
from app.utils.logging import StructuredLogger, trace_id_var

logger = StructuredLogger(__name__)

@celery.task(bind=True)
def process_video(self: Task, project_id: str, trace_id: str):
    # 設定 trace_id
    trace_id_var.set(trace_id)

    # 記錄任務開始
    logger.info("Celery task started", extra={
        "task_name": "process_video",
        "project_id": project_id,
        "task_id": self.request.id
    })

    try:
        # ... 處理邏輯 ...

        logger.info("Celery task completed", extra={
            "task_name": "process_video",
            "project_id": project_id,
            "task_id": self.request.id,
            "duration_ms": 5000
        })

    except Exception as e:
        logger.error("Celery task failed", extra={
            "task_name": "process_video",
            "project_id": project_id,
            "task_id": self.request.id,
            "error": str(e)
        })
        raise
```

---

## 4. 日誌等級

### 4.1 等級定義

| 等級 | 用途 | 範例 |
|------|------|------|
| **DEBUG** | 開發調試資訊 | 變數值、中間結果（僅開發環境） |
| **INFO** | 一般資訊 | API 請求、任務開始/完成 |
| **WARNING** | 警告但不影響運行 | 配額 < 20%、重試次數 > 2 |
| **ERROR** | 錯誤需要關注 | API 失敗、任務失敗 |

### 4.2 使用原則

**INFO 等級記錄：**
- ✅ API 請求開始和結束
- ✅ 外部 API 呼叫成功
- ✅ Celery 任務狀態變更
- ✅ 重要業務操作（專案建立、影片生成）

**WARNING 等級記錄：**
- ✅ 配額即將用盡 (< 20%)
- ✅ 重試次數較多 (> 2)
- ✅ 效能問題（回應時間 > 5 秒）
- ✅ 使用了 fallback 機制

**ERROR 等級記錄：**
- ✅ 所有 API 呼叫失敗
- ✅ 資料庫操作失敗
- ✅ Celery 任務失敗
- ✅ 配額用盡
- ✅ 檔案系統錯誤

**DEBUG 等級記錄（僅開發環境）：**
- ✅ 變數值
- ✅ 中間計算結果
- ✅ 詳細的執行流程

---

## 5. 輪替與保存

### 5.1 日誌配置

**開發環境：**
```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {
            'format': '%(message)s'  # 已經是 JSON，不需要額外格式化
        }
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'json',
            'level': 'DEBUG',
        },
        'file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': 'logs/app.log',
            'maxBytes': 10 * 1024 * 1024,  # 10 MB
            'backupCount': 5,
            'formatter': 'json',
            'level': 'DEBUG',
        }
    },
    'root': {
        'level': 'DEBUG',
        'handlers': ['console', 'file']
    }
}
```

**生產環境：**
```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {
            'format': '%(message)s'
        }
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'json',
            'level': 'INFO',
        },
        'file': {
            'class': 'logging.handlers.TimedRotatingFileHandler',
            'filename': 'logs/app.log',
            'when': 'midnight',  # 每天午夜輪替
            'interval': 1,
            'backupCount': 30,  # 保留 30 天
            'formatter': 'json',
            'level': 'INFO',
        }
    },
    'root': {
        'level': 'INFO',
        'handlers': ['console', 'file']
    }
}
```

### 5.2 日誌保存策略

| 環境 | 輪替方式 | 保留天數 | 等級 |
|------|---------|---------|------|
| 開發 | 大小輪替（10 MB） | 5 個檔案 | DEBUG |
| 生產 | 每日輪替（午夜） | 30 天 | INFO |

### 5.3 日誌搜尋

因為使用 JSON 格式，可以使用 `jq` 工具搜尋：

```bash
# 搜尋特定 trace_id 的所有日誌
cat logs/app.log | jq 'select(.trace_id == "abc-123-def-456")'

# 搜尋特定專案的所有錯誤
cat logs/app.log | jq 'select(.project_id == "proj_12345" and .level == "error")'

# 搜尋 Gemini API 的所有呼叫
cat logs/app.log | jq 'select(.api == "gemini")'

# 統計每種錯誤碼的出現次數
cat logs/app.log | jq -r '.error_code' | sort | uniq -c
```

---

## 6. 最佳實踐

### 6.1 DO ✅

- ✅ 所有日誌使用 StructuredLogger
- ✅ 所有請求都有 trace_id
- ✅ 關鍵操作記錄開始和結束
- ✅ 錯誤記錄詳細的 error_code 和 details
- ✅ 記錄執行時間（duration_ms）
- ✅ 使用適當的日誌等級

### 6.2 DON'T ❌

- ❌ 不要使用 `print()` 或 `console.log()`
- ❌ 不要記錄敏感資訊（密碼、API Key、Token）
- ❌ 不要記錄過大的資料（完整圖片、完整影片）
- ❌ 不要在迴圈中記錄大量日誌
- ❌ 不要使用不標準的日誌格式

---

## 7. 測試建議

### 7.1 日誌測試

```python
import pytest
from app.utils.logging import StructuredLogger, trace_id_var
import json

def test_structured_logger(caplog):
    """測試結構化日誌輸出"""
    logger = StructuredLogger("test")
    trace_id_var.set("test-trace-id")

    logger.info("Test message", extra={
        "project_id": "proj_123",
        "api": "gemini"
    })

    # 解析日誌
    log_output = caplog.records[0].message
    log_data = json.loads(log_output)

    # 驗證
    assert log_data["trace_id"] == "test-trace-id"
    assert log_data["message"] == "Test message"
    assert log_data["project_id"] == "proj_123"
    assert log_data["api"] == "gemini"
```

---

**最後更新：** 2025-10-20
**維護者：** Backend Team
