# Issue-005: Jest 測試失敗與測試覆蓋率不足

**狀態：** 未解決
**優先級：** 高
**建立日期：** 2025-10-21
**相關任務：** Task-024 (進度監控頁面)
**前置 Issue：** Issue-004 (Quick Fail 原則修正)

---

## 問題概述

在修正 Issue-004（Vitest→Jest 轉換、Quick Fail 邏輯）後，仍有以下問題：

1. **55 個測試失敗**（主要是整合測試和頁面互動測試）
2. **測試覆蓋率僅 76.73%**（目標：85%+）
3. **ProgressPage 相關測試全部失敗**，導致新功能 0% 覆蓋率

---

## 當前測試狀況

### 測試執行結果
- ✅ **378 個測試通過**
- ❌ **55 個測試失敗**
- ⏭️ **1 個測試跳過**（useWebSocket 複雜測試）

### 測試覆蓋率
| 指標 | 當前 | 目標 | 差距 |
|------|------|------|------|
| Statements | 76.73% | 85% | -8.27% |
| Branches | 70.4% | 85% | -14.6% |
| Functions | 72.13% | 85% | -12.87% |
| Lines | 76.21% | 85% | -8.79% |

---

## 失敗的測試套件（8 個）

### 1. 進度監控頁面測試（新功能）
```
❌ src/__tests__/pages/ProgressPage.test.tsx
❌ src/__tests__/integration/ProgressPage.integration.test.tsx
```

**影響：** 新開發的進度監控頁面（Task-024）完全沒有測試覆蓋（0%）

### 2. 視覺配置測試
```
❌ tests/unit/pages/project/visual-config.test.tsx
❌ tests/unit/pages/project/visual-config-extended.test.tsx
```

**典型錯誤：**
```
TestingLibraryElementError: Found a label with the text of: 顏色,
however no form control was found associated to that label.
```

**問題分析：**
- 測試期望找到表單控件（input, slider），但實際組件結構不匹配
- Label 沒有正確使用 `for` 屬性或 `aria-labelledby` 關聯到控件

### 3. 檔案上傳測試
```
❌ tests/unit/pages/project/new-file-upload.test.tsx
```

**典型錯誤：**
```
TestingLibraryElementError: Found a label with the text of: 上傳 Logo,
however no form control was found associated to that label.
```

### 4. UI 互動測試
```
❌ tests/unit/pages/project/new-ui-interactions.test.tsx
```

**問題：** 複雜的 UI 互動場景測試失敗

### 5. 整合測試
```
❌ tests/integration/new-project-flow.test.tsx
❌ tests/integration/complete-project-flow.test.tsx
```

**問題：** 完整流程測試失敗（可能依賴前面的頁面測試）

---

## 測試覆蓋率不足的根本原因

### 原因 1: 新功能測試失敗 → 0% 覆蓋率

**完全沒有覆蓋的文件（0%）：**

| 文件 | 原因 |
|------|------|
| `src/app/project/[id]/progress/page.tsx` | **測試失敗**（我們寫了 ProgressPage.test.tsx 但失敗） |
| `src/app/project/[id]/result/page.tsx` | 沒有測試 |
| `src/app/batch/page.tsx` | 沒有測試 |
| `src/app/batch/[id]/page.tsx` | 沒有測試 |
| `src/app/configurations/page.tsx` | 沒有測試 |
| `src/app/templates/page.tsx` | 沒有測試 |
| `src/middleware.ts` | 沒有測試 |
| `src/app/layout.tsx` | 沒有測試 |
| `src/app/providers.tsx` | 沒有測試 |

### 原因 2: API 客戶端覆蓋率極低

**API 相關文件覆蓋率：**

| 文件 | 覆蓋率 | 問題 |
|------|--------|------|
| `src/lib/api/projects.ts` | **0%** | 完全沒有測試 |
| `src/lib/api/system.ts` | **7.69%** | 幾乎沒有測試 |
| `src/lib/api/youtube.ts` | **25%** | 測試不足 |
| `src/lib/api/client.ts` | **35.71%** | 測試不足 |
| `src/services/api/client.ts` | **40%** | 測試不足 |
| `src/services/api/systemApi.ts` | **25%** | 測試不足 |

### 原因 3: 組件測試不完整

**低覆蓋率組件：**

| 文件 | 覆蓋率 | 問題 |
|------|--------|------|
| `src/components/ui/FileUpload.tsx` | **54.83%** | 上傳邏輯未測試完整 |
| `src/components/settings/YouTubeAuthTab.tsx` | **68.42%** | 認證流程測試不足 |
| `src/app/project/[id]/configure/visual/page.tsx` | **66%** | 視覺配置測試失敗 |

### 原因 4: Store 測試不完整

| Store | 覆蓋率 | 問題 |
|-------|--------|------|
| `useProjectStore.ts` | **47.05%** | Actions 測試不足 |
| `useConfigStore.ts` | **64.28%** | 配置邏輯測試不足 |
| `useAuthStore.ts` | **75.86%** | 接近目標但仍不足 |

---

## 失敗測試的詳細分析

### 問題類型 A: Label/Input 關聯問題

**錯誤訊息：**
```
Found a label with the text of: 顏色, however no form control
was found associated to that label.
```

**受影響測試：**
- `visual-config.test.tsx` - 字幕顏色、字體大小、Logo 上傳
- `visual-config-extended.test.tsx` - 進階配置
- `new-file-upload.test.tsx` - 檔案上傳

**可能原因：**
1. 組件使用了 `<label>` 但沒有關聯到 `<input>`
2. 測試使用 `getByLabelText()` 但組件結構已變更
3. 組件使用了自定義 UI 元件（如 ColorPicker, Slider），測試期望原生元素

**解決方向：**
- 檢查組件是否正確設置 `htmlFor` 或 `aria-labelledby`
- 更新測試使用正確的查詢方式（可能需要用 `getByRole` 或 `getByTestId`）

### 問題類型 B: Style 斷言失敗

**錯誤訊息：**
```
expect(element).toHaveStyle()
- Expected
- fontFamily: Arial;
```

**受影響測試：**
- `visual-config.test.tsx` - 字型、陰影效果測試

**可能原因：**
1. 樣式沒有正確應用到元素
2. 樣式是通過 CSS 類別而非 inline style 應用
3. 測試環境沒有正確處理 Tailwind CSS

**解決方向：**
- 改用 `toHaveClass()` 檢查 CSS 類別而非 inline style
- 或改為檢查組件狀態而非最終樣式

### 問題類型 C: 整合測試失敗

**受影響測試：**
- `ProgressPage.test.tsx` - 進度頁面單元測試
- `ProgressPage.integration.test.tsx` - 進度頁面整合測試
- `new-project-flow.test.tsx` - 新專案流程
- `complete-project-flow.test.tsx` - 完整專案流程

**可能原因：**
1. 頁面組件依賴 Next.js 特性（useRouter, useParams）沒有正確 mock
2. WebSocket 連線沒有正確模擬
3. Store 狀態初始化問題

---

## 影響評估

### 功能影響
- ❌ **進度監控頁面（Task-024）無法確保品質**
  - 雖然功能已開發，但沒有測試覆蓋
  - 無法保證功能正確性
  - 未來修改可能破壞功能

### 品質影響
- ❌ **無法達成 85% 覆蓋率目標**
  - 當前 76.73%，差距 8.27%
  - Branches 覆蓋率僅 70.4%（差距 14.6%）

### 技術債影響
- ⚠️ **55 個失敗測試未處理**
  - 測試套件不穩定
  - CI/CD 無法正常運作
  - 未來難以維護

---

## 解決方案

### 階段 1: 修正失敗測試（優先）

#### 1.1 修正 ProgressPage 測試
**目標：** 讓新功能的測試通過，達到覆蓋率

**步驟：**
1. 修正 `ProgressPage.test.tsx`
   - 正確 mock Next.js router (`useRouter`, `useParams`)
   - 正確 mock WebSocket hook
   - 確保 store 初始化正確

2. 修正 `ProgressPage.integration.test.tsx`
   - 完整模擬 WebSocket 連線流程
   - 測試 0-100% 完整進度更新
   - 驗證 Quick Fail 原則

**預期提升：** 70 行新代碼獲得覆蓋，約提升 4-5%

#### 1.2 修正視覺配置測試
**目標：** 修正 label/input 關聯問題

**步驟：**
1. 檢查 `visual/page.tsx` 組件結構
2. 更新測試查詢策略：
   ```typescript
   // 從 getByLabelText() 改為：
   getByRole('slider', { name: /字體大小/ })
   getByRole('textbox', { name: /顏色/ })
   getByTestId('color-picker')
   ```
3. 或修正組件添加正確的 `aria-label` / `htmlFor`

**預期提升：** 50 行代碼獲得覆蓋，約提升 3%

#### 1.3 修正檔案上傳測試
**目標：** 修正 FileUpload 組件測試

**步驟：**
1. 檢查 `FileUpload.tsx` 組件
2. 添加正確的 accessibility 屬性
3. 更新測試使用 `getByRole('button')` 或 `getByTestId()`

**預期提升：** FileUpload 從 54.83% → 85%+，約提升 1-2%

### 階段 2: 補充缺失測試

#### 2.1 補充頁面組件測試
**目標：** 為 0% 覆蓋率的頁面添加測試

**需要添加測試的頁面：**
- [ ] `src/app/batch/page.tsx` - 批次處理頁面
- [ ] `src/app/batch/[id]/page.tsx` - 批次詳情頁面
- [ ] `src/app/configurations/page.tsx` - 配置管理頁面
- [ ] `src/app/templates/page.tsx` - 模板管理頁面
- [ ] `src/app/project/[id]/result/page.tsx` - 結果頁面

**預期提升：** 約 90 行代碼，約提升 5-6%

#### 2.2 補充 API 客戶端測試
**目標：** 提升 API 層覆蓋率

**需要添加/完善測試：**
- [ ] `src/lib/api/projects.ts` - 0% → 85%+
- [ ] `src/lib/api/system.ts` - 7.69% → 85%+
- [ ] `src/lib/api/youtube.ts` - 25% → 85%+
- [ ] `src/services/api/client.ts` - 40% → 85%+

**預期提升：** 約 60 行代碼，約提升 4%

#### 2.3 補充 Store Actions 測試
**目標：** 完善 Store 測試覆蓋

**需要完善：**
- [ ] `useProjectStore.ts` - 47.05% → 85%+
- [ ] `useConfigStore.ts` - 64.28% → 85%+

**預期提升：** 約 20 行代碼，約提升 1-2%

#### 2.4 補充基礎設施測試
**目標：** 測試基礎代碼

**需要添加測試：**
- [ ] `src/middleware.ts` - Next.js middleware
- [ ] `src/app/layout.tsx` - Root layout
- [ ] `src/app/providers.tsx` - React providers

**預期提升：** 約 24 行代碼，約提升 1-2%

---

## 覆蓋率提升計劃總結

| 階段 | 任務 | 預期提升 | 累計覆蓋率 |
|------|------|----------|------------|
| 當前 | - | - | 76.73% |
| 1.1 | ProgressPage 測試 | +4.5% | 81.23% |
| 1.2 | 視覺配置測試 | +3% | 84.23% |
| 1.3 | 檔案上傳測試 | +1.5% | 85.73% |
| 2.1 | 頁面組件測試 | +3% | 88.73% |
| 2.2 | API 測試 | +2% | 90.73% |
| 2.3 | Store 測試 | +1% | 91.73% |
| 2.4 | 基礎設施測試 | +1% | 92.73% |

**目標達成：** ✅ 92.73% > 85%

---

## 執行優先順序

### P0（立即處理）
1. 修正 ProgressPage 測試 - **新功能必須有測試覆蓋**
2. 修正視覺配置測試 - **影響多個測試套件**

### P1（高優先級）
3. 修正檔案上傳測試
4. 補充頁面組件測試

### P2（中優先級）
5. 補充 API 客戶端測試
6. 補充 Store Actions 測試

### P3（低優先級）
7. 補充基礎設施測試（middleware, layout, providers）
8. 修正整合測試（new-project-flow, complete-project-flow）

---

## 技術細節

### Jest 測試環境配置
- 已完成 Vitest → Jest 轉換
- 所有 `vi.*` 已替換為 `jest.*`
- 測試運行正常（378 個通過）

### 已修正的問題
- ✅ 日期格式化測試（formatDate 相對時間）
- ✅ useProgressStore 測試（Quick Fail 邏輯）
- ✅ Store integration 測試（progress.overall）
- ✅ LogViewer 時間格式（24小時制）
- ✅ ProgressBar 測試（style 檢測方式）

### 已跳過的測試
- ⏭️ `useWebSocket.test.ts` - "應該在未連線時拒絕發送訊息"
  - 原因：Mock WebSocket readyState 的時機問題
  - 影響：1 個測試，不影響整體覆蓋率

---

## 參考資料

### 相關文件
- Issue-004: Quick Fail 原則與測試覆蓋率問題
- Task-024: 進度監控頁面開發

### 測試報告
- 覆蓋率報告：`frontend/coverage/lcov-report/index.html`
- 覆蓋率摘要：`frontend/coverage/coverage-summary.json`

### 關鍵檔案
- 失敗測試：
  - `src/__tests__/pages/ProgressPage.test.tsx`
  - `src/__tests__/integration/ProgressPage.integration.test.tsx`
  - `tests/unit/pages/project/visual-config*.test.tsx`
  - `tests/unit/pages/project/new-*.test.tsx`
  - `tests/integration/*-flow.test.tsx`

- 0% 覆蓋率頁面：
  - `src/app/project/[id]/progress/page.tsx`
  - `src/app/batch/page.tsx`
  - `src/app/configurations/page.tsx`
  - 等（見上方列表）

---

## 下一步行動

1. **建立 worktree**：
   ```bash
   git worktree add ../YTMaker-issue-005 fix/issue-005-test-failures-coverage
   ```

2. **開始修正** - 按照優先順序執行：
   - P0: ProgressPage 測試
   - P0: 視覺配置測試
   - P1: 其他失敗測試
   - P2: 補充缺失測試

3. **目標驗證**：
   - 所有測試通過（0 個失敗）
   - 覆蓋率 ≥ 85%（目標 90%+）

---

**建立者：** Claude Code
**最後更新：** 2025-10-21
