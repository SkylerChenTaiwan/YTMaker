# [v] Task-029B: 核心流程測試

> **建立日期:** 2025-10-22
> **完成日期:** 2025-10-22
> **狀態:** ✅ 已完成
> **預計時間:** 6 小時
> **優先級:** P0 (必須)
> **父任務:** Task-029 (E2E 整合測試)
> **依賴:** Task-029A (測試基礎設施)

---

## 任務目標

實作最重要的兩個核心使用者流程的完整 E2E 測試：Flow-0 (首次啟動設定) 和 Flow-1 (基本影片生成)。

### 成功標準
- [x] Flow-0 完整測試通過 (5步驟 + 錯誤情境)
- [x] Flow-1 完整測試通過 (6階段 + WebSocket)
- [x] 所有 Mock API 正確呼叫
- [x] **測試覆蓋率: 核心流程 > 95%**
- [x] 測試穩定性: 連續執行 5 次均通過
- [x] 測試執行時間 < 5 分鐘

---

## 測試規格

### E2E 測試 1: Flow-0 首次啟動設定流程

**測試檔案:** `tests/e2e/flow-0-setup-wizard.spec.ts`

**測試案例:**

1. **完整設定流程**
   - 測試 5 個步驟完整流程
   - 驗證 API Keys 正確儲存
   - 驗證導航到主控台

2. **跳過 YouTube 授權**
   - 點擊「稍後設定」
   - 驗證可繼續流程

3. **錯誤情境測試**
   - API Key 格式錯誤
   - 測試連線失敗
   - 離開精靈時確認

**程式碼骨架:** (見實作規格)

---

### E2E 測試 2: Flow-1 基本影片生成流程

**測試檔案:** `tests/e2e/flow-1-basic-generation.spec.ts`

**測試 6 階段:**

1. **新增專案** (Page-3)
2. **視覺化配置** (Page-4)  
3. **Prompt 與模型設定** (Page-5)
4. **YouTube 設定** (Page-6)
5. **進度監控** (Page-7) + WebSocket
6. **結果頁面** (Page-8)

**完整測試流程:** (見原 task-029.md 行 128-336)

**程式碼骨架:** (見實作規格)

---

## 實作規格

### 檔案結構
```
tests/e2e/
├── flow-0-setup-wizard.spec.ts
├── flow-1-basic-generation.spec.ts  
└── utils/
    └── (使用 Task-029A 建立的工具)
```

### 完整測試代碼範例

**tests/e2e/flow-0-setup-wizard.spec.ts:**
```typescript
import { test, expect } from '@playwright/test'
import { TestHelpers } from './utils/test-helpers'
import { mockApiKeys } from './utils/mock-data'

test.describe('Flow-0: 首次啟動設定', () => {
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
    // 清空配置檔案 (模擬首次啟動)
    await page.goto('/setup')
  })

  test('應該完成完整設定流程', async ({ page }) => {
    // Step 0: 歡迎頁
    await expect(page.locator('text=歡迎使用 YTMaker')).toBeVisible()
    await page.click('text=開始設定')

    // Step 1: Gemini API
    await page.fill('[name="gemini_api_key"]', mockApiKeys.gemini)
    await page.click('text=測試連線')
    await helpers.verifyToast('連線成功', 'success')
    await page.click('text=下一步')

    // Step 2: Stability AI
    await page.fill('[name="stability_api_key"]', mockApiKeys.stabilityAI)
    await page.click('text=測試連線')
    await helpers.verifyToast('連線成功', 'success')
    await page.click('text=下一步')

    // Step 3: D-ID
    await page.fill('[name="did_api_key"]', mockApiKeys.did)
    await page.click('text=測試連線')
    await helpers.verifyToast('連線成功', 'success')
    await page.click('text=下一步')

    // Step 4: YouTube (跳過)
    await page.click('text=稍後設定')

    // Step 5: 完成
    await expect(page.locator('text=API Keys: 已設定 3/3')).toBeVisible()
    await page.click('text=進入主控台')

    // 驗證導航到主控台
    await helpers.verifyNavigation('/')
  })

  test('應該處理 API Key 格式錯誤', async ({ page }) => {
    await page.click('text=開始設定')
    await page.fill('[name="gemini_api_key"]', 'invalid')
    await page.click('text=測試連線')
    
    await helpers.verifyToast('API Key 無效', 'error')
  })
})
```

**tests/e2e/flow-1-basic-generation.spec.ts:**  
(完整代碼約 200 行，包含所有 6 階段測試)

---

## 開發指引 (TDD)

### Step 1: 實作 Flow-0 測試 (2小時)

1. 建立 `flow-0-setup-wizard.spec.ts`
2. 撰寫完整流程測試
3. 撰寫錯誤情境測試
4. 執行並確保通過

### Step 2: 實作 Flow-1 測試 (4小時)

1. 建立 `flow-1-basic-generation.spec.ts`
2. 撰寫 6 階段測試
3. 實作 WebSocket 進度監控測試
4. 驗證所有 Mock API 呼叫
5. 執行並確保通過

### Step 3: 覆蓋率驗證 (30分鐘)

```bash
npm run test:e2e -- flow-0 flow-1
npx playwright test --reporter=html
```

確保覆蓋率 > 95%

---

## 完成檢查清單

### Flow-0 測試
- [ ] 完整流程測試通過
- [ ] 所有步驟導航正確
- [ ] API Key 儲存驗證
- [ ] 跳過 YouTube 流程正常
- [ ] 錯誤情境完整覆蓋

### Flow-1 測試  
- [ ] 6 階段全部測試通過
- [ ] WebSocket 連線正常
- [ ] 進度推送即時更新
- [ ] Mock API 正確呼叫
- [ ] 結果頁面資料完整

### 品質指標
- [ ] **測試覆蓋率 > 95%**
- [ ] 無 Flaky Tests
- [ ] 執行時間 < 5 分鐘
- [ ] 所有測試有清楚註解

---

**預估時間:** 6 小時  
**詳細測試步驟:** 參考原 task-029.md 行 44-336
