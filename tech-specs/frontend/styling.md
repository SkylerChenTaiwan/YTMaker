# 樣式設計

> **建立日期:** 2025-10-19
> **最後更新:** 2025-10-19
> **關聯文件:** `_index.md`, `component-architecture.md`, `overview.md`

---

## 📖 目錄

1. [CSS 架構](#css-架構)
2. [Tailwind CSS 配置](#tailwind-css-配置)
3. [Loading 狀態設計](#loading-狀態設計)
4. [錯誤提示方式](#錯誤提示方式)
5. [空狀態設計](#空狀態設計)
6. [響應式設計](#響應式設計)
7. [無障礙設計](#無障礙設計)

---

## CSS 架構

### 主要方案

**Tailwind CSS + CSS Modules**

- **Tailwind CSS:** 主要樣式方案，提供 utility-first 類別
- **CSS Modules:** 元件級樣式隔離（僅在需要時使用）

### 為什麼選擇 Tailwind CSS?

1. **快速開發:** Utility classes 加速開發
2. **一致性:** 設計系統內建
3. **響應式:** 內建響應式斷點
4. **效能:** 未使用的類別會被 PurgeCSS 移除
5. **可維護性:** 樣式與元件同在，易於維護

---

## Tailwind CSS 配置

### 主題配置

```javascript
// tailwind.config.js
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
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
        gray: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#EEEEEE',
          300: '#E0E0E0',
          400: '#BDBDBD',
          500: '#9E9E9E',
          600: '#757575',
          700: '#616161',
          800: '#424242',
          900: '#212121',
        },
      },
      fontFamily: {
        sans: ['Noto Sans TC', 'Roboto', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
        '3xl': '64px',
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        full: '9999px',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
```

### 全域樣式

```css
/* src/styles/globals.css */
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

  .btn-secondary {
    @apply bg-gray-200 text-gray-800 hover:bg-gray-300;
  }

  .card {
    @apply bg-white rounded-lg shadow p-6;
  }
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}
```

---

## Loading 狀態設計

### 1. 全頁載入

用於初始載入或重要操作。

```tsx
{isLoading && (
  <div className="flex items-center justify-center h-screen">
    <Spinner size="large" />
  </div>
)}
```

### 2. 骨架屏 (Skeleton)

用於列表、卡片等內容載入。

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

**Skeleton 元件:**

```tsx
// components/ui/Skeleton/Skeleton.tsx
export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'rectangular',
  width,
  height,
  className,
}) => {
  const variantClasses = {
    text: 'h-4 rounded',
    rectangular: 'rounded',
    circular: 'rounded-full',
  }

  return (
    <div
      className={cn(
        'animate-pulse bg-gray-200',
        variantClasses[variant],
        className
      )}
      style={{ width, height }}
    />
  )
}
```

### 3. 按鈕載入

用於表單提交或操作按鈕。

```tsx
<Button loading={isSubmitting} onClick={handleSubmit}>
  {isSubmitting ? '生成中...' : '開始生成'}
</Button>
```

### 4. 進度條

用於長時間操作（影片生成等）。

```tsx
<ProgressBar value={progress.percentage} showPercentage />
```

---

## 錯誤提示方式

### 1. Toast 通知 (一般錯誤)

用於網路錯誤、API 錯誤等。

```typescript
toast.success('影片生成完成！')
toast.error('API 金鑰無效，請檢查')
toast.warning('配額即將用盡')
toast.info('正在處理中...')
```

### 2. 內聯錯誤 (表單錯誤)

用於表單驗證錯誤。

```tsx
<div className="mb-4">
  <label className="block mb-2 font-medium">專案名稱</label>
  <Input
    value={formData.project_name}
    onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
    status={errors.project_name ? 'error' : ''}
  />
  {errors.project_name && (
    <p className="text-red-500 text-sm mt-1">{errors.project_name}</p>
  )}
</div>
```

### 3. 錯誤邊界 (Error Boundary)

用於捕獲 React 元件錯誤。

```tsx
<ErrorBoundary fallback={<ErrorFallback />}>
  <App />
</ErrorBoundary>
```

### 4. 錯誤頁面

用於完整頁面錯誤顯示。

```tsx
// components/ErrorMessage.tsx
export const ErrorMessage: React.FC<{ message: string }> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center h-64">
      <div className="text-red-500 text-6xl mb-4">⚠️</div>
      <h2 className="text-2xl font-bold mb-2">發生錯誤</h2>
      <p className="text-gray-600">{message}</p>
    </div>
  )
}
```

---

## 空狀態設計

### 1. 無專案

```tsx
<div className="flex flex-col items-center justify-center h-64">
  <FolderIcon className="text-gray-400 text-6xl mb-4" />
  <p className="text-gray-600 mb-8">還沒有任何專案</p>
  <Button type="primary" onClick={() => router.push('/project/new')}>
    開始第一個專案
  </Button>
</div>
```

### 2. 無搜尋結果

```tsx
<div className="flex flex-col items-center justify-center h-64">
  <SearchIcon className="text-gray-400 text-6xl mb-4" />
  <p className="text-gray-600 mb-4">找不到符合的結果</p>
  <p className="text-sm text-gray-500">請嘗試不同的關鍵字</p>
</div>
```

### 3. 無資料

```tsx
<div className="flex flex-col items-center justify-center h-64">
  <InboxIcon className="text-gray-400 text-6xl mb-4" />
  <p className="text-gray-600">暫無資料</p>
</div>
```

---

## 響應式設計

### 斷點定義

**Tailwind CSS 預設斷點:**

```typescript
const breakpoints = {
  sm: '640px',   // 手機（橫向）
  md: '768px',   // 平板
  lg: '1024px',  // 桌面
  xl: '1280px',  // 大桌面
  '2xl': '1536px', // 超大桌面
}
```

**專案使用:**

- `< 768px`: 手機
- `768px - 1023px`: 平板
- `≥ 1024px`: 桌面

### 響應式 Utility 範例

```tsx
// 響應式文字大小
<h1 className="text-2xl md:text-3xl lg:text-4xl">標題</h1>

// 響應式間距
<div className="p-4 md:p-6 lg:p-8">內容</div>

// 響應式佈局
<div className="flex flex-col md:flex-row gap-4">
  <div className="w-full md:w-1/2">左側</div>
  <div className="w-full md:w-1/2">右側</div>
</div>
```

### 行動版佈局

**視覺化配置頁範例:**

```tsx
<div className="flex flex-col lg:flex-row gap-4">
  {/* 左側：預覽區 */}
  <div className="w-full lg:w-3/5">
    <PreviewCanvas />
  </div>

  {/* 右側：配置面板 */}
  <div className="w-full lg:w-2/5">
    <ConfigPanel />
  </div>
</div>
```

**導航列範例:**

```tsx
// 桌面版: 水平導航
// 手機版: 漢堡選單
<nav className="hidden md:flex items-center gap-4">
  <Link href="/">主控台</Link>
  <Link href="/configurations">配置管理</Link>
  <Link href="/templates">模板管理</Link>
</nav>

<button className="md:hidden" onClick={toggleMenu}>
  <MenuIcon />
</button>
```

### 響應式表格

```tsx
// 桌面版: 完整表格
// 手機版: 卡片式列表
<div className="hidden md:block">
  <Table columns={columns} dataSource={data} />
</div>

<div className="md:hidden space-y-4">
  {data.map((item) => (
    <Card key={item.id}>
      <h3>{item.name}</h3>
      <p>{item.status}</p>
    </Card>
  ))}
</div>
```

---

## 無障礙設計

### 1. ARIA 標籤使用

**按鈕:**

```tsx
<button aria-label="刪除專案" onClick={handleDelete}>
  <DeleteIcon />
</button>
```

**表單:**

```tsx
<label htmlFor="project-name">專案名稱</label>
<input
  id="project-name"
  type="text"
  aria-required="true"
  aria-invalid={!!errors.project_name}
  aria-describedby="project-name-error"
/>
{errors.project_name && (
  <p id="project-name-error" role="alert">
    {errors.project_name}
  </p>
)}
```

**Modal:**

```tsx
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
>
  <h2 id="modal-title">確認刪除</h2>
  <p id="modal-description">確定要刪除此專案嗎？</p>
</div>
```

### 2. 鍵盤導航

**快捷鍵範例:**

```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Ctrl+S 儲存
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault()
      handleSave()
    }

    // Esc 關閉 Modal
    if (e.key === 'Escape') {
      handleClose()
    }
  }

  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [handleSave, handleClose])
```

**可聚焦元素:**

```tsx
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }}
>
  點擊
</div>
```

### 3. 焦點管理

**Modal 打開時聚焦:**

```tsx
useEffect(() => {
  if (visible) {
    modalRef.current?.focus()
  }
}, [visible])

return (
  <div ref={modalRef} tabIndex={-1}>
    <Modal />
  </div>
)
```

### 4. 顏色對比

確保文字與背景有足夠的對比度（符合 WCAG AA 標準）。

```tsx
// ✅ 好的對比度
<div className="bg-white text-gray-900">內容</div>
<div className="bg-primary text-white">按鈕</div>

// ❌ 對比度不足
<div className="bg-gray-100 text-gray-300">內容</div>
```

### 5. 螢幕閱讀器支援

**隱藏視覺元素但保留語義:**

```tsx
<span className="sr-only">載入中...</span>
```

**Tailwind 提供的 `sr-only` 類別:**

```css
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

## 樣式最佳實踐

### 1. 使用 Tailwind Utility Classes

優先使用 Tailwind 提供的 utility classes，避免自訂 CSS。

```tsx
// ✅ 好的範例
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
  內容
</div>

// ❌ 不好的範例
<div style={{ display: 'flex', alignItems: 'center', ... }}>
  內容
</div>
```

### 2. 使用 cn() 函數合併類別

```typescript
// utils/cn.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 使用
<div className={cn('p-4', isActive && 'bg-primary', className)}>
  內容
</div>
```

### 3. 抽取常用樣式

對於重複使用的樣式組合，可抽取為 `@layer components`。

```css
@layer components {
  .btn {
    @apply px-4 py-2 rounded font-medium transition-all;
  }

  .btn-primary {
    @apply btn bg-primary text-white hover:bg-primary-hover;
  }
}
```

### 4. 避免內聯樣式

除非必要（如動態值），避免使用內聯樣式。

```tsx
// ✅ 好的範例
<div className="w-64 h-64">內容</div>

// ❌ 不好的範例 (除非寬高是動態的)
<div style={{ width: 256, height: 256 }}>內容</div>
```

---

## 更新記錄

| 日期 | 版本 | 修改內容 | 修改人 |
|------|------|----------|--------|
| 2025-10-19 | 1.0 | 初始版本，從 frontend-spec.md 拆分 | Claude Code |
