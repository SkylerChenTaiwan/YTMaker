/**
 * ResultPage E2E 測試
 *
 * 測試 10: 結果頁面完整使用者流程
 *
 * 使用 Playwright 在真實環境中測試結果頁面的所有功能
 */

import { test, expect, Page } from '@playwright/test'

test.describe('ResultPage E2E', () => {
  let page: Page

  test.beforeEach(async ({ page: p }) => {
    page = p
  })

  test('用戶應該能查看結果並下載影片', async () => {
    // 1. Navigate to result page
    await page.goto('http://localhost:3000/project/test-123/result')

    // 2. Wait for page to load
    await page.waitForSelector('h1', { timeout: 10000 })

    // 3. Verify success message
    const successMessage = await page.textContent('h1')
    expect(successMessage).toContain('影片已成功生成')

    // 4. Verify YouTube player or local video player is present
    const youtubeIframe = page.locator('iframe[src*="youtube.com"]')
    const localVideo = page.locator('video[data-testid="local-video-player"]')

    const hasYouTubePlayer = await youtubeIframe.count()
    const hasLocalPlayer = await localVideo.count()

    expect(hasYouTubePlayer + hasLocalPlayer).toBeGreaterThan(0)

    if (hasYouTubePlayer > 0) {
      // Verify YouTube iframe is visible
      await expect(youtubeIframe.first()).toBeVisible()

      // Verify iframe has correct attributes
      const iframeSrc = await youtubeIframe.first().getAttribute('src')
      expect(iframeSrc).toContain('youtube.com/embed/')

      const allowFullScreen = await youtubeIframe.first().getAttribute('allowfullscreen')
      expect(allowFullScreen).toBeTruthy()
    } else {
      // Verify local video player
      await expect(localVideo.first()).toBeVisible()

      const videoSrc = await localVideo.first().getAttribute('src')
      expect(videoSrc).toBeTruthy()
    }

    // 5. Verify video info section
    await page.waitForSelector('text=影片資訊', { timeout: 5000 })
    expect(await page.textContent('text=影片資訊')).toBeTruthy()

    // Check for title section
    const titleLabel = page.locator('label:has-text("標題")')
    await expect(titleLabel).toBeVisible()

    // Check for description section
    const descLabel = page.locator('label:has-text("描述")')
    await expect(descLabel).toBeVisible()

    // 6. Verify download buttons are present
    const downloadVideoBtn = page.locator('button:has-text("下載影片")')
    const downloadThumbnailBtn = page.locator('button:has-text("下載封面")')
    const downloadAssetsBtn = page.locator('button:has-text("下載所有素材")')

    await expect(downloadVideoBtn).toBeVisible()
    await expect(downloadThumbnailBtn).toBeVisible()
    await expect(downloadAssetsBtn).toBeVisible()

    // 7. Test download video (mock download, don't actually download)
    // Note: In real E2E, you might want to skip actual download or use test server
    // For now, we just verify the button is clickable
    const isDisabled = await downloadVideoBtn.isDisabled()
    expect(isDisabled).toBe(false)

    // 8. Verify action buttons
    const editYouTubeBtn = page.locator('button:has-text("編輯 YouTube 資訊")')
    const newProjectBtn = page.locator('button:has-text("生成新影片")')
    const backBtn = page.locator('button:has-text("返回主控台")')

    // Check if at least the back button is present (others depend on video status)
    await expect(backBtn).toBeVisible()

    // 9. Test navigation - return to dashboard
    await backBtn.click()

    // Wait for navigation
    await page.waitForURL(/\/$/, { timeout: 5000 })

    // Verify we're on dashboard
    expect(page.url()).toMatch(/\/$/)
  })

  test('應該正確顯示排程發布資訊', async () => {
    // Navigate to a project with scheduled publish
    await page.goto('http://localhost:3000/project/scheduled-test/result')

    // Wait for page load
    await page.waitForSelector('h1', { timeout: 10000 })

    // Look for scheduled badge
    const scheduledBadge = page.locator('text=已排程')

    // If scheduled badge exists, verify scheduled time is shown
    if (await scheduledBadge.count() > 0) {
      await expect(scheduledBadge).toBeVisible()

      const scheduledTimeLabel = page.locator('label:has-text("排程時間")')
      await expect(scheduledTimeLabel).toBeVisible()
    }
  })

  test('應該處理錯誤狀態 - 專案未完成', async () => {
    // Try to access result of an incomplete project
    await page.goto('http://localhost:3000/project/incomplete-project/result')

    // Wait for error message
    await page.waitForSelector('text=專案尚未完成', { timeout: 10000 })

    // Verify error message
    const errorHeading = await page.textContent('h1')
    expect(errorHeading).toContain('專案尚未完成')

    // Verify return button is present
    const backBtn = page.locator('button:has-text("返回主控台")')
    await expect(backBtn).toBeVisible()

    // Should not show result content
    const videoContainer = page.locator('[data-testid="video-container"]')
    expect(await videoContainer.count()).toBe(0)
  })

  test('應該處理錯誤狀態 - 找不到專案 (404)', async () => {
    // Try to access non-existent project
    await page.goto('http://localhost:3000/project/non-existent-project-id/result')

    // Wait for error message
    await page.waitForSelector('text=找不到專案', { timeout: 10000 })

    // Verify 404 error message
    const errorHeading = await page.textContent('h1')
    expect(errorHeading).toContain('找不到專案')

    // Verify return button
    const backBtn = page.locator('button:has-text("返回主控台")')
    await expect(backBtn).toBeVisible()
  })

  test('應該在不同裝置尺寸下正確顯示（響應式）', async () => {
    // Test on desktop
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('http://localhost:3000/project/test-123/result')
    await page.waitForSelector('h1', { timeout: 10000 })

    // Verify layout looks good on desktop
    const container = page.locator('.max-w-5xl')
    await expect(container).toBeVisible()

    // Test on tablet
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.reload()
    await page.waitForSelector('h1', { timeout: 10000 })

    // Download buttons should still be visible
    const downloadBtn = page.locator('button:has-text("下載影片")')
    await expect(downloadBtn).toBeVisible()

    // Test on mobile
    await page.setViewportSize({ width: 375, height: 667 })
    await page.reload()
    await page.waitForSelector('h1', { timeout: 10000 })

    // Content should be visible on mobile
    const successMessage = await page.textContent('h1')
    expect(successMessage).toContain('影片已成功生成')

    // Buttons should stack vertically (still visible)
    const backBtn = page.locator('button:has-text("返回主控台")')
    await expect(backBtn).toBeVisible()
  })

  test('應該能開啟 YouTube Studio 編輯頁面（新視窗）', async () => {
    await page.goto('http://localhost:3000/project/test-123/result')
    await page.waitForSelector('h1', { timeout: 10000 })

    // Look for edit button
    const editBtn = page.locator('button:has-text("編輯 YouTube 資訊")')

    if (await editBtn.count() > 0) {
      // Listen for new page
      const [newPage] = await Promise.all([
        page.context().waitForEvent('page'),
        editBtn.click()
      ])

      // Verify new page URL contains YouTube Studio
      expect(newPage.url()).toContain('studio.youtube.com')

      // Close new page
      await newPage.close()
    }
  })
})
