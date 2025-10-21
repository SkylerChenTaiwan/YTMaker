/**
 * 進度監控頁面
 *
 * 功能:
 * - 即時顯示影片生成進度 (透過 WebSocket)
 * - 顯示各階段狀態 (腳本、素材、渲染、封面、上傳)
 * - 顯示即時日誌輸出
 * - 提供暫停、取消、重試等控制功能
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter, notFound } from 'next/navigation'
import { validateProjectId } from '@/lib/validators'
import { AppLayout } from '@/components/layout/AppLayout'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { StageProgress } from '@/components/feature/StageProgress'
import { LogViewer } from '@/components/feature/LogViewer'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useProjectStore } from '@/store/projectStore'
import { useProgressStore } from '@/store/progressStore'
import * as api from '@/lib/api/projects'
import { toast } from '@/services/toast'

interface ProgressPageProps {
  params: { id: string }
}

export default function ProgressPage({ params }: ProgressPageProps) {
  // 驗證 UUID 格式
  if (!validateProjectId(params.id)) {
    notFound()
  }

  const router = useRouter()
  const projectId = params.id

  const [showCancelModal, setShowCancelModal] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  const { currentProject, fetchProject } = useProjectStore()
  const { progress, logs, updateProgress, addLog } = useProgressStore()

  // WebSocket 連線
  const { isConnected, reconnect } = useWebSocket(projectId, {
    onMessage: (message) => {
      if (message.type === 'progress') {
        updateProgress(message.data)
      } else if (message.type === 'log') {
        addLog(message.data)
      } else if (message.type === 'stage_complete') {
        updateProgress({ stage: message.data.stage, status: 'completed' })
      } else if (message.type === 'error') {
        toast.error(message.data.message)
      }
    },
    onError: (error) => {
      toast.error('WebSocket 連線錯誤')
      console.error('WebSocket error:', error)
    },
    onReconnect: () => {
      toast.info('重新連線中...')
    },
  })

  // 載入專案資料
  useEffect(() => {
    fetchProject(projectId)
  }, [projectId, fetchProject])

  // 處理暫停
  const handlePause = async () => {
    try {
      await api.pauseGeneration(projectId)
      setIsPaused(true)
      toast.success('已暫停生成')
    } catch (error) {
      toast.error('暫停失敗')
    }
  }

  // 處理繼續
  const handleResume = async () => {
    try {
      await api.resumeGeneration(projectId)
      setIsPaused(false)
      toast.success('已繼續生成')
    } catch (error) {
      toast.error('繼續失敗')
    }
  }

  // 處理取消
  const handleCancel = async () => {
    try {
      await api.cancelGeneration(projectId)
      toast.success('已取消生成')
      router.push('/')
    } catch (error) {
      toast.error('取消失敗')
    }
  }

  // 處理重試
  const handleRetry = async () => {
    try {
      await api.retryGeneration(projectId)
      toast.success('已重新開始生成')
    } catch (error) {
      toast.error('重試失敗')
    }
  }

  // 跳轉到結果頁
  const handleViewResult = () => {
    router.push(`/project/${projectId}/result`)
  }

  if (!currentProject) {
    return <div>載入中...</div>
  }

  const isCompleted = currentProject.status === 'COMPLETED'
  const isFailed = currentProject.status === 'FAILED'

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: '主控台', href: '/' },
          { label: currentProject.project_name, href: '#' },
          { label: '生成進度' },
        ]}
      />

      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">{currentProject.project_name}</h1>

        {/* 總進度區 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="mb-4">
            <p className="text-lg font-medium mb-2">
              {isCompleted ? '影片生成完成!' : isFailed ? '生成失敗' : progress.message}
            </p>
            {progress.estimatedTime && !isCompleted && !isFailed && (
              <p className="text-sm text-gray-500">預估剩餘時間: {progress.estimatedTime}</p>
            )}
          </div>

          <ProgressBar
            value={progress.overall}
            showPercentage
            status={isCompleted ? 'success' : isFailed ? 'error' : 'normal'}
            data-testid="progress-bar"
          />

          {/* WebSocket 連線狀態 */}
          {!isConnected && (
            <div className="mt-4 flex items-center text-yellow-600">
              <span className="mr-2">⚠️</span>
              <span>連線中斷,正在重新連線...</span>
              <Button type="text" onClick={reconnect} className="ml-2">
                手動重連
              </Button>
            </div>
          )}
        </div>

        {/* 階段進度區 */}
        <StageProgress stages={progress.stages} currentStage={progress.stage} />

        {/* 錯誤訊息 */}
        {isFailed && currentProject.error && (
          <div className="bg-red-50 border border-red-300 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <span className="text-red-500 text-2xl mr-3" data-testid="failure-icon">
                ✗
              </span>
              <div className="flex-1">
                <p className="font-medium text-red-800">生成失敗</p>
                <p className="text-red-700 mt-1">{currentProject.error.message}</p>
                <p className="text-sm text-red-600 mt-2">
                  錯誤碼: {currentProject.error.code} | 時間:{' '}
                  {new Date(currentProject.error.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 日誌顯示區 */}
        <LogViewer logs={logs} />

        {/* 操作按鈕 */}
        <div className="flex justify-end gap-4 mt-6">
          {!isCompleted && !isFailed && (
            <>
              {!isPaused ? (
                <Button onClick={handlePause}>暫停</Button>
              ) : (
                <Button onClick={handleResume} type="primary">
                  繼續
                </Button>
              )}
              <Button onClick={() => setShowCancelModal(true)} type="danger">
                取消
              </Button>
            </>
          )}

          {isFailed && (
            <>
              <Button onClick={handleRetry} type="primary">
                重試
              </Button>
              <Button onClick={() => router.push('/')}>返回主控台</Button>
            </>
          )}

          {isCompleted && (
            <>
              <Button onClick={() => router.push('/')}>返回主控台</Button>
              <Button onClick={handleViewResult} type="primary">
                查看結果
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 取消確認 Modal */}
      <Modal
        visible={showCancelModal}
        title="確認取消"
        onOk={handleCancel}
        onCancel={() => setShowCancelModal(false)}
        okText="確定"
        cancelText="取消"
      >
        <p>確定要取消生成嗎? 生成將在背景繼續執行。</p>
      </Modal>
    </AppLayout>
  )
}
