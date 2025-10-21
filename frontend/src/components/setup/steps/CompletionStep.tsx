import { useAuthStore } from '@/store/useAuthStore'

export const CompletionStep: React.FC = () => {
  const { apiKeys, youtube } = useAuthStore()

  // 計算已設定的 API Keys 數量
  const apiKeyCount = [
    apiKeys.gemini.tested,
    apiKeys.stabilityAI.tested,
    apiKeys.dId.tested,
  ].filter(Boolean).length

  const allComplete = apiKeyCount === 3 && youtube.connected

  return (
    <div className="text-center space-y-6 py-8">
      {/* 成功圖示 */}
      <div className="flex justify-center">
        <svg
          className="w-24 h-24 text-green-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          role="img"
          aria-label="Success icon"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      {/* 標題 */}
      <h2 className="text-3xl font-bold text-gray-900">
        {allComplete ? '所有設定已完成!' : '基本設定已完成!'}
      </h2>

      {/* 設定摘要 */}
      <div className="max-w-md mx-auto space-y-3">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
          <span>API Keys</span>
          <span
            className={apiKeyCount === 3 ? 'text-green-600' : 'text-yellow-600'}
          >
            已設定 {apiKeyCount}/3
          </span>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
          <span>YouTube 授權</span>
          <span className={youtube.connected ? 'text-green-600' : 'text-gray-400'}>
            {youtube.connected ? `已連結 ${youtube.channel_name}` : '未連結'}
          </span>
        </div>
      </div>

      {/* 警告訊息 */}
      {!allComplete && (
        <div className="max-w-md mx-auto p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">
            部分設定未完成,部分功能可能無法使用。
            您可以稍後在設定頁面完成配置。
          </p>
        </div>
      )}
    </div>
  )
}
