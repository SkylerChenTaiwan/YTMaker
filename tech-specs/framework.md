# 技術框架規格

## 1. 技術棧選擇 (Tech Stack)

### 1.1 前端技術棧

#### 核心框架
- **框架：** Next.js 14 (React 18)
- **理由：**
  - 支援 SSR/SSG，提升首次載入速度
  - 內建路由系統,符合頁面架構需求
  - 豐富的生態系統，適合桌面應用開發
  - 支援 Electron 整合，可打包為桌面應用

#### UI 函式庫
- **元件庫：** Ant Design 5.x
- **理由：**
  - 完整的企業級元件（Table、Form、Modal 等）
  - 內建 Design System，符合產品設計規範
  - 中文友善，支援繁體中文
  - 良好的無障礙支援

#### 狀態管理
- **全局狀態：** Zustand
- **理由：**
  - 輕量、簡單易用
  - 適合中小型應用
  - 無需 Provider 包裹
  - 支援 TypeScript

#### 拖拽與視覺化
- **拖拽庫：** react-dnd
- **理由：**
  - 強大的拖拽功能，適合視覺化配置
  - 支援自訂拖拽邏輯
  - 良好的觸控支援

- **畫布渲染：** Konva.js (react-konva)
- **理由：**
  - 高效能的 Canvas 渲染
  - 適合即時預覽視覺效果
  - 支援影片幀預覽

#### 資料請求
- **HTTP 客戶端：** Axios
- **理由：**
  - 支援請求攔截、錯誤處理
  - 支援取消請求
  - 良好的 TypeScript 支援

- **即時通訊：** Socket.IO Client
- **理由：**
  - 即時接收進度更新
  - 自動重連機制
  - 支援跨平台

#### 開發工具
- **語言：** TypeScript 5.x
- **樣式：** Tailwind CSS + CSS Modules
- **打包：** Webpack (Next.js 內建)
- **桌面打包：** Electron Builder

---

### 1.2 後端技術棧

#### 核心框架
- **框架：** FastAPI (Python 3.9+)
- **理由：**
  - 高效能（基於 Starlette 和 Pydantic）
  - 自動生成 OpenAPI 文件
  - 原生支援 async/await
  - 強大的型別驗證
  - 適合 AI 相關專案（Python 生態系統）

#### Web 伺服器
- **ASGI 伺服器：** Uvicorn
- **理由：**
  - 高效能 ASGI 實作
  - 支援 WebSocket
  - 適合 FastAPI

#### 任務佇列
- **任務佇列：** Celery
- **訊息代理：** Redis
- **理由：**
  - 支援長時間背景任務（影片生成）
  - 支援任務排程、重試、優先級
  - 分散式任務執行
  - 豐富的監控工具（Flower）

#### 資料處理
- **影片處理：** FFmpeg (透過 ffmpeg-python)
- **圖片處理：** Pillow
- **音訊處理：** pydub

#### AI/API 客戶端
- **Google Gemini：** google-generativeai
- **Stability AI：** requests (直接調用 REST API)
- **D-ID：** requests
- **YouTube：** google-api-python-client

---

### 1.3 資料庫選擇

#### 主要資料庫
- **資料庫：** SQLite (本地端)
- **理由：**
  - 無需額外伺服器，適合本地端應用
  - 零配置，易於部署
  - 支援 ACID 事務
  - 輕量、快速
  - 檔案基於單一檔案，易於備份和遷移

- **ORM：** SQLAlchemy 2.x
- **理由：**
  - 成熟的 Python ORM
  - 支援複雜查詢和關聯
  - 支援資料庫遷移（Alembic）

#### 快取
- **快取：** Redis
- **理由：**
  - 高效能鍵值儲存
  - 支援任務佇列（Celery broker）
  - 支援 TTL，適合快取 API 結果
  - 支援發布/訂閱（進度更新）

---

### 1.4 開發工具與測試框架

#### 前端測試
- **單元測試：** Jest + React Testing Library
- **E2E 測試：** Playwright
- **理由：**
  - Jest：成熟的 React 測試框架
  - React Testing Library：符合最佳實踐
  - Playwright：跨瀏覽器、跨平台 E2E 測試

#### 後端測試
- **單元測試：** pytest
- **整合測試：** pytest + httpx
- **理由：**
  - pytest：Python 最流行的測試框架
  - httpx：支援非同步測試
  - 豐富的插件生態系統

#### 程式碼品質
- **Linter（前端）：** ESLint + Prettier
- **Linter（後端）：** Ruff (替代 pylint + black)
- **型別檢查（後端）：** mypy

#### 版本控制
- **版本控制：** Git
- **Git Flow：** 短命分支策略（詳見 CLAUDE.md）

---

### 1.5 部署與 CI/CD 工具

#### 本地端打包
- **前端打包：** Electron Builder
- **理由：**
  - 支援 macOS、Linux、Windows
  - 自動簽名和公證
  - 支援自動更新

- **後端打包：** PyInstaller 或 cx_Freeze
- **理由：**
  - 將 Python 應用打包為可執行檔
  - 支援多平台
  - 無需用戶安裝 Python

#### CI/CD
- **CI/CD 平台：** GitHub Actions
- **理由：**
  - 與 GitHub 深度整合
  - 免費額度充足
  - 支援多平台 Runner（macOS、Linux、Windows）
  - 豐富的 Action 市場

#### 容器化（開發環境）
- **容器化：** Docker + Docker Compose
- **理由：**
  - 統一開發環境
  - 快速啟動 Redis 等服務
  - 易於部署測試環境

---

## 2. 系統架構 (System Architecture)

### 2.1 整體架構設計

**架構模式：** 本地端前後端分離架構（Local Client-Server）

```
┌─────────────────────────────────────────────────────┐
│                    桌面應用程式                      │
│  ┌──────────────────────────────────────────────┐  │
│  │         前端 (Electron + Next.js)            │  │
│  │  ┌────────┐  ┌────────┐  ┌────────┐         │  │
│  │  │ UI 層  │  │狀態管理│  │ Socket │         │  │
│  │  └────────┘  └────────┘  └────────┘         │  │
│  └──────────────────┬───────────────────────────┘  │
│                     │ HTTP/WebSocket               │
│  ┌──────────────────┴───────────────────────────┐  │
│  │         後端 (FastAPI + Celery)              │  │
│  │  ┌────────┐  ┌────────┐  ┌────────┐         │  │
│  │  │ API 層 │  │業務邏輯│  │任務佇列│         │  │
│  │  └────────┘  └────────┘  └────────┘         │  │
│  └──────────────────┬───────────────────────────┘  │
│                     │                               │
│  ┌──────────────────┴───────────────────────────┐  │
│  │              本地資料層                       │  │
│  │  ┌────────┐  ┌────────┐  ┌────────┐         │  │
│  │  │ SQLite │  │ Redis  │  │檔案系統│         │  │
│  │  └────────┘  └────────┘  └────────┘         │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                      │
                      │ HTTPS API Calls
                      ▼
         ┌────────────────────────────┐
         │      外部 API 服務          │
         │  ┌──────────────────────┐  │
         │  │ • Google Gemini API  │  │
         │  │ • Stability AI API   │  │
         │  │ • D-ID API           │  │
         │  │ • YouTube Data API   │  │
         │  └──────────────────────┘  │
         └────────────────────────────┘
```

**理由：**
- **本地端運行：** 保護用戶隱私，無需雲端伺服器
- **前後端分離：** 前端專注 UI，後端專注業務邏輯
- **單用戶模式：** 無需複雜的權限管理
- **離線工作：** 除 API 調用外，所有功能可離線使用

---

### 2.2 前後端分離策略

#### 通訊方式
- **RESTful API：** 一般 CRUD 操作（專案管理、配置管理等）
- **WebSocket：** 即時進度更新（影片生成進度）
- **Server-Sent Events (SSE)：** 單向即時日誌推送（備選方案）

#### 資料格式
- **請求/回應格式：** JSON
- **錯誤格式：** 統一錯誤格式（詳見 API 設計）

#### API 版本管理
- **版本策略：** URL 版本化（`/api/v1/...`）
- **向下相容：** Minor version 必須向下相容

---

### 2.3 API 設計風格

**風格：** RESTful API

**理由：**
- 簡單、易於理解
- 符合前端需求（CRUD 操作為主）
- 不需要 GraphQL 的複雜查詢能力
- 工具鏈成熟（OpenAPI、Swagger UI）

#### 端點命名規範

**資源命名：**
- 使用複數名詞（`/api/v1/projects`）
- 使用小寫和連字號（`/api/v1/prompt-templates`）

**HTTP 方法：**
- `GET`：查詢資源
- `POST`：建立資源
- `PUT`：更新資源（完整更新）
- `PATCH`：更新資源（部分更新）
- `DELETE`：刪除資源

**範例端點：**
```
GET    /api/v1/projects               # 列出所有專案
POST   /api/v1/projects               # 建立新專案
GET    /api/v1/projects/:id           # 取得單一專案
PUT    /api/v1/projects/:id           # 更新專案
DELETE /api/v1/projects/:id           # 刪除專案
POST   /api/v1/projects/:id/generate  # 開始生成影片
GET    /api/v1/projects/:id/progress  # 取得生成進度（WebSocket）
```

---

## 3. 開發環境 (Development Environment)

### 3.1 本地開發環境設定

#### 系統需求
- **作業系統：** macOS 10.15+, Linux (Ubuntu 20.04+), Windows 10/11
- **Node.js：** v18.x 或更高
- **Python：** 3.9 或更高
- **FFmpeg：** 4.4 或更高
- **Docker：** 最新版本（用於 Redis）

---

### 3.2 開發工具與編輯器配置

#### 推薦編輯器
- **VS Code**（推薦）
- **WebStorm**（前端）
- **PyCharm**（後端）

#### VS Code 擴充套件
**前端：**
- ESLint
- Prettier - Code formatter
- Tailwind CSS IntelliSense
- TypeScript Importer

**後端：**
- Python
- Pylance
- Ruff
- autoDocstring

---

### 3.3 程式碼風格與 Linting 規則

#### 前端（JavaScript/TypeScript）

**ESLint 配置（`.eslintrc.js`）**
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

**Prettier 配置（`.prettierrc`）**
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

#### 後端（Python）

**Ruff 配置（`pyproject.toml`）**
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

### 3.4 Git Workflow 與分支策略

**詳細策略請參考：** `CLAUDE.md` 中的 Git 工作流程

**核心原則：**
- `main` 分支：穩定的正式版本（僅接受從 `develop` 的 merge）
- `develop` 分支：開發主線（禁止直接推送）
- 短命分支：每個 task/issue 開一個分支（`feature/task-XXX-*` 或 `fix/issue-XXX-*`）

**Commit 訊息規範：**
```
<type>: <description> [task-XXX 或 issue-XXX]

範例：
feat: 實作用戶認證 API [task-004]
fix: 修正登入驗證錯誤 [issue-006]
test: 新增認證測試案例 [task-005]
docs: 更新 API 規格文件 [task-005]
```

---

## 4. 測試策略 (Testing Strategy)

### 4.1 單元測試

#### 前端單元測試
**框架：** Jest + React Testing Library

**測試範圍：**
- UI 元件渲染
- 使用者互動
- 狀態變更
- 工具函數

#### 後端單元測試
**框架：** pytest

**測試範圍：**
- API 端點
- 業務邏輯函數
- 資料庫操作
- 工具函數

---

### 4.2 整合測試

#### 測試範圍
- 多個元件互動
- API 整合
- 資料庫整合

---

### 4.3 E2E 測試

**框架：** Playwright

**測試範圍：**
- 完整使用者流程
- 跨頁面導航
- 錯誤處理流程

---

### 4.4 測試覆蓋率目標

- **一般程式碼：** > 80%
- **核心業務邏輯：** > 90%

---

## 5. 部署架構 (Deployment Architecture)

### 5.1 環境劃分

#### 開發環境（Development）
- 本地開發與測試
- SQLite（檔案：`dev.db`）
- Docker 本地運行 Redis

#### 測試環境（Staging）
- 整合測試、E2E 測試
- SQLite（檔案：`staging.db`）

#### 生產環境（Production）
- 最終用戶使用
- SQLite（檔案：`production.db`）
- 用戶自行配置 API Keys

---

### 5.2 CI/CD Pipeline

**平台：** GitHub Actions

**主要流程：**
1. 程式碼推送
2. 自動執行測試
3. 測試通過後打包
4. 建立 Release

---

### 5.3 版本管理策略

**語義化版本（Semantic Versioning）**

**版本格式：** `MAJOR.MINOR.PATCH`

**版本號規則：**
- `MAJOR`：不相容的 API 變更
- `MINOR`：向下相容的新功能
- `PATCH`：向下相容的錯誤修復

---

## 6. 安全架構 (Security Architecture)

### 6.1 認證與授權機制

#### API Key 管理
**儲存方式：** 使用作業系統的 Keychain/Credential Manager
- macOS: Keychain
- Linux: Secret Service API
- Windows: Credential Manager

---

### 6.2 資料加密策略

#### 敏感資料
- API Keys
- OAuth Tokens

**加密方式：**
- 作業系統 Keychain 加密儲存
- 不寫入日誌檔案

---

### 6.3 API 安全防護

#### 速率限制
防止過度使用外部 API 配額

#### 請求驗證
- 使用 Pydantic 驗證所有輸入
- 檢查檔案大小、類型
- 檢查文字長度、字元編碼

---

## 7. 效能與擴展性 (Performance & Scalability)

### 7.1 快取策略

#### Redis 快取
**快取內容：**
- API 回應
- 模板資料
- 統計資料

---

### 7.2 資料庫優化策略

#### 索引設計
- 頻繁查詢的欄位建立索引
- 外鍵欄位建立索引

#### 查詢優化
- 使用 Eager Loading 避免 N+1 查詢
- 分頁查詢

---

## 8. 專案結構 (Project Structure)

### 8.1 前端專案目錄結構

```
frontend/
├── public/
├── src/
│   ├── app/
│   ├── components/
│   ├── hooks/
│   ├── store/
│   ├── services/
│   ├── types/
│   ├── utils/
│   └── styles/
├── tests/
└── package.json
```

---

### 8.2 後端專案目錄結構

```
backend/
├── app/
│   ├── api/
│   ├── models/
│   ├── schemas/
│   ├── services/
│   ├── tasks/
│   ├── utils/
│   └── security/
├── tests/
├── logs/
└── requirements.txt
```

---

## 總結

### 核心技術棧

**前端：**
- Next.js 14 + React 18 + TypeScript
- Ant Design + Tailwind CSS
- Electron

**後端：**
- FastAPI + Python 3.9+
- SQLAlchemy + SQLite
- Celery + Redis

**外部服務：**
- Google Gemini API
- Stability AI API
- D-ID API
- YouTube Data API

### 架構決策

**本地端前後端分離架構：**
- 前端：Electron 包裝的 Next.js 應用
- 後端：FastAPI 伺服器
- 資料庫：SQLite
- 任務佇列：Celery + Redis

---

## 需要回到產品設計階段釐清的問題

**無。**

所有技術選擇都基於產品需求明確定義，技術框架設計完整且可執行。
