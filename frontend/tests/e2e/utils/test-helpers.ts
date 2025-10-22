/**
 * E2E 測試輔助函數
 *
 * 提供常用的測試工具函數和輔助方法
 */

import { Page, expect } from '@playwright/test'

/**
 * 等待元素可見
 */
export async function waitForVisible(page: Page, selector: string, timeout = 5000) {
  await page.waitForSelector(selector, { state: 'visible', timeout })
}

/**
 * 等待元素消失
 */
export async function waitForHidden(page: Page, selector: string, timeout = 5000) {
  await page.waitForSelector(selector, { state: 'hidden', timeout })
}

/**
 * 等待並點擊元素
 */
export async function clickElement(page: Page, selector: string) {
  await waitForVisible(page, selector)
  await page.click(selector)
}

/**
 * 等待並填寫輸入框
 */
export async function fillInput(page: Page, selector: string, value: string) {
  await waitForVisible(page, selector)
  await page.fill(selector, value)
}

/**
 * 等待 API 請求完成
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  timeout = 30000
) {
  return await page.waitForResponse(
    (response) => {
      const url = response.url()
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern)
      }
      return urlPattern.test(url)
    },
    { timeout }
  )
}

/**
 * 等待多個 API 請求完成
 */
export async function waitForMultipleApiResponses(
  page: Page,
  urlPatterns: (string | RegExp)[],
  timeout = 30000
) {
  const promises = urlPatterns.map((pattern) => waitForApiResponse(page, pattern, timeout))
  return await Promise.all(promises)
}

/**
 * 檢查元素是否存在
 */
export async function elementExists(page: Page, selector: string): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { timeout: 1000 })
    return true
  } catch {
    return false
  }
}

/**
 * 取得元素文字內容
 */
export async function getTextContent(page: Page, selector: string): Promise<string> {
  await waitForVisible(page, selector)
  const element = await page.locator(selector)
  return (await element.textContent()) || ''
}

/**
 * 檢查文字是否存在於頁面
 */
export async function hasText(page: Page, text: string): Promise<boolean> {
  try {
    await page.waitForSelector(`text=${text}`, { timeout: 2000 })
    return true
  } catch {
    return false
  }
}

/**
 * 截圖並附加到測試報告
 */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({ path: `test-results/${name}.png`, fullPage: true })
}

/**
 * 等待頁面載入完成
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('domcontentloaded')
  await page.waitForLoadState('networkidle')
}

/**
 * 模擬延遲
 */
export async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 滾動到元素位置
 */
export async function scrollToElement(page: Page, selector: string) {
  await page.locator(selector).scrollIntoViewIfNeeded()
}

/**
 * 檢查元素是否可見
 */
export async function isVisible(page: Page, selector: string): Promise<boolean> {
  try {
    const element = await page.locator(selector)
    return await element.isVisible()
  } catch {
    return false
  }
}

/**
 * 檢查元素是否可點擊
 */
export async function isEnabled(page: Page, selector: string): Promise<boolean> {
  try {
    const element = await page.locator(selector)
    return await element.isEnabled()
  } catch {
    return false
  }
}

/**
 * 取得元素屬性值
 */
export async function getAttribute(
  page: Page,
  selector: string,
  attribute: string
): Promise<string | null> {
  await waitForVisible(page, selector)
  return await page.getAttribute(selector, attribute)
}

/**
 * 選擇下拉選項
 */
export async function selectOption(page: Page, selector: string, value: string) {
  await waitForVisible(page, selector)
  await page.selectOption(selector, value)
}

/**
 * 上傳檔案
 */
export async function uploadFile(page: Page, selector: string, filePath: string) {
  await waitForVisible(page, selector)
  await page.setInputFiles(selector, filePath)
}

/**
 * 清除輸入框
 */
export async function clearInput(page: Page, selector: string) {
  await waitForVisible(page, selector)
  await page.fill(selector, '')
}

/**
 * 按下鍵盤按鍵
 */
export async function pressKey(page: Page, key: string) {
  await page.keyboard.press(key)
}

/**
 * 取得所有符合選擇器的元素數量
 */
export async function getElementCount(page: Page, selector: string): Promise<number> {
  return await page.locator(selector).count()
}

/**
 * 等待元素數量變化
 */
export async function waitForElementCount(
  page: Page,
  selector: string,
  count: number,
  timeout = 5000
) {
  await page.waitForFunction(
    ({ selector, count }) => {
      return document.querySelectorAll(selector).length === count
    },
    { selector, count },
    { timeout }
  )
}

/**
 * 檢查 Toast 通知是否出現
 */
export async function waitForToast(page: Page, message: string, timeout = 5000) {
  await page.waitForSelector(`text=${message}`, { timeout })
}

/**
 * 等待載入指示器消失
 */
export async function waitForLoadingComplete(page: Page, timeout = 10000) {
  try {
    // 等待常見的載入指示器消失
    await page.waitForSelector('[data-testid="loading"]', { state: 'hidden', timeout })
  } catch {
    // 如果沒有載入指示器，繼續執行
  }
}
