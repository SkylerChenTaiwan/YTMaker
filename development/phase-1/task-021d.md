# Task-021d: Dashboard 頁面整合 + 響應式設計

> **建立日期:** 2025-10-21
> **狀態:** ⏳ 未開始
> **預計時間:** 3 小時
> **優先級:** P0 (必須)
> **拆分自:** Task-021

---

## 關聯文件

### 產品設計
- **頁面設計:** `product-design/pages.md#Page-2-主控台-Dashboard`

### 技術規格
- **頁面規格:** `tech-specs/frontend/pages.md#2-主控台-Dashboard`
- **元件架構:** `tech-specs/frontend/component-architecture.md`
- **狀態管理:** `tech-specs/frontend/state-management.md`

### 相關任務
- **前置任務:** Task-021a ✅ (API 服務層), Task-021b ✅ (統計卡片), Task-021c ✅ (專案列表)
- **後續任務:** Task-029 (整合測試)
- **可並行:** 無 (必須等待 021a, 021b, 021c 完成)

---

## 任務目標

### 簡述
整合統計卡片和專案列表元件到 Dashboard 頁面,實作完整的狀態管理、錯誤處理、響應式設計。

### 成功標準
- [ ] Dashboard 頁面完整整合 StatsCards 和 ProjectList
- [ ] 使用 React Query 管理資料查詢
- [ ] 載入中狀態顯示骨架屏
- [ ] 錯誤狀態顯示錯誤訊息和重試按鈕
- [ ] 篩選/排序/分頁狀態管理正確
- [ ] 刪除專案後自動重新載入列表
- [ ] 響應式設計完成 (桌面/平板/手機)
- [ ] 整合測試通過
- [ ] 測試覆蓋率 > 80%

---

## 測試要求

### 整合測試

#### 測試 1: 完整頁面載入流程

```typescript
// tests/unit/app/page.integration.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import DashboardPage from '@/app/page'
import { projectsApi, statsApi } from '@/services/api'

jest.mock('@/services/api')
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}))

describe('DashboardPage Integration', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    jest.clearAllMocks()
  })

  it('should load statistics and projects successfully', async () => {
    const mockStats = {
      total_projects: 15,
      this_month_generated: 5,
      scheduled_videos: 3,
      api_quota: {
        did_remaining_minutes: 60,
        did_total_minutes: 90,
        youtube_remaining_units: 8000,
        youtube_total_units: 10000,
      },
    }

    const mockProjects = [
      {
        id: 'proj-001',
        project_name: '測試專案 1',
        status: 'COMPLETED' as const,
        created_at: '2025-01-15T10:00:00Z',
        updated_at: '2025-01-15T11:30:00Z',
      },
    ]

    ;(statsApi.getStats as jest.Mock).mockResolvedValue(mockStats)
    ;(projectsApi.getProjects as jest.Mock).mockResolvedValue({
      projects: mockProjects,
      pagination: { total: 1, limit: 20, offset: 0 },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <DashboardPage />
      </QueryClientProvider>
    )

    // 等待統計卡片載入
    await waitFor(() => {
      expect(screen.getByText('總影片數')).toBeInTheDocument()
      expect(screen.getByText('15')).toBeInTheDocument()
    })

    // 等待專案列表載入
    await waitFor(() => {
      expect(screen.getByText('測試專案 1')).toBeInTheDocument()
    })
  })
})
```

---

#### 測試 2: 篩選功能整合測試

```typescript
it('should filter projects when filter is changed', async () => {
  const mockAllProjects = [
    { id: 'proj-001', status: 'COMPLETED', ... },
    { id: 'proj-002', status: 'IN_PROGRESS', ... },
  ]

  const mockCompletedProjects = [
    { id: 'proj-001', status: 'COMPLETED', ... },
  ]

  ;(projectsApi.getProjects as jest.Mock)
    .mockResolvedValueOnce({
      projects: mockAllProjects,
      pagination: { total: 2, limit: 20, offset: 0 },
    })
    .mockResolvedValueOnce({
      projects: mockCompletedProjects,
      pagination: { total: 1, limit: 20, offset: 0 },
    })

  render(
    <QueryClientProvider client={queryClient}>
      <DashboardPage />
    </QueryClientProvider>
  )

  await waitFor(() => {
    expect(screen.getByText('proj-001')).toBeInTheDocument()
    expect(screen.getByText('proj-002')).toBeInTheDocument()
  })

  // 選擇篩選
  const filterSelect = screen.getByLabelText('狀態篩選')
  fireEvent.change(filterSelect, { target: { value: 'COMPLETED' } })

  // 驗證 API 被正確調用
  await waitFor(() => {
    expect(projectsApi.getProjects).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'COMPLETED',
      })
    )
  })
})
```

---

#### 測試 3: 刪除專案後重新載入

```typescript
it('should reload list after deleting project', async () => {
  window.confirm = jest.fn(() => true)

  ;(projectsApi.deleteProject as jest.Mock).mockResolvedValue({})
  ;(projectsApi.getProjects as jest.Mock).mockResolvedValue({
    projects: mockProjects,
    pagination: { total: 1, limit: 20, offset: 0 },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <DashboardPage />
    </QueryClientProvider>
  )

  await waitFor(() => {
    expect(screen.getByText('測試專案 1')).toBeInTheDocument()
  })

  // 點擊刪除
  const deleteButton = screen.getByLabelText('刪除專案')
  fireEvent.click(deleteButton)

  // 驗證 API 被調用
  await waitFor(() => {
    expect(projectsApi.deleteProject).toHaveBeenCalledWith('proj-001')
  })

  // 驗證列表重新載入
  expect(projectsApi.getProjects).toHaveBeenCalledTimes(2)
})
```

---

#### 測試 4: 錯誤處理

```typescript
it('should display error message when API fails', async () => {
  ;(projectsApi.getProjects as jest.Mock).mockRejectedValue(
    new Error('Network error')
  )

  render(
    <QueryClientProvider client={queryClient}>
      <DashboardPage />
    </QueryClientProvider>
  )

  await waitFor(() => {
    expect(screen.getByText('無法載入專案列表')).toBeInTheDocument()
  })

  const retryButton = screen.getByText('重新載入')
  expect(retryButton).toBeInTheDocument()
})
```

---

## 實作規格

### 完整 Dashboard 頁面: `app/page.tsx`

```typescript
// src/app/page.tsx
'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { StatsCards } from '@/components/feature/StatsCards'
import { ProjectList } from '@/components/feature/ProjectList'
import { projectsApi, statsApi } from '@/services/api'
import { PlusIcon } from '@heroicons/react/24/outline'

export default function DashboardPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState('updated_at')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')

  // 查詢統計資料
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery({
    queryKey: ['stats'],
    queryFn: () => statsApi.getStats(),
  })

  // 查詢專案列表
  const {
    data: projectsData,
    isLoading: projectsLoading,
    error: projectsError,
    refetch,
  } = useQuery({
    queryKey: ['projects', page, status, sortBy, order],
    queryFn: () =>
      projectsApi.getProjects({
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
    try {
      await projectsApi.deleteProject(projectId)
      // 重新載入列表
      refetch()
    } catch (error) {
      console.error('刪除失敗:', error)
      alert('刪除失敗,請稍後再試')
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold">主控台</h1>
          <button
            onClick={handleNewProject}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            新增專案
          </button>
        </div>

        {/* 統計卡片 */}
        {statsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-gray-200 animate-pulse rounded-lg h-32"
              />
            ))}
          </div>
        ) : statsError ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">無法載入統計資料</p>
          </div>
        ) : stats ? (
          <StatsCards stats={stats} className="mb-6" />
        ) : null}

        {/* 專案列表 */}
        {projectsLoading ? (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded" />
              ))}
            </div>
          </div>
        ) : projectsError ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-red-500 mb-4">無法載入專案列表</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              重新載入
            </button>
          </div>
        ) : projectsData ? (
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
        ) : null}
      </div>
    </AppLayout>
  )
}
```

---

## 開發指引

### TDD 開發流程

1. **撰寫整合測試 1-4** (40 分鐘)
2. **實作完整 Dashboard 頁面** (60 分鐘)
   - React Query 整合
   - 狀態管理
   - 事件處理
3. **實作響應式設計** (30 分鐘)
   - 桌面版佈局
   - 平板版調整
   - 手機版優化
4. **錯誤處理和載入狀態** (20 分鐘)
5. **手動測試與調整** (20 分鐘)
6. **最終驗證** (10 分鐘)

**總計:約 3 小時**

---

## 完成檢查清單

### 功能完整性
- [ ] 統計卡片正確顯示
- [ ] 專案列表正確顯示
- [ ] 篩選功能正常運作
- [ ] 排序功能正常運作
- [ ] 分頁功能正常運作
- [ ] 刪除功能正常運作
- [ ] 新增專案按鈕可跳轉
- [ ] 查看/繼續按鈕可跳轉

### 狀態處理
- [ ] 載入中狀態 (骨架屏)
- [ ] 錯誤狀態 (錯誤訊息 + 重試按鈕)
- [ ] 空狀態 (無專案時)

### 響應式設計
- [ ] 桌面版 (≥1024px): 標題按鈕橫排, 4 欄統計卡片
- [ ] 平板版 (768-1023px): 2x2 統計卡片
- [ ] 手機版 (<768px): 標題按鈕直排, 單欄統計卡片

### 測試
- [ ] 整合測試 1-4 全部通過
- [ ] 測試覆蓋率 > 80%

### 程式碼品質
- [ ] TypeScript 無錯誤
- [ ] ESLint 無錯誤
- [ ] 程式碼已格式化

---

## 注意事項

- ⚠️ 篩選/排序/分頁狀態變更時,頁面應重置為第 1 頁
- ⚠️ 刪除成功後顯示成功訊息 (使用 toast 或 alert)
- ⚠️ 所有錯誤都要有適當的錯誤訊息
- ⚠️ React Query 的 queryKey 要包含所有影響查詢的參數
