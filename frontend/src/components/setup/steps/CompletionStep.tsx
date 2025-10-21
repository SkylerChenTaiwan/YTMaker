import React from 'react'
import { useAuthStore } from '@/store/useAuthStore'

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={3}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
)

export const CompletionStep: React.FC = () => {
  const { apiKeys, youtube } = useAuthStore()

  const allApiKeysTested =
    apiKeys.gemini.tested &&
    apiKeys.stabilityAI.tested &&
    apiKeys.dId.tested

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckIcon className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2">設定完成!</h2>
        <p className="text-gray-600">
          恭喜!您已完成所有必要設定,現在可以開始使用 YTMaker 了。
        </p>
      </div>

      <div className="bg-gray-50 rounded-lg p-6 space-y-4">
        <h3 className="font-semibold text-lg mb-3">設定摘要</h3>

        <div className="space-y-3">
          <div className="flex items-center">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${
                allApiKeysTested ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              {allApiKeysTested && (
                <CheckIcon className="w-4 h-4 text-white" />
              )}
            </div>
            <div>
              <p className="font-medium">API Keys</p>
              <p className="text-sm text-gray-600">
                {allApiKeysTested
                  ? '所有 API Keys 已設定並測試成功'
                  : '部分 API Keys 未設定'}
              </p>
            </div>
          </div>

          <div className="flex items-center">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${
                youtube.connected ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              {youtube.connected && (
                <CheckIcon className="w-4 h-4 text-white" />
              )}
            </div>
            <div>
              <p className="font-medium">YouTube 授權</p>
              <p className="text-sm text-gray-600">
                {youtube.connected
                  ? `已連結: ${youtube.channel_name}`
                  : '未連結（可稍後設定）'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {!allApiKeysTested && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-700">
            ⚠️ 部分 API Keys 未設定,可能會影響某些功能。您可以稍後在「系統設定」中完成配置。
          </p>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">準備就緒</h4>
        <p className="text-sm text-blue-700">
          點擊「進入主控台」開始創建您的第一支影片!
        </p>
      </div>
    </div>
  )
}
