import apiClient from './api'
import type { BatchTask, CreateBatchData } from '@/types/api'
import type { BatchDetailTask } from '@/store/useBatchStore'

/**
 * 獲取批次任務列表
 */
export const getBatchTasks = async (): Promise<{ batches: BatchTask[] }> => {
  return apiClient.get('/batch')
}

/**
 * 獲取單一批次任務詳情
 */
export const getBatchDetail = async (id: string): Promise<BatchDetailTask> => {
  return apiClient.get(`/batch/${id}`)
}

/**
 * 創建批次任務
 */
export const createBatchTask = async (data: CreateBatchData): Promise<{ batch_id: string; total_projects: number; status: string }> => {
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
export const pauseBatchTask = async (id: string): Promise<{ status: string }> => {
  return apiClient.post(`/batch/${id}/pause`)
}

/**
 * 繼續批次任務
 */
export const resumeBatchTask = async (id: string): Promise<{ status: string }> => {
  return apiClient.post(`/batch/${id}/resume`)
}

/**
 * 重試失敗的專案
 */
export const retryFailedProjects = async (id: string): Promise<{ retrying_projects: string[]; count: number }> => {
  return apiClient.post(`/batch/${id}/retry-failed`)
}

/**
 * 刪除批次任務
 */
export const deleteBatchTask = async (id: string): Promise<void> => {
  return apiClient.delete(`/batch/${id}`)
}

/**
 * 下載批次報告
 */
export const downloadBatchReport = async (id: string): Promise<Blob> => {
  const response = await apiClient.get(`/batch/${id}/report`, {
    responseType: 'blob',
  })
  return response as unknown as Blob
}
