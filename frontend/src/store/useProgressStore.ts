import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GenerationStage, LogEntry } from '@/types/models'

interface SubTask {
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  progress: number
  total?: number
}

interface Stage {
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  progress: number
  subtasks?: {
    audio?: SubTask
    images?: SubTask
    avatar?: SubTask
  }
}

interface Progress {
  overall: number
  stage: string
  message: string
  estimatedTime?: string
  stages: {
    script: Stage
    assets: Stage
    render: Stage
    thumbnail: Stage
    upload: Stage
  }
}

interface ProgressState {
  projectId: string | null
  stage: GenerationStage
  percentage: number
  logs: LogEntry[]
  progress: Progress
}

interface ProgressActions {
  updateProgress: (progress: Partial<Progress>) => void
  addLog: (log: LogEntry) => void
  clearLogs: () => void
  resetProgress: () => void
}

const initialProgress: Progress = {
  overall: 0,
  stage: 'script',
  message: '準備開始生成...',
  stages: {
    script: { status: 'pending', progress: 0 },
    assets: { status: 'pending', progress: 0 },
    render: { status: 'pending', progress: 0 },
    thumbnail: { status: 'pending', progress: 0 },
    upload: { status: 'pending', progress: 0 },
  },
}

const initialState: ProgressState = {
  projectId: null,
  stage: 'INITIALIZED',
  percentage: 0,
  logs: [],
  progress: initialProgress,
}

export const useProgressStore = create<ProgressState & ProgressActions>()(
  persist(
    (set) => ({
      // ========== State ==========
      ...initialState,

      // ========== Actions ==========
      updateProgress: (update) =>
        set((state) => {
          const newOverall = update.overall ?? state.progress.overall

          // 檢查是否有狀態變化（failed 或 completed）
          // 這些狀態必須立即顯示（Quick Fail 原則）
          const hasStatusChange = update.stages && Object.values(update.stages).some(
            (stage) => stage.status === 'failed' || stage.status === 'completed'
          )

          // 防止進度回退: 只在沒有狀態變化時才檢查進度回退
          // ✅ 有狀態變化（失敗/完成）→ 無條件接受
          // ✅ 無狀態變化但進度降低 → 拒絕（防止亂序訊息）
          if (!hasStatusChange && newOverall < state.progress.overall) {
            console.warn('Progress rollback prevented (no status change):', {
              current: state.progress.overall,
              attempted: newOverall,
            })
            return state
          }

          return {
            progress: {
              ...state.progress,
              ...update,
              stages: {
                ...state.progress.stages,
                ...(update.stages || {}),
              },
            },
          }
        }),

      addLog: (log) =>
        set((state) => ({
          logs: [...state.logs, log],
        })),

      clearLogs: () => set({ logs: [] }),

      resetProgress: () => set({ progress: initialProgress, logs: [] }),
    }),
    {
      name: 'progress-storage',
      partialize: (state) => ({ logs: state.logs }),
    }
  )
)
