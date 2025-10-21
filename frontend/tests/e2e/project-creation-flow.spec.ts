// tests/e2e/project-creation-flow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Project Creation Flow - Steps 3 & 4', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses
    await page.route('**/api/v1/projects/test-123', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-123',
          project_name: 'Test Project',
          prompt_template_id: 'default',
          prompt_content: '預設 Prompt 內容...' + 'x'.repeat(180),
          gemini_model: 'gemini-1.5-flash',
          youtube_title: '',
          youtube_description: '',
          youtube_tags: [],
          privacy: 'public',
          publish_type: 'immediate',
          ai_content_flag: true,
        }),
      })
    })

    await page.route('**/api/v1/prompt-templates', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'default',
            name: '預設範本',
            content: '預設 Prompt 內容...' + 'x'.repeat(180),
          },
          {
            id: 'custom-1',
            name: '自訂範本 1',
            content: '自訂內容...' + 'x'.repeat(188),
          },
        ]),
      })
    })
  })

  test('用戶應該能完成 Prompt 和 YouTube 設定並開始生成', async ({ page }) => {
    // 1. Navigate to project (assume already created in step 1-2)
    await page.goto('http://localhost:3000/project/test-123/configure/prompt-model')

    // 2. Verify page loaded
    await expect(page.locator('h1')).toContainText('Prompt 與模型設定')

    // 3. Verify step indicator shows step 3 is current
    const step3 = page.locator('[data-testid="step-2"]')
    await expect(step3).toBeVisible()
    await expect(step3.locator('.current')).toBeVisible()

    // 4. Select template
    await page.locator('[data-testid="prompt-template-select"]').selectOption('custom-1')

    // 5. Verify prompt content loaded
    const promptEditor = page.locator('[data-testid="prompt-editor"]')
    await expect(promptEditor).not.toBeEmpty()

    // 6. Verify character count is displayed
    await expect(page.locator('text=/目前字數:/')).toBeVisible()

    // 7. Select Gemini Pro model
    await page.locator('[data-testid="model-gemini-1-5-pro"]').click()

    // 8. Verify model is selected (check mark should appear)
    await expect(page.locator('[data-testid="model-gemini-1-5-pro"]')).toBeChecked()

    // 9. Mock the update API
    await page.route('**/api/v1/projects/test-123/prompt-settings', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    })

    // 10. Click next
    await page.locator('button:has-text("下一步")').click()

    // 11. Verify navigation to YouTube settings
    await expect(page).toHaveURL(/configure\/youtube/)
    await expect(page.locator('h1')).toContainText('YouTube 設定')

    // 12. Verify step indicator shows step 4 is current
    const step4 = page.locator('[data-testid="step-3"]')
    await expect(step4).toBeVisible()

    // 13. Fill YouTube title
    await page.locator('[data-testid="youtube-title"]').fill('我的測試影片')

    // 14. Fill description
    await page.locator('[data-testid="youtube-description"]').fill('這是測試描述')

    // 15. Add tags
    const tagInput = page.locator('[data-testid="youtube-tags-input"]')
    await tagInput.fill('測試')
    await tagInput.press('Enter')

    // Verify tag was added
    await expect(page.locator('text=測試')).toBeVisible()

    await tagInput.fill('AI')
    await tagInput.press('Enter')

    // Verify second tag was added
    await expect(page.locator('text=AI')).toBeVisible()

    // 16. Verify privacy public is selected by default
    await expect(page.locator('[data-testid="privacy-public"]')).toBeChecked()

    // 17. Test scheduled publish
    await page.locator('text=排程發布').click()

    // Verify date/time pickers appear
    await expect(page.locator('label:has-text("排程日期")')).toBeVisible()
    await expect(page.locator('label:has-text("排程時間")')).toBeVisible()

    // Switch back to immediate
    await page.locator('text=立即發布').click()

    // 18. Mock YouTube settings and generation APIs
    await page.route('**/api/v1/projects/test-123/youtube-settings', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    })

    await page.route('**/api/v1/projects/test-123/generate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    })

    // 19. Click start generation
    await page.locator('button:has-text("開始生成")').click()

    // 20. Verify navigation to progress page
    await expect(page).toHaveURL(/progress/)
    await expect(page.locator('h1')).toContainText('進度監控', { timeout: 10000 })
  })

  test('應該正確處理表單驗證錯誤', async ({ page }) => {
    // Navigate to YouTube settings
    await page.goto('http://localhost:3000/project/test-123/configure/youtube')

    await expect(page.locator('h1')).toContainText('YouTube 設定')

    // Try to submit without filling title
    await page.locator('button:has-text("開始生成")').click()

    // Should show validation error
    await expect(page.locator('text=標題不能為空')).toBeVisible()

    // Should not navigate away
    await expect(page).toHaveURL(/configure\/youtube/)
  })

  test('排程發布應該驗證未來時間', async ({ page }) => {
    await page.goto('http://localhost:3000/project/test-123/configure/youtube')

    // Fill required fields
    await page.locator('[data-testid="youtube-title"]').fill('測試影片')

    // Select scheduled publish
    await page.locator('text=排程發布').click()

    // Select a past date
    await page.locator('[aria-label="排程日期"]').fill('2020-01-01')
    await page.locator('[aria-label="排程時間"]').fill('10:00')

    // Try to submit
    await page.locator('button:has-text("開始生成")').click()

    // Should show error
    await expect(page.locator('text=排程日期必須為未來時間')).toBeVisible()
  })
})
