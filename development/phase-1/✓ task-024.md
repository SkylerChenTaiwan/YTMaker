# [v] Task-024: 進度監控頁面 (/project/:id/progress)

> **建立日期:** 2025-10-19
> **完成日期:** 2025-10-21
> **狀態:** ✅ 已完成
> **實際時間:** ~6 小時
> **預計時間:** 14 小時
> **優先級:** P0 (必須)

---

## 關聯文件

### 產品設計
- **頁面設計:** `product-design/pages.md#Page-7-進度監控頁`
- **使用者流程:** `product-design/flows.md#Flow-1-基本影片生成流程` (步驟 4-10)
- **使用者流程:** `product-design/flows.md#Flow-6-斷點續傳與錯誤恢復` (步驟 1-3)

### 技術規格
- **頁面規格:** `tech-specs/frontend/pages.md#7-進度監控頁-progress`
- **元件架構:** `tech-specs/frontend/component-architecture.md#feature-元件-功能層`
- **狀態管理:** `tech-specs/frontend/state-management.md#useProgressStore`
- **API 整合:** `tech-specs/frontend/api-integration.md#WebSocket-整合`
- **背景任務:** `tech-specs/backend/background-jobs.md#6.2-任務列表`

### 相關任務
- **前置任務:** Task-017 ✅ (前端初始化), Task-018 ✅ (Zustand Stores), Task-019 ✅ (Axios 客戶端), Task-023 ✅ (YouTube 設定頁)
- **後置任務:** Task-025 (結果頁面), Task-029 (整合測試)
- **並行任務:** 無 (此任務必須在 Task-016 WebSocket 後端完成後才能充分測試)

---

## 任務目標

### 簡述
實作進度監控頁面 (`/project/:id/progress`)，透過 WebSocket 即時顯示影片生成進度、階段狀態、日誌輸出，並提供暫停、取消、重試等控制功能。

### 成功標準
- [x] WebSocket 連線建立並即時接收進度更新
- [x] 總進度條 (0-100%) 即時更新
- [x] 5 個階段進度顯示 (腳本、素材、渲染、封面、上傳)
- [x] 子任務進度顯示 (圖片生成 15/15)
- [x] 即時日誌顯示區 (可摺疊、自動捲動)
- [x] 控制按鈕 (暫停、取消、重試) 正常運作
- [x] 錯誤處理與顯示完整
- [x] 完成/失敗狀態正確處理
- [x] 響應式設計完成
- [x] 單元測試覆蓋率 > 85%
- [x] Celery-WebSocket 整合測試通過 (任務進度推送、失敗通知)

---

## 測試要求

### 單元測試

#### 測試 1：成功載入專案並顯示進度

**目的：** 驗證頁面可以正確載入專案並顯示當前進度

**前置條件：**
- 專案存在於資料庫中
- 專案狀態為 `ASSETS_GENERATING`
- 總進度為 45%

**輸入：**
```typescript
// 模擬專案資料
const mockProject = {
  id: '123',
  project_name: '測試專案',
  status: 'ASSETS_GENERATING',
  progress: {
    overall: 45,
    stage: 'assets',
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
      render: { status: 'pending', progress: 0 },
      thumbnail: { status: 'pending', progress: 0 },
      upload: { status: 'pending', progress: 0 }
    }
  }
}

// 模擬 API 回傳
vi.mock('@/api/projects', () => ({
  getProject: vi.fn(() => Promise.resolve(mockProject))
}))
```

**預期輸出：**
- 總進度條顯示 45%
- 當前階段文字顯示「素材生成中...」
- 階段 1 (腳本) 顯示 ✓ 已完成
- 階段 2 (素材) 顯示 ⏳ 進行中，65%
  - 語音合成顯示 ✓
  - 圖片生成顯示「10/15」
  - 虛擬主播顯示 ⏸️ 等待中
- 階段 3-5 顯示 ⏸️ 等待中

**驗證點：**
- [ ] `ProgressBar` 元件的 `value` prop 為 45
- [ ] 階段文字為「素材生成中...」
- [ ] 腳本階段顯示綠色勾選圖示
- [ ] 素材階段顯示藍色進度條
- [ ] 圖片生成顯示「圖片生成 (10/15)」
- [ ] 渲染、封面、上傳階段顯示灰色等待狀態

**測試程式碼骨架：**
```typescript
// __tests__/pages/ProgressPage.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import ProgressPage from '@/app/project/[id]/progress/page'
import * as api from '@/api/projects'

describe('ProgressPage - 測試 1：成功載入專案並顯示進度', () => {
  it('應該正確顯示專案進度和階段狀態', async () => {
    // Mock API
    const mockProject = { /* 如上 */ }
    vi.spyOn(api, 'getProject').mockResolvedValue(mockProject)

    // 渲染頁面
    render(<ProgressPage params={{ id: '123' }} />)

    // 等待資料載入
    await waitFor(() => {
      expect(screen.getByText('測試專案')).toBeInTheDocument()
    })

    // 驗證總進度條
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveAttribute('aria-valuenow', '45')

    // 驗證當前階段
    expect(screen.getByText('素材生成中...')).toBeInTheDocument()

    // 驗證腳本階段 (已完成)
    expect(screen.getByText('腳本生成')).toBeInTheDocument()
    expect(screen.getByTestId('stage-script-icon')).toHaveClass('text-green-500')

    // 驗證素材階段 (進行中)
    expect(screen.getByText('素材生成')).toBeInTheDocument()
    expect(screen.getByText('65%')).toBeInTheDocument()
    expect(screen.getByText('圖片生成 (10/15)')).toBeInTheDocument()

    // 驗證其他階段 (等待中)
    expect(screen.getByText('影片渲染')).toBeInTheDocument()
    expect(screen.getByTestId('stage-render-icon')).toHaveClass('text-gray-400')
  })
})
```

---

#### 測試 2：WebSocket 即時進度更新

**目的：** 驗證 WebSocket 連線成功並即時更新進度

**前置條件：**
- WebSocket 端點可用
- 專案正在生成中

**輸入：**
```typescript
// 模擬 WebSocket 訊息
const wsMessages = [
  {
    type: 'progress',
    data: {
      overall: 50,
      stage: 'assets',
      message: '圖片生成中 (11/15)...'
    }
  },
  {
    type: 'progress',
    data: {
      overall: 55,
      stage: 'assets',
      message: '圖片生成中 (12/15)...'
    }
  },
  {
    type: 'stage_complete',
    data: {
      stage: 'assets',
      overall: 60
    }
  },
  {
    type: 'stage_start',
    data: {
      stage: 'render',
      overall: 60,
      message: '開始渲染影片...'
    }
  }
]

// Mock WebSocket
const mockWs = {
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn((event, handler) => {
    if (event === 'message') {
      wsMessages.forEach((msg, index) => {
        setTimeout(() => {
          handler({ data: JSON.stringify(msg) })
        }, index * 1000)
      })
    }
  })
}

global.WebSocket = vi.fn(() => mockWs)
```

**預期輸出：**
- 進度從 50% → 55% → 60%
- 階段從「素材生成中」→「開始渲染影片」
- 素材階段圖示從 ⏳ 變為 ✓
- 渲染階段圖示從 ⏸️ 變為 ⏳

**驗證點：**
- [ ] WebSocket 連線建立 (`new WebSocket` 被調用)
- [ ] 進度條數值隨 WebSocket 訊息更新
- [ ] 階段狀態即時變化
- [ ] UI 更新無延遲 (< 100ms)

**測試程式碼骨架：**
```typescript
describe('ProgressPage - 測試 2：WebSocket 即時進度更新', () => {
  it('應該透過 WebSocket 即時更新進度', async () => {
    // Mock WebSocket (如上)

    render(<ProgressPage params={{ id: '123' }} />)

    // 等待初始載入
    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    // 驗證初始進度
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '45')

    // 等待 WebSocket 訊息 1
    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50')
    })
    expect(screen.getByText('圖片生成中 (11/15)...')).toBeInTheDocument()

    // 等待 WebSocket 訊息 2
    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '55')
    })
    expect(screen.getByText('圖片生成中 (12/15)...')).toBeInTheDocument()

    // 驗證階段完成
    await waitFor(() => {
      expect(screen.getByTestId('stage-assets-icon')).toHaveClass('text-green-500')
    })

    // 驗證新階段開始
    await waitFor(() => {
      expect(screen.getByText('開始渲染影片...')).toBeInTheDocument()
      expect(screen.getByTestId('stage-render-icon')).toHaveClass('text-blue-500')
    })
  })
})
```

---

#### 測試 3：日誌顯示與自動捲動

**目的：** 驗證日誌區正確顯示訊息並自動捲動到最新

**輸入：**
```typescript
const logMessages = [
  { timestamp: '2025-10-19T10:00:00Z', level: 'info', message: '開始腳本生成...' },
  { timestamp: '2025-10-19T10:01:30Z', level: 'info', message: '腳本生成完成' },
  { timestamp: '2025-10-19T10:02:00Z', level: 'info', message: '開始語音合成...' },
  { timestamp: '2025-10-19T10:03:45Z', level: 'info', message: '語音合成完成' },
  { timestamp: '2025-10-19T10:04:00Z', level: 'info', message: '開始圖片生成 (1/15)...' },
  { timestamp: '2025-10-19T10:04:30Z', level: 'info', message: '圖片生成完成 (1/15)' },
  // ... 更多日誌
  { timestamp: '2025-10-19T10:15:00Z', level: 'error', message: '圖片生成失敗 (#7): 連線超時' },
  { timestamp: '2025-10-19T10:15:10Z', level: 'warning', message: '正在重試 (1/3)...' }
]

// 模擬 WebSocket 推送日誌
const mockWs = {
  addEventListener: vi.fn((event, handler) => {
    if (event === 'message') {
      logMessages.forEach((log, index) => {
        setTimeout(() => {
          handler({ data: JSON.stringify({ type: 'log', data: log }) })
        }, index * 500)
      })
    }
  })
}
```

**預期輸出：**
- 日誌區顯示所有訊息，按時間順序排列
- 錯誤訊息顯示為紅色
- 警告訊息顯示為黃色
- 資訊訊息顯示為預設顏色
- 自動捲動到最新訊息

**驗證點：**
- [ ] 所有日誌訊息都顯示在日誌區
- [ ] 錯誤訊息有 `text-red-500` class
- [ ] 警告訊息有 `text-yellow-500` class
- [ ] 日誌區自動捲動到底部 (`scrollTop === scrollHeight - clientHeight`)
- [ ] 用戶手動捲動後，自動捲動暫停
- [ ] 用戶捲動到底部後，自動捲動恢復

**測試程式碼骨架：**
```typescript
describe('ProgressPage - 測試 3：日誌顯示與自動捲動', () => {
  it('應該正確顯示日誌並自動捲動到最新', async () => {
    render(<ProgressPage params={{ id: '123' }} />)

    await waitFor(() => {
      expect(screen.getByTestId('log-viewer')).toBeInTheDocument()
    })

    // 驗證日誌訊息顯示
    await waitFor(() => {
      expect(screen.getByText(/開始腳本生成/)).toBeInTheDocument()
    })

    // 等待更多日誌
    await waitFor(() => {
      expect(screen.getByText(/圖片生成失敗/)).toBeInTheDocument()
    })

    // 驗證錯誤訊息樣式
    const errorLog = screen.getByText(/圖片生成失敗/)
    expect(errorLog).toHaveClass('text-red-500')

    // 驗證警告訊息樣式
    const warningLog = screen.getByText(/正在重試/)
    expect(warningLog).toHaveClass('text-yellow-500')

    // 驗證自動捲動
    const logViewer = screen.getByTestId('log-viewer')
    expect(logViewer.scrollTop).toBe(logViewer.scrollHeight - logViewer.clientHeight)
  })

  it('用戶手動捲動後，應暫停自動捲動', async () => {
    render(<ProgressPage params={{ id: '123' }} />)

    const logViewer = screen.getByTestId('log-viewer')

    // 模擬用戶捲動到頂部
    fireEvent.scroll(logViewer, { target: { scrollTop: 0 } })

    // 等待新日誌
    await waitFor(() => {
      expect(screen.getAllByTestId('log-entry')).toHaveLength(8)
    })

    // 驗證未自動捲動 (仍在頂部)
    expect(logViewer.scrollTop).toBe(0)

    // 模擬用戶捲動到底部
    fireEvent.scroll(logViewer, {
      target: { scrollTop: logViewer.scrollHeight - logViewer.clientHeight }
    })

    // 等待新日誌
    await waitFor(() => {
      expect(screen.getAllByTestId('log-entry')).toHaveLength(9)
    })

    // 驗證恢復自動捲動
    expect(logViewer.scrollTop).toBe(logViewer.scrollHeight - logViewer.clientHeight)
  })
})
```

---

#### 測試 4：暫停與取消功能

**目的：** 驗證暫停和取消按鈕正常運作

**輸入：**
```typescript
// Mock API
vi.mock('@/api/projects', () => ({
  pauseGeneration: vi.fn(() => Promise.resolve({ success: true })),
  cancelGeneration: vi.fn(() => Promise.resolve({ success: true })),
  resumeGeneration: vi.fn(() => Promise.resolve({ success: true }))
}))
```

**預期輸出 (暫停)：**
- 點擊「暫停」按鈕
- 調用 `POST /api/v1/projects/:id/pause`
- 專案狀態變為 `PAUSED`
- 進度條停止更新
- 「暫停」按鈕變為「繼續」按鈕
- 顯示「已暫停」提示訊息

**預期輸出 (取消):**
- 點擊「取消」按鈕
- 顯示確認 Modal「確定要取消生成嗎?」
- 點擊 Modal 的「確定」按鈕
- 調用 `POST /api/v1/projects/:id/cancel`
- 專案狀態變為 `CANCELLED`
- 跳轉回主控台

**驗證點：**
- [ ] 點擊「暫停」調用 `pauseGeneration` API
- [ ] 暫停後按鈕文字變為「繼續」
- [ ] 點擊「繼續」調用 `resumeGeneration` API
- [ ] 點擊「取消」顯示確認 Modal
- [ ] 確認取消後調用 `cancelGeneration` API
- [ ] 取消後跳轉到主控台 (`router.push('/')`)

**測試程式碼骨架：**
```typescript
describe('ProgressPage - 測試 4：暫停與取消功能', () => {
  it('應該正確處理暫停與繼續', async () => {
    const pauseMock = vi.spyOn(api, 'pauseGeneration')
    const resumeMock = vi.spyOn(api, 'resumeGeneration')

    render(<ProgressPage params={{ id: '123' }} />)

    // 點擊暫停按鈕
    const pauseButton = screen.getByRole('button', { name: /暫停/ })
    fireEvent.click(pauseButton)

    // 驗證 API 調用
    await waitFor(() => {
      expect(pauseMock).toHaveBeenCalledWith('123')
    })

    // 驗證按鈕變為「繼續」
    expect(screen.getByRole('button', { name: /繼續/ })).toBeInTheDocument()

    // 驗證提示訊息
    expect(screen.getByText('已暫停')).toBeInTheDocument()

    // 點擊繼續按鈕
    const resumeButton = screen.getByRole('button', { name: /繼續/ })
    fireEvent.click(resumeButton)

    // 驗證 API 調用
    await waitFor(() => {
      expect(resumeMock).toHaveBeenCalledWith('123')
    })

    // 驗證按鈕變回「暫停」
    expect(screen.getByRole('button', { name: /暫停/ })).toBeInTheDocument()
  })

  it('應該正確處理取消', async () => {
    const cancelMock = vi.spyOn(api, 'cancelGeneration')
    const routerPushMock = vi.fn()
    vi.mock('next/navigation', () => ({
      useRouter: () => ({ push: routerPushMock })
    }))

    render(<ProgressPage params={{ id: '123' }} />)

    // 點擊取消按鈕
    const cancelButton = screen.getByRole('button', { name: /取消/ })
    fireEvent.click(cancelButton)

    // 驗證 Modal 顯示
    await waitFor(() => {
      expect(screen.getByText('確定要取消生成嗎?')).toBeInTheDocument()
    })

    // 點擊 Modal 的確定按鈕
    const confirmButton = screen.getByRole('button', { name: /確定/ })
    fireEvent.click(confirmButton)

    // 驗證 API 調用
    await waitFor(() => {
      expect(cancelMock).toHaveBeenCalledWith('123')
    })

    // 驗證跳轉
    expect(routerPushMock).toHaveBeenCalledWith('/')
  })
})
```

---

#### 測試 5：錯誤處理

**目的：** 驗證生成失敗時的錯誤顯示和重試功能

**輸入：**
```typescript
const mockProjectFailed = {
  id: '123',
  project_name: '失敗的專案',
  status: 'FAILED',
  error: {
    stage: 'assets',
    message: 'Stability AI API 錯誤: 圖片生成超時 (圖片 #7)',
    code: 'STABILITY_AI_TIMEOUT',
    timestamp: '2025-10-19T10:15:00Z'
  },
  progress: {
    overall: 45,
    stage: 'assets',
    stages: { /* ... */ }
  }
}

vi.mock('@/api/projects', () => ({
  getProject: vi.fn(() => Promise.resolve(mockProjectFailed)),
  retryGeneration: vi.fn(() => Promise.resolve({ success: true }))
}))
```

**預期輸出：**
- 顯示失敗狀態（紅色圖示）
- 顯示錯誤訊息「Stability AI API 錯誤: 圖片生成超時 (圖片 #7)」
- 顯示「查看錯誤日誌」按鈕
- 顯示「重試」按鈕
- 顯示「返回主控台」按鈕

**驗證點：**
- [ ] 失敗圖示顯示（紅色）
- [ ] 錯誤訊息顯示在頁面上方
- [ ] 點擊「查看錯誤日誌」展開日誌區並捲動到錯誤位置
- [ ] 點擊「重試」調用 `POST /api/v1/projects/:id/retry`
- [ ] 重試後專案狀態變為 `ASSETS_GENERATING`

**測試程式碼骨架：**
```typescript
describe('ProgressPage - 測試 5：錯誤處理', () => {
  it('應該正確顯示失敗狀態和錯誤訊息', async () => {
    render(<ProgressPage params={{ id: '123' }} />)

    // 等待資料載入
    await waitFor(() => {
      expect(screen.getByText('失敗的專案')).toBeInTheDocument()
    })

    // 驗證失敗圖示
    expect(screen.getByTestId('failure-icon')).toHaveClass('text-red-500')

    // 驗證錯誤訊息
    expect(screen.getByText(/Stability AI API 錯誤/)).toBeInTheDocument()

    // 驗證按鈕存在
    expect(screen.getByRole('button', { name: /查看錯誤日誌/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /重試/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /返回主控台/ })).toBeInTheDocument()
  })

  it('應該正確處理重試', async () => {
    const retryMock = vi.spyOn(api, 'retryGeneration')

    render(<ProgressPage params={{ id: '123' }} />)

    // 點擊重試按鈕
    const retryButton = screen.getByRole('button', { name: /重試/ })
    fireEvent.click(retryButton)

    // 驗證 API 調用
    await waitFor(() => {
      expect(retryMock).toHaveBeenCalledWith('123')
    })

    // 驗證狀態變更 (模擬 API 回傳新狀態)
    await waitFor(() => {
      expect(screen.queryByTestId('failure-icon')).not.toBeInTheDocument()
      expect(screen.getByTestId('in-progress-icon')).toBeInTheDocument()
    })
  })
})
```

---

#### 測試 6：WebSocket 重連後訊息恢復

**目的：** 驗證 WebSocket 斷線重連後能恢復遺失的進度更新

**前置條件：**
- WebSocket 端點可用
- 專案正在生成中

**輸入：**
```typescript
// 模擬連線、斷線、重連流程
const mockWs = {
  readyState: WebSocket.OPEN,
  close: vi.fn(() => {
    mockWs.readyState = WebSocket.CLOSED
  }),
  send: vi.fn(),
  addEventListener: vi.fn()
}
```

**預期輸出：**
- 斷線前進度顯示正常 (30%)
- 斷線期間顯示「重新連線中」提示
- 重連後立即收到最新進度 (70%)
- 不會遺失進度更新

**驗證點：**
- [ ] 斷線時顯示重連提示
- [ ] 重連後收到最新進度
- [ ] 進度從 30% 跳到 70% (不是從 30% 逐步更新)
- [ ] 重連延遲應 < 3 秒

**測試程式碼骨架：**
```typescript
describe('ProgressPage - 測試 6：WebSocket 重連後訊息恢復', () => {
  it('WebSocket 斷線重連後應恢復遺失的進度', async () => {
    const { rerender } = render(<ProgressMonitorPage />)

    // 建立初始連線
    await waitFor(() => {
      expect(screen.getByTestId('ws-status')).toHaveTextContent('已連線')
    })

    // 模擬進度從 0% 到 30%
    mockWebSocket.send({ type: 'progress', value: 0.3 })
    await waitFor(() => {
      expect(screen.getByTestId('progress-bar')).toHaveAttribute('value', '30')
    })

    // 模擬斷線
    mockWebSocket.close()
    await waitFor(() => {
      expect(screen.getByTestId('ws-status')).toHaveTextContent('重新連線中')
    })

    // 在斷線期間,後端進度從 30% 到 70%
    // (這些訊息前端沒收到)

    // 重新連線
    mockWebSocket.reconnect()

    // 重連後應立即收到最新進度
    await waitFor(() => {
      expect(screen.getByTestId('progress-bar')).toHaveAttribute('value', '70')
    }, { timeout: 3000 })
  })
})
```

---

#### 測試 7：訊息順序測試

**目的：** 驗證 WebSocket 訊息亂序到達時能正確排序處理

**前置條件：**
- WebSocket 連線已建立
- 訊息包含 sequence 序號

**輸入：**
```typescript
// 模擬訊息亂序到達
const messages = [
  {
    type: 'progress',
    value: 0.5,
    timestamp: 1000,
    sequence: 2  // 第二個訊息先到
  },
  {
    type: 'progress',
    value: 0.3,
    timestamp: 500,
    sequence: 1  // 第一個訊息後到
  },
  {
    type: 'progress',
    value: 0.7,
    timestamp: 1500,
    sequence: 3  // 第三個訊息
  }
]
```

**預期輸出：**
- 日誌顯示順序為 30% → 50% → 70%
- 不會因為亂序導致進度回退
- 進度條始終顯示最新的數值

**驗證點：**
- [ ] 訊息按 sequence 排序
- [ ] 日誌顯示順序正確
- [ ] 進度不會倒退
- [ ] UI 更新流暢無跳躍

**測試程式碼骨架：**
```typescript
describe('ProgressPage - 測試 7：訊息順序測試', () => {
  it('亂序到達的 WebSocket 訊息應正確排序', async () => {
    render(<ProgressMonitorPage />)

    await waitFor(() => {
      expect(screen.getByTestId('ws-status')).toHaveTextContent('已連線')
    })

    // 模擬訊息亂序到達
    mockWebSocket.send({
      type: 'progress',
      value: 0.5,
      timestamp: 1000,
      sequence: 2
    })

    mockWebSocket.send({
      type: 'progress',
      value: 0.3,
      timestamp: 500,
      sequence: 1
    })

    mockWebSocket.send({
      type: 'progress',
      value: 0.7,
      timestamp: 1500,
      sequence: 3
    })

    // 等待訊息處理
    await waitFor(() => {
      const logs = screen.getAllByTestId('progress-log-item')
      expect(logs).toHaveLength(3)
    })

    // 檢查顯示順序應按 sequence 排序
    const logs = screen.getAllByTestId('progress-log-item')
    expect(logs[0]).toHaveTextContent('30%')
    expect(logs[1]).toHaveTextContent('50%')
    expect(logs[2]).toHaveTextContent('70%')
  })
})
```

---

### 後端整合測試

#### 測試 8：Celery 任務進度應透過 WebSocket 即時推送到前端

**目的：** 驗證 Celery 後台任務與 WebSocket 推送的完整整合流程

**前置條件：**
- Celery worker 正在運行
- WebSocket 端點可用
- Redis 作為訊息代理正常運作

**流程：**
1. 建立 WebSocket 連線
2. 訂閱專案進度
3. 觸發 Celery 任務 (`generate_video.delay()`)
4. 監聽 WebSocket 訊息
5. 驗證收到進度更新訊息
6. 驗證最終收到完成訊息

**驗證點：**
- [ ] 收到至少一個進度訊息
- [ ] 訊息包含 `processing` 狀態
- [ ] 最後訊息為 `completed` 狀態
- [ ] 進度數值單調遞增
- [ ] WebSocket 推送延遲 < 1 秒

**測試程式碼：**
```python
# test_celery_websocket_integration.py

@pytest.mark.integration
async def test_celery_task_progress_pushes_to_websocket():
    """Celery 任務進度應透過 WebSocket 即時推送到前端"""

    # 1. 建立 WebSocket 連線
    async with websockets.connect('ws://localhost:8000/ws') as ws:

        # 2. 訂閱專案進度
        await ws.send(json.dumps({
            'type': 'subscribe',
            'project_id': 'test-project-123'
        }))

        # 3. 觸發 Celery 任務
        task = generate_video.delay('test-project-123')

        # 4. 應收到進度更新
        messages = []
        timeout = time.time() + 30  # 30 秒超時

        while time.time() < timeout:
            try:
                msg = await asyncio.wait_for(ws.recv(), timeout=1)
                data = json.loads(msg)
                messages.append(data)

                if data.get('status') == 'completed':
                    break
            except asyncio.TimeoutError:
                continue

        # 5. 驗證收到的訊息
        assert len(messages) > 0, "應收到至少一個進度訊息"

        # 應包含 processing 狀態
        assert any(m['status'] == 'processing' for m in messages)

        # 最後應為 completed
        assert messages[-1]['status'] == 'completed'

        # 進度應遞增
        progresses = [m.get('progress', 0) for m in messages if 'progress' in m]
        assert progresses == sorted(progresses), "進度應單調遞增"
```

---

#### 測試 9：Celery 任務失敗應透過 WebSocket 通知前端

**目的：** 驗證 Celery 任務失敗時能透過 WebSocket 正確通知前端

**前置條件：**
- Celery worker 正在運行
- WebSocket 端點可用
- 測試資料包含會導致失敗的專案

**流程：**
1. 建立 WebSocket 連線
2. 訂閱無效專案 ID
3. 觸發 Celery 任務
4. 監聽 WebSocket 訊息
5. 驗證收到失敗通知
6. 驗證錯誤訊息包含有用資訊

**驗證點：**
- [ ] 收到 `failed` 狀態訊息
- [ ] 訊息包含 `error` 欄位
- [ ] 錯誤訊息清楚描述失敗原因
- [ ] 失敗通知延遲 < 3 秒

**測試程式碼：**
```python
@pytest.mark.integration
async def test_celery_task_failure_notifies_websocket():
    """Celery 任務失敗應透過 WebSocket 通知前端"""

    async with websockets.connect('ws://localhost:8000/ws') as ws:
        await ws.send(json.dumps({
            'type': 'subscribe',
            'project_id': 'invalid-project'  # 這會導致失敗
        }))

        # 觸發任務
        task = generate_video.delay('invalid-project')

        # 等待失敗訊息
        timeout = time.time() + 30
        failure_received = False

        while time.time() < timeout:
            try:
                msg = await asyncio.wait_for(ws.recv(), timeout=1)
                data = json.loads(msg)

                if data.get('status') == 'failed':
                    failure_received = True
                    assert 'error' in data
                    assert len(data['error']) > 0
                    break
            except asyncio.TimeoutError:
                continue

        assert failure_received, "應收到失敗通知"
```

---

### 整合測試

#### 測試 10：完整生成流程

**目的：** 驗證從開始到完成的整個流程

**流程：**
1. 載入頁面，專案狀態為 `SCRIPT_GENERATING`
2. 等待 3 秒，WebSocket 推送「腳本生成完成」
3. 專案狀態變為 `ASSETS_GENERATING`
4. 等待 5 秒，WebSocket 推送「素材生成進度 50%」
5. 等待 5 秒，WebSocket 推送「素材生成完成」
6. 專案狀態變為 `RENDERING`
7. 等待 10 秒，WebSocket 推送「渲染完成」
8. 專案狀態變為 `UPLOADING`
9. 等待 5 秒，WebSocket 推送「上傳完成」
10. 專案狀態變為 `COMPLETED`
11. 顯示「影片生成完成!」並提供「查看結果」按鈕

**驗證點：**
- [ ] 所有階段按順序完成
- [ ] 總進度從 0% → 100%
- [ ] 每個階段完成時圖示變為 ✓
- [ ] 完成後顯示成功訊息
- [ ] 「查看結果」按鈕可點擊並跳轉到結果頁

---

### E2E 測試 (使用 Playwright)

#### 測試 11：真實 WebSocket 連線與進度更新

**目的：** 在真實環境中測試 WebSocket 連線

**前置條件：**
- 後端 API 正在運行
- WebSocket 端點可用
- 存在一個測試專案

**流程：**
1. 訪問 `/project/test-id/progress`
2. 驗證 WebSocket 連線建立 (DevTools Network)
3. 後端推送進度更新
4. 驗證前端即時顯示更新
5. 關閉瀏覽器 tab
6. 重新開啟
7. 驗證 WebSocket 自動重連

**驗證點：**
- [ ] WebSocket 連線成功 (`ws://localhost:8000/api/v1/projects/test-id/progress`)
- [ ] 進度更新延遲 < 200ms
- [ ] 關閉 tab 後 WebSocket 斷開
- [ ] 重新開啟後 WebSocket 自動重連

**測試程式碼骨架：**
```typescript
// e2e/progress-page.spec.ts
import { test, expect } from '@playwright/test'

test('真實 WebSocket 連線與進度更新', async ({ page }) => {
  // 訪問頁面
  await page.goto('http://localhost:3000/project/test-id/progress')

  // 等待 WebSocket 連線
  const wsPromise = page.waitForEvent('websocket')
  const ws = await wsPromise
  expect(ws.url()).toContain('ws://localhost:8000/api/v1/projects/test-id/progress')

  // 等待進度更新
  await page.waitForSelector('[data-testid="progress-bar"]')

  // 驗證初始進度
  const initialProgress = await page.getAttribute('[data-testid="progress-bar"]', 'aria-valuenow')
  expect(Number(initialProgress)).toBeGreaterThanOrEqual(0)

  // 等待 5 秒，驗證進度更新
  await page.waitForTimeout(5000)
  const updatedProgress = await page.getAttribute('[data-testid="progress-bar"]', 'aria-valuenow')
  expect(Number(updatedProgress)).toBeGreaterThan(Number(initialProgress))

  // 關閉並重新開啟
  await page.close()
  await page.goto('http://localhost:3000/project/test-id/progress')

  // 驗證自動重連
  const wsReconnect = await page.waitForEvent('websocket')
  expect(wsReconnect.url()).toContain('ws://localhost:8000/api/v1/projects/test-id/progress')
})
```

---

## 實作規格

### 需要建立/修改的檔案

#### 1. 頁面元件: `frontend/src/app/project/[id]/progress/page.tsx`

**職責:** 進度監控頁面主要元件

```tsx
// frontend/src/app/project/[id]/progress/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { StageProgress } from '@/components/feature/StageProgress'
import { LogViewer } from '@/components/feature/LogViewer'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useProjectStore } from '@/store/projectStore'
import { useProgressStore } from '@/store/progressStore'
import * as api from '@/api/projects'
import { toast } from '@/services/toast'

interface ProgressPageProps {
  params: { id: string }
}

export default function ProgressPage({ params }: ProgressPageProps) {
  const router = useRouter()
  const projectId = params.id

  const [showCancelModal, setShowCancelModal] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  const { currentProject, fetchProject } = useProjectStore()
  const { progress, logs, updateProgress, addLog } = useProgressStore()

  // WebSocket 連線
  const { isConnected, reconnect } = useWebSocket(projectId, {
    onMessage: (message) => {
      if (message.type === 'progress') {
        updateProgress(message.data)
      } else if (message.type === 'log') {
        addLog(message.data)
      } else if (message.type === 'stage_complete') {
        updateProgress({ stage: message.data.stage, status: 'completed' })
      } else if (message.type === 'error') {
        toast.error(message.data.message)
      }
    },
    onError: (error) => {
      toast.error('WebSocket 連線錯誤')
      console.error('WebSocket error:', error)
    },
    onReconnect: () => {
      toast.info('重新連線中...')
    }
  })

  // 載入專案資料
  useEffect(() => {
    fetchProject(projectId)
  }, [projectId, fetchProject])

  // 處理暫停
  const handlePause = async () => {
    try {
      await api.pauseGeneration(projectId)
      setIsPaused(true)
      toast.success('已暫停生成')
    } catch (error) {
      toast.error('暫停失敗')
    }
  }

  // 處理繼續
  const handleResume = async () => {
    try {
      await api.resumeGeneration(projectId)
      setIsPaused(false)
      toast.success('已繼續生成')
    } catch (error) {
      toast.error('繼續失敗')
    }
  }

  // 處理取消
  const handleCancel = async () => {
    try {
      await api.cancelGeneration(projectId)
      toast.success('已取消生成')
      router.push('/')
    } catch (error) {
      toast.error('取消失敗')
    }
  }

  // 處理重試
  const handleRetry = async () => {
    try {
      await api.retryGeneration(projectId)
      toast.success('已重新開始生成')
    } catch (error) {
      toast.error('重試失敗')
    }
  }

  // 跳轉到結果頁
  const handleViewResult = () => {
    router.push(`/project/${projectId}/result`)
  }

  if (!currentProject) {
    return <div>載入中...</div>
  }

  const isCompleted = currentProject.status === 'COMPLETED'
  const isFailed = currentProject.status === 'FAILED'

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: '主控台', href: '/' },
          { label: currentProject.project_name, href: '#' },
          { label: '生成進度' }
        ]}
      />

      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">{currentProject.project_name}</h1>

        {/* 總進度區 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="mb-4">
            <p className="text-lg font-medium mb-2">
              {isCompleted ? '影片生成完成!' : isFailed ? '生成失敗' : progress.message}
            </p>
            {progress.estimatedTime && !isCompleted && !isFailed && (
              <p className="text-sm text-gray-500">
                預估剩餘時間: {progress.estimatedTime}
              </p>
            )}
          </div>

          <ProgressBar
            value={progress.overall}
            showPercentage
            status={isCompleted ? 'success' : isFailed ? 'error' : 'normal'}
            data-testid="progress-bar"
          />

          {/* WebSocket 連線狀態 */}
          {!isConnected && (
            <div className="mt-4 flex items-center text-yellow-600">
              <span className="mr-2">⚠️</span>
              <span>連線中斷，正在重新連線...</span>
              <Button type="text" onClick={reconnect} className="ml-2">
                手動重連
              </Button>
            </div>
          )}
        </div>

        {/* 階段進度區 */}
        <StageProgress stages={progress.stages} currentStage={progress.stage} />

        {/* 錯誤訊息 */}
        {isFailed && currentProject.error && (
          <div className="bg-red-50 border border-red-300 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <span className="text-red-500 text-2xl mr-3" data-testid="failure-icon">
                ✗
              </span>
              <div className="flex-1">
                <p className="font-medium text-red-800">生成失敗</p>
                <p className="text-red-700 mt-1">{currentProject.error.message}</p>
                <p className="text-sm text-red-600 mt-2">
                  錯誤碼: {currentProject.error.code} |
                  時間: {new Date(currentProject.error.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 日誌顯示區 */}
        <LogViewer logs={logs} />

        {/* 操作按鈕 */}
        <div className="flex justify-end gap-4 mt-6">
          {!isCompleted && !isFailed && (
            <>
              {!isPaused ? (
                <Button onClick={handlePause}>暫停</Button>
              ) : (
                <Button onClick={handleResume} type="primary">繼續</Button>
              )}
              <Button onClick={() => setShowCancelModal(true)} type="danger">
                取消
              </Button>
            </>
          )}

          {isFailed && (
            <>
              <Button onClick={handleRetry} type="primary">重試</Button>
              <Button onClick={() => router.push('/')}>返回主控台</Button>
            </>
          )}

          {isCompleted && (
            <>
              <Button onClick={() => router.push('/')}>返回主控台</Button>
              <Button onClick={handleViewResult} type="primary">
                查看結果
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 取消確認 Modal */}
      <Modal
        visible={showCancelModal}
        title="確認取消"
        onOk={handleCancel}
        onCancel={() => setShowCancelModal(false)}
        okText="確定"
        cancelText="取消"
      >
        <p>確定要取消生成嗎? 生成將在背景繼續執行。</p>
      </Modal>
    </AppLayout>
  )
}
```

---

#### 2. WebSocket Hook: `frontend/src/hooks/useWebSocket.ts`

**職責:** 管理 WebSocket 連線、自動重連、心跳檢測

```typescript
// frontend/src/hooks/useWebSocket.ts
import { useEffect, useRef, useState, useCallback } from 'react'

interface UseWebSocketOptions {
  onMessage: (message: any) => void
  onError?: (error: Event) => void
  onReconnect?: () => void
  reconnectInterval?: number
  heartbeatInterval?: number
}

export function useWebSocket(
  projectId: string,
  options: UseWebSocketOptions
) {
  const {
    onMessage,
    onError,
    onReconnect,
    reconnectInterval = 3000,
    heartbeatInterval = 30000
  } = options

  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const reconnectTimerRef = useRef<NodeJS.Timeout>()
  const heartbeatTimerRef = useRef<NodeJS.Timeout>()

  const connect = useCallback(() => {
    // 關閉現有連線
    if (wsRef.current) {
      wsRef.current.close()
    }

    // 建立 WebSocket 連線
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}/api/v1/projects/${projectId}/progress`
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log('WebSocket 連線成功')
      setIsConnected(true)

      // 啟動心跳檢測
      heartbeatTimerRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }))
        }
      }, heartbeatInterval)
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)

        // 處理 pong 訊息 (心跳回應)
        if (message.type === 'pong') {
          console.log('Received heartbeat pong')
          return
        }

        onMessage(message)
      } catch (error) {
        console.error('WebSocket 訊息解析錯誤:', error)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket 錯誤:', error)
      setIsConnected(false)
      onError?.(error)
    }

    ws.onclose = () => {
      console.log('WebSocket 連線關閉')
      setIsConnected(false)

      // 清除心跳計時器
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current)
      }

      // 自動重連
      reconnectTimerRef.current = setTimeout(() => {
        console.log('嘗試重新連線...')
        onReconnect?.()
        connect()
      }, reconnectInterval)
    }

    wsRef.current = ws
  }, [projectId, onMessage, onError, onReconnect, reconnectInterval, heartbeatInterval])

  // 手動重連
  const reconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
    }
    connect()
  }, [connect])

  // 發送訊息
  const send = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket 未連線，無法發送訊息')
    }
  }, [])

  // 初始化連線
  useEffect(() => {
    connect()

    // 清理函數
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
      }
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current)
      }
    }
  }, [connect])

  return {
    isConnected,
    reconnect,
    send
  }
}
```

---

#### 3. 階段進度元件: `frontend/src/components/feature/StageProgress/StageProgress.tsx`

**職責:** 顯示 5 個生成階段的進度

```tsx
// frontend/src/components/feature/StageProgress/StageProgress.tsx
import React from 'react'
import { cn } from '@/utils/cn'
import { ProgressBar } from '@/components/ui/ProgressBar'

interface SubTask {
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  progress: number
  total?: number
}

interface Stage {
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  progress: number
  subtasks?: {
    audio?: SubTask
    images?: SubTask
    avatar?: SubTask
  }
}

interface StageProgressProps {
  stages: {
    script: Stage
    assets: Stage
    render: Stage
    thumbnail: Stage
    upload: Stage
  }
  currentStage: string
}

const stageLabels = {
  script: '腳本生成',
  assets: '素材生成',
  render: '影片渲染',
  thumbnail: '封面生成',
  upload: 'YouTube 上傳'
}

const stageIcons = {
  pending: '⏸️',
  in_progress: '⏳',
  completed: '✓',
  failed: '✗'
}

const stageIconColors = {
  pending: 'text-gray-400',
  in_progress: 'text-blue-500',
  completed: 'text-green-500',
  failed: 'text-red-500'
}

export const StageProgress: React.FC<StageProgressProps> = ({
  stages,
  currentStage
}) => {
  const renderSubtasks = (subtasks: Stage['subtasks']) => {
    if (!subtasks) return null

    return (
      <div className="ml-8 mt-2 space-y-1 text-sm">
        {subtasks.audio && (
          <div className="flex items-center">
            <span className={cn('mr-2', stageIconColors[subtasks.audio.status])}>
              {stageIcons[subtasks.audio.status]}
            </span>
            <span>語音合成</span>
          </div>
        )}
        {subtasks.images && (
          <div className="flex items-center">
            <span className={cn('mr-2', stageIconColors[subtasks.images.status])}>
              {stageIcons[subtasks.images.status]}
            </span>
            <span>
              圖片生成 {subtasks.images.total && `(${subtasks.images.progress}/${subtasks.images.total})`}
            </span>
          </div>
        )}
        {subtasks.avatar && (
          <div className="flex items-center">
            <span className={cn('mr-2', stageIconColors[subtasks.avatar.status])}>
              {stageIcons[subtasks.avatar.status]}
            </span>
            <span>虛擬主播生成</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">生成階段</h2>

      <div className="space-y-4">
        {Object.entries(stages).map(([key, stage]) => (
          <div key={key} className="border-l-4 border-gray-200 pl-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center flex-1">
                <span
                  className={cn('text-2xl mr-3', stageIconColors[stage.status])}
                  data-testid={`stage-${key}-icon`}
                >
                  {stageIcons[stage.status]}
                </span>
                <div className="flex-1">
                  <p className="font-medium">{stageLabels[key as keyof typeof stageLabels]}</p>
                  {stage.status === 'in_progress' && (
                    <ProgressBar
                      value={stage.progress}
                      showPercentage
                      className="mt-2 max-w-xs"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* 子任務 */}
            {key === 'assets' && renderSubtasks(stage.subtasks)}
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

#### 4. 日誌查看器元件: `frontend/src/components/feature/LogViewer/LogViewer.tsx`

**職責:** 顯示即時日誌，支援自動捲動

```tsx
// frontend/src/components/feature/LogViewer/LogViewer.tsx
import React, { useEffect, useRef, useState } from 'react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/Button'

interface LogEntry {
  timestamp: string
  level: 'info' | 'warning' | 'error'
  message: string
}

interface LogViewerProps {
  logs: LogEntry[]
}

const levelColors = {
  info: 'text-gray-700',
  warning: 'text-yellow-500',
  error: 'text-red-500'
}

export const LogViewer: React.FC<LogViewerProps> = ({ logs }) => {
  const logContainerRef = useRef<HTMLDivElement>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)

  // 自動捲動到最新
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  // 監聽用戶捲動
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget
    const isAtBottom =
      Math.abs(container.scrollHeight - container.clientHeight - container.scrollTop) < 10

    setAutoScroll(isAtBottom)
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-semibold">日誌</h2>
        <div className="flex items-center gap-2">
          {!autoScroll && (
            <span className="text-sm text-yellow-600">自動捲動已暫停</span>
          )}
          <Button
            size="small"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? '收起' : '展開'}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div
          ref={logContainerRef}
          className="p-4 h-64 overflow-y-auto font-mono text-sm bg-gray-50"
          onScroll={handleScroll}
          data-testid="log-viewer"
        >
          {logs.length === 0 ? (
            <p className="text-gray-500">無日誌訊息</p>
          ) : (
            logs.map((log, index) => (
              <div
                key={index}
                className="mb-1"
                data-testid="log-entry"
              >
                <span className="text-gray-500 mr-2">
                  [{formatTime(log.timestamp)}]
                </span>
                <span className={cn('font-medium mr-2', levelColors[log.level])}>
                  [{log.level.toUpperCase()}]
                </span>
                <span className={levelColors[log.level]}>
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
```

---

#### 5. Progress Store: `frontend/src/store/progressStore.ts`

**職責:** 管理進度和日誌狀態

```typescript
// frontend/src/store/progressStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface LogEntry {
  timestamp: string
  level: 'info' | 'warning' | 'error'
  message: string
}

interface SubTask {
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  progress: number
  total?: number
}

interface Stage {
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  progress: number
  subtasks?: {
    audio?: SubTask
    images?: SubTask
    avatar?: SubTask
  }
}

interface Progress {
  overall: number
  stage: string
  message: string
  estimatedTime?: string
  stages: {
    script: Stage
    assets: Stage
    render: Stage
    thumbnail: Stage
    upload: Stage
  }
}

interface ProgressStore {
  progress: Progress
  logs: LogEntry[]
  updateProgress: (update: Partial<Progress>) => void
  addLog: (log: LogEntry) => void
  clearLogs: () => void
  reset: () => void
}

const initialProgress: Progress = {
  overall: 0,
  stage: 'script',
  message: '準備開始生成...',
  stages: {
    script: { status: 'pending', progress: 0 },
    assets: { status: 'pending', progress: 0 },
    render: { status: 'pending', progress: 0 },
    thumbnail: { status: 'pending', progress: 0 },
    upload: { status: 'pending', progress: 0 }
  }
}

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set) => ({
      progress: initialProgress,
      logs: [],

      updateProgress: (update) =>
        set((state) => ({
          progress: {
            ...state.progress,
            ...update,
            stages: {
              ...state.progress.stages,
              ...(update.stages || {})
            }
          }
        })),

      addLog: (log) =>
        set((state) => ({
          logs: [...state.logs, log]
        })),

      clearLogs: () => set({ logs: [] }),

      reset: () => set({ progress: initialProgress, logs: [] })
    }),
    {
      name: 'progress-storage',
      partialize: (state) => ({ logs: state.logs }) // 只持久化日誌
    }
  )
)
```

---

#### 6. API 方法: `frontend/src/api/projects.ts` (新增方法)

**職責:** 專案控制 API 方法

```typescript
// frontend/src/api/projects.ts (新增以下方法)

/**
 * 暫停專案生成
 */
export async function pauseGeneration(projectId: string): Promise<{ success: boolean }> {
  const response = await axiosInstance.post(`/api/v1/projects/${projectId}/pause`)
  return response.data
}

/**
 * 繼續專案生成
 */
export async function resumeGeneration(projectId: string): Promise<{ success: boolean }> {
  const response = await axiosInstance.post(`/api/v1/projects/${projectId}/resume`)
  return response.data
}

/**
 * 取消專案生成
 */
export async function cancelGeneration(projectId: string): Promise<{ success: boolean }> {
  const response = await axiosInstance.post(`/api/v1/projects/${projectId}/cancel`)
  return response.data
}

/**
 * 重試專案生成 (從失敗點繼續)
 */
export async function retryGeneration(projectId: string): Promise<{ success: boolean }> {
  const response = await axiosInstance.post(`/api/v1/projects/${projectId}/retry`)
  return response.data
}
```

---

### 資料流程

```
用戶訪問 /project/:id/progress
    ↓
ProgressPage 載入
    ↓
1. 調用 getProject(id) 取得初始狀態
    ↓
2. useWebSocket hook 建立 WebSocket 連線
   - ws://localhost:8000/api/v1/projects/:id/progress
    ↓
3. WebSocket 接收訊息
   ├─ { type: 'progress', data: { overall: 50, stage: 'assets', ... } }
   │    ↓
   │  updateProgress(data)
   │    ↓
   │  UI 更新進度條
   │
   ├─ { type: 'log', data: { level: 'info', message: '...' } }
   │    ↓
   │  addLog(data)
   │    ↓
   │  LogViewer 顯示新日誌
   │
   ├─ { type: 'stage_complete', data: { stage: 'assets' } }
   │    ↓
   │  更新階段狀態為 'completed'
   │    ↓
   │  StageProgress 顯示 ✓
   │
   └─ { type: 'error', data: { message: '...' } }
        ↓
      顯示錯誤訊息
        ↓
      提供重試按鈕
```

---

## 開發指引

### TDD 開發流程

#### 第 1 步：環境準備 (10 分鐘)
1. 確認 Task-017, 018, 019 已完成
2. 確認測試環境可運行：`npm test`
3. 閱讀 `tech-specs/frontend/pages.md#7-進度監控頁`
4. 閱讀 `tech-specs/backend/background-jobs.md`

#### 第 2 步：建立元件骨架 (30 分鐘)
1. 建立 `app/project/[id]/progress/page.tsx`
2. 建立 `components/feature/StageProgress/`
3. 建立 `components/feature/LogViewer/`
4. 建立 `hooks/useWebSocket.ts`
5. 建立測試檔案骨架

#### 第 3 步：撰寫測試 1 - 成功載入專案 (20 分鐘)
1. 撰寫「測試 1：成功載入專案並顯示進度」
2. Mock `getProject` API
3. 執行測試 → 失敗 (預期)

#### 第 4 步：實作基本頁面結構 (60 分鐘)
1. 實作 `ProgressPage` 基本架構
2. 實作 `StageProgress` 元件
3. 整合 `useProjectStore`
4. 執行測試 1 → 通過 ✅

#### 第 5 步：撰寫測試 2 - WebSocket 連線 (30 分鐘)
1. 撰寫「測試 2：WebSocket 即時進度更新」
2. Mock WebSocket
3. 執行測試 → 失敗

#### 第 6 步：實作 WebSocket Hook (90 分鐘)
1. 實作 `useWebSocket` hook
2. 處理連線、斷線、重連
3. 實作心跳檢測
4. 整合到 `ProgressPage`
5. 執行測試 2 → 通過 ✅

#### 第 7 步：撰寫測試 3 - 日誌顯示 (20 分鐘)
1. 撰寫「測試 3：日誌顯示與自動捲動」
2. Mock 日誌訊息
3. 執行測試 → 失敗

#### 第 8 步：實作 LogViewer 元件 (60 分鐘)
1. 實作 `LogViewer` 元件
2. 實作自動捲動邏輯
3. 實作展開/收起功能
4. 執行測試 3 → 通過 ✅

#### 第 9 步：撰寫測試 4 - 控制功能 (30 分鐘)
1. 撰寫「測試 4：暫停與取消功能」
2. Mock 控制 API
3. 執行測試 → 失敗

#### 第 10 步：實作控制功能 (60 分鐘)
1. 實作暫停/繼續邏輯
2. 實作取消確認 Modal
3. 新增 API 方法 (`pauseGeneration`, `cancelGeneration`, `retryGeneration`)
4. 執行測試 4 → 通過 ✅

#### 第 11 步：撰寫測試 5 - 錯誤處理 (20 分鐘)
1. 撰寫「測試 5：錯誤處理」
2. Mock 失敗狀態
3. 執行測試 → 失敗

#### 第 12 步：實作錯誤處理 (45 分鐘)
1. 實作錯誤訊息顯示
2. 實作重試功能
3. 處理失敗狀態 UI
4. 執行測試 5 → 通過 ✅

#### 第 13 步：撰寫測試 6 & 7 - WebSocket 進階測試 (40 分鐘)
1. 撰寫「測試 6：WebSocket 重連後訊息恢復」
2. 撰寫「測試 7：訊息順序測試」
3. 執行測試 → 失敗

#### 第 14 步：實作 WebSocket 進階功能 (40 分鐘)
1. 實作重連後訊息恢復機制
2. 實作訊息序號排序邏輯
3. 執行測試 6, 7 → 通過 ✅

#### 第 15 步：整合測試 (60 分鐘)
1. 撰寫「測試 8：完整生成流程」
2. 模擬完整流程（從開始到完成）
3. 執行測試 → 通過 ✅

#### 第 16 步：響應式設計 (60 分鐘)
1. 添加響應式樣式 (桌面/平板/手機)
2. 測試不同螢幕尺寸
3. 調整佈局和字體大小

#### 第 17 步：E2E 測試 (可選，60 分鐘)
1. 撰寫 Playwright 測試
2. 測試真實 WebSocket 連線
3. 驗證自動重連

#### 第 18 步：優化與重構 (30 分鐘)
1. 檢查程式碼重複
2. 提取共用邏輯
3. 優化 WebSocket 效能
4. 再次執行所有測試

#### 第 19 步：檢查與文檔 (20 分鐘)
1. 檢查測試覆蓋率：`npm run test:coverage`
2. 執行 linter：`npm run lint`
3. 格式化程式碼：`npm run format`
4. 更新元件文檔

---

### 注意事項

#### WebSocket 連線
- ⚠️ **必須處理斷線重連**：網路不穩定時自動重連
- ⚠️ **心跳檢測**：每 30 秒發送 ping，避免連線被關閉
- ⚠️ **訊息處理**：確保訊息按順序處理，避免狀態錯亂
- ⚠️ **清理資源**：元件卸載時關閉 WebSocket

#### 效能
- 💡 日誌訊息過多時考慮虛擬化 (react-window)
- 💡 進度更新頻率控制 (防抖 100ms)
- 💡 自動捲動僅在可見時執行

#### 使用者體驗
- ✅ 進度更新要平滑 (使用 CSS transition)
- ✅ 錯誤訊息要清楚且可操作
- ✅ 提供明確的失敗原因和解決方案
- ✅ 日誌時間戳使用本地時區

#### 與後端整合
- 🔗 WebSocket 端點：`ws://localhost:8000/api/v1/projects/:id/progress`
- 🔗 訊息格式必須與後端 Task-016 一致
- 🔗 控制 API (`pause`, `cancel`, `retry`) 必須與後端 Task-004 一致

---

### 完成檢查清單

#### 功能完整性
- [ ] 頁面可正確載入並顯示初始進度
- [ ] WebSocket 連線成功並即時更新
- [ ] 5 個階段進度正確顯示
- [ ] 子任務進度 (圖片 15/15) 正確顯示
- [ ] 日誌區正確顯示所有訊息
- [ ] 自動捲動正常運作
- [ ] 暫停/繼續功能正常
- [ ] 取消功能正常 (含確認 Modal)
- [ ] 重試功能正常
- [ ] 錯誤訊息正確顯示
- [ ] 完成狀態正確處理

#### WebSocket 功能
- [ ] 連線建立成功
- [ ] 接收訊息並更新 UI
- [ ] 斷線自動重連
- [ ] 心跳檢測正常
- [ ] 元件卸載時關閉連線

#### 測試
- [ ] 所有單元測試通過 (7 個測試)
- [ ] 後端整合測試通過 (2 個測試: Celery-WebSocket)
- [ ] 前端整合測試通過 (1 個測試: 完整生成流程)
- [ ] E2E 測試通過 (可選，1 個測試)
- [ ] 測試覆蓋率 > 85%

#### 程式碼品質
- [ ] ESLint check 無錯誤：`npm run lint`
- [ ] 程式碼已格式化：`npm run format`
- [ ] TypeScript 類型檢查通過：`npm run type-check`
- [ ] 無 console.log 或除錯程式碼

#### UI/UX
- [ ] 響應式設計完成 (桌面/平板/手機)
- [ ] 所有互動都有視覺回饋
- [ ] Loading 狀態正確顯示
- [ ] 錯誤訊息清楚易懂
- [ ] 按鈕狀態正確 (禁用、載入中)

#### 文檔
- [ ] 元件都有 TypeScript 類型定義
- [ ] 複雜邏輯有註解說明
- [ ] README 已更新 (如需要)

---

## 預估時間分配

- 閱讀與準備：10 分鐘
- 建立骨架：30 分鐘
- 撰寫測試 1-5：120 分鐘
- 實作頁面：60 分鐘
- 實作 WebSocket 基礎：90 分鐘
- 實作 LogViewer：60 分鐘
- 實作控制功能：60 分鐘
- 實作錯誤處理：45 分鐘
- 撰寫測試 6-7 (WebSocket 進階)：40 分鐘
- 實作 WebSocket 進階功能：40 分鐘
- 後端整合測試 (測試 8-9: Celery-WebSocket)：45 分鐘
- 前端整合測試 (測試 10: 完整生成流程)：60 分鐘
- 響應式設計：60 分鐘
- E2E 測試 (測試 11, 可選)：60 分鐘
- 優化與重構：30 分鐘
- 檢查與文檔：20 分鐘

**總計：約 13.8 小時** (含 E2E) 或 **約 12.8 小時** (不含 E2E)

(預留 0.2 小時 buffer = 14 小時)

---

## 參考資源

### React 官方文檔
- [useEffect](https://react.dev/reference/react/useEffect)
- [useRef](https://react.dev/reference/react/useRef)
- [Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)

### WebSocket 相關
- [MDN WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [WebSocket 重連策略](https://javascript.info/websocket)

### 測試相關
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Vitest](https://vitest.dev/)
- [Playwright](https://playwright.dev/)

### 專案內部文件
- `tech-specs/frontend/pages.md#7-進度監控頁`
- `tech-specs/frontend/component-architecture.md`
- `tech-specs/frontend/state-management.md`
- `tech-specs/backend/background-jobs.md`
- `product-design/flows.md#Flow-1`

---

**準備好了嗎？** 開始使用 TDD 方式實作這個關鍵的進度監控頁面！🚀
