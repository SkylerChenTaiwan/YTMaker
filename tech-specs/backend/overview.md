# Backend 整體架構

> **關聯文件:** [framework.md](../framework.md), [database.md](./database.md), [api-design.md](./api-design.md)

---

## 1. 技術棧概覽

### 核心框架
- **框架:** FastAPI (Python 3.9+)
- **ASGI 伺服器:** Uvicorn
- **ORM:** SQLAlchemy 2.x
- **資料庫:** SQLite
- **任務佇列:** Celery
- **訊息代理:** Redis

### 理由選擇
- **高效能:** 基於 Starlette 和 Pydantic,支援 async/await
- **自動文件:** 自動生成 OpenAPI 文件
- **強型別:** 強大的型別驗證
- **Python 生態:** 適合 AI 相關專案

---

## 2. 專案目錄結構

```
backend/
├── app/
│   ├── api/              # API 路由
│   │   ├── v1/
│   │   │   ├── projects.py
│   │   │   ├── configurations.py
│   │   │   ├── templates.py
│   │   │   ├── settings.py
│   │   │   ├── batch.py
│   │   │   └── stats.py
│   │   └── deps.py       # 依賴注入
│   ├── models/           # SQLAlchemy 模型
│   │   ├── project.py
│   │   ├── configuration.py
│   │   ├── template.py
│   │   ├── setting.py
│   │   └── batch.py
│   ├── schemas/          # Pydantic Schemas
│   │   ├── project.py
│   │   ├── configuration.py
│   │   └── ...
│   ├── services/         # 業務邏輯
│   │   ├── project_service.py
│   │   ├── video_generation_service.py
│   │   ├── gemini_service.py
│   │   ├── stability_service.py
│   │   └── youtube_service.py
│   ├── tasks/            # Celery 任務
│   │   ├── script_tasks.py
│   │   ├── asset_tasks.py
│   │   ├── render_tasks.py
│   │   └── upload_tasks.py
│   ├── utils/            # 工具函數
│   │   ├── file_utils.py
│   │   ├── validation.py
│   │   └── keychain.py
│   ├── security/         # 安全相關
│   │   └── keychain_manager.py
│   ├── core/             # 核心配置
│   │   ├── config.py
│   │   ├── database.py
│   │   └── celery_app.py
│   └── main.py           # 主應用入口
├── tests/
│   ├── unit/
│   ├── integration/
│   └── conftest.py
├── logs/
├── data/                 # SQLite 資料庫檔案
│   ├── dev.db
│   └── production.db
├── requirements.txt
├── pyproject.toml
└── README.md
```

---

## 3. 主要依賴套件

### 核心套件
```txt
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
pydantic>=2.5.0
sqlalchemy>=2.0.0
alembic>=1.12.0
```

### 任務佇列
```txt
celery>=5.3.0
redis>=5.0.0
flower>=2.0.0
```

### AI/API 客戶端
```txt
google-generativeai>=0.3.0
requests>=2.31.0
google-api-python-client>=2.100.0
google-auth-httplib2>=0.1.1
google-auth-oauthlib>=1.1.0
```

### 影音處理
```txt
ffmpeg-python>=0.2.0
Pillow>=10.0.0
pydub>=0.25.0
```

### 開發工具
```txt
pytest>=7.4.0
httpx>=0.25.0
ruff>=0.1.0
mypy>=1.6.0
```

---

## 4. 應用程式啟動流程

### 開發環境啟動

**1. 啟動 Redis (Docker)**
```bash
docker run -d -p 6379:6379 redis:alpine
```

**2. 啟動 Celery Worker**
```bash
celery -A app.core.celery_app worker --loglevel=info
```

**3. 啟動 FastAPI 伺服器**
```bash
uvicorn app.main:app --reload --host localhost --port 8000
```

**4. (可選) 啟動 Flower (Celery 監控)**
```bash
celery -A app.core.celery_app flower --port=5555
```

### 生產環境啟動

**使用 Supervisor 或 systemd 管理服務:**

```bash
# systemd 服務定義範例
# /etc/systemd/system/ytmaker-api.service

[Unit]
Description=YTMaker API Service
After=network.target

[Service]
Type=simple
User=ytmaker
WorkingDirectory=/opt/ytmaker/backend
ExecStart=/opt/ytmaker/venv/bin/uvicorn app.main:app --host localhost --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

---

## 5. 配置管理

### 環境變數

**開發環境 (.env.dev)**
```env
# 應用配置
APP_ENV=development
API_HOST=localhost
API_PORT=8000

# 資料庫
DATABASE_URL=sqlite:///./data/dev.db

# Redis
REDIS_URL=redis://localhost:6379/0

# 日誌
LOG_LEVEL=DEBUG
LOG_FILE=logs/dev.log

# API Keys (從 Keychain 讀取,這裡僅作為參考)
# GEMINI_API_KEY=
# STABILITY_API_KEY=
# DID_API_KEY=
```

**生產環境 (.env.prod)**
```env
APP_ENV=production
API_HOST=localhost
API_PORT=8000
DATABASE_URL=sqlite:///{user_data_dir}/ytmaker/production.db
REDIS_URL=redis://localhost:6379/0
LOG_LEVEL=INFO
LOG_FILE=logs/production.log
```

### 配置檔案載入

```python
# app/core/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_env: str = "development"
    api_host: str = "localhost"
    api_port: int = 8000
    database_url: str
    redis_url: str
    log_level: str = "INFO"
    log_file: str = "logs/app.log"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
```

---

## 6. 本地端應用特性

### 單用戶模式
- **無需用戶認證:** API 僅監聽 `localhost`
- **無需權限管理:** 單用戶擁有所有權限
- **簡化架構:** 無需 Session、JWT、OAuth

### 安全性考量
- **API Keys 儲存:** 使用作業系統 Keychain
- **本地運行:** 不暴露於公網
- **輸入驗證:** 使用 Pydantic 驗證所有輸入

---

## 7. API 文件與測試

### OpenAPI 文件
FastAPI 自動生成,訪問:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

### API 測試工具
- **開發階段:** Swagger UI (內建測試界面)
- **自動化測試:** pytest + httpx
- **手動測試:** Postman / Insomnia

---

## 8. 日誌與監控

### 日誌策略
- **日誌庫:** Python logging + structlog
- **日誌格式:** JSON 格式 (便於解析)
- **日誌等級:** DEBUG, INFO, WARNING, ERROR, CRITICAL
- **日誌檔案:** 按日期分割 (logs/app-2024-01-15.log)

### 監控
- **Celery 任務監控:** Flower (`http://localhost:5555`)
- **應用效能監控:** 本地日誌分析 (可選: Sentry)

---

## 9. 資料庫遷移

### 使用 Alembic 管理資料庫 Schema 變更

**初始化 Alembic:**
```bash
alembic init migrations
```

**建立遷移腳本:**
```bash
alembic revision --autogenerate -m "Create initial tables"
```

**執行遷移:**
```bash
alembic upgrade head
```

**回退遷移:**
```bash
alembic downgrade -1
```

---

## 10. 錯誤處理與重試機制

### 全局錯誤處理器

```python
# app/main.py
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI()

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "E-0.0",
                "message": "內部伺服器錯誤",
                "details": str(exc),
                "timestamp": datetime.utcnow().isoformat()
            }
        }
    )
```

### Celery 任務重試

```python
@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def generate_image(self, prompt: str):
    try:
        # 調用 Stability AI API
        ...
    except Exception as exc:
        # 重試
        raise self.retry(exc=exc)
```

---

## 總結

### 核心特性
- ✅ 本地端應用,保護用戶隱私
- ✅ 前後端分離,清晰的職責劃分
- ✅ 非同步任務處理,支援長時間影片生成
- ✅ 完整的錯誤處理與日誌系統
- ✅ 自動化測試與 CI/CD 支援

### 技術亮點
- FastAPI 高效能 API
- Celery 強大的任務佇列
- SQLAlchemy ORM 簡化資料庫操作
- Pydantic 強型別驗證
- 完整的 OpenAPI 文件

---

**下一步:** 詳見 [database.md](./database.md)、[api-design.md](./api-design.md)、[auth.md](./auth.md)
