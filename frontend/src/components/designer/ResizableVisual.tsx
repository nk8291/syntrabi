/**
 * Resizable Visual Component
 * Handles visual positioning, resizing, and selection in Power BI Desktop style
 */

import React, { useRef, useState, useCallback } from 'react'
import { useDrag, useDrop } from 'react-dnd'
import { Visual } from '@/types/report'

interface ResizableVisualProps {
  visual: Visual
  isSelected: boolean
  onSelect: (e: React.MouseEvent) => void
  onUpdate: (visualId: string, updates: Partial<Visual>) => void
  onDelete: (visualId: string) => void
  onFieldDrop: (field: any, wellType: string, visualId: string) => void
  children: React.ReactNode
}

const ResizableVisual: React.FC<ResizableVisualProps> = ({
  visual,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onFieldDrop,
  children
}) => {
  const visualRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<string>('')

  // Drag functionality for moving visuals
  const [{ isDragMoving }, dragMove] = useDrag({
    type: 'visual-move',
    item: () => {
      setIsDragging(true)
      return { id: visual.id, type: 'visual-move' }
    },
    end: () => {
      setIsDragging(false)
    },
    collect: (monitor) => ({
      isDragMoving: monitor.isDragging(),
    }),
  })

  // Drop functionality for fields
  const [{ isFieldOver }, dropField] = useDrop({
    accept: 'field',
    drop: (item: any) => {
      onFieldDrop(item, 'values', visual.id)
    },
    collect: (monitor) => ({
      isFieldOver: monitor.isOver(),
    }),
  })

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    
    const target = e.target as HTMLElement
    const handleType = target.dataset.resizeHandle
    
    if (handleType) {
      // Resizing
      setIsResizing(true)
      setResizeHandle(handleType)
      
      const startX = e.clientX
      const startY = e.clientY
      const startWidth = visual.position.width
      const startHeight = visual.position.height
      const startPosX = visual.position.x
      const startPosY = visual.position.y

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX
        const deltaY = moveEvent.clientY - startY

        let newWidth = startWidth
        let newHeight = startHeight
        let newX = startPosX
        let newY = startPosY

        switch (handleType) {
          case 'se': // Southeast
            newWidth = Math.max(150, startWidth + deltaX)
            newHeight = Math.max(100, startHeight + deltaY)
            break
          case 'sw': // Southwest
            newWidth = Math.max(150, startWidth - deltaX)
            newHeight = Math.max(100, startHeight + deltaY)
            newX = startPosX + (startWidth - newWidth)
            break
          case 'ne': // Northeast
            newWidth = Math.max(150, startWidth + deltaX)
            newHeight = Math.max(100, startHeight - deltaY)
            newY = startPosY + (startHeight - newHeight)
            break
          case 'nw': // Northwest
            newWidth = Math.max(150, startWidth - deltaX)
            newHeight = Math.max(100, startHeight - deltaY)
            newX = startPosX + (startWidth - newWidth)
            newY = startPosY + (startHeight - newHeight)
            break
          case 'n': // North
            newHeight = Math.max(100, startHeight - deltaY)
            newY = startPosY + (startHeight - newHeight)
            break
          case 's': // South
            newHeight = Math.max(100, startHeight + deltaY)
            break
          case 'e': // East
            newWidth = Math.max(150, startWidth + deltaX)
            break
          case 'w': // West
            newWidth = Math.max(150, startWidth - deltaX)
            newX = startPosX + (startWidth - newWidth)
            break
        }

        onUpdate(visual.id, {
          position: {
            x: Math.max(0, newX),
            y: Math.max(0, newY),
            width: newWidth,
            height: newHeight
          }
        })
      }

      const handleMouseUp = () => {
        setIsResizing(false)
        setResizeHandle('')
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    } else {
      // Selection
      onSelect(e)
    }
  }, [visual, onSelect, onUpdate])

  // Drag for moving
  const handleDragStart = useCallback((e: React.DragEvent) => {
    const startX = e.clientX - visual.position.x
    const startY = e.clientY - visual.position.y

    const handleDragOver = (dragEvent: DragEvent) => {
      dragEvent.preventDefault()
      const newX = Math.max(0, dragEvent.clientX - startX)
      const newY = Math.max(0, dragEvent.clientY - startY)
      
      onUpdate(visual.id, {
        position: {
          ...visual.position,
          x: newX,
          y: newY
        }
      })
    }

    const handleDragEnd = () => {
      document.removeEventListener('dragover', handleDragOver)
      document.removeEventListener('dragend', handleDragEnd)
    }

    document.addEventListener('dragover', handleDragOver)
    document.addEventListener('dragend', handleDragEnd)
  }, [visual, onUpdate])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (isSelected && e.key === 'Delete') {
      e.preventDefault()
      onDelete(visual.id)
    }
  }, [isSelected, visual.id, onDelete])

  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const resizeHandles = [
    { type: 'nw', className: 'top-0 left-0 cursor-nw-resize' },
    { type: 'n', className: 'top-0 left-1/2 transform -translate-x-1/2 cursor-n-resize' },
    { type: 'ne', className: 'top-0 right-0 cursor-ne-resize' },
    { type: 'e', className: 'top-1/2 right-0 transform -translate-y-1/2 cursor-e-resize' },
    { type: 'se', className: 'bottom-0 right-0 cursor-se-resize' },
    { type: 's', className: 'bottom-0 left-1/2 transform -translate-x-1/2 cursor-s-resize' },
    { type: 'sw', className: 'bottom-0 left-0 cursor-sw-resize' },
    { type: 'w', className: 'top-1/2 left-0 transform -translate-y-1/2 cursor-w-resize' }
  ]

  return (
    <div
      ref={(node) => {
        visualRef.current = node
        dragMove(node)
        dropField(node)
      }}
      className={`absolute select-none ${
        isDragMoving ? 'opacity-50' : ''
      } ${isFieldOver ? 'ring-2 ring-blue-500' : ''}`}
      style={{
        left: visual.position.x,
        top: visual.position.y,
        width: visual.position.width,
        height: visual.position.height,
        zIndex: isSelected ? 10 : 1
      }}
      onMouseDown={handleMouseDown}
      draggable
      onDragStart={handleDragStart}
    >
      {/* Visual Content */}
      <div className="w-full h-full">
        {children}
      </div>

      {/* Selection Border */}
      {isSelected && (
        <div className="absolute inset-0 border-2 border-blue-500 pointer-events-none rounded">
          {/* Resize Handles */}
          {resizeHandles.map((handle) => (
            <div
              key={handle.type}
              data-resize-handle={handle.type}
              className={`absolute w-3 h-3 bg-blue-500 border border-white pointer-events-auto ${handle.className}`}
              style={{ marginTop: '-6px', marginLeft: '-6px' }}
            />
          ))}
          
          {/* Delete Button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(visual.id)
            }}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full hover:bg-red-600 flex items-center justify-center text-xs pointer-events-auto"
            title="Delete visual"
          >
            ✕
          </button>
        </div>
      )}

      {/* Field Drop Indicator */}
      {isFieldOver && (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-20 border-2 border-dashed border-blue-500 rounded pointer-events-none flex items-center justify-center">
          <div className="text-blue-600 font-medium text-sm">
            Drop field here
          </div>
        </div>
      )}
    </div>
  )
}

export default ResizableVisual