import MockAdapter from 'axios-mock-adapter'
import { apiClient } from '@/services/api/client'
import { systemApi } from '@/services/api/systemApi'

// 創建 mock adapter
const mock = new MockAdapter(apiClient['client'])

describe('systemApi - Request Format Tests', () => {
  afterEach(() => {
    mock.reset()
  })

  describe('testApiKey', () => {
    it('should send request body with snake_case format', async () => {
      // Mock 後端回應
      mock.onPost('/api/v1/system/api-keys/test').reply((config) => {
        // 驗證 request body 格式
        const requestBody = JSON.parse(config.data)

        // ✅ 驗證：前端必須轉換成 snake_case
        expect(requestBody).toEqual({
          provider: 'gemini',
          api_key: 'test-key-123', // ✅ 必須是 snake_case，不是 apiKey
        })

        return [
          200,
          {
            success: true,
            data: {
              is_valid: true,
              message: '連線成功',
            },
          },
        ]
      })

      const result = await systemApi.testApiKey({
        provider: 'gemini',
        apiKey: 'test-key-123', // 前端傳入 camelCase
      })

      expect(result.is_valid).toBe(true)
      expect(result.message).toBe('連線成功')
    })

    it('should handle API errors correctly', async () => {
      mock.onPost('/api/v1/system/api-keys/test').reply(400, {
        message: 'API Key 無效',
      })

      await expect(
        systemApi.testApiKey({
          provider: 'gemini',
          apiKey: 'invalid-key',
        })
      ).rejects.toThrow('API Key 無效')
    })
  })

  describe('saveApiKey', () => {
    it('should send request body with snake_case format', async () => {
      // 這是關鍵測試！確保 camelCase → snake_case 轉換正確
      mock.onPost('/api/v1/system/api-keys').reply((config) => {
        const requestBody = JSON.parse(config.data)

        // ✅ 驗證：前端必須轉換成 snake_case
        expect(requestBody).toEqual({
          provider: 'gemini',
          api_key: 'AIza-test-key-456', // ✅ 必須是 snake_case
        })

        // ❌ 如果收到這個格式，測試應該失敗：
        // { provider: 'gemini', apiKey: 'test' }

        return [200, { success: true }]
      })

      const result = await systemApi.saveApiKey({
        provider: 'gemini',
        apiKey: 'AIza-test-key-456', // 前端傳入 camelCase
      })

      expect(result.success).toBe(true)
    })

    it('should handle different providers correctly', async () => {
      const testCases: Array<{
        provider: 'gemini' | 'stability' | 'did'
        apiKey: string
      }> = [
        { provider: 'gemini', apiKey: 'AIza-gemini-key' },
        { provider: 'stability', apiKey: 'sk-stability-key' },
        { provider: 'did', apiKey: 'did-api-key' },
      ]

      for (const testCase of testCases) {
        mock.reset()
        mock.onPost('/api/v1/system/api-keys').reply((config) => {
          const requestBody = JSON.parse(config.data)

          expect(requestBody.provider).toBe(testCase.provider)
          expect(requestBody.api_key).toBe(testCase.apiKey) // ✅ snake_case

          return [200, { success: true }]
        })

        await systemApi.saveApiKey(testCase)
      }
    })
  })

  describe('getApiKeysStatus', () => {
    it('should parse response correctly', async () => {
      const mockResponse = {
        gemini: { configured: true, tested: true },
        stability: { configured: true, tested: false },
        did: { configured: false, tested: false },
      }

      mock.onGet('/api/v1/system/api-keys').reply(200, mockResponse)

      const result = await systemApi.getApiKeysStatus()

      expect(result).toEqual(mockResponse)
      expect(result.gemini.configured).toBe(true)
      expect(result.gemini.tested).toBe(true)
      expect(result.stability.configured).toBe(true)
      expect(result.stability.tested).toBe(false)
      expect(result.did.configured).toBe(false)
    })

    it('should handle empty response', async () => {
      mock.onGet('/api/v1/system/api-keys').reply(200, {
        gemini: { configured: false, tested: false },
        stability: { configured: false, tested: false },
        did: { configured: false, tested: false },
      })

      const result = await systemApi.getApiKeysStatus()

      expect(result.gemini.configured).toBe(false)
      expect(result.stability.configured).toBe(false)
      expect(result.did.configured).toBe(false)
    })
  })
})
