import { apiClient } from './client'

export interface YouTubeAccount {
  id: string
  channel_name: string
  channel_id: string
  thumbnail_url?: string
  subscriber_count: number
  is_authorized: boolean
  authorized_at: string
}

export interface YouTubeAccountsResponse {
  success: boolean
  data: {
    accounts: YouTubeAccount[]
  }
}

export const youtubeApi = {
  /**
   * 取得所有已連結的 YouTube 帳號
   */
  async getAccounts(): Promise<YouTubeAccountsResponse> {
    const response = await apiClient.get<YouTubeAccountsResponse>('/youtube/accounts')
    return response.data
  },

  /**
   * 刪除 YouTube 授權
   */
  async deleteAccount(accountId: string): Promise<void> {
    await apiClient.delete(`/youtube/accounts/${accountId}`)
  },
}
