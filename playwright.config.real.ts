import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright 配置 - 真實環境測試
 *
 * 此配置專為零 Mock 的真實環境測試設計
 * - 真實的 Backend API
 * - 真實的資料庫操作
 * - 真實的外部 API 調用
 */
export default defineConfig({
  testDir: './tests/e2e/real',

  // 超長timeout，因為會進行真實的影片生成
  timeout: 30 * 60 * 1000, // 30 分鐘

  // 全域 expect timeout
  expect: {
    timeout: 10000, // 10 秒
  },

  // 不重試 - 真實環境下重試沒意義
  retries: 0,

  // 串行執行 - 避免資料庫衝突和 API rate limit
  workers: 1,

  // 完整的測試報告
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
  ],

  use: {
    // Base URL
    baseURL: 'http://localhost:3000',

    // 始終記錄 trace 和截圖
    trace: 'on',
    screenshot: 'on',
    video: 'on',

    // 顯示瀏覽器 - 方便觀察 OAuth 和長時間運行的流程
    headless: false,

    // 較長的 action timeout
    actionTimeout: 30000, // 30 秒

    // 較長的 navigation timeout
    navigationTimeout: 60000, // 1 分鐘
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // 允許彈出視窗 (OAuth 需要)
        contextOptions: {
          permissions: ['notifications'],
        },
      },
    },
  ],

  // Web server 配置 - 如果需要自動啟動服務
  // webServer: [
  //   {
  //     command: 'cd backend && source venv/bin/activate && uvicorn app.main:app --reload --port 8000',
  //     port: 8000,
  //     timeout: 120 * 1000,
  //     reuseExistingServer: true,
  //   },
  //   {
  //     command: 'cd frontend && npm run dev',
  //     port: 3000,
  //     timeout: 120 * 1000,
  //     reuseExistingServer: true,
  //   },
  // ],
})
