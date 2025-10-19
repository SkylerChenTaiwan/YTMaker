# Backend Specification Index

本專案的後端技術規格文件組織。

---

## 核心架構

- [overview.md](./overview.md) - 整體架構、技術棧、專案結構、配置管理
- [database.md](./database.md) - 資料庫設計、Schema、資料模型、索引、遷移
- [auth.md](./auth.md) - 認證授權、API Key 管理、YouTube OAuth

---

## API 規格

- [api-design.md](./api-design.md) - API 設計原則、錯誤碼系統、RESTful 規範
- [api-projects.md](./api-projects.md) - 專案管理 API (12個端點)
- [api-configurations.md](./api-configurations.md) - 配置管理 API (6個端點)

---

## 業務邏輯

- [service-video-generation.md](./service-video-generation.md) - 影片生成工作流程、進度管理、錯誤處理
- [background-jobs.md](./background-jobs.md) - Celery 背景任務定義、任務監控

---

## 基礎設施

- [integrations.md](./integrations.md) - 第三方整合 (Gemini, Stability AI, D-ID, YouTube)
- [caching.md](./caching.md) - Redis 快取策略
- [performance.md](./performance.md) - 效能優化策略
- [security.md](./security.md) - 安全措施、輸入驗證、防護機制
- [testing.md](./testing.md) - 測試策略、單元測試、API 測試

---

## 快速查找指南

### 尋找特定 API 端點
→ 先查看 [api-design.md](./api-design.md) 的端點總覽
→ 再查看對應的 API 文件 (如 [api-projects.md](./api-projects.md))

### 尋找資料結構
→ 查看 [database.md](./database.md)

### 尋找認證相關
→ 查看 [auth.md](./auth.md)

### 尋找業務流程
→ 查看 [service-video-generation.md](./service-video-generation.md) 和 [background-jobs.md](./background-jobs.md)

### 尋找第三方整合
→ 查看 [integrations.md](./integrations.md)

### 尋找效能或安全問題
→ 查看 [performance.md](./performance.md) 或 [security.md](./security.md)

---

## 文件統計

- **總文件數:** 13 個模塊
- **API 端點:** 42 個
- **資料模型:** 10 個
- **背景任務:** 6 個
- **第三方整合:** 4 個

---

## 開發流程建議

1. **開始開發前**
   - 先閱讀 [overview.md](./overview.md) 了解整體架構
   - 閱讀 [database.md](./database.md) 了解資料結構
   - 閱讀 [api-design.md](./api-design.md) 了解 API 設計規範

2. **開發 API 時**
   - 參考對應的 API 文件 ([api-projects.md](./api-projects.md) 等)
   - 遵循 [api-design.md](./api-design.md) 的設計原則
   - 使用 [database.md](./database.md) 的資料模型

3. **開發業務邏輯時**
   - 參考 [service-video-generation.md](./service-video-generation.md)
   - 參考 [background-jobs.md](./background-jobs.md) 定義任務
   - 參考 [integrations.md](./integrations.md) 調用第三方 API

4. **優化與安全**
   - 參考 [performance.md](./performance.md) 優化查詢
   - 參考 [security.md](./security.md) 加強安全
   - 參考 [caching.md](./caching.md) 加入快取

5. **測試**
   - 參考 [testing.md](./testing.md) 撰寫測試

---

**最後更新:** 2025-01-19
