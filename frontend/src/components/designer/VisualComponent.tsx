/**
 * Visual Component
 * Individual visualization component with drag, resize, and selection capabilities
 */

import React, { useRef, useState, useEffect, useCallback } from 'react'
import { useDrag } from 'react-dnd'
import { 
  XMarkIcon, 
  Bars3Icon, 
  PencilSquareIcon,
  DocumentDuplicateIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'
import { clsx } from 'clsx'
import { Visual } from '@/types/report'
import EChartsRenderer from '../charts/EChartsRenderer'
import ShapeRenderer from '../charts/ShapeRenderer'
import InteractiveMap from '../charts/InteractiveMap'
import SmallMultiples from '../charts/SmallMultiples'

// Throttle function for smooth drag performance
const throttle = (func: Function, limit: number) => {
  let inThrottle: boolean
  return function(this: any, ...args: any[]) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

interface VisualComponentProps {
  visual: Visual
  isSelected: boolean
  onSelect: () => void
  onMove: (position: { x: number; y: number }) => void
  onResize: (size: { width: number; height: number }) => void
  onDelete: () => void
  onDuplicate?: (visual: Visual) => void
}

const VisualComponent: React.FC<VisualComponentProps> = ({
  visual,
  isSelected,
  onSelect,
  onMove,
  onResize,
  onDelete,
  onDuplicate,
}) => {
  const elementRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const dragThrottled = useRef(throttle((position: { x: number; y: number }) => onMove(position), 16)) // 60fps
  const resizeThrottled = useRef(throttle((size: { width: number; height: number }) => onResize(size), 16))

  const [{ isDraggedFromCanvas }, drag, dragPreview] = useDrag({
    type: 'visual',
    item: () => {
      setIsDragging(true)
      return { id: visual.id, visual }
    },
    end: () => {
      setIsDragging(false)
    },
    collect: (monitor) => ({
      isDraggedFromCanvas: monitor.isDragging(),
    }),
  })

  // Attach drag handle to the header
  drag(elementRef)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as Element).closest('.visual-header')) {
      e.preventDefault()
      e.stopPropagation()
      
      setIsDragging(true)
      onSelect()

      const rect = elementRef.current?.getBoundingClientRect()
      if (!rect) return
      
      const offsetX = e.clientX - rect.left
      const offsetY = e.clientY - rect.top
      setDragOffset({ x: offsetX, y: offsetY })

      const handleMouseMove = (moveEvent: MouseEvent) => {
        // Get canvas element for proper coordinate calculation
        const canvas = document.querySelector('.design-canvas')
        const canvasRect = canvas?.getBoundingClientRect()
        if (!canvasRect) return
        
        const newX = Math.max(0, moveEvent.clientX - canvasRect.left - offsetX)
        const newY = Math.max(0, moveEvent.clientY - canvasRect.top - offsetY)
        
        // Use throttled move for better performance
        dragThrottled.current({ x: newX, y: newY })
      }

      const handleMouseUp = () => {
        setIsDragging(false)
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.style.userSelect = '' // Re-enable text selection
      }
      
      // Disable text selection during drag
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
  }, [onSelect, onMove, visual.position])

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    onSelect()
    setContextMenuPosition({ x: e.clientX, y: e.clientY })
    setShowContextMenu(true)
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect()
  }

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowContextMenu(false)
    }
    
    if (showContextMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showContextMenu])

  const handleDuplicate = () => {
    if (onDuplicate) {
      const duplicatedVisual = {
        ...visual,
        id: `visual-${Date.now()}`,
        position: {
          ...visual.position,
          x: visual.position.x + 20,
          y: visual.position.y + 20,
        }
      }
      onDuplicate(duplicatedVisual)
    }
    setShowContextMenu(false)
  }

  const handleResizeMouseDown = useCallback((e: React.MouseEvent, direction: string) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)

    const startX = e.clientX
    const startY = e.clientY
    const startWidth = visual.position.width
    const startHeight = visual.position.height

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaY = moveEvent.clientY - startY

      let newWidth = startWidth
      let newHeight = startHeight

      if (direction.includes('right')) {
        newWidth = Math.max(120, startWidth + deltaX) // Minimum width for usability
      }
      if (direction.includes('bottom')) {
        newHeight = Math.max(100, startHeight + deltaY) // Minimum height for header + content
      }

      // Use throttled resize for better performance
      resizeThrottled.current({ width: newWidth, height: newHeight })
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = '' // Re-enable text selection
    }

    document.body.style.userSelect = 'none' // Disable text selection during resize
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [visual.position, onResize])

  // Generate sample data for the chart based on visual type
  // Only generate sample data if visual has no data binding configured
  const getSampleData = () => {
    // If visual has data binding fields configured, don't show sample data
    if (visual.data_binding && visual.data_binding.fields && visual.data_binding.fields.length > 0) {
      return []
    }

    switch (visual.type) {
      case 'bar':
      case 'column-chart':
      case 'stacked-column-chart':
      case 'clustered-column-chart':
        return [
          { category: 'Q1', value: 280, series: 'Sales' },
          { category: 'Q2', value: 550, series: 'Sales' },
          { category: 'Q3', value: 430, series: 'Sales' },
          { category: 'Q4', value: 610, series: 'Sales' },
          { category: 'Q1', value: 180, series: 'Marketing' },
          { category: 'Q2', value: 320, series: 'Marketing' },
          { category: 'Q3', value: 290, series: 'Marketing' },
          { category: 'Q4', value: 410, series: 'Marketing' },
        ]
        
      case 'line':
      case 'line-chart':
        return [
          { x: 'Jan', y: 20 },
          { x: 'Feb', y: 35 },
          { x: 'Mar', y: 45 },
          { x: 'Apr', y: 30 },
          { x: 'May', y: 50 },
          { x: 'Jun', y: 65 },
        ]
        
      case 'area':
      case 'area-chart':
        return [
          { x: 'Jan', y: 20 },
          { x: 'Feb', y: 35 },
          { x: 'Mar', y: 45 },
          { x: 'Apr', y: 30 },
          { x: 'May', y: 50 },
        ]
        
      case 'pie':
      case 'pie-chart':
        return [
          { category: 'Desktop', value: 45 },
          { category: 'Mobile', value: 30 },
          { category: 'Tablet', value: 15 },
          { category: 'Other', value: 10 },
        ]
        
      case 'donut-chart':
        return [
          { category: 'North', value: 35 },
          { category: 'South', value: 28 },
          { category: 'East', value: 22 },
          { category: 'West', value: 15 },
        ]
        
      case 'scatter':
      case 'scatter-plot':
        return [
          { x: 10, y: 20, category: 'Product A' },
          { x: 20, y: 35, category: 'Product B' },
          { x: 30, y: 15, category: 'Product C' },
          { x: 40, y: 40, category: 'Product D' },
          { x: 25, y: 30, category: 'Product E' },
        ]
        
      case 'bubble-chart':
        return [
          { x: 10, y: 20, size: 150, category: 'Tech' },
          { x: 20, y: 35, size: 200, category: 'Finance' },
          { x: 30, y: 15, size: 100, category: 'Healthcare' },
          { x: 40, y: 40, size: 250, category: 'Retail' },
        ]
        
      case 'waterfall-chart':
        return [
          { category: 'Starting', value: 100, start: 0, end: 100, type: 'start' },
          { category: 'Q1', value: 20, start: 100, end: 120, type: 'positive' },
          { category: 'Q2', value: -10, start: 120, end: 110, type: 'negative' },
          { category: 'Q3', value: 15, start: 110, end: 125, type: 'positive' },
          { category: 'Ending', value: 125, start: 0, end: 125, type: 'total' },
        ]
        
      case 'funnel-chart':
        return [
          { category: 'Awareness', value: 1000 },
          { category: 'Interest', value: 750 },
          { category: 'Consideration', value: 500 },
          { category: 'Purchase', value: 200 },
          { category: 'Retention', value: 150 },
        ]
        
      case 'map':
      case 'filled-map':
      case 'interactive-map':
        return [
          { location: 'New York', latitude: 40.7128, longitude: -74.0060, value: 850 },
          { location: 'Los Angeles', latitude: 34.0522, longitude: -118.2437, value: 620 },
          { location: 'Chicago', latitude: 41.8781, longitude: -87.6298, value: 430 },
          { location: 'Houston', latitude: 29.7604, longitude: -95.3698, value: 380 },
          { location: 'Miami', latitude: 25.7617, longitude: -80.1918, value: 290 },
        ]

      case 'small-multiples':
        return [
          { category: 'A', quarter: 'Q1', value: 100, region: 'North' },
          { category: 'A', quarter: 'Q2', value: 120, region: 'North' },
          { category: 'A', quarter: 'Q3', value: 110, region: 'North' },
          { category: 'B', quarter: 'Q1', value: 80, region: 'North' },
          { category: 'B', quarter: 'Q2', value: 90, region: 'North' },
          { category: 'B', quarter: 'Q3', value: 95, region: 'North' },
          { category: 'A', quarter: 'Q1', value: 150, region: 'South' },
          { category: 'A', quarter: 'Q2', value: 140, region: 'South' },
          { category: 'A', quarter: 'Q3', value: 160, region: 'South' },
          { category: 'B', quarter: 'Q1', value: 70, region: 'South' },
          { category: 'B', quarter: 'Q2', value: 75, region: 'South' },
          { category: 'B', quarter: 'Q3', value: 85, region: 'South' },
        ]
        
      case 'table':
      case 'matrix':
        return [
          { product: 'Product A', sales: 1200, profit: 240, region: 'North' },
          { product: 'Product B', sales: 800, profit: 160, region: 'South' },
          { product: 'Product C', sales: 1500, profit: 300, region: 'East' },
          { product: 'Product D', sales: 900, profit: 180, region: 'West' },
        ]
        
      case 'gauge':
      case 'kpi':
      case 'card':
        return [{ value: 75, target: 100, label: 'Performance' }]
        
      default:
        return [
          { category: 'Sample A', value: 100 },
          { category: 'Sample B', value: 80 },
          { category: 'Sample C', value: 60 },
        ]
    }
  }

  return (
    <div
      ref={elementRef}
      className={clsx(
        'absolute bg-white rounded-lg border-2 cursor-move',
        // Enhanced transitions and shadows
        'transition-all duration-150 ease-out transform-gpu',
        // Selection states with Power BI-style feedback
        isSelected 
          ? 'border-blue-500 shadow-lg ring-2 ring-blue-200/50 ring-offset-1' 
          : 'border-gray-200 shadow-md hover:border-gray-300 hover:shadow-lg',
        // Dragging states with better visual feedback
        isDraggedFromCanvas && 'opacity-80 shadow-xl scale-105 rotate-1 z-50',
        isDragging && 'shadow-2xl scale-105 z-40 cursor-grabbing',
        // Disable interactions during operations
        (isDragging || isResizing) && 'select-none pointer-events-none',
        // Hover effects for better discoverability
        !isDragging && !isResizing && 'hover:shadow-lg hover:border-gray-300'
      )}
      style={{
        left: visual.position.x,
        top: visual.position.y,
        width: visual.position.width,
        height: visual.position.height,
      }}
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
      onDoubleClick={handleDoubleClick}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
    >
      {/* Visual Header */}
      <div className="visual-header flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <div className="flex items-center space-x-2">
          <Bars3Icon className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">
            {visual.title || `${visual.type.charAt(0).toUpperCase() + visual.type.slice(1)} Chart`}
          </span>
        </div>
        
        {isSelected && (
          <div className="flex items-center space-x-1">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onSelect()
              }}
              title="Edit Properties"
              className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded"
            >
              <Cog6ToothIcon className="h-4 w-4" />
            </button>
            {onDuplicate && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDuplicate()
                }}
                title="Duplicate"
                className="p-1 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded"
              >
                <DocumentDuplicateIcon className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              title="Delete"
              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Visual Content */}
      <div className="p-3 h-full">
        <div className="w-full h-full">
          {visual.type === 'shape' || visual.type === 'text_box' || visual.type === 'button' || visual.type === 'image' ? (
            <ShapeRenderer
              visual={visual}
              width={visual.position.width - 24} // subtract padding
              height={visual.position.height - 80} // subtract header and padding
              isEditable={isSelected}
            />
          ) : visual.type === 'interactive-map' ? (
            <InteractiveMap
              data={getSampleData().map(d => ({
                id: `${d.location || 'location'}-${Math.random()}`,
                latitude: d.latitude || 0,
                longitude: d.longitude || 0,
                value: d.value,
                label: d.location,
                category: 'Sample Data'
              }))}
              width={visual.position.width - 24}
              height={visual.position.height - 80}
              config={{
                center: [39.8283, -98.5795], // Center of US
                zoom: 4,
                showLegend: true
              }}
              onMarkerClick={(point) => {
                console.log('Marker clicked:', point)
              }}
            />
          ) : visual.type === 'small-multiples' ? (
            <SmallMultiples
              visual={{
                ...visual,
                type: 'column-chart' // Use column chart as base for small multiples
              }}
              data={getSampleData()}
              config={{
                id: `sm_${visual.id}`,
                name: 'Sample Small Multiples',
                splitBy: 'region',
                columns: 2,
                maxRows: 2,
                showTitle: true
              }}
              width={visual.position.width - 24}
              height={visual.position.height - 80}
              onChartClick={(key, data) => {
                console.log('Small multiple clicked:', key, data)
              }}
            />
          ) : (
            <EChartsRenderer
              visual={visual}
              data={getSampleData()}
              width={visual.position.width - 24} // subtract padding
              height={visual.position.height - 80} // subtract header and padding
            />
          )}
        </div>
      </div>

      {/* Resize Handles - Power BI Style */}
      {isSelected && !isDraggedFromCanvas && (
        <>
          {/* Corner resize handles */}
          <div
            className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 border-2 border-white rounded cursor-se-resize hover:bg-blue-600 transition-colors shadow-sm"
            onMouseDown={(e) => handleResizeMouseDown(e, 'bottom-right')}
          />
          
          {/* Edge resize handles */}
          <div
            className="absolute top-6 -right-1 bottom-6 w-2 cursor-e-resize group"
            onMouseDown={(e) => handleResizeMouseDown(e, 'right')}
          >
            <div className="w-full h-full bg-blue-500/0 hover:bg-blue-500/30 rounded transition-colors" />
          </div>
          
          <div
            className="absolute -bottom-1 left-6 right-6 h-2 cursor-s-resize group"
            onMouseDown={(e) => handleResizeMouseDown(e, 'bottom')}
          >
            <div className="w-full h-full bg-blue-500/0 hover:bg-blue-500/30 rounded transition-colors" />
          </div>
          
          {/* Corner dots for better visibility */}
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 border border-white rounded-full" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 border border-white rounded-full" />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-500 border border-white rounded-full" />
        </>
      )}

      {/* Selection indicators */}
      {isSelected && (
        <div className="absolute -inset-1 border border-primary-500 rounded-lg pointer-events-none" />
      )}

      {/* Context Menu */}
      {showContextMenu && (
        <div
          className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 min-w-48"
          style={{
            left: contextMenuPosition.x,
            top: contextMenuPosition.y,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              onSelect()
              setShowContextMenu(false)
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center space-x-2"
          >
            <Cog6ToothIcon className="h-4 w-4 text-gray-500" />
            <span className="text-sm">Edit Properties</span>
          </button>
          
          {onDuplicate && (
            <button
              onClick={handleDuplicate}
              className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center space-x-2"
            >
              <DocumentDuplicateIcon className="h-4 w-4 text-gray-500" />
              <span className="text-sm">Duplicate</span>
            </button>
          )}
          
          <hr className="my-1 border-gray-100" />
          
          <button
            onClick={() => {
              onDelete()
              setShowContextMenu(false)
            }}
            className="w-full text-left px-4 py-2 hover:bg-red-50 flex items-center space-x-2 text-red-600"
          >
            <XMarkIcon className="h-4 w-4" />
            <span className="text-sm">Delete</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default VisualComponent