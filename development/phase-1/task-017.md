# Task-017: 首次啟動設定精靈 (/setup)

> **建立日期:** 2025-01-19
> **狀態:** ⏳ 未開始
> **預計時間:** 8 小時
> **優先級:** P0

---

## 關聯文件

### 技術規格
- **路由設計:** `tech-specs/frontend/routing.md`
- **狀態管理:** `tech-specs/frontend/state-management.md`
- **API 整合:** `tech-specs/frontend/api-integration.md`

### 產品設計
- **首次啟動流程:** `product-design/flows.md` (Flow-0)

### 相關任務
- **前置任務:** Task-016 (Axios 客戶端), Task-013 (API Keys 管理)
- **後續任務:** Task-018 (主控台頁面)
- **並行任務:** Task-021, Task-022 (可並行開發,修改不同頁面)

---

## 任務目標

### 簡述
實作首次啟動設定精靈頁面 (/setup),引導用戶完成 API Keys 設定和 YouTube 授權,確保系統可正常使用。

### 詳細說明
本任務負責實作 Flow-0 首次啟動流程,包括:
- 多步驟表單設計 (Steps: API Keys → YouTube → 完成)
- API Keys 輸入與即時驗證 (Gemini, Stability AI, D-ID)
- YouTube OAuth 授權流程整合
- 設定完成檢查與導向
- 進度保存與斷點繼續
- 跳過設定選項 (可稍後設定)

### 成功標準
- [ ] 三步驟設定流程完整可用
- [ ] API Keys 驗證正確運作
- [ ] YouTube OAuth 流程整合成功
- [ ] 設定狀態正確保存到 AuthStore
- [ ] 完成後導向 Dashboard
- [ ] 響應式設計支援 (桌面/平板)
- [ ] 單元測試覆蓋率 > 80%

---

## 測試要求

### 測試環境設定

**前置條件:**
- Next.js 應用可運行
- API 客戶端已實作 (Task-016)
- Mock API 回應已設定

### 單元測試

#### 測試 1: API Keys 驗證流程

**測試檔案:** `tests/unit/pages/setup/ApiKeysStep.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ApiKeysStep } from '@/app/setup/components/ApiKeysStep'
import { settingsApi } from '@/services/api/settings'

jest.mock('@/services/api/settings')

describe('ApiKeysStep', () => {
  test('應該顯示三個 API Key 輸入欄位', () => {
    render(<ApiKeysStep onNext={jest.fn()} />)
    
    expect(screen.getByLabelText(/Gemini API Key/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Stability AI API Key/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/D-ID API Key/i)).toBeInTheDocument()
  })

  test('應該驗證 API Key 格式', async () => {
    const mockSetApiKey = jest.fn().mockResolvedValue({ success: true })
    ;(settingsApi.setApiKey as jest.Mock) = mockSetApiKey

    render(<ApiKeysStep onNext={jest.fn()} />)
    
    const geminiInput = screen.getByLabelText(/Gemini API Key/i)
    fireEvent.change(geminiInput, { target: { value: 'test_key_123' } })
    
    const testButton = screen.getByRole('button', { name: /測試 Gemini/i })
    fireEvent.click(testButton)

    await waitFor(() => {
      expect(mockSetApiKey).toHaveBeenCalledWith('gemini', 'test_key_123')
      expect(screen.getByText(/連線成功/i)).toBeInTheDocument()
    })
  })

  test('應該在所有 API Keys 驗證後啟用下一步按鈕', async () => {
    const onNext = jest.fn()
    render(<ApiKeysStep onNext={onNext} />)
    
    // 模擬所有 API Keys 驗證成功
    // ... (測試邏輯)

    const nextButton = screen.getByRole('button', { name: /下一步/i })
    expect(nextButton).toBeEnabled()
    
    fireEvent.click(nextButton)
    expect(onNext).toHaveBeenCalled()
  })
})
```

#### 測試 2: YouTube OAuth 流程

**測試檔案:** `tests/unit/pages/setup/YouTubeStep.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { YouTubeStep } from '@/app/setup/components/YouTubeStep'
import { authApi } from '@/services/api/auth'

jest.mock('@/services/api/auth')

describe('YouTubeStep', () => {
  test('應該顯示連結 YouTube 按鈕', () => {
    render(<YouTubeStep onNext={jest.fn()} onSkip={jest.fn()} />)
    
    expect(screen.getByRole('button', { name: /連結 YouTube 帳號/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /稍後設定/i })).toBeInTheDocument()
  })

  test('應該開啟 OAuth 授權視窗', async () => {
    const mockGetAuthUrl = jest.fn().mockResolvedValue({
      authorization_url: 'https://accounts.google.com/o/oauth2/auth?...',
      state: 'test_state'
    })
    ;(authApi.getYouTubeAuthUrl as jest.Mock) = mockGetAuthUrl

    window.open = jest.fn()

    render(<YouTubeStep onNext={jest.fn()} onSkip={jest.fn()} />)
    
    const connectButton = screen.getByRole('button', { name: /連結 YouTube 帳號/i })
    fireEvent.click(connectButton)

    await waitFor(() => {
      expect(mockGetAuthUrl).toHaveBeenCalled()
      expect(window.open).toHaveBeenCalledWith(
        expect.stringContaining('accounts.google.com'),
        expect.any(String),
        expect.any(String)
      )
    })
  })
})
```

#### 測試 3: 設定完成流程

**測試檔案:** `tests/integration/setup-flow.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SetupPage from '@/app/setup/page'
import { useAuthStore } from '@/stores/useAuthStore'
import { useRouter } from 'next/navigation'

jest.mock('next/navigation')

describe('Setup Flow Integration', () => {
  test('應該完成完整設定流程', async () => {
    const mockPush = jest.fn()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })

    render(<SetupPage />)
    
    // Step 1: API Keys
    // ... (輸入並驗證 API Keys)

    fireEvent.click(screen.getByRole('button', { name: /下一步/i }))

    // Step 2: YouTube
    // ... (連結 YouTube 或跳過)

    fireEvent.click(screen.getByRole('button', { name: /完成設定/i }))

    await waitFor(() => {
      const authStore = useAuthStore.getState()
      expect(authStore.setupCompleted).toBe(true)
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })
})
```

---

## 實作規格

### 需要建立的檔案

#### 1. Setup 主頁面
**檔案:** `frontend/src/app/setup/page.tsx`

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Steps } from 'antd'
import { ApiKeysStep } from './components/ApiKeysStep'
import { YouTubeStep } from './components/YouTubeStep'
import { CompletionStep } from './components/CompletionStep'
import { useAuthStore } from '@/stores/useAuthStore'

export default function SetupPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const setSetupCompleted = useAuthStore(state => state.setSetupCompleted)

  const steps = [
    {
      title: 'API Keys 設定',
      content: <ApiKeysStep onNext={() => setCurrentStep(1)} />
    },
    {
      title: 'YouTube 授權',
      content: (
        <YouTubeStep
          onNext={() => setCurrentStep(2)}
          onSkip={() => setCurrentStep(2)}
        />
      )
    },
    {
      title: '完成',
      content: (
        <CompletionStep
          onFinish={() => {
            setSetupCompleted(true)
            router.push('/dashboard')
          }}
        />
      )
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center mb-8">歡迎使用 YTMaker</h1>
        
        <Steps current={currentStep} items={steps.map(s => ({ title: s.title }))} />
        
        <div className="mt-8">
          {steps[currentStep].content}
        </div>
      </div>
    </div>
  )
}
```

#### 2. API Keys 步驟元件
**檔案:** `frontend/src/app/setup/components/ApiKeysStep.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Form, Input, Button, Alert, Space } from 'antd'
import { CheckCircleOutlined, LoadingOutlined } from '@ant-design/icons'
import { settingsApi } from '@/services/api/settings'
import { useAuthStore } from '@/stores/useAuthStore'

interface ApiKeysStepProps {
  onNext: () => void
}

export function ApiKeysStep({ onNext }: ApiKeysStepProps) {
  const [form] = Form.useForm()
  const [testing, setTesting] = useState<Record<string, boolean>>({})
  const [verified, setVerified] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const setApiKeyStatus = useAuthStore(state => state.setApiKeyStatus)

  const services = [
    { key: 'gemini', label: 'Gemini API Key', placeholder: 'AIza...' },
    { key: 'stability', label: 'Stability AI API Key', placeholder: 'sk-...' },
    { key: 'did', label: 'D-ID API Key', placeholder: 'Basic ...' }
  ]

  const testApiKey = async (service: string, apiKey: string) => {
    setTesting({ ...testing, [service]: true })
    setErrors({ ...errors, [service]: '' })

    try {
      await settingsApi.setApiKey(service as any, apiKey)
      setVerified({ ...verified, [service]: true })
      setApiKeyStatus(service as any, true)
    } catch (error: any) {
      setErrors({ ...errors, [service]: error.message || 'API Key 無效' })
    } finally {
      setTesting({ ...testing, [service]: false })
    }
  }

  const allVerified = services.every(s => verified[s.key])

  return (
    <Form form={form} layout="vertical" className="space-y-6">
      {services.map(service => (
        <div key={service.key}>
          <Form.Item
            label={service.label}
            name={service.key}
            rules={[{ required: true, message: `請輸入 ${service.label}` }]}
          >
            <Space.Compact style={{ width: '100%' }}>
              <Input
                placeholder={service.placeholder}
                disabled={verified[service.key]}
                suffix={
                  verified[service.key] ? (
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  ) : testing[service.key] ? (
                    <LoadingOutlined />
                  ) : null
                }
              />
              <Button
                type="primary"
                loading={testing[service.key]}
                disabled={verified[service.key]}
                onClick={() => {
                  const value = form.getFieldValue(service.key)
                  if (value) testApiKey(service.key, value)
                }}
              >
                {verified[service.key] ? '已驗證' : '測試連線'}
              </Button>
            </Space.Compact>
          </Form.Item>
          
          {errors[service.key] && (
            <Alert message={errors[service.key]} type="error" className="mb-4" />
          )}
        </div>
      ))}

      <div className="flex justify-end pt-4">
        <Button type="primary" size="large" onClick={onNext} disabled={!allVerified}>
          下一步
        </Button>
      </div>
    </Form>
  )
}
```

#### 3. YouTube 步驟元件
**檔案:** `frontend/src/app/setup/components/YouTubeStep.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Button, Alert, Card } from 'antd'
import { YoutubeOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { authApi } from '@/services/api/auth'
import { useAuthStore } from '@/stores/useAuthStore'

interface YouTubeStepProps {
  onNext: () => void
  onSkip: () => void
}

export function YouTubeStep({ onNext, onSkip }: YouTubeStepProps) {
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')
  const { youtubeChannels, addYouTubeChannel } = useAuthStore()

  const handleConnect = async () => {
    setConnecting(true)
    setError('')

    try {
      const { authorization_url, state } = await authApi.getYouTubeAuthUrl()
      
      // 儲存 state 到 localStorage (用於驗證)
      localStorage.setItem('youtube_oauth_state', state)

      // 開啟 OAuth 視窗
      const width = 600
      const height = 700
      const left = window.screenX + (window.outerWidth - width) / 2
      const top = window.screenY + (window.outerHeight - height) / 2
      
      const popup = window.open(
        authorization_url,
        'YouTube OAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      )

      // 監聽 popup 關閉
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed)
          setConnecting(false)
          // 檢查是否已授權 (會通過 callback 處理)
        }
      }, 1000)
    } catch (err: any) {
      setError(err.message || '連結失敗,請稍後再試')
      setConnecting(false)
    }
  }

  // 監聽 OAuth callback
  useEffect(() => {
    const handleCallback = async (event: MessageEvent) => {
      if (event.data.type === 'youtube_oauth_success') {
        const { channel_id, channel_name } = event.data
        addYouTubeChannel({
          id: channel_id,
          name: channel_name,
          connected_at: new Date().toISOString()
        })
      }
    }

    window.addEventListener('message', handleCallback)
    return () => window.removeEventListener('message', handleCallback)
  }, [addYouTubeChannel])

  const hasChannel = youtubeChannels.length > 0

  return (
    <div className="space-y-6">
      <div className="text-center">
        <YoutubeOutlined style={{ fontSize: 64, color: '#FF0000' }} />
        <h2 className="text-2xl font-bold mt-4">連結 YouTube 帳號</h2>
        <p className="text-gray-600 mt-2">
          授權 YTMaker 存取您的 YouTube 頻道,以便自動上傳影片
        </p>
      </div>

      {hasChannel ? (
        <Card className="text-center">
          <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a' }} />
          <p className="mt-4 text-lg font-semibold">{youtubeChannels[0].name}</p>
          <p className="text-gray-600">已成功連結</p>
        </Card>
      ) : (
        <Button
          type="primary"
          size="large"
          icon={<YoutubeOutlined />}
          onClick={handleConnect}
          loading={connecting}
          block
        >
          連結 YouTube 帳號
        </Button>
      )}

      {error && <Alert message={error} type="error" />}

      <div className="flex justify-between pt-4">
        <Button size="large" onClick={onSkip}>
          稍後設定
        </Button>
        <Button
          type="primary"
          size="large"
          onClick={onNext}
          disabled={!hasChannel}
        >
          下一步
        </Button>
      </div>
    </div>
  )
}
```

#### 4. 完成步驟元件
**檔案:** `frontend/src/app/setup/components/CompletionStep.tsx`

```typescript
'use client'

import { Button } from 'antd'
import { CheckCircleOutlined } from '@ant-design/icons'

interface CompletionStepProps {
  onFinish: () => void
}

export function CompletionStep({ onFinish }: CompletionStepProps) {
  return (
    <div className="text-center space-y-6">
      <CheckCircleOutlined style={{ fontSize: 96, color: '#52c41a' }} />
      
      <div>
        <h2 className="text-3xl font-bold">設定完成!</h2>
        <p className="text-gray-600 mt-4 text-lg">
          您已成功完成所有設定,現在可以開始使用 YTMaker 生成影片了
        </p>
      </div>

      <Button type="primary" size="large" onClick={onFinish}>
        開始使用
      </Button>
    </div>
  )
}
```

---

## 開發指引

### 開發步驟

1. **建立頁面結構** (1 小時)
   - 建立 `/app/setup` 目錄
   - 建立主頁面 `page.tsx`
   - 實作步驟導航邏輯

2. **實作 API Keys 步驟** (2.5 小時)
   - 建立 `ApiKeysStep.tsx`
   - 實作表單驗證
   - 實作 API Key 測試邏輯
   - 整合 AuthStore

3. **實作 YouTube 步驟** (2.5 小時)
   - 建立 `YouTubeStep.tsx`
   - 實作 OAuth 授權流程
   - 處理 callback 訊息
   - 整合 AuthStore

4. **實作完成步驟** (0.5 小時)
   - 建立 `CompletionStep.tsx`
   - 實作完成後導向邏輯

5. **撰寫測試** (1.5 小時)
   - 單元測試 (各步驟元件)
   - 整合測試 (完整流程)

---

### 注意事項

**使用者體驗:**
- [ ] 清楚的步驟指示
- [ ] 即時驗證回饋
- [ ] 友善的錯誤訊息
- [ ] 支援跳過選項

**安全性:**
- [ ] OAuth state 驗證
- [ ] API Keys 不記錄到日誌
- [ ] HTTPS only (production)

**狀態管理:**
- [ ] 進度正確保存
- [ ] 支援斷點繼續
- [ ] 清理臨時資料

---

## 完成檢查清單

### 開發完成
- [ ] Setup 主頁面完成
- [ ] ApiKeysStep 元件完成
- [ ] YouTubeStep 元件完成
- [ ] CompletionStep 元件完成
- [ ] 路由配置完成

### 測試完成
- [ ] API Keys 驗證測試通過
- [ ] YouTube OAuth 測試通過
- [ ] 完整流程測試通過
- [ ] 測試覆蓋率 > 80%

### 文件同步
- [ ] Spec 與程式碼同步
- [ ] 元件 props 文件完整

### Git
- [ ] 程式碼已 commit
- [ ] Commit 訊息符合規範
- [ ] 已推送到 remote

---

## 時間分配建議

- **頁面結構:** 1 小時
- **API Keys 步驟:** 2.5 小時
- **YouTube 步驟:** 2.5 小時
- **完成步驟:** 0.5 小時
- **測試撰寫:** 1.5 小時

**總計:** 8 小時
