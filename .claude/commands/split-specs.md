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

**拆分並寫入文件（重要規則）：**

**✅ 必須做到：**
- 將**完整內容**複製到新文件（不能只寫引用）
- 包含所有程式碼範例、實作細節、配置範例
- 每個文件必須可以獨立閱讀，不需要查看原始 spec
- 保持內容的邏輯完整性
- 文件間可以互相引用（使用相對路徑）

**❌ 禁止做的：**
- ❌ 引用原始的 `backend-spec.md` 或 `frontend-spec.md`（它們即將被刪除）
- ❌ 使用「參考原始文件第 XXX 行」這種行號引用
- ❌ 寫「詳細規格請參考原始文件」然後不提供內容
- ❌ 創建空殼文件（只有標題和引用，沒有實際內容）

**✅ 正確的引用方式：**
```markdown
# component-architecture.md

完整的元件實作定義...（完整內容）

相關文檔：
- API 整合方式請參考 [api-integration.md](./api-integration.md)
- 狀態管理請參考 [state-management.md](./state-management.md)
```

**❌ 錯誤的引用方式：**
```markdown
# component-architecture.md

> 參考原始文件: frontend-spec.md 第 167-393 行  ← 禁止！

詳細規格請參考原始文件。  ← 禁止！
```

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

### Step 6: 拆分後品質驗證

**在刪除原始文件前，必須驗證每個拆分後的文件：**

**自動檢查（每個文件）：**
```bash
# 檢查檔案大小（太小表示可能只是引用）
ls -lh tech-specs/backend/*.md tech-specs/frontend/*.md
```

**手動檢查清單（抽樣 3-5 個文件）：**
- [ ] 檔案大小 > 1500 bytes（小於此值需特別檢查）
- [ ] 包含至少一個完整的程式碼範例或詳細說明
- [ ] 沒有「參考原始文件」或「frontend-spec.md 第 XXX 行」
- [ ] 可以獨立閱讀，理解該模塊的完整規格
- [ ] 文件間的引用使用相對路徑且指向拆分後的文件

**如果檢查失敗：**
1. 找出內容不足的文件
2. 從原始 spec 補充完整內容
3. 重新驗證

### Step 7: 備份原始文件（不要刪除）

⚠️ **重要：不要立即刪除原始文件，而是重新命名作為備份**

```bash
mv tech-specs/backend-spec.md tech-specs/backend-spec.BACKUP.md
mv tech-specs/frontend-spec.md tech-specs/frontend-spec.BACKUP.md
```

**保留備份的原因：**
- 如果後續發現拆分有遺漏，可以對比原始文件
- 等確認所有 tasks 生成無誤後再刪除
- 可以在 git commit 時比較拆分前後差異

**何時刪除備份：**
- Phase 1 所有 tasks 重新生成完成
- 確認新 tasks 質量良好
- 確認沒有內容遺漏

```bash
# 屆時執行
rm tech-specs/backend-spec.BACKUP.md
rm tech-specs/frontend-spec.BACKUP.md
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

## 拆分品質範例

### ✅ 優秀範例（完整內容）

```markdown
# state-management.md

## 全域狀態設計

### useProjectStore

**完整實作：**
```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Project {
  id: string
  title: string
  status: 'draft' | 'generating' | 'completed'
  // ... 完整類型定義
}

interface ProjectState {
  projects: Project[]
  currentProject: Project | null

  // Actions
  addProject: (project: Project) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  deleteProject: (id: string) => void
  setCurrentProject: (id: string | null) => void
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],
      currentProject: null,

      addProject: (project) =>
        set((state) => ({
          projects: [...state.projects, project]
        })),

      updateProject: (id, updates) =>
        set((state) => ({
          projects: state.projects.map(p =>
            p.id === id ? { ...p, ...updates } : p
          )
        })),

      // ... 完整實作
    }),
    {
      name: 'project-store',
      partialize: (state) => ({ projects: state.projects })
    }
  )
)
```

**使用範例：**
```typescript
const { projects, addProject } = useProjectStore()

// 新增專案
addProject({
  id: 'proj_001',
  title: '我的專案',
  status: 'draft'
})
```

**測試要求：**
- 測試新增專案功能
- 測試狀態持久化
- 測試並發更新

**相關文檔：**
- API 整合請參考 [api-integration.md](./api-integration.md)
- 元件如何使用 store 請參考 [component-architecture.md](./component-architecture.md)
```

### ❌ 錯誤範例（只有引用）

```markdown
# state-management.md

> **參考原始文件:** frontend-spec.md 第 395-565 行
> **關聯文件:** [overview.md](./overview.md)

本文件定義了全域狀態設計、本地狀態管理。

完整內容請參考原始 `frontend-spec.md` 文件的以下章節：
- 3.1 全域狀態設計 (第 397-446 行)
- 3.2 本地狀態管理 (第 450-469 行)

## 全域 Zustand Stores

### useProjectStore

```typescript
interface ProjectStore {
  currentProject: Project | null
  projects: Project[]
  // ... 只有介面定義，沒有實作
}
```

---

詳細規格請參考原始文件。  ← 這是錯的！
```

**問題所在：**
- ❌ 引用了即將被刪除的 `frontend-spec.md`
- ❌ 引用特定行號（拆分後行號會改變）
- ❌ 沒有完整實作，只有介面定義
- ❌ 最後說「詳細規格請參考原始文件」但沒有提供內容
- ❌ 檔案太小（< 1500 bytes），明顯內容不足

---

## 注意事項

- ✅ **每個文件必須包含完整內容**（程式碼、範例、說明）
- ✅ **檔案大小通常 > 2000 bytes**（除非該模塊確實很簡單）
- ✅ 保持內容的完整性，不要遺漏資訊
- ✅ 在拆分時順便修正發現的問題
- ✅ 文件間可以互相引用（使用相對路徑）
- ✅ 索引文件要清晰易懂
- ✅ 檔案命名要有規律（api-*.md, page-*.md, service-*.md 等）
- ❌ **禁止引用原始 spec 文件**（backend-spec.md, frontend-spec.md）
- ❌ **禁止引用行號**（第 XXX 行）
- ❌ **禁止創建空殼文件**（只有引用沒有內容）
- ❌ 不要過度拆分導致碎片化
