# 路由設計

> **建立日期:** 2025-10-19
> **最後更新:** 2025-10-19
> **關聯文件:** `_index.md`, `pages.md`, `overview.md`

---

## 📖 目錄

1. [路由系統](#路由系統)
2. [主要路由表](#主要路由表)
3. [路由參數驗證](#路由參數驗證)
4. [導航守衛 (Middleware)](#導航守衛-middleware)
5. [404 處理](#404-處理)
6. [麵包屑設計](#麵包屑設計)

---

## 路由系統

**使用:** Next.js App Router

**特性:**
- 檔案系統路由 (File-based Routing)
- 伺服器元件優先 (Server Components First)
- 支援巢狀佈局 (Nested Layouts)
- 自動程式碼分割 (Automatic Code Splitting)

---

## 主要路由表

### 完整路由列表

| 路由 | 頁面 | 說明 | 權限 | 檔案路徑 |
|------|------|------|------|---------|
| `/` | 主控台 | 應用程式首頁，顯示專案列表和統計 | 無 | `app/page.tsx` |
| `/setup` | 首次啟動設定精靈 | 首次啟動時顯示，設定 API 和 YouTube | 無 | `app/setup/page.tsx` |
| `/project/new` | 新增專案頁 | 創建新專案 (步驟1: 上傳文字內容) | 無 | `app/project/new/page.tsx` |
| `/project/:id/configure/visual` | 視覺化配置頁 | 配置字幕、Logo、疊加元素 (步驟2) | 無 | `app/project/[id]/configure/visual/page.tsx` |
| `/project/:id/configure/prompt-model` | Prompt 與模型設定頁 | 選擇 Prompt 範本和模型 (步驟3) | 無 | `app/project/[id]/configure/prompt-model/page.tsx` |
| `/project/:id/configure/youtube` | YouTube 設定頁 | YouTube 資訊和發布選項 (步驟4) | 無 | `app/project/[id]/configure/youtube/page.tsx` |
| `/project/:id/progress` | 進度監控頁 | 監控影片生成進度，即時日誌 | 無 | `app/project/[id]/progress/page.tsx` |
| `/project/:id/result` | 結果頁 | 查看生成結果，預覽影片 | 無 | `app/project/[id]/result/page.tsx` |
| `/configurations` | 配置管理頁 | 管理視覺配置 (CRUD) | 無 | `app/configurations/page.tsx` |
| `/templates` | 模板管理頁 | 管理視覺模板和 Prompt 範本 | 無 | `app/templates/page.tsx` |
| `/settings` | 系統設定頁 | API Keys、YouTube 授權、偏好設定 | 無 | `app/settings/page.tsx` |
| `/batch` | 批次處理頁 | 批次生成影片，管理批次任務 | 無 | `app/batch/page.tsx` |
| `/batch/:id` | 批次任務詳細頁 | 查看批次任務進度 | 無 | `app/batch/[id]/page.tsx` |
| `/404` | 404 頁面 | 找不到頁面 | 無 | `app/not-found.tsx` |

### 路由統計

- **總頁面數:** 12 個
- **總路由數:** 14 個 (包含動態路由)
- **動態路由數:** 6 個 (`:id` 參數)

---

## 路由參數驗證

### UUID 驗證

所有 `:id` 參數必須是有效的 UUID v4 格式。

```typescript
// lib/validators.ts

/**
 * 驗證專案 ID (UUID v4)
 * @param id - 專案 ID
 * @returns 是否有效
 */
export const validateProjectId = (id: string): boolean => {
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
  return uuidV4Regex.test(id)
}

/**
 * 驗證批次任務 ID (UUID v4)
 * @param id - 批次任務 ID
 * @returns 是否有效
 */
export const validateBatchId = (id: string): boolean => {
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
  return uuidV4Regex.test(id)
}
```

### 頁面級驗證

在動態路由頁面中驗證參數:

```typescript
// app/project/[id]/progress/page.tsx
import { notFound } from 'next/navigation'
import { validateProjectId } from '@/lib/validators'

export default function ProgressPage({ params }: { params: { id: string } }) {
  // 驗證 ID 格式
  if (!validateProjectId(params.id)) {
    notFound()
  }

  // 繼續頁面邏輯
  return <div>...</div>
}
```

---

## 導航守衛 (Middleware)

### 首次啟動檢查

確保用戶完成首次設定後才能訪問其他頁面。

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const setupCompleted = checkSetupCompleted(request)

  // 首次啟動檢查
  if (!setupCompleted && !request.nextUrl.pathname.startsWith('/setup')) {
    return NextResponse.redirect(new URL('/setup', request.url))
  }

  // 如果已完成設定，不允許再訪問 /setup
  if (setupCompleted && request.nextUrl.pathname.startsWith('/setup')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}

/**
 * 檢查是否完成首次設定
 */
function checkSetupCompleted(request: NextRequest): boolean {
  // 檢查 Cookie 或 API
  const setupCookie = request.cookies.get('setup_completed')
  return setupCookie?.value === 'true'
}
```

### 專案存在性檢查 (可選)

```typescript
// middleware.ts (擴展版)
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const setupCompleted = checkSetupCompleted(request)

  // 首次啟動檢查
  if (!setupCompleted && !request.nextUrl.pathname.startsWith('/setup')) {
    return NextResponse.redirect(new URL('/setup', request.url))
  }

  // 專案路由檢查
  const projectIdMatch = request.nextUrl.pathname.match(/^\/project\/([^/]+)/)
  if (projectIdMatch) {
    const projectId = projectIdMatch[1]

    // 驗證 UUID 格式
    if (!validateProjectId(projectId)) {
      return NextResponse.redirect(new URL('/404', request.url))
    }

    // 可選: 檢查專案是否存在 (需要 API 呼叫)
    // const exists = await checkProjectExists(projectId)
    // if (!exists) {
    //   return NextResponse.redirect(new URL('/404', request.url))
    // }
  }

  return NextResponse.next()
}
```

---

## 404 處理

### 404 頁面

```tsx
// app/not-found.tsx
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
          找不到頁面
        </h2>
        <p className="text-gray-600 mb-8">
          您訪問的頁面不存在，可能已被移除或 URL 不正確。
        </p>
        <Link href="/">
          <Button type="primary" size="large">
            返回主控台
          </Button>
        </Link>
      </div>
    </div>
  )
}
```

### 觸發 404

在頁面中手動觸發 404:

```typescript
import { notFound } from 'next/navigation'

export default function Page({ params }: { params: { id: string } }) {
  if (!validateProjectId(params.id)) {
    notFound() // 顯示 404 頁面
  }

  return <div>...</div>
}
```

---

## 麵包屑設計

### 麵包屑元件

```typescript
// components/layout/Breadcrumb.tsx
import Link from 'next/link'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  return (
    <nav className="flex mb-4" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <span className="mx-2 text-gray-400" aria-hidden="true">
                /
              </span>
            )}
            {item.href ? (
              <Link
                href={item.href}
                className="text-blue-600 hover:underline transition-colors"
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

### 各頁面麵包屑配置

| 頁面 | 麵包屑 |
|------|--------|
| 主控台 | (無麵包屑) |
| 新增專案 | 主控台 / 新增專案 |
| 視覺化配置 | 主控台 / 新增專案 / 視覺化配置 |
| Prompt 設定 | 主控台 / 新增專案 / Prompt 與模型 |
| YouTube 設定 | 主控台 / 新增專案 / YouTube 設定 |
| 進度監控 | 主控台 / 專案名稱 / 進度監控 |
| 結果頁 | 主控台 / 專案名稱 / 結果 |
| 配置管理 | 主控台 / 配置管理 |
| 模板管理 | 主控台 / 模板管理 |
| 系統設定 | 主控台 / 系統設定 |
| 批次處理 | 主控台 / 批次處理 |
| 批次詳細 | 主控台 / 批次處理 / 批次任務名稱 |

### 使用範例

```tsx
// app/project/new/page.tsx
import { Breadcrumb } from '@/components/layout/Breadcrumb'

export default function NewProjectPage() {
  return (
    <div>
      <Breadcrumb
        items={[
          { label: '主控台', href: '/' },
          { label: '新增專案' },
        ]}
      />
      {/* 頁面內容 */}
    </div>
  )
}
```

```tsx
// app/project/[id]/configure/visual/page.tsx
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { useProject } from '@/hooks/useProject'

export default function VisualConfigPage({ params }: { params: { id: string } }) {
  const { project } = useProject(params.id)

  return (
    <div>
      <Breadcrumb
        items={[
          { label: '主控台', href: '/' },
          { label: '新增專案', href: '/project/new' },
          { label: '視覺化配置' },
        ]}
      />
      {/* 頁面內容 */}
    </div>
  )
}
```

---

## 導航流程

### 專案創建流程

```
主控台 (/)
  ↓ 點擊「新增專案」
新增專案 (/project/new)
  ↓ 填寫內容並提交
視覺化配置 (/project/:id/configure/visual)
  ↓ 設定視覺化並下一步
Prompt 設定 (/project/:id/configure/prompt-model)
  ↓ 選擇 Prompt 並下一步
YouTube 設定 (/project/:id/configure/youtube)
  ↓ 填寫 YouTube 資訊並提交
進度監控 (/project/:id/progress)
  ↓ 生成完成
結果頁 (/project/:id/result)
```

### 主要導航

```
主控台 (/)
├── 新增專案 (/project/new)
├── 配置管理 (/configurations)
├── 模板管理 (/templates)
├── 系統設定 (/settings)
└── 批次處理 (/batch)
```

---

## 路由設計原則

### 1. RESTful 風格

- 使用名詞而非動詞: `/project/new` 而非 `/createProject`
- 使用複數形式: `/projects` 而非 `/project`
- 使用巢狀結構表示層級關係: `/project/:id/configure/visual`

### 2. 語義化路徑

路徑應該清楚表達頁面功能:

✅ **好的範例:**
- `/project/:id/configure/visual` (清楚表達「專案 → 配置 → 視覺化」)
- `/batch/:id` (清楚表達「批次任務詳細」)

❌ **不好的範例:**
- `/p/:id/c/v` (過度簡化，不清楚)
- `/projectVisualConfig/:id` (駝峰式，不符合 URL 慣例)

### 3. 一致性

所有路由遵循相同的命名規範:
- 使用小寫字母
- 使用連字號 `-` 分隔單字: `/prompt-model` 而非 `/promptModel`
- 動態參數使用 `:id` 或 `:slug`

---

## 更新記錄

| 日期 | 版本 | 修改內容 | 修改人 |
|------|------|----------|--------|
| 2025-10-19 | 1.0 | 初始版本,從 frontend-spec.md 拆分 | Claude Code |
