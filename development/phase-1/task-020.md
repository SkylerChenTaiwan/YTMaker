# Task-020: 首次啟動設定精靈頁面 (/setup)

> **建立日期:** 2025-10-19
> **狀態:** ⏳ 未開始
> **預計時間:** 10 小時
> **優先級:** P0 (必須)

---

## 關聯文件

### 產品設計
- **頁面設計:** `product-design/pages.md#Page-1-首次啟動設定精靈`
- **使用者流程:** `product-design/flows.md#Flow-0-首次啟動設定流程`

### 技術規格
- **頁面規格:** `tech-specs/frontend/pages.md#2-設定精靈頁-Setup-Wizard`
- **元件架構:** `tech-specs/frontend/component-architecture.md`
- **狀態管理:** `tech-specs/frontend/state-management.md`
- **API 整合:** `tech-specs/frontend/api-integration.md`
- **路由設計:** `tech-specs/frontend/routing.md`

### 相關 API
- **API 端點:** `tech-specs/backend/api-system.md#API-Keys-管理`

### 相關任務
- **前置任務:** Task-017 ✅ (路由系統), Task-018 ✅ (Zustand Stores), Task-019 ✅ (Axios 客戶端)
- **後續任務:** Task-021 (主控台頁面), Task-026 (系統設定頁面), Task-029 (整合測試)

---

## 任務目標

### 簡述
實作首次啟動設定精靈頁面 (Setup Wizard),包含 5 個步驟的 API Keys 設定、YouTube 授權、完成頁面,以及完整的表單驗證、連線測試、導航守衛功能。

### 成功標準
- [ ] 5 個步驟頁面全部實作完成 (歡迎、Gemini、Stability AI、D-ID、YouTube、完成)
- [ ] 步驟指示器元件可正確顯示當前步驟
- [ ] API Key 輸入與驗證功能正常
- [ ] 連線測試功能可正確調用後端 API
- [ ] YouTube OAuth 授權流程完整
- [ ] 導航守衛正確檢查設定狀態
- [ ] 響應式設計在桌面、平板、手機都正常顯示
- [ ] 單元測試覆蓋率 > 85%

---

## 測試要求

### 單元測試

#### 測試 1: 步驟指示器正確顯示

**目的:** 驗證步驟指示器能正確顯示當前步驟和已完成步驟

**測試步驟:**
```typescript
// frontend/src/components/setup/StepIndicator.test.tsx
describe('StepIndicator', () => {
  it('should display current step correctly', () => {
    render(<StepIndicator current={2} total={5} />)

    // 驗證第 0-1 步為已完成狀態 (✓)
    expect(screen.getByTestId('step-0')).toHaveClass('completed')
    expect(screen.getByTestId('step-1')).toHaveClass('completed')

    // 驗證第 2 步為當前狀態 (藍色圓點)
    expect(screen.getByTestId('step-2')).toHaveClass('current')

    // 驗證第 3-4 步為未開始狀態 (灰色圓點)
    expect(screen.getByTestId('step-3')).toHaveClass('pending')
    expect(screen.getByTestId('step-4')).toHaveClass('pending')
  })
})
```

**驗證點:**
- [ ] 已完成步驟顯示綠色勾選圖示
- [ ] 當前步驟顯示藍色圓點
- [ ] 未開始步驟顯示灰色圓點
- [ ] 步驟標題正確顯示
- [ ] 響應式設計在手機版顯示正常 (縱向或精簡模式)

---

#### 測試 2: API Key 輸入與格式驗證

**目的:** 驗證 API Key 輸入框的顯示/隱藏切換和基本格式驗證

**測試步驟:**
```typescript
// frontend/src/pages/setup/steps/GeminiApiStep.test.tsx
describe('GeminiApiStep', () => {
  it('should toggle API key visibility', () => {
    render(<GeminiApiStep />)

    const input = screen.getByPlaceholderText('輸入 Gemini API Key')
    const toggleButton = screen.getByLabelText('顯示/隱藏密碼')

    // 初始狀態為隱藏 (type="password")
    expect(input).toHaveAttribute('type', 'password')

    // 點擊眼睛圖示切換顯示
    fireEvent.click(toggleButton)
    expect(input).toHaveAttribute('type', 'text')

    // 再次點擊切換回隱藏
    fireEvent.click(toggleButton)
    expect(input).toHaveAttribute('type', 'password')
  })

  it('should validate API key format', () => {
    render(<GeminiApiStep />)

    const input = screen.getByPlaceholderText('輸入 Gemini API Key')

    // 輸入空值
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.blur(input)
    expect(screen.getByText('請輸入 Gemini API Key')).toBeInTheDocument()

    // 輸入有效值
    fireEvent.change(input, { target: { value: 'AIza...' } })
    expect(screen.queryByText('請輸入 Gemini API Key')).not.toBeInTheDocument()
  })
})
```

**驗證點:**
- [ ] 密碼輸入框預設為隱藏 (type="password")
- [ ] 眼睛圖示可切換顯示/隱藏
- [ ] 空值驗證正確顯示錯誤訊息
- [ ] 錯誤訊息顯示在輸入框下方,使用紅色文字

---

#### 測試 3: 連線測試功能

**目的:** 驗證連線測試按鈕能正確調用 API 並顯示結果

**測試步驟:**
```typescript
// frontend/src/pages/setup/steps/GeminiApiStep.test.tsx
describe('API Connection Test', () => {
  it('should test connection successfully', async () => {
    // Mock API 成功回應
    vi.spyOn(systemApi, 'testApiKey').mockResolvedValue({
      success: true,
      message: '連線成功'
    })

    render(<GeminiApiStep />)

    const input = screen.getByPlaceholderText('輸入 Gemini API Key')
    const testButton = screen.getByText('測試連線')

    // 輸入 API Key
    fireEvent.change(input, { target: { value: 'test-key-123' } })

    // 點擊測試連線
    fireEvent.click(testButton)

    // 驗證按鈕顯示載入狀態
    expect(testButton).toHaveTextContent('測試中...')
    expect(testButton).toBeDisabled()

    // 等待 API 回應
    await waitFor(() => {
      expect(screen.getByText('連線成功')).toBeInTheDocument()
      expect(screen.getByTestId('success-icon')).toBeInTheDocument()
    })

    // 驗證 API 被正確調用
    expect(systemApi.testApiKey).toHaveBeenCalledWith({
      provider: 'gemini',
      apiKey: 'test-key-123'
    })
  })

  it('should handle connection test failure', async () => {
    // Mock API 失敗回應
    vi.spyOn(systemApi, 'testApiKey').mockRejectedValue({
      message: 'API Key 無效'
    })

    render(<GeminiApiStep />)

    const input = screen.getByPlaceholderText('輸入 Gemini API Key')
    const testButton = screen.getByText('測試連線')

    fireEvent.change(input, { target: { value: 'invalid-key' } })
    fireEvent.click(testButton)

    await waitFor(() => {
      expect(screen.getByText('API Key 無效')).toBeInTheDocument()
      expect(screen.getByTestId('error-icon')).toBeInTheDocument()
    })
  })
})
```

**驗證點:**
- [ ] 點擊「測試連線」按鈕顯示載入狀態
- [ ] 按鈕文字變為「測試中...」並禁用
- [ ] 成功時顯示綠色勾選圖示 + 「連線成功」
- [ ] 失敗時顯示紅色錯誤圖示 + 錯誤訊息
- [ ] API 被正確調用,參數正確

---

#### 測試 4: 步驟導航功能

**目的:** 驗證「下一步」和「上一步」按鈕的導航邏輯

**測試步驟:**
```typescript
// frontend/src/pages/setup/page.test.tsx
describe('Setup Wizard Navigation', () => {
  it('should navigate to next step when click next button', () => {
    render(<SetupPage />)

    // 初始在步驟 0 (歡迎頁)
    expect(screen.getByText('歡迎使用 YTMaker')).toBeInTheDocument()

    // 點擊「開始設定」進入步驟 1
    fireEvent.click(screen.getByText('開始設定'))

    expect(screen.getByText('Gemini API Key')).toBeInTheDocument()
    expect(screen.getByTestId('step-indicator')).toHaveAttribute('data-current', '1')
  })

  it('should navigate to previous step when click back button', () => {
    render(<SetupPage initialStep={1} />)

    expect(screen.getByText('Gemini API Key')).toBeInTheDocument()

    // 點擊「上一步」
    fireEvent.click(screen.getByText('上一步'))

    expect(screen.getByText('歡迎使用 YTMaker')).toBeInTheDocument()
    expect(screen.getByTestId('step-indicator')).toHaveAttribute('data-current', '0')
  })

  it('should not show back button on first step', () => {
    render(<SetupPage />)

    expect(screen.queryByText('上一步')).not.toBeInTheDocument()
  })

  it('should disable next button if required fields are empty', () => {
    render(<SetupPage initialStep={1} />)

    const nextButton = screen.getByText('下一步')

    // API Key 為空時,下一步按鈕禁用
    expect(nextButton).toBeDisabled()

    // 輸入 API Key 並測試成功後,按鈕啟用
    const input = screen.getByPlaceholderText('輸入 Gemini API Key')
    fireEvent.change(input, { target: { value: 'test-key' } })

    // Mock 連線測試成功
    vi.spyOn(systemApi, 'testApiKey').mockResolvedValue({ success: true })
    fireEvent.click(screen.getByText('測試連線'))

    await waitFor(() => {
      expect(nextButton).not.toBeDisabled()
    })
  })
})
```

**驗證點:**
- [ ] 第一步 (歡迎頁) 不顯示「上一步」按鈕
- [ ] 點擊「下一步」正確進入下一步
- [ ] 點擊「上一步」正確返回上一步
- [ ] 步驟指示器隨導航更新
- [ ] API Key 未測試成功時「下一步」按鈕禁用

---

#### 測試 5: YouTube OAuth 授權流程

**目的:** 驗證 YouTube 授權按鈕能正確開啟 OAuth 流程

**測試步驟:**
```typescript
// frontend/src/pages/setup/steps/YouTubeAuthStep.test.tsx
describe('YouTubeAuthStep', () => {
  it('should initiate OAuth flow when click connect button', () => {
    const mockOpen = vi.spyOn(window, 'open').mockImplementation()

    render(<YouTubeAuthStep />)

    const connectButton = screen.getByText('連結 YouTube 帳號')

    fireEvent.click(connectButton)

    // 驗證開啟 OAuth 授權視窗
    expect(mockOpen).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/youtube/auth',
      'youtube-auth',
      expect.stringContaining('width=600,height=700')
    )
  })

  it('should display connected status after successful auth', async () => {
    render(<YouTubeAuthStep />)

    // 模擬 OAuth callback
    act(() => {
      window.dispatchEvent(new MessageEvent('message', {
        data: {
          type: 'youtube-auth-success',
          channel_name: '測試頻道',
          channel_id: 'UC123456',
          thumbnail_url: 'https://example.com/avatar.jpg'
        }
      }))
    })

    await waitFor(() => {
      expect(screen.getByText('已連結：測試頻道')).toBeInTheDocument()
      expect(screen.getByAltText('頻道頭像')).toHaveAttribute('src', 'https://example.com/avatar.jpg')
      expect(screen.getByText('變更頻道')).toBeInTheDocument()
    })
  })

  it('should allow skip YouTube auth', () => {
    const mockNavigate = vi.fn()
    vi.mock('next/navigation', () => ({
      useRouter: () => ({ push: mockNavigate })
    }))

    render(<YouTubeAuthStep />)

    fireEvent.click(screen.getByText('稍後設定'))

    // 顯示確認 Modal
    expect(screen.getByText('未連結 YouTube 帳號,您仍可生成影片但無法自動上傳')).toBeInTheDocument()

    fireEvent.click(screen.getByText('確定'))

    // 進入完成頁
    expect(mockNavigate).toHaveBeenCalledWith('/setup?step=5')
  })
})
```

**驗證點:**
- [ ] 點擊「連結 YouTube 帳號」開啟新視窗
- [ ] OAuth 視窗 URL 正確
- [ ] 接收 OAuth callback 訊息並更新 UI
- [ ] 顯示頻道名稱、頭像
- [ ] 「變更頻道」按鈕可重新授權
- [ ] 「稍後設定」顯示確認 Modal

---

#### 測試 6: 完成頁顯示設定摘要

**目的:** 驗證完成頁正確顯示所有設定狀態

**測試步驟:**
```typescript
// frontend/src/pages/setup/steps/CompletionStep.test.tsx
describe('CompletionStep', () => {
  it('should display setup summary correctly', () => {
    const mockState = {
      apiKeys: {
        gemini: { status: 'success', tested: true },
        stability: { status: 'success', tested: true },
        did: { status: 'success', tested: true }
      },
      youtube: {
        connected: true,
        channel_name: '我的頻道'
      }
    }

    render(<CompletionStep setupState={mockState} />)

    // 驗證成功圖示
    expect(screen.getByTestId('success-icon')).toBeInTheDocument()

    // 驗證設定摘要
    expect(screen.getByText('API Keys：已設定 3/3')).toBeInTheDocument()
    expect(screen.getByTestId('api-keys-check')).toHaveClass('text-green-500')

    expect(screen.getByText('YouTube：已連結 我的頻道')).toBeInTheDocument()
    expect(screen.getByTestId('youtube-check')).toHaveClass('text-green-500')

    // 驗證進入主控台按鈕
    expect(screen.getByText('進入主控台')).toBeInTheDocument()
  })

  it('should show warning if some settings are incomplete', () => {
    const mockState = {
      apiKeys: {
        gemini: { status: 'success', tested: true },
        stability: { status: 'pending', tested: false },
        did: { status: 'pending', tested: false }
      },
      youtube: {
        connected: false
      }
    }

    render(<CompletionStep setupState={mockState} />)

    // 驗證警告提示
    expect(screen.getByText('部分設定未完成,部分功能可能無法使用')).toBeInTheDocument()

    // 驗證設定狀態
    expect(screen.getByText('API Keys：已設定 1/3')).toBeInTheDocument()
    expect(screen.getByText('YouTube：未連結')).toBeInTheDocument()
  })
})
```

**驗證點:**
- [ ] 成功圖示 (綠色勾選) 顯示
- [ ] API Keys 設定狀態正確 (X/3)
- [ ] YouTube 連結狀態正確顯示
- [ ] 部分設定未完成時顯示警告
- [ ] 「進入主控台」按鈕功能正常

---

### 整合測試

#### 測試 7: 完整設定流程 E2E 測試

**目的:** 驗證從歡迎頁到完成頁的完整流程

**測試步驟:**
```typescript
// frontend/src/pages/setup/setup.e2e.test.tsx
describe('Setup Wizard E2E', () => {
  it('should complete full setup flow', async () => {
    // Mock API 回應
    vi.spyOn(systemApi, 'testApiKey').mockResolvedValue({ success: true })
    vi.spyOn(systemApi, 'saveApiKey').mockResolvedValue({ success: true })

    render(<SetupPage />)

    // Step 0: 歡迎頁
    expect(screen.getByText('歡迎使用 YTMaker')).toBeInTheDocument()
    fireEvent.click(screen.getByText('開始設定'))

    // Step 1: Gemini API
    expect(screen.getByText('Gemini API Key')).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText('輸入 Gemini API Key'), {
      target: { value: 'gemini-key-123' }
    })
    fireEvent.click(screen.getByText('測試連線'))
    await waitFor(() => {
      expect(screen.getByText('連線成功')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('下一步'))

    // Step 2: Stability AI
    expect(screen.getByText('Stability AI API Key')).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText('輸入 Stability AI API Key'), {
      target: { value: 'stability-key-456' }
    })
    fireEvent.click(screen.getByText('測試連線'))
    await waitFor(() => {
      expect(screen.getByText('連線成功')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('下一步'))

    // Step 3: D-ID
    expect(screen.getByText('D-ID API Key')).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText('輸入 D-ID API Key'), {
      target: { value: 'did-key-789' }
    })
    fireEvent.click(screen.getByText('測試連線'))
    await waitFor(() => {
      expect(screen.getByText('連線成功')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('下一步'))

    // Step 4: YouTube 授權 (跳過)
    expect(screen.getByText('連結 YouTube 帳號')).toBeInTheDocument()
    fireEvent.click(screen.getByText('稍後設定'))
    fireEvent.click(screen.getByText('確定'))

    // Step 5: 完成頁
    await waitFor(() => {
      expect(screen.getByText('所有設定已完成,開始使用 YTMaker!')).toBeInTheDocument()
      expect(screen.getByText('API Keys：已設定 3/3')).toBeInTheDocument()
    })

    // 進入主控台
    const router = useRouter()
    fireEvent.click(screen.getByText('進入主控台'))
    expect(router.push).toHaveBeenCalledWith('/')
  })
})
```

**驗證點:**
- [ ] 可以順利完成所有步驟
- [ ] 步驟指示器正確更新
- [ ] API Keys 正確儲存
- [ ] 完成後跳轉到主控台
- [ ] 整個流程無錯誤

---

## 實作規格

### 需要建立/修改的檔案

#### 1. 路由頁面: `frontend/src/app/setup/page.tsx`

**職責:** Setup Wizard 主頁面,管理步驟流程

**程式碼骨架:**
```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SetupLayout } from '@/components/layout/SetupLayout'
import { StepIndicator } from '@/components/setup/StepIndicator'
import { WelcomeStep } from '@/components/setup/steps/WelcomeStep'
import { GeminiApiStep } from '@/components/setup/steps/GeminiApiStep'
import { StabilityApiStep } from '@/components/setup/steps/StabilityApiStep'
import { DIdApiStep } from '@/components/setup/steps/DIdApiStep'
import { YouTubeAuthStep } from '@/components/setup/steps/YouTubeAuthStep'
import { CompletionStep } from '@/components/setup/steps/CompletionStep'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'

const steps = [
  { title: '歡迎', component: WelcomeStep },
  { title: 'Gemini API', component: GeminiApiStep },
  { title: 'Stability AI', component: StabilityApiStep },
  { title: 'D-ID API', component: DIdApiStep },
  { title: 'YouTube 授權', component: YouTubeAuthStep },
  { title: '完成', component: CompletionStep }
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

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      navigateToStep(currentStep + 1)
    } else {
      // 完成設定,進入主控台
      router.push('/')
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      navigateToStep(currentStep - 1)
    }
  }

  const CurrentStepComponent = steps[currentStep].component
  const canGoNext = validateCurrentStep() // 實作驗證邏輯

  return (
    <SetupLayout>
      <div className="max-w-3xl mx-auto p-6">
        <StepIndicator current={currentStep} total={steps.length} steps={steps} />

        <div className="mt-8">
          <CurrentStepComponent />
        </div>

        <div className="flex justify-between mt-8">
          {currentStep > 0 && (
            <Button type="secondary" onClick={handlePrev}>
              上一步
            </Button>
          )}

          <div className="flex-1" />

          {currentStep < steps.length - 1 ? (
            <Button
              type="primary"
              onClick={handleNext}
              disabled={!canGoNext}
            >
              下一步
            </Button>
          ) : (
            <Button type="primary" onClick={() => router.push('/')}>
              進入主控台
            </Button>
          )}
        </div>
      </div>
    </SetupLayout>
  )
}
```

---

#### 2. 步驟指示器: `frontend/src/components/setup/StepIndicator.tsx`

**職責:** 顯示當前步驟和已完成步驟

**程式碼骨架:**
```typescript
interface StepIndicatorProps {
  current: number
  total: number
  steps: Array<{ title: string }>
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  current,
  total,
  steps
}) => {
  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center" data-testid={`step-${index}`}>
          {/* 步驟圖示 */}
          <div className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center',
            index < current && 'bg-green-500 text-white completed',
            index === current && 'bg-blue-500 text-white current',
            index > current && 'bg-gray-300 text-gray-500 pending'
          )}>
            {index < current ? (
              <CheckIcon className="w-6 h-6" />
            ) : (
              <span>{index + 1}</span>
            )}
          </div>

          {/* 步驟標題 */}
          <span className="ml-2 text-sm hidden md:inline">
            {step.title}
          </span>

          {/* 連接線 */}
          {index < total - 1 && (
            <div className={cn(
              'w-16 h-1 mx-2',
              index < current ? 'bg-green-500' : 'bg-gray-300'
            )} />
          )}
        </div>
      ))}
    </div>
  )
}
```

---

#### 3. Gemini API Step: `frontend/src/components/setup/steps/GeminiApiStep.tsx`

**職責:** Gemini API Key 設定步驟

**程式碼骨架:**
```typescript
import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { systemApi } from '@/services/api/systemApi'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/services/toast'

export const GeminiApiStep: React.FC = () => {
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const { setApiKey: saveApiKey } = useAuthStore()

  const handleTestConnection = async () => {
    if (!apiKey) {
      toast.error('請先輸入 API Key')
      return
    }

    setTesting(true)
    setTestStatus('idle')

    try {
      const result = await systemApi.testApiKey({
        provider: 'gemini',
        apiKey
      })

      if (result.success) {
        setTestStatus('success')
        saveApiKey('gemini', apiKey)
        toast.success('連線成功')
      }
    } catch (error) {
      setTestStatus('error')
      setErrorMessage(error.message || 'API Key 無效')
      toast.error('連線失敗')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Gemini API Key</h2>
        <p className="text-gray-600">
          請輸入您的 Google Gemini API Key,用於生成影片腳本
        </p>
        <a
          href="https://makersuite.google.com/app/apikey"
          target="_blank"
          className="text-blue-500 hover:underline text-sm"
        >
          如何取得 API Key？
        </a>
      </div>

      <div>
        <label className="block mb-2 font-medium">API Key</label>
        <div className="relative">
          <Input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="輸入 Gemini API Key"
            status={testStatus === 'error' ? 'error' : ''}
          />
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2"
            onClick={() => setShowKey(!showKey)}
            aria-label="顯示/隱藏密碼"
          >
            {showKey ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>

        {testStatus === 'error' && (
          <p className="text-red-500 text-sm mt-1">{errorMessage}</p>
        )}

        {testStatus === 'success' && (
          <p className="text-green-500 text-sm mt-1 flex items-center">
            <CheckIcon className="w-4 h-4 mr-1" data-testid="success-icon" />
            連線成功
          </p>
        )}
      </div>

      <Button
        type="secondary"
        onClick={handleTestConnection}
        loading={testing}
        disabled={!apiKey || testing}
      >
        {testing ? '測試中...' : '測試連線'}
      </Button>
    </div>
  )
}
```

---

#### 4. YouTube Auth Step: `frontend/src/components/setup/steps/YouTubeAuthStep.tsx`

**職責:** YouTube OAuth 授權步驟

**程式碼骨架:**
```typescript
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useAuthStore } from '@/stores/authStore'

export const YouTubeAuthStep: React.FC = () => {
  const [showSkipModal, setShowSkipModal] = useState(false)
  const { youtube, setYouTubeAuth } = useAuthStore()

  // 監聽 OAuth callback
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'youtube-auth-success') {
        setYouTubeAuth({
          connected: true,
          channel_name: event.data.channel_name,
          channel_id: event.data.channel_id,
          thumbnail_url: event.data.thumbnail_url
        })
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const handleConnect = () => {
    // 開啟 OAuth 授權視窗
    const width = 600
    const height = 700
    const left = window.screen.width / 2 - width / 2
    const top = window.screen.height / 2 - height / 2

    window.open(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/youtube/auth`,
      'youtube-auth',
      `width=${width},height=${height},left=${left},top=${top}`
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">連結 YouTube 帳號</h2>
        <p className="text-gray-600">
          連結您的 YouTube 頻道以自動上傳影片
        </p>
      </div>

      {youtube.connected ? (
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center">
            <img
              src={youtube.thumbnail_url}
              alt="頻道頭像"
              className="w-16 h-16 rounded-full"
            />
            <div className="ml-4">
              <p className="font-medium">已連結：{youtube.channel_name}</p>
              <Button
                type="text"
                onClick={handleConnect}
                className="mt-2"
              >
                變更頻道
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Button
          type="primary"
          onClick={handleConnect}
          className="w-full"
        >
          連結 YouTube 帳號
        </Button>
      )}

      <button
        className="text-blue-500 hover:underline text-sm"
        onClick={() => setShowSkipModal(true)}
      >
        稍後設定
      </button>

      <Modal
        visible={showSkipModal}
        title="跳過 YouTube 授權"
        onOk={() => {
          setShowSkipModal(false)
          // 進入下一步
        }}
        onCancel={() => setShowSkipModal(false)}
        okText="確定"
        cancelText="取消"
      >
        <p>未連結 YouTube 帳號,您仍可生成影片但無法自動上傳</p>
      </Modal>
    </div>
  )
}
```

---

#### 5. Zustand Store 更新: `frontend/src/stores/authStore.ts`

**職責:** 管理 API Keys 和 YouTube 授權狀態

**新增欄位:**
```typescript
interface AuthStore {
  apiKeys: {
    gemini: { value: string; tested: boolean }
    stability: { value: string; tested: boolean }
    did: { value: string; tested: boolean }
  }
  youtube: {
    connected: boolean
    channel_name: string
    channel_id: string
    thumbnail_url: string
  }
  setApiKey: (provider: string, key: string) => void
  setYouTubeAuth: (auth: Partial<AuthStore['youtube']>) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      apiKeys: {
        gemini: { value: '', tested: false },
        stability: { value: '', tested: false },
        did: { value: '', tested: false }
      },
      youtube: {
        connected: false,
        channel_name: '',
        channel_id: '',
        thumbnail_url: ''
      },
      setApiKey: (provider, key) => set((state) => ({
        apiKeys: {
          ...state.apiKeys,
          [provider]: { value: key, tested: true }
        }
      })),
      setYouTubeAuth: (auth) => set((state) => ({
        youtube: { ...state.youtube, ...auth }
      })),
      clearAuth: () => set({
        apiKeys: {
          gemini: { value: '', tested: false },
          stability: { value: '', tested: false },
          did: { value: '', tested: false }
        },
        youtube: {
          connected: false,
          channel_name: '',
          channel_id: '',
          thumbnail_url: ''
        }
      })
    }),
    {
      name: 'auth-storage'
    }
  )
)
```

---

#### 6. 導航守衛: `frontend/src/middleware.ts`

**職責:** 檢查首次啟動狀態,未設定時重定向到 /setup

**程式碼骨架:**
```typescript
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
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
}
```

---

### API 整合

#### System API: `frontend/src/services/api/systemApi.ts`

**新增方法:**
```typescript
export const systemApi = {
  // 測試 API Key 連線
  async testApiKey(data: {
    provider: 'gemini' | 'stability' | 'did'
    apiKey: string
  }) {
    return apiClient.post('/api/v1/system/test-api-key', data)
  },

  // 儲存 API Key
  async saveApiKey(data: {
    provider: 'gemini' | 'stability' | 'did'
    apiKey: string
  }) {
    return apiClient.post('/api/v1/system/api-keys', data)
  },

  // 取得所有 API Keys 狀態
  async getApiKeysStatus() {
    return apiClient.get('/api/v1/system/api-keys')
  }
}
```

---

## 開發指引

### TDD 開發流程

#### 第 1 步: 環境準備 (10 分鐘)
1. 確認 Task-017、Task-018、Task-019 已完成
2. 確認測試環境可運行: `npm run test`
3. 閱讀 `product-design/pages.md#Page-1` 和 `product-design/flows.md#Flow-0`

#### 第 2 步: 撰寫步驟指示器測試 (20 分鐘)
1. 建立 `frontend/src/components/setup/StepIndicator.test.tsx`
2. 撰寫「測試 1：步驟指示器正確顯示」
3. 執行測試 → 失敗 (預期,因為還沒實作)

#### 第 3 步: 實作步驟指示器元件 (30 分鐘)
1. 建立 `frontend/src/components/setup/StepIndicator.tsx`
2. 實作基本結構 (步驟圖示、連接線)
3. 實作樣式 (已完成/當前/未開始狀態)
4. 執行測試 → 通過 ✅

#### 第 4 步: 撰寫 API Key 輸入測試 (30 分鐘)
1. 建立 `frontend/src/components/setup/steps/GeminiApiStep.test.tsx`
2. 撰寫「測試 2：API Key 輸入與格式驗證」
3. 撰寫「測試 3：連線測試功能」
4. 執行測試 → 失敗

#### 第 5 步: 實作 Gemini API Step (60 分鐘)
1. 建立 `frontend/src/components/setup/steps/GeminiApiStep.tsx`
2. 實作 API Key 輸入框 (顯示/隱藏切換)
3. 實作連線測試功能 (調用 systemApi)
4. 實作狀態顯示 (載入中、成功、失敗)
5. 執行測試 → 通過 ✅

#### 第 6 步: 實作其他 API Steps (90 分鐘)
1. 複製 GeminiApiStep 為 StabilityApiStep 和 DIdApiStep
2. 調整 provider 參數和說明文字
3. 執行測試 → 通過 ✅

#### 第 7 步: 撰寫 YouTube 授權測試 (30 分鐘)
1. 建立 `frontend/src/components/setup/steps/YouTubeAuthStep.test.tsx`
2. 撰寫「測試 5：YouTube OAuth 授權流程」
3. 執行測試 → 失敗

#### 第 8 步: 實作 YouTube Auth Step (60 分鐘)
1. 建立 `frontend/src/components/setup/steps/YouTubeAuthStep.tsx`
2. 實作 OAuth 授權按鈕 (開啟新視窗)
3. 實作 OAuth callback 監聽 (window message event)
4. 實作已連結狀態顯示
5. 實作「稍後設定」功能
6. 執行測試 → 通過 ✅

#### 第 9 步: 實作完成頁 (40 分鐘)
1. 建立 `frontend/src/components/setup/steps/CompletionStep.tsx`
2. 撰寫測試 6：完成頁顯示設定摘要
3. 實作設定摘要顯示
4. 實作「進入主控台」按鈕
5. 執行測試 → 通過 ✅

#### 第 10 步: 實作主頁面與導航 (60 分鐘)
1. 建立 `frontend/src/app/setup/page.tsx`
2. 撰寫測試 4：步驟導航功能
3. 實作步驟狀態管理 (useState)
4. 實作「下一步」、「上一步」邏輯
5. 實作步驟驗證 (禁用「下一步」按鈕)
6. 實作 URL 查詢參數同步
7. 執行測試 → 通過 ✅

#### 第 11 步: 整合 Zustand Store (30 分鐘)
1. 更新 `frontend/src/stores/authStore.ts`
2. 新增 API Keys 和 YouTube 狀態欄位
3. 新增 setApiKey、setYouTubeAuth 方法
4. 整合 localStorage 持久化
5. 執行測試 → 通過 ✅

#### 第 12 步: 實作導航守衛 (30 分鐘)
1. 建立 `frontend/src/middleware.ts`
2. 實作首次啟動檢查邏輯
3. 實作重定向邏輯 (/setup ↔ /)
4. 測試導航守衛功能 → 通過 ✅

#### 第 13 步: E2E 整合測試 (60 分鐘)
1. 建立 `frontend/src/pages/setup/setup.e2e.test.tsx`
2. 撰寫測試 7：完整設定流程 E2E 測試
3. Mock 所有 API 調用
4. 模擬完整流程 (歡迎頁 → 完成頁)
5. 執行測試 → 通過 ✅

#### 第 14 步: 響應式設計優化 (40 分鐘)
1. 測試在不同螢幕尺寸下的顯示
2. 手機版步驟指示器改為精簡模式
3. 調整間距和字體大小
4. 測試觸控互動
5. 執行視覺回歸測試 → 通過 ✅

#### 第 15 步: 檢查測試覆蓋率 (20 分鐘)
1. 執行 `npm run test:coverage`
2. 檢查覆蓋率是否 > 85%
3. 補充缺失的測試案例
4. 再次執行測試 → 覆蓋率達標 ✅

---

### 注意事項

#### 安全性
- ⚠️ **絕對不要**在 console.log 中輸出 API Keys
- ⚠️ API Keys 儲存在 localStorage,需加密處理 (使用 Web Crypto API)
- ⚠️ OAuth callback 需驗證 message origin,防止 XSS

#### 使用者體驗
- 💡 連線測試失敗時提供明確的錯誤訊息和解決方案
- 💡 「下一步」按鈕在未完成必要步驟時禁用並顯示原因
- 💡 離開頁面時顯示確認 Modal (如有未儲存設定)

#### 效能
- ⚡ 步驟元件使用 React.memo 避免不必要的重渲染
- ⚡ API 測試結果快取,避免重複調用
- ⚡ OAuth 視窗使用 window.open 而非 iframe (避免 CSP 問題)

#### 相容性
- 🔗 測試 OAuth 在不同瀏覽器的相容性 (Chrome, Firefox, Safari)
- 🔗 測試 localStorage 可用性 (隱私模式可能禁用)
- 🔗 提供降級方案 (localStorage 不可用時使用 sessionStorage)

---

### 完成檢查清單

#### 功能完整性
- [ ] 步驟 0 (歡迎頁) 可正常顯示
- [ ] 步驟 1-3 (API Keys 設定) 可正常輸入、測試、儲存
- [ ] 步驟 4 (YouTube 授權) OAuth 流程完整
- [ ] 步驟 5 (完成頁) 顯示設定摘要
- [ ] 步驟指示器正確顯示狀態
- [ ] 「下一步」、「上一步」導航正常
- [ ] 導航守衛正確檢查首次啟動狀態

#### 測試
- [ ] 所有單元測試通過 (6 個測試)
- [ ] 整合測試通過 (1 個測試)
- [ ] E2E 測試通過
- [ ] 測試覆蓋率 > 85%
- [ ] 視覺回歸測試通過

#### 程式碼品質
- [ ] ESLint 檢查通過: `npm run lint`
- [ ] TypeScript 編譯通過: `npm run build`
- [ ] 無 console.log 或除錯程式碼
- [ ] 所有元件都有 TypeScript 型別定義

#### UI/UX
- [ ] 響應式設計在桌面 (≥1024px) 正常
- [ ] 響應式設計在平板 (768-1023px) 正常
- [ ] 響應式設計在手機 (<768px) 正常
- [ ] 載入狀態顯示正常 (Spinner)
- [ ] 錯誤訊息顯示正常 (紅色文字)
- [ ] 成功狀態顯示正常 (綠色勾選)

#### 整合
- [ ] Zustand Store 整合正常
- [ ] API 調用正常 (systemApi)
- [ ] localStorage 持久化正常
- [ ] 導航守衛正常運作
- [ ] OAuth callback 正常接收

#### Spec 同步
- [ ] 實作與 `product-design/pages.md#Page-1` 一致
- [ ] 實作與 `product-design/flows.md#Flow-0` 一致
- [ ] 實作與 `tech-specs/frontend/pages.md#2` 一致

---

## 預估時間分配

- 閱讀與準備：20 分鐘
- 實作步驟指示器：50 分鐘
- 實作 API Steps (3 個)：180 分鐘
- 實作 YouTube Auth Step：90 分鐘
- 實作完成頁：40 分鐘
- 實作主頁面與導航：90 分鐘
- 整合 Store 與 API：60 分鐘
- 響應式設計優化：40 分鐘
- E2E 測試：60 分鐘
- 檢查與修正：30 分鐘

**總計：約 10.5 小時**

---

## 參考資源

### Next.js 官方文檔
- [App Router](https://nextjs.org/docs/app)
- [Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [useRouter](https://nextjs.org/docs/app/api-reference/functions/use-router)

### React 官方文檔
- [useState](https://react.dev/reference/react/useState)
- [useEffect](https://react.dev/reference/react/useEffect)
- [Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)

### Zustand 文檔
- [Getting Started](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [Persist Middleware](https://docs.pmnd.rs/zustand/integrations/persisting-store-data)

### 測試工具文檔
- [Vitest](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Playground](https://testing-playground.com/)

### 專案內部文件
- `product-design/pages.md#Page-1` - 頁面設計
- `product-design/flows.md#Flow-0` - 使用者流程
- `tech-specs/frontend/pages.md#2` - 技術規格
- `tech-specs/frontend/component-architecture.md` - 元件架構

---

**準備好了嗎？** 開始使用 TDD 方式實作首次啟動設定精靈頁面！🚀
