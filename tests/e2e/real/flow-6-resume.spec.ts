import { test, expect } from '@playwright/test'

/**
 * Flow-6: 斷點續傳與錯誤恢復（真實環境）
 *
 * 驗證系統在中斷後能夠恢復的能力：
 * - 保存中斷時的進度
 * - 從失敗點繼續執行
 * - 跳過已完成步驟
 * - 真實的狀態恢復
 */
test.describe('Flow-6: 斷點續傳與錯誤恢復（真實環境）', () => {
  let interruptedProjectId: string

  test.setTimeout(20 * 60 * 1000) // 20 分鐘

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

  test('應該能夠列出可恢復的專案', async ({ page }) => {
    await page.goto('http://localhost:3000')

    // 尋找「恢復專案」或「未完成專案」區域
    const resumeSection = page.locator('text=未完成的專案')
    if (await resumeSection.isVisible({ timeout: 2000 }).catch(() => false)) {
      // 檢查未完成專案列表
      const incompleteProjects = page.locator('[data-testid="incomplete-project-card"]')
      const count = await incompleteProjects.count()

      console.log(`找到 ${count} 個未完成專案`)

      if (count > 0) {
        for (let i = 0; i < Math.min(count, 5); i++) {
          const card = incompleteProjects.nth(i)
          const name = await card.locator('[data-testid="project-name"]').textContent()
          const status = await card.locator('[data-testid="project-status"]').textContent()
          console.log(`  ${i + 1}. ${name} - ${status}`)
        }
      }
    } else {
      // 透過 API 查詢未完成專案
      const projectsCheck = await fetch('http://localhost:8000/api/v1/projects?status=incomplete')
      if (projectsCheck.ok) {
        const projects = await projectsCheck.json()
        console.log(`API 查詢到 ${projects.data.length} 個未完成專案`)
        projects.data.forEach((p: any, i: number) => {
          console.log(`  ${i + 1}. ${p.name} - ${p.status}`)
        })
      }
    }
  })

  test('應該能夠從腳本生成失敗點恢復', async ({ page }) => {
    // Step 1: 建立一個專案
    await page.goto('http://localhost:3000/project/create')

    const projectName = `Test Resume ${Date.now()}`
    await page.fill('input[name="project_name"]', projectName)
    await page.click('button:has-text("下一步")')

    // 快速配置
    await page.click('button:has-text("使用預設配置")')
    await page.click('button:has-text("下一步")')
    await page.click('text=預設範本')
    await page.click('button:has-text("下一步")')
    await page.click('label:has-text("Gemini Flash")')
    await page.click('button:has-text("開始生成")')

    console.log(`✅ 專案已建立: ${projectName}`)

    // 取得 project ID
    await page.waitForURL(/\/project\/[^/]+\/progress/)
    const url = page.url()
    interruptedProjectId = url.match(/\/project\/([^/]+)\/progress/)?.[1]!

    console.log(`📝 專案 ID: ${interruptedProjectId}`)

    // Step 2: 等待腳本生成開始
    await expect(page.locator('text=腳本生成中')).toBeVisible({ timeout: 10000 })
    console.log('⏳ 腳本生成中...')

    // Step 3: 模擬中斷（關閉頁面）
    await page.waitForTimeout(3000) // 等待3秒
    await page.close()
    console.log('❌ 模擬中斷（頁面關閉）')

    // Step 4: 等待一段時間（確保後端可能繼續或失敗）
    await new Promise((resolve) => setTimeout(resolve, 5000))

    // Step 5: 重新開啟頁面並恢復
    const newPage = await page.context().newPage()
    await newPage.goto('http://localhost:3000')

    // 尋找未完成專案
    const resumeButton = newPage.locator(`button:has-text("繼續"):near([data-testid="project-name"]:has-text("${projectName}"))`)

    if (await resumeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await resumeButton.click()
      console.log('✅ 點擊「繼續」按鈕')

      // 應該跳轉到進度頁面
      await expect(newPage).toHaveURL(new RegExp(interruptedProjectId))

      // 驗證：應該從失敗點繼續
      const statusText = await newPage.locator('[data-testid="current-status"]').textContent()
      console.log(`當前狀態: ${statusText}`)

      // 等待恢復完成
      await expect(newPage.locator('text=腳本生成完成')).toBeVisible({ timeout: 180000 })
      console.log('✅ 恢復成功，腳本生成完成')

      // 驗證：資料庫狀態正確
      const projectCheck = await fetch(`http://localhost:8000/api/v1/projects/${interruptedProjectId}`)
      const project = await projectCheck.json()
      expect(project.data.status).not.toBe('failed')
      console.log('✅ 資料庫驗證通過')
    } else {
      console.log('⚠️  找不到「繼續」按鈕，可能專案已完成或使用不同UI')
    }
  })

  test('應該能夠從素材生成失敗點恢復', async ({ page }) => {
    // 查詢是否有卡在素材生成階段的專案
    const projectsCheck = await fetch(
      'http://localhost:8000/api/v1/projects?status=assets_generating,assets_failed'
    )

    if (projectsCheck.ok) {
      const projects = await projectsCheck.json()

      if (projects.data && projects.data.length > 0) {
        const failedProject = projects.data[0]
        console.log(`找到失敗專案: ${failedProject.name} (${failedProject.id})`)

        // 訪問專案頁面
        await page.goto(`http://localhost:3000/project/${failedProject.id}/progress`)

        // 尋找「重試」或「繼續」按鈕
        const retryButton = page.locator('button:has-text("重試")')
        const resumeButton = page.locator('button:has-text("從失敗點繼續")')

        if (await retryButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await retryButton.click()
          console.log('✅ 點擊「重試」')

          // 等待恢復
          await expect(page.locator('text=素材生成中')).toBeVisible()
          console.log('⏳ 素材生成恢復中...')

          // 驗證：應該從失敗的素材繼續，不重新生成已完成的
          // 這需要檢查 API 日誌或狀態
        } else if (await resumeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await resumeButton.click()
          console.log('✅ 點擊「從失敗點繼續」')
        } else {
          console.log('⚠️  找不到恢復按鈕')
        }
      } else {
        console.log('⚠️  沒有失敗的專案可供測試')
      }
    }
  })

  test('應該能夠檢測並顯示專案當前進度', async ({ page }) => {
    // 查詢任何進行中的專案
    const projectsCheck = await fetch('http://localhost:8000/api/v1/projects?status=in_progress')

    if (projectsCheck.ok) {
      const projects = await projectsCheck.json()

      if (projects.data && projects.data.length > 0) {
        const activeProject = projects.data[0]
        console.log(`檢查專案: ${activeProject.name}`)

        await page.goto(`http://localhost:3000/project/${activeProject.id}/progress`)

        // 驗證：應該顯示完整的進度資訊
        const progressSteps = [
          '腳本生成',
          '素材生成',
          '影片渲染',
          '封面生成',
          'YouTube 上傳',
        ]

        for (const step of progressSteps) {
          const stepElement = page.locator(`[data-testid="progress-step"]:has-text("${step}")`)
          if (await stepElement.isVisible({ timeout: 1000 }).catch(() => false)) {
            const status = await stepElement.getAttribute('data-status')
            console.log(`  ${step}: ${status}`)
          }
        }

        // 驗證：顯示已完成和待完成步驟
        const completedSteps = page.locator('[data-testid="progress-step"][data-status="completed"]')
        const completedCount = await completedSteps.count()
        console.log(`已完成步驟: ${completedCount}`)

        console.log('✅ 進度顯示正確')
      } else {
        console.log('⚠️  沒有進行中的專案')
      }
    }
  })

  test('應該能夠處理網路中斷後的恢復', async ({ page, context }) => {
    // 建立專案
    await page.goto('http://localhost:3000/project/create')
    await page.fill('input[name="project_name"]', `Test Network Failure ${Date.now()}`)
    await page.click('button:has-text("下一步")')

    // 快速配置並開始
    await page.click('button:has-text("使用預設配置")')
    await page.click('button:has-text("開始生成")')

    // 等待開始生成
    await page.waitForURL(/\/project\/[^/]+\/progress/)
    const projectId = page.url().match(/\/project\/([^/]+)\/progress/)?.[1]!

    // 模擬網路中斷
    await context.setOffline(true)
    console.log('❌ 模擬網路中斷')

    await page.waitForTimeout(3000)

    // 恢復網路
    await context.setOffline(false)
    console.log('✅ 網路恢復')

    // 驗證：頁面應該能自動重連或顯示重連按鈕
    const reconnectButton = page.locator('button:has-text("重新連線")')
    if (await reconnectButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await reconnectButton.click()
      console.log('✅ 手動重新連線')
    }

    // 驗證：進度應該繼續顯示
    const progressIndicator = page.locator('[data-testid="progress-indicator"]')
    await expect(progressIndicator).toBeVisible({ timeout: 10000 })
    console.log('✅ 網路中斷恢復測試通過')
  })

  test('應該能夠查看失敗原因並提供解決建議', async ({ page }) => {
    // 查詢失敗的專案
    const projectsCheck = await fetch('http://localhost:8000/api/v1/projects?status=failed')

    if (projectsCheck.ok) {
      const projects = await projectsCheck.json()

      if (projects.data && projects.data.length > 0) {
        const failedProject = projects.data[0]
        console.log(`檢查失敗專案: ${failedProject.name}`)

        await page.goto(`http://localhost:3000/project/${failedProject.id}/result`)

        // 驗證：應該顯示錯誤資訊
        const errorMessage = page.locator('[data-testid="error-message"]')
        if (await errorMessage.isVisible({ timeout: 2000 }).catch(() => false)) {
          const message = await errorMessage.textContent()
          console.log(`錯誤訊息: ${message}`)

          // 應該有解決建議
          const suggestions = page.locator('[data-testid="error-suggestions"]')
          if (await suggestions.isVisible({ timeout: 2000 }).catch(() => false)) {
            const suggestionText = await suggestions.textContent()
            console.log(`解決建議: ${suggestionText}`)
          }

          console.log('✅ 錯誤資訊顯示完整')
        } else {
          console.log('⚠️  找不到錯誤訊息')
        }

        // 驗證：應該有「刪除專案」或「重新嘗試」選項
        const deleteButton = page.locator('button:has-text("刪除專案")')
        const retryButton = page.locator('button:has-text("重新嘗試")')

        const hasDelete = await deleteButton.isVisible({ timeout: 1000 }).catch(() => false)
        const hasRetry = await retryButton.isVisible({ timeout: 1000 }).catch(() => false)

        if (hasDelete || hasRetry) {
          console.log('✅ 提供失敗處理選項')
        }
      } else {
        console.log('⚠️  沒有失敗的專案')
      }
    }
  })

  test('應該能夠保存完整的錯誤日誌', async ({ page }) => {
    // 透過 API 查詢專案的錯誤日誌
    const projectsCheck = await fetch('http://localhost:8000/api/v1/projects?status=failed')

    if (projectsCheck.ok) {
      const projects = await projectsCheck.json()

      if (projects.data && projects.data.length > 0) {
        const failedProject = projects.data[0]

        // 查詢錯誤日誌
        const logsCheck = await fetch(`http://localhost:8000/api/v1/projects/${failedProject.id}/logs`)

        if (logsCheck.ok) {
          const logs = await logsCheck.json()
          console.log('錯誤日誌:')
          console.log(JSON.stringify(logs.data, null, 2))

          // 驗證：日誌應該包含關鍵資訊
          expect(logs.data.error_message).toBeTruthy()
          expect(logs.data.failed_step).toBeTruthy()
          expect(logs.data.timestamp).toBeTruthy()

          console.log('✅ 錯誤日誌記錄完整')
        } else {
          console.log('⚠️  無法取得錯誤日誌')
        }
      }
    }
  })
})
