# Task-021a: Dashboard API 服務層 + 工具函數

> **建立日期:** 2025-10-21
> **狀態:** ⏳ 未開始
> **預計時間:** 2 小時
> **優先級:** P0 (必須)
> **拆分自:** Task-021

---

## 關聯文件

### 產品設計
- **頁面設計:** `product-design/pages.md#Page-2-主控台-Dashboard`

### 技術規格
- **API 整合:** `tech-specs/frontend/api-integration.md`
- **後端 API:** `tech-specs/backend/api-projects.md`, `tech-specs/backend/api-stats.md`

### 相關任務
- **前置任務:** Task-017 ✅ (路由系統), Task-018 ✅ (Zustand Stores)
- **後續任務:** Task-021b, Task-021c (可並行,都依賴此 task)
- **可並行:** 無 (此為基礎,必須先完成)

---

## 任務目標

### 簡述
建立 Dashboard 頁面所需的 API 服務層,包含 Axios 配置、專案 API、統計 API,以及日期格式化工具函數。

### 成功標準
- [ ] Axios 實例配置完成 (baseURL, timeout, interceptors)
- [ ] Projects API 服務完成 (getProjects, getProject, deleteProject)
- [ ] Stats API 服務完成 (getStats)
- [ ] 日期格式化工具函數完成
- [ ] TypeScript 型別定義完整
- [ ] 單元測試覆蓋率 > 85%

---

## 測試要求

### 單元測試

#### 測試 1: Axios 實例配置

**目的:** 驗證 Axios 實例正確配置

**測試項目:**
- baseURL 設定正確
- timeout 設定為 30000ms
- Content-Type header 為 application/json

**測試程式碼:**
```typescript
// tests/unit/services/api/axios.test.ts
import { axiosInstance } from '@/services/api/axios'

describe('Axios Instance', () => {
  it('should have correct base configuration', () => {
    expect(axiosInstance.defaults.baseURL).toBeDefined()
    expect(axiosInstance.defaults.timeout).toBe(30000)
    expect(axiosInstance.defaults.headers['Content-Type']).toBe('application/json')
  })
})
```

---

#### 測試 2: Projects API - getProjects

**目的:** 驗證取得專案列表 API 正常運作

**測試程式碼:**
```typescript
// tests/unit/services/api/projects.test.ts
import { projectsApi } from '@/services/api/projects'
import { axiosInstance } from '@/services/api/axios'

jest.mock('@/services/api/axios')

describe('Projects API', () => {
  describe('getProjects', () => {
    it('should fetch projects with correct params', async () => {
      const mockResponse = {
        data: {
          data: {
            projects: [],
            pagination: { total: 0, limit: 20, offset: 0 }
          }
        }
      }

      ;(axiosInstance.get as jest.Mock).mockResolvedValue(mockResponse)

      const result = await projectsApi.getProjects({
        limit: 20,
        offset: 0,
        status: 'COMPLETED',
      })

      expect(axiosInstance.get).toHaveBeenCalledWith('/api/v1/projects', {
        params: { limit: 20, offset: 0, status: 'COMPLETED' }
      })
      expect(result).toEqual(mockResponse.data.data)
    })
  })

  describe('deleteProject', () => {
    it('should delete project by id', async () => {
      ;(axiosInstance.delete as jest.Mock).mockResolvedValue({})

      await projectsApi.deleteProject('proj-001')

      expect(axiosInstance.delete).toHaveBeenCalledWith('/api/v1/projects/proj-001')
    })
  })
})
```

---

#### 測試 3: Stats API - getStats

**目的:** 驗證取得統計資料 API 正常運作

**測試程式碼:**
```typescript
// tests/unit/services/api/stats.test.ts
import { statsApi } from '@/services/api/stats'
import { axiosInstance } from '@/services/api/axios'

jest.mock('@/services/api/axios')

describe('Stats API', () => {
  describe('getStats', () => {
    it('should fetch statistics', async () => {
      const mockStats = {
        total_projects: 15,
        completed_projects: 12,
        this_month_generated: 5,
        scheduled_videos: 3,
        api_quota: {
          did_remaining_minutes: 60,
          did_total_minutes: 90,
          youtube_remaining_units: 8000,
          youtube_total_units: 10000,
        }
      }

      const mockResponse = {
        data: { data: mockStats }
      }

      ;(axiosInstance.get as jest.Mock).mockResolvedValue(mockResponse)

      const result = await statsApi.getStats()

      expect(axiosInstance.get).toHaveBeenCalledWith('/api/v1/stats')
      expect(result).toEqual(mockStats)
    })
  })
})
```

---

#### 測試 4: 日期格式化工具

**目的:** 驗證日期格式化功能正確

**測試程式碼:**
```typescript
// tests/unit/lib/date.test.ts
import { formatDate } from '@/lib/date'

describe('formatDate', () => {
  beforeEach(() => {
    // 固定當前時間為 2025-01-20 12:00:00
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2025-01-20T12:00:00Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should return "剛剛" for dates less than 1 minute ago', () => {
    const date = new Date('2025-01-20T11:59:30Z').toISOString()
    expect(formatDate(date)).toBe('剛剛')
  })

  it('should return "X 分鐘前" for dates less than 1 hour ago', () => {
    const date = new Date('2025-01-20T11:30:00Z').toISOString()
    expect(formatDate(date)).toBe('30 分鐘前')
  })

  it('should return "X 小時前" for dates less than 24 hours ago', () => {
    const date = new Date('2025-01-20T08:00:00Z').toISOString()
    expect(formatDate(date)).toBe('4 小時前')
  })

  it('should return "X 天前" for dates less than 7 days ago', () => {
    const date = new Date('2025-01-18T12:00:00Z').toISOString()
    expect(formatDate(date)).toBe('2 天前')
  })

  it('should return formatted date for dates more than 7 days ago', () => {
    const date = new Date('2025-01-10T10:30:00Z').toISOString()
    const result = formatDate(date)
    expect(result).toMatch(/2025/)
    expect(result).toMatch(/01/)
    expect(result).toMatch(/10/)
  })
})
```

---

## 實作規格

### 需要建立的檔案

#### 1. Axios 實例配置: `services/api/axios.ts`

```typescript
// src/services/api/axios.ts
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'

/**
 * Axios 實例配置
 */
const axiosInstance: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * 請求攔截器
 */
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 可以在這裡添加認證 token 等
    // const token = getAuthToken()
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`
    // }
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

/**
 * 回應攔截器
 */
axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // 統一錯誤處理
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data)
    } else if (error.request) {
      console.error('Network Error:', error.message)
    } else {
      console.error('Error:', error.message)
    }
    return Promise.reject(error)
  }
)

export { axiosInstance }
```

---

#### 2. Projects API: `services/api/projects.ts`

```typescript
// src/services/api/projects.ts
import { axiosInstance } from './axios'

export interface GetProjectsParams {
  limit?: number
  offset?: number
  status?: string
  sort_by?: string
  order?: 'asc' | 'desc'
}

export interface Project {
  id: string
  project_name: string
  status: 'INITIALIZED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
  created_at: string
  updated_at: string
  youtube_video_id?: string
}

export interface GetProjectsResponse {
  projects: Project[]
  pagination: {
    total: number
    limit: number
    offset: number
  }
}

export const projectsApi = {
  async getProjects(params: GetProjectsParams = {}): Promise<GetProjectsResponse> {
    const { data } = await axiosInstance.get('/api/v1/projects', { params })
    return data.data
  },

  async getProject(projectId: string): Promise<Project> {
    const { data } = await axiosInstance.get(`/api/v1/projects/${projectId}`)
    return data.data
  },

  async deleteProject(projectId: string): Promise<void> {
    await axiosInstance.delete(`/api/v1/projects/${projectId}`)
  },
}
```

---

#### 3. Stats API: `services/api/stats.ts`

```typescript
// src/services/api/stats.ts
import { axiosInstance } from './axios'

export interface Stats {
  total_projects: number
  completed_projects: number
  in_progress_projects: number
  failed_projects: number
  this_month_generated: number
  scheduled_videos: number
  api_quota: {
    did_remaining_minutes: number
    did_total_minutes: number
    youtube_remaining_units: number
    youtube_total_units: number
  }
}

export const statsApi = {
  async getStats(): Promise<Stats> {
    const { data } = await axiosInstance.get('/api/v1/stats')
    return data.data
  },
}
```

---

#### 4. API 服務匯出: `services/api/index.ts`

```typescript
// src/services/api/index.ts
export * from './axios'
export * from './projects'
export * from './stats'
```

---

#### 5. 日期格式化工具: `lib/date.ts`

```typescript
// src/lib/date.ts

/**
 * 格式化日期為相對時間或絕對時間
 * @param dateString ISO 8601 格式的日期字串
 * @returns 格式化後的日期字串
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()

  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '剛剛'
  if (diffMins < 60) return `${diffMins} 分鐘前`
  if (diffHours < 24) return `${diffHours} 小時前`
  if (diffDays < 7) return `${diffDays} 天前`

  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
```

---

## 開發指引

### TDD 開發流程

#### 第 1 步：建立測試檔案 (15 分鐘)
1. 建立 `tests/unit/services/api/axios.test.ts`
2. 建立 `tests/unit/services/api/projects.test.ts`
3. 建立 `tests/unit/services/api/stats.test.ts`
4. 建立 `tests/unit/lib/date.test.ts`

#### 第 2 步：撰寫測試 - Axios 配置 (10 分鐘)
1. 撰寫測試 1：Axios 實例配置
2. 執行測試 → 失敗 ❌ (預期,因為還沒實作)

#### 第 3 步：實作 Axios 配置 (15 分鐘)
1. 建立 `src/services/api/axios.ts`
2. 實作 Axios 實例配置
3. 實作請求/回應攔截器
4. 執行測試 → 通過 ✅

#### 第 4 步：撰寫測試 - Projects API (15 分鐘)
1. 撰寫測試 2：getProjects, deleteProject
2. 執行測試 → 失敗 ❌

#### 第 5 步：實作 Projects API (20 分鐘)
1. 建立 `src/services/api/projects.ts`
2. 定義 TypeScript 介面
3. 實作 getProjects, getProject, deleteProject
4. 執行測試 → 通過 ✅

#### 第 6 步：撰寫測試 - Stats API (10 分鐘)
1. 撰寫測試 3：getStats
2. 執行測試 → 失敗 ❌

#### 第 7 步：實作 Stats API (10 分鐘)
1. 建立 `src/services/api/stats.ts`
2. 定義 TypeScript 介面
3. 實作 getStats
4. 執行測試 → 通過 ✅

#### 第 8 步：撰寫測試 - 日期格式化 (10 分鐘)
1. 撰寫測試 4：formatDate (5 個測試案例)
2. 執行測試 → 失敗 ❌

#### 第 9 步：實作日期格式化 (15 分鐘)
1. 建立 `src/lib/date.ts`
2. 實作 formatDate 函數
3. 執行測試 → 通過 ✅

#### 第 10 步：建立匯出檔案 (5 分鐘)
1. 建立 `src/services/api/index.ts`
2. 匯出所有 API 服務

#### 第 11 步：最終驗證 (10 分鐘)
1. 執行所有測試：`npm test`
2. 檢查測試覆蓋率：`npm run test -- --coverage`
3. 確認覆蓋率 > 85%
4. 執行 TypeScript 檢查：`npm run type-check`
5. 執行 linter：`npm run lint`

---

## 完成檢查清單

### 功能完整性
- [ ] Axios 實例正確配置
- [ ] Projects API 三個方法都實作 (getProjects, getProject, deleteProject)
- [ ] Stats API 實作 (getStats)
- [ ] 日期格式化函數實作
- [ ] API 服務正確匯出

### TypeScript
- [ ] 所有介面定義完整
- [ ] 無 TypeScript 錯誤
- [ ] 正確使用泛型和型別推導

### 測試
- [ ] 測試 1 通過：Axios 配置
- [ ] 測試 2 通過：Projects API
- [ ] 測試 3 通過：Stats API
- [ ] 測試 4 通過：日期格式化 (5 個案例)
- [ ] 測試覆蓋率 > 85%

### 程式碼品質
- [ ] ESLint check 無錯誤
- [ ] 程式碼已格式化
- [ ] 無 console.log 或除錯程式碼 (錯誤處理的 console.error 除外)
- [ ] 函數都有 JSDoc 註解

---

## 預估時間分配

- 建立測試檔案：15 分鐘
- Axios 配置（測試 + 實作）：25 分鐘
- Projects API（測試 + 實作）：35 分鐘
- Stats API（測試 + 實作）：20 分鐘
- 日期格式化（測試 + 實作）：25 分鐘
- 最終驗證：10 分鐘

**總計：約 2 小時**

---

## 注意事項

- ⚠️ baseURL 使用環境變數 `NEXT_PUBLIC_API_URL`
- ⚠️ Axios 攔截器僅做基本處理,認證 token 邏輯預留
- ⚠️ 日期格式化使用 `Intl.DateTimeFormat`,支援多語系
- ⚠️ 所有 API 回應格式遵循 `{ success: boolean, data: T }` 結構
