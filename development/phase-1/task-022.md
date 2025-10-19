# Task-022: 新增專案流程（步驟 1-2：內容與視覺配置）

> **建立日期:** 2025-10-19
> **狀態:** ⏳ 未開始
> **預計時間:** 20 小時
> **優先級:** P0 (必須)

---

## 關聯文件

### 產品設計
- **頁面設計:**
  - `product-design/pages.md#Page-3` - 新增專案頁面
  - `product-design/pages.md#Page-4` - 視覺化配置頁面
- **使用者流程:**
  - `product-design/flows.md#Flow-1` - 基本影片生成流程（步驟 1-2）
  - `product-design/flows.md#Flow-3` - 視覺化界面配置

### 技術規格
- **前端頁面規格:**
  - `tech-specs/frontend/pages.md#3-新增專案頁-new-project` - 新增專案頁
  - `tech-specs/frontend/pages.md#4-視覺化配置頁-visual-config` - 視覺化配置頁
- **元件架構:**
  - `tech-specs/frontend/component-architecture.md#共用元件定義` - UI 元件規格
  - `tech-specs/frontend/component-architecture.md#元件層級結構` - 元件層級設計

### 相關任務
- **前置任務:**
  - Task-017 ✅ (前端專案初始化與路由系統)
  - Task-018 ✅ (Zustand Stores 與狀態管理)
  - Task-019 ✅ (Axios 客戶端與 API 整合層)
- **後續任務:**
  - Task-023 (新增專案流程：步驟 3-4)
  - Task-029 (整合測試)

---

## 任務目標

### 簡述

實作新增專案流程的前兩個步驟：
1. **Page-3: 新增專案頁** - 文字內容上傳/貼上、專案名稱輸入、內容驗證
2. **Page-4: 視覺化配置頁** - 字幕、Logo、疊加元素的拖拽定位與即時預覽

這兩個頁面是整個影片生成流程的入口,負責收集用戶輸入並進行視覺化配置。

### 成功標準

- [ ] **Page-3 實作完成**
  - [x] 專案名稱輸入與驗證
  - [x] 文字內容上傳/貼上切換
  - [x] 字數統計與即時驗證（500-10000 字）
  - [x] 檔案上傳支援（.txt, .md）
  - [x] 表單驗證與錯誤提示
  - [x] 成功後跳轉到視覺化配置頁

- [ ] **Page-4 實作完成**
  - [x] 左右分欄佈局（預覽區 60% + 配置面板 40%）
  - [x] Konva.js 預覽畫布
  - [x] 字幕配置面板（字型、大小、顏色、位置、邊框、陰影、背景）
  - [x] Logo 上傳與定位
  - [x] 拖拽定位功能（react-dnd 或原生）
  - [x] 即時預覽（配置變更 < 100ms 更新）
  - [x] 自動儲存（debounce 1 秒）
  - [x] 模板載入/儲存功能
  - [x] 成功後跳轉到 Prompt 設定頁

- [ ] **響應式設計**
  - [x] 桌面（≥1024px）正常顯示
  - [x] 平板（768-1023px）適配
  - [x] 手機（<768px）調整佈局

- [ ] **單元測試**
  - [x] 表單驗證邏輯測試
  - [x] 檔案上傳測試
  - [x] 視覺配置測試
  - [x] 測試覆蓋率 > 80%

---

## 測試要求

### 單元測試

#### 測試 1：專案名稱驗證

**目的：** 驗證專案名稱的長度和格式要求

**測試案例：**

**1.1 成功：有效的專案名稱**
```typescript
// Input
const input = {
  project_name: "我的第一個影片專案"
}

// Expected Output
const result = projectFormSchema.safeParse(input)
expect(result.success).toBe(true)
```

**1.2 失敗：專案名稱為空**
```typescript
// Input
const input = {
  project_name: ""
}

// Expected Output
const result = projectFormSchema.safeParse(input)
expect(result.success).toBe(false)
expect(result.error.issues[0].message).toBe("專案名稱不能為空")
```

**1.3 失敗：專案名稱超過 100 字元**
```typescript
// Input
const input = {
  project_name: "a".repeat(101)
}

// Expected Output
const result = projectFormSchema.safeParse(input)
expect(result.success).toBe(false)
expect(result.error.issues[0].message).toBe("專案名稱不能超過 100 字元")
```

**驗證點：**
- [ ] 空字串被拒絕
- [ ] 超過 100 字元被拒絕
- [ ] 1-100 字元被接受
- [ ] 錯誤訊息正確顯示

---

#### 測試 2：文字內容長度驗證

**目的：** 驗證文字內容必須在 500-10000 字之間

**測試案例：**

**2.1 失敗：文字少於 500 字**
```typescript
// Input
const input = {
  content_text: "這是一段很短的文字。".repeat(20) // 約 240 字
}

// Expected Output
const result = projectFormSchema.safeParse(input)
expect(result.success).toBe(false)
expect(result.error.issues[0].message).toBe("文字長度必須在 500-10000 字之間")
```

**2.2 成功：文字正好 500 字**
```typescript
// Input
const input = {
  content_text: "測試文字".repeat(125) // 正好 500 字
}

// Expected Output
const result = projectFormSchema.safeParse(input)
expect(result.success).toBe(true)
```

**2.3 成功：文字 5000 字（中間值）**
```typescript
// Input
const input = {
  content_text: "測試文字".repeat(1250) // 5000 字
}

// Expected Output
expect(result.success).toBe(true)
```

**2.4 成功：文字正好 10000 字**
```typescript
// Input
const input = {
  content_text: "測試文字".repeat(2500) // 10000 字
}

// Expected Output
expect(result.success).toBe(true)
```

**2.5 失敗：文字超過 10000 字**
```typescript
// Input
const input = {
  content_text: "測試文字".repeat(2501) // 10004 字
}

// Expected Output
expect(result.success).toBe(false)
expect(result.error.issues[0].message).toBe("文字長度必須在 500-10000 字之間")
```

**驗證點：**
- [ ] < 500 字被拒絕
- [ ] 500 字被接受
- [ ] 5000 字（中間值）被接受
- [ ] 10000 字被接受
- [ ] > 10000 字被拒絕
- [ ] 字數統計即時更新
- [ ] 錯誤訊息即時顯示（黃色警告）

---

#### 測試 3：檔案上傳驗證

**目的：** 驗證上傳檔案的格式和大小限制

**測試案例：**

**3.1 成功：上傳有效的 .txt 檔案**
```typescript
// Input
const file = new File(
  ["這是測試內容。".repeat(200)], // 1000 字
  "content.txt",
  { type: "text/plain" }
)

// Expected Output
const result = await handleFileUpload(file)
expect(result.success).toBe(true)
expect(formData.content_text.length).toBeGreaterThanOrEqual(500)
```

**3.2 成功：上傳有效的 .md 檔案**
```typescript
// Input
const file = new File(
  ["# 標題\n\n內容...".repeat(200)],
  "content.md",
  { type: "text/markdown" }
)

// Expected Output
expect(result.success).toBe(true)
```

**3.3 失敗：檔案大小超過 10MB**
```typescript
// Input
const largeContent = "a".repeat(11 * 1024 * 1024) // 11MB
const file = new File([largeContent], "large.txt", { type: "text/plain" })

// Expected Output
const result = await handleFileUpload(file)
expect(result.success).toBe(false)
expect(result.error).toBe("檔案大小不能超過 10MB")
```

**3.4 失敗：不支援的檔案格式**
```typescript
// Input
const file = new File(
  ["內容"],
  "document.pdf",
  { type: "application/pdf" }
)

// Expected Output
const result = await handleFileUpload(file)
expect(result.success).toBe(false)
expect(result.error).toBe("檔案必須為 TXT 或 MD 格式")
```

**3.5 失敗：檔案內容長度不符**
```typescript
// Input
const file = new File(
  ["很短的內容"], // < 500 字
  "short.txt",
  { type: "text/plain" }
)

// Expected Output
const result = await handleFileUpload(file)
expect(result.success).toBe(false)
expect(result.error).toBe("文字長度必須在 500-10000 字之間")
```

**驗證點：**
- [ ] .txt 檔案被接受
- [ ] .md 檔案被接受
- [ ] > 10MB 被拒絕
- [ ] 不支援格式被拒絕
- [ ] 檔案內容自動填入 textarea
- [ ] 字數統計自動更新
- [ ] 成功提示顯示

---

#### 測試 4：視覺配置即時預覽

**目的：** 驗證視覺配置變更能即時反映在預覽區

**測試案例：**

**4.1 字幕顏色變更**
```typescript
// Input
const config = {
  subtitle: {
    font_color: "#FFFFFF"
  }
}

// User Action
updateConfig({ subtitle: { font_color: "#FF0000" } })

// Expected Output (< 100ms)
const previewElement = getSubtitleElement()
expect(previewElement.style.color).toBe("#FF0000")
```

**4.2 字幕大小變更**
```typescript
// Input
updateConfig({ subtitle: { font_size: 48 } })

// Expected Output (< 100ms)
expect(getSubtitleElement().style.fontSize).toBe("48px")
```

**4.3 Logo 位置拖拽**
```typescript
// Input
const initialPosition = { x: 50, y: 50 }
const newPosition = { x: 150, y: 200 }

// User Action
dragLogo(initialPosition, newPosition)

// Expected Output (< 100ms)
const logoElement = getLogoElement()
expect(logoElement.style.left).toBe("150px")
expect(logoElement.style.top).toBe("200px")
```

**驗證點：**
- [ ] 顏色變更 < 100ms 反映
- [ ] 字體大小變更 < 100ms 反映
- [ ] Logo 位置拖拽 < 100ms 反映
- [ ] 配置面板與預覽同步
- [ ] Debounce 機制正常（1 秒後自動儲存）

---

#### 測試 5：自動儲存機制

**目的：** 驗證配置變更後 1 秒自動儲存

**測試案例：**

**5.1 單次變更自動儲存**
```typescript
// Input
updateConfig({ subtitle: { font_size: 50 } })

// Expected Output (after 1000ms)
await waitFor(1000)
expect(api.saveVisualConfig).toHaveBeenCalledWith(
  projectId,
  expect.objectContaining({
    subtitle: { font_size: 50 }
  })
)
```

**5.2 多次快速變更只儲存最後一次**
```typescript
// Input (rapid changes)
updateConfig({ subtitle: { font_size: 40 } })
await waitFor(200)
updateConfig({ subtitle: { font_size: 50 } })
await waitFor(200)
updateConfig({ subtitle: { font_size: 60 } })

// Expected Output (after 1000ms from last change)
await waitFor(1500)
expect(api.saveVisualConfig).toHaveBeenCalledTimes(1)
expect(api.saveVisualConfig).toHaveBeenCalledWith(
  projectId,
  expect.objectContaining({
    subtitle: { font_size: 60 }
  })
)
```

**驗證點：**
- [ ] 變更後 1 秒觸發儲存
- [ ] 多次快速變更 debounce 正常
- [ ] 儲存成功顯示綠色 toast
- [ ] 儲存失敗顯示紅色錯誤訊息

---

#### 測試 6：模板載入與儲存

**目的：** 驗證視覺配置模板的載入和儲存功能

**測試案例：**

**6.1 載入現有模板**
```typescript
// Input
const templateId = "tech-review-template"

// User Action
loadTemplate(templateId)

// Expected Output
expect(api.getTemplate).toHaveBeenCalledWith(templateId)
const config = getCurrentConfig()
expect(config.subtitle.font_family).toBe("Noto Sans TC")
expect(config.subtitle.font_size).toBe(48)
expect(toast.success).toHaveBeenCalledWith("模板已載入")
```

**6.2 儲存為新模板**
```typescript
// Input
const templateName = "我的自訂模板"
const currentConfig = getCurrentConfig()

// User Action
saveAsTemplate(templateName)

// Expected Output
expect(api.createTemplate).toHaveBeenCalledWith({
  name: templateName,
  config: currentConfig
})
expect(toast.success).toHaveBeenCalledWith("模板已儲存")
```

**6.3 模板不存在時顯示錯誤**
```typescript
// Input
const invalidTemplateId = "non-existent"

// User Action & Expected Output
loadTemplate(invalidTemplateId)
await waitFor(() => {
  expect(toast.error).toHaveBeenCalledWith("找不到模板")
})
```

**驗證點：**
- [ ] 模板載入成功
- [ ] 配置自動套用
- [ ] 模板儲存成功
- [ ] 錯誤處理正確
- [ ] 成功/失敗提示顯示

---

### 整合測試

#### 測試 7：完整新增專案流程（步驟 1-2）

**目的：** 驗證從新增專案到視覺配置的完整流程

**流程：**

```typescript
test("完整新增專案流程", async () => {
  // Step 1: 進入新增專案頁
  const { getByText, getByPlaceholderText, getByRole } = render(<NewProjectPage />)

  // Step 2: 輸入專案名稱
  const nameInput = getByPlaceholderText("輸入專案名稱")
  await userEvent.type(nameInput, "測試專案")

  // Step 3: 選擇貼上文字
  const pasteRadio = getByLabelText("貼上文字")
  await userEvent.click(pasteRadio)

  // Step 4: 貼上文字內容（1000 字）
  const contentTextarea = getByPlaceholderText("貼上文字內容")
  const testContent = "這是測試內容。".repeat(200) // 1000 字
  await userEvent.type(contentTextarea, testContent)

  // Step 5: 驗證字數統計
  expect(getByText("目前字數: 1000")).toBeInTheDocument()

  // Step 6: 點擊下一步
  const nextButton = getByText("下一步")
  await userEvent.click(nextButton)

  // Step 7: 驗證 API 呼叫
  expect(api.createProject).toHaveBeenCalledWith({
    project_name: "測試專案",
    content_text: testContent,
    content_source: "paste"
  })

  // Step 8: 等待專案創建成功
  await waitFor(() => {
    expect(toast.success).toHaveBeenCalledWith("專案創建成功！")
  })

  // Step 9: 驗證跳轉到視覺配置頁
  expect(mockRouter.push).toHaveBeenCalledWith(
    "/project/mock-project-id/configure/visual"
  )

  // Step 10: 視覺配置頁載入
  const { getByText: getConfigText } = render(<VisualConfigPage params={{ id: "mock-project-id" }} />)

  // Step 11: 等待預設配置載入
  await waitFor(() => {
    expect(getConfigText("字幕設定")).toBeInTheDocument()
  })

  // Step 12: 修改字幕顏色
  const colorPicker = getByRole("button", { name: "選擇顏色" })
  await userEvent.click(colorPicker)
  // ... 顏色選擇器互動

  // Step 13: 驗證即時預覽
  const subtitlePreview = getSubtitleElement()
  expect(subtitlePreview.style.color).toBe("#FF0000")

  // Step 14: 等待自動儲存
  await waitFor(1500)
  expect(api.saveVisualConfig).toHaveBeenCalled()

  // Step 15: 點擊下一步
  const nextBtn = getConfigText("下一步")
  await userEvent.click(nextBtn)

  // Step 16: 驗證跳轉到 Prompt 設定頁
  expect(mockRouter.push).toHaveBeenCalledWith(
    "/project/mock-project-id/configure/prompt-model"
  )
})
```

**驗證點：**
- [ ] 專案創建 API 呼叫成功
- [ ] 跳轉到視覺配置頁
- [ ] 預設配置載入
- [ ] 配置變更即時預覽
- [ ] 自動儲存機制正常
- [ ] 跳轉到 Prompt 設定頁
- [ ] 整個流程無錯誤

---

## 實作規格

### 需要建立/修改的檔案

#### 1. 新增專案頁面

**檔案：** `frontend/app/project/new/page.tsx`

**職責：** 新增專案頁面主元件

**實作：**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import AppLayout from '@/components/layout/AppLayout'
import Breadcrumb from '@/components/ui/Breadcrumb'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import FileUpload from '@/components/ui/FileUpload'
import { projectsApi } from '@/services/api/projects'
import { toast } from '@/services/toast'

// Form Schema
const projectFormSchema = z.object({
  project_name: z
    .string()
    .min(1, '專案名稱不能為空')
    .max(100, '專案名稱不能超過 100 字元'),

  content_source: z.enum(['upload', 'paste']),

  content_text: z
    .string()
    .min(500, '文字長度必須在 500-10000 字之間')
    .max(10000, '文字長度必須在 500-10000 字之間')
})

export default function NewProjectPage() {
  const router = useRouter()

  const [formData, setFormData] = useState({
    project_name: '',
    content_source: 'paste' as 'upload' | 'paste',
    content_text: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // 字數統計
  const charCount = formData.content_text.length

  // Create Project Mutation
  const createMutation = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: (project) => {
      toast.success('專案創建成功！')
      router.push(`/project/${project.id}/configure/visual`)
    },
    onError: (error: any) => {
      toast.error(error.message || '專案創建失敗')
    }
  })

  // 處理檔案上傳
  const handleFileUpload = async (files: File[]) => {
    const file = files[0]

    // 驗證檔案大小
    if (file.size > 10 * 1024 * 1024) {
      toast.error('檔案大小不能超過 10MB')
      return
    }

    // 驗證檔案格式
    const allowedTypes = ['text/plain', 'text/markdown']
    if (!allowedTypes.includes(file.type)) {
      toast.error('檔案必須為 TXT 或 MD 格式')
      return
    }

    // 讀取文字
    try {
      const text = await file.text()
      const charCount = text.length

      if (charCount < 500 || charCount > 10000) {
        toast.error('文字長度必須在 500-10000 字之間')
        return
      }

      setFormData({ ...formData, content_text: text })
      toast.success('檔案載入成功')
    } catch (error) {
      toast.error('檔案讀取失敗')
    }
  }

  // 表單提交
  const handleSubmit = () => {
    // 驗證表單
    const result = projectFormSchema.safeParse(formData)

    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.issues.forEach(issue => {
        const field = issue.path[0] as string
        fieldErrors[field] = issue.message
      })
      setErrors(fieldErrors)
      return
    }

    // 清除錯誤
    setErrors({})

    // 提交
    createMutation.mutate({
      project_name: formData.project_name,
      content_text: formData.content_text,
      content_source: formData.content_source,
    })
  }

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: '主控台', href: '/' },
          { label: '新增專案' }
        ]}
      />

      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">新增專案</h1>

        {/* 專案名稱 */}
        <div className="mb-6">
          <label className="block mb-2 font-medium">專案名稱</label>
          <Input
            value={formData.project_name}
            onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
            placeholder="輸入專案名稱"
            status={errors.project_name ? 'error' : ''}
          />
          {errors.project_name && (
            <p className="text-red-500 text-sm mt-1">{errors.project_name}</p>
          )}
        </div>

        {/* 文字來源 */}
        <div className="mb-6">
          <label className="block mb-2 font-medium">文字來源</label>
          <Select
            value={formData.content_source}
            onChange={(value) => setFormData({ ...formData, content_source: value as 'upload' | 'paste' })}
            options={[
              { label: '貼上文字', value: 'paste' },
              { label: '上傳檔案', value: 'upload' },
            ]}
          />
        </div>

        {/* 文字內容 */}
        {formData.content_source === 'paste' ? (
          <div className="mb-6">
            <label className="block mb-2 font-medium">文字內容</label>
            <textarea
              className={`w-full h-64 border rounded p-3 font-mono text-sm ${
                errors.content_text ? 'border-red-500' : 'border-gray-300'
              }`}
              value={formData.content_text}
              onChange={(e) => setFormData({ ...formData, content_text: e.target.value })}
              placeholder="貼上文字內容 (500-10000 字)"
            />
            <div className="flex justify-between items-center mt-2">
              <p className={`text-sm ${
                charCount < 500 || charCount > 10000 ? 'text-yellow-600' : 'text-gray-500'
              }`}>
                目前字數: {charCount}
              </p>
              {charCount > 0 && (charCount < 500 || charCount > 10000) && (
                <p className="text-sm text-yellow-600">
                  {charCount < 500 ? `還需要 ${500 - charCount} 字` : `超過 ${charCount - 10000} 字`}
                </p>
              )}
            </div>
            {errors.content_text && (
              <p className="text-red-500 text-sm mt-1">{errors.content_text}</p>
            )}
          </div>
        ) : (
          <div className="mb-6">
            <label className="block mb-2 font-medium">上傳檔案</label>
            <FileUpload
              accept=".txt,.md"
              onFileSelect={handleFileUpload}
            />
            <p className="text-sm text-gray-500 mt-2">
              支援 .txt 和 .md 格式，最大 10MB
            </p>
          </div>
        )}

        {/* 操作按鈕 */}
        <div className="flex justify-end gap-4 mt-8">
          <Button onClick={() => router.push('/')}>
            取消
          </Button>
          <Button
            type="primary"
            loading={createMutation.isLoading}
            onClick={handleSubmit}
            disabled={charCount < 500 || charCount > 10000}
          >
            下一步
          </Button>
        </div>
      </div>
    </AppLayout>
  )
}
```

---

#### 2. 視覺化配置頁面

**檔案：** `frontend/app/project/[id]/configure/visual/page.tsx`

**職責：** 視覺化配置頁面主元件

**實作：**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import AppLayout from '@/components/layout/AppLayout'
import Breadcrumb from '@/components/ui/Breadcrumb'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import VisualEditor from '@/components/feature/VisualEditor'
import SubtitleConfig from '@/components/domain/SubtitleConfig'
import LogoConfig from '@/components/domain/LogoConfig'
import { configurationsApi } from '@/services/api/configurations'
import { useDebounce } from '@/hooks/useDebounce'
import { toast } from '@/services/toast'
import { VisualConfig } from '@/types/configuration'

export default function VisualConfigPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const projectId = params.id

  // 載入現有配置
  const { data: existingConfig, isLoading } = useQuery({
    queryKey: ['visual-config', projectId],
    queryFn: () => configurationsApi.getByProject(projectId),
  })

  // 預設配置
  const defaultConfig: VisualConfig = {
    subtitle: {
      font_family: 'Noto Sans TC',
      font_size: 48,
      font_color: '#FFFFFF',
      position: 'bottom-center',
      border_enabled: false,
      border_color: '#000000',
      border_width: 2,
      shadow_enabled: true,
      shadow_color: '#000000',
      shadow_offset_x: 2,
      shadow_offset_y: 2,
      background_enabled: false,
      background_color: '#000000',
      background_opacity: 70,
    },
    logo: {
      logo_file: null,
      logo_x: 50,
      logo_y: 50,
      logo_size: 100,
      logo_opacity: 100,
    },
    overlays: []
  }

  const [config, setConfig] = useState<VisualConfig>(existingConfig || defaultConfig)

  // 當載入完成後更新 config
  useEffect(() => {
    if (existingConfig) {
      setConfig(existingConfig)
    }
  }, [existingConfig])

  // Debounced config (1 秒延遲)
  const debouncedConfig = useDebounce(config, 1000)

  // 自動儲存 mutation
  const saveMutation = useMutation({
    mutationFn: (data: VisualConfig) =>
      configurationsApi.saveVisualConfig(projectId, data),
    onSuccess: () => {
      toast.success('配置已自動儲存', { duration: 2000 })
    },
    onError: () => {
      toast.error('配置儲存失敗')
    }
  })

  // 自動儲存效果
  useEffect(() => {
    if (debouncedConfig !== defaultConfig) {
      saveMutation.mutate(debouncedConfig)
    }
  }, [debouncedConfig])

  // 載入模板
  const handleLoadTemplate = async (templateId: string) => {
    try {
      const template = await configurationsApi.getTemplate(templateId)
      setConfig(template.config)
      toast.success('模板已載入')
    } catch (error) {
      toast.error('找不到模板')
    }
  }

  // 儲存為模板
  const handleSaveAsTemplate = async (templateName: string) => {
    try {
      await configurationsApi.createTemplate({
        name: templateName,
        config: config
      })
      toast.success('模板已儲存')
    } catch (error) {
      toast.error('模板儲存失敗')
    }
  }

  // 下一步
  const handleNext = () => {
    router.push(`/project/${projectId}/configure/prompt-model`)
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <Spinner size="large" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: '主控台', href: '/' },
          { label: '新增專案', href: '/project/new' },
          { label: '視覺化配置' }
        ]}
      />

      <div className="flex gap-6 p-6 h-[calc(100vh-200px)]">
        {/* 左側：預覽區 (60%) */}
        <div className="w-3/5">
          <VisualEditor
            config={config}
            onChange={setConfig}
          />
        </div>

        {/* 右側：配置面板 (40%) */}
        <div className="w-2/5 overflow-y-auto space-y-4">
          {/* 模板管理 */}
          <Card title="模板">
            <div className="flex gap-2">
              <Button onClick={() => {/* 顯示模板選擇 Modal */}}>
                載入模板
              </Button>
              <Button onClick={() => {/* 顯示儲存模板 Modal */}}>
                儲存為模板
              </Button>
            </div>
          </Card>

          {/* 字幕設定 */}
          <Card title="字幕設定">
            <SubtitleConfig
              config={config.subtitle}
              onChange={(subtitle) => setConfig({ ...config, subtitle })}
            />
          </Card>

          {/* Logo 設定 */}
          <Card title="Logo 設定">
            <LogoConfig
              config={config.logo}
              onChange={(logo) => setConfig({ ...config, logo })}
            />
          </Card>
        </div>
      </div>

      {/* 底部操作按鈕 */}
      <div className="flex justify-between px-6 pb-6 border-t pt-4">
        <Button onClick={() => router.back()}>
          上一步
        </Button>

        <div className="flex gap-3">
          <Button onClick={() => saveMutation.mutate(config)}>
            儲存配置
          </Button>
          <Button type="primary" onClick={handleNext}>
            下一步
          </Button>
        </div>
      </div>
    </AppLayout>
  )
}
```

---

#### 3. 視覺編輯器元件

**檔案：** `frontend/components/feature/VisualEditor/VisualEditor.tsx`

**職責：** Konva.js 預覽畫布，支援拖拽定位

**實作概要：**

```tsx
'use client'

import { useRef, useEffect } from 'react'
import Konva from 'konva'
import { Stage, Layer, Rect, Text, Image } from 'react-konva'
import { VisualConfig } from '@/types/configuration'

interface VisualEditorProps {
  config: VisualConfig
  onChange: (config: VisualConfig) => void
}

export default function VisualEditor({ config, onChange }: VisualEditorProps) {
  const stageRef = useRef<Konva.Stage>(null)

  // 16:9 預覽尺寸
  const previewWidth = 960
  const previewHeight = 540

  // 字幕拖拽處理
  const handleSubtitleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target
    onChange({
      ...config,
      subtitle: {
        ...config.subtitle,
        position_x: node.x(),
        position_y: node.y(),
      }
    })
  }

  // Logo 拖拽處理
  const handleLogoDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target
    onChange({
      ...config,
      logo: {
        ...config.logo,
        logo_x: node.x(),
        logo_y: node.y(),
      }
    })
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-gray-900">
      <Stage
        ref={stageRef}
        width={previewWidth}
        height={previewHeight}
      >
        <Layer>
          {/* 背景 */}
          <Rect
            x={0}
            y={0}
            width={previewWidth}
            height={previewHeight}
            fill="#000000"
          />

          {/* 字幕預覽 */}
          <Text
            x={calculateSubtitleX(config.subtitle.position)}
            y={calculateSubtitleY(config.subtitle.position)}
            text="範例字幕"
            fontFamily={config.subtitle.font_family}
            fontSize={config.subtitle.font_size}
            fill={config.subtitle.font_color}
            stroke={config.subtitle.border_enabled ? config.subtitle.border_color : undefined}
            strokeWidth={config.subtitle.border_enabled ? config.subtitle.border_width : 0}
            shadowEnabled={config.subtitle.shadow_enabled}
            shadowColor={config.subtitle.shadow_color}
            shadowOffsetX={config.subtitle.shadow_offset_x}
            shadowOffsetY={config.subtitle.shadow_offset_y}
            draggable
            onDragEnd={handleSubtitleDragEnd}
          />

          {/* Logo 預覽 */}
          {config.logo.logo_file && (
            <Image
              x={config.logo.logo_x}
              y={config.logo.logo_y}
              width={config.logo.logo_size}
              height={config.logo.logo_size}
              opacity={config.logo.logo_opacity / 100}
              draggable
              onDragEnd={handleLogoDragEnd}
            />
          )}
        </Layer>
      </Stage>
    </div>
  )
}

// 計算字幕位置的輔助函數
function calculateSubtitleX(position: string): number {
  if (position.includes('center')) return 480 // 中間
  if (position.includes('left')) return 50
  if (position.includes('right')) return 910
  return 480
}

function calculateSubtitleY(position: string): number {
  if (position.includes('top')) return 50
  if (position.includes('bottom')) return 490
  if (position.includes('center')) return 270
  return 490
}
```

---

#### 4. 字幕配置元件

**檔案：** `frontend/components/domain/SubtitleConfig/SubtitleConfig.tsx`

**職責：** 字幕樣式配置面板

**實作概要：**

```tsx
import { SubtitleConfig as SubtitleConfigType } from '@/types/configuration'
import Select from '@/components/ui/Select'
import Slider from '@/components/ui/Slider'
import ColorPicker from '@/components/ui/ColorPicker'
import Checkbox from '@/components/ui/Checkbox'

interface SubtitleConfigProps {
  config: SubtitleConfigType
  onChange: (config: SubtitleConfigType) => void
}

export default function SubtitleConfig({ config, onChange }: SubtitleConfigProps) {
  return (
    <div className="space-y-4">
      {/* 字型 */}
      <div>
        <label className="block text-sm font-medium mb-2">字型</label>
        <Select
          value={config.font_family}
          onChange={(value) => onChange({ ...config, font_family: value })}
          options={[
            { label: 'Noto Sans TC', value: 'Noto Sans TC' },
            { label: 'Microsoft JhengHei', value: 'Microsoft JhengHei' },
            { label: 'Arial', value: 'Arial' },
          ]}
        />
      </div>

      {/* 字體大小 */}
      <div>
        <label className="block text-sm font-medium mb-2">
          字體大小: {config.font_size}px
        </label>
        <Slider
          value={config.font_size}
          min={20}
          max={100}
          onChange={(value) => onChange({ ...config, font_size: value })}
        />
      </div>

      {/* 顏色 */}
      <div>
        <label className="block text-sm font-medium mb-2">顏色</label>
        <ColorPicker
          value={config.font_color}
          onChange={(value) => onChange({ ...config, font_color: value })}
        />
      </div>

      {/* 邊框 */}
      <div>
        <Checkbox
          checked={config.border_enabled}
          onChange={(checked) => onChange({ ...config, border_enabled: checked })}
          label="啟用邊框"
        />

        {config.border_enabled && (
          <div className="mt-2 space-y-2 ml-6">
            <ColorPicker
              label="邊框顏色"
              value={config.border_color}
              onChange={(value) => onChange({ ...config, border_color: value })}
            />
            <Slider
              label={`邊框寬度: ${config.border_width}px`}
              value={config.border_width}
              min={1}
              max={10}
              onChange={(value) => onChange({ ...config, border_width: value })}
            />
          </div>
        )}
      </div>

      {/* 陰影 */}
      <div>
        <Checkbox
          checked={config.shadow_enabled}
          onChange={(checked) => onChange({ ...config, shadow_enabled: checked })}
          label="啟用陰影"
        />

        {config.shadow_enabled && (
          <div className="mt-2 space-y-2 ml-6">
            <ColorPicker
              label="陰影顏色"
              value={config.shadow_color}
              onChange={(value) => onChange({ ...config, shadow_color: value })}
            />
            <Slider
              label={`X 偏移: ${config.shadow_offset_x}px`}
              value={config.shadow_offset_x}
              min={-20}
              max={20}
              onChange={(value) => onChange({ ...config, shadow_offset_x: value })}
            />
            <Slider
              label={`Y 偏移: ${config.shadow_offset_y}px`}
              value={config.shadow_offset_y}
              min={-20}
              max={20}
              onChange={(value) => onChange({ ...config, shadow_offset_y: value })}
            />
          </div>
        )}
      </div>
    </div>
  )
}
```

---

#### 5. Logo 配置元件

**檔案：** `frontend/components/domain/LogoConfig/LogoConfig.tsx`

**職責：** Logo 上傳與定位配置

**實作概要：**

```tsx
import { LogoConfig as LogoConfigType } from '@/types/configuration'
import FileUpload from '@/components/ui/FileUpload'
import Slider from '@/components/ui/Slider'
import { toast } from '@/services/toast'

interface LogoConfigProps {
  config: LogoConfigType
  onChange: (config: LogoConfigType) => void
}

export default function LogoConfig({ config, onChange }: LogoConfigProps) {
  const handleFileUpload = async (files: File[]) => {
    const file = files[0]

    // 驗證檔案格式
    const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      toast.error('檔案必須為 PNG, JPG 或 SVG 格式')
      return
    }

    // 讀取檔案為 Data URL
    const reader = new FileReader()
    reader.onload = (e) => {
      onChange({
        ...config,
        logo_file: e.target?.result as string
      })
      toast.success('Logo 已上傳')
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-4">
      {/* 上傳 Logo */}
      <div>
        <label className="block text-sm font-medium mb-2">上傳 Logo</label>
        <FileUpload
          accept=".png,.jpg,.jpeg,.svg"
          onFileSelect={handleFileUpload}
        />
        <p className="text-xs text-gray-500 mt-1">
          支援 PNG, JPG, SVG 格式
        </p>
      </div>

      {/* Logo 預覽 */}
      {config.logo_file && (
        <div className="border rounded p-2">
          <img
            src={config.logo_file}
            alt="Logo 預覽"
            className="max-w-full h-auto"
            style={{ maxHeight: '100px' }}
          />
        </div>
      )}

      {/* Logo 大小 */}
      {config.logo_file && (
        <>
          <div>
            <label className="block text-sm font-medium mb-2">
              大小: {config.logo_size}px
            </label>
            <Slider
              value={config.logo_size}
              min={10}
              max={200}
              onChange={(value) => onChange({ ...config, logo_size: value })}
            />
          </div>

          {/* Logo 透明度 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              透明度: {config.logo_opacity}%
            </label>
            <Slider
              value={config.logo_opacity}
              min={0}
              max={100}
              onChange={(value) => onChange({ ...config, logo_opacity: value })}
            />
          </div>
        </>
      )}
    </div>
  )
}
```

---

#### 6. useDebounce Hook

**檔案：** `frontend/hooks/useDebounce.ts`

**職責：** Debounce hook 用於自動儲存

**實作：**

```typescript
import { useEffect, useState } from 'react'

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
```

---

#### 7. Configuration API 服務

**檔案：** `frontend/services/api/configurations.ts`

**職責：** 配置 API 呼叫

**實作：**

```typescript
import { apiClient } from './client'
import { VisualConfig } from '@/types/configuration'

export const configurationsApi = {
  // 取得專案的視覺配置
  getByProject: async (projectId: string): Promise<VisualConfig> => {
    const response = await apiClient.get(`/api/v1/projects/${projectId}/configuration`)
    return response.data
  },

  // 儲存視覺配置
  saveVisualConfig: async (projectId: string, config: VisualConfig): Promise<void> => {
    await apiClient.put(`/api/v1/projects/${projectId}/configuration`, config)
  },

  // 取得模板
  getTemplate: async (templateId: string): Promise<{ id: string; name: string; config: VisualConfig }> => {
    const response = await apiClient.get(`/api/v1/templates/${templateId}`)
    return response.data
  },

  // 建立模板
  createTemplate: async (data: { name: string; config: VisualConfig }): Promise<void> => {
    await apiClient.post('/api/v1/templates', data)
  },
}
```

---

## 開發指引

### TDD 開發流程

#### Step 1: 環境準備（10 分鐘）

1. 確認 Task-017, Task-018, Task-019 已完成
2. 確認測試環境可運行：`npm run test`
3. 閱讀 `tech-specs/frontend/pages.md#3-新增專案頁-new-project`
4. 閱讀 `tech-specs/frontend/pages.md#4-視覺化配置頁-visual-config`
5. 閱讀 `product-design/pages.md#Page-3` 和 `#Page-4`

#### Step 2: 撰寫表單驗證測試（30 分鐘）

1. 建立 `frontend/app/project/new/__tests__/page.test.tsx`
2. 撰寫「測試 1：專案名稱驗證」（3 個測試案例）
3. 撰寫「測試 2：文字內容長度驗證」（5 個測試案例）
4. 執行測試 → 失敗（預期，尚未實作）

#### Step 3: 實作新增專案頁基礎架構（1 小時）

1. 建立 `frontend/app/project/new/page.tsx`
2. 定義 Zod schema (`projectFormSchema`)
3. 建立基本表單結構（專案名稱、文字來源、文字內容）
4. 實作表單驗證邏輯
5. 執行測試 1 和測試 2 → 通過 ✅

#### Step 4: 撰寫檔案上傳測試（20 分鐘）

1. 撰寫「測試 3：檔案上傳驗證」（5 個測試案例）
2. 執行測試 → 失敗

#### Step 5: 實作檔案上傳功能（45 分鐘）

1. 實作 `handleFileUpload` 函數
2. 檔案格式驗證（.txt, .md）
3. 檔案大小驗證（< 10MB）
4. 檔案內容長度驗證（500-10000 字）
5. 執行測試 3 → 通過 ✅

#### Step 6: 實作專案創建 API 整合（30 分鐘）

1. 建立 `frontend/services/api/projects.ts`
2. 實作 `projectsApi.create` 方法
3. 整合 TanStack Query mutation
4. 成功後跳轉到視覺配置頁
5. 手動測試完整流程

#### Step 7: 撰寫視覺配置測試（30 分鐘）

1. 建立 `frontend/app/project/[id]/configure/visual/__tests__/page.test.tsx`
2. 撰寫「測試 4：視覺配置即時預覽」（3 個測試案例）
3. 撰寫「測試 5：自動儲存機制」（2 個測試案例）
4. 執行測試 → 失敗

#### Step 8: 實作視覺配置頁基礎架構（2 小時）

1. 建立 `frontend/app/project/[id]/configure/visual/page.tsx`
2. 定義 `VisualConfig` 型別
3. 實作基本佈局（左右分欄）
4. 實作 `useDebounce` hook
5. 實作自動儲存邏輯
6. 執行測試 5 → 通過 ✅

#### Step 9: 實作視覺編輯器元件（3 小時）

1. 安裝依賴：`npm install react-konva konva`
2. 建立 `frontend/components/feature/VisualEditor/VisualEditor.tsx`
3. 實作 Konva Stage 和 Layer
4. 實作字幕預覽（Text 元件）
5. 實作 Logo 預覽（Image 元件）
6. 實作拖拽功能
7. 執行測試 4 → 通過 ✅

#### Step 10: 實作字幕配置元件（1.5 小時）

1. 建立 `frontend/components/domain/SubtitleConfig/SubtitleConfig.tsx`
2. 實作字型選擇器
3. 實作字體大小滑桿
4. 實作顏色選擇器
5. 實作邊框配置
6. 實作陰影配置
7. 實作背景框配置
8. 測試與預覽區的即時同步

#### Step 11: 實作 Logo 配置元件（1 小時）

1. 建立 `frontend/components/domain/LogoConfig/LogoConfig.tsx`
2. 實作檔案上傳
3. 實作 Logo 預覽
4. 實作大小滑桿
5. 實作透明度滑桿
6. 測試與預覽區的即時同步

#### Step 12: 撰寫模板管理測試（20 分鐘）

1. 撰寫「測試 6：模板載入與儲存」（3 個測試案例）
2. 執行測試 → 失敗

#### Step 13: 實作模板管理功能（1 小時）

1. 實作 `handleLoadTemplate` 函數
2. 實作 `handleSaveAsTemplate` 函數
3. 建立模板選擇 Modal
4. 建立儲存模板 Modal
5. 執行測試 6 → 通過 ✅

#### Step 14: 整合測試（2 小時）

1. 撰寫「測試 7：完整新增專案流程」
2. 手動測試完整流程：
   - 新增專案 → 視覺配置 → Prompt 設定
3. 修正發現的問題
4. 執行所有測試 → 全部通過 ✅

#### Step 15: 響應式設計（2 小時）

1. 實作桌面版佈局（≥1024px）
2. 實作平板版佈局（768-1023px）
3. 實作手機版佈局（<768px）
   - 預覽區和配置面板改為上下堆疊
   - 拖拽功能改為數值輸入
4. 測試各尺寸下的顯示效果

#### Step 16: 效能優化（1 小時）

1. 使用 `React.memo` 優化元件
2. 優化 Konva 渲染效能
3. 實作虛擬化（如需要）
4. 測試配置變更到預覽更新的延遲（< 100ms）

#### Step 17: 錯誤處理與 UX 優化（1.5 小時）

1. 實作載入狀態（Skeleton）
2. 實作錯誤狀態顯示
3. 實作成功/失敗 Toast 通知
4. 實作離開確認 Modal（有未儲存變更時）
5. 實作對齊輔助線（拖拽時顯示）

#### Step 18: 文件與檢查（30 分鐘）

1. 檢查測試覆蓋率：`npm run test:coverage`（目標 > 80%）
2. 執行 ESLint：`npm run lint`
3. 執行 TypeScript 檢查：`npm run type-check`
4. 更新元件文檔（如需要）
5. 截圖記錄實作成果

---

## 注意事項

### 技術陷阱

#### ⚠️ Konva.js 效能問題
- **問題：** 過多元素或頻繁更新會導致卡頓
- **解決：**
  - 使用 `React.memo` 防止不必要的重新渲染
  - 避免在拖拽時頻繁更新狀態
  - 使用 `requestAnimationFrame` 優化動畫

#### ⚠️ 檔案上傳安全性
- **問題：** 用戶可能上傳惡意檔案
- **解決：**
  - 驗證檔案 MIME type
  - 限制檔案大小
  - 不直接執行檔案內容
  - 使用 Data URL 而非直接讀取

#### ⚠️ Debounce 與 React 狀態
- **問題：** Debounce 可能導致狀態不同步
- **解決：**
  - 使用 `useDebounce` hook 而非手動實作
  - 確保 debounced value 和原始 value 分開管理
  - 在 cleanup 時取消 pending 的 timeout

### 效能考量

#### 💡 預覽區更新頻率
- 目標：配置變更到預覽更新 < 100ms
- 策略：
  - 使用 Konva 的高效渲染
  - 避免整個 Stage 重新渲染
  - 僅更新變更的元素

#### 💡 自動儲存頻率
- Debounce 延遲：1 秒
- 避免過於頻繁的 API 呼叫
- 失敗時顯示錯誤但不阻擋用戶操作

### 安全性檢查

#### ✅ 輸入驗證
- 專案名稱長度限制（1-100 字元）
- 文字內容長度限制（500-10000 字）
- 檔案大小限制（< 10MB）
- 檔案格式限制（.txt, .md, .png, .jpg, .svg）

#### ✅ XSS 防護
- 使用 React 的自動轉義
- 不直接插入 HTML
- 驗證用戶輸入

### 整合點

#### 🔗 與 Task-019 的整合
- 使用 `projectsApi.create` 創建專案
- 使用 `configurationsApi.saveVisualConfig` 儲存配置
- 使用 TanStack Query 管理 API 狀態

#### 🔗 與 Task-023 的整合
- 視覺配置完成後跳轉到 `/project/:id/configure/prompt-model`
- 傳遞 projectId
- 確保配置已儲存

---

## 完成檢查清單

### 功能完整性

#### Page-3: 新增專案頁
- [ ] 專案名稱輸入與驗證
- [ ] 文字來源切換（上傳/貼上）
- [ ] 文字內容 textarea
- [ ] 字數統計即時顯示
- [ ] 檔案上傳（拖拽 + 點擊）
- [ ] 檔案格式驗證
- [ ] 檔案大小驗證
- [ ] 內容長度驗證
- [ ] 錯誤訊息顯示
- [ ] 成功後跳轉

#### Page-4: 視覺化配置頁
- [ ] 左右分欄佈局
- [ ] Konva 預覽區
- [ ] 字幕配置面板
  - [ ] 字型選擇
  - [ ] 字體大小滑桿
  - [ ] 顏色選擇器
  - [ ] 位置選擇器
  - [ ] 邊框配置
  - [ ] 陰影配置
  - [ ] 背景框配置
- [ ] Logo 配置面板
  - [ ] 檔案上傳
  - [ ] 大小滑桿
  - [ ] 透明度滑桿
- [ ] 拖拽定位功能
- [ ] 即時預覽（< 100ms）
- [ ] 自動儲存（1 秒 debounce）
- [ ] 模板載入
- [ ] 模板儲存
- [ ] 成功後跳轉

### 測試
- [ ] 測試 1：專案名稱驗證（3 個案例）通過
- [ ] 測試 2：文字內容長度驗證（5 個案例）通過
- [ ] 測試 3：檔案上傳驗證（5 個案例）通過
- [ ] 測試 4：視覺配置即時預覽（3 個案例）通過
- [ ] 測試 5：自動儲存機制（2 個案例）通過
- [ ] 測試 6：模板載入與儲存（3 個案例）通過
- [ ] 測試 7：完整流程整合測試通過
- [ ] 測試覆蓋率 > 80%

### 程式碼品質
- [ ] ESLint 檢查通過：`npm run lint`
- [ ] TypeScript 檢查通過：`npm run type-check`
- [ ] 無 console.log 或除錯程式碼
- [ ] 所有元件有 TypeScript 型別定義
- [ ] 關鍵函數有註解

### 響應式設計
- [ ] 桌面（≥1024px）正常顯示
- [ ] 平板（768-1023px）正常顯示
- [ ] 手機（<768px）正常顯示
- [ ] 拖拽在手機上改為數值輸入

### 效能
- [ ] 配置變更到預覽更新 < 100ms
- [ ] 無明顯卡頓或延遲
- [ ] 自動儲存 debounce 正常

### 整合
- [ ] 與 Task-019 API 整合正常
- [ ] 與 Task-023 頁面跳轉正常
- [ ] 狀態管理正常（Zustand）
- [ ] 路由導航正常

### 文件
- [ ] README 更新（如需要）
- [ ] 元件文檔完整
- [ ] API 服務文檔完整

---

## 預估時間分配

- 環境準備與閱讀：10 分鐘
- 撰寫測試（測試 1-6）：2 小時
- 實作新增專案頁：2 小時
- 實作視覺配置頁基礎架構：2 小時
- 實作視覺編輯器元件：3 小時
- 實作字幕配置元件：1.5 小時
- 實作 Logo 配置元件：1 小時
- 實作模板管理功能：1 小時
- 整合測試：2 小時
- 響應式設計：2 小時
- 效能優化：1 小時
- 錯誤處理與 UX：1.5 小時
- 文件與檢查：30 分鐘

**總計：約 19.5 小時**（預留 0.5 小時 buffer = 20 小時）

---

## 參考資源

### 前端技術文檔
- [Next.js 14 App Router](https://nextjs.org/docs/app)
- [React Konva](https://konvajs.org/docs/react/index.html)
- [Konva.js](https://konvajs.org/)
- [Zod](https://zod.dev/) - Schema 驗證
- [TanStack Query](https://tanstack.com/query/latest)

### 相關套件文檔
- [react-dnd](https://react-dnd.github.io/react-dnd/) - 拖拽功能（備選）
- [react-color](https://casesandberg.github.io/react-color/) - 顏色選擇器（備選）

### 專案內部文件
- `tech-specs/frontend/pages.md#3-新增專案頁-new-project`
- `tech-specs/frontend/pages.md#4-視覺化配置頁-visual-config`
- `tech-specs/frontend/component-architecture.md`
- `product-design/pages.md#Page-3`
- `product-design/pages.md#Page-4`
- `product-design/flows.md#Flow-1`
- `product-design/flows.md#Flow-3`

---

**準備好了嗎？** 開始使用 TDD 方式實作 Page-3 和 Page-4！🚀
