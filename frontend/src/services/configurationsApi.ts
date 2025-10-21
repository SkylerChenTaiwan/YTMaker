import apiClient from './api'
import type { VisualConfig, PromptTemplate } from '@/types/api'

/**
 * 獲取視覺配置列表
 */
export const getVisualConfigs = async (): Promise<VisualConfig[]> => {
  return apiClient.get('/configurations/visual')
}

/**
 * 獲取單一視覺配置
 */
export const getVisualConfig = async (id: string): Promise<VisualConfig> => {
  return apiClient.get(`/configurations/visual/${id}`)
}

/**
 * 創建視覺配置
 */
export const createVisualConfig = async (data: VisualConfig): Promise<VisualConfig> => {
  return apiClient.post('/configurations/visual', data)
}

/**
 * 刪除視覺配置
 */
export const deleteVisualConfig = async (id: string): Promise<void> => {
  return apiClient.delete(`/configurations/visual/${id}`)
}

/**
 * 獲取 Prompt 範本列表
 */
export const getPromptTemplates = async (): Promise<PromptTemplate[]> => {
  return apiClient.get('/configurations/prompts')
}

/**
 * 創建 Prompt 範本
 */
export const createPromptTemplate = async (
  data: Omit<PromptTemplate, 'id' | 'created_at' | 'usage_count'>
): Promise<PromptTemplate> => {
  return apiClient.post('/configurations/prompts', data)
}
