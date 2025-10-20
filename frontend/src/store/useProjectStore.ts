import { create } from 'zustand'
import type { Project } from '@/types/models'

interface ProjectState {
  projects: {
    list: Project[]
    current: Project | null
    loading: boolean
    error: string | null
  }
}

interface ProjectActions {
  setProjects: (projects: Project[]) => void
  setCurrentProject: (project: Project | null) => void
  addProject: (project: Project) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  deleteProject: (id: string) => void
  setProjectsLoading: (loading: boolean) => void
  setProjectsError: (error: string | null) => void
}

export const useProjectStore = create<ProjectState & ProjectActions>((set) => ({
  // ========== State ==========
  projects: {
    list: [],
    current: null,
    loading: false,
    error: null,
  },

  // ========== Actions ==========
  setProjects: (projects) => {
    set((state) => ({
      projects: {
        ...state.projects,
        list: projects,
      },
    }))
  },

  setCurrentProject: (project) => {
    set((state) => ({
      projects: {
        ...state.projects,
        current: project,
      },
    }))
  },

  addProject: (project) => {
    set((state) => ({
      projects: {
        ...state.projects,
        list: [project, ...state.projects.list],
      },
    }))
  },

  updateProject: (id, updates) => {
    set((state) => ({
      projects: {
        ...state.projects,
        list: state.projects.list.map((p) =>
          p.id === id ? { ...p, ...updates } : p
        ),
        current:
          state.projects.current?.id === id
            ? { ...state.projects.current, ...updates }
            : state.projects.current,
      },
    }))
  },

  deleteProject: (id) => {
    set((state) => ({
      projects: {
        ...state.projects,
        list: state.projects.list.filter((p) => p.id !== id),
        current:
          state.projects.current?.id === id ? null : state.projects.current,
      },
    }))
  },

  setProjectsLoading: (loading) => {
    set((state) => ({
      projects: {
        ...state.projects,
        loading,
      },
    }))
  },

  setProjectsError: (error) => {
    set((state) => ({
      projects: {
        ...state.projects,
        error,
      },
    }))
  },
}))
