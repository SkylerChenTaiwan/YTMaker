import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

/**
 * Flow-1: 影片生成流程（真實環境）
 *
 * 這是最重要的測試 - 驗證完整的影片生成流程
 * - 真實調用 Gemini API 生成腳本
 * - 真實使用 FFmpeg 渲染影片
 * - 真實上傳到 YouTube
 *
 * ⚠️  警告:
 * - 這個測試會消耗大量時間 (10-25 分鐘)
 * - 會消耗真實的 API quota
 * - 會實際上傳影片到 YouTube
 * - 測試完成後請手動刪除測試影片
 */
test.describe('Flow-1: 影片生成流程（真實環境）', () => {
  let projectId: string
  let youtubeVideoId: string

  test.setTimeout(40 * 60 * 1000) // 40 分鐘 timeout

  test('應該完整生成影片並上傳到 YouTube', async ({ page, context }) => {
    // 設定 setup-completed cookie（假設 Flow-0 已完成）
    await context.addCookies([
      {
        name: 'setup-completed',
        value: 'true',
        domain: 'localhost',
        path: '/',
      },
    ])

    // Step 1: 建立新專案
    await page.goto('http://localhost:3000')
    await page.click('button:has-text("建立新專案")')
    await expect(page).toHaveURL(/\/project\/create/)

    console.log('✅ Step 1: 進入新專案建立頁面')

    // Step 2: 輸入專案名稱
    const projectName = `Test Project ${Date.now()}`
    await page.fill('input[name="project_name"]', projectName)
    await page.click('button:has-text("下一步")')

    console.log(`✅ Step 2: 專案名稱: ${projectName}`)

    // Step 3: 上傳文字內容（真實檔案）
    const testContent = `
這是一篇測試用的文章內容。我們將用這篇文章來測試完整的影片生成流程。

第一段：介紹主題
這個測試將驗證系統能否正確處理文字內容，生成結構化的腳本，並調用所有外部 API。
我們會測試 Gemini API 的腳本生成能力，以及系統的素材生成和影片渲染功能。

第二段：技術細節
系統會使用 Gemini API 將這段文字轉換為影片腳本，然後為每個段落生成相應的圖片和語音。
整個過程包含多個步驟：腳本生成、素材生成、影片渲染、封面生成和 YouTube 上傳。

第三段：測試目標
這個測試的目標是驗證在真實環境下，系統能夠完整地完成所有步驟。
我們不使用任何 mock，所有的 API 調用都是真實的，所有的檔案操作都是真實的。

第四段：預期結果
最終生成的影片將包含字幕、圖片、語音和轉場效果。
影片會自動上傳到 YouTube，並且我們可以驗證它確實存在。

第五段：總結
這個測試證明了系統在實際使用中的可用性和穩定性。
通過真實環境測試，我們可以確保系統真的能為用戶創造價值。
`.trim()

    // 真實上傳文字檔案
    const tempFile = path.join('/tmp', `test-content-${Date.now()}.txt`)
    fs.writeFileSync(tempFile, testContent)

    await page.setInputFiles('input[type="file"]', tempFile)

    // 驗證：字數顯示正確
    await expect(page.locator('text=/\\d+ 字/')).toBeVisible()
    console.log('✅ Step 3: 文字內容已上傳')

    await page.click('button:has-text("下一步")')

    // Step 4: 配置視覺元素（使用預設）
    await page.click('button:has-text("使用預設配置")')
    await page.click('button:has-text("下一步")')
    console.log('✅ Step 4: 視覺配置完成')

    // Step 5: 選擇 Prompt 範本
    await page.click('text=預設範本')
    await page.click('button:has-text("下一步")')
    console.log('✅ Step 5: Prompt 範本已選擇')

    // Step 6: 選擇 Gemini 模型
    await page.click('label:has-text("Gemini Flash")')
    await page.click('button:has-text("下一步")')
    console.log('✅ Step 6: 已選擇 Gemini Flash')

    // Step 7: 設定 YouTube 資訊
    await page.fill('input[name="youtube_title"]', `測試影片 ${Date.now()}`)
    await page.fill('textarea[name="youtube_description"]', '這是自動化測試生成的影片')
    await page.fill('input[name="youtube_tags"]', '測試,自動化')
    await page.selectOption('select[name="privacy"]', 'unlisted') // 不公開測試影片
    await page.click('button:has-text("下一步")')
    console.log('✅ Step 7: YouTube 資訊已設定')

    // Step 8: 選擇 YouTube 頻道
    await page.click('div[data-testid="youtube-channel-card"]:first-child')
    await page.click('button:has-text("確認並開始生成")')
    console.log('✅ Step 8: 開始生成')

    // 取得 project ID
    await page.waitForURL(/\/project\/[^/]+\/progress/)
    const url = page.url()
    projectId = url.match(/\/project\/([^/]+)\/progress/)?.[1]!
    expect(projectId).toBeTruthy()

    console.log(`📝 專案已建立: ${projectId}`)

    // Step 9-10: 等待腳本與素材生成（真實調用 Gemini API）
    console.log('⏳ Step 9: 等待腳本生成...')
    await expect(page.locator('text=腳本生成中')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=腳本生成完成')).toBeVisible({ timeout: 180000 }) // 3分鐘

    console.log('✅ Step 9: 腳本生成完成（真實 Gemini API）')

    // 驗證：資料庫有腳本記錄
    const scriptCheck = await fetch(`http://localhost:8000/api/v1/projects/${projectId}`)
    const projectData = await scriptCheck.json()
    expect(projectData.data.script).toBeTruthy()
    console.log(`📄 腳本包含 ${projectData.data.script.sections.length} 個段落`)

    console.log('⏳ Step 10: 等待素材生成...')
    await expect(page.locator('text=素材生成中')).toBeVisible()
    await expect(page.locator('text=素材生成完成')).toBeVisible({ timeout: 300000 }) // 5分鐘
    console.log('✅ Step 10: 素材生成完成')

    // Step 11: 等待影片渲染（真實 FFmpeg 渲染）
    console.log('⏳ Step 11: 等待影片渲染（這可能需要 10-15 分鐘）...')
    await expect(page.locator('text=影片渲染中')).toBeVisible()
    await expect(page.locator('text=影片渲染完成')).toBeVisible({ timeout: 900000 }) // 15分鐘

    console.log('✅ Step 11: 影片渲染完成')

    // 驗證：影片檔案真的存在
    const videoPath = path.join(__dirname, '../../../backend/data/projects', projectId, 'final_video.mp4')

    // 等待一下確保檔案系統同步
    await page.waitForTimeout(2000)

    expect(fs.existsSync(videoPath)).toBeTruthy()
    const videoStats = fs.statSync(videoPath)
    console.log(`📹 影片大小: ${(videoStats.size / 1024 / 1024).toFixed(2)} MB`)

    // Step 12: 等待封面生成
    await expect(page.locator('text=封面生成完成')).toBeVisible({ timeout: 60000 })
    console.log('✅ Step 12: 封面生成完成')

    // 驗證：封面檔案真的存在
    const thumbnailPath = path.join(__dirname, '../../../backend/data/projects', projectId, 'thumbnail.jpg')
    expect(fs.existsSync(thumbnailPath)).toBeTruthy()

    // Step 13: 等待 YouTube 上傳（真實上傳！）
    console.log('⏳ Step 13: 等待上傳到 YouTube（真實上傳）...')
    await expect(page.locator('text=上傳到 YouTube')).toBeVisible()
    await expect(page.locator('text=上傳完成')).toBeVisible({ timeout: 300000 }) // 5分鐘

    console.log('✅ Step 13: YouTube 上傳完成')

    // Step 14: 查看結果
    await page.click('button:has-text("查看結果")')
    await expect(page).toHaveURL(/\/project\/[^/]+\/result/)
    console.log('✅ Step 14: 進入結果頁面')

    // 驗證：顯示 YouTube 連結
    const youtubeLink = page.locator('a[href*="youtube.com/watch"]')
    await expect(youtubeLink).toBeVisible()

    const href = await youtubeLink.getAttribute('href')
    youtubeVideoId = href?.match(/v=([^&]+)/)?.[1]!

    console.log(`🎬 YouTube 影片: https://youtube.com/watch?v=${youtubeVideoId}`)

    // 驗證：資料庫有完整記錄
    const finalCheck = await fetch(`http://localhost:8000/api/v1/projects/${projectId}/result`)
    const result = await finalCheck.json()
    expect(result.data.youtube_url).toBeTruthy()
    expect(result.data.youtube_video_id).toBe(youtubeVideoId)
    expect(result.data.status).toBe('completed')

    // 驗證：可以下載本地影片
    const downloadButton = page.locator('button:has-text("下載影片")')
    if (await downloadButton.isVisible()) {
      // 不實際下載，只驗證按鈕可點擊
      await expect(downloadButton).toBeEnabled()
      console.log('✅ Step 14: 下載按鈕可用')
    }

    console.log('')
    console.log('🎉 Flow-1 完整測試通過！')
    console.log(`  📦 專案 ID: ${projectId}`)
    console.log(`  🎬 YouTube: https://youtube.com/watch?v=${youtubeVideoId}`)
    console.log(`  📹 影片大小: ${(videoStats.size / 1024 / 1024).toFixed(2)} MB`)
    console.log(`  📄 段落數: ${projectData.data.script.sections.length}`)
    console.log('')
    console.log('⚠️  請記得手動刪除測試影片')
  })

  test.afterAll(async () => {
    // 清理提示
    if (youtubeVideoId) {
      console.log('')
      console.log('🧹 清理提示:')
      console.log(`  ⚠️  請手動刪除測試影片: https://youtube.com/watch?v=${youtubeVideoId}`)
      console.log(`  ⚠️  或執行清理腳本: ./tests/e2e/cleanup-real-env.sh`)
    }

    // 可選：自動清理資料庫記錄
    if (projectId) {
      const shouldClean = process.env.AUTO_CLEAN_TEST_DATA === 'true'
      if (shouldClean) {
        try {
          await fetch(`http://localhost:8000/api/v1/projects/${projectId}`, {
            method: 'DELETE',
          })
          console.log(`  ✅ 已刪除測試專案: ${projectId}`)
        } catch (error) {
          console.log(`  ⚠️  無法刪除專案: ${error}`)
        }
      }
    }
  })
})
