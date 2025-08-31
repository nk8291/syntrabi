/**
 * Common type definitions
 */

export interface ApiResponse<T> {
  data?: T
  message?: string
  error?: string
  status: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
  has_next: boolean
  has_previous: boolean
}

export interface SelectOption {
  value: string
  label: string
  description?: string
  icon?: string
}

export interface Position {
  x: number
  y: number
}

export interface Dimensions {
  width: number
  height: number
}

export interface Bounds extends Position, Dimensions {}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

export type Theme = 'light' | 'dark' | 'system'