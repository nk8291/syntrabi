/**
 * Power BI Canvas Component
 * Replica of Power BI Desktop report canvas with drag-and-drop visual editing
 */

import React, { useRef, useCallback, useState, useEffect } from 'react'
import { useDrop } from 'react-dnd'
import { Visual, ReportPage, VisualType } from '@/types/report'
import EChartsRenderer from '../charts/EChartsRenderer'
import ResizableVisual from './ResizableVisual'
import VisualContextMenu from './VisualContextMenu'

interface PowerBICanvasProps {
  page: ReportPage
  selectedVisual: Visual | null
  onSelectVisual: (visual: Visual | null) => void
  onUpdateVisual: (visualId: string, updates: Partial<Visual>) => void
  onDeleteVisual: (visualId: string) => void
  onAddVisual: (type: VisualType, position?: { x: number, y: number }) => void
  onCopyVisual?: (visual: Visual) => void
  onPasteVisual?: (position: { x: number, y: number }) => void
  onExportVisual?: (visual: Visual, format: 'png' | 'svg' | 'pdf') => void
}

const PowerBICanvas: React.FC<PowerBICanvasProps> = ({
  page,
  selectedVisual,
  onSelectVisual,
  onUpdateVisual,
  onDeleteVisual,
  onAddVisual,
  onCopyVisual,
  onPasteVisual,
  onExportVisual
}) => {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, visual?: Visual } | null>(null)
  const [copiedVisual, setCopiedVisual] = useState<Visual | null>(null)

  // Drop handler for dragging visuals from gallery onto canvas
  const [{ isOver }, drop] = useDrop({
    accept: ['visual', 'field'],
    drop: (item: any, monitor) => {
      if (!monitor.didDrop() && canvasRef.current) {
        const canvasRect = canvasRef.current.getBoundingClientRect()
        const dropPosition = monitor.getClientOffset()
        
        if (dropPosition) {
          const x = dropPosition.x - canvasRect.left
          const y = dropPosition.y - canvasRect.top
          
          if (item.type && item.type !== 'field') {
            // Dropped a visual type
            onAddVisual(item.type, { x: Math.max(0, x - 150), y: Math.max(0, y - 100) })
          }
        }
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
    }),
  })

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    // Only deselect if clicking directly on canvas (not on a visual)
    if (e.target === e.currentTarget) {
      onSelectVisual(null)
    }
  }, [onSelectVisual])

  const handleVisualClick = useCallback((visual: Visual, e: React.MouseEvent) => {
    e.stopPropagation()
    onSelectVisual(visual)
  }, [onSelectVisual])

  const handleVisualUpdate = useCallback((visualId: string, updates: Partial<Visual>) => {
    onUpdateVisual(visualId, updates)
  }, [onUpdateVisual])

  const handleVisualDelete = useCallback((visualId: string) => {
    onDeleteVisual(visualId)
  }, [onDeleteVisual])

  const handleContextMenu = useCallback((e: React.MouseEvent, visual?: Visual) => {
    e.preventDefault()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      visual
    })
  }, [])

  const handleCopyVisual = useCallback((visual: Visual) => {
    setCopiedVisual(visual)
    if (onCopyVisual) {
      onCopyVisual(visual)
    }
    setContextMenu(null)
  }, [onCopyVisual])

  const handlePasteVisual = useCallback((position: { x: number, y: number }) => {
    if (onPasteVisual) {
      onPasteVisual(position)
    }
    setContextMenu(null)
  }, [onPasteVisual])

  const handleExportVisual = useCallback((visual: Visual, format: 'png' | 'svg' | 'pdf') => {
    if (onExportVisual) {
      onExportVisual(visual, format)
    }
    setContextMenu(null)
  }, [onExportVisual])

  const handleDuplicateVisual = useCallback((visual: Visual) => {
    const duplicatedVisual: Visual = {
      ...visual,
      id: `visual-${Date.now()}`,
      position: {
        ...visual.position,
        x: visual.position.x + 20,
        y: visual.position.y + 20
      }
    }
    
    onAddVisual(duplicatedVisual.type, { x: duplicatedVisual.position.x, y: duplicatedVisual.position.y })
    setContextMenu(null)
  }, [onAddVisual])

  // Close context menu on click outside or scroll
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null)
    const handleScroll = () => setContextMenu(null)
    
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside)
      document.addEventListener('scroll', handleScroll, true)
      return () => {
        document.removeEventListener('click', handleClickOutside)
        document.removeEventListener('scroll', handleScroll, true)
      }
    }
  }, [contextMenu])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedVisual) {
        // Copy (Ctrl+C)
        if (e.ctrlKey && e.key === 'c') {
          e.preventDefault()
          handleCopyVisual(selectedVisual)
        }
        // Delete (Delete key)
        if (e.key === 'Delete') {
          e.preventDefault()
          handleVisualDelete(selectedVisual.id)
        }
        // Duplicate (Ctrl+D)
        if (e.ctrlKey && e.key === 'd') {
          e.preventDefault()
          handleDuplicateVisual(selectedVisual)
        }
      }
      // Paste (Ctrl+V)
      if (e.ctrlKey && e.key === 'v' && copiedVisual) {
        e.preventDefault()
        handlePasteVisual({ x: 50, y: 50 })
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedVisual, copiedVisual, handleCopyVisual, handleVisualDelete, handleDuplicateVisual, handlePasteVisual])

  // Generate sample data for demo purposes
  const generateSampleData = (visual: Visual) => {
    const sampleData = [
      { category: 'Product A', value: 100, series: 'Q1' },
      { category: 'Product B', value: 150, series: 'Q1' },
      { category: 'Product C', value: 200, series: 'Q1' },
      { category: 'Product A', value: 120, series: 'Q2' },
      { category: 'Product B', value: 180, series: 'Q2' },
      { category: 'Product C', value: 230, series: 'Q2' },
    ]

    // Filter based on field wells if available
    if (visual.config.fieldWells?.values?.length > 0) {
      return sampleData
    }

    return []
  }

  return (
    <div
      ref={(node) => {
        drop(node)
        if (canvasRef.current !== node) {
          canvasRef.current = node
        }
      }}
      className={`relative w-full h-full bg-white overflow-auto ${
        isOver ? 'bg-blue-50' : ''
      }`}
      onClick={handleCanvasClick}
      onContextMenu={(e) => handleContextMenu(e)}
      style={{
        backgroundImage: `
          radial-gradient(circle, #e5e5e5 1px, transparent 1px)
        `,
        backgroundSize: '20px 20px',
        minHeight: '100%'
      }}
    >
      {/* Canvas Grid Background */}
      <div className="absolute inset-0 pointer-events-none">
        <svg width="100%" height="100%" className="opacity-20">
          <defs>
            <pattern
              id="canvas-grid"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 20 0 L 0 0 0 20"
                fill="none"
                stroke="#ddd"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#canvas-grid)" />
        </svg>
      </div>

      {/* Empty State */}
      {page.visuals.length === 0 && !isOver && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-gray-400">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-lg font-medium mb-2">Start building your report</h3>
            <p className="text-sm mb-4">
              Drag a visualization from the Visualizations panel or<br />
              drag fields here to create your first visual
            </p>
            <div className="text-xs text-gray-500">
              Tip: Select a visualization type first, then drag fields to the field wells
            </div>
          </div>
        </div>
      )}

      {/* Drop Indicator */}
      {isOver && (
        <div className="absolute inset-0 border-2 border-dashed border-blue-500 bg-blue-50 bg-opacity-50 flex items-center justify-center pointer-events-none">
          <div className="text-blue-600 text-center">
            <div className="text-2xl mb-2">📊</div>
            <div className="font-medium">Drop to add visual</div>
          </div>
        </div>
      )}

      {/* Visuals */}
      {page.visuals.map((visual) => (
        <ResizableVisual
          key={visual.id}
          visual={visual}
          isSelected={selectedVisual?.id === visual.id}
          onSelect={(e) => handleVisualClick(visual, e)}
          onUpdate={handleVisualUpdate}
          onDelete={handleVisualDelete}
          onFieldDrop={() => {}} // Handle field drops here if needed
        >
          <div className="w-full h-full bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
            {/* Visual Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 truncate">
                {visual.config.name || `${visual.type.charAt(0).toUpperCase() + visual.type.slice(1)} Chart`}
              </h4>
              <div className="flex items-center space-x-1">
                {/* Visual Actions */}
                <button
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title="More options"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleContextMenu(e, visual)
                  }}
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Visual Content */}
            <div className="flex-1 p-3">
              {visual.config.fieldWells?.values?.length > 0 ? (
                <EChartsRenderer
                  visual={visual}
                  data={generateSampleData(visual)}
                  width={visual.position.width - 24} // Account for padding
                  height={visual.position.height - 70} // Account for header and padding
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-center">
                  <div>
                    <div className="text-4xl mb-2">📊</div>
                    <p className="text-sm">
                      Drag fields here or to the field wells
                    </p>
                    <p className="text-xs mt-1 text-gray-500">
                      Add data to create the visualization
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ResizableVisual>
      ))}

      {/* Context Menu */}
      {contextMenu && (
        <VisualContextMenu
          position={{ x: contextMenu.x, y: contextMenu.y }}
          visual={contextMenu.visual}
          onCopy={contextMenu.visual ? () => handleCopyVisual(contextMenu.visual!) : undefined}
          onPaste={copiedVisual && !contextMenu.visual ? () => handlePasteVisual({ 
            x: contextMenu.x - (canvasRef.current?.getBoundingClientRect().left || 0), 
            y: contextMenu.y - (canvasRef.current?.getBoundingClientRect().top || 0) 
          }) : undefined}
          onDuplicate={contextMenu.visual ? () => handleDuplicateVisual(contextMenu.visual!) : undefined}
          onDelete={contextMenu.visual ? () => handleVisualDelete(contextMenu.visual!.id) : undefined}
          onExportPNG={contextMenu.visual ? () => handleExportVisual(contextMenu.visual!, 'png') : undefined}
          onExportSVG={contextMenu.visual ? () => handleExportVisual(contextMenu.visual!, 'svg') : undefined}
          onExportPDF={contextMenu.visual ? () => handleExportVisual(contextMenu.visual!, 'pdf') : undefined}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}

export default PowerBICanvas