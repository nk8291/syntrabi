/**
 * Authentication related type definitions
 */

export interface User {
  id: string
  email: string
  name: string
  avatar_url?: string
  timezone: string
  locale: string
  is_active: boolean
  is_verified: boolean
  is_admin: boolean
  preferences: Record<string, any>
  created_at?: string
  updated_at?: string
  last_login?: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  name: string
  timezone?: string
  locale?: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  user: User
}

export interface RefreshTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: User
}