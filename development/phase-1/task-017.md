# Task-017: 前端專案初始化與路由系統

> **建立日期:** 2025-10-19
> **狀態:** ⏳ 未開始
> **預計時間:** 6 小時
> **優先級:** P0 (必須)

---

## 關聯文件

### 技術規格
- **前端架構:** `tech-specs/frontend/overview.md` - 專案結構、技術棧、啟動流程
- **路由設計:** `tech-specs/frontend/routing.md` - 路由表、middleware、麵包屑
- **元件架構:** `tech-specs/frontend/component-architecture.md` - 元件層級、共用元件
- **樣式設計:** `tech-specs/frontend/styling.md` - Tailwind 配置、響應式設計
- **技術框架:** `tech-specs/framework.md#前端技術棧` - Next.js 14、Ant Design、Zustand

### 產品設計
- **產品概述:** `product-design/overview.md` - 整體應用架構
- **使用者流程:** `product-design/flows.md#Flow-0-首次啟動設定流程` - 首次啟動守衛邏輯

### 相關任務
- **前置任務:** Task-001 ✅ (專案初始化)
- **後續任務:** Task-018 (Zustand Stores), Task-019 (Axios 客戶端), Task-020 ~ 026 (所有前端頁面)
- **可並行:** Task-020 (Setup 頁面), Task-021 (Dashboard 頁面), Task-026 (Settings 頁面)

---

## 任務目標

### 簡述
建立 Next.js 14 (App Router) 專案，配置 Tailwind CSS + Ant Design，實作 12 個路由定義、導航守衛 (首次設定檢查)、Layout 元件、麵包屑元件、404 頁面，確保所有路由可正常訪問。

### 成功標準
- [ ] Next.js 14 專案建立完成，開發環境可運行 (`npm run dev`)
- [ ] Tailwind CSS + Ant Design 整合完成，樣式正常顯示
- [ ] 12 個路由檔案定義完成 (檔案結構符合 App Router 規範)
- [ ] Middleware 導航守衛實作完成 (首次設定檢查邏輯)
- [ ] Layout 元件完成 (導航列、麵包屑、主內容區)
- [ ] Breadcrumb 元件完成 (動態顯示當前路徑)
- [ ] 404 頁面完成
- [ ] Loading 元件完成
- [ ] 所有路由可正常訪問 (無 404 錯誤)
- [ ] TypeScript 類型檢查通過 (`npm run type-check`)
- [ ] ESLint 檢查通過 (`npm run lint`)

---

## 測試要求

### 單元測試 (5 個)

#### 測試 1: Middleware - 未完成設定時重定向到 /setup

**目的:** 驗證首次啟動守衛邏輯

**測試檔案:** `tests/unit/middleware.test.ts`

**測試邏輯:**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { middleware } from '@/middleware'

describe('Middleware - Setup Guard', () => {
  it('should redirect to /setup when setup is not completed', () => {
    const request = new NextRequest(new URL('http://localhost:3000/'))

    // Mock: setup_completed cookie 不存在
    request.cookies.delete('setup_completed')

    const response = middleware(request)

    expect(response.status).toBe(307) // Redirect
    expect(response.headers.get('Location')).toBe('/setup')
  })

  it('should allow access to /setup when setup is not completed', () => {
    const request = new NextRequest(new URL('http://localhost:3000/setup'))
    request.cookies.delete('setup_completed')

    const response = middleware(request)

    expect(response.status).toBe(200) // 允許訪問
  })

  it('should redirect to / when accessing /setup after setup completed', () => {
    const request = new NextRequest(new URL('http://localhost:3000/setup'))

    // Mock: setup_completed cookie 存在
    request.cookies.set('setup_completed', 'true')

    const response = middleware(request)

    expect(response.status).toBe(307) // Redirect
    expect(response.headers.get('Location')).toBe('/')
  })
})
```

**驗證點:**
- [ ] 未完成設定時，訪問任何頁面 (除了 /setup) 都重定向到 /setup
- [ ] 未完成設定時，可以正常訪問 /setup
- [ ] 完成設定後，訪問 /setup 重定向到 /
- [ ] Middleware 不攔截靜態資源 (_next/static, _next/image, favicon.ico)

---

#### 測試 2: 路由參數驗證 - UUID v4 格式檢查

**目的:** 驗證動態路由參數 (:id) 必須是有效的 UUID v4

**測試檔案:** `tests/unit/validators.test.ts`

**測試邏輯:**

```typescript
import { validateProjectId, validateBatchId } from '@/lib/validators'

describe('Route Parameter Validation', () => {
  it('should accept valid UUID v4', () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000'
    expect(validateProjectId(validUuid)).toBe(true)
    expect(validateBatchId(validUuid)).toBe(true)
  })

  it('should reject invalid UUID format', () => {
    expect(validateProjectId('123')).toBe(false)
    expect(validateProjectId('not-a-uuid')).toBe(false)
    expect(validateProjectId('550e8400-e29b-41d4-a716')).toBe(false) // 不完整
  })

  it('should reject UUID v1/v3/v5 (only accept v4)', () => {
    const uuidV1 = '550e8400-e29b-11d4-a716-446655440000' // version 1
    expect(validateProjectId(uuidV1)).toBe(false)
  })

  it('should reject empty or null', () => {
    expect(validateProjectId('')).toBe(false)
    expect(validateProjectId(null as any)).toBe(false)
    expect(validateProjectId(undefined as any)).toBe(false)
  })
})
```

**驗證點:**
- [ ] 接受標準 UUID v4 格式 (8-4-4-4-12)
- [ ] 拒絕非 UUID 格式
- [ ] 拒絕不完整的 UUID
- [ ] 拒絕其他版本的 UUID (只接受 v4)
- [ ] 拒絕空值或 null

---

#### 測試 3: Breadcrumb 元件 - 動態麵包屑生成

**目的:** 驗證麵包屑元件根據路由正確顯示

**測試檔案:** `tests/unit/components/Breadcrumb.test.tsx`

**測試邏輯:**

```typescript
import { render, screen } from '@testing-library/react'
import { Breadcrumb } from '@/components/layout/Breadcrumb'

describe('Breadcrumb Component', () => {
  it('should render breadcrumb items correctly', () => {
    const items = [
      { label: '主控台', href: '/' },
      { label: '新增專案', href: '/project/new' },
      { label: '視覺化配置' }, // 最後一項沒有 href
    ]

    render(<Breadcrumb items={items} />)

    // 檢查所有項目都顯示
    expect(screen.getByText('主控台')).toBeInTheDocument()
    expect(screen.getByText('新增專案')).toBeInTheDocument()
    expect(screen.getByText('視覺化配置')).toBeInTheDocument()

    // 檢查前兩項是連結
    expect(screen.getByText('主控台').closest('a')).toHaveAttribute('href', '/')
    expect(screen.getByText('新增專案').closest('a')).toHaveAttribute('href', '/project/new')

    // 檢查最後一項不是連結 (當前頁面)
    expect(screen.getByText('視覺化配置').closest('a')).not.toBeInTheDocument()
  })

  it('should render separator between items', () => {
    const items = [
      { label: '主控台', href: '/' },
      { label: '新增專案' },
    ]

    const { container } = render(<Breadcrumb items={items} />)

    // 檢查分隔符號 "/"
    expect(container.textContent).toContain('/')
  })

  it('should handle single item breadcrumb', () => {
    const items = [{ label: '主控台' }]

    render(<Breadcrumb items={items} />)

    expect(screen.getByText('主控台')).toBeInTheDocument()
    // 單一項目不應該有分隔符號
  })
})
```

**驗證點:**
- [ ] 正確渲染所有麵包屑項目
- [ ] 有 href 的項目渲染為連結
- [ ] 最後一項 (當前頁面) 不是連結
- [ ] 項目之間顯示分隔符號 "/"
- [ ] 支援單一項目的麵包屑

---

#### 測試 4: Layout 元件 - 響應式導航列

**目的:** 驗證 Layout 元件在不同螢幕尺寸下正確顯示

**測試檔案:** `tests/unit/components/AppLayout.test.tsx`

**測試邏輯:**

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppLayout } from '@/components/layout/AppLayout'

describe('AppLayout Component', () => {
  it('should render navigation bar and main content', () => {
    render(
      <AppLayout>
        <div>測試內容</div>
      </AppLayout>
    )

    // 檢查導航列存在
    expect(screen.getByRole('navigation')).toBeInTheDocument()

    // 檢查主內容區
    expect(screen.getByText('測試內容')).toBeInTheDocument()
  })

  it('should render navigation links', () => {
    render(<AppLayout><div /></AppLayout>)

    expect(screen.getByText('主控台')).toBeInTheDocument()
    expect(screen.getByText('配置管理')).toBeInTheDocument()
    expect(screen.getByText('模板管理')).toBeInTheDocument()
    expect(screen.getByText('系統設定')).toBeInTheDocument()
    expect(screen.getByText('批次處理')).toBeInTheDocument()
  })

  it('should toggle mobile menu on hamburger click', async () => {
    render(<AppLayout><div /></AppLayout>)

    // 在手機版應該有漢堡選單按鈕
    const hamburgerButton = screen.getByLabelText('開啟選單')

    // 初始狀態: 選單關閉
    expect(screen.queryByTestId('mobile-menu')).not.toBeVisible()

    // 點擊漢堡選單
    await userEvent.click(hamburgerButton)

    // 選單應該打開
    expect(screen.getByTestId('mobile-menu')).toBeVisible()

    // 再次點擊關閉
    await userEvent.click(hamburgerButton)
    expect(screen.queryByTestId('mobile-menu')).not.toBeVisible()
  })
})
```

**驗證點:**
- [ ] 渲染導航列和主內容區
- [ ] 顯示所有導航連結
- [ ] 手機版顯示漢堡選單按鈕
- [ ] 點擊漢堡選單可開關行動版選單
- [ ] 響應式設計: 桌面版水平導航，手機版漢堡選單

---

#### 測試 5: 404 頁面 - notFound() 觸發

**目的:** 驗證無效路由參數時正確顯示 404

**測試檔案:** `tests/unit/pages/not-found.test.tsx`

**測試邏輯:**

```typescript
import { render, screen } from '@testing-library/react'
import NotFound from '@/app/not-found'

describe('404 Page', () => {
  it('should render 404 message', () => {
    render(<NotFound />)

    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByText('找不到頁面')).toBeInTheDocument()
  })

  it('should have a link back to home', () => {
    render(<NotFound />)

    const homeLink = screen.getByText('返回主控台').closest('a')
    expect(homeLink).toHaveAttribute('href', '/')
  })
})
```

**整合測試 (使用 Playwright):**

```typescript
import { test, expect } from '@playwright/test'

test.describe('404 Handling', () => {
  test('should show 404 when accessing invalid project ID', async ({ page }) => {
    await page.goto('http://localhost:3000/project/invalid-id/progress')

    // 應該顯示 404 頁面
    await expect(page.locator('h1')).toContainText('404')
  })

  test('should show 404 when accessing non-existent route', async ({ page }) => {
    await page.goto('http://localhost:3000/non-existent-page')

    await expect(page.locator('h1')).toContainText('404')
  })
})
```

**驗證點:**
- [ ] 顯示 "404" 大標題
- [ ] 顯示 "找不到頁面" 說明
- [ ] 提供返回主控台的按鈕
- [ ] 無效的專案 ID 觸發 404
- [ ] 不存在的路由顯示 404

---

### 整合測試 (2 個)

#### 測試 6: 完整路由導航流程

**目的:** 驗證所有 12 個路由可正常訪問

**測試檔案:** `tests/e2e/routing.spec.ts` (Playwright)

**測試邏輯:**

```typescript
import { test, expect } from '@playwright/test'

test.describe('Complete Routing Flow', () => {
  test.beforeEach(async ({ page }) => {
    // 設定已完成首次設定 (跳過 middleware 重定向)
    await page.context().addCookies([{
      name: 'setup_completed',
      value: 'true',
      domain: 'localhost',
      path: '/',
    }])
  })

  const routes = [
    { path: '/', expectedTitle: '主控台' },
    { path: '/project/new', expectedTitle: '新增專案' },
    { path: '/configurations', expectedTitle: '配置管理' },
    { path: '/templates', expectedTitle: '模板管理' },
    { path: '/settings', expectedTitle: '系統設定' },
    { path: '/batch', expectedTitle: '批次處理' },
  ]

  routes.forEach(({ path, expectedTitle }) => {
    test(`should access ${path} and show ${expectedTitle}`, async ({ page }) => {
      await page.goto(`http://localhost:3000${path}`)

      // 檢查頁面標題
      await expect(page.locator('h1')).toContainText(expectedTitle)

      // 檢查頁面沒有錯誤
      await expect(page.locator('body')).not.toContainText('404')
      await expect(page.locator('body')).not.toContainText('Error')
    })
  })

  test('should navigate through project creation flow', async ({ page }) => {
    await page.goto('http://localhost:3000/')

    // 點擊「新增專案」
    await page.click('text=新增專案')

    // 應該導航到 /project/new
    await expect(page).toHaveURL(/\/project\/new/)
    await expect(page.locator('h1')).toContainText('新增專案')

    // 檢查麵包屑
    await expect(page.locator('nav[aria-label="Breadcrumb"]')).toContainText('主控台')
    await expect(page.locator('nav[aria-label="Breadcrumb"]')).toContainText('新增專案')
  })
})
```

**驗證點:**
- [ ] 所有 12 個路由可正常訪問
- [ ] 每個頁面顯示正確的標題
- [ ] 沒有 404 或錯誤訊息
- [ ] 麵包屑正確顯示當前路徑
- [ ] 導航連結正常工作

---

#### 測試 7: 首次啟動流程 (Middleware 守衛)

**目的:** 完整測試首次啟動設定流程

**測試檔案:** `tests/e2e/setup-flow.spec.ts` (Playwright)

**測試邏輯:**

```typescript
import { test, expect } from '@playwright/test'

test.describe('First-time Setup Flow', () => {
  test.beforeEach(async ({ page }) => {
    // 清除 setup_completed cookie (模擬首次啟動)
    await page.context().clearCookies()
  })

  test('should redirect to /setup on first launch', async ({ page }) => {
    await page.goto('http://localhost:3000/')

    // 應該自動重定向到 /setup
    await expect(page).toHaveURL(/\/setup/)
    await expect(page.locator('h1')).toContainText('設定精靈')
  })

  test('should not allow accessing other pages before setup', async ({ page }) => {
    await page.goto('http://localhost:3000/project/new')

    // 應該重定向到 /setup
    await expect(page).toHaveURL(/\/setup/)
  })

  test('should allow normal navigation after setup completed', async ({ page }) => {
    // 設定已完成
    await page.context().addCookies([{
      name: 'setup_completed',
      value: 'true',
      domain: 'localhost',
      path: '/',
    }])

    // 訪問主控台應該成功
    await page.goto('http://localhost:3000/')
    await expect(page).toHaveURL('http://localhost:3000/')
    await expect(page.locator('h1')).toContainText('主控台')

    // 訪問 /setup 應該重定向回 /
    await page.goto('http://localhost:3000/setup')
    await expect(page).toHaveURL('http://localhost:3000/')
  })
})
```

**驗證點:**
- [ ] 首次啟動時，訪問任何頁面都重定向到 /setup
- [ ] 完成設定後，可以正常訪問所有頁面
- [ ] 完成設定後，無法再訪問 /setup (重定向回 /)
- [ ] Cookie 機制正常工作

---

## 實作規格

### 需要建立的檔案與目錄結構

```
frontend/
├── src/
│   ├── app/                           # Next.js App Router
│   │   ├── layout.tsx                # 根佈局 (全局 Provider)
│   │   ├── page.tsx                  # 主控台頁面 (/)
│   │   ├── providers.tsx             # Provider 配置 (TanStack Query, Ant Design)
│   │   ├── globals.css               # 全域樣式
│   │   ├── not-found.tsx             # 404 頁面
│   │   │
│   │   ├── setup/                    # 首次設定精靈
│   │   │   └── page.tsx
│   │   │
│   │   ├── project/
│   │   │   ├── new/
│   │   │   │   └── page.tsx          # 新增專案
│   │   │   └── [id]/                 # 動態路由 :id
│   │   │       ├── configure/
│   │   │       │   ├── visual/
│   │   │       │   │   └── page.tsx  # 視覺化配置
│   │   │       │   ├── prompt-model/
│   │   │       │   │   └── page.tsx  # Prompt 與模型設定
│   │   │       │   └── youtube/
│   │   │       │       └── page.tsx  # YouTube 設定
│   │   │       ├── progress/
│   │   │       │   └── page.tsx      # 進度監控
│   │   │       └── result/
│   │   │           └── page.tsx      # 結果頁
│   │   │
│   │   ├── configurations/
│   │   │   └── page.tsx              # 配置管理
│   │   │
│   │   ├── templates/
│   │   │   └── page.tsx              # 模板管理
│   │   │
│   │   ├── settings/
│   │   │   └── page.tsx              # 系統設定
│   │   │
│   │   └── batch/
│   │       ├── page.tsx              # 批次處理列表
│   │       └── [id]/
│   │           └── page.tsx          # 批次任務詳細
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout/
│   │   │   │   ├── AppLayout.tsx    # 主應用佈局
│   │   │   │   ├── NavigationBar.tsx # 導航列
│   │   │   │   └── index.ts
│   │   │   ├── Breadcrumb/
│   │   │   │   ├── Breadcrumb.tsx   # 麵包屑元件
│   │   │   │   ├── types.ts
│   │   │   │   └── index.ts
│   │   │   └── SetupLayout/
│   │   │       ├── SetupLayout.tsx  # 設定精靈佈局
│   │   │       └── index.ts
│   │   │
│   │   └── ui/                        # 基礎 UI 元件 (後續 task 實作)
│   │       ├── Button/
│   │       ├── Spinner/
│   │       └── ...
│   │
│   ├── lib/
│   │   ├── validators.ts             # 路由參數驗證
│   │   └── cn.ts                     # Tailwind class 合併工具
│   │
│   ├── styles/
│   │   └── globals.css               # 全域樣式
│   │
│   └── types/
│       └── index.ts                  # 全域 TypeScript 型別
│
├── middleware.ts                     # Next.js Middleware (導航守衛)
├── next.config.js                    # Next.js 配置
├── tailwind.config.js                # Tailwind CSS 配置
├── tsconfig.json                     # TypeScript 配置
├── package.json
└── .eslintrc.js
```

---

### 核心檔案實作

#### 1. `package.json` - 依賴與腳本

```json
{
  "name": "ytmaker-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:e2e": "playwright test",
    "format": "prettier --write \"src/**/*.{ts,tsx,js,jsx,json,css,md}\""
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "antd": "^5.12.0",
    "zustand": "^4.4.7",
    "@tanstack/react-query": "^5.14.0",
    "axios": "^1.6.2",
    "socket.io-client": "^4.5.4",
    "zod": "^3.22.4",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.1.0"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.32",
    "autoprefixer": "^10.4.16",
    "@types/react": "^18.2.45",
    "@types/react-dom": "^18.2.18",
    "@types/node": "^20.10.5",
    "eslint": "^8.56.0",
    "eslint-config-next": "^14.0.0",
    "prettier": "^3.1.1",
    "@testing-library/react": "^14.1.2",
    "@testing-library/jest-dom": "^6.1.5",
    "@testing-library/user-event": "^14.5.1",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "@playwright/test": "^1.40.1"
  }
}
```

---

#### 2. `middleware.ts` - 導航守衛

**功能:**
- 檢查首次設定是否完成
- 未完成時重定向到 /setup
- 完成後禁止再訪問 /setup

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'

/**
 * Next.js Middleware - 導航守衛
 *
 * 職責:
 * 1. 檢查首次設定是否完成 (setup_completed cookie)
 * 2. 未完成時重定向到 /setup
 * 3. 完成後禁止訪問 /setup (重定向回 /)
 */
export function middleware(request: NextRequest) {
  const setupCompleted = checkSetupCompleted(request)
  const { pathname } = request.nextUrl

  // 首次啟動檢查
  if (!setupCompleted && !pathname.startsWith('/setup')) {
    // 未完成設定，重定向到 /setup
    return NextResponse.redirect(new URL('/setup', request.url))
  }

  // 如果已完成設定，不允許再訪問 /setup
  if (setupCompleted && pathname.startsWith('/setup')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // 其他情況正常通過
  return NextResponse.next()
}

/**
 * 檢查是否完成首次設定
 */
function checkSetupCompleted(request: NextRequest): boolean {
  // 從 Cookie 檢查
  const setupCookie = request.cookies.get('setup_completed')
  return setupCookie?.value === 'true'
}

/**
 * Middleware 配置
 * - matcher: 定義哪些路由需要經過 middleware
 * - 排除 _next/static, _next/image, favicon.ico 等靜態資源
 */
export const config = {
  matcher: [
    /*
     * 匹配所有路徑，除了:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
```

---

#### 3. `src/lib/validators.ts` - 路由參數驗證

```typescript
// src/lib/validators.ts

/**
 * 驗證專案 ID (UUID v4)
 * @param id - 專案 ID
 * @returns 是否有效
 */
export function validateProjectId(id: string): boolean {
  if (!id || typeof id !== 'string') return false

  // UUID v4 正則表達式
  // 格式: 8-4-4-4-12 個十六進制字元
  // 第 3 組必須以 4 開頭 (v4)
  // 第 4 組必須以 8, 9, a, b 開頭 (variant)
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  return uuidV4Regex.test(id)
}

/**
 * 驗證批次任務 ID (UUID v4)
 * @param id - 批次任務 ID
 * @returns 是否有效
 */
export function validateBatchId(id: string): boolean {
  return validateProjectId(id) // 使用相同的驗證邏輯
}
```

---

#### 4. `src/lib/cn.ts` - Tailwind 類別合併工具

```typescript
// src/lib/cn.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * 合併 Tailwind CSS 類別
 *
 * 使用 clsx 處理條件類別
 * 使用 tailwind-merge 處理衝突的 utility classes
 *
 * 範例:
 * cn('p-4', 'p-6') => 'p-6' (後者覆蓋前者)
 * cn('p-4', isActive && 'bg-primary') => 'p-4 bg-primary' (條件類別)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

---

#### 5. `tailwind.config.js` - Tailwind CSS 配置

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1E88E5',
          hover: '#1565C0',
          light: '#42A5F5',
          dark: '#0D47A1',
        },
        success: '#4CAF50',
        error: '#F44336',
        warning: '#FF9800',
        info: '#2196F3',
      },
      fontFamily: {
        sans: ['Noto Sans TC', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
```

---

#### 6. `src/app/layout.tsx` - 根佈局

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next'
import { Inter, Noto_Sans_TC } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })
const notoSansTC = Noto_Sans_TC({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'YTMaker',
  description: 'AI 驅動的 YouTube 影片自動化生成工具',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW">
      <body className={`${inter.className} ${notoSansTC.className}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

---

#### 7. `src/app/providers.tsx` - Provider 配置

```tsx
// src/app/providers.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider } from 'antd'
import zhTW from 'antd/locale/zh_TW'
import { ReactNode, useState } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  // TanStack Query 配置
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 分鐘
            gcTime: 10 * 60 * 1000, // 10 分鐘 (原 cacheTime)
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {/* Ant Design 配置 (繁體中文) */}
      <ConfigProvider
        locale={zhTW}
        theme={{
          token: {
            colorPrimary: '#1E88E5',
            borderRadius: 8,
          },
        }}
      >
        {children}
      </ConfigProvider>
    </QueryClientProvider>
  )
}
```

---

#### 8. `src/app/globals.css` - 全域樣式

```css
/* src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    @apply text-base antialiased;
  }

  body {
    @apply bg-gray-50 text-gray-900;
  }

  h1 {
    @apply text-3xl font-bold;
  }

  h2 {
    @apply text-2xl font-bold;
  }

  h3 {
    @apply text-xl font-semibold;
  }

  a {
    @apply text-primary hover:underline transition-colors;
  }
}

@layer components {
  .btn {
    @apply px-4 py-2 rounded font-medium transition-all;
  }

  .btn-primary {
    @apply bg-primary text-white hover:bg-primary-hover;
  }

  .card {
    @apply bg-white rounded-lg shadow p-6;
  }
}

/* 無障礙: 螢幕閱讀器專用 (隱藏視覺但保留語義) */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

---

#### 9. `src/app/page.tsx` - 主控台頁面 (骨架)

```tsx
// src/app/page.tsx
import { AppLayout } from '@/components/layout/AppLayout'

export default function DashboardPage() {
  return (
    <AppLayout>
      <div className="p-6">
        <h1>主控台</h1>
        <p className="text-gray-600 mt-2">
          歡迎使用 YTMaker！這裡是主控台頁面。
        </p>
        {/* 完整實作在 Task-021 */}
      </div>
    </AppLayout>
  )
}
```

---

#### 10. `src/app/not-found.tsx` - 404 頁面

```tsx
// src/app/not-found.tsx
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
          找不到頁面
        </h2>
        <p className="text-gray-600 mb-8">
          您訪問的頁面不存在，可能已被移除或 URL 不正確。
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors no-underline"
        >
          返回主控台
        </Link>
      </div>
    </div>
  )
}
```

---

#### 11. `src/components/layout/AppLayout/AppLayout.tsx` - 主應用佈局

```tsx
// src/components/layout/AppLayout/AppLayout.tsx
import { ReactNode } from 'react'
import { NavigationBar } from './NavigationBar'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* 導航列 */}
      <NavigationBar />

      {/* 主內容區 */}
      <main className="flex-1 bg-gray-50">{children}</main>

      {/* Footer (可選) */}
      <footer className="bg-white border-t py-4 px-6 text-center text-sm text-gray-600">
        © 2025 YTMaker. All rights reserved.
      </footer>
    </div>
  )
}
```

---

#### 12. `src/components/layout/AppLayout/NavigationBar.tsx` - 導航列

```tsx
// src/components/layout/AppLayout/NavigationBar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/cn'

export function NavigationBar() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navLinks = [
    { href: '/', label: '主控台' },
    { href: '/configurations', label: '配置管理' },
    { href: '/templates', label: '模板管理' },
    { href: '/settings', label: '系統設定' },
    { href: '/batch', label: '批次處理' },
  ]

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav className="bg-white border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-primary no-underline">
              YTMaker
            </Link>
          </div>

          {/* 桌面版導航 */}
          <div className="hidden md:flex items-center space-x-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'px-3 py-2 rounded-md text-sm font-medium transition-colors no-underline',
                  isActive(link.href)
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* 手機版漢堡選單 */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-gray-700 hover:bg-gray-100"
              aria-label="開啟選單"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 手機版選單 */}
      {mobileMenuOpen && (
        <div className="md:hidden" data-testid="mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1 bg-white border-t">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'block px-3 py-2 rounded-md text-base font-medium no-underline',
                  isActive(link.href)
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}
```

---

#### 13. `src/components/layout/Breadcrumb/Breadcrumb.tsx` - 麵包屑元件

```tsx
// src/components/layout/Breadcrumb/Breadcrumb.tsx
import Link from 'next/link'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex mb-4" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {/* 分隔符號 (除了第一項) */}
            {index > 0 && (
              <span className="mx-2 text-gray-400" aria-hidden="true">
                /
              </span>
            )}

            {/* 麵包屑項目 */}
            {item.href ? (
              <Link
                href={item.href}
                className="text-primary hover:underline transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-gray-600 font-medium">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
```

---

#### 14. 所有路由頁面 (骨架) - 12 個

**範例: `/project/new/page.tsx`**

```tsx
// src/app/project/new/page.tsx
import { AppLayout } from '@/components/layout/AppLayout'
import { Breadcrumb } from '@/components/layout/Breadcrumb'

export default function NewProjectPage() {
  return (
    <AppLayout>
      <div className="p-6">
        <Breadcrumb
          items={[
            { label: '主控台', href: '/' },
            { label: '新增專案' },
          ]}
        />
        <h1>新增專案</h1>
        <p className="text-gray-600 mt-2">
          這裡是新增專案頁面。完整實作在 Task-022。
        </p>
      </div>
    </AppLayout>
  )
}
```

**所有需要建立的路由頁面:**

1. ✅ `src/app/page.tsx` - 主控台
2. `src/app/setup/page.tsx` - 首次設定精靈
3. `src/app/project/new/page.tsx` - 新增專案
4. `src/app/project/[id]/configure/visual/page.tsx` - 視覺化配置
5. `src/app/project/[id]/configure/prompt-model/page.tsx` - Prompt 設定
6. `src/app/project/[id]/configure/youtube/page.tsx` - YouTube 設定
7. `src/app/project/[id]/progress/page.tsx` - 進度監控
8. `src/app/project/[id]/result/page.tsx` - 結果頁
9. `src/app/configurations/page.tsx` - 配置管理
10. `src/app/templates/page.tsx` - 模板管理
11. `src/app/settings/page.tsx` - 系統設定
12. `src/app/batch/page.tsx` - 批次處理列表
13. `src/app/batch/[id]/page.tsx` - 批次任務詳細

**動態路由頁面需要額外處理:**

在動態路由頁面中，需要驗證 UUID 參數:

```tsx
// src/app/project/[id]/progress/page.tsx
import { notFound } from 'next/navigation'
import { validateProjectId } from '@/lib/validators'
import { AppLayout } from '@/components/layout/AppLayout'
import { Breadcrumb } from '@/components/layout/Breadcrumb'

export default function ProgressPage({ params }: { params: { id: string } }) {
  // 驗證 UUID 格式
  if (!validateProjectId(params.id)) {
    notFound() // 觸發 404 頁面
  }

  return (
    <AppLayout>
      <div className="p-6">
        <Breadcrumb
          items={[
            { label: '主控台', href: '/' },
            { label: '專案名稱', href: `/project/${params.id}` },
            { label: '進度監控' },
          ]}
        />
        <h1>進度監控</h1>
        <p className="text-gray-600 mt-2">
          專案 ID: {params.id}
        </p>
        <p className="text-gray-600">
          完整實作在 Task-024。
        </p>
      </div>
    </AppLayout>
  )
}
```

---

### 配置檔案

#### `next.config.js`

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 未來 Electron 打包時需要設定
  output: 'standalone', // 可選，簡化部署
}

module.exports = nextConfig
```

#### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

#### `.eslintrc.js`

```javascript
module.exports = {
  extends: ['next/core-web-vitals', 'prettier'],
  rules: {
    '@typescript-eslint/no-unused-vars': 'warn',
    'react/no-unescaped-entities': 'off',
  },
}
```

---

## 開發指引

### TDD 開發流程 (Step-by-step)

#### 第 1 步: 環境準備 (20 分鐘)

**目標:** 建立 Next.js 專案並安裝依賴

1. **在專案根目錄建立 frontend 資料夾**

```bash
mkdir -p frontend
cd frontend
```

2. **初始化 Next.js 專案**

```bash
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"
```

3. **安裝額外依賴**

```bash
npm install antd zustand @tanstack/react-query axios socket.io-client zod clsx tailwind-merge
```

4. **安裝開發依賴**

```bash
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jest jest-environment-jsdom @playwright/test prettier eslint-config-prettier
```

5. **驗證安裝**

```bash
npm run dev
# 訪問 http://localhost:3000 確認頁面可顯示
```

---

#### 第 2 步: 配置 Tailwind 和測試環境 (15 分鐘)

1. **更新 `tailwind.config.js`** (使用上面提供的配置)

2. **建立 `jest.config.js`**

```javascript
// jest.config.js
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}

module.exports = createJestConfig(customJestConfig)
```

3. **建立 `jest.setup.js`**

```javascript
// jest.setup.js
import '@testing-library/jest-dom'
```

4. **建立 `playwright.config.ts`**

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

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
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

---

#### 第 3 步: 實作核心工具函數 (10 分鐘)

**按順序建立:**

1. `src/lib/cn.ts` - Tailwind 類別合併工具
2. `src/lib/validators.ts` - UUID 驗證函數

**測試:**

```bash
npm run test -- validators.test.ts
```

確保測試通過 ✅

---

#### 第 4 步: 實作 Middleware (20 分鐘)

1. **建立 `middleware.ts`** (使用上面提供的程式碼)

2. **撰寫測試** `tests/unit/middleware.test.ts`

```typescript
// tests/unit/middleware.test.ts
import { NextRequest, NextResponse } from 'next/server'
import { middleware } from '@/middleware'

describe('Middleware', () => {
  it('should redirect to /setup when setup not completed', () => {
    const request = new NextRequest(new URL('http://localhost:3000/'))
    // 確保沒有 setup_completed cookie

    const response = middleware(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('Location')).toContain('/setup')
  })

  // ... 其他測試
})
```

3. **執行測試**

```bash
npm run test -- middleware.test.ts
```

確保測試通過 ✅

---

#### 第 5 步: 實作 Layout 與導航列 (45 分鐘)

**按順序實作:**

1. `src/app/layout.tsx` - 根佈局
2. `src/app/providers.tsx` - Provider 配置
3. `src/app/globals.css` - 全域樣式
4. `src/components/layout/AppLayout/AppLayout.tsx` - 主應用佈局
5. `src/components/layout/AppLayout/NavigationBar.tsx` - 導航列

**測試:**

```bash
npm run test -- AppLayout.test.tsx
npm run dev
```

手動測試:
- [ ] 導航列顯示
- [ ] Logo 顯示
- [ ] 導航連結顯示
- [ ] 手機版漢堡選單可開關

---

#### 第 6 步: 實作麵包屑元件 (20 分鐘)

1. **建立 `src/components/layout/Breadcrumb/Breadcrumb.tsx`**

2. **撰寫測試** `tests/unit/components/Breadcrumb.test.tsx`

3. **執行測試**

```bash
npm run test -- Breadcrumb.test.tsx
```

確保測試通過 ✅

---

#### 第 7 步: 實作所有路由頁面 (骨架) (60 分鐘)

**逐一建立所有 12 個路由頁面:**

每個頁面包含:
- AppLayout 包裹
- Breadcrumb 麵包屑
- 標題與簡短說明
- 動態路由頁面需要 UUID 驗證

**建議順序:**

1. `src/app/page.tsx` - 主控台
2. `src/app/setup/page.tsx` - 首次設定
3. `src/app/project/new/page.tsx` - 新增專案
4. 建立其他 9 個頁面 (使用範本快速複製)

**手動測試:**

訪問每個路由，確認:
- [ ] 頁面可正常顯示
- [ ] 麵包屑正確顯示
- [ ] 無 404 錯誤
- [ ] 導航列高亮正確路由

---

#### 第 8 步: 實作 404 頁面 (10 分鐘)

1. **建立 `src/app/not-found.tsx`**

2. **測試 404 觸發:**

訪問不存在的路由:
```
http://localhost:3000/non-existent-page
http://localhost:3000/project/invalid-uuid/progress
```

確認顯示 404 頁面 ✅

---

#### 第 9 步: E2E 整合測試 (30 分鐘)

**撰寫 Playwright 測試:**

1. `tests/e2e/routing.spec.ts` - 路由導航測試
2. `tests/e2e/setup-flow.spec.ts` - 首次啟動流程測試

**執行測試:**

```bash
npm run test:e2e
```

確保所有測試通過 ✅

---

#### 第 10 步: 程式碼品質檢查 (20 分鐘)

1. **TypeScript 類型檢查**

```bash
npm run type-check
```

修正所有類型錯誤 ✅

2. **ESLint 檢查**

```bash
npm run lint
```

修正所有 linting 錯誤 ✅

3. **格式化程式碼**

```bash
npm run format
```

4. **執行所有單元測試**

```bash
npm run test
```

確保所有測試通過 ✅

---

### 注意事項

#### 1. Next.js App Router 特性

⚠️ **重要差異:**

- **Server Components 預設:** 所有元件預設是 Server Component
- **Client Components:** 需要互動性的元件加上 `'use client'`
- **Metadata:** 使用 `export const metadata` 而非 Head 元件

**範例:**

```tsx
// ✅ Server Component (預設)
export default function Page() {
  return <div>靜態內容</div>
}

// ✅ Client Component (需要互動)
'use client'
export default function InteractivePage() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>{count}</button>
}
```

#### 2. Middleware 限制

- Middleware 執行環境是 Edge Runtime，不支援所有 Node.js API
- 避免在 Middleware 中進行複雜邏輯或 API 呼叫
- Cookie 檢查是合理的使用方式

#### 3. Tailwind CSS 與 Ant Design 衝突

**解決方案:**

使用 Ant Design 的 ConfigProvider 覆蓋預設樣式:

```tsx
<ConfigProvider
  theme={{
    token: {
      colorPrimary: '#1E88E5', // 與 Tailwind primary 一致
    },
  }}
>
  {children}
</ConfigProvider>
```

#### 4. 響應式設計

**測試所有斷點:**

- 手機: < 768px
- 平板: 768px - 1023px
- 桌面: ≥ 1024px

使用 Chrome DevTools 測試不同裝置 ✅

---

### 完成檢查清單

#### 功能完整性
- [ ] Next.js 專案建立完成
- [ ] Tailwind CSS + Ant Design 整合完成
- [ ] 12 個路由定義完成 (所有頁面檔案存在)
- [ ] Middleware 導航守衛實作完成
- [ ] AppLayout 元件完成 (導航列、麵包屑)
- [ ] Breadcrumb 元件完成
- [ ] 404 頁面完成
- [ ] 所有路由可正常訪問

#### 測試
- [ ] 所有單元測試通過 (5 個測試)
- [ ] 所有 E2E 測試通過 (2 個測試)
- [ ] 手動測試所有路由
- [ ] 手動測試響應式設計 (手機/桌面)

#### 程式碼品質
- [ ] TypeScript 類型檢查通過: `npm run type-check`
- [ ] ESLint 檢查通過: `npm run lint`
- [ ] 程式碼已格式化: `npm run format`
- [ ] 無 console.log 或除錯程式碼
- [ ] 所有檔案有適當的註解

#### 整合
- [ ] `npm run dev` 可正常啟動
- [ ] 在本地環境手動測試所有功能
- [ ] 首次啟動流程正常 (重定向到 /setup)
- [ ] 完成設定後可正常訪問其他頁面
- [ ] 無 TypeScript 錯誤
- [ ] 無 Console 錯誤

#### 文件
- [ ] README.md 已更新 (如需要)
- [ ] 所有元件都有 TypeScript 型別定義
- [ ] 關鍵函數有 JSDoc 註解

---

## 預估時間分配

- **環境準備:** 20 分鐘
- **配置與工具:** 25 分鐘
- **Middleware 實作:** 20 分鐘
- **Layout 與導航:** 45 分鐘
- **麵包屑元件:** 20 分鐘
- **12 個路由頁面 (骨架):** 60 分鐘
- **404 頁面:** 10 分鐘
- **E2E 測試:** 30 分鐘
- **程式碼品質檢查:** 20 分鐘
- **文件與驗證:** 10 分鐘

**總計:** 約 4 小時 (預留 2 小時 buffer = 6 小時)

---

## 參考資源

### Next.js 官方文檔
- [App Router](https://nextjs.org/docs/app)
- [Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Dynamic Routes](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes)
- [not-found.js](https://nextjs.org/docs/app/api-reference/file-conventions/not-found)

### 測試相關
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright](https://playwright.dev/docs/intro)
- [Jest](https://jestjs.io/docs/getting-started)

### Tailwind CSS
- [官方文檔](https://tailwindcss.com/docs)
- [響應式設計](https://tailwindcss.com/docs/responsive-design)

### Ant Design
- [官方文檔](https://ant.design/components/overview)
- [Next.js 整合](https://ant.design/docs/react/use-with-next)

### 專案內部文件
- `tech-specs/frontend/overview.md` - 前端架構總覽
- `tech-specs/frontend/routing.md` - 路由設計
- `tech-specs/frontend/component-architecture.md` - 元件架構
- `tech-specs/frontend/styling.md` - 樣式設計

---

**準備好了嗎？** 開始使用 TDD 方式實作 Next.js 14 前端專案！🚀

記住：**先寫測試，再實作功能，確保每個測試通過後再繼續下一步。**
