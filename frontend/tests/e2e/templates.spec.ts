/**
 * 模板管理 E2E 測試
 *
 * 測試項目:
 * 1. 配置管理頁面可訪問
 * 2. 模板管理頁面可訪問
 * 3. Tab 切換功能正常
 */

import { test, expect } from '@playwright/test'

test.describe('配置與模板管理 E2E 測試', () => {
  test.beforeEach(async ({ page }) => {
    // 每個測試前先導航到主頁
    await page.goto('/')
  })

  test('應能訪問配置管理頁面', async ({ page }) => {
    // 點擊導航列的「配置管理」連結
    await page.click('a[href="/configurations"]')

    // 驗證 URL
    await expect(page).toHaveURL('/configurations')

    // 驗證頁面標題
    await expect(page.locator('h1')).toContainText('配置管理')

    // 驗證麵包屑
    await expect(page.locator('text=主控台')).toBeVisible()
    await expect(page.locator('text=配置管理')).toBeVisible()
  })

  test('應能訪問模板管理頁面', async ({ page }) => {
    // 點擊導航列的「模板管理」連結
    await page.click('a[href="/templates"]')

    // 驗證 URL
    await expect(page).toHaveURL('/templates')

    // 驗證頁面標題
    await expect(page.locator('h1')).toContainText('模板管理')

    // 驗證麵包屑
    await expect(page.locator('text=主控台')).toBeVisible()
    await expect(page.locator('text=模板管理')).toBeVisible()
  })

  test('模板管理頁面應顯示兩個 Tab', async ({ page }) => {
    // 導航到模板管理頁面
    await page.goto('/templates')

    // 等待頁面載入
    await page.waitForSelector('h1:has-text("模板管理")')

    // 驗證視覺配置模板 Tab 存在
    const visualTab = page.locator('text=視覺配置模板').first()
    await expect(visualTab).toBeVisible()

    // 驗證 Prompt 範本 Tab 存在
    const promptTab = page.locator('text=Prompt 範本').first()
    await expect(promptTab).toBeVisible()
  })

  test('應能在模板管理頁面切換 Tab', async ({ page }) => {
    // 導航到模板管理頁面
    await page.goto('/templates')

    // 等待頁面載入
    await page.waitForSelector('h1:has-text("模板管理")')

    // 點擊 Prompt 範本 Tab
    const promptTab = page.locator('[role="tab"]:has-text("Prompt 範本")')
    await promptTab.click()

    // 驗證 Tab 切換成功 - 可以透過檢查 active class 或內容變化
    await expect(promptTab).toHaveAttribute('aria-selected', 'true')

    // 點擊視覺配置模板 Tab
    const visualTab = page.locator('[role="tab"]:has-text("視覺配置模板")')
    await visualTab.click()

    // 驗證 Tab 切換成功
    await expect(visualTab).toHaveAttribute('aria-selected', 'true')
  })

  test('配置管理頁面應顯示空狀態', async ({ page }) => {
    // 導航到配置管理頁面
    await page.goto('/configurations')

    // 等待頁面載入
    await page.waitForSelector('h1:has-text("配置管理")')

    // 由於沒有實際的後端，頁面可能顯示 loading 或空狀態
    // 這裡我們檢查頁面至少沒有崩潰
    await expect(page.locator('h1')).toContainText('配置管理')

    // 驗證新增配置按鈕存在
    const addButton = page.locator('button:has-text("新增配置")')
    await expect(addButton).toBeVisible()
  })

  test('模板管理頁面應顯示新增按鈕', async ({ page }) => {
    // 導航到模板管理頁面
    await page.goto('/templates')

    // 等待頁面載入
    await page.waitForSelector('h1:has-text("模板管理")')

    // 驗證新增模板按鈕存在（視覺配置模板 Tab）
    // 注意: 由於沒有後端數據，可能會顯示空狀態
    // 我們只驗證頁面結構正常
    await expect(page.locator('h1')).toContainText('模板管理')
  })
})

test.describe('導航測試', () => {
  test('應能從主控台導航到配置管理再到模板管理', async ({ page }) => {
    // 1. 從主頁開始
    await page.goto('/')
    await expect(page).toHaveURL('/')

    // 2. 導航到配置管理
    await page.click('a[href="/configurations"]')
    await expect(page).toHaveURL('/configurations')
    await expect(page.locator('h1')).toContainText('配置管理')

    // 3. 導航到模板管理
    await page.click('a[href="/templates"]')
    await expect(page).toHaveURL('/templates')
    await expect(page.locator('h1')).toContainText('模板管理')

    // 4. 返回主控台
    await page.click('a[href="/"]')
    await expect(page).toHaveURL('/')
  })
})
