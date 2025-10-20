import { create } from 'zustand'
import type { GenerationStage, LogEntry } from '@/types/models'

interface ProgressState {
  projectId: string | null
  stage: GenerationStage
  percentage: number
  logs: LogEntry[]
}

interface ProgressActions {
  updateProgress: (progress: Partial<ProgressState>) => void
  addLog: (log: LogEntry) => void
  clearLogs: () => void
  resetProgress: () => void
}

const initialState: ProgressState = {
  projectId: null,
  stage: 'INITIALIZED',
  percentage: 0,
  logs: [],
}

export const useProgressStore = create<ProgressState & ProgressActions>(
  (set) => ({
    // ========== State ==========
    ...initialState,

    // ========== Actions ==========
    updateProgress: (progress) => {
      set((state) => ({
        ...state,
        ...progress,
      }))
    },

    addLog: (log) => {
      set((state) => ({
        logs: [...state.logs, log],
      }))
    },

    clearLogs: () => {
      set({ logs: [] })
    },

    resetProgress: () => {
      set(initialState)
    },
  })
)
