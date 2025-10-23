import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { systemApi } from '@/services/api/systemApi'
import { useAuthStore } from '@/store/useAuthStore'

const EyeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
    />
  </svg>
)

const EyeOffIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
    />
  </svg>
)

const CheckIcon: React.FC<{
  className?: string
  'data-testid'?: string
}> = ({ className, 'data-testid': testId }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={3}
    data-testid={testId}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
)

const XIcon: React.FC<{ className?: string; 'data-testid'?: string }> = ({
  className,
  'data-testid': testId,
}) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    data-testid={testId}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
)

export const GeminiApiStep: React.FC = () => {
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testStatus, setTestStatus] = useState<
    'idle' | 'success' | 'error'
  >('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [validationError, setValidationError] = useState('')

  const { setApiKey: saveApiKey } = useAuthStore()

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setApiKey(value)
    if (validationError && value) {
      setValidationError('')
    }
  }

  const handleBlur = () => {
    if (!apiKey) {
      setValidationError('請輸入 Gemini API Key')
    }
  }

  const handleTestConnection = async () => {
    if (!apiKey) {
      setValidationError('請輸入 Gemini API Key')
      return
    }

    setTesting(true)
    setTestStatus('idle')
    setErrorMessage('')

    try {
      // 1. 先測試 API Key
      const result = await systemApi.testApiKey({
        provider: 'gemini',
        apiKey,
      })

      if (result.is_valid) {
        // 2. 測試成功後，儲存 API Key
        try {
          await systemApi.saveApiKey({
            provider: 'gemini',
            apiKey,
          })

          // 3. 更新本地狀態
          setTestStatus('success')
          saveApiKey('gemini', apiKey, true)
        } catch (saveError) {
          console.error('Failed to save API key:', saveError)
          setTestStatus('error')
          setErrorMessage('測試成功但儲存失敗，請重試')
        }
      } else {
        setTestStatus('error')
        setErrorMessage(result.message || 'API Key 無效')
      }
    } catch (error) {
      setTestStatus('error')
      setErrorMessage(
        error instanceof Error ? error.message : 'API Key 無效'
      )
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Gemini API Key</h2>
        <p className="text-gray-600 mb-2">
          請輸入您的 Google Gemini API Key,用於生成影片腳本
        </p>
        <a
          href="https://makersuite.google.com/app/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline text-sm"
        >
          如何取得 API Key？
        </a>
      </div>

      <div>
        <label htmlFor="gemini-api-key" className="block mb-2 font-medium">
          API Key
        </label>
        <div className="relative">
          <input
            id="gemini-api-key"
            name="gemini_api_key"
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={handleApiKeyChange}
            onBlur={handleBlur}
            placeholder="輸入 Gemini API Key"
            className={`block w-full px-4 py-2 pr-12 text-base border rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 ${
              validationError || testStatus === 'error'
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            onClick={() => setShowKey(!showKey)}
            aria-label="顯示/隱藏密碼"
          >
            {showKey ? (
              <EyeOffIcon className="w-5 h-5" />
            ) : (
              <EyeIcon className="w-5 h-5" />
            )}
          </button>
        </div>

        {validationError && (
          <p className="text-red-500 text-sm mt-1">{validationError}</p>
        )}

        {testStatus === 'error' && (
          <p className="text-red-500 text-sm mt-1 flex items-center">
            <XIcon className="w-4 h-4 mr-1" data-testid="error-icon" />
            {errorMessage}
          </p>
        )}

        {testStatus === 'success' && (
          <p className="text-green-500 text-sm mt-1 flex items-center">
            <CheckIcon className="w-4 h-4 mr-1" data-testid="success-icon" />
            連線成功
          </p>
        )}
      </div>

      <Button
        variant="secondary"
        onClick={handleTestConnection}
        loading={testing}
        disabled={!apiKey || testing}
      >
        {testing ? '測試中...' : '測試連線'}
      </Button>
    </div>
  )
}
