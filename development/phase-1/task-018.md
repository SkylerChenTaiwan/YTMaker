# Task-018: 主控台頁面 (/dashboard)

> **建立日期:** 2025-01-19  
> **狀態:** ⏳ 未開始  
> **預計時間:** 10 小時  
> **優先級:** P0

---

## 關聯文件

### 技術規格
- **路由設計:** `tech-specs/frontend/routing.md`
- **狀態管理:** `tech-specs/frontend/state-management.md`
- **元件架構:** `tech-specs/frontend/component-architecture.md`

### 產品設計
- **主控台流程:** `product-design/flows.md` (進入點for all flows)

### 相關任務
- **前置任務:** Task-016 (Axios 客戶端)
- **後續任務:** Task-019 (新增專案流程), Task-020 (進度監控)
- **並行任務:** Task-017, Task-021, Task-022

---

## 任務目標

### 簡述
實作主控台頁面,顯示所有專案列表,支援篩選、排序、分頁、搜尋,提供快速操作入口。

### 詳細說明
本任務負責實作系統的主控台頁面,包括:
- 專案卡片列表展示 (網格或列表視圖)
- 篩選功能 (狀態、日期範圍)
- 排序功能 (建立時間、更新時間、標題)
- 搜尋功能 (標題、內容)
- 分頁功能
- 快速操作 (查看、編輯、刪除、重新生成)
- 統計資訊 (總專案數、各狀態數量)
- 空狀態設計

### 成功標準
- [ ] 專案列表正確顯示
- [ ] 篩選功能正常運作
- [ ] 排序功能正常運作
- [ ] 搜尋功能正常運作
- [ ] 分頁功能正常運作
- [ ] 快速操作按鈕正確觸發
- [ ] 響應式設計 (桌面/平板/手機)
- [ ] 骨架屏 loading 狀態
- [ ] 單元測試覆蓋率 > 80%

---

## 測試要求

### 單元測試

#### 測試 1: 專案列表渲染

**測試檔案:** `tests/unit/pages/dashboard.test.tsx`

```typescript
import { render, screen } from '@testing-library/react'
import DashboardPage from '@/app/dashboard/page'
import { useProjectStore } from '@/stores/useProjectStore'

jest.mock('@/stores/useProjectStore')

describe('Dashboard Page', () => {
  test('應該渲染專案列表', () => {
    const mockProjects = [
      { id: '1', title: '專案A', status: 'draft', created_at: '2025-01-19' },
      { id: '2', title: '專案B', status: 'completed', created_at: '2025-01-18' }
    ]
    
    ;(useProjectStore as unknown as jest.Mock).mockReturnValue({
      filteredProjects: mockProjects,
      filter: {},
      setFilter: jest.fn()
    })

    render(<DashboardPage />)
    
    expect(screen.getByText('專案A')).toBeInTheDocument()
    expect(screen.getByText('專案B')).toBeInTheDocument()
  })

  test('應該顯示空狀態when無專案', () => {
    ;(useProjectStore as unknown as jest.Mock).mockReturnValue({
      filteredProjects: [],
      filter: {},
      setFilter: jest.fn()
    })

    render(<DashboardPage />)
    
    expect(screen.getByText(/尚無專案/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /新增專案/i })).toBeInTheDocument()
  })
})
```

#### 測試 2: 篩選與排序功能

**測試檔案:** `tests/unit/components/ProjectFilters.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { ProjectFilters } from '@/app/dashboard/components/ProjectFilters'

describe('ProjectFilters', () => {
  test('應該觸發狀態篩選', () => {
    const onFilterChange = jest.fn()
    
    render(<ProjectFilters filter={{}} onFilterChange={onFilterChange} />)
    
    const statusSelect = screen.getByLabelText(/狀態/i)
    fireEvent.change(statusSelect, { target: { value: 'completed' } })
    
    expect(onFilterChange).toHaveBeenCalledWith({ status: 'completed' })
  })

  test('應該觸發搜尋', () => {
    const onFilterChange = jest.fn()
    
    render(<ProjectFilters filter={{}} onFilterChange={onFilterChange} />)
    
    const searchInput = screen.getByPlaceholderText(/搜尋專案/i)
    fireEvent.change(searchInput, { target: { value: '測試' } })
    
    // Debounced
    setTimeout(() => {
      expect(onFilterChange).toHaveBeenCalledWith({ search: '測試' })
    }, 500)
  })
})
```

---

## 實作規格

### 主要檔案

#### 1. Dashboard 主頁面
**檔案:** `frontend/src/app/dashboard/page.tsx`

```typescript
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Spin } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useProjectStore } from '@/stores/useProjectStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { projectsApi } from '@/services/api/projects'
import { ProjectGrid } from './components/ProjectGrid'
import { ProjectFilters } from './components/ProjectFilters'
import { ProjectStats } from './components/ProjectStats'
import { EmptyState } from './components/EmptyState'

export default function DashboardPage() {
  const router = useRouter()
  const {
    projects,
    filteredProjects,
    filter,
    sortBy,
    sortOrder,
    setFilter,
    setSorting
  } = useProjectStore()
  const setupCompleted = useAuthStore(state => state.setupCompleted)

  useEffect(() => {
    if (!setupCompleted) {
      router.push('/setup')
    }
  }, [setupCompleted, router])

  useEffect(() => {
    // 載入專案列表
    projectsApi.getProjects().then(data => {
      // 更新 store (假設有 setProjects action)
    })
  }, [])

  if (projects.length === 0) {
    return <EmptyState onCreateProject={() => router.push('/project/new')} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">我的專案</h1>
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={() => router.push('/project/new')}
          >
            新增專案
          </Button>
        </div>

        <ProjectStats projects={projects} />
        
        <ProjectFilters
          filter={filter}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onFilterChange={setFilter}
          onSortChange={setSorting}
        />

        <ProjectGrid projects={filteredProjects} />
      </div>
    </div>
  )
}
```

#### 2. 專案卡片元件
**檔案:** `frontend/src/app/dashboard/components/ProjectCard.tsx`

```typescript
'use client'

import { Card, Tag, Dropdown, Button } from 'antd'
import { EllipsisOutlined, PlayCircleOutlined, DeleteOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import type { Project } from '@/stores/useProjectStore'

interface ProjectCardProps {
  project: Project
  onDelete: (id: string) => void
  onRetry: (id: string) => void
}

const statusColors = {
  draft: 'default',
  generating: 'processing',
  completed: 'success',
  failed: 'error',
  cancelled: 'default'
}

const statusLabels = {
  draft: '草稿',
  generating: '生成中',
  completed: '已完成',
  failed: '失敗',
  cancelled: '已取消'
}

export function ProjectCard({ project, onDelete, onRetry }: ProjectCardProps) {
  const router = useRouter()

  const menuItems = [
    {
      key: 'view',
      label: '查看詳情',
      onClick: () => router.push(`/project/${project.id}`)
    },
    {
      key: 'edit',
      label: '編輯',
      onClick: () => router.push(`/project/${project.id}/edit`)
    },
    {
      key: 'retry',
      label: '重新生成',
      disabled: project.status !== 'failed',
      onClick: () => onRetry(project.id)
    },
    {
      type: 'divider'
    },
    {
      key: 'delete',
      label: '刪除',
      danger: true,
      onClick: () => onDelete(project.id)
    }
  ]

  return (
    <Card
      hoverable
      cover={
        project.youtube_video_id ? (
          <img
            alt={project.title}
            src={`https://img.youtube.com/vi/${project.youtube_video_id}/mqdefault.jpg`}
          />
        ) : (
          <div className="h-48 bg-gray-200 flex items-center justify-center">
            <PlayCircleOutlined style={{ fontSize: 48, color: '#999' }} />
          </div>
        )
      }
      actions={[
        <Dropdown menu={{ items: menuItems }} key="more">
          <Button type="text" icon={<EllipsisOutlined />} />
        </Dropdown>
      ]}
    >
      <Card.Meta
        title={project.title}
        description={
          <>
            <Tag color={statusColors[project.status]}>
              {statusLabels[project.status]}
            </Tag>
            <div className="text-gray-500 text-sm mt-2">
              {new Date(project.created_at).toLocaleDateString('zh-TW')}
            </div>
          </>
        }
      />
    </Card>
  )
}
```

#### 3. 篩選元件
**檔案:** `frontend/src/app/dashboard/components/ProjectFilters.tsx`

```typescript
'use client'

import { Input, Select, Radio } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { debounce } from 'lodash'

interface ProjectFiltersProps {
  filter: any
  sortBy: string
  sortOrder: 'asc' | 'desc'
  onFilterChange: (filter: any) => void
  onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void
}

export function ProjectFilters({
  filter,
  sortBy,
  sortOrder,
  onFilterChange,
  onSortChange
}: ProjectFiltersProps) {
  const handleSearch = debounce((value: string) => {
    onFilterChange({ ...filter, search: value })
  }, 500)

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          placeholder="搜尋專案標題或內容"
          prefix={<SearchOutlined />}
          onChange={(e) => handleSearch(e.target.value)}
          allowClear
        />
        
        <Select
          placeholder="選擇狀態"
          value={filter.status}
          onChange={(value) => onFilterChange({ ...filter, status: value })}
          allowClear
          options={[
            { label: '草稿', value: 'draft' },
            { label: '生成中', value: 'generating' },
            { label: '已完成', value: 'completed' },
            { label: '失敗', value: 'failed' },
            { label: '已取消', value: 'cancelled' }
          ]}
        />

        <div>
          <span className="text-gray-600 mr-2">排序:</span>
          <Radio.Group
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [newSortBy, newSortOrder] = e.target.value.split('-')
              onSortChange(newSortBy, newSortOrder as 'asc' | 'desc')
            }}
            optionType="button"
            buttonStyle="solid"
            options={[
              { label: '最新', value: 'created_at-desc' },
              { label: '最舊', value: 'created_at-asc' },
              { label: '標題A-Z', value: 'title-asc' },
              { label: '標題Z-A', value: 'title-desc' }
            ]}
          />
        </div>
      </div>
    </div>
  )
}
```

---

## 開發指引

### 開發步驟

1. **建立頁面結構** (2 小時)
2. **實作專案卡片** (2.5 小時)
3. **實作篩選功能** (2 小時)
4. **實作統計元件** (1.5 小時)
5. **測試與優化** (2 小時)

---

## 完成檢查清單

### 開發完成
- [ ] Dashboard 主頁面完成
- [ ] ProjectCard 元件完成
- [ ] ProjectFilters 元件完成
- [ ] ProjectStats 元件完成
- [ ] EmptyState 元件完成

### 測試完成
- [ ] 列表渲染測試通過
- [ ] 篩選功能測試通過
- [ ] 排序功能測試通過
- [ ] 測試覆蓋率 > 80%

### Git
- [ ] 程式碼已 commit
- [ ] 已推送到 remote

---

## 時間分配建議

- **頁面結構:** 2 小時
- **專案卡片:** 2.5 小時
- **篩選功能:** 2 小時
- **統計元件:** 1.5 小時
- **測試與優化:** 2 小時

**總計:** 10 小時
