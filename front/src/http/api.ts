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
    
    console.log('==================== API REQUEST INTERCEPTOR ====================');
    console.log('URL:', config.url);
    console.log('Method:', config.method);
    console.log('Token found:', !!token);
    console.log('Token preview:', token ? token.substring(0, 20) + '...' : 'none');
    console.log('localStorage auth_token:', localStorage.getItem('auth_token') ? 'Present' : 'None');
    console.log('===============================================================');
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    console.error('==================== API REQUEST INTERCEPTOR ERROR ====================');
    console.error('Request interceptor error:', error);
    console.error('===============================================================');
    return Promise.reject(error)
  }
)

// Интерцептор для обработки ответов
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log('==================== API RESPONSE INTERCEPTOR ====================');
    console.log('URL:', response.config.url);
    console.log('Status:', response.status);
    console.log('Data preview:', JSON.stringify(response.data).substring(0, 200) + '...');
    console.log('===============================================================');
    
    return response
  },
  (error) => {
    console.error('==================== API RESPONSE INTERCEPTOR ERROR ====================');
    console.error('URL:', error.config?.url);
    console.error('Status:', error.response?.status);
    console.error('Status Text:', error.response?.statusText);
    console.error('Data:', error.response?.data);
    console.error('===============================================================');
    
    // Если токен истек или недействителен
    if (error.response?.status === 401) {
      console.log('==================== UNAUTHORIZED - CLEARING TOKENS ====================');
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_data')
      
      console.log('🔐 Auth token cleared, but staying on current page (Telegram Mini App)');
      // НЕ редиректим в Telegram Mini App - просто очищаем токены
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
    get: () => apiClient.get<ApiResponse<any>>('/api/profile'),
    update: (data: any) => apiClient.put<ApiResponse<any>>('/api/profile', data)
  },

  // Токены
  tokens: {
    getBalance: () => apiClient.get<ApiResponse<{ tokens: number }>>('/api/tokens/balance'),
    getHistory: (page = 1, limit = 20) => 
      apiClient.get<PaginatedResponse<any>>('/api/tokens/history', { params: { page, limit } }),
    getPackages: () => apiClient.get<ApiResponse<{ packages: any[] }>>('/api/packages')
  },

  // Платежи
  payments: {
    create: (packageId: string) => 
      apiClient.post<ApiResponse<{ paymentId: string; paymentUrl: string }>>('/api/payments', { packageId }),
    getHistory: (limit = 10) => 
      apiClient.get<ApiResponse<{ payments: any[] }>>('/api/payments/history', { params: { limit } })
  },

  // Генерация контента
  generate: {
    midjourney: (data: {
      prompt: string
      model?: string
      style?: string
      aspect_ratio?: string
      quality?: string
    }) => apiClient.post<ApiResponse<{ taskId: string; estimatedTime: number }>>('/api/generate/midjourney', data),

    kling: (data: {
      prompt: string
      duration?: number
      aspect_ratio?: string
    }) => apiClient.post<ApiResponse<{ taskId: string; estimatedTime: number }>>('/api/generate/kling', data)
  },

  // История генераций
  generations: {
    getHistory: (service?: string, page = 1, limit = 20) => 
      apiClient.get<PaginatedResponse<any>>('/api/generations', { 
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
    }>>('/api/stats')
  },

  // Опции сервисов
  services: {
    getOptions: (service: string) => 
      apiClient.get<ApiResponse<any>>(`/api/services/${service}/options`)
  },

  // Аватарка
  avatar: {
    upload: (avatarUrl: string) => 
      apiClient.post<ApiResponse<{ user: any }>>('/api/avatar/upload', { avatarUrl })
  }
}

export default apiClient
