# 狀態管理

> **建立日期:** 2025-10-19
> **最後更新:** 2025-10-19
> **關聯文件:** `_index.md`, `api-integration.md`, `pages.md`

---

## 📖 目錄

1. [全域狀態設計](#全域狀態設計)
2. [全域狀態結構](#全域狀態結構)
3. [Store 定義](#store-定義)
4. [本地狀態管理](#本地狀態管理)

---

## 全域狀態設計

### 狀態管理庫

**使用:** Zustand

**選擇理由:**
- 輕量級 (1.5KB)
- API 簡潔直觀
- 支援 TypeScript
- 支援持久化 (persist middleware)
- 無需 Context Provider 包裹

---

## 全域狀態結構

### 5 大類全域狀態

```typescript
// store/types.ts
interface GlobalState {
  // 1. 用戶設定
  settings: {
    apiKeys: {
      gemini: string | null
      stabilityAI: string | null
      dId: string | null
    }
    youtubeAccounts: YouTubeAccount[]
    preferences: UserPreferences
  }

  // 2. UI 狀態
  ui: {
    sidebarCollapsed: boolean
    theme: 'light' | 'dark'
  }

  // 3. 專案狀態
  projects: {
    list: Project[]
    current: Project | null
    loading: boolean
    error: string | null
  }

  // 4. 進度狀態
  progress: {
    projectId: string | null
    stage: GenerationStage
    percentage: number
    logs: LogEntry[]
  }

  // 5. 批次任務狀態
  batch: {
    tasks: BatchTask[]
    current: BatchTask | null
  }
}
```

### 型別定義

```typescript
// types/models.ts

export interface YouTubeAccount {
  id: string
  channel_name: string
  channel_id: string
  avatar_url: string
  authorized_at: string
}

export interface UserPreferences {
  voice_gender: 'male' | 'female'
  voice_speed: number
  default_privacy: 'public' | 'unlisted' | 'private'
  keep_intermediate_assets: boolean
  notification_enabled: boolean
}

export interface Project {
  id: string
  project_name: string
  status: ProjectStatus
  content_text: string
  created_at: string
  updated_at: string
}

export type ProjectStatus =
  | 'INITIALIZED'
  | 'SCRIPT_GENERATING'
  | 'SCRIPT_GENERATED'
  | 'ASSETS_GENERATING'
  | 'ASSETS_GENERATED'
  | 'RENDERING'
  | 'RENDERED'
  | 'UPLOADING'
  | 'COMPLETED'
  | 'FAILED'
  | 'PAUSED'

export type GenerationStage =
  | 'INITIALIZED'
  | 'SCRIPT_GENERATING'
  | 'SCRIPT_GENERATED'
  | 'ASSETS_GENERATING'
  | 'ASSETS_GENERATED'
  | 'RENDERING'
  | 'RENDERED'
  | 'UPLOADING'
  | 'COMPLETED'

export interface LogEntry {
  timestamp: string
  level: 'info' | 'warning' | 'error'
  message: string
}

export interface BatchTask {
  id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  created_at: string
}
```

---

## Store 定義

### 完整 Store 實作

```typescript
// store/useStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  GlobalState,
  YouTubeAccount,
  UserPreferences,
  Project,
  LogEntry,
  BatchTask,
  GenerationStage,
} from '@/types/models'

// 預設偏好設定
const defaultPreferences: UserPreferences = {
  voice_gender: 'female',
  voice_speed: 1.0,
  default_privacy: 'unlisted',
  keep_intermediate_assets: false,
  notification_enabled: true,
}

// Store Actions 型別
interface StoreActions {
  // Settings Actions
  setApiKey: (service: 'gemini' | 'stabilityAI' | 'dId', key: string) => void
  addYouTubeAccount: (account: YouTubeAccount) => void
  removeYouTubeAccount: (accountId: string) => void
  updatePreferences: (preferences: Partial<UserPreferences>) => void

  // UI Actions
  toggleSidebar: () => void
  setTheme: (theme: 'light' | 'dark') => void

  // Projects Actions
  setProjects: (projects: Project[]) => void
  setCurrentProject: (project: Project | null) => void
  addProject: (project: Project) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  deleteProject: (id: string) => void
  setProjectsLoading: (loading: boolean) => void
  setProjectsError: (error: string | null) => void

  // Progress Actions
  updateProgress: (progress: {
    projectId?: string
    stage?: GenerationStage
    percentage?: number
  }) => void
  addLog: (log: LogEntry) => void
  clearLogs: () => void

  // Batch Actions
  setBatchTasks: (tasks: BatchTask[]) => void
  setCurrentBatchTask: (task: BatchTask | null) => void
  updateBatchTask: (id: string, updates: Partial<BatchTask>) => void
}

export const useStore = create<GlobalState & StoreActions>()(
  persist(
    (set, get) => ({
      // ========== State ==========
      settings: {
        apiKeys: {
          gemini: null,
          stabilityAI: null,
          dId: null,
        },
        youtubeAccounts: [],
        preferences: defaultPreferences,
      },

      ui: {
        sidebarCollapsed: false,
        theme: 'light',
      },

      projects: {
        list: [],
        current: null,
        loading: false,
        error: null,
      },

      progress: {
        projectId: null,
        stage: 'INITIALIZED',
        percentage: 0,
        logs: [],
      },

      batch: {
        tasks: [],
        current: null,
      },

      // ========== Settings Actions ==========
      setApiKey: (service, key) => {
        set((state) => ({
          settings: {
            ...state.settings,
            apiKeys: {
              ...state.settings.apiKeys,
              [service]: key,
            },
          },
        }))
      },

      addYouTubeAccount: (account) => {
        set((state) => ({
          settings: {
            ...state.settings,
            youtubeAccounts: [...state.settings.youtubeAccounts, account],
          },
        }))
      },

      removeYouTubeAccount: (accountId) => {
        set((state) => ({
          settings: {
            ...state.settings,
            youtubeAccounts: state.settings.youtubeAccounts.filter(
              (acc) => acc.id !== accountId
            ),
          },
        }))
      },

      updatePreferences: (preferences) => {
        set((state) => ({
          settings: {
            ...state.settings,
            preferences: {
              ...state.settings.preferences,
              ...preferences,
            },
          },
        }))
      },

      // ========== UI Actions ==========
      toggleSidebar: () => {
        set((state) => ({
          ui: {
            ...state.ui,
            sidebarCollapsed: !state.ui.sidebarCollapsed,
          },
        }))
      },

      setTheme: (theme) => {
        set((state) => ({
          ui: {
            ...state.ui,
            theme,
          },
        }))
      },

      // ========== Projects Actions ==========
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

      // ========== Progress Actions ==========
      updateProgress: (progress) => {
        set((state) => ({
          progress: {
            ...state.progress,
            ...progress,
          },
        }))
      },

      addLog: (log) => {
        set((state) => ({
          progress: {
            ...state.progress,
            logs: [...state.progress.logs, log],
          },
        }))
      },

      clearLogs: () => {
        set((state) => ({
          progress: {
            ...state.progress,
            logs: [],
          },
        }))
      },

      // ========== Batch Actions ==========
      setBatchTasks: (tasks) => {
        set((state) => ({
          batch: {
            ...state.batch,
            tasks,
          },
        }))
      },

      setCurrentBatchTask: (task) => {
        set((state) => ({
          batch: {
            ...state.batch,
            current: task,
          },
        }))
      },

      updateBatchTask: (id, updates) => {
        set((state) => ({
          batch: {
            ...state.batch,
            tasks: state.batch.tasks.map((t) =>
              t.id === id ? { ...t, ...updates } : t
            ),
            current:
              state.batch.current?.id === id
                ? { ...state.batch.current, ...updates }
                : state.batch.current,
          },
        }))
      },
    }),
    {
      name: 'ytmaker-storage', // localStorage key
      partialize: (state) => ({
        // 只持久化 settings 和 ui
        settings: state.settings,
        ui: state.ui,
      }),
    }
  )
)
```

---

## 使用範例

### 1. 讀取狀態

```typescript
// 元件中使用 - 方式 1: 選擇性訂閱
const Component = () => {
  const apiKeys = useStore((state) => state.settings.apiKeys)
  const geminiKey = useStore((state) => state.settings.apiKeys.gemini)

  return <div>{geminiKey}</div>
}

// 元件中使用 - 方式 2: 多個狀態
const Component = () => {
  const { apiKeys, setApiKey } = useStore((state) => ({
    apiKeys: state.settings.apiKeys,
    setApiKey: state.setApiKey,
  }))

  return <div>...</div>
}
```

### 2. 更新狀態

```typescript
const SettingsPage = () => {
  const setApiKey = useStore((state) => state.setApiKey)

  const handleSave = () => {
    setApiKey('gemini', 'your-api-key-here')
  }

  return (
    <Button onClick={handleSave}>儲存</Button>
  )
}
```

### 3. 專案管理

```typescript
const DashboardPage = () => {
  const { projects, setProjects, deleteProject } = useStore((state) => ({
    projects: state.projects.list,
    setProjects: state.setProjects,
    deleteProject: state.deleteProject,
  }))

  useEffect(() => {
    // 從 API 載入專案
    api.getProjects().then(setProjects)
  }, [setProjects])

  return (
    <ProjectList
      projects={projects}
      onDelete={deleteProject}
    />
  )
}
```

### 4. 進度監控

```typescript
const ProgressPage = () => {
  const { progress, addLog } = useStore((state) => ({
    progress: state.progress,
    addLog: state.addLog,
  }))

  useEffect(() => {
    // WebSocket 更新進度
    websocket.on('progress', (data) => {
      useStore.getState().updateProgress(data)
    })

    websocket.on('log', (log) => {
      addLog(log)
    })
  }, [addLog])

  return (
    <div>
      <ProgressBar value={progress.percentage} />
      <LogViewer logs={progress.logs} />
    </div>
  )
}
```

---

## 本地狀態管理

### 原則

- 使用 React `useState` 管理元件本地狀態
- 使用 `useReducer` 管理複雜本地狀態
- 只在需要跨元件共享時才使用全域狀態

### 簡單本地狀態

```typescript
const NewProjectPage = () => {
  const [formData, setFormData] = useState({
    projectName: '',
    content: '',
  })

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  return (
    <Input
      value={formData.projectName}
      onChange={(e) => handleChange('projectName', e.target.value)}
    />
  )
}
```

### 複雜本地狀態 (useReducer)

```typescript
// 狀態型別
interface VisualConfigState {
  subtitle: SubtitleConfig
  logo: LogoConfig
  overlays: OverlayConfig[]
}

// Action 型別
type VisualConfigAction =
  | { type: 'UPDATE_SUBTITLE'; payload: Partial<SubtitleConfig> }
  | { type: 'UPDATE_LOGO'; payload: Partial<LogoConfig> }
  | { type: 'ADD_OVERLAY'; payload: OverlayConfig }
  | { type: 'REMOVE_OVERLAY'; payload: number }

// Reducer
const visualConfigReducer = (
  state: VisualConfigState,
  action: VisualConfigAction
): VisualConfigState => {
  switch (action.type) {
    case 'UPDATE_SUBTITLE':
      return {
        ...state,
        subtitle: { ...state.subtitle, ...action.payload },
      }
    case 'UPDATE_LOGO':
      return {
        ...state,
        logo: { ...state.logo, ...action.payload },
      }
    case 'ADD_OVERLAY':
      return {
        ...state,
        overlays: [...state.overlays, action.payload],
      }
    case 'REMOVE_OVERLAY':
      return {
        ...state,
        overlays: state.overlays.filter((_, i) => i !== action.payload),
      }
    default:
      return state
  }
}

// 使用
const VisualConfigPage = () => {
  const [state, dispatch] = useReducer(visualConfigReducer, initialState)

  const updateSubtitlePosition = (x: number, y: number) => {
    dispatch({
      type: 'UPDATE_SUBTITLE',
      payload: { position: { x, y } },
    })
  }

  return <div>...</div>
}
```

---

## 狀態管理最佳實踐

### 1. 選擇性訂閱

只訂閱需要的狀態,避免不必要的重新渲染:

```typescript
// ✅ 好的範例: 只訂閱 geminiKey
const geminiKey = useStore((state) => state.settings.apiKeys.gemini)

// ❌ 不好的範例: 訂閱整個 state
const state = useStore()
```

### 2. 避免在 render 中呼叫 Actions

```typescript
// ❌ 不好的範例
const Component = () => {
  useStore.getState().setProjects([]) // 會導致無限循環
  return <div>...</div>
}

// ✅ 好的範例
const Component = () => {
  useEffect(() => {
    useStore.getState().setProjects([])
  }, [])
  return <div>...</div>
}
```

### 3. 使用 Immer 簡化更新 (可選)

```typescript
import { immer } from 'zustand/middleware/immer'

const useStore = create<State>()(
  immer((set) => ({
    // ...
    updateProject: (id, updates) => {
      set((state) => {
        const project = state.projects.list.find((p) => p.id === id)
        if (project) {
          Object.assign(project, updates)
        }
      })
    },
  }))
)
```

---

## 更新記錄

| 日期 | 版本 | 修改內容 | 修改人 |
|------|------|----------|--------|
| 2025-10-19 | 1.0 | 初始版本，從 frontend-spec.md 拆分 | Claude Code |
