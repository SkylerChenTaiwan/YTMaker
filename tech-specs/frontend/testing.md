# 測試規格

> **參考原始文件:** frontend-spec.md 第 2134-2318 行
> **關聯文件:** [overview.md](./overview.md)

本文件定義了元件單元測試、整合測試策略、E2E 測試案例、視覺回歸測試、無障礙測試與效能測試。

完整內容請參考原始 `frontend-spec.md` 文件的以下章節：
- 15.1 元件單元測試 (第 2136-2165 行)
- 15.2 整合測試策略 (第 2169-2207 行)
- 15.3 E2E 測試案例 (第 2211-2251 行)
- 15.4 視覺回歸測試 (第 2255-2268 行)
- 15.5 無障礙測試 (第 2272-2291 行)
- 15.6 效能測試 (第 2295-2318 行)

---

## 測試框架

- **單元測試:** Jest + React Testing Library
- **E2E 測試:** Playwright
- **視覺回歸:** Percy / Chromatic
- **無障礙測試:** axe-core + jest-axe

---

## 單元測試範例

```typescript
// components/__tests__/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import Button from '../Button'

describe('Button', () => {
  it('renders button with text', () => {
    render(<Button>點擊我</Button>)
    expect(screen.getByText('點擊我')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>點擊我</Button>)
    fireEvent.click(screen.getByText('點擊我'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

---

## E2E 測試範例

```typescript
// tests/e2e/create-project.spec.ts
import { test, expect } from '@playwright/test'

test('完整專案創建流程', async ({ page }) => {
  await page.goto('http://localhost:3000/dashboard')
  await page.click('text=新增專案')

  await page.fill('input[name="projectName"]', '測試專案')
  await page.fill('textarea[name="content"]', '內容'.repeat(200))

  await page.click('text=下一步')

  await expect(page).toHaveURL(/\/project\/.*\/configure\/visual/)
})
```

---

詳細規格請參考原始文件。
