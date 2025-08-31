/**
 * Fields Panel Component
 * Comprehensive data panel with datasets, tables, and field management
 */

import React, { useState, useEffect } from 'react'
import { useDrag } from 'react-dnd'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  TableCellsIcon,
  HashtagIcon,
  CalendarIcon,
  DocumentTextIcon,
  CheckIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CalculatorIcon,
  EyeIcon,
  ArrowPathIcon,
  CircleStackIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { clsx } from 'clsx'
import { datasetService, Dataset } from '@/services/datasetService'
import DatasetManager from '../datasets/DatasetManager'

interface FieldsPanelProps {
  workspaceId: string
  onFieldDrop: (field: DataField, targetRole: string) => void
}

interface DataField {
  name: string
  type: 'string' | 'number' | 'date' | 'boolean'
  table: string
  description?: string
  isCalculated?: boolean
  isMeasure?: boolean
  aggregation?: 'sum' | 'count' | 'avg' | 'min' | 'max'
}

interface DataTable {
  name: string
  fields: DataField[]
  rowCount?: number
}


const FieldItem: React.FC<{ field: DataField; onPreview?: (field: DataField) => void }> = ({ field, onPreview }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'field',
    item: { field },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  const getFieldIcon = (field: DataField) => {
    if (field.isCalculated) {
      return <CalculatorIcon className="h-4 w-4" />
    }
    
    switch (field.type) {
      case 'number':
        return field.isMeasure ? <FunnelIcon className="h-4 w-4" /> : <HashtagIcon className="h-4 w-4" />
      case 'date':
        return <CalendarIcon className="h-4 w-4" />
      case 'boolean':
        return <CheckIcon className="h-4 w-4" />
      default:
        return <DocumentTextIcon className="h-4 w-4" />
    }
  }

  const getFieldTypeColor = (field: DataField) => {
    if (field.isCalculated) {
      return 'text-purple-600'
    }
    
    switch (field.type) {
      case 'number':
        return field.isMeasure ? 'text-orange-600' : 'text-blue-600'
      case 'date':
        return 'text-green-600'
      case 'boolean':
        return 'text-purple-600'
      default:
        return 'text-gray-600'
    }
  }

  const getFieldTooltip = (field: DataField) => {
    let tooltip = `${field.name} (${field.type})`
    if (field.isMeasure) tooltip += ' - Measure'
    if (field.isCalculated) tooltip += ' - Calculated'
    if (field.aggregation) tooltip += ` - ${field.aggregation.toUpperCase()}`
    return tooltip
  }

  return (
    <div
      ref={drag}
      title={getFieldTooltip(field)}
      className={clsx(
        'group flex items-center space-x-2 px-3 py-2 text-sm rounded-md cursor-grab hover:bg-gray-50 transition-colors',
        isDragging && 'opacity-50',
        field.isMeasure && 'bg-orange-50 border border-orange-200',
        field.isCalculated && 'bg-purple-50 border border-purple-200'
      )}
    >
      <span className={clsx('flex-shrink-0', getFieldTypeColor(field))}>
        {getFieldIcon(field)}
      </span>
      <span className="flex-1 text-gray-900 truncate">{field.name}</span>
      {field.aggregation && (
        <span className="text-xs text-gray-500 bg-gray-100 px-1 rounded">
          {field.aggregation.toUpperCase()}
        </span>
      )}
      {onPreview && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onPreview(field)
          }}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-all"
          title="Preview data"
        >
          <EyeIcon className="h-3 w-3 text-gray-500" />
        </button>
      )}
    </div>
  )
}

const TableSection: React.FC<{ 
  table: DataTable;
  onPreviewField?: (field: DataField) => void;
}> = ({ table, onPreviewField }) => {
  const [isExpanded, setIsExpanded] = useState(true)
  const [fieldFilter, setFieldFilter] = useState('')
  const [showMeasuresOnly, setShowMeasuresOnly] = useState(false)

  const filteredFields = table.fields.filter(field => {
    const matchesSearch = field.name.toLowerCase().includes(fieldFilter.toLowerCase())
    const matchesFilter = !showMeasuresOnly || field.isMeasure
    return matchesSearch && matchesFilter
  })

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center space-x-2 w-full px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md"
      >
        {isExpanded ? (
          <ChevronDownIcon className="h-4 w-4" />
        ) : (
          <ChevronRightIcon className="h-4 w-4" />
        )}
        <TableCellsIcon className="h-4 w-4 text-gray-500" />
        <div className="flex-1 text-left">
          <div>{table.name}</div>
          {table.rowCount && (
            <div className="text-xs text-gray-500">{table.rowCount.toLocaleString()} rows</div>
          )}
        </div>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {table.fields.length}
        </span>
      </button>
      
      {isExpanded && (
        <div className="ml-4 mt-2 space-y-2">
          {/* Field Search and Filters */}
          <div className="space-y-2">
            <div className="relative">
              <MagnifyingGlassIcon className="h-4 w-4 absolute left-2 top-2 text-gray-400" />
              <input
                type="text"
                placeholder="Search fields..."
                value={fieldFilter}
                onChange={(e) => setFieldFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-1 text-xs border border-gray-200 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowMeasuresOnly(!showMeasuresOnly)}
                className={clsx(
                  'text-xs px-2 py-1 rounded-md transition-colors',
                  showMeasuresOnly
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                Measures Only
              </button>
            </div>
          </div>
          
          <div className="space-y-1">
            {filteredFields.map((field) => (
              <FieldItem 
                key={`${table.name}.${field.name}`} 
                field={field}
                onPreview={onPreviewField}
              />
            ))}
          </div>
          
          {filteredFields.length === 0 && (
            <div className="text-center py-4 text-gray-400">
              <p className="text-xs">No fields match your criteria</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const DatasetSection: React.FC<{ 
  dataset: Dataset;
  onPreviewField?: (field: DataField) => void;
  onRefresh?: (datasetId: string) => void;
}> = ({ dataset, onPreviewField, onRefresh }) => {
  const [isExpanded, setIsExpanded] = useState(true)

  // Convert dataset schema to DataTable format
  const tables: DataTable[] = dataset.tables || (dataset.schema_json?.columns ? [
    {
      name: dataset.name,
      rowCount: dataset.row_count,
      fields: dataset.schema_json.columns.map((col: any) => ({
        name: col.name,
        type: col.type,
        table: dataset.name,
        isMeasure: col.type === 'number',
        isCalculated: false,
        aggregation: col.type === 'number' ? 'sum' : undefined
      }))
    }
  ] : [])

  return (
    <div className="mb-4 border border-gray-200 rounded-lg">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center space-x-2 w-full px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 rounded-t-lg"
      >
        {isExpanded ? (
          <ChevronDownIcon className="h-4 w-4" />
        ) : (
          <ChevronRightIcon className="h-4 w-4" />
        )}
        <div className="flex-1 text-left">
          <div className="flex items-center space-x-2">
            <span>{dataset.name}</span>
            <span className={clsx(
              'text-xs px-2 py-1 rounded-full',
              dataset.status === 'ready' ? 'bg-green-100 text-green-700' :
              dataset.status === 'processing' ? 'bg-yellow-100 text-yellow-700' :
              dataset.status === 'error' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-700'
            )}>
              {dataset.status}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {dataset.connector_type} • {dataset.row_count?.toLocaleString() || '0'} rows
          </div>
        </div>
        {onRefresh && dataset.status === 'ready' && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRefresh(dataset.id)
            }}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            title="Refresh dataset"
          >
            <ArrowPathIcon className="h-4 w-4 text-gray-500" />
          </button>
        )}
      </button>
      
      {isExpanded && (
        <div className="p-2 border-t border-gray-200">
          {tables.length > 0 ? (
            tables.map((table) => (
              <TableSection 
                key={table.name} 
                table={table}
                onPreviewField={onPreviewField}
              />
            ))
          ) : (
            <div className="text-center py-4 text-gray-400">
              <p className="text-xs">No schema available</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const FieldsPanel: React.FC<FieldsPanelProps> = ({ workspaceId, onFieldDrop }) => {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(true)
  const [previewField, setPreviewField] = useState<DataField | null>(null)
  const [globalSearch, setGlobalSearch] = useState('')
  const [showDatasetManager, setShowDatasetManager] = useState(false)

  useEffect(() => {
    loadDatasets()
  }, [workspaceId])

  const loadDatasets = async () => {
    try {
      setLoading(true)
      const data = await datasetService.getDatasets(workspaceId)
      
      // If no datasets from API, provide mock data for demonstration
      if (!data || data.length === 0) {
        const mockDatasets = [
          {
            id: 'mock-dataset-1',
            name: 'Sales Dataset',
            description: 'Sample sales and revenue data',
            workspace_id: workspaceId,
            connector_type: 'csv',
            status: 'ready',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            row_count: 10000,
            file_size: 1024000,
            tables: [
              {
                name: 'Sales',
                fields: [
                  { name: 'Date', type: 'date', table: 'Sales', description: 'Sale date' },
                  { name: 'Product', type: 'string', table: 'Sales', description: 'Product name' },
                  { name: 'Category', type: 'string', table: 'Sales', description: 'Product category' },
                  { name: 'Region', type: 'string', table: 'Sales', description: 'Sales region' },
                  { name: 'Sales Amount', type: 'number', table: 'Sales', isMeasure: true, aggregation: 'sum', description: 'Total sales amount' },
                  { name: 'Quantity', type: 'number', table: 'Sales', isMeasure: true, aggregation: 'sum', description: 'Units sold' },
                  { name: 'Profit', type: 'number', table: 'Sales', isMeasure: true, aggregation: 'sum', description: 'Profit amount' },
                ]
              },
              {
                name: 'Customers',
                fields: [
                  { name: 'Customer ID', type: 'string', table: 'Customers', description: 'Unique customer identifier' },
                  { name: 'Customer Name', type: 'string', table: 'Customers', description: 'Customer full name' },
                  { name: 'Email', type: 'string', table: 'Customers', description: 'Customer email address' },
                  { name: 'Age', type: 'number', table: 'Customers', description: 'Customer age' },
                  { name: 'Signup Date', type: 'date', table: 'Customers', description: 'Account creation date' },
                  { name: 'Total Orders', type: 'number', table: 'Customers', isMeasure: true, aggregation: 'count', description: 'Number of orders placed' },
                ]
              },
              {
                name: 'Products',
                fields: [
                  { name: 'Product ID', type: 'string', table: 'Products', description: 'Unique product identifier' },
                  { name: 'Product Name', type: 'string', table: 'Products', description: 'Product name' },
                  { name: 'Category', type: 'string', table: 'Products', description: 'Product category' },
                  { name: 'Price', type: 'number', table: 'Products', isMeasure: true, description: 'Unit price' },
                  { name: 'Cost', type: 'number', table: 'Products', isMeasure: true, description: 'Unit cost' },
                  { name: 'In Stock', type: 'boolean', table: 'Products', description: 'Availability status' },
                ]
              }
            ]
          }
        ]
        setDatasets(mockDatasets)
      } else {
        setDatasets(data)
      }
    } catch (error) {
      console.error('Failed to load datasets:', error)
      // Provide mock data even on API error
      const mockDatasets = [
        {
          id: 'mock-dataset-1',
          name: 'Sample Dataset',
          description: 'Demo data for visualization',
          workspace_id: workspaceId,
          connector_type: 'demo',
          status: 'ready',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          row_count: 1000,
          file_size: 102400,
          tables: [
            {
              name: 'Demo Data',
              fields: [
                { name: 'Category', type: 'string', table: 'Demo Data', description: 'Data category' },
                { name: 'Value', type: 'number', table: 'Demo Data', isMeasure: true, aggregation: 'sum', description: 'Numeric value' },
                { name: 'Date', type: 'date', table: 'Demo Data', description: 'Record date' },
              ]
            }
          ]
        }
      ]
      setDatasets(mockDatasets)
    } finally {
      setLoading(false)
    }
  }

  const handleRefreshDataset = async (datasetId: string) => {
    try {
      // Implement dataset refresh logic
      await loadDatasets()
    } catch (error) {
      console.error('Failed to refresh dataset:', error)
    }
  }

  const handlePreviewField = (field: DataField) => {
    setPreviewField(field)
    // TODO: Implement field preview modal
  }

  const handleDatasetSelect = (dataset: Dataset) => {
    setShowDatasetManager(false)
    loadDatasets() // Refresh the list
  }

  const filteredDatasets = datasets.filter(dataset => 
    globalSearch === '' ||
    dataset.name.toLowerCase().includes(globalSearch.toLowerCase())
  )

  if (loading) {
    return (
      <div className="panel">
        <div className="panel-header">
          <h3 className="text-sm font-semibold text-gray-900">Data</h3>
        </div>
        <div className="panel-content">
          <div className="text-center py-8 text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-sm">Loading datasets...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="panel">
      <div className="panel-header border-b border-gray-200">
        <div className="p-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Data</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowDatasetManager(true)}
                className="text-xs text-primary-600 hover:text-primary-500 font-medium flex items-center space-x-1"
                title="Manage Datasets"
              >
                <CircleStackIcon className="h-3 w-3" />
                <span>Manage</span>
              </button>
              <button
                onClick={loadDatasets}
                className="text-xs text-primary-600 hover:text-primary-500 font-medium"
                title="Refresh Datasets"
              >
                Refresh
              </button>
            </div>
          </div>
          
          <div className="relative">
            <MagnifyingGlassIcon className="h-4 w-4 absolute left-2 top-2 text-gray-400" />
            <input
              type="text"
              placeholder="Search datasets..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1 text-xs border border-gray-200 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>
      
      <div className="panel-content">
        <div className="space-y-2">
          {filteredDatasets.map((dataset) => (
            <DatasetSection 
              key={dataset.id} 
              dataset={dataset}
              onPreviewField={handlePreviewField}
              onRefresh={handleRefreshDataset}
            />
          ))}
        </div>
        
        {filteredDatasets.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            <TableCellsIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm">No datasets available</p>
            <p className="text-xs text-gray-400 mt-1">
              {globalSearch ? 'Try adjusting your search' : 'Add a dataset to start building reports'}
            </p>
            <button 
              onClick={() => setShowDatasetManager(true)}
              className="btn btn-outline btn-sm mt-4"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Dataset
            </button>
          </div>
        )}
      </div>

      {/* Dataset Manager Modal */}
      {showDatasetManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[95vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Dataset Manager</h2>
              <button
                onClick={() => setShowDatasetManager(false)}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="overflow-auto max-h-[calc(95vh-4rem)]">
              <DatasetManager
                workspaceId={workspaceId}
                onDatasetSelect={handleDatasetSelect}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FieldsPanel