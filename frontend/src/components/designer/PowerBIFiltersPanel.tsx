/**
 * Power BI Filters Panel
 * Replica of Power BI Desktop Filters panel with visual, page, and report level filters
 */

import React, { useState } from 'react'
import { useDrop } from 'react-dnd'
import {
  FunnelIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline'
import { Visual, ReportPage } from '@/types/report'

interface PowerBIFiltersPanelProps {
  workspaceId: string
  currentPage: ReportPage
  selectedVisual: Visual | null
}

interface Filter {
  id: string
  fieldName: string
  fieldType: string
  filterType: 'basic' | 'advanced' | 'top_n'
  level: 'visual' | 'page' | 'report'
  condition: any
  isExpanded: boolean
}

const PowerBIFiltersPanel: React.FC<PowerBIFiltersPanelProps> = ({
  workspaceId,
  currentPage,
  selectedVisual
}) => {
  const [filters, setFilters] = useState<Filter[]>([])
  const [activeFilterLevel, setActiveFilterLevel] = useState<'visual' | 'page' | 'report'>('visual')

  const filterLevels = [
    {
      key: 'visual' as const,
      label: 'Visual level filters',
      icon: '📊',
      description: 'Filters that apply to the selected visual'
    },
    {
      key: 'page' as const,
      label: 'Page level filters',
      icon: '📄',
      description: 'Filters that apply to all visuals on this page'
    },
    {
      key: 'report' as const,
      label: 'Report level filters',
      icon: '📑',
      description: 'Filters that apply to the entire report'
    }
  ]

  const addFilter = (field: any, level: 'visual' | 'page' | 'report') => {
    const newFilter: Filter = {
      id: `filter-${Date.now()}`,
      fieldName: field.name,
      fieldType: field.type,
      filterType: 'basic',
      level,
      condition: getDefaultCondition(field.type),
      isExpanded: true
    }

    setFilters(prev => [...prev, newFilter])
  }

  const getDefaultCondition = (fieldType: string) => {
    switch (fieldType.toLowerCase()) {
      case 'number':
      case 'integer':
      case 'float':
      case 'decimal':
        return {
          operator: 'is_greater_than',
          value: 0
        }
      case 'text':
      case 'string':
        return {
          operator: 'contains',
          value: ''
        }
      case 'date':
      case 'datetime':
      case 'timestamp':
        return {
          operator: 'is_after',
          value: new Date().toISOString().split('T')[0]
        }
      case 'boolean':
        return {
          operator: 'is',
          value: true
        }
      default:
        return {
          operator: 'is_not_blank',
          value: null
        }
    }
  }

  const removeFilter = (filterId: string) => {
    setFilters(prev => prev.filter(f => f.id !== filterId))
  }

  const updateFilter = (filterId: string, updates: Partial<Filter>) => {
    setFilters(prev => prev.map(filter => 
      filter.id === filterId ? { ...filter, ...updates } : filter
    ))
  }

  const toggleFilterExpansion = (filterId: string) => {
    updateFilter(filterId, { isExpanded: !filters.find(f => f.id === filterId)?.isExpanded })
  }

  const getFiltersForLevel = (level: 'visual' | 'page' | 'report') => {
    return filters.filter(f => f.level === level)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filter Levels */}
      <div className="p-3">
        {filterLevels.map((level) => (
          <FilterLevel
            key={level.key}
            level={level}
            isActive={activeFilterLevel === level.key}
            isDisabled={level.key === 'visual' && !selectedVisual}
            filters={getFiltersForLevel(level.key)}
            onSetActive={() => setActiveFilterLevel(level.key)}
            onAddFilter={(field) => addFilter(field, level.key)}
            onRemoveFilter={removeFilter}
            onUpdateFilter={updateFilter}
            onToggleExpansion={toggleFilterExpansion}
          />
        ))}
      </div>

      {/* Empty State */}
      {getFiltersForLevel(activeFilterLevel).length === 0 && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center text-gray-500">
            <FunnelIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-sm font-medium mb-2">No filters applied</h3>
            <p className="text-xs mb-4">
              Drag fields here to filter {activeFilterLevel === 'visual' ? 'this visual' : 
                activeFilterLevel === 'page' ? 'this page' : 'the entire report'}
            </p>
            {activeFilterLevel === 'visual' && !selectedVisual && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                Select a visual to add visual-level filters
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Filter Level Component
const FilterLevel: React.FC<{
  level: { key: 'visual' | 'page' | 'report', label: string, icon: string, description: string }
  isActive: boolean
  isDisabled: boolean
  filters: Filter[]
  onSetActive: () => void
  onAddFilter: (field: any) => void
  onRemoveFilter: (filterId: string) => void
  onUpdateFilter: (filterId: string, updates: Partial<Filter>) => void
  onToggleExpansion: (filterId: string) => void
}> = ({
  level,
  isActive,
  isDisabled,
  filters,
  onSetActive,
  onAddFilter,
  onRemoveFilter,
  onUpdateFilter,
  onToggleExpansion
}) => {
  const [{ isOver }, drop] = useDrop({
    accept: 'field',
    drop: (item: any) => {
      onAddFilter(item)
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
    canDrop: () => !isDisabled
  })

  return (
    <div className={`mb-4 ${isDisabled ? 'opacity-50' : ''}`}>
      {/* Header */}
      <button
        onClick={onSetActive}
        disabled={isDisabled}
        className={`w-full flex items-center justify-between p-2 text-left rounded text-sm transition-colors ${
          isActive 
            ? 'bg-blue-100 text-blue-800 border border-blue-200' 
            : 'hover:bg-gray-100 text-gray-700'
        }`}
      >
        <div className="flex items-center">
          <span className="mr-2">{level.icon}</span>
          <div>
            <div className="font-medium">{level.label}</div>
            {filters.length > 0 && (
              <div className="text-xs text-gray-500">
                {filters.length} filter{filters.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
        {isActive ? (
          <ChevronDownIcon className="h-4 w-4" />
        ) : (
          <ChevronRightIcon className="h-4 w-4" />
        )}
      </button>

      {/* Content */}
      {isActive && (
        <div className="mt-2">
          {/* Drop Zone */}
          <div
            ref={drop}
            className={`border-2 border-dashed rounded-lg p-4 mb-3 transition-colors ${
              isOver 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="text-center text-gray-500">
              <FunnelIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-xs">
                Drop fields here to add {level.key} filters
              </p>
            </div>
          </div>

          {/* Existing Filters */}
          <div className="space-y-2">
            {filters.map((filter) => (
              <FilterItem
                key={filter.id}
                filter={filter}
                onRemove={onRemoveFilter}
                onUpdate={onUpdateFilter}
                onToggleExpansion={onToggleExpansion}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Individual Filter Item
const FilterItem: React.FC<{
  filter: Filter
  onRemove: (filterId: string) => void
  onUpdate: (filterId: string, updates: Partial<Filter>) => void
  onToggleExpansion: (filterId: string) => void
}> = ({ filter, onRemove, onUpdate, onToggleExpansion }) => {
  const getOperatorOptions = (fieldType: string) => {
    switch (fieldType.toLowerCase()) {
      case 'number':
      case 'integer':
      case 'float':
      case 'decimal':
        return [
          { value: 'is', label: 'is' },
          { value: 'is_not', label: 'is not' },
          { value: 'is_greater_than', label: 'is greater than' },
          { value: 'is_greater_than_or_equal', label: 'is greater than or equal to' },
          { value: 'is_less_than', label: 'is less than' },
          { value: 'is_less_than_or_equal', label: 'is less than or equal to' },
          { value: 'is_between', label: 'is between' }
        ]
      case 'text':
      case 'string':
        return [
          { value: 'is', label: 'is' },
          { value: 'is_not', label: 'is not' },
          { value: 'contains', label: 'contains' },
          { value: 'does_not_contain', label: 'does not contain' },
          { value: 'starts_with', label: 'starts with' },
          { value: 'ends_with', label: 'ends with' },
          { value: 'is_blank', label: 'is blank' },
          { value: 'is_not_blank', label: 'is not blank' }
        ]
      case 'date':
      case 'datetime':
      case 'timestamp':
        return [
          { value: 'is', label: 'is' },
          { value: 'is_not', label: 'is not' },
          { value: 'is_after', label: 'is after' },
          { value: 'is_on_or_after', label: 'is on or after' },
          { value: 'is_before', label: 'is before' },
          { value: 'is_on_or_before', label: 'is on or before' },
          { value: 'is_between', label: 'is between' }
        ]
      case 'boolean':
        return [
          { value: 'is', label: 'is' },
          { value: 'is_not', label: 'is not' }
        ]
      default:
        return [
          { value: 'is_blank', label: 'is blank' },
          { value: 'is_not_blank', label: 'is not blank' }
        ]
    }
  }

  const operatorOptions = getOperatorOptions(filter.fieldType)

  return (
    <div className="border border-gray-200 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-gray-50">
        <div className="flex items-center">
          <button
            onClick={() => onToggleExpansion(filter.id)}
            className="mr-2"
          >
            {filter.isExpanded ? (
              <ChevronDownIcon className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRightIcon className="h-4 w-4 text-gray-500" />
            )}
          </button>
          <span className="text-sm font-medium text-gray-700">
            {filter.fieldName}
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onUpdate(filter.id, { 
              filterType: filter.filterType === 'basic' ? 'advanced' : 'basic' 
            })}
            className="p-1 text-gray-400 hover:text-gray-600"
            title="Switch filter type"
          >
            <AdjustmentsHorizontalIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => onRemove(filter.id)}
            className="p-1 text-gray-400 hover:text-red-600"
            title="Remove filter"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {filter.isExpanded && (
        <div className="p-3 border-t border-gray-200">
          <div className="space-y-3">
            {/* Filter Type */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Filter type
              </label>
              <select
                value={filter.filterType}
                onChange={(e) => onUpdate(filter.id, { 
                  filterType: e.target.value as 'basic' | 'advanced' | 'top_n' 
                })}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
              >
                <option value="basic">Basic filtering</option>
                <option value="advanced">Advanced filtering</option>
                <option value="top_n">Top N</option>
              </select>
            </div>

            {/* Condition */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Show items when the value
              </label>
              <div className="flex space-x-2">
                <select
                  value={filter.condition.operator}
                  onChange={(e) => onUpdate(filter.id, {
                    condition: { ...filter.condition, operator: e.target.value }
                  })}
                  className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                >
                  {operatorOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                
                {!['is_blank', 'is_not_blank'].includes(filter.condition.operator) && (
                  <input
                    type={filter.fieldType === 'number' ? 'number' : 
                          filter.fieldType === 'date' ? 'date' : 'text'}
                    value={filter.condition.value || ''}
                    onChange={(e) => onUpdate(filter.id, {
                      condition: { ...filter.condition, value: e.target.value }
                    })}
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                    placeholder="Enter value..."
                  />
                )}
              </div>
            </div>

            {/* Apply Button */}
            <div className="flex justify-end">
              <button className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">
                Apply filter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PowerBIFiltersPanel