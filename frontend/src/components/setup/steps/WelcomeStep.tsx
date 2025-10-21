import React from 'react'

export const WelcomeStep: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">歡迎使用 YTMaker</h2>
        <p className="text-gray-600 mb-4">
          YTMaker 是一個智能影片生成工具,可以幫助您快速將文字內容轉換為專業的 YouTube 影片。
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">設定流程</h3>
        <div className="space-y-3">
          <div className="flex items-start">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold mr-3">
              1
            </div>
            <div>
              <h4 className="font-medium mb-1">設定 API Keys</h4>
              <p className="text-sm text-gray-600">
                配置 Gemini、Stability AI 和 D-ID 的 API 金鑰
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold mr-3">
              2
            </div>
            <div>
              <h4 className="font-medium mb-1">連結 YouTube 帳號</h4>
              <p className="text-sm text-gray-600">
                授權您的 YouTube 帳號以便自動上傳影片（可選）
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold mr-3">
              3
            </div>
            <div>
              <h4 className="font-medium mb-1">開始使用</h4>
              <p className="text-sm text-gray-600">
                完成設定後即可開始創建您的第一支影片
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">準備好了嗎？</h4>
        <p className="text-sm text-blue-700">
          點擊「下一步」開始設定您的 API Keys
        </p>
      </div>
    </div>
  )
}
