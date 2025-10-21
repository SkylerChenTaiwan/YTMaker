/**
 * useProgressStore 單元測試
 *
 * 測試進度管理 store 的核心邏輯：
 * - 進度更新
 * - 進度回退保護（Quick Fail 原則）
 * - 日誌管理
 * - 進度重置
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useProgressStore } from '@/store/useProgressStore'

describe('useProgressStore', () => {
  beforeEach(() => {
    // 重置 store 到初始狀態
    useProgressStore.getState().resetProgress()
    useProgressStore.setState({
      projectId: null,
      stage: 'INITIALIZED',
      percentage: 0,
    })
  })

  describe('updateProgress', () => {
    it('應該正確更新進度', () => {
      const { updateProgress } = useProgressStore.getState()

      updateProgress({
        overall: 25,
        stage: 'script',
        message: '腳本生成完成',
        stages: {
          script: { status: 'completed', progress: 100 },
          assets: { status: 'pending', progress: 0 },
          render: { status: 'pending', progress: 0 },
          thumbnail: { status: 'pending', progress: 0 },
          upload: { status: 'pending', progress: 0 },
        },
      })

      const state = useProgressStore.getState()
      expect(state.progress.overall).toBe(25)
      expect(state.progress.stage).toBe('script')
      expect(state.progress.message).toBe('腳本生成完成')
      expect(state.progress.stages.script.status).toBe('completed')
    })

    it('應該允許進度遞增更新', () => {
      const { updateProgress } = useProgressStore.getState()

      updateProgress({ overall: 10, stage: 'script', message: '生成中...' })
      expect(useProgressStore.getState().progress.overall).toBe(10)

      updateProgress({ overall: 20, stage: 'script', message: '生成中...' })
      expect(useProgressStore.getState().progress.overall).toBe(20)

      updateProgress({ overall: 30, stage: 'script', message: '生成中...' })
      expect(useProgressStore.getState().progress.overall).toBe(30)
    })
  })

  describe('進度回退保護 - Quick Fail 原則', () => {
    it('應該拒絕純進度回退（無狀態變化）', () => {
      const { updateProgress } = useProgressStore.getState()

      // 設定初始進度 50%
      updateProgress({
        overall: 50,
        stage: 'assets',
        message: '素材生成中...',
      })

      expect(useProgressStore.getState().progress.overall).toBe(50)

      // 嘗試降低進度到 45%（無狀態變化）
      updateProgress({
        overall: 45,
        stage: 'assets',
        message: '素材生成中...',
      })

      // ✅ 應該拒絕，進度保持 50%
      expect(useProgressStore.getState().progress.overall).toBe(50)
    })

    it('應該允許失敗狀態更新，即使進度降低（Quick Fail）', () => {
      const { updateProgress } = useProgressStore.getState()

      // 設定初始進度 50%
      updateProgress({
        overall: 50,
        stage: 'assets',
        message: '素材生成中...',
        stages: {
          script: { status: 'completed', progress: 100 },
          assets: { status: 'in_progress', progress: 50 },
          render: { status: 'pending', progress: 0 },
          thumbnail: { status: 'pending', progress: 0 },
          upload: { status: 'pending', progress: 0 },
        },
      })

      expect(useProgressStore.getState().progress.overall).toBe(50)

      // 失敗訊息：進度降到 45%，但 status 變為 failed
      updateProgress({
        overall: 45,
        stage: 'assets',
        message: '圖片生成失敗',
        stages: {
          script: { status: 'completed', progress: 100 },
          assets: { status: 'failed', progress: 50 },
          render: { status: 'pending', progress: 0 },
          thumbnail: { status: 'pending', progress: 0 },
          upload: { status: 'pending', progress: 0 },
        },
      })

      // ✅ 應該接受更新（Quick Fail 原則）
      const state = useProgressStore.getState()
      expect(state.progress.overall).toBe(45)
      expect(state.progress.message).toBe('圖片生成失敗')
      expect(state.progress.stages.assets.status).toBe('failed')
    })

    it('應該允許完成狀態更新，即使進度降低', () => {
      const { updateProgress } = useProgressStore.getState()

      // 設定初始進度 95%
      updateProgress({
        overall: 95,
        stage: 'upload',
        message: '上傳中...',
      })

      // 完成訊息：進度調整為 100%，status 變為 completed
      updateProgress({
        overall: 100,
        stage: 'upload',
        message: '影片生成完成！',
        stages: {
          script: { status: 'completed', progress: 100 },
          assets: { status: 'completed', progress: 100 },
          render: { status: 'completed', progress: 100 },
          thumbnail: { status: 'completed', progress: 100 },
          upload: { status: 'completed', progress: 100 },
        },
      })

      // ✅ 應該接受更新
      const state = useProgressStore.getState()
      expect(state.progress.overall).toBe(100)
      expect(state.progress.stages.upload.status).toBe('completed')
    })

    it('應該允許部分階段失敗時的進度更新', () => {
      const { updateProgress } = useProgressStore.getState()

      // 設定初始進度 40%（assets 階段）
      updateProgress({
        overall: 40,
        stage: 'assets',
        message: '圖片生成中...',
        stages: {
          script: { status: 'completed', progress: 100 },
          assets: {
            status: 'in_progress',
            progress: 30,
            subtasks: {
              audio: { status: 'completed', progress: 100 },
              images: { status: 'in_progress', progress: 5, total: 15 },
              avatar: { status: 'pending', progress: 0 },
            },
          },
          render: { status: 'pending', progress: 0 },
          thumbnail: { status: 'pending', progress: 0 },
          upload: { status: 'pending', progress: 0 },
        },
      })

      // 圖片生成失敗（進度可能降低）
      updateProgress({
        overall: 35,
        stage: 'assets',
        message: 'Stability AI 超時',
        stages: {
          script: { status: 'completed', progress: 100 },
          assets: {
            status: 'failed',
            progress: 30,
            subtasks: {
              audio: { status: 'completed', progress: 100 },
              images: { status: 'failed', progress: 5, total: 15 },
              avatar: { status: 'pending', progress: 0 },
            },
          },
          render: { status: 'pending', progress: 0 },
          thumbnail: { status: 'pending', progress: 0 },
          upload: { status: 'pending', progress: 0 },
        },
      })

      // ✅ 應該接受更新（因為有 failed 狀態變化）
      const state = useProgressStore.getState()
      expect(state.progress.overall).toBe(35)
      expect(state.progress.stages.assets.status).toBe('failed')
      expect(state.progress.stages.assets.subtasks?.images?.status).toBe('failed')
    })

    it('應該正確合併 stages 更新', () => {
      const { updateProgress } = useProgressStore.getState()

      // 第一次更新：script 完成
      updateProgress({
        overall: 25,
        stage: 'script',
        message: '腳本生成完成',
        stages: {
          script: { status: 'completed', progress: 100 },
          assets: { status: 'pending', progress: 0 },
          render: { status: 'pending', progress: 0 },
          thumbnail: { status: 'pending', progress: 0 },
          upload: { status: 'pending', progress: 0 },
        },
      })

      // 第二次更新：assets 開始
      updateProgress({
        overall: 30,
        stage: 'assets',
        message: '素材生成開始',
        stages: {
          script: { status: 'completed', progress: 100 },
          assets: { status: 'in_progress', progress: 10 },
          render: { status: 'pending', progress: 0 },
          thumbnail: { status: 'pending', progress: 0 },
          upload: { status: 'pending', progress: 0 },
        },
      })

      const state = useProgressStore.getState()

      // ✅ 兩個階段的狀態都應該保留
      expect(state.progress.stages.script.status).toBe('completed')
      expect(state.progress.stages.assets.status).toBe('in_progress')
      expect(state.progress.overall).toBe(30)
    })
  })

  describe('addLog', () => {
    it('應該正確新增日誌', () => {
      const { addLog } = useProgressStore.getState()

      const log1 = {
        timestamp: '2025-10-21T10:00:00Z',
        level: 'info' as const,
        message: '開始生成腳本',
      }

      const log2 = {
        timestamp: '2025-10-21T10:05:00Z',
        level: 'success' as const,
        message: '腳本生成完成',
      }

      addLog(log1)
      addLog(log2)

      const state = useProgressStore.getState()
      expect(state.logs).toHaveLength(2)
      expect(state.logs[0]).toEqual(log1)
      expect(state.logs[1]).toEqual(log2)
    })

    it('應該按順序保存日誌', () => {
      const { addLog } = useProgressStore.getState()

      for (let i = 1; i <= 5; i++) {
        addLog({
          timestamp: `2025-10-21T10:0${i}:00Z`,
          level: 'info',
          message: `日誌 ${i}`,
        })
      }

      const state = useProgressStore.getState()
      expect(state.logs).toHaveLength(5)
      expect(state.logs[0].message).toBe('日誌 1')
      expect(state.logs[4].message).toBe('日誌 5')
    })
  })

  describe('clearLogs', () => {
    it('應該清除所有日誌', () => {
      const { addLog, clearLogs } = useProgressStore.getState()

      // 新增一些日誌
      addLog({ timestamp: '2025-10-21T10:00:00Z', level: 'info', message: '日誌 1' })
      addLog({ timestamp: '2025-10-21T10:01:00Z', level: 'info', message: '日誌 2' })

      expect(useProgressStore.getState().logs).toHaveLength(2)

      // 清除
      clearLogs()

      expect(useProgressStore.getState().logs).toHaveLength(0)
    })
  })

  describe('resetProgress', () => {
    it('應該重置進度到初始狀態', () => {
      const { updateProgress, addLog, resetProgress } = useProgressStore.getState()

      // 更新進度和日誌
      updateProgress({
        overall: 50,
        stage: 'assets',
        message: '素材生成中...',
      })

      addLog({ timestamp: '2025-10-21T10:00:00Z', level: 'info', message: '測試日誌' })

      expect(useProgressStore.getState().progress.overall).toBe(50)
      expect(useProgressStore.getState().logs).toHaveLength(1)

      // 重置
      resetProgress()

      const state = useProgressStore.getState()
      expect(state.progress.overall).toBe(0)
      expect(state.progress.stage).toBe('script')
      expect(state.progress.message).toBe('準備開始生成...')
      expect(state.logs).toHaveLength(0)

      // 所有階段都應該是 pending
      expect(state.progress.stages.script.status).toBe('pending')
      expect(state.progress.stages.assets.status).toBe('pending')
      expect(state.progress.stages.render.status).toBe('pending')
      expect(state.progress.stages.thumbnail.status).toBe('pending')
      expect(state.progress.stages.upload.status).toBe('pending')
    })
  })
})
