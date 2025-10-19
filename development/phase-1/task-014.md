# Task-014: 前端專案初始化與路由系統

> **建立日期：** 2025-01-19
> **狀態：** ⏳ 未開始
> **預計時間：** 5 小時
> **優先級：** P0

---

## 關聯文件

### 技術規格
- **前端架構:** `tech-specs/frontend/overview.md` (完整文件)
- **路由設計:** `tech-specs/frontend/routing.md` (完整文件)
- **技術框架:** `tech-specs/framework.md`

### 產品設計
- **用戶流程:** `product-design/flows.md` (所有流程)
- **頁面設計:** `product-design/pages.md`

### 相關任務
- **前置任務:** Task-001 (專案初始化)
- **後續任務:** Task-015 (Zustand Stores), Task-016 (Axios 客戶端), Task-017~022 (各頁面實作)
- **並行任務:** 無（必須先完成）

---

## 任務目標

### 簡述
建立 Next.js 14 前端專案，配置 App Router，實作 12 個路由定義，設定導航守衛和麵包屑系統。

### 詳細說明
本任務負責建立前端應用的基礎架構，包括：
- 配置 Next.js 14 App Router 結構（用於 Electron 靜態導出）
- 定義所有 12 個主要路由及其對應頁面
- 實作導航守衛（首次啟動檢測、設定完成檢查）
- 實作麵包屑系統
- 設定全域 Layout 和錯誤處理
- 配置 404 頁面和重定向規則

### 成功標準
- [ ] 所有 12 個路由可正常訪問
- [ ] 導航守衛正確運作（首次啟動強制跳轉 /setup）
- [ ] 麵包屑正確顯示當前位置
- [ ] 404 頁面正確處理未知路由
- [ ] 全域 Layout 正確渲染
- [ ] 所有配置符合 Electron 靜態導出要求

---

## 測試要求

### 測試環境設定

**前置條件：**
- 前端專案已初始化（Task-001 完成）
- Node.js v18+ 已安裝
- 所有依賴已安裝

**啟動測試環境：**
```bash
cd frontend
npm run dev
# 訪問 http://localhost:3000
```

---

### 單元測試

#### 測試 1：所有路由可訪問

**測試檔案:** `tests/unit/routing.test.ts`

**測試程式碼：**
```typescript
import { describe, it, expect } from '@jest/globals'

const routes = [
  '/setup',
  '/dashboard',
  '/project/new',
  '/project/test-id/configure/visual',
  '/project/test-id/configure/prompt-model',
  '/project/test-id/configure/youtube',
  '/project/test-id/progress',
  '/project/test-id/result',
  '/configurations',
  '/templates',
  '/settings',
  '/batch'
]

describe('路由定義測試', () => {
  routes.forEach(route => {
    it(`路由 ${route} 應該存在對應的頁面檔案`, async () => {
      // 檢查對應的 page.tsx 檔案是否存在
      const fs = await import('fs')
      const path = await import('path')

      // 將路由轉換為檔案路徑
      const filePath = route
        .replace(/\/:[^/]+/g, '/[id]')  // 動態路由
        .replace(/\/$/, '')              // 移除尾部斜線

      const pagePath = path.join(
        process.cwd(),
        'src/app',
        filePath === '/dashboard' ? '' : filePath,
        'page.tsx'
      )

      expect(fs.existsSync(pagePath)).toBe(true)
    })
  })
})
```

**預期結果：**
- 所有 12 個路由都有對應的 page.tsx 檔案
- 動態路由使用 `[id]` 資料夾結構

---

#### 測試 2：導航守衛功能

**測試檔案:** `tests/unit/middleware.test.ts`

**測試程式碼：**
```typescript
import { describe, it, expect, beforeEach } from '@jest/globals'
import { NextRequest, NextResponse } from 'next/server'
import { middleware } from '@/middleware'

describe('導航守衛測試', () => {
  it('未完成設定時，訪問非 /setup 路由應重定向到 /setup', () => {
    const request = new NextRequest(new URL('http://localhost:3000/dashboard'))
    // 不設定 is_setup_completed cookie

    const response = middleware(request)

    expect(response.status).toBe(307)  // 重定向
    expect(response.headers.get('location')).toContain('/setup')
  })

  it('已完成設定時，訪問 /setup 應重定向到 /dashboard', () => {
    const request = new NextRequest(new URL('http://localhost:3000/setup'))
    request.cookies.set('is_setup_completed', 'true')

    const response = middleware(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/dashboard')
  })

  it('已完成設定時，可正常訪問其他頁面', () => {
    const request = new NextRequest(new URL('http://localhost:3000/dashboard'))
    request.cookies.set('is_setup_completed', 'true')

    const response = middleware(request)

    // 不應重定向
    expect(response.status).not.toBe(307)
  })
})
```

**預期結果：**
- 首次啟動強制跳轉到 /setup
- 設定完成後無法再訪問 /setup
- 所有其他路由正常可訪問

---

### 整合測試

#### 測試 3：麵包屑導航

**測試檔案:** `tests/integration/breadcrumb.test.tsx`

**測試程式碼：**
```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from '@jest/globals'
import { Breadcrumb } from '@/components/layout/Breadcrumb'

describe('麵包屑測試', () => {
  it('在 /dashboard 顯示正確的麵包屑', () => {
    render(<Breadcrumb pathname="/dashboard" />)

    expect(screen.getByText('主控台')).toBeInTheDocument()
  })

  it('在 /project/123/configure/visual 顯示完整路徑', () => {
    render(<Breadcrumb pathname="/project/123/configure/visual" />)

    expect(screen.getByText('專案')).toBeInTheDocument()
    expect(screen.getByText('配置')).toBeInTheDocument()
    expect(screen.getByText('視覺化配置')).toBeInTheDocument()
  })

  it('麵包屑應該可點擊並導航', () => {
    const { container } = render(<Breadcrumb pathname="/project/123/configure/visual" />)

    const links = container.querySelectorAll('a')
    expect(links.length).toBeGreaterThan(0)
    expect(links[0].getAttribute('href')).toBe('/dashboard')
  })
})
```

**預期結果：**
- 麵包屑正確顯示當前路徑
- 麵包屑層級正確
- 麵包屑可點擊導航

---

### E2E 測試

#### 測試 4：路由導航流程

**測試檔案:** `tests/e2e/navigation.spec.ts`

**測試程式碼：**
```typescript
import { test, expect } from '@playwright/test'

test.describe('路由導航', () => {
  test('首次訪問應跳轉到設定頁面', async ({ page, context }) => {
    // 清除 cookies
    await context.clearCookies()

    await page.goto('http://localhost:3000/')

    // 應該自動重定向到 /setup
    await expect(page).toHaveURL(/\/setup/)
    expect(await page.textContent('h1')).toContain('歡迎使用')
  })

  test('完成設定後可訪問主控台', async ({ page, context }) => {
    // 設定 cookie 模擬已完成設定
    await context.addCookies([{
      name: 'is_setup_completed',
      value: 'true',
      domain: 'localhost',
      path: '/'
    }])

    await page.goto('http://localhost:3000/')

    // 應該顯示主控台
    await expect(page).toHaveURL(/\/(dashboard)?$/)
  })

  test('可從主控台導航到新增專案', async ({ page, context }) => {
    await context.addCookies([{
      name: 'is_setup_completed',
      value: 'true',
      domain: 'localhost',
      path: '/'
    }])

    await page.goto('http://localhost:3000/dashboard')
    await page.click('text=新增專案')

    await expect(page).toHaveURL(/\/project\/new/)
  })

  test('404 頁面正確處理未知路由', async ({ page }) => {
    await page.goto('http://localhost:3000/nonexistent-page')

    expect(await page.textContent('h1')).toContain('404')
  })
})
```

**預期結果：**
- 導航守衛正常運作
- 路由跳轉正確
- 404 頁面正確顯示

---

## 實作規格

### 目錄結構

```
frontend/src/app/
├── layout.tsx                        # 全域 Layout
├── page.tsx                          # 首頁（重定向到 /dashboard）
├── not-found.tsx                     # 404 頁面
├── error.tsx                         # 錯誤處理頁面
├── setup/
│   └── page.tsx                      # 首次啟動設定精靈
├── dashboard/
│   └── page.tsx                      # 主控台（專案列表）
├── project/
│   ├── new/
│   │   └── page.tsx                  # 新增專案
│   └── [id]/
│       ├── configure/
│       │   ├── visual/
│       │   │   └── page.tsx          # 視覺化配置
│       │   ├── prompt-model/
│       │   │   └── page.tsx          # Prompt 與模型設定
│       │   └── youtube/
│       │       └── page.tsx          # YouTube 設定
│       ├── progress/
│       │   └── page.tsx              # 進度監控
│       └── result/
│           └── page.tsx              # 結果頁面
├── configurations/
│   └── page.tsx                      # 配置管理
├── templates/
│   └── page.tsx                      # 模板管理
├── settings/
│   └── page.tsx                      # 系統設定
└── batch/
    └── page.tsx                      # 批次處理
```

---

### 核心檔案實作

#### 1. 全域 Layout
**檔案:** `frontend/src/app/layout.tsx`

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AntdRegistry } from '@ant-design/nextjs-registry'
import { ConfigProvider } from 'antd'
import zhTW from 'antd/locale/zh_TW'
import '@/styles/globals.css'
import { Navigation } from '@/components/layout/Navigation'
import { Breadcrumb } from '@/components/layout/Breadcrumb'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'YTMaker - YouTube 影片自動化生產系統',
  description: '從文字內容自動生成 YouTube 影片',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW">
      <body className={inter.className}>
        <AntdRegistry>
          <ConfigProvider
            locale={zhTW}
            theme={{
              token: {
                colorPrimary: '#1E88E5',
                borderRadius: 8,
                fontSize: 14,
              },
            }}
          >
            <div className="min-h-screen bg-gray-50">
              <Navigation />
              <main className="container mx-auto px-4 py-6">
                <Breadcrumb />
                {children}
              </main>
            </div>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  )
}
```

---

#### 2. Middleware（導航守衛）
**檔案:** `frontend/src/middleware.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const isSetupCompleted = request.cookies.get('is_setup_completed')?.value === 'true'

  // 首次啟動檢測
  if (!isSetupCompleted && path !== '/setup') {
    return NextResponse.redirect(new URL('/setup', request.url))
  }

  // 已完成設定但訪問 /setup，重定向到 dashboard
  if (isSetupCompleted && path === '/setup') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // 根路徑重定向到 dashboard
  if (path === '/') {
    if (isSetupCompleted) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } else {
      return NextResponse.redirect(new URL('/setup', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
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

#### 3. 麵包屑元件
**檔案:** `frontend/src/components/layout/Breadcrumb.tsx`

```typescript
'use client'

import { usePathname } from 'next/navigation'
import { Breadcrumb as AntBreadcrumb } from 'antd'
import { HomeOutlined } from '@ant-design/icons'
import Link from 'next/link'

const routeNameMap: Record<string, string> = {
  dashboard: '主控台',
  setup: '系統設定',
  project: '專案',
  new: '新增專案',
  configure: '配置',
  visual: '視覺化配置',
  'prompt-model': 'Prompt 與模型',
  youtube: 'YouTube 設定',
  progress: '進度監控',
  result: '結果',
  configurations: '配置管理',
  templates: '模板管理',
  settings: '系統設定',
  batch: '批次處理',
}

export function Breadcrumb() {
  const pathname = usePathname()

  // 解析路徑為麵包屑項目
  const pathSegments = pathname.split('/').filter(Boolean)

  // 如果在首頁或設定頁，不顯示麵包屑
  if (pathname === '/' || pathname === '/setup') {
    return null
  }

  const breadcrumbItems = [
    {
      title: (
        <Link href="/dashboard">
          <HomeOutlined />
        </Link>
      ),
    },
  ]

  // 構建麵包屑路徑
  let currentPath = ''
  pathSegments.forEach((segment, index) => {
    // 跳過動態 ID
    if (segment.length === 24 || /^[0-9]+$/.test(segment)) {
      return
    }

    currentPath += `/${segment}`
    const isLast = index === pathSegments.length - 1

    breadcrumbItems.push({
      title: isLast ? (
        <span>{routeNameMap[segment] || segment}</span>
      ) : (
        <Link href={currentPath}>
          {routeNameMap[segment] || segment}
        </Link>
      ),
    })
  })

  return (
    <div className="mb-4">
      <AntBreadcrumb items={breadcrumbItems} />
    </div>
  )
}
```

---

#### 4. 導航欄元件
**檔案:** `frontend/src/components/layout/Navigation.tsx`

```typescript
'use client'

import { Layout, Menu } from 'antd'
import { usePathname, useRouter } from 'next/navigation'
import {
  DashboardOutlined,
  FolderAddOutlined,
  SettingOutlined,
  FileTextOutlined,
  AppstoreOutlined,
} from '@ant-design/icons'

const { Header } = Layout

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '主控台',
    },
    {
      key: '/project/new',
      icon: <FolderAddOutlined />,
      label: '新增專案',
    },
    {
      key: '/configurations',
      icon: <AppstoreOutlined />,
      label: '配置管理',
    },
    {
      key: '/templates',
      icon: <FileTextOutlined />,
      label: '模板管理',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '系統設定',
    },
  ]

  // 不在設定頁顯示導航欄
  if (pathname === '/setup') {
    return null
  }

  return (
    <Header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 flex items-center justify-between">
        <div className="text-xl font-bold text-primary">YTMaker</div>
        <Menu
          mode="horizontal"
          selectedKeys={[pathname]}
          items={menuItems}
          onClick={({ key }) => router.push(key)}
          className="flex-1 justify-end border-0"
        />
      </div>
    </Header>
  )
}
```

---

#### 5. 404 頁面
**檔案:** `frontend/src/app/not-found.tsx`

```typescript
import { Result, Button } from 'antd'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Result
        status="404"
        title="404"
        subTitle="抱歉，您訪問的頁面不存在"
        extra={
          <Link href="/dashboard">
            <Button type="primary">返回主控台</Button>
          </Link>
        }
      />
    </div>
  )
}
```

---

#### 6. 錯誤處理頁面
**檔案:** `frontend/src/app/error.tsx`

```typescript
'use client'

import { useEffect } from 'react'
import { Result, Button } from 'antd'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Result
        status="error"
        title="發生錯誤"
        subTitle="抱歉，應用程式遇到了一些問題"
        extra={
          <Button type="primary" onClick={() => reset()}>
            重試
          </Button>
        }
      />
    </div>
  )
}
```

---

#### 7. 佔位頁面範本
**檔案:** `frontend/src/app/dashboard/page.tsx` (其他頁面類似)

```typescript
export default function DashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">主控台</h1>
      <p className="text-gray-600">專案列表將在 Task-018 實作</p>
    </div>
  )
}
```

為每個路由建立類似的佔位頁面：
- `/setup/page.tsx`
- `/project/new/page.tsx`
- `/project/[id]/configure/visual/page.tsx`
- `/project/[id]/configure/prompt-model/page.tsx`
- `/project/[id]/configure/youtube/page.tsx`
- `/project/[id]/progress/page.tsx`
- `/project/[id]/result/page.tsx`
- `/configurations/page.tsx`
- `/templates/page.tsx`
- `/settings/page.tsx`
- `/batch/page.tsx`

---

## 開發指引

### 開發步驟

**1. 建立目錄結構**
```bash
cd frontend/src/app

# 建立所有路由目錄
mkdir -p setup
mkdir -p dashboard
mkdir -p project/new
mkdir -p project/[id]/configure/{visual,prompt-model,youtube}
mkdir -p project/[id]/progress
mkdir -p project/[id]/result
mkdir -p configurations
mkdir -p templates
mkdir -p settings
mkdir -p batch
```

**2. 建立元件目錄**
```bash
mkdir -p ../components/layout
mkdir -p ../components/shared
```

**3. 實作核心檔案**
- 實作 `layout.tsx`（全域 Layout）
- 實作 `middleware.ts`（導航守衛）
- 實作 Breadcrumb 元件
- 實作 Navigation 元件
- 實作 404 和錯誤頁面

**4. 建立所有路由佔位頁面**
- 為每個路由建立基本的 `page.tsx`
- 確保頁面可訪問且顯示正確標題

**5. 測試路由系統**
```bash
npm run dev
# 手動測試所有路由
# 測試導航守衛
# 測試麵包屑
```

**6. 執行自動化測試**
```bash
npm run test          # 單元測試
npm run test:e2e      # E2E 測試
```

---

### 注意事項

**Electron 靜態導出：**
- [ ] `next.config.js` 必須設定 `output: 'export'`
- [ ] 不能使用 Image Optimization（設定 `unoptimized: true`）
- [ ] 不能使用 Server Actions
- [ ] 動態路由需要使用 `generateStaticParams`

**導航守衛：**
- [ ] 確保首次啟動檢測正確
- [ ] Cookie 名稱統一使用 `is_setup_completed`
- [ ] 處理所有邊界情況（如直接訪問 URL）

**麵包屑：**
- [ ] 動態 ID 不顯示在麵包屑中
- [ ] 最後一個項目不可點擊
- [ ] 首頁圖標可點擊返回主控台

---

## 完成檢查清單

### 開發完成
- [ ] 所有 12 個路由目錄已建立
- [ ] 所有路由有對應的 page.tsx
- [ ] 全域 Layout 實作完成
- [ ] Middleware 實作完成
- [ ] Breadcrumb 元件實作完成
- [ ] Navigation 元件實作完成
- [ ] 404 和錯誤頁面完成

### 測試完成
- [ ] 所有路由可訪問
- [ ] 導航守衛測試通過
- [ ] 麵包屑測試通過
- [ ] E2E 導航測試通過

### 文件同步
- [ ] 路由清單與 spec 一致
- [ ] 導航守衛邏輯與 Flow-0 一致

### Git
- [ ] 程式碼已 commit
- [ ] Commit 訊息符合規範
- [ ] 已推送到 remote

---

## 時間分配建議

- **目錄結構建立：** 0.5 小時
- **全域 Layout 與 Middleware：** 1.5 小時
- **Breadcrumb 與 Navigation：** 1.5 小時
- **所有路由佔位頁面：** 0.5 小時
- **測試與除錯：** 1 小時

**總計：** 5 小時
