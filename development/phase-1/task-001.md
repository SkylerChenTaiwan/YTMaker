# Task-001: 專案初始化與開發環境設定

> **建立日期:** 2025-10-19
> **狀態:** ⏳ 未開始
> **預估時間:** 4 小時
> **優先級:** P0 (必須)

---

## 關聯文件

### 技術規格
- **技術框架:** `tech-specs/framework.md`
- **後端架構:** `tech-specs/backend/overview.md`
- **前端架構:** `tech-specs/frontend/overview.md`

### 相關任務
- **前置任務:** 無
- **後續任務:** Task-002 (資料庫設計), Task-003 (API 基礎架構)
- **依賴關係:** 所有後續任務都依賴此任務

---

## 任務目標

### 簡述
建立完整的前後端專案結構,安裝所有必要依賴,配置開發環境,確保本地開發環境可正常運行。

### 詳細成功標準
- [x] 前後端目錄結構完整建立 (frontend/, backend/)
- [x] 所有依賴正確安裝 (package.json, requirements.txt)
- [x] Docker Compose 配置完成並可啟動 Redis
- [x] 開發環境可正常運行 (`npm run dev`, `uvicorn` 啟動成功)
- [x] 程式碼品質工具配置完成 (ESLint, Prettier, Ruff, mypy)
- [x] Git 忽略檔案正確設定
- [x] 健康檢查端點可存取
- [x] 所有配置檔案符合 tech-specs 規範

---

## 測試要求

### 單元測試

#### 測試 1: 前端開發伺服器啟動驗證

**目的:** 驗證 Next.js 開發伺服器可正常啟動並回應請求

**測試步驟:**
```bash
cd frontend
npm install
npm run dev
```

**預期結果:**
- 伺服器在 `http://localhost:3000` 啟動成功
- 瀏覽器訪問顯示 Next.js 預設頁面
- 無 npm 錯誤或警告
- Hot reload 功能正常

**驗證點:**
- [ ] npm install 無錯誤
- [ ] 開發伺服器在 3 秒內啟動
- [ ] 瀏覽器可正常載入頁面
- [ ] 修改檔案後自動重新載入

---

#### 測試 2: 後端 API 伺服器啟動驗證

**目的:** 驗證 FastAPI 應用可正常啟動並回應請求

**測試步驟:**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**預期結果:**
- 伺服器在 `http://localhost:8000` 啟動成功
- Swagger UI 可在 `/api/docs` 存取
- ReDoc 可在 `/api/redoc` 存取
- 健康檢查端點回應正常

**驗證點:**
- [ ] pip install 無錯誤
- [ ] 伺服器在 5 秒內啟動
- [ ] GET `/health` 回應 `{"status": "ok"}`
- [ ] Swagger UI 正常顯示
- [ ] Auto-reload 功能正常

---

#### 測試 3: Docker Compose Redis 服務驗證

**目的:** 驗證 Redis 可透過 Docker Compose 正常啟動

**測試步驟:**
```bash
docker-compose up -d redis
docker-compose ps
redis-cli ping
```

**預期結果:**
- Redis 容器成功啟動
- 監聽 6379 port
- redis-cli 可連線並回應 PONG

**驗證點:**
- [ ] `docker-compose up -d redis` 成功
- [ ] 容器狀態為 "Up"
- [ ] `redis-cli ping` 回應 "PONG"
- [ ] 可從 Python 連線: `redis.Redis(host='localhost', port=6379).ping()`

---

#### 測試 4: 程式碼品質工具驗證

**目的:** 驗證 ESLint, Prettier, Ruff, mypy 正確配置

**測試步驟:**

**前端:**
```bash
cd frontend
npm run lint
npm run format
```

**後端:**
```bash
cd backend
ruff check .
ruff format .
mypy app/
```

**預期結果:**
- 所有指令成功執行
- 無配置錯誤
- 範例檔案通過檢查

**驗證點:**
- [ ] ESLint 規則正確載入
- [ ] Prettier 格式化正常運作
- [ ] Ruff 檢查正常運作
- [ ] mypy 類型檢查正常運作
- [ ] 配置檔案符合 `tech-specs/framework.md` 規範

---

#### 測試 5: Git 忽略規則驗證

**目的:** 驗證 .gitignore 正確設定,不會提交不必要的檔案

**測試步驟:**
```bash
# 建立測試檔案
touch frontend/node_modules/test.txt
touch backend/__pycache__/test.pyc
touch backend/.env
touch data/test.db

# 檢查 git status
git status
```

**預期結果:**
- 以上測試檔案都不出現在 git status 中
- 只追蹤必要的原始碼檔案

**驗證點:**
- [ ] node_modules/ 被忽略
- [ ] __pycache__/ 被忽略
- [ ] .env 被忽略
- [ ] *.pyc 被忽略
- [ ] data/*.db 被忽略
- [ ] logs/ 被忽略

---

#### 測試 6: 配置檔案正確性驗證

**目的:** 驗證所有配置檔案符合 spec 規範

**測試步驟:**
```typescript
// tests/unit/config.test.ts
import { Settings } from '@/core/config'

test('配置檔案應符合 spec 規範', () => {
  const config = new Settings()

  // 驗證結構 - 使用 Zod schema 驗證
  const configSchema = z.object({
    CORS_ORIGINS: z.array(z.string()),
    DATABASE_URL: z.string(),
    REDIS_URL: z.string(),
    API_V1_PREFIX: z.string(),
    PORT: z.number(),
  })

  expect(() => configSchema.parse(config)).not.toThrow()

  // 驗證關鍵設定值
  expect(config.CORS_ORIGINS).toContain('http://localhost:3000')
  expect(config.DATABASE_URL).toMatch(/^sqlite:\/\//)
  expect(config.REDIS_URL).toMatch(/^redis:\/\//)
  expect(config.API_V1_PREFIX).toBe('/api/v1')
  expect(config.PORT).toBe(8000)
})
```

**Python 端測試:**
```python
# tests/unit/test_config.py
from app.core.config import Settings

def test_config_schema_compliance():
    """驗證配置符合 spec 規範"""
    config = Settings()

    # 驗證必要欄位存在
    assert hasattr(config, 'CORS_ORIGINS')
    assert hasattr(config, 'DATABASE_URL')
    assert hasattr(config, 'REDIS_URL')

    # 驗證值的格式
    assert 'http://localhost:3000' in config.CORS_ORIGINS
    assert config.DATABASE_URL.startswith('sqlite:///')
    assert config.REDIS_URL.startswith('redis://')
```

**預期結果:**
- 所有配置欄位都符合 spec 定義
- CORS origins 包含前端開發伺服器
- 資料庫和 Redis URL 格式正確

**驗證點:**
- [ ] 配置結構符合 schema
- [ ] CORS_ORIGINS 包含 http://localhost:3000
- [ ] DATABASE_URL 格式正確 (sqlite://)
- [ ] REDIS_URL 格式正確 (redis://)
- [ ] API_V1_PREFIX 為 /api/v1
- [ ] PORT 為 8000

---

#### 測試 7: 跨平台路徑處理

**目的:** 驗證在不同作業系統上路徑處理正確

**測試步驟:**
```python
# tests/unit/test_cross_platform.py
import platform
from pathlib import Path
from app.core.config import Settings

def test_cross_platform_paths():
    """驗證不同作業系統的路徑處理正確"""
    config = Settings()

    # 使用 pathlib.Path 確保跨平台相容
    data_dir = Path(config.DATA_DIR)
    upload_dir = Path(config.UPLOAD_DIR)
    logs_dir = Path(config.LOGS_DIR)

    # 驗證路徑存在或可建立
    assert data_dir.parent.exists() or data_dir.parent == Path('.')
    assert upload_dir.parent.exists() or upload_dir.parent == Path('.')
    assert logs_dir.parent.exists() or logs_dir.parent == Path('.')

    # 驗證路徑分隔符正確 (pathlib 會自動處理)
    if platform.system() == 'Windows':
        # Windows 應能處理兩種分隔符
        assert str(data_dir).replace('/', '\\')
    else:
        # Unix-like 使用正斜線
        assert '/' in str(data_dir) or str(data_dir) == '.'

def test_path_joining_cross_platform():
    """驗證路徑拼接在不同平台正確"""
    from app.utils.paths import join_path

    # 使用 pathlib 或自訂函數確保跨平台
    result = join_path('data', 'projects', 'test.mp4')

    # 應使用當前平台的正確分隔符
    expected = str(Path('data') / 'projects' / 'test.mp4')
    assert result == expected
```

**TypeScript 測試:**
```typescript
// tests/unit/paths.test.ts
import path from 'path'
import os from 'os'

test('路徑拼接應跨平台相容', () => {
  // 使用 path.join 確保跨平台
  const projectPath = path.join('data', 'projects', 'test-id')

  if (os.platform() === 'win32') {
    // Windows 使用反斜線
    expect(projectPath).toContain('\\')
  } else {
    // Unix-like 使用正斜線
    expect(projectPath).toContain('/')
  }

  // 驗證路徑正確
  expect(projectPath).toMatch(/data.projects.test-id/)
})

test('環境變數路徑應正確解析', () => {
  // 測試環境變數中的路徑
  const uploadDir = process.env.UPLOAD_DIR || './uploads'
  const resolved = path.resolve(uploadDir)

  // 應為絕對路徑
  expect(path.isAbsolute(resolved)).toBe(true)
})
```

**預期結果:**
- 路徑處理在 Windows/macOS/Linux 都正確
- 使用 pathlib (Python) 或 path (Node.js) 模組處理路徑
- 避免硬編碼路徑分隔符

**驗證點:**
- [ ] Python 使用 pathlib.Path 處理所有路徑
- [ ] TypeScript 使用 path 模組處理路徑
- [ ] Windows 路徑正確處理反斜線
- [ ] Unix-like 路徑正確處理正斜線
- [ ] 路徑拼接不會產生錯誤格式
- [ ] 環境變數路徑正確解析

**優先級:** 低 (如果只部署單一平台可延後)

---

### 整合測試

#### 測試 8: 前後端完整啟動流程

**目的:** 驗證前端可成功呼叫後端 API

**測試步驟:**
1. 啟動 Redis: `docker-compose up -d redis`
2. 啟動後端: `cd backend && uvicorn app.main:app --reload`
3. 啟動前端: `cd frontend && npm run dev`
4. 前端呼叫後端健康檢查: `http://localhost:3000/api/health` (透過 Next.js proxy)

**預期結果:**
- 三個服務都正常啟動
- 前端可成功呼叫後端
- CORS 配置正確

**驗證點:**
- [ ] Redis 在 6379 port 運行
- [ ] 後端在 8000 port 運行
- [ ] 前端在 3000 port 運行
- [ ] 前端可透過 proxy 呼叫後端
- [ ] 無 CORS 錯誤

---

## 實作規格

### 需要建立/修改的檔案

#### 1. 前端專案結構

**目錄結構:**
```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # 根佈局
│   │   ├── page.tsx            # 首頁
│   │   ├── providers.tsx       # React Context Providers
│   │   └── globals.css         # 全域樣式
│   ├── components/
│   │   └── ui/                 # 基礎 UI 元件 (預留)
│   ├── hooks/                  # 自訂 Hooks (預留)
│   ├── store/                  # Zustand stores (預留)
│   ├── services/               # API 服務 (預留)
│   ├── types/                  # TypeScript 型別 (預留)
│   ├── utils/                  # 工具函數 (預留)
│   └── styles/                 # 樣式檔案 (預留)
├── public/
│   └── assets/                 # 靜態資源 (預留)
├── tests/
│   ├── unit/                   # 單元測試 (預留)
│   ├── integration/            # 整合測試 (預留)
│   └── e2e/                    # E2E 測試 (預留)
├── package.json
├── next.config.js
├── tsconfig.json
├── .eslintrc.js
├── .prettierrc
├── .gitignore
└── README.md
```

---

#### 2. 後端專案結構

**目錄結構:**
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI 應用入口
│   ├── api/                    # API 端點 (預留)
│   │   └── __init__.py
│   ├── models/                 # 資料庫模型 (預留)
│   │   └── __init__.py
│   ├── schemas/                # Pydantic schemas (預留)
│   │   └── __init__.py
│   ├── services/               # 業務邏輯 (預留)
│   │   └── __init__.py
│   ├── tasks/                  # Celery 任務 (預留)
│   │   └── __init__.py
│   ├── utils/                  # 工具函數 (預留)
│   │   └── __init__.py
│   ├── security/               # 安全相關 (預留)
│   │   └── __init__.py
│   └── core/                   # 核心配置
│       ├── __init__.py
│       ├── config.py           # 應用配置
│       └── constants.py        # 常數定義
├── tests/
│   ├── unit/                   # 單元測試 (預留)
│   ├── integration/            # 整合測試 (預留)
│   └── conftest.py
├── logs/                       # 日誌目錄
├── data/                       # 資料目錄
│   └── projects/               # 專案檔案 (預留)
├── requirements.txt
├── pyproject.toml
├── .env.example
├── .gitignore
└── README.md
```

---

#### 3. 前端配置檔案

**package.json:**
```json
{
  "name": "ytmaker-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "format": "prettier --write \"src/**/*.{js,jsx,ts,tsx,json,css,md}\""
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "antd": "^5.12.0",
    "zustand": "^4.4.7",
    "@tanstack/react-query": "^5.14.0",
    "axios": "^1.6.2",
    "socket.io-client": "^4.6.0",
    "zod": "^3.22.4",
    "react-konva": "^18.2.10",
    "konva": "^9.2.3",
    "react-player": "^2.13.0",
    "dompurify": "^3.0.6"
  },
  "devDependencies": {
    "@types/node": "^20.10.5",
    "@types/react": "^18.2.45",
    "@types/react-dom": "^18.2.18",
    "@typescript-eslint/eslint-plugin": "^6.15.0",
    "@typescript-eslint/parser": "^6.15.0",
    "eslint": "^8.56.0",
    "eslint-config-next": "^14.0.0",
    "eslint-config-prettier": "^9.1.0",
    "prettier": "^3.1.1",
    "tailwindcss": "^3.3.6",
    "typescript": "^5.3.3"
  }
}
```

---

**next.config.js:**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // API Proxy 設定 (開發環境)
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
    ]
  },

  // 環境變數
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
}

module.exports = nextConfig
```

---

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

**.eslintrc.js:**
```javascript
module.exports = {
  extends: [
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off'
  }
}
```

---

**.prettierrc:**
```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "always"
}
```

---

**tailwind.config.js:**
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  // 與 Ant Design 共存
  corePlugins: {
    preflight: false,
  },
}
```

---

**前端 .gitignore:**
```gitignore
# Dependencies
node_modules/

# Next.js
.next/
out/
.vercel

# Build
build/
dist/

# Environment
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
```

---

#### 4. 後端配置檔案

**requirements.txt:**
```txt
# Web Framework
fastapi==0.108.0
uvicorn[standard]==0.25.0
pydantic==2.5.2
pydantic-settings==2.1.0

# Database
sqlalchemy==2.0.23
alembic==1.13.0

# Task Queue
celery==5.3.4
redis==5.0.1

# API Clients
google-generativeai==0.3.1
google-api-python-client==2.110.0
google-auth-httplib2==0.2.0
google-auth-oauthlib==1.2.0
requests==2.31.0

# Media Processing
ffmpeg-python==0.2.0
Pillow==10.1.0
pydub==0.25.1

# Security
keyring==24.3.0
cryptography==41.0.7

# Utilities
python-dotenv==1.0.0
httpx==0.25.2

# Development
pytest==7.4.3
pytest-asyncio==0.21.1
pytest-cov==4.1.0
ruff==0.1.9
mypy==1.7.1
```

---

**pyproject.toml:**
```toml
[tool.ruff]
line-length = 100
target-version = "py39"

[tool.ruff.lint]
select = ["E", "F", "W", "I", "N", "UP", "B"]
ignore = ["E501"]

[tool.ruff.format]
quote-style = "double"
indent-style = "space"

[tool.mypy]
python_version = "3.9"
strict = true
warn_return_any = true
warn_unused_configs = true
ignore_missing_imports = true

[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = "test_*.py"
python_functions = "test_*"
addopts = "--cov=app --cov-report=html --cov-report=term"
```

---

**app/main.py:**
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="YTMaker API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js 開發伺服器
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    """健康檢查端點"""
    return {"status": "ok"}

@app.get("/api/v1/health")
async def api_health_check():
    """API 健康檢查端點"""
    return {
        "status": "ok",
        "version": "1.0.0",
        "services": {
            "api": "running",
            "redis": "pending",  # Task-002 會實作
            "database": "pending"  # Task-002 會實作
        }
    }
```

---

**app/core/config.py:**
```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """應用配置"""

    # 環境
    ENV: str = "development"
    DEBUG: bool = True

    # API
    API_V1_PREFIX: str = "/api/v1"
    PORT: int = 8000

    # 資料庫
    DATABASE_URL: str = "sqlite:///./data/database.db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True
    )

settings = Settings()
```

---

**app/core/constants.py:**
```python
"""應用常數"""

# 支援的語音性別
VOICE_GENDERS = ["male", "female"]

# 支援的 Gemini 模型
GEMINI_MODELS = ["gemini-1.5-pro", "gemini-1.5-flash"]

# 專案狀態
PROJECT_STATUS = [
    "draft",           # 草稿
    "generating",      # 生成中
    "completed",       # 已完成
    "failed",          # 失敗
    "cancelled",       # 已取消
]

# 影片隱私設定
VIDEO_PRIVACY = ["public", "unlisted", "private"]

# 發布方式
PUBLISH_METHODS = ["immediate", "scheduled"]
```

---

**.env.example:**
```env
# 應用配置
ENV=development
DEBUG=True
PORT=8000

# 資料庫
DATABASE_URL=sqlite:///./data/database.db

# Redis
REDIS_URL=redis://localhost:6379/0

# 外部 API (不儲存明文,使用 Keychain)
# GEMINI_API_KEY=
# STABILITY_AI_API_KEY=
# DID_API_KEY=

# YouTube OAuth (從 Google Cloud Console 取得)
# YOUTUBE_CLIENT_ID=
# YOUTUBE_CLIENT_SECRET=
```

---

**後端 .gitignore:**
```gitignore
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python

# Virtual Environment
venv/
env/
ENV/

# Database
*.db
*.sqlite3
data/

# Logs
logs/
*.log

# Environment
.env
.env.local

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db

# Alembic
alembic/versions/*.pyc

# Coverage
.coverage
htmlcov/
.pytest_cache/
```

---

#### 5. Docker Compose 配置

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: ytmaker-redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
    restart: unless-stopped

volumes:
  redis-data:
```

---

**Docker Compose 使用說明:**
```bash
# 啟動 Redis
docker-compose up -d redis

# 檢查狀態
docker-compose ps

# 查看日誌
docker-compose logs -f redis

# 停止服務
docker-compose down

# 停止並刪除資料
docker-compose down -v
```

---

#### 6. 根目錄 README.md

**README.md:**
```markdown
# YTMaker - AI 驅動的 YouTube 影片生成工具

本地端桌面應用程式,使用 AI 自動生成 YouTube 影片。

## 技術棧

**前端:**
- Next.js 14 + React 18
- TypeScript
- Ant Design + Tailwind CSS
- Zustand (狀態管理)

**後端:**
- FastAPI + Python 3.9+
- SQLAlchemy + SQLite
- Celery + Redis
- FFmpeg

**第三方整合:**
- Google Gemini API (腳本生成)
- Stability AI (圖片生成)
- D-ID (虛擬主播)
- YouTube Data API (影片上傳)

---

## 開發環境需求

### 必要軟體
- **Node.js:** v18.x 或更高
- **Python:** 3.9 或更高
- **Docker:** 最新版本 (用於 Redis)
- **FFmpeg:** 4.4 或更高

### 安裝 FFmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install ffmpeg
```

**Windows:**
下載並安裝: https://ffmpeg.org/download.html

---

## 快速開始

### 1. Clone 專案
```bash
git clone <repository-url>
cd YTMaker
```

### 2. 啟動 Redis
```bash
docker-compose up -d redis
```

### 3. 啟動後端
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 4. 啟動前端
```bash
cd frontend
npm install
npm run dev
```

### 5. 開啟瀏覽器
- 前端: http://localhost:3000
- 後端 API 文件: http://localhost:8000/api/docs

---

## 開發指南

### 程式碼格式化

**前端:**
```bash
cd frontend
npm run lint
npm run format
```

**後端:**
```bash
cd backend
ruff check .
ruff format .
mypy app/
```

### 執行測試

**前端:**
```bash
cd frontend
npm test
```

**後端:**
```bash
cd backend
pytest
```

---

## 專案結構

```
YTMaker/
├── frontend/           # Next.js 前端應用
├── backend/            # FastAPI 後端應用
├── product-design/     # 產品設計文件
├── tech-specs/         # 技術規格文件
├── development/        # 開發計劃與任務
├── docker-compose.yml  # Docker Compose 配置
└── README.md
```

---

## 相關文件

- **產品設計:** [product-design/overview.md](product-design/overview.md)
- **技術框架:** [tech-specs/framework.md](tech-specs/framework.md)
- **開發指南:** [.claude/CLAUDE.md](.claude/CLAUDE.md)
- **Phase 1 計劃:** [development/phase-1/overview.md](development/phase-1/overview.md)

---

## 授權

MIT License
```

---

## 開發指引

### TDD 開發流程

#### 第 1 步: 環境準備 (10 分鐘)

1. 確認已安裝必要軟體:
   ```bash
   node --version  # v18+
   python --version  # 3.9+
   docker --version
   ffmpeg -version  # 4.4+
   ```

2. 確認當前分支:
   ```bash
   git branch --show-current
   # 應該在 feature/task-001-project-setup
   ```

---

#### 第 2 步: 建立前端專案 (30 分鐘)

1. 建立 Next.js 專案:
   ```bash
   npx create-next-app@latest frontend --typescript --tailwind --app --no-src-dir
   cd frontend
   ```

2. 安裝依賴:
   ```bash
   npm install antd zustand @tanstack/react-query axios socket.io-client zod react-konva konva react-player dompurify
   npm install -D @types/dompurify
   ```

3. 建立目錄結構:
   ```bash
   mkdir -p src/{app,components/ui,hooks,store,services,types,utils,styles}
   mkdir -p public/assets
   mkdir -p tests/{unit,integration,e2e}
   ```

4. 複製配置檔案 (參考上方實作規格)

5. 執行測試 1: 前端啟動驗證
   ```bash
   npm run dev
   # 訪問 http://localhost:3000
   ```

---

#### 第 3 步: 建立後端專案 (30 分鐘)

1. 建立目錄結構:
   ```bash
   mkdir -p backend/{app/{api,models,schemas,services,tasks,utils,security,core},tests/{unit,integration},logs,data/projects}
   cd backend
   ```

2. 建立虛擬環境:
   ```bash
   python -m venv venv
   source venv/bin/activate  # macOS/Linux
   # venv\Scripts\activate  # Windows
   ```

3. 安裝依賴:
   ```bash
   pip install -r requirements.txt
   ```

4. 複製配置檔案與程式碼 (參考上方實作規格)

5. 執行測試 2: 後端啟動驗證
   ```bash
   uvicorn app.main:app --reload
   # 訪問 http://localhost:8000/api/docs
   ```

---

#### 第 4 步: Docker Compose 配置 (15 分鐘)

1. 在根目錄建立 `docker-compose.yml` (參考上方實作規格)

2. 執行測試 3: Redis 驗證
   ```bash
   docker-compose up -d redis
   docker-compose ps
   redis-cli ping
   ```

---

#### 第 5 步: 程式碼品質工具 (20 分鐘)

1. 前端: 配置 ESLint 和 Prettier (參考上方實作規格)

2. 後端: 配置 Ruff 和 mypy (參考上方實作規格)

3. 執行測試 4: 程式碼品質工具驗證
   ```bash
   # 前端
   cd frontend
   npm run lint
   npm run format

   # 後端
   cd backend
   ruff check .
   ruff format .
   mypy app/
   ```

---

#### 第 6 步: Git 配置 (10 分鐘)

1. 建立 .gitignore (前後端,參考上方實作規格)

2. 執行測試 5: Git 忽略規則驗證

3. 初始 commit:
   ```bash
   git add .
   git commit -m "feat: 完成專案初始化與開發環境設定 [task-001]"
   git push origin feature/task-001-project-setup
   ```

---

#### 第 7 步: 整合測試 (30 分鐘)

1. 執行測試 6: 前後端完整啟動流程

2. 確認所有服務正常運行:
   - Redis: http://localhost:6379 (redis-cli ping)
   - 後端: http://localhost:8000/health
   - 前端: http://localhost:3000

---

#### 第 8 步: 文件與檢查 (15 分鐘)

1. 撰寫 README.md (參考上方實作規格)

2. 檢查所有配置檔案符合 tech-specs

3. 確認目錄結構完整

---

### 注意事項

#### 跨平台相容性
- ⚠️ Windows 使用者需要使用 `\` 而非 `/` 作為路徑分隔符
- ⚠️ Windows 啟動虛擬環境: `venv\Scripts\activate`
- ⚠️ 確認 FFmpeg 在 PATH 環境變數中

#### 依賴版本
- 💡 使用固定版本而非 `^` 或 `~` 範圍
- 💡 Python 使用 `==` 而非 `>=`
- 💡 定期更新依賴以獲取安全性修補

#### Docker
- ✅ Redis 資料會持久化在 Docker volume 中
- ✅ 使用 `docker-compose down -v` 可清除資料
- ✅ 確認 6379 port 未被其他服務佔用

#### 配置檔案
- ✅ `.env.example` 提供範本,實際使用時複製為 `.env`
- ✅ **絕對不要** commit `.env` 到 Git
- ✅ API Keys 將在 Task-006 實作安全儲存 (Keychain)

---

### 完成檢查清單

#### 目錄結構
- [ ] frontend/ 目錄結構完整
- [ ] backend/ 目錄結構完整
- [ ] 所有必要子目錄已建立

#### 依賴安裝
- [ ] frontend/package.json 包含所有必要依賴
- [ ] frontend/node_modules 安裝成功
- [ ] backend/requirements.txt 包含所有必要依賴
- [ ] backend/venv 建立並啟用
- [ ] 所有 Python 套件安裝成功

#### 配置檔案
- [ ] next.config.js 配置完成 (API proxy)
- [ ] tsconfig.json 配置完成
- [ ] .eslintrc.js 配置完成
- [ ] .prettierrc 配置完成
- [ ] tailwind.config.js 配置完成
- [ ] pyproject.toml 配置完成 (Ruff, mypy)
- [ ] .env.example 提供範本
- [ ] docker-compose.yml 配置完成

#### Git 配置
- [ ] frontend/.gitignore 正確設定
- [ ] backend/.gitignore 正確設定
- [ ] 不必要的檔案未被追蹤

#### 測試驗證
- [ ] 測試 1: 前端開發伺服器啟動 ✅
- [ ] 測試 2: 後端 API 伺服器啟動 ✅
- [ ] 測試 3: Docker Compose Redis 啟動 ✅
- [ ] 測試 4: 程式碼品質工具正常運作 ✅
- [ ] 測試 5: Git 忽略規則正確 ✅
- [ ] 測試 6: 前後端整合正常 ✅

#### 文件
- [ ] README.md 完整撰寫
- [ ] 包含安裝指南
- [ ] 包含開發指南
- [ ] 包含專案結構說明

#### Git Commit
- [ ] 所有變更已 commit
- [ ] Commit 訊息符合規範
- [ ] 已推送到 remote
- [ ] 分支名稱正確 (feature/task-001-project-setup)

---

## 預估時間分配

- 環境準備與確認: 10 分鐘
- 前端專案建立: 30 分鐘
- 後端專案建立: 30 分鐘
- Docker Compose 配置: 15 分鐘
- 程式碼品質工具: 20 分鐘
- Git 配置: 10 分鐘
- 整合測試: 30 分鐘
- 文件撰寫: 15 分鐘
- 檢查與 debug: 30 分鐘 (buffer)

**總計: 約 3.5-4 小時**

---

## 參考資源

### 官方文檔
- **Next.js:** https://nextjs.org/docs
- **FastAPI:** https://fastapi.tiangolo.com/
- **Ant Design:** https://ant.design/
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Docker Compose:** https://docs.docker.com/compose/

### 專案內部文件
- **技術框架:** `tech-specs/framework.md`
- **後端架構:** `tech-specs/backend/overview.md`
- **前端架構:** `tech-specs/frontend/overview.md`
- **開發指南:** `.claude/CLAUDE.md`

---

**準備好了嗎?** 依照上方的 TDD 步驟開始實作這個 task！🚀
