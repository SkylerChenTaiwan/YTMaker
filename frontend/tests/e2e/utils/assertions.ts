/**
 * 自定義斷言輔助函數
 *
 * 提供常用的測試斷言工具
 */

import { expect, Page } from '@playwright/test'

/**
 * 斷言元素可見
 */
export async function assertVisible(page: Page, selector: string, message?: string) {
  const element = page.locator(selector)
  await expect(element, message).toBeVisible()
}

/**
 * 斷言元素不可見
 */
export async function assertHidden(page: Page, selector: string, message?: string) {
  const element = page.locator(selector)
  await expect(element, message).toBeHidden()
}

/**
 * 斷言元素包含文字
 */
export async function assertTextContent(
  page: Page,
  selector: string,
  expectedText: string,
  message?: string
) {
  const element = page.locator(selector)
  await expect(element, message).toContainText(expectedText)
}

/**
 * 斷言元素的精確文字
 */
export async function assertExactText(
  page: Page,
  selector: string,
  expectedText: string,
  message?: string
) {
  const element = page.locator(selector)
  await expect(element, message).toHaveText(expectedText)
}

/**
 * 斷言元素可點擊
 */
export async function assertEnabled(page: Page, selector: string, message?: string) {
  const element = page.locator(selector)
  await expect(element, message).toBeEnabled()
}

/**
 * 斷言元素不可點擊
 */
export async function assertDisabled(page: Page, selector: string, message?: string) {
  const element = page.locator(selector)
  await expect(element, message).toBeDisabled()
}

/**
 * 斷言元素數量
 */
export async function assertElementCount(
  page: Page,
  selector: string,
  expectedCount: number,
  message?: string
) {
  const elements = page.locator(selector)
  await expect(elements, message).toHaveCount(expectedCount)
}

/**
 * 斷言 URL 包含特定路徑
 */
export async function assertUrlContains(page: Page, path: string, message?: string) {
  await expect(page, message).toHaveURL(new RegExp(path))
}

/**
 * 斷言 URL 為精確路徑
 */
export async function assertUrlEquals(page: Page, url: string, message?: string) {
  await expect(page, message).toHaveURL(url)
}

/**
 * 斷言頁面標題
 */
export async function assertPageTitle(page: Page, title: string, message?: string) {
  await expect(page, message).toHaveTitle(title)
}

/**
 * 斷言元素有特定屬性
 */
export async function assertAttribute(
  page: Page,
  selector: string,
  attribute: string,
  expectedValue: string,
  message?: string
) {
  const element = page.locator(selector)
  await expect(element, message).toHaveAttribute(attribute, expectedValue)
}

/**
 * 斷言元素有特定 CSS 類別
 */
export async function assertHasClass(
  page: Page,
  selector: string,
  className: string,
  message?: string
) {
  const element = page.locator(selector)
  await expect(element, message).toHaveClass(new RegExp(className))
}

/**
 * 斷言輸入框的值
 */
export async function assertInputValue(
  page: Page,
  selector: string,
  expectedValue: string,
  message?: string
) {
  const element = page.locator(selector)
  await expect(element, message).toHaveValue(expectedValue)
}

/**
 * 斷言 Checkbox 已勾選
 */
export async function assertChecked(page: Page, selector: string, message?: string) {
  const element = page.locator(selector)
  await expect(element, message).toBeChecked()
}

/**
 * 斷言 Checkbox 未勾選
 */
export async function assertUnchecked(page: Page, selector: string, message?: string) {
  const element = page.locator(selector)
  await expect(element, message).not.toBeChecked()
}

/**
 * 斷言元素聚焦
 */
export async function assertFocused(page: Page, selector: string, message?: string) {
  const element = page.locator(selector)
  await expect(element, message).toBeFocused()
}

/**
 * 斷言頁面包含文字
 */
export async function assertPageContainsText(page: Page, text: string, message?: string) {
  await expect(page.locator('body'), message).toContainText(text)
}

/**
 * 斷言 API 回應狀態
 */
export async function assertApiResponseStatus(
  page: Page,
  urlPattern: string | RegExp,
  expectedStatus: number,
  message?: string
) {
  const response = await page.waitForResponse(
    (response) => {
      const url = response.url()
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern)
      }
      return urlPattern.test(url)
    },
    { timeout: 10000 }
  )

  expect(response.status(), message).toBe(expectedStatus)
}

/**
 * 斷言 Toast 通知出現
 */
export async function assertToastVisible(page: Page, message: string, timeout = 5000) {
  const toast = page.locator(`text=${message}`)
  await expect(toast).toBeVisible({ timeout })
}

/**
 * 斷言載入指示器可見
 */
export async function assertLoadingVisible(page: Page, message?: string) {
  const loading = page.locator('[data-testid="loading"]')
  await expect(loading, message).toBeVisible()
}

/**
 * 斷言載入指示器不可見
 */
export async function assertLoadingHidden(page: Page, message?: string) {
  const loading = page.locator('[data-testid="loading"]')
  await expect(loading, message).toBeHidden()
}

/**
 * 斷言錯誤訊息顯示
 */
export async function assertErrorMessage(page: Page, errorText: string, message?: string) {
  const error = page.locator(`text=${errorText}`)
  await expect(error, message).toBeVisible()
}

/**
 * 斷言成功訊息顯示
 */
export async function assertSuccessMessage(page: Page, successText: string, message?: string) {
  const success = page.locator(`text=${successText}`)
  await expect(success, message).toBeVisible()
}

/**
 * 斷言表單驗證錯誤
 */
export async function assertValidationError(
  page: Page,
  fieldSelector: string,
  errorText: string,
  message?: string
) {
  // 尋找與該欄位關聯的錯誤訊息
  const field = page.locator(fieldSelector)
  const errorElement = field.locator('..').locator(`text=${errorText}`)
  await expect(errorElement, message).toBeVisible()
}

/**
 * 斷言元素存在於 DOM
 */
export async function assertElementExists(page: Page, selector: string, message?: string) {
  const element = page.locator(selector)
  const count = await element.count()
  expect(count, message).toBeGreaterThan(0)
}

/**
 * 斷言元素不存在於 DOM
 */
export async function assertElementNotExists(page: Page, selector: string, message?: string) {
  const element = page.locator(selector)
  const count = await element.count()
  expect(count, message).toBe(0)
}

/**
 * 斷言列表項目數量大於
 */
export async function assertListCountGreaterThan(
  page: Page,
  selector: string,
  minCount: number,
  message?: string
) {
  const elements = page.locator(selector)
  const count = await elements.count()
  expect(count, message).toBeGreaterThan(minCount)
}

/**
 * 斷言列表項目數量小於
 */
export async function assertListCountLessThan(
  page: Page,
  selector: string,
  maxCount: number,
  message?: string
) {
  const elements = page.locator(selector)
  const count = await elements.count()
  expect(count, message).toBeLessThan(maxCount)
}

/**
 * 斷言 localStorage 包含特定鍵值
 */
export async function assertLocalStorageItem(
  page: Page,
  key: string,
  expectedValue: string,
  message?: string
) {
  const value = await page.evaluate((k) => localStorage.getItem(k), key)
  expect(value, message).toBe(expectedValue)
}

/**
 * 斷言 sessionStorage 包含特定鍵值
 */
export async function assertSessionStorageItem(
  page: Page,
  key: string,
  expectedValue: string,
  message?: string
) {
  const value = await page.evaluate((k) => sessionStorage.getItem(k), key)
  expect(value, message).toBe(expectedValue)
}
