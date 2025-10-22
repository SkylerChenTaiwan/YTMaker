/**
 * Gemini API Mock 單元測試
 */

import './setup'
import { setupServer } from 'msw/node'
import { geminiApiMock } from '../gemini-api.mock'

const server = setupServer(...geminiApiMock)

describe('Gemini API Mock', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  const API_ENDPOINT =
    'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent'

  it('應該回傳正確的腳本結構', async () => {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-key',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: '將以下文字轉換為影片腳本...' }],
          },
        ],
      }),
    })

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toHaveProperty('candidates')
    expect(data.candidates[0]).toHaveProperty('content')

    const scriptText = data.candidates[0].content.parts[0].text
    const script = JSON.parse(scriptText)

    // 驗證腳本結構
    expect(script).toHaveProperty('intro')
    expect(script).toHaveProperty('segments')
    expect(script).toHaveProperty('outro')
    expect(script).toHaveProperty('metadata')
    expect(script).toHaveProperty('total_duration')

    // 驗證 intro
    expect(script.intro).toHaveProperty('text')
    expect(script.intro).toHaveProperty('duration')
    expect(typeof script.intro.text).toBe('string')
    expect(typeof script.intro.duration).toBe('number')

    // 驗證 segments
    expect(Array.isArray(script.segments)).toBe(true)
    expect(script.segments.length).toBeGreaterThanOrEqual(10)
    expect(script.segments.length).toBeLessThanOrEqual(15)

    script.segments.forEach((segment: any, index: number) => {
      expect(segment).toHaveProperty('index')
      expect(segment).toHaveProperty('text')
      expect(segment).toHaveProperty('duration')
      expect(segment).toHaveProperty('image_description')
      expect(segment.index).toBe(index + 1)
      expect(typeof segment.text).toBe('string')
      expect(typeof segment.duration).toBe('number')
      expect(segment.duration).toBeGreaterThanOrEqual(5)
      expect(segment.duration).toBeLessThanOrEqual(20)
    })

    // 驗證 outro
    expect(script.outro).toHaveProperty('text')
    expect(script.outro).toHaveProperty('duration')

    // 驗證 metadata
    expect(script.metadata).toHaveProperty('title')
    expect(script.metadata).toHaveProperty('description')
    expect(script.metadata).toHaveProperty('tags')
    expect(Array.isArray(script.metadata.tags)).toBe(true)
    expect(script.metadata.tags.length).toBeGreaterThan(0)

    // 驗證總時長
    expect(typeof script.total_duration).toBe('number')
    expect(script.total_duration).toBeGreaterThanOrEqual(180)
    expect(script.total_duration).toBeLessThanOrEqual(600)
  })

  it('應該回傳 401 當 API Key 無效', async () => {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer invalid-key',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'test' }] }],
      }),
    })

    expect(response.status).toBe(401)

    const data = await response.json()
    expect(data).toHaveProperty('error')
    expect(data.error.code).toBe(401)
    expect(data.error.status).toBe('UNAUTHENTICATED')
    expect(data.error.message).toContain('API key not valid')
  })

  it('應該回傳 429 當超過速率限制', async () => {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer rate-limit-key',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'test' }] }],
      }),
    })

    expect(response.status).toBe(429)

    const data = await response.json()
    expect(data).toHaveProperty('error')
    expect(data.error.code).toBe(429)
    expect(data.error.status).toBe('RESOURCE_EXHAUSTED')
  })

  it('應該回傳 500 當伺服器錯誤', async () => {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer server-error-key',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'test' }] }],
      }),
    })

    expect(response.status).toBe(500)

    const data = await response.json()
    expect(data).toHaveProperty('error')
    expect(data.error.code).toBe(500)
    expect(data.error.status).toBe('INTERNAL')
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
        contents: [{ parts: [{ text: 'test' }] }],
      }),
    })

    const endTime = Date.now()
    const duration = endTime - startTime

    // 應該至少等待 1500ms
    expect(duration).toBeGreaterThanOrEqual(1400) // 允許一些誤差
  })
})
