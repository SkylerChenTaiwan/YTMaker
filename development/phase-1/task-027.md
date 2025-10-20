# Task-027: 配置與模板管理頁面

> **建立日期:** 2025-10-19
> **狀態:** ⏳ 未開始
> **預計時間:** 10 小時
> **優先級:** P1 (重要)

---

## 關聯文件

### 產品設計
- **頁面設計:** `product-design/pages.md#Page-9-配置管理頁` (行 1344-1450)
- **頁面設計:** `product-design/pages.md#Page-10-模板管理頁` (行 1454-1584)
- **使用者流程:** `product-design/flows.md#Flow-3-視覺化配置` (步驟 8: 儲存配置為模板)
- **使用者流程:** `product-design/flows.md#Flow-8-Prompt-範本管理`

### 技術規格
- **前端頁面:** `tech-specs/frontend/pages.md#9-配置管理頁` (行 609-619)
- **前端頁面:** `tech-specs/frontend/pages.md#10-模板管理頁` (行 622-629)
- **API 規格:** `tech-specs/backend/api-configurations.md` (完整文件)
- **狀態管理:** `tech-specs/frontend/state-management.md#useConfigStore`
- **API 整合:** `tech-specs/frontend/api-integration.md`

### 相關任務
- **前置任務:** Task-018 ✅ (Zustand Stores), Task-019 ✅ (API 整合)
- **後續任務:** Task-029 (E2E 測試)
- **關聯任務:** Task-022 (視覺化配置頁面，提供配置複製來源)

---

## 任務目標

### 簡述
實作配置管理頁面 (`/configurations`) 和模板管理頁面 (`/templates`)，包含完整的配置與模板 CRUD 功能、預覽、複製、套用等操作。

### 成功標準
- [ ] `/configurations` 頁面完成，可列出、預覽、編輯、複製、刪除配置
- [ ] `/templates` 頁面完成，包含兩個 Tab (視覺配置模板、Prompt 範本)
- [ ] 視覺配置模板 CRUD 功能完成
- [ ] Prompt 範本 CRUD 功能完成
- [ ] 配置複製功能可正常使用
- [ ] 模板套用到專案功能完成
- [ ] 所有操作都有適當的 loading 和錯誤處理
- [ ] 響應式設計在桌面、平板、手機上都正常運作
- [ ] 單元測試覆蓋率 > 80%
- [ ] E2E 測試覆蓋核心流程

---

## 測試要求

### 單元測試

#### 測試 1：配置管理頁面 - 成功載入配置列表

**目的:** 驗證配置列表可正確載入並顯示

**測試檔案:** `frontend/src/app/configurations/__tests__/page.test.tsx`

**輸入:**
- Mock API 回傳 3 個配置

```typescript
const mockConfigurations = [
  {
    id: 'config-1',
    name: '預設配置',
    created_at: '2025-01-15T10:30:00Z',
    last_used_at: '2025-01-15T11:45:00Z',
    usage_count: 10,
  },
  {
    id: 'config-2',
    name: '自訂配置 A',
    created_at: '2025-01-16T14:20:00Z',
    last_used_at: '2025-01-16T15:10:00Z',
    usage_count: 5,
  },
  {
    id: 'config-3',
    name: '自訂配置 B',
    created_at: '2025-01-17T09:00:00Z',
    last_used_at: null,
    usage_count: 0,
  },
]
```

**預期輸出:**
- 表格顯示 3 個配置
- 每個配置顯示名稱、創建時間、最後使用時間、使用次數
- 每個配置都有 4 個操作按鈕：預覽、編輯、複製、刪除

**驗證點:**
- [ ] API `GET /api/v1/configurations` 被呼叫
- [ ] 表格正確顯示 3 行資料
- [ ] 配置名稱正確顯示
- [ ] 時間格式化正確 (使用 dayjs 或 date-fns)
- [ ] 未使用過的配置 (config-3) 顯示「未使用」
- [ ] 每個配置都有 4 個按鈕

**測試程式碼骨架:**

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ConfigurationsPage from '../page'
import * as api from '@/lib/api/configurationsApi'

jest.mock('@/lib/api/configurationsApi')

describe('ConfigurationsPage', () => {
  it('應成功載入並顯示配置列表', async () => {
    // Mock API
    jest.spyOn(api, 'getConfigurations').mockResolvedValue({
      success: true,
      data: { configurations: mockConfigurations },
    })

    // Render
    const queryClient = new QueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <ConfigurationsPage />
      </QueryClientProvider>
    )

    // Wait for data
    await waitFor(() => {
      expect(screen.getByText('預設配置')).toBeInTheDocument()
    })

    // Assertions
    expect(screen.getByText('自訂配置 A')).toBeInTheDocument()
    expect(screen.getByText('自訂配置 B')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /預覽/ })).toHaveLength(3)
    expect(screen.getAllByRole('button', { name: /編輯/ })).toHaveLength(3)
  })
})
```

---

#### 測試 2：配置管理頁面 - 刪除配置成功

**目的:** 驗證刪除配置功能正常運作

**輸入:**
- 點擊配置的「刪除」按鈕
- 在確認 Modal 中點擊「確定」

**預期輸出:**
- 顯示確認 Modal: 「確定要刪除配置『預設配置』嗎?」
- 點擊確定後呼叫 `DELETE /api/v1/configurations/:id`
- 刪除成功後顯示 toast: 「配置已刪除」
- 配置列表重新載入，該配置消失

**驗證點:**
- [ ] 點擊刪除按鈕顯示確認 Modal
- [ ] Modal 顯示正確的配置名稱
- [ ] 點擊取消不呼叫 API
- [ ] 點擊確定呼叫 `DELETE /api/v1/configurations/config-1`
- [ ] API 成功後顯示 toast
- [ ] 配置列表重新查詢

**測試程式碼骨架:**

```typescript
it('應成功刪除配置', async () => {
  jest.spyOn(api, 'getConfigurations').mockResolvedValue({
    success: true,
    data: { configurations: mockConfigurations },
  })
  jest.spyOn(api, 'deleteConfiguration').mockResolvedValue({
    success: true,
    message: '配置已刪除',
  })

  const { user } = renderWithProviders(<ConfigurationsPage />)

  await waitFor(() => screen.getByText('預設配置'))

  // 點擊刪除按鈕
  const deleteButtons = screen.getAllByRole('button', { name: /刪除/ })
  await user.click(deleteButtons[0])

  // 確認 Modal 出現
  expect(screen.getByText(/確定要刪除配置/)).toBeInTheDocument()
  expect(screen.getByText(/預設配置/)).toBeInTheDocument()

  // 點擊確定
  const confirmButton = screen.getByRole('button', { name: /確定/ })
  await user.click(confirmButton)

  // 驗證 API 被呼叫
  expect(api.deleteConfiguration).toHaveBeenCalledWith('config-1')

  // 驗證 toast
  await waitFor(() => {
    expect(screen.getByText('配置已刪除')).toBeInTheDocument()
  })
})
```

---

#### 測試 3：模板管理頁面 - Tab 切換正常

**目的:** 驗證視覺配置模板 Tab 和 Prompt 範本 Tab 可正常切換

**測試檔案:** `frontend/src/app/templates/__tests__/page.test.tsx`

**輸入:**
- 頁面載入時顯示「視覺配置模板」Tab
- 點擊「Prompt 範本」Tab

**預期輸出:**
- 初始顯示視覺配置模板 (卡片網格)
- 點擊後顯示 Prompt 範本 (列表)
- Tab 高亮狀態正確切換

**驗證點:**
- [ ] 初始 Tab 為「視覺配置模板」
- [ ] 顯示視覺配置模板卡片
- [ ] 點擊「Prompt 範本」Tab
- [ ] Tab 高亮切換
- [ ] 顯示 Prompt 範本列表
- [ ] API 分別呼叫 `GET /api/v1/configurations` 和 `GET /api/v1/prompt-templates`

**測試程式碼骨架:**

```typescript
import TemplatesPage from '../page'

describe('TemplatesPage - Tab Switching', () => {
  it('應正確切換 Tab 並載入不同資料', async () => {
    jest.spyOn(api, 'getVisualTemplates').mockResolvedValue({
      success: true,
      data: { templates: mockVisualTemplates },
    })
    jest.spyOn(api, 'getPromptTemplates').mockResolvedValue({
      success: true,
      data: { templates: mockPromptTemplates },
    })

    const { user } = renderWithProviders(<TemplatesPage />)

    // 初始應顯示視覺配置模板
    await waitFor(() => {
      expect(screen.getByText('視覺配置模板')).toHaveClass('active')
    })
    expect(screen.getByText('模板 A')).toBeInTheDocument() // 視覺模板名稱

    // 點擊 Prompt 範本 Tab
    await user.click(screen.getByText('Prompt 範本'))

    // 驗證 Tab 切換
    expect(screen.getByText('Prompt 範本')).toHaveClass('active')

    // 驗證 Prompt 範本載入
    await waitFor(() => {
      expect(screen.getByText('預設範本')).toBeInTheDocument()
    })
  })
})
```

---

#### 測試 4：Prompt 範本 - 新增範本成功

**目的:** 驗證新增 Prompt 範本功能

**輸入:**
- 點擊「新增範本」按鈕
- 填寫範本名稱: "我的自訂範本"
- 填寫 Prompt 內容: "請將以下內容改寫為 YouTube 影片腳本..."
- 點擊「儲存」

**預期輸出:**
- 顯示「新增 Prompt 範本」Modal
- 提交後呼叫 `POST /api/v1/prompt-templates`
- 成功後顯示 toast: "範本已建立"
- Modal 關閉
- 範本列表重新載入，顯示新範本

**驗證點:**
- [ ] 點擊「新增範本」顯示 Modal
- [ ] Modal 包含名稱輸入框和內容 textarea
- [ ] 表單驗證正確 (名稱必填、內容最少 50 字)
- [ ] 提交呼叫 API
- [ ] 成功後顯示 toast
- [ ] 列表重新載入

**測試程式碼骨架:**

```typescript
it('應成功新增 Prompt 範本', async () => {
  jest.spyOn(api, 'createPromptTemplate').mockResolvedValue({
    success: true,
    data: { id: 'new-template-id', name: '我的自訂範本' },
  })

  const { user } = renderWithProviders(<TemplatesPage />)

  // 切換到 Prompt 範本 Tab
  await user.click(screen.getByText('Prompt 範本'))

  // 點擊新增範本
  await user.click(screen.getByRole('button', { name: /新增範本/ }))

  // 驗證 Modal 出現
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  expect(screen.getByLabelText('範本名稱')).toBeInTheDocument()

  // 填寫表單
  await user.type(screen.getByLabelText('範本名稱'), '我的自訂範本')
  await user.type(
    screen.getByLabelText('Prompt 內容'),
    '請將以下內容改寫為 YouTube 影片腳本，包含開場、正文、結尾...'
  )

  // 提交
  await user.click(screen.getByRole('button', { name: /儲存/ }))

  // 驗證 API 呼叫
  expect(api.createPromptTemplate).toHaveBeenCalledWith({
    name: '我的自訂範本',
    content: expect.stringContaining('YouTube 影片腳本'),
  })

  // 驗證成功 toast
  await waitFor(() => {
    expect(screen.getByText('範本已建立')).toBeInTheDocument()
  })
})
```

---

#### 測試 5：空狀態處理

**目的:** 驗證沒有配置/模板時顯示空狀態

**輸入:**
- API 回傳空陣列

**預期輸出:**
- 顯示空狀態圖示
- 顯示文字: "還沒有任何配置"
- 顯示「新增第一個配置」按鈕

**驗證點:**
- [ ] API 回傳 `{ configurations: [] }`
- [ ] 不顯示表格
- [ ] 顯示空狀態 UI
- [ ] 按鈕可點擊並導航

**測試程式碼骨架:**

```typescript
it('應正確顯示空狀態', async () => {
  jest.spyOn(api, 'getConfigurations').mockResolvedValue({
    success: true,
    data: { configurations: [] },
  })

  renderWithProviders(<ConfigurationsPage />)

  await waitFor(() => {
    expect(screen.getByText(/還沒有任何配置/)).toBeInTheDocument()
  })

  expect(screen.getByRole('button', { name: /新增第一個配置/ })).toBeInTheDocument()
  expect(screen.queryByRole('table')).not.toBeInTheDocument()
})
```

---

### 整合測試

#### 測試 6：配置複製並跳轉到視覺化配置頁面

**目的:** 驗證配置複製功能的完整流程

**測試檔案:** `frontend/src/app/configurations/__tests__/integration.test.tsx`

**流程:**
1. 載入配置列表
2. 點擊某個配置的「複製」按鈕
3. 呼叫 API 複製配置
4. 跳轉到視覺化配置頁面 (`/project/new/configure/visual?templateId=copied-id`)
5. 視覺化配置頁面載入複製的配置

**驗證點:**
- [ ] 點擊複製按鈕
- [ ] 呼叫 `POST /api/v1/configurations/:id/copy`
- [ ] 取得新配置 ID
- [ ] 跳轉到正確的 URL
- [ ] URL 包含 `templateId` query parameter

---

### E2E 測試

#### 測試 7：完整的模板建立與使用流程 (Playwright)

**目的:** 測試從建立視覺配置模板到在新專案中使用的完整流程

**測試檔案:** `e2e/templates.spec.ts`

**流程:**
1. 進入視覺化配置頁面 (`/project/:id/configure/visual`)
2. 調整字幕位置、Logo、疊加元素
3. 點擊「儲存為模板」
4. 填寫模板名稱: "E2E 測試模板"
5. 儲存成功
6. 進入模板管理頁面 (`/templates`)
7. 找到剛建立的模板
8. 點擊「使用」
9. 跳轉到新增專案頁面
10. 視覺配置自動套用模板設定

**驗證點:**
- [ ] 視覺配置可儲存為模板
- [ ] 模板出現在模板列表
- [ ] 模板可成功套用到新專案
- [ ] 套用後配置與原始設定一致

**測試程式碼骨架:**

```typescript
import { test, expect } from '@playwright/test'

test('完整模板建立與使用流程', async ({ page }) => {
  // Step 1: 建立並配置專案
  await page.goto('/project/new')
  await page.fill('[name="project_name"]', 'E2E 測試專案')
  await page.fill('[name="content_text"]', '這是測試內容...'.repeat(100))
  await page.click('button:has-text("下一步")')

  // Step 2: 進入視覺化配置
  await expect(page).toHaveURL(/\/configure\/visual/)

  // 調整字幕位置
  await page.click('[data-testid="subtitle-position-bottom"]')
  await page.fill('[data-testid="subtitle-font-size"]', '32')

  // Step 3: 儲存為模板
  await page.click('button:has-text("儲存為模板")')
  await page.fill('[data-testid="template-name"]', 'E2E 測試模板')
  await page.click('button:has-text("儲存")')

  // 驗證成功訊息
  await expect(page.locator('text=模板已儲存')).toBeVisible()

  // Step 4: 進入模板管理頁面
  await page.goto('/templates')
  await expect(page.locator('text=E2E 測試模板')).toBeVisible()

  // Step 5: 使用模板
  await page.locator('text=E2E 測試模板').locator('..').click('button:has-text("使用")')

  // Step 6: 驗證跳轉並套用
  await expect(page).toHaveURL('/project/new')
  // 進入視覺配置後驗證設定已套用
  await page.fill('[name="project_name"]', '使用模板的專案')
  await page.fill('[name="content_text"]', '測試內容...'.repeat(100))
  await page.click('button:has-text("下一步")')

  await expect(page).toHaveURL(/\/configure\/visual/)
  // 驗證字幕設定已套用
  const fontSize = await page.inputValue('[data-testid="subtitle-font-size"]')
  expect(fontSize).toBe('32')
})
```

---

## 實作規格

### 需要建立/修改的檔案

#### 1. 配置管理頁面

**檔案:** `frontend/src/app/configurations/page.tsx`

**職責:** 配置管理主頁面

**元件結構:**

```tsx
// frontend/src/app/configurations/page.tsx
'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Table, Button, Modal, message, Skeleton, Empty } from 'antd'
import { EyeOutlined, EditOutlined, CopyOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'
import AppLayout from '@/components/layout/AppLayout'
import ConfigurationPreviewModal from '@/components/configurations/ConfigurationPreviewModal'
import * as api from '@/lib/api/configurationsApi'
import type { Configuration } from '@/types/models'

export default function ConfigurationsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [previewConfig, setPreviewConfig] = useState<Configuration | null>(null)
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [configToDelete, setConfigToDelete] = useState<Configuration | null>(null)

  // 查詢配置列表
  const { data, isLoading, error } = useQuery({
    queryKey: ['configurations'],
    queryFn: api.getConfigurations,
  })

  // 刪除配置 mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteConfiguration(id),
    onSuccess: () => {
      message.success('配置已刪除')
      queryClient.invalidateQueries({ queryKey: ['configurations'] })
      setDeleteModalVisible(false)
    },
    onError: (error: any) => {
      message.error(error.message || '刪除失敗')
    },
  })

  // 複製配置 mutation
  const copyMutation = useMutation({
    mutationFn: (id: string) => api.copyConfiguration(id),
    onSuccess: (data) => {
      message.success('配置已複製')
      // 跳轉到視覺化配置頁面，載入複製的配置
      router.push(`/project/new/configure/visual?templateId=${data.data.id}`)
    },
    onError: (error: any) => {
      message.error(error.message || '複製失敗')
    },
  })

  // 表格欄位定義
  const columns = [
    {
      title: '配置名稱',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: Configuration, b: Configuration) => a.name.localeCompare(b.name),
    },
    {
      title: '創建時間',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
      sorter: (a: Configuration, b: Configuration) =>
        dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
    },
    {
      title: '最後使用時間',
      dataIndex: 'last_used_at',
      key: 'last_used_at',
      render: (date: string | null) =>
        date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '未使用',
      sorter: (a: Configuration, b: Configuration) => {
        if (!a.last_used_at) return 1
        if (!b.last_used_at) return -1
        return dayjs(a.last_used_at).unix() - dayjs(b.last_used_at).unix()
      },
      defaultSortOrder: 'descend' as const,
    },
    {
      title: '使用次數',
      dataIndex: 'usage_count',
      key: 'usage_count',
      sorter: (a: Configuration, b: Configuration) => a.usage_count - b.usage_count,
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: Configuration) => (
        <div className="flex gap-2">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => setPreviewConfig(record)}
          >
            預覽
          </Button>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => router.push(`/project/new/configure/visual?configId=${record.id}`)}
          >
            編輯
          </Button>
          <Button
            type="text"
            icon={<CopyOutlined />}
            onClick={() => copyMutation.mutate(record.id)}
            loading={copyMutation.isPending}
          >
            複製
          </Button>
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              setConfigToDelete(record)
              setDeleteModalVisible(true)
            }}
          >
            刪除
          </Button>
        </div>
      ),
    },
  ]

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6">
          <Skeleton active paragraph={{ rows: 6 }} />
        </div>
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="text-red-500">載入失敗: {error.message}</div>
        </div>
      </AppLayout>
    )
  }

  const configurations = data?.data?.configurations || []

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">配置管理</h1>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push('/project/new/configure/visual')}
          >
            新增配置
          </Button>
        </div>

        {configurations.length === 0 ? (
          <Empty
            description="還沒有任何配置"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button
              type="primary"
              onClick={() => router.push('/project/new/configure/visual')}
            >
              新增第一個配置
            </Button>
          </Empty>
        ) : (
          <Table
            columns={columns}
            dataSource={configurations}
            rowKey="id"
            pagination={{
              pageSize: 20,
              showSizeChanger: false,
              showTotal: (total) => `共 ${total} 個配置`,
            }}
          />
        )}

        {/* 預覽 Modal */}
        <ConfigurationPreviewModal
          configuration={previewConfig}
          visible={previewConfig !== null}
          onClose={() => setPreviewConfig(null)}
        />

        {/* 刪除確認 Modal */}
        <Modal
          title="確認刪除"
          open={deleteModalVisible}
          onOk={() => {
            if (configToDelete) {
              deleteMutation.mutate(configToDelete.id)
            }
          }}
          onCancel={() => {
            setDeleteModalVisible(false)
            setConfigToDelete(null)
          }}
          okText="確定"
          cancelText="取消"
          confirmLoading={deleteMutation.isPending}
        >
          <p>確定要刪除配置『{configToDelete?.name}』嗎？</p>
          <p className="text-gray-500 text-sm">此操作無法復原。</p>
        </Modal>
      </div>
    </AppLayout>
  )
}
```

---

#### 2. 模板管理頁面

**檔案:** `frontend/src/app/templates/page.tsx`

**職責:** 模板管理主頁面，包含兩個 Tab

**元件結構:**

```tsx
// frontend/src/app/templates/page.tsx
'use client'

import { useState } from 'react'
import { Tabs } from 'antd'
import AppLayout from '@/components/layout/AppLayout'
import VisualTemplatesTab from '@/components/templates/VisualTemplatesTab'
import PromptTemplatesTab from '@/components/templates/PromptTemplatesTab'

export default function TemplatesPage() {
  const [activeTab, setActiveTab] = useState('visual')

  const items = [
    {
      key: 'visual',
      label: '視覺配置模板',
      children: <VisualTemplatesTab />,
    },
    {
      key: 'prompt',
      label: 'Prompt 範本',
      children: <PromptTemplatesTab />,
    },
  ]

  return (
    <AppLayout>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">模板管理</h1>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={items}
        />
      </div>
    </AppLayout>
  )
}
```

---

#### 3. 視覺配置模板 Tab 元件

**檔案:** `frontend/src/components/templates/VisualTemplatesTab.tsx`

**職責:** 顯示視覺配置模板卡片網格

```tsx
// frontend/src/components/templates/VisualTemplatesTab.tsx
'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, Button, Modal, message, Skeleton, Empty, Row, Col } from 'antd'
import { EyeOutlined, EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import * as api from '@/lib/api/configurationsApi'
import type { VisualTemplate } from '@/types/models'

export default function VisualTemplatesTab() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<VisualTemplate | null>(null)

  // 查詢視覺模板列表
  const { data, isLoading } = useQuery({
    queryKey: ['visual-templates'],
    queryFn: api.getVisualTemplates,
  })

  // 刪除模板
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteVisualTemplate(id),
    onSuccess: () => {
      message.success('模板已刪除')
      queryClient.invalidateQueries({ queryKey: ['visual-templates'] })
      setDeleteModalVisible(false)
    },
    onError: (error: any) => {
      message.error(error.message || '刪除失敗')
    },
  })

  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 4 }} />
  }

  const templates = data?.data?.templates || []

  if (templates.length === 0) {
    return (
      <Empty description="還沒有任何視覺配置模板">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => router.push('/project/new/configure/visual')}
        >
          新增第一個模板
        </Button>
      </Empty>
    )
  }

  return (
    <>
      <div className="mb-4">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => router.push('/project/new/configure/visual')}
        >
          新增模板
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        {templates.map((template) => (
          <Col xs={24} sm={12} lg={8} key={template.id}>
            <Card
              hoverable
              cover={
                <div className="h-48 bg-gray-100 flex items-center justify-center">
                  {template.thumbnail_url ? (
                    <img
                      src={template.thumbnail_url}
                      alt={template.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-400">無預覽圖</span>
                  )}
                </div>
              }
              actions={[
                <Button
                  key="use"
                  type="link"
                  onClick={() =>
                    router.push(`/project/new?templateId=${template.id}`)
                  }
                >
                  使用
                </Button>,
                <Button
                  key="edit"
                  type="link"
                  icon={<EditOutlined />}
                  onClick={() =>
                    router.push(`/project/new/configure/visual?templateId=${template.id}`)
                  }
                >
                  編輯
                </Button>,
                <Button
                  key="delete"
                  type="link"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    setTemplateToDelete(template)
                    setDeleteModalVisible(true)
                  }}
                >
                  刪除
                </Button>,
              ]}
            >
              <Card.Meta
                title={template.name}
                description={
                  <>
                    <p className="text-sm text-gray-500 mb-1">{template.description}</p>
                    <p className="text-xs text-gray-400">使用次數: {template.usage_count}</p>
                  </>
                }
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Modal
        title="確認刪除"
        open={deleteModalVisible}
        onOk={() => {
          if (templateToDelete) {
            deleteMutation.mutate(templateToDelete.id)
          }
        }}
        onCancel={() => {
          setDeleteModalVisible(false)
          setTemplateToDelete(null)
        }}
        okText="確定"
        cancelText="取消"
        confirmLoading={deleteMutation.isPending}
      >
        <p>確定要刪除模板『{templateToDelete?.name}』嗎？</p>
      </Modal>
    </>
  )
}
```

---

#### 4. Prompt 範本 Tab 元件

**檔案:** `frontend/src/components/templates/PromptTemplatesTab.tsx`

**職責:** 顯示 Prompt 範本列表，支援新增、編輯、刪除

```tsx
// frontend/src/components/templates/PromptTemplatesTab.tsx
'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Table, Button, Modal, Form, Input, message, Tag } from 'antd'
import { EyeOutlined, EditOutlined, CopyOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import * as api from '@/lib/api/promptTemplatesApi'
import type { PromptTemplate } from '@/types/models'

const { TextArea } = Input

export default function PromptTemplatesTab() {
  const queryClient = useQueryClient()
  const [form] = Form.useForm()

  const [isModalVisible, setIsModalVisible] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create')
  const [currentTemplate, setCurrentTemplate] = useState<PromptTemplate | null>(null)
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<PromptTemplate | null>(null)

  // 查詢 Prompt 範本列表
  const { data, isLoading } = useQuery({
    queryKey: ['prompt-templates'],
    queryFn: api.getPromptTemplates,
  })

  // 建立範本
  const createMutation = useMutation({
    mutationFn: (values: { name: string; content: string }) =>
      api.createPromptTemplate(values),
    onSuccess: () => {
      message.success('範本已建立')
      queryClient.invalidateQueries({ queryKey: ['prompt-templates'] })
      setIsModalVisible(false)
      form.resetFields()
    },
  })

  // 更新範本
  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: any }) =>
      api.updatePromptTemplate(id, values),
    onSuccess: () => {
      message.success('範本已更新')
      queryClient.invalidateQueries({ queryKey: ['prompt-templates'] })
      setIsModalVisible(false)
      form.resetFields()
    },
  })

  // 刪除範本
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deletePromptTemplate(id),
    onSuccess: () => {
      message.success('範本已刪除')
      queryClient.invalidateQueries({ queryKey: ['prompt-templates'] })
      setDeleteModalVisible(false)
    },
    onError: (error: any) => {
      message.error(error.message || '刪除失敗')
    },
  })

  const handleCreate = () => {
    setModalMode('create')
    setCurrentTemplate(null)
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleEdit = (template: PromptTemplate) => {
    setModalMode('edit')
    setCurrentTemplate(template)
    form.setFieldsValue({
      name: template.name,
      content: template.content,
    })
    setIsModalVisible(true)
  }

  const handleView = (template: PromptTemplate) => {
    setModalMode('view')
    setCurrentTemplate(template)
    form.setFieldsValue({
      name: template.name,
      content: template.content,
    })
    setIsModalVisible(true)
  }

  const handleCopy = (template: PromptTemplate) => {
    setModalMode('create')
    setCurrentTemplate(null)
    form.setFieldsValue({
      name: `${template.name} (副本)`,
      content: template.content,
    })
    setIsModalVisible(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      if (modalMode === 'create') {
        createMutation.mutate(values)
      } else if (modalMode === 'edit' && currentTemplate) {
        updateMutation.mutate({ id: currentTemplate.id, values })
      }
    } catch (error) {
      console.error('表單驗證失敗:', error)
    }
  }

  const columns = [
    {
      title: '範本名稱',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: PromptTemplate) => (
        <span>
          {name}
          {record.is_default && (
            <Tag color="blue" className="ml-2">
              預設
            </Tag>
          )}
        </span>
      ),
    },
    {
      title: 'Prompt 預覽',
      dataIndex: 'content',
      key: 'content',
      render: (content: string) => (
        <div className="truncate max-w-md">{content.substring(0, 100)}...</div>
      ),
    },
    {
      title: '創建時間',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '使用次數',
      dataIndex: 'usage_count',
      key: 'usage_count',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: PromptTemplate) => (
        <div className="flex gap-2">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          >
            查看
          </Button>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            編輯
          </Button>
          <Button
            type="text"
            icon={<CopyOutlined />}
            onClick={() => handleCopy(record)}
          >
            複製
          </Button>
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            disabled={record.is_default}
            onClick={() => {
              setTemplateToDelete(record)
              setDeleteModalVisible(true)
            }}
          >
            刪除
          </Button>
        </div>
      ),
    },
  ]

  const templates = data?.data?.templates || []

  return (
    <>
      <div className="mb-4">
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新增範本
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={templates}
        rowKey="id"
        loading={isLoading}
        pagination={{
          pageSize: 10,
          showTotal: (total) => `共 ${total} 個範本`,
        }}
      />

      {/* 新增/編輯/查看 Modal */}
      <Modal
        title={
          modalMode === 'create'
            ? '新增 Prompt 範本'
            : modalMode === 'edit'
            ? '編輯 Prompt 範本'
            : '查看 Prompt 範本'
        }
        open={isModalVisible}
        onOk={modalMode === 'view' ? () => setIsModalVisible(false) : handleSubmit}
        onCancel={() => {
          setIsModalVisible(false)
          form.resetFields()
        }}
        okText={modalMode === 'view' ? '關閉' : '儲存'}
        cancelText={modalMode === 'view' ? undefined : '取消'}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={800}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            name="name"
            label="範本名稱"
            rules={[{ required: true, message: '請輸入範本名稱' }]}
          >
            <Input placeholder="輸入範本名稱" disabled={modalMode === 'view'} />
          </Form.Item>
          <Form.Item
            name="content"
            label="Prompt 內容"
            rules={[
              { required: true, message: '請輸入 Prompt 內容' },
              { min: 50, message: 'Prompt 內容至少需要 50 個字元' },
            ]}
          >
            <TextArea
              rows={12}
              placeholder="請輸入 Prompt 內容，可包含變數佔位符如 {content}、{duration} 等"
              disabled={modalMode === 'view'}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 刪除確認 Modal */}
      <Modal
        title="確認刪除"
        open={deleteModalVisible}
        onOk={() => {
          if (templateToDelete) {
            deleteMutation.mutate(templateToDelete.id)
          }
        }}
        onCancel={() => {
          setDeleteModalVisible(false)
          setTemplateToDelete(null)
        }}
        okText="確定"
        cancelText="取消"
        confirmLoading={deleteMutation.isPending}
      >
        <p>確定要刪除範本『{templateToDelete?.name}』嗎？</p>
        <p className="text-gray-500 text-sm">此操作無法復原。</p>
      </Modal>
    </>
  )
}
```

---

#### 5. 配置預覽 Modal 元件

**檔案:** `frontend/src/components/configurations/ConfigurationPreviewModal.tsx`

**職責:** 顯示配置的預覽效果

```tsx
// frontend/src/components/configurations/ConfigurationPreviewModal.tsx
import { Modal } from 'antd'
import type { Configuration } from '@/types/models'

interface Props {
  configuration: Configuration | null
  visible: boolean
  onClose: () => void
}

export default function ConfigurationPreviewModal({ configuration, visible, onClose }: Props) {
  if (!configuration) return null

  const config = configuration.configuration_data

  return (
    <Modal
      title={`預覽配置: ${configuration.name}`}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={900}
    >
      <div className="space-y-4">
        {/* 字幕設定預覽 */}
        <div className="border p-4 rounded">
          <h3 className="font-semibold mb-2">字幕設定</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>位置: {config.subtitle?.position || '底部'}</div>
            <div>字體大小: {config.subtitle?.font_size || 32}px</div>
            <div>字體顏色: {config.subtitle?.color || '#FFFFFF'}</div>
            <div>背景顏色: {config.subtitle?.bg_color || '#000000'}</div>
            <div>
              透明度: {((config.subtitle?.bg_opacity || 0.7) * 100).toFixed(0)}%
            </div>
          </div>
        </div>

        {/* Logo 設定預覽 */}
        {config.logo && (
          <div className="border p-4 rounded">
            <h3 className="font-semibold mb-2">Logo 設定</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>位置: {config.logo.position}</div>
              <div>大小: {config.logo.size}px</div>
              <div>
                偏移: X={config.logo.offset_x}px, Y={config.logo.offset_y}px
              </div>
              <div>透明度: {(config.logo.opacity * 100).toFixed(0)}%</div>
            </div>
          </div>
        )}

        {/* 疊加元素預覽 */}
        {config.overlays && config.overlays.length > 0 && (
          <div className="border p-4 rounded">
            <h3 className="font-semibold mb-2">疊加元素 ({config.overlays.length})</h3>
            <div className="space-y-2">
              {config.overlays.map((overlay: any, idx: number) => (
                <div key={idx} className="text-sm bg-gray-50 p-2 rounded">
                  <div className="font-medium">{overlay.type}</div>
                  <div className="text-gray-600">
                    位置: ({overlay.x}, {overlay.y})
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 視覺預覽區 (簡化版) */}
        <div className="border p-4 rounded bg-gray-900">
          <h3 className="font-semibold mb-2 text-white">預覽效果</h3>
          <div className="bg-gray-800 aspect-video relative flex items-center justify-center">
            <span className="text-gray-400 text-sm">
              (實際配置需在視覺化配置頁面查看完整效果)
            </span>
          </div>
        </div>
      </div>
    </Modal>
  )
}
```

---

#### 6. API 客戶端 - 配置管理

**檔案:** `frontend/src/lib/api/configurationsApi.ts`

**職責:** 配置相關 API 呼叫

```typescript
// frontend/src/lib/api/configurationsApi.ts
import { apiClient } from './client'
import type { Configuration, VisualTemplate } from '@/types/models'

// 列出所有配置
export async function getConfigurations() {
  return apiClient.get<{ configurations: Configuration[] }>('/api/v1/configurations')
}

// 建立配置
export async function createConfiguration(data: {
  name: string
  configuration_data: any
}) {
  return apiClient.post<{ id: string; name: string }>('/api/v1/configurations', data)
}

// 更新配置
export async function updateConfiguration(id: string, data: any) {
  return apiClient.put<{ id: string }>(`/api/v1/configurations/${id}`, data)
}

// 刪除配置
export async function deleteConfiguration(id: string) {
  return apiClient.delete<{ message: string }>(`/api/v1/configurations/${id}`)
}

// 複製配置
export async function copyConfiguration(id: string) {
  return apiClient.post<{ id: string; name: string }>(
    `/api/v1/configurations/${id}/copy`
  )
}

// 列出視覺配置模板
export async function getVisualTemplates() {
  return apiClient.get<{ templates: VisualTemplate[] }>(
    '/api/v1/configurations/templates'
  )
}

// 刪除視覺模板
export async function deleteVisualTemplate(id: string) {
  return apiClient.delete(`/api/v1/configurations/templates/${id}`)
}
```

---

#### 7. API 客戶端 - Prompt 範本

**檔案:** `frontend/src/lib/api/promptTemplatesApi.ts`

**職責:** Prompt 範本相關 API 呼叫

```typescript
// frontend/src/lib/api/promptTemplatesApi.ts
import { apiClient } from './client'
import type { PromptTemplate } from '@/types/models'

// 列出所有 Prompt 範本
export async function getPromptTemplates() {
  return apiClient.get<{ templates: PromptTemplate[] }>('/api/v1/prompt-templates')
}

// 建立 Prompt 範本
export async function createPromptTemplate(data: {
  name: string
  content: string
}) {
  return apiClient.post<{ id: string; name: string }>('/api/v1/prompt-templates', data)
}

// 更新 Prompt 範本
export async function updatePromptTemplate(id: string, data: any) {
  return apiClient.put<{ id: string }>(`/api/v1/prompt-templates/${id}`, data)
}

// 刪除 Prompt 範本
export async function deletePromptTemplate(id: string) {
  return apiClient.delete<{ message: string }>(`/api/v1/prompt-templates/${id}`)
}

// 取得單一範本詳細資訊
export async function getPromptTemplate(id: string) {
  return apiClient.get<PromptTemplate>(`/api/v1/prompt-templates/${id}`)
}
```

---

#### 8. 型別定義

**檔案:** `frontend/src/types/models.ts` (新增)

**職責:** 新增配置與模板相關型別

```typescript
// frontend/src/types/models.ts (新增以下型別)

export interface Configuration {
  id: string
  name: string
  configuration_data: {
    subtitle?: {
      position: 'top' | 'center' | 'bottom'
      font_size: number
      color: string
      bg_color: string
      bg_opacity: number
    }
    logo?: {
      url: string
      position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
      size: number
      offset_x: number
      offset_y: number
      opacity: number
    }
    overlays?: Array<{
      type: 'text' | 'shape' | 'image'
      x: number
      y: number
      [key: string]: any
    }>
  }
  created_at: string
  last_used_at: string | null
  usage_count: number
}

export interface VisualTemplate {
  id: string
  name: string
  description: string
  thumbnail_url: string | null
  configuration_data: any
  created_at: string
  usage_count: number
}

export interface PromptTemplate {
  id: string
  name: string
  content: string
  is_default: boolean
  created_at: string
  updated_at: string
  usage_count: number
}
```

---

### 響應式設計

#### 桌面 (≥1024px)
- 配置列表: 表格顯示
- 視覺模板: 3 欄網格
- Prompt 範本: 表格顯示

#### 平板 (768-1023px)
- 配置列表: 表格顯示 (可水平捲動)
- 視覺模板: 2 欄網格
- Prompt 範本: 表格顯示

#### 手機 (<768px)
- 配置列表: 卡片顯示 (非表格)
- 視覺模板: 單欄網格
- Prompt 範本: 卡片顯示

**Tailwind CSS 響應式類別範例:**

```tsx
<Row gutter={[16, 16]}>
  <Col xs={24} sm={12} lg={8}>
    {/* 手機全寬、平板雙欄、桌面三欄 */}
  </Col>
</Row>
```

---

### API 整合流程

#### 配置複製流程

```
用戶點擊「複製」
    ↓
呼叫 POST /api/v1/configurations/:id/copy
    ↓
API 回傳新配置 ID
    ↓
跳轉到 /project/new/configure/visual?templateId=new-id
    ↓
視覺化配置頁面載入該配置
```

#### 模板套用流程

```
用戶在模板管理頁點擊「使用」
    ↓
跳轉到 /project/new?templateId=template-id
    ↓
新增專案頁面檢測 templateId query parameter
    ↓
載入模板配置並預填到表單
```

---

## 開發指引

### TDD 開發流程

#### 第 1 步：環境準備 (15 分鐘)

1. 確認 Task-018 (Zustand Stores) 和 Task-019 (API 整合) 已完成
2. 確認測試環境可運行: `npm test`
3. 閱讀關聯 spec:
   - `product-design/pages.md#Page-9`, `#Page-10`
   - `tech-specs/frontend/pages.md#9`, `#10`
   - `tech-specs/backend/api-configurations.md`

#### 第 2 步：建立路由和基礎頁面 (30 分鐘)

1. 建立 `frontend/src/app/configurations/page.tsx`
2. 建立 `frontend/src/app/templates/page.tsx`
3. 確認路由可訪問
4. 新增到導航列

#### 第 3 步：撰寫配置管理頁面測試 (45 分鐘)

1. 建立 `frontend/src/app/configurations/__tests__/page.test.tsx`
2. 撰寫「測試 1: 成功載入配置列表」
3. 撰寫「測試 2: 刪除配置成功」
4. 撰寫「測試 5: 空狀態處理」
5. 執行測試 → 失敗 (預期，因為還沒實作)

#### 第 4 步：實作配置管理頁面 (90 分鐘)

1. 建立 API 客戶端 `configurationsApi.ts`
2. 實作配置列表查詢 (React Query)
3. 實作表格顯示 (Ant Design Table)
4. 實作刪除功能 (mutation + Modal)
5. 實作複製功能
6. 實作空狀態 UI
7. 執行測試 → 通過 ✅

#### 第 5 步：實作配置預覽 Modal (30 分鐘)

1. 建立 `ConfigurationPreviewModal.tsx`
2. 顯示配置的詳細設定
3. 測試預覽功能

#### 第 6 步：撰寫模板管理頁面測試 (45 分鐘)

1. 建立 `frontend/src/app/templates/__tests__/page.test.tsx`
2. 撰寫「測試 3: Tab 切換正常」
3. 撰寫「測試 4: 新增 Prompt 範本成功」
4. 執行測試 → 失敗

#### 第 7 步:實作模板管理頁面 - 視覺模板 Tab (60 分鐘)

1. 建立 `VisualTemplatesTab.tsx`
2. 實作卡片網格顯示
3. 實作刪除功能
4. 實作「使用」按鈕跳轉

#### 第 8 步:實作模板管理頁面 - Prompt 範本 Tab (90 分鐘)

1. 建立 `PromptTemplatesTab.tsx`
2. 實作表格顯示
3. 實作新增/編輯/查看 Modal
4. 實作表單驗證 (Zod 或 Ant Design Form)
5. 實作複製功能
6. 實作刪除功能 (預設範本不可刪除)
7. 執行測試 → 通過 ✅

#### 第 9 步:響應式設計調整 (30 分鐘)

1. 測試在不同螢幕尺寸下的顯示
2. 調整 Ant Design Grid (Row/Col)
3. 手機版卡片顯示優化
4. 平板版網格調整

#### 第 10 步:E2E 測試 (60 分鐘)

1. 建立 `e2e/templates.spec.ts`
2. 撰寫「測試 7: 完整模板建立與使用流程」
3. 執行 E2E 測試: `npm run e2e`
4. 修正發現的問題

#### 第 11 步:整合測試與優化 (45 分鐘)

1. 測試配置複製功能 (整合測試)
2. 測試模板套用功能
3. 優化 loading 狀態
4. 優化錯誤處理
5. 新增 loading skeleton

#### 第 12 步:最後檢查與文件 (30 分鐘)

1. 檢查所有測試通過: `npm test`
2. 檢查測試覆蓋率: `npm run test:coverage` (應 > 80%)
3. 執行 linter: `npm run lint`
4. 格式化程式碼: `npm run format`
5. 手動測試所有功能
6. 更新 README (如需要)

---

### 注意事項

#### 使用者體驗
- ⚠️ 刪除操作必須有確認 Modal
- ⚠️ 預設範本不可刪除 (前端 disable + 後端檢查)
- ⚠️ 所有操作都要有 loading 狀態
- ⚠️ 所有操作成功/失敗都要有 toast 提示
- 💡 空狀態要友善且引導用戶操作

#### 效能優化
- 💡 使用 React Query 的 cache 功能
- 💡 圖片使用 lazy loading
- 💡 表格啟用分頁 (每頁 20 筆)
- 💡 Modal 內容延遲載入

#### 測試
- ✅ Mock 所有 API 呼叫
- ✅ 測試 loading 和 error 狀態
- ✅ 測試表單驗證
- ✅ 測試 Modal 互動

#### 與其他模組整合
- 🔗 Task-022 (視覺化配置頁面) 會呼叫配置 API 儲存模板
- 🔗 新增專案流程 (Task-022, 023) 會使用模板 ID 載入配置
- 🔗 Task-029 (E2E 測試) 會測試完整的模板使用流程

---

### 完成檢查清單

#### 功能完整性
- [ ] `/configurations` 頁面可訪問且正常顯示
- [ ] 配置列表正確載入並顯示
- [ ] 配置預覽 Modal 正常運作
- [ ] 配置編輯跳轉正確
- [ ] 配置複製功能正確
- [ ] 配置刪除功能正確 (含確認 Modal)
- [ ] `/templates` 頁面可訪問
- [ ] Tab 切換正常 (視覺配置模板 ↔ Prompt 範本)
- [ ] 視覺配置模板卡片正確顯示
- [ ] 視覺模板「使用」按鈕跳轉正確
- [ ] Prompt 範本列表正確顯示
- [ ] Prompt 範本新增功能正確
- [ ] Prompt 範本編輯功能正確
- [ ] Prompt 範本複製功能正確
- [ ] Prompt 範本刪除功能正確
- [ ] 預設範本不可刪除 (按鈕 disabled)

#### 測試
- [ ] 所有單元測試通過 (5 個測試)
- [ ] 整合測試通過 (1 個測試)
- [ ] E2E 測試通過 (1 個測試)
- [ ] 測試覆蓋率 > 80%

#### 程式碼品質
- [ ] ESLint 無錯誤: `npm run lint`
- [ ] TypeScript 無錯誤: `npm run type-check`
- [ ] 程式碼已格式化: `npm run format`
- [ ] 無 console.log 或除錯程式碼

#### UI/UX
- [ ] 響應式設計在桌面正常
- [ ] 響應式設計在平板正常
- [ ] 響應式設計在手機正常
- [ ] 所有按鈕都有 loading 狀態
- [ ] 所有操作都有 toast 提示
- [ ] 空狀態 UI 友善
- [ ] 錯誤狀態顯示清楚

#### API 整合
- [ ] 所有 API 端點都有對應的客戶端函數
- [ ] API 錯誤處理完整
- [ ] React Query cache 正確配置
- [ ] mutation 成功後正確 invalidate queries

#### 文件
- [ ] 程式碼註解清楚
- [ ] 複雜邏輯有說明
- [ ] PropTypes 或 TypeScript 型別完整

---

## 預估時間分配

- 環境準備與閱讀: 15 分鐘
- 建立路由和基礎頁面: 30 分鐘
- 撰寫測試 (配置管理): 45 分鐘
- 實作配置管理頁面: 90 分鐘
- 實作配置預覽 Modal: 30 分鐘
- 撰寫測試 (模板管理): 45 分鐘
- 實作視覺模板 Tab: 60 分鐘
- 實作 Prompt 範本 Tab: 90 分鐘
- 響應式設計調整: 30 分鐘
- E2E 測試: 60 分鐘
- 整合測試與優化: 45 分鐘
- 最後檢查與文件: 30 分鐘

**總計:約 9 小時** (預留 1 小時 buffer = 10 小時)

---

## 參考資源

### Ant Design 元件
- [Table](https://ant.design/components/table)
- [Card](https://ant.design/components/card)
- [Modal](https://ant.design/components/modal)
- [Tabs](https://ant.design/components/tabs)
- [Form](https://ant.design/components/form)

### React Query 文件
- [Queries](https://tanstack.com/query/latest/docs/react/guides/queries)
- [Mutations](https://tanstack.com/query/latest/docs/react/guides/mutations)
- [Invalidation](https://tanstack.com/query/latest/docs/react/guides/query-invalidation)

### Next.js 文件
- [App Router](https://nextjs.org/docs/app)
- [Client Components](https://nextjs.org/docs/app/building-your-application/rendering/client-components)

### 專案內部文件
- `product-design/pages.md#Page-9-配置管理頁`
- `product-design/pages.md#Page-10-模板管理頁`
- `tech-specs/frontend/pages.md#9-配置管理頁`
- `tech-specs/backend/api-configurations.md`

---

**準備好了嗎？** 開始使用 TDD 方式實作這兩個頁面! 🚀
