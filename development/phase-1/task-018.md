# Task-018: Zustand Stores 與狀態管理

> **建立日期:** 2025-10-19
> **狀態:** ⏳ 未開始
> **預計時間:** 8 小時
> **優先級:** P0 (必須)

---

## 關聯文件

### 產品設計
- **系統架構:** `product-design/overview.md#系統架構` - 本地端單用戶無需認證
- **核心功能:** `product-design/overview.md#核心功能` - 視覺化配置、Prompt 範本、模型選擇

### 技術規格
- **狀態管理:** `tech-specs/frontend/state-management.md` - 完整的 store 定義與實作範例
- **技術框架:** `tech-specs/framework.md#前端技術棧` - Zustand 使用理由與配置

### 相關任務
- **前置任務:** Task-017 ✅ (前端初始化與路由系統)
- **後續任務:**
  - Task-019 (API 整合層 - 會使用這些 stores)
  - Task-020 ~ 026 (所有前端頁面 - 依賴這些 stores)
  - Task-024 (進度監控 - 重度使用 useProgressStore)

---

## 任務目標

### 簡述
實作完整的 Zustand 狀態管理系統，包含 4 個獨立的 stores（useProjectStore, useConfigStore, useProgressStore, useAuthStore），支援 localStorage 持久化、選擇性訂閱、TypeScript 類型安全，為所有前端頁面提供狀態管理基礎。

### 成功標準
- [ ] useProjectStore 完成（專案列表、當前專案、篩選排序）
- [ ] useConfigStore 完成（視覺配置、Prompt 範本、模板管理）
- [ ] useProgressStore 完成（生成進度、日誌、錯誤訊息）
- [ ] useAuthStore 完成（API Keys、YouTube 授權、偏好設定）
- [ ] localStorage 持久化實作完成（只持久化 settings 和 ui）
- [ ] TypeScript 類型定義完整（所有 state 和 action 都有型別）
- [ ] 選擇性訂閱機制正常（避免不必要的重新渲染）
- [ ] 單元測試覆蓋率 > 85%（測試所有 actions）
- [ ] 狀態同步邏輯正常（API 與 local 同步）

---

## 測試要求

### 單元測試（共 15 個測試案例）

#### 測試組 1: useProjectStore（4 個測試）

##### 測試 1.1：初始化狀態正確

**目的：** 驗證 store 初始化時所有欄位都有正確的預設值

**測試步驟：**
```typescript
1. 獲取 useProjectStore 的初始狀態
2. 驗證 projects.list 是空陣列
3. 驗證 projects.current 是 null
4. 驗證 projects.loading 是 false
5. 驗證 projects.error 是 null
```

**預期結果：**
```typescript
{
  projects: {
    list: [],
    current: null,
    loading: false,
    error: null
  }
}
```

**驗證點：**
- [ ] 初始 list 是空陣列
- [ ] 初始 current 是 null
- [ ] 初始 loading 是 false
- [ ] 初始 error 是 null

---

##### 測試 1.2：setProjects 正確更新專案列表

**目的：** 驗證可以正確設定專案列表

**測試步驟：**
```typescript
1. 準備測試資料（2 個 projects）
2. 呼叫 setProjects(testProjects)
3. 讀取 state.projects.list
4. 驗證列表內容正確
```

**測試資料：**
```typescript
const testProjects = [
  {
    id: 'proj-001',
    project_name: '測試專案 1',
    status: 'INITIALIZED',
    content_text: '測試內容...',
    created_at: '2025-01-19T10:00:00Z',
    updated_at: '2025-01-19T10:00:00Z'
  },
  {
    id: 'proj-002',
    project_name: '測試專案 2',
    status: 'COMPLETED',
    content_text: '另一個測試內容...',
    created_at: '2025-01-18T10:00:00Z',
    updated_at: '2025-01-19T10:00:00Z'
  }
]
```

**預期結果：**
```typescript
state.projects.list.length === 2
state.projects.list[0].id === 'proj-001'
state.projects.list[1].id === 'proj-002'
```

**驗證點：**
- [ ] 列表長度正確
- [ ] 專案 ID 正確
- [ ] 專案屬性完整

---

##### 測試 1.3：updateProject 正確更新專案狀態

**目的：** 驗證可以更新指定專案的部分欄位，並同時更新 list 和 current

**測試步驟：**
```typescript
1. 設定初始專案列表（包含 proj-001）
2. 設定 current 為 proj-001
3. 呼叫 updateProject('proj-001', { status: 'SCRIPT_GENERATING' })
4. 驗證 list 中的專案已更新
5. 驗證 current 也已更新
```

**預期結果：**
```typescript
// list 中的專案已更新
state.projects.list.find(p => p.id === 'proj-001').status === 'SCRIPT_GENERATING'

// current 也已更新
state.projects.current.status === 'SCRIPT_GENERATING'
```

**驗證點：**
- [ ] list 中的專案正確更新
- [ ] current 同步更新
- [ ] 其他欄位未改變
- [ ] 其他專案未受影響

---

##### 測試 1.4：deleteProject 正確刪除專案並清除 current

**目的：** 驗證刪除專案時，list 和 current 都正確更新

**測試步驟：**
```typescript
1. 設定專案列表（3 個專案）
2. 設定 current 為其中一個專案
3. 刪除 current 專案
4. 驗證 list 中已移除
5. 驗證 current 已設為 null
```

**預期結果：**
```typescript
// 刪除後列表減少
state.projects.list.length === 2

// current 已清空
state.projects.current === null

// 其他專案仍存在
state.projects.list.find(p => p.id === 'other-project') !== undefined
```

**驗證點：**
- [ ] 專案從 list 中移除
- [ ] current 設為 null
- [ ] 其他專案未受影響
- [ ] 刪除不存在的專案不報錯

---

#### 測試組 2: useConfigStore（3 個測試）

##### 測試 2.1：setVisualConfig 正確儲存視覺配置

**目的：** 驗證可以儲存完整的視覺配置物件

**測試步驟：**
```typescript
1. 準備視覺配置資料
2. 呼叫 setVisualConfig(config)
3. 讀取 state.visualConfig
4. 驗證配置正確儲存
```

**測試資料：**
```typescript
const visualConfig = {
  subtitle: {
    font_size: 48,
    font_color: '#FFFFFF',
    position: { x: 640, y: 600 },
    border_width: 2,
    border_color: '#000000',
    shadow: true
  },
  logo: {
    enabled: true,
    position: { x: 50, y: 50 },
    size: { width: 100, height: 100 },
    opacity: 0.8
  },
  overlays: []
}
```

**預期結果：**
```typescript
state.visualConfig.subtitle.font_size === 48
state.visualConfig.logo.enabled === true
state.visualConfig.overlays.length === 0
```

**驗證點：**
- [ ] 字幕配置正確
- [ ] Logo 配置正確
- [ ] 疊加元素正確
- [ ] 深層嵌套物件正確

---

##### 測試 2.2：addPromptTemplate 新增 Prompt 範本

**目的：** 驗證可以新增 Prompt 範本並自動生成 ID

**測試步驟：**
```typescript
1. 準備新範本資料（不包含 ID）
2. 呼叫 addPromptTemplate(template)
3. 讀取 state.promptTemplates
4. 驗證範本已新增
5. 驗證 ID 已自動生成
```

**測試資料：**
```typescript
const newTemplate = {
  name: '科技頻道範本',
  content: '請將以下內容改寫為適合科技頻道的腳本...',
  created_at: '2025-01-19T10:00:00Z'
}
```

**預期結果：**
```typescript
state.promptTemplates.length === 1
state.promptTemplates[0].id // 自動生成的 UUID
state.promptTemplates[0].name === '科技頻道範本'
```

**驗證點：**
- [ ] 範本已新增到列表
- [ ] ID 自動生成（UUID 格式）
- [ ] 範本內容正確
- [ ] 其他欄位完整

---

##### 測試 2.3：deletePromptTemplate 刪除 Prompt 範本

**目的：** 驗證可以刪除指定的 Prompt 範本

**測試步驟：**
```typescript
1. 新增 3 個範本
2. 刪除其中一個
3. 驗證列表正確更新
```

**預期結果：**
```typescript
// 初始 3 個範本
initial.length === 3

// 刪除後剩 2 個
state.promptTemplates.length === 2

// 被刪除的範本不存在
state.promptTemplates.find(t => t.id === deletedId) === undefined
```

**驗證點：**
- [ ] 範本正確刪除
- [ ] 其他範本未受影響
- [ ] 刪除不存在的範本不報錯

---

#### 測試組 3: useProgressStore（4 個測試）

##### 測試 3.1：updateProgress 正確更新進度

**目的：** 驗證可以部分更新進度資訊

**測試步驟：**
```typescript
1. 初始化 progress 狀態
2. 呼叫 updateProgress({ percentage: 50 })
3. 驗證只有 percentage 更新
4. 再呼叫 updateProgress({ stage: 'RENDERING' })
5. 驗證 stage 更新且 percentage 保持
```

**預期結果：**
```typescript
// 第一次更新
state.progress.percentage === 50
state.progress.stage === 'INITIALIZED' // 未改變

// 第二次更新
state.progress.stage === 'RENDERING'
state.progress.percentage === 50 // 保持
```

**驗證點：**
- [ ] 部分更新正常
- [ ] 未更新欄位保持不變
- [ ] 可連續更新

---

##### 測試 3.2：addLog 正確新增日誌

**目的：** 驗證可以新增日誌並保持順序

**測試步驟：**
```typescript
1. 初始日誌為空
2. 新增 3 筆日誌
3. 驗證日誌順序和內容
```

**測試資料：**
```typescript
const logs = [
  { timestamp: '10:00:00', level: 'info', message: '開始生成腳本' },
  { timestamp: '10:00:10', level: 'info', message: '腳本生成完成' },
  { timestamp: '10:00:15', level: 'warning', message: '圖片生成較慢' }
]
```

**預期結果：**
```typescript
state.progress.logs.length === 3
state.progress.logs[0].message === '開始生成腳本'
state.progress.logs[2].level === 'warning'
```

**驗證點：**
- [ ] 日誌按順序新增
- [ ] 日誌內容正確
- [ ] 不同 level 正確保存

---

##### 測試 3.3：clearLogs 清空所有日誌

**目的：** 驗證可以清空日誌但保留進度資訊

**測試步驟：**
```typescript
1. 新增多筆日誌
2. 設定進度為 50%
3. 呼叫 clearLogs()
4. 驗證日誌已清空
5. 驗證進度保持不變
```

**預期結果：**
```typescript
// 清空前
state.progress.logs.length > 0
state.progress.percentage === 50

// 清空後
state.progress.logs.length === 0
state.progress.percentage === 50 // 保持
```

**驗證點：**
- [ ] 日誌完全清空
- [ ] 進度資訊保持
- [ ] projectId 保持
- [ ] stage 保持

---

##### 測試 3.4：resetProgress 完全重置進度狀態

**目的：** 驗證可以重置所有進度相關資訊

**測試步驟：**
```typescript
1. 設定完整的進度狀態（projectId, stage, percentage, logs）
2. 呼叫 resetProgress()
3. 驗證所有欄位回到初始值
```

**預期結果：**
```typescript
state.progress === {
  projectId: null,
  stage: 'INITIALIZED',
  percentage: 0,
  logs: []
}
```

**驗證點：**
- [ ] projectId 重置為 null
- [ ] stage 重置為 'INITIALIZED'
- [ ] percentage 重置為 0
- [ ] logs 清空

---

#### 測試組 4: useAuthStore（4 個測試）

##### 測試 4.1：setApiKey 正確儲存 API Key

**目的：** 驗證可以儲存不同服務的 API Key

**測試步驟：**
```typescript
1. 儲存 Gemini API Key
2. 儲存 Stability AI API Key
3. 儲存 D-ID API Key
4. 驗證所有 key 正確儲存
```

**測試資料：**
```typescript
const keys = {
  gemini: 'AIzaSy...',
  stabilityAI: 'sk-...',
  dId: 'did-...'
}
```

**預期結果：**
```typescript
state.apiKeys.gemini === 'AIzaSy...'
state.apiKeys.stabilityAI === 'sk-...'
state.apiKeys.dId === 'did-...'
```

**驗證點：**
- [ ] Gemini key 正確儲存
- [ ] Stability AI key 正確儲存
- [ ] D-ID key 正確儲存
- [ ] 更新一個 key 不影響其他 key

---

##### 測試 4.2：addYouTubeAccount 新增 YouTube 帳號

**目的：** 驗證可以新增 YouTube 授權帳號

**測試步驟：**
```typescript
1. 初始 youtubeAccounts 為空
2. 新增第一個帳號
3. 新增第二個帳號
4. 驗證兩個帳號都存在
```

**測試資料：**
```typescript
const account1 = {
  id: 'yt-001',
  channel_name: '測試頻道 1',
  channel_id: 'UC123',
  avatar_url: 'https://...',
  authorized_at: '2025-01-19T10:00:00Z'
}

const account2 = {
  id: 'yt-002',
  channel_name: '測試頻道 2',
  channel_id: 'UC456',
  avatar_url: 'https://...',
  authorized_at: '2025-01-19T10:10:00Z'
}
```

**預期結果：**
```typescript
state.youtubeAccounts.length === 2
state.youtubeAccounts[0].channel_name === '測試頻道 1'
state.youtubeAccounts[1].channel_name === '測試頻道 2'
```

**驗證點：**
- [ ] 帳號正確新增
- [ ] 順序正確
- [ ] 所有欄位完整

---

##### 測試 4.3：removeYouTubeAccount 移除 YouTube 帳號

**目的：** 驗證可以移除指定的 YouTube 帳號

**測試步驟：**
```typescript
1. 新增 2 個帳號
2. 移除第一個帳號
3. 驗證只剩第二個帳號
```

**預期結果：**
```typescript
// 移除前
state.youtubeAccounts.length === 2

// 移除後
state.youtubeAccounts.length === 1
state.youtubeAccounts[0].id === 'yt-002'
```

**驗證點：**
- [ ] 帳號正確移除
- [ ] 其他帳號未受影響
- [ ] 移除不存在的帳號不報錯

---

##### 測試 4.4：updatePreferences 更新使用者偏好

**目的：** 驗證可以部分更新使用者偏好設定

**測試步驟：**
```typescript
1. 讀取初始偏好（預設值）
2. 更新部分偏好（voice_gender）
3. 驗證只有指定欄位更新
4. 再更新其他偏好（notification_enabled）
5. 驗證兩次更新都生效
```

**預期結果：**
```typescript
// 初始值
state.preferences.voice_gender === 'female'
state.preferences.notification_enabled === true

// 第一次更新
updatePreferences({ voice_gender: 'male' })
state.preferences.voice_gender === 'male'
state.preferences.notification_enabled === true // 保持

// 第二次更新
updatePreferences({ notification_enabled: false })
state.preferences.voice_gender === 'male' // 保持
state.preferences.notification_enabled === false
```

**驗證點：**
- [ ] 部分更新正常
- [ ] 未更新欄位保持
- [ ] 可連續更新
- [ ] 預設值正確

---

### 整合測試（2 個測試案例）

#### 測試 5.1：localStorage 持久化測試

**目的：** 驗證重新載入頁面後，持久化的狀態正確恢復

**測試步驟：**
```typescript
1. 設定 API Keys
2. 設定偏好
3. 設定 UI 狀態（sidebarCollapsed, theme）
4. 模擬頁面重新載入（重新初始化 store）
5. 驗證持久化狀態正確恢復
6. 驗證非持久化狀態（projects, progress）為初始值
```

**預期結果：**
```typescript
// 持久化狀態恢復
state.apiKeys.gemini === 'AIzaSy...'
state.preferences.voice_gender === 'male'
state.ui.sidebarCollapsed === true

// 非持久化狀態為初始值
state.projects.list.length === 0
state.progress.percentage === 0
```

**驗證點：**
- [ ] apiKeys 正確恢復
- [ ] preferences 正確恢復
- [ ] ui 狀態正確恢復
- [ ] projects 不持久化
- [ ] progress 不持久化
- [ ] batch 不持久化

---

#### 測試 5.2：選擇性訂閱與重新渲染測試

**目的：** 驗證選擇性訂閱只在相關狀態變更時觸發重新渲染

**測試步驟：**
```typescript
1. 建立測試元件，只訂閱 apiKeys.gemini
2. 使用 renderCount 計數重新渲染次數
3. 更新 apiKeys.gemini
4. 驗證元件重新渲染
5. 更新 apiKeys.stabilityAI
6. 驗證元件不重新渲染（因為沒訂閱）
7. 更新 projects.list
8. 驗證元件不重新渲染
```

**測試程式碼：**
```typescript
let renderCount = 0

function TestComponent() {
  const geminiKey = useStore((state) => state.apiKeys.gemini)
  renderCount++
  return <div>{geminiKey}</div>
}

// 初始渲染
expect(renderCount).toBe(1)

// 更新 geminiKey → 應該重新渲染
setApiKey('gemini', 'new-key')
expect(renderCount).toBe(2)

// 更新其他 key → 不應該重新渲染
setApiKey('stabilityAI', 'another-key')
expect(renderCount).toBe(2) // 保持不變

// 更新 projects → 不應該重新渲染
setProjects([...])
expect(renderCount).toBe(2) // 保持不變
```

**驗證點：**
- [ ] 只訂閱的狀態變更時重新渲染
- [ ] 未訂閱的狀態變更時不重新渲染
- [ ] 深層嵌套選擇正確
- [ ] 效能符合預期

---

## 實作規格

### 需要建立的檔案

#### 1. 型別定義: `frontend/src/types/models.ts`

**職責：** 定義所有資料模型的 TypeScript 型別

**內容：**
```typescript
// ========== YouTube Account ==========
export interface YouTubeAccount {
  id: string
  channel_name: string
  channel_id: string
  avatar_url: string
  authorized_at: string
}

// ========== User Preferences ==========
export interface UserPreferences {
  voice_gender: 'male' | 'female'
  voice_speed: number
  default_privacy: 'public' | 'unlisted' | 'private'
  keep_intermediate_assets: boolean
  notification_enabled: boolean
}

// ========== Project ==========
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

// ========== Generation Progress ==========
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

// ========== Batch Task ==========
export interface BatchTask {
  id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  created_at: string
}

// ========== Visual Configuration ==========
export interface VisualConfig {
  subtitle: SubtitleConfig
  logo: LogoConfig
  overlays: OverlayConfig[]
}

export interface SubtitleConfig {
  font_size: number
  font_color: string
  position: { x: number; y: number }
  border_width: number
  border_color: string
  shadow: boolean
}

export interface LogoConfig {
  enabled: boolean
  position: { x: number; y: number }
  size: { width: number; height: number }
  opacity: number
}

export interface OverlayConfig {
  id: string
  type: 'text' | 'image' | 'shape'
  content: string
  position: { x: number; y: number }
}

// ========== Prompt Template ==========
export interface PromptTemplate {
  id: string
  name: string
  content: string
  created_at: string
}
```

---

#### 2. Store: `frontend/src/store/useProjectStore.ts`

**職責：** 專案狀態管理

**方法列表：**
- `setProjects(projects: Project[]): void` - 設定專案列表
- `setCurrentProject(project: Project | null): void` - 設定當前專案
- `addProject(project: Project): void` - 新增專案
- `updateProject(id: string, updates: Partial<Project>): void` - 更新專案
- `deleteProject(id: string): void` - 刪除專案
- `setProjectsLoading(loading: boolean): void` - 設定載入狀態
- `setProjectsError(error: string | null): void` - 設定錯誤訊息

**程式碼骨架：**
```typescript
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
```

---

#### 3. Store: `frontend/src/store/useConfigStore.ts`

**職責：** 視覺配置與 Prompt 範本管理

**方法列表：**
- `setVisualConfig(config: VisualConfig): void` - 設定視覺配置
- `updateVisualConfig(updates: Partial<VisualConfig>): void` - 部分更新配置
- `setPromptTemplates(templates: PromptTemplate[]): void` - 設定 Prompt 範本列表
- `addPromptTemplate(template: Omit<PromptTemplate, 'id'>): void` - 新增範本
- `updatePromptTemplate(id: string, updates: Partial<PromptTemplate>): void` - 更新範本
- `deletePromptTemplate(id: string): void` - 刪除範本

**程式碼骨架：**
```typescript
import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { VisualConfig, PromptTemplate } from '@/types/models'

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
        { ...template, id: uuidv4() },
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
```

---

#### 4. Store: `frontend/src/store/useProgressStore.ts`

**職責：** 生成進度與日誌管理

**方法列表：**
- `updateProgress(progress: Partial<ProgressState>): void` - 更新進度
- `addLog(log: LogEntry): void` - 新增日誌
- `clearLogs(): void` - 清空日誌
- `resetProgress(): void` - 重置進度

**程式碼骨架：**
```typescript
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
```

---

#### 5. Store: `frontend/src/store/useAuthStore.ts`

**職責：** API Keys、YouTube 授權、使用者偏好管理（支援持久化）

**方法列表：**
- `setApiKey(service: 'gemini' | 'stabilityAI' | 'dId', key: string): void` - 設定 API Key
- `addYouTubeAccount(account: YouTubeAccount): void` - 新增 YouTube 帳號
- `removeYouTubeAccount(accountId: string): void` - 移除 YouTube 帳號
- `updatePreferences(preferences: Partial<UserPreferences>): void` - 更新偏好
- `toggleSidebar(): void` - 切換側邊欄
- `setTheme(theme: 'light' | 'dark'): void` - 設定主題

**程式碼骨架（含持久化）：**
```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { YouTubeAccount, UserPreferences } from '@/types/models'

interface AuthState {
  apiKeys: {
    gemini: string | null
    stabilityAI: string | null
    dId: string | null
  }
  youtubeAccounts: YouTubeAccount[]
  preferences: UserPreferences
  ui: {
    sidebarCollapsed: boolean
    theme: 'light' | 'dark'
  }
}

interface AuthActions {
  setApiKey: (service: 'gemini' | 'stabilityAI' | 'dId', key: string) => void
  addYouTubeAccount: (account: YouTubeAccount) => void
  removeYouTubeAccount: (accountId: string) => void
  updatePreferences: (preferences: Partial<UserPreferences>) => void
  toggleSidebar: () => void
  setTheme: (theme: 'light' | 'dark') => void
}

const defaultPreferences: UserPreferences = {
  voice_gender: 'female',
  voice_speed: 1.0,
  default_privacy: 'unlisted',
  keep_intermediate_assets: false,
  notification_enabled: true,
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      // ========== State ==========
      apiKeys: {
        gemini: null,
        stabilityAI: null,
        dId: null,
      },
      youtubeAccounts: [],
      preferences: defaultPreferences,
      ui: {
        sidebarCollapsed: false,
        theme: 'light',
      },

      // ========== Actions ==========
      setApiKey: (service, key) => {
        set((state) => ({
          apiKeys: {
            ...state.apiKeys,
            [service]: key,
          },
        }))
      },

      addYouTubeAccount: (account) => {
        set((state) => ({
          youtubeAccounts: [...state.youtubeAccounts, account],
        }))
      },

      removeYouTubeAccount: (accountId) => {
        set((state) => ({
          youtubeAccounts: state.youtubeAccounts.filter(
            (acc) => acc.id !== accountId
          ),
        }))
      },

      updatePreferences: (preferences) => {
        set((state) => ({
          preferences: {
            ...state.preferences,
            ...preferences,
          },
        }))
      },

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
    }),
    {
      name: 'ytmaker-auth-storage', // localStorage key
      // 只持久化這個 store 的所有狀態
    }
  )
)
```

---

#### 6. 測試檔案: `frontend/src/store/__tests__/useProjectStore.test.ts`

**職責：** useProjectStore 單元測試

**測試框架：** Vitest + React Testing Library

**程式碼骨架：**
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useProjectStore } from '../useProjectStore'
import type { Project } from '@/types/models'

describe('useProjectStore', () => {
  beforeEach(() => {
    // 重置 store
    useProjectStore.setState({
      projects: {
        list: [],
        current: null,
        loading: false,
        error: null,
      },
    })
  })

  it('測試 1.1: 初始化狀態正確', () => {
    const { result } = renderHook(() => useProjectStore())

    expect(result.current.projects.list).toEqual([])
    expect(result.current.projects.current).toBeNull()
    expect(result.current.projects.loading).toBe(false)
    expect(result.current.projects.error).toBeNull()
  })

  it('測試 1.2: setProjects 正確更新專案列表', () => {
    const { result } = renderHook(() => useProjectStore())

    const testProjects: Project[] = [
      {
        id: 'proj-001',
        project_name: '測試專案 1',
        status: 'INITIALIZED',
        content_text: '測試內容...',
        created_at: '2025-01-19T10:00:00Z',
        updated_at: '2025-01-19T10:00:00Z',
      },
      {
        id: 'proj-002',
        project_name: '測試專案 2',
        status: 'COMPLETED',
        content_text: '另一個測試內容...',
        created_at: '2025-01-18T10:00:00Z',
        updated_at: '2025-01-19T10:00:00Z',
      },
    ]

    act(() => {
      result.current.setProjects(testProjects)
    })

    expect(result.current.projects.list).toHaveLength(2)
    expect(result.current.projects.list[0].id).toBe('proj-001')
    expect(result.current.projects.list[1].id).toBe('proj-002')
  })

  // ... 其他測試案例
})
```

---

#### 7. 測試檔案: `frontend/src/store/__tests__/useConfigStore.test.ts`

**職責：** useConfigStore 單元測試（3 個測試）

---

#### 8. 測試檔案: `frontend/src/store/__tests__/useProgressStore.test.ts`

**職責：** useProgressStore 單元測試（4 個測試）

---

#### 9. 測試檔案: `frontend/src/store/__tests__/useAuthStore.test.ts`

**職責：** useAuthStore 單元測試（4 個測試）

---

#### 10. 整合測試: `frontend/src/store/__tests__/integration.test.ts`

**職責：** 持久化與選擇性訂閱整合測試（2 個測試）

**測試內容：**
- localStorage 持久化測試
- 選擇性訂閱與重新渲染測試

---

### 檔案結構總覽

```
frontend/src/
├── types/
│   └── models.ts                    # 所有型別定義
├── store/
│   ├── useProjectStore.ts           # 專案狀態管理
│   ├── useConfigStore.ts            # 配置狀態管理
│   ├── useProgressStore.ts          # 進度狀態管理
│   ├── useAuthStore.ts              # 認證與設定狀態管理
│   └── __tests__/
│       ├── useProjectStore.test.ts  # 專案 store 測試（4 個測試）
│       ├── useConfigStore.test.ts   # 配置 store 測試（3 個測試）
│       ├── useProgressStore.test.ts # 進度 store 測試（4 個測試）
│       ├── useAuthStore.test.ts     # 認證 store 測試（4 個測試）
│       └── integration.test.ts      # 整合測試（2 個測試）
```

---

## 開發指引

### TDD 開發流程

#### 第 1 步：環境準備（10 分鐘）
1. 確認 Task-017 已完成（前端專案已初始化）
2. 確認測試環境可運行：`npm test`
3. 安裝必要依賴：
   ```bash
   npm install zustand uuid
   npm install -D @types/uuid vitest @testing-library/react @testing-library/react-hooks
   ```
4. 閱讀 `tech-specs/frontend/state-management.md`

#### 第 2 步：建立型別定義（20 分鐘）
1. 建立 `src/types/models.ts`
2. 定義所有介面和型別（參考 spec）
3. 確認型別沒有 TypeScript 錯誤

#### 第 3 步：撰寫 useProjectStore 測試（30 分鐘）
1. 建立 `src/store/__tests__/useProjectStore.test.ts`
2. 撰寫測試 1.1 ~ 1.4（4 個測試）
3. 執行測試 → 失敗（預期，因為還沒實作）

#### 第 4 步：實作 useProjectStore（40 分鐘）
1. 建立 `src/store/useProjectStore.ts`
2. 實作所有 actions
3. 執行測試 → 全部通過 ✅

#### 第 5 步：撰寫 useConfigStore 測試（20 分鐘）
1. 建立 `src/store/__tests__/useConfigStore.test.ts`
2. 撰寫測試 2.1 ~ 2.3（3 個測試）
3. 執行測試 → 失敗

#### 第 6 步：實作 useConfigStore（30 分鐘）
1. 建立 `src/store/useConfigStore.ts`
2. 實作所有 actions（注意 UUID 生成）
3. 執行測試 → 全部通過 ✅

#### 第 7 步：撰寫 useProgressStore 測試（25 分鐘）
1. 建立 `src/store/__tests__/useProgressStore.test.ts`
2. 撰寫測試 3.1 ~ 3.4（4 個測試）
3. 執行測試 → 失敗

#### 第 8 步：實作 useProgressStore（30 分鐘）
1. 建立 `src/store/useProgressStore.ts`
2. 實作所有 actions
3. 執行測試 → 全部通過 ✅

#### 第 9 步：撰寫 useAuthStore 測試（25 分鐘）
1. 建立 `src/store/__tests__/useAuthStore.test.ts`
2. 撰寫測試 4.1 ~ 4.4（4 個測試）
3. 執行測試 → 失敗

#### 第 10 步：實作 useAuthStore（含持久化）（40 分鐘）
1. 建立 `src/store/useAuthStore.ts`
2. 使用 `persist` middleware
3. 配置 localStorage key
4. 執行測試 → 全部通過 ✅

#### 第 11 步：整合測試（30 分鐘）
1. 建立 `src/store/__tests__/integration.test.ts`
2. 撰寫測試 5.1（localStorage 持久化）
3. 撰寫測試 5.2（選擇性訂閱）
4. 執行測試 → 全部通過 ✅

#### 第 12 步：重構與優化（20 分鐘）
1. 檢查程式碼重複
2. 提取共用型別
3. 改善註解
4. 再次執行所有測試

#### 第 13 步：文件與檢查（20 分鐘）
1. 檢查測試覆蓋率：`npm run test:coverage`
2. 執行 linter：`npm run lint`
3. 格式化程式碼：`npm run format`
4. 更新 README（如需要）

---

### 注意事項

#### TypeScript
- ⚠️ 所有 state 和 action 都必須有型別定義
- ⚠️ 使用 `Partial<T>` 處理部分更新
- ⚠️ 使用 `Omit<T, K>` 排除特定欄位（如 ID）

#### 狀態更新
- ⚠️ 永遠使用 immutable 方式更新（展開運算子）
- ⚠️ 不要直接修改 state
- ⚠️ 嵌套物件要逐層展開

#### 持久化
- ⚠️ 只有 useAuthStore 需要持久化
- ⚠️ localStorage key 要清楚命名
- ⚠️ 敏感資料（API Keys）要考慮加密（可選）

#### 效能
- 💡 使用選擇性訂閱避免不必要渲染
- 💡 避免在 render 中呼叫 actions
- 💡 大型列表考慮使用虛擬化

#### 測試
- ✅ 使用 `renderHook` 測試 hooks
- ✅ 使用 `act` 包裹 state 更新
- ✅ 每個測試前重置 store
- ✅ 測試應該獨立執行

#### 與其他模組整合
- 🔗 Task-019（API 整合）會在這些 stores 中呼叫 API
- 🔗 Task-020 ~ 026（所有頁面）會大量使用這些 stores
- 🔗 Task-024（進度監控）會透過 WebSocket 更新 useProgressStore

---

### 完成檢查清單

#### 功能完整性
- [ ] useProjectStore 所有 actions 實作完成
- [ ] useConfigStore 所有 actions 實作完成
- [ ] useProgressStore 所有 actions 實作完成
- [ ] useAuthStore 所有 actions 實作完成
- [ ] localStorage 持久化正常運作
- [ ] 預設值正確設定

#### 測試
- [ ] useProjectStore 測試通過（4 個測試）
- [ ] useConfigStore 測試通過（3 個測試）
- [ ] useProgressStore 測試通過（4 個測試）
- [ ] useAuthStore 測試通過（4 個測試）
- [ ] 整合測試通過（2 個測試）
- [ ] 測試覆蓋率 > 85%

#### 程式碼品質
- [ ] ESLint 檢查通過：`npm run lint`
- [ ] TypeScript 編譯無錯誤：`npm run type-check`
- [ ] 程式碼已格式化：`npm run format`
- [ ] 所有檔案有適當註解

#### 型別安全
- [ ] 所有 state 都有型別定義
- [ ] 所有 action 都有型別定義
- [ ] 無 `any` 型別（除非必要）
- [ ] 泛型使用正確

#### 文件
- [ ] 每個 store 都有清楚的註解
- [ ] 每個 action 都有 JSDoc
- [ ] README 已更新使用範例（如需要）

---

## 預估時間分配

- 環境準備與閱讀：10 分鐘
- 型別定義：20 分鐘
- useProjectStore（測試 + 實作）：70 分鐘
- useConfigStore（測試 + 實作）：50 分鐘
- useProgressStore（測試 + 實作）：55 分鐘
- useAuthStore（測試 + 實作）：65 分鐘
- 整合測試：30 分鐘
- 重構優化：20 分鐘
- 文件檢查：20 分鐘

**總計：約 5.5 小時**（預留 2.5 小時 buffer = 8 小時）

---

## 參考資源

### Zustand 官方文檔
- [Getting Started](https://zustand-demo.pmnd.rs/)
- [Persist Middleware](https://github.com/pmndrs/zustand/blob/main/docs/integrations/persisting-store-data.md)
- [TypeScript Guide](https://github.com/pmndrs/zustand/blob/main/docs/guides/typescript.md)

### 測試相關
- [Vitest](https://vitest.dev/) - 測試框架
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) - React 測試工具
- [Testing Hooks](https://react-hooks-testing-library.com/) - Hook 測試指南

### 專案內部文件
- `tech-specs/frontend/state-management.md` - 狀態管理完整規格
- `tech-specs/framework.md` - 前端技術棧
- `product-design/overview.md` - 產品核心功能

---

**準備好了嗎？** 開始使用 TDD 方式實作 4 個 Zustand stores！🚀
