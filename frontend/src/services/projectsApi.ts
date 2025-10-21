import apiClient from './api'
import type {
  Project,
  CreateProjectData,
  UpdateProjectData,
} from '@/types/api'

/**
 * 獲取專案列表
 */
export const getProjects = async (): Promise<Project[]> => {
  return apiClient.get('/projects')
}

/**
 * 獲取單一專案
 */
export const getProject = async (id: string): Promise<Project> => {
  return apiClient.get(`/projects/${id}`)
}

/**
 * 創建新專案
 */
export const createProject = async (data: CreateProjectData): Promise<Project> => {
  return apiClient.post('/projects', {
    project_name: data.projectName,
    content_text: data.contentText,
    content_source: data.contentSource,
  })
}

/**
 * 更新專案
 */
export const updateProject = async (
  id: string,
  data: UpdateProjectData
): Promise<Project> => {
  return apiClient.put(`/projects/${id}`, data)
}

/**
 * 刪除專案
 */
export const deleteProject = async (id: string): Promise<void> => {
  return apiClient.delete(`/projects/${id}`)
}

/**
 * 開始生成影片
 */
export const startGeneration = async (id: string): Promise<void> => {
  return apiClient.post(`/projects/${id}/generate`)
}

/**
 * 獲取生成進度
 */
export const getProgress = async (
  id: string
): Promise<{ stage: string; percentage: number }> => {
  return apiClient.get(`/projects/${id}/progress`)
}

/**
 * 暫停生成
 */
export const pauseGeneration = async (id: string): Promise<void> => {
  return apiClient.post(`/projects/${id}/pause`)
}

/**
 * 繼續生成
 */
export const resumeGeneration = async (id: string): Promise<void> => {
  return apiClient.post(`/projects/${id}/resume`)
}

/**
 * 取消生成
 */
export const cancelGeneration = async (id: string): Promise<void> => {
  return apiClient.post(`/projects/${id}/cancel`)
}

/**
 * 獲取專案結果
 */
export const getResult = async (
  id: string
): Promise<{ video_url: string; thumbnail_url?: string }> => {
  return apiClient.get(`/projects/${id}/result`)
}

/**
 * 重試失敗的專案
 */
export const retryProject = async (id: string): Promise<void> => {
  return apiClient.post(`/projects/${id}/retry`)
}
