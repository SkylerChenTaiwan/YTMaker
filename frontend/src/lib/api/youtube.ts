import { apiClient } from './client'
import type { YouTubeChannel } from '@/types/system'

export const youtubeApi = {
  // ========== YouTube Authorization ==========
  // 注意：OAuth 授權流程現在直接在前端組件中處理
  // 不再需要呼叫 startAuth API，直接開啟 /api/v1/youtube/auth

  async getChannels(): Promise<YouTubeChannel[]> {
    const res = await apiClient.get('/api/v1/youtube/accounts')
    return res.data.data.accounts || []
  },

  async removeChannel(channelId: string) {
    const res = await apiClient.delete(`/api/v1/youtube/accounts/${channelId}`)
    return res.data
  },
}
