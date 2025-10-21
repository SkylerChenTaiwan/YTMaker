import { axiosInstance } from './axios'

export interface Stats {
  total_projects: number
  completed_projects: number
  in_progress_projects: number
  failed_projects: number
  this_month_generated: number
  scheduled_videos: number
  api_quota: {
    did_remaining_minutes: number
    did_total_minutes: number
    youtube_remaining_units: number
    youtube_total_units: number
  }
}

export const statsApi = {
  async getStats(): Promise<Stats> {
    const { data } = await axiosInstance.get('/api/v1/stats')
    return data.data
  },
}
