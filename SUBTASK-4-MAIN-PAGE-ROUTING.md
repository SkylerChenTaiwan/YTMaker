# 子任務 4: 主頁面與路由導航

> **優先級:** P0 (必須)
> **預估時間:** 2 小時
> **可並行:** ⚠️ 部分可以 (頁面結構可並行,整合需等待 1-3 完成)
> **依賴:** 所有 Step 元件 (子任務 1-3)

---

## 目標

1. 實作 Setup 主頁面 (`/setup`)
2. 實作步驟導航邏輯
3. 實作 URL 查詢參數同步
4. 實作步驟驗證邏輯
5. 撰寫並通過導航測試

---

## 需要建立的檔案

### 1. Setup 主頁面

#### `frontend/src/app/setup/page.tsx`

**功能:**
- 管理當前步驟狀態
- 顯示 StepIndicator
- 動態渲染當前步驟元件
- 處理「上一步」、「下一步」按鈕
- 驗證步驟完成狀態
- URL 查詢參數同步

**程式碼骨架:**
```tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { StepIndicator } from '@/components/setup/StepIndicator'
import { WelcomeStep } from '@/components/setup/steps/WelcomeStep'
import { GeminiApiStep } from '@/components/setup/steps/GeminiApiStep'
import { StabilityApiStep } from '@/components/setup/steps/StabilityApiStep'
import { DIdApiStep } from '@/components/setup/steps/DIdApiStep'
import { YouTubeAuthStep } from '@/components/setup/steps/YouTubeAuthStep'
import { CompletionStep } from '@/components/setup/steps/CompletionStep'
import { useAuthStore } from '@/store/useAuthStore'
import { Button } from '@/components/ui/Button'

const steps = [
  { title: '歡迎', component: WelcomeStep },
  { title: 'Gemini API', component: GeminiApiStep },
  { title: 'Stability AI', component: StabilityApiStep },
  { title: 'D-ID API', component: DIdApiStep },
  { title: 'YouTube 授權', component: YouTubeAuthStep },
  { title: '完成', component: CompletionStep },
]

export default function SetupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentStep, setCurrentStep] = useState(0)
  const { apiKeys, youtube } = useAuthStore()

  // 從 URL query 參數讀取步驟
  useEffect(() => {
    const step = parseInt(searchParams.get('step') || '0')
    if (step >= 0 && step < steps.length) {
      setCurrentStep(step)
    }
  }, [searchParams])

  // 更新 URL
  const navigateToStep = (step: number) => {
    setCurrentStep(step)
    router.push(`/setup?step=${step}`)
  }

  // 驗證當前步驟是否可以進入下一步
  const canGoNext = (): boolean => {
    switch (currentStep) {
      case 0: // 歡迎頁
        return true
      case 1: // Gemini API
        return apiKeys.gemini.tested
      case 2: // Stability AI
        return apiKeys.stabilityAI.tested
      case 3: // D-ID API
        return apiKeys.dId.tested
      case 4: // YouTube 授權
        return true // 可選步驟
      case 5: // 完成
        return true
      default:
        return false
    }
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      navigateToStep(currentStep + 1)
    } else {
      // 完成設定,設置 cookie 並進入主控台
      document.cookie = 'setup-completed=true; path=/; max-age=31536000'
      router.push('/')
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      navigateToStep(currentStep - 1)
    }
  }

  const CurrentStepComponent = steps[currentStep].component

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-6">
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">YTMaker</h1>
        </div>

        {/* 步驟指示器 */}
        <StepIndicator
          current={currentStep}
          total={steps.length}
          steps={steps}
        />

        {/* 當前步驟內容 */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-8">
          <CurrentStepComponent />
        </div>

        {/* 導航按鈕 */}
        <div className="flex justify-between mt-8">
          {currentStep > 0 && (
            <Button variant="secondary" onClick={handlePrev}>
              上一步
            </Button>
          )}

          <div className="flex-1" />

          {currentStep < steps.length - 1 ? (
            <Button
              variant="primary"
              onClick={handleNext}
              disabled={!canGoNext()}
            >
              下一步
            </Button>
          ) : (
            <Button variant="primary" onClick={handleNext}>
              進入主控台
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

### 2. Setup Layout (可選)

#### `frontend/src/components/layout/SetupLayout.tsx`

**功能:**
- 提供 Setup 頁面的共用 layout
- 簡化的導航 (只有 Logo)
- 乾淨的背景

---

### 3. 導航測試

#### `frontend/tests/unit/app/setup/page.test.tsx`

**測試案例 (根據 Task 文件的測試 4):**

```tsx
describe('Setup Page Navigation', () => {
  it('should navigate to next step when click next button', () => {
    render(<SetupPage />)

    // 初始在步驟 0 (歡迎頁)
    expect(screen.getByText('歡迎使用 YTMaker')).toBeInTheDocument()

    // 點擊「下一步」進入步驟 1
    fireEvent.click(screen.getByText('下一步'))

    expect(screen.getByText('Gemini API Key')).toBeInTheDocument()
  })

  it('should navigate to previous step when click back button', () => {
    // 從步驟 1 開始
    const searchParams = new URLSearchParams({ step: '1' })
    render(<SetupPage />, { searchParams })

    expect(screen.getByText('Gemini API Key')).toBeInTheDocument()

    // 點擊「上一步」
    fireEvent.click(screen.getByText('上一步'))

    expect(screen.getByText('歡迎使用 YTMaker')).toBeInTheDocument()
  })

  it('should not show back button on first step', () => {
    render(<SetupPage />)

    expect(screen.queryByText('上一步')).not.toBeInTheDocument()
  })

  it('should disable next button if required fields not completed', () => {
    // Mock store: API key 未測試
    mockUseAuthStore.mockReturnValue({
      apiKeys: {
        gemini: { value: '', tested: false },
      },
    } as any)

    const searchParams = new URLSearchParams({ step: '1' })
    render(<SetupPage />, { searchParams })

    const nextButton = screen.getByText('下一步')

    // API Key 未測試時,下一步按鈕禁用
    expect(nextButton).toBeDisabled()
  })

  it('should enable next button when API key is tested', () => {
    // Mock store: API key 已測試
    mockUseAuthStore.mockReturnValue({
      apiKeys: {
        gemini: { value: 'test-key', tested: true },
      },
    } as any)

    const searchParams = new URLSearchParams({ step: '1' })
    render(<SetupPage />, { searchParams })

    const nextButton = screen.getByText('下一步')

    // API Key 已測試時,下一步按鈕啟用
    expect(nextButton).not.toBeDisabled()
  })

  it('should sync URL with current step', () => {
    const mockPush = jest.fn()
    jest.spyOn(useRouter, 'push').mockImplementation(mockPush)

    render(<SetupPage />)

    // 點擊下一步
    fireEvent.click(screen.getByText('下一步'))

    // URL 應該更新
    expect(mockPush).toHaveBeenCalledWith('/setup?step=1')
  })

  it('should set cookie and redirect when complete', () => {
    const mockPush = jest.fn()
    jest.spyOn(useRouter, 'push').mockImplementation(mockPush)

    const searchParams = new URLSearchParams({ step: '5' })
    render(<SetupPage />, { searchParams })

    // 在完成頁點擊「進入主控台」
    fireEvent.click(screen.getByText('進入主控台'))

    // 應該設置 cookie
    expect(document.cookie).toContain('setup-completed=true')

    // 應該導航到主控台
    expect(mockPush).toHaveBeenCalledWith('/')
  })
})
```

---

## 實作步驟

### Step 1: 建立頁面結構 (30 分鐘)
- 建立 `page.tsx`
- 設置基本 layout
- 引入所有 step 元件

### Step 2: 實作導航邏輯 (40 分鐘)
- 實作 `navigateToStep`
- 實作 `handleNext` 和 `handlePrev`
- URL 查詢參數同步

### Step 3: 實作驗證邏輯 (30 分鐘)
- 實作 `canGoNext` 函數
- 讀取 Store 狀態
- 根據狀態禁用/啟用按鈕

### Step 4: 撰寫測試 (20 分鐘)
- 7 個測試案例
- Mock router 和 searchParams
- 確保測試通過

---

## 驗收標準

- [ ] Setup Page: 7/7 測試通過
- [ ] 步驟導航正常 (前進/後退)
- [ ] URL 與當前步驟同步
- [ ] 步驟驗證正確 (禁用/啟用下一步)
- [ ] 第一步不顯示「上一步」
- [ ] 完成後設置 cookie 並導航到 `/`
- [ ] 響應式設計正常
- [ ] 無 TypeScript 錯誤

---

## 完成後動作

```bash
git add frontend/src/app/setup/
git add frontend/tests/unit/app/setup/
git commit -m "feat: 實作 Setup 主頁面與路由導航 [task-020]"
git push
```

---

## 注意事項

⚠️ **Next.js App Router:**
- 使用 `'use client'` directive
- 使用 `useRouter` 和 `useSearchParams`
- 不要使用 Next.js 12 的 router API

⚠️ **Cookie 設置:**
- 使用 `document.cookie` 或 `js-cookie`
- 設置 `max-age` 確保持久化
- Path 設置為 `/` 確保全域可用
