// frontend/src/lib/api/configurationsApi.ts
import { apiClient } from './client'
import type { Configuration, VisualTemplate } from '@/types/models'

interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// 列出所有配置
export async function getConfigurations(): Promise<ApiResponse<{ configurations: Configuration[] }>> {
  const response = await apiClient.get<ApiResponse<{ configurations: Configuration[] }>>('/api/v1/configurations')
  return response.data
}

// 建立配置
export async function createConfiguration(data: {
  name: string
  configuration_data: Record<string, unknown>
}): Promise<ApiResponse<{ id: string; name: string }>> {
  const response = await apiClient.post<ApiResponse<{ id: string; name: string }>>('/api/v1/configurations', data)
  return response.data
}

// 更新配置
export async function updateConfiguration(id: string, data: Record<string, unknown>): Promise<ApiResponse<{ id: string }>> {
  const response = await apiClient.put<ApiResponse<{ id: string }>>(`/api/v1/configurations/${id}`, data)
  return response.data
}

// 刪除配置
export async function deleteConfiguration(id: string): Promise<ApiResponse<{ message: string }>> {
  const response = await apiClient.delete<ApiResponse<{ message: string }>>(`/api/v1/configurations/${id}`)
  return response.data
}

// 複製配置
export async function copyConfiguration(id: string): Promise<ApiResponse<{ id: string; name: string }>> {
  const response = await apiClient.post<ApiResponse<{ id: string; name: string }>>(
    `/api/v1/configurations/${id}/copy`
  )
  return response.data
}

// 列出視覺配置模板
export async function getVisualTemplates(): Promise<ApiResponse<{ templates: VisualTemplate[] }>> {
  const response = await apiClient.get<ApiResponse<{ configurations: Configuration[] }>>(
    '/api/v1/configurations'
  )
  // 轉換 Configuration 為 VisualTemplate 格式以保持前端元件不變
  const configurations = response.data.data?.configurations || []
  return {
    ...response.data,
    data: {
      templates: configurations.map(config => ({
        id: config.id,
        name: config.name,
        description: '', // configurations 沒有 description 欄位，使用空字串
        thumbnail_url: null, // configurations 沒有 thumbnail_url 欄位
        configuration_data: config.configuration_data,
        created_at: config.created_at,
        usage_count: config.usage_count
      }))
    }
  }
}

// 刪除視覺模板
export async function deleteVisualTemplate(id: string): Promise<ApiResponse<{ message: string }>> {
  const response = await apiClient.delete<ApiResponse<{ message: string }>>(`/api/v1/configurations/${id}`)
  return response.data
}
