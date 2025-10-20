# 前端架構總覽

> **建立日期:** 2025-10-19
> **最後更新:** 2025-10-19
> **關聯文件:** `_index.md`, `../framework.md`, `../../product-design/overview.md`

---

## 📖 目錄

1. [技術棧](#技術棧)
2. [專案目錄結構](#專案目錄結構)
3. [應用程式啟動流程](#應用程式啟動流程)
4. [核心架構原則](#核心架構原則)
5. [效能優化策略](#效能優化策略)
6. [無障礙設計原則](#無障礙設計原則)
7. [國際化支援](#國際化支援)
8. [安全措施](#安全措施)

---

## 技術棧

### 前端核心框架

| 技術 | 版本 | 用途 |
|------|------|------|
| **Next.js** | 14+ | React 全端框架，採用 App Router |
| **React** | 18+ | UI 框架 |
| **TypeScript** | 5.x | 類型系統 |
| **Ant Design** | 5.x | UI 元件庫 |
| **Tailwind CSS** | 3.x | CSS 框架 |

### 狀態與資料管理

| 技術 | 用途 |
|------|------|
| **Zustand** | 全域狀態管理 |
| **TanStack Query** | 伺服器狀態管理、資料快取 |
| **Axios** | HTTP 客戶端 |
| **Socket.IO Client** | WebSocket 即時通訊 |
| **Zod** | 表單驗證 |

### 視覺化與互動

| 技術 | 用途 |
|------|------|
| **react-konva** | Canvas 視覺化編輯 (字幕、Logo 配置) |
| **react-player** | 影片播放器 |
| **DOMPurify** | XSS 防護 |

### 開發工具

| 技術 | 用途 |
|------|------|
| **Jest** | 單元測試框架 |
| **React Testing Library** | React 元件測試 |
| **Playwright** | E2E 測試 |
| **ESLint** | 程式碼檢查 |
| **Prettier** | 程式碼格式化 |

### 桌面打包

| 技術 | 用途 |
|------|------|
| **Electron** | 跨平台桌面應用打包 |

---

## 專案目錄結構

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx         # 根佈局
│   │   ├── page.tsx           # 主控台 (/)
│   │   ├── setup/             # 設定精靈 (/setup)
│   │   ├── project/           # 專案相關頁面
│   │   │   ├── new/           # 新增專案 (/project/new)
│   │   │   └── [id]/          # 專案詳細頁
│   │   │       ├── configure/
│   │   │       │   ├── visual/        # 視覺化配置
│   │   │       │   ├── prompt-model/  # Prompt & Model
│   │   │       │   └── youtube/       # YouTube 設定
│   │   │       ├── progress/  # 進度監控
│   │   │       └── result/    # 結果頁
│   │   ├── configurations/    # 配置管理 (/configurations)
│   │   ├── templates/         # 模板管理 (/templates)
│   │   ├── settings/          # 系統設定 (/settings)
│   │   ├── batch/             # 批次處理 (/batch)
│   │   │   └── [id]/          # 批次任務詳細
│   │   └── not-found.tsx      # 404 頁面
│   │
│   ├── components/
│   │   ├── ui/                # 基礎 UI 元件
│   │   │   ├── Button/
│   │   │   ├── Modal/
│   │   │   ├── Input/
│   │   │   ├── Table/
│   │   │   ├── Spinner/
│   │   │   ├── Skeleton/
│   │   │   └── ...
│   │   ├── layout/            # 佈局元件
│   │   │   ├── AppLayout/
│   │   │   ├── NavigationBar/
│   │   │   └── Breadcrumb/
│   │   ├── feature/           # 功能元件
│   │   │   ├── ProjectList/
│   │   │   ├── VisualEditor/
│   │   │   ├── ProgressMonitor/
│   │   │   └── ...
│   │   └── domain/            # 領域元件
│   │       ├── SubtitleConfig/
│   │       ├── LogoConfig/
│   │       ├── PromptEditor/
│   │       └── ...
│   │
│   ├── hooks/                 # 自訂 Hooks
│   │   ├── useDebounce.ts
│   │   ├── useUnsavedWarning.ts
│   │   └── ...
│   │
│   ├── store/                 # Zustand 狀態管理
│   │   ├── useStore.ts       # 全域 Store
│   │   └── types.ts          # Store 型別定義
│   │
│   ├── services/              # API 服務層
│   │   ├── api.ts            # Axios 客戶端配置
│   │   ├── projectService.ts
│   │   ├── configService.ts
│   │   ├── websocket.ts      # WebSocket 服務
│   │   └── toast.ts          # Toast 通知服務
│   │
│   ├── types/                 # TypeScript 型別定義
│   │   ├── models.ts         # 資料模型
│   │   ├── api.ts            # API 型別
│   │   └── ...
│   │
│   ├── utils/                 # 工具函數
│   │   ├── validators.ts     # 驗證函數
│   │   ├── formatters.ts     # 格式化函數
│   │   └── ...
│   │
│   └── styles/                # 全域樣式
│       ├── globals.css       # 全域 CSS
│       └── tailwind.css      # Tailwind 配置
│
├── public/
│   ├── locales/               # 國際化翻譯檔 (未來擴展)
│   └── assets/                # 靜態資源
│
├── tests/
│   ├── unit/                  # 單元測試
│   ├── integration/           # 整合測試
│   └── e2e/                   # E2E 測試
│
├── electron/                  # Electron 打包配置
│   ├── main.js               # Electron 主程序
│   └── preload.js            # Preload 腳本
│
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── next.config.js
├── jest.config.js
└── playwright.config.ts
```

---

## 應用程式啟動流程

### 1. 應用程式入口

```typescript
// src/app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'YTMaker',
  description: 'AI 驅動的影片生成工具',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
```

### 2. Providers 配置

```typescript
// src/app/providers.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useState } from 'react'
import { ConfigProvider } from 'antd'
import zhTW from 'antd/locale/zh_TW'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        cacheTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider locale={zhTW}>
        {children}
      </ConfigProvider>
    </QueryClientProvider>
  )
}
```

### 3. 首次啟動檢查

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const setupCompleted = checkSetupCompleted()

  // 首次啟動檢查
  if (!setupCompleted && !request.nextUrl.pathname.startsWith('/setup')) {
    return NextResponse.redirect(new URL('/setup', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}

function checkSetupCompleted(): boolean {
  // 檢查 localStorage 或 API
  if (typeof window !== 'undefined') {
    return localStorage.getItem('setup_completed') === 'true'
  }
  return false
}
```

---

## 核心架構原則

### 1. 單一職責原則 (SRP)

**每個元件、函數、模組只負責一個功能。**

✅ **好的範例:**

```typescript
// 只負責顯示專案卡片
const ProjectCard = ({ project }: { project: Project }) => {
  return (
    <Card>
      <h3>{project.project_name}</h3>
      <p>{project.status}</p>
    </Card>
  )
}

// 只負責專案列表邏輯
const ProjectList = ({ projects }: { projects: Project[] }) => {
  return (
    <div>
      {projects.map(project => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  )
}
```

❌ **不好的範例:**

```typescript
// 混合了資料獲取、狀態管理、UI 渲染
const ProjectList = () => {
  const [projects, setProjects] = useState([])

  useEffect(() => {
    fetch('/api/projects').then(res => res.json()).then(setProjects)
  }, [])

  return (
    <div>
      {projects.map(project => (
        <div>
          <h3>{project.project_name}</h3>
          <button onClick={() => deleteProject(project.id)}>刪除</button>
        </div>
      ))}
    </div>
  )
}
```

### 2. 組合優於繼承

**使用組合模式建立複雜元件，而非繼承。**

✅ **好的範例:**

```typescript
const Card = ({ children }: { children: ReactNode }) => {
  return <div className="card">{children}</div>
}

const ProjectCard = ({ project }: { project: Project }) => {
  return (
    <Card>
      <ProjectHeader project={project} />
      <ProjectBody project={project} />
      <ProjectFooter project={project} />
    </Card>
  )
}
```

### 3. Props 驅動

**元件行為由 Props 控制，避免內部隱藏邏輯。**

✅ **好的範例:**

```typescript
interface ButtonProps {
  type?: 'primary' | 'secondary' | 'danger'
  loading?: boolean
  disabled?: boolean
  onClick?: () => void
  children: ReactNode
}

const Button: React.FC<ButtonProps> = ({ type, loading, disabled, onClick, children }) => {
  // Props 完全控制按鈕行為
}
```

### 4. 關注點分離

**將邏輯、UI、樣式分離。**

```
元件 (UI)
  ↓ 使用
Hooks (邏輯)
  ↓ 使用
Services (API)
  ↓ 使用
Store (狀態)
```

---

## 效能優化策略

### 1. 程式碼分割

**路由級分割 (自動):**

Next.js App Router 自動分割每個路由，無需手動配置。

**元件級分割:**

```typescript
import dynamic from 'next/dynamic'

// 動態載入大型元件
const VisualEditor = dynamic(() => import('@/components/feature/VisualEditor'), {
  loading: () => <Spinner />,
  ssr: false, // 禁用 SSR (視需求)
})
```

### 2. 渲染優化

**React.memo:**

```typescript
const ProjectCard = React.memo(({ project }: { project: Project }) => {
  return (
    <Card>
      <h3>{project.project_name}</h3>
      <p>{project.status}</p>
    </Card>
  )
})
```

**useMemo:**

```typescript
const sortedProjects = useMemo(() => {
  return projects.sort((a, b) =>
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  )
}, [projects])
```

**useCallback:**

```typescript
const handleDelete = useCallback((id: string) => {
  deleteProject(id)
}, [])
```

### 3. 圖片優化

使用 Next.js Image 元件:

```typescript
import Image from 'next/image'

<Image
  src="/logo.png"
  alt="Logo"
  width={200}
  height={100}
  priority // 優先載入
/>
```

### 4. 資料快取

使用 TanStack Query 快取策略:

```typescript
const { data } = useQuery({
  queryKey: ['projects'],
  queryFn: () => api.getProjects(),
  staleTime: 5 * 60 * 1000, // 5 分鐘
  cacheTime: 10 * 60 * 1000, // 10 分鐘
})
```

---

## 無障礙設計原則

### 1. 語義化 HTML

使用正確的 HTML 標籤:

```tsx
// ✅ 好的範例
<nav>
  <ul>
    <li><a href="/">主控台</a></li>
  </ul>
</nav>

// ❌ 不好的範例
<div className="nav">
  <div className="nav-item">主控台</div>
</div>
```

### 2. ARIA 標籤

為互動元素添加 ARIA 標籤:

```tsx
<button aria-label="刪除專案" onClick={handleDelete}>
  <DeleteIcon />
</button>

<input
  aria-required="true"
  aria-invalid={!!errors.project_name}
  aria-describedby="project-name-error"
/>
```

### 3. 鍵盤導航

確保所有互動元素可透過鍵盤操作:

```tsx
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
>
  點擊
</div>
```

---

## 國際化支援

### Phase 1: 繁體中文

目前僅支援繁體中文 (zh-TW)。

### 未來擴展

計劃支援:
- 簡體中文 (zh-CN)
- 英文 (en-US)

### 日期時間格式化

```typescript
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'

const formattedDate = format(new Date(), 'yyyy年MM月dd日', { locale: zhTW })
// 2024年01月15日
```

---

## 安全措施

### 1. XSS 防護

**React 自動轉義:**

React 預設會轉義所有文字內容，防止 XSS 攻擊。

**危險的 HTML (需避免):**

```tsx
// ❌ 危險
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ 安全
import DOMPurify from 'dompurify'
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />
```

### 2. Content Security Policy

```typescript
// app/layout.tsx
export const metadata = {
  metadataBase: new URL('http://localhost:3000'),
  other: {
    'Content-Security-Policy': `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval';
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      font-src 'self' https://fonts.gstatic.com;
      img-src 'self' data: blob:;
    `.replace(/\s+/g, ' ').trim(),
  },
}
```

### 3. 輸入驗證

使用 Zod 進行輸入驗證:

```typescript
import { z } from 'zod'

const projectSchema = z.object({
  project_name: z.string().min(1).max(100),
  content_text: z.string().min(500).max(10000),
})
```

---

## 更新記錄

| 日期 | 版本 | 修改內容 | 修改人 |
|------|------|----------|--------|
| 2025-10-19 | 1.0 | 初始版本，從 frontend-spec.md 拆分 | Claude Code |
