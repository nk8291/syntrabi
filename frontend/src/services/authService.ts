/**
 * Authentication service for PowerBI Web Replica
 * Handles login, registration, token management, and user operations
 */

import { apiClient } from './apiClient'
import { 
  User, 
  LoginCredentials, 
  RegisterData, 
  AuthResponse, 
  RefreshTokenResponse 
} from '@/types/auth'

class AuthService {
  /**
   * Login user with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/api/auth/login', credentials)
    return response.data
  }

  /**
   * Register new user account
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/api/auth/register', data)
    return response.data
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/api/auth/logout')
    } catch (error) {
      // Even if logout fails on server, we still want to clear local state
      console.warn('Logout request failed:', error)
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>('/api/auth/me')
    return response.data
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    const response = await apiClient.post<RefreshTokenResponse>('/api/auth/refresh', {
      refresh_token: refreshToken
    })
    return response.data
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<User>): Promise<User> {
    const response = await apiClient.put<User>('/api/auth/profile', updates)
    return response.data
  }

  /**
   * Change user password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.post('/api/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword
    })
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    await apiClient.post('/api/auth/forgot-password', { email })
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    await apiClient.post('/api/auth/reset-password', {
      token,
      new_password: newPassword
    })
  }

  /**
   * Verify email address
   */
  async verifyEmail(token: string): Promise<void> {
    await apiClient.post('/api/auth/verify-email', { token })
  }

  /**
   * Resend email verification
   */
  async resendEmailVerification(): Promise<void> {
    await apiClient.post('/auth/resend-verification')
  }

  /**
   * Check if current token is valid
   */
  async validateToken(): Promise<boolean> {
    try {
      await this.getCurrentUser()
      return true
    } catch {
      return false
    }
  }

  /**
   * Get stored auth token
   */
  getStoredToken(): string | null {
    return localStorage.getItem('authToken')
  }

  /**
   * Get stored refresh token
   */
  getStoredRefreshToken(): string | null {
    return localStorage.getItem('refreshToken')
  }

  /**
   * Clear stored tokens
   */
  clearStoredTokens(): void {
    localStorage.removeItem('authToken')
    localStorage.removeItem('refreshToken')
  }
}

export const authService = new AuthService()