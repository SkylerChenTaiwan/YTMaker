import apiClient from './api'
import type { DashboardStats } from '@/types/api'

/**
 * 獲取主控台統計資料
 */
export const getDashboardStats = async (): Promise<DashboardStats> => {
  return apiClient.get('/stats/dashboard')
}

/**
 * 獲取專案統計資料
 */
export const getProjectStats = async (
  projectId: string
): Promise<{ project_id: string; duration: number; file_size: number }> => {
  return apiClient.get(`/stats/projects/${projectId}`)
}
