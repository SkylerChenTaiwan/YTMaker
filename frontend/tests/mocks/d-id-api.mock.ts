/**
 * D-ID API Mock
 *
 * Mock D-ID 的虛擬主播影片生成功能
 */

import { http, HttpResponse } from 'msw'

/**
 * D-ID API Mock Handlers
 */
export const dIdApiMock = [
  // 建立影片生成任務
  http.post('https://api.d-id.com/talks', async ({ request }) => {
    // 模擬 API 延遲
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const authHeader = request.headers.get('Authorization')

    // 處理無效 API Key
    if (authHeader === 'Bearer invalid-key') {
      return HttpResponse.json(
        {
          kind: 'Unauthorized',
          description: 'Invalid API key',
        },
        { status: 401 }
      )
    }

    // 處理 Rate Limit
    if (authHeader === 'Bearer rate-limit-key') {
      return HttpResponse.json(
        {
          kind: 'RateLimitExceeded',
          description: 'Rate limit exceeded',
        },
        { status: 429 }
      )
    }

    // 處理伺服器錯誤
    if (authHeader === 'Bearer server-error-key') {
      return HttpResponse.json(
        {
          kind: 'InternalServerError',
          description: 'Internal server error',
        },
        { status: 500 }
      )
    }

    const body = (await request.json()) as any

    // 驗證必要欄位
    if (!body.source_url) {
      return HttpResponse.json(
        {
          kind: 'BadRequest',
          description: 'source_url is required',
        },
        { status: 400 }
      )
    }

    if (!body.script || !body.script.type || !body.script.input) {
      return HttpResponse.json(
        {
          kind: 'BadRequest',
          description: 'script.type and script.input are required',
        },
        { status: 400 }
      )
    }

    // 正常回應 - 建立任務成功
    const taskId = `talk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    return HttpResponse.json(
      {
        id: taskId,
        created_at: new Date().toISOString(),
        status: 'created',
        source_url: body.source_url,
        result_url: null,
      },
      { status: 201 }
    )
  }),

  // 查詢影片生成狀態
  http.get('https://api.d-id.com/talks/:talkId', async ({ params, request }) => {
    await new Promise((resolve) => setTimeout(resolve, 500))

    const authHeader = request.headers.get('Authorization')
    const { talkId } = params

    // 處理無效 API Key
    if (authHeader === 'Bearer invalid-key') {
      return HttpResponse.json(
        {
          kind: 'Unauthorized',
          description: 'Invalid API key',
        },
        { status: 401 }
      )
    }

    // 模擬不同狀態
    if (typeof talkId === 'string') {
      // 處理中
      if (talkId.includes('processing')) {
        return HttpResponse.json({
          id: talkId,
          status: 'processing',
          created_at: new Date(Date.now() - 30000).toISOString(),
          result_url: null,
        })
      }

      // 已完成
      if (talkId.includes('done')) {
        return HttpResponse.json({
          id: talkId,
          status: 'done',
          created_at: new Date(Date.now() - 120000).toISOString(),
          result_url: 'https://d-id-talks-prod.s3.amazonaws.com/mock-video.mp4',
          duration: 30.5,
        })
      }

      // 失敗
      if (talkId.includes('error')) {
        return HttpResponse.json({
          id: talkId,
          status: 'error',
          created_at: new Date(Date.now() - 60000).toISOString(),
          error: {
            kind: 'ProcessingError',
            description: 'Failed to process video',
          },
        })
      }
    }

    // 預設回應 - 剛建立的任務
    return HttpResponse.json({
      id: talkId,
      status: 'created',
      created_at: new Date().toISOString(),
      result_url: null,
    })
  }),

  // 刪除影片任務
  http.delete('https://api.d-id.com/talks/:talkId', async ({ params, request }) => {
    await new Promise((resolve) => setTimeout(resolve, 300))

    const authHeader = request.headers.get('Authorization')

    if (authHeader === 'Bearer invalid-key') {
      return HttpResponse.json(
        {
          kind: 'Unauthorized',
          description: 'Invalid API key',
        },
        { status: 401 }
      )
    }

    // 刪除成功
    return new HttpResponse(null, { status: 204 })
  }),
]
