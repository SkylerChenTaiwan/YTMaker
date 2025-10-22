'use client'

import { useState, useEffect } from 'react'
import { Button, message } from 'antd'
import { YouTubeChannelCard } from './YouTubeChannelCard'
import { useAuthStore } from '@/store/useAuthStore'
import { youtubeApi } from '@/lib/api/youtube' // 保留用於 removeChannel

export const YouTubeAuthTab = () => {
  const { youtubeChannels, fetchYouTubeChannels } = useAuthStore()
  const [isConnecting, setIsConnecting] = useState(false)

  const loadChannels = async () => {
    try {
      await fetchYouTubeChannels()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '載入頻道列表失敗'
      message.error(errorMessage)
    }
  }

  useEffect(() => {
    loadChannels()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

      // 直接開啟 OAuth 視窗
      const authWindow = window.open(
        `${backendUrl}/api/v1/youtube/auth`,
        'YouTube Authorization',
        'width=600,height=700'
      )

      // 監聽授權成功訊息
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return

        if (event.data.type === 'youtube-auth-success') {
          setIsConnecting(false)
          message.success('YouTube 帳號已連結')
          loadChannels()
          window.removeEventListener('message', handleMessage)
        }
      }

      window.addEventListener('message', handleMessage)

      // 輪詢檢查視窗是否關閉
      const checkAuth = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(checkAuth)
          setIsConnecting(false)
          window.removeEventListener('message', handleMessage)
        }
      }, 1000)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '授權失敗'
      message.error(errorMessage)
      setIsConnecting(false)
    }
  }

  const handleRemove = async (channelId: string) => {
    try {
      await youtubeApi.removeChannel(channelId)
      message.success('授權已移除')
      await loadChannels()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '移除失敗'
      message.error(errorMessage)
    }
  }

  const handleReauthorize = async (_channelId: string) => {
    // 重新授權與連結新帳號流程相同
    await handleConnect()
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">YouTube 授權</h2>

      <p className="text-gray-600 mb-6">
        您可以連結多個 YouTube 帳號，在生成影片時選擇要上傳的頻道
      </p>

      {/* 已連結帳號 */}
      {youtubeChannels.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {youtubeChannels.map((channel) => (
            <YouTubeChannelCard
              key={channel.id}
              channel={channel}
              onRemove={handleRemove}
              onReauthorize={handleReauthorize}
            />
          ))}
        </div>
      )}

      {youtubeChannels.length === 0 && (
        <p className="text-gray-500 mb-6">尚未連結任何 YouTube 帳號</p>
      )}

      {/* 連結新帳號 */}
      <Button
        type="primary"
        size="large"
        onClick={handleConnect}
        loading={isConnecting}
      >
        連結新的 YouTube 帳號
      </Button>
    </div>
  )
}
