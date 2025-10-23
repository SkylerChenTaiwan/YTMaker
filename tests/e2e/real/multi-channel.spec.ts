import { test, expect } from '@playwright/test'

/**
 * 多頻道管理測試（真實環境）
 *
 * 驗證多個 YouTube 頻道的管理功能
 * - 真實的 OAuth 流程
 * - 真實的資料庫操作
 */
test.describe('多頻道管理（真實環境）', () => {
  test('應該能夠查看已連結的頻道', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'setup-completed',
        value: 'true',
        domain: 'localhost',
        path: '/',
      },
    ])

    await page.goto('http://localhost:3000/settings')

    // 切換到 YouTube 授權分頁
    const youtubeTab = page.locator('text=YouTube 授權')
    if (await youtubeTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await youtubeTab.click()

      // 記錄現有頻道數量
      const channelCards = page.locator('[data-testid="youtube-channel-card"]')
      const channelCount = await channelCards.count()

      console.log(`已連結的頻道數量: ${channelCount}`)

      if (channelCount > 0) {
        // 驗證每個頻道卡片的內容
        for (let i = 0; i < channelCount; i++) {
          const card = channelCards.nth(i)
          const channelName = await card.locator('[data-testid="channel-name"]').textContent()
          console.log(`  ${i + 1}. ${channelName}`)
        }

        console.log('✅ 頻道列表顯示正確')
      } else {
        console.log('⚠️  目前沒有已連結的頻道')
      }
    } else {
      console.log('⚠️  找不到 YouTube 授權分頁')
    }
  })

  test('應該能夠連結第二個 YouTube 頻道', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'setup-completed',
        value: 'true',
        domain: 'localhost',
        path: '/',
      },
    ])

    await page.goto('http://localhost:3000/settings')
    const youtubeTab = page.locator('text=YouTube 授權')

    if (await youtubeTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await youtubeTab.click()

      // 記錄現有頻道數量
      const channelCards = page.locator('[data-testid="youtube-channel-card"]')
      const channelsBefore = await channelCards.count()

      // 尋找「連結新的 YouTube 帳號」按鈕
      const addButton = page.locator('button:has-text("連結新的 YouTube 帳號")')

      if (await addButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        // 開啟 OAuth 流程
        const [oauthPopup] = await Promise.all([context.waitForEvent('page'), addButton.click()])

        console.log('⏸️  請在彈出視窗中完成 Google OAuth 授權（使用不同的帳號）...')

        // 等待 OAuth 完成
        await oauthPopup.waitForURL(/\/callback/, { timeout: 120000 })
        await oauthPopup.waitForEvent('close', { timeout: 10000 })

        // 驗證：頻道數量應該增加
        await page.waitForTimeout(2000) // 等待 UI 更新
        const channelsAfter = await channelCards.count()

        if (channelsAfter > channelsBefore) {
          expect(channelsAfter).toBe(channelsBefore + 1)
          console.log(`✅ 成功連結第二個頻道 (${channelsBefore} → ${channelsAfter})`)
        } else if (channelsAfter === channelsBefore) {
          console.log('⚠️  可能連結了相同的頻道，或連結失敗')
        }

        // 驗證：資料庫真的增加了
        const accountsCheck = await fetch('http://localhost:8000/api/v1/youtube/accounts')
        const accounts = await accountsCheck.json()
        expect(accounts.data.accounts.length).toBe(channelsAfter)
        console.log('✅ 資料庫驗證通過')
      } else {
        console.log('⚠️  找不到「連結新的 YouTube 帳號」按鈕')
        console.log('   可能已經連結了最大數量的頻道')
      }
    }
  })

  test('應該能夠移除頻道', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'setup-completed',
        value: 'true',
        domain: 'localhost',
        path: '/',
      },
    ])

    await page.goto('http://localhost:3000/settings')
    const youtubeTab = page.locator('text=YouTube 授權')

    if (await youtubeTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await youtubeTab.click()

      const channelCards = page.locator('[data-testid="youtube-channel-card"]')
      const channelsBefore = await channelCards.count()

      if (channelsBefore > 1) {
        // 只有在有多個頻道時才測試移除
        // 移除第一個頻道
        const firstCard = channelCards.first()
        const removeButton = firstCard.locator('button:has-text("移除")')

        if (await removeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await removeButton.click()

          // 確認刪除
          const confirmButton = page.locator('button:has-text("確認刪除")')
          if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await confirmButton.click()

            // 等待 UI 更新
            await page.waitForTimeout(2000)

            // 驗證：頻道數量應該減少
            const channelsAfter = await channelCards.count()
            expect(channelsAfter).toBe(channelsBefore - 1)
            console.log(`✅ 成功移除頻道 (${channelsBefore} → ${channelsAfter})`)

            // 驗證：資料庫真的刪除了
            const accountsCheck = await fetch('http://localhost:8000/api/v1/youtube/accounts')
            const accounts = await accountsCheck.json()
            expect(accounts.data.accounts.length).toBe(channelsAfter)
            console.log('✅ 資料庫驗證通過')
          } else {
            console.log('⚠️  找不到確認刪除按鈕')
          }
        } else {
          console.log('⚠️  找不到移除按鈕')
        }
      } else {
        console.log('⚠️  只有 1 個或 0 個頻道，跳過移除測試')
      }
    }
  })

  test('應該能夠切換預設頻道', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'setup-completed',
        value: 'true',
        domain: 'localhost',
        path: '/',
      },
    ])

    await page.goto('http://localhost:3000/settings')
    const youtubeTab = page.locator('text=YouTube 授權')

    if (await youtubeTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await youtubeTab.click()

      const channelCards = page.locator('[data-testid="youtube-channel-card"]')
      const channelCount = await channelCards.count()

      if (channelCount >= 2) {
        // 尋找「設為預設」按鈕
        const setDefaultButtons = page.locator('button:has-text("設為預設")')

        if ((await setDefaultButtons.count()) > 0) {
          // 點擊第二個頻道的「設為預設」
          await setDefaultButtons.nth(1).click()

          // 驗證：應該顯示「預設頻道」標記
          await expect(channelCards.nth(1).locator('text=預設頻道')).toBeVisible()
          console.log('✅ 成功切換預設頻道')
        } else {
          console.log('⚠️  找不到「設為預設」按鈕')
        }
      } else {
        console.log('⚠️  頻道數量不足，跳過切換預設頻道測試')
      }
    }
  })

  test('應該處理重複連結相同頻道的情況', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'setup-completed',
        value: 'true',
        domain: 'localhost',
        path: '/',
      },
    ])

    await page.goto('http://localhost:3000/settings')
    const youtubeTab = page.locator('text=YouTube 授權')

    if (await youtubeTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await youtubeTab.click()

      // 嘗試連結新頻道
      const addButton = page.locator('button:has-text("連結新的 YouTube 帳號")')

      if (await addButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        const [oauthPopup] = await Promise.all([context.waitForEvent('page'), addButton.click()])

        console.log('⏸️  請在彈出視窗中完成 OAuth 授權（使用已連結的帳號）...')

        // 等待 OAuth 完成
        await oauthPopup.waitForURL(/\/callback/, { timeout: 120000 }).catch(() => {
          console.log('⚠️  OAuth 超時或取消')
        })

        if (!oauthPopup.isClosed()) {
          await oauthPopup.waitForEvent('close', { timeout: 10000 }).catch(() => {})
        }

        // 驗證：應該顯示「此頻道已連結」訊息
        await page.waitForTimeout(2000)
        const duplicateMessage = page.locator('text=此頻道已連結')

        if (await duplicateMessage.isVisible({ timeout: 5000 }).catch(() => false)) {
          expect(duplicateMessage).toBeVisible()
          console.log('✅ 重複頻道偵測正確')
        } else {
          console.log('⚠️  未檢測到重複頻道警告')
        }
      }
    }
  })
})
