import { create } from 'zustand'
import type { VisualConfig, PromptTemplate } from '@/types/models'

// 簡單的 UUID 生成器（測試用）
const generateId = () => {
  if (typeof window !== 'undefined' && window.crypto) {
    return crypto.randomUUID()
  }
  // Fallback for Node.js environment
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

interface ConfigState {
  visualConfig: VisualConfig | null
  promptTemplates: PromptTemplate[]
}

interface ConfigActions {
  setVisualConfig: (config: VisualConfig) => void
  updateVisualConfig: (updates: Partial<VisualConfig>) => void
  setPromptTemplates: (templates: PromptTemplate[]) => void
  addPromptTemplate: (template: Omit<PromptTemplate, 'id'>) => void
  updatePromptTemplate: (id: string, updates: Partial<PromptTemplate>) => void
  deletePromptTemplate: (id: string) => void
}

export const useConfigStore = create<ConfigState & ConfigActions>((set) => ({
  // ========== State ==========
  visualConfig: null,
  promptTemplates: [],

  // ========== Actions ==========
  setVisualConfig: (config) => {
    set({ visualConfig: config })
  },

  updateVisualConfig: (updates) => {
    set((state) => ({
      visualConfig: state.visualConfig
        ? { ...state.visualConfig, ...updates }
        : null,
    }))
  },

  setPromptTemplates: (templates) => {
    set({ promptTemplates: templates })
  },

  addPromptTemplate: (template) => {
    set((state) => ({
      promptTemplates: [
        ...state.promptTemplates,
        { ...template, id: generateId() },
      ],
    }))
  },

  updatePromptTemplate: (id, updates) => {
    set((state) => ({
      promptTemplates: state.promptTemplates.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    }))
  },

  deletePromptTemplate: (id) => {
    set((state) => ({
      promptTemplates: state.promptTemplates.filter((t) => t.id !== id),
    }))
  },
}))
