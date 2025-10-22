/**
 * YouTube API Mock 單元測試
 */

import './setup'
import { setupServer } from 'msw/node'
import { youtubeApiMock } from '../youtube-api.mock'

const server = setupServer(...youtubeApiMock)

describe('YouTube API Mock', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  describe('上傳影片', () => {
    const UPLOAD_ENDPOINT = 'https://www.googleapis.com/upload/youtube/v3/videos'

    it('應該成功上傳影片', async () => {
      const response = await fetch(`${UPLOAD_ENDPOINT}?part=snippet,status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          snippet: {
            title: 'Test Video',
            description: 'Test Description',
            tags: ['test', 'mock'],
            categoryId: '22',
          },
          status: {
            privacyStatus: 'public',
          },
        }),
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveProperty('kind', 'youtube#video')
      expect(data).toHaveProperty('id')
      expect(data).toHaveProperty('snippet')
      expect(data).toHaveProperty('status')
      expect(data.status.uploadStatus).toBe('uploaded')
      expect(data.snippet).toHaveProperty('thumbnails')
    })

    it('應該回傳 401 當 Token 無效', async () => {
      const response = await fetch(`${UPLOAD_ENDPOINT}?part=snippet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer invalid-token',
        },
        body: JSON.stringify({
          snippet: { title: 'Test' },
        }),
      })

      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(data.error.code).toBe(401)
      expect(data.error.message).toContain('Invalid Credentials')
    })

    it('應該回傳 403 當權限不足', async () => {
      const response = await fetch(`${UPLOAD_ENDPOINT}?part=snippet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer insufficient-permission',
        },
        body: JSON.stringify({
          snippet: { title: 'Test' },
        }),
      })

      expect(response.status).toBe(403)

      const data = await response.json()
      expect(data.error.code).toBe(403)
      expect(data.error.message).toContain('Insufficient Permission')
    })

    it('應該回傳 403 當配額超限', async () => {
      const response = await fetch(`${UPLOAD_ENDPOINT}?part=snippet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer quota-exceeded',
        },
        body: JSON.stringify({
          snippet: { title: 'Test' },
        }),
      })

      expect(response.status).toBe(403)

      const data = await response.json()
      expect(data.error.code).toBe(403)
      expect(data.error.message).toContain('quota')
      expect(data.error.errors[0].reason).toBe('quotaExceeded')
    })

    it('應該回傳 500 當伺服器錯誤', async () => {
      const response = await fetch(`${UPLOAD_ENDPOINT}?part=snippet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer server-error',
        },
        body: JSON.stringify({
          snippet: { title: 'Test' },
        }),
      })

      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data.error.code).toBe(500)
    })

    it('應該模擬較長的上傳延遲', async () => {
      const startTime = Date.now()

      await fetch(`${UPLOAD_ENDPOINT}?part=snippet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          snippet: { title: 'Test' },
        }),
      })

      const endTime = Date.now()
      const duration = endTime - startTime

      // 應該至少等待 3000ms
      expect(duration).toBeGreaterThanOrEqual(2900)
    })
  })

  describe('查詢影片資訊', () => {
    const API_ENDPOINT = 'https://www.googleapis.com/youtube/v3/videos'

    it('應該成功查詢影片資訊', async () => {
      const response = await fetch(
        `${API_ENDPOINT}?part=snippet,status,statistics&id=test-video-id`,
        {
          headers: {
            Authorization: 'Bearer test-token',
          },
        }
      )

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveProperty('kind', 'youtube#videoListResponse')
      expect(data).toHaveProperty('items')
      expect(Array.isArray(data.items)).toBe(true)
      expect(data.items.length).toBe(1)

      const video = data.items[0]
      expect(video).toHaveProperty('id', 'test-video-id')
      expect(video).toHaveProperty('snippet')
      expect(video).toHaveProperty('status')
      expect(video).toHaveProperty('statistics')
      expect(video.status.uploadStatus).toBe('processed')
    })

    it('應該回傳空列表當影片不存在', async () => {
      const response = await fetch(`${API_ENDPOINT}?part=snippet&id=not-found-video-id`, {
        headers: {
          Authorization: 'Bearer test-token',
        },
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.pageInfo.totalResults).toBe(0)
      expect(data.items).toHaveLength(0)
    })

    it('應該回傳 401 當 Token 無效', async () => {
      const response = await fetch(`${API_ENDPOINT}?part=snippet&id=test-id`, {
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      })

      expect(response.status).toBe(401)
    })
  })

  describe('更新影片資訊', () => {
    const API_ENDPOINT = 'https://www.googleapis.com/youtube/v3/videos'

    it('應該成功更新影片資訊', async () => {
      const response = await fetch(`${API_ENDPOINT}?part=snippet,status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          id: 'test-video-id',
          snippet: {
            title: 'Updated Title',
            description: 'Updated Description',
            tags: ['updated', 'test'],
            categoryId: '22',
          },
          status: {
            privacyStatus: 'unlisted',
          },
        }),
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveProperty('kind', 'youtube#video')
      expect(data).toHaveProperty('id', 'test-video-id')
      expect(data.snippet.title).toBe('Updated Title')
      expect(data.snippet.description).toBe('Updated Description')
      expect(data.status.privacyStatus).toBe('unlisted')
    })

    it('應該回傳 401 當 Token 無效', async () => {
      const response = await fetch(`${API_ENDPOINT}?part=snippet`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer invalid-token',
        },
        body: JSON.stringify({
          id: 'test-id',
          snippet: { title: 'Test' },
        }),
      })

      expect(response.status).toBe(401)
    })
  })

  describe('刪除影片', () => {
    const API_ENDPOINT = 'https://www.googleapis.com/youtube/v3/videos'

    it('應該成功刪除影片', async () => {
      const response = await fetch(`${API_ENDPOINT}?id=test-video-id`, {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer test-token',
        },
      })

      expect(response.status).toBe(204)
    })

    it('應該回傳 401 當 Token 無效', async () => {
      const response = await fetch(`${API_ENDPOINT}?id=test-id`, {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      })

      expect(response.status).toBe(401)
    })
  })
})
