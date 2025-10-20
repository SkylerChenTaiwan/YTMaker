// tests/e2e/setup-flow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('First-time Setup Flow', () => {
  test.beforeEach(async ({ context }) => {
    // 清除 setup_completed cookie (模擬首次啟動)
    await context.clearCookies()
  })

  test('should redirect to /setup on first launch', async ({ page }) => {
    await page.goto('http://localhost:3000/')

    // 應該自動重定向到 /setup
    await expect(page).toHaveURL(/\/setup/)
    await expect(page.locator('h1')).toContainText('設定精靈')
  })

  test('should not allow accessing other pages before setup', async ({ page }) => {
    await page.goto('http://localhost:3000/project/new')

    // 應該重定向到 /setup
    await expect(page).toHaveURL(/\/setup/)
    await expect(page.locator('h1')).toContainText('設定精靈')
  })

  test('should not allow accessing dashboard before setup', async ({ page }) => {
    await page.goto('http://localhost:3000/')

    // 應該重定向到 /setup
    await expect(page).toHaveURL(/\/setup/)
  })

  test('should not allow accessing configurations before setup', async ({ page }) => {
    await page.goto('http://localhost:3000/configurations')

    // 應該重定向到 /setup
    await expect(page).toHaveURL(/\/setup/)
  })

  test('should not allow accessing settings before setup', async ({ page }) => {
    await page.goto('http://localhost:3000/settings')

    // 應該重定向到 /setup
    await expect(page).toHaveURL(/\/setup/)
  })

  test('should allow direct access to /setup before setup', async ({ page }) => {
    await page.goto('http://localhost:3000/setup')

    // 應該正常顯示設定頁面
    await expect(page).toHaveURL('http://localhost:3000/setup')
    await expect(page.locator('h1')).toContainText('設定精靈')
  })

  test('should show setup wizard content', async ({ page }) => {
    await page.goto('http://localhost:3000/setup')

    // 檢查設定精靈內容
    await expect(page.locator('body')).toContainText('歡迎使用 YTMaker')
    await expect(page.locator('body')).toContainText('首次啟動需要設定 API Keys 和 YouTube 授權')
    await expect(page.locator('body')).toContainText('Google Gemini API Key')
    await expect(page.locator('body')).toContainText('Stability AI API Key')
    await expect(page.locator('body')).toContainText('D-ID API Key')
    await expect(page.locator('body')).toContainText('YouTube OAuth 授權')
  })

  test('should allow normal navigation after setup completed', async ({
    page,
    context,
  }) => {
    // 設定已完成
    await context.addCookies([
      {
        name: 'setup_completed',
        value: 'true',
        domain: 'localhost',
        path: '/',
      },
    ])

    // 訪問主控台應該成功
    await page.goto('http://localhost:3000/')
    await expect(page).toHaveURL('http://localhost:3000/')
    await expect(page.locator('h1')).toContainText('主控台')
  })

  test('should redirect /setup to / after setup completed', async ({
    page,
    context,
  }) => {
    // 設定已完成
    await context.addCookies([
      {
        name: 'setup_completed',
        value: 'true',
        domain: 'localhost',
        path: '/',
      },
    ])

    // 訪問 /setup 應該重定向回 /
    await page.goto('http://localhost:3000/setup')
    await expect(page).toHaveURL('http://localhost:3000/')
    await expect(page.locator('h1')).toContainText('主控台')
  })

  test('should allow access to all pages after setup completed', async ({
    page,
    context,
  }) => {
    // 設定已完成
    await context.addCookies([
      {
        name: 'setup_completed',
        value: 'true',
        domain: 'localhost',
        path: '/',
      },
    ])

    const routes = [
      { path: '/', title: '主控台' },
      { path: '/project/new', title: '新增專案' },
      { path: '/configurations', title: '配置管理' },
      { path: '/templates', title: '模板管理' },
      { path: '/settings', title: '系統設定' },
      { path: '/batch', title: '批次處理' },
    ]

    for (const route of routes) {
      await page.goto(`http://localhost:3000${route.path}`)
      await expect(page).toHaveURL(`http://localhost:3000${route.path}`)
      await expect(page.locator('h1')).toContainText(route.title)
    }
  })

  test('should redirect any path to /setup when not completed', async ({ page }) => {
    const paths = [
      '/',
      '/project/new',
      '/configurations',
      '/templates',
      '/settings',
      '/batch',
    ]

    for (const path of paths) {
      await page.context().clearCookies()
      await page.goto(`http://localhost:3000${path}`)
      await expect(page).toHaveURL(/\/setup/)
    }
  })

  test('should not redirect dynamic routes to /setup when setup completed', async ({
    page,
    context,
  }) => {
    // 設定已完成
    await context.addCookies([
      {
        name: 'setup_completed',
        value: 'true',
        domain: 'localhost',
        path: '/',
      },
    ])

    const projectId = '550e8400-e29b-41d4-a716-446655440000'

    const dynamicRoutes = [
      `/project/${projectId}/configure/visual`,
      `/project/${projectId}/configure/prompt-model`,
      `/project/${projectId}/progress`,
    ]

    for (const route of dynamicRoutes) {
      await page.goto(`http://localhost:3000${route}`)
      await expect(page).toHaveURL(`http://localhost:3000${route}`)
      // 不應該重定向到 /setup
      await expect(page).not.toHaveURL(/\/setup/)
    }
  })

  test('should show setup page without navigation bar', async ({ page }) => {
    await page.goto('http://localhost:3000/setup')

    // 設定頁面應該沒有導航列 (因為沒有使用 AppLayout)
    const nav = page.locator('nav[role="navigation"]:has-text("YTMaker")')
    await expect(nav).not.toBeVisible()
  })

  test('should have centered layout on setup page', async ({ page }) => {
    await page.goto('http://localhost:3000/setup')

    // 檢查設定頁面有居中的佈局
    const centerLayout = page.locator('.min-h-screen.flex.items-center.justify-center')
    await expect(centerLayout).toBeVisible()
  })

  test('cookie mechanism should work correctly', async ({ page, context }) => {
    // 首次訪問應該重定向
    await page.goto('http://localhost:3000/')
    await expect(page).toHaveURL(/\/setup/)

    // 手動設定 cookie
    await context.addCookies([
      {
        name: 'setup_completed',
        value: 'true',
        domain: 'localhost',
        path: '/',
      },
    ])

    // 再次訪問應該不重定向
    await page.goto('http://localhost:3000/')
    await expect(page).toHaveURL('http://localhost:3000/')
    await expect(page.locator('h1')).toContainText('主控台')

    // 清除 cookie
    await context.clearCookies()

    // 再次訪問應該又重定向
    await page.goto('http://localhost:3000/')
    await expect(page).toHaveURL(/\/setup/)
  })

  test('should handle partial paths starting with /setup', async ({ page }) => {
    // 訪問 /setup 的子路徑應該也允許 (未來可能會有多步驟設定)
    await page.goto('http://localhost:3000/setup')
    await expect(page).toHaveURL('http://localhost:3000/setup')
    await expect(page.locator('h1')).toContainText('設定精靈')
  })

  test('should persist setup state across page reloads', async ({
    page,
    context,
  }) => {
    // 設定已完成
    await context.addCookies([
      {
        name: 'setup_completed',
        value: 'true',
        domain: 'localhost',
        path: '/',
      },
    ])

    await page.goto('http://localhost:3000/')
    await expect(page.locator('h1')).toContainText('主控台')

    // 重新載入頁面
    await page.reload()

    // 應該仍然顯示主控台,不重定向到 /setup
    await expect(page).toHaveURL('http://localhost:3000/')
    await expect(page.locator('h1')).toContainText('主控台')
  })
})
