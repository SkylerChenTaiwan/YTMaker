// frontend/src/lib/api/gemini.ts

export interface GeminiModel {
  name: string // e.g. "models/gemini-2.5-flash"
  display_name: string // e.g. "Gemini 2.5 Flash"
  description: string
  supported_generation_methods: string[]
}

export interface GeminiModelsResponse {
  success: boolean
  data: {
    models: GeminiModel[]
  }
}

/**
 * 從後端 API 取得可用的 Gemini 模型列表
 *
 * 需要先在系統設定中配置 Gemini API Key
 *
 * @throws {Error} 當 API Key 未配置或請求失敗時
 * @returns Promise<GeminiModel[]> 可用的模型列表
 */
export async function getGeminiModels(): Promise<GeminiModel[]> {
  try {
    const response = await fetch('/api/v1/gemini/models')

    if (!response.ok) {
      if (response.status === 400) {
        throw new Error('Gemini API Key 尚未配置，請先在系統設定中設定 API Key')
      }
      if (response.status === 500) {
        throw new Error('無法從 Google 取得模型列表，請檢查 API Key 是否正確')
      }
      throw new Error(`取得模型列表失敗: ${response.status}`)
    }

    const data: GeminiModelsResponse = await response.json()

    if (!data.success || !data.data.models) {
      throw new Error('API 回應格式錯誤')
    }

    return data.data.models
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('取得模型列表時發生未知錯誤')
  }
}

/**
 * 將完整模型名稱轉換為簡短的 ID
 * 例如: "models/gemini-2.5-flash" -> "gemini-2.5-flash"
 */
export function extractModelId(fullName: string): string {
  const parts = fullName.split('/')
  return parts[parts.length - 1]
}

/**
 * 將簡短的模型 ID 轉換為完整名稱
 * 例如: "gemini-2.5-flash" -> "models/gemini-2.5-flash"
 */
export function toFullModelName(modelId: string): string {
  if (modelId.startsWith('models/')) {
    return modelId
  }
  return `models/${modelId}`
}
