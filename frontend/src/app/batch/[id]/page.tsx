'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { useBatchStore } from '@/store/useBatchStore'
import * as batchApi from '@/services/batchApi'
import { BatchStatusTag } from '@/components/batch/BatchStatusTag'
import { ProjectStatusTag } from '@/components/batch/ProjectStatusTag'
import { ProgressBar } from '@/components/ui/ProgressBar'
import {
  PauseCircleIcon,
  PlayCircleIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline'
import { toast } from 'sonner'

export default function BatchDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const batchId = params.id
  const { currentBatch, setCurrentBatch, setLoading, setError } = useBatchStore()
  const [loading, setLocalLoading] = useState(true)
  const [error, setLocalError] = useState<string | null>(null)
  const pollingInterval = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadBatchDetail()

    // 設定輪詢 - 每 3 秒更新一次
    pollingInterval.current = setInterval(() => {
      loadBatchDetail(true) // silent reload
    }, 3000)

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current)
      }
    }
  }, [batchId])

  const loadBatchDetail = async (silent = false) => {
    if (!silent) {
      setLocalLoading(true)
    }
    setLocalError(null)

    try {
      const response = await batchApi.getBatchDetail(batchId)
      setCurrentBatch(response)
      setError(null)

      // 如果批次已完成或失敗,停止輪詢
      if (response.status === 'COMPLETED' || response.status === 'FAILED') {
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current)
        }
      }
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : '載入批次任務失敗'
      setLocalError(errorMessage)
      setError(errorMessage)

      if (err?.response?.status === 404) {
        // 404 錯誤
      } else if (!silent) {
        toast.error(errorMessage)
      }
    } finally {
      if (!silent) {
        setLocalLoading(false)
      }
    }
  }

  const handlePause = async () => {
    if (!window.confirm('確定要暫停此批次任務嗎？進行中的專案會暫停,可稍後繼續執行。')) {
      return
    }

    try {
      await batchApi.pauseBatchTask(batchId)
      toast.success('批次任務已暫停')
      loadBatchDetail()
    } catch (err) {
      toast.error('暫停失敗')
    }
  }

  const handleResume = async () => {
    if (!window.confirm('確定要繼續執行此批次任務嗎？')) {
      return
    }

    try {
      await batchApi.resumeBatchTask(batchId)
      toast.success('批次任務已繼續')
      loadBatchDetail()
    } catch (err) {
      toast.error('繼續失敗')
    }
  }

  const handleRetryFailed = async () => {
    const failedCount = currentBatch?.projects.filter((p) => p.status === 'FAILED').length || 0

    if (failedCount === 0) {
      toast.info('沒有失敗的專案需要重試')
      return
    }

    if (!window.confirm(`確定要重試 ${failedCount} 個失敗的專案嗎？`)) {
      return
    }

    try {
      await batchApi.retryFailedProjects(batchId)
      toast.success(`正在重試 ${failedCount} 個失敗的專案`)
      loadBatchDetail()
    } catch (err) {
      toast.error('重試失敗')
    }
  }

  const handleDownloadReport = async () => {
    try {
      const blob = await batchApi.downloadBatchReport(batchId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `batch-${batchId}-report.csv`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('報告下載成功')
    } catch (err) {
      toast.error('下載報告失敗')
    }
  }

  // 載入中
  if (loading) {
    return (
      <AppLayout>
        <div className="p-6">
          <Breadcrumb
            items={[
              { label: '主控台', href: '/' },
              { label: '批次處理', href: '/batch' },
              { label: '載入中...' },
            ]}
          />
          <div className="grid grid-cols-1 gap-4 mt-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-200 animate-pulse rounded-lg h-32" />
            ))}
          </div>
        </div>
      </AppLayout>
    )
  }

  // 錯誤或 404
  if (error || !currentBatch) {
    return (
      <AppLayout>
        <div className="p-6">
          <Breadcrumb
            items={[
              { label: '主控台', href: '/' },
              { label: '批次處理', href: '/batch' },
              { label: '錯誤' },
            ]}
          />
          <div className="flex flex-col items-center justify-center h-96">
            <h2 className="text-xl font-semibold mb-4">找不到此批次任務</h2>
            <p className="text-gray-600 mb-6">{error || '此批次任務不存在或已被刪除'}</p>
            <button
              onClick={() => router.push('/batch')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              返回批次列表
            </button>
          </div>
        </div>
      </AppLayout>
    )
  }

  const completionPercentage = Math.round(
    (currentBatch.completed_projects / currentBatch.total_projects) * 100
  )

  return (
    <AppLayout>
      <div className="p-6">
        {/* 麵包屑 */}
        <Breadcrumb
          items={[
            { label: '主控台', href: '/' },
            { label: '批次處理', href: '/batch' },
            { label: currentBatch.task_name },
          ]}
        />

        {/* 批次資訊卡片 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6 mt-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">{currentBatch.task_name}</h1>
              <div className="flex items-center gap-3 flex-wrap">
                <BatchStatusTag status={currentBatch.status} />
                <span className="text-sm text-gray-600">
                  總進度：
                  <span className="font-semibold text-green-600">
                    {currentBatch.completed_projects}
                  </span>
                  {' / '}
                  {currentBatch.total_projects}
                  {currentBatch.failed_projects > 0 && (
                    <span className="text-red-600">
                      {' '}
                      ({currentBatch.failed_projects} 失敗)
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* 操作按鈕 */}
            <div className="flex gap-2 flex-wrap">
              {currentBatch.status === 'RUNNING' && (
                <button
                  onClick={handlePause}
                  className="flex items-center gap-2 px-4 py-2 border border-yellow-300 text-yellow-700 rounded-lg hover:bg-yellow-50 transition-colors"
                >
                  <PauseCircleIcon className="w-5 h-5" />
                  暫停批次
                </button>
              )}

              {currentBatch.status === 'PAUSED' && (
                <button
                  onClick={handleResume}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <PlayCircleIcon className="w-5 h-5" />
                  繼續批次
                </button>
              )}

              {currentBatch.failed_projects > 0 && (
                <button
                  onClick={handleRetryFailed}
                  className="flex items-center gap-2 px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <ArrowPathIcon className="w-5 h-5" />
                  重試失敗任務
                </button>
              )}

              <button
                onClick={handleDownloadReport}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
                下載報告
              </button>

              <button
                onClick={() => router.push('/batch')}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5" />
                返回
              </button>
            </div>
          </div>

          {/* 總進度條 */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">整體進度</span>
              <span className="text-sm font-semibold text-gray-900">{completionPercentage}%</span>
            </div>
            <ProgressBar
              value={completionPercentage}
              status={
                currentBatch.status === 'FAILED'
                  ? 'error'
                  : currentBatch.status === 'COMPLETED'
                  ? 'success'
                  : 'normal'
              }
            />
          </div>
        </div>

        {/* 專案列表 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">專案列表</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    專案名稱
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    狀態
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    進度
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    YouTube
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    錯誤訊息
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentBatch.projects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{project.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <ProjectStatusTag status={project.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-20">
                          <ProgressBar value={project.progress} />
                        </div>
                        <span className="text-sm text-gray-600">{project.progress}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {project.youtube_url ? (
                        <a
                          href={project.youtube_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          查看影片
                        </a>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {project.error_message ? (
                        <div className="text-sm text-red-600 max-w-xs truncate" title={project.error_message}>
                          {project.error_message}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
