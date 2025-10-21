export const WelcomeStep: React.FC = () => {
  return (
    <div className="text-center space-y-6 py-12">
      <h1 className="text-4xl font-bold text-gray-900">
        歡迎使用 YTMaker
      </h1>

      <p className="text-xl text-gray-600 max-w-2xl mx-auto">
        這是一個本地端的 YouTube 影片自動化生產工具
      </p>

      <div className="space-y-4 text-gray-700">
        <p>🎬 自動生成腳本</p>
        <p>🖼️ 自動生成圖片</p>
        <p>🎙️ 自動生成語音</p>
        <p>🎥 自動合成影片</p>
        <p>📤 自動上傳 YouTube</p>
      </div>

      <div className="mt-8">
        <p className="text-sm text-gray-500">
          讓我們先完成一些基本設定
        </p>
      </div>
    </div>
  )
}
