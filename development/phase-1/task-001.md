# Task-001: 專案初始化與環境設定

> **建立日期：** 2025-01-19
> **狀態：** ⏳ 未開始
> **預計時間：** 4 小時
> **優先級：** P0

---

## 關聯文件

### 技術規格
- **技術框架:** `tech-specs/framework.md` (完整文件)
- **後端架構:** `tech-specs/backend/overview.md`
- **前端架構:** `tech-specs/frontend/overview.md`

### 相關任務
- **前置任務:** 無
- **後續任務:** Task-002 (資料庫設計), Task-003 (API 基礎架構)
- **並行任務:** 無（必須先完成）

---

## 任務目標

### 簡述
建立完整的前後端專案結構，安裝所有依賴，配置開發環境，使開發環境可運行。

### 詳細說明
這是整個 Phase 1 的第一個任務，負責建立專案的基礎架構。包括：
- 建立前端 (Next.js 14) 和後端 (FastAPI) 專案結構
- 安裝所有必要的依賴套件
- 配置開發工具（linter、formatter、TypeScript）
- 設定 Docker Compose（用於 Redis）
- 配置環境變數範本
- 確保開發環境可以正常啟動

### 成功標準
- [ ] 前端可以正常啟動 (`npm run dev`)
- [ ] 後端可以正常啟動 (`uvicorn main:app`)
- [ ] Redis 可以透過 Docker 啟動
- [ ] Linter 和 formatter 可以正常運作
- [ ] 所有配置檔案已建立

---

## 測試要求

### 測試環境設定

**前置條件：**
- Node.js v18+ 已安裝
- Python 3.9+ 已安裝
- Docker 已安裝

**驗證步驟：**
1. 啟動前端：`cd frontend && npm run dev`
2. 啟動後端：`cd backend && uvicorn app.main:app --reload`
3. 啟動 Redis：`docker-compose up redis`
4. 執行 linter：`npm run lint` (前端), `ruff check .` (後端)

---

### 單元測試

#### 測試 1：前端專案可以建構

**驗證：**
```bash
cd frontend
npm run build
```

**預期輸出：**
- Build 成功
- 無 TypeScript 錯誤
- 無 ESLint 錯誤

---

#### 測試 2：後端專案可以啟動

**驗證：**
```bash
cd backend
uvicorn app.main:app --reload
```

**預期輸出：**
- 伺服器啟動在 http://localhost:8000
- 可以訪問 http://localhost:8000/docs (FastAPI 自動文件)
- 無 Python 錯誤

---

#### 測試 3：環境變數正確設定

**驗證：**
- `.env.example` 檔案存在
- 包含所有必要的環境變數
- 文件說明清楚

---

## 實作規格

### 需要建立的檔案與目錄

#### 專案根目錄

```
YTMaker/
├── frontend/                  # Next.js 前端
├── backend/                   # FastAPI 後端
├── docker-compose.yml         # Docker 配置
├── .gitignore                 # Git 忽略檔案
└── README.md                  # 專案說明
```

---

### 前端專案結構

**建立步驟：**
```bash
# 建立 Next.js 專案
npx create-next-app@latest frontend --typescript --tailwind --app

# 進入前端目錄
cd frontend

# 安裝額外依賴
npm install \
  antd@^5.11.0 \
  zustand@^4.4.0 \
  axios@^1.6.0 \
  socket.io-client@^4.6.0 \
  react-hook-form@^7.48.0 \
  zod@^3.22.0 \
  @hookform/resolvers@^3.3.0 \
  react-dnd@^16.0.1 \
  react-konva@^18.2.10 \
  konva@^9.2.0

# 安裝開發依賴
npm install -D \
  @types/node@^20.10.0 \
  @playwright/test@^1.40.0 \
  eslint@^8.54.0 \
  prettier@^3.1.0
```

**目錄結構：**
```
frontend/
├── public/
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/            # React 元件
│   ├── hooks/                 # 自訂 Hooks
│   ├── stores/                # Zustand Stores
│   ├── services/              # API 服務
│   ├── types/                 # TypeScript 類型
│   ├── utils/                 # 工具函數
│   └── styles/                # 全域樣式
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── next.config.js
├── .eslintrc.js
└── .prettierrc
```

**配置檔案：**

**1. `next.config.js`**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',  // 靜態導出 (用於 Electron)
  images: {
    unoptimized: true  // Electron 不支援 Next.js Image 優化
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' }
        ]
      }
    ]
  }
}

module.exports = nextConfig
```

**2. `tailwind.config.js`**
```javascript
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1E88E5',
        'text-primary': '#37352f',
        'text-secondary': '#787774',
        border: '#e9e9e7'
      }
    }
  },
  plugins: []
}
```

**3. `.eslintrc.js`**
```javascript
module.exports = {
  extends: [
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-module-boundary-types': 'off'
  }
}
```

**4. `.prettierrc`**
```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

**5. `.env.example`**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

---

### 後端專案結構

**建立步驟：**
```bash
# 建立後端目錄
mkdir backend
cd backend

# 建立虛擬環境
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或 venv\Scripts\activate  # Windows

# 建立目錄結構
mkdir -p app/{api/v1,models,schemas,services,tasks,utils,security,integrations}
mkdir -p tests/{unit,integration}
mkdir -p logs
mkdir -p data
```

**安裝依賴：**

**`requirements.txt`**
```
# Web Framework
fastapi==0.104.1
uvicorn[standard]==0.24.0
python-multipart==0.0.6

# Database
sqlalchemy==2.0.23
alembic==1.12.1

# Task Queue
celery==5.3.4
redis==5.0.1

# API Clients
google-generativeai==0.3.1
requests==2.31.0
google-api-python-client==2.108.0
google-auth-oauthlib==1.1.0

# Utilities
python-dotenv==1.0.0
pydantic==2.5.0
pydantic-settings==2.1.0

# Image/Video Processing
Pillow==10.1.0
ffmpeg-python==0.2.0

# Development
pytest==7.4.3
pytest-asyncio==0.21.1
httpx==0.25.1
ruff==0.1.6
mypy==1.7.1
```

**安裝：**
```bash
pip install -r requirements.txt
```

**目錄結構：**
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                # FastAPI 應用入口
│   ├── config.py              # 配置管理
│   ├── database.py            # 資料庫連線
│   ├── api/
│   │   ├── __init__.py
│   │   ├── deps.py            # 依賴注入
│   │   └── v1/
│   │       ├── __init__.py
│   │       └── endpoints/     # API 端點
│   ├── models/                # SQLAlchemy 模型
│   ├── schemas/               # Pydantic schemas
│   ├── services/              # 業務邏輯
│   ├── tasks/                 # Celery 任務
│   ├── integrations/          # 第三方 API
│   ├── utils/                 # 工具函數
│   └── security/              # 安全相關
├── tests/
│   ├── unit/
│   └── integration/
├── logs/
├── data/                      # SQLite 資料庫
├── requirements.txt
├── pyproject.toml             # Ruff 配置
├── .env.example
└── alembic.ini
```

**配置檔案：**

**1. `app/main.py`**
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="YTMaker API",
    version="1.0.0",
    description="YouTube 影片自動化生產系統 API"
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "YTMaker API is running"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
```

**2. `app/config.py`**
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # 應用設定
    APP_NAME: str = "YTMaker"
    DEBUG: bool = True

    # 資料庫
    DATABASE_URL: str = "sqlite:///./data/dev.db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # API Keys (將從環境變數讀取)
    GEMINI_API_KEY: str = ""
    STABILITY_AI_API_KEY: str = ""
    DID_API_KEY: str = ""

    class Config:
        env_file = ".env"

settings = Settings()
```

**3. `.env.example`**
```env
# Application
APP_NAME=YTMaker
DEBUG=True

# Database
DATABASE_URL=sqlite:///./data/dev.db

# Redis
REDIS_URL=redis://localhost:6379/0

# API Keys
GEMINI_API_KEY=your_gemini_api_key_here
STABILITY_AI_API_KEY=your_stability_api_key_here
DID_API_KEY=your_did_api_key_here

# YouTube
# (將在 Task-009 設定)
```

**4. `pyproject.toml`** (Ruff 配置)
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
```

---

### Docker Compose 配置

**`docker-compose.yml`**
```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

volumes:
  redis_data:
```

---

### Git 配置

**`.gitignore`**
```
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
env/
.env

# Node
node_modules/
.next/
out/
build/
dist/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Database
*.db
*.sqlite
*.sqlite3

# Logs
logs/
*.log

# Data
data/

# Docker
.docker/
```

---

## 開發指引

### 開發步驟

**1. 建立專案結構**
```bash
# 在專案根目錄
mkdir frontend backend

# 建立前端專案
cd frontend
npx create-next-app@latest . --typescript --tailwind --app

# 安裝前端依賴
npm install antd zustand axios socket.io-client react-hook-form zod @hookform/resolvers react-dnd react-konva konva

# 返回根目錄
cd ..

# 建立後端結構
cd backend
python -m venv venv
source venv/bin/activate
mkdir -p app/{api/v1,models,schemas,services,tasks,utils,security,integrations}
mkdir -p tests/{unit,integration}
mkdir -p logs data

# 建立 requirements.txt 並安裝
pip install -r requirements.txt
```

**2. 配置檔案**
- 建立所有上述配置檔案
- 複製 `.env.example` 為 `.env`
- 設定必要的環境變數

**3. 測試環境**
```bash
# 啟動 Redis
docker-compose up -d redis

# 啟動後端
cd backend
source venv/bin/activate
uvicorn app.main:app --reload

# 啟動前端 (另開終端)
cd frontend
npm run dev
```

**4. 驗證**
- 訪問 http://localhost:3000 (前端)
- 訪問 http://localhost:8000/docs (後端 API 文件)
- 檢查 Redis: `docker ps` 應該看到 redis 容器運行

---

### 注意事項

**環境設定：**
- [ ] 確保 Node.js 版本 >= 18
- [ ] 確保 Python 版本 >= 3.9
- [ ] 確保 Docker 已安裝並運行
- [ ] 確保所有必要的環境變數已設定

**路徑配置：**
- [ ] 前端的 API URL 指向正確的後端位址
- [ ] 資料庫檔案路徑正確
- [ ] 日誌目錄已建立

**依賴管理：**
- [ ] 所有套件版本已固定
- [ ] package-lock.json / requirements.txt 已提交
- [ ] 無安全性警告

---

## 完成檢查清單

### 開發完成
- [ ] 前端專案結構完整
- [ ] 後端專案結構完整
- [ ] 所有配置檔案已建立
- [ ] Docker Compose 配置完成

### 測試完成
- [ ] 前端可以啟動 (npm run dev)
- [ ] 後端可以啟動 (uvicorn)
- [ ] Redis 可以啟動 (docker-compose)
- [ ] 前端可以建構 (npm run build)
- [ ] Linter 執行無錯誤

### 文件同步
- [ ] README.md 已建立並說明如何啟動
- [ ] .env.example 包含所有必要變數
- [ ] 環境變數已記錄

### Git
- [ ] .gitignore 已設定
- [ ] 初始 commit 已建立
- [ ] 在 feature/task-001-project-setup 分支

---

## 驗證腳本

**`scripts/verify-setup.sh`** (可選)
```bash
#!/bin/bash

echo "驗證專案設定..."

# 檢查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安裝"
    exit 1
fi
echo "✅ Node.js 版本: $(node --version)"

# 檢查 Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 未安裝"
    exit 1
fi
echo "✅ Python 版本: $(python3 --version)"

# 檢查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安裝"
    exit 1
fi
echo "✅ Docker 版本: $(docker --version)"

# 檢查前端依賴
cd frontend
if [ ! -d "node_modules" ]; then
    echo "❌ 前端依賴未安裝"
    exit 1
fi
echo "✅ 前端依賴已安裝"

# 檢查後端虛擬環境
cd ../backend
if [ ! -d "venv" ]; then
    echo "❌ Python 虛擬環境未建立"
    exit 1
fi
echo "✅ Python 虛擬環境已建立"

echo ""
echo "🎉 專案設定驗證完成！"
```

---

## 時間分配建議

- **前端專案設定：** 1 小時
- **後端專案設定：** 1 小時
- **Docker 與環境配置：** 0.5 小時
- **測試與驗證：** 1 小時
- **文件撰寫：** 0.5 小時

**總計：** 4 小時
