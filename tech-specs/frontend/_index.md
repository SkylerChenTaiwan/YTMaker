# 前端技術規格索引

> **建立日期:** 2025-10-19
> **最後更新:** 2025-10-19
> **關聯文件:** `../framework.md`, `../backend/`, `../../product-design/`

---

## 📚 模塊導航

本索引包含 YTMaker 前端技術規格的所有模塊。前端基於 **Next.js 14 + React 18 + TypeScript**，採用 **App Router** 架構。

---

## 核心模塊

### 1. [overview.md](./overview.md)
**前端架構總覽**

- 技術棧說明 (Next.js, React, TypeScript, Ant Design, Zustand)
- 專案目錄結構
- 應用程式啟動流程
- 核心架構原則

**適用場景:** 了解整體前端架構和技術選型

---

### 2. [routing.md](./routing.md)
**路由設計**

- 12 個頁面的完整路由表 (14 個路由)
- 路由參數驗證
- 導航守衛 (Middleware)
- 404 處理
- 麵包屑導航設計

**適用場景:** 開發新頁面、設定路由、導航邏輯

---

### 3. [component-architecture.md](./component-architecture.md)
**元件架構**

- 元件層級結構 (Layout, Page, Feature, UI, Domain)
- 15+ 個共用元件定義 (Button, Modal, Toast, Table 等)
- 元件複用策略
- 元件庫組織規範

**適用場景:** 開發 UI 元件、理解元件設計模式

---

### 4. [state-management.md](./state-management.md)
**狀態管理**

- Zustand 全域狀態設計
- 5 大類全域狀態 (settings, ui, projects, progress, batch)
- Store 定義與完整程式碼範例
- 本地狀態管理模式

**適用場景:** 管理全域狀態、設計狀態結構

---

### 5. [api-integration.md](./api-integration.md)
**API 整合**

- Axios API 呼叫策略
- 請求/回應處理
- TanStack Query 載入狀態管理
- 錯誤處理與重試機制
- 快取策略
- 樂觀更新
- WebSocket 即時資料同步

**適用場景:** 實作 API 呼叫、處理非同步請求

---

### 6. [pages.md](./pages.md)
**頁面規格**

- 12 個頁面的完整規格
- 頁面層級結構
- 頁面元件設計
- 導航流程
- 表單處理規格

**適用場景:** 實作頁面功能、理解頁面流程

---

### 7. [styling.md](./styling.md)
**樣式設計**

- Tailwind CSS + CSS Modules 架構
- Tailwind 主題配置
- Loading 狀態設計
- 錯誤提示方式
- 空狀態設計
- 響應式設計 (斷點、行動版佈局)

**適用場景:** 設計 UI 樣式、處理響應式佈局

---

### 8. [testing.md](./testing.md)
**測試規格**

- Jest + React Testing Library 單元測試
- Playwright E2E 測試
- 測試範例與模式
- 測試覆蓋率目標

**適用場景:** 撰寫測試、確保程式碼品質

---

## 快速查找指南

### 按功能查找

| 功能 | 相關模塊 |
|------|----------|
| 新增頁面 | routing.md, pages.md |
| 新增元件 | component-architecture.md |
| API 呼叫 | api-integration.md |
| 狀態管理 | state-management.md |
| 樣式設計 | styling.md |
| 表單處理 | pages.md, api-integration.md |
| 錯誤處理 | api-integration.md |
| 即時更新 | api-integration.md (WebSocket) |
| 效能優化 | overview.md |
| 無障礙設計 | styling.md |
| 測試 | testing.md |

### 按開發階段查找

| 階段 | 相關模塊 |
|------|----------|
| 專案初始化 | overview.md |
| 路由規劃 | routing.md |
| 元件開發 | component-architecture.md, styling.md |
| 狀態設計 | state-management.md |
| API 整合 | api-integration.md |
| 頁面開發 | pages.md, routing.md |
| 測試撰寫 | testing.md |

---

## 專案統計

### 技術棧

**前端核心:**
- Next.js 14 + React 18 + TypeScript
- Ant Design 5.x + Tailwind CSS
- Zustand (狀態管理)
- TanStack Query (資料請求)
- Socket.IO Client (即時通訊)
- react-konva (視覺化編輯)

**開發工具:**
- Jest + React Testing Library (單元測試)
- Playwright (E2E 測試)
- ESLint + Prettier (程式碼品質)
- Electron (桌面打包)

### 規模統計

- **總頁面數:** 12 個
- **總路由數:** 14 個
- **共用元件數:** 15+ 個
- **全域狀態類別:** 5 大類

---

## 文件間關聯

```
前端架構
│
├── overview.md (整體架構)
│   ├── 技術棧定義
│   ├── 目錄結構 → 影響所有模塊
│   └── 架構原則 → 影響所有模塊
│
├── routing.md (路由層)
│   ├── 路由定義 → pages.md 使用
│   └── 導航守衛 → pages.md 使用
│
├── component-architecture.md (元件層)
│   ├── UI 元件 → pages.md 使用
│   ├── Feature 元件 → pages.md 使用
│   └── 元件規範 → styling.md 遵循
│
├── state-management.md (狀態層)
│   ├── Store 定義 → pages.md 使用
│   └── 狀態結構 → api-integration.md 使用
│
├── api-integration.md (資料層)
│   ├── API 服務 → pages.md 使用
│   ├── 錯誤處理 → pages.md 使用
│   └── WebSocket → pages.md 使用
│
├── pages.md (頁面層)
│   ├── 使用 routing.md 路由
│   ├── 使用 component-architecture.md 元件
│   ├── 使用 state-management.md 狀態
│   ├── 使用 api-integration.md API
│   └── 使用 styling.md 樣式
│
├── styling.md (樣式層)
│   ├── Tailwind 配置 → 所有模塊使用
│   └── 響應式規範 → 所有模塊遵循
│
└── testing.md (測試層)
    └── 測試規範 → 所有模塊遵循
```

---

## 使用建議

### 初次閱讀順序

1. **overview.md** - 了解整體架構
2. **routing.md** - 理解頁面結構
3. **component-architecture.md** - 熟悉元件設計
4. **state-management.md** - 掌握狀態管理
5. **api-integration.md** - 理解資料流
6. **pages.md** - 深入頁面實作
7. **styling.md** - 掌握樣式規範
8. **testing.md** - 了解測試要求

### 開發時查找

- **開發新功能:** pages.md → component-architecture.md → api-integration.md
- **修改樣式:** styling.md → component-architecture.md
- **處理錯誤:** api-integration.md
- **優化效能:** overview.md → api-integration.md
- **撰寫測試:** testing.md

---

## 更新記錄

| 日期 | 版本 | 修改內容 | 修改人 |
|------|------|----------|--------|
| 2025-10-19 | 1.0 | 初始版本，拆分自 frontend-spec.md | Claude Code |
