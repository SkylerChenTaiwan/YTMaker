# Phase 1: YTMaker 完整系統開發

> **目標：** 實現 YTMaker YouTube 影片自動化生產系統的完整功能
> **基於規格：** 所有 tech-specs (backend + frontend) 和 product-design 文件
> **預估時間：** 350-450 小時 (序列執行) | 180-220 小時 (並行執行，3-4 實例)

---

## 階段目標

### 核心目標
實現一個完整的本地端桌面應用程式，能夠：
- ✅ 從文字內容自動生成 YouTube 影片
- ✅ 支援完整的視覺化配置界面
- ✅ 整合 Gemini、Stability AI、D-ID、YouTube API
- ✅ 提供批次處理、斷點續傳、錯誤恢復
- ✅ 支援 Prompt 範本管理和模型選擇

### 技術實現目標
- **後端：** FastAPI + Python，完整實現所有 12 個 API 模塊
- **前端：** Next.js 14 + React，完整實現所有 12 個頁面
- **資料庫：** SQLite，10 個資料模型
- **整合：** 4 個第三方 API 完全整合
- **測試：** 單元測試覆蓋率 > 80%

---

## 任務總覽

**總任務數：** 25 個

### 分類統計
- **基礎建設：** 3 個任務 (Task-001 ~ 003)
- **後端核心：** 10 個任務 (Task-004 ~ 013)
- **前端核心：** 9 個任務 (Task-014 ~ 022)
- **整合測試：** 2 個任務 (Task-023 ~ 024)
- **部署打包：** 1 個任務 (Task-025)

### 優先級分類
- **P0 (必須)：** 20 個任務
- **P1 (重要)：** 5 個任務

---

## 完整任務列表

### === 第一階段：基礎建設 (Foundation) ===

#### Task-001: 專案初始化與環境設定
- **預估時間：** 4 小時
- **優先級：** P0
- **描述：** 建立前後端專案結構、安裝依賴、配置開發環境
- **產出：**
  - 完整的目錄結構
  - package.json, requirements.txt
  - Docker Compose 配置
  - 開發環境可運行

#### Task-002: 資料庫 Schema 設計與實作
- **預估時間：** 6 小時
- **優先級：** P0
- **描述：** 實作所有 10 個資料模型、索引、關聯關係、遷移腳本
- **產出：**
  - SQLAlchemy 模型定義
  - Alembic 遷移腳本
  - 資料庫初始化腳本
  - 測試資料 seeder

#### Task-003: API 基礎架構與錯誤處理
- **預估時間：** 5 小時
- **優先級：** P0
- **描述：** FastAPI 基礎設定、全局錯誤處理、中間件、CORS 配置
- **產出：**
  - FastAPI app 初始化
  - 統一錯誤處理機制
  - 請求/回應中間件
  - 健康檢查端點

---

### === 第二階段：後端核心功能 (Backend Core) ===

#### Task-004: 專案管理 API 實作 (12 個端點)
- **預估時間：** 12 小時
- **優先級：** P0
- **描述：** 實作所有專案 CRUD、進度查詢、素材管理 API
- **產出：**
  - 12 個 API 端點
  - Pydantic schemas
  - ProjectService 業務邏輯
  - 單元測試

#### Task-005: 配置管理 API 實作 (6 個端點)
- **預估時間：** 6 小時
- **優先級：** P0
- **描述：** 視覺配置、Prompt 範本、視覺模板的 CRUD API
- **產出：**
  - 6 個 API 端點
  - ConfigurationService
  - 配置驗證邏輯
  - 單元測試

#### Task-006: Gemini API 整合 (腳本生成)
- **預估時間：** 8 小時
- **優先級：** P0
- **描述：** 整合 Gemini API，實作腳本生成邏輯
- **產出：**
  - GeminiClient 類別
  - 腳本生成服務
  - Prompt 模板系統
  - 錯誤處理與重試

#### Task-007: Stability AI 整合 (圖片生成)
- **預估時間：** 10 小時
- **優先級：** P0
- **描述：** 整合 Stability AI，實作批次圖片生成、風格一致性控制
- **產出：**
  - StabilityAIClient 類別
  - 圖片生成服務
  - 並行處理邏輯
  - 品質驗證

#### Task-008: D-ID API 整合 (虛擬主播)
- **預估時間：** 6 小時
- **優先級：** P0
- **描述：** 整合 D-ID API，生成虛擬主播影片
- **產出：**
  - DIDClient 類別
  - 虛擬主播生成服務
  - 嘴型同步驗證
  - 時長驗證

#### Task-009: YouTube API 整合 (上傳與授權)
- **預估時間：** 8 小時
- **優先級：** P0
- **描述：** 整合 YouTube Data API，實作 OAuth、影片上傳、排程發布
- **產出：**
  - YouTubeClient 類別
  - OAuth 授權流程
  - 影片上傳邏輯
  - Metadata 設定

#### Task-010: Celery 背景任務系統
- **預估時間：** 10 小時
- **優先級：** P0
- **描述：** 實作 6 個 Celery 任務、任務鏈、進度管理
- **產出：**
  - 6 個 Celery 任務
  - 任務鏈定義
  - 進度更新機制
  - 錯誤處理與重試

#### Task-011: 影片渲染服務 (FFmpeg)
- **預估時間：** 12 小時
- **優先級：** P0
- **描述：** 使用 FFmpeg 實作影片合成、字幕燒錄、Ken Burns 效果
- **產出：**
  - VideoRenderer 類別
  - FFmpeg 指令生成
  - 字幕渲染
  - 動態效果實作

#### Task-012: WebSocket 即時進度推送
- **預估時間：** 6 小時
- **優先級：** P0
- **描述：** 實作 WebSocket 端點，即時推送生成進度
- **產出：**
  - WebSocket 端點
  - Redis Pub/Sub 整合
  - 進度廣播邏輯
  - 連線管理

#### Task-013: API Keys 與 YouTube 授權管理
- **預估時間：** 6 小時
- **優先級：** P0
- **描述：** 實作 API Keys 安全儲存、YouTube OAuth 流程
- **產出：**
  - API Keys 管理端點
  - Keychain 整合
  - OAuth callback 處理
  - 配額監控

---

### === 第三階段：前端核心功能 (Frontend Core) ===

#### Task-014: 前端專案初始化與路由系統
- **預估時間：** 5 小時
- **優先級：** P0
- **描述：** Next.js 14 專案設定、12 個路由、導航守衛、中間件
- **產出：**
  - Next.js App Router 結構
  - 12 個路由定義
  - 導航守衛
  - 麵包屑系統

#### Task-015: Zustand Stores 與狀態管理
- **預估時間：** 6 小時
- **優先級：** P0
- **描述：** 實作 4 個 Zustand stores、狀態持久化、同步邏輯
- **產出：**
  - useProjectStore
  - useConfigStore
  - useProgressStore
  - useAuthStore

#### Task-016: Axios 客戶端與 API 整合層
- **預估時間：** 5 小時
- **優先級：** P0
- **描述：** Axios 配置、錯誤處理、重試、快取
- **產出：**
  - API 客戶端配置
  - 統一錯誤處理
  - 自動重試邏輯
  - 請求快取

#### Task-017: 首次啟動設定精靈 (/setup)
- **預估時間：** 8 小時
- **優先級：** P0
- **描述：** Flow-0 首次啟動流程、API Keys 設定、YouTube 授權
- **產出：**
  - Setup 頁面
  - API Key 輸入與驗證
  - YouTube OAuth 流程
  - 設定完成檢查

#### Task-018: 主控台頁面 (/dashboard)
- **預估時間：** 10 小時
- **優先級：** P0
- **描述：** 專案列表、篩選、排序、統計資訊
- **產出：**
  - Dashboard 頁面
  - ProjectCard 元件
  - 篩選與排序邏輯
  - 分頁功能

#### Task-019: 新增專案流程 (/project/new + configure/*)
- **預估時間：** 16 小時
- **優先級：** P0
- **描述：** Flow-1 完整新增專案流程、視覺配置、Prompt 設定、YouTube 設定
- **產出：**
  - 專案建立頁面
  - 視覺化配置界面 (react-dnd + Konva)
  - Prompt 範本選擇器
  - YouTube metadata 表單

#### Task-020: 進度監控頁面 (/project/:id/progress)
- **預估時間：** 10 小時
- **優先級：** P0
- **描述：** WebSocket 即時進度、階段顯示、日誌查看、取消/重試
- **產出：**
  - 進度監控頁面
  - WebSocket 連線邏輯
  - 進度條與階段顯示
  - 控制按鈕

#### Task-021: 配置與模板管理頁面
- **預估時間：** 8 小時
- **優先級：** P1
- **描述：** Flow-3, Flow-8 配置模板、Prompt 範本管理
- **產出：**
  - 配置管理頁面 (/configurations)
  - 模板管理頁面 (/templates)
  - CRUD 操作
  - 模板預覽

#### Task-022: 系統設定頁面 (/settings)
- **預估時間：** 6 小時
- **優先級：** P0
- **描述：** Flow-9 API Keys 管理、YouTube 授權、配額顯示
- **產出：**
  - 設定頁面
  - API Keys 編輯
  - YouTube 帳號管理
  - 配額顯示

---

### === 第四階段：整合測試與部署 (Integration & Deployment) ===

#### Task-023: 端到端整合測試
- **預估時間：** 12 小時
- **優先級：** P0
- **描述：** Flow-1 完整流程測試、錯誤處理測試、斷點續傳測試
- **產出：**
  - E2E 測試腳本 (Playwright)
  - API 整合測試
  - 錯誤場景測試
  - 測試報告

#### Task-024: 批次處理與斷點續傳功能
- **預估時間：** 8 小時
- **優先級：** P1
- **描述：** Flow-5, Flow-6 批次處理、進度保存、恢復邏輯
- **產出：**
  - 批次處理頁面 (/batch)
  - BatchTask 邏輯
  - 進度保存機制
  - Resume 功能

#### Task-025: Electron 打包與部署
- **預估時間：** 10 小時
- **優先級：** P1
- **描述：** Electron 整合、多平台打包、安裝程式
- **產出：**
  - Electron 主程序
  - Electron Builder 配置
  - macOS/Linux/Windows 安裝包
  - 自動更新機制

---

## 執行順序與依賴關係

### 【第一步】基礎建設（必須先完成）
```
Task-001: 專案初始化
    ↓
Task-002: 資料庫設計
    ↓
Task-003: API 基礎架構
```

**說明：** 這三個任務是所有後續開發的基礎，必須序列執行。

---

### 【第二步】後端核心（可部分並行）

**並行組 1：API 端點開發**
```
Task-004: 專案管理 API
Task-005: 配置管理 API
```
✅ 這兩個任務無依賴，可並行開發（修改不同的檔案）

**並行組 2：第三方 API 整合**
```
Task-006: Gemini 整合
Task-007: Stability AI 整合
Task-008: D-ID 整合
Task-009: YouTube 整合
```
✅ 這四個任務可完全並行（獨立的整合模塊）

**序列任務：背景任務與核心服務**
```
Task-010: Celery 背景任務（依賴 Task-006, 007, 008, 009）
    ↓
Task-011: 影片渲染服務（依賴 Task-007, 008）
    ↓
Task-012: WebSocket 進度推送（依賴 Task-010）
    ↓
Task-013: API Keys 管理（依賴 Task-009）
```

---

### 【第三步】前端核心（可部分並行）

**序列基礎：前端架構**
```
Task-014: 前端初始化與路由
    ↓
Task-015: Zustand Stores
    ↓
Task-016: Axios 客戶端
```

**並行組 3：頁面開發**
```
Task-017: Setup 頁面（依賴 Task-016）
Task-018: Dashboard 頁面（依賴 Task-016）
Task-021: 配置與模板管理（依賴 Task-016）
Task-022: 系統設定頁面（依賴 Task-016）
```
✅ 這些頁面可並行開發（修改不同的檔案）

**序列任務：核心流程頁面**
```
Task-019: 新增專案流程（依賴 Task-016, Task-021）
    ↓
Task-020: 進度監控頁面（依賴 Task-012, Task-019）
```

---

### 【第四步】整合與部署（序列執行）

```
Task-023: 端到端測試（依賴所有前後端任務）
    ↓
Task-024: 批次處理與斷點續傳（依賴 Task-023）
    ↓
Task-025: Electron 打包（依賴 Task-024）
```

---

## 檔案修改分析

### 無衝突任務組（可並行）

#### 後端並行組 1
- **Task-004:** 修改 `backend/app/api/v1/projects.py`, `backend/app/services/project_service.py`
- **Task-005:** 修改 `backend/app/api/v1/configurations.py`, `backend/app/services/config_service.py`

#### 後端並行組 2
- **Task-006:** 修改 `backend/app/integrations/gemini_client.py`
- **Task-007:** 修改 `backend/app/integrations/stability_client.py`
- **Task-008:** 修改 `backend/app/integrations/did_client.py`
- **Task-009:** 修改 `backend/app/integrations/youtube_client.py`

#### 前端並行組 3
- **Task-017:** 修改 `frontend/src/app/setup/`
- **Task-018:** 修改 `frontend/src/app/dashboard/`
- **Task-021:** 修改 `frontend/src/app/configurations/`, `frontend/src/app/templates/`
- **Task-022:** 修改 `frontend/src/app/settings/`

### 潛在衝突任務（需協調）

⚠️ **Task-019** 和 **Task-020** 可能都會修改:
- `frontend/src/components/project/`（共用元件）
- `frontend/src/stores/useProjectStore.ts`

**建議：** Task-019 完成後再開始 Task-020，或協調好修改範圍。

⚠️ **Task-010** 和 **Task-011** 可能都會修改:
- `backend/app/tasks/`（Celery 任務定義）

**建議：** Task-010 完成後再開始 Task-011。

---

## 並行執行規劃

### 最佳並行策略（4 個實例）

#### Round 1 (12 小時)
```
實例 1: Task-001 (4h) → Task-006 (8h)
實例 2: Task-002 (6h) → Task-007 (10h) [繼續到 Round 2]
實例 3: Task-003 (5h) → Task-008 (6h)
實例 4: 等待 → Task-009 (8h) [從 Task-003 完成後開始]
```

#### Round 2 (12 小時)
```
實例 1: Task-004 (12h)
實例 2: Task-007 (繼續 2h) → Task-005 (6h)
實例 3: Task-010 (10h)
實例 4: Task-013 (6h) → Task-014 (5h)
```

#### Round 3 (12 小時)
```
實例 1: Task-011 (12h)
實例 2: Task-015 (6h) → Task-016 (5h)
實例 3: Task-012 (6h) → Task-017 (8h) [繼續到 Round 4]
實例 4: Task-018 (10h)
```

#### Round 4 (16 小時)
```
實例 1: Task-019 (16h)
實例 2: Task-021 (8h) → Task-022 (6h)
實例 3: Task-017 (繼續 2h) → Task-020 (10h)
實例 4: 等待 Task-019 完成
```

#### Round 5 (12 小時)
```
實例 1: Task-023 (12h)
實例 2: 等待
實例 3: 等待
實例 4: 等待
```

#### Round 6 (10 小時)
```
實例 1: Task-024 (8h) → Task-025 (10h) [繼續到 Round 7]
實例 2: 等待
實例 3: 等待
實例 4: 等待
```

#### Round 7 (2 小時)
```
實例 1: Task-025 (繼續 2h)
```

**總並行時間：** 約 76 小時 (相比序列 450 小時，節省約 83%)

---

## 合併策略

### 自動合併觸發條件
1. ✅ Task 標記為 `[v]`
2. ✅ 所有測試通過
3. ✅ 已推送到 remote
4. ✅ 無衝突

### 合併順序建議
- **基礎建設任務 (001-003)：** 完成後立即合併到 develop
- **並行組任務：** 各自完成後獨立合併
- **依賴任務：** 前置任務合併後再合併
- **整合任務 (023-025)：** 完成後合併到 develop

---

## 風險評估

### 高風險項目

#### Risk-1: 第三方 API 可靠性
- **影響任務：** Task-006, 007, 008, 009
- **風險：** API 文件不完整、配額限制、服務不穩定
- **緩解措施：**
  - 提前測試所有 API
  - 實作完整的錯誤處理
  - 設定 API 配額監控

#### Risk-2: FFmpeg 跨平台相容性
- **影響任務：** Task-011
- **風險：** 不同平台 FFmpeg 指令差異、編碼器缺失
- **緩解措施：**
  - 測試所有目標平台
  - 提供 FFmpeg 安裝指南
  - 實作編碼器檢測

#### Risk-3: 視覺化配置複雜度
- **影響任務：** Task-019
- **風險：** react-dnd + Konva 整合困難、效能問題
- **緩解措施：**
  - 先實作簡化版
  - 逐步添加功能
  - 效能優化（虛擬化、防抖）

### 中風險項目

#### Risk-4: WebSocket 穩定性
- **影響任務：** Task-012, Task-020
- **風險：** 連線斷開、訊息丟失
- **緩解措施：**
  - 實作自動重連
  - 訊息確認機制
  - Fallback 到輪詢

#### Risk-5: 測試覆蓋率
- **影響任務：** Task-023
- **風險：** 時間不足導致測試不完整
- **緩解措施：**
  - 優先測試核心流程
  - 自動化測試
  - 預留額外時間

---

## 預估時間統計

### 序列執行總時間
- **基礎建設：** 15 小時
- **後端核心：** 84 小時
- **前端核心：** 74 小時
- **整合測試：** 30 小時
- **總計：** 203 小時

### 並行執行總時間（4 實例）
- **估計：** 76 小時
- **節省：** 127 小時 (62%)

### 每個任務的詳細預估
參見上方任務列表。

---

## 成功標準

### 功能完整性
- ✅ 所有 10 個 User Flows 可執行
- ✅ 12 個後端 API 模塊全部實作
- ✅ 12 個前端頁面全部實作
- ✅ 4 個第三方 API 完全整合

### 品質標準
- ✅ 後端測試覆蓋率 > 80%
- ✅ 前端測試覆蓋率 > 80%
- ✅ E2E 測試覆蓋核心流程
- ✅ 所有 linter 檢查通過

### 效能標準
- ✅ 端到端生成時間 < 25 分鐘
- ✅ API 回應時間 < 500ms (95th percentile)
- ✅ 前端首次載入 < 3 秒

### 部署標準
- ✅ 可在 macOS 上打包並運行
- ✅ 可在 Linux 上打包並運行
- ✅ 所有依賴正確打包

---

## 完成檢查清單

### 程式碼品質
- [ ] 所有 Task 標記為 `[v]` 完成
- [ ] 通過 Linter 檢查
- [ ] 通過 TypeScript/Python 類型檢查
- [ ] 無 console.log 或除錯程式碼

### 測試
- [ ] 所有單元測試通過
- [ ] 整合測試通過
- [ ] E2E 測試通過
- [ ] 測試覆蓋率達標

### 文件
- [ ] Spec 與程式碼同步
- [ ] API 文件完整
- [ ] README 更新

### Git
- [ ] 所有變更已合併到 develop
- [ ] Git 歷史清晰
- [ ] 建立 Phase 1 完成的 tag

### 部署
- [ ] 可成功打包為 Electron 應用
- [ ] 所有平台測試通過
- [ ] 使用文件完整

---

## 下一步

### 立即開始
1. **檢查當前分支：** 確保不在 develop 分支
2. **創建工作分支：** `git checkout -b feature/task-001-project-setup`
3. **開始 Task-001：** 專案初始化與環境設定

### 並行開發建議
如果有多個開發者或 Claude Code 實例：
1. 實例 1: Task-001
2. 實例 2: 等待 Task-001 完成後開始 Task-002
3. 實例 3: 準備 API Keys 和測試帳號
4. 實例 4: 審查 spec 文件

---

**準備好開始了嗎？讓我們從 Task-001 開始吧！** 🚀
