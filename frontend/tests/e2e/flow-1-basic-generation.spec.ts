/**
 * E2E Test: Flow-1 基本影片生成流程
 *
 * 測試完整的影片生成流程，包含 6 個階段：
 * - Stage 1: 新增專案 (Page-3)
 * - Stage 2: 視覺化配置 (Page-4)
 * - Stage 3: Prompt 與模型設定 (Page-5)
 * - Stage 4: YouTube 設定 (Page-6)
 * - Stage 5: 進度監控 (Page-7) + WebSocket
 * - Stage 6: 結果頁面 (Page-8)
 */

import { test, expect } from '@playwright/test'
import { generateMockScript } from './utils/mock-data'

// Mock Data
const mockProjectId = '550e8400-e29b-41d4-a716-446655440000'
const mockContentText = '這是測試用的專案內容文字。'.repeat(50) // ~500 字

const mockPromptTemplates = [
  {
    id: 'default',
    name: '預設範本',
    content: '請將以下內容轉換為影片腳本...' + 'x'.repeat(150),
  },
  {
    id: 'custom-1',
    name: '教學影片範本',
    content: '請創建一個教學風格的影片腳本...' + 'x'.repeat(150),
  },
]

const mockGeneratedScript = generateMockScript(12) // 12 個段落

const mockProgressUpdates = [
  { stage: 'script', status: 'processing', progress: 10, message: '正在生成腳本...' },
  { stage: 'script', status: 'completed', progress: 20, message: '腳本生成完成' },
  { stage: 'assets', status: 'processing', progress: 30, message: '正在生成語音...' },
  { stage: 'assets', status: 'processing', progress: 50, message: '正在生成圖片...' },
  { stage: 'assets', status: 'completed', progress: 60, message: '素材生成完成' },
  { stage: 'rendering', status: 'processing', progress: 70, message: '正在渲染影片...' },
  { stage: 'rendering', status: 'completed', progress: 90, message: '影片渲染完成' },
  { stage: 'uploading', status: 'processing', progress: 95, message: '正在上傳到 YouTube...' },
  { stage: 'uploading', status: 'completed', progress: 100, message: '上傳完成' },
]

test.describe('Flow-1: 基本影片生成流程', () => {
  test.beforeEach(async ({ page, context }) => {
    // 設定 setup_completed cookie (跳過首次設定)
    await context.addCookies([
      {
        name: 'setup_completed',
        value: 'true',
        domain: 'localhost',
        path: '/',
      },
    ])

    // Mock Prompt Templates API
    await page.route('**/api/v1/prompt-templates', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockPromptTemplates),
      })
    })
  })

  test('應該完成完整影片生成流程（6 階段）', async ({ page }) => {
    // === Stage 1: 新增專案 (Page-3) ===
    await page.goto('http://localhost:3000/')
    await expect(page.locator('h1:has-text("主控台")')).toBeVisible()

    // 點擊新增專案
    const newProjectButton = page.locator('button:has-text("新增專案")')
    await newProjectButton.click()

    // 驗證導航到新增專案頁面
    await expect(page).toHaveURL(/\/project\/new/)
    await expect(page.locator('h1:has-text("新增專案")')).toBeVisible()

    // 填寫專案名稱
    const projectNameInput = page.locator('[name="project_name"]')
    await projectNameInput.fill('測試影片專案')

    // 填寫或上傳文字內容
    const contentTextarea = page.locator('[name="content"]')
    await contentTextarea.fill(mockContentText)

    // 驗證字數顯示
    await expect(page.locator('text=/字數:/i')).toBeVisible()
    await expect(page.locator('text=/500/i')).toBeVisible() // 應該顯示約 500 字

    // Mock 建立專案 API
    await page.route('**/api/v1/projects', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: mockProjectId,
            project_name: '測試影片專案',
            content: mockContentText,
            status: 'draft',
          }),
        })
      }
    })

    // 點擊下一步
    await page.locator('button:has-text("下一步")').click()

    // === Stage 2: 視覺化配置 (Page-4) ===
    await expect(page).toHaveURL(new RegExp(`/project/${mockProjectId}/configure/visual`))
    await expect(page.locator('h1:has-text("視覺元素配置")')).toBeVisible()

    // 驗證步驟指示器
    await expect(page.locator('text=步驟 2')).toBeVisible()

    // 配置字幕位置
    const subtitlePositionSelect = page.locator('[data-testid="subtitle-position-select"]')
    if ((await subtitlePositionSelect.count()) > 0) {
      await subtitlePositionSelect.selectOption('bottom')
    }

    // 配置字幕樣式
    const fontSizeInput = page.locator('[data-testid="subtitle-font-size"]')
    if ((await fontSizeInput.count()) > 0) {
      await fontSizeInput.fill('48')
    }

    // Mock 儲存視覺配置 API
    await page.route(`**/api/v1/projects/${mockProjectId}/visual-config`, async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      }
    })

    // 點擊下一步
    await page.locator('button:has-text("下一步")').click()

    // === Stage 3: Prompt 與模型設定 (Page-5) ===
    await expect(page).toHaveURL(
      new RegExp(`/project/${mockProjectId}/configure/prompt-model`)
    )
    await expect(page.locator('h1:has-text("Prompt 與模型設定")')).toBeVisible()
    await expect(page.locator('text=步驟 3')).toBeVisible()

    // 選擇 Prompt 範本
    const promptTemplateSelect = page.locator('[data-testid="prompt-template-select"]')
    await promptTemplateSelect.selectOption('default')

    // 驗證 Prompt 內容已載入
    const promptEditor = page.locator('[data-testid="prompt-editor"]')
    await expect(promptEditor).not.toBeEmpty()

    // 選擇 Gemini 模型
    const modelFlashRadio = page.locator('[data-testid="model-gemini-1-5-flash"]')
    await modelFlashRadio.click()

    // Mock 儲存 Prompt 設定 API
    await page.route(`**/api/v1/projects/${mockProjectId}/prompt-settings`, async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      }
    })

    // 點擊下一步
    await page.locator('button:has-text("下一步")').click()

    // === Stage 4: YouTube 設定 (Page-6) ===
    await expect(page).toHaveURL(new RegExp(`/project/${mockProjectId}/configure/youtube`))
    await expect(page.locator('h1:has-text("YouTube 設定")')).toBeVisible()
    await expect(page.locator('text=步驟 4')).toBeVisible()

    // 填寫 YouTube 資訊
    await page.locator('[data-testid="youtube-title"]').fill('測試影片標題')
    await page
      .locator('[data-testid="youtube-description"]')
      .fill('這是一個測試影片的描述內容')

    // 新增標籤
    const tagInput = page.locator('[data-testid="youtube-tags-input"]')
    await tagInput.fill('測試')
    await tagInput.press('Enter')
    await expect(page.locator('text=測試')).toBeVisible()

    await tagInput.fill('AI')
    await tagInput.press('Enter')
    await expect(page.locator('text=AI')).toBeVisible()

    // 選擇隱私設定（預設應該是 public）
    const privacyPublicRadio = page.locator('[data-testid="privacy-public"]')
    await expect(privacyPublicRadio).toBeChecked()

    // 選擇立即發布
    const immediatePublishRadio = page.locator('[data-testid="publish-immediate"]')
    await immediatePublishRadio.click()

    // Mock 儲存 YouTube 設定 API
    await page.route(`**/api/v1/projects/${mockProjectId}/youtube-settings`, async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      }
    })

    // Mock 開始生成 API
    await page.route(`**/api/v1/projects/${mockProjectId}/generate`, async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: '開始生成影片',
          }),
        })
      }
    })

    // 點擊開始生成
    await page.locator('button:has-text("開始生成")').click()

    // === Stage 5: 進度監控 (Page-7) ===
    await expect(page).toHaveURL(new RegExp(`/project/${mockProjectId}/progress`))
    await expect(page.locator('h1:has-text("進度監控")')).toBeVisible()

    // Mock 進度 API (polling)
    await page.route(`**/api/v1/projects/${mockProjectId}/progress`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          stage: 'script',
          status: 'processing',
          progress: 10,
          message: '正在生成腳本...',
        }),
      })
    })

    // 驗證進度條顯示
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible()
    await expect(page.locator('text=正在生成腳本')).toBeVisible()

    // 模擬進度更新
    let updateIndex = 0
    await page.route(`**/api/v1/projects/${mockProjectId}/progress`, async (route) => {
      const update = mockProgressUpdates[Math.min(updateIndex, mockProgressUpdates.length - 1)]
      updateIndex++

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(update),
      })
    })

    // 等待進度完成（實際測試中應該要 mock WebSocket）
    await page.waitForTimeout(2000) // 模擬進度推進

    // 當進度完成時，應該自動導航到結果頁面
    // Mock 完成狀態
    await page.route(`**/api/v1/projects/${mockProjectId}/progress`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          stage: 'completed',
          status: 'completed',
          progress: 100,
          message: '影片生成完成',
        }),
      })
    })

    // 模擬點擊「查看結果」或自動跳轉
    const viewResultButton = page.locator('button:has-text("查看結果")')
    if (await viewResultButton.isVisible({ timeout: 5000 })) {
      await viewResultButton.click()
    }

    // === Stage 6: 結果頁面 (Page-8) ===
    await expect(page).toHaveURL(new RegExp(`/project/${mockProjectId}/result`), {
      timeout: 10000,
    })
    await expect(page.locator('h1:has-text("生成結果")')).toBeVisible()

    // Mock 結果 API
    await page.route(`**/api/v1/projects/${mockProjectId}/result`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          project_id: mockProjectId,
          project_name: '測試影片專案',
          status: 'completed',
          video_url: 'https://www.youtube.com/watch?v=mock-video-id',
          thumbnail_url: 'https://i.ytimg.com/vi/mock-video-id/maxresdefault.jpg',
          local_video_path: '/output/videos/550e8400-e29b-41d4-a716-446655440000.mp4',
          duration: 300,
          script: mockGeneratedScript,
          completed_at: new Date().toISOString(),
        }),
      })
    })

    // 重新載入以觸發 API 呼叫
    await page.reload()

    // 驗證結果頁面內容
    await expect(page.locator('text=影片已成功生成並上傳')).toBeVisible()
    await expect(page.locator('[data-testid="video-preview"]')).toBeVisible()
    await expect(page.locator('text=YouTube 連結')).toBeVisible()
    await expect(page.locator('a[href*="youtube.com"]')).toBeVisible()

    // 驗證可以下載本地檔案
    const downloadButton = page.locator('button:has-text("下載影片")')
    await expect(downloadButton).toBeVisible()
  })

  test('應該正確驗證文字內容長度', async ({ page }) => {
    await page.goto('http://localhost:3000/project/new')

    const contentTextarea = page.locator('[name="content"]')
    const nextButton = page.locator('button:has-text("下一步")')

    // 輸入過短的文字 (< 500 字)
    await contentTextarea.fill('太短的文字')
    await expect(page.locator('text=文字長度必須在 500-10000 字之間')).toBeVisible()
    await expect(nextButton).toBeDisabled()

    // 輸入合適長度的文字
    await contentTextarea.fill('這是測試用的內容。'.repeat(50))
    await expect(nextButton).toBeEnabled()
  })

  test('應該在 YouTube 設定時驗證必填欄位', async ({ page }) => {
    // 快速跳到 YouTube 設定頁面（假設已經完成前面步驟）
    await page.goto(`http://localhost:3000/project/${mockProjectId}/configure/youtube`)

    // Mock 專案資料
    await page.route(`**/api/v1/projects/${mockProjectId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: mockProjectId,
          project_name: '測試專案',
          status: 'draft',
        }),
      })
    })

    await page.reload()

    // 不填寫標題直接點擊開始生成
    await page.locator('button:has-text("開始生成")').click()

    // 應該顯示驗證錯誤
    await expect(page.locator('text=標題不能為空')).toBeVisible()

    // 應該保持在當前頁面
    await expect(page).toHaveURL(new RegExp(`/project/${mockProjectId}/configure/youtube`))
  })

  test('應該支援排程發布功能', async ({ page }) => {
    await page.goto(`http://localhost:3000/project/${mockProjectId}/configure/youtube`)

    await page.route(`**/api/v1/projects/${mockProjectId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: mockProjectId,
          project_name: '測試專案',
          status: 'draft',
        }),
      })
    })

    await page.reload()

    // 填寫必填欄位
    await page.locator('[data-testid="youtube-title"]').fill('排程測試影片')

    // 選擇排程發布
    const scheduleRadio = page.locator('[data-testid="publish-scheduled"]')
    await scheduleRadio.click()

    // 驗證日期時間選擇器出現
    await expect(page.locator('label:has-text("排程日期")')).toBeVisible()
    await expect(page.locator('label:has-text("排程時間")')).toBeVisible()

    // 選擇未來日期
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateString = tomorrow.toISOString().split('T')[0]

    await page.locator('[data-testid="schedule-date"]').fill(dateString)
    await page.locator('[data-testid="schedule-time"]').fill('14:00')

    // Mock API
    await page.route(`**/api/v1/projects/${mockProjectId}/youtube-settings`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    })

    await page.route(`**/api/v1/projects/${mockProjectId}/generate`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    })

    // 點擊開始生成
    await page.locator('button:has-text("開始生成")').click()

    // 應該導航到進度頁面
    await expect(page).toHaveURL(new RegExp(`/project/${mockProjectId}/progress`))
  })

  test('應該在進度頁面顯示即時進度更新', async ({ page }) => {
    await page.goto(`http://localhost:3000/project/${mockProjectId}/progress`)

    // Mock 進度 API 返回不同階段
    let callCount = 0
    await page.route(`**/api/v1/projects/${mockProjectId}/progress`, async (route) => {
      const updates = [
        { stage: 'script', progress: 20, message: '正在生成腳本...' },
        { stage: 'assets', progress: 50, message: '正在生成素材...' },
        { stage: 'rendering', progress: 80, message: '正在渲染影片...' },
      ]

      const update = updates[Math.min(callCount, updates.length - 1)]
      callCount++

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(update),
      })
    })

    await page.reload()

    // 驗證進度條存在
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible()

    // 驗證進度訊息
    await expect(page.locator('text=正在生成')).toBeVisible()
  })

  test('應該處理生成失敗情況', async ({ page }) => {
    await page.goto(`http://localhost:3000/project/${mockProjectId}/progress`)

    // Mock 失敗狀態
    await page.route(`**/api/v1/projects/${mockProjectId}/progress`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          stage: 'script',
          status: 'failed',
          progress: 10,
          message: '腳本生成失敗：API 錯誤',
          error: 'Gemini API 回應錯誤',
        }),
      })
    })

    await page.reload()

    // 驗證錯誤訊息顯示
    await expect(page.locator('text=生成失敗')).toBeVisible()
    await expect(page.locator('text=API 錯誤')).toBeVisible()

    // 驗證重試按鈕出現
    const retryButton = page.locator('button:has-text("重試")')
    await expect(retryButton).toBeVisible()
  })

  test('應該允許在結果頁面查看詳細腳本', async ({ page }) => {
    await page.goto(`http://localhost:3000/project/${mockProjectId}/result`)

    // Mock 結果 API
    await page.route(`**/api/v1/projects/${mockProjectId}/result`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          project_id: mockProjectId,
          status: 'completed',
          video_url: 'https://www.youtube.com/watch?v=mock-video-id',
          script: mockGeneratedScript,
        }),
      })
    })

    await page.reload()

    // 點擊查看腳本
    const viewScriptButton = page.locator('button:has-text("查看腳本")')
    if (await viewScriptButton.isVisible({ timeout: 3000 })) {
      await viewScriptButton.click()

      // 驗證腳本對話框或頁面出現
      await expect(page.locator('text=影片腳本')).toBeVisible()
      await expect(page.locator('text=開場')).toBeVisible()
      await expect(page.locator('text=段落')).toBeVisible()
      await expect(page.locator('text=結尾')).toBeVisible()
    }
  })
})
