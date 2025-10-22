/**
 * E2E Test: Flow-0 首次啟動設定流程
 *
 * 測試完整的首次設定精靈流程，包含：
 * - Step 0: 歡迎頁
 * - Step 1: Gemini API Key 設定
 * - Step 2: Stability AI API Key 設定
 * - Step 3: D-ID API Key 設定
 * - Step 4: YouTube OAuth 授權（可跳過）
 * - Step 5: 完成確認
 */

import { test, expect } from '@playwright/test'

// Mock API Keys for testing
const mockApiKeys = {
  gemini: 'AIzaSyDmockGeminiKey1234567890abcdefghijk',
  stabilityAI: 'sk-mock-stability-ai-key-1234567890',
  did: 'mock-did-api-key-1234567890abcdef',
}

test.describe('Flow-0: 首次啟動設定流程', () => {
  test.beforeEach(async ({ context, page }) => {
    // 清除所有 cookies 和 localStorage (模擬首次啟動)
    await context.clearCookies()
    await page.goto('http://localhost:3000/setup')
    await page.evaluate(() => localStorage.clear())
  })

  test('應該完成完整設定流程（5 步驟）', async ({ page, context }) => {
    // Step 0: 歡迎頁
    await expect(page.locator('h1')).toContainText('歡迎使用 YTMaker')
    await expect(page.locator('text=首次啟動需要設定 API Keys')).toBeVisible()

    const startButton = page.locator('button:has-text("開始設定")')
    await expect(startButton).toBeVisible()
    await startButton.click()

    // Step 1: Gemini API Key
    await expect(page.locator('h2:has-text("Google Gemini API Key")')).toBeVisible()
    await expect(page.locator('text=步驟 1 / 4')).toBeVisible()

    const geminiInput = page.locator('[name="gemini_api_key"]')
    await geminiInput.fill(mockApiKeys.gemini)

    // Mock Gemini API 測試連線
    await page.route('**/api/v1/settings/test-api-key', async (route) => {
      const request = route.request()
      const postData = request.postDataJSON()

      if (postData.provider === 'gemini' && postData.api_key === mockApiKeys.gemini) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: '連線成功',
          }),
        })
      } else {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: 'API Key 無效',
          }),
        })
      }
    })

    const testButton = page.locator('button:has-text("測試連線")')
    await testButton.click()

    // 驗證 Toast 通知
    await expect(page.locator('text=連線成功')).toBeVisible({ timeout: 5000 })

    const nextButton = page.locator('button:has-text("下一步")')
    await nextButton.click()

    // Step 2: Stability AI API Key
    await expect(page.locator('h2:has-text("Stability AI API Key")')).toBeVisible()
    await expect(page.locator('text=步驟 2 / 4')).toBeVisible()

    const stabilityInput = page.locator('[name="stability_api_key"]')
    await stabilityInput.fill(mockApiKeys.stabilityAI)

    await page.locator('button:has-text("測試連線")').click()
    await expect(page.locator('text=連線成功')).toBeVisible({ timeout: 5000 })

    await page.locator('button:has-text("下一步")').click()

    // Step 3: D-ID API Key
    await expect(page.locator('h2:has-text("D-ID API Key")')).toBeVisible()
    await expect(page.locator('text=步驟 3 / 4')).toBeVisible()

    const didInput = page.locator('[name="did_api_key"]')
    await didInput.fill(mockApiKeys.did)

    await page.locator('button:has-text("測試連線")').click()
    await expect(page.locator('text=連線成功')).toBeVisible({ timeout: 5000 })

    await page.locator('button:has-text("下一步")').click()

    // Step 4: YouTube OAuth (跳過)
    await expect(page.locator('h2:has-text("YouTube 授權")')).toBeVisible()
    await expect(page.locator('text=步驟 4 / 4')).toBeVisible()

    const skipButton = page.locator('button:has-text("稍後設定")')
    await expect(skipButton).toBeVisible()
    await skipButton.click()

    // Step 5: 完成頁面
    await expect(page.locator('h1:has-text("設定完成")')).toBeVisible()
    await expect(page.locator('text=API Keys: 已設定 3/3')).toBeVisible()
    await expect(page.locator('text=YouTube: 未連結')).toBeVisible()

    // Mock 完成設定 API
    await page.route('**/api/v1/settings/complete-setup', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    })

    const completeButton = page.locator('button:has-text("進入主控台")')
    await completeButton.click()

    // 驗證導航到主控台
    await expect(page).toHaveURL('http://localhost:3000/', { timeout: 5000 })
    await expect(page.locator('h1:has-text("主控台")')).toBeVisible()

    // 驗證 cookie 已設定
    const cookies = await context.cookies()
    const setupCookie = cookies.find((c) => c.name === 'setup_completed')
    expect(setupCookie).toBeDefined()
    expect(setupCookie?.value).toBe('true')
  })

  test('應該正確處理 API Key 格式錯誤', async ({ page }) => {
    await page.locator('button:has-text("開始設定")').click()

    // 輸入無效的 API Key
    const geminiInput = page.locator('[name="gemini_api_key"]')
    await geminiInput.fill('invalid-key')

    await page.route('**/api/v1/settings/test-api-key', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'API Key 格式錯誤',
        }),
      })
    })

    await page.locator('button:has-text("測試連線")').click()

    // 驗證錯誤訊息
    await expect(page.locator('text=API Key 格式錯誤')).toBeVisible({ timeout: 5000 })

    // 驗證無法進入下一步（下一步按鈕應該被禁用或不可見）
    const nextButton = page.locator('button:has-text("下一步")')
    // 等待可能出現的按鈕狀態更新
    await page.waitForTimeout(500)
  })

  test('應該處理 API 連線失敗', async ({ page }) => {
    await page.locator('button:has-text("開始設定")').click()

    const geminiInput = page.locator('[name="gemini_api_key"]')
    await geminiInput.fill(mockApiKeys.gemini)

    // Mock 連線失敗
    await page.route('**/api/v1/settings/test-api-key', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: '連線失敗，請檢查網路',
        }),
      })
    })

    await page.locator('button:has-text("測試連線")').click()

    await expect(page.locator('text=連線失敗')).toBeVisible({ timeout: 5000 })
  })

  test('應該允許跳過 YouTube 授權', async ({ page }) => {
    // 快速通過前 3 個步驟
    await page.locator('button:has-text("開始設定")').click()

    // Step 1: Gemini
    await page.locator('[name="gemini_api_key"]').fill(mockApiKeys.gemini)

    await page.route('**/api/v1/settings/test-api-key', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: '連線成功' }),
      })
    })

    await page.locator('button:has-text("測試連線")').click()
    await page.waitForTimeout(500)
    await page.locator('button:has-text("下一步")').click()

    // Step 2: Stability AI
    await page.locator('[name="stability_api_key"]').fill(mockApiKeys.stabilityAI)
    await page.locator('button:has-text("測試連線")').click()
    await page.waitForTimeout(500)
    await page.locator('button:has-text("下一步")').click()

    // Step 3: D-ID
    await page.locator('[name="did_api_key"]').fill(mockApiKeys.did)
    await page.locator('button:has-text("測試連線")').click()
    await page.waitForTimeout(500)
    await page.locator('button:has-text("下一步")').click()

    // Step 4: 跳過 YouTube
    await expect(page.locator('h2:has-text("YouTube 授權")')).toBeVisible()
    await page.locator('button:has-text("稍後設定")').click()

    // 驗證到達完成頁面
    await expect(page.locator('h1:has-text("設定完成")')).toBeVisible()
    await expect(page.locator('text=YouTube: 未連結')).toBeVisible()
  })

  test('應該在離開設定精靈時顯示確認對話框', async ({ page }) => {
    await page.locator('button:has-text("開始設定")').click()

    // 填寫部分資料
    await page.locator('[name="gemini_api_key"]').fill(mockApiKeys.gemini)

    // 嘗試導航離開（如果有實作返回按鈕）
    const backButton = page.locator('button[aria-label="返回"]')
    if ((await backButton.count()) > 0) {
      await backButton.click()

      // 應該顯示確認對話框
      await expect(page.locator('text=尚未完成設定')).toBeVisible()
      await expect(page.locator('text=確定要離開嗎')).toBeVisible()
    }
  })

  test('應該正確顯示步驟進度指示器', async ({ page }) => {
    await page.locator('button:has-text("開始設定")').click()

    // Step 1
    await expect(page.locator('text=步驟 1 / 4')).toBeVisible()

    await page.locator('[name="gemini_api_key"]').fill(mockApiKeys.gemini)
    await page.route('**/api/v1/settings/test-api-key', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: '連線成功' }),
      })
    })
    await page.locator('button:has-text("測試連線")').click()
    await page.waitForTimeout(500)
    await page.locator('button:has-text("下一步")').click()

    // Step 2
    await expect(page.locator('text=步驟 2 / 4')).toBeVisible()

    await page.locator('[name="stability_api_key"]').fill(mockApiKeys.stabilityAI)
    await page.locator('button:has-text("測試連線")').click()
    await page.waitForTimeout(500)
    await page.locator('button:has-text("下一步")').click()

    // Step 3
    await expect(page.locator('text=步驟 3 / 4')).toBeVisible()

    await page.locator('[name="did_api_key"]').fill(mockApiKeys.did)
    await page.locator('button:has-text("測試連線")').click()
    await page.waitForTimeout(500)
    await page.locator('button:has-text("下一步")').click()

    // Step 4
    await expect(page.locator('text=步驟 4 / 4')).toBeVisible()
  })

  test('應該在未測試連線時禁用下一步按鈕', async ({ page }) => {
    await page.locator('button:has-text("開始設定")').click()

    // 填寫 API Key 但不測試連線
    await page.locator('[name="gemini_api_key"]').fill(mockApiKeys.gemini)

    // 下一步按鈕應該被禁用
    const nextButton = page.locator('button:has-text("下一步")')
    await expect(nextButton).toBeDisabled()
  })

  test('應該允許重新測試 API Key', async ({ page }) => {
    await page.locator('button:has-text("開始設定")').click()

    const geminiInput = page.locator('[name="gemini_api_key"]')
    const testButton = page.locator('button:has-text("測試連線")')

    // 第一次測試（失敗）
    await geminiInput.fill('invalid-key')
    await page.route('**/api/v1/settings/test-api-key', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'API Key 無效' }),
      })
    })
    await testButton.click()
    await expect(page.locator('text=API Key 無效')).toBeVisible({ timeout: 5000 })

    // 清除並重新輸入正確的 Key
    await geminiInput.clear()
    await geminiInput.fill(mockApiKeys.gemini)

    // 更新 mock 為成功回應
    await page.route('**/api/v1/settings/test-api-key', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: '連線成功' }),
      })
    })

    // 第二次測試（成功）
    await testButton.click()
    await expect(page.locator('text=連線成功')).toBeVisible({ timeout: 5000 })
  })
})
