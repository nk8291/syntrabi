/**
 * Dataset Preview Modal
 * Modal for previewing dataset data and schema
 */

import React, { useState, useEffect } from 'react'
import {
  XMarkIcon,
  TableCellsIcon,
  InformationCircleIcon,
  DocumentTextIcon,
  HashtagIcon,
  CalendarIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { Dataset, datasetService, DatasetQueryResult } from '@/services/datasetService'

interface DatasetPreviewModalProps {
  dataset: Dataset
  onClose: () => void
}

const DatasetPreviewModal: React.FC<DatasetPreviewModalProps> = ({
  dataset,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'data' | 'schema'>('data')
  const [previewData, setPreviewData] = useState<DatasetQueryResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPreviewData()
  }, [dataset.id])

  const loadPreviewData = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await datasetService.previewDataset(dataset.id)
      setPreviewData(data)
    } catch (err) {
      console.error('Failed to load preview:', err)
      setError('Failed to load dataset preview')
    } finally {
      setLoading(false)
    }
  }

  const getColumnIcon = (type: string) => {
    switch (type) {
      case 'number':
      case 'integer':
      case 'float':
        return <HashtagIcon className="h-4 w-4" />
      case 'date':
      case 'datetime':
      case 'timestamp':
        return <CalendarIcon className="h-4 w-4" />
      case 'boolean':
        return <CheckIcon className="h-4 w-4" />
      default:
        return <DocumentTextIcon className="h-4 w-4" />
    }
  }

  const getColumnTypeColor = (type: string) => {
    switch (type) {
      case 'number':
      case 'integer':
      case 'float':
        return 'text-blue-600'
      case 'date':
      case 'datetime':
      case 'timestamp':
        return 'text-green-600'
      case 'boolean':
        return 'text-purple-600'
      default:
        return 'text-gray-600'
    }
  }

  const formatValue = (value: any, type: string) => {
    if (value === null || value === undefined) return 'null'
    
    switch (type) {
      case 'date':
      case 'datetime':
      case 'timestamp':
        return new Date(value).toLocaleString()
      case 'boolean':
        return value ? 'true' : 'false'
      case 'number':
      case 'integer':
      case 'float':
        return typeof value === 'number' ? value.toLocaleString() : value
      default:
        return String(value)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <TableCellsIcon className="h-6 w-6 text-gray-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{dataset.name}</h2>
              <p className="text-sm text-gray-600">
                {dataset.connector_type.toUpperCase()} • {dataset.row_count?.toLocaleString()} rows
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('data')}
            className={`px-6 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'data'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Data Preview
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`px-6 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'schema'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Schema
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <span className="ml-3 text-gray-600">Loading preview...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <InformationCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-red-600 mb-2">Preview Error</h3>
                <p className="text-gray-600">{error}</p>
                <button
                  onClick={loadPreviewData}
                  className="btn btn-primary mt-4"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : activeTab === 'data' && previewData ? (
            <div className="overflow-auto h-full">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    {Object.keys(previewData.data[0] || {}).map((column) => (
                      <th
                        key={column}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {previewData.data.map((row, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {Object.entries(row).map(([column, value], colIndex) => (
                        <td
                          key={`${index}-${column}`}
                          className="px-4 py-2 text-sm text-gray-900 border-r max-w-xs truncate"
                          title={String(value)}
                        >
                          {formatValue(value, typeof value)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'schema' && dataset.schema_json ? (
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Dataset Schema</h3>
                  <span className="text-sm text-gray-500">
                    {dataset.schema_json.columns?.length || 0} columns
                  </span>
                </div>
                
                <div className="grid gap-4">
                  {dataset.schema_json.columns?.map((column: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <span className={`${getColumnTypeColor(column.type)}`}>
                          {getColumnIcon(column.type)}
                        </span>
                        <div>
                          <div className="font-medium text-gray-900">{column.name}</div>
                          <div className="text-sm text-gray-500">
                            {column.description || 'No description'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <span className={`px-2 py-1 text-xs rounded-full bg-gray-100 ${getColumnTypeColor(column.type)}`}>
                          {column.type}
                        </span>
                        
                        {column.nullable && (
                          <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-600">
                            Nullable
                          </span>
                        )}
                        
                        {column.primary_key && (
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-600">
                            Primary Key
                          </span>
                        )}
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-8 text-gray-500">
                      <InformationCircleIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p>Schema information not available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <InformationCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">No Data Available</h3>
                <p className="text-gray-500">Unable to load preview data for this dataset</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {activeTab === 'data' && previewData && (
              <>
                Showing {previewData.data.length} of {dataset.row_count?.toLocaleString()} rows
                {previewData.execution_time && (
                  <span className="ml-4">• Query time: {previewData.execution_time}ms</span>
                )}
              </>
            )}
          </div>
          
          <button
            onClick={onClose}
            className="btn btn-primary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default DatasetPreviewModal