/**
 * MSW Handlers 整合
 *
 * 整合所有第三方 API 的 Mock handlers
 */

import { geminiApiMock } from './gemini-api.mock'
import { stabilityAiMock } from './stability-ai.mock'
import { dIdApiMock } from './d-id-api.mock'
import { youtubeApiMock } from './youtube-api.mock'

/**
 * 所有 Mock Handlers 的整合清單
 *
 * 包含以下 API Mocks:
 * - Gemini API (腳本生成)
 * - Stability AI (圖片生成)
 * - D-ID API (虛擬主播影片)
 * - YouTube API (影片上傳)
 */
export const handlers = [
  ...geminiApiMock,
  ...stabilityAiMock,
  ...dIdApiMock,
  ...youtubeApiMock,
]
