# [v] Task-019: Axios 客戶端與 API 整合層

> **建立日期:** 2025-10-19
> **狀態:** ✅ 已完成
> **預計時間:** 6 小時
> **優先級:** P0 (必須)
> **完成日期:** 2025-10-21

---

## 關聯文件

### 產品設計
- **概述:** `product-design/overview.md`

### 技術規格
- **API 整合:** `tech-specs/frontend/api-integration.md`
- **技術框架:** `tech-specs/framework.md`
- **後端 API 規格:** `tech-specs/backend/api-*.md` (所有 API 模組)

### 相關任務
- **前置任務:** Task-017 ✅ (路由系統), Task-018 ✅ (Zustand Stores)
- **後續任務:** Task-020 ~ 028 (所有前端頁面都需要使用 API 服務層)

---

## 任務目標

### 簡述
建立完整的 Axios HTTP 客戶端，實作 6 個 API 服務層（Projects, Configurations, System, YouTube, Stats, Batch），包含統一錯誤處理、自動重試機制、請求/回應攔截器。

### 成功標準
- [ ] Axios 實例配置完成（baseURL, timeout, interceptors）
- [ ] 請求攔截器完成（添加 headers, 日誌）
- [ ] 回應攔截器完成（錯誤處理、自動重試）
- [ ] 6 個 API 服務層完成（總共 33 個方法）
  - [ ] `projectsApi` (12 個方法)
  - [ ] `configurationsApi` (6 個方法)
  - [ ] `systemApi` (4 個方法)
  - [ ] `youtubeApi` (4 個方法)
  - [ ] `statsApi` (2 個方法)
  - [ ] `batchApi` (5 個方法)
- [ ] TypeScript 型別定義完成（Request/Response 型別）
- [ ] 錯誤處理函數完成
- [ ] 單元測試完成（覆蓋率 > 85%）

---

## 測試要求

### 單元測試

#### 測試 1：Axios 實例正確初始化

**目的：** 驗證 Axios 實例配置正確

**測試檔案：** `frontend/src/services/__tests__/api.test.ts`

**測試內容：**
```typescript
describe('Axios Client', () => {
  it('should initialize with correct baseURL', () => {
    expect(apiClient.defaults.baseURL).toBe('http://localhost:8000/api/v1')
  })

  it('should have correct timeout', () => {
    expect(apiClient.defaults.timeout).toBe(30000)
  })

  it('should have correct Content-Type header', () => {
    expect(apiClient.defaults.headers['Content-Type']).toBe('application/json')
  })
})
```

**驗證點：**
- [ ] baseURL 為 `http://localhost:8000/api/v1`
- [ ] timeout 為 30000ms
- [ ] Content-Type 為 `application/json`

---

#### 測試 2：請求攔截器正常工作

**目的：** 驗證請求攔截器添加 headers

**測試內容：**
```typescript
describe('Request Interceptor', () => {
  it('should add custom headers to request', async () => {
    const mockFn = jest.fn()
    apiClient.interceptors.request.use((config) => {
      mockFn(config)
      return config
    })

    await apiClient.get('/test')

    expect(mockFn).toHaveBeenCalled()
  })
})
```

**驗證點：**
- [ ] 攔截器被正確調用
- [ ] Config 物件被正確傳遞

---

#### 測試 3：回應攔截器正確處理成功回應

**目的：** 驗證回應攔截器直接返回 data

**Mock API 回應：**
```typescript
{
  data: { id: '123', name: 'Test Project' },
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {}
}
```

**預期行為：**
```typescript
describe('Response Interceptor - Success', () => {
  it('should return data directly', async () => {
    mock.onGet('/projects/123').reply(200, {
      data: { id: '123', name: 'Test Project' }
    })

    const result = await apiClient.get('/projects/123')

    expect(result).toEqual({ id: '123', name: 'Test Project' })
  })
})
```

**驗證點：**
- [ ] 直接返回 response.data
- [ ] 不返回整個 response 物件

---

#### 測試 4：錯誤處理 - 400 Bad Request

**目的：** 驗證 400 錯誤正確處理

**Mock API 回應：**
```typescript
{
  status: 400,
  data: {
    error: {
      code: 'INVALID_INPUT',
      message: '文字長度必須在 500-10000 字之間'
    }
  }
}
```

**預期行為：**
```typescript
describe('Error Handling - 400', () => {
  it('should show toast error for 400 status', async () => {
    mock.onPost('/projects').reply(400, {
      error: {
        code: 'INVALID_INPUT',
        message: '文字長度必須在 500-10000 字之間'
      }
    })

    await expect(apiClient.post('/projects', {})).rejects.toThrow()
    expect(toast.error).toHaveBeenCalledWith('文字長度必須在 500-10000 字之間')
  })
})
```

**驗證點：**
- [ ] 拋出 Promise rejection
- [ ] 顯示 toast 錯誤訊息
- [ ] 錯誤訊息為 API 回傳的 message

---

#### 測試 5：錯誤處理 - 500 Server Error

**目的：** 驗證 500 錯誤正確處理並重試

**Mock API 回應：**
- 第 1 次請求：500 Internal Server Error
- 第 2 次請求：500 Internal Server Error
- 第 3 次請求：200 OK

**預期行為：**
```typescript
describe('Error Handling - 500 with Retry', () => {
  it('should retry on 500 error and eventually succeed', async () => {
    let attemptCount = 0

    mock.onGet('/projects').reply(() => {
      attemptCount++
      if (attemptCount < 3) {
        return [500, { error: { message: 'Server Error' } }]
      }
      return [200, { data: [{ id: '1' }] }]
    })

    const result = await apiClient.get('/projects')

    expect(attemptCount).toBe(3)
    expect(result).toEqual([{ id: '1' }])
  })
})
```

**驗證點：**
- [ ] 自動重試 2 次（總共 3 次請求）
- [ ] 最終成功時返回正確資料
- [ ] 使用指數退避延遲

---

#### 測試 6：Projects API - 創建專案

**目的：** 驗證 createProject 方法正確調用 API

**輸入：**
```typescript
{
  projectName: 'Test Project',
  contentText: '測試內容'.repeat(100), // 至少 500 字
  contentSource: 'paste'
}
```

**預期 API 請求：**
```typescript
POST /api/v1/projects
{
  project_name: 'Test Project',
  content_text: '測試內容...',
  content_source: 'paste'
}
```

**預期回應：**
```typescript
{
  id: 'proj-123',
  project_name: 'Test Project',
  status: 'INITIALIZED',
  content_text: '測試內容...',
  created_at: '2025-10-19T10:00:00Z',
  updated_at: '2025-10-19T10:00:00Z'
}
```

**測試程式碼：**
```typescript
describe('Projects API - createProject', () => {
  it('should create project with correct data', async () => {
    const projectData = {
      projectName: 'Test Project',
      contentText: '測試內容'.repeat(100),
      contentSource: 'paste' as const
    }

    mock.onPost('/projects').reply(201, {
      id: 'proj-123',
      project_name: 'Test Project',
      status: 'INITIALIZED',
      content_text: projectData.contentText,
      created_at: '2025-10-19T10:00:00Z',
      updated_at: '2025-10-19T10:00:00Z'
    })

    const result = await projectsApi.createProject(projectData)

    expect(result.id).toBe('proj-123')
    expect(result.project_name).toBe('Test Project')
    expect(result.status).toBe('INITIALIZED')
  })
})
```

**驗證點：**
- [ ] 正確發送 POST 請求到 `/api/v1/projects`
- [ ] Request body 格式正確（snake_case）
- [ ] 回傳正確的 Project 物件（camelCase）
- [ ] 回傳 201 Created 狀態碼

---

#### 測試 7：Projects API - 獲取專案列表

**目的：** 驗證 getProjects 方法正確調用 API

**預期 API 請求：**
```typescript
GET /api/v1/projects
```

**預期回應：**
```typescript
[
  {
    id: 'proj-1',
    project_name: 'Project 1',
    status: 'COMPLETED',
    created_at: '2025-10-18T10:00:00Z'
  },
  {
    id: 'proj-2',
    project_name: 'Project 2',
    status: 'RENDERING',
    created_at: '2025-10-19T10:00:00Z'
  }
]
```

**測試程式碼：**
```typescript
describe('Projects API - getProjects', () => {
  it('should fetch projects list', async () => {
    const mockProjects = [
      { id: 'proj-1', project_name: 'Project 1', status: 'COMPLETED' },
      { id: 'proj-2', project_name: 'Project 2', status: 'RENDERING' }
    ]

    mock.onGet('/projects').reply(200, mockProjects)

    const result = await projectsApi.getProjects()

    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('proj-1')
  })
})
```

**驗證點：**
- [ ] 正確發送 GET 請求到 `/api/v1/projects`
- [ ] 回傳 Project 陣列
- [ ] 回傳 200 OK 狀態碼

---

#### 測試 8：System API - 測試 API Key 連線

**目的：** 驗證 testApiKey 方法正確調用 API

**輸入：**
```typescript
{
  provider: 'gemini',
  apiKey: 'test-api-key-123'
}
```

**預期 API 請求：**
```typescript
POST /api/v1/system/test-api-key
{
  provider: 'gemini',
  api_key: 'test-api-key-123'
}
```

**預期回應（成功）：**
```typescript
{
  success: true,
  message: '連線成功'
}
```

**預期回應（失敗）：**
```typescript
{
  success: false,
  error: {
    code: 'INVALID_API_KEY',
    message: 'API Key 無效'
  }
}
```

**測試程式碼：**
```typescript
describe('System API - testApiKey', () => {
  it('should test API key successfully', async () => {
    mock.onPost('/system/test-api-key').reply(200, {
      success: true,
      message: '連線成功'
    })

    const result = await systemApi.testApiKey({
      provider: 'gemini',
      apiKey: 'test-key'
    })

    expect(result.success).toBe(true)
  })

  it('should handle invalid API key', async () => {
    mock.onPost('/system/test-api-key').reply(400, {
      success: false,
      error: {
        code: 'INVALID_API_KEY',
        message: 'API Key 無效'
      }
    })

    await expect(
      systemApi.testApiKey({ provider: 'gemini', apiKey: 'invalid' })
    ).rejects.toThrow()
  })
})
```

**驗證點：**
- [ ] 正確發送 POST 請求
- [ ] 成功時回傳 success: true
- [ ] 失敗時拋出錯誤

---

### 整合測試

#### 測試 9：完整流程 - 創建專案到開始生成

**目的：** 驗證多個 API 串接正常工作

**測試流程：**
1. 調用 `createProject()` 創建專案
2. 調用 `updateProject()` 更新配置
3. 調用 `startGeneration()` 開始生成

**測試程式碼：**
```typescript
describe('Integration - Create Project and Start Generation', () => {
  it('should create project and start generation', async () => {
    // Step 1: Create project
    mock.onPost('/projects').reply(201, {
      id: 'proj-123',
      project_name: 'Test',
      status: 'INITIALIZED'
    })

    const project = await projectsApi.createProject({
      projectName: 'Test',
      contentText: '測試'.repeat(100),
      contentSource: 'paste'
    })

    expect(project.id).toBe('proj-123')

    // Step 2: Update configuration
    mock.onPut('/projects/proj-123').reply(200, {
      ...project,
      visual_config: { subtitle: {} }
    })

    const updated = await projectsApi.updateProject('proj-123', {
      visual_config: { subtitle: {} }
    })

    expect(updated.visual_config).toBeDefined()

    // Step 3: Start generation
    mock.onPost('/projects/proj-123/generate').reply(200, { success: true })

    await projectsApi.startGeneration('proj-123')

    // All requests should succeed
    expect(mock.history.post.length).toBe(2)
    expect(mock.history.put.length).toBe(1)
  })
})
```

**驗證點：**
- [ ] 3 個 API 請求順序正確
- [ ] 資料在請求間正確傳遞
- [ ] 所有請求都成功

---

## 實作規格

### 需要建立/修改的檔案

#### 1. Axios 客戶端配置: `frontend/src/services/api.ts`

**職責：** 建立 Axios 實例、配置攔截器、錯誤處理

**程式碼骨架：**
```typescript
import axios, { AxiosError } from 'axios'
import axiosRetry from 'axios-retry'
import { toast } from 'sonner' // 或使用 Ant Design 的 message

/**
 * Axios 客戶端實例
 */
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1',
  timeout: 30000, // 30 秒
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * 請求攔截器
 */
apiClient.interceptors.request.use(
  (config) => {
    // 添加通用 headers (如需要，例如：Authorization token)
    // 目前本地端應用無需 token，保留擴展性

    // 開發環境日誌
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`)
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

/**
 * 回應攔截器
 */
apiClient.interceptors.response.use(
  (response) => {
    // 直接返回 data，簡化呼叫方程式碼
    return response.data
  },
  (error: AxiosError) => {
    handleApiError(error)
    return Promise.reject(error)
  }
)

/**
 * 錯誤處理函數
 */
const handleApiError = (error: AxiosError<any>) => {
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
    // 網路錯誤
    toast.error('網路連線失敗，請檢查網路')
  } else {
    // 其他錯誤
    toast.error(error.message || '發生未知錯誤')
  }
}

/**
 * 配置自動重試
 */
axiosRetry(apiClient, {
  retries: 3, // 重試 3 次
  retryDelay: axiosRetry.exponentialDelay, // 指數退避 (1s, 2s, 4s)
  retryCondition: (error) => {
    // 只在網路錯誤或 5xx 錯誤時重試
    return (
      axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      (error.response?.status ?? 0) >= 500
    )
  },
})

export default apiClient
```

**依賴安裝：**
```bash
npm install axios axios-retry sonner
```

---

#### 2. TypeScript 型別定義: `frontend/src/types/api.ts`

**職責：** 定義所有 API 請求和回應的型別

**程式碼骨架：**
```typescript
// ========== 通用型別 ==========

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface ApiError {
  error: {
    code: string
    message: string
    details?: any
  }
}

// ========== Project 相關型別 ==========

export type ProjectStatus =
  | 'INITIALIZED'
  | 'SCRIPT_GENERATING'
  | 'SCRIPT_GENERATED'
  | 'ASSETS_GENERATING'
  | 'ASSETS_GENERATED'
  | 'RENDERING'
  | 'RENDERED'
  | 'THUMBNAIL_GENERATING'
  | 'THUMBNAIL_GENERATED'
  | 'UPLOADING'
  | 'COMPLETED'
  | 'FAILED'
  | 'PAUSED'

export interface Project {
  id: string
  project_name: string
  status: ProjectStatus
  content_text: string
  content_source: 'upload' | 'paste'
  visual_config?: VisualConfig
  prompt_config?: PromptConfig
  youtube_config?: YouTubeConfig
  created_at: string
  updated_at: string
}

export interface CreateProjectData {
  projectName: string
  contentText: string
  contentSource: 'upload' | 'paste'
}

export interface UpdateProjectData {
  project_name?: string
  visual_config?: VisualConfig
  prompt_config?: PromptConfig
  youtube_config?: YouTubeConfig
}

// ========== Configuration 相關型別 ==========

export interface VisualConfig {
  subtitle?: SubtitleConfig
  logo?: LogoConfig
  overlay_elements?: OverlayElement[]
  segment_overrides?: Record<number, SegmentOverride>
}

export interface SubtitleConfig {
  font_family: string
  font_size: number
  font_color: string
  position: { x: number; y: number }
  border_enabled: boolean
  border_color?: string
  border_width?: number
  shadow_enabled: boolean
  shadow_color?: string
  shadow_offset_x?: number
  shadow_offset_y?: number
  background_enabled: boolean
  background_color?: string
  background_opacity?: number
}

export interface LogoConfig {
  logo_file?: string
  logo_x: number
  logo_y: number
  logo_size: number
  logo_opacity: number
}

export interface OverlayElement {
  id: string
  type: 'text' | 'image' | 'shape'
  x: number
  y: number
  width?: number
  height?: number
  content?: string
  style?: any
}

export interface SegmentOverride {
  segment_index: number
  config: Partial<VisualConfig>
}

// ========== Prompt 相關型別 ==========

export interface PromptConfig {
  template_id: string
  prompt_content: string
  gemini_model: 'gemini-1.5-pro' | 'gemini-1.5-flash'
}

export interface PromptTemplate {
  id: string
  name: string
  content: string
  created_at: string
  usage_count: number
}

// ========== YouTube 相關型別 ==========

export interface YouTubeConfig {
  title: string
  description: string
  tags: string[]
  privacy: 'public' | 'unlisted' | 'private'
  publish_type: 'immediate' | 'scheduled'
  scheduled_date?: string
  scheduled_time?: string
  ai_content_flag: boolean
}

export interface YouTubeChannel {
  id: string
  name: string
  avatar_url: string
  subscriber_count: number
  authorized_at: string
}

// ========== System 相關型別 ==========

export interface ApiKeyData {
  provider: 'gemini' | 'stability_ai' | 'did'
  api_key: string
}

export interface ApiKeyStatus {
  provider: string
  is_configured: boolean
  last_tested_at?: string
  status: 'valid' | 'invalid' | 'not_tested'
}

export interface ApiQuota {
  did_remaining_minutes: number
  did_total_minutes: number
  youtube_remaining_units: number
  youtube_total_units: number
}

// ========== Stats 相關型別 ==========

export interface DashboardStats {
  total_videos: number
  monthly_videos: number
  scheduled_videos: number
  api_quota: ApiQuota
}

// ========== Batch 相關型別 ==========

export interface BatchTask {
  id: string
  task_name: string
  project_count: number
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PAUSED'
  success_count: number
  failed_count: number
  created_at: string
}

export interface CreateBatchData {
  task_name: string
  files: File[]
  template_id?: string
  prompt_template_id?: string
  gemini_model: 'gemini-1.5-pro' | 'gemini-1.5-flash'
  youtube_config: YouTubeConfig
}
```

---

#### 3. Projects API Service: `frontend/src/services/projectsApi.ts`

**職責：** 封裝所有 Projects 相關的 API 呼叫（12 個方法）

**程式碼骨架：**
```typescript
import apiClient from './api'
import type {
  Project,
  CreateProjectData,
  UpdateProjectData,
} from '@/types/api'

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
 * 更新專案
 */
export const updateProject = async (
  id: string,
  data: UpdateProjectData
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

/**
 * 獲取生成進度
 */
export const getProgress = async (id: string): Promise<any> => {
  return apiClient.get(`/projects/${id}/progress`)
}

/**
 * 暫停生成
 */
export const pauseGeneration = async (id: string): Promise<void> => {
  return apiClient.post(`/projects/${id}/pause`)
}

/**
 * 繼續生成
 */
export const resumeGeneration = async (id: string): Promise<void> => {
  return apiClient.post(`/projects/${id}/resume`)
}

/**
 * 取消生成
 */
export const cancelGeneration = async (id: string): Promise<void> => {
  return apiClient.post(`/projects/${id}/cancel`)
}

/**
 * 獲取專案結果
 */
export const getResult = async (id: string): Promise<any> => {
  return apiClient.get(`/projects/${id}/result`)
}

/**
 * 重試失敗的專案
 */
export const retryProject = async (id: string): Promise<void> => {
  return apiClient.post(`/projects/${id}/retry`)
}
```

---

#### 4. Configurations API Service: `frontend/src/services/configurationsApi.ts`

**職責：** 封裝所有 Configurations 相關的 API 呼叫（6 個方法）

**程式碼骨架：**
```typescript
import apiClient from './api'
import type { VisualConfig, PromptTemplate } from '@/types/api'

/**
 * 獲取視覺配置列表
 */
export const getVisualConfigs = async (): Promise<VisualConfig[]> => {
  return apiClient.get('/configurations/visual')
}

/**
 * 獲取單一視覺配置
 */
export const getVisualConfig = async (id: string): Promise<VisualConfig> => {
  return apiClient.get(`/configurations/visual/${id}`)
}

/**
 * 創建視覺配置
 */
export const createVisualConfig = async (data: VisualConfig): Promise<VisualConfig> => {
  return apiClient.post('/configurations/visual', data)
}

/**
 * 刪除視覺配置
 */
export const deleteVisualConfig = async (id: string): Promise<void> => {
  return apiClient.delete(`/configurations/visual/${id}`)
}

/**
 * 獲取 Prompt 範本列表
 */
export const getPromptTemplates = async (): Promise<PromptTemplate[]> => {
  return apiClient.get('/configurations/prompts')
}

/**
 * 創建 Prompt 範本
 */
export const createPromptTemplate = async (
  data: Omit<PromptTemplate, 'id' | 'created_at' | 'usage_count'>
): Promise<PromptTemplate> => {
  return apiClient.post('/configurations/prompts', data)
}
```

---

#### 5. System API Service: `frontend/src/services/systemApi.ts`

**職責：** 封裝所有 System 相關的 API 呼叫（4 個方法）

**程式碼骨架：**
```typescript
import apiClient from './api'
import type { ApiKeyData, ApiKeyStatus, ApiQuota } from '@/types/api'

/**
 * 測試 API Key 連線
 */
export const testApiKey = async (data: ApiKeyData): Promise<{ success: boolean }> => {
  return apiClient.post('/system/test-api-key', {
    provider: data.provider,
    api_key: data.apiKey,
  })
}

/**
 * 儲存 API Key
 */
export const saveApiKey = async (data: ApiKeyData): Promise<void> => {
  return apiClient.post('/system/api-keys', {
    provider: data.provider,
    api_key: data.apiKey,
  })
}

/**
 * 獲取所有 API Key 狀態
 */
export const getApiKeyStatuses = async (): Promise<ApiKeyStatus[]> => {
  return apiClient.get('/system/api-keys')
}

/**
 * 獲取 API 配額
 */
export const getApiQuota = async (): Promise<ApiQuota> => {
  return apiClient.get('/system/quota')
}
```

---

#### 6. YouTube API Service: `frontend/src/services/youtubeApi.ts`

**職責：** 封裝所有 YouTube 相關的 API 呼叫（4 個方法）

**程式碼骨架：**
```typescript
import apiClient from './api'
import type { YouTubeChannel } from '@/types/api'

/**
 * 獲取 YouTube 授權 URL
 */
export const getAuthUrl = async (): Promise<{ auth_url: string }> => {
  return apiClient.get('/youtube/auth-url')
}

/**
 * 處理 OAuth Callback
 */
export const handleCallback = async (code: string): Promise<YouTubeChannel> => {
  return apiClient.post('/youtube/callback', { code })
}

/**
 * 獲取已連結的 YouTube 頻道列表
 */
export const getChannels = async (): Promise<YouTubeChannel[]> => {
  return apiClient.get('/youtube/channels')
}

/**
 * 移除 YouTube 授權
 */
export const removeChannel = async (channelId: string): Promise<void> => {
  return apiClient.delete(`/youtube/channels/${channelId}`)
}
```

---

#### 7. Stats API Service: `frontend/src/services/statsApi.ts`

**職責：** 封裝所有 Stats 相關的 API 呼叫（2 個方法）

**程式碼骨架：**
```typescript
import apiClient from './api'
import type { DashboardStats } from '@/types/api'

/**
 * 獲取主控台統計資料
 */
export const getDashboardStats = async (): Promise<DashboardStats> => {
  return apiClient.get('/stats/dashboard')
}

/**
 * 獲取專案統計資料
 */
export const getProjectStats = async (projectId: string): Promise<any> => {
  return apiClient.get(`/stats/projects/${projectId}`)
}
```

---

#### 8. Batch API Service: `frontend/src/services/batchApi.ts`

**職責::** 封裝所有 Batch 相關的 API 呼叫（5 個方法）

**程式碼骨架：**
```typescript
import apiClient from './api'
import type { BatchTask, CreateBatchData } from '@/types/api'

/**
 * 獲取批次任務列表
 */
export const getBatchTasks = async (): Promise<BatchTask[]> => {
  return apiClient.get('/batch')
}

/**
 * 獲取單一批次任務
 */
export const getBatchTask = async (id: string): Promise<BatchTask> => {
  return apiClient.get(`/batch/${id}`)
}

/**
 * 創建批次任務
 */
export const createBatchTask = async (data: CreateBatchData): Promise<BatchTask> => {
  const formData = new FormData()
  formData.append('task_name', data.task_name)
  data.files.forEach((file) => formData.append('files', file))
  if (data.template_id) formData.append('template_id', data.template_id)
  // ... 其他欄位

  return apiClient.post('/batch', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

/**
 * 暫停批次任務
 */
export const pauseBatchTask = async (id: string): Promise<void> => {
  return apiClient.post(`/batch/${id}/pause`)
}

/**
 * 繼續批次任務
 */
export const resumeBatchTask = async (id: string): Promise<void> => {
  return apiClient.post(`/batch/${id}/resume`)
}
```

---

#### 9. 測試檔案: `frontend/src/services/__tests__/api.test.ts`

**職責：** 測試 Axios 客戶端和錯誤處理

**程式碼骨架：**
```typescript
import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api'

const mock = new MockAdapter(apiClient)

describe('Axios Client', () => {
  afterEach(() => {
    mock.reset()
  })

  it('should initialize with correct baseURL', () => {
    expect(apiClient.defaults.baseURL).toBe('http://localhost:8000/api/v1')
  })

  it('should have correct timeout', () => {
    expect(apiClient.defaults.timeout).toBe(30000)
  })

  // ... 更多測試
})
```

---

#### 10. 測試檔案: `frontend/src/services/__tests__/projectsApi.test.ts`

**職責：** 測試 Projects API Service

**程式碼骨架：**
```typescript
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api'
import * as projectsApi from '../projectsApi'

const mock = new MockAdapter(apiClient)

describe('Projects API', () => {
  afterEach(() => {
    mock.reset()
  })

  describe('createProject', () => {
    it('should create project with correct data', async () => {
      const projectData = {
        projectName: 'Test Project',
        contentText: '測試內容'.repeat(100),
        contentSource: 'paste' as const,
      }

      mock.onPost('/projects').reply(201, {
        id: 'proj-123',
        project_name: 'Test Project',
        status: 'INITIALIZED',
        content_text: projectData.contentText,
        created_at: '2025-10-19T10:00:00Z',
        updated_at: '2025-10-19T10:00:00Z',
      })

      const result = await projectsApi.createProject(projectData)

      expect(result.id).toBe('proj-123')
      expect(result.project_name).toBe('Test Project')
    })
  })

  // ... 更多測試
})
```

---

### 資料流程

```
前端元件
    ↓ 調用 API 方法
API Service Layer (projectsApi.ts, etc.)
    ↓ 組裝請求資料
Axios Client (api.ts)
    ↓ 請求攔截器 (添加 headers, 日誌)
    ↓ 發送 HTTP 請求
後端 API (FastAPI)
    ↓ 處理請求
    ↓ 回傳回應
Axios Client (api.ts)
    ↓ 回應攔截器 (提取 data, 錯誤處理)
    ↓ 自動重試 (如果是 5xx 錯誤)
API Service Layer
    ↓ 返回資料或拋出錯誤
前端元件
    ↓ 更新 UI
```

---

## 開發指引

### TDD 開發流程

#### 第 1 步：環境準備（10 分鐘）

1. 確認 Task-017 和 Task-018 已完成
2. 安裝依賴套件：
   ```bash
   cd frontend
   npm install axios axios-retry sonner
   npm install -D axios-mock-adapter @types/axios-mock-adapter
   ```
3. 閱讀 `tech-specs/frontend/api-integration.md`

---

#### 第 2 步：撰寫 Axios 客戶端測試（20 分鐘）

1. 建立 `src/services/__tests__/api.test.ts`
2. 撰寫「測試 1：Axios 實例正確初始化」
3. 撰寫「測試 2：請求攔截器正常工作」
4. 撰寫「測試 3：回應攔截器正確處理成功回應」
5. 執行測試 → 失敗（預期，因為還沒實作）

```bash
npm run test src/services/__tests__/api.test.ts
```

---

#### 第 3 步：實作 Axios 客戶端（30 分鐘）

1. 建立 `src/services/api.ts`
2. 實作 Axios 實例配置
3. 實作請求攔截器
4. 實作回應攔截器
5. 實作錯誤處理函數
6. 配置自動重試機制
7. 執行測試 → 通過 ✅

---

#### 第 4 步：撰寫錯誤處理測試（20 分鐘）

1. 撰寫「測試 4：錯誤處理 - 400 Bad Request」
2. 撰寫「測試 5：錯誤處理 - 500 Server Error」
3. 執行測試 → 確認錯誤處理和重試邏輯正確

---

#### 第 5 步：定義 TypeScript 型別（30 分鐘）

1. 建立 `src/types/api.ts`
2. 定義所有 API 相關型別（參考實作規格）
3. 確保型別定義與後端 API 規格一致（參考 `tech-specs/backend/api-*.md`）

---

#### 第 6 步：實作 Projects API Service（45 分鐘）

1. 撰寫「測試 6：Projects API - 創建專案」
2. 撰寫「測試 7：Projects API - 獲取專案列表」
3. 建立 `src/services/projectsApi.ts`
4. 實作所有 12 個方法
5. 執行測試 → 通過 ✅

---

#### 第 7 步：實作其他 API Services（60 分鐘）

**依序實作：**
1. `configurationsApi.ts` (6 個方法)
2. `systemApi.ts` (4 個方法)
3. `youtubeApi.ts` (4 個方法)
4. `statsApi.ts` (2 個方法)
5. `batchApi.ts` (5 個方法)

**每個 Service：**
- 撰寫至少 2 個單元測試
- 實作所有方法
- 執行測試確認通過

---

#### 第 8 步：撰寫整合測試（30 分鐘）

1. 撰寫「測試 9：完整流程 - 創建專案到開始生成」
2. 確保多個 API 串接正常工作
3. 執行測試 → 通過 ✅

---

#### 第 9 步：測試覆蓋率檢查（15 分鐘）

1. 執行測試覆蓋率報告：
   ```bash
   npm run test:coverage
   ```
2. 確認覆蓋率 > 85%
3. 補充缺失的測試案例

---

#### 第 10 步：文件與檢查（20 分鐘）

1. 為每個函數添加 JSDoc 註解
2. 執行 Linter：`npm run lint`
3. 執行 TypeScript 檢查：`npm run type-check`
4. 格式化程式碼：`npm run format`

---

### 注意事項

#### API 設計一致性
- ⚠️ 前端使用 **camelCase**，後端使用 **snake_case**
- ⚠️ API Service 層負責轉換命名格式
- ⚠️ 確保與後端 API 規格一致（參考 `tech-specs/backend/`）

#### 錯誤處理
- ✅ 所有錯誤在 Axios 攔截器統一處理
- ✅ 使用 toast 顯示用戶友善的錯誤訊息
- ✅ 5xx 錯誤自動重試 3 次（指數退避）
- ❌ 不在元件中重複處理錯誤

#### TypeScript 型別
- ✅ 所有 API 方法都有明確的型別定義
- ✅ 使用 `type` 而非 `interface` 定義型別（除非需要擴展）
- ✅ 避免使用 `any`，使用 `unknown` 或具體型別

#### 測試
- ✅ 使用 `axios-mock-adapter` mock API 回應
- ✅ 每個 API Service 至少 2 個測試
- ✅ 測試成功和失敗情境
- ✅ 測試應該可以獨立執行

#### 與其他模組整合
- 🔗 Task-020 ~ 028（所有前端頁面）會使用這些 API 服務層
- 🔗 `useQuery` 和 `useMutation` (TanStack Query) 會包裝這些 API 方法
- 🔗 Zustand stores 會調用這些 API 方法同步資料

---

### 完成檢查清單

#### 功能完整性
- [ ] Axios 客戶端配置完成（baseURL, timeout, headers）
- [ ] 請求攔截器完成
- [ ] 回應攔截器完成
- [ ] 錯誤處理函數完成
- [ ] 自動重試機制配置完成
- [ ] 6 個 API Service 全部實作（33 個方法）
- [ ] TypeScript 型別定義完成

#### 測試
- [ ] Axios 客戶端測試通過（5 個測試）
- [ ] Projects API 測試通過（至少 2 個測試）
- [ ] 其他 5 個 API Service 測試通過（至少各 2 個測試）
- [ ] 整合測試通過（1 個測試）
- [ ] 測試覆蓋率 > 85%
- [ ] 測試可獨立執行

#### 程式碼品質
- [ ] ESLint check 無錯誤：`npm run lint`
- [ ] 程式碼已格式化：`npm run format`
- [ ] TypeScript 無錯誤：`npm run type-check`
- [ ] 所有函數都有 JSDoc 註解

#### 文件
- [ ] 所有 API 方法都有清楚的註解
- [ ] 型別定義有詳細註解
- [ ] README 已更新（如需要）

#### 整合
- [ ] 與後端 API 規格一致（驗證端點、參數、回應格式）
- [ ] 命名轉換正確（camelCase ↔ snake_case）
- [ ] 錯誤處理與後端錯誤格式一致

---

## 預估時間分配

- 環境準備與閱讀：10 分鐘
- 撰寫測試：40 分鐘
- 實作 Axios 客戶端：30 分鐘
- 定義 TypeScript 型別：30 分鐘
- 實作 6 個 API Services：105 分鐘
- 整合測試：30 分鐘
- 測試覆蓋率檢查：15 分鐘
- 文件與檢查：20 分鐘

**總計：約 4.5 小時**（預留 1.5 小時 buffer = 6 小時）

---

## 參考資源

### Axios 官方文檔
- [Axios GitHub](https://github.com/axios/axios)
- [Interceptors](https://axios-http.com/docs/interceptors)
- [axios-retry](https://github.com/softonic/axios-retry)

### TypeScript 文檔
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Type vs Interface](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#differences-between-type-aliases-and-interfaces)

### 測試框架
- [Jest](https://jestjs.io/docs/getting-started)
- [axios-mock-adapter](https://github.com/ctimmerm/axios-mock-adapter)

### 專案內部文件
- `tech-specs/frontend/api-integration.md` - API 整合規格
- `tech-specs/backend/api-*.md` - 後端 API 規格（所有模組）
- `tech-specs/framework.md` - 技術框架規格

---

**準備好了嗎？** 開始使用 TDD 方式實作這個 task！🚀
