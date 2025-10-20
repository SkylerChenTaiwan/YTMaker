import MockAdapter from 'axios-mock-adapter'
import apiClient from '@/services/api'
import * as systemApi from '@/services/systemApi'

const mock = new MockAdapter(apiClient)

describe('System API', () => {
  afterEach(() => {
    mock.reset()
  })

  describe('testApiKey', () => {
    it('should test API key successfully', async () => {
      mock.onPost('/system/test-api-key').reply(200, {
        success: true,
        message: '連線成功',
      })

      const result = await systemApi.testApiKey({
        provider: 'gemini',
        apiKey: 'test-key',
      })

      expect(result.success).toBe(true)
    })

    it('should handle invalid API key', async () => {
      mock.onPost('/system/test-api-key').reply(400, {
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'API Key 無效',
        },
      })

      await expect(
        systemApi.testApiKey({ provider: 'gemini', apiKey: 'invalid' })
      ).rejects.toThrow()
    })
  })

  describe('saveApiKey', () => {
    it('should save API key', async () => {
      mock.onPost('/system/api-keys').reply(200)

      await systemApi.saveApiKey({
        provider: 'gemini',
        apiKey: 'test-key',
      })

      expect(mock.history.post.length).toBe(1)
    })
  })

  describe('getApiKeyStatuses', () => {
    it('should get all API key statuses', async () => {
      const mockStatuses = [
        {
          provider: 'gemini',
          is_configured: true,
          status: 'valid',
        },
        {
          provider: 'stability_ai',
          is_configured: false,
          status: 'not_tested',
        },
      ]

      mock.onGet('/system/api-keys').reply(200, mockStatuses)

      const result = await systemApi.getApiKeyStatuses()

      expect(result).toHaveLength(2)
      expect(result[0].provider).toBe('gemini')
    })
  })

  describe('getApiQuota', () => {
    it('should get API quota', async () => {
      const mockQuota = {
        did_remaining_minutes: 50,
        did_total_minutes: 100,
        youtube_remaining_units: 8000,
        youtube_total_units: 10000,
      }

      mock.onGet('/system/quota').reply(200, mockQuota)

      const result = await systemApi.getApiQuota()

      expect(result.did_remaining_minutes).toBe(50)
    })
  })
})
