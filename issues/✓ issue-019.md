# [已解決] Issue-019: 主控台頁面無法載入 - API 導入路徑錯誤

## 基本資訊
- **優先級：** P0 緊急
- **類型：** Bug
- **發現時機：** 前端開發測試
- **相關 Task:** Task-001 (專案初始化)
- **相關 Spec:** `tech-specs/frontend/page-dashboard.md`

## 問題描述

### 簡述
主控台頁面 (`src/app/page.tsx`) 無法正常載入，瀏覽器控制台顯示 `statsApi` 和 `projectsApi` 無法從 `@/services/api` 導入。

### 詳細說明
前端主控台頁面嘗試導入 API 函數時發生錯誤。

**前端錯誤訊息：**
```
./src/app/page.tsx
Attempted import error: 'statsApi' is not exported from '@/services/api' (imported as 'statsApi').

./src/app/page.tsx
Attempted import error: 'projectsApi' is not exported from '@/services/api' (imported as 'projectsApi').
```

**當前導入路徑 (page.tsx:10)：**
```typescript
import { projectsApi, statsApi } from '@/services/api'
```

**實際檔案結構：**
- `/services/api.ts` - 只導出 `apiClient`（axios 實例）
- `/services/api/index.ts` - 正確導出 `projectsApi` 和 `statsApi`
- `/services/api/projects.ts` - 定義 `projectsApi`
- `/services/api/stats.ts` - 定義 `statsApi`

### 發現時機
- 訪問主控台頁面時
- 前端服務啟動後立即發生

## 重現步驟

### 前置條件
1. 前端服務運行在 `http://localhost:3000`
2. 後端服務運行在 `http://localhost:8000`

### 步驟
1. 訪問 `http://localhost:3000`
2. 觀察瀏覽器控制台

### 實際結果
- 頁面無法正常載入
- 控制台顯示導入錯誤
- `statsApi` 和 `projectsApi` 未定義

### 預期結果
- 頁面正常載入
- 統計資料和專案列表正確顯示
- 無錯誤訊息

### 參考檔案
- 錯誤檔案：`frontend/src/app/page.tsx`
- 錯誤導入：`frontend/src/services/api.ts`
- 正確導入：`frontend/src/services/api/index.ts`

### 錯誤訊息
```
Attempted import error: 'statsApi' is not exported from '@/services/api' (imported as 'statsApi').
Attempted import error: 'projectsApi' is not exported from '@/services/api' (imported as 'projectsApi').
```

## 影響評估

### 影響範圍
- **前端：** `frontend/src/app/page.tsx`
- **功能：** 主控台頁面完全無法使用

### 頻率
- 100% 重現率
- 每次訪問主控台都會發生

### 嚴重程度
- **高** - 主要功能頁面無法使用

### 替代方案
- 無替代方案
- 必須修復才能使用主控台

## 根因分析

### 問題類型
- **導入路徑錯誤 (Import Path Error)**

### 根本原因
`page.tsx` 使用了錯誤的導入路徑，指向了不存在相應導出的檔案。

**當前錯誤的導入 (page.tsx:10)：**
```typescript
import { projectsApi, statsApi } from '@/services/api'
// 指向 /services/api.ts，但該檔案只導出 apiClient
```

**實際應該使用的路徑：**
```typescript
import { projectsApi, statsApi } from '@/services/api/index'
// 或更簡潔：
import { projectsApi, statsApi } from '@/services/api/'
```

**實際檔案結構分析：**

`/services/api.ts` 內容：
```typescript
// 只導出 axios 實例
export default apiClient
```

`/services/api/index.ts` 內容：
```typescript
export * from './axios'
export * from './projects'
export * from './stats'

// 明確導出 API 對象
export { projectsApi } from './projects'
export { statsApi } from './stats'
```

### 問題來源追溯

1. **檔案結構重構**
   - API 相關代碼從單一檔案重構為模塊化結構
   - `/services/api/` 目錄下的檔案未被正確引用

2. **導入路徑未更新**
   - `page.tsx` 仍使用舊的導入路徑
   - 沒有更新到新的模塊化結構

## 解決方案

### 方案概述
修正 `page.tsx` 的導入路徑，從 `@/services/api` 改為 `@/services/api/`。

### 詳細步驟

#### 1. 更新 `page.tsx` 的導入路徑

**修改前 (page.tsx:10)：**
```typescript
import { projectsApi, statsApi } from '@/services/api'
```

**修改後：**
```typescript
import { projectsApi, statsApi } from '@/services/api/'
```

### Spec 更新需求
- ✅ 需要檢查其他頁面是否有相同問題
- ✅ 確認所有 API 導入路徑使用一致的模式

### 程式碼變更計劃

**檔案清單：**
1. `frontend/src/app/page.tsx` - 修正導入路徑 ✓

### 測試計劃

#### 手動測試
1. 啟動前端服務
2. 訪問 `http://localhost:3000`
3. 驗證：
   - ✓ 頁面正常載入，無控制台錯誤
   - ✓ 統計資料正常顯示
   - ✓ 專案列表正常顯示

#### 檢查其他檔案
```bash
# 搜尋其他可能有相同問題的檔案
grep -r "from '@/services/api'" frontend/src --include="*.tsx" --include="*.ts"
```

### 風險評估

**風險：**
- 🟢 低風險：只需修改一行導入路徑
- 🟡 中風險：可能有其他檔案也有相同問題

**緩解措施：**
- 搜尋整個前端程式碼，確認沒有其他地方使用錯誤路徑
- 測試所有主要功能頁面

## 預防措施

### 如何避免類似問題

1. **導入路徑一致性**
   - 在重構檔案結構時，一併更新所有導入路徑
   - 使用 IDE 的重構功能而非手動修改

2. **自動化檢查**
   - 使用 ESLint 規則檢查導入路徑
   - TypeScript 編譯時檢查導出是否存在

3. **Code Review 檢查清單**
   - 檔案結構變更時，必須檢查所有導入路徑
   - PR 必須包含相關頁面的測試截圖

### 需要改進的流程

1. **開發流程改進**
   - 重構時使用 IDE 的自動重構功能
   - 確保所有導入路徑都已更新

2. **測試流程改進**
   - 每次修改後啟動開發服務器檢查
   - 確保無控制台錯誤

---

## 解決狀態
- [x] 程式碼已修改
- [x] 測試已通過
- [x] 問題已驗證解決

## 驗證結果

### 修改內容 (2025-10-24)

**修改檔案：**
1. `frontend/src/app/page.tsx` - 修正導入路徑
2. `frontend/src/__tests__/integration/dashboard.integration.test.tsx` - 修正導入路徑和 mock 路徑

**修改前：**
```typescript
import { projectsApi, statsApi } from '@/services/api'
```

**修改後：**
```typescript
import { projectsApi, statsApi } from '@/services/api/'
```

### 測試結果

**前端服務啟動測試：**
```
✓ Next.js 成功啟動
✓ 無編譯錯誤
✓ 無導入路徑錯誤
✓ Ready in 2.3s
```

**結果：** ✅ 成功
- 前端服務正常啟動
- 無控制台錯誤
- 主控台頁面可正常載入
