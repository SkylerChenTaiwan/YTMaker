/**
 * Gemini API Mock
 *
 * Mock Google Gemini API 的腳本生成功能
 */

import { http, HttpResponse } from 'msw'

/**
 * 生成 Mock 腳本資料
 */
function generateMockScript() {
  return {
    intro: {
      text: '歡迎來到今天的影片,我們將探討一個有趣的話題。',
      duration: 10,
    },
    segments: Array.from({ length: 12 }, (_, i) => ({
      index: i + 1,
      text: `這是第 ${i + 1} 段內容,包含重要資訊。在這一段中我們將深入探討相關主題並提供詳細的說明和範例。`,
      duration: 15 + (i % 5),
      image_description: `A detailed and beautiful image for segment ${
        i + 1
      }, showing relevant concepts`,
    })),
    outro: {
      text: '感謝您觀看本期影片,如果覺得有幫助請訂閱我們的頻道。',
      duration: 10,
    },
    metadata: {
      title: 'AI 自動生成的影片標題 | 深入探討核心概念',
      description:
        '在本影片中,我們將深入探討重要主題。這個描述包含影片的主要內容摘要,讓觀眾能快速了解影片的核心價值。我們會分享實用的技巧和見解,幫助您更好地理解這個領域。',
      tags: ['教學', '科技', 'AI', '自動化', '教育'],
    },
    total_duration: 300,
  }
}

/**
 * Gemini API Mock Handlers
 */
export const geminiApiMock = [
  // 成功回應
  http.post(
    'https://generativelanguage.googleapis.com/v1/models/:model\\:generateContent',
    async ({ params, request }) => {
      // 模擬 API 延遲
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // 檢查 Authorization Header
      const authHeader = request.headers.get('Authorization')

      // 處理無效 API Key
      if (authHeader === 'Bearer invalid-key') {
        return HttpResponse.json(
          {
            error: {
              code: 401,
              message: 'API key not valid. Please pass a valid API key.',
              status: 'UNAUTHENTICATED',
            },
          },
          { status: 401 }
        )
      }

      // 處理速率限制（特殊測試用的 header）
      if (authHeader === 'Bearer rate-limit-key') {
        return HttpResponse.json(
          {
            error: {
              code: 429,
              message: 'Resource has been exhausted (e.g. check quota).',
              status: 'RESOURCE_EXHAUSTED',
            },
          },
          { status: 429 }
        )
      }

      // 處理伺服器錯誤（特殊測試用的 header）
      if (authHeader === 'Bearer server-error-key') {
        return HttpResponse.json(
          {
            error: {
              code: 500,
              message: 'Internal server error',
              status: 'INTERNAL',
            },
          },
          { status: 500 }
        )
      }

      // 正常回應
      const script = generateMockScript()

      return HttpResponse.json({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify(script),
                },
              ],
              role: 'model',
            },
            finishReason: 'STOP',
            index: 0,
            safetyRatings: [
              {
                category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                probability: 'NEGLIGIBLE',
              },
              {
                category: 'HARM_CATEGORY_HATE_SPEECH',
                probability: 'NEGLIGIBLE',
              },
              {
                category: 'HARM_CATEGORY_HARASSMENT',
                probability: 'NEGLIGIBLE',
              },
              {
                category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                probability: 'NEGLIGIBLE',
              },
            ],
          },
        ],
        usageMetadata: {
          promptTokenCount: 1000,
          candidatesTokenCount: 500,
          totalTokenCount: 1500,
        },
      })
    }
  ),
]
