import apiClient from './api'
import type { BatchTask, CreateBatchData } from '@/types/api'

/**
 * 獲取批次任務列表
 */
export const getBatchTasks = async (): Promise<BatchTask[]> => {
  return apiClient.get('/batch')
}

/**
 * 獲取單一批次任務
 */
export const getBatchTask = async (id: string): Promise<BatchTask> => {
  return apiClient.get(`/batch/${id}`)
}

/**
 * 創建批次任務
 */
export const createBatchTask = async (data: CreateBatchData): Promise<BatchTask> => {
  const formData = new FormData()
  formData.append('task_name', data.task_name)
  data.files.forEach((file) => formData.append('files', file))
  if (data.template_id) formData.append('template_id', data.template_id)
  if (data.prompt_template_id)
    formData.append('prompt_template_id', data.prompt_template_id)
  formData.append('gemini_model', data.gemini_model)
  formData.append('youtube_config', JSON.stringify(data.youtube_config))

  return apiClient.post('/batch', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

/**
 * 暫停批次任務
 */
export const pauseBatchTask = async (id: string): Promise<void> => {
  return apiClient.post(`/batch/${id}/pause`)
}

/**
 * 繼續批次任務
 */
export const resumeBatchTask = async (id: string): Promise<void> => {
  return apiClient.post(`/batch/${id}/resume`)
}
