# Task-021: 主控台頁面實作 (Dashboard Page)

> **建立日期:** 2025-10-19
> **狀態:** ⏳ 未開始
> **預計時間:** 12 小時
> **優先級:** P0 (必須)

---

## 關聯文件

### 產品設計
- **頁面設計:** `product-design/pages.md#Page-2-主控台-Dashboard`
- **使用者流程:** `product-design/flows.md#Flow-1` (步驟 1)、`#Flow-2` (步驟 1)、`#Flow-5`、`#Flow-6`

### 技術規格
- **頁面規格:** `tech-specs/frontend/pages.md#2-主控台-Dashboard`
- **元件架構:** `tech-specs/frontend/component-architecture.md`
- **狀態管理:** `tech-specs/frontend/state-management.md`
- **API 整合:** `tech-specs/frontend/api-integration.md`
- **路由設計:** `tech-specs/frontend/routing.md`

### 相關任務
- **前置任務:** Task-017 ✅ (路由系統), Task-018 ✅ (Zustand Stores), Task-019 ✅ (Axios 客戶端)
- **後續任務:** Task-029 (整合測試)
- **可並行:** Task-020 (Setup 頁面), Task-026 (Settings 頁面)

---

## 任務目標

### 簡述
實作主控台頁面 (Dashboard)，作為應用程式啟動後的首頁。包含專案列表、統計資訊、快速操作區，支援篩選、排序、分頁功能。

### 成功標準
- [x] 專案列表完整顯示（支援表格/卡片切換）
- [x] 統計卡片正確顯示（總專案數、本月生成數等）
- [x] 快速操作區所有按鈕可用
- [x] 篩選功能正常（狀態、日期範圍）
- [x] 排序功能正常（創建時間、更新時間）
- [x] 分頁功能正常（每頁 20 筆）
- [x] 響應式設計完成（桌面、平板、手機）
- [x] 空狀態、載入中、錯誤狀態處理完整
- [x] 單元測試覆蓋率 > 80%

---

## 測試要求

### 單元測試

#### 測試 1：成功載入專案列表

**目的：** 驗證主控台可以正確載入和顯示專案列表

**前置條件：**
- API 返回 3 個專案

**測試資料：**
```typescript
const mockProjects = [
  {
    id: 'proj-001',
    project_name: '測試專案 1',
    status: 'COMPLETED',
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T11:30:00Z',
  },
  {
    id: 'proj-002',
    project_name: '測試專案 2',
    status: 'IN_PROGRESS',
    created_at: '2025-01-16T09:00:00Z',
    updated_at: '2025-01-16T10:00:00Z',
  },
  {
    id: 'proj-003',
    project_name: '測試專案 3',
    status: 'FAILED',
    created_at: '2025-01-17T14:00:00Z',
    updated_at: '2025-01-17T14:30:00Z',
  }
]
```

**Mock API 回應：**
```typescript
GET /api/v1/projects?limit=20&offset=0

{
  "success": true,
  "data": {
    "projects": mockProjects,
    "pagination": {
      "total": 3,
      "limit": 20,
      "offset": 0
    }
  }
}
```

**驗證點：**
- [ ] 顯示 3 個專案
- [ ] 專案名稱正確顯示
- [ ] 狀態標籤正確顯示（已完成、進行中、失敗）
- [ ] 日期格式化正確
- [ ] 操作按鈕正確顯示（查看、繼續、刪除）

**測試程式碼骨架：**
```typescript
// app/__tests__/page.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import DashboardPage from '@/app/page'
import { api } from '@/services/api'

jest.mock('@/services/api')

describe('DashboardPage', () => {
  it('should load and display project list', async () => {
    // Arrange
    const mockProjects = [...]
    ;(api.getProjects as jest.Mock).mockResolvedValue({
      projects: mockProjects,
      pagination: { total: 3, limit: 20, offset: 0 }
    })

    const queryClient = new QueryClient()

    // Act
    render(
      <QueryClientProvider client={queryClient}>
        <DashboardPage />
      </QueryClientProvider>
    )

    // Assert
    await waitFor(() => {
      expect(screen.getByText('測試專案 1')).toBeInTheDocument()
      expect(screen.getByText('測試專案 2')).toBeInTheDocument()
      expect(screen.getByText('測試專案 3')).toBeInTheDocument()
    })

    expect(screen.getByText('已完成')).toBeInTheDocument()
    expect(screen.getByText('進行中')).toBeInTheDocument()
    expect(screen.getByText('失敗')).toBeInTheDocument()
  })
})
```

---

#### 測試 2：空狀態顯示

**目的：** 驗證無專案時顯示正確的空狀態

**Mock API 回應：**
```typescript
GET /api/v1/projects?limit=20&offset=0

{
  "success": true,
  "data": {
    "projects": [],
    "pagination": {
      "total": 0,
      "limit": 20,
      "offset": 0
    }
  }
}
```

**驗證點：**
- [ ] 顯示空狀態圖示
- [ ] 顯示「還沒有任何專案」文字
- [ ] 顯示「開始第一個專案」按鈕
- [ ] 點擊按鈕跳轉到新增專案頁

**測試程式碼：**
```typescript
it('should display empty state when no projects exist', async () => {
  // Arrange
  ;(api.getProjects as jest.Mock).mockResolvedValue({
    projects: [],
    pagination: { total: 0, limit: 20, offset: 0 }
  })

  // Act
  render(
    <QueryClientProvider client={queryClient}>
      <DashboardPage />
    </QueryClientProvider>
  )

  // Assert
  await waitFor(() => {
    expect(screen.getByText('還沒有任何專案')).toBeInTheDocument()
  })

  const startButton = screen.getByText('開始第一個專案')
  expect(startButton).toBeInTheDocument()
  expect(startButton.tagName).toBe('BUTTON')
})
```

---

#### 測試 3：統計卡片顯示

**目的：** 驗證統計資訊卡片正確顯示

**Mock API 回應：**
```typescript
GET /api/v1/stats

{
  "success": true,
  "data": {
    "total_projects": 15,
    "completed_projects": 12,
    "in_progress_projects": 2,
    "failed_projects": 1,
    "this_month_generated": 5,
    "scheduled_videos": 3,
    "api_quota": {
      "did_remaining_minutes": 60,
      "did_total_minutes": 90,
      "youtube_remaining_units": 8000,
      "youtube_total_units": 10000
    }
  }
}
```

**驗證點：**
- [ ] 顯示「總影片數：15」
- [ ] 顯示「本月生成數：5」
- [ ] 顯示「已排程影片：3」
- [ ] 顯示「API 配額剩餘」並正確計算百分比

**測試程式碼：**
```typescript
it('should display statistics cards correctly', async () => {
  // Arrange
  const mockStats = {
    total_projects: 15,
    this_month_generated: 5,
    scheduled_videos: 3,
    api_quota: {
      did_remaining_minutes: 60,
      did_total_minutes: 90,
    }
  }

  ;(api.getStats as jest.Mock).mockResolvedValue(mockStats)

  // Act
  render(
    <QueryClientProvider client={queryClient}>
      <DashboardPage />
    </QueryClientProvider>
  )

  // Assert
  await waitFor(() => {
    expect(screen.getByText('總影片數')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('本月生成數')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('已排程影片')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })
})
```

---

#### 測試 4：專案篩選功能

**目的：** 驗證可以按狀態篩選專案

**測試步驟：**
1. 初始載入顯示所有專案
2. 選擇「已完成」篩選
3. API 調用應包含 status=COMPLETED 參數
4. 只顯示已完成專案

**驗證點：**
- [ ] 篩選下拉選單可用
- [ ] 選擇篩選後 API 參數正確
- [ ] 專案列表更新顯示篩選結果

**測試程式碼：**
```typescript
it('should filter projects by status', async () => {
  // Arrange
  const allProjects = [...]
  const completedProjects = [{ status: 'COMPLETED', ... }]

  ;(api.getProjects as jest.Mock)
    .mockResolvedValueOnce({ projects: allProjects, ... })
    .mockResolvedValueOnce({ projects: completedProjects, ... })

  // Act
  render(<DashboardPage />)

  await waitFor(() => {
    expect(screen.getByText('測試專案 1')).toBeInTheDocument()
  })

  // 選擇篩選
  const filterSelect = screen.getByLabelText('狀態篩選')
  fireEvent.change(filterSelect, { target: { value: 'COMPLETED' } })

  // Assert
  await waitFor(() => {
    expect(api.getProjects).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'COMPLETED',
        limit: 20,
        offset: 0
      })
    )
  })
})
```

---

#### 測試 5：專案排序功能

**目的：** 驗證可以按日期排序專案

**測試步驟：**
1. 初始載入（預設：最後更新時間降序）
2. 點擊「創建時間」欄位標題
3. 切換為創建時間升序
4. API 調用應包含 sort_by=created_at&order=asc

**驗證點：**
- [ ] 欄位標題可點擊
- [ ] 排序參數正確傳遞
- [ ] 顯示排序圖示（升序/降序）

**測試程式碼：**
```typescript
it('should sort projects by creation date', async () => {
  // Arrange
  ;(api.getProjects as jest.Mock).mockResolvedValue({ projects: [...], ... })

  // Act
  render(<DashboardPage />)

  await waitFor(() => {
    expect(screen.getByText('測試專案 1')).toBeInTheDocument()
  })

  // 點擊「創建時間」欄位
  const createdAtHeader = screen.getByText('創建時間')
  fireEvent.click(createdAtHeader)

  // Assert
  await waitFor(() => {
    expect(api.getProjects).toHaveBeenCalledWith(
      expect.objectContaining({
        sort_by: 'created_at',
        order: 'asc'
      })
    )
  })
})
```

---

#### 測試 6：分頁功能

**目的：** 驗證分頁器正常工作

**測試步驟：**
1. 載入第 1 頁（20 筆）
2. 點擊「下一頁」
3. API 調用應包含 offset=20
4. 顯示第 2 頁資料

**驗證點：**
- [ ] 分頁器顯示正確頁數
- [ ] 點擊頁碼可跳轉
- [ ] API offset 參數正確
- [ ] 顯示「第 X 頁，共 Y 頁」

**測試程式碼：**
```typescript
it('should paginate project list', async () => {
  // Arrange
  const page1Projects = Array.from({ length: 20 }, (_, i) => ({
    id: `proj-${i}`,
    project_name: `專案 ${i}`,
    ...
  }))

  const page2Projects = Array.from({ length: 20 }, (_, i) => ({
    id: `proj-${i + 20}`,
    project_name: `專案 ${i + 20}`,
    ...
  }))

  ;(api.getProjects as jest.Mock)
    .mockResolvedValueOnce({
      projects: page1Projects,
      pagination: { total: 50, limit: 20, offset: 0 }
    })
    .mockResolvedValueOnce({
      projects: page2Projects,
      pagination: { total: 50, limit: 20, offset: 20 }
    })

  // Act
  render(<DashboardPage />)

  await waitFor(() => {
    expect(screen.getByText('專案 0')).toBeInTheDocument()
  })

  // 點擊下一頁
  const nextButton = screen.getByLabelText('下一頁')
  fireEvent.click(nextButton)

  // Assert
  await waitFor(() => {
    expect(api.getProjects).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 20,
        offset: 20
      })
    )
    expect(screen.getByText('專案 20')).toBeInTheDocument()
  })
})
```

---

#### 測試 7：刪除專案功能

**目的：** 驗證刪除專案流程

**測試步驟：**
1. 點擊專案的「刪除」按鈕
2. 顯示確認 Modal
3. 點擊「確定」
4. 調用 DELETE API
5. 專案從列表中移除

**驗證點：**
- [ ] 顯示確認 Modal
- [ ] Modal 文字正確（「確定要刪除此專案嗎？」）
- [ ] 點擊「取消」關閉 Modal
- [ ] 點擊「確定」調用 DELETE API
- [ ] 刪除成功後重新載入列表

**測試程式碼：**
```typescript
it('should delete project with confirmation', async () => {
  // Arrange
  const mockProjects = [{ id: 'proj-001', project_name: '測試專案' }]

  ;(api.getProjects as jest.Mock).mockResolvedValue({ projects: mockProjects, ... })
  ;(api.deleteProject as jest.Mock).mockResolvedValue({ success: true })

  // Act
  render(<DashboardPage />)

  await waitFor(() => {
    expect(screen.getByText('測試專案')).toBeInTheDocument()
  })

  // 點擊刪除按鈕
  const deleteButton = screen.getByLabelText('刪除專案')
  fireEvent.click(deleteButton)

  // Assert: 顯示確認 Modal
  expect(screen.getByText('確定要刪除此專案嗎？')).toBeInTheDocument()

  // 點擊確定
  const confirmButton = screen.getByText('確定')
  fireEvent.click(confirmButton)

  // Assert: 調用 API
  await waitFor(() => {
    expect(api.deleteProject).toHaveBeenCalledWith('proj-001')
  })

  // Assert: 重新載入列表
  expect(api.getProjects).toHaveBeenCalledTimes(2)
})
```

---

#### 測試 8：錯誤狀態顯示

**目的：** 驗證 API 失敗時顯示錯誤訊息

**Mock API 回應：**
```typescript
GET /api/v1/projects?limit=20&offset=0

{
  "success": false,
  "error": {
    "code": "NETWORK_ERROR",
    "message": "無法連線到伺服器"
  }
}
```

**驗證點：**
- [ ] 顯示錯誤圖示
- [ ] 顯示「無法載入專案列表」
- [ ] 顯示「重新載入」按鈕
- [ ] 點擊按鈕重新調用 API

**測試程式碼：**
```typescript
it('should display error state when API fails', async () => {
  // Arrange
  const error = new Error('無法連線到伺服器')
  ;(api.getProjects as jest.Mock).mockRejectedValue(error)

  // Act
  render(<DashboardPage />)

  // Assert
  await waitFor(() => {
    expect(screen.getByText('無法載入專案列表')).toBeInTheDocument()
  })

  const retryButton = screen.getByText('重新載入')
  expect(retryButton).toBeInTheDocument()

  // 點擊重試
  fireEvent.click(retryButton)

  expect(api.getProjects).toHaveBeenCalledTimes(2)
})
```

---

### 整合測試

#### 測試 9：完整使用者流程（從主控台到新增專案）

**目的：** 驗證使用者可以從主控台進入新增專案頁

**測試步驟：**
1. 載入主控台
2. 點擊「新增專案」按鈕
3. 路由跳轉到 `/project/new`

**驗證點：**
- [ ] 主控台載入成功
- [ ] 「新增專案」按鈕可點擊
- [ ] 跳轉到新增專案頁

---

### E2E 測試

#### 測試 10：主控台響應式設計

**目的：** 驗證主控台在不同螢幕尺寸下正確顯示

**測試場景：**
- 桌面 (1920x1080)：表格顯示
- 平板 (768x1024)：表格顯示
- 手機 (375x667)：卡片顯示

**驗證點：**
- [ ] 桌面：統計卡片 4 個橫排
- [ ] 桌面：專案列表為表格
- [ ] 平板：統計卡片 2x2 網格
- [ ] 手機：統計卡片單列堆疊
- [ ] 手機：專案列表為卡片

---

## 實作規格

### 需要建立/修改的檔案

#### 1. 主頁面元件: `app/page.tsx`

**職責：** Dashboard 頁面主要元件

**實作內容：**

```typescript
// app/page.tsx
'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import StatsCards from '@/components/feature/StatsCards'
import ProjectList from '@/components/feature/ProjectList'
import { Button, Skeleton } from '@/components/ui'
import { api } from '@/services/api'
import { PlusIcon } from '@heroicons/react/24/outline'

export default function DashboardPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState('updated_at')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')

  // 查詢統計資料
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: () => api.getStats(),
  })

  // 查詢專案列表
  const {
    data: projectsData,
    isLoading: projectsLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['projects', page, status, sortBy, order],
    queryFn: () => api.getProjects({
      limit: 20,
      offset: (page - 1) * 20,
      status: status || undefined,
      sort_by: sortBy,
      order,
    }),
  })

  const handleNewProject = () => {
    router.push('/project/new')
  }

  const handleDeleteProject = async (projectId: string) => {
    // 顯示確認 Modal
    const confirmed = window.confirm('確定要刪除此專案嗎？此操作無法復原。')
    if (!confirmed) return

    try {
      await api.deleteProject(projectId)
      // 重新載入列表
      refetch()
      // 顯示成功訊息
      toast.success('專案已刪除')
    } catch (error) {
      toast.error('刪除失敗，請稍後再試')
    }
  }

  const handleViewProject = (projectId: string) => {
    router.push(`/project/${projectId}/result`)
  }

  const handleContinueProject = (projectId: string) => {
    router.push(`/project/${projectId}/progress`)
  }

  return (
    <AppLayout>
      <div className="p-6">
        {/* 標題與快速操作 */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">主控台</h1>
          <Button
            type="primary"
            icon={<PlusIcon className="w-5 h-5" />}
            onClick={handleNewProject}
          >
            新增專案
          </Button>
        </div>

        {/* 統計卡片 */}
        {statsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Skeleton variant="rectangular" height={120} />
            <Skeleton variant="rectangular" height={120} />
            <Skeleton variant="rectangular" height={120} />
            <Skeleton variant="rectangular" height={120} />
          </div>
        ) : (
          <StatsCards stats={stats} className="mb-6" />
        )}

        {/* 專案列表 */}
        {projectsLoading ? (
          <Skeleton variant="rectangular" height={400} count={3} />
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">無法載入專案列表</p>
            <Button onClick={() => refetch()}>重新載入</Button>
          </div>
        ) : projectsData?.projects.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              {/* 空資料夾圖示 */}
              <svg className="w-24 h-24 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <p className="text-lg text-gray-600 mb-4">還沒有任何專案</p>
            <Button type="primary" onClick={handleNewProject}>
              開始第一個專案
            </Button>
          </div>
        ) : (
          <ProjectList
            projects={projectsData.projects}
            pagination={projectsData.pagination}
            status={status}
            onStatusChange={setStatus}
            sortBy={sortBy}
            order={order}
            onSort={(field, newOrder) => {
              setSortBy(field)
              setOrder(newOrder)
            }}
            onPageChange={setPage}
            onDelete={handleDeleteProject}
            onView={handleViewProject}
            onContinue={handleContinueProject}
          />
        )}
      </div>
    </AppLayout>
  )
}
```

---

#### 2. 統計卡片元件: `components/feature/StatsCards/StatsCards.tsx`

**職責：** 顯示統計資訊卡片（總專案數、本月生成數等）

**Props:**
```typescript
interface StatsCardsProps {
  stats: {
    total_projects: number
    this_month_generated: number
    scheduled_videos: number
    api_quota: {
      did_remaining_minutes: number
      did_total_minutes: number
      youtube_remaining_units: number
      youtube_total_units: number
    }
  }
  className?: string
}
```

**實作：**
```typescript
// components/feature/StatsCards/StatsCards.tsx
import { Card } from '@/components/ui'
import {
  FilmIcon,
  CalendarIcon,
  ChartBarIcon,
  CloudIcon
} from '@heroicons/react/24/outline'

export const StatsCards: React.FC<StatsCardsProps> = ({ stats, className }) => {
  const didQuotaPercent = (stats.api_quota.did_remaining_minutes / stats.api_quota.did_total_minutes) * 100
  const youtubeQuotaPercent = (stats.api_quota.youtube_remaining_units / stats.api_quota.youtube_total_units) * 100

  const cards = [
    {
      title: '總影片數',
      value: stats.total_projects,
      icon: FilmIcon,
      color: 'blue',
    },
    {
      title: '本月生成數',
      value: stats.this_month_generated,
      icon: ChartBarIcon,
      color: 'green',
    },
    {
      title: '已排程影片',
      value: stats.scheduled_videos,
      icon: CalendarIcon,
      color: 'purple',
    },
    {
      title: 'API 配額剩餘',
      value: `${didQuotaPercent.toFixed(0)}%`,
      subtitle: `D-ID: ${stats.api_quota.did_remaining_minutes}/${stats.api_quota.did_total_minutes} 分鐘`,
      icon: CloudIcon,
      color: didQuotaPercent < 10 ? 'red' : 'orange',
    },
  ]

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {cards.map((card, index) => (
        <Card key={index} className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{card.title}</p>
              <p className="text-2xl font-bold">{card.value}</p>
              {card.subtitle && (
                <p className="text-xs text-gray-500 mt-1">{card.subtitle}</p>
              )}
            </div>
            <card.icon className={`w-12 h-12 text-${card.color}-500`} />
          </div>
        </Card>
      ))}
    </div>
  )
}
```

---

#### 3. 專案列表元件: `components/feature/ProjectList/ProjectList.tsx`

**職責：** 顯示專案列表（表格或卡片形式）

**Props:**
```typescript
interface ProjectListProps {
  projects: Project[]
  pagination: {
    total: number
    limit: number
    offset: number
  }
  status: string | null
  onStatusChange: (status: string | null) => void
  sortBy: string
  order: 'asc' | 'desc'
  onSort: (field: string, order: 'asc' | 'desc') => void
  onPageChange: (page: number) => void
  onDelete: (projectId: string) => void
  onView: (projectId: string) => void
  onContinue: (projectId: string) => void
}
```

**實作：**
```typescript
// components/feature/ProjectList/ProjectList.tsx
import { Table, Select, Badge } from '@/components/ui'
import { formatDate } from '@/utils/date'
import { TrashIcon, EyeIcon, PlayIcon } from '@heroicons/react/24/outline'

export const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  pagination,
  status,
  onStatusChange,
  sortBy,
  order,
  onSort,
  onPageChange,
  onDelete,
  onView,
  onContinue,
}) => {
  const columns = [
    {
      key: 'project_name',
      title: '專案名稱',
      dataIndex: 'project_name' as keyof Project,
      sortable: false,
    },
    {
      key: 'status',
      title: '狀態',
      dataIndex: 'status' as keyof Project,
      render: (status: string) => {
        const statusMap = {
          COMPLETED: { text: '已完成', color: 'green' },
          IN_PROGRESS: { text: '進行中', color: 'blue' },
          FAILED: { text: '失敗', color: 'red' },
          INITIALIZED: { text: '已建立', color: 'gray' },
        }
        const statusInfo = statusMap[status as keyof typeof statusMap]
        return <Badge color={statusInfo.color}>{statusInfo.text}</Badge>
      },
    },
    {
      key: 'created_at',
      title: '創建時間',
      dataIndex: 'created_at' as keyof Project,
      render: (date: string) => formatDate(date),
      sortable: true,
    },
    {
      key: 'updated_at',
      title: '最後更新',
      dataIndex: 'updated_at' as keyof Project,
      render: (date: string) => formatDate(date),
      sortable: true,
    },
    {
      key: 'actions',
      title: '操作',
      dataIndex: 'id' as keyof Project,
      render: (_: any, record: Project) => (
        <div className="flex gap-2">
          <button
            onClick={() => onView(record.id)}
            className="text-blue-500 hover:text-blue-700"
            aria-label="查看專案"
          >
            <EyeIcon className="w-5 h-5" />
          </button>
          {record.status === 'IN_PROGRESS' && (
            <button
              onClick={() => onContinue(record.id)}
              className="text-green-500 hover:text-green-700"
              aria-label="繼續專案"
            >
              <PlayIcon className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => onDelete(record.id)}
            className="text-red-500 hover:text-red-700"
            aria-label="刪除專案"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      ),
    },
  ]

  const totalPages = Math.ceil(pagination.total / pagination.limit)
  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1

  return (
    <div>
      {/* 篩選器 */}
      <div className="mb-4 flex gap-4">
        <Select
          value={status || 'all'}
          onChange={(value) => onStatusChange(value === 'all' ? null : value)}
          options={[
            { label: '全部', value: 'all' },
            { label: '已完成', value: 'COMPLETED' },
            { label: '進行中', value: 'IN_PROGRESS' },
            { label: '失敗', value: 'FAILED' },
            { label: '已建立', value: 'INITIALIZED' },
          ]}
          aria-label="狀態篩選"
        />
      </div>

      {/* 表格 */}
      <Table
        columns={columns}
        dataSource={projects}
        pagination={{
          current: currentPage,
          pageSize: pagination.limit,
          total: pagination.total,
          onChange: onPageChange,
        }}
        onRow={(record) => ({
          onClick: () => {},
        })}
      />
    </div>
  )
}
```

---

#### 4. API 服務層: `services/api/projects.ts`

**職責：** 專案相關 API 調用

**方法：**

```typescript
// services/api/projects.ts
import { axiosInstance } from './axios'

export interface GetProjectsParams {
  limit?: number
  offset?: number
  status?: string
  sort_by?: string
  order?: 'asc' | 'desc'
}

export interface Project {
  id: string
  project_name: string
  status: string
  created_at: string
  updated_at: string
  youtube_video_id?: string
}

export interface GetProjectsResponse {
  projects: Project[]
  pagination: {
    total: number
    limit: number
    offset: number
  }
}

export const projectsApi = {
  async getProjects(params: GetProjectsParams): Promise<GetProjectsResponse> {
    const { data } = await axiosInstance.get('/api/v1/projects', { params })
    return data.data
  },

  async deleteProject(projectId: string): Promise<void> {
    await axiosInstance.delete(`/api/v1/projects/${projectId}`)
  },

  async getProject(projectId: string): Promise<Project> {
    const { data } = await axiosInstance.get(`/api/v1/projects/${projectId}`)
    return data.data
  },
}
```

---

#### 5. 統計 API 服務層: `services/api/stats.ts`

**職責：** 統計資料 API 調用

**方法：**

```typescript
// services/api/stats.ts
import { axiosInstance } from './axios'

export interface Stats {
  total_projects: number
  completed_projects: number
  in_progress_projects: number
  failed_projects: number
  this_month_generated: number
  scheduled_videos: number
  api_quota: {
    did_remaining_minutes: number
    did_total_minutes: number
    youtube_remaining_units: number
    youtube_total_units: number
  }
}

export const statsApi = {
  async getStats(): Promise<Stats> {
    const { data } = await axiosInstance.get('/api/v1/stats')
    return data.data
  },
}
```

---

#### 6. 日期格式化工具: `utils/date.ts`

**職責：** 日期格式化

```typescript
// utils/date.ts
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()

  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '剛剛'
  if (diffMins < 60) return `${diffMins} 分鐘前`
  if (diffHours < 24) return `${diffHours} 小時前`
  if (diffDays < 7) return `${diffDays} 天前`

  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
```

---

## 開發指引

### TDD 開發流程

#### 第 1 步：環境準備（10 分鐘）
1. 確認 Task-017, Task-018, Task-019 已完成
2. 確認測試環境可運行：`npm test`
3. 閱讀 `tech-specs/frontend/pages.md#2-主控台`

#### 第 2 步：撰寫第一個測試（20 分鐘）
1. 建立 `app/__tests__/page.test.tsx`
2. 撰寫「測試 1：成功載入專案列表」
3. 執行測試 → 失敗（預期，因為還沒實作）

#### 第 3 步：實作基礎頁面骨架（30 分鐘）
1. 建立 `app/page.tsx` - Dashboard 頁面骨架
2. 建立基本佈局（標題、按鈕）
3. 執行測試 → 部分通過

#### 第 4 步：實作統計卡片元件（45 分鐘）
1. 建立 `components/feature/StatsCards/`
2. 撰寫「測試 3：統計卡片顯示」
3. 實作 StatsCards 元件
4. 執行測試 → 通過 ✅

#### 第 5 步：實作專案列表元件（60 分鐘）
1. 建立 `components/feature/ProjectList/`
2. 實作表格顯示
3. 實作狀態標籤
4. 執行測試 1 → 通過 ✅

#### 第 6 步：實作篩選功能（30 分鐘）
1. 撰寫「測試 4：專案篩選功能」
2. 實作篩選下拉選單
3. 實作篩選邏輯
4. 執行測試 → 通過 ✅

#### 第 7 步：實作排序功能（30 分鐘）
1. 撰寫「測試 5：專案排序功能」
2. 實作排序圖示和邏輯
3. 執行測試 → 通過 ✅

#### 第 8 步：實作分頁功能（30 分鐘）
1. 撰寫「測試 6：分頁功能」
2. 實作分頁器元件
3. 執行測試 → 通過 ✅

#### 第 9 步：實作刪除功能（30 分鐘）
1. 撰寫「測試 7：刪除專案功能」
2. 實作確認 Modal
3. 實作刪除 API 調用
4. 執行測試 → 通過 ✅

#### 第 10 步：實作空狀態和錯誤處理（30 分鐘）
1. 撰寫「測試 2：空狀態顯示」
2. 撰寫「測試 8：錯誤狀態顯示」
3. 實作空狀態 UI
4. 實作錯誤處理 UI
5. 執行所有測試 → 通過 ✅

#### 第 11 步：響應式設計（45 分鐘）
1. 實作桌面版佈局
2. 實作平板版佈局
3. 實作手機版佈局（卡片顯示）
4. 測試不同螢幕尺寸

#### 第 12 步：優化與重構（30 分鐘）
1. 檢查程式碼重複
2. 提取共用邏輯
3. 優化效能（使用 React.memo）
4. 再次執行所有測試

#### 第 13 步：整合測試（30 分鐘）
1. 撰寫「測試 9：完整使用者流程」
2. 測試從主控台到新增專案的導航
3. 執行測試 → 通過 ✅

#### 第 14 步：文件與檢查（20 分鐘）
1. 檢查測試覆蓋率：`npm run test:coverage`
2. 執行 linter：`npm run lint`
3. 格式化程式碼：`npm run format`
4. 更新 CHANGELOG

---

## 注意事項

### UI/UX
- ⚠️ 確保篩選、排序不會導致頁面跳動
- ⚠️ 分頁切換時保持篩選和排序狀態
- ⚠️ 刪除專案後顯示 Toast 通知
- ⚠️ 載入狀態使用骨架屏，不要使用單一 spinner

### 效能
- 💡 使用 React Query 的 staleTime 和 cacheTime
- 💡 專案列表使用虛擬化（如果專案數 > 100）
- 💡 統計卡片可以獨立快取（不隨專案列表重新載入）

### 測試
- ✅ 每個功能都要有對應測試
- ✅ Mock API 回應要覆蓋成功、失敗、空狀態
- ✅ 測試應該可以獨立執行

### 無障礙設計
- ✅ 所有按鈕都有 aria-label
- ✅ 表格可用鍵盤導航
- ✅ 篩選下拉選單有 label

---

## 完成檢查清單

### 功能完整性
- [ ] 專案列表可正常顯示
- [ ] 統計卡片可正常顯示
- [ ] 篩選功能正常運作
- [ ] 排序功能正常運作
- [ ] 分頁功能正常運作
- [ ] 刪除功能正常運作
- [ ] 「新增專案」按鈕可跳轉
- [ ] 「查看」按鈕可跳轉到結果頁
- [ ] 「繼續」按鈕可跳轉到進度頁

### 狀態處理
- [ ] 載入中狀態（骨架屏）
- [ ] 空狀態（無專案）
- [ ] 錯誤狀態（API 失敗）
- [ ] 成功狀態（正常顯示）

### 測試
- [ ] 所有單元測試通過（8 個測試）
- [ ] 整合測試通過（1 個測試）
- [ ] E2E 測試通過（1 個測試）
- [ ] 測試覆蓋率 > 80%

### 程式碼品質
- [ ] ESLint check 無錯誤：`npm run lint`
- [ ] 程式碼已格式化：`npm run format`
- [ ] 無 TypeScript 錯誤
- [ ] 無 console.log 或除錯程式碼

### 響應式設計
- [ ] 桌面版（≥1024px）：表格顯示，4 欄統計卡片
- [ ] 平板版（768-1023px）：表格顯示，2x2 統計卡片
- [ ] 手機版（<768px）：卡片顯示，單欄統計卡片

### 文件
- [ ] 所有元件都有 JSDoc 註解
- [ ] README 已更新（如需要）
- [ ] CHANGELOG 已更新

---

## 預估時間分配

- 閱讀與準備：10 分鐘
- 撰寫測試：80 分鐘
- 實作功能：300 分鐘
- 響應式設計：45 分鐘
- 重構優化：30 分鐘
- 整合測試：30 分鐘
- 文件檢查：25 分鐘

**總計：約 8.5 小時**（預留 3.5 小時 buffer = 12 小時）

---

## 參考資源

### Next.js 官方文檔
- [App Router](https://nextjs.org/docs/app)
- [Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching)
- [Loading UI](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming)

### React Query 文檔
- [useQuery](https://tanstack.com/query/latest/docs/react/reference/useQuery)
- [Query Keys](https://tanstack.com/query/latest/docs/react/guides/query-keys)

### Ant Design 文檔
- [Table](https://ant.design/components/table)
- [Pagination](https://ant.design/components/pagination)
- [Select](https://ant.design/components/select)

### 專案內部文件
- `tech-specs/frontend/pages.md` - 頁面規格
- `tech-specs/frontend/component-architecture.md` - 元件架構
- `tech-specs/frontend/state-management.md` - 狀態管理
- `product-design/pages.md` - 產品設計

---

**準備好了嗎？** 開始使用 TDD 方式實作主控台頁面！🚀
