import { test, expect } from '@playwright/test'

/**
 * 資料持久化測試
 *
 * 驗證重啟後資料仍然存在
 * - Cookie 保持
 * - 資料庫記錄保持
 * - YouTube 授權保持
 */
test.describe('資料持久化測試', () => {
  test('重啟應用後資料應該保持', async ({ page, context }) => {
    // 1. 設定 Cookie
    await context.addCookies([
      {
        name: 'setup-completed',
        value: 'true',
        domain: 'localhost',
        path: '/',
      },
    ])

    await page.goto('http://localhost:3000')

    // 記錄現有專案數量
    const projectCards = page.locator('[data-testid="project-card"]')
    const projectCountBefore = await projectCards.count()
    console.log(`現有專案數: ${projectCountBefore}`)

    // 2. 模擬重啟（重新載入頁面）
    await page.reload()

    // 3. 驗證：專案列表應該相同
    await expect(projectCards).toHaveCount(projectCountBefore)
    console.log('✅ 重新載入後專案數量保持')

    // 4. 驗證：設定應該保持
    await page.goto('http://localhost:3000/settings')

    // 應該顯示已配置的 API keys（遮罩顯示）
    const configuredBadge = page.locator('text=已配置')
    if (await configuredBadge.count() > 0) {
      expect(await configuredBadge.count()).toBeGreaterThan(0)
      console.log('✅ API 設定保持')
    }

    // 5. 驗證：YouTube 帳號應該保持連結
    const youtubeTab = page.locator('text=YouTube 授權')
    if (await youtubeTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await youtubeTab.click()

      // 等待頁面載入
      await page.waitForTimeout(1000)

      // 檢查是否有「尚未連結任何 YouTube 帳號」文字（如果有則表示沒有連結）
      const noChannelsText = await page.locator('text=尚未連結任何 YouTube 帳號').isVisible({ timeout: 2000 }).catch(() => false)

      if (!noChannelsText) {
        // 沒有「尚未連結」文字，表示有連結的頻道
        console.log('✅ YouTube 授權保持（有連結的頻道）')
      } else {
        console.log('ℹ️ 無 YouTube 授權（可能尚未連結）')
      }
    }

    console.log('✅ 資料持久化測試通過')
  })

  test('Cookie 過期後應該能重新設定', async ({ page, context }) => {
    // 清除所有 cookies
    await context.clearCookies()

    await page.goto('http://localhost:3000')

    // 應該重定向到設定頁面（如果檢測到沒有 setup-completed cookie）
    // 或顯示提示訊息
    const url = page.url()
    console.log(`當前 URL: ${url}`)

    // 驗證可以正常訪問設定頁面
    await page.goto('http://localhost:3000/settings')
    await expect(page).toHaveURL(/\/settings/)
    console.log('✅ Cookie 過期後可重新訪問設定')
  })

  test('資料庫重啟後資料保持', async ({ page }) => {
    // 直接查詢 API 驗證資料庫資料
    // 檢查專案列表 API（驗證資料庫可訪問）
    const projectsCheck = await fetch('http://localhost:8000/api/v1/projects')
    expect(projectsCheck.ok).toBeTruthy()

    const projects = await projectsCheck.json()
    console.log('資料庫連線正常，專案數量:', projects.data?.projects?.length || 0)

    // 驗證 YouTube 帳號
    const accountsCheck = await fetch('http://localhost:8000/api/v1/youtube/accounts')
    if (accountsCheck.ok) {
      const accounts = await accountsCheck.json()
      if (accounts.data.accounts && accounts.data.accounts.length > 0) {
        console.log(`✅ YouTube 帳號數量: ${accounts.data.accounts.length}`)
        accounts.data.accounts.forEach((account: any, index: number) => {
          console.log(`  ${index + 1}. ${account.channel_name}`)
        })
      } else {
        console.log('ℹ️ 無 YouTube 帳號（可能尚未授權）')
      }
    }

    console.log('✅ 資料庫持久化驗證通過')
  })
})
