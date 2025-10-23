import { test, expect } from '@playwright/test'

/**
 * Flow-0: 首次設定流程（真實環境）
 *
 * 這個測試驗證完整的系統初始化流程，包含:
 * - 真實的 Gemini API 連線測試
 * - 真實的 Google OAuth 流程
 * - 資料庫的真實寫入
 * - Cookie 的真實設定
 *
 * ⚠️  注意:
 * - 需要真實的 GEMINI_API_KEY
 * - 需要手動完成 OAuth 授權
 * - 會實際寫入資料庫
 */
test.describe('Flow-0: 首次設定流程（真實環境）', () => {
  test.beforeAll(async () => {
    // 確保環境已啟動
    const backendHealth = await fetch('http://localhost:8000/api/v1/system/health')
    expect(backendHealth.ok).toBeTruthy()
  })

  test('應該完整完成首次設定並進入主控台', async ({ page, context }) => {
    // Step 1: 啟動應用程式
    await page.goto('http://localhost:3000')

    // 驗證：應該自動重定向到 /setup
    await expect(page).toHaveURL(/\/setup/, { timeout: 10000 })
    await expect(page.locator('h1')).toContainText('歡迎使用 YTMaker', { timeout: 5000 })

    console.log('✅ Step 1: 成功進入設定頁面')

    // Step 2: 點擊開始設定
    await page.click('text=開始設定')
    await expect(page).toHaveURL(/\/setup\/step\/1/)

    console.log('✅ Step 2: 進入 API 設定步驟')

    // Step 3-4: 設定 Gemini API Key（真實測試）
    const geminiKey = process.env.GEMINI_API_KEY
    if (!geminiKey) {
      throw new Error('❌ 缺少 GEMINI_API_KEY 環境變數')
    }

    await page.fill('input[name="gemini_api_key"]', geminiKey)
    console.log('✅ Step 3: 已輸入 Gemini API Key')

    // 點擊測試連線（真實調用 Gemini API）
    await page.click('button:has-text("測試連線")')
    console.log('⏳ Step 4: 正在測試 Gemini API 連線...')

    // 驗證：應該顯示「連線成功」
    await expect(page.locator('text=連線成功')).toBeVisible({ timeout: 10000 })
    console.log('✅ Step 4: Gemini API 連線成功（真實測試）')

    // 驗證：資料庫真的有儲存
    const dbCheck = await fetch('http://localhost:8000/api/v1/system/settings')
    const settings = await dbCheck.json()
    expect(settings.data.gemini_api_key).toBeTruthy()
    console.log('✅ Step 4: 資料庫驗證通過 - API Key 已儲存')

    // Step 5-8: Stability AI 和 D-ID（可選，可跳過）
    // 檢查頁面上是否有跳過按鈕
    const skipImageButton = page.locator('text=跳過圖片生成設定')
    if (await skipImageButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipImageButton.click()
      console.log('✅ Step 5-6: 已跳過 Stability AI 設定')
    }

    const skipAvatarButton = page.locator('text=跳過虛擬主播設定')
    if (await skipAvatarButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipAvatarButton.click()
      console.log('✅ Step 7-8: 已跳過 D-ID 設定')
    }

    // Step 9-10: YouTube 授權（真實 OAuth 流程）
    console.log('⏳ Step 9: 準備 YouTube OAuth 流程...')

    // 等待並點擊 YouTube 授權按鈕
    const youtubeButton = page.locator('button:has-text("連結 YouTube 帳號")')
    await youtubeButton.waitFor({ state: 'visible', timeout: 5000 })

    const [oauthPopup] = await Promise.all([
      context.waitForEvent('page'),
      youtubeButton.click(),
    ])

    console.log('✅ Step 9: 已開啟 OAuth 彈出視窗')

    // 驗證：開啟的是真實的 backend OAuth endpoint
    await oauthPopup.waitForLoadState()
    expect(oauthPopup.url()).toContain('localhost:8000/api/v1/youtube/auth')
    console.log('✅ Step 9: OAuth URL 正確')

    // 驗證：應該重定向到 Google OAuth（真實的）
    await oauthPopup.waitForURL(/accounts\.google\.com/, { timeout: 10000 })
    expect(oauthPopup.url()).toContain('accounts.google.com')
    console.log('✅ Step 9: 已重定向到 Google OAuth')

    // 手動暫停，讓使用者完成 OAuth
    console.log('⏸️  請在彈出視窗中完成 Google OAuth 授權...')
    console.log('授權完成後測試將自動繼續')

    // 等待 callback（真實的授權流程）
    // 設定較長的 timeout，因為需要手動操作
    await oauthPopup.waitForURL(/\/callback/, { timeout: 120000 }) // 2 分鐘
    console.log('✅ Step 10: OAuth Callback 成功')

    // 等待視窗關閉
    await oauthPopup.waitForEvent('close', { timeout: 10000 })
    console.log('✅ Step 10: OAuth 視窗已關閉')

    // 驗證：主頁面應該顯示已連結
    await expect(page.locator('text=已連結')).toBeVisible({ timeout: 5000 })
    console.log('✅ Step 10: 主頁面顯示已連結')

    // 驗證：資料庫真的有 YouTube 帳號記錄
    const accountsCheck = await fetch('http://localhost:8000/api/v1/youtube/accounts')
    const accounts = await accountsCheck.json()
    expect(accounts.data.accounts.length).toBeGreaterThan(0)

    const channelName = accounts.data.accounts[0].channel_name
    console.log(`✅ Step 10: YouTube 頻道已連結: ${channelName}`)

    // Step 11: 完成設定
    await page.click('button:has-text("完成設定")')
    console.log('✅ Step 11: 點擊完成設定')

    // 驗證：應該進入主控台
    await expect(page).toHaveURL('/', { timeout: 5000 })
    await expect(page.locator('h1')).toContainText('專案列表')
    console.log('✅ Step 11: 已進入主控台')

    // 驗證：setup-completed cookie 已設定
    const cookies = await context.cookies()
    const setupCookie = cookies.find((c) => c.name === 'setup-completed')
    expect(setupCookie?.value).toBe('true')
    console.log('✅ Step 11: Cookie 已設定')

    // 驗證：重新整理後狀態保持
    await page.reload()
    await expect(page).toHaveURL('/')
    await expect(page.locator('h1')).toContainText('專案列表')
    console.log('✅ Step 11: 重新整理後狀態保持')

    console.log('')
    console.log('🎉 Flow-0 完整測試通過！')
    console.log('  - Gemini API 連線成功')
    console.log(`  - YouTube 頻道已連結: ${channelName}`)
    console.log('  - 資料庫記錄驗證通過')
    console.log('  - Cookie 設定正確')
    console.log('  - 重新整理狀態保持')
  })

  test('應該正確處理 API Key 無效的情況', async ({ page }) => {
    await page.goto('http://localhost:3000/setup/step/1')

    // 輸入無效的 API Key
    await page.fill('input[name="gemini_api_key"]', 'invalid-key-12345')
    await page.click('button:has-text("測試連線")')

    // 驗證：應該顯示錯誤訊息（真實的 API 錯誤）
    await expect(page.locator('text=API Key 無效')).toBeVisible({ timeout: 10000 })
    console.log('✅ API Key 無效錯誤處理正確')
  })

  test('應該允許跳過 YouTube 授權', async ({ page }) => {
    await page.goto('http://localhost:3000/setup')

    // 快速通過 API 設定
    const geminiKey = process.env.GEMINI_API_KEY
    if (geminiKey) {
      await page.fill('input[name="gemini_api_key"]', geminiKey)
      await page.click('button:has-text("下一步")')
    }

    // 跳過 YouTube 授權
    const skipButton = page.locator('button:has-text("稍後設定")')
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()

      // 應該顯示警告但允許繼續
      await expect(page.locator('text=部分功能可能無法使用')).toBeVisible()
      console.log('✅ 跳過 YouTube 授權的警告正確顯示')
    }
  })
})
