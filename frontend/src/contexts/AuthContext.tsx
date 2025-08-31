/**
 * Authentication Context for PowerBI Web Replica
 * Manages user authentication state and provides auth-related functions
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { authService } from '@/services/authService'
import { User, LoginCredentials, RegisterData } from '@/types/auth'
import toast from 'react-hot-toast'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<boolean>
  register: (data: RegisterData) => Promise<boolean>
  logout: () => Promise<void>
  refreshToken: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is authenticated on app start
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('authToken')
        if (token) {
          const userData = await authService.getCurrentUser()
          setUser(userData)
        }
      } catch (error) {
        // Token is invalid or expired
        localStorage.removeItem('authToken')
        console.error('Authentication check failed:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    try {
      setIsLoading(true)
      const response = await authService.login(credentials)
      
      // Store token
      localStorage.setItem('authToken', response.access_token)
      
      // Store refresh token if provided
      if (response.refresh_token) {
        localStorage.setItem('refreshToken', response.refresh_token)
      }
      
      // Set user data
      setUser(response.user)
      
      toast.success('Welcome back!')
      return true
    } catch (error: any) {
      console.error('Login failed:', error)
      toast.error(error.message || 'Login failed')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (data: RegisterData): Promise<boolean> => {
    try {
      setIsLoading(true)
      const response = await authService.register(data)
      
      // Store token
      localStorage.setItem('authToken', response.access_token)
      
      // Store refresh token if provided
      if (response.refresh_token) {
        localStorage.setItem('refreshToken', response.refresh_token)
      }
      
      // Set user data
      setUser(response.user)
      
      toast.success('Account created successfully!')
      return true
    } catch (error: any) {
      console.error('Registration failed:', error)
      toast.error(error.message || 'Registration failed')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async (): Promise<void> => {
    try {
      await authService.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear local storage and state
      localStorage.removeItem('authToken')
      localStorage.removeItem('refreshToken')
      setUser(null)
      toast.success('Logged out successfully')
    }
  }

  const refreshToken = async (): Promise<boolean> => {
    try {
      const refreshTokenValue = localStorage.getItem('refreshToken')
      if (!refreshTokenValue) {
        throw new Error('No refresh token available')
      }

      const response = await authService.refreshToken(refreshTokenValue)
      
      // Update stored token
      localStorage.setItem('authToken', response.access_token)
      
      // Update user data
      setUser(response.user)
      
      return true
    } catch (error) {
      console.error('Token refresh failed:', error)
      
      // Clear tokens and user state
      localStorage.removeItem('authToken')
      localStorage.removeItem('refreshToken')
      setUser(null)
      
      return false
    }
  }

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    register,
    logout,
    refreshToken,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}