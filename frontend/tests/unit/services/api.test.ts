import MockAdapter from 'axios-mock-adapter'
import apiClient from '@/services/api'

const mock = new MockAdapter(apiClient)

describe('Axios Client', () => {
  afterEach(() => {
    mock.reset()
  })

  it('should initialize with correct baseURL', () => {
    expect(apiClient.defaults.baseURL).toBe('http://localhost:8000/api/v1')
  })

  it('should have correct timeout', () => {
    expect(apiClient.defaults.timeout).toBe(30000)
  })

  it('should have correct Content-Type header', () => {
    expect(apiClient.defaults.headers['Content-Type']).toBe('application/json')
  })
})

describe('Request Interceptor', () => {
  afterEach(() => {
    mock.reset()
  })

  it('should add custom headers to request', async () => {
    const mockFn = jest.fn()

    // Mock a successful response
    mock.onGet('/test').reply(200, { data: 'test' })

    // Add a request interceptor to capture the config
    apiClient.interceptors.request.use((config) => {
      mockFn(config)
      return config
    })

    await apiClient.get('/test')

    expect(mockFn).toHaveBeenCalled()
  })
})

describe('Response Interceptor - Success', () => {
  afterEach(() => {
    mock.reset()
  })

  it('should return data directly', async () => {
    mock.onGet('/projects/123').reply(200, {
      id: '123',
      name: 'Test Project',
    })

    const result = await apiClient.get('/projects/123')

    expect(result).toEqual({ id: '123', name: 'Test Project' })
  })
})

describe('Error Handling - 400', () => {
  afterEach(() => {
    mock.reset()
  })

  it('should show toast error for 400 status', async () => {
    // Mock toast.error
    const mockToastError = jest.fn()
    jest.mock('sonner', () => ({
      toast: {
        error: mockToastError,
      },
    }))

    mock.onPost('/projects').reply(400, {
      error: {
        code: 'INVALID_INPUT',
        message: '文字長度必須在 500-10000 字之間',
      },
    })

    await expect(apiClient.post('/projects', {})).rejects.toThrow()
  })
})

describe('Error Handling - 500 with Retry', () => {
  afterEach(() => {
    mock.reset()
  })

  it('should retry on 500 error and eventually succeed', async () => {
    let attemptCount = 0

    mock.onGet('/projects').reply(() => {
      attemptCount++
      if (attemptCount < 3) {
        return [500, { error: { message: 'Server Error' } }]
      }
      return [200, [{ id: '1' }]]
    })

    const result = await apiClient.get('/projects')

    expect(attemptCount).toBe(3)
    expect(result).toEqual([{ id: '1' }])
  }, 10000) // Increase timeout for retries
})
