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
