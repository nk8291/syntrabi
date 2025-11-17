/**
 * Power BI Fields Panel
 * Replica of Power BI Desktop Fields panel with dataset tree structure
 */

import React, { useState, useEffect } from 'react'
import { useDrag } from 'react-dnd'
import {
  ChevronRightIcon,
  ChevronDownIcon,
  TableCellsIcon,
  HashtagIcon,
  CalendarIcon,
  DocumentTextIcon,
  CheckIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline'
import { datasetService, Dataset } from '@/services/datasetService'

interface PowerBIFieldsPanelProps {
  workspaceId: string
  onFieldDrop?: (field: any, wellType: string, visualId?: string) => void
}

interface Field {
  id: string
  name: string
  type: string
  table: string
  isVisible: boolean
  isKey?: boolean
  description?: string
  aggregation?: 'sum' | 'count' | 'avg' | 'min' | 'max' | 'none'
}

interface Table {
  id: string
  name: string
  displayName?: string
  expanded: boolean
  fields: Field[]
  isFactTable?: boolean
}

interface DatasetTree {
  id: string
  name: string
  displayName?: string
  expanded: boolean
  tables: Table[]
}

const PowerBIFieldsPanel: React.FC<PowerBIFieldsPanelProps> = ({
  workspaceId,
  onFieldDrop
}) => {
  const [datasets, setDatasets] = useState<DatasetTree[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showHidden, setShowHidden] = useState(false)

  useEffect(() => {
    loadDatasets()
  }, [workspaceId])

  const loadDatasets = async () => {
    try {
      setLoading(true)
      let response = []
      try {
        response = await datasetService.getDatasets(workspaceId)
      } catch (error) {
        console.warn('Failed to load real datasets, using sample data:', error)
        // Use sample datasets if service fails
        response = getSampleDatasets()
      }
      
      const datasetTrees: DatasetTree[] = response.map((dataset: Dataset) => ({
        id: dataset.id,
        name: dataset.name,
        displayName: dataset.name,
        expanded: true,
        tables: extractTablesFromDataset(dataset)
      }))
      
      setDatasets(datasetTrees)
    } catch (error) {
      console.error('Failed to load datasets:', error)
      // Fallback to sample data
      setDatasets(getSampleDatasetTrees())
    } finally {
      setLoading(false)
    }
  }

  const extractTablesFromDataset = (dataset: Dataset): Table[] => {
    // Handle new schema structure: schema_json.tables[]
    if (dataset.schema_json?.tables && Array.isArray(dataset.schema_json.tables)) {
      return dataset.schema_json.tables.map((tableData: any) => ({
        id: `${dataset.id}-${tableData.name}`,
        name: tableData.name,
        displayName: tableData.displayName || tableData.name,
        expanded: true,
        isFactTable: tableData.name.toLowerCase().includes('fact') || tableData.name.toLowerCase().includes('sales'),
        fields: (tableData.columns || []).map((column: any, index: number) => ({
          id: `${dataset.id}-${tableData.name}-${column.name}-${index}`,
          name: column.name,
          type: column.type,
          table: tableData.name,
          isVisible: true,
          isKey: column.name.toLowerCase().includes('id') || column.name.toLowerCase().includes('key'),
          aggregation: getDefaultAggregation(column.type),
          description: column.description || ''
        }))
      }))
    }

    // Fallback: Handle legacy schema structure with columns directly
    if (dataset.schema_json?.columns && Array.isArray(dataset.schema_json.columns)) {
      const table: Table = {
        id: `${dataset.id}-table`,
        name: dataset.name,
        displayName: dataset.name,
        expanded: true,
        isFactTable: true,
        fields: dataset.schema_json.columns.map((column: any, index: number) => ({
          id: `${dataset.id}-${column.name}-${index}`,
          name: column.name,
          type: column.type,
          table: dataset.name,
          isVisible: true,
          isKey: column.name.toLowerCase().includes('id') || column.name.toLowerCase().includes('key'),
          aggregation: getDefaultAggregation(column.type),
          description: column.description || ''
        }))
      }
      return [table]
    }

    return []
  }
  
  const getDefaultAggregation = (type: string): 'sum' | 'count' | 'avg' | 'min' | 'max' | 'none' => {
    switch (type.toLowerCase()) {
      case 'number':
      case 'integer':
      case 'float':
      case 'decimal':
        return 'sum'
      case 'date':
      case 'datetime':
      case 'timestamp':
        return 'count'
      default:
        return 'count'
    }
  }

  const getFieldIcon = (field: Field) => {
    const baseIcon = getBaseIcon(field.type)
    
    if (field.isKey) {
      return (
        <div className="relative">
          {baseIcon}
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full border border-white" />
        </div>
      )
    }
    
    return baseIcon
  }
  
  const getBaseIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'number':
      case 'integer':
      case 'float':
      case 'decimal':
        return <HashtagIcon className="h-4 w-4 text-blue-600" />
      case 'date':
      case 'datetime':
      case 'timestamp':
        return <CalendarIcon className="h-4 w-4 text-green-600" />
      case 'boolean':
        return <CheckIcon className="h-4 w-4 text-purple-600" />
      default:
        return <DocumentTextIcon className="h-4 w-4 text-gray-600" />
    }
  }

  const toggleDatasetExpansion = (datasetId: string) => {
    setDatasets(prev => prev.map(ds => 
      ds.id === datasetId 
        ? { ...ds, expanded: !ds.expanded }
        : ds
    ))
  }
  
  const toggleTableExpansion = (datasetId: string, tableId: string) => {
    setDatasets(prev => prev.map(ds => 
      ds.id === datasetId 
        ? {
            ...ds,
            tables: ds.tables.map(table =>
              table.id === tableId
                ? { ...table, expanded: !table.expanded }
                : table
            )
          }
        : ds
    ))
  }

  const toggleFieldVisibility = (fieldId: string) => {
    setDatasets(prev => prev.map(ds => ({
      ...ds,
      tables: ds.tables.map(table => ({
        ...table,
        fields: table.fields.map(field => 
          field.id === fieldId 
            ? { ...field, isVisible: !field.isVisible }
            : field
        )
      }))
    })))
  }

  const filteredDatasets = datasets.map(dataset => ({
    ...dataset,
    tables: dataset.tables.map(table => ({
      ...table,
      fields: table.fields.filter(field => {
        const matchesSearch = searchQuery === '' || 
          field.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          field.table.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesVisibility = showHidden || field.isVisible
        return matchesSearch && matchesVisibility
      })
    })).filter(table => table.fields.length > 0 || searchQuery === '')
  })).filter(dataset => 
    dataset.tables.some(table => table.fields.length > 0) || searchQuery === ''
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading datasets...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search & Filters */}
      <div className="p-3 border-b border-gray-200 space-y-2">
        <input
          type="text"
          placeholder="Search fields..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <div className="flex items-center space-x-2 text-xs">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showHidden}
              onChange={(e) => setShowHidden(e.target.checked)}
              className="mr-1 rounded"
            />
            <span className="text-gray-600">Show hidden fields</span>
          </label>
        </div>
      </div>

      {/* Dataset Tree */}
      <div className="flex-1 overflow-auto">
        {filteredDatasets.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <TableCellsIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm">No datasets available</p>
            <p className="text-xs mt-2">
              Upload data or connect to a database to get started
            </p>
          </div>
        ) : (
          <div className="p-2">
            {filteredDatasets.map((dataset) => (
              <DatasetTreeNode
                key={dataset.id}
                dataset={dataset}
                onToggleDatasetExpansion={toggleDatasetExpansion}
                onToggleTableExpansion={toggleTableExpansion}
                onToggleFieldVisibility={toggleFieldVisibility}
                getFieldIcon={getFieldIcon}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dataset Management */}
      <div className="border-t border-gray-200 p-3 bg-gray-50">
        <div className="text-xs text-gray-600 mb-2">
          {datasets.reduce((total, ds) => 
            total + ds.tables.reduce((tableTotal, table) => tableTotal + table.fields.length, 0), 
            0
          )} fields across {datasets.reduce((total, ds) => total + ds.tables.length, 0)} tables
        </div>
        <button
          onClick={() => window.location.href = '/datasets'}
          className="w-full px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Manage Datasets
        </button>
      </div>
    </div>
  )
}

// Draggable Field Component
const DraggableField: React.FC<{
  field: Field
  onToggleVisibility: (fieldId: string) => void
  getFieldIcon: (type: string) => JSX.Element
}> = ({ field, onToggleVisibility, getFieldIcon }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'field',
    item: {
      field: {
        id: field.id,
        name: field.name,
        type: field.type,
        table: field.table,
        aggregation: field.aggregation,
        isKey: field.isKey,
        description: field.description
      }
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  return (
    <div
      ref={drag}
      className={`flex items-center justify-between px-2 py-1 rounded hover:bg-blue-50 cursor-pointer group ${
        isDragging ? 'opacity-50' : ''
      } ${!field.isVisible ? 'opacity-60' : ''}`}
      title={field.description || `${field.name} (${field.type})`}
    >
      <div className="flex items-center flex-1 min-w-0">
        <div className="flex-shrink-0 mr-2">
          {getFieldIcon(field)}
        </div>
        <span className="text-sm truncate">{field.name}</span>
        {field.aggregation && field.aggregation !== 'none' && (
          <span className="ml-1 text-xs text-gray-500">Σ</span>
        )}
      </div>
      
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleVisibility(field.id)
        }}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
        title={field.isVisible ? 'Hide field' : 'Show field'}
      >
        {field.isVisible ? (
          <EyeIcon className="h-3 w-3 text-gray-500" />
        ) : (
          <EyeSlashIcon className="h-3 w-3 text-gray-400" />
        )}
      </button>
    </div>
  )
}

// Dataset Tree Node Component
const DatasetTreeNode: React.FC<{
  dataset: DatasetTree
  onToggleDatasetExpansion: (datasetId: string) => void
  onToggleTableExpansion: (datasetId: string, tableId: string) => void
  onToggleFieldVisibility: (fieldId: string) => void
  getFieldIcon: (field: Field) => JSX.Element
}> = ({ dataset, onToggleDatasetExpansion, onToggleTableExpansion, onToggleFieldVisibility, getFieldIcon }) => {
  const totalFields = dataset.tables.reduce((total, table) => total + table.fields.length, 0)
  
  return (
    <div className="mb-2">
      {/* Dataset Header */}
      <div
        className="flex items-center px-2 py-2 hover:bg-gray-100 rounded cursor-pointer"
        onClick={() => onToggleDatasetExpansion(dataset.id)}
      >
        <div className="flex-shrink-0 mr-2">
          {dataset.expanded ? (
            <ChevronDownIcon className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRightIcon className="h-4 w-4 text-gray-500" />
          )}
        </div>
        <TableCellsIcon className="h-4 w-4 text-blue-700 mr-2 flex-shrink-0" />
        <span className="text-sm font-semibold text-blue-800 truncate">
          {dataset.displayName || dataset.name}
        </span>
        <span className="ml-auto text-xs text-gray-500 flex-shrink-0">
          {totalFields}
        </span>
      </div>

      {/* Tables */}
      {dataset.expanded && (
        <div className="ml-4">
          {dataset.tables.map((table) => (
            <TableTreeNode
              key={table.id}
              table={table}
              datasetId={dataset.id}
              onToggleExpansion={onToggleTableExpansion}
              onToggleFieldVisibility={onToggleFieldVisibility}
              getFieldIcon={getFieldIcon}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Table Tree Node Component
const TableTreeNode: React.FC<{
  table: Table
  datasetId: string
  onToggleExpansion: (datasetId: string, tableId: string) => void
  onToggleFieldVisibility: (fieldId: string) => void
  getFieldIcon: (field: Field) => JSX.Element
}> = ({ table, datasetId, onToggleExpansion, onToggleFieldVisibility, getFieldIcon }) => {
  return (
    <div className="mb-1">
      {/* Table Header */}
      <div
        className="flex items-center px-2 py-1 hover:bg-gray-50 rounded cursor-pointer"
        onClick={() => onToggleExpansion(datasetId, table.id)}
      >
        <div className="flex-shrink-0 mr-2">
          {table.expanded ? (
            <ChevronDownIcon className="h-3 w-3 text-gray-500" />
          ) : (
            <ChevronRightIcon className="h-3 w-3 text-gray-500" />
          )}
        </div>
        <TableCellsIcon className="h-3 w-3 text-gray-600 mr-2 flex-shrink-0" />
        <span className="text-xs font-medium text-gray-700 truncate">
          {table.displayName || table.name}
        </span>
        {table.isFactTable && (
          <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1 rounded">Fact</span>
        )}
        <span className="ml-auto text-xs text-gray-500 flex-shrink-0">
          {table.fields.length}
        </span>
      </div>

      {/* Fields */}
      {table.expanded && (
        <div className="ml-4 border-l border-gray-200 pl-2">
          {table.fields.map((field) => (
            <DraggableField
              key={field.id}
              field={field}
              onToggleVisibility={onToggleFieldVisibility}
              getFieldIcon={getFieldIcon}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Sample datasets for demo purposes
const getSampleDatasets = (): Dataset[] => [
  {
    id: 'sample-sales-dataset',
    name: 'Sales & Marketing Dataset',
    description: 'Sample sales and marketing data for demonstration',
    type: 'sample',
    workspace_id: 'demo-workspace',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    file_path: '',
    file_size: 0,
    schema_json: {
      columns: [
        { name: 'Date', type: 'date', description: 'Transaction date' },
        { name: 'Product_ID', type: 'string', description: 'Unique product identifier' },
        { name: 'Product_Name', type: 'string', description: 'Name of the product' },
        { name: 'Category', type: 'string', description: 'Product category' },
        { name: 'Sales_Amount', type: 'number', description: 'Total sales amount' },
        { name: 'Quantity', type: 'number', description: 'Units sold' },
        { name: 'Customer_ID', type: 'string', description: 'Customer identifier' },
        { name: 'Region', type: 'string', description: 'Sales region' },
        { name: 'Sales_Person', type: 'string', description: 'Salesperson name' },
        { name: 'Profit_Margin', type: 'number', description: 'Profit margin percentage' }
      ]
    }
  },
  {
    id: 'sample-customer-dataset',
    name: 'Customer Demographics',
    description: 'Customer demographic and behavioral data',
    type: 'sample',
    workspace_id: 'demo-workspace',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    file_path: '',
    file_size: 0,
    schema_json: {
      columns: [
        { name: 'Customer_ID', type: 'string', description: 'Unique customer identifier' },
        { name: 'Customer_Name', type: 'string', description: 'Customer full name' },
        { name: 'Age', type: 'number', description: 'Customer age' },
        { name: 'Gender', type: 'string', description: 'Customer gender' },
        { name: 'City', type: 'string', description: 'Customer city' },
        { name: 'State', type: 'string', description: 'Customer state' },
        { name: 'Country', type: 'string', description: 'Customer country' },
        { name: 'Annual_Income', type: 'number', description: 'Annual income in USD' },
        { name: 'Loyalty_Score', type: 'number', description: 'Customer loyalty score (1-10)' },
        { name: 'Join_Date', type: 'date', description: 'Customer registration date' }
      ]
    }
  }
]

const getSampleDatasetTrees = (): DatasetTree[] => [
  {
    id: 'sample-sales-dataset',
    name: 'Sales & Marketing Dataset',
    displayName: 'Sales & Marketing Dataset',
    expanded: true,
    tables: [{
      id: 'sales-table',
      name: 'Sales Data',
      displayName: 'Sales Data',
      expanded: true,
      isFactTable: true,
      fields: [
        { id: 'date-field', name: 'Date', type: 'date', table: 'Sales Data', isVisible: true, aggregation: 'none' },
        { id: 'product-id-field', name: 'Product_ID', type: 'string', table: 'Sales Data', isVisible: true, isKey: true, aggregation: 'count' },
        { id: 'product-name-field', name: 'Product_Name', type: 'string', table: 'Sales Data', isVisible: true, aggregation: 'count' },
        { id: 'category-field', name: 'Category', type: 'string', table: 'Sales Data', isVisible: true, aggregation: 'count' },
        { id: 'sales-amount-field', name: 'Sales_Amount', type: 'number', table: 'Sales Data', isVisible: true, aggregation: 'sum' },
        { id: 'quantity-field', name: 'Quantity', type: 'number', table: 'Sales Data', isVisible: true, aggregation: 'sum' },
        { id: 'customer-id-field', name: 'Customer_ID', type: 'string', table: 'Sales Data', isVisible: true, isKey: true, aggregation: 'count' },
        { id: 'region-field', name: 'Region', type: 'string', table: 'Sales Data', isVisible: true, aggregation: 'count' },
        { id: 'salesperson-field', name: 'Sales_Person', type: 'string', table: 'Sales Data', isVisible: true, aggregation: 'count' },
        { id: 'profit-margin-field', name: 'Profit_Margin', type: 'number', table: 'Sales Data', isVisible: true, aggregation: 'avg' }
      ]
    }]
  },
  {
    id: 'sample-customer-dataset',
    name: 'Customer Demographics',
    displayName: 'Customer Demographics',
    expanded: true,
    tables: [{
      id: 'customer-table',
      name: 'Customers',
      displayName: 'Customers', 
      expanded: true,
      isFactTable: false,
      fields: [
        { id: 'cust-id-field', name: 'Customer_ID', type: 'string', table: 'Customers', isVisible: true, isKey: true, aggregation: 'count' },
        { id: 'cust-name-field', name: 'Customer_Name', type: 'string', table: 'Customers', isVisible: true, aggregation: 'count' },
        { id: 'age-field', name: 'Age', type: 'number', table: 'Customers', isVisible: true, aggregation: 'avg' },
        { id: 'gender-field', name: 'Gender', type: 'string', table: 'Customers', isVisible: true, aggregation: 'count' },
        { id: 'city-field', name: 'City', type: 'string', table: 'Customers', isVisible: true, aggregation: 'count' },
        { id: 'state-field', name: 'State', type: 'string', table: 'Customers', isVisible: true, aggregation: 'count' },
        { id: 'country-field', name: 'Country', type: 'string', table: 'Customers', isVisible: true, aggregation: 'count' },
        { id: 'income-field', name: 'Annual_Income', type: 'number', table: 'Customers', isVisible: true, aggregation: 'avg' },
        { id: 'loyalty-field', name: 'Loyalty_Score', type: 'number', table: 'Customers', isVisible: true, aggregation: 'avg' },
        { id: 'join-date-field', name: 'Join_Date', type: 'date', table: 'Customers', isVisible: true, aggregation: 'none' }
      ]
    }]
  }
]

export default PowerBIFieldsPanel