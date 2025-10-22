/**
 * D-ID API Mock 單元測試
 */

import './setup'
import { setupServer } from 'msw/node'
import { dIdApiMock } from '../d-id-api.mock'

const server = setupServer(...dIdApiMock)

describe('D-ID API Mock', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  const API_ENDPOINT = 'https://api.d-id.com/talks'

  describe('建立影片生成任務', () => {
    it('應該成功建立影片生成任務', async () => {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-key',
        },
        body: JSON.stringify({
          source_url: 'https://example.com/avatar.jpg',
          script: {
            type: 'text',
            input: '歡迎來到我的影片',
            provider: {
              type: 'microsoft',
              voice_id: 'zh-TW-HsiaoChenNeural',
            },
          },
          config: {
            fluent: false,
            pad_audio: 0,
          },
        }),
      })

      expect(response.status).toBe(201)

      const data = await response.json()
      expect(data).toHaveProperty('id')
      expect(data).toHaveProperty('created_at')
      expect(data).toHaveProperty('status')
      expect(data.status).toBe('created')
      expect(data).toHaveProperty('source_url')
      expect(data.result_url).toBeNull()
    })

    it('應該回傳 401 當 API Key 無效', async () => {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer invalid-key',
        },
        body: JSON.stringify({
          source_url: 'https://example.com/avatar.jpg',
          script: { type: 'text', input: 'test' },
        }),
      })

      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data).toHaveProperty('kind')
      expect(data.kind).toBe('Unauthorized')
    })

    it('應該回傳 429 當超過速率限制', async () => {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer rate-limit-key',
        },
        body: JSON.stringify({
          source_url: 'https://example.com/avatar.jpg',
          script: { type: 'text', input: 'test' },
        }),
      })

      expect(response.status).toBe(429)

      const data = await response.json()
      expect(data.kind).toBe('RateLimitExceeded')
    })

    it('應該回傳 500 當伺服器錯誤', async () => {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer server-error-key',
        },
        body: JSON.stringify({
          source_url: 'https://example.com/avatar.jpg',
          script: { type: 'text', input: 'test' },
        }),
      })

      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data.kind).toBe('InternalServerError')
    })

    it('應該回傳 400 當缺少 source_url', async () => {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-key',
        },
        body: JSON.stringify({
          script: { type: 'text', input: 'test' },
        }),
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.kind).toBe('BadRequest')
      expect(data.description).toContain('source_url')
    })

    it('應該回傳 400 當缺少 script 資訊', async () => {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-key',
        },
        body: JSON.stringify({
          source_url: 'https://example.com/avatar.jpg',
        }),
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.kind).toBe('BadRequest')
      expect(data.description).toContain('script')
    })
  })

  describe('查詢影片生成狀態', () => {
    it('應該回傳 created 狀態', async () => {
      const response = await fetch(`${API_ENDPOINT}/talk-12345`, {
        headers: {
          Authorization: 'Bearer test-key',
        },
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.status).toBe('created')
      expect(data.result_url).toBeNull()
    })

    it('應該回傳 processing 狀態', async () => {
      const response = await fetch(`${API_ENDPOINT}/talk-processing-12345`, {
        headers: {
          Authorization: 'Bearer test-key',
        },
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.status).toBe('processing')
      expect(data.result_url).toBeNull()
    })

    it('應該回傳 done 狀態並包含影片 URL', async () => {
      const response = await fetch(`${API_ENDPOINT}/talk-done-12345`, {
        headers: {
          Authorization: 'Bearer test-key',
        },
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.status).toBe('done')
      expect(data.result_url).toBeTruthy()
      expect(data.result_url).toContain('.mp4')
      expect(data).toHaveProperty('duration')
      expect(typeof data.duration).toBe('number')
    })

    it('應該回傳 error 狀態', async () => {
      const response = await fetch(`${API_ENDPOINT}/talk-error-12345`, {
        headers: {
          Authorization: 'Bearer test-key',
        },
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.status).toBe('error')
      expect(data).toHaveProperty('error')
      expect(data.error).toHaveProperty('kind')
      expect(data.error).toHaveProperty('description')
    })

    it('應該回傳 401 當 API Key 無效', async () => {
      const response = await fetch(`${API_ENDPOINT}/talk-12345`, {
        headers: {
          Authorization: 'Bearer invalid-key',
        },
      })

      expect(response.status).toBe(401)
    })
  })

  describe('刪除影片任務', () => {
    it('應該成功刪除任務', async () => {
      const response = await fetch(`${API_ENDPOINT}/talk-12345`, {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer test-key',
        },
      })

      expect(response.status).toBe(204)
    })

    it('應該回傳 401 當 API Key 無效', async () => {
      const response = await fetch(`${API_ENDPOINT}/talk-12345`, {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer invalid-key',
        },
      })

      expect(response.status).toBe(401)
    })
  })

  it('應該模擬 API 延遲', async () => {
    const startTime = Date.now()

    await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-key',
      },
      body: JSON.stringify({
        source_url: 'https://example.com/avatar.jpg',
        script: { type: 'text', input: 'test' },
      }),
    })

    const endTime = Date.now()
    const duration = endTime - startTime

    // 應該至少等待 1000ms
    expect(duration).toBeGreaterThanOrEqual(900)
  })
})
