/**
 * Theme Switcher Component
 * Power BI-style theme selection dropdown
 */

import React, { useState } from 'react'
import {
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  EyeIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import { useTheme } from '@/contexts/ThemeContext'

const ThemeSwitcher: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme, themeName, availableThemes, setTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)

  const getThemeIcon = (themeId: string) => {
    switch (themeId) {
      case 'light':
        return <SunIcon className="h-4 w-4" />
      case 'dark':
        return <MoonIcon className="h-4 w-4" />
      case 'colorblind':
        return <EyeIcon className="h-4 w-4" />
      default:
        return <ComputerDesktopIcon className="h-4 w-4" />
    }
  }

  const currentTheme = availableThemes.find(t => t.id === themeName)

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          color: theme.colors.text.primary
        }}
      >
        {getThemeIcon(themeName)}
        <span>{currentTheme?.displayName || 'Theme'}</span>
        <ChevronDownIcon 
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div 
            className="absolute right-0 mt-2 w-56 rounded-md shadow-lg border z-20"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border
            }}
          >
            <div className="py-1">
              <div className="px-3 py-2 border-b" style={{ borderColor: theme.colors.border }}>
                <div className="text-xs font-medium" style={{ color: theme.colors.text.secondary }}>
                  Report theme
                </div>
              </div>
              
              {availableThemes.map((availableTheme) => (
                <button
                  key={availableTheme.id}
                  onClick={() => {
                    setTheme(availableTheme.id)
                    setIsOpen(false)
                  }}
                  className="w-full flex items-center space-x-3 px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                  style={{
                    color: theme.colors.text.primary,
                    backgroundColor: themeName === availableTheme.id ? theme.colors.accent.primary + '10' : 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.colors.surfaceSecondary
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = themeName === availableTheme.id ? theme.colors.accent.primary + '10' : 'transparent'
                  }}
                >
                  <div className="flex-shrink-0">
                    {getThemeIcon(availableTheme.id)}
                  </div>
                  
                  <div className="flex-1 text-left">
                    <div className="font-medium">{availableTheme.displayName}</div>
                    <div className="text-xs" style={{ color: theme.colors.text.muted }}>
                      {availableTheme.id === 'light' && 'Clean, bright interface'}
                      {availableTheme.id === 'dark' && 'Easy on the eyes in low light'}
                      {availableTheme.id === 'colorblind' && 'Accessible color palette'}
                    </div>
                  </div>

                  {/* Color Preview */}
                  <div className="flex space-x-1">
                    {availableTheme.colors.data.slice(0, 5).map((color, index) => (
                      <div
                        key={index}
                        className="w-3 h-3 rounded-full border border-gray-200"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>

                  {/* Active Indicator */}
                  {themeName === availableTheme.id && (
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: theme.colors.accent.primary }}
                    />
                  )}
                </button>
              ))}
              
              <div className="border-t mt-2 pt-2" style={{ borderColor: theme.colors.border }}>
                <div className="px-3 py-1">
                  <div className="text-xs" style={{ color: theme.colors.text.muted }}>
                    Theme affects colors, contrast, and visual styling throughout the report.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default ThemeSwitcher