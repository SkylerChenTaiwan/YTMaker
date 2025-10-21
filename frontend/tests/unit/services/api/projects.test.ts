import { projectsApi } from '@/services/api/projects'
import { axiosInstance } from '@/services/api/axios'

jest.mock('@/services/api/axios')

describe('Projects API', () => {
  describe('getProjects', () => {
    it('should fetch projects with correct params', async () => {
      const mockResponse = {
        data: {
          data: {
            projects: [],
            pagination: { total: 0, limit: 20, offset: 0 }
          }
        }
      }

      ;(axiosInstance.get as jest.Mock).mockResolvedValue(mockResponse)

      const result = await projectsApi.getProjects({
        limit: 20,
        offset: 0,
        status: 'COMPLETED',
      })

      expect(axiosInstance.get).toHaveBeenCalledWith('/api/v1/projects', {
        params: { limit: 20, offset: 0, status: 'COMPLETED' }
      })
      expect(result).toEqual(mockResponse.data.data)
    })
  })

  describe('deleteProject', () => {
    it('should delete project by id', async () => {
      ;(axiosInstance.delete as jest.Mock).mockResolvedValue({})

      await projectsApi.deleteProject('proj-001')

      expect(axiosInstance.delete).toHaveBeenCalledWith('/api/v1/projects/proj-001')
    })
  })
})
