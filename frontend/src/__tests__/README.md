# ProgressPage 測試說明

本目錄包含 Task-024 進度監控頁面的完整測試套件。

## 測試結構

### 📁 `/pages/ProgressPage.test.tsx`

**單元測試 (Unit Tests)**

- **測試 1**: 成功載入專案並顯示進度
- **測試 2**: WebSocket 即時進度更新
- **測試 3**: 日誌顯示與自動捲動
- **測試 4**: 暫停與取消功能
- **測試 5**: 錯誤處理
- **測試 6**: WebSocket 重連後訊息恢復
- **測試 7**: 訊息順序測試（防止進度回退）

### 📁 `/integration/ProgressPage.integration.test.tsx`

**前端整合測試 (Frontend Integration Tests)**

- **測試 10**: 完整生成流程（從 0% 到 100%）
  - 所有 5 個階段順序執行
  - 子任務進度正確更新
  - 日誌訊息正確記錄

## 測試覆蓋範圍

### ✅ 核心功能

- [x] 頁面載入與專案資料顯示
- [x] 總進度條更新
- [x] 5 個階段狀態顯示
- [x] 子任務進度（語音、圖片、虛擬主播）
- [x] WebSocket 連線與訊息處理
- [x] 日誌顯示與自動捲動
- [x] 控制按鈕（暫停、繼續、取消、重試）
- [x] 錯誤處理與失敗狀態
- [x] 完成狀態與結果頁跳轉

### ✅ 進階功能

- [x] WebSocket 自動重連
- [x] 進度回退保護
- [x] 訊息順序處理
- [x] 長時間連線維持
- [x] 用戶手動捲動控制

## 執行測試

### 單元測試

\`\`\`bash
# 執行所有單元測試
npm test

# 執行特定測試檔案
npm test ProgressPage.test.tsx

# 執行並查看覆蓋率
npm run test:coverage
\`\`\`

### 整合測試

\`\`\`bash
# 執行整合測試
npm test -- --testPathPattern=integration

# 只執行完整流程測試
npm test ProgressPage.integration.test.tsx
\`\`\`

## 測試數據

### Mock 專案資料

所有測試使用標準化的 mock 資料結構:

\`\`\`typescript
{
  id: '123',
  project_name: '測試專案',
  status: 'ASSETS_GENERATING',
  progress: {
    overall: 45,
    stage: 'assets',
    message: '素材生成中...',
    stages: {
      script: { status: 'completed', progress: 100 },
      assets: {
        status: 'in_progress',
        progress: 65,
        subtasks: {
          audio: { status: 'completed', progress: 100 },
          images: { status: 'in_progress', progress: 10, total: 15 },
          avatar: { status: 'pending', progress: 0 }
        }
      },
      // ...
    }
  }
}
\`\`\`

### WebSocket 訊息格式

\`\`\`typescript
// 進度更新
{
  type: 'progress',
  data: {
    overall: 50,
    stage: 'assets',
    message: '素材生成中...'
  }
}

// 階段完成
{
  type: 'stage_complete',
  data: {
    stage: 'script',
    overall: 25
  }
}

// 日誌訊息
{
  type: 'log',
  data: {
    timestamp: '2025-10-19T10:00:00Z',
    level: 'info',
    message: '開始腳本生成...'
  }
}

// 錯誤訊息
{
  type: 'error',
  data: {
    message: 'API 錯誤'
  }
}
\`\`\`

## 測試最佳實踐

### 1. **使用 data-testid**

所有測試都使用 `data-testid` 來定位元素:

\`\`\`tsx
<div data-testid="stage-script-icon">✓</div>
<div data-testid="log-viewer">...</div>
\`\`\`

### 2. **等待異步更新**

使用 `waitFor` 等待狀態更新:

\`\`\`typescript
await waitFor(() => {
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50')
})
\`\`\`

### 3. **Mock 管理**

每個測試前清除 mocks:

\`\`\`typescript
beforeEach(() => {
  vi.clearAllMocks()
})
\`\`\`

### 4. **WebSocket Mock**

提供完整的 WebSocket mock:

\`\`\`typescript
global.WebSocket = vi.fn(() => ({
  readyState: WebSocket.OPEN,
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn((event, handler) => {
    if (event === 'message') onMessageHandler = handler
  }),
  removeEventListener: vi.fn(),
})) as any
\`\`\`

## 已知限制

1. **WebSocket 真實連線**: 單元測試使用 mock，需要 E2E 測試驗證真實連線
2. **Celery 整合**: 後端整合測試需要 Celery 和 Redis 運行
3. **時間相關測試**: 部分測試使用 `setTimeout`，可能在慢速環境中失敗

## 故障排除

### 測試超時

如果測試經常超時，增加 timeout:

\`\`\`typescript
await waitFor(() => {
  // ...
}, { timeout: 10000 }) // 10 秒
\`\`\`

### Mock 未生效

確保 mock 在 `beforeEach` 中設置:

\`\`\`typescript
beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(projectApi, 'getProject').mockResolvedValue(mockProject)
})
\`\`\`

### WebSocket 訊息未觸發

檢查 `onMessageHandler` 是否正確設置:

\`\`\`typescript
const onMessageHandler = mockWs.addEventListener.mock.calls.find(
  (call) => call[0] === 'message'
)?.[1]

if (onMessageHandler) {
  onMessageHandler({ data: JSON.stringify({ ... }) })
}
\`\`\`

## 維護建議

1. 保持測試資料結構與實際 API 同步
2. 定期檢查測試覆蓋率 (目標 > 85%)
3. 新功能必須有對應測試
4. 重構時同步更新測試
