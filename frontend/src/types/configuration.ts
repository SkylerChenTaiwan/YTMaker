// types/configuration.ts

export interface SubtitleConfig {
  font_family: string
  font_size: number
  font_color: string
  position: string
  position_x?: number
  position_y?: number
  border_enabled: boolean
  border_color: string
  border_width: number
  shadow_enabled: boolean
  shadow_color: string
  shadow_offset_x: number
  shadow_offset_y: number
  background_enabled: boolean
  background_color: string
  background_opacity: number
}

export interface LogoConfig {
  logo_file: string | null
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
  content?: string
  image_url?: string
  shape_type?: 'rectangle' | 'circle'
}

export interface VisualConfig {
  subtitle: SubtitleConfig
  logo: LogoConfig
  overlays: OverlayElement[]
}
