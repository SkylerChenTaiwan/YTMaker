# Task-020B: 歡迎頁與完成頁元件

> **建立日期:** 2025-10-21
> **狀態:** ⏳ 未開始
> **預計時間:** 1.5 小時
> **優先級:** P0 (必須)
> **可並行:** ✅ 可以 (與 Task-020A, 020C 並行)
> **前置任務:** AuthStore (已完成)
> **後續任務:** Task-020D (主頁面整合)

---

## 目標

1. 實作歡迎頁元件 (WelcomeStep)
2. 實作完成頁元件 (CompletionStep)
3. 撰寫並通過測試

---

## 需要建立的檔案

### 1. 歡迎頁元件

#### `frontend/src/components/setup/steps/WelcomeStep.tsx`

**功能:**
- 顯示歡迎標題和說明
- 顯示「開始設定」按鈕
- 簡潔明瞭的設計

**程式碼骨架:**
```tsx
export const WelcomeStep: React.FC = () => {
  return (
    <div className="text-center space-y-6 py-12">
      <h1 className="text-4xl font-bold text-gray-900">
        歡迎使用 YTMaker
      </h1>

      <p className="text-xl text-gray-600 max-w-2xl mx-auto">
        這是一個本地端的 YouTube 影片自動化生產工具
      </p>

      <div className="space-y-4 text-gray-700">
        <p>🎬 自動生成腳本</p>
        <p>🖼️ 自動生成圖片</p>
        <p>🎙️ 自動生成語音</p>
        <p>🎥 自動合成影片</p>
        <p>📤 自動上傳 YouTube</p>
      </div>

      <div className="mt-8">
        <p className="text-sm text-gray-500">
          讓我們先完成一些基本設定
        </p>
      </div>
    </div>
  )
}
```

#### `frontend/tests/unit/components/setup/steps/WelcomeStep.test.tsx`

**測試案例:**
- [ ] 顯示歡迎標題
- [ ] 顯示功能列表
- [ ] 顯示說明文字

---

### 2. 完成頁元件

#### `frontend/src/components/setup/steps/CompletionStep.tsx`

**功能:**
- 顯示設定完成訊息
- 顯示設定摘要 (API Keys 狀態, YouTube 連結狀態)
- 顯示警告 (如果部分設定未完成)

**程式碼骨架:**
```tsx
interface CompletionStepProps {
  // 可選: 如果需要從外部傳入狀態
}

export const CompletionStep: React.FC<CompletionStepProps> = () => {
  const { apiKeys, youtube } = useAuthStore()

  // 計算已設定的 API Keys 數量
  const apiKeyCount = [
    apiKeys.gemini.tested,
    apiKeys.stabilityAI.tested,
    apiKeys.dId.tested,
  ].filter(Boolean).length

  const allComplete = apiKeyCount === 3 && youtube.connected

  return (
    <div className="text-center space-y-6 py-8">
      {/* 成功圖示 */}
      <div className="flex justify-center">
        <CheckCircleIcon className="w-24 h-24 text-green-500" />
      </div>

      {/* 標題 */}
      <h2 className="text-3xl font-bold text-gray-900">
        {allComplete ? '所有設定已完成!' : '基本設定已完成!'}
      </h2>

      {/* 設定摘要 */}
      <div className="max-w-md mx-auto space-y-3">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
          <span>API Keys</span>
          <span className={apiKeyCount === 3 ? 'text-green-600' : 'text-yellow-600'}>
            已設定 {apiKeyCount}/3
          </span>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
          <span>YouTube 授權</span>
          <span className={youtube.connected ? 'text-green-600' : 'text-gray-400'}>
            {youtube.connected ? `已連結 ${youtube.channel_name}` : '未連結'}
          </span>
        </div>
      </div>

      {/* 警告訊息 */}
      {!allComplete && (
        <div className="max-w-md mx-auto p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">
            部分設定未完成,部分功能可能無法使用。
            您可以稍後在設定頁面完成配置。
          </p>
        </div>
      )}
    </div>
  )
}
```

#### `frontend/tests/unit/components/setup/steps/CompletionStep.test.tsx`

**測試案例 (根據 Task 文件的測試 6):**
- [ ] 全部完成時顯示成功圖示和訊息
- [ ] 正確顯示 API Keys 設定狀態 (X/3)
- [ ] 正確顯示 YouTube 連結狀態
- [ ] 部分未完成時顯示警告訊息
- [ ] 顯示「進入主控台」按鈕文字

---

## 實作步驟

### Step 1: 實作 WelcomeStep (30 分鐘)

```bash
# 1. 建立元件
# 2. 建立測試
# 3. 執行測試
npm test -- WelcomeStep.test.tsx
```

### Step 2: 實作 CompletionStep (50 分鐘)

```bash
# 1. 建立元件
# 2. 實作邏輯 (讀取 Store, 計算狀態)
# 3. 建立測試
# 4. 執行測試
npm test -- CompletionStep.test.tsx
```

### Step 3: 整合測試 (10 分鐘)

```bash
# 執行所有 step 測試
npm test -- tests/unit/components/setup/steps/
```

---

## 驗收標準

- [ ] WelcomeStep: 3/3 測試通過
- [ ] CompletionStep: 5/5 測試通過
- [ ] 元件正確讀取 Store 狀態
- [ ] 響應式設計 (手機、平板、桌面都正常顯示)
- [ ] 無 TypeScript 錯誤
- [ ] 無 ESLint 警告

---

## 完成後動作

```bash
git add frontend/src/components/setup/steps/WelcomeStep.tsx
git add frontend/src/components/setup/steps/CompletionStep.tsx
git add frontend/tests/unit/components/setup/steps/
git commit -m "feat: 實作歡迎頁和完成頁元件 [task-020]"
git push
```

---

## 設計注意事項

- 使用簡潔清晰的文字
- 圖示使用內聯 SVG (避免額外依賴)
- 顏色遵循 Tailwind 配色 (green-500, yellow-600, gray-*)
- 間距保持一致 (space-y-6, p-4)
