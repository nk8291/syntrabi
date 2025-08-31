/**
 * Chart Context Menu Component
 * Context menu for chart operations like download, focus mode, export
 */

import React from 'react'
import {
  ArrowDownTrayIcon,
  ArrowsPointingOutIcon,
  PhotoIcon,
  DocumentTextIcon,
  PresentationChartBarIcon,
  EyeIcon,
  PrinterIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline'
import { Visual } from '@/types/report'

interface ChartContextMenuProps {
  visual: Visual
  position: { x: number; y: number }
  onClose: () => void
  onDownloadData?: (visual: Visual, format: 'csv' | 'xlsx' | 'json') => void
  onExportImage?: (visual: Visual, format: 'png' | 'svg' | 'pdf') => void
  onFocusMode?: (visual: Visual) => void
  onFullscreen?: (visual: Visual) => void
  onCopyToClipboard?: (visual: Visual) => void
  onPrint?: (visual: Visual) => void
}

const ChartContextMenu: React.FC<ChartContextMenuProps> = ({
  visual,
  position,
  onClose,
  onDownloadData,
  onExportImage,
  onFocusMode,
  onFullscreen,
  onCopyToClipboard,
  onPrint,
}) => {
  const handleMenuClick = (action: () => void) => {
    action()
    onClose()
  }

  return (
    <>
      {/* Backdrop to close menu when clicking outside */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      
      {/* Context Menu */}
      <div
        className="fixed bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 min-w-48"
        style={{
          left: Math.min(position.x, window.innerWidth - 200),
          top: Math.min(position.y, window.innerHeight - 300),
        }}
      >
        {/* View Options */}
        <div className="px-2 pb-2">
          <div className="text-xs font-medium text-gray-500 px-3 py-1">View</div>
          
          {onFocusMode && (
            <button
              onClick={() => handleMenuClick(() => onFocusMode(visual))}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center space-x-3 text-sm"
            >
              <EyeIcon className="h-4 w-4 text-gray-500" />
              <span>Focus mode</span>
            </button>
          )}
          
          {onFullscreen && (
            <button
              onClick={() => handleMenuClick(() => onFullscreen(visual))}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center space-x-3 text-sm"
            >
              <ArrowsPointingOutIcon className="h-4 w-4 text-gray-500" />
              <span>Fullscreen</span>
            </button>
          )}
        </div>

        <hr className="my-1 border-gray-100" />

        {/* Export Options */}
        <div className="px-2 py-2">
          <div className="text-xs font-medium text-gray-500 px-3 py-1">Export</div>
          
          {onExportImage && (
            <>
              <button
                onClick={() => handleMenuClick(() => onExportImage(visual, 'png'))}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center space-x-3 text-sm"
              >
                <PhotoIcon className="h-4 w-4 text-gray-500" />
                <span>Export as PNG</span>
              </button>
              
              <button
                onClick={() => handleMenuClick(() => onExportImage(visual, 'svg'))}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center space-x-3 text-sm"
              >
                <PresentationChartBarIcon className="h-4 w-4 text-gray-500" />
                <span>Export as SVG</span>
              </button>
              
              <button
                onClick={() => handleMenuClick(() => onExportImage(visual, 'pdf'))}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center space-x-3 text-sm"
              >
                <DocumentTextIcon className="h-4 w-4 text-gray-500" />
                <span>Export as PDF</span>
              </button>
            </>
          )}
          
          {onDownloadData && (
            <>
              <hr className="my-1 border-gray-100" />
              <button
                onClick={() => handleMenuClick(() => onDownloadData(visual, 'csv'))}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center space-x-3 text-sm"
              >
                <ArrowDownTrayIcon className="h-4 w-4 text-gray-500" />
                <span>Download data (CSV)</span>
              </button>
              
              <button
                onClick={() => handleMenuClick(() => onDownloadData(visual, 'xlsx'))}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center space-x-3 text-sm"
              >
                <ArrowDownTrayIcon className="h-4 w-4 text-gray-500" />
                <span>Download data (Excel)</span>
              </button>
            </>
          )}
        </div>

        <hr className="my-1 border-gray-100" />

        {/* Action Options */}
        <div className="px-2 pt-2">
          <div className="text-xs font-medium text-gray-500 px-3 py-1">Actions</div>
          
          {onCopyToClipboard && (
            <button
              onClick={() => handleMenuClick(() => onCopyToClipboard(visual))}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center space-x-3 text-sm"
            >
              <ClipboardDocumentIcon className="h-4 w-4 text-gray-500" />
              <span>Copy to clipboard</span>
            </button>
          )}
          
          {onPrint && (
            <button
              onClick={() => handleMenuClick(() => onPrint(visual))}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center space-x-3 text-sm"
            >
              <PrinterIcon className="h-4 w-4 text-gray-500" />
              <span>Print</span>
            </button>
          )}
        </div>
      </div>
    </>
  )
}

export default ChartContextMenu