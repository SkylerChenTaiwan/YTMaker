# 子任務 1: API Steps 完成與修復

> **優先級:** P0 (必須)
> **預估時間:** 2 小時
> **可並行:** ❌ 不可 (依賴 AuthStore 和 API 客戶端)
> **依賴:** AuthStore (已完成), API 客戶端 (已完成)

---

## 目標

1. 修復 Gemini API Step 的 3 個失敗測試
2. 複製實作 Stability AI API Step
3. 複製實作 D-ID API Step
4. 確保所有測試通過

---

## 需要修改/建立的檔案

### 1. 修復現有檔案

#### `frontend/tests/unit/components/setup/steps/GeminiApiStep.test.tsx`
**問題:** 3 個測試失敗
- 測試 3: `should test connection successfully` - waitFor 超時
- 測試 4: `should handle connection test failure` - waitFor 超時
- 測試 6: `should enable test button when API key is provided` - 找不到 testid

**需要修復:**
- [ ] 檢查 mock 設定是否正確
- [ ] 確認 async/await 處理
- [ ] 調整測試斷言邏輯

#### `frontend/src/components/setup/steps/GeminiApiStep.tsx`
**可能需要調整:**
- [ ] 確保 data-testid 正確設置
- [ ] 檢查 error handling 邏輯
- [ ] 確認狀態更新時機

---

### 2. 新建檔案

#### `frontend/src/components/setup/steps/StabilityApiStep.tsx`
**內容:** 複製 GeminiApiStep 並修改
- Provider: `stability`
- 標題: "Stability AI API Key"
- 說明: "請輸入您的 Stability AI API Key,用於生成影片圖片"
- 連結: https://platform.stability.ai/account/keys

#### `frontend/tests/unit/components/setup/steps/StabilityApiStep.test.tsx`
**內容:** 複製 GeminiApiStep.test 並修改
- 測試相同功能
- 確保所有測試通過

#### `frontend/src/components/setup/steps/DIdApiStep.tsx`
**內容:** 複製 GeminiApiStep 並修改
- Provider: `did`
- 標題: "D-ID API Key"
- 說明: "請輸入您的 D-ID API Key,用於生成虛擬主播影片"
- 連結: https://studio.d-id.com/account-settings

#### `frontend/tests/unit/components/setup/steps/DIdApiStep.test.tsx`
**內容:** 複製 GeminiApiStep.test 並修改
- 測試相同功能
- 確保所有測試通過

---

## 實作步驟

### Step 1: 修復 Gemini API Step 測試 (30 分鐘)

```bash
# 1. 執行測試找出問題
npm test -- GeminiApiStep.test.tsx

# 2. 根據錯誤訊息修復
# - 檢查 mock 設定
# - 調整 waitFor 條件
# - 確認元件狀態更新

# 3. 重新執行測試確認
npm test -- GeminiApiStep.test.tsx
```

### Step 2: 實作 Stability AI Step (40 分鐘)

```bash
# 1. 複製並修改元件
cp frontend/src/components/setup/steps/GeminiApiStep.tsx \
   frontend/src/components/setup/steps/StabilityApiStep.tsx

# 2. 修改內容 (provider, 標題, 說明, 連結)

# 3. 複製並修改測試
cp frontend/tests/unit/components/setup/steps/GeminiApiStep.test.tsx \
   frontend/tests/unit/components/setup/steps/StabilityApiStep.test.tsx

# 4. 執行測試
npm test -- StabilityApiStep.test.tsx
```

### Step 3: 實作 D-ID API Step (40 分鐘)

```bash
# 同 Step 2,但針對 D-ID
```

### Step 4: 執行所有測試 (10 分鐘)

```bash
# 執行所有 API Step 測試
npm test -- tests/unit/components/setup/steps/

# 確認所有測試通過 (應該有 18 個測試)
```

---

## 驗收標準

- [ ] Gemini API Step: 6/6 測試通過
- [ ] Stability API Step: 6/6 測試通過
- [ ] D-ID API Step: 6/6 測試通過
- [ ] 所有元件功能正常:
  - [ ] 密碼顯示/隱藏切換
  - [ ] 輸入驗證
  - [ ] 連線測試成功
  - [ ] 連線測試失敗處理
  - [ ] Store 正確更新
- [ ] 無 TypeScript 錯誤
- [ ] 無 ESLint 警告

---

## 完成後動作

```bash
# Commit & Push
git add frontend/src/components/setup/steps/
git add frontend/tests/unit/components/setup/steps/
git commit -m "feat: 完成所有 API Key 設定步驟並修復測試 [task-020]"
git push
```

---

## 常見問題

**Q: 測試一直 timeout 怎麼辦?**
A: 檢查 mock 是否正確設置,確認 async/await 處理,增加 timeout 時間

**Q: Store mock 不工作?**
A: 確認 jest.mock 路徑正確,檢查 mockReturnValue 是否包含所需的所有屬性

**Q: 為什麼要複製而不是抽象共用元件?**
A: 現階段先求快速完成,後續可以重構成共用元件
