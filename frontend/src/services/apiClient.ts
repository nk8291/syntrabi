/**
 * API client configuration for PowerBI Web Replica
 * Handles HTTP requests, authentication, and error handling
 */

import axios, { 
  AxiosInstance, 
  AxiosRequestConfig, 
  AxiosResponse, 
  AxiosError 
} from 'axios'
import toast from 'react-hot-toast'

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const REQUEST_TIMEOUT = 60000 // 60 seconds (increased for database operations)

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Add request timestamp for debugging
    config.metadata = { startTime: new Date() }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling and token refresh
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log response time in development
    if (import.meta.env.DEV && response.config.metadata) {
      const endTime = new Date()
      const duration = endTime.getTime() - response.config.metadata.startTime.getTime()
      console.log(`API ${response.config.method?.toUpperCase()} ${response.config.url}: ${duration}ms`)
    }
    
    return response
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        // Try to refresh the token
        const refreshToken = localStorage.getItem('refreshToken')
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
            refresh_token: refreshToken
          })

          const { access_token } = response.data
          localStorage.setItem('authToken', access_token)

          // Retry the original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access_token}`
          }
          
          return apiClient(originalRequest)
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('authToken')
        localStorage.removeItem('refreshToken')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    // Handle different error types
    const errorMessage = getErrorMessage(error)
    
    // Don't show error toasts for certain endpoints
    const silentEndpoints = ['/auth/me', '/auth/refresh']
    const isSilentEndpoint = silentEndpoints.some(endpoint => 
      originalRequest.url?.includes(endpoint)
    )

    if (!isSilentEndpoint && error.response?.status !== 401) {
      toast.error(errorMessage)
    }

    return Promise.reject(error)
  }
)

/**
 * Extract user-friendly error message from API error
 */
function getErrorMessage(error: AxiosError): string {
  if (error.response?.data) {
    const data = error.response.data as any
    
    // Check for different error response formats
    if (typeof data === 'string') {
      return data
    }
    
    if (data.message) {
      return data.message
    }
    
    if (data.detail) {
      return data.detail
    }
    
    if (data.error) {
      return data.error
    }
  }

  // Network or other errors
  if (error.code === 'ECONNABORTED') {
    return 'Request timeout. Please try again.'
  }
  
  if (error.message === 'Network Error') {
    return 'Network error. Please check your connection.'
  }

  // Default error message based on status code
  switch (error.response?.status) {
    case 400:
      return 'Invalid request. Please check your input.'
    case 401:
      return 'Authentication required. Please log in.'
    case 403:
      return 'Access denied. You don\'t have permission to perform this action.'
    case 404:
      return 'Resource not found.'
    case 409:
      return 'Conflict. The resource already exists or has been modified.'
    case 422:
      return 'Validation error. Please check your input.'
    case 429:
      return 'Too many requests. Please wait and try again.'
    case 500:
      return 'Server error. Please try again later.'
    case 502:
      return 'Service unavailable. Please try again later.'
    case 503:
      return 'Service maintenance. Please try again later.'
    default:
      return 'An unexpected error occurred. Please try again.'
  }
}

/**
 * Generic API request wrapper with proper typing
 */
export interface ApiResponse<T = any> {
  data: T
  status: number
  statusText: string
  headers: Record<string, string>
}

export class ApiError extends Error {
  public status?: number
  public response?: AxiosResponse

  constructor(message: string, status?: number, response?: AxiosResponse) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.response = response
  }
}

/**
 * Typed API client methods
 */
export const api = {
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> =>
    apiClient.get(url, config),

  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> =>
    apiClient.post(url, data, config),

  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> =>
    apiClient.put(url, data, config),

  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> =>
    apiClient.patch(url, data, config),

  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> =>
    apiClient.delete(url, config),
}

// Export the configured axios instance
export { apiClient }

// Export default as apiClient for backward compatibility
export default apiClient