import { statsApi } from '@/services/api/stats'
import { axiosInstance } from '@/services/api/axios'

jest.mock('@/services/api/axios')

describe('Stats API', () => {
  describe('getStats', () => {
    it('should fetch statistics', async () => {
      const mockStats = {
        total_projects: 15,
        completed_projects: 12,
        this_month_generated: 5,
        scheduled_videos: 3,
        api_quota: {
          did_remaining_minutes: 60,
          did_total_minutes: 90,
          youtube_remaining_units: 8000,
          youtube_total_units: 10000,
        }
      }

      const mockResponse = {
        data: { data: mockStats }
      }

      ;(axiosInstance.get as jest.Mock).mockResolvedValue(mockResponse)

      const result = await statsApi.getStats()

      expect(axiosInstance.get).toHaveBeenCalledWith('/api/v1/stats')
      expect(result).toEqual(mockStats)
    })
  })
})
