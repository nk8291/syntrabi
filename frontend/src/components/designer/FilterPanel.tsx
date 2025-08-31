/**
 * Filter Panel Component
 * Comprehensive filtering system like Power BI Desktop
 * Provides report-level, page-level, and visual-level filters
 */

import React, { useState } from 'react'
import {
  FunnelIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  XMarkIcon,
  CalendarIcon,
  HashtagIcon,
  DocumentTextIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline'
import { Visual, ReportPage } from '@/types/report'

interface FilterPanelProps {
  workspaceId: string
  currentPage: ReportPage
  selectedVisual: Visual | null
  onFilterChange: (filterId: string, filterConfig: any) => void
}

interface Filter {
  id: string
  name: string
  field: string
  type: 'text' | 'number' | 'date' | 'boolean' | 'list'
  level: 'report' | 'page' | 'visual'
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater' | 'less' | 'between' | 'in' | 'not_in' | 'is_null' | 'is_not_null'
  value: any
  enabled: boolean
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  workspaceId,
  currentPage,
  selectedVisual,
  onFilterChange
}) => {
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    reportFilters: true,
    pageFilters: true,
    visualFilters: selectedVisual ? true : false,
  })

  const [filters, setFilters] = useState<Filter[]>([
    {
      id: 'filter-1',
      name: 'Date Range',
      field: 'date',
      type: 'date',
      level: 'report',
      operator: 'between',
      value: { start: '', end: '' },
      enabled: true
    },
    {
      id: 'filter-2',
      name: 'Category',
      field: 'category',
      type: 'list',
      level: 'page',
      operator: 'in',
      value: ['Technology', 'Sales', 'Marketing'],
      enabled: true
    }
  ])

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const addFilter = (level: 'report' | 'page' | 'visual') => {
    const newFilter: Filter = {
      id: `filter-${Date.now()}`,
      name: 'New Filter',
      field: '',
      type: 'text',
      level,
      operator: 'equals',
      value: '',
      enabled: true
    }
    setFilters(prev => [...prev, newFilter])
  }

  const updateFilter = (filterId: string, updates: Partial<Filter>) => {
    setFilters(prev =>
      prev.map(filter =>
        filter.id === filterId ? { ...filter, ...updates } : filter
      )
    )
    onFilterChange(filterId, updates)
  }

  const removeFilter = (filterId: string) => {
    setFilters(prev => prev.filter(filter => filter.id !== filterId))
  }

  const getFiltersByLevel = (level: 'report' | 'page' | 'visual') => {
    return filters.filter(filter => filter.level === level)
  }

  const renderFilterOperatorSelect = (filter: Filter) => {
    const operators = {
      text: [
        { value: 'equals', label: 'Equals' },
        { value: 'not_equals', label: 'Does not equal' },
        { value: 'contains', label: 'Contains' },
        { value: 'not_contains', label: 'Does not contain' },
        { value: 'is_null', label: 'Is blank' },
        { value: 'is_not_null', label: 'Is not blank' }
      ],
      number: [
        { value: 'equals', label: 'Equals' },
        { value: 'not_equals', label: 'Does not equal' },
        { value: 'greater', label: 'Greater than' },
        { value: 'less', label: 'Less than' },
        { value: 'between', label: 'Between' },
        { value: 'is_null', label: 'Is blank' },
        { value: 'is_not_null', label: 'Is not blank' }
      ],
      date: [
        { value: 'equals', label: 'Is' },
        { value: 'not_equals', label: 'Is not' },
        { value: 'greater', label: 'Is after' },
        { value: 'less', label: 'Is before' },
        { value: 'between', label: 'Is between' }
      ],
      list: [
        { value: 'in', label: 'Is in' },
        { value: 'not_in', label: 'Is not in' }
      ],
      boolean: [
        { value: 'equals', label: 'Is' }
      ]
    }

    const availableOperators = operators[filter.type] || operators.text

    return (
      <select
        value={filter.operator}
        onChange={(e) => updateFilter(filter.id, { operator: e.target.value as any })}
        className="input text-xs"
      >
        {availableOperators.map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </select>
    )
  }

  const renderFilterValue = (filter: Filter) => {
    switch (filter.type) {
      case 'text':
        return (
          <input
            type="text"
            value={filter.value || ''}
            onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
            placeholder="Enter value"
            className="input text-xs"
          />
        )
      
      case 'number':
        if (filter.operator === 'between') {
          return (
            <div className="flex space-x-2">
              <input
                type="number"
                value={filter.value?.min || ''}
                onChange={(e) => updateFilter(filter.id, { 
                  value: { ...filter.value, min: parseFloat(e.target.value) || 0 } 
                })}
                placeholder="Min"
                className="input text-xs flex-1"
              />
              <input
                type="number"
                value={filter.value?.max || ''}
                onChange={(e) => updateFilter(filter.id, { 
                  value: { ...filter.value, max: parseFloat(e.target.value) || 0 } 
                })}
                placeholder="Max"
                className="input text-xs flex-1"
              />
            </div>
          )
        }
        return (
          <input
            type="number"
            value={filter.value || ''}
            onChange={(e) => updateFilter(filter.id, { value: parseFloat(e.target.value) || 0 })}
            placeholder="Enter number"
            className="input text-xs"
          />
        )
      
      case 'date':
        if (filter.operator === 'between') {
          return (
            <div className="flex space-x-2">
              <input
                type="date"
                value={filter.value?.start || ''}
                onChange={(e) => updateFilter(filter.id, { 
                  value: { ...filter.value, start: e.target.value } 
                })}
                className="input text-xs flex-1"
              />
              <input
                type="date"
                value={filter.value?.end || ''}
                onChange={(e) => updateFilter(filter.id, { 
                  value: { ...filter.value, end: e.target.value } 
                })}
                className="input text-xs flex-1"
              />
            </div>
          )
        }
        return (
          <input
            type="date"
            value={filter.value || ''}
            onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
            className="input text-xs"
          />
        )
      
      case 'boolean':
        return (
          <select
            value={filter.value ? 'true' : 'false'}
            onChange={(e) => updateFilter(filter.id, { value: e.target.value === 'true' })}
            className="input text-xs"
          >
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        )
      
      case 'list':
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1">
              {(Array.isArray(filter.value) ? filter.value : []).map((item: string, index: number) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary-100 text-primary-800 dark:bg-primary-900/20 dark:text-primary-300"
                >
                  {item}
                  <button
                    onClick={() => {
                      const newValue = filter.value.filter((_: any, i: number) => i !== index)
                      updateFilter(filter.id, { value: newValue })
                    }}
                    className="ml-1 text-primary-600 hover:text-primary-800 dark:text-primary-400"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder="Add value and press Enter"
              className="input text-xs"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  const newValue = [...(filter.value || []), e.currentTarget.value.trim()]
                  updateFilter(filter.id, { value: newValue })
                  e.currentTarget.value = ''
                }
              }}
            />
          </div>
        )
      
      default:
        return null
    }
  }

  const FilterSection = ({ title, level, icon }: { title: string, level: 'report' | 'page' | 'visual', icon: React.ReactNode }) => {
    const sectionKey = `${level}Filters`
    const isExpanded = expandedSections[sectionKey]
    const levelFilters = getFiltersByLevel(level)
    
    return (
      <div className="border-b border-gray-100 last:border-b-0 dark:border-gray-700">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors dark:hover:bg-gray-800"
        >
          <div className="flex items-center space-x-2">
            {icon}
            <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">{title}</h4>
            {levelFilters.length > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary-100 text-primary-800 dark:bg-primary-900/20 dark:text-primary-300">
                {levelFilters.length}
              </span>
            )}
          </div>
          {isExpanded ? (
            <ChevronDownIcon className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRightIcon className="h-4 w-4 text-gray-500" />
          )}
        </button>
        
        {isExpanded && (
          <div className="px-3 pb-3">
            <div className="space-y-3">
              {levelFilters.map((filter) => (
                <div key={filter.id} className="bg-gray-50 rounded-lg p-3 dark:bg-gray-800">
                  <div className="flex items-center justify-between mb-2">
                    <input
                      type="text"
                      value={filter.name}
                      onChange={(e) => updateFilter(filter.id, { name: e.target.value })}
                      className="input text-xs font-medium bg-transparent border-0 p-0"
                    />
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateFilter(filter.id, { enabled: !filter.enabled })}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          filter.enabled ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                            filter.enabled ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <button
                        onClick={() => removeFilter(filter.id)}
                        className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Field
                        </label>
                        <input
                          type="text"
                          value={filter.field}
                          onChange={(e) => updateFilter(filter.id, { field: e.target.value })}
                          placeholder="Field name"
                          className="input text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Type
                        </label>
                        <select
                          value={filter.type}
                          onChange={(e) => updateFilter(filter.id, { type: e.target.value as any })}
                          className="input text-xs"
                        >
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="date">Date</option>
                          <option value="boolean">Boolean</option>
                          <option value="list">List</option>
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Condition
                      </label>
                      {renderFilterOperatorSelect(filter)}
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Value
                      </label>
                      {renderFilterValue(filter)}
                    </div>
                  </div>
                </div>
              ))}
              
              <button
                onClick={() => addFilter(level)}
                className="w-full flex items-center justify-center space-x-2 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary-500 hover:text-primary-600 transition-colors dark:border-gray-600 dark:text-gray-400 dark:hover:border-primary-400"
              >
                <FunnelIcon className="h-4 w-4" />
                <span className="text-xs">Add {level} filter</span>
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Filters</h3>
      </div>
      
      <div className="panel-content p-0">
        <FilterSection
          title="Report Filters"
          level="report"
          icon={<DocumentTextIcon className="h-4 w-4 text-gray-500" />}
        />
        
        <FilterSection
          title="Page Filters"
          level="page"
          icon={<CalendarIcon className="h-4 w-4 text-gray-500" />}
        />
        
        {selectedVisual && (
          <FilterSection
            title="Visual Filters"
            level="visual"
            icon={<AdjustmentsHorizontalIcon className="h-4 w-4 text-gray-500" />}
          />
        )}
        
        {!selectedVisual && (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            <AdjustmentsHorizontalIcon className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            <p className="text-xs">Select a visual to add visual-level filters</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default FilterPanel