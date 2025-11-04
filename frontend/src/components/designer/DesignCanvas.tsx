/**
 * Design Canvas Component
 * Main design surface with drag-and-drop functionality for visual placement
 */

import React, { useCallback } from 'react'
import { useDrop } from 'react-dnd'
import { clsx } from 'clsx'
import { Visual, ReportPage, VisualType } from '@/types/report'
import VisualComponent from './VisualComponent'

interface DataField {
  name: string
  type: 'string' | 'number' | 'date' | 'boolean'
  table: string
  description?: string
  isCalculated?: boolean
  isMeasure?: boolean
  aggregation?: 'sum' | 'count' | 'avg' | 'min' | 'max'
}

// Suggest appropriate visual type based on field characteristics
const suggestVisualType = (field: DataField): VisualType => {
  if (field.type === 'number' && field.isMeasure) {
    return 'column' // Good for measures
  } else if (field.type === 'date') {
    return 'line' // Good for time series
  } else if (field.type === 'string') {
    return 'pie' // Good for categories
  } else {
    return 'table' // Default fallback
  }
}

interface DesignCanvasProps {
  page: ReportPage
  selectedVisual: Visual | null
  onSelectVisual: (visual: Visual | null) => void
  onUpdateVisual: (visualId: string, updates: Partial<Visual>) => void
  onDeleteVisual: (visualId: string) => void
  onDuplicateVisual: (visual: Visual) => void
  onAddVisual: (type: VisualType, position: { x: number; y: number }, options?: any) => void
  snapToGrid: boolean
  gridSize: number
}

const DesignCanvas: React.FC<DesignCanvasProps> = ({
  page,
  selectedVisual,
  onSelectVisual,
  onUpdateVisual,
  onDeleteVisual,
  onDuplicateVisual,
  onAddVisual,
  snapToGrid,
  gridSize,
}) => {
  const snapPositionToGrid = useCallback((value: number) => {
    if (!snapToGrid) return value
    return Math.round(value / gridSize) * gridSize
  }, [snapToGrid, gridSize])

  const [{ isOver }, drop] = useDrop({
    accept: ['visual-type', 'field', 'shape-type'],
    drop: (item: any, monitor) => {
      const clientOffset = monitor.getClientOffset()
      if (!clientOffset) return

      // Get canvas element directly for accurate positioning
      const canvasElement = document.querySelector('.design-canvas')
      if (!canvasElement) return
      
      const canvasRect = canvasElement.getBoundingClientRect()
      const position = {
        x: snapPositionToGrid(Math.max(0, clientOffset.x - canvasRect.left)),
        y: snapPositionToGrid(Math.max(0, clientOffset.y - canvasRect.top)),
      }

      if (item.type === 'visual-type') {
        onAddVisual(item.visualType, position)
      } else if (item.type === 'shape-type') {
        // Handle shape drop - create shape visual
        onAddVisual('shape' as VisualType, position, { shapeType: item.shapeType })
      } else if (item.field) {
        // Handle field drop - auto-create appropriate visual based on field type
        const visualType = suggestVisualType(item.field)
        onAddVisual(visualType, position)
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  })

  const handleCanvasClick = useCallback((event: React.MouseEvent) => {
    // Only deselect if clicking on empty canvas (not on a visual)
    if (event.target === event.currentTarget) {
      onSelectVisual(null)
    }
  }, [onSelectVisual])

  const handleVisualMove = useCallback((visualId: string, position: { x: number; y: number }) => {
    onUpdateVisual(visualId, {
      position: {
        ...page.visuals.find(v => v.id === visualId)!.position,
        x: snapPositionToGrid(position.x),
        y: snapPositionToGrid(position.y)
      }
    })
  }, [onUpdateVisual, page.visuals, snapPositionToGrid])

  const handleVisualResize = useCallback((visualId: string, size: { width: number; height: number }) => {
    onUpdateVisual(visualId, {
      position: {
        ...page.visuals.find(v => v.id === visualId)!.position,
        ...size
      }
    })
  }, [onUpdateVisual, page.visuals])

  return (
    <div className="w-full h-full overflow-auto bg-gray-50">
      <div
        ref={drop}
        className={clsx(
          'design-canvas canvas relative transition-all duration-200 ease-out',
          isOver 
            ? 'drop-zone drag-over bg-blue-50/50 border-2 border-dashed border-blue-400 shadow-inner' 
            : 'bg-white border border-transparent'
        )}
        onClick={handleCanvasClick}
        style={{
          minWidth: '100%',
          minHeight: '100%',
          width: Math.max(page.width || 1200, window.innerWidth - 140),
          height: Math.max(page.height || 800, window.innerHeight - 200),
          backgroundImage: snapToGrid 
            ? `radial-gradient(circle, #e5e7eb 1px, transparent 1px)`
            : 'none',
          backgroundSize: snapToGrid 
            ? `${gridSize}px ${gridSize}px`
            : 'auto',
          willChange: 'transform' // Optimize for drag operations
        }}
      >
        {/* Grid background is handled by CSS */}
      
      {/* Render all visuals */}
      {page.visuals.map((visual) => (
        <VisualComponent
          key={visual.id}
          visual={visual}
          isSelected={selectedVisual?.id === visual.id}
          onSelect={() => onSelectVisual(visual)}
          onMove={(position) => handleVisualMove(visual.id, position)}
          onResize={(size) => handleVisualResize(visual.id, size)}
          onDelete={() => onDeleteVisual(visual.id)}
          onDuplicate={onDuplicateVisual}
        />
      ))}

      {/* Empty state */}
      {page.visuals.length === 0 && !isOver && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 pointer-events-none">
          <div className="text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-lg font-medium mb-2">Start building your report</h3>
            <p className="text-sm">Drag fields from the data panel or click "Add Visual" to get started</p>
          </div>
        </div>
      )}

      {/* Enhanced drop zone indicator */}
      {isOver && (
        <div className="absolute inset-4 border-2 border-dashed border-blue-400 bg-blue-50/30 rounded-lg pointer-events-none animate-pulse">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white/90 backdrop-blur px-6 py-3 rounded-lg border border-blue-200 shadow-lg">
              <div className="flex items-center space-x-2 text-blue-600 font-medium">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                <span>Drop here to add visual</span>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

export default DesignCanvas