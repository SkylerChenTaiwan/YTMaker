# 測試規格

> **建立日期:** 2025-10-19
> **最後更新:** 2025-10-19
> **關聯文件:** `_index.md`, `component-architecture.md`, `pages.md`

---

## 📖 目錄

1. [測試策略](#測試策略)
2. [元件單元測試](#元件單元測試)
3. [整合測試](#整合測試)
4. [E2E 測試案例](#e2e-測試案例)
5. [測試覆蓋率目標](#測試覆蓋率目標)

---

## 測試策略

### 測試層級

```
E2E 測試 (Playwright)
    ↓ 測試完整使用者流程
整合測試 (Jest + React Testing Library)
    ↓ 測試元件間整合
單元測試 (Jest + React Testing Library)
    ↓ 測試個別元件/函數
```

### 測試金字塔

```
        E2E
       /   \
      /     \
     /       \
    / 整合測試 \
   /___________\
  /             \
 /   單元測試     \
/_________________\
```

**比例建議:**
- 單元測試: 70%
- 整合測試: 20%
- E2E 測試: 10%

---

## 元件單元測試

### 測試框架

**使用:** Jest + React Testing Library

### 配置

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
  ],
}
```

```javascript
// jest.setup.js
import '@testing-library/jest-dom'
```

### Button 元件測試範例

```tsx
// components/ui/Button/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  it('renders with children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)

    fireEvent.click(screen.getByText('Click me'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled', () => {
    const handleClick = jest.fn()
    render(
      <Button disabled onClick={handleClick}>
        Click me
      </Button>
    )

    fireEvent.click(screen.getByText('Click me'))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('shows loading state', () => {
    render(<Button loading>Click me</Button>)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('applies correct type classes', () => {
    const { container } = render(<Button type="primary">Primary</Button>)
    const button = container.querySelector('button')
    expect(button).toHaveClass('bg-primary')
  })
})
```

### Modal 元件測試範例

```tsx
// components/ui/Modal/Modal.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { Modal } from './Modal'

describe('Modal', () => {
  it('renders when visible is true', () => {
    render(
      <Modal visible={true} title="Test Modal" onClose={jest.fn()}>
        <p>Modal content</p>
      </Modal>
    )

    expect(screen.getByText('Test Modal')).toBeInTheDocument()
    expect(screen.getByText('Modal content')).toBeInTheDocument()
  })

  it('does not render when visible is false', () => {
    render(
      <Modal visible={false} title="Test Modal" onClose={jest.fn()}>
        <p>Modal content</p>
      </Modal>
    )

    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const handleClose = jest.fn()
    render(
      <Modal visible={true} title="Test Modal" onClose={handleClose}>
        <p>Modal content</p>
      </Modal>
    )

    fireEvent.click(screen.getByLabelText('關閉'))
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('calls onOk when OK button is clicked', () => {
    const handleOk = jest.fn()
    render(
      <Modal visible={true} title="Test Modal" onClose={jest.fn()} onOk={handleOk}>
        <p>Modal content</p>
      </Modal>
    )

    fireEvent.click(screen.getByText('確定'))
    expect(handleOk).toHaveBeenCalledTimes(1)
  })
})
```

### Table 元件測試範例

```tsx
// components/ui/Table/Table.test.tsx
import { render, screen } from '@testing-library/react'
import { Table } from './Table'

interface TestData {
  id: string
  name: string
  status: string
}

describe('Table', () => {
  const columns = [
    { key: 'name', title: '名稱', dataIndex: 'name' as const },
    { key: 'status', title: '狀態', dataIndex: 'status' as const },
  ]

  const dataSource: TestData[] = [
    { id: '1', name: '專案 1', status: 'COMPLETED' },
    { id: '2', name: '專案 2', status: 'RUNNING' },
  ]

  it('renders table with data', () => {
    render(<Table columns={columns} dataSource={dataSource} />)

    expect(screen.getByText('名稱')).toBeInTheDocument()
    expect(screen.getByText('狀態')).toBeInTheDocument()
    expect(screen.getByText('專案 1')).toBeInTheDocument()
    expect(screen.getByText('專案 2')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    render(<Table columns={columns} dataSource={[]} loading />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders custom cell content with render function', () => {
    const customColumns = [
      {
        key: 'status',
        title: '狀態',
        dataIndex: 'status' as const,
        render: (status: string) => <span className="badge">{status}</span>,
      },
    ]

    render(<Table columns={customColumns} dataSource={dataSource} />)
    expect(screen.getAllByText('COMPLETED')[0]).toHaveClass('badge')
  })
})
```

### Hooks 測試範例

```tsx
// hooks/useDebounce.test.ts
import { renderHook, act } from '@testing-library/react'
import { useDebounce } from './useDebounce'

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500))
    expect(result.current).toBe('initial')
  })

  it('debounces value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    )

    // 更新值
    rerender({ value: 'updated', delay: 500 })

    // 值應該還是舊的
    expect(result.current).toBe('initial')

    // 快進時間
    act(() => {
      jest.advanceTimersByTime(500)
    })

    // 現在應該更新了
    expect(result.current).toBe('updated')
  })
})
```

---

## 整合測試

### 表單提交測試範例

```tsx
// app/project/new/page.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import NewProjectPage from './page'
import * as api from '@/services/projectService'

jest.mock('@/services/projectService')

describe('NewProjectPage', () => {
  const queryClient = new QueryClient()

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it('creates project successfully', async () => {
    const mockCreateProject = jest.spyOn(api, 'createProject').mockResolvedValue({
      id: '123',
      project_name: '測試專案',
      status: 'INITIALIZED',
    })

    render(<NewProjectPage />, { wrapper })

    // 填寫表單
    fireEvent.change(screen.getByLabelText('專案名稱'), {
      target: { value: '測試專案' },
    })
    fireEvent.change(screen.getByLabelText('文字內容'), {
      target: { value: 'a'.repeat(600) },
    })

    // 提交
    fireEvent.click(screen.getByText('下一步'))

    // 驗證 API 呼叫
    await waitFor(() => {
      expect(mockCreateProject).toHaveBeenCalledWith({
        projectName: '測試專案',
        contentText: 'a'.repeat(600),
        contentSource: 'paste',
      })
    })
  })

  it('shows validation error for short content', async () => {
    render(<NewProjectPage />, { wrapper })

    fireEvent.change(screen.getByLabelText('專案名稱'), {
      target: { value: '測試專案' },
    })
    fireEvent.change(screen.getByLabelText('文字內容'), {
      target: { value: 'too short' },
    })

    fireEvent.click(screen.getByText('下一步'))

    await waitFor(() => {
      expect(screen.getByText(/文字長度必須在 500-10000 字之間/)).toBeInTheDocument()
    })
  })
})
```

---

## E2E 測試案例

### 測試框架

**使用:** Playwright

### 配置

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

### 創建專案 E2E 測試

```typescript
// tests/e2e/create-project.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Create Project E2E', () => {
  test('should create a new project successfully', async ({ page }) => {
    // 前往主控台
    await page.goto('/')

    // 點擊新增專案
    await page.click('text=新增專案')

    // 填寫專案名稱
    await page.fill('input[name="project_name"]', 'E2E 測試專案')

    // 填寫文字內容
    await page.fill('textarea[name="content_text"]', 'a'.repeat(600))

    // 點擊下一步
    await page.click('text=下一步')

    // 應該導航到視覺化配置頁
    await expect(page.locator('text=視覺化配置')).toBeVisible()
  })

  test('should show error for empty project name', async ({ page }) => {
    await page.goto('/project/new')

    // 不填寫專案名稱，直接提交
    await page.fill('textarea[name="content_text"]', 'a'.repeat(600))
    await page.click('text=下一步')

    // 應該顯示錯誤訊息
    await expect(page.locator('text=專案名稱不能為空')).toBeVisible()
  })

  test('should show error for short content', async ({ page }) => {
    await page.goto('/project/new')

    await page.fill('input[name="project_name"]', 'E2E 測試專案')
    await page.fill('textarea[name="content_text"]', 'too short')
    await page.click('text=下一步')

    await expect(page.locator('text=文字長度必須在 500-10000 字之間')).toBeVisible()
  })
})
```

### 完整專案流程 E2E 測試

```typescript
// tests/e2e/project-workflow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Complete Project Workflow', () => {
  test('should complete entire project creation workflow', async ({ page }) => {
    // 1. 新增專案
    await page.goto('/')
    await page.click('text=新增專案')
    await page.fill('input[name="project_name"]', '完整流程測試')
    await page.fill('textarea[name="content_text"]', 'a'.repeat(600))
    await page.click('text=下一步')

    // 2. 視覺化配置
    await expect(page.locator('text=視覺化配置')).toBeVisible()
    // 配置字幕 (模擬)
    await page.click('text=下一步')

    // 3. Prompt 設定
    await expect(page.locator('text=Prompt 與模型')).toBeVisible()
    await page.click('text=下一步')

    // 4. YouTube 設定
    await expect(page.locator('text=YouTube 設定')).toBeVisible()
    await page.fill('input[name="title"]', '測試影片標題')
    await page.click('text=開始生成')

    // 5. 進度監控
    await expect(page.locator('text=進度監控')).toBeVisible()
  })
})
```

### 設定精靈 E2E 測試

```typescript
// tests/e2e/setup-wizard.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Setup Wizard E2E', () => {
  test('should complete setup wizard', async ({ page }) => {
    await page.goto('/setup')

    // 步驟 0: 歡迎
    await expect(page.locator('text=歡迎')).toBeVisible()
    await page.click('text=下一步')

    // 步驟 1: Gemini API
    await page.fill('input[name="gemini_api_key"]', 'test-gemini-key')
    await page.click('text=下一步')

    // 步驟 2: Stability AI
    await page.fill('input[name="stability_api_key"]', 'test-stability-key')
    await page.click('text=下一步')

    // 步驟 3: D-ID
    await page.fill('input[name="did_api_key"]', 'test-did-key')
    await page.click('text=下一步')

    // 步驟 4: YouTube 授權 (跳過)
    await page.click('text=跳過')

    // 步驟 5: 完成
    await expect(page.locator('text=完成')).toBeVisible()
    await page.click('text=開始使用')

    // 應該導航到主控台
    await expect(page).toHaveURL('/')
  })
})
```

---

## 測試覆蓋率目標

### 覆蓋率目標

| 代碼類型 | 目標覆蓋率 |
|---------|-----------|
| UI 元件 | > 80% |
| 功能元件 | > 70% |
| Hooks | > 80% |
| Utils | > 90% |
| 整體專案 | > 80% |

### 執行測試

```bash
# 執行所有單元測試
npm test

# 執行測試並生成覆蓋率報告
npm test -- --coverage

# 執行 E2E 測試
npm run test:e2e

# 執行特定測試檔案
npm test -- Button.test.tsx

# Watch 模式
npm test -- --watch
```

### 檢視覆蓋率報告

```bash
# 生成 HTML 報告
npm test -- --coverage

# 打開報告
open coverage/lcov-report/index.html
```

---

## 測試最佳實踐

### 1. 測試使用者行為，而非實作細節

```tsx
// ✅ 好的測試
it('shows error when form is invalid', async () => {
  render(<LoginForm />)
  fireEvent.click(screen.getByText('登入'))
  expect(await screen.findByText('請輸入電子郵件')).toBeInTheDocument()
})

// ❌ 不好的測試
it('sets error state to true', () => {
  const { result } = renderHook(() => useLoginForm())
  act(() => result.current.submit())
  expect(result.current.hasError).toBe(true)
})
```

### 2. 使用語義化查詢

```tsx
// ✅ 好的查詢
screen.getByRole('button', { name: '提交' })
screen.getByLabelText('電子郵件')
screen.getByText('成功訊息')

// ❌ 不好的查詢
screen.getByTestId('submit-button')
screen.getByClassName('email-input')
```

### 3. 避免快照測試濫用

只在適當時使用快照測試（如靜態內容），避免對動態內容使用。

### 4. Mock 外部依賴

```tsx
// Mock API 呼叫
jest.mock('@/services/api', () => ({
  getProjects: jest.fn().mockResolvedValue([]),
}))

// Mock Router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}))
```

### 5. 清理副作用

```tsx
afterEach(() => {
  jest.clearAllMocks()
  cleanup()
})
```

---

## 更新記錄

| 日期 | 版本 | 修改內容 | 修改人 |
|------|------|----------|--------|
| 2025-10-19 | 1.0 | 初始版本，從 frontend-spec.md 拆分 | Claude Code |
