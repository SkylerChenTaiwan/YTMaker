# Task-028: 批次處理頁面

> **建立日期:** 2025-10-19
> **狀態:** ⏳ 未開始
> **預計時間:** 10 小時
> **優先級:** P1 (重要)

---

## 關聯文件

### 產品設計
- **頁面設計:** `product-design/pages.md#Page-12-批次處理頁 (Batch Processing)` (第 1812-1931 行)
- **使用者流程:** `product-design/flows.md#Flow-5-批次處理多個影片` (第 226-263 行)

### 技術規格
- **前端頁面:** `tech-specs/frontend/pages.md#12-批次處理頁 (Batch)` (第 643-651 行)
- **API 規格:** `tech-specs/backend/api-batch.md` (完整文件)
  - POST /api/v1/batch (建立批次任務)
  - GET /api/v1/batch (取得批次列表)
  - GET /api/v1/batch/:id (取得批次詳情)
  - POST /api/v1/batch/:id/pause (暫停批次)
  - POST /api/v1/batch/:id/resume (繼續批次)
- **狀態管理:** `tech-specs/frontend/state-management.md#全域狀態結構` (第 71-76 行 - batch 狀態)
- **API 整合:** `tech-specs/frontend/api-integration.md` (batchApi 方法)

### 相關任務
- **前置任務:**
  - Task-009 ✅ (Batch API 實作)
  - Task-019 ✅ (API 整合層)
  - Task-018 ✅ (Zustand Stores)
  - Task-017 ✅ (前端路由系統)
- **後續任務:** Task-029 (E2E 測試)
- **可並行:** Task-027 (配置與模板管理頁面)

---

## 任務目標

### 簡述
實作批次處理頁面 (`/batch`) 和批次詳情頁面 (`/batch/:id`)，支援批次任務的建立、監控、控制（暫停/繼續/重試）功能，整合 Batch API 和 Zustand store，提供直觀的批次處理使用者介面。

### 成功標準
- [ ] `/batch` 頁面完成，包含批次任務列表和新增功能
- [ ] `/batch/:id` 詳情頁完成，顯示批次內專案和進度
- [ ] 批次任務建立 Modal 完成，支援多檔案上傳和模板選擇
- [ ] 批次控制功能完成（暫停/繼續/取消/重試）
- [ ] 批次進度即時更新（使用 WebSocket 或輪詢）
- [ ] 響應式設計完成（桌面/平板/手機）
- [ ] 單元測試完成（元件測試、狀態管理測試）
- [ ] 整合測試完成（API 整合、批次流程測試）
- [ ] 所有錯誤情況處理完整（API 失敗、驗證失敗、空狀態）

---

## 測試要求

### 單元測試

#### 測試 1：批次列表正確載入

**目的：** 驗證批次任務列表可正確從 API 載入並顯示

**前置條件：**
- Mock API 回傳批次任務列表資料

**模擬資料：**
```typescript
// Mock API Response
const mockBatchList = {
  success: true,
  data: {
    batches: [
      {
        id: "batch-001",
        name: "週一影片批次",
        total_projects: 10,
        completed_projects: 7,
        failed_projects: 1,
        status: "RUNNING",
        created_at: "2025-10-19T10:30:00Z"
      },
      {
        id: "batch-002",
        name: "產品介紹系列",
        total_projects: 5,
        completed_projects: 5,
        failed_projects: 0,
        status: "COMPLETED",
        created_at: "2025-10-18T14:00:00Z"
      }
    ]
  }
}
```

**測試步驟：**
1. 渲染 BatchPage 元件
2. Mock batchApi.getBatches() 回傳上述資料
3. 等待資料載入

**預期結果：**
```typescript
// 檢查點
- 頁面顯示「批次處理」標題
- 表格顯示 2 個批次任務
- 第一個任務：
  - 名稱：「週一影片批次」
  - 包含專案數：10
  - 狀態：「執行中」標籤（黃色）
  - 成功/失敗數：「7 / 1」
  - 操作按鈕：「查看」、「暫停」
- 第二個任務：
  - 名稱：「產品介紹系列」
  - 狀態：「已完成」標籤（綠色）
  - 成功/失敗數：「5 / 0」
  - 操作按鈕：「查看」、「刪除」
```

**驗證點：**
- [ ] API 被正確呼叫（GET /api/v1/batch）
- [ ] 載入中顯示骨架屏
- [ ] 表格顯示所有批次任務
- [ ] 狀態標籤顏色正確（RUNNING=黃色、COMPLETED=綠色）
- [ ] 統計資訊正確（成功/失敗數）
- [ ] 操作按鈕根據狀態正確顯示

---

#### 測試 2：新增批次任務 Modal 驗證

**目的：** 驗證新增批次任務表單驗證功能

**測試步驟：**
1. 點擊「新增批次任務」按鈕
2. Modal 開啟
3. 不填寫任何欄位，直接點擊「開始批次處理」

**預期輸出：**
```typescript
// 驗證錯誤訊息
{
  name: "任務名稱為必填",
  files: "至少需上傳一個文字檔案",
  configuration: "請選擇視覺配置模板",
  prompt_template: "請選擇 Prompt 範本",
  gemini_model: "請選擇 Gemini 模型"
}
```

**測試步驟 2：填寫正確資料**
1. 任務名稱：「測試批次任務」
2. 上傳 3 個 .txt 檔案
3. 選擇視覺配置模板：「預設模板」
4. 選擇 Prompt 範本：「教學影片範本」
5. 選擇模型：「gemini-1.5-flash」
6. YouTube 隱私設定：「私人」
7. 點擊「開始批次處理」

**預期輸出：**
```typescript
// API 請求 Body
{
  name: "測試批次任務",
  projects: [
    { name: "file1.txt", content: "文字內容 1..." },
    { name: "file2.txt", content: "文字內容 2..." },
    { name: "file3.txt", content: "文字內容 3..." }
  ],
  configuration_id: "config-uuid",
  prompt_template_id: "template-uuid",
  gemini_model: "gemini-1.5-flash",
  youtube_settings: {
    privacy: "private",
    publish_type: "immediate"
  }
}

// API 回應
{
  success: true,
  data: {
    batch_id: "batch-003",
    total_projects: 3,
    status: "QUEUED"
  }
}
```

**驗證點：**
- [ ] Modal 正確開啟與關閉
- [ ] 表單驗證正確（必填欄位、檔案格式）
- [ ] 檔案上傳功能正常（多檔案選擇）
- [ ] 檔案內容正確讀取（.txt 檔案）
- [ ] API 請求資料正確格式化
- [ ] 建立成功後跳轉到批次詳情頁
- [ ] Toast 訊息顯示「批次任務已建立」

---

#### 測試 3：批次詳情頁載入與顯示

**目的：** 驗證批次詳情頁正確顯示批次內專案和進度

**前置條件：**
- 批次 ID: "batch-001"
- Mock API 回傳批次詳情資料

**模擬資料：**
```typescript
// GET /api/v1/batch/batch-001
const mockBatchDetail = {
  success: true,
  data: {
    id: "batch-001",
    name: "週一影片批次",
    total_projects: 10,
    completed_projects: 7,
    failed_projects: 1,
    status: "RUNNING",
    projects: [
      {
        id: "project-001",
        name: "影片 1",
        status: "COMPLETED",
        progress: 100,
        youtube_url: "https://youtube.com/watch?v=abc123"
      },
      {
        id: "project-002",
        name: "影片 2",
        status: "RUNNING",
        progress: 65,
        current_stage: "RENDER_VIDEO"
      },
      {
        id: "project-003",
        name: "影片 3",
        status: "FAILED",
        progress: 30,
        error_message: "Gemini API 配額不足"
      },
      {
        id: "project-004",
        name: "影片 4",
        status: "QUEUED",
        progress: 0
      }
      // ... 其他 6 個專案
    ]
  }
}
```

**預期顯示：**
```
批次任務詳情
────────────────────────────────
任務名稱：週一影片批次
總進度：7 / 10 完成 (1 失敗)

[==============================70%=======>         ]

操作按鈕：[暫停批次] [重試失敗任務] [下載報告] [返回]

專案列表：
┌────────┬────────┬──────┬──────────┬────────────────────┐
│ 專案名  │ 狀態    │ 進度  │ YouTube  │ 錯誤訊息            │
├────────┼────────┼──────┼──────────┼────────────────────┤
│ 影片 1  │ ✓ 完成  │ 100% │ [查看]   │ -                  │
│ 影片 2  │ ⏳ 進行中│  65% │ -        │ -                  │
│ 影片 3  │ ✗ 失敗  │  30% │ -        │ Gemini API 配額不足│
│ 影片 4  │ ⏸ 排隊  │   0% │ -        │ -                  │
│ ...    │ ...    │ ...  │ ...      │ ...                │
└────────┴────────┴──────┴──────────┴────────────────────┘
```

**驗證點：**
- [ ] 批次基本資訊正確顯示
- [ ] 總進度條正確計算（70% = 7/10）
- [ ] 專案列表顯示所有 10 個專案
- [ ] 專案狀態標籤正確（完成=綠色、進行中=黃色、失敗=紅色、排隊=灰色）
- [ ] YouTube 連結正確顯示（僅 COMPLETED 專案）
- [ ] 錯誤訊息正確顯示（僅 FAILED 專案）
- [ ] 控制按鈕根據狀態顯示（RUNNING 顯示暫停，PAUSED 顯示繼續）

---

#### 測試 4：批次暫停與繼續功能

**目的：** 驗證批次任務暫停和繼續控制功能

**前置條件：**
- 在批次詳情頁（batch-001）
- 批次狀態：RUNNING

**測試步驟 1：暫停批次**
1. 點擊「暫停批次」按鈕
2. 顯示確認 Modal：「確定要暫停此批次任務嗎？」
3. 點擊「確定」

**預期行為：**
```typescript
// API 請求
POST /api/v1/batch/batch-001/pause

// API 回應
{
  success: true,
  data: {
    status: "PAUSED"
  }
}

// UI 更新
- 批次狀態變更為「已暫停」（橙色標籤）
- 「暫停批次」按鈕變更為「繼續批次」
- Toast 訊息：「批次任務已暫停」
- 進行中的專案保持當前進度
```

**測試步驟 2：繼續批次**
1. 點擊「繼續批次」按鈕
2. 顯示確認 Modal：「確定要繼續執行此批次任務嗎？」
3. 點擊「確定」

**預期行為：**
```typescript
// API 請求
POST /api/v1/batch/batch-001/resume

// API 回應
{
  success: true,
  data: {
    status: "RUNNING"
  }
}

// UI 更新
- 批次狀態變更為「執行中」（黃色標籤）
- 「繼續批次」按鈕變更為「暫停批次」
- Toast 訊息：「批次任務已繼續」
- 專案開始繼續生成
```

**驗證點：**
- [ ] 暫停 API 正確呼叫
- [ ] 繼續 API 正確呼叫
- [ ] 確認 Modal 正確顯示
- [ ] 批次狀態正確更新（UI + Store）
- [ ] 按鈕文字和可用性正確變更
- [ ] Toast 訊息正確顯示
- [ ] 錯誤處理（API 失敗時顯示錯誤訊息）

---

#### 測試 5：重試失敗任務功能

**目的：** 驗證批次中失敗專案的重試功能

**前置條件：**
- 批次中有 2 個失敗專案

**測試步驟：**
1. 點擊「重試失敗任務」按鈕
2. 顯示確認 Modal：「確定要重試 2 個失敗的專案嗎？」
3. 點擊「確定」

**預期行為：**
```typescript
// API 請求
POST /api/v1/batch/batch-001/retry-failed

// API 回應
{
  success: true,
  data: {
    retrying_projects: ["project-003", "project-008"],
    count: 2
  }
}

// UI 更新
- Toast 訊息：「正在重試 2 個失敗的專案」
- 失敗專案狀態變更為「排隊」
- 進度重置為 0%
- 錯誤訊息清除
- 「重試失敗任務」按鈕暫時禁用（直到有新失敗）
```

**驗證點：**
- [ ] 重試 API 正確呼叫
- [ ] 正確識別失敗專案數量
- [ ] 確認 Modal 顯示正確數量
- [ ] 專案狀態正確重置
- [ ] Toast 訊息顯示重試數量
- [ ] 按鈕狀態正確更新

---

### 整合測試

#### 測試 6：完整批次建立與監控流程

**目的：** 驗證從建立批次到監控完成的完整流程

**測試流程：**
```typescript
// Step 1: 建立批次任務
1. 進入 /batch 頁面
2. 點擊「新增批次任務」
3. 填寫表單並上傳 3 個檔案
4. 提交表單

// Step 2: 跳轉到詳情頁
5. 自動跳轉到 /batch/:id
6. 顯示批次資訊（3 個專案，狀態 QUEUED）

// Step 3: 監控進度（模擬 WebSocket 更新）
7. 第一個專案狀態變更：QUEUED → RUNNING
8. 第一個專案進度更新：0% → 25% → 50% → 75% → 100%
9. 第一個專案狀態變更：RUNNING → COMPLETED
10. 顯示 YouTube 連結
11. 重複步驟 7-10 for 第二、第三個專案

// Step 4: 批次完成
12. 批次狀態變更為 COMPLETED
13. 總進度 100%
14. 顯示完成訊息
```

**驗證點：**
- [ ] 建立流程完整無誤
- [ ] 頁面跳轉正確
- [ ] 進度即時更新（WebSocket 或輪詢）
- [ ] 專案狀態轉換正確
- [ ] YouTube 連結正確顯示
- [ ] 批次完成狀態正確
- [ ] 整個流程無錯誤

---

#### 測試 7：空狀態與錯誤處理

**目的：** 驗證空狀態和錯誤情況的正確處理

**測試情境 1：空批次列表**
```typescript
// Mock API 回傳空陣列
const mockEmptyList = {
  success: true,
  data: {
    batches: []
  }
}

// 預期顯示
- 圖示：空資料夾
- 文字：「還沒有任何批次任務」
- 按鈕：「新增第一個批次任務」
```

**測試情境 2：API 失敗**
```typescript
// Mock API 失敗
batchApi.getBatches.mockRejectedValue(new Error("網路錯誤"))

// 預期顯示
- 錯誤訊息：「載入批次任務失敗：網路錯誤」
- 重試按鈕
```

**測試情境 3：批次不存在**
```typescript
// 訪問不存在的批次
GET /api/v1/batch/non-existent-id

// API 回應
{
  success: false,
  error: {
    code: "BATCH_NOT_FOUND",
    message: "批次任務不存在"
  }
}

// 預期顯示
- 404 錯誤頁面
- 訊息：「找不到此批次任務」
- 「返回批次列表」按鈕
```

**驗證點：**
- [ ] 空狀態正確顯示
- [ ] API 錯誤正確處理並顯示
- [ ] 404 錯誤正確處理
- [ ] 錯誤訊息清楚易懂
- [ ] 提供恢復操作（重試、返回等）

---

## 實作規格

### 需要建立/修改的檔案

#### 1. 批次列表頁面：`frontend/src/app/batch/page.tsx`

**職責：** 批次任務列表頁面，顯示所有批次任務

**主要元件結構：**
```typescript
// frontend/src/app/batch/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Modal, message } from 'antd'
import { PlusOutlined, UploadOutlined } from '@ant-design/icons'
import { useBatchStore } from '@/store/batchStore'
import { batchApi } from '@/lib/api'
import CreateBatchModal from '@/components/batch/CreateBatchModal'
import BatchStatusTag from '@/components/batch/BatchStatusTag'

export default function BatchPage() {
  const { batches, loading, error, setBatches, setLoading, setError } = useBatchStore()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  useEffect(() => {
    loadBatches()
  }, [])

  const loadBatches = async () => {
    setLoading(true)
    try {
      const response = await batchApi.getBatches()
      setBatches(response.data.batches)
    } catch (err) {
      setError(err.message)
      message.error('載入批次任務失敗')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteBatch = async (batchId: string) => {
    Modal.confirm({
      title: '確定要刪除此批次任務嗎？',
      content: '此操作無法復原，批次內的專案也會被刪除。',
      okText: '確定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await batchApi.deleteBatch(batchId)
          message.success('批次任務已刪除')
          loadBatches()
        } catch (err) {
          message.error('刪除失敗')
        }
      }
    })
  }

  const columns = [
    {
      title: '任務名稱',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '包含專案數',
      dataIndex: 'total_projects',
      key: 'total_projects',
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <BatchStatusTag status={status} />
    },
    {
      title: '成功 / 失敗',
      key: 'stats',
      render: (_, record) => (
        <span>
          <span className="text-green-600">{record.completed_projects}</span>
          {' / '}
          <span className="text-red-600">{record.failed_projects}</span>
        </span>
      )
    },
    {
      title: '創建時間',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString('zh-TW')
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <div className="space-x-2">
          <Button type="link" href={`/batch/${record.id}`}>
            查看
          </Button>
          {record.status === 'RUNNING' && (
            <Button type="link" onClick={() => handlePauseBatch(record.id)}>
              暫停
            </Button>
          )}
          {record.status === 'PAUSED' && (
            <Button type="link" onClick={() => handleResumeBatch(record.id)}>
              繼續
            </Button>
          )}
          <Button
            type="link"
            danger
            onClick={() => handleDeleteBatch(record.id)}
          >
            刪除
          </Button>
        </div>
      )
    }
  ]

  // 空狀態
  if (!loading && batches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <FolderOpenOutlined className="text-6xl text-gray-400 mb-4" />
        <p className="text-gray-500 mb-4">還沒有任何批次任務</p>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsCreateModalOpen(true)}
        >
          新增第一個批次任務
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* 麵包屑 */}
      <Breadcrumb className="mb-4">
        <Breadcrumb.Item href="/">主控台</Breadcrumb.Item>
        <Breadcrumb.Item>批次處理</Breadcrumb.Item>
      </Breadcrumb>

      {/* 頁面標題與操作 */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">批次處理</h1>
        <div className="space-x-2">
          <Button icon={<UploadOutlined />}>
            上傳批次配置檔案
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            新增批次任務
          </Button>
        </div>
      </div>

      {/* 批次任務表格 */}
      <Table
        columns={columns}
        dataSource={batches}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 個批次任務`
        }}
      />

      {/* 新增批次任務 Modal */}
      <CreateBatchModal
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false)
          loadBatches()
        }}
      />
    </div>
  )
}
```

---

#### 2. 批次詳情頁面：`frontend/src/app/batch/[id]/page.tsx`

**職責：** 顯示單一批次任務的詳細資訊和專案列表

**主要元件結構：**
```typescript
// frontend/src/app/batch/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Table, Button, Progress, Modal, message, Tag } from 'antd'
import {
  PauseCircleOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  DownloadOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons'
import { batchApi } from '@/lib/api'
import { BatchTask, Project } from '@/types'
import ProjectStatusTag from '@/components/batch/ProjectStatusTag'

export default function BatchDetailPage() {
  const params = useParams()
  const router = useRouter()
  const batchId = params.id as string

  const [batch, setBatch] = useState<BatchTask | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadBatchDetail()
    // 設定輪詢或 WebSocket 來更新進度
    const interval = setInterval(loadBatchDetail, 3000)
    return () => clearInterval(interval)
  }, [batchId])

  const loadBatchDetail = async () => {
    try {
      const response = await batchApi.getBatchDetail(batchId)
      setBatch(response.data)
      setError(null)
    } catch (err) {
      setError(err.message)
      if (err.response?.status === 404) {
        message.error('找不到此批次任務')
      }
    } finally {
      setLoading(false)
    }
  }

  const handlePause = async () => {
    Modal.confirm({
      title: '確定要暫停此批次任務嗎？',
      content: '進行中的專案會暫停，可稍後繼續執行。',
      okText: '確定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await batchApi.pauseBatch(batchId)
          message.success('批次任務已暫停')
          loadBatchDetail()
        } catch (err) {
          message.error('暫停失敗')
        }
      }
    })
  }

  const handleResume = async () => {
    Modal.confirm({
      title: '確定要繼續執行此批次任務嗎？',
      okText: '確定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await batchApi.resumeBatch(batchId)
          message.success('批次任務已繼續')
          loadBatchDetail()
        } catch (err) {
          message.error('繼續失敗')
        }
      }
    })
  }

  const handleRetryFailed = async () => {
    const failedCount = batch?.projects.filter(p => p.status === 'FAILED').length || 0

    Modal.confirm({
      title: `確定要重試 ${failedCount} 個失敗的專案嗎？`,
      okText: '確定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await batchApi.retryFailedProjects(batchId)
          message.success(`正在重試 ${failedCount} 個失敗的專案`)
          loadBatchDetail()
        } catch (err) {
          message.error('重試失敗')
        }
      }
    })
  }

  const handleDownloadReport = async () => {
    try {
      const blob = await batchApi.downloadReport(batchId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `batch-${batchId}-report.csv`
      a.click()
      message.success('報告下載成功')
    } catch (err) {
      message.error('下載報告失敗')
    }
  }

  if (loading) {
    return <div>載入中...</div>
  }

  if (error || !batch) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <h2 className="text-xl mb-4">找不到此批次任務</h2>
        <Button onClick={() => router.push('/batch')}>
          返回批次列表
        </Button>
      </div>
    )
  }

  const completionPercentage = Math.round(
    (batch.completed_projects / batch.total_projects) * 100
  )

  const projectColumns = [
    {
      title: '專案名稱',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <ProjectStatusTag status={status} />
    },
    {
      title: '進度',
      dataIndex: 'progress',
      key: 'progress',
      render: (progress: number) => (
        <Progress percent={progress} size="small" />
      )
    },
    {
      title: 'YouTube',
      dataIndex: 'youtube_url',
      key: 'youtube_url',
      render: (url: string) =>
        url ? (
          <a href={url} target="_blank" rel="noopener noreferrer">
            查看影片
          </a>
        ) : '-'
    },
    {
      title: '錯誤訊息',
      dataIndex: 'error_message',
      key: 'error_message',
      render: (msg: string) => msg || '-'
    }
  ]

  return (
    <div className="p-6">
      {/* 麵包屑 */}
      <Breadcrumb className="mb-4">
        <Breadcrumb.Item href="/">主控台</Breadcrumb.Item>
        <Breadcrumb.Item href="/batch">批次處理</Breadcrumb.Item>
        <Breadcrumb.Item>{batch.name}</Breadcrumb.Item>
      </Breadcrumb>

      {/* 批次資訊卡片 */}
      <Card className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold mb-2">{batch.name}</h1>
            <div className="flex items-center space-x-4">
              <BatchStatusTag status={batch.status} />
              <span>
                總進度：
                <span className="font-semibold text-green-600">
                  {batch.completed_projects}
                </span>
                {' / '}
                {batch.total_projects}
                {batch.failed_projects > 0 && (
                  <span className="text-red-600">
                    {' '}({batch.failed_projects} 失敗)
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* 操作按鈕 */}
          <div className="space-x-2">
            {batch.status === 'RUNNING' && (
              <Button
                icon={<PauseCircleOutlined />}
                onClick={handlePause}
              >
                暫停批次
              </Button>
            )}
            {batch.status === 'PAUSED' && (
              <Button
                icon={<PlayCircleOutlined />}
                type="primary"
                onClick={handleResume}
              >
                繼續批次
              </Button>
            )}
            {batch.failed_projects > 0 && (
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRetryFailed}
              >
                重試失敗任務
              </Button>
            )}
            <Button
              icon={<DownloadOutlined />}
              onClick={handleDownloadReport}
            >
              下載報告
            </Button>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => router.push('/batch')}
            >
              返回
            </Button>
          </div>
        </div>

        {/* 總進度條 */}
        <Progress
          percent={completionPercentage}
          className="mt-4"
          status={batch.status === 'FAILED' ? 'exception' : 'active'}
        />
      </Card>

      {/* 專案列表 */}
      <Card title="專案列表">
        <Table
          columns={projectColumns}
          dataSource={batch.projects}
          rowKey="id"
          pagination={false}
        />
      </Card>
    </div>
  )
}
```

---

#### 3. 新增批次任務 Modal：`frontend/src/components/batch/CreateBatchModal.tsx`

**職責：** 批次任務建立表單

**主要功能：**
```typescript
// frontend/src/components/batch/CreateBatchModal.tsx
'use client'

import { useState } from 'react'
import { Modal, Form, Input, Upload, Select, Radio, message } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import { batchApi } from '@/lib/api'
import { useConfigStore } from '@/store/configStore'
import { useRouter } from 'next/navigation'

interface CreateBatchModalProps {
  open: boolean
  onCancel: () => void
  onSuccess: () => void
}

export default function CreateBatchModal({
  open,
  onCancel,
  onSuccess
}: CreateBatchModalProps) {
  const [form] = Form.useForm()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [fileList, setFileList] = useState([])
  const { configurations, promptTemplates } = useConfigStore()

  const handleSubmit = async (values: any) => {
    setLoading(true)
    try {
      // 讀取所有文字檔案內容
      const projects = await Promise.all(
        fileList.map(async (file) => {
          const content = await file.originFileObj.text()
          return {
            name: file.name.replace('.txt', ''),
            content: content
          }
        })
      )

      // 建立批次任務
      const response = await batchApi.createBatch({
        name: values.name,
        projects: projects,
        configuration_id: values.configuration_id,
        prompt_template_id: values.prompt_template_id,
        gemini_model: values.gemini_model,
        youtube_settings: {
          privacy: values.privacy,
          publish_type: values.publish_type,
          scheduled_at: values.scheduled_at
        }
      })

      message.success('批次任務已建立')
      form.resetFields()
      setFileList([])
      onSuccess()

      // 跳轉到批次詳情頁
      router.push(`/batch/${response.data.batch_id}`)
    } catch (err) {
      message.error('建立批次任務失敗：' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const uploadProps = {
    multiple: true,
    accept: '.txt',
    beforeUpload: (file) => {
      // 驗證檔案類型
      if (!file.name.endsWith('.txt')) {
        message.error('只能上傳 .txt 文字檔案')
        return false
      }
      // 驗證檔案大小（最大 1MB）
      if (file.size > 1024 * 1024) {
        message.error('檔案大小不能超過 1MB')
        return false
      }
      return false // 阻止自動上傳，我們手動處理
    },
    onChange: ({ fileList: newFileList }) => {
      setFileList(newFileList)
    },
    fileList: fileList
  }

  return (
    <Modal
      title="新增批次任務"
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText="開始批次處理"
      cancelText="取消"
      confirmLoading={loading}
      width={700}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        {/* 任務名稱 */}
        <Form.Item
          name="name"
          label="任務名稱"
          rules={[{ required: true, message: '請輸入任務名稱' }]}
        >
          <Input placeholder="例如：週一影片批次" />
        </Form.Item>

        {/* 文字檔案上傳 */}
        <Form.Item
          label="文字內容檔案"
          required
          validateStatus={fileList.length === 0 ? 'error' : 'success'}
          help={
            fileList.length === 0
              ? '至少需上傳一個文字檔案'
              : `已選擇 ${fileList.length} 個檔案`
          }
        >
          <Upload.Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">
              點擊或拖曳檔案到此區域上傳
            </p>
            <p className="ant-upload-hint">
              支援多檔案上傳，僅接受 .txt 文字檔案
            </p>
          </Upload.Dragger>
        </Form.Item>

        {/* 視覺配置模板 */}
        <Form.Item
          name="configuration_id"
          label="視覺配置模板"
          rules={[{ required: true, message: '請選擇視覺配置模板' }]}
        >
          <Select placeholder="選擇模板">
            {configurations.map(config => (
              <Select.Option key={config.id} value={config.id}>
                {config.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {/* Prompt 範本 */}
        <Form.Item
          name="prompt_template_id"
          label="Prompt 範本"
          rules={[{ required: true, message: '請選擇 Prompt 範本' }]}
        >
          <Select placeholder="選擇範本">
            {promptTemplates.map(template => (
              <Select.Option key={template.id} value={template.id}>
                {template.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {/* Gemini 模型 */}
        <Form.Item
          name="gemini_model"
          label="Gemini 模型"
          rules={[{ required: true, message: '請選擇 Gemini 模型' }]}
          initialValue="gemini-1.5-flash"
        >
          <Select>
            <Select.Option value="gemini-1.5-pro">
              Gemini 1.5 Pro（高品質，較慢）
            </Select.Option>
            <Select.Option value="gemini-1.5-flash">
              Gemini 1.5 Flash（快速，推薦批次使用）
            </Select.Option>
          </Select>
        </Form.Item>

        {/* YouTube 設定 */}
        <Form.Item
          name="privacy"
          label="隱私設定"
          rules={[{ required: true }]}
          initialValue="private"
        >
          <Radio.Group>
            <Radio value="public">公開</Radio>
            <Radio value="unlisted">不公開</Radio>
            <Radio value="private">私人</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          name="publish_type"
          label="發布方式"
          rules={[{ required: true }]}
          initialValue="immediate"
        >
          <Radio.Group>
            <Radio value="immediate">立即發布</Radio>
            <Radio value="scheduled">排程發布</Radio>
          </Radio.Group>
        </Form.Item>
      </Form>
    </Modal>
  )
}
```

---

#### 4. Zustand Store：`frontend/src/store/batchStore.ts`

**職責：** 批次任務全域狀態管理

```typescript
// frontend/src/store/batchStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface BatchTask {
  id: string
  name: string
  total_projects: number
  completed_projects: number
  failed_projects: number
  status: 'QUEUED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED'
  created_at: string
}

interface Project {
  id: string
  name: string
  status: string
  progress: number
  youtube_url?: string
  error_message?: string
}

interface BatchState {
  // 狀態
  batches: BatchTask[]
  currentBatch: BatchTask | null
  loading: boolean
  error: string | null

  // Actions
  setBatches: (batches: BatchTask[]) => void
  setCurrentBatch: (batch: BatchTask | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  updateBatchStatus: (batchId: string, status: string) => void
  updateProjectProgress: (batchId: string, projectId: string, progress: number) => void
}

export const useBatchStore = create<BatchState>()(
  persist(
    (set, get) => ({
      // 初始狀態
      batches: [],
      currentBatch: null,
      loading: false,
      error: null,

      // Actions
      setBatches: (batches) => set({ batches }),

      setCurrentBatch: (batch) => set({ currentBatch: batch }),

      setLoading: (loading) => set({ loading }),

      setError: (error) => set({ error }),

      updateBatchStatus: (batchId, status) =>
        set((state) => ({
          batches: state.batches.map(batch =>
            batch.id === batchId ? { ...batch, status } : batch
          ),
          currentBatch: state.currentBatch?.id === batchId
            ? { ...state.currentBatch, status }
            : state.currentBatch
        })),

      updateProjectProgress: (batchId, projectId, progress) =>
        set((state) => {
          if (state.currentBatch?.id === batchId) {
            return {
              currentBatch: {
                ...state.currentBatch,
                projects: state.currentBatch.projects.map(project =>
                  project.id === projectId
                    ? { ...project, progress }
                    : project
                )
              }
            }
          }
          return state
        })
    }),
    {
      name: 'batch-storage',
      partialize: (state) => ({
        batches: state.batches
      })
    }
  )
)
```

---

#### 5. API 整合：`frontend/src/lib/api/batch.ts`

**職責：** 批次處理 API 呼叫

```typescript
// frontend/src/lib/api/batch.ts
import { apiClient } from './client'

export const batchApi = {
  // 取得批次任務列表
  getBatches: () =>
    apiClient.get('/api/v1/batch'),

  // 取得批次任務詳情
  getBatchDetail: (batchId: string) =>
    apiClient.get(`/api/v1/batch/${batchId}`),

  // 建立批次任務
  createBatch: (data: {
    name: string
    projects: Array<{ name: string; content: string }>
    configuration_id: string
    prompt_template_id: string
    gemini_model: string
    youtube_settings: any
  }) =>
    apiClient.post('/api/v1/batch', data),

  // 暫停批次任務
  pauseBatch: (batchId: string) =>
    apiClient.post(`/api/v1/batch/${batchId}/pause`),

  // 繼續批次任務
  resumeBatch: (batchId: string) =>
    apiClient.post(`/api/v1/batch/${batchId}/resume`),

  // 重試失敗任務
  retryFailedProjects: (batchId: string) =>
    apiClient.post(`/api/v1/batch/${batchId}/retry-failed`),

  // 刪除批次任務
  deleteBatch: (batchId: string) =>
    apiClient.delete(`/api/v1/batch/${batchId}`),

  // 下載批次報告
  downloadReport: async (batchId: string): Promise<Blob> => {
    const response = await apiClient.get(
      `/api/v1/batch/${batchId}/report`,
      { responseType: 'blob' }
    )
    return response.data
  }
}
```

---

#### 6. 狀態標籤元件：`frontend/src/components/batch/BatchStatusTag.tsx`

**職責：** 批次狀態標籤顯示

```typescript
// frontend/src/components/batch/BatchStatusTag.tsx
import { Tag } from 'antd'

const statusConfig = {
  QUEUED: { color: 'default', text: '排隊中' },
  RUNNING: { color: 'processing', text: '執行中' },
  PAUSED: { color: 'warning', text: '已暫停' },
  COMPLETED: { color: 'success', text: '已完成' },
  FAILED: { color: 'error', text: '失敗' }
}

export default function BatchStatusTag({ status }: { status: string }) {
  const config = statusConfig[status] || { color: 'default', text: status }
  return <Tag color={config.color}>{config.text}</Tag>
}
```

```typescript
// frontend/src/components/batch/ProjectStatusTag.tsx
import { Tag } from 'antd'

const statusConfig = {
  QUEUED: { color: 'default', text: '排隊' },
  RUNNING: { color: 'processing', text: '進行中' },
  COMPLETED: { color: 'success', text: '完成' },
  FAILED: { color: 'error', text: '失敗' },
  PAUSED: { color: 'warning', text: '已暫停' }
}

export default function ProjectStatusTag({ status }: { status: string }) {
  const config = statusConfig[status] || { color: 'default', text: status }
  return <Tag color={config.color}>{config.text}</Tag>
}
```

---

### 資料流程

#### 批次任務建立流程
```
用戶 → 點擊「新增批次任務」
  → CreateBatchModal 開啟
  → 填寫表單（名稱、上傳檔案、選擇模板）
  → 點擊「開始批次處理」
  → 讀取所有文字檔案內容
  → batchApi.createBatch()
    → POST /api/v1/batch
    → Backend 建立 Batch 和 Projects
    → 返回 batch_id
  → 跳轉到 /batch/:id
  → 顯示批次詳情
```

#### 批次進度監控流程
```
批次詳情頁載入
  → useEffect 設定輪詢
  → 每 3 秒呼叫 batchApi.getBatchDetail()
    → GET /api/v1/batch/:id
    → 返回最新的批次和專案狀態
  → 更新 UI（進度條、狀態標籤、專案列表）
  → 若批次完成，停止輪詢
```

**進階：使用 WebSocket（可選）**
```
批次詳情頁載入
  → 建立 WebSocket 連線
    → ws://api/v1/batch/:id/progress
  → 監聽訊息
    → 接收進度更新事件
    → { type: 'PROGRESS_UPDATE', projectId, progress }
    → 即時更新 UI（無需輪詢）
  → 頁面卸載時關閉連線
```

---

## 開發指引

### TDD 開發流程

#### 第 1 步：環境準備（10 分鐘）
1. 確認前置任務完成：
   - Task-009 (Batch API) ✅
   - Task-019 (API 整合) ✅
   - Task-018 (Zustand Stores) ✅
2. 閱讀相關文件：
   - `product-design/pages.md#Page-12`
   - `tech-specs/backend/api-batch.md`
3. 確認開發環境運行：`npm run dev`

#### 第 2 步：建立檔案結構（20 分鐘）
1. 建立頁面檔案：
   - `frontend/src/app/batch/page.tsx`
   - `frontend/src/app/batch/[id]/page.tsx`
2. 建立元件檔案：
   - `frontend/src/components/batch/CreateBatchModal.tsx`
   - `frontend/src/components/batch/BatchStatusTag.tsx`
   - `frontend/src/components/batch/ProjectStatusTag.tsx`
3. 建立 Store：
   - `frontend/src/store/batchStore.ts`
4. 建立 API 檔案：
   - `frontend/src/lib/api/batch.ts`

#### 第 3 步：撰寫測試 1 - 批次列表（30 分鐘）
1. 建立 `frontend/src/app/batch/__tests__/page.test.tsx`
2. 撰寫「測試 1：批次列表正確載入」
3. 執行測試 → 失敗（預期）

#### 第 4 步：實作批次列表頁面（60 分鐘）
1. 實作 `page.tsx` 基本結構
2. 整合 batchApi.getBatches()
3. 實作表格顯示
4. 實作空狀態
5. 執行測試 1 → 通過 ✅

#### 第 5 步：撰寫測試 2 - 新增批次 Modal（30 分鐘）
1. 建立 `frontend/src/components/batch/__tests__/CreateBatchModal.test.tsx`
2. 撰寫「測試 2：新增批次任務 Modal 驗證」
3. 執行測試 → 失敗

#### 第 6 步：實作新增批次 Modal（90 分鐘）
1. 實作 CreateBatchModal 元件
2. 實作表單驗證（Zod）
3. 實作檔案上傳功能
4. 實作模板選擇下拉選單
5. 整合 batchApi.createBatch()
6. 執行測試 2 → 通過 ✅

#### 第 7 步：撰寫測試 3 - 批次詳情頁（30 分鐘）
1. 建立 `frontend/src/app/batch/[id]/__tests__/page.test.tsx`
2. 撰寫「測試 3：批次詳情頁載入與顯示」
3. 執行測試 → 失敗

#### 第 8 步：實作批次詳情頁（90 分鐘）
1. 實作 `[id]/page.tsx` 基本結構
2. 整合 batchApi.getBatchDetail()
3. 實作批次資訊卡片
4. 實作專案列表表格
5. 實作進度條
6. 執行測試 3 → 通過 ✅

#### 第 9 步：撰寫測試 4 - 批次控制（30 分鐘）
1. 撰寫「測試 4：批次暫停與繼續功能」
2. 執行測試 → 失敗

#### 第 10 步：實作批次控制功能（60 分鐘）
1. 實作暫停功能
2. 實作繼續功能
3. 實作確認 Modal
4. 更新按鈕狀態
5. 執行測試 4 → 通過 ✅

#### 第 11 步：撰寫測試 5 - 重試失敗任務（20 分鐘）
1. 撰寫「測試 5：重試失敗任務功能」
2. 執行測試 → 失敗

#### 第 12 步：實作重試功能（40 分鐘）
1. 實作 retryFailedProjects 功能
2. 實作失敗任務計數
3. 實作確認 Modal
4. 執行測試 5 → 通過 ✅

#### 第 13 步：整合測試（40 分鐘）
1. 撰寫「測試 6：完整批次建立與監控流程」
2. 實作進度輪詢或 WebSocket
3. 執行測試 → 通過 ✅

#### 第 14 步：錯誤處理與空狀態（40 分鐘）
1. 撰寫「測試 7：空狀態與錯誤處理」
2. 實作空狀態顯示
3. 實作錯誤處理
4. 實作 404 頁面
5. 執行測試 7 → 通過 ✅

#### 第 15 步：響應式設計（30 分鐘）
1. 使用 Tailwind CSS 實作響應式
2. 桌面、平板、手機測試
3. 表格改為卡片（手機版）

#### 第 16 步：重構與優化（30 分鐘）
1. 檢查程式碼重複
2. 提取共用元件
3. 優化效能（React.memo、useMemo）
4. 再次執行所有測試

#### 第 17 步：文件與檢查（30 分鐘）
1. 更新 README（如需要）
2. 檢查測試覆蓋率：`npm run test:coverage`
3. 執行 Linter：`npm run lint`
4. 格式化程式碼：`npm run format`

---

### 注意事項

#### UI/UX
- ⚠️ 表格在手機版要改為卡片顯示（響應式）
- ⚠️ 進度更新要即時（輪詢或 WebSocket）
- ⚠️ 操作按鈕要根據狀態動態顯示
- ⚠️ 確認 Modal 要清楚說明操作後果

#### 效能
- 💡 批次列表使用分頁（避免一次載入過多）
- 💡 詳情頁輪詢間隔適中（3-5 秒）
- 💡 使用 React.memo 優化表格渲染
- 💡 大量專案時使用虛擬列表（react-window）

#### 測試
- ✅ Mock API 回應（使用 MSW）
- ✅ 測試表單驗證（所有錯誤情況）
- ✅ 測試檔案上傳（檔案格式、大小驗證）
- ✅ 測試狀態更新（Store 同步）

#### 與其他模組整合
- 🔗 Task-019 (API 整合層) - 使用 batchApi
- 🔗 Task-018 (Zustand Stores) - 使用 useBatchStore
- 🔗 Task-027 (配置管理) - 選擇視覺模板和 Prompt 範本

---

### 完成檢查清單

#### 功能完整性
- [ ] 批次列表頁面完成（/batch）
- [ ] 批次詳情頁面完成（/batch/:id）
- [ ] 新增批次任務 Modal 完成
- [ ] 批次控制功能完成（暫停/繼續/重試）
- [ ] 批次進度監控完成（輪詢或 WebSocket）
- [ ] 批次報告下載功能完成
- [ ] 空狀態處理完成
- [ ] 錯誤處理完成

#### 測試
- [ ] 測試 1：批次列表正確載入 ✅
- [ ] 測試 2：新增批次 Modal 驗證 ✅
- [ ] 測試 3：批次詳情頁載入與顯示 ✅
- [ ] 測試 4：批次暫停與繼續功能 ✅
- [ ] 測試 5：重試失敗任務功能 ✅
- [ ] 測試 6：完整批次建立與監控流程 ✅
- [ ] 測試 7：空狀態與錯誤處理 ✅
- [ ] 測試覆蓋率 > 80%

#### 程式碼品質
- [ ] ESLint check 無錯誤：`npm run lint`
- [ ] TypeScript 無錯誤：`npm run type-check`
- [ ] 程式碼已格式化：`npm run format`
- [ ] 無 console.log 或除錯程式碼

#### UI/UX
- [ ] 響應式設計完成（桌面/平板/手機）
- [ ] 載入狀態正確顯示（骨架屏）
- [ ] 錯誤訊息清楚易懂
- [ ] Toast 通知適時顯示
- [ ] 所有互動都有視覺回饋

#### 整合
- [ ] API 整合正常（所有端點測試通過）
- [ ] Zustand Store 狀態同步正常
- [ ] 與配置管理頁面整合正常（模板選擇）
- [ ] 路由導航正常（頁面跳轉）

#### 文件
- [ ] 函數都有 JSDoc 註解
- [ ] 元件都有 Props 類型定義
- [ ] README 更新（如需要）

---

## 預估時間分配

- 環境準備：10 分鐘
- 建立檔案結構：20 分鐘
- 測試 1 + 實作批次列表：90 分鐘
- 測試 2 + 實作新增 Modal：120 分鐘
- 測試 3 + 實作批次詳情：120 分鐘
- 測試 4 + 實作批次控制：90 分鐘
- 測試 5 + 實作重試功能：60 分鐘
- 整合測試：40 分鐘
- 錯誤處理與空狀態：40 分鐘
- 響應式設計：30 分鐘
- 重構優化：30 分鐘
- 文件檢查：30 分鐘

**總計：約 10 小時**

---

## 參考資源

### Ant Design 元件
- [Table](https://ant.design/components/table)
- [Modal](https://ant.design/components/modal)
- [Upload](https://ant.design/components/upload)
- [Progress](https://ant.design/components/progress)
- [Tag](https://ant.design/components/tag)

### Next.js 文檔
- [App Router](https://nextjs.org/docs/app)
- [Dynamic Routes](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes)
- [useParams](https://nextjs.org/docs/app/api-reference/functions/use-params)

### 測試文檔
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [MSW (Mock Service Worker)](https://mswjs.io/)
- [Jest](https://jestjs.io/)

### 專案內部文件
- `product-design/pages.md#Page-12` - 批次處理頁面設計
- `product-design/flows.md#Flow-5` - 批次處理流程
- `tech-specs/backend/api-batch.md` - Batch API 規格
- `tech-specs/frontend/state-management.md` - 狀態管理設計

---

**準備好了嗎？** 開始使用 TDD 方式實作批次處理頁面！🚀
