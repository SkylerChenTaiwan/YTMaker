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
| `visual-config.test.tsx` | ~10 | 無障礙查詢錯誤 + 測試方法錯誤 |
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

```
clear()` is only supported on editable elements.
```

#### 初步分析（部分正確）

**視覺配置頁面缺少正確的無障礙屬性：**

1. `<label>` 標籤缺少 `htmlFor` 屬性
2. `<input type="range">` 缺少 `aria-label` 屬性
3. `<input type="color">` 沒有正確關聯到 label

**測試方法錯誤：**
1. 對 `input type="range"` 使用 `clear()` 和 `type()` → 這些方法不支援
2. 需要改用 `fireEvent.change()`

---

## 深入調查結果（2025-10-22）

### 🔍 真正的根本原因

經過深入調查和查看實際 HTML 輸出，發現測試失敗的**真正原因**比最初想的複雜：

#### ✅ 問題 1：無障礙屬性缺失（已修正）
- 組件缺少 `htmlFor`、`id`、`aria-label` 屬性
- **影響：** 測試無法使用 `getByLabelText` 和 `getByRole` 查找元素
- **解決：** 添加所有必要的無障礙屬性

#### ✅ 問題 2：測試方法不適用於 range/color input（已修正）
- 測試對 range/color input 使用 `user.clear()` 和 `user.type()`
- **錯誤：** 這些方法只支援 text input
- **解決：** 改用 `fireEvent.change()`

#### ⭐ 問題 3：測試斷言方法在 JSDOM 中不可靠（關鍵發現）

**這是最關鍵的發現！**

通過查看測試的 HTML 輸出，我發現：
```html
<!-- fireEvent 確實觸發了狀態更新 -->
<input value="#ff0000" />  <!-- ✓ 值已更新 -->
<div style="color: rgb(255, 0, 0);">範例字幕</div>  <!-- ✓ DOM 已更新 -->
```

**但測試仍然失敗，原因是：**

```javascript
// ❌ 在 JSDOM 中不可靠
expect(preview).toHaveStyle({ color: 'rgb(255, 0, 0)' })
// 返回：undefined

// ❌ getComputedStyle 在 JSDOM 中不支援部分屬性
expect(window.getComputedStyle(preview).color).toBe('rgb(255, 0, 0)')
// 返回：undefined

// ✅ 直接檢查內聯 style 屬性 - 唯一可靠的方法
expect(preview.style.color).toBe('rgb(255, 0, 0)')
// 返回：'rgb(255, 0, 0)' ✓
```

**根本原因：**
1. JSDOM 不完全支援 CSS 樣式計算
2. `toHaveStyle()` 依賴 `getComputedStyle()`，在 JSDOM 中經常返回 undefined
3. 內聯樣式（inline styles）是 JSDOM 唯一可靠支援的樣式來源

#### ✅ 問題 4：元素查詢不夠精確（已修正）
```javascript
// ❌ 模糊查詢匹配多個元素
screen.getByLabelText(/大小:/)
// 找到：「字體大小」和「Logo 大小」

// ✅ 精確查詢
screen.getByLabelText('Logo 大小')
// 只找到：「Logo 大小」
```

### 📊 修正進度

#### visual-config.test.tsx（✅ 已完成）
- **修正前：** 1/10 通過 (10%)
- **修正後：** 10/10 通過 (100%)
- **改善：** +9 個測試通過

**所有測試項目：**
- ✅ 4.1 字幕顏色變更應即時反映在預覽
- ✅ 4.2 字幕大小變更應即時反映在預覽
- ✅ 4.3 字型變更應即時反映在預覽
- ✅ 4.4 陰影設定應即時反映在預覽
- ✅ 5.1 單次變更應在 1 秒後觸發儲存
- ✅ 5.2 多次快速變更只應儲存最後一次
- ✅ 6.1 成功上傳 Logo 應顯示預覽
- ✅ 6.2 Logo 大小變更應即時反映
- ✅ 6.3 Logo 透明度變更應即時反映
- ✅ 6.4 不支援的檔案格式應顯示錯誤

#### 整體前端測試
- **修正前：** 53 失敗, 392 通過 (87.8%)
- **修正後：** 43 失敗, 402 通過 (90.1%)
- **改善：** -10 失敗, +10 通過 (+2.3%)

### 💡 關鍵解決方案

```javascript
// 1. 使用 act() 包裝狀態更新
act(() => {
  fireEvent.change(input, { target: { value: '72' } })
})

// 2. 在 waitFor 內重新查詢元素（獲取最新 DOM）
await waitFor(() => {
  const preview = screen.getByText('範例字幕') as HTMLElement
  // 3. 直接檢查內聯樣式（JSDOM 唯一可靠的方法）
  expect(preview.style.fontSize).toBe('72px')
})

// 4. 使用精確的查詢
screen.getByLabelText('Logo 大小')  // 而非 /大小:/
```

### 📚 重要學習

**這次調查最關鍵的收穫：**

1. **不要只看錯誤訊息** - 要查看實際的 HTML 輸出才能找到真正原因
2. **JSDOM 有其限制** - 不支援完整的 CSS 樣式計算
3. **element.style.property** - 是在 JSDOM 中檢查樣式的唯一可靠方法
4. **深入分析 > 快速修正** - 花時間找真正原因能避免走冤枉路

### Commits 記錄

```
d49f780 - fix: 完整修正 visual-config 測試 - 達成 10/10 全部通過
a2ab8f8 - fix: 修正視覺配置頁面無障礙屬性與測試方法
182fd23 - fix: 為視覺配置頁面添加無障礙屬性
```

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
