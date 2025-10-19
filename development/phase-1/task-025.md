# Task-25: YouTube 設定頁面實作 (Page-6)

> **建立日期:** 2025-10-19
> **狀態:** ⏳ 未開始
> **預計時間:** 6 小時
> **優先級:** P0 (必須)

---

## 關聯文件

### 產品設計
- **頁面設計:** `product-design/pages.md#Page-6: YouTube 設定頁`
- **使用者流程:** `product-design/flows.md#Flow-1` (步驟 10: YouTube 上傳設定)
- **使用者流程:** `product-design/flows.md#Flow-4` (排程發布)

### 技術規格
- **頁面規格:** `tech-specs/frontend/pages.md#6-youtube-設定頁`
- **元件架構:** `tech-specs/frontend/component-architecture.md`
- **狀態管理:** `tech-specs/frontend/state-management.md#useAuthStore`
- **API 整合:** `tech-specs/frontend/api-integration.md`

### 後端 API
- **YouTube API:** `tech-specs/backend/api-youtube.md`
  - `GET /api/v1/youtube/accounts` - 取得已連結的 YouTube 帳號列表
  - `POST /api/v1/youtube/authorize` - 重新授權 YouTube 帳號
- **Projects API:** `tech-specs/backend/api-projects.md`
  - `PUT /api/v1/projects/:id/youtube-settings` - 儲存 YouTube 設定
  - `POST /api/v1/projects/:id/generate` - 開始生成流程

### 相關任務
- **前置任務:** Task-017 ✅ (路由系統), Task-018 ✅ (Zustand Stores), Task-019 ✅ (API 整合), Task-023 ✅ (Prompt & Model 設定頁)
- **後續任務:** Task-024 (進度監控頁), Task-029 (整合測試)

---

## 任務目標

### 簡述
實作專案配置流程的最後一步：YouTube 設定頁面。包含影片標題、描述、標籤的設定,隱私選項和發布方式(立即/排程)的選擇,以及 YouTube 帳號的管理。完成設定後啟動生成流程並跳轉到進度監控頁。

### 詳細目標
1. **YouTube 帳號管理區**
   - 顯示當前已連結的 YouTube 帳號資訊(頻道名稱、頭像)
   - 提供「變更頻道」功能(重新觸發 OAuth 授權)
   - 處理未連結帳號的情境(顯示警告並引導連結)

2. **影片資訊表單**
   - 影片標題輸入(可編輯 AI 生成的標題)
   - 影片描述輸入(可編輯 AI 生成的描述)
   - 標籤輸入(標籤列表元件,支援新增/刪除)
   - 隱私設定選擇(公開/不公開/私人)
   - 發布方式選擇(立即發布/排程發布)

3. **排程發布設定**
   - 日期選擇器(必須為未來日期)
   - 時間選擇器(必須為未來時間)
   - 時區顯示(自動偵測)
   - 即時驗證(防止選擇過去時間)

4. **AI 內容標註**
   - 強制勾選「此影片包含 AI 生成的內容」
   - 顯示說明文字(根據 YouTube 政策)

5. **表單驗證**
   - 即時驗證(輸入時驗證)
   - 提交前完整驗證
   - 清晰的錯誤訊息顯示

6. **頁面導航**
   - 步驟指示器(顯示步驟 4/4)
   - 「上一步」返回 Prompt 設定頁
   - 「儲存草稿」儲存設定但不開始生成
   - 「開始生成」儲存設定並啟動生成流程

7. **響應式設計**
   - 桌面、平板、手機版本的適配
   - 日期時間選擇器的行動裝置優化

### 成功標準
- ✅ YouTube 帳號狀態正確顯示
- ✅ 所有表單欄位可正常輸入和編輯
- ✅ 標籤輸入元件功能完整(新增/刪除/最多 30 個)
- ✅ 排程發布功能正確(只能選擇未來時間)
- ✅ 表單驗證規則正確實施
- ✅ API 整合完成(儲存設定、啟動生成)
- ✅ 錯誤處理完整(API 錯誤、驗證錯誤)
- ✅ 離開頁面時未儲存警告
- ✅ 響應式設計在所有裝置上正常運作
- ✅ 單元測試覆蓋率 > 80%

---

## 頁面規格

### 路由
- **路徑:** `/project/:id/configure/youtube`
- **權限:** 無需特殊權限

### 佈局結構

```
┌─────────────────────────────────────────────────┐
│  NavigationBar                                  │
├─────────────────────────────────────────────────┤
│  Breadcrumb: 主控台 > 新增專案 > YouTube 設定   │
├─────────────────────────────────────────────────┤
│  StepIndicator: [✓][✓][✓][●] (步驟 4/4)        │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  YouTube 帳號連結區                      │   │
│  │  [頻道頭像] 頻道名稱                     │   │
│  │  [變更頻道] 按鈕                         │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  影片資訊表單                            │   │
│  │  ┌────────────────────────────────────┐  │   │
│  │  │ 影片標題: [_____________________] │  │   │
│  │  └────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────┐  │   │
│  │  │ 影片描述:                          │  │   │
│  │  │ [_________________________]       │  │   │
│  │  └────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────┐  │   │
│  │  │ 標籤: [tag1][x] [tag2][x] [+新增] │  │   │
│  │  └────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────┐  │   │
│  │  │ 隱私: (•) 公開 ( ) 不公開 ( ) 私人│  │   │
│  │  └────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────┐  │   │
│  │  │ 發布: (•) 立即 ( ) 排程 [日期時間]│  │   │
│  │  └────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────┐  │   │
│  │  │ [✓] AI 生成內容標註 (強制勾選)    │  │   │
│  │  └────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  [上一步]  [儲存草稿]  [開始生成]               │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 測試要求

### 單元測試

#### 測試 1: 頁面正確載入並顯示 YouTube 帳號資訊

**目的:** 驗證頁面初始化時正確載入 YouTube 帳號和 AI 生成的 metadata

**前置條件:**
- 專案 ID 存在且狀態為 PROMPT_CONFIGURED
- 已連結一個 YouTube 帳號
- AI 已生成影片 metadata (標題、描述、標籤)

**模擬資料:**
```typescript
const mockYouTubeAccount = {
  id: 'yt-account-1',
  channel_name: '測試頻道',
  channel_avatar: 'https://example.com/avatar.jpg',
  subscriber_count: 10000,
  is_authorized: true
}

const mockGeneratedMetadata = {
  title: 'AI 生成的影片標題',
  description: 'AI 生成的影片描述內容...',
  tags: ['標籤1', '標籤2', '標籤3']
}
```

**測試步驟:**
1. Mock API 回應: `GET /api/v1/youtube/accounts` 返回 mockYouTubeAccount
2. Mock API 回應: `GET /api/v1/projects/:id` 返回包含 mockGeneratedMetadata 的專案資料
3. 渲染 YouTubeSettingsPage 元件
4. 等待非同步載入完成

**預期結果:**
```typescript
// YouTube 帳號資訊正確顯示
expect(screen.getByText('測試頻道')).toBeInTheDocument()
expect(screen.getByAltText('頻道頭像')).toHaveAttribute('src', mockYouTubeAccount.channel_avatar)

// AI 生成的 metadata 正確填入表單
expect(screen.getByLabelText('影片標題')).toHaveValue('AI 生成的影片標題')
expect(screen.getByLabelText('影片描述')).toHaveValue('AI 生成的影片描述內容...')

// 標籤正確顯示
expect(screen.getByText('標籤1')).toBeInTheDocument()
expect(screen.getByText('標籤2')).toBeInTheDocument()
expect(screen.getByText('標籤3')).toBeInTheDocument()
```

**驗證點:**
- [x] YouTube 頻道名稱正確顯示
- [x] 頻道頭像正確顯示
- [x] 影片標題欄位預填 AI 生成的標題
- [x] 影片描述欄位預填 AI 生成的描述
- [x] 標籤列表顯示 AI 生成的標籤
- [x] 隱私設定預設為「公開」
- [x] 發布方式預設為「立即發布」
- [x] AI 內容標註預設勾選且不可取消勾選

---

#### 測試 2: 標籤輸入功能(新增、刪除、限制)

**目的:** 驗證標籤輸入元件的所有功能

**測試步驟:**

**Part A: 新增標籤**
1. 渲染元件並等待載入
2. 找到標籤輸入框
3. 輸入新標籤「測試標籤4」
4. 按 Enter 鍵

**預期結果:**
```typescript
const tagInput = screen.getByPlaceholderText('輸入標籤後按 Enter')
fireEvent.change(tagInput, { target: { value: '測試標籤4' } })
fireEvent.keyDown(tagInput, { key: 'Enter', code: 'Enter' })

// 新標籤顯示在列表中
await waitFor(() => {
  expect(screen.getByText('測試標籤4')).toBeInTheDocument()
})

// 輸入框清空
expect(tagInput).toHaveValue('')
```

**Part B: 刪除標籤**
1. 點擊「標籤1」旁的 X 按鈕

**預期結果:**
```typescript
const deleteButton = screen.getAllByLabelText('刪除標籤')[0]
fireEvent.click(deleteButton)

// 標籤1 從列表中移除
await waitFor(() => {
  expect(screen.queryByText('標籤1')).not.toBeInTheDocument()
})
```

**Part C: 標籤數量限制**
1. 已有 29 個標籤
2. 嘗試新增第 30 個標籤 → 成功
3. 嘗試新增第 31 個標籤 → 失敗並顯示錯誤

**預期結果:**
```typescript
// 模擬已有 30 個標籤
const tags = Array.from({ length: 30 }, (_, i) => `標籤${i + 1}`)

// 嘗試新增第 31 個標籤
fireEvent.change(tagInput, { target: { value: '第31個標籤' } })
fireEvent.keyDown(tagInput, { key: 'Enter' })

// 顯示錯誤訊息
await waitFor(() => {
  expect(screen.getByText('最多只能新增 30 個標籤')).toBeInTheDocument()
})

// 標籤未新增
expect(screen.queryByText('第31個標籤')).not.toBeInTheDocument()
```

**驗證點:**
- [x] 按 Enter 鍵可新增標籤
- [x] 新增後輸入框清空
- [x] 點擊 X 按鈕可刪除標籤
- [x] 標籤數量限制在 30 個
- [x] 超過 30 個時顯示錯誤訊息
- [x] 空白標籤無法新增
- [x] 重複標籤無法新增(顯示警告)

---

#### 測試 3: 排程發布功能和時間驗證

**目的:** 驗證排程發布的日期時間選擇和驗證邏輯

**測試步驟:**

**Part A: 切換到排程發布模式**
1. 渲染元件
2. 選擇「排程發布」選項

**預期結果:**
```typescript
const scheduledRadio = screen.getByLabelText('排程發布')
fireEvent.click(scheduledRadio)

// 日期時間選擇器顯示
await waitFor(() => {
  expect(screen.getByLabelText('排程日期')).toBeInTheDocument()
  expect(screen.getByLabelText('排程時間')).toBeInTheDocument()
})
```

**Part B: 選擇未來時間(成功)**
1. 選擇明天的日期
2. 選擇 14:00 時間

**預期結果:**
```typescript
const tomorrow = new Date()
tomorrow.setDate(tomorrow.getDate() + 1)

const dateInput = screen.getByLabelText('排程日期')
fireEvent.change(dateInput, { target: { value: tomorrow.toISOString().split('T')[0] } })

const timeInput = screen.getByLabelText('排程時間')
fireEvent.change(timeInput, { target: { value: '14:00' } })

// 無錯誤訊息
expect(screen.queryByText(/排程時間必須為未來時間/)).not.toBeInTheDocument()
```

**Part C: 選擇過去時間(失敗)**
1. 選擇昨天的日期

**預期結果:**
```typescript
const yesterday = new Date()
yesterday.setDate(yesterday.getDate() - 1)

fireEvent.change(dateInput, { target: { value: yesterday.toISOString().split('T')[0] } })

// 顯示錯誤訊息
await waitFor(() => {
  expect(screen.getByText('排程日期必須為未來時間')).toBeInTheDocument()
})

// 「開始生成」按鈕禁用
expect(screen.getByText('開始生成')).toBeDisabled()
```

**Part D: 選擇今天但時間已過(失敗)**
1. 選擇今天的日期
2. 選擇已經過去的時間(例如現在是 15:00,選擇 14:00)

**預期結果:**
```typescript
const today = new Date()
fireEvent.change(dateInput, { target: { value: today.toISOString().split('T')[0] } })
fireEvent.change(timeInput, { target: { value: '08:00' } }) // 假設現在是 15:00

// 顯示錯誤訊息
await waitFor(() => {
  expect(screen.getByText('排程時間必須為未來時間')).toBeInTheDocument()
})
```

**驗證點:**
- [x] 選擇「排程發布」後顯示日期時間選擇器
- [x] 選擇「立即發布」後隱藏日期時間選擇器
- [x] 無法選擇過去的日期
- [x] 無法選擇今天已過去的時間
- [x] 可以選擇未來的日期時間
- [x] 時間驗證錯誤時顯示清晰的錯誤訊息
- [x] 時間驗證失敗時禁用「開始生成」按鈕

---

#### 測試 4: 表單驗證(必填欄位和格式)

**目的:** 驗證所有表單欄位的驗證規則

**測試步驟:**

**Part A: 標題必填驗證**
1. 清空標題欄位
2. 點擊「開始生成」

**預期結果:**
```typescript
const titleInput = screen.getByLabelText('影片標題')
fireEvent.change(titleInput, { target: { value: '' } })

const submitButton = screen.getByText('開始生成')
fireEvent.click(submitButton)

// 顯示錯誤訊息
await waitFor(() => {
  expect(screen.getByText('標題不能為空')).toBeInTheDocument()
})

// API 未被調用
expect(mockGenerateAPI).not.toHaveBeenCalled()
```

**Part B: 標題長度驗證**
1. 輸入超過 100 字元的標題

**預期結果:**
```typescript
const longTitle = 'A'.repeat(101)
fireEvent.change(titleInput, { target: { value: longTitle } })

// 顯示錯誤訊息
await waitFor(() => {
  expect(screen.getByText('標題不能超過 100 字元')).toBeInTheDocument()
})
```

**Part C: 描述必填驗證**
1. 清空描述欄位
2. 點擊「開始生成」

**預期結果:**
```typescript
const descriptionInput = screen.getByLabelText('影片描述')
fireEvent.change(descriptionInput, { target: { value: '' } })
fireEvent.click(submitButton)

await waitFor(() => {
  expect(screen.getByText('描述不能為空')).toBeInTheDocument()
})
```

**Part D: 描述長度驗證**
1. 輸入超過 5000 字元的描述

**預期結果:**
```typescript
const longDescription = 'A'.repeat(5001)
fireEvent.change(descriptionInput, { target: { value: longDescription } })

await waitFor(() => {
  expect(screen.getByText('描述不能超過 5000 字元')).toBeInTheDocument()
})
```

**Part E: 排程時間必填驗證**
1. 選擇「排程發布」
2. 不填寫日期時間
3. 點擊「開始生成」

**預期結果:**
```typescript
fireEvent.click(screen.getByLabelText('排程發布'))
fireEvent.click(submitButton)

await waitFor(() => {
  expect(screen.getByText('請選擇排程日期和時間')).toBeInTheDocument()
})
```

**驗證點:**
- [x] 標題為空時顯示錯誤
- [x] 標題超過 100 字元時顯示錯誤
- [x] 描述為空時顯示錯誤
- [x] 描述超過 5000 字元時顯示錯誤
- [x] 排程發布未選擇時間時顯示錯誤
- [x] 驗證錯誤時無法提交表單
- [x] 錯誤訊息顯示在對應欄位下方

---

#### 測試 5: 成功儲存設定並啟動生成流程

**目的:** 驗證完整的提交流程(儲存設定 + 啟動生成 + 跳轉)

**前置條件:**
- 所有表單欄位已正確填寫
- YouTube 帳號已連結

**測試步驟:**
1. 填寫所有必填欄位
2. 點擊「開始生成」按鈕
3. API 調用成功
4. 頁面跳轉到進度監控頁

**模擬表單資料:**
```typescript
const formData = {
  youtube_title: '測試影片標題',
  youtube_description: '測試影片描述內容',
  youtube_tags: ['標籤1', '標籤2', '標籤3'],
  privacy: 'public',
  publish_type: 'immediate',
  youtube_account_id: 'yt-account-1',
  ai_content_flag: true
}
```

**Mock API:**
```typescript
// Mock 儲存 YouTube 設定
mockAPI.put('/api/v1/projects/project-123/youtube-settings', formData)
  .reply(200, { success: true })

// Mock 啟動生成流程
mockAPI.post('/api/v1/projects/project-123/generate')
  .reply(200, {
    success: true,
    message: '生成流程已啟動',
    project_status: 'SCRIPT_GENERATING'
  })
```

**預期結果:**
```typescript
// 填寫表單
fireEvent.change(screen.getByLabelText('影片標題'), {
  target: { value: formData.youtube_title }
})
fireEvent.change(screen.getByLabelText('影片描述'), {
  target: { value: formData.youtube_description }
})

// 點擊「開始生成」
const submitButton = screen.getByText('開始生成')
fireEvent.click(submitButton)

// 顯示載入狀態
expect(submitButton).toBeDisabled()
expect(screen.getByText('開始生成中...')).toBeInTheDocument()

// API 被正確調用
await waitFor(() => {
  expect(mockPutAPI).toHaveBeenCalledWith(
    '/api/v1/projects/project-123/youtube-settings',
    expect.objectContaining(formData)
  )
  expect(mockPostAPI).toHaveBeenCalledWith('/api/v1/projects/project-123/generate')
})

// 顯示成功通知
expect(screen.getByText('設定已儲存，開始生成影片')).toBeInTheDocument()

// 跳轉到進度監控頁
await waitFor(() => {
  expect(mockRouter.push).toHaveBeenCalledWith('/project/project-123/progress')
})
```

**驗證點:**
- [x] 點擊「開始生成」後按鈕變為禁用狀態
- [x] 顯示載入提示
- [x] API 按順序調用(先儲存設定,再啟動生成)
- [x] API 請求包含正確的表單資料
- [x] 成功後顯示 toast 通知
- [x] 成功後跳轉到進度監控頁 `/project/:id/progress`
- [x] 跳轉時帶入正確的專案 ID

---

#### 測試 6: 「儲存草稿」功能(儲存但不啟動生成)

**目的:** 驗證「儲存草稿」按鈕只儲存設定但不啟動生成流程

**測試步驟:**
1. 填寫表單
2. 點擊「儲存草稿」按鈕
3. API 只調用儲存設定,不調用啟動生成
4. 返回主控台頁面

**Mock API:**
```typescript
// Mock 儲存設定(成功)
mockAPI.put('/api/v1/projects/project-123/youtube-settings', formData)
  .reply(200, { success: true })

// 啟動生成 API 不應該被調用
mockAPI.post('/api/v1/projects/project-123/generate')
  .reply(200, {}) // 這個不應該被調用
```

**預期結果:**
```typescript
// 填寫表單
fireEvent.change(screen.getByLabelText('影片標題'), {
  target: { value: '草稿標題' }
})

// 點擊「儲存草稿」
const saveDraftButton = screen.getByText('儲存草稿')
fireEvent.click(saveDraftButton)

// 只調用儲存設定 API
await waitFor(() => {
  expect(mockPutAPI).toHaveBeenCalledWith(
    '/api/v1/projects/project-123/youtube-settings',
    expect.any(Object)
  )
})

// 不調用啟動生成 API
expect(mockPostAPI).not.toHaveBeenCalled()

// 顯示成功通知
expect(screen.getByText('草稿已儲存')).toBeInTheDocument()

// 跳轉回主控台
await waitFor(() => {
  expect(mockRouter.push).toHaveBeenCalledWith('/')
})
```

**驗證點:**
- [x] 點擊「儲存草稿」只調用儲存設定 API
- [x] 不調用啟動生成 API
- [x] 成功後顯示「草稿已儲存」通知
- [x] 跳轉回主控台頁面
- [x] 專案狀態保持為 PROMPT_CONFIGURED (未進入生成狀態)

---

#### 測試 7: 錯誤處理(API 失敗場景)

**目的:** 驗證各種 API 錯誤情境的處理

**Part A: YouTube 帳號未連結**

**Mock API:**
```typescript
mockAPI.get('/api/v1/youtube/accounts')
  .reply(200, { accounts: [] }) // 空陣列表示無帳號
```

**預期結果:**
```typescript
render(<YouTubeSettingsPage projectId="project-123" />)

// 顯示警告訊息
await waitFor(() => {
  expect(screen.getByText('請先連結 YouTube 帳號')).toBeInTheDocument()
})

// 顯示「連結帳號」按鈕
expect(screen.getByText('連結帳號')).toBeInTheDocument()

// 「開始生成」按鈕禁用
expect(screen.getByText('開始生成')).toBeDisabled()
```

**Part B: 儲存設定失敗**

**Mock API:**
```typescript
mockAPI.put('/api/v1/projects/project-123/youtube-settings')
  .reply(500, {
    error: {
      code: 'SAVE_FAILED',
      message: '儲存失敗,請稍後再試'
    }
  })
```

**預期結果:**
```typescript
fireEvent.click(screen.getByText('開始生成'))

await waitFor(() => {
  // 顯示錯誤通知
  expect(screen.getByText('儲存失敗,請稍後再試')).toBeInTheDocument()

  // 按鈕恢復可用狀態
  expect(screen.getByText('開始生成')).not.toBeDisabled()
})

// 不跳轉頁面
expect(mockRouter.push).not.toHaveBeenCalled()
```

**Part C: 啟動生成失敗**

**Mock API:**
```typescript
mockAPI.put('/api/v1/projects/project-123/youtube-settings')
  .reply(200, { success: true })

mockAPI.post('/api/v1/projects/project-123/generate')
  .reply(400, {
    error: {
      code: 'GENERATION_FAILED',
      message: 'API 金鑰無效,無法啟動生成'
    }
  })
```

**預期結果:**
```typescript
fireEvent.click(screen.getByText('開始生成'))

await waitFor(() => {
  // 顯示錯誤通知
  expect(screen.getByText('API 金鑰無效,無法啟動生成')).toBeInTheDocument()
})

// 不跳轉頁面(留在設定頁讓用戶修正)
expect(mockRouter.push).not.toHaveBeenCalled()
```

**Part D: 網路錯誤**

**Mock API:**
```typescript
mockAPI.put('/api/v1/projects/project-123/youtube-settings')
  .networkError()
```

**預期結果:**
```typescript
fireEvent.click(screen.getByText('開始生成'))

await waitFor(() => {
  expect(screen.getByText('網路連線失敗,請檢查網路連線')).toBeInTheDocument()
})
```

**驗證點:**
- [x] YouTube 帳號未連結時顯示警告並禁用提交按鈕
- [x] 儲存設定失敗時顯示錯誤訊息
- [x] 啟動生成失敗時顯示錯誤訊息
- [x] 網路錯誤時顯示友善的錯誤提示
- [x] 錯誤後按鈕恢復可用狀態
- [x] 錯誤後不跳轉頁面

---

#### 測試 8: 離開頁面未儲存警告

**目的:** 驗證表單有未儲存的變更時,離開頁面會顯示警告

**測試步驟:**

**Part A: 有未儲存變更時離開**
1. 修改表單內容(例如修改標題)
2. 點擊「上一步」按鈕
3. 顯示確認 Modal

**預期結果:**
```typescript
// 修改標題
const titleInput = screen.getByLabelText('影片標題')
fireEvent.change(titleInput, { target: { value: '修改後的標題' } })

// 點擊「上一步」
const backButton = screen.getByText('上一步')
fireEvent.click(backButton)

// 顯示確認對話框
await waitFor(() => {
  expect(screen.getByText('您有未儲存的變更,確定要離開嗎?')).toBeInTheDocument()
  expect(screen.getByText('保存草稿')).toBeInTheDocument()
  expect(screen.getByText('放棄')).toBeInTheDocument()
  expect(screen.getByText('取消')).toBeInTheDocument()
})

// 尚未跳轉
expect(mockRouter.back).not.toHaveBeenCalled()
```

**Part B: 選擇「保存草稿」**
1. 在確認 Modal 中點擊「保存草稿」
2. 儲存成功後返回上一頁

**預期結果:**
```typescript
const saveDraftButton = within(screen.getByRole('dialog'))
  .getByText('保存草稿')
fireEvent.click(saveDraftButton)

// 調用儲存 API
await waitFor(() => {
  expect(mockPutAPI).toHaveBeenCalled()
})

// 跳轉
await waitFor(() => {
  expect(mockRouter.back).toHaveBeenCalled()
})
```

**Part C: 選擇「放棄」**
1. 在確認 Modal 中點擊「放棄」
2. 直接返回上一頁(不儲存)

**預期結果:**
```typescript
const discardButton = within(screen.getByRole('dialog'))
  .getByText('放棄')
fireEvent.click(discardButton)

// 不調用儲存 API
expect(mockPutAPI).not.toHaveBeenCalled()

// 直接跳轉
await waitFor(() => {
  expect(mockRouter.back).toHaveBeenCalled()
})
```

**Part D: 選擇「取消」**
1. 在確認 Modal 中點擊「取消」
2. 留在當前頁面

**預期結果:**
```typescript
const cancelButton = within(screen.getByRole('dialog'))
  .getByText('取消')
fireEvent.click(cancelButton)

// Modal 關閉
await waitFor(() => {
  expect(screen.queryByText('您有未儲存的變更')).not.toBeInTheDocument()
})

// 未跳轉
expect(mockRouter.back).not.toHaveBeenCalled()
```

**Part E: 沒有變更時離開(不顯示警告)**
1. 不修改任何表單內容
2. 點擊「上一步」
3. 直接跳轉(不顯示確認 Modal)

**預期結果:**
```typescript
// 沒有修改表單
fireEvent.click(backButton)

// 不顯示確認 Modal
expect(screen.queryByText('您有未儲存的變更')).not.toBeInTheDocument()

// 直接跳轉
await waitFor(() => {
  expect(mockRouter.back).toHaveBeenCalled()
})
```

**驗證點:**
- [x] 有未儲存變更時離開顯示確認 Modal
- [x] Modal 包含三個選項: 保存草稿、放棄、取消
- [x] 「保存草稿」會儲存並跳轉
- [x] 「放棄」會直接跳轉不儲存
- [x] 「取消」會關閉 Modal 並留在當前頁
- [x] 沒有變更時離開不顯示 Modal

---

### 整合測試

#### 測試 9: 完整流程端到端測試

**目的:** 測試從進入頁面到成功啟動生成的完整流程

**測試場景:** 一個新用戶完成專案配置的最後一步

**測試步驟:**
1. 從 Prompt 設定頁點擊「下一步」進入 YouTube 設定頁
2. 頁面載入並顯示 YouTube 帳號資訊和 AI 生成的 metadata
3. 編輯影片標題
4. 新增兩個自訂標籤
5. 選擇隱私為「不公開」
6. 選擇「排程發布」並設定明天 10:00
7. 點擊「開始生成」
8. 等待 API 調用完成
9. 跳轉到進度監控頁

**完整流程驗證:**
```typescript
// 1. 從 Prompt 頁面進入
const { rerender } = render(<PromptModelPage projectId="project-123" />)
fireEvent.click(screen.getByText('下一步'))

// 2. 渲染 YouTube 設定頁
rerender(<YouTubeSettingsPage projectId="project-123" />)

// 等待載入完成
await waitFor(() => {
  expect(screen.getByText('測試頻道')).toBeInTheDocument()
  expect(screen.getByLabelText('影片標題')).toHaveValue('AI 生成的影片標題')
})

// 3. 編輯標題
const titleInput = screen.getByLabelText('影片標題')
fireEvent.change(titleInput, { target: { value: '我的自訂標題' } })

// 4. 新增自訂標籤
const tagInput = screen.getByPlaceholderText('輸入標籤後按 Enter')
fireEvent.change(tagInput, { target: { value: '自訂標籤1' } })
fireEvent.keyDown(tagInput, { key: 'Enter' })

fireEvent.change(tagInput, { target: { value: '自訂標籤2' } })
fireEvent.keyDown(tagInput, { key: 'Enter' })

// 5. 選擇「不公開」
fireEvent.click(screen.getByLabelText('不公開'))

// 6. 選擇排程發布
fireEvent.click(screen.getByLabelText('排程發布'))

const tomorrow = new Date()
tomorrow.setDate(tomorrow.getDate() + 1)

const dateInput = screen.getByLabelText('排程日期')
fireEvent.change(dateInput, {
  target: { value: tomorrow.toISOString().split('T')[0] }
})

const timeInput = screen.getByLabelText('排程時間')
fireEvent.change(timeInput, { target: { value: '10:00' } })

// 7. 點擊「開始生成」
const submitButton = screen.getByText('開始生成')
fireEvent.click(submitButton)

// 8. 驗證 API 調用
await waitFor(() => {
  expect(mockPutAPI).toHaveBeenCalledWith(
    '/api/v1/projects/project-123/youtube-settings',
    expect.objectContaining({
      youtube_title: '我的自訂標題',
      youtube_tags: expect.arrayContaining(['自訂標籤1', '自訂標籤2']),
      privacy: 'unlisted',
      publish_type: 'scheduled',
      scheduled_date: tomorrow.toISOString().split('T')[0],
      scheduled_time: '10:00'
    })
  )

  expect(mockPostAPI).toHaveBeenCalledWith('/api/v1/projects/project-123/generate')
})

// 9. 驗證跳轉
await waitFor(() => {
  expect(mockRouter.push).toHaveBeenCalledWith('/project/project-123/progress')
})
```

**驗證點:**
- [x] 完整流程無錯誤
- [x] 每個步驟的狀態正確更新
- [x] API 按正確順序調用
- [x] 最終跳轉到正確頁面
- [x] 使用者輸入完整保留在提交資料中

---

## 實作規格
