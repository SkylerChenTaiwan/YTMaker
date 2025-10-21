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
  } as const

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
