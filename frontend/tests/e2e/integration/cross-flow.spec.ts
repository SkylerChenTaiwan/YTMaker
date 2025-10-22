import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * 跨流程整合測試
 *
 * 測試目標：
 * 1. 批次處理與單一專案編輯互不影響
 * 2. 多個使用者流程可以同時並行運作
 * 3. 不同流程之間的資料隔離正確
 */

test.describe('跨流程整合測試', () => {
  test.beforeEach(async ({ page }) => {
    // 確保每個測試都從首頁開始
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('批次處理與單一專案編輯應該互不影響', async ({ page, context }) => {
    /**
     * 測試場景：
     * 1. 在第一個頁面開始批次處理流程
     * 2. 在第二個頁面開始單一專案編輯
     * 3. 兩個流程應該可以同時進行且互不影響
     */

    // === 第一個頁面：開始批次處理流程 (Flow-0) ===
    const batchPage = page;

    // 點擊「批次處理」開始 Flow-0
    await batchPage.getByRole('button', { name: /批次處理/i }).click();
    await expect(batchPage).toHaveURL(/\/setup-wizard/);

    // 填寫基本資訊
    await batchPage.fill('input[name="channelName"]', 'Batch Channel');
    await batchPage.fill('input[name="channelDescription"]', 'Testing batch processing');

    // 選擇影片風格
    await batchPage.getByRole('button', { name: /教學/i }).first().click();

    // 繼續到專案設置
    await batchPage.getByRole('button', { name: /繼續/i }).click();
    await expect(batchPage).toHaveURL(/\/setup-wizard\/project/);

    // === 第二個頁面：開始單一專案編輯流程 (Flow-1) ===
    const singlePage = await context.newPage();
    await singlePage.goto('/');
    await singlePage.waitForLoadState('networkidle');

    // 點擊「開始新專案」
    await singlePage.getByRole('button', { name: /開始新專案/i }).click();
    await expect(singlePage).toHaveURL(/\/create/);

    // 填寫專案資訊
    await singlePage.fill('input[name="title"]', 'Single Project');
    await singlePage.fill('textarea[name="description"]', 'Testing single project flow');

    // 選擇模板
    await singlePage.getByRole('button', { name: /教學影片/i }).first().click();
    await singlePage.getByRole('button', { name: /建立專案/i }).click();

    // === 驗證：兩個頁面都應該正常運作 ===

    // 驗證批次處理頁面仍在專案設置步驟
    await expect(batchPage).toHaveURL(/\/setup-wizard\/project/);
    await expect(batchPage.locator('h1')).toContainText(/專案設置/i);

    // 驗證單一專案頁面已進入編輯頁面
    await expect(singlePage).toHaveURL(/\/editor/);
    await expect(singlePage.locator('h1')).toContainText(/專案編輯/i);

    // === 繼續完成批次處理流程 ===
    await batchPage.fill('input[name="projectPrefix"]', 'Test');
    await batchPage.fill('input[name="projectCount"]', '3');
    await batchPage.getByRole('button', { name: /完成設置/i }).click();

    // 應該進入批次處理列表
    await expect(batchPage).toHaveURL(/\/projects/);

    // 驗證生成了 3 個專案
    const projectCards = batchPage.locator('[data-testid="project-card"]');
    await expect(projectCards).toHaveCount(3);

    // === 驗證單一專案不受影響 ===
    await expect(singlePage).toHaveURL(/\/editor/);
    const editorTitle = singlePage.locator('input[name="title"]');
    await expect(editorTitle).toHaveValue('Single Project');

    // 清理
    await singlePage.close();
  });

  test('Flow-0 完成後應該可以直接開始 Flow-1', async ({ page }) => {
    /**
     * 測試場景：
     * 1. 完成 Flow-0 批次處理
     * 2. 在專案列表中選擇一個專案進入 Flow-1 編輯
     * 3. 驗證資料正確傳遞
     */

    // === 完成 Flow-0 ===
    await page.getByRole('button', { name: /批次處理/i }).click();
    await expect(page).toHaveURL(/\/setup-wizard/);

    // 基本資訊
    await page.fill('input[name="channelName"]', 'Sequential Test');
    await page.fill('input[name="channelDescription"]', 'Testing sequential flows');
    await page.getByRole('button', { name: /生活/i }).first().click();
    await page.getByRole('button', { name: /繼續/i }).click();

    // 專案設置
    await page.fill('input[name="projectPrefix"]', 'Seq');
    await page.fill('input[name="projectCount"]', '2');
    await page.getByRole('button', { name: /完成設置/i }).click();

    await expect(page).toHaveURL(/\/projects/);

    // === 選擇第一個專案進入 Flow-1 ===
    const firstProject = page.locator('[data-testid="project-card"]').first();
    const projectTitle = await firstProject.locator('[data-testid="project-title"]').textContent();

    await firstProject.click();
    await expect(page).toHaveURL(/\/editor/);

    // === 驗證資料正確傳遞 ===
    const editorTitle = page.locator('input[name="title"]');
    await expect(editorTitle).toHaveValue(projectTitle || '');

    // 驗證可以正常編輯
    await editorTitle.fill('Updated Title');
    await page.getByRole('button', { name: /儲存/i }).click();

    // 等待儲存完成
    await expect(page.locator('[data-testid="save-status"]')).toContainText(/已儲存/i);
  });

  test('從 Flow-1 返回首頁應該不影響已保存的資料', async ({ page }) => {
    /**
     * 測試場景：
     * 1. 開始 Flow-1 創建專案並編輯
     * 2. 返回首頁
     * 3. 再次進入該專案，驗證資料完整
     */

    // === 創建並編輯專案 ===
    await page.getByRole('button', { name: /開始新專案/i }).click();
    await page.fill('input[name="title"]', 'Persistent Project');
    await page.fill('textarea[name="description"]', 'Testing data persistence');
    await page.getByRole('button', { name: /教學影片/i }).first().click();
    await page.getByRole('button', { name: /建立專案/i }).click();

    await expect(page).toHaveURL(/\/editor/);

    // 修改標題並儲存
    const titleInput = page.locator('input[name="title"]');
    await titleInput.fill('Modified Title');
    await page.getByRole('button', { name: /儲存/i }).click();
    await expect(page.locator('[data-testid="save-status"]')).toContainText(/已儲存/i);

    // === 返回首頁 ===
    await page.getByRole('link', { name: /首頁/i }).click();
    await expect(page).toHaveURL('/');

    // === 重新進入專案 ===
    await page.getByRole('link', { name: /我的專案/i }).click();
    await expect(page).toHaveURL(/\/projects/);

    const project = page.locator('[data-testid="project-card"]').filter({
      hasText: 'Modified Title'
    });
    await expect(project).toBeVisible();

    // 點擊進入編輯
    await project.click();
    await expect(page).toHaveURL(/\/editor/);

    // === 驗證資料保持不變 ===
    await expect(titleInput).toHaveValue('Modified Title');
  });

  test('多個瀏覽器標籤同時操作應該同步狀態', async ({ page, context }) => {
    /**
     * 測試場景：
     * 1. 在兩個標籤中都進入同一個專案
     * 2. 在第一個標籤中修改並儲存
     * 3. 第二個標籤應該能夠看到更新（或至少不衝突）
     */

    // === 創建專案 ===
    await page.getByRole('button', { name: /開始新專案/i }).click();
    await page.fill('input[name="title"]', 'Sync Test Project');
    await page.fill('textarea[name="description"]', 'Testing sync between tabs');
    await page.getByRole('button', { name: /教學影片/i }).first().click();
    await page.getByRole('button', { name: /建立專案/i }).click();

    await expect(page).toHaveURL(/\/editor/);
    const projectUrl = page.url();

    // === 在第二個標籤打開同一專案 ===
    const secondTab = await context.newPage();
    await secondTab.goto(projectUrl);
    await secondTab.waitForLoadState('networkidle');

    // === 在第一個標籤修改 ===
    const firstTabTitle = page.locator('input[name="title"]');
    await firstTabTitle.fill('Updated in Tab 1');
    await page.getByRole('button', { name: /儲存/i }).click();
    await expect(page.locator('[data-testid="save-status"]')).toContainText(/已儲存/i);

    // === 重新載入第二個標籤 ===
    await secondTab.reload();
    await secondTab.waitForLoadState('networkidle');

    // === 驗證第二個標籤看到更新 ===
    const secondTabTitle = secondTab.locator('input[name="title"]');
    await expect(secondTabTitle).toHaveValue('Updated in Tab 1');

    await secondTab.close();
  });
});
