# Issue-005: 剩餘測試失敗與後端整合測試問題

**狀態：** 進行中
**優先級：** 中
**建立日期：** 2025-10-21
**更新日期：** 2025-10-22
**相關任務：** Task-024 (進度監控頁面)
**前置 Issue：** Issue-004 (ProgressPage 測試修正 - ✅ 已完成)

---

## 問題概述

Issue-004 已完成 ProgressPage 所有測試（12/12 通過），但在檢查過程中發現：

1. **前端：55 個其他測試失敗**（與 task-024 無關，是視覺配置頁面的問題）
2. **後端：3 個整合測試失敗**（後端代碼 import 路徑錯誤）

---

## Issue-004 完成總結 ✅

### 已修正並完成
- ✅ ProgressPage 單元測試：11/11 通過
- ✅ ProgressPage 整合測試：1/1 通過
- ✅ 測試覆蓋率提升：83.1% → 87.4% (+4.3%)
- ✅ 新增 74 個測試
- ✅ 修正 Zustand store mocks（使用動態 getters）
- ✅ 修正 WebSocket mock 實作
- ✅ 整合測試使用真實 store 解決 re-render 問題

### Commits
```
f947dcc - fix: 完成 ProgressPage 整合測試 - 使用真實 Zustand store
a780bd7 - fix: 修正測試 6 並達成 11/11 全部通過
9468512 - fix: 修正 ProgressPage 單元測試 - 10/11 通過
```

---

## 當前測試狀況（2025-10-22）

### 前端測試執行結果
- ✅ **390 個測試通過**（+81 compared to baseline）
- ❌ **55 個測試失敗**（全部與視覺配置頁面相關）
- 📊 **總測試數：445** (原本 372，新增 74 個)
- 📊 **測試通過率：87.4%** (原本 83.1%)

### 後端測試執行結果
- ✅ **1 個測試通過**（WebSocket 連線持久性）
- ❌ **3 個測試失敗**（Celery-WebSocket 整合）
- 📊 **測試通過率：25%**

---

## 問題分析

### 前端問題：55 個失敗測試（視覺配置頁面）

#### 失敗的測試套件（6 個）

**位置：** `tests/unit/pages/project/` 和 `tests/integration/`

| 測試套件 | 失敗數 | 類型 |
|---------|--------|------|
| `visual-config.test.tsx` | ~10 | 無障礙查詢錯誤 |
| `visual-config-extended.test.tsx` | ~5 | 無障礙查詢錯誤 |
| `new-file-upload.test.tsx` | ~14 | 無障礙查詢錯誤 |
| `new-ui-interactions.test.tsx` | ~15 | 無障礙查詢錯誤 |
| `new-project-flow.test.tsx` | ~6 | 整合測試失敗 |
| `complete-project-flow.test.tsx` | ~5 | 整合測試失敗 |

#### 典型錯誤訊息

```
TestingLibraryElementError: Found a label with the text of: 顏色,
however no form control was found associated to that label.
Make sure you're using the "for" attribute or "aria-labelledby" attribute correctly.
```

```
TestingLibraryElementError: Unable to find an accessible element with the role "slider" and name `/字體大小/`
```

#### 根本原因

**視覺配置頁面缺少正確的無障礙屬性：**

1. `<label>` 標籤缺少 `htmlFor` 屬性
2. `<input type="range">` 缺少 `aria-label` 屬性
3. `<input type="color">` 沒有正確關聯到 label

**範例（app/project/[id]/configure/visual/page.tsx）：**

```tsx
// ❌ 錯誤：label 沒有 htmlFor
<label className="block text-sm font-medium text-gray-700 mb-2">
  字體大小: {config.subtitle.font_size}px
</label>
<input
  type="range"
  min="20"
  max="100"
  value={config.subtitle.font_size}
  onChange={(e) => updateSubtitle({ font_size: parseInt(e.target.value) })}
  className="w-full"
/>

// ✅ 正確：添加 id 和 htmlFor
<label htmlFor="font-size" className="block text-sm font-medium text-gray-700 mb-2">
  字體大小: {config.subtitle.font_size}px
</label>
<input
  id="font-size"
  type="range"
  min="20"
  max="100"
  value={config.subtitle.font_size}
  onChange={(e) => updateSubtitle({ font_size: parseInt(e.target.value) })}
  className="w-full"
  aria-label="字體大小"
/>
```

#### 與 Task-024 的關係

**這些失敗測試與 task-024 (ProgressPage) 完全無關：**
- ❌ 不影響 ProgressPage 功能
- ❌ 不影響 task-024 完成狀態
- ⚠️ 但影響整體測試套件健康度

---

### 後端問題：3 個整合測試失敗

#### 失敗的測試

**位置：** `backend/tests/integration/test_celery_websocket.py`

| 測試 | 狀態 | 說明 |
|------|------|------|
| test_celery_task_progress_pushes_to_websocket | ❌ | 測試 8: Celery 任務進度推送 |
| test_celery_task_failure_notifies_websocket | ❌ | 測試 9: Celery 任務失敗通知 |
| test_celery_task_retry_mechanism | ❌ | 測試重試機制 |
| test_websocket_connection_persistence | ✅ | 測試連線持久性 |

#### 錯誤訊息

```python
ModuleNotFoundError: No module named 'app.db'

During handling of the above exception, another exception occurred:
  File "app/tasks/batch_processing.py", line 8, in <module>
    from app.db.session import get_db
```

#### 根本原因

**後端代碼 import 路徑錯誤：**

**錯誤代碼（2 個檔案）：**
```python
# app/tasks/batch_processing.py:8
# app/tasks/video_generation.py:8
from app.db.session import get_db  # ❌ app.db 模組不存在
```

**正確代碼：**
```python
from app.core.database import get_db  # ✅
```

#### 已修正

**Commit：** `130a442 - fix: 修正 tasks 模組的 import 路徑錯誤`

**修正內容：**
- ✅ batch_processing.py: Line 8 修正
- ✅ video_generation.py: Line 8 修正
- ✅ 已推送到 develop branch

**修正後預期：**
- 🔄 Import 錯誤已解決
- ⏳ 但測試可能仍有其他問題需要調查（mock 結構問題）

---

## 解決方案

### 前端：修正視覺配置頁面無障礙屬性

#### 需要修正的檔案

**主要檔案：**
`app/project/[id]/configure/visual/page.tsx`

**需要修正的元素：**

1. **字體大小滑桿 (Line 192-206)**
```tsx
<div>
  <label htmlFor="font-size" className="block text-sm font-medium text-gray-700 mb-2">
    字體大小: {config.subtitle.font_size}px
  </label>
  <input
    id="font-size"
    type="range"
    min="20"
    max="100"
    value={config.subtitle.font_size}
    onChange={(e) => updateSubtitle({ font_size: parseInt(e.target.value) })}
    className="w-full"
    aria-label="字體大小"
  />
</div>
```

2. **顏色選擇器 (Line 208-218)**
```tsx
<div>
  <label htmlFor="font-color" className="block text-sm font-medium text-gray-700 mb-2">
    顏色
  </label>
  <input
    id="font-color"
    type="color"
    value={config.subtitle.font_color}
    onChange={(e) => updateSubtitle({ font_color: e.target.value })}
    className="w-full h-10 rounded border"
  />
</div>
```

3. **Logo 上傳 (需要檢查 FileUpload 組件)**

**預期影響：**
- 修正 ~55 個失敗測試
- 測試通過率：87.4% → 100%
- 改善頁面無障礙性

---

### 後端：調查整合測試失敗原因

#### 已完成
- ✅ 修正 import 路徑錯誤（2 個檔案）

#### 待調查
測試失敗可能還有其他原因：

1. **Mock 結構問題**
   - 測試使用 `patch('app.tasks.video_generation.generate_video')`
   - 可能需要調整 mock 的方式

2. **測試本身的問題**
   - 測試是否符合實際代碼結構
   - 是否需要更新測試邏輯

3. **Celery 配置問題**
   - 測試環境是否正確設置
   - 是否需要真實的 Celery worker

---

## 執行計劃

### 階段 1：Issue-004 結案 ✅

- [x] 合併 fix/issue-004-jest-conversion 到 develop
- [x] 推送到 GitHub
- [x] 刪除 worktree 和分支
- [x] 更新 issue-004.md 狀態為「已解決」

### 階段 2：修正前端無障礙問題

**優先級：** P1（中優先級）

**原因：** 不影響 task-024 核心功能，但影響測試套件健康度

**步驟：**
1. 開新 worktree: `fix/issue-005-accessibility`
2. 修正 visual/page.tsx 添加無障礙屬性
3. 執行測試驗證修正
4. 提交並合併

**預期成果：**
- 390/445 → 445/445 測試通過
- 測試通過率：87.4% → 100%

### 階段 3：調查後端測試失敗

**優先級：** P2（低優先級）

**原因：** import 錯誤已修正，剩餘問題可能是測試本身的問題

**步驟：**
1. 在 develop branch 執行後端測試
2. 查看詳細錯誤訊息
3. 判斷是代碼問題還是測試問題
4. 根據分析決定修正方向

---

## 影響評估

### Task-024 狀態
✅ **已完成** - ProgressPage 所有測試通過（12/12）

### 測試狀態對比

| 指標 | Baseline | Issue-004 完成後 | 變化 |
|------|----------|-----------------|------|
| 前端測試數 | 372 | 446 | **+74** |
| 前端通過數 | 309 | 390 | **+81** |
| 前端失敗數 | 63 | 55 | **-8** |
| 前端通過率 | 83.1% | 87.4% | **+4.3%** |
| 失敗測試套件 | 16 | 6 | **-10** |

### 剩餘問題影響
- ⚠️ 55 個前端失敗測試（視覺配置頁面）
- ⚠️ 3 個後端失敗測試（整合測試）
- ✅ 不影響 task-024 功能
- ✅ ProgressPage 測試 100% 通過

---

## 參考資料

### 相關 Issues
- Issue-004: ProgressPage 測試修正（✅ 已完成）

### 相關 Tasks
- Task-024: 進度監控頁面開發（✅ 前端測試完成）

### Commits
**Issue-004 完成：**
- d524866 - Merge fix/issue-004-jest-conversion into develop

**後端修正：**
- 130a442 - fix: 修正 tasks 模組的 import 路徑錯誤

### 關鍵檔案
**前端：**
- 失敗測試：`tests/unit/pages/project/visual-config*.test.tsx`
- 需修正組件：`app/project/[id]/configure/visual/page.tsx`

**後端：**
- 失敗測試：`tests/integration/test_celery_websocket.py`
- 已修正檔案：`app/tasks/batch_processing.py`, `app/tasks/video_generation.py`

---

**建立者：** Claude Code
**最後更新：** 2025-10-22
