import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useAuthStore } from '@/store/useAuthStore'

export const YouTubeAuthStep: React.FC = () => {
  const [showSkipModal, setShowSkipModal] = useState(false)
  const { youtube, setYouTubeAuth } = useAuthStore()

  // 監聽 OAuth callback
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // 安全檢查: 驗證 origin
      if (event.origin !== window.location.origin) {
        return
      }

      if (event.data.type === 'youtube-auth-success') {
        setYouTubeAuth({
          connected: true,
          channel_name: event.data.channel_name,
          channel_id: event.data.channel_id,
          thumbnail_url: event.data.thumbnail_url,
        })
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [setYouTubeAuth])

  const handleConnect = () => {
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
        /* 已連結狀態 */
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center">
            <img
              src={youtube.thumbnail_url}
              alt="頻道頭像"
              className="w-16 h-16 rounded-full"
            />
            <div className="ml-4 flex-1">
              <p className="font-medium text-gray-900">
                已連結: {youtube.channel_name}
              </p>
              <p className="text-sm text-gray-500">
                頻道 ID: {youtube.channel_id}
              </p>
            </div>
          </div>
          <Button variant="text" onClick={handleConnect} className="mt-3">
            變更頻道
          </Button>
        </div>
      ) : (
        /* 未連結狀態 */
        <Button variant="primary" onClick={handleConnect} className="w-full">
          連結 YouTube 帳號
        </Button>
      )}

      <button
        className="text-blue-500 hover:underline text-sm"
        onClick={() => setShowSkipModal(true)}
      >
        稍後設定
      </button>

      {/* 跳過確認 Modal */}
      <Modal
        visible={showSkipModal}
        title="跳過 YouTube 授權"
        onOk={() => {
          setShowSkipModal(false)
          // 這裡可以觸發導航到下一步的邏輯
          // 但實際導航應該由父元件處理
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
