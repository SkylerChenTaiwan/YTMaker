# [v] Task-023: 前端頁面實作 (步驟 3-4：Prompt 與 YouTube 設定)

> **建立日期:** 2025-10-19
> **完成日期:** 2025-10-21
> **狀態:** ✅ 已完成
> **實際時間:** 4 小時
> **優先級:** P0 (必須)

---

## 關聯文件

### 產品設計
- **頁面設計:** `product-design/pages.md#Page-5`, `product-design/pages.md#Page-6`
- **使用者流程:** `product-design/flows.md#Flow-1` (步驟 4-5, 6-7, 10)

### 技術規格
- **頁面規格:** `tech-specs/frontend/pages.md#5-prompt-與模型設定頁`, `tech-specs/frontend/pages.md#6-youtube-設定頁`
- **元件架構:** `tech-specs/frontend/component-architecture.md`
- **狀態管理:** `tech-specs/frontend/state-management.md`

### 相關任務
- **前置任務:** Task-017 ✅, Task-018 ✅, Task-019 ✅, Task-022 ✅
- **後續任務:** Task-024 (進度監控頁面)

---

## 任務目標

### 簡述
實作專案創建流程的步驟 3 和步驟 4，包含 Prompt 範本選擇、Gemini 模型選擇、YouTube 影片資訊設定、發布設定等功能。

### 成功標準
- [x] Page-5 (Prompt 與模型設定頁) 完整實作
- [x] Page-6 (YouTube 設定頁) 完整實作
- [x] Prompt 範本管理功能 (新增、編輯、刪除)
- [x] 模型選擇與對比功能
- [x] YouTube 資訊表單與驗證
- [x] 排程發布功能
- [x] 表單狀態管理與自動儲存
- [x] 頁面導航與步驟指示器
- [x] 響應式設計
- [x] 單元測試完成

---

## 頁面對應

### Page-5: Prompt 與模型設定頁

**路由:** `/project/:id/configure/prompt-model`

**核心功能:**
1. Prompt 範本選擇器
2. Prompt 編輯器 (支援自訂編輯)
3. 範本管理 (新增、編輯、刪除範本)
4. Gemini 模型選擇 (pro vs flash)
5. 模型對比資訊顯示

---

### Page-6: YouTube 設定頁

**路由:** `/project/:id/configure/youtube`

**核心功能:**
1. YouTube 帳號連結狀態顯示
2. 影片資訊表單 (標題、描述、標籤)
3. 隱私設定選擇
4. 發布方式選擇 (立即/排程)
5. 排程日期時間選擇器
6. AI 內容標註

---

## 測試要求

### 單元測試

#### 測試 1：Page-5 基本渲染與表單互動

**目的:** 驗證 Prompt 設定頁面能正確渲染並處理用戶輸入

**測試步驟:**
```typescript
// __tests__/pages/PromptModelPage.test.tsx
describe('PromptModelPage', () => {
  it('應該正確渲染所有表單元素', async () => {
    // 1. Mock project data
    const mockProject = {
      id: 'project-123',
      project_name: 'Test Project',
      prompt_template_id: 'default',
      prompt_content: '預設 Prompt 內容...',
      gemini_model: 'gemini-1.5-flash'
    }

    // 2. Mock API
    mockUseQuery.mockReturnValue({
      data: {
        promptTemplates: [
          { id: 'default', name: '預設範本', content: '預設 Prompt 內容...' },
          { id: 'custom-1', name: '自訂範本 1', content: '自訂內容...' }
        ]
      },
      isLoading: false
    })

    // 3. Render page
    render(<PromptModelPage params={{ id: 'project-123' }} />)

    // 4. Verify elements
    expect(screen.getByText('Prompt 與模型設定')).toBeInTheDocument()
    expect(screen.getByLabelText('Prompt 範本')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /prompt 內容/i })).toBeInTheDocument()
    expect(screen.getByText('gemini-1.5-pro')).toBeInTheDocument()
    expect(screen.getByText('gemini-1.5-flash')).toBeInTheDocument()
  })
})
```

**驗證點:**
- [ ] 頁面標題顯示正確
- [ ] Prompt 範本下拉選單正確渲染
- [ ] Prompt 編輯器顯示
- [ ] 模型選擇按鈕正確渲染
- [ ] 步驟指示器顯示當前為步驟 3
- [ ] 「上一步」和「下一步」按鈕正確顯示

---

#### 測試 2：Prompt 範本選擇與載入

**目的:** 驗證選擇不同範本時能正確載入範本內容到編輯器

**輸入:**
```typescript
// 用戶操作流程
1. 選擇範本下拉選單
2. 選擇「自訂範本 1」
3. 系統載入範本內容到編輯器
```

**預期輸出:**
```typescript
{
  selectedTemplateId: 'custom-1',
  promptContent: '自訂內容...',  // 編輯器內容已更新
  characterCount: 12
}
```

**測試實作:**
```typescript
it('選擇範本後應該載入範本內容', async () => {
  const { user } = setup()

  // 1. Find and click template selector
  const templateSelect = screen.getByLabelText('Prompt 範本')
  await user.click(templateSelect)

  // 2. Select custom template
  const customTemplate = screen.getByText('自訂範本 1')
  await user.click(customTemplate)

  // 3. Verify prompt content updated
  const promptEditor = screen.getByRole('textbox', { name: /prompt 內容/i })
  expect(promptEditor).toHaveValue('自訂內容...')

  // 4. Verify character count
  expect(screen.getByText('目前字數: 12')).toBeInTheDocument()
})
```

**驗證點:**
- [ ] 範本選擇器顯示所有可用範本
- [ ] 點擊範本後編輯器內容更新
- [ ] 字數統計即時更新
- [ ] 未儲存標記出現 (如有實作)

---

#### 測試 3：Prompt 內容驗證與錯誤處理

**目的:** 驗證 Prompt 長度驗證邏輯

**輸入場景 A - 內容過短:**
```typescript
{
  promptContent: '太短'  // 少於 200 字
}
```

**預期輸出 A:**
```typescript
{
  error: {
    field: 'prompt_content',
    message: 'Prompt 長度必須在 200-1000 字之間',
    type: 'min_length'
  },
  canProceed: false  // 無法進入下一步
}
```

**輸入場景 B - 內容過長:**
```typescript
{
  promptContent: 'x'.repeat(1001)  // 超過 1000 字
}
```

**預期輸出 B:**
```typescript
{
  error: {
    field: 'prompt_content',
    message: 'Prompt 長度必須在 200-1000 字之間',
    type: 'max_length'
  },
  canProceed: false
}
```

**測試實作:**
```typescript
it('Prompt 內容少於 200 字時應該顯示錯誤', async () => {
  const { user } = setup()

  // 1. Clear editor and type short content
  const promptEditor = screen.getByRole('textbox', { name: /prompt 內容/i })
  await user.clear(promptEditor)
  await user.type(promptEditor, '太短')

  // 2. Try to proceed
  const nextButton = screen.getByRole('button', { name: /下一步/i })
  await user.click(nextButton)

  // 3. Verify error message
  expect(screen.getByText('Prompt 長度必須在 200-1000 字之間')).toBeInTheDocument()

  // 4. Verify cannot proceed
  expect(mockRouter.push).not.toHaveBeenCalled()
})

it('Prompt 內容超過 1000 字時應該顯示錯誤', async () => {
  const { user } = setup()

  const longContent = 'x'.repeat(1001)
  const promptEditor = screen.getByRole('textbox', { name: /prompt 內容/i })

  await user.clear(promptEditor)
  await user.type(promptEditor, longContent)

  const nextButton = screen.getByRole('button', { name: /下一步/i })
  await user.click(nextButton)

  expect(screen.getByText('Prompt 長度必須在 200-1000 字之間')).toBeInTheDocument()
  expect(mockRouter.push).not.toHaveBeenCalled()
})
```

**驗證點:**
- [ ] 字數少於 200 時顯示錯誤
- [ ] 字數超過 1000 時顯示錯誤
- [ ] 錯誤訊息顯示於編輯器下方
- [ ] 無法點擊「下一步」或點擊後無反應

---

#### 測試 4：Gemini 模型選擇

**目的:** 驗證模型選擇功能與狀態更新

**輸入:**
```typescript
// 用戶操作
1. 點擊 gemini-1.5-pro 選項
2. 系統更新選擇狀態
```

**預期輸出:**
```typescript
{
  selectedModel: 'gemini-1.5-pro',
  modelInfo: {
    quality: '⭐⭐⭐',
    speed: '中等',
    cost: '較高',
    description: '高品質、適合複雜內容、成本較高'
  }
}
```

**測試實作:**
```typescript
it('選擇模型後應該更新狀態', async () => {
  const { user } = setup()

  // 1. Find and click pro model
  const proModelOption = screen.getByLabelText('gemini-1.5-pro')
  await user.click(proModelOption)

  // 2. Verify pro is selected
  expect(proModelOption).toBeChecked()

  // 3. Verify flash is not selected
  const flashModelOption = screen.getByLabelText('gemini-1.5-flash')
  expect(flashModelOption).not.toBeChecked()

  // 4. Verify model info displayed
  expect(screen.getByText('高品質、適合複雜內容、成本較高')).toBeInTheDocument()
})

it('應該顯示模型對比表格', () => {
  setup()

  // Verify comparison table
  expect(screen.getByText('品質')).toBeInTheDocument()
  expect(screen.getByText('速度')).toBeInTheDocument()
  expect(screen.getByText('成本')).toBeInTheDocument()
  expect(screen.getByText('適合場景')).toBeInTheDocument()
})
```

**驗證點:**
- [ ] 模型選項以 Radio buttons 顯示
- [ ] 點擊後狀態正確更新
- [ ] 模型對比表格顯示
- [ ] 選中狀態視覺化呈現 (如高亮邊框)

---

#### 測試 5：新增 Prompt 範本

**目的:** 驗證新增範本功能流程

**輸入:**
```typescript
{
  templateName: '技術教學範本',
  templateContent: '請根據以下內容生成技術教學影片腳本...(200+ 字)'
}
```

**預期輸出:**
```typescript
{
  success: true,
  newTemplate: {
    id: 'generated-id',
    name: '技術教學範本',
    content: '請根據以下內容生成技術教學影片腳本...',
    created_at: '2025-10-19T10:00:00Z'
  },
  toast: {
    type: 'success',
    message: '範本已儲存'
  }
}
```

**測試實作:**
```typescript
it('應該能新增 Prompt 範本', async () => {
  const { user } = setup()

  const mockSaveTemplate = jest.fn().mockResolvedValue({
    id: 'template-new',
    name: '技術教學範本',
    content: '請根據以下內容生成...'
  })

  mockUseMutation.mockReturnValue({
    mutate: mockSaveTemplate,
    isLoading: false
  })

  // 1. Click "新增範本" button
  const addTemplateButton = screen.getByRole('button', { name: /新增範本/i })
  await user.click(addTemplateButton)

  // 2. Verify modal opened
  expect(screen.getByText('新增 Prompt 範本')).toBeInTheDocument()

  // 3. Fill template name
  const nameInput = screen.getByLabelText('範本名稱')
  await user.type(nameInput, '技術教學範本')

  // 4. Fill template content
  const contentInput = screen.getByLabelText('Prompt 內容')
  await user.type(contentInput, '請根據以下內容生成技術教學影片腳本...')

  // 5. Click save
  const saveButton = screen.getByRole('button', { name: /儲存/i })
  await user.click(saveButton)

  // 6. Verify API called
  expect(mockSaveTemplate).toHaveBeenCalledWith({
    name: '技術教學範本',
    content: expect.stringContaining('請根據以下內容')
  })

  // 7. Verify success toast
  await waitFor(() => {
    expect(mockToast.success).toHaveBeenCalledWith('範本已儲存')
  })
})
```

**驗證點:**
- [ ] 點擊「新增範本」顯示 Modal
- [ ] Modal 包含範本名稱和內容輸入框
- [ ] 驗證範本名稱不能為空
- [ ] 驗證內容長度 (200-1000 字)
- [ ] 儲存成功後 Modal 關閉
- [ ] 範本列表更新包含新範本
- [ ] 顯示成功通知

---

#### 測試 6：Page-6 YouTube 設定表單渲染

**目的:** 驗證 YouTube 設定頁面正確渲染

**前置條件:**
```typescript
const mockYouTubeAccount = {
  id: 'yt-account-1',
  channel_name: 'My Tech Channel',
  channel_id: 'UC123456789',
  avatar_url: 'https://example.com/avatar.jpg',
  subscriber_count: 10000,
  is_authorized: true
}
```

**預期輸出:**
```typescript
// 頁面應該顯示:
- YouTube 帳號卡片 (頻道名稱、頭像)
- 影片標題輸入框
- 影片描述文字區
- 標籤輸入 (Tags Input)
- 隱私設定 Radio buttons
- 發布方式選擇
- AI 內容標註勾選框 (預設勾選、不可取消)
```

**測試實作:**
```typescript
describe('YouTubeSettingsPage', () => {
  it('應該正確渲染 YouTube 設定表單', async () => {
    // Mock YouTube account
    mockUseStore.mockReturnValue({
      settings: {
        youtubeAccounts: [mockYouTubeAccount]
      }
    })

    render(<YouTubeSettingsPage params={{ id: 'project-123' }} />)

    // Verify YouTube account display
    expect(screen.getByText('My Tech Channel')).toBeInTheDocument()
    expect(screen.getByAltText('My Tech Channel')).toHaveAttribute('src', 'https://example.com/avatar.jpg')

    // Verify form fields
    expect(screen.getByLabelText('影片標題')).toBeInTheDocument()
    expect(screen.getByLabelText('影片描述')).toBeInTheDocument()
    expect(screen.getByLabelText('標籤')).toBeInTheDocument()

    // Verify privacy options
    expect(screen.getByLabelText('公開')).toBeInTheDocument()
    expect(screen.getByLabelText('不公開')).toBeInTheDocument()
    expect(screen.getByLabelText('私人')).toBeInTheDocument()

    // Verify publish type
    expect(screen.getByLabelText('立即發布')).toBeInTheDocument()
    expect(screen.getByLabelText('排程發布')).toBeInTheDocument()

    // Verify AI content flag
    const aiContentCheckbox = screen.getByLabelText(/此影片包含 AI 生成的內容/i)
    expect(aiContentCheckbox).toBeChecked()
    expect(aiContentCheckbox).toBeDisabled()
  })
})
```

**驗證點:**
- [ ] YouTube 帳號資訊正確顯示
- [ ] 所有表單欄位正確渲染
- [ ] 隱私設定預設為「公開」
- [ ] 發布方式預設為「立即發布」
- [ ] AI 內容標註預設勾選且不可取消

---

#### 測試 7：YouTube 資訊表單驗證

**目的:** 驗證 YouTube 設定表單的各項驗證規則

**測試場景 A - 標題為空:**
```typescript
{
  title: '',  // 空字串
  description: '這是影片描述',
  privacy: 'public'
}
```

**預期輸出 A:**
```typescript
{
  error: {
    field: 'youtube_title',
    message: '標題不能為空'
  },
  canSubmit: false
}
```

**測試場景 B - 標題過長:**
```typescript
{
  title: 'x'.repeat(101),  // 超過 100 字元
  description: '描述',
  privacy: 'public'
}
```

**預期輸出 B:**
```typescript
{
  error: {
    field: 'youtube_title',
    message: '標題不能超過 100 字元'
  },
  canSubmit: false
}
```

**測試實作:**
```typescript
it('標題為空時應該顯示錯誤', async () => {
  const { user } = setup()

  const titleInput = screen.getByLabelText('影片標題')
  await user.clear(titleInput)

  const submitButton = screen.getByRole('button', { name: /開始生成/i })
  await user.click(submitButton)

  expect(screen.getByText('標題不能為空')).toBeInTheDocument()
  expect(mockRouter.push).not.toHaveBeenCalled()
})

it('標題超過 100 字元時應該顯示錯誤', async () => {
  const { user } = setup()

  const titleInput = screen.getByLabelText('影片標題')
  await user.clear(titleInput)
  await user.type(titleInput, 'x'.repeat(101))

  const submitButton = screen.getByRole('button', { name: /開始生成/i })
  await user.click(submitButton)

  expect(screen.getByText('標題不能超過 100 字元')).toBeInTheDocument()
})

it('描述超過 5000 字元時應該顯示錯誤', async () => {
  const { user } = setup()

  const descInput = screen.getByLabelText('影片描述')
  await user.clear(descInput)
  await user.type(descInput, 'x'.repeat(5001))

  const submitButton = screen.getByRole('button', { name: /開始生成/i })
  await user.click(submitButton)

  expect(screen.getByText(/描述不能超過 5000 字元/i)).toBeInTheDocument()
})
```

**驗證點:**
- [ ] 標題必填驗證
- [ ] 標題長度驗證 (1-100)
- [ ] 描述長度驗證 (0-5000)
- [ ] 錯誤訊息顯示於對應欄位下方

---

#### 測試 8：標籤輸入功能

**目的:** 驗證標籤輸入與管理功能

**輸入:**
```typescript
// 用戶操作
1. 在標籤輸入框輸入 "科技"
2. 按下 Enter 鍵
3. 標籤被添加到列表
4. 重複添加更多標籤
5. 點擊標籤的 X 按鈕刪除
```

**預期輸出:**
```typescript
{
  tags: ['科技', '教學', 'AI'],
  maxTags: 30  // 最多 30 個標籤
}
```

**測試實作:**
```typescript
it('應該能新增和刪除標籤', async () => {
  const { user } = setup()

  const tagInput = screen.getByLabelText('標籤')

  // 1. Add first tag
  await user.type(tagInput, '科技{Enter}')
  expect(screen.getByText('科技')).toBeInTheDocument()

  // 2. Add second tag
  await user.type(tagInput, '教學{Enter}')
  expect(screen.getByText('教學')).toBeInTheDocument()

  // 3. Add third tag
  await user.type(tagInput, 'AI{Enter}')
  expect(screen.getByText('AI')).toBeInTheDocument()

  // 4. Remove second tag
  const removeButtons = screen.getAllByRole('button', { name: /移除標籤/i })
  await user.click(removeButtons[1])  // Remove "教學"

  expect(screen.queryByText('教學')).not.toBeInTheDocument()
  expect(screen.getByText('科技')).toBeInTheDocument()
  expect(screen.getByText('AI')).toBeInTheDocument()
})

it('標籤數量不應超過 30 個', async () => {
  const { user } = setup()

  const tagInput = screen.getByLabelText('標籤')

  // Add 30 tags
  for (let i = 1; i <= 30; i++) {
    await user.type(tagInput, `標籤${i}{Enter}`)
  }

  // Try to add 31st tag
  await user.type(tagInput, '標籤31{Enter}')

  expect(screen.getByText('標籤數量不能超過 30 個')).toBeInTheDocument()
  expect(screen.queryByText('標籤31')).not.toBeInTheDocument()
})
```

**驗證點:**
- [ ] 按 Enter 新增標籤
- [ ] 標籤顯示為可刪除的 Badge
- [ ] 點擊 X 刪除標籤
- [ ] 最多 30 個標籤限制
- [ ] 超過 30 個時顯示錯誤

---

#### 測試 9：排程發布功能

**目的:** 驗證排程發布的日期時間選擇與驗證

**輸入場景 A - 選擇未來時間:**
```typescript
{
  publishType: 'scheduled',
  scheduledDate: '2025-10-25',
  scheduledTime: '10:00'
}
```

**預期輸出 A:**
```typescript
{
  scheduledDatetime: '2025-10-25T10:00:00+08:00',
  isValid: true,
  canSubmit: true
}
```

**輸入場景 B - 選擇過去時間:**
```typescript
{
  publishType: 'scheduled',
  scheduledDate: '2020-01-01',
  scheduledTime: '10:00'
}
```

**預期輸出 B:**
```typescript
{
  error: {
    field: 'scheduled_date',
    message: '排程日期必須為未來時間'
  },
  isValid: false,
  canSubmit: false
}
```

**測試實作:**
```typescript
it('選擇排程發布應該顯示日期時間選擇器', async () => {
  const { user } = setup()

  // 1. Select scheduled publish
  const scheduledOption = screen.getByLabelText('排程發布')
  await user.click(scheduledOption)

  // 2. Verify date/time pickers appear
  expect(screen.getByLabelText('排程日期')).toBeInTheDocument()
  expect(screen.getByLabelText('排程時間')).toBeInTheDocument()
})

it('選擇未來時間應該通過驗證', async () => {
  const { user } = setup()

  const scheduledOption = screen.getByLabelText('排程發布')
  await user.click(scheduledOption)

  // Mock current time as 2025-10-19 12:00
  jest.useFakeTimers()
  jest.setSystemTime(new Date('2025-10-19T12:00:00'))

  // Select future date and time
  const dateInput = screen.getByLabelText('排程日期')
  const timeInput = screen.getByLabelText('排程時間')

  await user.type(dateInput, '2025-10-25')
  await user.type(timeInput, '10:00')

  const submitButton = screen.getByRole('button', { name: /開始生成/i })
  await user.click(submitButton)

  // Should not show error
  expect(screen.queryByText(/排程日期必須為未來時間/i)).not.toBeInTheDocument()

  jest.useRealTimers()
})

it('選擇過去時間應該顯示錯誤', async () => {
  const { user } = setup()

  const scheduledOption = screen.getByLabelText('排程發布')
  await user.click(scheduledOption)

  jest.useFakeTimers()
  jest.setSystemTime(new Date('2025-10-19T12:00:00'))

  const dateInput = screen.getByLabelText('排程日期')
  const timeInput = screen.getByLabelText('排程時間')

  await user.type(dateInput, '2020-01-01')
  await user.type(timeInput, '10:00')

  const submitButton = screen.getByRole('button', { name: /開始生成/i })
  await user.click(submitButton)

  expect(screen.getByText('排程日期必須為未來時間')).toBeInTheDocument()

  jest.useRealTimers()
})
```

**驗證點:**
- [ ] 選擇「排程發布」時顯示日期時間選擇器
- [ ] 選擇「立即發布」時隱藏日期時間選擇器
- [ ] 驗證排程時間為未來時間
- [ ] 時區顯示正確
- [ ] 日期時間格式正確

---

#### 測試 10: 完整流程 - 從 Prompt 設定到 YouTube 設定

**目的:** 驗證從步驟 3 到步驟 4 的完整流程

**輸入:**
```typescript
// 步驟 3: Prompt 設定
{
  promptTemplateId: 'custom-1',
  promptContent: '請根據以下內容...(有效長度)',
  geminiModel: 'gemini-1.5-pro'
}

// 步驟 4: YouTube 設定
{
  title: '我的 AI 教學影片',
  description: '這是一部關於 AI 的教學影片',
  tags: ['AI', '教學', '科技'],
  privacy: 'public',
  publishType: 'immediate',
  aiContentFlag: true
}
```

**預期輸出:**
```typescript
{
  // API 調用
  apiCalls: [
    {
      endpoint: 'PUT /api/v1/projects/:id/prompt-model',
      payload: {
        prompt_template_id: 'custom-1',
        prompt_content: '請根據以下內容...',
        gemini_model: 'gemini-1.5-pro'
      }
    },
    {
      endpoint: 'PUT /api/v1/projects/:id/youtube-settings',
      payload: {
        youtube_title: '我的 AI 教學影片',
        youtube_description: '這是一部關於 AI 的教學影片',
        youtube_tags: ['AI', '教學', '科技'],
        privacy: 'public',
        publish_type: 'immediate',
        ai_content_flag: true
      }
    },
    {
      endpoint: 'POST /api/v1/projects/:id/generate',
      payload: {}
    }
  ],

  // 頁面導航
  navigation: '/project/project-123/progress'
}
```

**測試實作:**
```typescript
it('完整流程: Prompt 設定 -> YouTube 設定 -> 開始生成', async () => {
  const { user } = setup()

  // === Page 5: Prompt Settings ===

  // 1. Select template
  const templateSelect = screen.getByLabelText('Prompt 範本')
  await user.click(templateSelect)
  await user.click(screen.getByText('自訂範本 1'))

  // 2. Select model
  const proModel = screen.getByLabelText('gemini-1.5-pro')
  await user.click(proModel)

  // 3. Click next
  const nextButton = screen.getByRole('button', { name: /下一步/i })
  await user.click(nextButton)

  // 4. Verify API called
  expect(mockUpdatePrompt).toHaveBeenCalledWith({
    project_id: 'project-123',
    prompt_template_id: 'custom-1',
    prompt_content: expect.any(String),
    gemini_model: 'gemini-1.5-pro'
  })

  // 5. Verify navigation to Page 6
  expect(mockRouter.push).toHaveBeenCalledWith('/project/project-123/configure/youtube')

  // === Page 6: YouTube Settings ===

  // Re-render Page 6
  render(<YouTubeSettingsPage params={{ id: 'project-123' }} />)

  // 6. Fill YouTube form
  const titleInput = screen.getByLabelText('影片標題')
  await user.type(titleInput, '我的 AI 教學影片')

  const descInput = screen.getByLabelText('影片描述')
  await user.type(descInput, '這是一部關於 AI 的教學影片')

  // 7. Add tags
  const tagInput = screen.getByLabelText('標籤')
  await user.type(tagInput, 'AI{Enter}')
  await user.type(tagInput, '教學{Enter}')
  await user.type(tagInput, '科技{Enter}')

  // 8. Select privacy (default is public)
  const publicOption = screen.getByLabelText('公開')
  expect(publicOption).toBeChecked()

  // 9. Start generation
  const startButton = screen.getByRole('button', { name: /開始生成/i })
  await user.click(startButton)

  // 10. Verify YouTube settings API called
  expect(mockSaveYouTubeSettings).toHaveBeenCalledWith({
    project_id: 'project-123',
    youtube_title: '我的 AI 教學影片',
    youtube_description: '這是一部關於 AI 的教學影片',
    youtube_tags: ['AI', '教學', '科技'],
    privacy: 'public',
    publish_type: 'immediate',
    ai_content_flag: true
  })

  // 11. Verify start generation API called
  expect(mockStartGeneration).toHaveBeenCalledWith('project-123')

  // 12. Verify navigation to progress page
  expect(mockRouter.push).toHaveBeenCalledWith('/project/project-123/progress')
})
```

**驗證點:**
- [ ] Page 5 表單提交成功
- [ ] API 調用正確
- [ ] 導航到 Page 6
- [ ] Page 6 表單正確填寫
- [ ] YouTube 設定 API 調用正確
- [ ] 生成流程啟動 API 調用正確
- [ ] 導航到進度監控頁面

---

### 整合測試

#### 測試 11: YouTube 帳號未連結時的處理

**目的:** 驗證當用戶未連結 YouTube 帳號時的錯誤提示和引導

**前置條件:**
```typescript
// No YouTube accounts linked
mockUseStore.mockReturnValue({
  settings: {
    youtubeAccounts: []
  }
})
```

**預期輸出:**
```typescript
{
  errorDisplay: {
    type: 'warning',
    message: '請先連結 YouTube 帳號',
    action: {
      label: '連結帳號',
      onClick: () => { /* Open OAuth flow */ }
    }
  },
  submitDisabled: true
}
```

**測試實作:**
```typescript
it('未連結 YouTube 帳號時應該顯示警告', () => {
  mockUseStore.mockReturnValue({
    settings: {
      youtubeAccounts: []
    }
  })

  render(<YouTubeSettingsPage params={{ id: 'project-123' }} />)

  // Verify warning message
  expect(screen.getByText('請先連結 YouTube 帳號')).toBeInTheDocument()

  // Verify link account button
  const linkButton = screen.getByRole('button', { name: /連結帳號/i })
  expect(linkButton).toBeInTheDocument()

  // Verify submit button disabled
  const submitButton = screen.getByRole('button', { name: /開始生成/i })
  expect(submitButton).toBeDisabled()
})

it('點擊連結帳號應該開啟 OAuth 流程', async () => {
  const { user } = setup()
  const mockOAuth = jest.fn()

  mockUseStore.mockReturnValue({
    settings: {
      youtubeAccounts: []
    },
    initiateYouTubeOAuth: mockOAuth
  })

  render(<YouTubeSettingsPage params={{ id: 'project-123' }} />)

  const linkButton = screen.getByRole('button', { name: /連結帳號/i })
  await user.click(linkButton)

  expect(mockOAuth).toHaveBeenCalled()
})
```

**驗證點:**
- [ ] 顯示警告提示框
- [ ] 顯示「連結帳號」按鈕
- [ ] 「開始生成」按鈕為禁用狀態
- [ ] 點擊連結帳號開啟 OAuth 流程

---

### E2E 測試 (使用 Playwright)

#### 測試 12: 完整用戶流程 E2E

**測試腳本:**
```typescript
// e2e/project-creation-flow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Project Creation Flow - Steps 3 & 4', () => {
  test('用戶應該能完成 Prompt 和 YouTube 設定並開始生成', async ({ page }) => {
    // 1. Navigate to project (assume already created in step 1-2)
    await page.goto('http://localhost:3000/project/test-123/configure/prompt-model')

    // 2. Verify page loaded
    await expect(page.locator('h1')).toContainText('Prompt 與模型設定')

    // 3. Select template
    await page.locator('[data-testid="prompt-template-select"]').click()
    await page.locator('text=自訂範本 1').click()

    // 4. Verify prompt content loaded
    const promptEditor = page.locator('[data-testid="prompt-editor"]')
    await expect(promptEditor).not.toBeEmpty()

    // 5. Select Gemini Pro model
    await page.locator('[data-testid="model-gemini-pro"]').click()

    // 6. Click next
    await page.locator('button:has-text("下一步")').click()

    // 7. Verify navigation to YouTube settings
    await expect(page).toHaveURL(/configure\/youtube/)
    await expect(page.locator('h1')).toContainText('YouTube 設定')

    // 8. Fill YouTube title
    await page.locator('[data-testid="youtube-title"]').fill('我的測試影片')

    // 9. Fill description
    await page.locator('[data-testid="youtube-description"]').fill('這是測試描述')

    // 10. Add tags
    const tagInput = page.locator('[data-testid="youtube-tags-input"]')
    await tagInput.fill('測試')
    await tagInput.press('Enter')
    await tagInput.fill('AI')
    await tagInput.press('Enter')

    // 11. Select privacy (public should be default)
    await expect(page.locator('[data-testid="privacy-public"]')).toBeChecked()

    // 12. Click start generation
    await page.locator('button:has-text("開始生成")').click()

    // 13. Verify navigation to progress page
    await expect(page).toHaveURL(/progress/)
    await expect(page.locator('h1')).toContainText('進度監控')
  })
})
```

---

## 實作規格

### 需要建立/修改的檔案

#### 1. Page Component: `app/project/[id]/configure/prompt-model/page.tsx`

**職責:** Prompt 與模型設定頁面主組件

**完整實作:**

```tsx
// app/project/[id]/configure/prompt-model/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import AppLayout from '@/components/layouts/AppLayout'
import Breadcrumb from '@/components/ui/Breadcrumb'
import StepIndicator from '@/components/ui/StepIndicator'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Modal from '@/components/ui/Modal'
import { toast } from '@/utils/toast'
import { api } from '@/lib/api'
import PromptEditor from '@/components/domain/PromptEditor'
import ModelSelector from '@/components/domain/ModelSelector'
import PromptTemplateModal from '@/components/domain/PromptTemplateModal'

// Validation schema
const promptFormSchema = z.object({
  prompt_template_id: z.string(),
  prompt_content: z
    .string()
    .min(200, 'Prompt 長度必須在 200-1000 字之間')
    .max(1000, 'Prompt 長度必須在 200-1000 字之間'),
  gemini_model: z.enum(['gemini-1.5-pro', 'gemini-1.5-flash']),
})

type PromptFormData = z.infer<typeof promptFormSchema>

export default function PromptModelPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [formData, setFormData] = useState<PromptFormData>({
    prompt_template_id: 'default',
    prompt_content: '',
    gemini_model: 'gemini-1.5-flash',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Fetch project data
  const { data: project } = useQuery({
    queryKey: ['project', params.id],
    queryFn: () => api.projects.getById(params.id),
  })

  // Fetch prompt templates
  const { data: templates } = useQuery({
    queryKey: ['promptTemplates'],
    queryFn: () => api.promptTemplates.getAll(),
  })

  // Load project data into form
  useEffect(() => {
    if (project) {
      setFormData({
        prompt_template_id: project.prompt_template_id || 'default',
        prompt_content: project.prompt_content || '',
        gemini_model: project.gemini_model || 'gemini-1.5-flash',
      })
    }
  }, [project])

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (data: PromptFormData) =>
      api.projects.updatePromptSettings(params.id, data),
    onSuccess: () => {
      toast.success('設定已儲存')
      router.push(`/project/${params.id}/configure/youtube`)
    },
    onError: (error: any) => {
      toast.error(error.message || '儲存失敗')
    },
  })

  // Handle template selection
  const handleTemplateChange = (templateId: string) => {
    const template = templates?.find((t) => t.id === templateId)
    if (template) {
      setFormData({
        ...formData,
        prompt_template_id: templateId,
        prompt_content: template.content,
      })
    }
  }

  // Handle form submit
  const handleNext = () => {
    // Validate
    const result = promptFormSchema.safeParse(formData)
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors
      setErrors(
        Object.fromEntries(
          Object.entries(fieldErrors).map(([key, value]) => [key, value?.[0] || ''])
        )
      )
      return
    }

    setErrors({})
    saveMutation.mutate(formData)
  }

  const steps = [
    { label: '上傳文字內容', status: 'completed' as const },
    { label: '視覺化配置', status: 'completed' as const },
    { label: 'Prompt & Model', status: 'current' as const },
    { label: 'YouTube 設定', status: 'pending' as const },
  ]

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: '主控台', href: '/' },
          { label: '新增專案', href: '/project/new' },
          { label: 'Prompt & Model' },
        ]}
      />

      <div className="p-6">
        <StepIndicator steps={steps} />

        <div className="max-w-4xl mx-auto mt-8">
          <h1 className="text-3xl font-bold mb-6">Prompt 與模型設定</h1>

          {/* Prompt Template Section */}
          <Card title="Prompt 範本" className="mb-6">
            <div className="flex items-end gap-4 mb-4">
              <div className="flex-1">
                <label className="block mb-2 font-medium">選擇範本</label>
                <Select
                  value={formData.prompt_template_id}
                  onChange={handleTemplateChange}
                  options={
                    templates?.map((t) => ({
                      label: t.name,
                      value: t.id,
                    })) || []
                  }
                  data-testid="prompt-template-select"
                />
              </div>
              <Button onClick={() => setShowTemplateModal(true)}>新增範本</Button>
            </div>

            <div className="mb-4">
              <label className="block mb-2 font-medium">Prompt 內容</label>
              <PromptEditor
                value={formData.prompt_content}
                onChange={(value) =>
                  setFormData({ ...formData, prompt_content: value })
                }
                error={errors.prompt_content}
                data-testid="prompt-editor"
              />
              <p className="text-sm text-gray-500 mt-2">
                目前字數: {formData.prompt_content.length}
              </p>
              {errors.prompt_content && (
                <p className="text-red-500 text-sm mt-1">{errors.prompt_content}</p>
              )}
            </div>
          </Card>

          {/* Model Selection Section */}
          <Card title="選擇 Gemini 模型" className="mb-6">
            <ModelSelector
              selected={formData.gemini_model}
              onChange={(model) => setFormData({ ...formData, gemini_model: model })}
            />
          </Card>

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <Button
              onClick={() => router.push(`/project/${params.id}/configure/visual`)}
            >
              上一步
            </Button>
            <Button
              type="primary"
              onClick={handleNext}
              loading={saveMutation.isLoading}
            >
              下一步
            </Button>
          </div>
        </div>
      </div>

      {/* Template Modal */}
      <PromptTemplateModal
        visible={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSave={() => {
          setShowTemplateModal(false)
          // Refetch templates
        }}
      />
    </AppLayout>
  )
}
```

---

#### 2. Page Component: `app/project/[id]/configure/youtube/page.tsx`

**職責:** YouTube 設定頁面主組件

**完整實作:**

```tsx
// app/project/[id]/configure/youtube/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { useStore } from '@/store'
import AppLayout from '@/components/layouts/AppLayout'
import Breadcrumb from '@/components/ui/Breadcrumb'
import StepIndicator from '@/components/ui/StepIndicator'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Checkbox from '@/components/ui/Checkbox'
import { toast } from '@/utils/toast'
import { api } from '@/lib/api'
import YouTubeAccountCard from '@/components/domain/YouTubeAccountCard'
import TagsInput from '@/components/ui/TagsInput'
import DateTimePicker from '@/components/ui/DateTimePicker'

// Validation schema
const youtubeFormSchema = z.object({
  youtube_title: z
    .string()
    .min(1, '標題不能為空')
    .max(100, '標題不能超過 100 字元'),
  youtube_description: z
    .string()
    .max(5000, '描述不能超過 5000 字元')
    .optional(),
  youtube_tags: z.array(z.string()).max(30, '標籤數量不能超過 30 個'),
  privacy: z.enum(['public', 'unlisted', 'private']),
  publish_type: z.enum(['immediate', 'scheduled']),
  scheduled_date: z.string().optional(),
  scheduled_time: z.string().optional(),
  ai_content_flag: z.boolean(),
})

type YouTubeFormData = z.infer<typeof youtubeFormSchema>

export default function YouTubeSettingsPage({
  params,
}: {
  params: { id: string }
}) {
  const router = useRouter()
  const youtubeAccounts = useStore((state) => state.settings.youtubeAccounts)
  const initiateYouTubeOAuth = useStore((state) => state.initiateYouTubeOAuth)

  const [formData, setFormData] = useState<YouTubeFormData>({
    youtube_title: '',
    youtube_description: '',
    youtube_tags: [],
    privacy: 'public',
    publish_type: 'immediate',
    ai_content_flag: true,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (data: YouTubeFormData) =>
      api.projects.updateYouTubeSettings(params.id, data),
    onSuccess: () => {
      toast.success('設定已儲存')
      // Start generation
      return api.projects.startGeneration(params.id)
    },
    onError: (error: any) => {
      toast.error(error.message || '儲存失敗')
    },
  })

  const startGenerationMutation = useMutation({
    mutationFn: () => api.projects.startGeneration(params.id),
    onSuccess: () => {
      router.push(`/project/${params.id}/progress`)
    },
  })

  // Validate scheduled datetime
  const validateScheduledTime = () => {
    if (formData.publish_type === 'scheduled') {
      if (!formData.scheduled_date || !formData.scheduled_time) {
        setErrors({
          ...errors,
          scheduled_date: '排程日期和時間為必填',
        })
        return false
      }

      const scheduledDatetime = new Date(
        `${formData.scheduled_date}T${formData.scheduled_time}`
      )
      const now = new Date()

      if (scheduledDatetime <= now) {
        setErrors({
          ...errors,
          scheduled_date: '排程日期必須為未來時間',
        })
        return false
      }
    }

    return true
  }

  // Handle form submit
  const handleSubmit = async () => {
    // Validate
    const result = youtubeFormSchema.safeParse(formData)
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors
      setErrors(
        Object.fromEntries(
          Object.entries(fieldErrors).map(([key, value]) => [key, value?.[0] || ''])
        )
      )
      return
    }

    if (!validateScheduledTime()) {
      return
    }

    setErrors({})
    await saveMutation.mutateAsync(formData)
    startGenerationMutation.mutate()
  }

  const steps = [
    { label: '上傳文字內容', status: 'completed' as const },
    { label: '視覺化配置', status: 'completed' as const },
    { label: 'Prompt & Model', status: 'completed' as const },
    { label: 'YouTube 設定', status: 'current' as const },
  ]

  const hasYouTubeAccount = youtubeAccounts && youtubeAccounts.length > 0

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: '主控台', href: '/' },
          { label: '新增專案', href: '/project/new' },
          { label: 'YouTube 設定' },
        ]}
      />

      <div className="p-6">
        <StepIndicator steps={steps} />

        <div className="max-w-4xl mx-auto mt-8">
          <h1 className="text-3xl font-bold mb-6">YouTube 設定</h1>

          {/* YouTube Account Section */}
          {!hasYouTubeAccount && (
            <Card className="mb-6 border-l-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-yellow-700">
                    請先連結 YouTube 帳號
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    您需要連結 YouTube 帳號才能上傳影片
                  </p>
                </div>
                <Button onClick={initiateYouTubeOAuth}>連結帳號</Button>
              </div>
            </Card>
          )}

          {hasYouTubeAccount && (
            <Card title="YouTube 帳號" className="mb-6">
              <YouTubeAccountCard account={youtubeAccounts[0]} />
            </Card>
          )}

          {/* Video Info Section */}
          <Card title="影片資訊" className="mb-6">
            <div className="mb-4">
              <label className="block mb-2 font-medium">影片標題 *</label>
              <Input
                value={formData.youtube_title}
                onChange={(e) =>
                  setFormData({ ...formData, youtube_title: e.target.value })
                }
                placeholder="輸入影片標題"
                status={errors.youtube_title ? 'error' : ''}
                data-testid="youtube-title"
              />
              {errors.youtube_title && (
                <p className="text-red-500 text-sm mt-1">{errors.youtube_title}</p>
              )}
            </div>

            <div className="mb-4">
              <label className="block mb-2 font-medium">影片描述</label>
              <textarea
                className="w-full h-32 border rounded p-2"
                value={formData.youtube_description}
                onChange={(e) =>
                  setFormData({ ...formData, youtube_description: e.target.value })
                }
                placeholder="輸入影片描述"
                data-testid="youtube-description"
              />
              {errors.youtube_description && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.youtube_description}
                </p>
              )}
            </div>

            <div className="mb-4">
              <label className="block mb-2 font-medium">標籤</label>
              <TagsInput
                tags={formData.youtube_tags}
                onChange={(tags) => setFormData({ ...formData, youtube_tags: tags })}
                maxTags={30}
                data-testid="youtube-tags-input"
              />
              {errors.youtube_tags && (
                <p className="text-red-500 text-sm mt-1">{errors.youtube_tags}</p>
              )}
            </div>
          </Card>

          {/* Publish Settings Section */}
          <Card title="發布設定" className="mb-6">
            <div className="mb-4">
              <label className="block mb-2 font-medium">隱私設定</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="privacy"
                    value="public"
                    checked={formData.privacy === 'public'}
                    onChange={(e) =>
                      setFormData({ ...formData, privacy: e.target.value as any })
                    }
                    data-testid="privacy-public"
                  />
                  <span className="ml-2">公開</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="privacy"
                    value="unlisted"
                    checked={formData.privacy === 'unlisted'}
                    onChange={(e) =>
                      setFormData({ ...formData, privacy: e.target.value as any })
                    }
                  />
                  <span className="ml-2">不公開 (僅限連結)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="privacy"
                    value="private"
                    checked={formData.privacy === 'private'}
                    onChange={(e) =>
                      setFormData({ ...formData, privacy: e.target.value as any })
                    }
                  />
                  <span className="ml-2">私人</span>
                </label>
              </div>
            </div>

            <div className="mb-4">
              <label className="block mb-2 font-medium">發布方式</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="publish_type"
                    value="immediate"
                    checked={formData.publish_type === 'immediate'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        publish_type: e.target.value as any,
                      })
                    }
                  />
                  <span className="ml-2">立即發布</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="publish_type"
                    value="scheduled"
                    checked={formData.publish_type === 'scheduled'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        publish_type: e.target.value as any,
                      })
                    }
                  />
                  <span className="ml-2">排程發布</span>
                </label>
              </div>
            </div>

            {formData.publish_type === 'scheduled' && (
              <div className="mb-4 pl-6">
                <label className="block mb-2 font-medium">排程日期</label>
                <DateTimePicker
                  date={formData.scheduled_date}
                  time={formData.scheduled_time}
                  onDateChange={(date) =>
                    setFormData({ ...formData, scheduled_date: date })
                  }
                  onTimeChange={(time) =>
                    setFormData({ ...formData, scheduled_time: time })
                  }
                  error={errors.scheduled_date}
                />
                {errors.scheduled_date && (
                  <p className="text-red-500 text-sm mt-1">{errors.scheduled_date}</p>
                )}
              </div>
            )}

            <div className="mb-4">
              <label className="flex items-center">
                <Checkbox
                  checked={formData.ai_content_flag}
                  disabled
                  onChange={() => {}}
                />
                <span className="ml-2">此影片包含 AI 生成的內容</span>
              </label>
              <p className="text-sm text-gray-500 mt-1">
                根據 YouTube 政策,AI 生成的影片必須標註
              </p>
            </div>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <Button
              onClick={() =>
                router.push(`/project/${params.id}/configure/prompt-model`)
              }
            >
              上一步
            </Button>
            <Button
              type="primary"
              onClick={handleSubmit}
              loading={saveMutation.isLoading || startGenerationMutation.isLoading}
              disabled={!hasYouTubeAccount}
            >
              開始生成
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
```

---

#### 3. Domain Component: `components/domain/PromptEditor.tsx`

**職責:** Prompt 編輯器元件

```tsx
// components/domain/PromptEditor.tsx
'use client'

import { useRef, useEffect } from 'react'

interface PromptEditorProps {
  value: string
  onChange: (value: string) => void
  error?: string
  placeholder?: string
  'data-testid'?: string
}

export default function PromptEditor({
  value,
  onChange,
  error,
  placeholder = '輸入 Prompt 內容 (200-1000 字)',
  'data-testid': testId,
}: PromptEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [value])

  return (
    <div>
      <textarea
        ref={textareaRef}
        className={`w-full min-h-[200px] border rounded p-3 font-mono text-sm ${
          error ? 'border-red-500' : 'border-gray-300'
        } focus:outline-none focus:ring-2 focus:ring-primary`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        data-testid={testId}
      />
    </div>
  )
}
```

---

#### 4. Domain Component: `components/domain/ModelSelector.tsx`

**職責:** Gemini 模型選擇器

```tsx
// components/domain/ModelSelector.tsx
'use client'

interface ModelSelectorProps {
  selected: 'gemini-1.5-pro' | 'gemini-1.5-flash'
  onChange: (model: 'gemini-1.5-pro' | 'gemini-1.5-flash') => void
}

export default function ModelSelector({ selected, onChange }: ModelSelectorProps) {
  const models = [
    {
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      quality: '⭐⭐⭐',
      speed: '中等',
      cost: '較高',
      description: '高品質、適合複雜內容、成本較高',
    },
    {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      quality: '⭐⭐',
      speed: '快速',
      cost: '較低',
      description: '快速生成、適合大量生產、成本較低',
    },
  ]

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {models.map((model) => (
          <label
            key={model.id}
            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
              selected === model.id
                ? 'border-primary bg-primary/5'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="model"
              value={model.id}
              checked={selected === model.id}
              onChange={(e) => onChange(e.target.value as any)}
              className="sr-only"
              data-testid={`model-${model.id.replace('.', '-')}`}
            />
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-lg">{model.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{model.description}</p>
              </div>
              {selected === model.id && (
                <span className="text-primary text-2xl">✓</span>
              )}
            </div>
          </label>
        ))}
      </div>

      {/* Comparison Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">特性</th>
              <th className="px-4 py-2 text-left">Gemini 1.5 Pro</th>
              <th className="px-4 py-2 text-left">Gemini 1.5 Flash</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t">
              <td className="px-4 py-2">品質</td>
              <td className="px-4 py-2">⭐⭐⭐</td>
              <td className="px-4 py-2">⭐⭐</td>
            </tr>
            <tr className="border-t">
              <td className="px-4 py-2">速度</td>
              <td className="px-4 py-2">中等</td>
              <td className="px-4 py-2">快速</td>
            </tr>
            <tr className="border-t">
              <td className="px-4 py-2">成本</td>
              <td className="px-4 py-2">較高</td>
              <td className="px-4 py-2">較低</td>
            </tr>
            <tr className="border-t">
              <td className="px-4 py-2">適合場景</td>
              <td className="px-4 py-2">高品質內容</td>
              <td className="px-4 py-2">大量生產</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

---

#### 5. UI Component: `components/ui/TagsInput.tsx`

**職責:** 標籤輸入元件

```tsx
// components/ui/TagsInput.tsx
'use client'

import { useState, KeyboardEvent } from 'react'
import { XIcon } from '@heroicons/react/outline'

interface TagsInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  maxTags?: number
  placeholder?: string
  'data-testid'?: string
}

export default function TagsInput({
  tags,
  onChange,
  maxTags = 30,
  placeholder = '輸入標籤後按 Enter',
  'data-testid': testId,
}: TagsInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState('')

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  const addTag = () => {
    const trimmed = inputValue.trim()

    if (!trimmed) {
      return
    }

    if (tags.length >= maxTags) {
      setError(`標籤數量不能超過 ${maxTags} 個`)
      return
    }

    if (tags.includes(trimmed)) {
      setError('此標籤已存在')
      return
    }

    onChange([...tags, trimmed])
    setInputValue('')
    setError('')
  }

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index))
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag, index) => (
          <span
            key={index}
            className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(index)}
              className="ml-2 hover:text-primary-dark"
              aria-label="移除標籤"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </span>
        ))}
      </div>

      <input
        type="text"
        className="w-full border rounded px-3 py-2"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        data-testid={testId}
      />

      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}

      <p className="text-sm text-gray-500 mt-1">
        已新增 {tags.length} / {maxTags} 個標籤
      </p>
    </div>
  )
}
```

---

## 開發指引

### TDD 開發流程

#### 第 1 步：環境準備（10 分鐘）
1. 確認 Task-017, 018, 019, 022 已完成
2. 確認路由系統、狀態管理、API 整合層可用
3. 閱讀 `product-design/pages.md#Page-5` 和 `#Page-6`
4. 閱讀 `tech-specs/frontend/pages.md#5` 和 `#6`

#### 第 2 步：設置測試環境（15 分鐘）
1. 建立測試檔案結構：
   ```
   __tests__/
   ├── pages/
   │   ├── PromptModelPage.test.tsx
   │   └── YouTubeSettingsPage.test.tsx
   └── components/
       ├── PromptEditor.test.tsx
       ├── ModelSelector.test.tsx
       ├── TagsInput.test.tsx
       └── YouTubeAccountCard.test.tsx
   ```
2. 設置 Mock 和 test utilities

#### 第 3 步：撰寫 Page-5 測試（30 分鐘）
1. 撰寫「測試 1：基本渲染」
2. 撰寫「測試 2：範本選擇」
3. 撰寫「測試 3：內容驗證」
4. 撰寫「測試 4：模型選擇」
5. 執行測試 → 全部失敗 (紅燈)

#### 第 4 步：實作 Page-5 基礎（60 分鐘）
1. 建立 `app/project/[id]/configure/prompt-model/page.tsx`
2. 實作基本頁面結構和表單
3. 實作 Prompt 範本選擇器
4. 實作模型選擇器
5. 執行測試 → 部分通過

#### 第 5 步：實作 PromptEditor 和 ModelSelector（45 分鐘）
1. 建立 `components/domain/PromptEditor.tsx`
2. 建立 `components/domain/ModelSelector.tsx`
3. 實作字數統計、自動縮放
4. 實作模型對比表格
5. 執行測試 → 更多測試通過

#### 第 6 步：實作 Prompt 範本管理（45 分鐘）
1. 撰寫「測試 5：新增範本」
2. 建立 `PromptTemplateModal` 元件
3. 實作新增、編輯、刪除範本邏輯
4. 整合 API 調用
5. 執行測試 → 通過 ✅

#### 第 7 步：撰寫 Page-6 測試（45 分鐘）
1. 撰寫「測試 6：基本渲染」
2. 撰寫「測試 7：表單驗證」
3. 撰寫「測試 8：標籤輸入」
4. 撰寫「測試 9：排程發布」
5. 執行測試 → 失敗 (紅燈)

#### 第 8 步：實作 Page-6 基礎（60 分鐘）
1. 建立 `app/project/[id]/configure/youtube/page.tsx`
2. 實作 YouTube 帳號顯示
3. 實作影片資訊表單
4. 實作隱私和發布方式選擇
5. 執行測試 → 部分通過

#### 第 9 步：實作 TagsInput 和日期選擇（45 分鐘）
1. 建立 `components/ui/TagsInput.tsx`
2. 實作標籤新增、刪除、最多 30 個限制
3. 實作 DateTimePicker (或使用現有 UI 庫)
4. 實作排程時間驗證 (未來時間)
5. 執行測試 → 通過 ✅

#### 第 10 步：整合測試與完整流程（60 分鐘）
1. 撰寫「測試 10：完整流程」
2. 撰寫「測試 11：YouTube 帳號未連結」
3. 整合 API 調用 (save prompt, save youtube settings, start generation)
4. 實作頁面導航流程
5. 執行所有測試 → 通過 ✅

#### 第 11 步：E2E 測試（45 分鐘）
1. 撰寫 Playwright E2E 測試腳本
2. 測試完整用戶流程 (步驟 3 → 步驟 4 → 開始生成)
3. 測試錯誤處理 (未連結 YouTube、驗證失敗等)
4. 執行 E2E 測試 → 通過 ✅

#### 第 12 步：響應式設計與樣式（45 分鐘）
1. 實作桌面版佈局 (≥1024px)
2. 實作平板版佈局 (768-1023px)
3. 實作手機版佈局 (<768px)
4. 測試各種螢幕尺寸
5. 調整間距、字體、按鈕大小

#### 第 13 步：程式碼檢查與重構（30 分鐘）
1. 執行 ESLint：`npm run lint`
2. 執行 TypeScript 檢查：`npm run type-check`
3. 檢查重複程式碼並提取共用邏輯
4. 改善命名和註解
5. 確保測試覆蓋率 > 80%

#### 第 14 步：手動測試與驗收（30 分鐘）
1. 在本地環境完整測試 Page-5
2. 測試 Prompt 範本管理功能
3. 測試 Page-6 所有表單互動
4. 測試排程發布功能
5. 測試完整流程 (步驟 1-2-3-4)

---

## 注意事項

### 表單驗證
- ⚠️ Prompt 內容必須 200-1000 字
- ⚠️ YouTube 標題必填且不超過 100 字元
- ⚠️ 標籤最多 30 個
- ⚠️ 排程時間必須為未來時間
- ⚠️ 所有錯誤訊息要清楚且具體

### 用戶體驗
- 💡 Prompt 編輯器自動縮放高度
- 💡 字數即時統計顯示
- 💡 模型對比表格幫助用戶選擇
- 💡 標籤輸入視覺化呈現
- 💡 YouTube 帳號未連結時明確提示

### 狀態管理
- ✅ 使用 React Query 管理 API 資料
- ✅ 表單狀態使用 local state (useState)
- ✅ 驗證錯誤即時顯示
- ✅ 不需要實作自動儲存 (依照 spec,用戶點擊「下一步」時儲存)

### API 整合
- 🔗 `PUT /api/v1/projects/:id/prompt-model` - 儲存 Prompt 設定
- 🔗 `GET /api/v1/prompt-templates` - 取得範本列表
- 🔗 `POST /api/v1/prompt-templates` - 新增範本
- 🔗 `PUT /api/v1/projects/:id/youtube-settings` - 儲存 YouTube 設定
- 🔗 `POST /api/v1/projects/:id/generate` - 開始生成

### 安全性
- ⚠️ 排程時間驗證 (防止過去時間)
- ⚠️ 標籤數量限制 (防止過多標籤)
- ⚠️ 輸入長度限制 (防止超長內容)
- ⚠️ AI 內容標註強制勾選 (符合 YouTube 政策)

---

## 完成檢查清單

### 功能完整性
- [ ] Page-5 (Prompt 與模型設定頁) 完整實作
- [ ] Page-6 (YouTube 設定頁) 完整實作
- [ ] Prompt 範本選擇功能
- [ ] Prompt 內容編輯與驗證
- [ ] Gemini 模型選擇
- [ ] 模型對比資訊顯示
- [ ] Prompt 範本管理 (新增、編輯、刪除)
- [ ] YouTube 帳號連結狀態檢查
- [ ] 影片資訊表單 (標題、描述、標籤)
- [ ] 隱私設定選擇
- [ ] 發布方式選擇 (立即/排程)
- [ ] 排程日期時間選擇器
- [ ] 排程時間驗證 (未來時間)
- [ ] AI 內容標註 (強制勾選)

### 測試
- [ ] 所有單元測試通過 (10 個測試)
- [ ] 整合測試通過 (2 個測試)
- [ ] E2E 測試通過 (1 個測試)
- [ ] 測試覆蓋率 > 80%

### 程式碼品質
- [ ] ESLint 檢查通過：`npm run lint`
- [ ] TypeScript 類型檢查通過：`npm run type-check`
- [ ] 無重複程式碼
- [ ] 命名清晰、有註解

### 響應式設計
- [ ] 桌面版正確顯示 (≥1024px)
- [ ] 平板版正確顯示 (768-1023px)
- [ ] 手機版正確顯示 (<768px)

### 整合
- [ ] API 整合正確 (5 個端點)
- [ ] 狀態管理正確 (React Query + useState)
- [ ] 頁面導航流程正確
- [ ] 步驟指示器正確更新
- [ ] Toast 通知正確顯示

### 用戶體驗
- [ ] 表單驗證即時回饋
- [ ] 錯誤訊息清楚具體
- [ ] Loading 狀態正確顯示
- [ ] 操作流暢無卡頓

---

## 預估時間分配

- 閱讀與準備：25 分鐘
- 設置測試環境：15 分鐘
- Page-5 測試與實作：2.5 小時
- Page-6 測試與實作：2.5 小時
- 共用元件實作：1.5 小時
- 整合測試與 E2E：1.5 小時
- 響應式設計：45 分鐘
- 程式碼檢查與重構：30 分鐘
- 手動測試：30 分鐘

**總計：約 10 小時**

---

## 參考資源

### Next.js 官方文檔
- [App Router](https://nextjs.org/docs/app)
- [Forms and Mutations](https://nextjs.org/docs/app/building-your-application/data-fetching/forms-and-mutations)

### React Hook Form + Zod
- [React Hook Form](https://react-hook-form.com/)
- [Zod](https://zod.dev/)

### TanStack Query
- [React Query](https://tanstack.com/query/latest/docs/react/overview)

### 相關套件
- [Playwright](https://playwright.dev/) - E2E 測試
- [@testing-library/react](https://testing-library.com/docs/react-testing-library/intro/) - 單元測試

### 專案內部文件
- `product-design/pages.md#Page-5` - Page 5 產品設計
- `product-design/pages.md#Page-6` - Page 6 產品設計
- `tech-specs/frontend/pages.md#5` - Page 5 技術規格
- `tech-specs/frontend/pages.md#6` - Page 6 技術規格
- `product-design/flows.md#Flow-1` - 基本影片生成流程

---

**準備好了嗎？** 開始使用 TDD 方式實作 Page-5 和 Page-6！🚀
