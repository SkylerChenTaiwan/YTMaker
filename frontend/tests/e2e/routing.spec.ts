// tests/e2e/routing.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Complete Routing Flow', () => {
  test.beforeEach(async ({ page, context }) => {
    // 設定已完成首次設定 (跳過 middleware 重定向)
    await context.addCookies([
      {
        name: 'setup_completed',
        value: 'true',
        domain: 'localhost',
        path: '/',
      },
    ])
  })

  const routes = [
    { path: '/', expectedTitle: '主控台' },
    { path: '/project/new', expectedTitle: '新增專案' },
    { path: '/configurations', expectedTitle: '配置管理' },
    { path: '/templates', expectedTitle: '模板管理' },
    { path: '/settings', expectedTitle: '系統設定' },
    { path: '/batch', expectedTitle: '批次處理' },
  ]

  routes.forEach(({ path, expectedTitle }) => {
    test(`should access ${path} and show ${expectedTitle}`, async ({ page }) => {
      await page.goto(`http://localhost:3000${path}`)

      // 檢查頁面標題
      await expect(page.locator('h1')).toContainText(expectedTitle)

      // 檢查頁面沒有錯誤
      await expect(page.locator('body')).not.toContainText('404')
      await expect(page.locator('body')).not.toContainText('Error')
    })
  })

  test('should navigate through project creation flow', async ({ page }) => {
    await page.goto('http://localhost:3000/')

    // 檢查主控台頁面
    await expect(page.locator('h1')).toContainText('主控台')

    // 點擊「新增專案」導航連結
    await page.click('text=新增專案')

    // 應該導航到 /project/new
    await expect(page).toHaveURL(/\/project\/new/)
    await expect(page.locator('h1')).toContainText('新增專案')

    // 檢查麵包屑
    const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]')
    await expect(breadcrumb).toContainText('主控台')
    await expect(breadcrumb).toContainText('新增專案')
  })

  test('should show all navigation links in header', async ({ page }) => {
    await page.goto('http://localhost:3000/')

    const nav = page.locator('nav[role="navigation"]')

    await expect(nav).toContainText('YTMaker')
    await expect(nav).toContainText('主控台')
    await expect(nav).toContainText('配置管理')
    await expect(nav).toContainText('模板管理')
    await expect(nav).toContainText('系統設定')
    await expect(nav).toContainText('批次處理')
  })

  test('should highlight active navigation link', async ({ page }) => {
    await page.goto('http://localhost:3000/configurations')

    const activeLink = page.locator('nav a.bg-primary', { hasText: '配置管理' })
    await expect(activeLink).toBeVisible()
  })

  test('should navigate using navigation bar links', async ({ page }) => {
    await page.goto('http://localhost:3000/')

    // 點擊配置管理
    await page.click('nav a:has-text("配置管理")')
    await expect(page).toHaveURL(/\/configurations/)
    await expect(page.locator('h1')).toContainText('配置管理')

    // 點擊模板管理
    await page.click('nav a:has-text("模板管理")')
    await expect(page).toHaveURL(/\/templates/)
    await expect(page.locator('h1')).toContainText('模板管理')

    // 點擊系統設定
    await page.click('nav a:has-text("系統設定")')
    await expect(page).toHaveURL(/\/settings/)
    await expect(page.locator('h1')).toContainText('系統設定')
  })

  test('should show breadcrumb on nested pages', async ({ page }) => {
    await page.goto('http://localhost:3000/project/new')

    const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]')
    await expect(breadcrumb).toBeVisible()

    // 檢查麵包屑內容
    await expect(breadcrumb).toContainText('主控台')
    await expect(breadcrumb).toContainText('新增專案')

    // 點擊麵包屑返回主控台
    await breadcrumb.locator('a:has-text("主控台")').click()
    await expect(page).toHaveURL('http://localhost:3000/')
  })

  test('should handle dynamic routes with valid UUID', async ({ page }) => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000'

    await page.goto(`http://localhost:3000/project/${validUuid}/progress`)

    // 應該顯示進度監控頁面
    await expect(page.locator('h1')).toContainText('進度監控')
    await expect(page.locator('body')).toContainText(validUuid)
  })

  test('should show 404 for invalid UUID in dynamic route', async ({ page }) => {
    await page.goto('http://localhost:3000/project/invalid-id/progress')

    // 應該顯示 404 頁面
    await expect(page.locator('h1')).toContainText('404')
    await expect(page.locator('body')).toContainText('找不到頁面')
  })

  test('should show 404 for non-existent routes', async ({ page }) => {
    await page.goto('http://localhost:3000/non-existent-page')

    await expect(page.locator('h1')).toContainText('404')
    await expect(page.locator('body')).toContainText('找不到頁面')

    // 檢查返回主控台按鈕
    const backButton = page.locator('a:has-text("返回主控台")')
    await expect(backButton).toBeVisible()
    await backButton.click()
    await expect(page).toHaveURL('http://localhost:3000/')
  })

  test('should show footer on all pages', async ({ page }) => {
    const routes = ['/', '/project/new', '/configurations']

    for (const route of routes) {
      await page.goto(`http://localhost:3000${route}`)
      await expect(page.locator('footer')).toContainText('© 2025 YTMaker')
    }
  })

  test('should support mobile navigation', async ({ page }) => {
    // 設定手機視口
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('http://localhost:3000/')

    // 點擊漢堡選單
    const hamburgerButton = page.locator('button[aria-label="開啟選單"]')
    await expect(hamburgerButton).toBeVisible()
    await hamburgerButton.click()

    // 檢查手機選單是否顯示
    const mobileMenu = page.locator('[data-testid="mobile-menu"]')
    await expect(mobileMenu).toBeVisible()

    // 檢查所有導航連結
    await expect(mobileMenu).toContainText('主控台')
    await expect(mobileMenu).toContainText('配置管理')
    await expect(mobileMenu).toContainText('模板管理')

    // 點擊連結後選單應該關閉
    await mobileMenu.locator('a:has-text("配置管理")').click()
    await expect(page).toHaveURL(/\/configurations/)
    await expect(mobileMenu).not.toBeVisible()
  })

  test('should access all batch routes', async ({ page }) => {
    // 批次處理列表
    await page.goto('http://localhost:3000/batch')
    await expect(page.locator('h1')).toContainText('批次處理')

    // 批次任務詳細頁 (有效 UUID)
    const validBatchId = '123e4567-e89b-42d3-a456-426614174000'
    await page.goto(`http://localhost:3000/batch/${validBatchId}`)
    await expect(page.locator('h1')).toContainText('批次任務詳細')
    await expect(page.locator('body')).toContainText(validBatchId)
  })

  test('should access all project configure routes', async ({ page }) => {
    const projectId = '550e8400-e29b-41d4-a716-446655440000'

    const configRoutes = [
      { path: `/project/${projectId}/configure/visual`, title: '視覺化配置' },
      { path: `/project/${projectId}/configure/prompt-model`, title: 'Prompt 與模型設定' },
      { path: `/project/${projectId}/configure/youtube`, title: 'YouTube 設定' },
      { path: `/project/${projectId}/progress`, title: '進度監控' },
      { path: `/project/${projectId}/result`, title: '結果頁' },
    ]

    for (const route of configRoutes) {
      await page.goto(`http://localhost:3000${route.path}`)
      await expect(page.locator('h1')).toContainText(route.title)
      await expect(page.locator('body')).toContainText(projectId)
    }
  })
})
