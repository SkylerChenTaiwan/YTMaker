import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // 可在此添加認證 token
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // 統一錯誤處理
    if (error.response) {
      // 伺服器回應錯誤
      const message = error.response.data?.error?.message || '請求失敗'
      throw new Error(message)
    } else if (error.request) {
      // 請求發送但沒有收到回應
      throw new Error('伺服器無回應')
    } else {
      // 其他錯誤
      throw new Error(error.message || '未知錯誤')
    }
  }
)
