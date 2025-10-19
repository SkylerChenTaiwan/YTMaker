# Task-015: Zustand Stores 與狀態管理

> **建立日期:** 2025-01-19
> **狀態:** ⏳ 未開始
> **預計時間:** 6 小時
> **優先級:** P0

---

## 關聯文件

### 技術規格
- **狀態管理:** `tech-specs/frontend/state-management.md`
- **前端架構:** `tech-specs/frontend/overview.md`
- **API 整合:** `tech-specs/frontend/api-integration.md`

### 產品設計
- **所有流程:** `product-design/flows.md` (需要狀態管理支援所有 flows)

### 相關任務
- **前置任務:** Task-014 (前端專案初始化與路由系統)
- **後續任務:** Task-016 (Axios 客戶端), Task-017 ~ Task-022 (所有頁面開發)
- **並行任務:** 無（必須先完成作為基礎）

---

## 任務目標

### 簡述
實作 4 個 Zustand stores 進行前端狀態管理，包含 useProjectStore、useConfigStore、useProgressStore、useAuthStore，並實作狀態持久化和同步邏輯。

### 詳細說明
本任務負責建立完整的前端狀態管理系統，包括：
- 實作 `useProjectStore` 管理專案列表和當前專案狀態
- 實作 `useConfigStore` 管理視覺配置、Prompt 範本
- 實作 `useProgressStore` 管理生成進度和 WebSocket 連線狀態
- 實作 `useAuthStore` 管理 API Keys 狀態和 YouTube 授權狀態
- 實作狀態持久化（localStorage）
- 實作 store 之間的同步邏輯
- 實作中間件（logging、persistence）

### 成功標準
- [ ] 4 個 Zustand stores 全部實作完成
- [ ] 狀態可正確持久化到 localStorage
- [ ] 狀態更新觸發正確的 re-render
- [ ] Store 之間的依賴關係正確處理
- [ ] TypeScript 類型定義完整
- [ ] 單元測試覆蓋率 > 80%

---

## 測試要求

### 測試環境設定

**前置條件:**
- Next.js 專案可運行
- React Testing Library 已安裝
- Zustand 已安裝

**測試資料準備:**
```typescript
// tests/fixtures/store-data.ts
export const mockProject = {
  id: 'proj_001',
  title: '測試專案',
  status: 'draft',
  created_at: '2025-01-19T10:00:00Z'
}

export const mockConfig = {
  id: 'config_001',
  name: '預設配置',
  visual_config: {
    subtitle: { position: 'bottom', fontSize: 48 }
  }
}

export const mockProgress = {
  project_id: 'proj_001',
  stage: 'generating_script',
  progress_percent: 30
}
```

---

### 單元測試

#### 測試 1: useProjectStore - 專案列表管理

**測試檔案:** `tests/unit/stores/useProjectStore.test.ts`

**測試程式碼:**
```typescript
import { renderHook, act } from '@testing-library/react'
import { useProjectStore } from '@/stores/useProjectStore'

describe('useProjectStore', () => {
  beforeEach(() => {
    // 重置 store
    const { result } = renderHook(() => useProjectStore())
    act(() => {
      result.current.reset()
    })
  })

  test('應該正確新增專案', () => {
    const { result } = renderHook(() => useProjectStore())

    const newProject = {
      id: 'proj_001',
      title: '測試專案',
      status: 'draft' as const
    }

    act(() => {
      result.current.addProject(newProject)
    })

    expect(result.current.projects).toHaveLength(1)
    expect(result.current.projects[0]).toEqual(newProject)
  })

  test('應該正確更新專案狀態', () => {
    const { result } = renderHook(() => useProjectStore())

    act(() => {
      result.current.addProject({ id: 'proj_001', title: '測試', status: 'draft' })
    })

    act(() => {
      result.current.updateProjectStatus('proj_001', 'generating')
    })

    expect(result.current.projects[0].status).toBe('generating')
  })

  test('應該正確刪除專案', () => {
    const { result } = renderHook(() => useProjectStore())

    act(() => {
      result.current.addProject({ id: 'proj_001', title: '測試', status: 'draft' })
    })

    act(() => {
      result.current.deleteProject('proj_001')
    })

    expect(result.current.projects).toHaveLength(0)
  })
})
```

**預期結果:**
- 所有測試通過
- 專案 CRUD 操作正確
- 狀態更新正確觸發

---

#### 測試 2: useConfigStore - 配置管理

**測試檔案:** `tests/unit/stores/useConfigStore.test.ts`

**測試程式碼:**
```typescript
import { renderHook, act } from '@testing-library/react'
import { useConfigStore } from '@/stores/useConfigStore'

describe('useConfigStore', () => {
  test('應該正確儲存視覺配置', () => {
    const { result } = renderHook(() => useConfigStore())

    const visualConfig = {
      subtitle: {
        position: 'bottom' as const,
        fontSize: 48,
        color: '#FFFFFF'
      }
    }

    act(() => {
      result.current.setVisualConfig(visualConfig)
    })

    expect(result.current.currentConfig.visual_config).toEqual(visualConfig)
  })

  test('應該正確新增 Prompt 範本', () => {
    const { result } = renderHook(() => useConfigStore())

    const template = {
      id: 'tpl_001',
      name: '科技評論',
      content: '請生成科技評論腳本...'
    }

    act(() => {
      result.current.addPromptTemplate(template)
    })

    expect(result.current.promptTemplates).toContainEqual(template)
  })

  test('應該正確載入配置模板', () => {
    const { result } = renderHook(() => useConfigStore())

    const template = {
      id: 'config_001',
      name: '預設配置',
      visual_config: { subtitle: { position: 'bottom' as const } }
    }

    act(() => {
      result.current.saveConfigTemplate(template)
      result.current.loadConfigTemplate('config_001')
    })

    expect(result.current.currentConfig).toEqual(template)
  })
})
```

**預期結果:**
- 配置正確儲存和讀取
- 模板管理功能正常
- 類型安全

---

#### 測試 3: useProgressStore - 進度管理

**測試檔案:** `tests/unit/stores/useProgressStore.test.ts`

**測試程式碼:**
```typescript
import { renderHook, act } from '@testing-library/react'
import { useProgressStore } from '@/stores/useProgressStore'

describe('useProgressStore', () => {
  test('應該正確更新進度', () => {
    const { result } = renderHook(() => useProgressStore())

    act(() => {
      result.current.updateProgress('proj_001', {
        stage: 'generating_script',
        progress_percent: 30,
        message: '正在生成腳本...'
      })
    })

    const progress = result.current.getProgress('proj_001')
    expect(progress?.stage).toBe('generating_script')
    expect(progress?.progress_percent).toBe(30)
  })

  test('應該正確管理 WebSocket 連線狀態', () => {
    const { result } = renderHook(() => useProgressStore())

    act(() => {
      result.current.setWebSocketStatus('connected')
    })

    expect(result.current.wsStatus).toBe('connected')
  })

  test('應該正確清除進度資料', () => {
    const { result } = renderHook(() => useProgressStore())

    act(() => {
      result.current.updateProgress('proj_001', { stage: 'generating_script', progress_percent: 30 })
      result.current.clearProgress('proj_001')
    })

    expect(result.current.getProgress('proj_001')).toBeUndefined()
  })
})
```

**預期結果:**
- 進度更新即時反映
- WebSocket 狀態管理正確
- 清除邏輯正確

---

### 整合測試

#### 測試 4: Stores 狀態持久化

**測試檔案:** `tests/integration/stores-persistence.test.ts`

**測試程式碼:**
```typescript
import { renderHook, act } from '@testing-library/react'
import { useProjectStore } from '@/stores/useProjectStore'
import { useAuthStore } from '@/stores/useAuthStore'

describe('Stores Persistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('useProjectStore 應該持久化專案列表', () => {
    const { result, unmount } = renderHook(() => useProjectStore())

    act(() => {
      result.current.addProject({ id: 'proj_001', title: '測試', status: 'draft' })
    })

    unmount()

    // 重新掛載
    const { result: result2 } = renderHook(() => useProjectStore())
    expect(result2.current.projects).toHaveLength(1)
    expect(result2.current.projects[0].id).toBe('proj_001')
  })

  test('useAuthStore 應該持久化 API Keys 狀態', () => {
    const { result, unmount } = renderHook(() => useAuthStore())

    act(() => {
      result.current.setApiKeyStatus('gemini', true)
    })

    unmount()

    const { result: result2 } = renderHook(() => useAuthStore())
    expect(result2.current.apiKeysStatus.gemini).toBe(true)
  })
})
```

**預期結果:**
- 狀態正確持久化到 localStorage
- 重新載入後狀態正確恢復
- 無資料遺失

---

## 實作規格

### 需要建立的檔案

#### 1. useProjectStore
**檔案:** `frontend/src/stores/useProjectStore.ts`

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Project {
  id: string
  title: string
  content: string
  status: 'draft' | 'generating' | 'completed' | 'failed' | 'cancelled'
  created_at: string
  updated_at: string
  config_id?: string
  youtube_video_id?: string
  error_message?: string
}

interface ProjectState {
  // State
  projects: Project[]
  currentProjectId: string | null
  filter: {
    status?: Project['status']
    search?: string
  }
  sortBy: 'created_at' | 'updated_at' | 'title'
  sortOrder: 'asc' | 'desc'

  // Computed
  currentProject: Project | null
  filteredProjects: Project[]

  // Actions
  addProject: (project: Project) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  updateProjectStatus: (id: string, status: Project['status']) => void
  deleteProject: (id: string) => void
  setCurrentProject: (id: string | null) => void
  setFilter: (filter: Partial<ProjectState['filter']>) => void
  setSorting: (sortBy: ProjectState['sortBy'], sortOrder: ProjectState['sortOrder']) => void
  reset: () => void
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      // Initial state
      projects: [],
      currentProjectId: null,
      filter: {},
      sortBy: 'created_at',
      sortOrder: 'desc',

      // Computed
      get currentProject() {
        const { projects, currentProjectId } = get()
        return projects.find(p => p.id === currentProjectId) || null
      },

      get filteredProjects() {
        const { projects, filter, sortBy, sortOrder } = get()
        let filtered = [...projects]

        // Apply filters
        if (filter.status) {
          filtered = filtered.filter(p => p.status === filter.status)
        }
        if (filter.search) {
          const search = filter.search.toLowerCase()
          filtered = filtered.filter(p =>
            p.title.toLowerCase().includes(search) ||
            p.content.toLowerCase().includes(search)
          )
        }

        // Apply sorting
        filtered.sort((a, b) => {
          const aVal = a[sortBy]
          const bVal = b[sortBy]
          const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0
          return sortOrder === 'asc' ? comparison : -comparison
        })

        return filtered
      },

      // Actions
      addProject: (project) =>
        set((state) => ({
          projects: [...state.projects, project]
        })),

      updateProject: (id, updates) =>
        set((state) => ({
          projects: state.projects.map(p =>
            p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p
          )
        })),

      updateProjectStatus: (id, status) =>
        set((state) => ({
          projects: state.projects.map(p =>
            p.id === id ? { ...p, status, updated_at: new Date().toISOString() } : p
          )
        })),

      deleteProject: (id) =>
        set((state) => ({
          projects: state.projects.filter(p => p.id !== id),
          currentProjectId: state.currentProjectId === id ? null : state.currentProjectId
        })),

      setCurrentProject: (id) =>
        set({ currentProjectId: id }),

      setFilter: (filter) =>
        set((state) => ({
          filter: { ...state.filter, ...filter }
        })),

      setSorting: (sortBy, sortOrder) =>
        set({ sortBy, sortOrder }),

      reset: () =>
        set({
          projects: [],
          currentProjectId: null,
          filter: {},
          sortBy: 'created_at',
          sortOrder: 'desc'
        })
    }),
    {
      name: 'project-store',
      partialize: (state) => ({
        projects: state.projects,
        currentProjectId: state.currentProjectId
      })
    }
  )
)
```

---

#### 2. useConfigStore
**檔案:** `frontend/src/stores/useConfigStore.ts`

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface VisualConfig {
  subtitle: {
    position: 'top' | 'center' | 'bottom'
    fontSize: number
    color: string
    backgroundColor?: string
    fontFamily?: string
    border?: {
      width: number
      color: string
    }
  }
  logo?: {
    url: string
    position: { x: number; y: number }
    size: { width: number; height: number }
    opacity: number
  }
  overlays?: Array<{
    type: 'text' | 'image' | 'shape'
    content: string
    position: { x: number; y: number }
    style: Record<string, any>
  }>
}

export interface PromptTemplate {
  id: string
  name: string
  content: string
  created_at: string
}

export interface ConfigTemplate {
  id: string
  name: string
  description?: string
  visual_config: VisualConfig
  prompt_template_id?: string
  gemini_model: 'gemini-pro' | 'gemini-flash'
}

interface ConfigState {
  // State
  currentConfig: Partial<ConfigTemplate>
  configTemplates: ConfigTemplate[]
  promptTemplates: PromptTemplate[]

  // Actions
  setVisualConfig: (config: VisualConfig) => void
  setGeminiModel: (model: ConfigTemplate['gemini_model']) => void
  saveConfigTemplate: (template: ConfigTemplate) => void
  loadConfigTemplate: (id: string) => void
  deleteConfigTemplate: (id: string) => void
  addPromptTemplate: (template: PromptTemplate) => void
  updatePromptTemplate: (id: string, updates: Partial<PromptTemplate>) => void
  deletePromptTemplate: (id: string) => void
  resetCurrentConfig: () => void
}

const defaultVisualConfig: VisualConfig = {
  subtitle: {
    position: 'bottom',
    fontSize: 48,
    color: '#FFFFFF',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    fontFamily: 'Arial'
  }
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentConfig: {
        visual_config: defaultVisualConfig,
        gemini_model: 'gemini-pro'
      },
      configTemplates: [],
      promptTemplates: [],

      // Actions
      setVisualConfig: (config) =>
        set((state) => ({
          currentConfig: {
            ...state.currentConfig,
            visual_config: config
          }
        })),

      setGeminiModel: (model) =>
        set((state) => ({
          currentConfig: {
            ...state.currentConfig,
            gemini_model: model
          }
        })),

      saveConfigTemplate: (template) =>
        set((state) => {
          const existing = state.configTemplates.find(t => t.id === template.id)
          if (existing) {
            return {
              configTemplates: state.configTemplates.map(t =>
                t.id === template.id ? template : t
              )
            }
          }
          return {
            configTemplates: [...state.configTemplates, template]
          }
        }),

      loadConfigTemplate: (id) =>
        set((state) => {
          const template = state.configTemplates.find(t => t.id === id)
          if (template) {
            return { currentConfig: template }
          }
          return state
        }),

      deleteConfigTemplate: (id) =>
        set((state) => ({
          configTemplates: state.configTemplates.filter(t => t.id !== id)
        })),

      addPromptTemplate: (template) =>
        set((state) => ({
          promptTemplates: [...state.promptTemplates, template]
        })),

      updatePromptTemplate: (id, updates) =>
        set((state) => ({
          promptTemplates: state.promptTemplates.map(t =>
            t.id === id ? { ...t, ...updates } : t
          )
        })),

      deletePromptTemplate: (id) =>
        set((state) => ({
          promptTemplates: state.promptTemplates.filter(t => t.id !== id)
        })),

      resetCurrentConfig: () =>
        set({
          currentConfig: {
            visual_config: defaultVisualConfig,
            gemini_model: 'gemini-pro'
          }
        })
    }),
    {
      name: 'config-store'
    }
  )
)
```

---

#### 3. useProgressStore
**檔案:** `frontend/src/stores/useProgressStore.ts`

```typescript
import { create } from 'zustand'

export type GenerationStage =
  | 'idle'
  | 'generating_script'
  | 'generating_audio'
  | 'generating_images'
  | 'generating_avatar'
  | 'rendering_video'
  | 'generating_thumbnail'
  | 'uploading_youtube'
  | 'completed'
  | 'failed'

export interface ProgressData {
  project_id: string
  stage: GenerationStage
  progress_percent: number
  message?: string
  current_step?: number
  total_steps?: number
  error?: string
  started_at?: string
  completed_at?: string
}

interface ProgressState {
  // State
  progressMap: Map<string, ProgressData>
  wsStatus: 'disconnected' | 'connecting' | 'connected' | 'error'
  wsError?: string

  // Actions
  updateProgress: (projectId: string, data: Partial<ProgressData>) => void
  getProgress: (projectId: string) => ProgressData | undefined
  clearProgress: (projectId: string) => void
  setWebSocketStatus: (status: ProgressState['wsStatus'], error?: string) => void
  reset: () => void
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  // Initial state
  progressMap: new Map(),
  wsStatus: 'disconnected',

  // Actions
  updateProgress: (projectId, data) =>
    set((state) => {
      const existing = state.progressMap.get(projectId)
      const updated = {
        ...existing,
        project_id: projectId,
        ...data
      } as ProgressData

      const newMap = new Map(state.progressMap)
      newMap.set(projectId, updated)

      return { progressMap: newMap }
    }),

  getProgress: (projectId) => {
    return get().progressMap.get(projectId)
  },

  clearProgress: (projectId) =>
    set((state) => {
      const newMap = new Map(state.progressMap)
      newMap.delete(projectId)
      return { progressMap: newMap }
    }),

  setWebSocketStatus: (status, error) =>
    set({ wsStatus: status, wsError: error }),

  reset: () =>
    set({
      progressMap: new Map(),
      wsStatus: 'disconnected',
      wsError: undefined
    })
}))
```

---

#### 4. useAuthStore
**檔案:** `frontend/src/stores/useAuthStore.ts`

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type APIService = 'gemini' | 'stability' | 'did'

export interface YouTubeChannel {
  id: string
  name: string
  thumbnail?: string
  connected_at: string
}

interface AuthState {
  // State
  apiKeysStatus: Record<APIService, boolean>
  youtubeChannels: YouTubeChannel[]
  selectedChannelId: string | null
  setupCompleted: boolean

  // Computed
  allApiKeysSet: boolean
  hasYouTubeAccount: boolean

  // Actions
  setApiKeyStatus: (service: APIService, exists: boolean) => void
  addYouTubeChannel: (channel: YouTubeChannel) => void
  removeYouTubeChannel: (channelId: string) => void
  setSelectedChannel: (channelId: string | null) => void
  setSetupCompleted: (completed: boolean) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      apiKeysStatus: {
        gemini: false,
        stability: false,
        did: false
      },
      youtubeChannels: [],
      selectedChannelId: null,
      setupCompleted: false,

      // Computed
      get allApiKeysSet() {
        const { apiKeysStatus } = get()
        return Object.values(apiKeysStatus).every(status => status === true)
      },

      get hasYouTubeAccount() {
        return get().youtubeChannels.length > 0
      },

      // Actions
      setApiKeyStatus: (service, exists) =>
        set((state) => ({
          apiKeysStatus: {
            ...state.apiKeysStatus,
            [service]: exists
          }
        })),

      addYouTubeChannel: (channel) =>
        set((state) => {
          const exists = state.youtubeChannels.find(c => c.id === channel.id)
          if (exists) {
            return {
              youtubeChannels: state.youtubeChannels.map(c =>
                c.id === channel.id ? channel : c
              )
            }
          }
          return {
            youtubeChannels: [...state.youtubeChannels, channel],
            selectedChannelId: state.selectedChannelId || channel.id
          }
        }),

      removeYouTubeChannel: (channelId) =>
        set((state) => ({
          youtubeChannels: state.youtubeChannels.filter(c => c.id !== channelId),
          selectedChannelId: state.selectedChannelId === channelId ? null : state.selectedChannelId
        })),

      setSelectedChannel: (channelId) =>
        set({ selectedChannelId: channelId }),

      setSetupCompleted: (completed) =>
        set({ setupCompleted: completed }),

      reset: () =>
        set({
          apiKeysStatus: {
            gemini: false,
            stability: false,
            did: false
          },
          youtubeChannels: [],
          selectedChannelId: null,
          setupCompleted: false
        })
    }),
    {
      name: 'auth-store'
    }
  )
)
```

---

#### 5. Store Types
**檔案:** `frontend/src/stores/types.ts`

```typescript
// 共用的類型定義
export * from './useProjectStore'
export * from './useConfigStore'
export * from './useProgressStore'
export * from './useAuthStore'
```

---

## 開發指引

### 開發步驟

**1. 安裝依賴**
```bash
cd frontend
npm install zustand
```

**2. 建立 stores 目錄**
```bash
mkdir -p src/stores
```

**3. 實作各個 Store**
- 按照上述規格建立 4 個 store 檔案
- 確保 TypeScript 類型完整
- 實作持久化邏輯

**4. 建立 types 匯出**
- 建立 `types.ts` 統一匯出所有類型

**5. 撰寫測試**
- 單元測試 (各 store 獨立測試)
- 整合測試 (持久化測試)
- 執行測試確保覆蓋率 > 80%

**6. 測試整合**
- 在簡單的測試頁面中使用 stores
- 驗證狀態更新和持久化

---

### 注意事項

**狀態設計:**
- [ ] 保持 store 專注單一職責
- [ ] 避免在 store 中放置過多計算邏輯
- [ ] 使用 computed values 處理衍生狀態
- [ ] 避免 store 之間的循環依賴

**效能考量:**
- [ ] 使用 shallow 比較避免不必要的 re-render
- [ ] 大型列表使用虛擬化
- [ ] 避免在 render 中訂閱整個 store

**持久化:**
- [ ] 只持久化必要的狀態
- [ ] 敏感資料不持久化到 localStorage
- [ ] 處理 localStorage quota 超限
- [ ] 實作版本遷移邏輯（如需要）

**TypeScript:**
- [ ] 確保所有 action 和 state 有類型
- [ ] 使用 strict mode
- [ ] 避免使用 any

---

## 完成檢查清單

### 開發完成
- [ ] useProjectStore 實作完成
- [ ] useConfigStore 實作完成
- [ ] useProgressStore 實作完成
- [ ] useAuthStore 實作完成
- [ ] types.ts 匯出完成

### 測試完成
- [ ] useProjectStore 測試通過
- [ ] useConfigStore 測試通過
- [ ] useProgressStore 測試通過
- [ ] useAuthStore 測試通過
- [ ] 持久化測試通過
- [ ] 測試覆蓋率 > 80%

### 文件同步
- [ ] Spec 與程式碼同步
- [ ] 類型定義完整
- [ ] 註解清楚

### Git
- [ ] 程式碼已 commit
- [ ] Commit 訊息符合規範
- [ ] 已推送到 remote

---

## 時間分配建議

- **useProjectStore 實作:** 1.5 小時
- **useConfigStore 實作:** 1.5 小時
- **useProgressStore 實作:** 1 小時
- **useAuthStore 實作:** 1 小時
- **測試撰寫:** 1 小時

**總計:** 6 小時
