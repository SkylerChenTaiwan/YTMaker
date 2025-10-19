# Phase 1: YTMaker 完整系統開發

> **目標：** 實現 YTMaker YouTube 影片自動化生產系統的完整功能
> **基於規格：** 所有 tech-specs (backend + frontend) 和 product-design 文件
> **預估時間：** 280-350 小時 (序列執行) | 110-140 小時 (並行執行，4 實例)

---

## 階段目標

### 核心目標
實現一個完整的本地端桌面應用程式，能夠：
- ✅ 從文字內容自動生成 YouTube 影片
- ✅ 支援完整的視覺化配置界面（拖拽定位、即時預覽）
- ✅ 整合 Gemini、Stability AI、D-ID、YouTube API
- ✅ 提供批次處理、斷點續傳、錯誤恢復
- ✅ 支援 Prompt 範本管理和多模型選擇

### 技術實現目標
- **後端：** FastAPI + Python，完整實現 6 個 API 模塊、4 個第三方整合
- **前端：** Next.js 14 + React，完整實現 12 個頁面
- **資料庫：** SQLite，10 個資料模型
- **背景任務：** Celery + Redis，完整任務鏈
- **測試：** 單元測試覆蓋率 > 80%，完整 E2E 測試

---

## 任務總覽

**總任務數：** 30 個

### 分類統計
- **基礎設施：** 3 個任務 (Task-001 ~ 003)
- **後端 API：** 6 個任務 (Task-004 ~ 009)
- **第三方整合：** 4 個任務 (Task-010 ~ 013)
- **後端服務：** 3 個任務 (Task-014 ~ 016)
- **前端基礎：** 3 個任務 (Task-017 ~ 019)
- **前端頁面：** 7 個任務 (Task-020 ~ 026)
- **進階功能：** 2 個任務 (Task-027 ~ 028)
- **整合部署：** 2 個任務 (Task-029 ~ 030)

### 優先級分類
- **P0 (必須)：** 24 個任務
- **P1 (重要)：** 6 個任務

---

## 完整任務列表

### === 階段 1: 基礎設施 (Foundation) ===

#### Task-001: 專案初始化與開發環境設定
- **預估時間：** 4 小時
- **優先級：** P0
- **職責：** 建立前後端專案結構、安裝依賴、配置開發環境、Docker Compose
- **產出：**
  - 完整的目錄結構（frontend/, backend/）
  - package.json, requirements.txt
  - Docker Compose 配置（Redis）
  - 開發環境可運行（npm run dev, uvicorn）
  - ESLint, Prettier, Ruff 配置

#### Task-002: 資料庫 Schema 設計與實作
- **預估時間：** 8 小時
- **優先級：** P0
- **職責：** 實作所有 10 個資料模型、索引、關聯、遷移腳本、測試資料
- **產出：**
  - 10 個 SQLAlchemy 模型（Project, Asset, Configuration, etc.）
  - Alembic 遷移腳本
  - 資料庫初始化腳本
  - 測試資料 seeder
  - 模型單元測試

#### Task-003: API 基礎架構與錯誤處理
- **預估時間：** 5 小時
- **優先級：** P0
- **職責：** FastAPI 基礎設定、全局錯誤處理、CORS、中間件、健康檢查
- **產出：**
  - FastAPI app 初始化與配置
  - 統一錯誤處理機制（ErrorResponse schema）
  - 請求/回應日誌中間件
  - CORS 配置
  - 健康檢查端點 (GET /health, GET /api/v1/health)

---

### === 階段 2: 後端核心 API ===

#### Task-004: Projects API 實作 (12 個端點)
- **預估時間：** 12 小時
- **優先級：** P0
- **職責：** 實作專案 CRUD、進度查詢、素材管理、恢復、取消等所有端點
- **產出：**
  - 12 個 API 端點（詳見 api-projects.md）
  - ProjectService 業務邏輯
  - Pydantic schemas (ProjectCreate, ProjectUpdate, ProjectResponse)
  - 單元測試（覆蓋率 > 85%）

#### Task-005: Configurations API 實作 (6 個端點)
- **預估時間：** 6 小時
- **優先級：** P0
- **職責：** 視覺配置、Prompt 範本、視覺模板的 CRUD API
- **產出：**
  - 6 個 API 端點（GET/POST/PUT/DELETE）
  - ConfigurationService
  - 配置驗證邏輯（YAML schema 驗證）
  - 單元測試

#### Task-006: System API 實作 (4 個端點)
- **預估時間：** 5 小時
- **優先級：** P0
- **職責：** API Keys 管理、系統設定、配額查詢、健康檢查
- **產出：**
  - 4 個 API 端點（詳見 api-system.md）
  - Keychain 整合（macOS/Linux/Windows）
  - SystemService
  - 配額監控邏輯
  - 單元測試

#### Task-007: YouTube API 實作 (4 個端點)
- **預估時間：** 6 小時
- **優先級：** P0
- **職責：** YouTube OAuth 授權、頻道管理、metadata 設定
- **產出：**
  - 4 個 API 端點（詳見 api-youtube.md）
  - OAuth callback 處理
  - YouTubeAuthService
  - 單元測試

#### Task-008: Stats API 實作 (2 個端點)
- **預估時間：** 3 小時
- **優先級：** P1
- **職責：** 統計資訊查詢（Dashboard 用）
- **產出：**
  - 2 個 API 端點（詳見 api-stats.md）
  - StatsService
  - Redis 快取整合
  - 單元測試

#### Task-009: Batch API 實作 (5 個端點)
- **預估時間：** 6 小時
- **優先級：** P1
- **職責：** 批次任務管理、進度查詢、暫停/恢復
- **產出：**
  - 5 個 API 端點（詳見 api-batch.md）
  - BatchService
  - 批次任務佇列邏輯
  - 單元測試

---

### === 階段 3: 第三方服務整合 ===

#### Task-010: Gemini API 整合（腳本生成）
- **預估時間：** 10 小時
- **優先級：** P0
- **職責：** 整合 Google Gemini API，實作腳本生成、Prompt 模板系統
- **產出：**
  - GeminiClient 類別（支援 gemini-1.5-pro 和 flash）
  - ScriptGenerationService
  - Prompt 模板引擎（變數替換、段落時長要求）
  - 錯誤處理與重試（指數退避）
  - 腳本驗證邏輯（段落時長檢查）
  - 單元測試與 Mock

#### Task-011: Stability AI 整合（圖片生成）
- **預估時間：** 12 小時
- **優先級：** P0
- **職責：** 整合 Stability AI SDXL，實作批次圖片生成、風格一致性控制
- **產出：**
  - StabilityAIClient 類別
  - ImageGenerationService
  - 並行處理邏輯（4-6 個並行請求）
  - Prompt Engineering（全局風格修飾詞）
  - 品質驗證（解析度、檔案大小）
  - Rate limiting 與重試
  - 單元測試與 Mock

#### Task-012: D-ID API 整合（虛擬主播）
- **預估時間：** 8 小時
- **優先級：** P0
- **職責：** 整合 D-ID API，生成虛擬主播影片（開場、結尾）
- **產出：**
  - DIDClient 類別
  - AvatarGenerationService
  - 嘴型同步驗證
  - 時長驗證（誤差 < 5%）
  - 配額監控（90 分鐘/月）
  - 錯誤處理與 fallback（跳過虛擬主播）
  - 單元測試與 Mock

#### Task-013: YouTube Data API 整合（上傳）
- **預估時間：** 10 小時
- **優先級：** P0
- **職責：** 整合 YouTube Data API，實作影片上傳、排程發布、metadata 設定
- **產出：**
  - YouTubeClient 類別
  - VideoUploadService
  - OAuth 2.0 授權流程（處理 refresh token）
  - 影片上傳邏輯（支援斷點續傳）
  - Metadata 設定（標題、描述、標籤、隱私、排程）
  - AI 內容標註
  - 配額監控（10,000 units/日）
  - 錯誤處理與重試
  - 單元測試與 Mock

---

### === 階段 4: 後端核心服務 ===

#### Task-014: Celery 背景任務系統
- **預估時間：** 14 小時
- **優先級：** P0
- **職責：** 實作 6 個 Celery 任務、任務鏈、進度管理、錯誤處理
- **產出：**
  - 6 個 Celery 任務：
    1. generate_script_task
    2. generate_assets_task（語音、圖片、虛擬主播）
    3. render_video_task
    4. generate_thumbnail_task
    5. upload_to_youtube_task
    6. batch_processing_task
  - 任務鏈定義（Task-001 → 002 → 003 → 004 → 005）
  - 進度更新機制（Redis Pub/Sub）
  - 錯誤處理與自動重試
  - 任務狀態持久化（project_state.json）
  - Celery Beat 排程（批次任務）
  - 單元測試

#### Task-015: 影片渲染服務（FFmpeg）
- **預估時間：** 16 小時
- **優先級：** P0
- **職責：** 使用 FFmpeg 實作影片合成、字幕燒錄、Ken Burns 效果、封面生成
- **產出：**
  - VideoRenderService 類別
  - FFmpeg 指令生成器
  - 字幕渲染（支援自訂樣式、位置、邊框、陰影）
  - Ken Burns 效果（zoom_in, zoom_out, pan_left, pan_right）
  - 疊加元素渲染（文字、Logo、形狀）
  - 虛擬主播片段整合（開場、結尾）
  - 封面生成服務（基於第一張圖片）
  - 音訊同步驗證
  - 跨平台相容性處理
  - 單元測試與整合測試

#### Task-016: WebSocket 即時進度推送
- **預估時間：** 6 小時
- **優先級：** P0
- **職責：** 實作 WebSocket 端點，即時推送生成進度、日誌、錯誤
- **產出：**
  - WebSocket 端點（ws://api/v1/projects/:id/progress）
  - Redis Pub/Sub 整合（進度廣播）
  - 連線管理（自動重連、心跳檢測）
  - 進度訊息格式定義
  - 日誌推送邏輯
  - 錯誤推送邏輯
  - 單元測試與整合測試

---

### === 階段 5: 前端基礎 ===

#### Task-017: 前端專案初始化與路由系統
- **預估時間：** 6 小時
- **優先級：** P0
- **職責：** Next.js 14 專案設定、12 個路由、導航守衛、麵包屑、中間件
- **產出：**
  - Next.js App Router 結構
  - 12 個路由定義（/setup, /dashboard, /project/*, etc.）
  - 導航守衛（首次設定檢查）
  - 麵包屑元件
  - Layout 元件（導航列、Footer）
  - 404 頁面
  - Loading 元件
  - Tailwind CSS + Ant Design 整合

#### Task-018: Zustand Stores 與狀態管理
- **預估時間：** 8 小時
- **優先級：** P0
- **職責：** 實作 4 個 Zustand stores、狀態持久化、同步邏輯
- **產出：**
  - useProjectStore（專案列表、當前專案、篩選、排序）
  - useConfigStore（視覺配置、Prompt 範本、模板）
  - useProgressStore（生成進度、日誌、錯誤）
  - useAuthStore（API Keys、YouTube 授權）
  - 狀態持久化（localStorage）
  - 狀態同步邏輯（API 與 local 同步）
  - 單元測試

#### Task-019: Axios 客戶端與 API 整合層
- **預估時間：** 6 小時
- **優先級：** P0
- **職責：** Axios 配置、統一錯誤處理、自動重試、請求快取、API 服務層
- **產出：**
  - Axios 實例配置（baseURL, timeout, headers）
  - 請求攔截器（添加 token, 日誌）
  - 回應攔截器（錯誤處理、自動重試）
  - API 服務層：
    - projectsApi（12 個方法）
    - configurationsApi（6 個方法）
    - systemApi（4 個方法）
    - youtubeApi（4 個方法）
    - statsApi（2 個方法）
    - batchApi（5 個方法）
  - 請求快取（React Query 或自訂）
  - 單元測試

---

### === 階段 6: 前端核心頁面 ===

#### Task-020: 首次啟動設定精靈頁面 (/setup)
- **預估時間：** 10 小時
- **優先級：** P0
- **職責：** Flow-0 首次啟動流程、API Keys 設定、YouTube 授權、步驟導航
- **產出：**
  - Setup Wizard 頁面（5 個步驟）
  - Step 0: 歡迎頁
  - Step 1-3: API Keys 設定（Gemini, Stability AI, D-ID）
  - Step 4: YouTube 授權（OAuth 流程）
  - Step 5: 完成頁
  - 步驟指示器元件
  - API Key 輸入與驗證元件
  - 連線測試功能
  - YouTube OAuth callback 處理
  - 響應式設計
  - 單元測試

#### Task-021: 主控台頁面 (/dashboard)
- **預估時間：** 12 小時
- **優先級：** P0
- **職責：** Flow-1 步驟 1、專案列表、篩選排序、統計資訊、快速操作
- **產出：**
  - Dashboard 頁面
  - 統計卡片區（4 個卡片）
  - 快速操作區（新增專案、使用模板、批次處理、恢復專案）
  - 專案列表（表格/卡片顯示）
  - 篩選與排序邏輯（狀態、日期範圍）
  - 分頁功能
  - 專案操作（查看、繼續、刪除）
  - 空狀態處理
  - 響應式設計
  - 單元測試

#### Task-022: 新增專案流程（步驟 1-2：內容與視覺配置）
- **預估時間：** 20 小時
- **優先級：** P0
- **職責：** Flow-1 步驟 1-2、文字上傳、視覺化配置界面（拖拽、即時預覽）
- **產出：**
  - Page-3: 新增專案頁（/project/new）
    - 專案名稱輸入
    - 文字內容上傳/貼上
    - 字數統計與驗證（500-10000 字）
  - Page-4: 視覺化配置頁（/project/:id/configure/visual）
    - 左側預覽區（Konva.js 畫布）
    - 右側配置面板
    - 全局配置 Tab（字幕、Logo、疊加元素）
    - 段落級配置 Tab
    - 拖拽定位功能（react-dnd）
    - 即時預覽（配置變更 < 100ms 更新）
    - 模板載入/儲存
  - 共用元件：
    - 步驟指示器
    - 字幕配置面板
    - Logo 上傳與定位
    - 疊加元素編輯器
  - 響應式設計
  - 單元測試與整合測試

#### Task-023: 新增專案流程（步驟 3-4：Prompt 與 YouTube 設定）
- **預估時間：** 10 小時
- **優先級：** P0
- **職責：** Flow-1 步驟 3-4、Prompt 範本選擇、Gemini 模型選擇、YouTube 設定
- **產出：**
  - Page-5: Prompt 與模型設定頁（/project/:id/configure/prompt-model）
    - Prompt 範本選擇器
    - Prompt 編輯器（字數統計）
    - 範本管理（新增、編輯、刪除）
    - Gemini 模型選擇（pro vs flash）
    - 模型對比表格
  - Page-6: YouTube 設定頁（/project/:id/configure/youtube）
    - YouTube 帳號顯示
    - 影片資訊表單（標題、描述、標籤）
    - 隱私設定
    - 發布方式（立即/排程）
    - 排程日期時間選擇器
    - AI 內容標註勾選
  - 標籤輸入元件
  - 響應式設計
  - 單元測試

#### Task-024: 進度監控頁面 (/project/:id/progress)
- **預估時間：** 12 小時
- **優先級：** P0
- **職責：** Flow-1 步驟 4-10、WebSocket 即時進度、階段顯示、日誌查看、控制
- **產出：**
  - Progress Monitor 頁面
  - 總進度條（0-100%）
  - 階段進度區（5 個階段：腳本、素材、渲染、封面、上傳）
  - 子任務進度顯示（圖片生成 15/15）
  - WebSocket 連線邏輯（自動重連）
  - 即時日誌顯示區（可摺疊、自動捲動）
  - 控制按鈕（暫停、取消、重試）
  - 錯誤處理與顯示
  - 完成/失敗狀態處理
  - 響應式設計
  - 單元測試與整合測試

#### Task-025: 結果頁面 (/project/:id/result)
- **預估時間：** 6 小時
- **優先級：** P0
- **職責：** Flow-1 步驟 10、影片預覽、YouTube 連結、下載功能
- **產出：**
  - Result 頁面
  - 成功訊息與 YouTube 連結
  - 影片預覽（YouTube 嵌入或本地播放器）
  - 影片資訊顯示（標題、描述、標籤、發布時間）
  - 下載區（影片、封面、所有素材）
  - 操作按鈕（編輯 YouTube 資訊、生成新影片、返回主控台）
  - 響應式設計
  - 單元測試

#### Task-026: 系統設定頁面 (/settings)
- **預估時間：** 10 小時
- **優先級：** P0
- **職責：** Flow-9、API Keys 管理、YouTube 授權、配額顯示、偏好設定
- **產出：**
  - Settings 頁面（3 個 Tab）
  - Tab 1: API 金鑰
    - API Keys 列表（狀態、最後測試時間）
    - 編輯 API Key Modal
    - 測試連線功能
    - API 配額顯示（D-ID, YouTube）
  - Tab 2: YouTube 授權
    - 已連結帳號列表（頻道名稱、頭像、訂閱數）
    - 連結新帳號按鈕
    - 重新授權功能
    - 移除授權功能
  - Tab 3: 偏好設定
    - 一般設定（語音性別、語速、隱私設定）
    - 檔案管理（保留時間、中間素材）
    - 通知設定
    - 資料管理（清除快取、匯出/匯入）
    - 危險區域（重置設定、清除資料）
  - Modal 元件（編輯 API Key、確認刪除）
  - 響應式設計
  - 單元測試

---

### === 階段 7: 進階功能 ===

#### Task-027: 配置與模板管理頁面 (/configurations, /templates)
- **預估時間：** 10 小時
- **優先級：** P1
- **職責：** Flow-3, Flow-8、配置模板、Prompt 範本管理
- **產出：**
  - Page-9: 配置管理頁（/configurations）
    - 配置列表（表格顯示）
    - 配置操作（預覽、編輯、複製、刪除）
  - Page-10: 模板管理頁（/templates）
    - Tab 1: 視覺配置模板（卡片顯示）
    - Tab 2: Prompt 範本（列表顯示）
    - 模板操作（使用、查看、編輯、複製、刪除）
  - 預覽 Modal
  - Prompt 編輯 Modal
  - 響應式設計
  - 單元測試

#### Task-028: 批次處理頁面 (/batch)
- **預估時間：** 10 小時
- **優先級：** P1
- **職責：** Flow-5, Flow-6、批次任務管理、進度查詢、斷點續傳
- **產出：**
  - Page-12: 批次處理頁（/batch）
    - 批次任務列表
    - 新增批次任務 Modal（多檔案上傳、模板選擇）
    - 批次任務詳細頁（/batch/:id）
    - 專案列表（狀態、進度、錯誤）
    - 控制按鈕（暫停、繼續、重試失敗任務）
    - 批次報告下載（CSV）
  - 斷點續傳邏輯（Resume 功能）
  - 響應式設計
  - 單元測試

---

### === 階段 8: 整合測試與部署 ===

#### Task-029: 端到端整合測試
- **預估時間：** 16 小時
- **優先級：** P0
- **職責：** Flow-1 完整流程測試、錯誤處理測試、斷點續傳測試
- **產出：**
  - E2E 測試腳本（Playwright）
    - Flow-0: 首次啟動設定
    - Flow-1: 基本影片生成（完整流程）
    - Flow-2: 使用模板快速生成
    - Flow-3: 視覺化配置
    - Flow-4: 排程發布
    - Flow-5: 批次處理
    - Flow-6: 斷點續傳
    - 錯誤處理場景（API 失敗、網路斷線、配額不足）
  - API 整合測試（pytest + httpx）
  - 效能測試（端到端生成時間 < 25 分鐘）
  - 測試報告生成

#### Task-030: Electron 打包與部署
- **預估時間：** 12 小時
- **優先級：** P1
- **職責：** Electron 整合、多平台打包、安裝程式、自動更新
- **產出：**
  - Electron 主程序（main.js）
  - Electron Builder 配置
  - 後端服務自動啟動（Python 子程序）
  - Redis 自動啟動（bundled 或提示安裝）
  - macOS 打包（.dmg）
  - Linux 打包（.AppImage, .deb）
  - Windows 打包（.exe）
  - 應用簽名與公證（macOS）
  - 自動更新機制（electron-updater）
  - 安裝指南文件

---

## 執行順序與依賴關係

### 【階段 1】基礎設施（序列執行）

```
Task-001: 專案初始化
    ↓
Task-002: 資料庫設計
    ↓
Task-003: API 基礎架構
```

**說明：** 這三個任務是所有後續開發的基礎，必須序列執行。

**預估時間：** 17 小時

---

### 【階段 2】後端核心 API（可並行）

**並行組 A：API 端點開發（完全並行）**
```
Task-004: Projects API     (12h)
Task-005: Configurations API (6h)
Task-006: System API        (5h)
Task-007: YouTube API       (6h)
Task-008: Stats API         (3h)
Task-009: Batch API         (6h)
```

**檔案修改分析：**
- Task-004: `backend/app/api/v1/projects.py`, `backend/app/services/project_service.py`
- Task-005: `backend/app/api/v1/configurations.py`, `backend/app/services/config_service.py`
- Task-006: `backend/app/api/v1/system.py`, `backend/app/services/system_service.py`
- Task-007: `backend/app/api/v1/youtube.py`, `backend/app/services/youtube_service.py`
- Task-008: `backend/app/api/v1/stats.py`, `backend/app/services/stats_service.py`
- Task-009: `backend/app/api/v1/batch.py`, `backend/app/services/batch_service.py`

✅ **無衝突，可完全並行開發**

**預估時間（並行）：** 12 小時（最長的 Task-004）

---

### 【階段 3】第三方服務整合（可並行）

**並行組 B：第三方 API 整合（完全並行）**
```
Task-010: Gemini 整合      (10h)
Task-011: Stability AI 整合 (12h)
Task-012: D-ID 整合        (8h)
Task-013: YouTube 整合     (10h)
```

**檔案修改分析：**
- Task-010: `backend/app/integrations/gemini_client.py`, `backend/app/services/script_service.py`
- Task-011: `backend/app/integrations/stability_client.py`, `backend/app/services/image_service.py`
- Task-012: `backend/app/integrations/did_client.py`, `backend/app/services/avatar_service.py`
- Task-013: `backend/app/integrations/youtube_client.py`, `backend/app/services/upload_service.py`

✅ **無衝突，可完全並行開發**

**預估時間（並行）：** 12 小時（最長的 Task-011）

---

### 【階段 4】後端核心服務（序列執行）

```
Task-014: Celery 背景任務（依賴 Task-010, 011, 012, 013）
    ↓
Task-015: 影片渲染服務（依賴 Task-011, 012）
    ↓
Task-016: WebSocket 進度推送（依賴 Task-014）
```

**說明：**
- Task-014 需要整合所有第三方 API（依賴 Task-010~013）
- Task-015 需要使用圖片和虛擬主播（依賴 Task-011, 012）
- Task-016 需要 Celery 進度資訊（依賴 Task-014）

**預估時間（序列）：** 36 小時

---

### 【階段 5】前端基礎（序列執行）

```
Task-017: 前端初始化與路由
    ↓
Task-018: Zustand Stores
    ↓
Task-019: Axios 客戶端
```

**說明：** 前端架構必須按順序建立。

**預估時間（序列）：** 20 小時

---

### 【階段 6】前端核心頁面（可部分並行）

**並行組 C：獨立頁面（完全並行）**
```
Task-020: Setup 頁面       (10h)  [依賴 Task-019]
Task-021: Dashboard 頁面   (12h)  [依賴 Task-019]
Task-026: Settings 頁面    (10h)  [依賴 Task-019]
```

✅ **無衝突，可並行開發**

**序列任務：核心流程頁面**
```
Task-022: 新增專案流程（步驟 1-2）(20h)  [依賴 Task-019]
    ↓
Task-023: 新增專案流程（步驟 3-4）(10h)  [依賴 Task-022]
    ↓
Task-024: 進度監控頁面 (12h)  [依賴 Task-016, Task-023]
    ↓
Task-025: 結果頁面 (6h)  [依賴 Task-024]
```

**預估時間（並行 + 序列）：** 60 小時
- 並行組 C: 12 小時
- 序列任務: 48 小時
- **總計：** 60 小時

---

### 【階段 7】進階功能（可並行）

**並行組 D：進階功能（可並行）**
```
Task-027: 配置與模板管理 (10h)  [依賴 Task-019]
Task-028: 批次處理頁面   (10h)  [依賴 Task-019]
```

✅ **無衝突，可並行開發**

**預估時間（並行）：** 10 小時

---

### 【階段 8】整合測試與部署（序列執行）

```
Task-029: 端到端測試（依賴所有前後端任務）
    ↓
Task-030: Electron 打包（依賴 Task-029）
```

**預估時間（序列）：** 28 小時

---

## 並行執行規劃

### 最佳並行策略（4 個實例）

#### Round 1: 基礎設施 (17 小時)
```
實例 1: Task-001 (4h) → Task-002 (8h) → Task-003 (5h)
實例 2: 等待 → 等待 → 等待
實例 3: 等待 → 等待 → 等待
實例 4: 等待 → 等待 → 等待
```

#### Round 2: 後端 API (12 小時)
```
實例 1: Task-004 (12h)
實例 2: Task-005 (6h) → Task-006 (5h)
實例 3: Task-007 (6h) → Task-008 (3h)
實例 4: Task-009 (6h)
```

#### Round 3: 第三方整合 (12 小時)
```
實例 1: Task-010 (10h)
實例 2: Task-011 (12h)
實例 3: Task-012 (8h)
實例 4: Task-013 (10h)
```

#### Round 4: 後端服務 (36 小時)
```
實例 1: Task-014 (14h) → Task-015 (16h) → Task-016 (6h)
實例 2: 等待 → 等待 → 等待
實例 3: 等待 → 等待 → 等待
實例 4: 等待 → 等待 → 等待
```

#### Round 5: 前端基礎 (20 小時)
```
實例 1: Task-017 (6h) → Task-018 (8h) → Task-019 (6h)
實例 2: 等待 → 等待 → 等待
實例 3: 等待 → 等待 → 等待
實例 4: 等待 → 等待 → 等待
```

#### Round 6: 前端頁面（並行組）(12 小時)
```
實例 1: Task-020 (10h)
實例 2: Task-021 (12h)
實例 3: Task-026 (10h)
實例 4: 等待
```

#### Round 7: 前端頁面（序列任務）(48 小時)
```
實例 1: Task-022 (20h) → Task-023 (10h) → Task-024 (12h) → Task-025 (6h)
實例 2: 等待 → 等待 → 等待 → 等待
實例 3: 等待 → 等待 → 等待 → 等待
實例 4: 等待 → 等待 → 等待 → 等待
```

#### Round 8: 進階功能 (10 小時)
```
實例 1: Task-027 (10h)
實例 2: Task-028 (10h)
實例 3: 等待
實例 4: 等待
```

#### Round 9: 整合測試與部署 (28 小時)
```
實例 1: Task-029 (16h) → Task-030 (12h)
實例 2: 等待 → 等待
實例 3: 等待 → 等待
實例 4: 等待 → 等待
```

---

### 時間統計

**序列執行總時間：** 280 小時

**並行執行總時間（4 實例）：** 195 小時
- Round 1: 17 小時
- Round 2: 12 小時
- Round 3: 12 小時
- Round 4: 36 小時
- Round 5: 20 小時
- Round 6: 12 小時
- Round 7: 48 小時
- Round 8: 10 小時
- Round 9: 28 小時

**節省時間：** 85 小時 (30%)

**實際並行效率：** 由於許多任務必須序列執行（階段 4, 5, 7, 9），並行化的效益有限。

---

## 合併策略

### 自動合併觸發條件
1. ✅ Task 標記為 `[v]`
2. ✅ 所有測試通過
3. ✅ 已推送到 remote
4. ✅ 無衝突

### 合併順序建議

**階段 1-3（基礎 + API + 整合）：**
- 每個階段完成後，將所有任務合併到 develop
- 順序：基礎 → API → 整合

**階段 4-6（服務 + 前端）：**
- 後端服務完成後合併
- 前端基礎完成後合併
- 前端頁面逐步合併（獨立頁面可獨立合併）

**階段 7-8（進階 + 部署）：**
- 進階功能完成後合併
- 測試通過後合併
- Electron 打包完成後創建 v1.0.0 tag

---

## 風險評估

### 高風險項目

#### Risk-1: 第三方 API 可靠性
- **影響任務：** Task-010, 011, 012, 013
- **風險：** API 文件不完整、配額限制、服務不穩定
- **緩解措施：**
  - 提前測試所有 API（申請測試帳號）
  - 實作完整的錯誤處理與重試機制
  - 設定 API 配額監控與警告
  - 準備 Mock 資料用於開發測試

#### Risk-2: FFmpeg 跨平台相容性
- **影響任務：** Task-015
- **風險：** 不同平台 FFmpeg 指令差異、編碼器缺失、效能問題
- **緩解措施：**
  - 測試所有目標平台（macOS, Linux, Windows）
  - 提供 FFmpeg 安裝指南
  - 實作編碼器檢測與 fallback
  - 準備預編譯的 FFmpeg binary

#### Risk-3: 視覺化配置複雜度
- **影響任務：** Task-022
- **風險：** react-dnd + Konva 整合困難、即時預覽效能問題
- **緩解措施：**
  - 先實作簡化版（基本拖拽定位）
  - 逐步添加進階功能（對齊輔助線、批量編輯）
  - 效能優化（虛擬化、防抖、記憶化）
  - 提供備選方案（數值輸入模式）

### 中風險項目

#### Risk-4: WebSocket 穩定性
- **影響任務：** Task-016, Task-024
- **風險：** 連線斷開、訊息丟失、記憶體洩漏
- **緩解措施：**
  - 實作自動重連機制（指數退避）
  - 訊息確認機制（ack）
  - Fallback 到輪詢（HTTP polling）
  - 連線心跳檢測

#### Risk-5: 測試覆蓋率
- **影響任務：** Task-029
- **風險：** 時間不足導致測試不完整
- **緩解措施：**
  - 優先測試核心流程（Flow-1）
  - 自動化測試（CI/CD）
  - 預留額外時間（16 小時 → 20 小時）
  - 分階段測試（每個階段完成後測試）

#### Risk-6: Electron 打包問題
- **影響任務：** Task-030
- **風險：** Python 打包失敗、依賴缺失、簽名問題
- **緩解措施：**
  - 提早測試打包流程
  - 使用 PyInstaller 或 cx_Freeze
  - 準備所有簽名證書
  - 提供手動安裝指南

---

## 成功標準

### 功能完整性
- ✅ 所有 10 個 User Flows 可執行
- ✅ 6 個後端 API 模塊全部實作（33 個端點）
- ✅ 12 個前端頁面全部實作
- ✅ 4 個第三方 API 完全整合
- ✅ 完整的背景任務鏈（6 個 Celery 任務）

### 品質標準
- ✅ 後端測試覆蓋率 > 80%
- ✅ 前端測試覆蓋率 > 80%
- ✅ E2E 測試覆蓋 7 個主要流程
- ✅ 所有 linter 檢查通過（ESLint, Ruff）
- ✅ TypeScript/Python 類型檢查通過

### 效能標準
- ✅ 端到端生成時間 < 25 分鐘（95th percentile）
- ✅ API 回應時間 < 500ms（95th percentile）
- ✅ 前端首次載入 < 3 秒
- ✅ WebSocket 訊息延遲 < 200ms

### 部署標準
- ✅ 可在 macOS 上打包並運行
- ✅ 可在 Linux 上打包並運行
- ✅ 可在 Windows 上打包並運行
- ✅ 所有依賴正確打包（FFmpeg, Python, Redis）
- ✅ 安裝程式可正常安裝與卸載

---

## 完成檢查清單

### 程式碼品質
- [ ] 所有 30 個 Task 標記為 `[v]` 完成
- [ ] 通過 ESLint 和 Ruff 檢查
- [ ] 通過 TypeScript 和 mypy 類型檢查
- [ ] 無 console.log 或除錯程式碼
- [ ] 所有 TODO 註解已處理

### 測試
- [ ] 所有單元測試通過（後端 + 前端）
- [ ] 整合測試通過（API + 資料庫）
- [ ] E2E 測試通過（7 個主要流程）
- [ ] 測試覆蓋率達標（> 80%）
- [ ] 效能測試通過

### 文件
- [ ] Spec 與程式碼 100% 同步
- [ ] API 文件完整（OpenAPI/Swagger）
- [ ] README 更新（安裝、使用、開發指南）
- [ ] CHANGELOG 記錄所有變更
- [ ] 使用者手冊完整

### Git
- [ ] 所有變更已合併到 develop
- [ ] Git 歷史清晰（commit 訊息符合規範）
- [ ] 建立 Phase 1 完成的 tag (v1.0.0)
- [ ] develop 已合併到 main
- [ ] 已推送到 GitHub

### 部署
- [ ] 可成功打包為 Electron 應用
- [ ] macOS 打包測試通過
- [ ] Linux 打包測試通過
- [ ] Windows 打包測試通過
- [ ] 安裝與卸載測試通過
- [ ] 使用文件完整

---

## 下一步

### 立即開始

**⚠️ 重要提醒：每次對話必須創建新分支！**

1. **檢查當前分支：**
   ```bash
   git branch --show-current
   ```
   - 如果在 develop，立即創建新分支
   - 絕對不要直接在 develop 上工作

2. **創建工作分支：**
   ```bash
   git checkout -b feature/task-001-project-setup
   ```

3. **開始 Task-001：** 專案初始化與環境設定

### 並行開發建議

如果有多個開發者或 Claude Code 實例：

**序列階段（必須等待）：**
- Round 1: 只能 1 個實例執行 Task-001 ~ 003

**並行階段（可同時執行）：**
- Round 2: 4 個實例可同時執行 Task-004 ~ 009
- Round 3: 4 個實例可同時執行 Task-010 ~ 013
- Round 6: 3 個實例可同時執行 Task-020, 021, 026
- Round 8: 2 個實例可同時執行 Task-027, 028

---

**準備好開始了嗎？讓我們從 Task-001 開始吧！** 🚀
