# API 整合

> **參考原始文件:** frontend-spec.md 第 567-819 行
> **關聯文件:** [state-management.md](./state-management.md), [error-handling.md](./error-handling.md)

本文件定義了 API 呼叫策略、請求與回應處理、Loading 狀態管理、錯誤處理與重試、快取策略與樂觀更新。

完整內容請參考原始 `frontend-spec.md` 文件的以下章節：
- 4.1 API 呼叫策略 (第 569-606 行)
- 4.2 請求與回應處理 (第 610-653 行)
- 4.3 Loading 狀態管理 (第 657-700 行)
- 4.4 錯誤處理與重試 (第 704-758 行)
- 4.5 快取策略 (第 762-793 行)
- 4.6 樂觀更新 (第 797-819 行)

---

## Axios 配置

```typescript
// services/api.ts
import axios from 'axios'

const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 請求攔截器
apiClient.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
)

// 回應攔截器
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    handleApiError(error)
    return Promise.reject(error)
  }
)
```

---

## API 函數範例

```typescript
// services/projectApi.ts
export const projectApi = {
  getProjects: async (params?: { page?: number; limit?: number }) => {
    const response = await apiClient.get<ApiResponse<Project[]>>('/projects', { params })
    return response.data
  },

  createProject: async (data: CreateProjectDto) => {
    const response = await apiClient.post<ApiResponse<Project>>('/projects', data)
    return response.data
  },

  startGenerate: async (id: string) => {
    const response = await apiClient.post<ApiResponse<void>>(`/projects/${id}/generate`)
    return response.data
  }
}
```

---

詳細規格請參考原始文件。
