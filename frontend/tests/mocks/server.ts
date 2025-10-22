/**
 * MSW Server 設定
 *
 * 用於 Node.js 環境（Playwright E2E 測試）攔截 HTTP 請求
 */

import { setupServer } from 'msw/node'
import { handlers } from './handlers'

// 建立 Mock Server
export const server = setupServer(...handlers)

// 全域測試生命週期設定（由 Playwright global setup 調用）
export function setupMockServer() {
  // 在測試前啟動 Mock Server
  server.listen({ onUnhandledRequest: 'warn' })

  console.log('[MSW] Mock Server started')
}

export function resetMockServer() {
  // 每次測試後重置 handlers
  server.resetHandlers()
}

export function closeMockServer() {
  // 測試結束後關閉 Server
  server.close()

  console.log('[MSW] Mock Server closed')
}
