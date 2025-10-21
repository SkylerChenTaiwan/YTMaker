// ========== API Provider ==========
export type APIProvider = 'gemini' | 'stability_ai' | 'did'

// ========== API Key Info ==========
export interface APIKeyInfo {
  provider: APIProvider
  configured: boolean
  last_tested?: string
}

// ========== Quota ==========
export interface Quota {
  used_minutes?: number
  total_minutes?: number
  used_units?: number
  total_units?: number
  usage_percent: number
  reset_date: string
}

export interface Quotas {
  did?: Quota
  youtube?: Quota
}

// ========== Preferences ==========
export interface Preferences {
  voice_gender: 'male' | 'female'
  voice_speed: number
  default_privacy: 'public' | 'unlisted' | 'private'
  project_retention_days: number // -1 表示永久保留
  keep_intermediate_files: boolean
  notification_on_complete: boolean
  notification_on_error: boolean
}

// ========== Export Data ==========
export interface ExportData {
  export_date: string
  projects: any[]
  configurations: any[]
  templates: any[]
}

// ========== Import Result ==========
export interface ImportResult {
  imported_projects: number
  imported_configurations: number
  imported_templates: number
}

// ========== YouTube Channel (擴展現有的) ==========
export interface YouTubeChannel {
  id: string
  name: string
  thumbnail: string
  subscriber_count: number
  authorized_at: string
  auth_status?: 'active' | 'expired'
}
