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
          // 防止進度回退: 只有當新進度 >= 當前進度時才更新
          const newOverall = update.overall ?? state.progress.overall
          if (newOverall < state.progress.overall) {
            console.warn('Progress rollback prevented:', {
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
