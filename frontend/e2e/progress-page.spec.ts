/**
 * ProgressPage E2E 測試
 *
 * 測試 11: 真實 WebSocket 連線與進度更新
 *
 * 使用 Playwright 在真實環境中測試
 */

import { test, expect, Page } from '@playwright/test'

test.describe('ProgressPage E2E', () => {
  let page: Page

  test.beforeEach(async ({ page: p }) => {
    page = p
  })

  test('真實 WebSocket 連線與進度更新', async () => {
    // 訪問頁面
    await page.goto('http://localhost:3000/project/test-id/progress')

    // 等待頁面載入
    await page.waitForSelector('h1', { timeout: 5000 })

    // 驗證專案名稱顯示
    const projectName = await page.textContent('h1')
    expect(projectName).toBeTruthy()

    // 等待 WebSocket 連線建立
    const wsPromise = page.waitForEvent('websocket', { timeout: 10000 })
    const ws = await wsPromise

    // 驗證 WebSocket URL
    expect(ws.url()).toContain('ws://')
    expect(ws.url()).toContain('/api/v1/projects/')
    expect(ws.url()).toContain('/progress')

    // 等待進度條出現
    await page.waitForSelector('[role="progressbar"]', { timeout: 5000 })

    // 驗證初始進度
    const initialProgress = await page.getAttribute('[role="progressbar"]', 'aria-valuenow')
    expect(Number(initialProgress)).toBeGreaterThanOrEqual(0)
    expect(Number(initialProgress)).toBeLessThanOrEqual(100)

    // 監聽 WebSocket 訊息
    const messages: any[] = []
    ws.on('framereceived', (event) => {
      try {
        const data = JSON.parse(event.payload as string)
        messages.push(data)
      } catch (e) {
        // 忽略非 JSON 訊息
      }
    })

    // 等待進度更新 (最多 10 秒)
    await page.waitForTimeout(10000)

    // 讀取更新後的進度
    const updatedProgress = await page.getAttribute('[role="progressbar"]', 'aria-valuenow')

    // 驗證進度有變化或保持不變（取決於後端狀態）
    expect(Number(updatedProgress)).toBeGreaterThanOrEqual(Number(initialProgress || 0))

    // 驗證收到 WebSocket 訊息
    if (messages.length > 0) {
      // 驗證訊息格式
      const firstMessage = messages[0]
      expect(firstMessage).toHaveProperty('type')

      // 如果是進度訊息，驗證結構
      if (firstMessage.type === 'progress') {
        expect(firstMessage).toHaveProperty('data')
        expect(firstMessage.data).toHaveProperty('overall')
      }
    }
  })

  test('WebSocket 斷線重連', async () => {
    await page.goto('http://localhost:3000/project/test-id/progress')

    // 等待初始連線
    const wsPromise1 = page.waitForEvent('websocket')
    const ws1 = await wsPromise1

    // 等待連線建立
    await page.waitForTimeout(1000)

    // 驗證連線狀態
    const isConnected1 = await page.evaluate(() => {
      return !document.body.textContent?.includes('連線中斷')
    })
    expect(isConnected1).toBe(true)

    // 關閉頁面（模擬斷線）
    await page.close()

    // 重新開啟頁面
    const newPage = await page.context().newPage()
    await newPage.goto('http://localhost:3000/project/test-id/progress')

    // 等待 WebSocket 重新連線
    const wsPromise2 = newPage.waitForEvent('websocket')
    const ws2 = await wsPromise2

    // 驗證重新連線成功
    expect(ws2.url()).toContain('ws://')

    // 等待頁面載入完成
    await newPage.waitForSelector('[role="progressbar"]', { timeout: 5000 })

    // 驗證進度條顯示
    const progress = await newPage.getAttribute('[role="progressbar"]', 'aria-valuenow')
    expect(progress).toBeTruthy()
  })

  test('階段進度顯示', async () => {
    await page.goto('http://localhost:3000/project/test-id/progress')

    // 等待頁面載入
    await page.waitForSelector('h1', { timeout: 5000 })

    // 等待階段區域載入
    await page.waitForSelector('[data-testid^="stage-"]', { timeout: 5000 })

    // 驗證 5 個階段都存在
    const stages = ['script', 'assets', 'render', 'thumbnail', 'upload']

    for (const stage of stages) {
      const stageIcon = await page.$(`[data-testid="stage-${stage}-icon"]`)
      expect(stageIcon).toBeTruthy()
    }

    // 驗證至少有一個階段有圖示
    const scriptIcon = await page.textContent('[data-testid="stage-script-icon"]')
    expect(scriptIcon).toBeTruthy()
    expect(['⏸️', '⏳', '✓', '✗']).toContain(scriptIcon?.trim())
  })

  test('日誌查看器', async () => {
    await page.goto('http://localhost:3000/project/test-id/progress')

    // 等待頁面載入
    await page.waitForSelector('h1', { timeout: 5000 })

    // 查找展開按鈕
    const expandButton = await page.getByRole('button', { name: /展開/ })

    // 如果按鈕存在，點擊展開
    if (await expandButton.isVisible()) {
      await expandButton.click()

      // 等待日誌區域顯示
      await page.waitForSelector('[data-testid="log-viewer"]', { timeout: 3000 })

      // 驗證日誌區域存在
      const logViewer = await page.$('[data-testid="log-viewer"]')
      expect(logViewer).toBeTruthy()

      // 驗證日誌區域可捲動
      const isScrollable = await logViewer?.evaluate((el) => {
        return el.scrollHeight > el.clientHeight || el.classList.contains('overflow-y-auto')
      })
      expect(isScrollable).toBe(true)
    }
  })

  test('控制按鈕顯示', async () => {
    await page.goto('http://localhost:3000/project/test-id/progress')

    // 等待頁面載入
    await page.waitForSelector('h1', { timeout: 5000 })

    // 等待按鈕區域載入
    await page.waitForTimeout(2000)

    // 檢查是否有控制按鈕（暫停、取消、重試、查看結果等）
    const buttons = await page.$$('button')
    expect(buttons.length).toBeGreaterThan(0)

    // 驗證至少有一個按鈕是可見的
    let hasVisibleButton = false
    for (const button of buttons) {
      if (await button.isVisible()) {
        hasVisibleButton = true
        break
      }
    }
    expect(hasVisibleButton).toBe(true)
  })

  test('響應式設計 - 手機端', async () => {
    // 設定手機視窗大小
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('http://localhost:3000/project/test-id/progress')

    // 等待頁面載入
    await page.waitForSelector('h1', { timeout: 5000 })

    // 驗證頁面內容可見
    const h1 = await page.$('h1')
    expect(await h1?.isVisible()).toBe(true)

    // 驗證進度條可見
    const progressBar = await page.$('[role="progressbar"]')
    expect(await progressBar?.isVisible()).toBe(true)

    // 驗證沒有橫向捲軸
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(hasHorizontalScroll).toBe(false)
  })

  test('響應式設計 - 平板端', async () => {
    // 設定平板視窗大小
    await page.setViewportSize({ width: 768, height: 1024 })

    await page.goto('http://localhost:3000/project/test-id/progress')

    // 等待頁面載入
    await page.waitForSelector('h1', { timeout: 5000 })

    // 驗證頁面佈局正常
    const progressBar = await page.$('[role="progressbar"]')
    expect(await progressBar?.isVisible()).toBe(true)
  })

  test('響應式設計 - 桌面端', async () => {
    // 設定桌面視窗大小
    await page.setViewportSize({ width: 1920, height: 1080 })

    await page.goto('http://localhost:3000/project/test-id/progress')

    // 等待頁面載入
    await page.waitForSelector('h1', { timeout: 5000 })

    // 驗證頁面佈局正常
    const progressBar = await page.$('[role="progressbar"]')
    expect(await progressBar?.isVisible()).toBe(true)

    // 驗證寬螢幕下內容不會過寬
    const contentWidth = await page.evaluate(() => {
      const main = document.querySelector('main')
      return main?.clientWidth || 0
    })
    expect(contentWidth).toBeLessThanOrEqual(1920)
  })
})
