# Task-016: Axios 客戶端與 API 整合層

> **建立日期:** 2025-01-19
> **狀態:** ⏳ 未開始
> **預計時間:** 5 小時
> **優先級:** P0

---

## 關聯文件

### 技術規格
- **API 整合:** `tech-specs/frontend/api-integration.md`
- **前端架構:** `tech-specs/frontend/overview.md`
- **後端 API:** `tech-specs/backend/api-design.md`

### 產品設計
- **所有流程:** `product-design/flows.md` (需要 API 呼叫支援)

### 相關任務
- **前置任務:** Task-015 (Zustand Stores)
- **後續任務:** Task-017 ~ Task-022 (所有頁面開發)
- **依賴任務:** Task-003 (API 基礎架構), Task-004 (專案管理 API), Task-005 (配置管理 API)

---

## 任務目標

### 簡述
實作基於 Axios 的 API 客戶端，包含統一的錯誤處理、自動重試邏輯、請求快取、Token 管理，以及所有後端 API 端點的封裝。

### 詳細說明
本任務負責建立完整的前端 API 整合層，包括:
- 配置 Axios 實例（baseURL、timeout、headers）
- 實作請求攔截器（添加 headers、logging）
- 實作回應攔截器（錯誤處理、重試）
- 實作自動重試邏輯（指數退避）
- 實作請求快取機制（GET 請求）
- 封裝所有後端 API 端點（Projects、Configurations、Settings、Auth）
- 整合 Zustand stores（錯誤狀態、loading 狀態）

### 成功標準
- [ ] Axios 客戶端配置完成
- [ ] 攔截器正確處理請求和回應
- [ ] 自動重試在網路錯誤時正常運作
- [ ] GET 請求正確快取
- [ ] 所有 API 端點封裝完成（至少 30 個端點）
- [ ] 錯誤訊息友善且可本地化
- [ ] 單元測試覆蓋率 > 80%

---

## 測試要求

### 測試環境設定

**前置條件:**
- 後端 API 可運行（或使用 mock server）
- axios 和 axios-mock-adapter 已安裝
- MSW (Mock Service Worker) 已設定

**測試資料準備:**
```typescript
// tests/mocks/api-responses.ts
export const mockProjectResponse = {
  id: 'proj_001',
  title: '測試專案',
  status: 'draft',
  created_at: '2025-01-19T10:00:00Z'
}

export const mockProjectListResponse = {
  projects: [mockProjectResponse],
  total: 1,
  page: 1,
  page_size: 10
}

export const mockErrorResponse = {
  detail: '專案不存在',
  error_code: 'PROJECT_NOT_FOUND'
}
```

---

### 單元測試

#### 測試 1: Axios 客戶端 - 請求攔截器

**測試檔案:** `tests/unit/api/client.test.ts`

**測試程式碼:**
```typescript
import MockAdapter from 'axios-mock-adapter'
import { apiClient } from '@/services/api/client'

describe('API Client - Request Interceptor', () => {
  let mock: MockAdapter

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
  })

  afterEach(() => {
    mock.restore()
  })

  test('應該在請求中添加正確的 headers', async () => {
    mock.onGet('/test').reply((config) => {
      expect(config.headers?.['Content-Type']).toBe('application/json')
      return [200, { success: true }]
    })

    await apiClient.get('/test')
  })

  test('應該正確設定 baseURL', () => {
    expect(apiClient.defaults.baseURL).toBe(process.env.NEXT_PUBLIC_API_URL)
  })

  test('應該設定合理的 timeout', () => {
    expect(apiClient.defaults.timeout).toBeGreaterThan(0)
  })
})
```

**預期結果:**
- Headers 正確添加
- BaseURL 配置正確
- Timeout 合理

---

#### 測試 2: 錯誤處理與重試邏輯

**測試檔案:** `tests/unit/api/error-handling.test.ts`

**測試程式碼:**
```typescript
import MockAdapter from 'axios-mock-adapter'
import { apiClient } from '@/services/api/client'

describe('API Client - Error Handling', () => {
  let mock: MockAdapter

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
  })

  afterEach(() => {
    mock.restore()
  })

  test('應該在網路錯誤時自動重試', async () => {
    let attemptCount = 0

    mock.onGet('/test').reply(() => {
      attemptCount++
      if (attemptCount < 3) {
        return [500, { error: 'Server Error' }]
      }
      return [200, { success: true }]
    })

    const response = await apiClient.get('/test')

    expect(attemptCount).toBe(3)
    expect(response.data.success).toBe(true)
  })

  test('應該正確處理 404 錯誤', async () => {
    mock.onGet('/not-found').reply(404, {
      detail: '資源不存在',
      error_code: 'NOT_FOUND'
    })

    await expect(apiClient.get('/not-found')).rejects.toThrow()
  })

  test('應該正確處理 400 驗證錯誤', async () => {
    mock.onPost('/projects').reply(400, {
      detail: '標題不可為空',
      error_code: 'VALIDATION_ERROR'
    })

    try {
      await apiClient.post('/projects', { title: '' })
    } catch (error: any) {
      expect(error.response.status).toBe(400)
      expect(error.response.data.error_code).toBe('VALIDATION_ERROR')
    }
  })
})
```

**預期結果:**
- 網路錯誤自動重試（最多 3 次）
- 各種 HTTP 錯誤正確拋出
- 錯誤訊息格式統一

---

#### 測試 3: API 端點封裝

**測試檔案:** `tests/unit/api/projects.test.ts`

**測試程式碼:**
```typescript
import MockAdapter from 'axios-mock-adapter'
import { apiClient } from '@/services/api/client'
import { projectsApi } from '@/services/api/projects'

describe('Projects API', () => {
  let mock: MockAdapter

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
  })

  afterEach(() => {
    mock.restore()
  })

  test('應該正確取得專案列表', async () => {
    const mockResponse = {
      projects: [
        { id: 'proj_001', title: '測試專案', status: 'draft' }
      ],
      total: 1
    }

    mock.onGet('/projects').reply(200, mockResponse)

    const result = await projectsApi.getProjects()

    expect(result.projects).toHaveLength(1)
    expect(result.projects[0].id).toBe('proj_001')
  })

  test('應該正確建立專案', async () => {
    const newProject = {
      title: '新專案',
      content: '測試內容',
      config_id: 'config_001'
    }

    const mockResponse = {
      id: 'proj_002',
      ...newProject,
      status: 'draft',
      created_at: '2025-01-19T10:00:00Z'
    }

    mock.onPost('/projects').reply(201, mockResponse)

    const result = await projectsApi.createProject(newProject)

    expect(result.id).toBe('proj_002')
    expect(result.title).toBe(newProject.title)
  })

  test('應該正確更新專案狀態', async () => {
    mock.onPatch('/projects/proj_001/status').reply(200, {
      id: 'proj_001',
      status: 'generating'
    })

    const result = await projectsApi.updateProjectStatus('proj_001', 'generating')

    expect(result.status).toBe('generating')
  })
})
```

**預期結果:**
- 所有 CRUD 操作正常
- 參數正確傳遞
- 回應正確解析

---

### 整合測試

#### 測試 4: 請求快取機制

**測試檔案:** `tests/integration/api-cache.test.ts`

**測試程式碼:**
```typescript
import MockAdapter from 'axios-mock-adapter'
import { apiClient } from '@/services/api/client'
import { projectsApi } from '@/services/api/projects'

describe('API Cache', () => {
  let mock: MockAdapter
  let requestCount = 0

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
    requestCount = 0
  })

  afterEach(() => {
    mock.restore()
  })

  test('相同的 GET 請求應該使用快取', async () => {
    mock.onGet('/projects/proj_001').reply(() => {
      requestCount++
      return [200, { id: 'proj_001', title: '測試' }]
    })

    // 第一次請求
    await projectsApi.getProject('proj_001')

    // 第二次請求（應該從快取取得）
    await projectsApi.getProject('proj_001')

    expect(requestCount).toBe(1) // 只發送一次實際請求
  })

  test('快取應該在指定時間後過期', async () => {
    mock.onGet('/projects/proj_001').reply(() => {
      requestCount++
      return [200, { id: 'proj_001', title: '測試' }]
    })

    await projectsApi.getProject('proj_001')

    // 等待快取過期（假設快取時間為 5 秒）
    await new Promise(resolve => setTimeout(resolve, 6000))

    await projectsApi.getProject('proj_001')

    expect(requestCount).toBe(2) // 快取過期後重新請求
  }, 10000)
})
```

**預期結果:**
- GET 請求正確快取
- 快取在指定時間後過期
- POST/PUT/DELETE 不使用快取

---

## 實作規格

### 需要建立的檔案

#### 1. API 客戶端配置
**檔案:** `frontend/src/services/api/client.ts`

```typescript
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios'

// 配置
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
const API_TIMEOUT = 30000 // 30 秒
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 秒

// 建立 Axios 實例
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 請求攔截器
apiClient.interceptors.request.use(
  (config) => {
    // 添加請求日誌（開發模式）
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, config.data)
    }

    return config
  },
  (error) => {
    console.error('[API Request Error]', error)
    return Promise.reject(error)
  }
)

// 回應攔截器
apiClient.interceptors.response.use(
  (response) => {
    // 回應日誌（開發模式）
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API Response] ${response.config.url}`, response.data)
    }

    return response
  },
  async (error: AxiosError) => {
    const config = error.config as AxiosRequestConfig & { _retry?: number }

    // 處理網路錯誤（自動重試）
    if (!error.response && config && (!config._retry || config._retry < MAX_RETRIES)) {
      config._retry = (config._retry || 0) + 1

      console.log(`[API Retry] Attempt ${config._retry} for ${config.url}`)

      // 指數退避
      const delay = RETRY_DELAY * Math.pow(2, config._retry - 1)
      await new Promise(resolve => setTimeout(resolve, delay))

      return apiClient.request(config)
    }

    // 處理 HTTP 錯誤
    if (error.response) {
      const { status, data } = error.response

      console.error(`[API Error] ${status} - ${config?.url}`, data)

      // 統一錯誤格式
      const errorMessage = (data as any)?.detail || '發生錯誤，請稍後再試'
      const errorCode = (data as any)?.error_code

      throw {
        status,
        message: errorMessage,
        code: errorCode,
        originalError: error
      }
    }

    // 其他錯誤
    console.error('[API Unknown Error]', error)
    throw {
      status: 0,
      message: '網路連線失敗，請檢查網路設定',
      originalError: error
    }
  }
)

// 快取機制（簡單實作）
interface CacheEntry {
  data: any
  timestamp: number
}

const cache = new Map<string, CacheEntry>()
const CACHE_TTL = 5 * 60 * 1000 // 5 分鐘

export function getCachedData(key: string): any | null {
  const entry = cache.get(key)
  if (!entry) return null

  const isExpired = Date.now() - entry.timestamp > CACHE_TTL
  if (isExpired) {
    cache.delete(key)
    return null
  }

  return entry.data
}

export function setCachedData(key: string, data: any): void {
  cache.set(key, {
    data,
    timestamp: Date.now()
  })
}

export function clearCache(): void {
  cache.clear()
}
```

---

#### 2. Projects API
**檔案:** `frontend/src/services/api/projects.ts`

```typescript
import { apiClient, getCachedData, setCachedData } from './client'
import type { Project } from '@/stores/useProjectStore'

export interface CreateProjectRequest {
  title: string
  content: string
  config_id?: string
}

export interface UpdateProjectRequest {
  title?: string
  content?: string
  config_id?: string
}

export interface ProjectListResponse {
  projects: Project[]
  total: number
  page: number
  page_size: number
}

export const projectsApi = {
  // 取得專案列表
  async getProjects(params?: {
    status?: string
    search?: string
    page?: number
    page_size?: number
  }): Promise<ProjectListResponse> {
    const cacheKey = `projects:${JSON.stringify(params || {})}`
    const cached = getCachedData(cacheKey)
    if (cached) return cached

    const { data } = await apiClient.get('/projects', { params })
    setCachedData(cacheKey, data)
    return data
  },

  // 取得單一專案
  async getProject(id: string): Promise<Project> {
    const cacheKey = `project:${id}`
    const cached = getCachedData(cacheKey)
    if (cached) return cached

    const { data } = await apiClient.get(`/projects/${id}`)
    setCachedData(cacheKey, data)
    return data
  },

  // 建立專案
  async createProject(request: CreateProjectRequest): Promise<Project> {
    const { data } = await apiClient.post('/projects', request)
    return data
  },

  // 更新專案
  async updateProject(id: string, request: UpdateProjectRequest): Promise<Project> {
    const { data } = await apiClient.patch(`/projects/${id}`, request)
    return data
  },

  // 刪除專案
  async deleteProject(id: string): Promise<void> {
    await apiClient.delete(`/projects/${id}`)
  },

  // 更新專案狀態
  async updateProjectStatus(id: string, status: string): Promise<Project> {
    const { data } = await apiClient.patch(`/projects/${id}/status`, { status })
    return data
  },

  // 開始生成
  async startGeneration(id: string): Promise<{ task_id: string }> {
    const { data } = await apiClient.post(`/projects/${id}/generate`)
    return data
  },

  // 取消生成
  async cancelGeneration(id: string): Promise<void> {
    await apiClient.post(`/projects/${id}/cancel`)
  },

  // 重試生成
  async retryGeneration(id: string): Promise<{ task_id: string }> {
    const { data } = await apiClient.post(`/projects/${id}/retry`)
    return data
  },

  // 取得專案素材
  async getProjectAssets(id: string): Promise<any> {
    const { data } = await apiClient.get(`/projects/${id}/assets`)
    return data
  },

  // 下載最終影片
  async downloadVideo(id: string): Promise<Blob> {
    const { data } = await apiClient.get(`/projects/${id}/video`, {
      responseType: 'blob'
    })
    return data
  }
}
```

---

#### 3. Configurations API
**檔案:** `frontend/src/services/api/configurations.ts`

```typescript
import { apiClient } from './client'
import type { ConfigTemplate, PromptTemplate } from '@/stores/useConfigStore'

export const configurationsApi = {
  // 取得配置列表
  async getConfigurations(): Promise<ConfigTemplate[]> {
    const { data } = await apiClient.get('/configurations')
    return data
  },

  // 取得單一配置
  async getConfiguration(id: string): Promise<ConfigTemplate> {
    const { data } = await apiClient.get(`/configurations/${id}`)
    return data
  },

  // 建立配置
  async createConfiguration(config: Omit<ConfigTemplate, 'id'>): Promise<ConfigTemplate> {
    const { data } = await apiClient.post('/configurations', config)
    return data
  },

  // 更新配置
  async updateConfiguration(id: string, updates: Partial<ConfigTemplate>): Promise<ConfigTemplate> {
    const { data } = await apiClient.patch(`/configurations/${id}`, updates)
    return data
  },

  // 刪除配置
  async deleteConfiguration(id: string): Promise<void> {
    await apiClient.delete(`/configurations/${id}`)
  },

  // Prompt 範本
  async getPromptTemplates(): Promise<PromptTemplate[]> {
    const { data } = await apiClient.get('/prompt-templates')
    return data
  },

  async createPromptTemplate(template: Omit<PromptTemplate, 'id'>): Promise<PromptTemplate> {
    const { data } = await apiClient.post('/prompt-templates', template)
    return data
  },

  async updatePromptTemplate(id: string, updates: Partial<PromptTemplate>): Promise<PromptTemplate> {
    const { data } = await apiClient.patch(`/prompt-templates/${id}`, updates)
    return data
  },

  async deletePromptTemplate(id: string): Promise<void> {
    await apiClient.delete(`/prompt-templates/${id}`)
  }
}
```

---

#### 4. Settings API
**檔案:** `frontend/src/services/api/settings.ts`

```typescript
import { apiClient } from './client'
import type { APIService } from '@/stores/useAuthStore'

export const settingsApi = {
  // API Keys 管理
  async setApiKey(service: APIService, apiKey: string): Promise<{ success: boolean }> {
    const { data } = await apiClient.post(`/settings/api-keys/${service}`, { api_key: apiKey })
    return data
  },

  async checkApiKeyExists(service: APIService): Promise<{ exists: boolean; service: string }> {
    const { data } = await apiClient.get(`/settings/api-keys/${service}/exists`)
    return data
  },

  async deleteApiKey(service: APIService): Promise<{ success: boolean }> {
    const { data } = await apiClient.delete(`/settings/api-keys/${service}`)
    return data
  },

  async listApiKeysStatus(): Promise<Record<APIService, boolean>> {
    const { data } = await apiClient.get('/settings/api-keys')
    return data.services
  }
}
```

---

#### 5. Auth API
**檔案:** `frontend/src/services/api/auth.ts`

```typescript
import { apiClient } from './client'
import type { YouTubeChannel } from '@/stores/useAuthStore'

export const authApi = {
  // YouTube OAuth
  async getYouTubeAuthUrl(): Promise<{ authorization_url: string; state: string }> {
    const { data } = await apiClient.get('/auth/youtube/authorize')
    return data
  },

  async handleYouTubeCallback(code: string, state: string): Promise<{
    success: boolean
    channel_id: string
    channel_name: string
  }> {
    const { data } = await apiClient.post('/auth/youtube/callback', { code, state })
    return data
  },

  async listYouTubeChannels(): Promise<YouTubeChannel[]> {
    const { data } = await apiClient.get('/auth/youtube/channels')
    return data
  }
}
```

---

#### 6. API Index
**檔案:** `frontend/src/services/api/index.ts`

```typescript
export * from './client'
export * from './projects'
export * from './configurations'
export * from './settings'
export * from './auth'
```

---

## 開發指引

### 開發步驟

**1. 安裝依賴**
```bash
cd frontend
npm install axios
npm install -D axios-mock-adapter
```

**2. 建立 API 目錄**
```bash
mkdir -p src/services/api
```

**3. 實作 API 客戶端**
- 建立 `client.ts` 配置 Axios
- 實作攔截器
- 實作快取機制

**4. 實作 API 端點封裝**
- 建立 `projects.ts`
- 建立 `configurations.ts`
- 建立 `settings.ts`
- 建立 `auth.ts`

**5. 撰寫測試**
- 單元測試 (各 API 模塊)
- 整合測試 (快取、重試)
- 執行測試確保覆蓋率 > 80%

**6. 整合測試**
- 在實際頁面中測試 API 呼叫
- 驗證錯誤處理
- 驗證快取機制

---

### 注意事項

**錯誤處理:**
- [ ] 統一錯誤格式
- [ ] 友善的錯誤訊息
- [ ] 區分網路錯誤和業務錯誤
- [ ] 記錄錯誤日誌

**效能:**
- [ ] 合理的快取策略
- [ ] 避免重複請求
- [ ] 使用請求取消（AbortController）
- [ ] 優化大型回應的處理

**安全:**
- [ ] 不在 URL 中傳遞敏感資料
- [ ] HTTPS only（production）
- [ ] 正確處理 CORS
- [ ] 避免 XSS 注入

**開發體驗:**
- [ ] 完整的 TypeScript 類型
- [ ] 清晰的 API 文件
- [ ] 開發模式日誌
- [ ] Mock 資料支援

---

## 完成檢查清單

### 開發完成
- [ ] API 客戶端配置完成
- [ ] 請求/回應攔截器完成
- [ ] 自動重試邏輯完成
- [ ] 快取機制完成
- [ ] Projects API 封裝完成
- [ ] Configurations API 封裝完成
- [ ] Settings API 封裝完成
- [ ] Auth API 封裝完成

### 測試完成
- [ ] 攔截器測試通過
- [ ] 錯誤處理測試通過
- [ ] API 端點測試通過
- [ ] 快取測試通過
- [ ] 測試覆蓋率 > 80%

### 文件同步
- [ ] Spec 與程式碼同步
- [ ] 類型定義完整
- [ ] API 文件清楚

### Git
- [ ] 程式碼已 commit
- [ ] Commit 訊息符合規範
- [ ] 已推送到 remote

---

## 時間分配建議

- **API 客戶端配置:** 1 小時
- **攔截器實作:** 1 小時
- **API 端點封裝:** 2 小時
- **測試撰寫:** 1 小時

**總計:** 5 小時
