/**
 * Settings service for PowerBI Web Replica
 * Handles user preferences, workspace settings, and global configuration
 */

import { apiClient } from './apiClient'

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'auto'
  language?: string
  timezone?: string
  date_format?: string
  number_format?: string
  default_workspace_id?: string
  email_notifications?: boolean
  push_notifications?: boolean
  auto_refresh_reports?: boolean
  default_visual_theme?: string
  show_tips?: boolean
}

export interface WorkspaceSettings {
  workspace_id: string
  default_dataset_refresh_schedule?: string
  allow_external_sharing?: boolean
  require_approval_for_publishing?: boolean
  default_report_theme?: string
  auto_save_interval?: number
}

export interface GlobalSettings {
  max_file_upload_size?: number
  allowed_file_types?: string[]
  session_timeout?: number
  max_concurrent_queries?: number
  enable_analytics?: boolean
  maintenance_mode?: boolean
}

export interface SettingsExport {
  user_preferences: UserPreferences
  workspace_settings: { [key: string]: WorkspaceSettings }
  export_timestamp: string
  version: string
}

class SettingsService {
  /**
   * Get user preferences
   */
  async getUserPreferences(): Promise<UserPreferences> {
    try {
      const response = await apiClient.get('/api/settings/user/preferences')
      return response.data
    } catch (error) {
      console.warn('Failed to load user preferences, using defaults:', error)
      // Return default preferences if backend fails
      return {
        theme: 'light',
        language: 'en',
        timezone: 'UTC',
        date_format: 'MM/DD/YYYY',
        number_format: '1,234.56',
        email_notifications: true,
        push_notifications: true,
        auto_refresh_reports: true,
        default_visual_theme: 'default',
        show_tips: true
      }
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    try {
      const response = await apiClient.put('/api/settings/user/preferences', preferences)
      return response.data
    } catch (error) {
      console.error('Failed to update user preferences:', error)
      // Store in localStorage as fallback
      const stored = localStorage.getItem('userPreferences')
      const current = stored ? JSON.parse(stored) : {}
      const updated = { ...current, ...preferences }
      localStorage.setItem('userPreferences', JSON.stringify(updated))
      return updated
    }
  }

  /**
   * Get workspace settings
   */
  async getWorkspaceSettings(workspaceId: string): Promise<WorkspaceSettings> {
    try {
      const response = await apiClient.get(`/api/settings/workspace/${workspaceId}/settings`)
      return response.data
    } catch (error) {
      console.warn('Failed to load workspace settings, using defaults:', error)
      return {
        workspace_id: workspaceId,
        allow_external_sharing: false,
        require_approval_for_publishing: true,
        default_report_theme: 'default',
        auto_save_interval: 300
      }
    }
  }

  /**
   * Update workspace settings
   */
  async updateWorkspaceSettings(workspaceId: string, settings: Partial<WorkspaceSettings>): Promise<WorkspaceSettings> {
    try {
      const response = await apiClient.put(`/api/settings/workspace/${workspaceId}/settings`, settings)
      return response.data
    } catch (error) {
      console.error('Failed to update workspace settings:', error)
      throw error
    }
  }

  /**
   * Get global settings
   */
  async getGlobalSettings(): Promise<GlobalSettings> {
    try {
      const response = await apiClient.get('/api/settings/global')
      return response.data
    } catch (error) {
      console.warn('Failed to load global settings, using defaults:', error)
      return {
        max_file_upload_size: 104857600, // 100MB
        allowed_file_types: ['csv', 'xlsx', 'json', 'parquet'],
        session_timeout: 3600,
        max_concurrent_queries: 10,
        enable_analytics: true,
        maintenance_mode: false
      }
    }
  }

  /**
   * Update global settings (admin only)
   */
  async updateGlobalSettings(settings: Partial<GlobalSettings>): Promise<GlobalSettings> {
    try {
      const response = await apiClient.put('/api/settings/global', settings)
      return response.data
    } catch (error) {
      console.error('Failed to update global settings:', error)
      throw error
    }
  }

  /**
   * Export all user settings
   */
  async exportSettings(): Promise<SettingsExport> {
    try {
      const response = await apiClient.get('/api/settings/export')
      return response.data
    } catch (error) {
      console.error('Failed to export settings:', error)
      throw error
    }
  }

  /**
   * Import user settings
   */
  async importSettings(settingsData: SettingsExport): Promise<void> {
    try {
      await apiClient.post('/api/settings/import', settingsData)
    } catch (error) {
      console.error('Failed to import settings:', error)
      throw error
    }
  }

  /**
   * Reset user settings to defaults
   */
  async resetSettings(): Promise<void> {
    try {
      await apiClient.post('/api/settings/reset')
      // Also clear localStorage
      localStorage.removeItem('userPreferences')
    } catch (error) {
      console.error('Failed to reset settings:', error)
      // Clear localStorage anyway
      localStorage.removeItem('userPreferences')
    }
  }

  /**
   * Apply theme to the document
   */
  applyTheme(theme: 'light' | 'dark' | 'auto'): void {
    const root = document.documentElement
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    if (theme === 'auto') {
      theme = prefersDark ? 'dark' : 'light'
    }

    root.classList.remove('light', 'dark')
    root.classList.add(theme)

    // Update theme-color meta tag for mobile browsers
    const themeColorMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement
    if (themeColorMeta) {
      themeColorMeta.content = theme === 'dark' ? '#1f2937' : '#ffffff'
    }
  }

  /**
   * Get cached user preferences from localStorage
   */
  getCachedUserPreferences(): UserPreferences | null {
    try {
      const cached = localStorage.getItem('userPreferences')
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      console.error('Failed to parse cached preferences:', error)
      return null
    }
  }

  /**
   * Cache user preferences in localStorage
   */
  cacheUserPreferences(preferences: UserPreferences): void {
    try {
      localStorage.setItem('userPreferences', JSON.stringify(preferences))
    } catch (error) {
      console.error('Failed to cache preferences:', error)
    }
  }

  /**
   * Initialize settings on app startup
   */
  async initializeSettings(): Promise<UserPreferences> {
    // Try to load from cache first
    const cached = this.getCachedUserPreferences()
    if (cached && cached.theme) {
      this.applyTheme(cached.theme)
    }

    // Load fresh preferences from backend
    try {
      const preferences = await this.getUserPreferences()
      this.cacheUserPreferences(preferences)
      if (preferences.theme) {
        this.applyTheme(preferences.theme)
      }
      return preferences
    } catch (error) {
      console.error('Failed to initialize settings:', error)
      return cached || {
        theme: 'light',
        language: 'en',
        timezone: 'UTC',
        date_format: 'MM/DD/YYYY',
        number_format: '1,234.56',
        email_notifications: true,
        push_notifications: true,
        auto_refresh_reports: true,
        default_visual_theme: 'default',
        show_tips: true
      }
    }
  }
}

export const settingsService = new SettingsService()