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
