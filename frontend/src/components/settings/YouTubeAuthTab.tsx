'use client'

import { useState, useEffect } from 'react'
import { Button, message } from 'antd'
import { YouTubeChannelCard } from './YouTubeChannelCard'
import { useAuthStore } from '@/store/useAuthStore'
import { youtubeApi } from '@/lib/api/youtube'

export const YouTubeAuthTab = () => {
  const { youtubeChannels, fetchYouTubeChannels, setYouTubeChannels } = useAuthStore()
  const [isConnecting, setIsConnecting] = useState(false)

  useEffect(() => {
    loadChannels()
  }, [])

  const loadChannels = async () => {
    try {
      await fetchYouTubeChannels()
    } catch (error: any) {
      message.error(error.message || '載入頻道列表失敗')
    }
  }

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      const { auth_url } = await youtubeApi.startAuth()

      // 開啟 OAuth 視窗
      const authWindow = window.open(
        auth_url,
        'YouTube Authorization',
        'width=600,height=700'
      )

      // 輪詢檢查授權是否完成
      const checkAuth = setInterval(async () => {
        if (authWindow?.closed) {
          clearInterval(checkAuth)
          setIsConnecting(false)
          // 重新取得頻道列表
          await loadChannels()
          message.success('YouTube 帳號已連結')
        }
      }, 1000)
    } catch (error: any) {
      message.error(error.message || '授權失敗')
      setIsConnecting(false)
    }
  }

  const handleRemove = async (channelId: string) => {
    try {
      await youtubeApi.removeChannel(channelId)
      message.success('授權已移除')
      await loadChannels()
    } catch (error: any) {
      message.error(error.message || '移除失敗')
    }
  }

  const handleReauthorize = async (channelId: string) => {
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
