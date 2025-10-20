// src/app/setup/page.tsx
export default function SetupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-center mb-6">設定精靈</h1>
        <p className="text-gray-600 text-center mb-8">
          歡迎使用 YTMaker!首次啟動需要設定 API Keys 和 YouTube 授權。
        </p>
        {/* 完整實作在 Task-020 */}
        <div className="text-center text-sm text-gray-500">
          <p>設定項目:</p>
          <ul className="mt-4 space-y-2">
            <li>• Google Gemini API Key</li>
            <li>• Stability AI API Key</li>
            <li>• D-ID API Key</li>
            <li>• YouTube OAuth 授權</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
