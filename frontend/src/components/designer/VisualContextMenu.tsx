/**
 * Visual Context Menu Component
 * Right-click context menu for Power BI visuals with copy/paste/export/duplicate options
 */

import React from 'react'
import {
  DocumentDuplicateIcon,
  ClipboardDocumentIcon,
  ClipboardIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  PhotoIcon,
  DocumentTextIcon,
  PresentationChartLineIcon,
  ArrowsPointingOutIcon,
  ChatBubbleLeftIcon,
  EyeIcon,
  ShareIcon,
  CameraIcon
} from '@heroicons/react/24/outline'
import { Visual } from '@/types/report'

interface VisualContextMenuProps {
  position: { x: number, y: number }
  visual?: Visual
  onCopy?: () => void
  onPaste?: () => void
  onDuplicate?: () => void
  onDelete?: () => void
  onExportPNG?: () => void
  onExportSVG?: () => void
  onExportPDF?: () => void
  onFocusMode?: () => void
  onAddComment?: () => void
  onShare?: () => void
  onClose: () => void
}

const VisualContextMenu: React.FC<VisualContextMenuProps> = ({
  position,
  visual,
  onCopy,
  onPaste,
  onDuplicate,
  onDelete,
  onExportPNG,
  onExportSVG,
  onExportPDF,
  onFocusMode,
  onAddComment,
  onShare,
  onClose
}) => {
  const menuItems = []

  // Visual-specific actions
  if (visual) {
    menuItems.push(
      {
        label: 'Focus mode',
        icon: ArrowsPointingOutIcon,
        onClick: onFocusMode,
        shortcut: 'Shift+F'
      },
      {
        label: 'Show data',
        icon: DocumentTextIcon,
        onClick: () => {
          alert(`Data for ${visual.type} chart:\nThis would show the underlying data in a table format.`)
          onClose()
        }
      },
      { type: 'separator' },
      {
        label: 'Download image',
        icon: CameraIcon,
        submenu: [
          {
            label: 'PNG',
            onClick: () => {
              onExportPNG?.()
              alert('Visual exported as PNG')
              onClose()
            }
          },
          {
            label: 'JPEG',
            onClick: () => {
              alert('Visual exported as JPEG')
              onClose()
            }
          },
          {
            label: 'SVG',
            onClick: () => {
              onExportSVG?.()
              alert('Visual exported as SVG')
              onClose()
            }
          }
        ]
      },
      {
        label: 'Download chart data',
        icon: ArrowDownTrayIcon,
        submenu: [
          {
            label: 'Excel (.xlsx)',
            onClick: () => {
              alert('Chart data exported to Excel')
              onClose()
            }
          },
          {
            label: 'CSV (.csv)',
            onClick: () => {
              alert('Chart data exported to CSV')
              onClose()
            }
          }
        ]
      },
      { type: 'separator' },
      {
        label: 'Add comment',
        icon: ChatBubbleLeftIcon,
        onClick: () => {
          const comment = prompt('Add a comment to this visual:')
          if (comment) {
            alert(`Comment added: "${comment}"`)
          }
          onClose()
        }
      },
      {
        label: 'Share',
        icon: ShareIcon,
        onClick: () => {
          alert('Share options:\n- Copy link\n- Email\n- Embed code\n- Export to PowerPoint')
          onClose()
        }
      },
      { type: 'separator' },
      {
        label: 'Copy visual',
        icon: ClipboardDocumentIcon,
        onClick: onCopy,
        shortcut: 'Ctrl+C'
      },
      {
        label: 'Duplicate visual',
        icon: DocumentDuplicateIcon,
        onClick: onDuplicate,
        shortcut: 'Ctrl+D'
      },
      { type: 'separator' },
      {
        label: 'Remove',
        icon: TrashIcon,
        onClick: onDelete,
        shortcut: 'Del',
        danger: true
      }
    )
  } else {
    // Canvas-specific actions
    if (onPaste) {
      menuItems.push({
        label: 'Paste',
        icon: ClipboardIcon,
        onClick: onPaste,
        shortcut: 'Ctrl+V'
      })
    }
  }

  const handleMenuItemClick = (onClick?: () => void) => {
    if (onClick) {
      onClick()
    } else {
      onClose()
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      
      {/* Menu */}
      <div 
        className="fixed z-50 min-w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1"
        style={{
          left: Math.min(position.x, window.innerWidth - 200),
          top: Math.min(position.y, window.innerHeight - (menuItems.length * 35) - 20),
        }}
      >
        {menuItems.map((item, index) => {
          if (item.type === 'separator') {
            return <div key={index} className="border-t border-gray-200 my-1" />
          }

          if (item.submenu) {
            return (
              <div key={index} className="group relative">
                <button
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                  onClick={(e) => e.preventDefault()}
                >
                  <div className="flex items-center">
                    {item.icon && <item.icon className="h-4 w-4 mr-3 text-gray-500" />}
                    {item.label}
                  </div>
                  <svg className="h-3 w-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {/* Submenu */}
                <div className="hidden group-hover:block absolute left-full top-0 ml-1 min-w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                  {item.submenu.map((subItem, subIndex) => (
                    <button
                      key={subIndex}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => handleMenuItemClick(subItem.onClick)}
                    >
                      {subItem.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          }

          return (
            <button
              key={index}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center justify-between ${
                item.danger ? 'text-red-600' : 'text-gray-700'
              }`}
              onClick={() => handleMenuItemClick(item.onClick)}
            >
              <div className="flex items-center">
                {item.icon && (
                  <item.icon className={`h-4 w-4 mr-3 ${
                    item.danger ? 'text-red-500' : 'text-gray-500'
                  }`} />
                )}
                {item.label}
              </div>
              {item.shortcut && (
                <span className="text-xs text-gray-400 ml-4">{item.shortcut}</span>
              )}
            </button>
          )
        })}
      </div>
    </>
  )
}

export default VisualContextMenu