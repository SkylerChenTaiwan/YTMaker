# Issue-013: 資料持久化測試全部失敗（資料安全性風險）

> **建立日期:** 2025-10-23
> **優先級:** 🔴 P0 - 必須立即修復
> **狀態:** ⏳ 未解決
> **發現於:** Task-029E 真實環境測試

---

## 問題描述

在 Task-029E 的零 Mock 真實環境測試中，**所有 3 個資料持久化測試全部失敗**。這表示系統可能無法正確保存和恢復用戶資料，存在嚴重的資料安全性風險。

### 失敗的測試

**測試文件:** `tests/e2e/real/data-persistence.spec.ts`

#### 失敗 1: 重啟應用後資料應該保持
**測試案例:** `重啟應用後資料應該保持`
**執行時間:** 13.9秒失敗

#### 失敗 2: Cookie 過期後應該能重新設定
**測試案例:** `Cookie 過期後應該能重新設定`
**執行時間:** 11.5秒失敗

#### 失敗 3: 資料庫重啟後資料保持
**測試案例:** `資料庫重啟後資料保持`
**執行時間:** 352ms 快速失敗

### 影響範圍

- ⚠️ 用戶資料可能在重新整理後丟失
- ⚠️ 專案列表可能無法正確顯示
- ⚠️ 設定可能無法持久保存
- ⚠️ Cookie 管理可能有問題
- 🔴 **資料安全性風險**

---

## 重現步驟

### 測試 1: 重啟應用後資料應該保持

1. 執行測試：
   ```bash
   npx playwright test -c playwright.config.real.ts \
     tests/e2e/real/data-persistence.spec.ts:12
   ```

2. 觀察測試流程：
   - 訪問首頁並記錄專案數量
   - 重新載入頁面
   - 預期專案數量保持不變
   - **實際：測試失敗**

### 測試 2: Cookie 過期後應該能重新設定

1. 執行測試：
   ```bash
   npx playwright test -c playwright.config.real.ts \
     tests/e2e/real/data-persistence.spec.ts:58
   ```

2. 觀察：Cookie 相關功能異常

### 測試 3: 資料庫重啟後資料保持

1. 執行測試：
   ```bash
   npx playwright test -c playwright.config.real.ts \
     tests/e2e/real/data-persistence.spec.ts:75
   ```

2. 觀察：352ms 快速失敗（可能是環境或 API 問題）

---

## 根本原因分析

### 需要調查的方向

#### 1. 測試本身的問題

**可能原因：** 測試假設有現有資料，但測試環境是乾淨的

```typescript
// 測試期望
const projectsBefore = await page.locator('[data-testid="project-card"]').count()
console.log(`現有專案數: ${projectsBefore}`)

// 如果是乾淨環境
// projectsBefore = 0
// 重新載入後仍然是 0
// 測試應該通過才對...
```

**查看測試輸出：**
從測試日誌看到：
```
現有專案數: 0
✅ 重新載入後專案數量保持
```

這表示測試邏輯本身可能沒問題，問題可能在其他地方。

#### 2. 前端路由/狀態管理問題

**可能原因：** 訪問首頁時沒有正確重定向或載入資料

測試日誌顯示：
```
當前 URL: http://localhost:3000/setup
```

這表示即使在測試「重啟應用後資料應該保持」時，頁面仍然重定向到 `/setup`，而不是首頁 `/`。

**推測：**
- 可能 setup-completed cookie 沒有正確設定
- 或重新載入後 cookie 丟失
- 導致總是重定向回設定頁面

#### 3. Cookie 管理問題

測試試圖設定 cookie：
```typescript
await context.addCookies([{
  name: 'setup-completed',
  value: 'true',
  domain: 'localhost',
  path: '/'
}])
```

**可能問題：**
- Cookie 沒有被正確儲存
- 或重新載入後 cookie 被清除
- 或前端沒有正確讀取 cookie

#### 4. 資料庫連線問題

測試 3 快速失敗（352ms），可能是：
- 資料庫連線失敗
- API endpoint 不存在
- 權限問題

---

## 解決方案

### 階段 1: 調查（1-2 小時）

#### 1. 查看詳細 trace

```bash
cd /Users/skyler/coding/YTMaker-task-029E

# 查看測試 1 的詳細流程
npx playwright show-trace test-results/data-persistence-*-重啟應用*-chromium/trace.zip

# 查看測試 2
npx playwright show-trace test-results/data-persistence-*-Cookie*-chromium/trace.zip

# 查看測試 3
npx playwright show-trace test-results/data-persistence-*-資料庫*-chromium/trace.zip
```

#### 2. 檢查 Cookie 設定

手動測試 cookie 功能：

```bash
# 1. 訪問首頁
open http://localhost:3000

# 2. 在開發者工具 Console 中設定 cookie
document.cookie = "setup-completed=true; path=/; domain=localhost"

# 3. 重新整理頁面
# 預期: 不應該重定向到 /setup

# 4. 檢查 cookie 是否存在
console.log(document.cookie)
```

#### 3. 檢查前端路由邏輯

```bash
# 找到處理重定向的程式碼
cd frontend/src
grep -r "setup-completed" .
grep -r "redirect.*setup" .
```

#### 4. 檢查資料庫連線

```bash
# 檢查資料庫是否正常
sqlite3 backend/ytmaker.db "SELECT COUNT(*) FROM projects;"

# 檢查 backend 是否運行
curl http://localhost:8000/

# 檢查專案列表 API
curl http://localhost:8000/api/v1/projects
```

### 階段 2: 修復

根據調查結果，可能的修復方向：

#### 修復 A: Cookie 持久化問題

如果發現 cookie 沒有正確持久化：

```typescript
// frontend/src/middleware.ts 或類似文件
export function middleware(request: NextRequest) {
  const setupCompleted = request.cookies.get('setup-completed')

  // 確保 cookie 正確讀取
  if (!setupCompleted && !request.nextUrl.pathname.startsWith('/setup')) {
    return NextResponse.redirect(new URL('/setup', request.url))
  }

  return NextResponse.next()
}
```

#### 修復 B: 設定完成狀態管理

如果 cookie 不穩定，考慮用其他方式標記設定完成：

```typescript
// 選項 1: 儲存在 localStorage
localStorage.setItem('setup-completed', 'true')

// 選項 2: 儲存在資料庫
// 在 settings 表中加入 setup_completed 欄位

// 選項 3: 檢查是否有必要的設定
// 如果有 API Key 和 YouTube 授權，就視為完成設定
```

#### 修復 C: 測試預期調整

如果系統設計就是要在未設定完成時重定向，調整測試：

```typescript
test('重啟應用後資料應該保持', async ({ page, context }) => {
  // 先設定 setup-completed cookie
  await context.addCookies([{
    name: 'setup-completed',
    value: 'true',
    domain: 'localhost',
    path: '/'
  }])

  // 然後再訪問首頁
  await page.goto('http://localhost:3000')

  // 確認不會重定向到 setup
  await expect(page).toHaveURL('/')

  // 記錄專案數量
  const projectsBefore = await page.locator('[data-testid="project-card"]').count()

  // 重新載入
  await page.reload()

  // 驗證專案數量保持
  const projectsAfter = await page.locator('[data-testid="project-card"]').count()
  expect(projectsAfter).toBe(projectsBefore)
})
```

---

## 驗證測試

### 🎯 測試目標

確認以下功能全部正常運作：
1. 重新載入頁面後資料保持
2. Cookie 正確儲存和讀取
3. 設定完成狀態正確持久化
4. 資料庫資料在重啟後保持

### 📋 驗證步驟

#### 1. 執行自動化測試

```bash
cd /Users/skyler/coding/YTMaker-task-029E

# 執行所有資料持久化測試
npx playwright test -c playwright.config.real.ts \
  tests/e2e/real/data-persistence.spec.ts \
  --reporter=list

# 預期結果：✅ 3 passed (3/3)
```

#### 2. 驗證個別測試

```bash
# 測試 1: 重啟應用後資料保持
npx playwright test -c playwright.config.real.ts \
  tests/e2e/real/data-persistence.spec.ts:12 \
  --reporter=list
# 預期: ✅ passed

# 測試 2: Cookie 過期後能重新設定
npx playwright test -c playwright.config.real.ts \
  tests/e2e/real/data-persistence.spec.ts:58 \
  --reporter=list
# 預期: ✅ passed

# 測試 3: 資料庫重啟後資料保持
npx playwright test -c playwright.config.real.ts \
  tests/e2e/real/data-persistence.spec.ts:75 \
  --reporter=list
# 預期: ✅ passed
```

#### 3. 手動驗證 Cookie 持久化

```bash
# 1. 訪問首頁
open http://localhost:3000

# 2. 完成設定流程（或手動設定 cookie）
# 在 Console:
document.cookie = "setup-completed=true; path=/; domain=localhost; max-age=31536000"

# 3. 重新整理頁面
# 預期: 停留在首頁，不重定向到 /setup

# 4. 關閉瀏覽器視窗再重新開啟
# 預期: 仍然停留在首頁
```

#### 4. 驗證資料庫持久化

```bash
# 1. 建立一個測試專案
# （透過 UI 或直接插入資料庫）

sqlite3 backend/ytmaker.db <<EOF
INSERT INTO projects (id, name, status, created_at)
VALUES ('test-persist-001', 'Test Persistence Project', 'draft', datetime('now'));
EOF

# 2. 重啟 backend
# 找到 backend 進程並重啟
pkill -f "uvicorn"
cd backend && source venv/bin/activate && uvicorn app.main:app --reload &

# 3. 驗證專案仍然存在
curl http://localhost:8000/api/v1/projects | jq '.data.projects[] | select(.id=="test-persist-001")'

# 預期: 返回該專案的資料
```

#### 5. 端到端驗證

```bash
# 完整流程測試
# 1. 完成設定
# 2. 建立一個專案
# 3. 重新載入頁面 -> 專案仍然存在
# 4. 關閉瀏覽器重新開啟 -> 專案仍然存在
# 5. 重啟 backend -> 專案仍然存在
```

### ✅ 通過標準

**此 Issue 被視為已解決，當且僅當：**

1. ✅ **所有自動化測試通過**
   ```bash
   npx playwright test tests/e2e/real/data-persistence.spec.ts
   結果: ✅ 3 passed
   ```

2. ✅ **Cookie 正確持久化**
   - `setup-completed` cookie 在重新載入後仍然存在
   - Cookie 在關閉瀏覽器後仍然存在（如果設定了 max-age）

3. ✅ **資料庫資料持久化**
   - 專案資料在頁面重新載入後仍然存在
   - 專案資料在 backend 重啟後仍然存在

4. ✅ **重定向邏輯正確**
   - 設定完成後訪問首頁不會重定向到 `/setup`
   - 設定未完成時訪問首頁會重定向到 `/setup`

5. ✅ **手動測試通過**
   - 可以重複執行測試並通過
   - 真實使用場景下資料正確保存

### 📊 測試執行記錄

| 日期 | 執行者 | 測試 1 | 測試 2 | 測試 3 | 備註 |
|------|--------|--------|--------|--------|------|
| 2025-10-23 | Claude | ❌ 13.9s | ❌ 11.5s | ❌ 0.35s | 初始發現 |
| | | | | | |

---

## 相關資源

### 測試文件
- 測試檔案: `tests/e2e/real/data-persistence.spec.ts`
- 測試結果: `test-results/data-persistence-*-chromium/`

### 相關程式碼（推測）
- `frontend/src/middleware.ts` - 路由中介軟體
- `frontend/src/app/page.tsx` - 首頁
- `frontend/src/app/setup/` - 設定頁面
- `backend/app/main.py` - Backend 主程式
- `backend/ytmaker.db` - SQLite 資料庫

---

## 時間估算

- 🔍 調查: 1-2 小時
- 🔧 修復: 2-4 小時
- ✅ 驗證: 1 小時
- **總計: 4-7 小時**

---

## 備註

資料持久化是系統的基本要求，這個問題必須盡快解決。建議的修復順序：

1. 先修復 Issue-011（影片生成）- 核心功能
2. 修復 Issue-012（首次設定 UI）- 快速簡單
3. **修復 Issue-013（資料持久化）** - 資料安全
4. 修復 Issue-014（斷點續傳）- 錯誤恢復

修復時要特別注意：
- Cookie 的 domain, path, max-age 設定
- 前端的重定向邏輯
- 資料庫連線的穩定性
