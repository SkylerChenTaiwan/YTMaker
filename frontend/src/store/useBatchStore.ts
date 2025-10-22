import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BatchTask } from '@/types/api'

export interface BatchProject {
  id: string
  name: string
  status: string
  progress: number
  youtube_url?: string
  error_message?: string
  current_stage?: string
}

export interface BatchDetailTask extends BatchTask {
  total_projects: number
  completed_projects: number
  failed_projects: number
  projects: BatchProject[]
}

interface BatchState {
  // 狀態
  batches: BatchTask[]
  currentBatch: BatchDetailTask | null
  loading: boolean
  error: string | null

  // Actions
  setBatches: (batches: BatchTask[]) => void
  setCurrentBatch: (batch: BatchDetailTask | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  updateBatchStatus: (batchId: string, status: BatchTask['status']) => void
  updateProjectProgress: (batchId: string, projectId: string, progress: number) => void
  reset: () => void
}

const initialState = {
  batches: [],
  currentBatch: null,
  loading: false,
  error: null,
}

export const useBatchStore = create<BatchState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Actions
      setBatches: (batches) => set({ batches }),

      setCurrentBatch: (batch) => set({ currentBatch: batch }),

      setLoading: (loading) => set({ loading }),

      setError: (error) => set({ error }),

      updateBatchStatus: (batchId, status) =>
        set((state) => ({
          batches: state.batches.map((batch) =>
            batch.id === batchId ? { ...batch, status } : batch
          ),
          currentBatch:
            state.currentBatch?.id === batchId
              ? { ...state.currentBatch, status }
              : state.currentBatch,
        })),

      updateProjectProgress: (batchId, projectId, progress) =>
        set((state) => {
          if (state.currentBatch?.id === batchId) {
            return {
              currentBatch: {
                ...state.currentBatch,
                projects: state.currentBatch.projects.map((project) =>
                  project.id === projectId ? { ...project, progress } : project
                ),
              },
            }
          }
          return state
        }),

      reset: () => set(initialState),
    }),
    {
      name: 'batch-storage',
      partialize: (state) => ({
        batches: state.batches,
      }),
    }
  )
)
