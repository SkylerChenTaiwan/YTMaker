# Frontend 整體架構

> **關聯文件:** [../framework.md](../framework.md), [routing.md](./routing.md), [state-management.md](./state-management.md)

---

## 1. 技術棧概覽

### 核心框架
- **框架:** Next.js 14 (React 18)
- **語言:** TypeScript 5.x
- **UI 函式庫:** Ant Design 5.x
- **樣式:** Tailwind CSS + CSS Modules
- **狀態管理:** Zustand
- **HTTP 客戶端:** Axios
- **即時通訊:** Socket.IO Client

### 桌面應用
- **打包工具:** Electron

---

## 2. 專案目錄結構

```
frontend/
├── public/
│   ├── fonts/
│   └── images/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx           # 主控台
│   │   ├── setup/             # 首次啟動
│   │   ├── project/           # 專案相關
│   │   ├── configurations/    # 配置管理
│   │   ├── templates/         # 模板管理
│   │   ├── settings/          # 系統設定
│   │   └── batch/             # 批次處理
│   ├── components/            # React 元件
│   │   ├── layout/           # 佈局元件
│   │   ├── shared/           # 共用元件
│   │   ├── project/          # 專案元件
│   │   ├── configuration/    # 配置元件
│   │   └── template/         # 模板元件
│   ├── hooks/                # 自訂 Hooks
│   │   ├── useApi.ts
│   │   ├── useProgressSync.ts
│   │   └── useAutoSave.ts
│   ├── stores/               # Zustand Stores
│   │   ├── useProjectStore.ts
│   │   ├── useConfigStore.ts
│   │   ├── useProgressStore.ts
│   │   └── useAuthStore.ts
│   ├── services/             # API 服務
│   │   ├── api.ts           # Axios 配置
│   │   ├── projectApi.ts
│   │   ├── configApi.ts
│   │   └── errorHandler.ts
│   ├── types/                # TypeScript 類型
│   │   ├── project.ts
│   │   ├── config.ts
│   │   └── api.ts
│   ├── utils/                # 工具函數
│   │   ├── validation.ts
│   │   ├── formatting.ts
│   │   └── cache.ts
│   └── styles/               # 全域樣式
│       ├── globals.css
│       └── theme.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── next.config.js
```

---

## 3. 主要依賴套件

### 核心套件
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.0.0"
  }
}
```

### UI 與樣式
```json
{
  "dependencies": {
    "antd": "^5.11.0",
    "tailwindcss": "^3.3.0",
    "@ant-design/icons": "^5.2.0"
  }
}
```

### 狀態與資料
```json
{
  "dependencies": {
    "zustand": "^4.4.0",
    "axios": "^1.6.0",
    "socket.io-client": "^4.6.0"
  }
}
```

### 表單與驗證
```json
{
  "dependencies": {
    "react-hook-form": "^7.48.0",
    "zod": "^3.22.0",
    "@hookform/resolvers": "^3.3.0"
  }
}
```

### 拖拽與視覺化
```json
{
  "dependencies": {
    "react-dnd": "^16.0.1",
    "react-konva": "^18.2.10",
    "konva": "^9.2.0"
  }
}
```

### 開發工具
```json
{
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/node": "^20.10.0",
    "eslint": "^8.54.0",
    "prettier": "^3.1.0",
    "@testing-library/react": "^14.1.0",
    "@playwright/test": "^1.40.0"
  }
}
```

---

## 4. 應用程式啟動流程

### 開發環境

```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev

# 訪問: http://localhost:3000
```

### 生產環境

```bash
# 建構應用
npm run build

# 啟動
npm start

# 或使用 Electron 打包
npm run electron:build
```

---

## 5. 配置管理

### Next.js 配置

```javascript
// next.config.js
module.exports = {
  output: 'export',  // 靜態導出 (用於 Electron)
  images: {
    unoptimized: true  // Electron 不支援 Next.js Image 優化
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' }
        ]
      }
    ]
  }
}
```

### Tailwind 配置

```javascript
// tailwind.config.js
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1E88E5',
        'text-primary': '#37352f',
        'text-secondary': '#787774',
        border: '#e9e9e7'
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px'
      }
    }
  }
}
```

---

## 6. 環境變數

### 開發環境 (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

### 生產環境 (.env.production)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

---

## 7. 路由架構

**詳見:** [routing.md](./routing.md)

**總頁面數:** 12 個

**主要路由:**
- `/setup` - 首次啟動
- `/` 或 `/dashboard` - 主控台
- `/project/new` - 新增專案
- `/project/:id/configure/*` - 配置頁面
- `/project/:id/progress` - 進度監控
- `/project/:id/result` - 結果頁面

---

## 8. 狀態管理架構

**詳見:** [state-management.md](./state-management.md)

**全域 Stores:**
- `useProjectStore` - 專案狀態
- `useConfigStore` - 配置狀態
- `useProgressStore` - 進度狀態
- `useAuthStore` - API Keys 與 YouTube 授權

---

## 9. 元件組織原則

### 元件分類

1. **Layout Components** - 佈局元件
   - Navigation, Breadcrumb, Sidebar, Footer

2. **Shared Components** - 共用元件
   - Button, Modal, Toast, Loading, Table, Card, Form

3. **Page Components** - 頁面元件
   - 對應每個路由的主要元件

4. **Business Components** - 業務元件
   - ProjectCard, VisualConfigurator, TemplateSelector

### 元件複用原則

- ✅ 最小粒度原則
- ✅ 組合優於繼承
- ✅ Props 驅動
- ✅ TypeScript 類型安全

---

## 10. 設計風格

**詳見:** [styling.md](./styling.md)

**設計哲學:** Notion-like 簡潔、現代、專注

**核心原則:**
- 極簡主義
- 內容為王
- 優雅的互動
- 舒適的閱讀體驗

---

## 總結

### 技術亮點
- ✅ Next.js 14 App Router
- ✅ TypeScript 類型安全
- ✅ Ant Design 企業級 UI
- ✅ Zustand 輕量狀態管理
- ✅ Electron 桌面應用

### 頁面統計
- **總頁面數:** 12 個
- **動態路由:** 3 個
- **WebSocket 連線:** 3 個

### 元件統計
- **共用元件:** ~15 個
- **業務元件:** ~20 個

---

**下一步:** 詳見 [routing.md](./routing.md)、[state-management.md](./state-management.md)、[component-architecture.md](./component-architecture.md)
