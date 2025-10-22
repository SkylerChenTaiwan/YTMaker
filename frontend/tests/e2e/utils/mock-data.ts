/**
 * Mock 資料生成工具
 *
 * 提供測試所需的各種 Mock 資料
 */

/**
 * 生成 Mock 腳本資料（符合 Gemini API 回應格式）
 */
export function generateMockScript(segmentCount = 12) {
  return {
    intro: {
      text: '歡迎來到今天的影片，我們將探討一個有趣的話題。',
      duration: 10,
    },
    segments: Array.from({ length: segmentCount }, (_, i) => ({
      index: i + 1,
      text: `這是第 ${i + 1} 段內容，包含重要資訊和詳細說明。`,
      duration: 15 + (i % 5),
      image_description: `A detailed and beautiful image for segment ${i + 1}, showing relevant visual content.`,
    })),
    outro: {
      text: '感謝您觀看本期影片，記得訂閱我們的頻道。',
      duration: 10,
    },
    metadata: {
      title: 'AI 自動生成的影片標題 | 深入探討核心概念',
      description: '在本影片中，我們將深入探討重要主題，並提供實用的見解和建議。',
      tags: ['教學', '科技', 'AI', '自動化', '教育'],
    },
    total_duration: 300,
  }
}

/**
 * 生成 Mock 專案資料
 */
export function generateMockProject(overrides?: Partial<MockProject>): MockProject {
  const defaultProject: MockProject = {
    id: `proj-${Date.now()}`,
    name: 'Mock Project',
    status: 'draft',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    content: '這是測試用的專案內容文字。包含足夠的文字來生成腳本。',
  }

  return { ...defaultProject, ...overrides }
}

/**
 * 生成 Mock 圖片資料（base64）
 */
export function generateMockImageBase64(): string {
  // 最小的有效 1x1 透明 PNG
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
 * 生成 Mock 使用者資料
 */
export function generateMockUser(overrides?: Partial<MockUser>): MockUser {
  const defaultUser: MockUser = {
    id: `user-${Date.now()}`,
    email: 'test@example.com',
    name: 'Test User',
    created_at: new Date().toISOString(),
  }

  return { ...defaultUser, ...overrides }
}

/**
 * 生成 Mock 影片資料
 */
export function generateMockVideo(overrides?: Partial<MockVideo>): MockVideo {
  const defaultVideo: MockVideo = {
    id: `video-${Date.now()}`,
    project_id: `proj-${Date.now()}`,
    status: 'processing',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    video_url: null,
    thumbnail_url: null,
    duration: 0,
  }

  return { ...defaultVideo, ...overrides }
}

/**
 * 生成 Mock D-ID Talk 回應
 */
export function generateMockDIdTalk(status: 'created' | 'processing' | 'done' | 'error') {
  const baseResponse = {
    id: `talk-${Date.now()}`,
    created_at: new Date().toISOString(),
    status,
  }

  switch (status) {
    case 'done':
      return {
        ...baseResponse,
        result_url: 'https://d-id-talks-prod.s3.amazonaws.com/mock-video.mp4',
        duration: 30.5,
      }
    case 'error':
      return {
        ...baseResponse,
        error: {
          kind: 'ProcessingError',
          description: 'Failed to process video',
        },
      }
    default:
      return {
        ...baseResponse,
        result_url: null,
      }
  }
}

/**
 * 生成 Mock YouTube 影片回應
 */
export function generateMockYouTubeVideo(videoId: string) {
  return {
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
      tags: ['mock', 'test'],
      categoryId: '22',
    },
    status: {
      uploadStatus: 'uploaded',
      privacyStatus: 'public',
    },
  }
}

/**
 * 生成隨機字串
 */
export function generateRandomString(length: number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

/**
 * 生成隨機數字
 */
export function generateRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * 生成測試用的長文字內容
 */
export function generateLongText(minWords = 100): string {
  const words = [
    '人工智慧',
    '機器學習',
    '深度學習',
    '神經網路',
    '演算法',
    '資料科學',
    '大數據',
    '雲端運算',
    '物聯網',
    '區塊鏈',
    '科技',
    '創新',
    '數位轉型',
    '自動化',
    '智慧城市',
  ]

  let text = ''
  for (let i = 0; i < minWords; i++) {
    text += words[Math.floor(Math.random() * words.length)] + ' '
    if ((i + 1) % 10 === 0) {
      text += '。 '
    }
  }

  return text.trim()
}

// TypeScript 型別定義

export interface MockProject {
  id: string
  name: string
  status: string
  created_at: string
  updated_at: string
  content: string
}

export interface MockUser {
  id: string
  email: string
  name: string
  created_at: string
}

export interface MockVideo {
  id: string
  project_id: string
  status: string
  created_at: string
  updated_at: string
  video_url: string | null
  thumbnail_url: string | null
  duration: number
}
