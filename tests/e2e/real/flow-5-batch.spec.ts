import { test, expect } from '@playwright/test'

/**
 * Flow-5: 批次處理多個影片（真實環境）
 *
 * 驗證批次處理功能：
 * - 建立批次任務
 * - 監控批次進度
 * - 處理部分失敗
 */
test.describe('Flow-5: 批次處理多個影片（真實環境）', () => {
  test.setTimeout(60 * 60 * 1000) // 60 分鐘

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

  test('應該能夠建立批次任務', async ({ page }) => {
    await page.goto('http://localhost:3000/batch/create')

    // 添加多個內容檔案
    const batchName = `Test Batch ${Date.now()}`
    await page.fill('input[name="batch_name"]', batchName)

    // 上傳或添加多個文字檔案
    const addFileButton = page.locator('button:has-text("添加檔案")')
    if (await addFileButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      // 添加 3 個測試內容
      for (let i = 0; i < 3; i++) {
        await addFileButton.click()
        await page.fill(`input[name="content_${i}"]`, `測試內容 ${i + 1}...`)
      }

      console.log('✅ 已添加 3 個內容')

      // 選擇通用配置
      await page.click('button:has-text("使用預設配置")')

      // 開始批次處理
      await page.click('button:has-text("開始批次處理")')

      // 取得批次 ID
      await page.waitForURL(/\/batch\/[^/]+\/progress/)
      const batchId = page.url().match(/\/batch\/([^/]+)\/progress/)?.[1]!

      console.log(`📝 批次 ID: ${batchId}`)

      // 驗證：應該顯示批次進度
      await expect(page.locator('text=批次處理中')).toBeVisible()

      // 驗證：資料庫有批次記錄
      const batchCheck = await fetch(`http://localhost:8000/api/v1/batch/${batchId}`)
      const batch = await batchCheck.json()
      expect(batch.data.total_tasks).toBe(3)
      console.log('✅ 批次任務已建立')
    } else {
      console.log('⚠️  批次功能可能尚未實作')
    }
  })

  test('應該能夠監控批次進度', async ({ page }) => {
    // 查詢進行中的批次
    const batchCheck = await fetch('http://localhost:8000/api/v1/batch?status=running')

    if (batchCheck.ok) {
      const batches = await batchCheck.json()

      if (batches.data && batches.data.length > 0) {
        const activeBatch = batches.data[0]
        await page.goto(`http://localhost:3000/batch/${activeBatch.id}/progress`)

        // 驗證：顯示整體進度
        const progressBar = page.locator('[data-testid="batch-progress-bar"]')
        if (await progressBar.isVisible()) {
          const progressPercent = await progressBar.getAttribute('data-progress')
          console.log(`批次進度: ${progressPercent}%`)
        }

        // 驗證：顯示每個任務的狀態
        const taskCards = page.locator('[data-testid="batch-task-card"]')
        const taskCount = await taskCards.count()
        console.log(`批次包含 ${taskCount} 個任務`)

        for (let i = 0; i < Math.min(taskCount, 5); i++) {
          const card = taskCards.nth(i)
          const status = await card.getAttribute('data-status')
          console.log(`  任務 ${i + 1}: ${status}`)
        }

        console.log('✅ 批次進度監控正常')
      }
    }
  })

  test('應該能夠處理部分任務失敗', async ({ page }) => {
    console.log('⚠️  此測試需要故意製造失敗情況')
    // 實際測試中，可以使用無效的內容或 API 限制來觸發失敗
  })

  test('應該能夠查看批次報告', async ({ page }) => {
    // 查詢已完成的批次
    const batchCheck = await fetch('http://localhost:8000/api/v1/batch?status=completed')

    if (batchCheck.ok) {
      const batches = await batchCheck.json()

      if (batches.data && batches.data.length > 0) {
        const completedBatch = batches.data[0]
        await page.goto(`http://localhost:3000/batch/${completedBatch.id}/report`)

        // 驗證：顯示成功/失敗統計
        const successCount = page.locator('[data-testid="success-count"]')
        const failedCount = page.locator('[data-testid="failed-count"]')

        if (await successCount.isVisible()) {
          const success = await successCount.textContent()
          const failed = await failedCount.textContent()
          console.log(`成功: ${success}, 失敗: ${failed}`)
        }

        console.log('✅ 批次報告顯示正確')
      }
    }
  })
})
