# Split Specs Command

請執行技術規格拆分與品質檢查流程。

## 目的

1. **模塊化** - 將大型 spec 文件拆分成易於閱讀和維護的小文件
2. **品質檢查** - 檢查 spec 的完整性、一致性與正確性
3. **提升效率** - 建立索引機制，讓 Claude Code 能快速找到相關資訊

## 執行步驟

### Step 1: 讀取現有 Spec

讀取以下文件：
- `tech-specs/backend-spec.md`（如果存在）
- `tech-specs/frontend-spec.md`（如果存在）
- `tech-specs/framework.md`（參考用）

### Step 2: 分析與規劃結構

**Backend 拆分原則：**
- `overview.md` - 整體架構、技術棧、資料夾結構
- `database.md` - 完整的資料庫設計（Schema、關聯、索引、遷移）
- `auth.md` - 認證授權邏輯（JWT、Session、RBAC 等）
- `api-design.md` - API 設計原則（RESTful 規範、錯誤處理、版本管理）
- `api-{domain}.md` - 各領域的 API 規格（如 api-users.md, api-videos.md）
- `service-{name}.md` - 特定業務邏輯服務（如 service-video-processing.md）
- `background-jobs.md` - 背景任務設計
- `integrations.md` - 第三方整合
- `caching.md` - 快取策略
- `security.md` - 安全措施
- `testing.md` - 測試策略

**Frontend 拆分原則：**
- `overview.md` - 整體架構、技術棧、資料夾結構
- `routing.md` - 路由設計與導航邏輯
- `state.md` - 狀態管理策略（Store 設計、資料流）
- `api-integration.md` - API 呼叫與錯誤處理
- `page-{name}.md` - 各頁面的詳細規格（如 page-home.md, page-upload.md）
- `component-{name}.md` - 主要共用元件規格（如 component-video-player.md）
- `styling.md` - UI/UX 規範、主題、響應式設計
- `performance.md` - 效能優化策略
- `accessibility.md` - 無障礙設計（a11y）
- `testing.md` - 測試策略

**檔案大小控制：**
- 單個文件建議 100-300 行
- 如果內容過多，繼續細分（如 api-users.md 太長可拆成 api-users-auth.md, api-users-profile.md）
- 如果內容過少，考慮合併相關模塊

### Step 3: 品質檢查

在拆分前，檢查並記錄以下問題：

**完整性檢查：**
- [ ] 所有產品功能都有對應的技術規格？
- [ ] API endpoints 是否完整定義？
- [ ] 資料模型是否涵蓋所有實體？
- [ ] 錯誤處理是否完整？
- [ ] 測試要求是否明確？

**一致性檢查：**
- [ ] Backend 與 Frontend spec 是否一致？
- [ ] API 定義與資料模型是否匹配？
- [ ] 是否與 framework.md 一致？
- [ ] 命名慣例是否統一？

**清晰度檢查：**
- [ ] 是否有模糊不清的描述？
- [ ] 是否有缺少細節的部分？
- [ ] 是否有需要補充範例的地方？

**最佳實踐檢查：**
- [ ] 是否符合 RESTful 設計原則？
- [ ] 資料庫設計是否正規化？
- [ ] 是否考慮到效能與安全性？
- [ ] 是否有適當的錯誤處理？

如果發現問題，請：
1. 明確指出問題所在
2. 提供修正建議
3. 在拆分時一併修正

### Step 4: 執行拆分

**創建資料夾結構：**
```bash
mkdir -p tech-specs/backend
mkdir -p tech-specs/frontend
```

**拆分並寫入文件：**
- 將內容按照規劃的模塊拆分
- 每個文件有清楚的標題與說明
- 在文件間使用相對路徑互相引用
- 保持內容的邏輯完整性

### Step 5: 生成索引文件

**Backend Index (`tech-specs/backend/_index.md`)：**
```markdown
# Backend Specification Index

本專案的後端技術規格文件組織。

## 核心架構
- [overview.md](./overview.md) - 整體架構、技術棧、資料夾結構
- [database.md](./database.md) - 資料庫設計、Schema、關聯、索引
- [auth.md](./auth.md) - 認證授權邏輯、JWT、權限管理

## API 規格
- [api-design.md](./api-design.md) - API 設計原則與規範
- [api-{domain}.md](./api-{domain}.md) - 各領域 API endpoints

## 業務邏輯
- [service-{name}.md](./service-{name}.md) - 各業務邏輯服務

## 基礎設施
- [background-jobs.md](./background-jobs.md) - 背景任務
- [integrations.md](./integrations.md) - 第三方整合
- [caching.md](./caching.md) - 快取策略
- [security.md](./security.md) - 安全措施
- [testing.md](./testing.md) - 測試策略

---

**快速查找指南：**
- 尋找特定 API → 查看 [api-design.md](./api-design.md) 或對應領域的 api-*.md
- 資料結構相關 → 查看 [database.md](./database.md)
- 認證問題 → 查看 [auth.md](./auth.md)
- 業務流程 → 查看對應的 service-*.md
```

**Frontend Index (`tech-specs/frontend/_index.md`)：**
```markdown
# Frontend Specification Index

本專案的前端技術規格文件組織。

## 核心架構
- [overview.md](./overview.md) - 整體架構、技術棧、資料夾結構
- [routing.md](./routing.md) - 路由設計與導航邏輯
- [state.md](./state.md) - 狀態管理策略
- [api-integration.md](./api-integration.md) - API 呼叫與錯誤處理

## 頁面規格
- [page-{name}.md](./page-{name}.md) - 各頁面的詳細規格

## 元件規格
- [component-{name}.md](./component-{name}.md) - 主要共用元件

## UI/UX
- [styling.md](./styling.md) - UI/UX 規範、主題、響應式設計
- [accessibility.md](./accessibility.md) - 無障礙設計

## 品質與效能
- [performance.md](./performance.md) - 效能優化策略
- [testing.md](./testing.md) - 測試策略

---

**快速查找指南：**
- 尋找特定頁面 → 查看對應的 page-*.md
- 元件設計 → 查看對應的 component-*.md
- 狀態管理 → 查看 [state.md](./state.md)
- API 呼叫 → 查看 [api-integration.md](./api-integration.md)
- UI 樣式 → 查看 [styling.md](./styling.md)
```

索引文件應該：
- 列出所有模塊文件
- 簡短說明每個文件的內容
- 提供快速查找指南
- 使用相對路徑連結

### Step 6: 清理原始文件

在確認拆分完成且內容完整後：
```bash
rm tech-specs/backend-spec.md
rm tech-specs/frontend-spec.md
```

## 輸出報告

完成後，請提供以下資訊：

### 拆分統計
- Backend 拆分成多少個文件？
- Frontend 拆分成多少個文件？
- 平均每個文件多少行？

### 品質檢查結果
**發現的問題：**
- [ ] 完整性問題：（列出）
- [ ] 一致性問題：（列出）
- [ ] 清晰度問題：（列出）

**已修正的問題：**
- （列出已修正的問題）

**建議後續處理：**
- （列出需要用戶確認或後續處理的事項）

### 結構總覽
```
tech-specs/
├── framework.md
├── backend/
│   ├── _index.md
│   ├── overview.md
│   ├── database.md
│   ├── ... (列出所有文件)
│   └── testing.md
└── frontend/
    ├── _index.md
    ├── overview.md
    ├── routing.md
    ├── ... (列出所有文件)
    └── testing.md
```

## 注意事項

- ✅ 保持內容的完整性，不要遺漏資訊
- ✅ 在拆分時順便修正發現的問題
- ✅ 確保文件間的引用正確
- ✅ 索引文件要清晰易懂
- ✅ 檔案命名要有規律（api-*.md, page-*.md, service-*.md 等）
- ❌ 不要創建空文件
- ❌ 不要過度拆分導致碎片化
