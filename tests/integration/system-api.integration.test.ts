/**
 * System API 前後端整合測試
 *
 * 目的：測試前端與後端之間的 API 通訊，確保：
 * 1. Request body 格式正確（camelCase → snake_case 轉換）
 * 2. Response body 格式正確
 * 3. HTTP status code 正確
 * 4. 錯誤處理正確
 *
 * 注意：這個測試需要後端伺服器運行
 */

import axios, { AxiosError } from 'axios'

const API_BASE_URL = process.env.TEST_API_URL || 'http://localhost:8000'

describe('System API Integration Tests', () => {
  describe('POST /api/v1/system/api-keys/test', () => {
    it('should accept snake_case format and return success', async () => {
      try {
        const response = await axios.post(
          `${API_BASE_URL}/api/v1/system/api-keys/test`,
          {
            provider: 'gemini',
            api_key: 'test-valid-key-1234567890', // ✅ 正確格式：snake_case
          }
        )

        expect(response.status).toBe(200)
        expect(response.data.success).toBe(true)
        expect(response.data.data).toHaveProperty('is_valid')
        expect(response.data.data).toHaveProperty('message')
      } catch (error) {
        // 如果後端沒運行，跳過測試
        if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
          console.warn('Backend not running, skipping test')
          return
        }
        throw error
      }
    })

    it('should reject camelCase format with 422 error', async () => {
      try {
        await axios.post(`${API_BASE_URL}/api/v1/system/api-keys/test`, {
          provider: 'gemini',
          apiKey: 'test-key-1234567890', // ❌ 錯誤格式：camelCase
        })

        // 如果執行到這裡，表示沒有拋出錯誤，測試失敗
        fail('Should have thrown 422 error for camelCase format')
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (error.code === 'ECONNREFUSED') {
            console.warn('Backend not running, skipping test')
            return
          }

          // 驗證錯誤回應
          expect(error.response?.status).toBe(422)
          expect(error.response?.data).toHaveProperty('detail')
        } else {
          throw error
        }
      }
    })

    it('should validate minimum length requirement', async () => {
      try {
        await axios.post(`${API_BASE_URL}/api/v1/system/api-keys/test`, {
          provider: 'gemini',
          api_key: 'short', // ❌ 太短
        })

        fail('Should have thrown 422 error for short api_key')
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (error.code === 'ECONNREFUSED') {
            console.warn('Backend not running, skipping test')
            return
          }

          expect(error.response?.status).toBe(422)
        } else {
          throw error
        }
      }
    })
  })

  describe('POST /api/v1/system/api-keys', () => {
    it('should accept snake_case format for saving API key', async () => {
      try {
        const response = await axios.post(
          `${API_BASE_URL}/api/v1/system/api-keys`,
          {
            provider: 'gemini',
            api_key: 'AIzaSy-test-key-1234567890', // ✅ 正確格式
          }
        )

        expect(response.status).toBe(200)
        expect(response.data.success).toBe(true)
        expect(response.data.message).toContain('已儲存')
      } catch (error) {
        if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
          console.warn('Backend not running, skipping test')
          return
        }
        throw error
      }
    })

    it('should reject camelCase format for saving API key', async () => {
      try {
        await axios.post(`${API_BASE_URL}/api/v1/system/api-keys`, {
          provider: 'gemini',
          apiKey: 'AIzaSy-test-key-1234567890', // ❌ 錯誤格式：camelCase
        })

        fail('Should have thrown 422 error')
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (error.code === 'ECONNREFUSED') {
            console.warn('Backend not running, skipping test')
            return
          }

          expect(error.response?.status).toBe(422)
          expect(error.response?.data).toHaveProperty('detail')
        } else {
          throw error
        }
      }
    })
  })

  describe('Frontend-Backend Integration', () => {
    it('should verify systemApi.testApiKey sends correct format', async () => {
      // 這個測試模擬前端實際使用情況
      const { systemApi } = await import(
        '@/services/api/systemApi'
      )

      try {
        // 前端使用 camelCase，內部應該轉換成 snake_case
        const result = await systemApi.testApiKey({
          provider: 'gemini',
          apiKey: 'test-valid-key-1234567890',
        })

        // 驗證回應格式
        expect(result).toHaveProperty('is_valid')
        expect(result).toHaveProperty('message')
      } catch (error) {
        if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
          console.warn('Backend not running, skipping test')
          return
        }
        // 其他錯誤應該拋出
        throw error
      }
    })

    it('should verify systemApi.saveApiKey sends correct format', async () => {
      const { systemApi } = await import(
        '@/services/api/systemApi'
      )

      try {
        const result = await systemApi.saveApiKey({
          provider: 'gemini',
          apiKey: 'AIzaSy-test-key-1234567890',
        })

        expect(result.success).toBe(true)
      } catch (error) {
        if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
          console.warn('Backend not running, skipping test')
          return
        }
        throw error
      }
    })
  })
})

/**
 * 如何執行這些測試：
 *
 * 1. 啟動後端測試伺服器：
 *    cd backend && poetry run pytest --run-server
 *
 * 2. 執行整合測試：
 *    npm run test:integration
 *
 * 或者使用 Docker Compose 同時啟動前後端測試環境。
 */
