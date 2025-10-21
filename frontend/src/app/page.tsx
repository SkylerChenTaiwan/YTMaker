// src/app/page.tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { StatsCards } from '@/components/feature/StatsCards'
import { statsApi } from '@/services/api'

export default function DashboardPage() {
  // 查詢統計資料
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery({
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
