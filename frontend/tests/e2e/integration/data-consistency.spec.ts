import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * 資料一致性整合測試
 *
 * 測試目標：
 * 1. 前端顯示的資料與後端 API 回傳的資料一致
 * 2. 使用者操作後，資料正確儲存且讀取正確
 * 3. 不同頁面顯示相同資料時保持一致
 */

test.describe('資料一致性測試', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('專案列表與單一專案詳情的資料應該一致', async ({ page }) => {
    /**
     * 測試場景：
     * 1. 創建一個專案
     * 2. 在專案列表中查看該專案的摘要資訊
     * 3. 進入編輯頁面查看完整資訊
     * 4. 驗證兩處的資料一致
     */

    // === 創建專案 ===
    await page.getByRole('button', { name: /開始新專案/i }).click();

    const testData = {
      title: 'Consistency Test Project',
      description: 'Testing data consistency between list and detail views'
    };

    await page.fill('input[name="title"]', testData.title);
    await page.fill('textarea[name="description"]', testData.description);
    await page.getByRole('button', { name: /教學影片/i }).first().click();
    await page.getByRole('button', { name: /建立專案/i }).click();

    await expect(page).toHaveURL(/\/editor/);

    // 儲存專案
    await page.getByRole('button', { name: /儲存/i }).click();
    await expect(page.locator('[data-testid="save-status"]')).toContainText(/已儲存/i);

    // === 返回專案列表 ===
    await page.getByRole('link', { name: /我的專案/i }).click();
    await expect(page).toHaveURL(/\/projects/);

    // === 驗證列表中的資料 ===
    const projectCard = page.locator('[data-testid="project-card"]').filter({
      hasText: testData.title
    });

    await expect(projectCard).toBeVisible();
    const cardTitle = await projectCard.locator('[data-testid="project-title"]').textContent();
    const cardDescription = await projectCard.locator('[data-testid="project-description"]').textContent();

    expect(cardTitle).toBe(testData.title);
    expect(cardDescription).toContain(testData.description);

    // === 進入編輯頁面再次驗證 ===
    await projectCard.click();
    await expect(page).toHaveURL(/\/editor/);

    const editorTitle = page.locator('input[name="title"]');
    const editorDescription = page.locator('textarea[name="description"]');

    await expect(editorTitle).toHaveValue(testData.title);
    await expect(editorDescription).toHaveValue(testData.description);
  });

  test('API 回傳資料與前端顯示應該一致', async ({ page }) => {
    /**
     * 測試場景：
     * 1. 監聽 API 請求
     * 2. 創建專案並儲存
     * 3. 比對 API response 與前端顯示的資料
     */

    // 監聽 API 請求
    let savedProjectData: any = null;

    await page.route('**/api/projects', async (route) => {
      if (route.request().method() === 'POST') {
        const response = await route.fetch();
        const json = await response.json();
        savedProjectData = json;
        await route.fulfill({ response });
      } else {
        await route.continue();
      }
    });

    // === 創建專案 ===
    await page.getByRole('button', { name: /開始新專案/i }).click();

    const testData = {
      title: 'API Consistency Test',
      description: 'Testing API and frontend data consistency'
    };

    await page.fill('input[name="title"]', testData.title);
    await page.fill('textarea[name="description"]', testData.description);
    await page.getByRole('button', { name: /生活紀錄/i }).first().click();
    await page.getByRole('button', { name: /建立專案/i }).click();

    await expect(page).toHaveURL(/\/editor/);

    // 等待 API 回應
    await page.waitForTimeout(1000);

    // === 驗證 API 回傳資料與前端一致 ===
    if (savedProjectData) {
      const editorTitle = await page.locator('input[name="title"]').inputValue();
      const editorDescription = await page.locator('textarea[name="description"]').inputValue();

      expect(savedProjectData.title).toBe(editorTitle);
      expect(savedProjectData.description).toBe(editorDescription);
    }
  });

  test('修改專案後重新載入應該顯示最新資料', async ({ page }) => {
    /**
     * 測試場景：
     * 1. 創建專案
     * 2. 修改標題和描述並儲存
     * 3. 重新載入頁面
     * 4. 驗證顯示最新的修改內容
     */

    // === 創建專案 ===
    await page.getByRole('button', { name: /開始新專案/i }).click();

    await page.fill('input[name="title"]', 'Original Title');
    await page.fill('textarea[name="description"]', 'Original description');
    await page.getByRole('button', { name: /教學影片/i }).first().click();
    await page.getByRole('button', { name: /建立專案/i }).click();

    await expect(page).toHaveURL(/\/editor/);

    // === 修改資料 ===
    const titleInput = page.locator('input[name="title"]');
    const descriptionInput = page.locator('textarea[name="description"]');

    const updatedData = {
      title: 'Updated Title',
      description: 'Updated description with new content'
    };

    await titleInput.fill(updatedData.title);
    await descriptionInput.fill(updatedData.description);

    // 儲存
    await page.getByRole('button', { name: /儲存/i }).click();
    await expect(page.locator('[data-testid="save-status"]')).toContainText(/已儲存/i);

    // === 重新載入頁面 ===
    await page.reload();
    await page.waitForLoadState('networkidle');

    // === 驗證顯示最新資料 ===
    await expect(titleInput).toHaveValue(updatedData.title);
    await expect(descriptionInput).toHaveValue(updatedData.description);
  });

  test('批次創建的多個專案資料應該獨立且正確', async ({ page }) => {
    /**
     * 測試場景：
     * 1. 使用 Flow-0 批次創建 3 個專案
     * 2. 驗證每個專案的資料都正確且獨立
     * 3. 修改其中一個專案不應該影響其他專案
     */

    // === 批次創建專案 ===
    await page.getByRole('button', { name: /批次處理/i }).click();

    await page.fill('input[name="channelName"]', 'Data Test Channel');
    await page.fill('input[name="channelDescription"]', 'Testing data independence');
    await page.getByRole('button', { name: /教學/i }).first().click();
    await page.getByRole('button', { name: /繼續/i }).click();

    await page.fill('input[name="projectPrefix"]', 'Independent');
    await page.fill('input[name="projectCount"]', '3');
    await page.getByRole('button', { name: /完成設置/i }).click();

    await expect(page).toHaveURL(/\/projects/);

    // === 獲取所有專案的資料 ===
    const projectCards = page.locator('[data-testid="project-card"]');
    await expect(projectCards).toHaveCount(3);

    const projectTitles: string[] = [];
    for (let i = 0; i < 3; i++) {
      const title = await projectCards.nth(i).locator('[data-testid="project-title"]').textContent();
      projectTitles.push(title || '');
    }

    // 驗證每個專案都有唯一的標題
    const uniqueTitles = new Set(projectTitles);
    expect(uniqueTitles.size).toBe(3);

    // === 修改第一個專案 ===
    await projectCards.first().click();
    await expect(page).toHaveURL(/\/editor/);

    const originalTitle = await page.locator('input[name="title"]').inputValue();
    await page.locator('input[name="title"]').fill(`${originalTitle} - Modified`);
    await page.getByRole('button', { name: /儲存/i }).click();
    await expect(page.locator('[data-testid="save-status"]')).toContainText(/已儲存/i);

    // === 返回列表驗證其他專案未被修改 ===
    await page.getByRole('link', { name: /我的專案/i }).click();
    await expect(page).toHaveURL(/\/projects/);

    const updatedCards = page.locator('[data-testid="project-card"]');
    const secondProjectTitle = await updatedCards.nth(1).locator('[data-testid="project-title"]').textContent();

    // 第二個專案的標題應該保持不變
    expect(secondProjectTitle).toBe(projectTitles[1]);
  });

  test('使用 Gemini API 生成內容後資料應該正確儲存', async ({ page }) => {
    /**
     * 測試場景：
     * 1. 創建專案並進入編輯器
     * 2. 使用 Gemini API 生成腳本
     * 3. 儲存後重新載入
     * 4. 驗證生成的內容正確保存
     */

    // === 創建專案 ===
    await page.getByRole('button', { name: /開始新專案/i }).click();

    await page.fill('input[name="title"]', 'Gemini API Test');
    await page.fill('textarea[name="description"]', 'Testing Gemini API integration');
    await page.getByRole('button', { name: /教學影片/i }).first().click();
    await page.getByRole('button', { name: /建立專案/i }).click();

    await expect(page).toHaveURL(/\/editor/);

    // === 生成腳本 ===
    const generateButton = page.getByRole('button', { name: /生成腳本/i });
    await generateButton.click();

    // 等待生成完成
    await expect(page.locator('[data-testid="script-output"]')).not.toBeEmpty({ timeout: 30000 });

    const generatedScript = await page.locator('[data-testid="script-output"]').textContent();

    // === 儲存 ===
    await page.getByRole('button', { name: /儲存/i }).click();
    await expect(page.locator('[data-testid="save-status"]')).toContainText(/已儲存/i);

    // === 重新載入並驗證 ===
    await page.reload();
    await page.waitForLoadState('networkidle');

    const loadedScript = await page.locator('[data-testid="script-output"]').textContent();
    expect(loadedScript).toBe(generatedScript);
  });

  test('同時儲存多個欄位應該都正確保存', async ({ page }) => {
    /**
     * 測試場景：
     * 1. 創建專案
     * 2. 同時修改多個欄位（標題、描述、內容等）
     * 3. 儲存後驗證所有欄位都正確保存
     */

    // === 創建專案 ===
    await page.getByRole('button', { name: /開始新專案/i }).click();

    const initialData = {
      title: 'Multi-field Test',
      description: 'Initial description'
    };

    await page.fill('input[name="title"]', initialData.title);
    await page.fill('textarea[name="description"]', initialData.description);
    await page.getByRole('button', { name: /生活紀錄/i }).first().click();
    await page.getByRole('button', { name: /建立專案/i }).click();

    await expect(page).toHaveURL(/\/editor/);

    // === 同時修改多個欄位 ===
    const updatedData = {
      title: 'Updated Multi-field Test',
      description: 'Updated description with more details',
      tags: ['教學', '科技', '生活']
    };

    await page.locator('input[name="title"]').fill(updatedData.title);
    await page.locator('textarea[name="description"]').fill(updatedData.description);

    // 如果有 tags 輸入（依實際實作調整）
    for (const tag of updatedData.tags) {
      const tagInput = page.locator('input[name="tag"]');
      if (await tagInput.isVisible()) {
        await tagInput.fill(tag);
        await tagInput.press('Enter');
      }
    }

    // === 儲存 ===
    await page.getByRole('button', { name: /儲存/i }).click();
    await expect(page.locator('[data-testid="save-status"]')).toContainText(/已儲存/i);

    // === 重新載入並驗證所有欄位 ===
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('input[name="title"]')).toHaveValue(updatedData.title);
    await expect(page.locator('textarea[name="description"]')).toHaveValue(updatedData.description);
  });
});
