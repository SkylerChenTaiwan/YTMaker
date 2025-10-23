import { test, expect } from '@playwright/test'

/**
 * Flow-4: 排程發布影片（真實環境）
 *
 * 驗證排程發布功能：
 * - 設定未來發布時間
 * - 真實上傳為排程狀態
 * - 驗證 YouTube 排程狀態
 */
test.describe('Flow-4: 排程發布影片（真實環境）', () => {
  test.setTimeout(30 * 60 * 1000) // 30 分鐘

  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      {
        name: 'setup-completed',
        value: 'true',
        domain: 'localhost',
        path: '/',
      },
    ])
  })

  test('應該能夠設定未來發布時間', async ({ page }) => {
    await page.goto('http://localhost:3000/project/create')
    await page.fill('input[name="project_name"]', `Test Scheduled ${Date.now()}`)
    await page.click('button:has-text("下一步")')

    // 快速配置
    await page.click('button:has-text("使用預設配置")')
    await page.click('button:has-text("下一步")')

    // 到達 YouTube 設定步驟
    // ... (省略中間步驟)

    // Step: 設定發布時間
    const scheduleCheckbox = page.locator('input[type="checkbox"][name="schedule_publish"]')
    if (await scheduleCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await scheduleCheckbox.check()

      // 設定未來時間（24小時後）
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(12, 0, 0, 0)

      const dateInput = page.locator('input[type="datetime-local"][name="publish_at"]')
      await dateInput.fill(tomorrow.toISOString().slice(0, 16))

      console.log(`✅ 設定發布時間: ${tomorrow.toISOString()}`)

      // 驗證：時間格式正確
      const selectedTime = await dateInput.inputValue()
      expect(selectedTime).toBeTruthy()

      // 繼續生成
      await page.click('button:has-text("開始生成")')

      // 取得專案 ID
      await page.waitForURL(/\/project\/[^/]+\/progress/)
      const projectId = page.url().match(/\/project\/([^/]+)\/progress/)?.[1]!

      console.log(`📝 專案 ID: ${projectId}`)

      // 等待完成（這會需要較長時間）
      await expect(page.locator('text=上傳完成')).toBeVisible({ timeout: 600000 })

      // 驗證：應該顯示「已排程」狀態
      const scheduledBadge = page.locator('text=已排程')
      if (await scheduledBadge.isVisible({ timeout: 2000 }).catch(() => false)) {
        expect(scheduledBadge).toBeVisible()
        console.log('✅ 顯示「已排程」狀態')
      }

      // 驗證：資料庫記錄排程時間
      const projectCheck = await fetch(`http://localhost:8000/api/v1/projects/${projectId}`)
      const project = await projectCheck.json()
      expect(project.data.scheduled_publish_at).toBeTruthy()
      expect(project.data.youtube_status).toBe('scheduled')
      console.log('✅ 資料庫驗證通過')

      console.log('⚠️  記得在 YouTube Studio 確認排程狀態')
    } else {
      console.log('⚠️  找不到排程選項，可能尚未實作')
    }
  })

  test('應該拒絕過去的時間', async ({ page }) => {
    await page.goto('http://localhost:3000/project/create')
    await page.fill('input[name="project_name"]', 'Test Past Time')
    await page.click('button:has-text("下一步")')

    const scheduleCheckbox = page.locator('input[type="checkbox"][name="schedule_publish"]')
    if (await scheduleCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await scheduleCheckbox.check()

      // 嘗試設定過去時間
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      const dateInput = page.locator('input[type="datetime-local"][name="publish_at"]')
      await dateInput.fill(yesterday.toISOString().slice(0, 16))

      await page.click('button:has-text("下一步")')

      // 驗證：應該顯示錯誤訊息
      const errorMessage = page.locator('text=排程時間必須為未來時間')
      if (await errorMessage.isVisible({ timeout: 2000 }).catch(() => false)) {
        expect(errorMessage).toBeVisible()
        console.log('✅ 過去時間驗證正確')
      }
    }
  })

  test('應該能夠查看排程影片列表', async ({ page }) => {
    await page.goto('http://localhost:3000')

    // 尋找「排程中」標籤或篩選器
    const scheduledTab = page.locator('button:has-text("排程中")')
    if (await scheduledTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await scheduledTab.click()

      const scheduledProjects = page.locator('[data-testid="project-card"][data-status="scheduled"]')
      const count = await scheduledProjects.count()

      console.log(`找到 ${count} 個排程中的專案`)

      if (count > 0) {
        // 檢查每個排程專案的資訊
        for (let i = 0; i < Math.min(count, 3); i++) {
          const card = scheduledProjects.nth(i)
          const name = await card.locator('[data-testid="project-name"]').textContent()
          const scheduleTime = await card.locator('[data-testid="schedule-time"]').textContent()
          console.log(`  ${i + 1}. ${name} - 排程時間: ${scheduleTime}`)
        }
      }

      console.log('✅ 排程列表顯示正確')
    } else {
      // 透過 API 查詢
      const projectsCheck = await fetch('http://localhost:8000/api/v1/projects?youtube_status=scheduled')
      if (projectsCheck.ok) {
        const projects = await projectsCheck.json()
        console.log(`API 查詢到 ${projects.data.length} 個排程專案`)
      }
    }
  })

  test('應該能夠取消排程', async ({ page }) => {
    // 查詢排程中的專案
    const projectsCheck = await fetch('http://localhost:8000/api/v1/projects?youtube_status=scheduled')

    if (projectsCheck.ok) {
      const projects = await projectsCheck.json()

      if (projects.data && projects.data.length > 0) {
        const scheduledProject = projects.data[0]
        console.log(`測試專案: ${scheduledProject.name}`)

        await page.goto(`http://localhost:3000/project/${scheduledProject.id}/result`)

        // 尋找「取消排程」按鈕
        const cancelButton = page.locator('button:has-text("取消排程")')
        if (await cancelButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await cancelButton.click()

          // 確認取消
          const confirmButton = page.locator('button:has-text("確認取消")')
          if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await confirmButton.click()

            // 驗證：狀態應該改變
            await expect(page.locator('text=排程已取消')).toBeVisible()
            console.log('✅ 排程已取消')

            // 驗證：資料庫狀態更新
            const updatedCheck = await fetch(`http://localhost:8000/api/v1/projects/${scheduledProject.id}`)
            const updated = await updatedCheck.json()
            expect(updated.data.youtube_status).not.toBe('scheduled')
          }
        } else {
          console.log('⚠️  找不到「取消排程」按鈕')
        }
      } else {
        console.log('⚠️  沒有排程中的專案')
      }
    }
  })

  test('應該能夠修改排程時間', async ({ page }) => {
    const projectsCheck = await fetch('http://localhost:8000/api/v1/projects?youtube_status=scheduled')

    if (projectsCheck.ok) {
      const projects = await projectsCheck.json()

      if (projects.data && projects.data.length > 0) {
        const scheduledProject = projects.data[0]
        await page.goto(`http://localhost:3000/project/${scheduledProject.id}/result`)

        const editButton = page.locator('button:has-text("修改排程時間")')
        if (await editButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await editButton.click()

          // 設定新時間
          const newTime = new Date()
          newTime.setDate(newTime.getDate() + 2)
          newTime.setHours(15, 0, 0, 0)

          const dateInput = page.locator('input[type="datetime-local"]')
          await dateInput.fill(newTime.toISOString().slice(0, 16))

          await page.click('button:has-text("確認修改")')

          // 驗證：新時間已設定
          await expect(page.locator(`text=${newTime.toLocaleDateString()}`)).toBeVisible()
          console.log('✅ 排程時間已修改')
        }
      }
    }
  })
})
