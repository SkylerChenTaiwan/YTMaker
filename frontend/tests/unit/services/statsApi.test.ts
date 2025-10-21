import MockAdapter from 'axios-mock-adapter'
import apiClient from '@/services/api'
import * as statsApi from '@/services/statsApi'

const mock = new MockAdapter(apiClient)

describe('Stats API', () => {
  afterEach(() => {
    mock.reset()
  })

  describe('getDashboardStats', () => {
    it('should get dashboard stats', async () => {
      const mockStats = {
        total_videos: 100,
        monthly_videos: 10,
        scheduled_videos: 5,
        api_quota: {
          did_remaining_minutes: 50,
          did_total_minutes: 100,
          youtube_remaining_units: 8000,
          youtube_total_units: 10000,
        },
      }

      mock.onGet('/stats/dashboard').reply(200, mockStats)

      const result = await statsApi.getDashboardStats()

      expect(result.total_videos).toBe(100)
      expect(result.monthly_videos).toBe(10)
    })
  })

  describe('getProjectStats', () => {
    it('should get project stats', async () => {
      const mockStats = {
        project_id: 'proj-123',
        duration: 120,
        file_size: 10485760,
      }

      mock.onGet('/stats/projects/proj-123').reply(200, mockStats)

      const result = await statsApi.getProjectStats('proj-123')

      expect(result.project_id).toBe('proj-123')
    })
  })
})
