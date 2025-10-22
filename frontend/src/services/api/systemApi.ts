import { apiClient } from './client'

export interface TestApiKeyRequest {
  provider: 'gemini' | 'stability' | 'did'
  apiKey: string
}

export interface TestApiKeyResponse {
  is_valid: boolean
  message: string
}

export interface SaveApiKeyRequest {
  provider: 'gemini' | 'stability' | 'did'
  apiKey: string
}

export interface ApiKeysStatusResponse {
  gemini: { configured: boolean; tested: boolean }
  stability: { configured: boolean; tested: boolean }
  did: { configured: boolean; tested: boolean }
}

export const systemApi = {
  /**
   * 測試 API Key 連線
   */
  async testApiKey(
    data: TestApiKeyRequest
  ): Promise<TestApiKeyResponse> {
    const response = await apiClient.post<{ success: boolean; data: TestApiKeyResponse }>(
      '/api/v1/system/api-keys/test',
      data
    )
    return response.data.data
  },

  /**
   * 儲存 API Key
   */
  async saveApiKey(data: SaveApiKeyRequest): Promise<{ success: boolean }> {
    const response = await apiClient.post<{ success: boolean }>(
      '/api/v1/system/api-keys',
      data
    )
    return response.data
  },

  /**
   * 取得所有 API Keys 狀態
   */
  async getApiKeysStatus(): Promise<ApiKeysStatusResponse> {
    const response = await apiClient.get<ApiKeysStatusResponse>(
      '/api/v1/system/api-keys'
    )
    return response.data
  },
}
