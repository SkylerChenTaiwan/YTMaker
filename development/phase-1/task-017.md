# Task-017: 前端專案初始化與路由系統

> **建立日期:** 2025-10-19
> **狀態:** ⏳ 未開始  
> **預計時間:** 6 小時
> **優先級:** P0 (必須)

---

## 關聯文件

### 技術規格
- **前端架構:** `tech-specs/frontend/overview.md`
- **路由設計:** `tech-specs/frontend/routing.md`

### 相關任務
- **前置任務:** Task-001 ✅ (專案初始化)
- **後續任務:** Task-018 (Zustand Stores), Task-020 ~ 026 (所有前端頁面)

---

## 任務目標

### 簡述
建立 Next.js 14 專案、12 個路由、導航守衛、麵包屑、Layout 元件。

### 成功標準
- [x] Next.js App Router 結構完成
- [x] 12 個路由定義完成
- [x] 導航守衛完成
- [x] Layout 元件完成
- [x] Tailwind + Ant Design 整合完成

---

## 12 個路由

- `/setup` - 首次設定
- `/` 或 `/dashboard` - 主控台
- `/project/new` - 新增專案
- `/project/:id/configure/visual` - 視覺配置
- `/project/:id/configure/prompt-model` - Prompt 設定
- `/project/:id/configure/youtube` - YouTube 設定
- `/project/:id/progress` - 進度監控
- `/project/:id/result` - 結果頁
- `/configurations` - 配置管理
- `/templates` - 模板管理
- `/settings` - 系統設定
- `/batch` - 批次處理
- `/batch/:id` - 批次詳情

---

## 完成檢查清單

- [ ] Next.js 專案建立完成
- [ ] 12 個路由定義完成
- [ ] 導航守衛完成
- [ ] Layout 元件完成
- [ ] 404 頁面完成
- [ ] Tailwind 配置完成
