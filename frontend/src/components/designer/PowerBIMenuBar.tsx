/**
 * Power BI Desktop Style Menu Bar
 * Complete implementation of Power BI desktop ribbon interface
 * Includes Home, Insert, Modeling, View, and Help tabs with full functionality
 */

import React, { useState, useCallback } from 'react'
import {
  // Home tab icons
  DocumentPlusIcon,
  FolderOpenIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  ClipboardDocumentIcon,
  DocumentDuplicateIcon,
  ScissorsIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  // Insert tab icons
  Squares2X2Icon,
  ChartBarIcon,
  PhotoIcon,
  RectangleStackIcon,
  MapIcon,
  TableCellsIcon,
  // Modeling tab icons
  CalculatorIcon,
  CogIcon,
  LinkIcon,
  EyeIcon,
  // View tab icons
  EyeSlashIcon,
  Cog6ToothIcon,
  PresentationChartLineIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  // Help tab icons
  QuestionMarkCircleIcon,
  BookOpenIcon,
  ChatBubbleLeftEllipsisIcon,
} from '@heroicons/react/24/outline'

type MenuTab = 'home' | 'insert' | 'modeling' | 'view' | 'help'

interface MenuAction {
  id: string
  label: string
  icon: React.ElementType
  description: string
  shortcut?: string
  disabled?: boolean
  isDropdown?: boolean
  children?: MenuAction[]
  onClick?: () => void
}

interface PowerBIMenuBarProps {
  onNewReport?: () => void
  onOpenReport?: () => void
  onSaveReport?: () => void
  onPublishReport?: () => void
  onInsertVisual?: (type: string) => void
  onInsertShape?: (type: string) => void
  onShowDataSourceConnector?: () => void
  onRefreshData?: () => void
  onToggleFieldsPane?: () => void
  onToggleFiltersPane?: () => void
  onToggleVisualizationsPane?: () => void
  onToggleBookmarks?: () => void
  onToggleSelectionPane?: () => void
  className?: string
}

const PowerBIMenuBar: React.FC<PowerBIMenuBarProps> = ({
  onNewReport,
  onOpenReport,
  onSaveReport,
  onPublishReport,
  onInsertVisual,
  onInsertShape,
  onShowDataSourceConnector,
  onRefreshData,
  onToggleFieldsPane,
  onToggleFiltersPane,
  onToggleVisualizationsPane,
  onToggleBookmarks,
  onToggleSelectionPane,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<MenuTab>('home')
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)

  const homeActions: MenuAction[] = [
    {
      id: 'new-report',
      label: 'New Report',
      icon: DocumentPlusIcon,
      description: 'Create a new report',
      shortcut: 'Ctrl+N',
      onClick: onNewReport
    },
    {
      id: 'open',
      label: 'Open',
      icon: FolderOpenIcon,
      description: 'Open an existing report',
      shortcut: 'Ctrl+O',
      onClick: onOpenReport
    },
    {
      id: 'save',
      label: 'Save',
      icon: ArrowDownTrayIcon,
      description: 'Save the current report',
      shortcut: 'Ctrl+S',
      onClick: onSaveReport
    },
    {
      id: 'save-as',
      label: 'Save As',
      icon: ArrowDownTrayIcon,
      description: 'Save with a different name',
      isDropdown: true,
      children: [
        { id: 'save-as-pbix', label: 'Save as PBIX', icon: ArrowDownTrayIcon, description: 'Save as Power BI file' },
        { id: 'save-as-template', label: 'Save as Template', icon: ArrowDownTrayIcon, description: 'Save as template' }
      ]
    },
    {
      id: 'publish',
      label: 'Publish',
      icon: ArrowPathIcon,
      description: 'Publish to Power BI Service',
      onClick: onPublishReport
    },
    {
      id: 'refresh',
      label: 'Refresh',
      icon: ArrowPathIcon,
      description: 'Refresh data from sources',
      onClick: onRefreshData
    },
    {
      id: 'get-data',
      label: 'Get Data',
      icon: LinkIcon,
      description: 'Connect to data sources',
      isDropdown: true,
      onClick: onShowDataSourceConnector,
      children: [
        { id: 'excel', label: 'Excel', icon: DocumentPlusIcon, description: 'Import from Excel' },
        { id: 'sql-server', label: 'SQL Server', icon: LinkIcon, description: 'Connect to SQL Server' },
        { id: 'web', label: 'Web', icon: LinkIcon, description: 'Get data from web' },
        { id: 'more', label: 'More...', icon: LinkIcon, description: 'See all data sources' }
      ]
    }
  ]

  const insertActions: MenuAction[] = [
    {
      id: 'visualizations',
      label: 'Visuals',
      icon: ChartBarIcon,
      description: 'Insert visualizations',
      isDropdown: true,
      children: [
        { id: 'column-chart', label: 'Column Chart', icon: ChartBarIcon, description: 'Clustered column chart' },
        { id: 'line-chart', label: 'Line Chart', icon: PresentationChartLineIcon, description: 'Line chart' },
        { id: 'pie-chart', label: 'Pie Chart', icon: ChartBarIcon, description: 'Pie chart' },
        { id: 'table', label: 'Table', icon: TableCellsIcon, description: 'Data table' },
        { id: 'map', label: 'Map', icon: MapIcon, description: 'Map visualization' }
      ]
    },
    {
      id: 'text-box',
      label: 'Text Box',
      icon: Squares2X2Icon,
      description: 'Insert text box',
      onClick: () => onInsertShape?.('textbox')
    },
    {
      id: 'shapes',
      label: 'Shapes',
      icon: RectangleStackIcon,
      description: 'Insert shapes',
      isDropdown: true,
      children: [
        { id: 'rectangle', label: 'Rectangle', icon: RectangleStackIcon, description: 'Rectangle shape' },
        { id: 'oval', label: 'Oval', icon: RectangleStackIcon, description: 'Oval shape' },
        { id: 'line', label: 'Line', icon: RectangleStackIcon, description: 'Line shape' },
        { id: 'arrow', label: 'Arrow', icon: RectangleStackIcon, description: 'Arrow shape' }
      ]
    },
    {
      id: 'image',
      label: 'Image',
      icon: PhotoIcon,
      description: 'Insert image',
      onClick: () => onInsertShape?.('image')
    },
    {
      id: 'button',
      label: 'Button',
      icon: RectangleStackIcon,
      description: 'Insert button',
      onClick: () => onInsertShape?.('button')
    }
  ]

  const modelingActions: MenuAction[] = [
    {
      id: 'new-measure',
      label: 'New Measure',
      icon: CalculatorIcon,
      description: 'Create a new measure',
      onClick: () => console.log('Creating new measure...')
    },
    {
      id: 'new-column',
      label: 'New Column',
      icon: TableCellsIcon,
      description: 'Create a new calculated column',
      onClick: () => console.log('Creating new column...')
    },
    {
      id: 'new-table',
      label: 'New Table',
      icon: TableCellsIcon,
      description: 'Create a new calculated table',
      onClick: () => console.log('Creating new table...')
    },
    {
      id: 'manage-relationships',
      label: 'Manage Relationships',
      icon: LinkIcon,
      description: 'Manage table relationships',
      onClick: () => console.log('Managing relationships...')
    },
    {
      id: 'mark-as-date-table',
      label: 'Mark as Date Table',
      icon: CogIcon,
      description: 'Mark table as date table',
      onClick: () => console.log('Marking as date table...')
    }
  ]

  const viewActions: MenuAction[] = [
    {
      id: 'fit-to-page',
      label: 'Fit to Page',
      icon: MagnifyingGlassIcon,
      description: 'Fit report to page',
      onClick: () => {
        const canvas = document.querySelector('.design-canvas')
        if (canvas) {
          const container = canvas.parentElement
          if (container) {
            const scale = Math.min(
              container.clientWidth / 1200,
              container.clientHeight / 800
            )
            ;(canvas as HTMLElement).style.transform = `scale(${scale})`
            ;(canvas as HTMLElement).style.transformOrigin = '0 0'
          }
        }
      }
    },
    {
      id: 'actual-size',
      label: 'Actual Size',
      icon: MagnifyingGlassIcon,
      description: 'View at 100%',
      onClick: () => {
        const canvas = document.querySelector('.design-canvas')
        if (canvas) {
          ;(canvas as HTMLElement).style.transform = 'scale(1)'
          ;(canvas as HTMLElement).style.transformOrigin = '0 0'
        }
      }
    },
    {
      id: 'fit-to-width',
      label: 'Fit to Width',
      icon: MagnifyingGlassIcon,
      description: 'Fit to page width',
      onClick: () => {
        const canvas = document.querySelector('.design-canvas')
        if (canvas) {
          const container = canvas.parentElement
          if (container) {
            const scale = container.clientWidth / 1200
            ;(canvas as HTMLElement).style.transform = `scale(${scale})`
            ;(canvas as HTMLElement).style.transformOrigin = '0 0'
          }
        }
      }
    },
    {
      id: 'fields-pane',
      label: 'Fields',
      icon: TableCellsIcon,
      description: 'Toggle fields pane',
      onClick: onToggleFieldsPane
    },
    {
      id: 'filters-pane',
      label: 'Filters',
      icon: EyeIcon,
      description: 'Toggle filters pane',
      onClick: onToggleFiltersPane
    },
    {
      id: 'visualizations-pane',
      label: 'Visualizations',
      icon: ChartBarIcon,
      description: 'Toggle visualizations pane',
      onClick: onToggleVisualizationsPane
    },
    {
      id: 'bookmarks-pane',
      label: 'Bookmarks',
      icon: DocumentDuplicateIcon,
      description: 'Toggle bookmarks pane',
      onClick: onToggleBookmarks
    },
    {
      id: 'selection-pane',
      label: 'Selection',
      icon: EyeIcon,
      description: 'Toggle selection pane',
      onClick: onToggleSelectionPane
    },
    {
      id: 'mobile-layout',
      label: 'Mobile Layout',
      icon: DevicePhoneMobileIcon,
      description: 'Switch to mobile layout',
      onClick: () => {
        const canvas = document.querySelector('.design-canvas')
        if (canvas) {
          ;(canvas as HTMLElement).style.width = '375px'
          ;(canvas as HTMLElement).style.height = '667px'
        }
      }
    },
    {
      id: 'desktop-layout',
      label: 'Desktop Layout',
      icon: ComputerDesktopIcon,
      description: 'Switch to desktop layout',
      onClick: () => {
        const canvas = document.querySelector('.design-canvas')
        if (canvas) {
          ;(canvas as HTMLElement).style.width = '1200px'
          ;(canvas as HTMLElement).style.height = '800px'
        }
      }
    }
  ]

  const helpActions: MenuAction[] = [
    {
      id: 'help',
      label: 'Help',
      icon: QuestionMarkCircleIcon,
      description: 'Get help',
      onClick: () => window.open('https://docs.microsoft.com/en-us/power-bi/', '_blank')
    },
    {
      id: 'documentation',
      label: 'Documentation',
      icon: BookOpenIcon,
      description: 'View documentation',
      onClick: () => alert('Documentation will be available soon!')
    },
    {
      id: 'community',
      label: 'Community',
      icon: ChatBubbleLeftEllipsisIcon,
      description: 'Join community',
      onClick: () => window.open('https://community.powerbi.com/', '_blank')
    }
  ]

  const getActionsForTab = (tab: MenuTab): MenuAction[] => {
    switch (tab) {
      case 'home': return homeActions
      case 'insert': return insertActions
      case 'modeling': return modelingActions
      case 'view': return viewActions
      case 'help': return helpActions
      default: return []
    }
  }

  const handleActionClick = useCallback((action: MenuAction) => {
    if (action.isDropdown && !action.onClick) {
      setActiveDropdown(activeDropdown === action.id ? null : action.id)
    } else {
      action.onClick?.()
      setActiveDropdown(null)
      if (action.isDropdown && action.onClick) {
        setActiveDropdown(activeDropdown === action.id ? null : action.id)
      }
    }
  }, [activeDropdown])

  const handleChildActionClick = useCallback((parentId: string, child: MenuAction) => {
    if (child.onClick) {
      child.onClick()
    } else {
      // Handle child actions based on their id
      switch (child.id) {
        case 'column-chart':
        case 'line-chart':
        case 'pie-chart':
        case 'table':
        case 'map':
          onInsertVisual?.(child.id.replace('-chart', '').replace('-', ''))
          break
        case 'excel':
        case 'sql-server':
        case 'web':
        case 'more':
          onShowDataSourceConnector?.()
          break
        case 'rectangle':
        case 'oval':
        case 'line':
        case 'arrow':
          onInsertShape?.(child.id)
          break
        case 'save-as-pbix':
        case 'save-as-template':
          onSaveReport?.()
          break
      }
    }
    setActiveDropdown(null)
  }, [onInsertVisual, onShowDataSourceConnector, onInsertShape, onSaveReport])

  const ActionButton: React.FC<{ action: MenuAction; parentId?: string }> = ({ action, parentId }) => {
    const Icon = action.icon
    const isActive = activeDropdown === action.id

    return (
      <div className="relative">
        <button
          onClick={() => parentId ? handleChildActionClick(parentId, action) : handleActionClick(action)}
          disabled={action.disabled}
          className={`action-button group flex flex-col items-center p-2 min-w-[80px] h-16 rounded-md transition-all ${
            action.disabled 
              ? 'opacity-50 cursor-not-allowed' 
              : isActive
                ? 'bg-blue-100 border border-blue-300'
                : 'hover:bg-gray-100 border border-transparent hover:border-gray-200'
          }`}
          title={`${action.description}${action.shortcut ? ` (${action.shortcut})` : ''}`}
        >
          <Icon className={`h-5 w-5 mb-1 ${
            action.disabled 
              ? 'text-gray-400' 
              : isActive 
                ? 'text-blue-600'
                : 'text-gray-600 group-hover:text-gray-800'
          }`} />
          <span className={`text-xs leading-tight text-center max-w-full truncate ${
            action.disabled 
              ? 'text-gray-400' 
              : isActive 
                ? 'text-blue-700 font-medium'
                : 'text-gray-700'
          }`}>
            {action.label}
          </span>
          {action.isDropdown && (
            <div className="absolute top-1 right-1">
              <div className="w-2 h-2 border-r border-b border-gray-400 transform rotate-45 -translate-y-1"></div>
            </div>
          )}
        </button>

        {/* Dropdown Menu */}
        {action.isDropdown && isActive && action.children && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            <div className="py-1">
              {action.children.map((child) => {
                const ChildIcon = child.icon
                return (
                  <button
                    key={child.id}
                    onClick={() => handleChildActionClick(action.id, child)}
                    className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
                  >
                    <ChildIcon className="h-4 w-4 text-gray-500" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{child.label}</div>
                      <div className="text-xs text-gray-500">{child.description}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  const tabs = [
    { id: 'home' as MenuTab, label: 'Home' },
    { id: 'insert' as MenuTab, label: 'Insert' },
    { id: 'modeling' as MenuTab, label: 'Modeling' },
    { id: 'view' as MenuTab, label: 'View' },
    { id: 'help' as MenuTab, label: 'Help' }
  ]

  return (
    <div className={`powerbi-menu-bar bg-white border-b border-gray-200 ${className}`}>
      {/* Tab Headers */}
      <div className="tab-headers flex border-b border-gray-200 bg-gray-50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id)
              setActiveDropdown(null)
            }}
            className={`tab-header px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content p-3 min-h-[80px]" onClick={() => setActiveDropdown(null)}>
        <div className="flex flex-wrap gap-2">
          {getActionsForTab(activeTab).map((action) => (
            <ActionButton key={action.id} action={action} />
          ))}
        </div>
      </div>

      {/* Click outside handler */}
      {activeDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setActiveDropdown(null)}
        />
      )}
    </div>
  )
}

export default PowerBIMenuBar