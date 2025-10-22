'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { useBatchStore } from '@/store/useBatchStore'
import * as batchApi from '@/services/batchApi'
import { BatchStatusTag } from '@/components/batch/BatchStatusTag'
import { CreateBatchModal } from '@/components/batch/CreateBatchModal'
import { FolderOpenIcon, PlusIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline'
import { toast } from 'sonner'
import type { BatchTask } from '@/types/api'

export default function BatchPage() {
  const router = useRouter()
  const { batches, loading, error, setBatches, setLoading, setError } = useBatchStore()
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    loadBatches()
  }, [])

  const loadBatches = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await batchApi.getBatchTasks()
      setBatches(response.batches)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '載入批次任務失敗'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handlePauseBatch = async (batchId: string) => {
    if (!window.confirm('確定要暫停此批次任務嗎？')) return

    try {
      await batchApi.pauseBatchTask(batchId)
      toast.success('批次任務已暫停')
      loadBatches()
    } catch (err) {
      toast.error('暫停失敗')
    }
  }

  const handleResumeBatch = async (batchId: string) => {
    if (!window.confirm('確定要繼續執行此批次任務嗎？')) return

    try {
      await batchApi.resumeBatchTask(batchId)
      toast.success('批次任務已繼續')
      loadBatches()
    } catch (err) {
      toast.error('繼續失敗')
    }
  }

  const handleDeleteBatch = async (batchId: string) => {
    if (!window.confirm('確定要刪除此批次任務嗎？此操作無法復原。')) return

    try {
      await batchApi.deleteBatchTask(batchId)
      toast.success('批次任務已刪除')
      loadBatches()
    } catch (err) {
      toast.error('刪除失敗')
    }
  }

  const handleViewBatch = (batchId: string) => {
    router.push(`/batch/${batchId}`)
  }

  // 空狀態
  if (!loading && batches.length === 0) {
    return (
      <AppLayout>
        <div className="p-6">
          <Breadcrumb items={[{ label: '主控台', href: '/' }, { label: '批次處理' }]} />

          <div className="flex flex-col items-center justify-center h-96">
            <FolderOpenIcon className="w-24 h-24 text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg mb-4">還沒有任何批次任務</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              新增第一個批次任務
            </button>
          </div>
        </div>

        {/* 新增批次任務 Modal */}
        <CreateBatchModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            loadBatches()
          }}
        />
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-6">
        {/* 麵包屑 */}
        <Breadcrumb items={[{ label: '主控台', href: '/' }, { label: '批次處理' }]} />

        {/* 頁面標題與操作按鈕 */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold">批次處理</h1>
          <div className="flex gap-2">
            <button
              onClick={() => toast.info('批次配置檔案上傳功能即將推出')}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <DocumentArrowUpIcon className="w-5 h-5" />
              上傳批次配置檔案
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              新增批次任務
            </button>
          </div>
        </div>

        {/* 批次任務列表 */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-200 animate-pulse rounded-lg h-32" />
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
            <button
              onClick={loadBatches}
              className="mt-2 text-blue-600 hover:text-blue-800"
            >
              重試
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    任務名稱
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    包含專案數
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    狀態
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    成功 / 失敗
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    創建時間
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {batch.task_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{batch.project_count}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <BatchStatusTag status={batch.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <span className="text-green-600 font-medium">{batch.success_count}</span>
                        {' / '}
                        <span className="text-red-600 font-medium">{batch.failed_count}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(batch.created_at).toLocaleString('zh-TW')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleViewBatch(batch.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          查看
                        </button>
                        {batch.status === 'RUNNING' && (
                          <button
                            onClick={() => handlePauseBatch(batch.id)}
                            className="text-yellow-600 hover:text-yellow-900"
                          >
                            暫停
                          </button>
                        )}
                        {batch.status === 'PAUSED' && (
                          <button
                            onClick={() => handleResumeBatch(batch.id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            繼續
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteBatch(batch.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          刪除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 新增批次任務 Modal */}
      <CreateBatchModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          loadBatches()
        }}
      />
    </AppLayout>
  )
}
