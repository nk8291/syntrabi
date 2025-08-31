/**
 * Field Drop Zone Component
 * Provides field drop areas for binding data to chart roles
 */

import React from 'react'
import { useDrop } from 'react-dnd'
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { FieldRole } from '@/types/report'

interface DataField {
  name: string
  type: 'string' | 'number' | 'date' | 'boolean'
  table: string
  description?: string
  isCalculated?: boolean
  isMeasure?: boolean
  aggregation?: 'sum' | 'count' | 'avg' | 'min' | 'max'
}

interface FieldDropZoneProps {
  role: FieldRole
  label: string
  description: string
  acceptedTypes?: string[]
  currentFields: string[]
  allowMultiple?: boolean
  onFieldDrop: (field: DataField, role: FieldRole) => void
  onFieldRemove: (fieldName: string, role: FieldRole) => void
  className?: string
}

const FieldDropZone: React.FC<FieldDropZoneProps> = ({
  role,
  label,
  description,
  acceptedTypes = [],
  currentFields = [],
  allowMultiple = false,
  onFieldDrop,
  onFieldRemove,
  className = ''
}) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'field',
    drop: (item: { field: DataField }, monitor) => {
      if (monitor.didDrop()) return // Already handled by a nested drop target
      
      // Check if field type is accepted
      if (acceptedTypes.length > 0 && !acceptedTypes.includes(item.field.type)) {
        return
      }

      // If not allowing multiple and already has field, replace it
      if (!allowMultiple && currentFields.length > 0) {
        // Remove existing field first
        onFieldRemove(currentFields[0], role)
      }

      onFieldDrop(item.field, role)
    },
    canDrop: (item: { field: DataField }) => {
      // Don't allow drop if field already exists and not allowing multiple
      if (!allowMultiple && currentFields.includes(item.field.name)) {
        return false
      }

      // Check field type compatibility
      if (acceptedTypes.length > 0 && !acceptedTypes.includes(item.field.type)) {
        return false
      }

      return true
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
  })

  const handleFieldRemove = (fieldName: string) => {
    onFieldRemove(fieldName, role)
  }

  const getRoleIcon = (role: FieldRole) => {
    switch (role) {
      case 'x':
        return '📊'
      case 'y':
        return '📈'
      case 'color':
        return '🎨'
      case 'size':
        return '📏'
      case 'detail':
        return '🔍'
      case 'tooltip':
        return '💭'
      case 'label':
        return '🏷️'
      default:
        return '📊'
    }
  }

  return (
    <div className={`mb-3 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-sm">{getRoleIcon(role)}</span>
          <label className="text-sm font-medium text-gray-700">{label}</label>
        </div>
        {acceptedTypes.length > 0 && (
          <div className="flex space-x-1">
            {acceptedTypes.map(type => (
              <span 
                key={type}
                className="text-xs bg-gray-100 text-gray-600 px-1 rounded"
                title={`Accepts ${type} fields`}
              >
                {type === 'number' ? '#' : type === 'date' ? '📅' : type === 'string' ? 'A' : '✓'}
              </span>
            ))}
          </div>
        )}
      </div>

      <div
        ref={drop}
        className={`
          min-h-[60px] border-2 border-dashed rounded-lg p-3 transition-all duration-200
          ${isOver && canDrop
            ? 'border-primary-400 bg-primary-50'
            : isOver && !canDrop
            ? 'border-red-400 bg-red-50'
            : currentFields.length > 0
            ? 'border-gray-300 bg-gray-50'
            : 'border-gray-200 bg-white hover:border-gray-300'
          }
        `}
      >
        {currentFields.length > 0 ? (
          <div className="space-y-2">
            {currentFields.map((fieldName, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-md px-3 py-2"
              >
                <span className="text-sm text-gray-900 truncate">{fieldName}</span>
                <button
                  onClick={() => handleFieldRemove(fieldName)}
                  className="text-gray-400 hover:text-red-500 p-1 rounded"
                  title="Remove field"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
            {allowMultiple && (
              <div className="flex items-center justify-center py-2 border-2 border-dashed border-gray-200 rounded-md text-gray-400 hover:border-gray-300 hover:text-gray-500 cursor-pointer">
                <PlusIcon className="h-4 w-4 mr-1" />
                <span className="text-xs">Drop another field</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <PlusIcon className="h-5 w-5 text-gray-400 mb-1" />
            <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
          </div>
        )}

        {isOver && !canDrop && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-100 bg-opacity-90 rounded-lg">
            <span className="text-xs text-red-600 font-medium">
              {acceptedTypes.length > 0 ? `Only ${acceptedTypes.join(', ')} fields allowed` : 'Cannot drop here'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default FieldDropZone