import apiClient from './api'
import type { ApiKeyData, ApiKeyStatus, ApiQuota } from '@/types/api'

/**
 * 測試 API Key 連線
 */
export const testApiKey = async (data: ApiKeyData): Promise<{ success: boolean }> => {
  return apiClient.post('/system/test-api-key', {
    provider: data.provider,
    api_key: data.apiKey,
  })
}

/**
 * 儲存 API Key
 */
export const saveApiKey = async (data: ApiKeyData): Promise<void> => {
  return apiClient.post('/system/api-keys', {
    provider: data.provider,
    api_key: data.apiKey,
  })
}

/**
 * 獲取所有 API Key 狀態
 */
export const getApiKeyStatuses = async (): Promise<ApiKeyStatus[]> => {
  return apiClient.get('/system/api-keys')
}

/**
 * 獲取 API 配額
 */
export const getApiQuota = async (): Promise<ApiQuota> => {
  return apiClient.get('/system/quota')
}
