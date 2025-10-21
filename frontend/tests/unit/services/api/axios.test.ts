import { axiosInstance } from '@/services/api/axios'

describe('Axios Instance', () => {
  it('should have correct base configuration', () => {
    expect(axiosInstance.defaults.baseURL).toBeDefined()
    expect(axiosInstance.defaults.timeout).toBe(30000)
    expect(axiosInstance.defaults.headers['Content-Type']).toBe('application/json')
  })
})
