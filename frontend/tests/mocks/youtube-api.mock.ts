/**
 * YouTube API Mock
 *
 * Mock YouTube Data API v3 的影片上傳功能
 */

import { http, HttpResponse } from 'msw'

/**
 * YouTube API Mock Handlers
 */
export const youtubeApiMock = [
  // 上傳影片
  http.post('https://www.googleapis.com/upload/youtube/v3/videos', async ({ request }) => {
    // 模擬上傳延遲（較長）
    await new Promise((resolve) => setTimeout(resolve, 3000))

    const authHeader = request.headers.get('Authorization')

    // 處理無效 Token
    if (authHeader === 'Bearer invalid-token') {
      return HttpResponse.json(
        {
          error: {
            code: 401,
            message: 'Invalid Credentials',
            errors: [
              {
                domain: 'global',
                reason: 'authError',
                message: 'Invalid Credentials',
              },
            ],
          },
        },
        { status: 401 }
      )
    }

    // 處理權限不足
    if (authHeader === 'Bearer insufficient-permission') {
      return HttpResponse.json(
        {
          error: {
            code: 403,
            message: 'Insufficient Permission',
            errors: [
              {
                domain: 'youtube.quota',
                reason: 'insufficientPermissions',
                message: 'Insufficient Permission',
              },
            ],
          },
        },
        { status: 403 }
      )
    }

    // 處理配額超限
    if (authHeader === 'Bearer quota-exceeded') {
      return HttpResponse.json(
        {
          error: {
            code: 403,
            message: 'The request cannot be completed because you have exceeded your quota.',
            errors: [
              {
                domain: 'youtube.quota',
                reason: 'quotaExceeded',
                message: 'The request cannot be completed because you have exceeded your quota.',
              },
            ],
          },
        },
        { status: 403 }
      )
    }

    // 處理伺服器錯誤
    if (authHeader === 'Bearer server-error') {
      return HttpResponse.json(
        {
          error: {
            code: 500,
            message: 'Internal Server Error',
            errors: [
              {
                domain: 'global',
                reason: 'backendError',
                message: 'Internal Server Error',
              },
            ],
          },
        },
        { status: 500 }
      )
    }

    // 正常回應
    const videoId = `vid-${Date.now()}-${Math.random().toString(36).substr(2, 11)}`

    return HttpResponse.json(
      {
        kind: 'youtube#video',
        etag: `etag-${videoId}`,
        id: videoId,
        snippet: {
          publishedAt: new Date().toISOString(),
          channelId: 'UCmocked-channel-id',
          title: 'Mock Video Title',
          description: 'Mock video description',
          thumbnails: {
            default: {
              url: `https://i.ytimg.com/vi/${videoId}/default.jpg`,
              width: 120,
              height: 90,
            },
            medium: {
              url: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
              width: 320,
              height: 180,
            },
            high: {
              url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
              width: 480,
              height: 360,
            },
          },
          channelTitle: 'Mock Channel',
          tags: ['mock', 'test', 'video'],
          categoryId: '22',
        },
        status: {
          uploadStatus: 'uploaded',
          privacyStatus: 'public',
          license: 'youtube',
          embeddable: true,
          publicStatsViewable: true,
        },
      },
      { status: 200 }
    )
  }),

  // 查詢影片資訊
  http.get('https://www.googleapis.com/youtube/v3/videos', async ({ request }) => {
    await new Promise((resolve) => setTimeout(resolve, 500))

    const url = new URL(request.url)
    const videoId = url.searchParams.get('id')
    const authHeader = request.headers.get('Authorization')

    // 處理無效 Token
    if (authHeader === 'Bearer invalid-token') {
      return HttpResponse.json(
        {
          error: {
            code: 401,
            message: 'Invalid Credentials',
          },
        },
        { status: 401 }
      )
    }

    // 處理找不到影片
    if (videoId === 'not-found-video-id') {
      return HttpResponse.json({
        kind: 'youtube#videoListResponse',
        etag: 'etag-empty',
        pageInfo: {
          totalResults: 0,
          resultsPerPage: 0,
        },
        items: [],
      })
    }

    // 正常回應
    return HttpResponse.json({
      kind: 'youtube#videoListResponse',
      etag: 'etag-list',
      pageInfo: {
        totalResults: 1,
        resultsPerPage: 1,
      },
      items: [
        {
          kind: 'youtube#video',
          etag: `etag-${videoId}`,
          id: videoId,
          snippet: {
            publishedAt: new Date(Date.now() - 3600000).toISOString(),
            channelId: 'UCmocked-channel-id',
            title: 'Mock Video Title',
            description: 'Mock video description',
            thumbnails: {
              default: {
                url: `https://i.ytimg.com/vi/${videoId}/default.jpg`,
                width: 120,
                height: 90,
              },
            },
            channelTitle: 'Mock Channel',
            tags: ['mock', 'test'],
            categoryId: '22',
          },
          status: {
            uploadStatus: 'processed',
            privacyStatus: 'public',
          },
          statistics: {
            viewCount: '1234',
            likeCount: '56',
            favoriteCount: '0',
            commentCount: '12',
          },
        },
      ],
    })
  }),

  // 更新影片資訊
  http.put('https://www.googleapis.com/youtube/v3/videos', async ({ request }) => {
    await new Promise((resolve) => setTimeout(resolve, 800))

    const authHeader = request.headers.get('Authorization')

    if (authHeader === 'Bearer invalid-token') {
      return HttpResponse.json(
        {
          error: {
            code: 401,
            message: 'Invalid Credentials',
          },
        },
        { status: 401 }
      )
    }

    const body = (await request.json()) as any

    // 回傳更新後的影片資訊
    return HttpResponse.json({
      kind: 'youtube#video',
      etag: `etag-updated-${Date.now()}`,
      id: body.id,
      snippet: {
        ...body.snippet,
        publishedAt: new Date(Date.now() - 3600000).toISOString(),
        channelId: 'UCmocked-channel-id',
        channelTitle: 'Mock Channel',
      },
      status: body.status || {
        uploadStatus: 'processed',
        privacyStatus: 'public',
      },
    })
  }),

  // 刪除影片
  http.delete('https://www.googleapis.com/youtube/v3/videos', async ({ request }) => {
    await new Promise((resolve) => setTimeout(resolve, 500))

    const authHeader = request.headers.get('Authorization')

    if (authHeader === 'Bearer invalid-token') {
      return HttpResponse.json(
        {
          error: {
            code: 401,
            message: 'Invalid Credentials',
          },
        },
        { status: 401 }
      )
    }

    // 刪除成功
    return new HttpResponse(null, { status: 204 })
  }),
]
