/**
 * Dataset Preview Modal Component
 * Shows preview of dataset data and schema information
 */

import React, { useState, useEffect } from 'react'
import { XMarkIcon, TableCellsIcon, EyeIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { datasetService, DatasetQueryResult } from '@/services/datasetService'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import toast from 'react-hot-toast'

interface DatasetPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  datasetId: string
  datasetName?: string
}

const DatasetPreviewModal: React.FC<DatasetPreviewModalProps> = ({
  isOpen,
  onClose,
  datasetId,
  datasetName,
}) => {
  const [data, setData] = useState<DatasetQueryResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(100)

  useEffect(() => {
    if (isOpen && datasetId) {
      loadPreview()
    }
  }, [isOpen, datasetId, currentPage])

  const loadPreview = async () => {
    setLoading(true)
    try {
      const result = await datasetService.queryDataset(datasetId, {
        limit: pageSize,
        offset: (currentPage - 1) * pageSize
      })
      setData(result)
    } catch (error: any) {
      toast.error(error.message || 'Failed to load dataset preview')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    loadPreview()
  }

  const formatValue = (value: any, column: any) => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400 italic">null</span>
    }
    
    if (typeof value === 'number') {
      return value.toLocaleString()
    }
    
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false'
    }
    
    return String(value)
  }

  const getColumnTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'number':
      case 'int64':
      case 'float64':
        return '123'
      case 'date':
      case 'datetime':
        return '📅'
      case 'boolean':
        return '✓'
      default:
        return 'Aa'
    }
  }

  const totalPages = data ? Math.ceil(data.total_rows / pageSize) : 0

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TableCellsIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Dataset Preview</h2>
              <p className="text-sm text-gray-500">
                {datasetName || `Dataset ${datasetId}`}
                {data && ` • ${data.total_rows.toLocaleString()} rows`}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="btn btn-outline btn-sm"
            >
              <ArrowPathIcon className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <LoadingSpinner size="lg" />
                <p className="text-sm text-gray-500 mt-3">Loading dataset preview...</p>
              </div>
            </div>
          ) : data ? (
            <>
              {/* Data Table */}
              <div className="flex-1 overflow-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                        #
                      </th>
                      {data.columns.map((column, index) => (
                        <th
                          key={index}
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b min-w-[150px]"
                        >
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-mono">
                              {getColumnTypeIcon(Object.values(column)[0] as string)}
                            </span>
                            <span className="truncate">{Object.keys(column)[0]}</span>
                          </div>
                          <div className="text-xs text-gray-400 normal-case mt-1">
                            {Object.values(column)[0] as string}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.data.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500 border-r">
                          {(currentPage - 1) * pageSize + rowIndex + 1}
                        </td>
                        {data.columns.map((column, colIndex) => {
                          const columnName = Object.keys(column)[0]
                          const value = row[columnName]
                          return (
                            <td
                              key={colIndex}
                              className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate"
                              title={String(value)}
                            >
                              {formatValue(value, column)}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="border-t px-6 py-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, data.total_rows)} of {data.total_rows.toLocaleString()} rows
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="btn btn-outline btn-sm disabled:opacity-50"
                      >
                        Previous
                      </button>
                      
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum
                          if (totalPages <= 5) {
                            pageNum = i + 1
                          } else if (currentPage <= 3) {
                            pageNum = i + 1
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i
                          } else {
                            pageNum = currentPage - 2 + i
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`px-3 py-1 text-sm rounded-md ${
                                currentPage === pageNum
                                  ? 'bg-primary-600 text-white'
                                  : 'text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              {pageNum}
                            </button>
                          )
                        })}
                      </div>
                      
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="btn btn-outline btn-sm disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <EyeIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm">No data to preview</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {data && (
          <div className="border-t px-6 py-4 bg-gray-50">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center space-x-6">
                <div>
                  <span className="font-medium">{data.columns.length}</span> columns
                </div>
                <div>
                  <span className="font-medium">{data.total_rows.toLocaleString()}</span> rows
                </div>
                <div>
                  Query executed in <span className="font-medium">{data.execution_time.toFixed(2)}ms</span>
                </div>
              </div>
              
              <button onClick={onClose} className="btn btn-primary btn-sm">
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DatasetPreviewModal