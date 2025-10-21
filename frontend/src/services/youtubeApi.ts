import apiClient from './api'
import type { YouTubeChannel } from '@/types/api'

/**
 * 獲取 YouTube 授權 URL
 */
export const getAuthUrl = async (): Promise<{ auth_url: string }> => {
  return apiClient.get('/youtube/auth-url')
}

/**
 * 處理 OAuth Callback
 */
export const handleCallback = async (code: string): Promise<YouTubeChannel> => {
  return apiClient.post('/youtube/callback', { code })
}

/**
 * 獲取已連結的 YouTube 頻道列表
 */
export const getChannels = async (): Promise<YouTubeChannel[]> => {
  return apiClient.get('/youtube/channels')
}

/**
 * 移除 YouTube 授權
 */
export const removeChannel = async (channelId: string): Promise<void> => {
  return apiClient.delete(`/youtube/channels/${channelId}`)
}
