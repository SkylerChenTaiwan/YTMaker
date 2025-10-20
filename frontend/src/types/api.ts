// ========== 通用型別 ==========

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface ApiError {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

// ========== Project 相關型別 ==========

export type ProjectStatus =
  | 'INITIALIZED'
  | 'SCRIPT_GENERATING'
  | 'SCRIPT_GENERATED'
  | 'ASSETS_GENERATING'
  | 'ASSETS_GENERATED'
  | 'RENDERING'
  | 'RENDERED'
  | 'THUMBNAIL_GENERATING'
  | 'THUMBNAIL_GENERATED'
  | 'UPLOADING'
  | 'COMPLETED'
  | 'FAILED'
  | 'PAUSED'

export interface Project {
  id: string
  project_name: string
  status: ProjectStatus
  content_text: string
  content_source: 'upload' | 'paste'
  visual_config?: VisualConfig
  prompt_config?: PromptConfig
  youtube_config?: YouTubeConfig
  created_at: string
  updated_at: string
}

export interface CreateProjectData {
  projectName: string
  contentText: string
  contentSource: 'upload' | 'paste'
}

export interface UpdateProjectData {
  project_name?: string
  visual_config?: VisualConfig
  prompt_config?: PromptConfig
  youtube_config?: YouTubeConfig
}

// ========== Configuration 相關型別 ==========

export interface VisualConfig {
  subtitle?: SubtitleConfig
  logo?: LogoConfig
  overlay_elements?: OverlayElement[]
  segment_overrides?: Record<number, SegmentOverride>
}

export interface SubtitleConfig {
  font_family: string
  font_size: number
  font_color: string
  position: { x: number; y: number }
  border_enabled: boolean
  border_color?: string
  border_width?: number
  shadow_enabled: boolean
  shadow_color?: string
  shadow_offset_x?: number
  shadow_offset_y?: number
  background_enabled: boolean
  background_color?: string
  background_opacity?: number
}

export interface LogoConfig {
  logo_file?: string
  logo_x: number
  logo_y: number
  logo_size: number
  logo_opacity: number
}

export interface OverlayElement {
  id: string
  type: 'text' | 'image' | 'shape'
  x: number
  y: number
  width?: number
  height?: number
  content?: string
  style?: Record<string, unknown>
}

export interface SegmentOverride {
  segment_index: number
  config: Partial<VisualConfig>
}

// ========== Prompt 相關型別 ==========

export interface PromptConfig {
  template_id: string
  prompt_content: string
  gemini_model: 'gemini-1.5-pro' | 'gemini-1.5-flash'
}

export interface PromptTemplate {
  id: string
  name: string
  content: string
  created_at: string
  usage_count: number
}

// ========== YouTube 相關型別 ==========

export interface YouTubeConfig {
  title: string
  description: string
  tags: string[]
  privacy: 'public' | 'unlisted' | 'private'
  publish_type: 'immediate' | 'scheduled'
  scheduled_date?: string
  scheduled_time?: string
  ai_content_flag: boolean
}

export interface YouTubeChannel {
  id: string
  name: string
  avatar_url: string
  subscriber_count: number
  authorized_at: string
}

// ========== System 相關型別 ==========

export interface ApiKeyData {
  provider: 'gemini' | 'stability_ai' | 'did'
  apiKey: string
}

export interface ApiKeyStatus {
  provider: string
  is_configured: boolean
  last_tested_at?: string
  status: 'valid' | 'invalid' | 'not_tested'
}

export interface ApiQuota {
  did_remaining_minutes: number
  did_total_minutes: number
  youtube_remaining_units: number
  youtube_total_units: number
}

// ========== Stats 相關型別 ==========

export interface DashboardStats {
  total_videos: number
  monthly_videos: number
  scheduled_videos: number
  api_quota: ApiQuota
}

// ========== Batch 相關型別 ==========

export interface BatchTask {
  id: string
  task_name: string
  project_count: number
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PAUSED'
  success_count: number
  failed_count: number
  created_at: string
}

export interface CreateBatchData {
  task_name: string
  files: File[]
  template_id?: string
  prompt_template_id?: string
  gemini_model: 'gemini-1.5-pro' | 'gemini-1.5-flash'
  youtube_config: YouTubeConfig
}
