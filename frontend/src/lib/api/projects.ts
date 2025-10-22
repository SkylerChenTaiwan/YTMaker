import { apiClient } from './client'

export interface PromptTemplate {
  id: string
  name: string
  content: string
  created_at?: string
  updated_at?: string
}

export interface PromptSettings {
  prompt_template_id: string
  prompt_content: string
  gemini_model: 'gemini-1.5-pro' | 'gemini-1.5-flash'
}

export interface YouTubeSettings {
  youtube_title: string
  youtube_description?: string
  youtube_tags: string[]
  privacy: 'public' | 'unlisted' | 'private'
  publish_type: 'immediate' | 'scheduled'
  scheduled_date?: string
  scheduled_time?: string
  ai_content_flag: boolean
}

export interface Project {
  id: string
  project_name: string
  content_source: 'upload' | 'paste'
  content_text: string
  content_file_path?: string
  prompt_template_id?: string
  prompt_content?: string
  gemini_model?: 'gemini-1.5-pro' | 'gemini-1.5-flash'
  youtube_title?: string
  youtube_description?: string
  youtube_tags?: string[]
  privacy?: 'public' | 'unlisted' | 'private'
  publish_type?: 'immediate' | 'scheduled'
  scheduled_datetime?: string
  ai_content_flag?: boolean
  status: string
  created_at: string
  updated_at: string
}

export interface ProjectResult {
  id: string
  project_name: string
  youtube_video_id?: string
  youtube_url?: string
  youtube_title?: string
  youtube_description?: string
  youtube_tags?: string[]
  privacy?: 'public' | 'unlisted' | 'private'
  publish_type?: 'immediate' | 'scheduled'
  published_at?: string
  scheduled_date?: string
  status: string
  local_video_url?: string
}

/**
 * 獲取單個專案
 */
export async function getProject(projectId: string): Promise<Project> {
  const response = await apiClient.get(`/api/v1/projects/${projectId}`)
  return response.data
}

/**
 * 獲取所有 Prompt 範本
 */
export async function getPromptTemplates(): Promise<PromptTemplate[]> {
  const response = await apiClient.get('/api/v1/prompt-templates')
  return response.data
}

/**
 * 創建新的 Prompt 範本
 */
export async function createPromptTemplate(
  data: Omit<PromptTemplate, 'id' | 'created_at' | 'updated_at'>
): Promise<PromptTemplate> {
  const response = await apiClient.post('/api/v1/prompt-templates', data)
  return response.data
}

/**
 * 更新專案的 Prompt 設定
 */
export async function updatePromptSettings(
  projectId: string,
  data: PromptSettings
): Promise<Project> {
  const response = await apiClient.put(
    `/api/v1/projects/${projectId}/prompt-settings`,
    data
  )
  return response.data
}

/**
 * 更新專案的 YouTube 設定
 */
export async function updateYouTubeSettings(
  projectId: string,
  data: YouTubeSettings
): Promise<Project> {
  const response = await apiClient.put(
    `/api/v1/projects/${projectId}/youtube-settings`,
    data
  )
  return response.data
}

/**
 * 開始生成影片
 */
export async function startGeneration(projectId: string): Promise<void> {
  await apiClient.post(`/api/v1/projects/${projectId}/generate`)
}

/**
 * 暫停專案生成
 */
export async function pauseGeneration(projectId: string): Promise<{ success: boolean }> {
  const response = await apiClient.post(`/api/v1/projects/${projectId}/pause`)
  return response.data
}

/**
 * 繼續專案生成
 */
export async function resumeGeneration(projectId: string): Promise<{ success: boolean }> {
  const response = await apiClient.post(`/api/v1/projects/${projectId}/resume`)
  return response.data
}

/**
 * 取消專案生成
 */
export async function cancelGeneration(projectId: string): Promise<{ success: boolean }> {
  const response = await apiClient.post(`/api/v1/projects/${projectId}/cancel`)
  return response.data
}

/**
 * 重試專案生成 (從失敗點繼續)
 */
export async function retryGeneration(projectId: string): Promise<{ success: boolean }> {
  const response = await apiClient.post(`/api/v1/projects/${projectId}/retry`)
  return response.data
}

/**
 * 獲取專案結果
 */
export async function getProjectResult(projectId: string): Promise<ProjectResult> {
  const response = await apiClient.get(`/api/v1/projects/${projectId}/result`)
  return response.data.data
}

/**
 * 下載影片
 */
export async function downloadVideo(
  projectId: string,
  onDownloadProgress?: (progressEvent: any) => void
): Promise<any> {
  return await apiClient.get(`/api/v1/projects/${projectId}/download/video`, {
    responseType: 'blob',
    onDownloadProgress,
  })
}

/**
 * 下載封面
 */
export async function downloadThumbnail(
  projectId: string,
  onDownloadProgress?: (progressEvent: any) => void
): Promise<any> {
  return await apiClient.get(`/api/v1/projects/${projectId}/download/thumbnail`, {
    responseType: 'blob',
    onDownloadProgress,
  })
}

/**
 * 下載所有素材
 */
export async function downloadAssets(
  projectId: string,
  onDownloadProgress?: (progressEvent: any) => void
): Promise<any> {
  return await apiClient.get(`/api/v1/projects/${projectId}/download/assets`, {
    responseType: 'blob',
    onDownloadProgress,
  })
}
