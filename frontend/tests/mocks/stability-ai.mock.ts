/**
 * Stability AI API Mock
 *
 * Mock Stability AI 的圖片生成功能
 */

import { http, HttpResponse } from 'msw'
import * as fs from 'fs'
import * as path from 'path'

/**
 * 生成 Mock 圖片 (使用 fixtures 中的測試圖片)
 */
function getMockImage(): string {
  try {
    const imagePath = path.join(__dirname, 'fixtures', 'test-image.png')
    if (fs.existsSync(imagePath)) {
      const imageBuffer = fs.readFileSync(imagePath)
      return imageBuffer.toString('base64')
    }
  } catch (error) {
    // Fallback: 生成 1x1 透明 PNG
    console.warn('[Mock] test-image.png not found, using fallback')
  }

  // Fallback: 最小的有效 PNG (1x1 透明像素)
  const minimalPNG = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
    0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f,
    0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00,
    0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ])

  return minimalPNG.toString('base64')
}

/**
 * Stability AI API Mock Handlers
 */
export const stabilityAiMock = [
  // 成功生成圖片
  http.post('https://api.stability.ai/v1/generation/:engineId/text-to-image', async ({ params, request }) => {
    // 模擬 API 延遲 (圖片生成較慢)
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const authHeader = request.headers.get('Authorization')

    // 處理 Rate Limit
    if (authHeader === 'Bearer rate-limit-key') {
      return HttpResponse.json(
        {
          name: 'rate_limit_exceeded',
          message: 'Rate limit exceeded. Please try again later.',
        },
        { status: 429 }
      )
    }

    // 處理無效參數
    const body = await request.json() as any
    if (!body.text_prompts || body.text_prompts.length === 0) {
      return HttpResponse.json(
        {
          name: 'bad_request',
          message: 'text_prompts is required',
        },
        { status: 400 }
      )
    }

    // 正常回應
    const base64Image = getMockImage()

    return HttpResponse.json({
      artifacts: [
        {
          base64: base64Image,
          seed: 1234567890,
          finishReason: 'SUCCESS',
        },
      ],
    })
  }),
]
