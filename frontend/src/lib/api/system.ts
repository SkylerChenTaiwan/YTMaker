import { apiClient } from './client'
import type { APIProvider, Preferences, Quotas, ExportData, ImportResult } from '@/types/system'

export const systemApi = {
  // ========== API Keys ==========
  async getAPIKeys() {
    const res = await apiClient.get('/api/v1/system/api-keys')
    return res.data.data
  },

  async saveAPIKey(provider: APIProvider, apiKey: string) {
    const res = await apiClient.post('/api/v1/system/api-keys', {
      provider,
      api_key: apiKey,
    })
    return res.data
  },

  async testAPIKey(provider: APIProvider, apiKey: string) {
    const res = await apiClient.post('/api/v1/system/api-keys/test', {
      provider,
      api_key: apiKey,
    })
    return res.data.data
  },

  async deleteAPIKey(provider: APIProvider) {
    const res = await apiClient.delete(`/api/v1/system/api-keys/${provider}`)
    return res.data
  },

  // ========== Quotas ==========
  async getQuotas(): Promise<Quotas> {
    const res = await apiClient.get('/api/v1/system/quotas')
    return res.data.data
  },

  // ========== Preferences ==========
  async getPreferences(): Promise<Preferences> {
    const res = await apiClient.get('/api/v1/system/preferences')
    return res.data.data
  },

  async savePreferences(preferences: Preferences) {
    const res = await apiClient.post('/api/v1/system/preferences', preferences)
    return res.data
  },

  // ========== Data Management ==========
  async clearCache() {
    const res = await apiClient.post('/api/v1/system/cache/clear')
    return res.data
  },

  async exportData(): Promise<ExportData> {
    const res = await apiClient.get('/api/v1/system/export')
    return res.data.data
  },

  async importData(formData: FormData): Promise<ImportResult> {
    const res = await apiClient.post('/api/v1/system/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return res.data.data
  },

  async resetSettings() {
    const res = await apiClient.post('/api/v1/system/reset')
    return res.data
  },

  async clearAllData() {
    const res = await apiClient.delete('/api/v1/system/data')
    return res.data
  },
}
