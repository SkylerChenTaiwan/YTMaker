# 元件架構

> **參考原始文件:** frontend-spec.md 第 167-393 行
> **關聯文件:** [overview.md](./overview.md), [styling.md](./styling.md)

本文件定義了元件層級結構、共用元件定義、元件複用策略與元件庫組織。

完整內容請參考原始 `frontend-spec.md` 文件的以下章節：
- 2.1 元件層級結構 (第 169-211 行)
- 2.2 共用元件定義 (第 215-352 行)
- 2.3 元件複用策略 (第 356-373 行)
- 2.4 元件庫組織 (第 377-392 行)

---

## 元件層級結構

```
components/
├── layout/                # 佈局元件
│   ├── Navigation.tsx
│   ├── Breadcrumb.tsx
│   └── Footer.tsx
├── shared/                # 共用元件
│   ├── Button.tsx
│   ├── Modal.tsx
│   ├── Toast.tsx
│   ├── Loading.tsx
│   └── Form/
│       ├── Input.tsx
│       ├── Textarea.tsx
│       └── Select.tsx
├── project/               # 專案元件
│   ├── ProjectList.tsx
│   ├── ProjectCard.tsx
│   └── VideoPreview.tsx
└── configuration/         # 配置元件
    ├── VisualConfigurator.tsx
    └── CanvasPreview.tsx
```

---

## 共用元件範例

### Button 元件

```typescript
interface ButtonProps {
  type?: 'primary' | 'secondary' | 'danger'
  size?: 'small' | 'medium' | 'large'
  loading?: boolean
  onClick?: () => void
  children: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({
  type = 'primary',
  size = 'medium',
  loading,
  onClick,
  children
}) => {
  return (
    <button
      className={`btn btn-${type} btn-${size}`}
      onClick={onClick}
      disabled={loading}
    >
      {loading ? <Spinner /> : children}
    </button>
  )
}
```

---

詳細規格請參考原始文件。
