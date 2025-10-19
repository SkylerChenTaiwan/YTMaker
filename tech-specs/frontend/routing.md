# 路由設計

> **參考原始文件:** frontend-spec.md 第 9-166 行
> **關聯文件:** [overview.md](./overview.md)

本文件定義了完整的路由架構、導航守衛、重定向規則等。

完整內容請參考原始 `frontend-spec.md` 文件的以下章節：
- 1.1 路由定義 (第 11-54 行)
- 1.2 路由參數設計 (第 59-71 行)
- 1.3 導航守衛 (第 75-111 行)
- 1.4 重定向規則 (第 115-122 行)
- 1.5 404 處理 (第 126-133 行)
- 1.6 麵包屑設計 (第 137-164 行)

---

## 核心路由表

| 路由 | 頁面 | 說明 |
|------|------|------|
| `/setup` | 首次啟動設定精靈 | Flow-0 |
| `/` 或 `/dashboard` | 主控台 | Flow-1, Flow-2, Flow-5, Flow-6 |
| `/project/new` | 新增專案頁 | Flow-1, Flow-2 |
| `/project/:id/configure/visual` | 視覺化配置頁 | Flow-1, Flow-3, Flow-7 |
| `/project/:id/configure/prompt-model` | Prompt 與模型設定頁 | Flow-1, Flow-8 |
| `/project/:id/configure/youtube` | YouTube 設定頁 | Flow-1, Flow-4 |
| `/project/:id/progress` | 進度監控頁 | Flow-1, Flow-6 |
| `/project/:id/result` | 結果頁 | Flow-1 |
| `/configurations` | 配置管理頁 | Flow-3 |
| `/templates` | 模板管理頁 | Flow-2, Flow-8 |
| `/settings` | 系統設定頁 | Flow-0, Flow-9 |
| `/batch` | 批次處理頁 | Flow-5 |

**總計:** 12 個主要路由

---

## 導航守衛實作

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const isSetupCompleted = request.cookies.get('is_setup_completed')?.value

  // 首次啟動檢測
  if (!isSetupCompleted && path !== '/setup') {
    return NextResponse.redirect(new URL('/setup', request.url))
  }

  // 已完成設定但訪問 /setup,重定向到 dashboard
  if (isSetupCompleted && path === '/setup') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}
```

---

詳細規格請參考原始文件。
