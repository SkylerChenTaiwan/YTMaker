# 子任務 5: 導航守衛與最終測試

> **優先級:** P0 (必須)
> **預估時間:** 1.5 小時
> **可並行:** ❌ 不可 (必須等待所有其他任務完成)
> **依賴:** 所有前置任務 (1-4)

---

## 目標

1. 實作導航守衛 (middleware)
2. 撰寫 E2E 整合測試
3. 響應式設計優化
4. 檢查測試覆蓋率

---

## 需要建立/修改的檔案

### 1. 導航守衛

#### `frontend/src/middleware.ts`

**功能:**
- 檢查是否完成首次設定
- 未完成時重定向到 `/setup`
- 已完成時阻止訪問 `/setup`

**程式碼:**
```tsx
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const setupCompleted = request.cookies.get('setup-completed')
  const isSetupPage = request.nextUrl.pathname === '/setup'

  // 如果未完成設定且不在設定頁,重定向到設定頁
  if (!setupCompleted && !isSetupPage) {
    return NextResponse.redirect(new URL('/setup', request.url))
  }

  // 如果已完成設定且在設定頁,重定向到主控台
  if (setupCompleted && isSetupPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
```

#### 測試導航守衛

```bash
# 手動測試
# 1. 清除 cookie
# 2. 訪問 / -> 應該重定向到 /setup
# 3. 完成設定
# 4. 訪問 /setup -> 應該重定向到 /
```

---

### 2. E2E 整合測試

#### `frontend/tests/e2e/setup-flow.spec.ts` (Playwright)

**測試案例 (根據 Task 文件的測試 7):**

```typescript
import { test, expect } from '@playwright/test'

test.describe('Setup Wizard E2E', () => {
  test('should complete full setup flow', async ({ page }) => {
    // 清除 cookie
    await page.context().clearCookies()

    // 訪問首頁,應該重定向到 setup
    await page.goto('/')
    await expect(page).toHaveURL('/setup')

    // Step 0: 歡迎頁
    await expect(page.locator('h1')).toContainText('歡迎使用 YTMaker')
    await page.click('button:has-text("下一步")')

    // Step 1: Gemini API
    await expect(page.locator('h2')).toContainText('Gemini API Key')
    await page.fill('input[placeholder*="Gemini"]', 'gemini-test-key')
    await page.click('button:has-text("測試連線")')
    await expect(page.locator('text=連線成功')).toBeVisible()
    await page.click('button:has-text("下一步")')

    // Step 2: Stability AI
    await expect(page.locator('h2')).toContainText('Stability AI')
    await page.fill('input[placeholder*="Stability"]', 'stability-test-key')
    await page.click('button:has-text("測試連線")')
    await expect(page.locator('text=連線成功')).toBeVisible()
    await page.click('button:has-text("下一步")')

    // Step 3: D-ID
    await expect(page.locator('h2')).toContainText('D-ID')
    await page.fill('input[placeholder*="D-ID"]', 'did-test-key')
    await page.click('button:has-text("測試連線")')
    await expect(page.locator('text=連線成功')).toBeVisible()
    await page.click('button:has-text("下一步")')

    // Step 4: YouTube 授權 (跳過)
    await expect(page.locator('h2')).toContainText('連結 YouTube 帳號')
    await page.click('text=稍後設定')
    await page.click('button:has-text("確定")')

    // Step 5: 完成頁
    await expect(page.locator('h2')).toContainText('設定已完成')
    await expect(page.locator('text=API Keys：已設定 3/3')).toBeVisible()

    // 進入主控台
    await page.click('button:has-text("進入主控台")')
    await expect(page).toHaveURL('/')

    // 驗證 cookie 已設置
    const cookies = await page.context().cookies()
    expect(cookies.find(c => c.name === 'setup-completed')).toBeTruthy()

    // 嘗試訪問 setup,應該重定向回首頁
    await page.goto('/setup')
    await expect(page).toHaveURL('/')
  })
})
```

或使用 Jest + React Testing Library:

#### `frontend/tests/unit/app/setup/setup.integration.test.tsx`

```tsx
describe('Setup Wizard Integration', () => {
  it('should complete full setup flow', async () => {
    // Mock API 回應
    mockSystemApi.testApiKey.mockResolvedValue({ success: true })

    const { container } = render(<SetupPage />)

    // Step 0: 歡迎頁
    expect(screen.getByText('歡迎使用 YTMaker')).toBeInTheDocument()
    fireEvent.click(screen.getByText('下一步'))

    // Step 1: Gemini API
    expect(screen.getByText('Gemini API Key')).toBeInTheDocument()
    fireEvent.change(
      screen.getByPlaceholderText(/Gemini/i),
      { target: { value: 'gemini-key-123' } }
    )
    fireEvent.click(screen.getByText('測試連線'))
    await waitFor(() => {
      expect(screen.getByText('連線成功')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('下一步'))

    // ... (重複其他步驟)

    // Step 5: 完成頁
    await waitFor(() => {
      expect(screen.getByText(/所有設定已完成/i)).toBeInTheDocument()
      expect(screen.getByText('API Keys：已設定 3/3')).toBeInTheDocument()
    })

    // 進入主控台
    const mockPush = jest.fn()
    jest.spyOn(useRouter, 'push').mockImplementation(mockPush)
    fireEvent.click(screen.getByText('進入主控台'))
    expect(mockPush).toHaveBeenCalledWith('/')
  })
})
```

---

### 3. 響應式設計優化

**需要檢查的元件:**
- [ ] StepIndicator - 手機版顯示精簡模式
- [ ] 所有 Step 元件 - 間距適應小螢幕
- [ ] Setup Page - 整體 layout 響應式
- [ ] 按鈕 - 手機版全寬

**Tailwind 響應式斷點:**
```
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
```

**檢查方式:**
```bash
# 使用 Chrome DevTools
# - iPhone SE (375px)
# - iPad (768px)
# - Desktop (1024px+)
```

---

### 4. 測試覆蓋率檢查

```bash
# 執行測試覆蓋率
npm test -- --coverage

# 檢查報告
open coverage/lcov-report/index.html
```

**目標:**
- 總體覆蓋率: > 85%
- 核心元件: > 90%
  - StepIndicator
  - GeminiApiStep (及其他 API Steps)
  - Setup Page

**如果覆蓋率不足:**
- 補充邊界案例測試
- 測試錯誤處理路徑
- 測試 edge cases

---

## 實作步驟

### Step 1: 實作導航守衛 (20 分鐘)
```bash
# 建立 middleware.ts
# 手動測試重定向邏輯
```

### Step 2: 撰寫 E2E 測試 (40 分鐘)
```bash
# 建立整合測試
# 執行測試
npm test -- setup.integration.test.tsx
```

### Step 3: 響應式優化 (20 分鐘)
```bash
# 使用 DevTools 測試不同螢幕
# 調整間距和 layout
# 確保所有元件在手機上正常顯示
```

### Step 4: 覆蓋率檢查 (10 分鐘)
```bash
# 執行覆蓋率測試
npm test -- --coverage

# 補充測試 (如需要)
```

---

## 驗收標準

- [ ] 導航守衛正確運作
  - [ ] 未完成設定時重定向到 `/setup`
  - [ ] 已完成設定時阻止訪問 `/setup`
- [ ] E2E 測試通過 (1/1)
- [ ] 響應式設計
  - [ ] 手機 (375px) 正常顯示
  - [ ] 平板 (768px) 正常顯示
  - [ ] 桌面 (1024px+) 正常顯示
- [ ] 測試覆蓋率 > 85%
- [ ] 所有單元測試通過 (應該有 30+ 測試)
- [ ] 無 TypeScript 錯誤
- [ ] 無 ESLint 警告

---

## 最終檢查清單

### 功能完整性
- [ ] 6 個步驟頁面全部可用
- [ ] 步驟導航正常 (前進/後退)
- [ ] API Key 測試功能正常
- [ ] YouTube OAuth 流程完整
- [ ] 導航守衛正確運作
- [ ] 完成後進入主控台

### 測試
- [ ] StepIndicator: 6/6 ✅
- [ ] GeminiApiStep: 6/6 ✅
- [ ] StabilityApiStep: 6/6 ✅
- [ ] DIdApiStep: 6/6 ✅
- [ ] YouTubeAuthStep: 6/6 ✅
- [ ] WelcomeStep: 3/3 ✅
- [ ] CompletionStep: 5/5 ✅
- [ ] Setup Page: 7/7 ✅
- [ ] Integration: 1/1 ✅
- [ ] **總計:** 46/46 測試通過
- [ ] **覆蓋率:** > 85%

### 程式碼品質
- [ ] `npm run lint` 通過
- [ ] `npm run type-check` 通過
- [ ] `npm run build` 成功
- [ ] 無 console.log 或除錯程式碼

### UI/UX
- [ ] 所有元件響應式設計正常
- [ ] 載入狀態顯示正常
- [ ] 錯誤訊息清晰
- [ ] 成功狀態反饋明確
- [ ] 按鈕狀態 (disabled/enabled) 正確

---

## 完成後動作

```bash
# 最終 commit
git add -A
git commit -m "feat: 完成導航守衛和最終測試優化 [task-020]

- 實作導航守衛 (middleware)
- 新增 E2E 整合測試
- 響應式設計優化
- 測試覆蓋率達到 85%+
- 所有 46 個測試通過

Task-020 已 100% 完成 ✅

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
"

# Push
git push

# 更新 task 文件
# 標記 Task-020 為已完成 [v]
```

---

## 後續工作

完成 Task-020 後,可以考慮:
1. Code review
2. 創建 Pull Request
3. 部署到 staging 環境測試
4. 進行 Task-021 (主控台頁面)
