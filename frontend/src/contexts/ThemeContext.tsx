/**
 * Theme Context for Power BI Web Replica
 * Provides dark/light theme switching like Power BI
 */

import React, { createContext, useContext, useEffect, useState } from 'react'

export interface Theme {
  id: string
  name: string
  displayName: string
  colors: {
    background: string
    surface: string
    surfaceSecondary: string
    border: string
    borderLight: string
    text: {
      primary: string
      secondary: string
      muted: string
      inverse: string
    }
    accent: {
      primary: string
      secondary: string
      hover: string
    }
    status: {
      success: string
      warning: string
      error: string
      info: string
    }
    data: string[]
  }
  styles: {
    fontFamily: string
    fontSize: {
      xs: string
      sm: string
      base: string
      lg: string
      xl: string
    }
    borderRadius: {
      sm: string
      base: string
      lg: string
    }
    shadow: {
      sm: string
      base: string
      lg: string
    }
  }
}

const lightTheme: Theme = {
  id: 'light',
  name: 'light',
  displayName: 'Light',
  colors: {
    background: '#ffffff',
    surface: '#ffffff',
    surfaceSecondary: '#f8f9fa',
    border: '#e5e7eb',
    borderLight: '#f3f4f6',
    text: {
      primary: '#111827',
      secondary: '#4b5563',
      muted: '#9ca3af',
      inverse: '#ffffff'
    },
    accent: {
      primary: '#2563eb',
      secondary: '#3b82f6',
      hover: '#1d4ed8'
    },
    status: {
      success: '#059669',
      warning: '#d97706',
      error: '#dc2626',
      info: '#2563eb'
    },
    data: [
      '#2563eb', '#7c3aed', '#db2777', '#dc2626', '#ea580c',
      '#d97706', '#65a30d', '#059669', '#0891b2', '#0284c7'
    ]
  },
  styles: {
    fontFamily: '"Segoe UI", system-ui, sans-serif',
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem'
    },
    borderRadius: {
      sm: '0.25rem',
      base: '0.375rem',
      lg: '0.5rem'
    },
    shadow: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)'
    }
  }
}

const darkTheme: Theme = {
  id: 'dark',
  name: 'dark',
  displayName: 'Dark',
  colors: {
    background: '#0f172a',
    surface: '#1e293b',
    surfaceSecondary: '#334155',
    border: '#475569',
    borderLight: '#64748b',
    text: {
      primary: '#f8fafc',
      secondary: '#e2e8f0',
      muted: '#94a3b8',
      inverse: '#0f172a'
    },
    accent: {
      primary: '#3b82f6',
      secondary: '#60a5fa',
      hover: '#2563eb'
    },
    status: {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6'
    },
    data: [
      '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
      '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#0ea5e9'
    ]
  },
  styles: {
    fontFamily: '"Segoe UI", system-ui, sans-serif',
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem'
    },
    borderRadius: {
      sm: '0.25rem',
      base: '0.375rem',
      lg: '0.5rem'
    },
    shadow: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.2)',
      base: '0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.4), 0 4px 6px -4px rgb(0 0 0 / 0.4)'
    }
  }
}

const colorBlindFriendlyTheme: Theme = {
  id: 'colorblind',
  name: 'colorblind',
  displayName: 'Colorblind Friendly',
  colors: {
    background: '#ffffff',
    surface: '#ffffff',
    surfaceSecondary: '#f8f9fa',
    border: '#e5e7eb',
    borderLight: '#f3f4f6',
    text: {
      primary: '#111827',
      secondary: '#4b5563',
      muted: '#9ca3af',
      inverse: '#ffffff'
    },
    accent: {
      primary: '#0066cc',
      secondary: '#3388dd',
      hover: '#004499'
    },
    status: {
      success: '#228b22',
      warning: '#ff8800',
      error: '#cc0000',
      info: '#0066cc'
    },
    data: [
      '#0173b2', '#de8f05', '#cc78bc', '#029e73', '#fbafe4',
      '#ece133', '#56b4e9', '#d55e00', '#ca9161', '#949494'
    ]
  },
  styles: lightTheme.styles
}

const themes: { [key: string]: Theme } = {
  light: lightTheme,
  dark: darkTheme,
  colorblind: colorBlindFriendlyTheme
}

interface ThemeContextValue {
  theme: Theme
  themeName: string
  availableThemes: Theme[]
  setTheme: (themeName: string) => void
  toggleTheme: () => void
  isDarkMode: boolean
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: string
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  defaultTheme = 'light' 
}) => {
  const [themeName, setThemeName] = useState<string>(() => {
    // Check localStorage first, then system preference, then default
    const savedTheme = localStorage.getItem('powerbi-theme')
    if (savedTheme && themes[savedTheme]) {
      return savedTheme
    }
    
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
    
    return defaultTheme
  })

  const theme = themes[themeName] || themes.light
  const isDarkMode = themeName === 'dark'

  // Listen to system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = (e: MediaQueryListEvent) => {
      const savedTheme = localStorage.getItem('powerbi-theme')
      // Only change theme if user hasn't manually set one
      if (!savedTheme) {
        setThemeName(e.matches ? 'dark' : 'light')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement
    
    // Set CSS custom properties
    root.style.setProperty('--color-background', theme.colors.background)
    root.style.setProperty('--color-surface', theme.colors.surface)
    root.style.setProperty('--color-surface-secondary', theme.colors.surfaceSecondary)
    root.style.setProperty('--color-border', theme.colors.border)
    root.style.setProperty('--color-border-light', theme.colors.borderLight)
    root.style.setProperty('--color-text-primary', theme.colors.text.primary)
    root.style.setProperty('--color-text-secondary', theme.colors.text.secondary)
    root.style.setProperty('--color-text-muted', theme.colors.text.muted)
    root.style.setProperty('--color-text-inverse', theme.colors.text.inverse)
    root.style.setProperty('--color-accent-primary', theme.colors.accent.primary)
    root.style.setProperty('--color-accent-secondary', theme.colors.accent.secondary)
    root.style.setProperty('--color-accent-hover', theme.colors.accent.hover)
    
    // Set theme class on document
    root.className = `theme-${theme.name}`
    
    // Store in localStorage
    localStorage.setItem('powerbi-theme', themeName)
  }, [theme, themeName])

  const setThemeHandler = (newThemeName: string) => {
    if (themes[newThemeName]) {
      setThemeName(newThemeName)
    }
  }

  const toggleTheme = () => {
    setThemeName(current => current === 'dark' ? 'light' : 'dark')
  }

  const availableThemes = Object.values(themes)

  const value: ThemeContextValue = {
    theme,
    themeName,
    availableThemes,
    setTheme: setThemeHandler,
    toggleTheme,
    isDarkMode
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

// Theme utility functions
export const getThemedColor = (colorPath: string, theme: Theme): string => {
  const paths = colorPath.split('.')
  let value: any = theme.colors
  
  for (const path of paths) {
    value = value[path]
    if (value === undefined) break
  }
  
  return value || theme.colors.text.primary
}

export const getDataColor = (index: number, theme: Theme): string => {
  return theme.colors.data[index % theme.colors.data.length]
}

export default ThemeContext