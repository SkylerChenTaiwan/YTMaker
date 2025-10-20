# Task-029: E2E 整合測試

> **建立日期:** 2025-10-19
> **狀態:** ⏳ 未開始
> **預計時間:** 16 小時
> **優先級:** P0 (必須)

---

## 關聯文件

### 產品設計
- **User Flows:** `product-design/flows.md` - 所有 10 個 User Flows
- **頁面設計:** `product-design/pages.md` - 所有 12 個頁面規格

### 技術規格
- **後端測試:** `tech-specs/backend/testing.md` - 後端測試策略與範例
- **前端測試:** `tech-specs/frontend/testing.md` - 前端 E2E 測試規範
- **技術框架:** `tech-specs/framework.md` - 測試框架選擇與配置

### 相關任務
- **前置任務:** Task-001 ~ Task-028 (所有前後端任務)
- **後續任務:** Task-030 (Electron 打包)

---

## 任務目標

### 簡述
實作完整的端到端 (E2E) 整合測試,涵蓋所有核心使用者流程與第三方 API 整合,確保系統各模塊協同運作正常,達成 80% 以上的整體測試覆蓋率。

### 成功標準
- [ ] 8 個核心 User Flow 的 E2E 測試全部實作並通過
- [ ] 所有第三方 API 的 Mock 機制完成並運作正常
- [ ] CI/CD 整合完成,自動執行測試
- [ ] 整體測試覆蓋率 > 80%,核心業務邏輯 > 90%
- [ ] 測試執行時間 < 10 分鐘
- [ ] 所有測試在本地環境和 CI 環境均能穩定通過

---

## 測試要求

### E2E 測試 1: Flow-0 首次啟動設定流程

**目的:** 驗證首次啟動時的系統設定精靈流程是否完整且順暢

**前置條件:**
- 清空配置檔案 (模擬首次啟動)
- 後端 API 服務正常運行

**測試步驟:**

1. **啟動應用程式**
   - 應用程式啟動
   - 檢測到無配置檔案
   - 自動導航到 `/setup`

2. **Step 0: 歡迎頁**
   - 顯示「歡迎使用 YTMaker」標題
   - 顯示「開始設定」按鈕
   - 點擊「開始設定」

3. **Step 1: Gemini API 設定**
   - 顯示 API Key 輸入框
   - 輸入測試 API Key: `test-gemini-key-12345`
   - 點擊「測試連線」
   - (Mock API 回應成功)
   - 顯示「連線成功」訊息
   - 點擊「下一步」

4. **Step 2: Stability AI API 設定**
   - 輸入 API Key: `test-stability-key-12345`
   - 點擊「測試連線」
   - (Mock API 回應成功)
   - 點擊「下一步」

5. **Step 3: D-ID API 設定**
   - 輸入 API Key: `test-did-key-12345`
   - 點擊「測試連線」
   - (Mock API 回應成功)
   - 點擊「下一步」

6. **Step 4: YouTube 授權** (選擇跳過)
   - 顯示「連結 YouTube 帳號」按鈕
   - 點擊「稍後設定」
   - 顯示提示:「可稍後在設定頁面連結」

7. **Step 5: 完成頁**
   - 顯示設定摘要
   - API Keys: 已設定 3/3 ✓
   - YouTube: 未設定 (可選)
   - 點擊「進入主控台」

8. **導航到主控台**
   - URL 變更為 `/` 或 `/dashboard`
   - 顯示主控台頁面

**預期結果:**
```javascript
{
  setupCompleted: true,
  apiKeysConfigured: {
    gemini: true,
    stabilityAI: true,
    did: true
  },
  youtubeLinked: false,
  currentRoute: '/'
}
```

**驗證點:**
- [ ] 每個步驟的 UI 元件正確顯示
- [ ] API Key 可成功儲存到本地配置
- [ ] 測試連線功能正常運作 (使用 Mock)
- [ ] 步驟導航 (上一步/下一步) 正常
- [ ] 可選擇「稍後設定」跳過 YouTube 授權
- [ ] 完成後正確導航到主控台

**錯誤情境測試:**
- [ ] API Key 格式錯誤時顯示錯誤訊息
- [ ] 測試連線失敗時允許重試
- [ ] 離開精靈時顯示確認 Modal

---

### E2E 測試 2: Flow-1 基本影片生成流程 (完整流程)

**目的:** 驗證從建立專案到影片上傳的完整端到端流程

**前置條件:**
- 系統已完成首次設定 (API Keys 已配置)
- YouTube 帳號已連結 (或 Mock)
- 第三方 API 已 Mock

**測試步驟:**

**階段 1: 新增專案 (Page-3)**

1. 導航到主控台 (`/`)
2. 點擊「新增專案」按鈕
3. 導航到 `/project/new`

4. **填寫專案資訊**
   - 專案名稱: `E2E 測試專案`
   - 文字內容來源: 選擇「直接貼上」
   - 貼上測試文字 (600 字)
   ```
   這是一段測試文字內容,用於 E2E 測試專案生成流程。
   [重複文字以達到 600 字]
   ```
   - 即時顯示字數: `600 字`
   - 顯示「✓ 內容符合要求」

5. 點擊「下一步」

**階段 2: 視覺化配置 (Page-4)**

6. 導航到 `/project/:id/configure/visual`
7. 顯示視覺化配置界面

8. **配置字幕**
   - 字型: `Noto Sans TC`
   - 字體大小: `48`
   - 顏色: `#FFFFFF`
   - 位置: 底部置中 (預設)
   - 邊框: 啟用,顏色 `#000000`,寬度 `2`
   - 陰影: 啟用

9. **上傳 Logo**
   - 上傳測試圖片 (`test-logo.png`)
   - 拖拽到右上角位置
   - 大小: `100px`

10. 點擊「儲存配置」
11. 點擊「下一步」

**階段 3: Prompt 與模型設定 (Page-5)**

12. 導航到 `/project/:id/configure/prompt-model`

13. **選擇 Prompt 範本**
    - 下拉選單選擇「預設範本」
    - 顯示 Prompt 內容
    - 確認包含「每段 5-20 秒」要求

14. **選擇 Gemini 模型**
    - 選擇 `gemini-1.5-flash` (快速、低成本)

15. 點擊「下一步」

**階段 4: YouTube 設定 (Page-6)**

16. 導航到 `/project/:id/configure/youtube`

17. **顯示已連結帳號** (Mock)
    - 頻道名稱: `測試頻道`
    - 頻道頭像顯示

18. **AI 生成 metadata** (自動填入,Mock)
    - 標題: `AI 生成的測試影片標題`
    - 描述: `這是一段 AI 生成的影片描述...`
    - 標籤: `["測試", "AI", "自動化"]`

19. **設定發布方式**
    - 選擇「立即發布」
    - 隱私設定: `公開`

20. **勾選 AI 內容標註**
    - 預設已勾選
    - 顯示說明文字

21. 點擊「開始生成」

**階段 5: 進度監控 (Page-7)**

22. 導航到 `/project/:id/progress`
23. 建立 WebSocket 連線 (Mock)

24. **監控各階段進度** (Mock 推送進度更新)

    - **階段 1: 腳本生成**
      - 狀態: `SCRIPT_GENERATING` → `SCRIPT_GENERATED`
      - 進度: 0% → 20%
      - 顯示日誌: `[INFO] 調用 Gemini API 生成腳本...`
      - (Mock Gemini API 回應)

    - **階段 2: 素材生成**
      - 狀態: `ASSETS_GENERATING`
      - 進度: 20% → 60%
      - 子任務:
        - 語音合成: ✓ 完成
        - 圖片生成: 15/15 ✓
        - 虛擬主播: ✓ 完成
      - (Mock Stability AI, D-ID API)

    - **階段 3: 影片渲染**
      - 狀態: `RENDERING` → `RENDERED`
      - 進度: 60% → 80%
      - (Mock FFmpeg 渲染過程)

    - **階段 4: 封面生成**
      - 狀態: `THUMBNAIL_GENERATING` → `THUMBNAIL_GENERATED`
      - 進度: 80% → 90%

    - **階段 5: YouTube 上傳**
      - 狀態: `UPLOADING` → `COMPLETED`
      - 進度: 90% → 100%
      - (Mock YouTube API 上傳)

25. **完成狀態**
    - 總進度: 100%
    - 顯示「影片生成完成!」
    - 顯示「查看結果」按鈕

26. 點擊「查看結果」

**階段 6: 結果頁面 (Page-8)**

27. 導航到 `/project/:id/result`

28. **顯示成功訊息**
    - 綠色勾選圖示
    - 文字:「影片已成功生成並上傳到 YouTube!」

29. **顯示 YouTube 連結**
    - 連結: `https://youtu.be/test_video_id_123` (Mock)
    - 影片狀態: `已發布`

30. **影片預覽**
    - 嵌入 YouTube 播放器 (Mock iframe)

31. **影片資訊**
    - 標題: `AI 生成的測試影片標題`
    - 描述: `這是一段 AI 生成的影片描述...`
    - 標籤: `測試, AI, 自動化`

32. **下載選項**
    - 「下載影片」按鈕
    - 「下載封面」按鈕
    - 「下載所有素材」按鈕

33. 點擊「返回主控台」
34. 導航回 `/`

**預期結果:**
```javascript
{
  projectCreated: true,
  projectId: 'uuid-v4',
  scriptGenerated: true,
  assetsGenerated: {
    audio: true,
    images: 15,
    avatar: true
  },
  videoRendered: true,
  thumbnailGenerated: true,
  youtubeUploaded: true,
  youtubeVideoId: 'test_video_id_123',
  finalStatus: 'COMPLETED'
}
```

**驗證點:**
- [ ] 每個階段的頁面導航正確
- [ ] 表單驗證正常運作
- [ ] 配置資料正確儲存
- [ ] WebSocket 即時進度推送正常
- [ ] 所有 Mock API 正確呼叫
- [ ] 進度狀態轉換正確
- [ ] 完成後資料完整顯示

**效能驗證:**
- [ ] 頁面載入時間 < 2 秒
- [ ] WebSocket 訊息延遲 < 200ms
- [ ] 整體流程執行時間 < 5 分鐘 (Mock 模式)

---

### E2E 測試 3: Flow-2 使用模板快速生成

**目的:** 驗證使用預設模板快速生成影片的流程

**前置條件:**
- 系統已有預設視覺配置模板
- 系統已有預設 Prompt 範本

**測試步驟:**

1. 導航到主控台 (`/`)

2. **點擊「使用模板生成」**
   - 顯示模板選擇 Modal
   - 列出可用模板

3. **選擇模板**
   - 選擇「預設視覺模板」
   - 顯示模板預覽

4. **確認使用模板**
   - 點擊「使用此模板」
   - 導航到 `/project/new`
   - 視覺配置已自動載入模板設定

5. **快速配置**
   - 填寫專案名稱: `快速生成測試`
   - 貼上文字內容 (600 字)
   - 跳過視覺配置 (已載入模板)
   - 選擇 Prompt 範本: `預設範本`
   - 選擇模型: `gemini-1.5-flash`
   - 設定 YouTube 資訊
   - 點擊「開始生成」

6. **監控進度**
   - 導航到 `/project/:id/progress`
   - 驗證使用了模板配置
   - 監控到完成

7. **查看結果**
   - 驗證影片使用了模板的視覺配置

**預期結果:**
```javascript
{
  templateUsed: true,
  templateId: 'default-visual-template',
  configurationApplied: true,
  projectCompleted: true
}
```

**驗證點:**
- [ ] 模板選擇 Modal 正常運作
- [ ] 模板配置正確載入
- [ ] 可跳過視覺配置步驟
- [ ] 生成的影片應用了模板設定

---

### E2E 測試 4: Flow-3 視覺化界面配置

**目的:** 驗證視覺化配置界面的拖拽功能與即時預覽

**前置條件:**
- 已建立專案並進入視覺化配置頁

**測試步驟:**

1. 導航到 `/project/:id/configure/visual`

2. **測試拖拽功能**
   - 拖拽字幕到不同位置
   - 驗證座標即時更新
   - 驗證預覽即時更新

3. **測試對齊輔助線**
   - 拖拽字幕接近中線時
   - 顯示對齊輔助線
   - 自動吸附到中線

4. **測試即時預覽**
   - 修改字幕顏色
   - 預覽立即反映變更
   - 延遲 < 100ms

5. **測試多元素管理**
   - 新增多個疊加元素
   - 調整元素順序 (圖層)
   - 刪除元素
   - 驗證預覽正確

6. **測試儲存為模板**
   - 點擊「儲存為模板」
   - 輸入模板名稱: `自訂測試模板`
   - 儲存成功
   - 驗證模板出現在模板列表

**預期結果:**
```javascript
{
  dragAndDropWorking: true,
  realTimePreview: true,
  previewLatency: < 100, // ms
  templateSaved: true,
  templateName: '自訂測試模板'
}
```

**驗證點:**
- [ ] 拖拽功能流暢
- [ ] 座標計算正確
- [ ] 即時預覽無延遲
- [ ] 對齊輔助線正常顯示
- [ ] 元素順序管理正常
- [ ] 模板儲存成功

---

### E2E 測試 5: Flow-4 排程發布影片

**目的:** 驗證排程發布功能

**前置條件:**
- 專案已建立並完成前置配置

**測試步驟:**

1. 導航到 `/project/:id/configure/youtube`

2. **設定排程發布**
   - 發布方式: 選擇「排程發布」
   - 顯示日期時間選擇器

3. **選擇排程時間**
   - 選擇日期: 明天
   - 選擇時間: 10:00 AM
   - 系統驗證為未來時間 ✓

4. **開始生成**
   - 點擊「開始生成」
   - 正常完成生成流程

5. **驗證排程狀態**
   - 導航到結果頁
   - YouTube 狀態顯示: `已排程`
   - 顯示排程時間: `明天 10:00 AM`

**預期結果:**
```javascript
{
  publishType: 'scheduled',
  scheduledDate: '2025-10-21',
  scheduledTime: '10:00',
  youtubeStatus: 'SCHEDULED',
  videoUploaded: true
}
```

**驗證點:**
- [ ] 排程時間選擇器正常運作
- [ ] 驗證未來時間正確
- [ ] 過去時間顯示錯誤訊息
- [ ] 排程狀態正確傳遞到 YouTube API (Mock)
- [ ] 結果頁顯示排程資訊

**錯誤情境測試:**
- [ ] 選擇過去時間時顯示:「排程時間必須為未來時間」
- [ ] 日期格式錯誤時提示使用者

---

### E2E 測試 6: Flow-5 批次處理多個影片

**目的:** 驗證批次處理功能

**前置條件:**
- 已準備多個文字檔案 (3 個)

**測試步驟:**

1. 導航到主控台
2. 點擊「批次處理」
3. 導航到 `/batch`

4. **新增批次任務**
   - 點擊「新增批次任務」
   - 顯示 Modal

5. **配置批次任務**
   - 任務名稱: `批次測試任務`
   - 上傳 3 個文字檔案:
     - `content1.txt` (600 字)
     - `content2.txt` (700 字)
     - `content3.txt` (650 字)
   - 選擇模板: `預設視覺模板`
   - 選擇 Prompt 範本: `預設範本`
   - 選擇模型: `gemini-1.5-flash`
   - YouTube 隱私: `不公開`
   - 發布方式: `立即發布`

6. **開始批次處理**
   - 點擊「開始批次處理」
   - 導航到 `/batch/:id`

7. **監控批次進度**
   - 顯示總進度: `完成 0/3`
   - 專案列表:
     - 專案 1: 狀態 `執行中`, 進度 `20%`
     - 專案 2: 狀態 `排隊`, 進度 `0%`
     - 專案 3: 狀態 `排隊`, 進度 `0%`

8. **等待批次完成** (Mock 加速)
   - 專案 1: `已完成` ✓
   - 專案 2: `已完成` ✓
   - 專案 3: `已完成` ✓
   - 總進度: `完成 3/3` ✓

9. **下載批次報告**
   - 點擊「下載批次報告」
   - 下載 CSV 檔案
   - 驗證檔案包含所有專案資訊

**預期結果:**
```javascript
{
  batchTaskCreated: true,
  batchId: 'uuid-v4',
  totalProjects: 3,
  completedProjects: 3,
  failedProjects: 0,
  allVideosUploaded: true
}
```

**驗證點:**
- [ ] 批次任務建立成功
- [ ] 多檔案上傳正常
- [ ] 專案依序執行 (或並行,視設定)
- [ ] 進度更新即時正確
- [ ] 所有專案完成
- [ ] 批次報告正確生成

---

### E2E 測試 7: Flow-6 斷點續傳與錯誤恢復

**目的:** 驗證生成過程中斷時可恢復執行

**前置條件:**
- 專案進行中,模擬中斷

**測試步驟:**

1. **開始生成專案**
   - 建立專案
   - 開始生成流程

2. **模擬中斷** (在「素材生成」階段)
   - 關閉應用程式
   - 或模擬網路斷線
   - 狀態保存為 `ASSETS_GENERATING`
   - 已完成素材:
     - 語音: ✓
     - 圖片: 8/15

3. **重新啟動應用程式**
   - 導航到主控台
   - 顯示「恢復未完成專案」按鈕

4. **恢復專案**
   - 點擊「恢復未完成專案」
   - 顯示未完成專案列表
   - 選擇要恢復的專案

5. **從斷點繼續**
   - 導航到 `/project/:id/progress`
   - 系統讀取保存的狀態
   - 顯示:
     - 已完成: 腳本生成 ✓
     - 已完成: 部分素材 (語音 ✓, 圖片 8/15)
     - 待完成: 剩餘圖片 (7/15)
   - 繼續生成剩餘素材

6. **監控恢復後的流程**
   - 圖片生成: 9/15 → 15/15 ✓
   - 虛擬主播: 生成中 → 完成 ✓
   - 影片渲染: 完成 ✓
   - YouTube 上傳: 完成 ✓

7. **驗證完成**
   - 狀態: `COMPLETED`
   - 所有素材完整

**預期結果:**
```javascript
{
  resumeSuccessful: true,
  previousState: 'ASSETS_GENERATING',
  completedSteps: ['SCRIPT_GENERATED'],
  resumedFrom: 'IMAGE_GENERATION',
  skippedSteps: ['SCRIPT_GENERATING', 'AUDIO_GENERATION'],
  finalStatus: 'COMPLETED'
}
```

**驗證點:**
- [ ] 狀態正確保存到 `project_state.json`
- [ ] 恢復時讀取正確狀態
- [ ] 跳過已完成步驟
- [ ] 從斷點繼續執行
- [ ] 最終結果完整正確

**錯誤情境測試:**
- [ ] 狀態檔案損壞時提示錯誤
- [ ] 中間檔案缺失時重新生成

---

### E2E 測試 8: Flow-9 系統設定管理

**目的:** 驗證系統設定頁面的各項功能

**前置條件:**
- 系統已完成首次設定

**測試步驟:**

**Tab 1: API 金鑰管理**

1. 導航到 `/settings`
2. 預設顯示「API 金鑰」分頁

3. **查看 API 狀態**
   - Gemini API: ✓ 已設定
   - Stability AI: ✓ 已設定
   - D-ID API: ✓ 已設定

4. **編輯 API Key**
   - 點擊 Gemini API 的「編輯」
   - 顯示編輯 Modal
   - 輸入新的 API Key: `new-gemini-key-67890`
   - 點擊「測試連線」 (Mock 成功)
   - 點擊「儲存」
   - 顯示「API Key 已儲存」toast

5. **查看 API 配額**
   - D-ID: 剩餘 60/90 分鐘
   - 進度條顯示: 67%
   - YouTube: 剩餘 8,000/10,000 units
   - 進度條顯示: 80%

**Tab 2: YouTube 授權管理**

6. 點擊「YouTube 授權」分頁

7. **查看已連結帳號** (Mock)
   - 顯示頻道名稱: `測試頻道`
   - 顯示訂閱數: `1,234`
   - 授權狀態: ✓ 已授權

8. **移除授權**
   - 點擊「移除授權」
   - 顯示確認 Modal
   - 點擊「確認」
   - 帳號從列表移除
   - 顯示「授權已移除」toast

9. **連結新帳號**
   - 點擊「連結新的 YouTube 帳號」
   - (Mock OAuth 流程)
   - 顯示新帳號資訊

**Tab 3: 偏好設定**

10. 點擊「偏好設定」分頁

11. **修改一般設定**
    - 預設語音性別: 改為「女聲」
    - 預設語速: 調整為 `1.2x`
    - 預設隱私: 改為「不公開」

12. **檔案管理設定**
    - 專案檔案保留時間: 改為「30 天後刪除」
    - 保留中間素材: 取消勾選

13. **儲存變更**
    - 點擊「儲存變更」
    - 顯示「設定已儲存」toast

14. **驗證設定生效**
    - 刷新頁面
    - 設定保持不變

**預期結果:**
```javascript
{
  apiKeyUpdated: true,
  apiKeyTested: true,
  quotaDisplayed: true,
  youtubeAuthRemoved: true,
  youtubeAuthAdded: true,
  preferencesUpdated: {
    voiceGender: 'female',
    voiceSpeed: 1.2,
    defaultPrivacy: 'unlisted',
    retentionDays: 30,
    keepAssets: false
  },
  settingsPersisted: true
}
```

**驗證點:**
- [ ] API Key 編輯與儲存正常
- [ ] API 連線測試正常 (Mock)
- [ ] API 配額正確顯示
- [ ] YouTube 授權管理正常
- [ ] OAuth 流程正常 (Mock)
- [ ] 偏好設定正確儲存
- [ ] 設定持久化成功

---

### E2E 測試 9: 跨流程整合測試

**目的:** 驗證批次處理與單一專案編輯可同時進行且互不影響

**前置條件:**
- 系統正常運作
- 批次處理功能已實作

**測試步驟:**

```typescript
// 測試 11: 跨流程整合測試
test('批次處理 + 單一專案編輯應互不影響', async ({ page }) => {
  // 1. 建立批次任務 (處理 10 個專案)
  await page.goto('/batch-generation')
  await page.fill('[name="project_count"]', '10')
  await page.click('button:has-text("開始批次生成")')

  const batchId = await page.locator('[data-testid="batch-id"]').textContent()

  // 2. 在批次處理進行中,同時編輯單一專案
  await page.goto('/projects')
  await page.click('text=新增專案')
  await page.fill('[name="title"]', '測試專案')
  await page.fill('[name="script"]', '測試內容')
  await page.click('button:has-text("儲存")')

  const projectId = await page.locator('[data-testid="project-id"]').textContent()

  // 3. 進入視覺化配置
  await page.click(`[data-project-id="${projectId}"]`)
  await page.fill('[name="font_size"]', '48')
  await page.click('button:has-text("儲存配置")')

  // 4. 檢查批次任務沒有被影響
  await page.goto(`/progress/${batchId}`)
  const status = await page.locator('[data-testid="batch-status"]')
  expect(await status.textContent()).toMatch(/進行中|已完成/)

  // 5. 檢查單一專案配置已儲存
  const response = await page.request.get(`/api/v1/projects/${projectId}`)
  const data = await response.json()
  expect(data.configuration.subtitle.font_size).toBe(48)
})
```

**預期結果:**
```javascript
{
  batchTaskNotAffected: true,
  batchStatus: 'processing' | 'completed',
  singleProjectSaved: true,
  configurationPersisted: true
}
```

**驗證點:**
- [ ] 批次任務和單一專案可同時處理
- [ ] 兩者不會相互干擾
- [ ] 資料正確儲存到各自的 context
- [ ] 狀態隔離正確

---

### E2E 測試 10: 前後端資料一致性測試

**目的:** 驗證前端顯示與後端資料庫完全一致

**前置條件:**
- API 正常運作
- 資料庫可存取

**測試步驟:**

```typescript
// 測試 12: 前後端資料一致性測試
test('前端顯示應與後端資料庫完全一致', async ({ page }) => {
  // 1. 透過 API 建立專案
  const apiResponse = await page.request.post('/api/v1/projects', {
    data: {
      title: '一致性測試專案',
      script_content: '測試內容',
      configuration: {
        subtitle: {
          font_family: 'Noto Sans TC',
          font_size: 36,
          font_color: '#FFFFFF',
          position: { x: 50, y: 80 }
        }
      }
    }
  })

  const apiData = await apiResponse.json()
  const projectId = apiData.project_id

  // 2. 前端載入專案
  await page.goto(`/projects/${projectId}`)

  // 3. 比對每個欄位
  expect(await page.inputValue('[name="title"]')).toBe('一致性測試專案')
  expect(await page.inputValue('[name="script"]')).toBe('測試內容')
  expect(await page.inputValue('[name="font_family"]')).toBe('Noto Sans TC')
  expect(await page.inputValue('[name="font_size"]')).toBe('36')
  expect(await page.inputValue('[name="font_color"]')).toBe('#FFFFFF')

  // 4. 修改配置
  await page.fill('[name="font_size"]', '48')
  await page.click('button:has-text("儲存")')

  await page.waitForSelector('[data-testid="save-success"]')

  // 5. 直接查詢資料庫驗證
  const updatedResponse = await page.request.get(`/api/v1/projects/${projectId}`)
  const updatedData = await updatedResponse.json()

  expect(updatedData.configuration.subtitle.font_size).toBe(48)

  // 6. 重新載入頁面驗證持久化
  await page.reload()
  expect(await page.inputValue('[name="font_size"]')).toBe('48')
})
```

**預期結果:**
```javascript
{
  apiDataMatches: true,
  frontendDisplayCorrect: true,
  updatePersisted: true,
  reloadConsistent: true
}
```

**驗證點:**
- [ ] API 建立的資料前端正確顯示
- [ ] 前端每個欄位與 API 回應一致
- [ ] 修改後資料正確儲存到資料庫
- [ ] 頁面重新載入後資料保持一致
- [ ] 無資料遺失或格式轉換錯誤

---

## 第三方 API Mock 策略

### Mock 架構設計

**使用工具:**
- **MSW (Mock Service Worker):** 攔截瀏覽器的網路請求
- **Nock:** 攔截 Node.js 的 HTTP 請求 (後端測試)

**Mock 層級:**
```
E2E 測試
    ↓
MSW 攔截器
    ↓ (攔截前端 API 請求)
FastAPI Mock 後端
    ↓
Nock 攔截器
    ↓ (攔截後端第三方 API)
Mock 回應
```

---

### 1. Gemini API Mock

**Mock 檔案:** `tests/mocks/gemini-api.mock.ts`

```typescript
import { rest } from 'msw'

export const geminiApiMock = [
  // Mock 腳本生成 API
  rest.post('https://generativelanguage.googleapis.com/v1/models/:model:generateContent', (req, res, ctx) => {
    const { model } = req.params

    // 模擬回應延遲 (1-2 秒)
    return res(
      ctx.delay(1500),
      ctx.status(200),
      ctx.json({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    intro: {
                      text: "歡迎來到今天的影片,我們將探討一個有趣的話題。",
                      duration: 10
                    },
                    segments: [
                      {
                        index: 1,
                        text: "首先,讓我們從基礎概念開始。這個概念非常重要,它奠定了整個理論的基礎。",
                        duration: 15,
                        image_description: "A conceptual diagram showing the basic principles"
                      },
                      {
                        index: 2,
                        text: "接下來,我們深入探討第二個要點。這部分內容將幫助你更好地理解整體架構。",
                        duration: 18,
                        image_description: "An architectural overview with detailed components"
                      },
                      // ... 更多段落 (總共 10-15 個)
                    ],
                    outro: {
                      text: "感謝您觀看本期影片,如果覺得有幫助請訂閱我們的頻道。下期再見!",
                      duration: 10
                    },
                    metadata: {
                      title: "AI 自動生成的影片標題 | 深入探討核心概念",
                      description: "在本影片中,我們將深入探討...(完整描述約 200 字)",
                      tags: ["教學", "科技", "AI", "自動化", "深度解析"]
                    },
                    total_duration: 300
                  })
                }
              ]
            }
          }
        ]
      })
    )
  }),

  // Mock API 錯誤情境
  rest.post('https://generativelanguage.googleapis.com/v1/models/:model:generateContent', (req, res, ctx) => {
    if (req.headers.get('Authorization') === 'Bearer invalid-key') {
      return res(
        ctx.status(401),
        ctx.json({
          error: {
            code: 401,
            message: 'API key not valid',
            status: 'UNAUTHENTICATED'
          }
        })
      )
    }
  })
]
```

**驗證點:**
- [ ] 成功回應包含完整腳本結構
- [ ] 段落數量在合理範圍 (10-15 個)
- [ ] 每段時長在 5-20 秒之間
- [ ] Metadata 完整 (標題、描述、標籤)
- [ ] 總時長在 180-600 秒之間
- [ ] 錯誤情境正確處理 (401, 429, 500)

---

### 2. Stability AI API Mock

**Mock 檔案:** `tests/mocks/stability-ai.mock.ts`

```typescript
import { rest } from 'msw'
import fs from 'fs'
import path from 'path'

export const stabilityAiMock = [
  // Mock 圖片生成 API
  rest.post('https://api.stability.ai/v1/generation/:engineId/text-to-image', async (req, res, ctx) => {
    const { engineId } = req.params
    const body = await req.json()

    // 讀取測試用的 PNG 圖片
    const imagePath = path.join(__dirname, 'fixtures', 'test-image.png')
    const imageBuffer = fs.readFileSync(imagePath)

    return res(
      ctx.delay(2000), // 模擬生成時間
      ctx.status(200),
      ctx.json({
        artifacts: [
          {
            base64: imageBuffer.toString('base64'),
            seed: 123456789,
            finishReason: 'SUCCESS'
          }
        ]
      })
    )
  }),

  // Mock Rate Limit 錯誤
  rest.post('https://api.stability.ai/v1/generation/:engineId/text-to-image', (req, res, ctx) => {
    // 模擬第 10 次請求觸發 rate limit
    if (req.headers.get('X-Request-Count') === '10') {
      return res(
        ctx.status(429),
        ctx.json({
          message: 'Rate limit exceeded',
          retry_after: 60
        })
      )
    }
  })
]
```

**驗證點:**
- [ ] 回應包含 base64 編碼的圖片
- [ ] 圖片解析度為 1920x1080
- [ ] 成功回應時間約 2 秒 (Mock)
- [ ] Rate limit 錯誤正確處理
- [ ] 重試機制正常運作

---

### 3. D-ID API Mock

**Mock 檔案:** `tests/mocks/did-api.mock.ts`

```typescript
import { rest } from 'msw'

export const didApiMock = [
  // Mock 建立虛擬主播任務
  rest.post('https://api.d-id.com/talks', async (req, res, ctx) => {
    const body = await req.json()

    return res(
      ctx.status(201),
      ctx.json({
        id: 'talk_123456789',
        status: 'created',
        created_at: new Date().toISOString()
      })
    )
  }),

  // Mock 查詢任務狀態 (處理中)
  rest.get('https://api.d-id.com/talks/:id', (req, res, ctx) => {
    const { id } = req.params

    // 前 2 次請求回傳 processing
    if (req.headers.get('X-Poll-Count') === '1' || req.headers.get('X-Poll-Count') === '2') {
      return res(
        ctx.status(200),
        ctx.json({
          id,
          status: 'processing',
          created_at: new Date().toISOString()
        })
      )
    }

    // 第 3 次請求回傳完成
    return res(
      ctx.status(200),
      ctx.json({
        id,
        status: 'done',
        result_url: 'https://d-id-talks.s3.amazonaws.com/test-avatar-video.mp4',
        duration: 30.5,
        created_at: new Date().toISOString()
      })
    )
  }),

  // Mock 配額不足錯誤
  rest.post('https://api.d-id.com/talks', (req, res, ctx) => {
    if (req.headers.get('X-Quota-Remaining') === '0') {
      return res(
        ctx.status(402),
        ctx.json({
          kind: 'QuotaExceeded',
          description: 'Monthly quota exceeded'
        })
      )
    }
  })
]
```

**驗證點:**
- [ ] 任務建立成功回傳 `talk_id`
- [ ] 輪詢機制正常 (2-3 次)
- [ ] 完成時回傳影片 URL
- [ ] 時長驗證 (誤差 < 5%)
- [ ] 配額不足錯誤處理

---

### 4. YouTube Data API Mock

**Mock 檔案:** `tests/mocks/youtube-api.mock.ts`

```typescript
import { rest } from 'msw'

export const youtubeApiMock = [
  // Mock OAuth Token 取得
  rest.post('https://oauth2.googleapis.com/token', async (req, res, ctx) => {
    const body = await req.formData()

    if (body.get('grant_type') === 'authorization_code') {
      return res(
        ctx.status(200),
        ctx.json({
          access_token: 'mock_access_token_123',
          refresh_token: 'mock_refresh_token_456',
          expires_in: 3600,
          token_type: 'Bearer'
        })
      )
    }
  }),

  // Mock 影片上傳 (resumable upload - 初始化)
  rest.post('https://www.googleapis.com/upload/youtube/v3/videos', async (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.set('Location', 'https://www.googleapis.com/upload/youtube/v3/videos?uploadId=mock_upload_id_789'),
      ctx.json({})
    )
  }),

  // Mock 影片上傳 (resumable upload - 上傳檔案)
  rest.put('https://www.googleapis.com/upload/youtube/v3/videos', async (req, res, ctx) => {
    // 模擬上傳進度
    return res(
      ctx.delay(3000),
      ctx.status(200),
      ctx.json({
        kind: 'youtube#video',
        id: 'mock_video_id_XYZ123',
        snippet: {
          title: 'AI 生成的測試影片標題',
          description: '這是一段 AI 生成的影片描述...',
          tags: ['測試', 'AI', '自動化']
        },
        status: {
          uploadStatus: 'uploaded',
          privacyStatus: 'public'
        }
      })
    )
  }),

  // Mock 影片清單查詢
  rest.get('https://www.googleapis.com/youtube/v3/videos', (req, res, ctx) => {
    const videoId = req.url.searchParams.get('id')

    return res(
      ctx.status(200),
      ctx.json({
        items: [
          {
            kind: 'youtube#video',
            id: videoId,
            snippet: {
              title: 'AI 生成的測試影片標題',
              description: '描述...',
              thumbnails: {
                default: { url: 'https://i.ytimg.com/vi/mock_video_id/default.jpg' }
              }
            },
            status: {
              uploadStatus: 'uploaded',
              privacyStatus: 'public'
            }
          }
        ]
      })
    )
  }),

  // Mock 配額不足錯誤
  rest.post('https://www.googleapis.com/upload/youtube/v3/videos', (req, res, ctx) => {
    if (req.headers.get('X-Quota-Remaining') === '0') {
      return res(
        ctx.status(403),
        ctx.json({
          error: {
            code: 403,
            message: 'The request cannot be completed because you have exceeded your quota.',
            errors: [
              {
                domain: 'youtube.quota',
                reason: 'quotaExceeded'
              }
            ]
          }
        })
      )
    }
  })
]
```

**驗證點:**
- [ ] OAuth 流程正常 (取得 access_token)
- [ ] Resumable upload 正常運作
- [ ] 影片 ID 正確回傳
- [ ] Metadata 正確設定
- [ ] 配額不足錯誤處理

---

### Mock 整合配置

**檔案:** `tests/mocks/handlers.ts`

```typescript
import { geminiApiMock } from './gemini-api.mock'
import { stabilityAiMock } from './stability-ai.mock'
import { didApiMock } from './did-api.mock'
import { youtubeApiMock } from './youtube-api.mock'

export const handlers = [
  ...geminiApiMock,
  ...stabilityAiMock,
  ...didApiMock,
  ...youtubeApiMock
]
```

**檔案:** `tests/mocks/server.ts`

```typescript
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)

// 在測試前啟動 Mock Server
beforeAll(() => server.listen())

// 每次測試後重置 handlers
afterEach(() => server.resetHandlers())

// 測試結束後關閉 Server
afterAll(() => server.close())
```

---

## CI/CD 整合

### GitHub Actions Workflow

**檔案:** `.github/workflows/e2e-tests.yml`

```yaml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x]
        python-version: [3.9]

    services:
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      # 前端設定
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install frontend dependencies
        working-directory: ./frontend
        run: npm ci

      # 後端設定
      - name: Setup Python ${{ matrix.python-version }}
        uses: actions/setup-python@v4
        with:
          python-version: ${{ matrix.python-version }}
          cache: 'pip'
          cache-dependency-path: backend/requirements.txt

      - name: Install backend dependencies
        working-directory: ./backend
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-asyncio httpx

      # 安裝 Playwright Browsers
      - name: Install Playwright Browsers
        working-directory: ./frontend
        run: npx playwright install --with-deps

      # 啟動後端服務 (背景執行)
      - name: Start Backend Server
        working-directory: ./backend
        run: |
          uvicorn app.main:app --host 0.0.0.0 --port 8000 &
          sleep 5
        env:
          DATABASE_URL: sqlite:///./test.db
          REDIS_URL: redis://localhost:6379

      # 啟動前端服務 (背景執行)
      - name: Start Frontend Server
        working-directory: ./frontend
        run: |
          npm run build
          npm run start &
          sleep 10
        env:
          NEXT_PUBLIC_API_URL: http://localhost:8000

      # 執行 E2E 測試
      - name: Run E2E Tests
        working-directory: ./frontend
        run: npm run test:e2e
        env:
          CI: true

      # 上傳測試報告
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: frontend/playwright-report/
          retention-days: 30

      # 上傳測試影片 (失敗時)
      - name: Upload test videos
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-videos
          path: frontend/test-results/
          retention-days: 7

      # 測試覆蓋率報告
      - name: Generate Coverage Report
        working-directory: ./backend
        run: |
          pytest tests/ --cov=app --cov-report=xml --cov-report=html

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage.xml
          flags: backend
          name: backend-coverage

      # 前端測試覆蓋率
      - name: Frontend Coverage
        working-directory: ./frontend
        run: npm test -- --coverage --watchAll=false

      - name: Upload frontend coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./frontend/coverage/lcov.info
          flags: frontend
          name: frontend-coverage
```

---

### 測試執行腳本

**檔案:** `package.json` (frontend)

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

**執行方式:**

```bash
# 本地執行 E2E 測試
cd frontend
npm run test:e2e

# UI 模式 (視覺化)
npm run test:e2e:ui

# Headed 模式 (看瀏覽器)
npm run test:e2e:headed

# Debug 模式
npm run test:e2e:debug

# 單一測試檔案
npx playwright test tests/e2e/create-project.spec.ts

# 產生測試報告
npx playwright show-report
```

---

## 測試覆蓋率目標與驗證

### 覆蓋率目標

| 模塊 | 目標覆蓋率 | 驗證方式 |
|------|-----------|---------|
| 後端 API | > 85% | pytest --cov |
| 後端業務邏輯 | > 90% | pytest --cov |
| 前端元件 | > 80% | jest --coverage |
| 前端 Hooks | > 85% | jest --coverage |
| 整體專案 | > 80% | Codecov |

### 覆蓋率報告檢查

**後端覆蓋率檢查:**
```bash
cd backend
pytest tests/ --cov=app --cov-report=html --cov-report=term
open htmlcov/index.html
```

**前端覆蓋率檢查:**
```bash
cd frontend
npm test -- --coverage --watchAll=false
open coverage/lcov-report/index.html
```

**CI 覆蓋率驗證:**
- 使用 Codecov 自動檢查
- PR 時顯示覆蓋率變化
- 覆蓋率下降 > 1% 時警告

---

## 實作規格

### 需要建立/修改的檔案

#### 1. Mock Handlers

**目錄結構:**
```
frontend/
└── tests/
    └── mocks/
        ├── handlers.ts          # 整合所有 Mock handlers
        ├── server.ts            # MSW Server 設定
        ├── gemini-api.mock.ts   # Gemini API Mock
        ├── stability-ai.mock.ts # Stability AI Mock
        ├── did-api.mock.ts      # D-ID API Mock
        ├── youtube-api.mock.ts  # YouTube API Mock
        └── fixtures/            # 測試用的靜態資源
            ├── test-image.png
            ├── test-logo.png
            └── test-content.txt
```

#### 2. E2E 測試腳本

**目錄結構:**
```
frontend/
└── tests/
    └── e2e/
        ├── setup.ts                      # 測試環境設定
        ├── flow-0-setup-wizard.spec.ts   # Flow-0 測試
        ├── flow-1-basic-generation.spec.ts # Flow-1 測試
        ├── flow-2-template-generation.spec.ts # Flow-2 測試
        ├── flow-3-visual-config.spec.ts  # Flow-3 測試
        ├── flow-4-scheduled-publish.spec.ts # Flow-4 測試
        ├── flow-5-batch-processing.spec.ts # Flow-5 測試
        ├── flow-6-resume.spec.ts         # Flow-6 測試
        ├── flow-9-settings.spec.ts       # Flow-9 測試
        └── utils/
            ├── test-helpers.ts           # 測試輔助函數
            ├── mock-data.ts              # Mock 資料
            └── assertions.ts             # 自訂斷言
```

#### 3. 測試配置檔案

**`playwright.config.ts`**
```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  },
})
```

#### 4. GitHub Actions Workflow

**`.github/workflows/e2e-tests.yml`**
(已在 CI/CD 整合章節定義)

#### 5. 測試輔助函數

**`tests/e2e/utils/test-helpers.ts`**
```typescript
import { Page, expect } from '@playwright/test'

export class TestHelpers {
  constructor(private page: Page) {}

  // 填寫專案基本資訊
  async fillProjectBasicInfo(projectName: string, content: string) {
    await this.page.fill('input[name="project_name"]', projectName)
    await this.page.fill('textarea[name="content_text"]', content)
    await this.waitForCharCount(content.length)
  }

  // 等待字數統計更新
  async waitForCharCount(expectedCount: number) {
    await expect(this.page.locator(`text=${expectedCount} 字`)).toBeVisible()
  }

  // 等待頁面載入完成
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle')
  }

  // 等待 API 請求完成
  async waitForApiCall(url: string) {
    await this.page.waitForResponse(response =>
      response.url().includes(url) && response.status() === 200
    )
  }

  // 驗證 Toast 訊息
  async verifyToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') {
    const toast = this.page.locator(`.toast.${type}:has-text("${message}")`)
    await expect(toast).toBeVisible()
    await expect(toast).toHaveCount(1)
  }

  // 驗證導航到指定路由
  async verifyNavigation(path: string) {
    await this.page.waitForURL(`**${path}`)
    expect(this.page.url()).toContain(path)
  }

  // 模擬檔案上傳
  async uploadFile(selector: string, filePath: string) {
    await this.page.setInputFiles(selector, filePath)
  }

  // 等待元素可見
  async waitForElement(selector: string, timeout = 5000) {
    await this.page.waitForSelector(selector, { state: 'visible', timeout })
  }
}
```

---

## 開發指引

### TDD 開發流程

#### 第 1 步: 環境準備 (1 小時)

1. 確認前置任務 (Task-001 ~ Task-028) 全部完成
2. 安裝 Playwright:
   ```bash
   cd frontend
   npm install -D @playwright/test
   npx playwright install
   ```
3. 建立測試目錄結構
4. 配置 `playwright.config.ts`

#### 第 2 步: 設定 MSW Mock Server (2 小時)

1. 安裝 MSW:
   ```bash
   npm install -D msw
   ```
2. 建立 `tests/mocks/` 目錄
3. 實作 Gemini API Mock
4. 實作 Stability AI Mock
5. 實作 D-ID API Mock
6. 實作 YouTube API Mock
7. 整合所有 Handlers
8. 測試 Mock Server 運作

#### 第 3 步: 撰寫 E2E 測試 - Flow-0 (2 小時)

1. 建立 `flow-0-setup-wizard.spec.ts`
2. 撰寫測試 1: 完整設定流程
3. 撰寫測試 2: 跳過 YouTube 授權
4. 撰寫測試 3: API Key 驗證錯誤
5. 執行測試: `npm run test:e2e -- flow-0`
6. 確保所有測試通過

#### 第 4 步: 撰寫 E2E 測試 - Flow-1 (4 小時)

1. 建立 `flow-1-basic-generation.spec.ts`
2. 撰寫完整影片生成流程測試
3. 包含所有 6 個階段的驗證
4. 測試 WebSocket 連線與進度推送
5. 驗證 Mock API 正確呼叫
6. 執行測試並確保通過

#### 第 5 步: 撰寫其他 Flow 測試 (4 小時)

1. Flow-2: 模板生成 (1 小時)
2. Flow-3: 視覺化配置 (1 小時)
3. Flow-4: 排程發布 (30 分鐘)
4. Flow-5: 批次處理 (1 小時)
5. Flow-6: 斷點續傳 (30 分鐘)
6. Flow-9: 系統設定 (1 小時)

#### 第 6 步: 整合 CI/CD (1 小時)

1. 建立 `.github/workflows/e2e-tests.yml`
2. 配置 GitHub Actions
3. 設定 Codecov 整合
4. 測試 CI 流程 (推送到分支)
5. 確認測試在 CI 環境通過

#### 第 7 步: 測試覆蓋率驗證 (1 小時)

1. 執行覆蓋率報告:
   ```bash
   # 後端
   cd backend
   pytest --cov=app --cov-report=html

   # 前端
   cd frontend
   npm test -- --coverage
   ```
2. 檢查覆蓋率是否達標 (> 80%)
3. 補充遺漏的測試案例
4. 重新執行驗證

#### 第 8 步: 文件撰寫與整理 (1 小時)

1. 更新測試執行說明 (README)
2. 撰寫測試報告範本
3. 記錄已知問題與限制
4. 更新 `task-029.md` 狀態為 `[v]`

---

## 注意事項

### 測試穩定性

⚠️ **避免 Flaky Tests (不穩定測試)**
- 使用明確的等待條件 (`waitForSelector`, `waitForResponse`)
- 避免使用固定延遲 (`sleep`, `setTimeout`)
- 確保測試可獨立執行 (無依賴順序)

💡 **Mock 資料一致性**
- 所有 Mock 回應必須符合真實 API 格式
- 定期更新 Mock 資料以匹配 API 變更
- 記錄 Mock 資料的來源與版本

### 效能考量

⚡ **測試執行時間**
- 單一 E2E 測試應 < 2 分鐘
- 完整測試套件應 < 10 分鐘
- 使用並行執行加速 (Playwright 支援)

🔧 **資源清理**
- 每次測試後清理測試資料
- 關閉 WebSocket 連線
- 清除快取與 cookies

### Mock 限制

⚠️ **Mock 與真實 API 的差異**
- Mock 無法完全模擬真實 API 行為
- 定期使用真實 API 進行整合測試
- 記錄 Mock 與真實 API 的已知差異

### CI 環境

🌐 **CI 特殊配置**
- CI 環境使用無頭瀏覽器 (Headless)
- 設定較長的 timeout (網路可能較慢)
- 失敗時保留 screenshots 和 videos

---

## 完成檢查清單

### 功能完整性
- [ ] 8 個核心 Flow 的 E2E 測試全部實作
- [ ] 所有測試在本地環境通過
- [ ] 所有測試在 CI 環境通過
- [ ] Mock API 完整涵蓋所有第三方服務

### 測試品質
- [ ] 無 Flaky Tests (連續執行 5 次均通過)
- [ ] 測試可獨立執行 (不依賴順序)
- [ ] 錯誤情境完整覆蓋
- [ ] 測試斷言明確且有意義

### 覆蓋率
- [ ] 後端整體覆蓋率 > 80%
- [ ] 前端整體覆蓋率 > 80%
- [ ] 核心業務邏輯覆蓋率 > 90%
- [ ] Codecov 報告正常產生

### CI/CD
- [ ] GitHub Actions Workflow 正常運作
- [ ] 測試失敗時 PR 無法合併
- [ ] 測試報告自動上傳
- [ ] Codecov 整合正常

### 文件
- [ ] 測試執行指南完整
- [ ] Mock API 使用說明清楚
- [ ] 已知問題與限制記錄
- [ ] README 更新測試相關資訊

### 效能
- [ ] 單一測試執行時間 < 2 分鐘
- [ ] 完整測試套件 < 10 分鐘
- [ ] CI 測試執行時間 < 15 分鐘
- [ ] Mock 回應延遲設定合理

---

## 預估時間分配

- 環境準備與配置: 1 小時
- Mock Server 建立: 2 小時
- Flow-0 測試: 2 小時
- Flow-1 測試: 4 小時
- 其他 Flow 測試: 4 小時
- CI/CD 整合: 1 小時
- 覆蓋率驗證與補充: 1 小時
- 文件撰寫: 1 小時

**總計: 約 16 小時**

---

## 參考資源

### Playwright 文檔
- [Playwright 官方文檔](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Tests](https://playwright.dev/docs/debug)

### MSW 文檔
- [MSW 官方文檔](https://mswjs.io/)
- [Mocking REST API](https://mswjs.io/docs/getting-started/mocks/rest-api)
- [Node.js Integration](https://mswjs.io/docs/getting-started/integrate/node)

### 測試最佳實踐
- [Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)
- [Common Mistakes with React Testing Library](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

### 專案內部文件
- `tech-specs/backend/testing.md` - 後端測試策略
- `tech-specs/frontend/testing.md` - 前端測試規範
- `product-design/flows.md` - 完整 User Flows
- `development/phase-1/overview.md` - Phase 1 總覽

---

**準備好了嗎?** 開始使用 TDD 方式實作完整的 E2E 整合測試! 🚀
