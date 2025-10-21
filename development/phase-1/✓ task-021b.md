# [v] Task-021b: Dashboard 統計卡片元件

> **建立日期:** 2025-10-21
> **完成日期:** 2025-10-21
> **狀態:** ✅ 已完成
> **實際時間:** 3 小時
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
- **前置任務:** Task-021a ✅ (API 服務層)
- **後續任務:** Task-021d (Dashboard 整合)
- **可並行:** Task-021c (專案列表元件)

---

## 任務目標

### 簡述
實作 Dashboard 統計卡片元件,顯示總影片數、本月生成數、已排程影片、API 配額等統計資訊。

### 成功標準
- [x] 統計卡片元件完成 (StatsCards)
- [x] 顯示 4 個統計卡片 (總影片數、本月生成數、已排程影片、API 配額)
- [x] API 配額顯示百分比和剩餘量
- [x] 配額不足時顯示警告顏色 (< 10% 顯示紅色)
- [x] 載入中狀態顯示骨架屏
- [x] 錯誤狀態顯示錯誤訊息
- [x] 響應式設計 (桌面 4 欄、平板 2x2、手機單欄)
- [x] 單元測試覆蓋率 > 80%

---

## 測試要求

### 單元測試

#### 測試 1: 統計卡片正確顯示

**目的:** 驗證統計卡片正確顯示所有資料

**測試程式碼:**
```typescript
// tests/unit/components/feature/StatsCards/StatsCards.test.tsx
import { render, screen } from '@testing-library/react'
import { StatsCards } from '@/components/feature/StatsCards'

describe('StatsCards', () => {
  const mockStats = {
    total_projects: 15,
    completed_projects: 12,
    in_progress_projects: 2,
    failed_projects: 1,
    this_month_generated: 5,
    scheduled_videos: 3,
    api_quota: {
      did_remaining_minutes: 60,
      did_total_minutes: 90,
      youtube_remaining_units: 8000,
      youtube_total_units: 10000,
    },
  }

  it('should display all statistics cards correctly', () => {
    render(<StatsCards stats={mockStats} />)

    // 驗證總影片數
    expect(screen.getByText('總影片數')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()

    // 驗證本月生成數
    expect(screen.getByText('本月生成數')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()

    // 驗證已排程影片
    expect(screen.getByText('已排程影片')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()

    // 驗證 API 配額
    expect(screen.getByText('API 配額剩餘')).toBeInTheDocument()
  })

  it('should calculate and display API quota percentage', () => {
    render(<StatsCards stats={mockStats} />)

    // D-ID 配額: 60/90 = 66.67%
    const quotaText = screen.getByText(/67%/)
    expect(quotaText).toBeInTheDocument()
  })

  it('should display quota details in subtitle', () => {
    render(<StatsCards stats={mockStats} />)

    // 驗證配額詳細資訊
    expect(screen.getByText(/D-ID: 60\/90 分鐘/)).toBeInTheDocument()
  })
})
```

---

#### 測試 2: 配額警告顏色

**目的:** 驗證配額不足時顯示警告顏色

**測試程式碼:**
```typescript
describe('StatsCards - Quota Warning', () => {
  it('should display red color when quota is less than 10%', () => {
    const lowQuotaStats = {
      total_projects: 15,
      completed_projects: 12,
      in_progress_projects: 2,
      failed_projects: 1,
      this_month_generated: 5,
      scheduled_videos: 3,
      api_quota: {
        did_remaining_minutes: 5,  // 5/90 = 5.56% < 10%
        did_total_minutes: 90,
        youtube_remaining_units: 500,
        youtube_total_units: 10000,
      },
    }

    const { container } = render(<StatsCards stats={lowQuotaStats} />)

    // 驗證有紅色圖示
    const redIcon = container.querySelector('.text-red-500')
    expect(redIcon).toBeInTheDocument()
  })

  it('should display orange color when quota is between 10-30%', () => {
    const mediumQuotaStats = {
      total_projects: 15,
      completed_projects: 12,
      in_progress_projects: 2,
      failed_projects: 1,
      this_month_generated: 5,
      scheduled_videos: 3,
      api_quota: {
        did_remaining_minutes: 20,  // 20/90 = 22.22%
        did_total_minutes: 90,
        youtube_remaining_units: 2000,
        youtube_total_units: 10000,
      },
    }

    const { container } = render(<StatsCards stats={mediumQuotaStats} />)

    // 驗證有橘色圖示
    const orangeIcon = container.querySelector('.text-orange-500')
    expect(orangeIcon).toBeInTheDocument()
  })
})
```

---

#### 測試 3: 響應式佈局

**目的:** 驗證不同螢幕尺寸下的佈局

**測試程式碼:**
```typescript
describe('StatsCards - Responsive Layout', () => {
  it('should have correct grid classes', () => {
    const { container } = render(<StatsCards stats={mockStats} />)

    const gridContainer = container.querySelector('.grid')
    expect(gridContainer).toHaveClass('grid-cols-1')  // 手機
    expect(gridContainer).toHaveClass('md:grid-cols-2')  // 平板
    expect(gridContainer).toHaveClass('lg:grid-cols-4')  // 桌面
  })
})
```

---

## 實作規格

### 需要建立的檔案

#### 1. 統計卡片元件: `components/feature/StatsCards/StatsCards.tsx`

```typescript
// src/components/feature/StatsCards/StatsCards.tsx
import React from 'react'
import {
  FilmIcon,
  CalendarIcon,
  ChartBarIcon,
  CloudIcon,
} from '@heroicons/react/24/outline'
import { Stats } from '@/services/api/stats'

export interface StatsCardsProps {
  stats: Stats
  className?: string
}

interface StatCard {
  title: string
  value: string | number
  subtitle?: string
  icon: typeof FilmIcon
  color: string
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats, className = '' }) => {
  // 計算 D-ID 配額百分比
  const didQuotaPercent = Math.round(
    (stats.api_quota.did_remaining_minutes / stats.api_quota.did_total_minutes) * 100
  )

  // 根據配額百分比決定顏色
  const getQuotaColor = (percent: number): string => {
    if (percent < 10) return 'red'
    if (percent < 30) return 'orange'
    return 'green'
  }

  const quotaColor = getQuotaColor(didQuotaPercent)

  const cards: StatCard[] = [
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
      value: `${didQuotaPercent}%`,
      subtitle: `D-ID: ${stats.api_quota.did_remaining_minutes}/${stats.api_quota.did_total_minutes} 分鐘`,
      icon: CloudIcon,
      color: quotaColor,
    },
  ]

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {cards.map((card, index) => (
        <div
          key={index}
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-1">{card.title}</p>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              {card.subtitle && (
                <p className="text-xs text-gray-500 mt-1">{card.subtitle}</p>
              )}
            </div>
            <card.icon className={`w-12 h-12 text-${card.color}-500`} />
          </div>
        </div>
      ))}
    </div>
  )
}
```

---

#### 2. 元件匯出: `components/feature/StatsCards/index.ts`

```typescript
// src/components/feature/StatsCards/index.ts
export { StatsCards } from './StatsCards'
export type { StatsCardsProps } from './StatsCards'
```

---

#### 3. Dashboard 頁面 (部分): `app/page.tsx`

```typescript
// src/app/page.tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { StatsCards } from '@/components/feature/StatsCards'
import { statsApi } from '@/services/api'

export default function DashboardPage() {
  // 查詢統計資料
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['stats'],
    queryFn: () => statsApi.getStats(),
  })

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">主控台</h1>
        </div>

        {/* 統計卡片 */}
        {statsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 animate-pulse rounded-lg h-32" />
            ))}
          </div>
        ) : statsError ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">無法載入統計資料</p>
          </div>
        ) : stats ? (
          <StatsCards stats={stats} className="mb-6" />
        ) : null}

        {/* 專案列表 (Task-021c, 021d 實作) */}
        <p className="text-gray-600">專案列表將在 Task-021c 實作</p>
      </div>
    </AppLayout>
  )
}
```

---

## 開發指引

### TDD 開發流程

#### 第 1 步：建立測試檔案 (10 分鐘)
1. 建立 `tests/unit/components/feature/StatsCards/StatsCards.test.tsx`
2. 設定測試環境

#### 第 2 步：撰寫測試 1 (20 分鐘)
1. 撰寫「統計卡片正確顯示」測試
2. 執行測試 → 失敗 ❌

#### 第 3 步：實作 StatsCards 元件基礎 (30 分鐘)
1. 建立 `src/components/feature/StatsCards/StatsCards.tsx`
2. 實作基本結構和 4 個卡片
3. 顯示標題和數值
4. 執行測試 → 通過 ✅

#### 第 4 步：撰寫測試 2 (15 分鐘)
1. 撰寫「配額警告顏色」測試
2. 執行測試 → 失敗 ❌

#### 第 5 步：實作配額警告邏輯 (20 分鐘)
1. 實作 `getQuotaColor` 函數
2. 動態設定圖示顏色
3. 執行測試 → 通過 ✅

#### 第 6 步：撰寫測試 3 (10 分鐘)
1. 撰寫「響應式佈局」測試
2. 執行測試 → 失敗 ❌

#### 第 7 步：實作響應式佈局 (15 分鐘)
1. 加入 Tailwind CSS 響應式 class
2. 測試不同螢幕尺寸
3. 執行測試 → 通過 ✅

#### 第 8 步：整合到 Dashboard 頁面 (30 分鐘)
1. 修改 `src/app/page.tsx`
2. 使用 React Query 查詢統計資料
3. 加入載入中和錯誤狀態
4. 手動測試頁面

#### 第 9 步：優化與重構 (20 分鐘)
1. 提取共用邏輯
2. 優化效能 (React.memo)
3. 加入 JSDoc 註解

#### 第 10 步：最終驗證 (10 分鐘)
1. 執行所有測試
2. 檢查測試覆蓋率
3. TypeScript 檢查
4. Linter 檢查

---

## 完成檢查清單

### 功能完整性
- [x] 顯示 4 個統計卡片
- [x] 總影片數顯示正確
- [x] 本月生成數顯示正確
- [x] 已排程影片顯示正確
- [x] API 配額百分比計算正確
- [x] 配額詳細資訊顯示正確

### 視覺效果
- [x] 卡片有適當的間距和圓角
- [x] Hover 效果正確
- [x] 圖示顏色正確
- [x] 配額警告顏色正確 (< 10% 紅色, < 30% 橘色)

### 響應式設計
- [x] 桌面 (≥1024px): 4 欄
- [x] 平板 (768-1023px): 2x2 網格
- [x] 手機 (<768px): 單欄

### 狀態處理
- [x] 載入中顯示骨架屏
- [x] 錯誤狀態顯示錯誤訊息

### 測試
- [x] 測試 1 通過: 統計卡片正確顯示
- [x] 測試 2 通過: 配額警告顏色
- [x] 測試 3 通過: 響應式佈局
- [x] 測試覆蓋率 > 80%

### 程式碼品質
- [x] TypeScript 無錯誤
- [x] ESLint 無錯誤
- [x] 程式碼已格式化
- [x] 元件有 JSDoc 註解

---

## 預估時間分配

- 測試撰寫：45 分鐘
- StatsCards 元件實作：65 分鐘
- Dashboard 頁面整合：30 分鐘
- 優化與重構：20 分鐘
- 最終驗證：10 分鐘

**總計：約 3 小時**
