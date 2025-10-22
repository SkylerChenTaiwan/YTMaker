/**
 * Stability AI API Mock 單元測試
 */

import './setup'
import { setupServer } from 'msw/node'
import { stabilityAiMock } from '../stability-ai.mock'

const server = setupServer(...stabilityAiMock)

describe('Stability AI Mock', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  const API_ENDPOINT = 'https://api.stability.ai/v1/generation/stable-diffusion-v1-6/text-to-image'

  it('應該成功生成圖片並回傳 base64', async () => {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-key',
      },
      body: JSON.stringify({
        text_prompts: [
          {
            text: 'A beautiful sunset over mountains',
            weight: 1,
          },
        ],
        cfg_scale: 7,
        height: 512,
        width: 512,
        samples: 1,
        steps: 30,
      }),
    })

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toHaveProperty('artifacts')
    expect(Array.isArray(data.artifacts)).toBe(true)
    expect(data.artifacts.length).toBeGreaterThan(0)

    const artifact = data.artifacts[0]
    expect(artifact).toHaveProperty('base64')
    expect(artifact).toHaveProperty('seed')
    expect(artifact).toHaveProperty('finishReason')
    expect(artifact.finishReason).toBe('SUCCESS')

    // 驗證 base64 是有效的
    expect(typeof artifact.base64).toBe('string')
    expect(artifact.base64.length).toBeGreaterThan(0)
  })

  it('應該回傳 429 當超過速率限制', async () => {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer rate-limit-key',
      },
      body: JSON.stringify({
        text_prompts: [{ text: 'test' }],
      }),
    })

    expect(response.status).toBe(429)

    const data = await response.json()
    expect(data).toHaveProperty('name')
    expect(data).toHaveProperty('message')
    expect(data.name).toBe('rate_limit_exceeded')
    expect(data.message).toContain('Rate limit exceeded')
  })

  it('應該回傳 400 當缺少必要參數', async () => {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-key',
      },
      body: JSON.stringify({
        // 缺少 text_prompts
        cfg_scale: 7,
      }),
    })

    expect(response.status).toBe(400)

    const data = await response.json()
    expect(data).toHaveProperty('name')
    expect(data).toHaveProperty('message')
    expect(data.name).toBe('bad_request')
    expect(data.message).toContain('text_prompts is required')
  })

  it('應該回傳 400 當 text_prompts 為空陣列', async () => {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-key',
      },
      body: JSON.stringify({
        text_prompts: [],
      }),
    })

    expect(response.status).toBe(400)

    const data = await response.json()
    expect(data.name).toBe('bad_request')
  })

  it('應該模擬 API 延遲（圖片生成較慢）', async () => {
    const startTime = Date.now()

    await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-key',
      },
      body: JSON.stringify({
        text_prompts: [{ text: 'test prompt' }],
      }),
    })

    const endTime = Date.now()
    const duration = endTime - startTime

    // 應該至少等待 2000ms (允許一些誤差)
    expect(duration).toBeGreaterThanOrEqual(1900)
  })
})
