# Issue-012: Flow-0 首次設定流程 UI 元素不匹配

> **建立日期:** 2025-10-23
> **優先級:** 🔴 P0 - 必須立即修復
> **狀態:** ⏳ 未解決
> **發現於:** Task-029E 真實環境測試

---

## 問題描述

在 Task-029E 的零 Mock 真實環境測試中，**Flow-0: 首次設定流程**的 2 個測試失敗，原因是前端實際的 UI 元素與測試預期不匹配。這會影響新用戶的首次使用體驗。

### 失敗的測試

**測試文件:** `tests/e2e/real/flow-0-setup.spec.ts`

#### 失敗 1: UI 文字不匹配
**測試案例:** `應該完整完成首次設定並進入主控台`
**錯誤:**
```
Expected substring: "歡迎使用 YTMaker"
Received string:    "YTMaker"
```

#### 失敗 2: 表單元素找不到
**測試案例:** `應該正確處理 API Key 無效的情況`
**錯誤:**
```
Timeout: page.fill: Timeout 30000ms exceeded.
waiting for locator('input[name="gemini_api_key"]')
```

---

## 重現步驟

### 測試 1: UI 文字不匹配

1. 啟動 frontend: `cd frontend && npm run dev`
2. 訪問: `http://localhost:3000/setup`
3. 執行測試:
   ```bash
   npx playwright test -c playwright.config.real.ts \
     tests/e2e/real/flow-0-setup.spec.ts:24
   ```
4. 觀察錯誤: 預期標題包含「歡迎使用 YTMaker」，但實際只有「YTMaker」

### 測試 2: 表單元素找不到

1. 訪問: `http://localhost:3000/setup/step/1`
2. 執行測試:
   ```bash
   npx playwright test -c playwright.config.real.ts \
     tests/e2e/real/flow-0-setup.spec.ts:156
   ```
3. 觀察錯誤: 找不到 `input[name="gemini_api_key"]` 元素

---

## 根本原因分析

### 問題 1: UI 文字不完整

**測試預期:**
```typescript
await expect(page.locator('h1')).toContainText('歡迎使用 YTMaker')
```

**實際前端:**
```tsx
// frontend/src/app/setup/page.tsx (推測)
<h1>YTMaker</h1>
```

**可能原因:**
- 前端只顯示「YTMaker」
- 或「歡迎使用」文字在其他元素中
- 或設計變更後測試沒有更新

### 問題 2: 表單元素名稱不一致

**測試預期:**
```typescript
await page.fill('input[name="gemini_api_key"]', 'invalid-key-12345')
```

**可能的實際前端:**
```tsx
// 可能使用了不同的 name
<input name="apiKey" />  // 或
<input name="geminiApiKey" />  // 或
<input id="gemini_api_key" />  // 只有 id 沒有 name
```

---

## 解決方案

### 方案 A: 修正前端 UI（推薦）

讓前端符合產品設計和測試預期。

#### 修正 1: 補齊歡迎文字

```tsx
// frontend/src/app/setup/page.tsx
export default function SetupPage() {
  return (
    <div>
      <h1>歡迎使用 YTMaker</h1>
      {/* 其他內容 */}
    </div>
  )
}
```

#### 修正 2: 統一表單元素名稱

```tsx
// frontend/src/app/setup/step/1/page.tsx
export default function SetupStep1() {
  return (
    <form>
      <input
        type="text"
        name="gemini_api_key"  // 確保 name 屬性正確
        placeholder="輸入 Gemini API Key"
      />
      {/* 其他欄位 */}
    </form>
  )
}
```

### 方案 B: 修正測試（不推薦，除非產品設計已變更）

如果產品設計確實已變更，更新測試：

```typescript
// tests/e2e/real/flow-0-setup.spec.ts

// 修正 1: 更新預期文字
await expect(page.locator('h1')).toContainText('YTMaker')

// 修正 2: 更新選擇器
await page.fill('input[name="apiKey"]', 'invalid-key-12345')
```

**⚠️ 注意:** 修改測試前，必須先確認產品設計是否真的變更了。否則應該修正前端以符合設計。

---

## 驗證測試

### 🎯 測試目標

確認以下功能全部正常運作：
1. 首次設定頁面顯示正確的歡迎文字
2. API Key 設定表單元素存在且可操作
3. 可以處理無效的 API Key
4. 可以跳過 YouTube 授權

### 📋 驗證步驟

#### 1. 執行自動化測試

```bash
cd /Users/skyler/coding/YTMaker-task-029E

# 執行所有 Flow-0 測試
npx playwright test -c playwright.config.real.ts \
  tests/e2e/real/flow-0-setup.spec.ts \
  --reporter=list

# 預期結果：✅ 3 passed (3/3)
```

#### 2. 驗證個別測試案例

```bash
# 測試 1: 完整設定流程
npx playwright test -c playwright.config.real.ts \
  tests/e2e/real/flow-0-setup.spec.ts:24 \
  --reporter=list
# 預期: ✅ passed

# 測試 2: 處理無效 API Key
npx playwright test -c playwright.config.real.ts \
  tests/e2e/real/flow-0-setup.spec.ts:156 \
  --reporter=list
# 預期: ✅ passed

# 測試 3: 允許跳過 YouTube 授權
npx playwright test -c playwright.config.real.ts \
  tests/e2e/real/flow-0-setup.spec.ts:168 \
  --reporter=list
# 預期: ✅ passed (此測試已經通過)
```

#### 3. 手動驗證 UI

```bash
# 1. 啟動應用
open http://localhost:3000

# 2. 驗證首頁重定向到 /setup
# 預期: 自動重定向到設定頁面

# 3. 驗證歡迎文字
# 預期: 看到 <h1>歡迎使用 YTMaker</h1>

# 4. 進入 API 設定步驟
open http://localhost:3000/setup/step/1

# 5. 驗證表單元素
# 預期: 看到 <input name="gemini_api_key" />
# 可以在開發者工具中確認：
# document.querySelector('input[name="gemini_api_key"]')
```

#### 4. 驗證錯誤處理

手動測試無效 API Key 的錯誤處理：

```bash
# 1. 訪問設定頁面
open http://localhost:3000/setup/step/1

# 2. 輸入無效的 API Key
# 輸入: "invalid-key-12345"

# 3. 點擊「測試連線」

# 4. 驗證錯誤訊息
# 預期: 顯示「API Key 無效」或類似錯誤訊息
```

### ✅ 通過標準

**此 Issue 被視為已解決，當且僅當：**

1. ✅ **所有自動化測試通過**
   ```bash
   npx playwright test tests/e2e/real/flow-0-setup.spec.ts
   結果: ✅ 3 passed
   ```

2. ✅ **UI 元素正確**
   - `<h1>` 包含「歡迎使用 YTMaker」文字
   - `<input name="gemini_api_key">` 元素存在

3. ✅ **錯誤處理正常**
   - 無效的 API Key 會顯示錯誤訊息
   - 錯誤訊息清楚易懂

4. ✅ **手動測試通過**
   - 可以完整走完設定流程
   - 所有步驟都正常運作

### 📊 測試執行記錄

| 日期 | 執行者 | 測試 1 | 測試 2 | 測試 3 | 備註 |
|------|--------|--------|--------|--------|------|
| 2025-10-23 | Claude | ❌ | ❌ | ✅ | 初始發現 |
| | | | | | |

---

## 查看詳細錯誤

```bash
cd /Users/skyler/coding/YTMaker-task-029E

# 查看測試 1 的 trace
npx playwright show-trace test-results/flow-0-setup-*-應該完整完成*-chromium/trace.zip

# 查看測試 1 的截圖
open test-results/flow-0-setup-*-應該完整完成*-chromium/test-failed-1.png

# 查看測試 2 的 trace
npx playwright show-trace test-results/flow-0-setup-*-應該正確處理*-chromium/trace.zip

# 查看測試 2 的截圖
open test-results/flow-0-setup-*-應該正確處理*-chromium/test-failed-1.png
```

---

## 相關資源

### 測試文件
- 測試檔案: `tests/e2e/real/flow-0-setup.spec.ts`
- 測試結果: `test-results/flow-0-setup-*-chromium/`

### 前端文件（推測位置）
- `frontend/src/app/setup/page.tsx` - 設定首頁
- `frontend/src/app/setup/step/1/page.tsx` - API 設定步驟

### 相關 Spec
- `product-design/flows.md` - Flow-0 產品流程定義
- `tech-specs/frontend/page-setup.md` - 設定頁面規格（如果存在）

---

## 時間估算

- 🔍 調查: 30 分鐘
- 🔧 修復: 1-2 小時
- ✅ 驗證: 30 分鐘
- **總計: 2-3 小時**

---

## 備註

這是新用戶的第一印象，雖然不像 Issue-011 那麼嚴重，但也應該盡快修復。建議在修復 Issue-011 後立即處理。

修復時建議：
1. 先檢查 `product-design/flows.md` 確認正確的 UI 文字
2. 確保所有表單元素都有正確的 `name` 屬性（不只是 `id`）
3. 與產品設計保持一致
