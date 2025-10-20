# Backend Specification Index

本專案的後端技術規格文件組織。

## 核心架構
- [overview.md](./overview.md) - 整體架構、技術棧、資料夾結構
- [database.md](./database.md) - 資料庫設計、Schema、關聯、索引
- [auth.md](./auth.md) - 認證授權邏輯、API Key 管理

## API 規格
- [api-design.md](./api-design.md) - API 設計原則與規範
- [api-system.md](./api-system.md) - 系統初始化 API
- [api-projects.md](./api-projects.md) - 專案管理 API
- [api-configurations.md](./api-configurations.md) - 配置與模板管理 API
- [api-youtube.md](./api-youtube.md) - YouTube 授權 API
- [api-stats.md](./api-stats.md) - 統計與配額 API
- [api-batch.md](./api-batch.md) - 批次處理 API

## 業務邏輯
- [business-logic.md](./business-logic.md) - 腳本生成、素材生成、影片渲染邏輯

## 基礎設施
- [background-jobs.md](./background-jobs.md) - 背景任務與 Celery
- [integrations.md](./integrations.md) - 第三方 API 整合
- [caching.md](./caching.md) - 快取策略
- [security.md](./security.md) - 安全措施
- [performance.md](./performance.md) - 效能優化
- [testing.md](./testing.md) - 測試策略

---

## 快速查找指南

- **尋找特定 API** → 查看 [api-design.md](./api-design.md) 或對應的 api-*.md 文件
- **資料結構相關** → 查看 [database.md](./database.md)
- **認證問題** → 查看 [auth.md](./auth.md)
- **業務流程** → 查看 [business-logic.md](./business-logic.md)
- **外部服務整合** → 查看 [integrations.md](./integrations.md)
- **效能優化** → 查看 [performance.md](./performance.md)
- **測試規範** → 查看 [testing.md](./testing.md)

---

## API 端點總覽

| 分類 | 端點數量 | 文件 |
|------|---------|------|
| 系統初始化 | 3 | [api-system.md](./api-system.md) |
| 專案管理 | 10 | [api-projects.md](./api-projects.md) |
| 配置管理 | 5 | [api-configurations.md](./api-configurations.md) |
| YouTube 授權 | 4 | [api-youtube.md](./api-youtube.md) |
| 統計配額 | 2 | [api-stats.md](./api-stats.md) |
| 批次處理 | 3 | [api-batch.md](./api-batch.md) |
| **總計** | **27** | - |

---

## 資料模型總覽

| 資料表 | 說明 | 文件 |
|--------|------|------|
| projects | 專案 | [database.md](./database.md) |
| configurations | 配置模板 | [database.md](./database.md) |
| prompt_templates | Prompt 範本 | [database.md](./database.md) |
| youtube_accounts | YouTube 帳號 | [database.md](./database.md) |
| assets | 素材 | [database.md](./database.md) |
| batch_tasks | 批次任務 | [database.md](./database.md) |
| system_settings | 系統設定 | [database.md](./database.md) |

---

**最後更新:** 2025-10-19
