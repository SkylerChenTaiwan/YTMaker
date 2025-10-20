import axios, { AxiosError } from 'axios'
import axiosRetry from 'axios-retry'
import { toast } from 'sonner'

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
    // 添加通用 headers (如需要,例如：Authorization token)
    // 目前本地端應用無需 token,保留擴展性

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
    // 直接返回 data,簡化呼叫方程式碼
    return response.data
  },
  (error: AxiosError<{ error?: { message?: string } }>) => {
    handleApiError(error)
    return Promise.reject(error)
  }
)

/**
 * 錯誤處理函數
 */
const handleApiError = (error: AxiosError<{ error?: { message?: string } }>) => {
  if (error.response) {
    const { status, data } = error.response

    switch (status) {
      case 400:
        toast.error(data.error?.message || '請求參數錯誤')
        break
      case 401:
        toast.error('未授權,請重新登入')
        break
      case 403:
        toast.error('無權限執行此操作')
        break
      case 404:
        toast.error('資源不存在')
        break
      case 409:
        toast.error('資源衝突,請刷新後重試')
        break
      case 422:
        toast.error(data.error?.message || '資料驗證失敗')
        break
      case 500:
        toast.error('伺服器錯誤,請稍後重試')
        break
      case 503:
        toast.error('服務暫時無法使用,請稍後重試')
        break
      default:
        toast.error('發生錯誤,請稍後重試')
    }
  } else if (error.request) {
    // 網路錯誤
    toast.error('網路連線失敗,請檢查網路')
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
