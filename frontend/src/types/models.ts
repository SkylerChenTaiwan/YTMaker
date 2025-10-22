// ========== YouTube Account ==========
export interface YouTubeAccount {
  id: string
  channel_name: string
  channel_id: string
  avatar_url: string
  authorized_at: string
}

// ========== User Preferences ==========
export interface UserPreferences {
  voice_gender: 'male' | 'female'
  voice_speed: number
  default_privacy: 'public' | 'unlisted' | 'private'
  keep_intermediate_assets: boolean
  notification_enabled: boolean
}

// ========== Project ==========
export interface SubTask {
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  progress: number
  total?: number
}

export interface Stage {
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  progress: number
  subtasks?: {
    audio?: SubTask
    images?: SubTask
    avatar?: SubTask
  }
}

export interface ProjectProgress {
  overall: number
  stage: string
  message: string
  estimatedTime?: string
  stages: {
    script: Stage
    assets: Stage
    render: Stage
    thumbnail: Stage
    upload: Stage
  }
}

export interface ProjectError {
  stage: string
  message: string
  code: string
  timestamp: string
}

export interface Project {
  id: string
  project_name: string
  status: ProjectStatus
  content_text: string
  created_at: string
  updated_at: string
  progress?: ProjectProgress
  error?: ProjectError
}

export type ProjectStatus =
  | 'INITIALIZED'
  | 'SCRIPT_GENERATING'
  | 'SCRIPT_GENERATED'
  | 'ASSETS_GENERATING'
  | 'ASSETS_GENERATED'
  | 'RENDERING'
  | 'RENDERED'
  | 'UPLOADING'
  | 'COMPLETED'
  | 'FAILED'
  | 'PAUSED'

// ========== Generation Progress ==========
export type GenerationStage =
  | 'INITIALIZED'
  | 'SCRIPT_GENERATING'
  | 'SCRIPT_GENERATED'
  | 'ASSETS_GENERATING'
  | 'ASSETS_GENERATED'
  | 'RENDERING'
  | 'RENDERED'
  | 'UPLOADING'
  | 'COMPLETED'

export interface LogEntry {
  timestamp: string
  level: 'info' | 'warning' | 'error'
  message: string
}

// ========== Batch Task ==========
export interface BatchTask {
  id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  created_at: string
}

// ========== Visual Configuration ==========
export interface VisualConfig {
  subtitle: SubtitleConfig
  logo: LogoConfig
  overlays: OverlayConfig[]
}

export interface SubtitleConfig {
  font_size: number
  font_color: string
  position: { x: number; y: number }
  border_width: number
  border_color: string
  shadow: boolean
}

export interface LogoConfig {
  enabled: boolean
  position: { x: number; y: number }
  size: { width: number; height: number }
  opacity: number
}

export interface OverlayConfig {
  id: string
  type: 'text' | 'image' | 'shape'
  content: string
  position: { x: number; y: number }
}

// ========== Configuration ==========
export interface Configuration {
  id: string
  name: string
  configuration_data: {
    subtitle?: {
      position: 'top' | 'center' | 'bottom'
      font_size: number
      color: string
      bg_color: string
      bg_opacity: number
    }
    logo?: {
      url: string
      position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
      size: number
      offset_x: number
      offset_y: number
      opacity: number
    }
    overlays?: Array<{
      type: 'text' | 'shape' | 'image'
      x: number
      y: number
      [key: string]: any
    }>
  }
  created_at: string
  last_used_at: string | null
  usage_count: number
}

export interface VisualTemplate {
  id: string
  name: string
  description: string
  thumbnail_url: string | null
  configuration_data: any
  created_at: string
  usage_count: number
}

// ========== Prompt Template ==========
export interface PromptTemplate {
  id: string
  name: string
  content: string
  is_default: boolean
  created_at: string
  updated_at: string
  usage_count: number
}
