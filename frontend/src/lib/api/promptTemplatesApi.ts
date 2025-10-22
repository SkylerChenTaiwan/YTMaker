// frontend/src/lib/api/promptTemplatesApi.ts
import { apiClient } from './client'
import type { PromptTemplate } from '@/types/models'

interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// 列出所有 Prompt 範本
export async function getPromptTemplates(): Promise<ApiResponse<{ templates: PromptTemplate[] }>> {
  const response = await apiClient.get<ApiResponse<{ templates: PromptTemplate[] }>>('/api/v1/prompt-templates')
  return response.data
}

// 建立 Prompt 範本
export async function createPromptTemplate(data: {
  name: string
  content: string
}): Promise<ApiResponse<{ id: string; name: string }>> {
  const response = await apiClient.post<ApiResponse<{ id: string; name: string }>>('/api/v1/prompt-templates', data)
  return response.data
}

// 更新 Prompt 範本
export async function updatePromptTemplate(id: string, data: any): Promise<ApiResponse<{ id: string }>> {
  const response = await apiClient.put<ApiResponse<{ id: string }>>(`/api/v1/prompt-templates/${id}`, data)
  return response.data
}

// 刪除 Prompt 範本
export async function deletePromptTemplate(id: string): Promise<ApiResponse<{ message: string }>> {
  const response = await apiClient.delete<ApiResponse<{ message: string }>>(`/api/v1/prompt-templates/${id}`)
  return response.data
}

// 取得單一範本詳細資訊
export async function getPromptTemplate(id: string): Promise<ApiResponse<PromptTemplate>> {
  const response = await apiClient.get<ApiResponse<PromptTemplate>>(`/api/v1/prompt-templates/${id}`)
  return response.data
}
