import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios'

// Создаем экземпляр axios
export const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_APP_HOST_URL || import.meta.env.VITE_BACKEND_URL || 'https://aicexaibot-production.up.railway.app',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Интерцептор для добавления токена авторизации
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('auth_token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Интерцептор для обработки ответов
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  (error) => {
    // Если токен истек или недействителен
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_data')
      
      // Перенаправляем на страницу авторизации
      if (window.location.pathname !== '/auth') {
        window.location.href = '/auth'
      }
    }
    
    return Promise.reject(error)
  }
)

// Типы для API ответов
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T = any> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// API методы
export const api = {
  // Авторизация
  auth: {
    telegram: (initData: string) => 
      apiClient.post<ApiResponse<{ token: string; user: any }>>('/auth/telegram', { initData }),
    
    logout: () => {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_data')
    }
  },

  // Профиль пользователя
  profile: {
    get: () => apiClient.get<ApiResponse<any>>('/profile'),
    update: (data: any) => apiClient.put<ApiResponse<any>>('/profile', data)
  },

  // Токены
  tokens: {
    getBalance: () => apiClient.get<ApiResponse<{ tokens: number }>>('/tokens/balance'),
    getHistory: (page = 1, limit = 20) => 
      apiClient.get<PaginatedResponse<any>>('/tokens/history', { params: { page, limit } }),
    getPackages: () => apiClient.get<ApiResponse<{ packages: any[] }>>('/packages')
  },

  // Платежи
  payments: {
    create: (packageId: string) => 
      apiClient.post<ApiResponse<{ paymentId: string; paymentUrl: string }>>('/payments', { packageId }),
    getHistory: (limit = 10) => 
      apiClient.get<ApiResponse<{ payments: any[] }>>('/payments/history', { params: { limit } })
  },

  // Генерация контента
  generate: {
    midjourney: (data: {
      prompt: string
      model?: string
      style?: string
      aspect_ratio?: string
      quality?: string
    }) => apiClient.post<ApiResponse<{ taskId: string; estimatedTime: number }>>('/generate/midjourney', data),

    kling: (data: {
      prompt: string
      duration?: number
      aspect_ratio?: string
    }) => apiClient.post<ApiResponse<{ taskId: string; estimatedTime: number }>>('/generate/kling', data)
  },

  // История генераций
  generations: {
    getHistory: (service?: string, page = 1, limit = 20) => 
      apiClient.get<PaginatedResponse<any>>('/generations', { 
        params: { service, page, limit } 
      })
  },

  // Статистика пользователя
  stats: {
    get: () => apiClient.get<ApiResponse<{
      tokens: number
      totalGenerations: number
      tokensSpent: number
      lastGeneration?: string
      favoriteService: string
      memberSince: string
      subscription: string | null
      referrals: number
    }>>('/stats')
  },

  // Опции сервисов
  services: {
    getOptions: (service: string) => 
      apiClient.get<ApiResponse<any>>(`/services/${service}/options`)
  }
}

export default apiClient
