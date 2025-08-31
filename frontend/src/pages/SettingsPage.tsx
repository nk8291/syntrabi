/**
 * Settings Page Component
 * Comprehensive user and application settings
 */

import React, { useState, useEffect } from 'react'
import {
  UserCircleIcon,
  PaintBrushIcon,
  BellIcon,
  ShieldCheckIcon,
  CloudIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  DevicePhoneMobileIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '@/contexts/AuthContext'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import toast from 'react-hot-toast'

interface UserProfile {
  name: string
  email: string
  role: string
  timezone: string
  language: string
  email_notifications: boolean
  push_notifications: boolean
  marketing_emails: boolean
}

interface AppearanceSettings {
  theme: 'light' | 'dark' | 'auto'
  primary_color: string
  sidebar_collapsed: boolean
  animations: boolean
}

// Local storage keys
const SETTINGS_KEYS = {
  PROFILE: 'powerbi_user_profile',
  APPEARANCE: 'powerbi_appearance_settings'
}

const SettingsPage: React.FC = () => {
  const { user } = useAuth()
  const [activeSection, setActiveSection] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  
  // Load settings from localStorage or use defaults
  const loadProfileSettings = (): UserProfile => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEYS.PROFILE)
      if (saved) {
        const parsed = JSON.parse(saved)
        return {
          ...parsed,
          // Always use current user info for name/email/role
          name: user?.name || parsed.name || '',
          email: user?.email || parsed.email || '',
          role: user?.role || parsed.role || 'user'
        }
      }
    } catch (error) {
      console.error('Failed to load profile settings:', error)
    }
    
    return {
      name: user?.name || '',
      email: user?.email || '',
      role: user?.role || 'user',
      timezone: 'UTC',
      language: 'en',
      email_notifications: true,
      push_notifications: true,
      marketing_emails: false
    }
  }

  const loadAppearanceSettings = (): AppearanceSettings => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEYS.APPEARANCE)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (error) {
      console.error('Failed to load appearance settings:', error)
    }
    
    return {
      theme: 'light',
      primary_color: '#3b82f6',
      sidebar_collapsed: false,
      animations: true
    }
  }

  const [profile, setProfile] = useState<UserProfile>(loadProfileSettings)
  const [appearance, setAppearance] = useState<AppearanceSettings>(loadAppearanceSettings)
  const [originalProfile, setOriginalProfile] = useState<UserProfile>(loadProfileSettings)
  const [originalAppearance, setOriginalAppearance] = useState<AppearanceSettings>(loadAppearanceSettings)

  // Load settings on component mount
  useEffect(() => {
    const profileSettings = loadProfileSettings()
    const appearanceSettings = loadAppearanceSettings()
    
    setProfile(profileSettings)
    setAppearance(appearanceSettings)
    setOriginalProfile(profileSettings)
    setOriginalAppearance(appearanceSettings)
    
    // Apply loaded appearance settings immediately
    applyTheme(appearanceSettings.theme)
    document.documentElement.style.setProperty('--primary-color', appearanceSettings.primary_color)
  }, [user])

  const applyTheme = (theme: 'light' | 'dark' | 'auto') => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      // Auto theme - check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }

  // Listen for system theme changes when using auto theme
  useEffect(() => {
    if (appearance.theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = () => applyTheme('auto')
      
      mediaQuery.addListener(handler)
      return () => mediaQuery.removeListener(handler)
    }
  }, [appearance.theme])

  // Check for unsaved changes
  useEffect(() => {
    const profileChanged = JSON.stringify(profile) !== JSON.stringify(originalProfile)
    const appearanceChanged = JSON.stringify(appearance) !== JSON.stringify(originalAppearance)
    setHasUnsavedChanges(profileChanged || appearanceChanged)
  }, [profile, appearance, originalProfile, originalAppearance])

  const sections = [
    { id: 'profile', name: 'Profile', icon: UserCircleIcon, description: 'Personal information and preferences' },
    { id: 'appearance', name: 'Appearance', icon: PaintBrushIcon, description: 'Theme, colors, and visual settings' },
    { id: 'notifications', name: 'Notifications', icon: BellIcon, description: 'Email and push notification settings' },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon, description: 'Account security and privacy' },
    { id: 'integrations', name: 'Integrations', icon: CloudIcon, description: 'Connected services and APIs' },
    { id: 'about', name: 'About', icon: InformationCircleIcon, description: 'Version info and system status' }
  ]

  const timezones = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai'
  ]

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' }
  ]

  const primaryColors = [
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#10b981' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Orange', value: '#f59e0b' },
    { name: 'Red', value: '#ef4444' }
  ]

  const saveToLocalStorage = () => {
    try {
      localStorage.setItem(SETTINGS_KEYS.PROFILE, JSON.stringify(profile))
      localStorage.setItem(SETTINGS_KEYS.APPEARANCE, JSON.stringify(appearance))
      return true
    } catch (error) {
      console.error('Failed to save to localStorage:', error)
      return false
    }
  }

  const saveToAPI = async (): Promise<boolean> => {
    try {
      // Mock API call - in a real app, this would call your backend
      // await userService.updateProfile(profile)
      // await userService.updateAppearanceSettings(appearance)
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // For now, just simulate success
      return true
    } catch (error) {
      console.error('Failed to save to API:', error)
      return false
    }
  }

  const handleSave = async () => {
    if (!hasUnsavedChanges) {
      toast.success('No changes to save!')
      return
    }

    setLoading(true)
    try {
      // Save to localStorage first (always works offline)
      const localSaved = saveToLocalStorage()
      
      if (localSaved) {
        // Try to sync with API
        const apiSaved = await saveToAPI()
        
        if (apiSaved) {
          // Update original state to reflect saved changes
          setOriginalProfile({ ...profile })
          setOriginalAppearance({ ...appearance })
          
          toast.success('Settings saved successfully!')
          
          // Apply theme changes immediately
          if (appearance.theme === 'dark') {
            document.documentElement.classList.add('dark')
          } else {
            document.documentElement.classList.remove('dark')
          }
          
          // Apply primary color to CSS variables
          document.documentElement.style.setProperty('--primary-color', appearance.primary_color)
          
        } else {
          toast.success('Settings saved locally (will sync when online)')
        }
      } else {
        throw new Error('Failed to save settings locally')
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Failed to save settings. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to default?')) {
      const defaultProfile = loadProfileSettings()
      const defaultAppearance = loadAppearanceSettings()
      
      setProfile(defaultProfile)
      setAppearance(defaultAppearance)
      
      // Clear localStorage
      localStorage.removeItem(SETTINGS_KEYS.PROFILE)
      localStorage.removeItem(SETTINGS_KEYS.APPEARANCE)
      
      toast.success('Settings reset to defaults')
    }
  }

  const renderProfileSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
            <select
              value={profile.timezone}
              onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
              className="input w-full"
            >
              {timezones.map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
            <select
              value={profile.language}
              onChange={(e) => setProfile({ ...profile, language: e.target.value })}
              className="input w-full"
            >
              {languages.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {hasUnsavedChanges && (
            <span className="text-sm text-amber-600 flex items-center">
              <span className="inline-block w-2 h-2 bg-amber-500 rounded-full mr-2"></span>
              Unsaved changes
            </span>
          )}
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleReset}
            disabled={loading}
            className="btn btn-outline"
          >
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !hasUnsavedChanges}
            className={`btn ${hasUnsavedChanges ? 'btn-primary' : 'btn-outline'}`}
          >
            {loading ? <LoadingSpinner size="sm" /> : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )

  const renderAppearanceSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Theme</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['light', 'dark', 'auto'] as const).map(theme => (
            <button
              key={theme}
              onClick={() => {
                const newAppearance = { ...appearance, theme }
                setAppearance(newAppearance)
                
                // Apply theme immediately
                applyTheme(theme)
              }}
              className={`p-4 border-2 rounded-lg text-center transition-all ${
                appearance.theme === theme 
                  ? 'border-primary-500 bg-primary-50' 
                  : 'border-gray-200 hover:border-primary-300'
              }`}
            >
              <div className="text-2xl mb-2">
                {theme === 'light' ? '☀️' : theme === 'dark' ? '🌙' : '⚡'}
              </div>
              <div className="text-sm font-medium capitalize">{theme}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Primary Color</h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {primaryColors.map(color => (
            <button
              key={color.value}
              onClick={() => {
                const newAppearance = { ...appearance, primary_color: color.value }
                setAppearance(newAppearance)
                
                // Apply primary color immediately
                document.documentElement.style.setProperty('--primary-color', color.value)
              }}
              className={`relative p-3 rounded-lg border-2 transition-all ${
                appearance.primary_color === color.value 
                  ? 'border-gray-400' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              style={{ backgroundColor: color.value }}
            >
              {appearance.primary_color === color.value && (
                <CheckCircleIcon className="h-5 w-5 text-white absolute inset-0 m-auto" />
              )}
              <span className="sr-only">{color.name}</span>
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {hasUnsavedChanges && (
            <span className="text-sm text-amber-600 flex items-center">
              <span className="inline-block w-2 h-2 bg-amber-500 rounded-full mr-2"></span>
              Unsaved changes
            </span>
          )}
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleReset}
            disabled={loading}
            className="btn btn-outline"
          >
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !hasUnsavedChanges}
            className={`btn ${hasUnsavedChanges ? 'btn-primary' : 'btn-outline'}`}
          >
            {loading ? <LoadingSpinner size="sm" /> : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )

  const renderNotificationsSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Preferences</h3>
        <div className="space-y-4">
          {[
            { key: 'email_notifications', label: 'Email Notifications', description: 'Receive important updates via email' },
            { key: 'push_notifications', label: 'Push Notifications', description: 'Get notified in your browser' },
            { key: 'marketing_emails', label: 'Marketing Emails', description: 'Receive product updates and tips' }
          ].map(({ key, label, description }) => (
            <div key={key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <label className="text-sm font-medium text-gray-700">{label}</label>
                <p className="text-xs text-gray-500 mt-1">{description}</p>
              </div>
              <button
                onClick={() => setProfile({ ...profile, [key]: !profile[key as keyof UserProfile] })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  profile[key as keyof UserProfile] ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  profile[key as keyof UserProfile] ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {hasUnsavedChanges && (
            <span className="text-sm text-amber-600 flex items-center">
              <span className="inline-block w-2 h-2 bg-amber-500 rounded-full mr-2"></span>
              Unsaved changes
            </span>
          )}
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleReset}
            disabled={loading}
            className="btn btn-outline"
          >
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !hasUnsavedChanges}
            className={`btn ${hasUnsavedChanges ? 'btn-primary' : 'btn-outline'}`}
          >
            {loading ? <LoadingSpinner size="sm" /> : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )

  const renderAboutSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">System Information</h3>
        <div className="bg-gray-50 rounded-lg p-6 space-y-4">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Version</span>
            <span className="text-sm font-medium">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Last Updated</span>
            <span className="text-sm font-medium">December 2024</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Environment</span>
            <span className="text-sm font-medium">Production</span>
          </div>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Support</h3>
        <div className="space-y-3">
          <button className="btn btn-outline w-full justify-start">
            <InformationCircleIcon className="h-4 w-4 mr-2" />
            Documentation
          </button>
          <button className="btn btn-outline w-full justify-start">
            <DevicePhoneMobileIcon className="h-4 w-4 mr-2" />
            Contact Support
          </button>
          <button className="btn btn-outline w-full justify-start">
            <GlobeAltIcon className="h-4 w-4 mr-2" />
            Community Forum
          </button>
        </div>
      </div>
    </div>
  )

  const renderSection = () => {
    switch (activeSection) {
      case 'profile': return renderProfileSection()
      case 'appearance': return renderAppearanceSection()
      case 'notifications': return renderNotificationsSection()
      case 'about': return renderAboutSection()
      default: return renderProfileSection()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your account preferences and application settings</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <nav className="space-y-1">
              {sections.map((section) => {
                const Icon = section.icon
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left px-3 py-3 rounded-lg transition-colors flex items-center space-x-3 ${
                      activeSection === section.id
                        ? 'bg-primary-100 text-primary-700 border border-primary-200'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{section.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{section.description}</div>
                    </div>
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow p-6">
              {renderSection()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage