/**
 * Datasets List Page Component
 * Shows all datasets with ability to upload new ones
 */

import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  PlusIcon,
  TableCellsIcon,
  ArrowUpTrayIcon,
  EllipsisVerticalIcon,
  CalendarIcon,
  FolderIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowPathIcon,
  DocumentChartBarIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '@/contexts/AuthContext'
import { datasetService, Dataset } from '@/services/datasetService'
import SimpleUploadModal from '@/components/dataset/SimpleUploadModal'
import DataSourceConnector from '@/components/designer/DataSourceConnector'
import DatasetPreviewModal from '@/components/dataset/DatasetPreviewModal'

const DatasetsListPage: React.FC = () => {
  const { user } = useAuth()
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showGetDataModal, setShowGetDataModal] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [previewDataset, setPreviewDataset] = useState<Dataset | null>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const workspaceId = 'ws1' // Default workspace for demo

  useEffect(() => {
    loadDatasets()
  }, [])

  const loadDatasets = async () => {
    try {
      setLoading(true)
      const data = await datasetService.getDatasets(workspaceId)
      setDatasets(data)
    } catch (error) {
      console.error('Failed to load datasets:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'processing':
        return <ClockIcon className="h-5 w-5 text-yellow-500 animate-spin" />
      case 'error':
        return <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
      default:
        return <TableCellsIcon className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ready':
        return 'Ready'
      case 'processing':
        return 'Processing'
      case 'error':
        return 'Error'
      default:
        return 'Unknown'
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleUploadDataset = () => {
    setShowUploadModal(true)
  }

  const handleGetData = () => {
    setShowGetDataModal(true)
  }

  const handleUploadSuccess = (dataset: Dataset) => {
    setDatasets(prev => [...prev, dataset])
    loadDatasets() // Refresh the list
  }

  const handlePreviewDataset = (dataset: Dataset) => {
    setPreviewDataset(dataset)
    setShowPreviewModal(true)
    setActiveDropdown(null)
  }

  const handleEditDataset = (dataset: Dataset) => {
    // TODO: Implement edit dataset functionality
    console.log('Edit dataset:', dataset.name)
    setActiveDropdown(null)
  }

  const handleDeleteDataset = async (dataset: Dataset) => {
    if (confirm(`Are you sure you want to delete "${dataset.name}"? This action cannot be undone.`)) {
      try {
        await datasetService.deleteDataset(workspaceId, dataset.id)
        setDatasets(prev => prev.filter(d => d.id !== dataset.id))
      } catch (error) {
        console.error('Failed to delete dataset:', error)
        alert('Failed to delete dataset. Please try again.')
      }
    }
    setActiveDropdown(null)
  }

  const handleRefreshDataset = async (dataset: Dataset) => {
    try {
      await datasetService.refreshDataset(workspaceId, dataset.id)
      loadDatasets() // Refresh the list to show updated status
    } catch (error) {
      console.error('Failed to refresh dataset:', error)
      alert('Failed to refresh dataset. Please try again.')
    }
    setActiveDropdown(null)
  }

  const handleUseInReport = (dataset: Dataset) => {
    // Navigate to report designer with this dataset pre-selected
    window.location.href = `/workspace/ws1/reports/new?datasetId=${dataset.id}`
    setActiveDropdown(null)
  }

  const toggleDropdown = (datasetId: string) => {
    setActiveDropdown(activeDropdown === datasetId ? null : datasetId)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveDropdown(null)
    }
    
    if (activeDropdown) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [activeDropdown])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Datasets</h1>
          <p className="text-gray-600 mt-1">
            Upload and manage your data sources
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleGetData}
            className="btn btn-primary flex items-center space-x-2"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Get Data</span>
          </button>
        </div>
      </div>

      {/* Datasets Grid */}
      {loading ? (
        <div className="card">
          <div className="card-body text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Loading datasets...</h3>
          </div>
        </div>
      ) : datasets.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-12">
            <TableCellsIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No datasets yet</h3>
            <p className="text-gray-500 mb-6">
              Connect to a data source or upload files to get started
            </p>
            <div className="flex justify-center">
              <button
                onClick={handleGetData}
                className="btn btn-primary"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Get Data
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {datasets.map((dataset) => (
            <div key={dataset.id} className="card hover:shadow-md transition-shadow">
              <div className="card-body">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <TableCellsIcon className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {dataset.name}
                      </h3>
                      <div className="flex items-center mt-1">
                        {getStatusIcon(dataset.status)}
                        <span className="ml-1 text-sm text-gray-600">
                          {getStatusText(dataset.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleDropdown(dataset.id)
                      }}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100"
                    >
                      <EllipsisVerticalIcon className="h-5 w-5" />
                    </button>
                    
                    {/* Dropdown Menu */}
                    {activeDropdown === dataset.id && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handlePreviewDataset(dataset)
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <EyeIcon className="h-4 w-4 mr-3 text-gray-400" />
                          Preview Data
                        </button>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleUseInReport(dataset)
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <DocumentChartBarIcon className="h-4 w-4 mr-3 text-gray-400" />
                          Use in Report
                        </button>
                        
                        <hr className="my-1 border-gray-100" />
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditDataset(dataset)
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Cog6ToothIcon className="h-4 w-4 mr-3 text-gray-400" />
                          Settings
                        </button>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRefreshDataset(dataset)
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <ArrowPathIcon className="h-4 w-4 mr-3 text-gray-400" />
                          Refresh
                        </button>
                        
                        <hr className="my-1 border-gray-100" />
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteDataset(dataset)
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <TrashIcon className="h-4 w-4 mr-3" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {dataset.description && (
                  <p className="text-sm text-gray-600 mb-4">
                    {dataset.description}
                  </p>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Type</span>
                    <span className="font-medium uppercase">{dataset.connector_type}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Rows</span>
                    <span className="font-medium">{dataset.row_count?.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Size</span>
                    <span className="font-medium">{formatFileSize(dataset.file_size || 0)}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                  <div className="flex items-center text-xs text-gray-500">
                    <FolderIcon className="h-4 w-4 mr-1" />
                    Workspace {dataset.workspace_id}
                  </div>
                  <div className="flex items-center text-xs text-gray-500">
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    Updated {new Date(dataset.updated_at).toLocaleDateString()}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2 mt-4">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      handlePreviewDataset(dataset)
                    }}
                    className="btn btn-outline btn-sm flex-1"
                  >
                    Preview
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      handleUseInReport(dataset)
                    }}
                    className="btn btn-primary btn-sm flex-1"
                  >
                    Use in Report
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Get Data Modal (DataSourceConnector) */}
      <DataSourceConnector
        isOpen={showGetDataModal}
        onClose={() => setShowGetDataModal(false)}
        workspaceId={workspaceId}
        onConnect={(source, config, mode, datasetId) => {
          console.log('Dataset connected:', { source, config, mode, datasetId })
          setShowGetDataModal(false)
          loadDatasets() // Refresh the datasets list
        }}
        onCancel={() => setShowGetDataModal(false)}
      />

      {/* Dataset Preview Modal */}
      <DatasetPreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        datasetId={previewDataset?.id || ''}
        datasetName={previewDataset?.name}
      />
    </div>
  )
}

export default DatasetsListPage