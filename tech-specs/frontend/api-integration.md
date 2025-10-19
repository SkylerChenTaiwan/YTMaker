# API 整合

> **建立日期:** 2025-10-19
> **最後更新:** 2025-10-19
> **關聯文件:** `_index.md`, `state-management.md`, `pages.md`, `../backend/`

---

## 📖 目錄

1. [API 呼叫策略](#api-呼叫策略)
2. [請求/回應處理](#請求回應處理)
3. [Loading 狀態管理](#loading-狀態管理)
4. [錯誤處理與重試](#錯誤處理與重試)
5. [快取策略](#快取策略)
6. [樂觀更新](#樂觀更新)
7. [即時資料同步 (WebSocket)](#即時資料同步-websocket)

---

## API 呼叫策略

### HTTP 客戶端

**使用:** Axios

### 基本配置

```typescript
// services/api.ts
import axios from 'axios'
import { toast } from './toast'

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 請求攔截器
apiClient.interceptors.request.use(
  (config) => {
    // 添加通用 headers (如需要)
    // 例如: config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 回應攔截器
apiClient.interceptors.response.use(
  (response) => {
    // 直接返回 data
    return response.data
  },
  (error) => {
    handleApiError(error)
    return Promise.reject(error)
  }
)

export default apiClient
```

---

## 請求/回應處理

### 請求格式

```typescript
// services/projectService.ts
import apiClient from './api'
import type { Project, CreateProjectData } from '@/types/models'

/**
 * 創建新專案
 */
export const createProject = async (data: CreateProjectData): Promise<Project> => {
  return apiClient.post('/projects', {
    project_name: data.projectName,
    content_text: data.contentText,
    content_source: data.contentSource,
  })
}

/**
 * 獲取專案列表
 */
export const getProjects = async (): Promise<Project[]> => {
  return apiClient.get('/projects')
}

/**
 * 獲取單一專案
 */
export const getProject = async (id: string): Promise<Project> => {
  return apiClient.get(`/projects/${id}`)
}

/**
 * 更新專案
 */
export const updateProject = async (
  id: string,
  data: Partial<Project>
): Promise<Project> => {
  return apiClient.put(`/projects/${id}`, data)
}

/**
 * 刪除專案
 */
export const deleteProject = async (id: string): Promise<void> => {
  return apiClient.delete(`/projects/${id}`)
}

/**
 * 開始生成影片
 */
export const startGeneration = async (id: string): Promise<void> => {
  return apiClient.post(`/projects/${id}/generate`)
}
```

### 回應格式

```typescript
// 成功回應
interface SuccessResponse<T> {
  data: T
  message?: string
}

// 錯誤回應
interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: any
  }
}
```

### 型別定義

```typescript
// types/api.ts
export interface CreateProjectData {
  projectName: string
  contentText: string
  contentSource: 'upload' | 'paste'
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
```

---

## Loading 狀態管理

### 使用 TanStack Query (推薦)

```typescript
import { useQuery, useMutation } from '@tanstack/react-query'
import * as api from '@/services/projectService'

const ProjectList = () => {
  // 查詢專案列表
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.getProjects(),
    staleTime: 5 * 60 * 1000, // 5 分鐘
  })

  // UI 顯示
  if (isLoading) return <Spinner />
  if (error) return <ErrorMessage message={error.message} />
  if (!data) return null

  return <ProjectList projects={data} />
}
```

### 使用 Mutation

```typescript
const NewProjectPage = () => {
  const mutation = useMutation({
    mutationFn: (data: CreateProjectData) => api.createProject(data),
    onSuccess: (project) => {
      toast.success('專案創建成功！')
      router.push(`/project/${project.id}/configure/visual`)
    },
    onError: (error) => {
      toast.error('創建失敗，請重試')
    },
  })

  const handleSubmit = () => {
    mutation.mutate({
      projectName: formData.projectName,
      contentText: formData.contentText,
      contentSource: formData.contentSource,
    })
  }

  return (
    <Button
      loading={mutation.isLoading}
      onClick={handleSubmit}
    >
      創建專案
    </Button>
  )
}
```

---

## 錯誤處理與重試

### 錯誤處理函數

```typescript
// services/api.ts
const handleApiError = (error: any) => {
  if (error.response) {
    const { status, data } = error.response

    switch (status) {
      case 400:
        toast.error(data.error?.message || '請求參數錯誤')
        break
      case 401:
        toast.error('未授權，請重新登入')
        break
      case 403:
        toast.error('無權限執行此操作')
        break
      case 404:
        toast.error('資源不存在')
        break
      case 409:
        toast.error('資源衝突，請刷新後重試')
        break
      case 422:
        toast.error(data.error?.message || '資料驗證失敗')
        break
      case 500:
        toast.error('伺服器錯誤，請稍後重試')
        break
      case 503:
        toast.error('服務暫時無法使用，請稍後重試')
        break
      default:
        toast.error('發生錯誤，請稍後重試')
    }
  } else if (error.request) {
    toast.error('網路連線失敗，請檢查網路')
  } else {
    toast.error(error.message || '發生未知錯誤')
  }
}
```

### 重試策略 (使用 axios-retry)

```typescript
import axiosRetry from 'axios-retry'

axiosRetry(apiClient, {
  retries: 3, // 重試 3 次
  retryDelay: axiosRetry.exponentialDelay, // 指數退避
  retryCondition: (error) => {
    // 只在網路錯誤或 5xx 錯誤時重試
    return (
      axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      (error.response?.status ?? 0) >= 500
    )
  },
})
```

### TanStack Query 重試配置

```typescript
const { data } = useQuery({
  queryKey: ['projects'],
  queryFn: () => api.getProjects(),
  retry: (failureCount, error) => {
    // 最多重試 2 次
    if (failureCount >= 2) return false

    // 只在網路錯誤或 5xx 錯誤時重試
    if (error.response?.status && error.response.status < 500) {
      return false
    }

    return true
  },
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // 指數退避
})
```

---

## 快取策略

### TanStack Query 快取配置

```typescript
import { QueryClient } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 分鐘
      cacheTime: 10 * 60 * 1000, // 10 分鐘
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})
```

### 快取策略表

| 資料類型 | Stale Time | Cache Time | 策略 |
|---------|-----------|-----------|------|
| 專案列表 | 1 分鐘 | 5 分鐘 | 背景自動更新 |
| 專案詳情 | 30 秒 | 5 分鐘 | 手動更新 |
| 統計資料 | 5 分鐘 | 10 分鐘 | 背景自動更新 |
| 模板列表 | 10 分鐘 | 30 分鐘 | 手動更新 |
| API 配額 | 1 分鐘 | 5 分鐘 | 背景自動更新 |

### 手動使快取失效

```typescript
import { useQueryClient } from '@tanstack/react-query'

const Component = () => {
  const queryClient = useQueryClient()

  const handleRefresh = () => {
    // 使特定查詢快取失效
    queryClient.invalidateQueries({ queryKey: ['projects'] })

    // 使所有查詢快取失效
    queryClient.invalidateQueries()
  }

  return <Button onClick={handleRefresh}>刷新</Button>
}
```

---

## 樂觀更新

### 範例: 刪除專案

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'

const DeleteProjectButton = ({ projectId }: { projectId: string }) => {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (id: string) => api.deleteProject(id),

    // 樂觀更新
    onMutate: async (id) => {
      // 取消所有正在進行的查詢
      await queryClient.cancelQueries({ queryKey: ['projects'] })

      // 保存當前資料 (用於回滾)
      const previousProjects = queryClient.getQueryData(['projects'])

      // 樂觀更新 UI
      queryClient.setQueryData(['projects'], (old: Project[]) =>
        old.filter((p) => p.id !== id)
      )

      // 返回 context (用於回滾)
      return { previousProjects }
    },

    // 失敗時回滾
    onError: (err, id, context) => {
      toast.error('刪除失敗')
      queryClient.setQueryData(['projects'], context?.previousProjects)
    },

    // 成功後重新驗證
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })

  return (
    <Button
      type="danger"
      loading={mutation.isLoading}
      onClick={() => mutation.mutate(projectId)}
    >
      刪除
    </Button>
  )
}
```

### 範例: 更新專案

```typescript
const mutation = useMutation({
  mutationFn: ({ id, data }: { id: string; data: Partial<Project> }) =>
    api.updateProject(id, data),

  onMutate: async ({ id, data }) => {
    await queryClient.cancelQueries({ queryKey: ['projects', id] })

    const previousProject = queryClient.getQueryData(['projects', id])

    // 樂觀更新
    queryClient.setQueryData(['projects', id], (old: Project) => ({
      ...old,
      ...data,
    }))

    return { previousProject }
  },

  onError: (err, variables, context) => {
    queryClient.setQueryData(['projects', variables.id], context?.previousProject)
  },

  onSettled: (data, error, variables) => {
    queryClient.invalidateQueries({ queryKey: ['projects', variables.id] })
  },
})
```

---

## 即時資料同步 (WebSocket)

### WebSocket 客戶端

```typescript
// services/websocket.ts
import { io, Socket } from 'socket.io-client'
import { useStore } from '@/store/useStore'

class WebSocketService {
  private socket: Socket | null = null

  /**
   * 連接到專案進度 WebSocket
   */
  connect(projectId: string) {
    if (this.socket) {
      this.disconnect()
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'
    this.socket = io(`${wsUrl}/ws/progress/${projectId}`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    // 連接成功
    this.socket.on('connect', () => {
      console.log('WebSocket connected')
    })

    // 進度更新
    this.socket.on('progress', (data: {
      stage: string
      percentage: number
    }) => {
      useStore.getState().updateProgress({
        stage: data.stage as any,
        percentage: data.percentage,
      })
    })

    // 日誌更新
    this.socket.on('log', (log: {
      timestamp: string
      level: 'info' | 'warning' | 'error'
      message: string
    }) => {
      useStore.getState().addLog(log)
    })

    // 錯誤處理
    this.socket.on('error', (error: any) => {
      console.error('WebSocket error:', error)
      toast.error('連線錯誤，請重新載入頁面')
    })

    // 斷線處理
    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected')
    })

    return this.socket
  }

  /**
   * 斷開連接
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  /**
   * 發送訊息
   */
  emit(event: string, data: any) {
    if (this.socket) {
      this.socket.emit(event, data)
    }
  }
}

export const websocket = new WebSocketService()
```

### 頁面中使用

```tsx
// app/project/[id]/progress/page.tsx
import { useEffect } from 'react'
import { useStore } from '@/store/useStore'
import { websocket } from '@/services/websocket'

export default function ProgressPage({ params }: { params: { id: string } }) {
  const progress = useStore((state) => state.progress)

  useEffect(() => {
    // 連接 WebSocket
    websocket.connect(params.id)

    // 清理函數
    return () => {
      websocket.disconnect()
    }
  }, [params.id])

  return (
    <div>
      <h1>進度監控</h1>
      <ProgressBar value={progress.percentage} />
      <p>當前階段: {progress.stage}</p>
      <LogViewer logs={progress.logs} />
    </div>
  )
}
```

### 自訂 Hook 封裝

```typescript
// hooks/useWebSocket.ts
import { useEffect } from 'react'
import { websocket } from '@/services/websocket'

export const useWebSocket = (projectId: string) => {
  useEffect(() => {
    websocket.connect(projectId)

    return () => {
      websocket.disconnect()
    }
  }, [projectId])
}

// 使用
const ProgressPage = ({ params }: { params: { id: string } }) => {
  useWebSocket(params.id)

  // ...
}
```

---

## API 整合最佳實踐

### 1. 集中管理 API 服務

將所有 API 呼叫封裝到 service 層:

```
services/
├── api.ts              # Axios 客戶端
├── projectService.ts   # 專案相關 API
├── configService.ts    # 配置相關 API
├── templateService.ts  # 模板相關 API
└── batchService.ts     # 批次相關 API
```

### 2. 使用 TypeScript 型別

所有 API 請求和回應都應有明確的型別定義。

### 3. 統一錯誤處理

在 Axios 攔截器中統一處理錯誤,避免在每個元件中重複處理。

### 4. 使用 TanStack Query

利用 TanStack Query 的快取、重試、背景更新等功能,簡化狀態管理。

### 5. 樂觀更新提升 UX

對於刪除、更新等操作,使用樂觀更新立即反映 UI,提升使用者體驗。

---

## 更新記錄

| 日期 | 版本 | 修改內容 | 修改人 |
|------|------|----------|--------|
| 2025-10-19 | 1.0 | 初始版本，從 frontend-spec.md 拆分 | Claude Code |
