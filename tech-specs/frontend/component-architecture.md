# 元件架構

> **建立日期:** 2025-10-19
> **最後更新:** 2025-10-19
> **關聯文件:** `_index.md`, `styling.md`, `pages.md`

---

## 📖 目錄

1. [元件層級結構](#元件層級結構)
2. [共用元件定義](#共用元件定義)
3. [元件複用策略](#元件複用策略)
4. [元件庫組織](#元件庫組織)

---

## 元件層級結構

```
應用程式元件
├── Layout 元件 (佈局層)
│   ├── AppLayout (主佈局)
│   │   ├── NavigationBar (導航列)
│   │   ├── Breadcrumb (麵包屑)
│   │   └── Main Content (主要內容區)
│   └── SetupLayout (設定精靈佈局)
│       ├── Logo
│       ├── StepIndicator (步驟指示器)
│       └── Content Area
│
├── Page 元件 (頁面層)
│   ├── DashboardPage
│   ├── NewProjectPage
│   ├── VisualConfigPage
│   ├── PromptModelPage
│   ├── YouTubeSettingsPage
│   ├── ProgressPage
│   ├── ResultPage
│   ├── ConfigurationManagementPage
│   ├── TemplateManagementPage
│   ├── SystemSettingsPage
│   └── BatchProcessingPage
│
├── Feature 元件 (功能層)
│   ├── ProjectList (專案列表)
│   ├── StatsCards (統計卡片)
│   ├── VisualEditor (視覺化編輯器)
│   ├── PromptEditor (Prompt 編輯器)
│   ├── ProgressMonitor (進度監控)
│   ├── VideoPlayer (影片播放器)
│   └── BatchTaskList (批次任務列表)
│
├── UI 元件 (共用 UI 層)
│   ├── Button (按鈕)
│   ├── Input (輸入框)
│   ├── Select (下拉選單)
│   ├── Modal (對話框)
│   ├── Toast (通知)
│   ├── Table (表格)
│   ├── Card (卡片)
│   ├── Spinner (載入動畫)
│   ├── Skeleton (骨架屏)
│   ├── ProgressBar (進度條)
│   ├── Slider (滑桿)
│   ├── ColorPicker (顏色選擇器)
│   ├── FileUpload (檔案上傳)
│   └── DateTimePicker (日期時間選擇器)
│
└── Domain 元件 (領域層)
    ├── SubtitleConfig (字幕配置)
    ├── LogoConfig (Logo 配置)
    ├── OverlayConfig (疊加元素配置)
    ├── PromptTemplateList (Prompt 範本列表)
    ├── ModelSelector (模型選擇器)
    └── YouTubeAccountCard (YouTube 帳號卡片)
```

---

## 共用元件定義

### Button (按鈕)

**Props:**

```typescript
// components/ui/Button/types.ts
export interface ButtonProps {
  /** 按鈕類型 */
  type?: 'primary' | 'secondary' | 'danger' | 'text'
  /** 按鈕尺寸 */
  size?: 'small' | 'medium' | 'large'
  /** 是否禁用 */
  disabled?: boolean
  /** 是否載入中 */
  loading?: boolean
  /** 圖示 */
  icon?: ReactNode
  /** 點擊事件 */
  onClick?: () => void
  /** 子元素 */
  children: ReactNode
  /** 自訂 className */
  className?: string
}
```

**實作:**

```tsx
// components/ui/Button/Button.tsx
import { cn } from '@/utils/cn'
import { Spinner } from '../Spinner'

export const Button: React.FC<ButtonProps> = ({
  type = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  onClick,
  children,
  className,
}) => {
  const baseClasses = 'rounded font-medium transition-all'

  const typeClasses = {
    primary: 'bg-primary text-white hover:bg-primary-hover',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    text: 'bg-transparent text-primary hover:bg-primary/10',
  }

  const sizeClasses = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2 text-base',
    large: 'px-6 py-3 text-lg',
  }

  return (
    <button
      className={cn(
        baseClasses,
        typeClasses[type],
        sizeClasses[size],
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && <Spinner className="mr-2" size="small" />}
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  )
}
```

---

### Modal (對話框)

**Props:**

```typescript
// components/ui/Modal/types.ts
export interface ModalProps {
  /** 是否顯示 */
  visible: boolean
  /** 標題 */
  title: string
  /** 關閉事件 */
  onClose: () => void
  /** 確定事件 */
  onOk?: () => void
  /** 取消事件 */
  onCancel?: () => void
  /** 確定按鈕文字 */
  okText?: string
  /** 取消按鈕文字 */
  cancelText?: string
  /** 是否可關閉 */
  closable?: boolean
  /** 點擊遮罩是否關閉 */
  maskClosable?: boolean
  /** 子元素 */
  children: ReactNode
}
```

**使用範例:**

```tsx
<Modal
  visible={showDeleteModal}
  title="確認刪除"
  onOk={handleDelete}
  onCancel={() => setShowDeleteModal(false)}
  okText="確定"
  cancelText="取消"
>
  <p>確定要刪除此專案嗎？此操作無法復原。</p>
</Modal>
```

---

### Toast (通知)

**Toast Service:**

```typescript
// services/toast.ts
type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastOptions {
  message: string
  duration?: number
  onClose?: () => void
}

interface ToastItem extends ToastOptions {
  id: string
  type: ToastType
}

class ToastService {
  private toasts: Map<string, ToastItem> = new Map()
  private listeners: Set<(toasts: ToastItem[]) => void> = new Set()

  show(type: ToastType, options: ToastOptions) {
    const id = Math.random().toString(36).substr(2, 9)
    const toast = { ...options, type, id }

    this.toasts.set(id, toast)
    this.notify()

    setTimeout(() => {
      this.remove(id)
    }, options.duration || 3000)

    return id
  }

  success(message: string, duration?: number) {
    return this.show('success', { message, duration })
  }

  error(message: string, duration?: number) {
    return this.show('error', { message, duration })
  }

  warning(message: string, duration?: number) {
    return this.show('warning', { message, duration })
  }

  info(message: string, duration?: number) {
    return this.show('info', { message, duration })
  }

  remove(id: string) {
    this.toasts.delete(id)
    this.notify()
  }

  subscribe(listener: (toasts: ToastItem[]) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    const toasts = Array.from(this.toasts.values())
    this.listeners.forEach((listener) => listener(toasts))
  }
}

export const toast = new ToastService()
```

**使用:**

```typescript
toast.success('影片生成完成！')
toast.error('API 金鑰無效，請檢查')
toast.warning('配額即將用盡')
toast.info('正在處理中...')
```

---

### Table (表格)

**Props:**

```typescript
// components/ui/Table/types.ts
export interface TableColumn<T> {
  key: string
  title: string
  dataIndex: keyof T
  render?: (value: any, record: T) => ReactNode
  sortable?: boolean
  width?: number
}

export interface TableProps<T> {
  columns: TableColumn<T>[]
  dataSource: T[]
  loading?: boolean
  pagination?: {
    current: number
    pageSize: number
    total: number
    onChange: (page: number, pageSize: number) => void
  }
  onRow?: (record: T) => {
    onClick?: () => void
  }
}
```

**使用範例:**

```tsx
const columns: TableColumn<Project>[] = [
  {
    key: 'project_name',
    title: '專案名稱',
    dataIndex: 'project_name',
  },
  {
    key: 'status',
    title: '狀態',
    dataIndex: 'status',
    render: (status) => <StatusBadge status={status} />,
  },
  {
    key: 'created_at',
    title: '創建時間',
    dataIndex: 'created_at',
    render: (date) => formatDate(date),
  },
]

<Table
  columns={columns}
  dataSource={projects}
  loading={isLoading}
  pagination={{
    current: page,
    pageSize: 20,
    total: totalProjects,
    onChange: setPage,
  }}
/>
```

---

### Input (輸入框)

**Props:**

```typescript
// components/ui/Input/types.ts
export interface InputProps {
  /** 輸入框類型 */
  type?: 'text' | 'password' | 'email' | 'number'
  /** 值 */
  value?: string
  /** 預設值 */
  defaultValue?: string
  /** Placeholder */
  placeholder?: string
  /** 是否禁用 */
  disabled?: boolean
  /** 狀態 */
  status?: '' | 'error' | 'warning'
  /** 變更事件 */
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  /** 自訂 className */
  className?: string
}
```

---

### Spinner (載入動畫)

**Props:**

```typescript
// components/ui/Spinner/types.ts
export interface SpinnerProps {
  /** 尺寸 */
  size?: 'small' | 'medium' | 'large'
  /** 自訂 className */
  className?: string
}
```

**實作:**

```tsx
// components/ui/Spinner/Spinner.tsx
export const Spinner: React.FC<SpinnerProps> = ({
  size = 'medium',
  className
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
  }

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-gray-300 border-t-primary',
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="載入中"
    >
      <span className="sr-only">載入中...</span>
    </div>
  )
}
```

---

### Skeleton (骨架屏)

**Props:**

```typescript
// components/ui/Skeleton/types.ts
export interface SkeletonProps {
  /** 變體 */
  variant?: 'text' | 'rectangular' | 'circular'
  /** 寬度 */
  width?: number | string
  /** 高度 */
  height?: number | string
  /** 自訂 className */
  className?: string
}
```

**使用範例:**

```tsx
{isLoading ? (
  <div className="space-y-4">
    <Skeleton variant="rectangular" height={100} />
    <Skeleton variant="rectangular" height={100} />
    <Skeleton variant="rectangular" height={100} />
  </div>
) : (
  <ProjectList projects={data} />
)}
```

---

### Card (卡片)

**Props:**

```typescript
// components/ui/Card/types.ts
export interface CardProps {
  /** 標題 */
  title?: string
  /** 額外內容 (右上角) */
  extra?: ReactNode
  /** 子元素 */
  children: ReactNode
  /** 是否可點擊 */
  hoverable?: boolean
  /** 點擊事件 */
  onClick?: () => void
  /** 自訂 className */
  className?: string
}
```

---

### ProgressBar (進度條)

**Props:**

```typescript
// components/ui/ProgressBar/types.ts
export interface ProgressBarProps {
  /** 進度值 (0-100) */
  value: number
  /** 是否顯示百分比 */
  showPercentage?: boolean
  /** 狀態 */
  status?: 'normal' | 'success' | 'error'
  /** 自訂 className */
  className?: string
}
```

**實作:**

```tsx
// components/ui/ProgressBar/ProgressBar.tsx
export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  showPercentage = true,
  status = 'normal',
  className,
}) => {
  const statusColors = {
    normal: 'bg-primary',
    success: 'bg-green-500',
    error: 'bg-red-500',
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="flex justify-between mb-1">
        {showPercentage && (
          <span className="text-sm font-medium">{value}%</span>
        )}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={cn('h-2 rounded-full transition-all', statusColors[status])}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}
```

---

### FileUpload (檔案上傳)

**Props:**

```typescript
// components/ui/FileUpload/types.ts
export interface FileUploadProps {
  /** 接受的檔案類型 */
  accept?: string
  /** 是否多選 */
  multiple?: boolean
  /** 最大檔案大小 (bytes) */
  maxSize?: number
  /** 檔案選擇事件 */
  onFileSelect: (files: File[]) => void
  /** 自訂 className */
  className?: string
}
```

---

## 元件複用策略

### 原則

1. **單一職責:** 每個元件只負責一個功能
2. **組合優於繼承:** 使用組合模式建立複雜元件
3. **Props 驅動:** 元件行為由 Props 控制
4. **避免過度抽象:** 不要為了複用而過度抽象

### 複用層級

- **UI 元件:** 100% 複用 (Button、Input、Modal 等)
- **Feature 元件:** 50-70% 複用 (ProjectList、VisualEditor 等)
- **Page 元件:** 不複用 (每個頁面獨立)

### 範例: 組合模式

```tsx
// ❌ 不好: 過度抽象
<SuperComplexCard
  showTitle
  showImage
  showDescription
  showButton
  buttonType="primary"
  imagePosition="left"
  // ... 100 個 props
/>

// ✅ 好: 組合模式
<Card>
  <CardImage src="..." />
  <CardContent>
    <CardTitle>標題</CardTitle>
    <CardDescription>描述</CardDescription>
  </CardContent>
  <CardActions>
    <Button type="primary">操作</Button>
  </CardActions>
</Card>
```

---

## 元件庫組織

### 目錄結構

```
src/components/
├── ui/                 # 基礎 UI 元件
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.test.tsx
│   │   ├── types.ts
│   │   └── index.ts
│   ├── Modal/
│   ├── Input/
│   └── ...
│
├── layout/            # 佈局元件
│   ├── AppLayout/
│   ├── NavigationBar/
│   └── Breadcrumb/
│
├── feature/          # 功能元件
│   ├── ProjectList/
│   ├── VisualEditor/
│   └── ProgressMonitor/
│
└── domain/           # 領域元件
    ├── SubtitleConfig/
    ├── LogoConfig/
    └── PromptEditor/
```

### 元件檔案結構

每個元件遵循以下結構:

```
ComponentName/
├── ComponentName.tsx       # 主要元件
├── ComponentName.test.tsx  # 單元測試
├── types.ts               # TypeScript 型別定義
├── styles.module.css      # CSS Modules (可選)
└── index.ts               # 匯出
```

### 匯出策略

```typescript
// components/ui/index.ts
export { Button } from './Button'
export { Modal } from './Modal'
export { Input } from './Input'
export { Table } from './Table'
export { Spinner } from './Spinner'
export { Skeleton } from './Skeleton'
export { Card } from './Card'
export { ProgressBar } from './ProgressBar'
export { FileUpload } from './FileUpload'
// ...

// 使用
import { Button, Modal, Input } from '@/components/ui'
```

---

## 元件設計原則

### 1. Props 型別定義

所有 Props 必須使用 TypeScript 定義:

```typescript
// ✅ 好的範例
interface ButtonProps {
  type?: 'primary' | 'secondary'
  size?: 'small' | 'medium' | 'large'
  onClick?: () => void
  children: ReactNode
}

// ❌ 不好的範例
function Button(props: any) { ... }
```

### 2. 預設值

使用預設參數提供預設值:

```typescript
const Button: React.FC<ButtonProps> = ({
  type = 'primary',
  size = 'medium',
  disabled = false,
  ...
}) => { ... }
```

### 3. 可擴展性

使用 `className` 允許外部自訂樣式:

```typescript
<Button className="mt-4 w-full" />
```

### 4. 無障礙設計

添加適當的 ARIA 標籤:

```tsx
<button
  aria-label="刪除專案"
  aria-disabled={disabled}
  role="button"
>
  刪除
</button>
```

### 5. 效能優化

使用 `React.memo` 避免不必要的重新渲染:

```tsx
export const Button = React.memo<ButtonProps>(({ ... }) => {
  // ...
})
```

---

## 更新記錄

| 日期 | 版本 | 修改內容 | 修改人 |
|------|------|----------|--------|
| 2025-10-19 | 1.0 | 初始版本，從 frontend-spec.md 拆分 | Claude Code |
