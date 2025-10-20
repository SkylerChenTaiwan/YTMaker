# Backend 整體架構

> **關聯文件:** [framework.md](../framework.md)

---

## 文件導航

本目錄包含完整的後端技術規格，已拆分為以下模塊：

### API 設計
- **[api-system.md](./api-system.md)** - 系統初始化 API（3 個端點）
- **[api-projects.md](./api-projects.md)** - 專案管理 API（10 個端點）
- **[api-configurations.md](./api-configurations.md)** - 配置與模板管理 API（5 個端點）
- **[api-youtube.md](./api-youtube.md)** - YouTube 授權 API（4 個端點）
- **[api-stats.md](./api-stats.md)** - 統計與配額 API（2 個端點）
- **[api-batch.md](./api-batch.md)** - 批次處理 API（3 個端點）

### 資料與業務邏輯
- **[database.md](./database.md)** - 資料模型與資料庫設計（7 個資料表）
- **[business-logic.md](./business-logic.md)** - 核心業務邏輯（腳本、素材、渲染、上傳）

### 安全與效能
- **[auth.md](./auth.md)** - 認證與授權（API Key、OAuth Token 管理）
- **[security.md](./security.md)** - 安全措施（輸入驗證、SQL Injection 防護、敏感資料保護）
- **[caching.md](./caching.md)** - 快取策略（Redis、查詢快取、失效策略）
- **[performance.md](./performance.md)** - 效能優化（資料庫、非同步、檔案系統）

### 整合與測試
- **[background-jobs.md](./background-jobs.md)** - 背景任務（Celery、影片生成、批次處理）
- **[integrations.md](./integrations.md)** - 第三方整合（Gemini、Stability AI、D-ID、YouTube）
- **[testing.md](./testing.md)** - 測試規格（單元測試、整合測試、Mock 設計）

---

## 1. 技術棧

### 核心框架
- **Web 框架:** FastAPI (Python 3.9+)
- **ASGI 伺服器:** Uvicorn
- **ORM:** SQLAlchemy 2.x
- **資料庫:** SQLite (本地端)
- **快取:** Redis
- **任務佇列:** Celery + Redis

### 主要套件
- **API 文件:** FastAPI 內建 OpenAPI
- **資料驗證:** Pydantic
- **密碼加密:** keyring (系統 Keychain)
- **Token 加密:** cryptography (Fernet)
- **影片處理:** FFmpeg (透過 ffmpeg-python)
- **圖片處理:** Pillow
- **音訊處理:** pydub

### AI/API 客戶端
- **Google Gemini:** google-generativeai
- **Stability AI:** requests
- **D-ID:** requests
- **YouTube:** google-api-python-client

---

## 2. 專案結構

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI 應用入口
│   │
│   ├── api/                       # API 端點
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── system.py         # 系統初始化 API
│   │   │   ├── projects.py       # 專案管理 API
│   │   │   ├── configurations.py # 配置管理 API
│   │   │   ├── templates.py      # 模板管理 API
│   │   │   ├── youtube.py        # YouTube 授權 API
│   │   │   ├── stats.py          # 統計與配額 API
│   │   │   └── batch.py          # 批次處理 API
│   │
│   ├── models/                    # 資料庫模型
│   │   ├── __init__.py
│   │   ├── project.py
│   │   ├── configuration.py
│   │   ├── prompt_template.py
│   │   ├── youtube_account.py
│   │   ├── asset.py
│   │   ├── batch_task.py
│   │   └── system_settings.py
│   │
│   ├── schemas/                   # Pydantic Schemas
│   │   ├── __init__.py
│   │   ├── project.py
│   │   ├── configuration.py
│   │   └── ...
│   │
│   ├── services/                  # 業務邏輯服務
│   │   ├── __init__.py
│   │   ├── gemini_service.py     # Gemini 腳本生成
│   │   ├── tts_service.py        # 語音合成
│   │   ├── stability_service.py  # 圖片生成
│   │   ├── did_service.py        # 虛擬主播生成
│   │   ├── ffmpeg_service.py     # 影片渲染
│   │   ├── youtube_service.py    # YouTube 上傳
│   │   └── thumbnail_service.py  # 封面生成
│   │
│   ├── tasks/                     # Celery 任務
│   │   ├── __init__.py
│   │   ├── video_generation.py   # 影片生成任務
│   │   ├── batch_processing.py   # 批次處理任務
│   │   └── quota_sync.py         # 配額同步任務
│   │
│   ├── utils/                     # 工具函數
│   │   ├── __init__.py
│   │   ├── database.py           # 資料庫連線
│   │   ├── cache.py              # Redis 快取
│   │   ├── logger.py             # 日誌工具
│   │   └── validators.py         # 驗證工具
│   │
│   ├── security/                  # 安全相關
│   │   ├── __init__.py
│   │   ├── keychain.py           # API Key 管理
│   │   └── oauth.py              # OAuth Token 管理
│   │
│   └── core/                      # 核心配置
│       ├── __init__.py
│       ├── config.py             # 應用配置
│       └── constants.py          # 常數定義
│
├── tests/                         # 測試
│   ├── unit/
│   ├── integration/
│   └── conftest.py
│
├── logs/                          # 日誌檔案
├── data/                          # 資料檔案
│   ├── projects/                 # 專案檔案
│   ├── database.db              # SQLite 資料庫
│   └── redis-data/              # Redis 持久化
│
├── alembic/                       # 資料庫遷移
├── requirements.txt              # Python 依賴
└── pyproject.toml               # 專案配置
```

---

## 3. 應用啟動流程

**啟動命令:**
```bash
# 開發環境
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 生產環境
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

**啟動步驟:**
1. 載入環境變數
2. 初始化資料庫連線
3. 初始化 Redis 連線
4. 啟動 Celery Worker (背景)
5. 啟動 FastAPI 應用
6. 檢查系統初始化狀態

---

## 4. API 路由註冊

**主應用 (main.py):**
```python
from fastapi import FastAPI
from app.api.v1 import (
    system,
    projects,
    configurations,
    templates,
    youtube,
    stats,
    batch,
)

app = FastAPI(
    title="YTMaker API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# 註冊路由
app.include_router(system.router, prefix="/api/v1/system", tags=["System"])
app.include_router(projects.router, prefix="/api/v1/projects", tags=["Projects"])
app.include_router(configurations.router, prefix="/api/v1/configurations", tags=["Configurations"])
app.include_router(templates.router, prefix="/api/v1/prompt-templates", tags=["Templates"])
app.include_router(youtube.router, prefix="/api/v1/youtube", tags=["YouTube"])
app.include_router(stats.router, prefix="/api/v1/stats", tags=["Stats"])
app.include_router(batch.router, prefix="/api/v1/batch", tags=["Batch"])
```

---

## 5. 資料流架構

```
[前端請求] → [FastAPI API 層] → [Service 層] → [資料庫/Redis/外部 API]
                                           ↓
                                    [Celery 任務佇列]
```

**同步流程 (CRUD):**
```
前端 → API 端點 → Service 層 → 資料庫 → 回應
```

**非同步流程 (影片生成):**
```
前端 → API 端點 → Celery 任務 → 背景執行 → WebSocket 推送進度
```

---

## 6. 錯誤處理架構

**全局錯誤處理器:**
```python
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "伺服器錯誤，請稍後重試",
                "details": str(exc) if DEBUG else None
            }
        }
    )
```

---

## 7. 日誌架構

> **重要：** 採用結構化日誌策略，使用 JSON 格式，包含 trace_id。

**完整規範請參考：** `tech-specs/backend/logging.md`

**核心要求：**
- ✅ 所有日誌使用 **JSON 格式**（結構化日誌）
- ✅ 每個請求都有唯一的 **trace_id**
- ✅ 包含標準欄位：`trace_id`, `timestamp`, `level`, `message`, `project_id`, `error_code`, `details`
- ✅ 使用 `StructuredLogger` 類別
- ✅ 輪替：每日輪替，保留 30 天
- ✅ 等級：INFO（生產）, DEBUG（開發）

**範例日誌：**
```json
{
  "trace_id": "abc-123-def-456",
  "timestamp": "2025-10-20T10:30:15.123Z",
  "level": "error",
  "message": "Gemini API quota exceeded",
  "project_id": "proj_12345",
  "error_code": "GEMINI_QUOTA_EXCEEDED",
  "details": {
    "quota_used": 1000,
    "quota_total": 1000
  }
}
```

---

## 8. 配置管理

**環境變數 (.env):**
```env
# 應用配置
ENV=development
DEBUG=True
PORT=8000

# 資料庫
DATABASE_URL=sqlite:///./data/database.db

# Redis
REDIS_URL=redis://localhost:6379/0

# 外部 API (不儲存，使用 Keychain)
# GEMINI_API_KEY=...
# STABILITY_AI_API_KEY=...
# DID_API_KEY=...
```

---

## 總結

**核心特色:**
- ✅ RESTful API 設計
- ✅ 非同步任務處理 (Celery)
- ✅ WebSocket 即時更新
- ✅ 自動 API 文件 (OpenAPI)
- ✅ 型別安全 (Pydantic)
- ✅ 資料庫 ORM (SQLAlchemy)
- ✅ 快取機制 (Redis)
- ✅ 錯誤處理與日誌
- ✅ 安全的 API Key 管理

**設計原則:**
- 單一職責：每個 Service 只負責一個功能
- 依賴注入：透過 FastAPI Depends 管理依賴
- 錯誤優先：明確的錯誤處理和回應
- 可測試性：所有業務邏輯可獨立測試
