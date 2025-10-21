import { apiClient } from './client'
import type { YouTubeChannel } from '@/types/system'

export const youtubeApi = {
  // ========== YouTube Authorization ==========
  async startAuth() {
    const res = await apiClient.post('/api/v1/youtube/auth/start')
    return res.data.data
  },

  async getChannels(): Promise<YouTubeChannel[]> {
    const res = await apiClient.get('/api/v1/youtube/channels')
    return res.data.data.channels || []
  },

  async removeChannel(channelId: string) {
    const res = await apiClient.delete(`/api/v1/youtube/channels/${channelId}`)
    return res.data
  },
}
