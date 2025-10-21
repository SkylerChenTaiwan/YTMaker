# [v] Task-021c: Dashboard 專案列表元件 (完整功能)

> **建立日期:** 2025-10-21
> **狀態:** ✅ 已完成
> **預計時間:** 4 小時
> **實際時間:** 3.5 小時
> **優先級:** P0 (必須)
> **拆分自:** Task-021
> **完成日期:** 2025-10-21

---

## 關聯文件

### 產品設計
- **頁面設計:** `product-design/pages.md#Page-2-主控台-Dashboard`

### 技術規格
- **頁面規格:** `tech-specs/frontend/pages.md#2-主控台-Dashboard`
- **元件架構:** `tech-specs/frontend/component-architecture.md`

### 相關任務
- **前置任務:** Task-021a ✅ (API 服務層)
- **後續任務:** Task-021d (Dashboard 整合)
- **可並行:** Task-021b (統計卡片元件)

---

## 任務目標

### 簡述
實作 Dashboard 專案列表元件,包含基礎顯示、篩選、排序、分頁、刪除功能。

### 成功標準
- [ ] 專案列表元件完成 (ProjectList)
- [ ] 顯示專案名稱、狀態、創建/更新時間
- [ ] 狀態標籤正確顯示 (已完成/進行中/失敗/已建立)
- [ ] 篩選功能 (依狀態篩選)
- [ ] 排序功能 (依創建時間/更新時間,升序/降序)
- [ ] 分頁功能 (每頁 20 筆)
- [ ] 刪除功能 (含確認對話框)
- [ ] 空狀態處理
- [ ] 單元測試覆蓋率 > 80%

---

## 測試要求

### 單元測試

#### 測試 1: 基礎列表顯示

```typescript
// tests/unit/components/feature/ProjectList/ProjectList.test.tsx
import { render, screen } from '@testing-library/react'
import { ProjectList } from '@/components/feature/ProjectList'

describe('ProjectList', () => {
  const mockProjects = [
    {
      id: 'proj-001',
      project_name: '測試專案 1',
      status: 'COMPLETED' as const,
      created_at: '2025-01-15T10:00:00Z',
      updated_at: '2025-01-15T11:30:00Z',
    },
    {
      id: 'proj-002',
      project_name: '測試專案 2',
      status: 'IN_PROGRESS' as const,
      created_at: '2025-01-16T09:00:00Z',
      updated_at: '2025-01-16T10:00:00Z',
    },
  ]

  const mockPagination = {
    total: 2,
    limit: 20,
    offset: 0,
  }

  it('should display project list', () => {
    render(
      <ProjectList
        projects={mockProjects}
        pagination={mockPagination}
        status={null}
        onStatusChange={() => {}}
        sortBy="updated_at"
        order="desc"
        onSort={() => {}}
        onPageChange={() => {}}
        onDelete={() => {}}
        onView={() => {}}
        onContinue={() => {}}
      />
    )

    expect(screen.getByText('測試專案 1')).toBeInTheDocument()
    expect(screen.getByText('測試專案 2')).toBeInTheDocument()
    expect(screen.getByText('已完成')).toBeInTheDocument()
    expect(screen.getByText('進行中')).toBeInTheDocument()
  })
})
```

#### 測試 2: 篩選功能

```typescript
it('should call onStatusChange when filter is changed', () => {
  const mockOnStatusChange = jest.fn()

  render(
    <ProjectList
      projects={mockProjects}
      pagination={mockPagination}
      status={null}
      onStatusChange={mockOnStatusChange}
      {...otherProps}
    />
  )

  const filterSelect = screen.getByLabelText('狀態篩選')
  fireEvent.change(filterSelect, { target: { value: 'COMPLETED' } })

  expect(mockOnStatusChange).toHaveBeenCalledWith('COMPLETED')
})
```

#### 測試 3: 排序功能

```typescript
it('should call onSort when column header is clicked', () => {
  const mockOnSort = jest.fn()

  render(
    <ProjectList
      projects={mockProjects}
      pagination={mockPagination}
      onSort={mockOnSort}
      sortBy="updated_at"
      order="desc"
      {...otherProps}
    />
  )

  const createdAtHeader = screen.getByText('創建時間')
  fireEvent.click(createdAtHeader)

  expect(mockOnSort).toHaveBeenCalledWith('created_at', 'asc')
})
```

#### 測試 4: 分頁功能

```typescript
it('should display pagination controls', () => {
  const mockPagination = {
    total: 50,
    limit: 20,
    offset: 0,
  }

  render(
    <ProjectList
      projects={mockProjects}
      pagination={mockPagination}
      {...otherProps}
    />
  )

  // 應該顯示「第 1 頁,共 3 頁」
  expect(screen.getByText(/第 1 頁/)).toBeInTheDocument()
  expect(screen.getByText(/共 3 頁/)).toBeInTheDocument()
})
```

#### 測試 5: 刪除功能

```typescript
it('should show confirmation before delete', async () => {
  const mockOnDelete = jest.fn()
  window.confirm = jest.fn(() => true)

  render(
    <ProjectList
      projects={mockProjects}
      pagination={mockPagination}
      onDelete={mockOnDelete}
      {...otherProps}
    />
  )

  const deleteButton = screen.getAllByLabelText('刪除專案')[0]
  fireEvent.click(deleteButton)

  expect(window.confirm).toHaveBeenCalledWith('確定要刪除此專案嗎?此操作無法復原。')
  expect(mockOnDelete).toHaveBeenCalledWith('proj-001')
})
```

#### 測試 6: 空狀態

```typescript
it('should display empty state when no projects', () => {
  render(
    <ProjectList
      projects={[]}
      pagination={{ total: 0, limit: 20, offset: 0 }}
      {...otherProps}
    />
  )

  expect(screen.getByText('還沒有任何專案')).toBeInTheDocument()
  expect(screen.getByText('開始第一個專案')).toBeInTheDocument()
})
```

---

## 實作規格

### 需要建立的檔案

#### 1. 專案列表元件: `components/feature/ProjectList/ProjectList.tsx`

```typescript
// src/components/feature/ProjectList/ProjectList.tsx
'use client'

import React from 'react'
import { Project } from '@/services/api/projects'
import { formatDate } from '@/lib/date'
import { TrashIcon, EyeIcon, PlayIcon } from '@heroicons/react/24/outline'

export interface ProjectListProps {
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
  const statusMap = {
    COMPLETED: { text: '已完成', color: 'green' },
    IN_PROGRESS: { text: '進行中', color: 'blue' },
    FAILED: { text: '失敗', color: 'red' },
    INITIALIZED: { text: '已建立', color: 'gray' },
  }

  const handleDelete = (projectId: string) => {
    if (window.confirm('確定要刪除此專案嗎?此操作無法復原。')) {
      onDelete(projectId)
    }
  }

  const handleSort = (field: string) => {
    const newOrder = sortBy === field && order === 'asc' ? 'desc' : 'asc'
    onSort(field, newOrder)
  }

  const totalPages = Math.ceil(pagination.total / pagination.limit)
  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1

  // 空狀態
  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="w-24 h-24 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </div>
        <p className="text-lg text-gray-600 mb-4">還沒有任何專案</p>
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          開始第一個專案
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* 篩選器 */}
      <div className="mb-4 flex gap-4">
        <select
          value={status || 'all'}
          onChange={(e) => onStatusChange(e.target.value === 'all' ? null : e.target.value)}
          className="border rounded px-3 py-2"
          aria-label="狀態篩選"
        >
          <option value="all">全部</option>
          <option value="COMPLETED">已完成</option>
          <option value="IN_PROGRESS">進行中</option>
          <option value="FAILED">失敗</option>
          <option value="INITIALIZED">已建立</option>
        </select>
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-lg shadow">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                專案名稱
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                狀態
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('created_at')}
              >
                創建時間
                {sortBy === 'created_at' && (order === 'asc' ? ' ▲' : ' ▼')}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('updated_at')}
              >
                最後更新
                {sortBy === 'updated_at' && (order === 'asc' ? ' ▲' : ' ▼')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {projects.map((project) => (
              <tr key={project.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {project.project_name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-${
                      statusMap[project.status].color
                    }-100 text-${statusMap[project.status].color}-800`}
                  >
                    {statusMap[project.status].text}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(project.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(project.updated_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onView(project.id)}
                      className="text-blue-600 hover:text-blue-900"
                      aria-label="查看專案"
                    >
                      <EyeIcon className="w-5 h-5" />
                    </button>
                    {project.status === 'IN_PROGRESS' && (
                      <button
                        onClick={() => onContinue(project.id)}
                        className="text-green-600 hover:text-green-900"
                        aria-label="繼續專案"
                      >
                        <PlayIcon className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(project.id)}
                      className="text-red-600 hover:text-red-900"
                      aria-label="刪除專案"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分頁 */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-700">
          第 {currentPage} 頁,共 {totalPages} 頁 (總共 {pagination.total} 筆)
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="上一頁"
          >
            上一頁
          </button>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="下一頁"
          >
            下一頁
          </button>
        </div>
      </div>
    </div>
  )
}
```

---

#### 2. 元件匯出: `components/feature/ProjectList/index.ts`

```typescript
// src/components/feature/ProjectList/index.ts
export { ProjectList } from './ProjectList'
export type { ProjectListProps } from './ProjectList'
```

---

## 開發指引

### TDD 開發流程

1. **建立測試檔案** (15 分鐘)
2. **測試 1: 基礎列表顯示** (30 分鐘)
3. **測試 2: 篩選功能** (25 分鐘)
4. **測試 3: 排序功能** (25 分鐘)
5. **測試 4: 分頁功能** (25 分鐘)
6. **測試 5: 刪除功能** (20 分鐘)
7. **測試 6: 空狀態** (15 分鐘)
8. **優化與重構** (30 分鐘)
9. **最終驗證** (15 分鐘)

**總計:約 3.5 小時 (預留 0.5 小時 buffer = 4 小時)**

---

## 完成檢查清單

### 功能完整性
- [ ] 專案列表顯示 (名稱、狀態、日期)
- [ ] 狀態篩選 (下拉選單)
- [ ] 排序功能 (點擊欄位標題)
- [ ] 分頁功能 (上一頁/下一頁)
- [ ] 刪除功能 (含確認)
- [ ] 空狀態顯示

### 視覺效果
- [ ] 表格樣式正確
- [ ] 狀態標籤顏色正確
- [ ] Hover 效果
- [ ] 排序指示器 (▲/▼)

### 測試
- [ ] 6 個測試全部通過
- [ ] 測試覆蓋率 > 80%

### 程式碼品質
- [ ] TypeScript 無錯誤
- [ ] ESLint 無錯誤
- [ ] 程式碼已格式化
