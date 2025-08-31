/**
 * Dataset Manager Component
 * Comprehensive dataset management interface with Import/DirectQuery modes
 */

import React, { useState, useEffect } from 'react'
import {
  PlusIcon,
  ArrowUpTrayIcon,
  ServerIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  ArrowPathIcon,
  EyeIcon,
  DocumentArrowDownIcon,
  CircleStackIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline'
import { Dataset, datasetService } from '@/services/datasetService'
import DatasetUploadModal from './DatasetUploadModal'
import DatabaseConnectionModal from './DatabaseConnectionModal'
import DatasetPreviewModal from './DatasetPreviewModal'

interface DatasetManagerProps {
  workspaceId: string
  onDatasetSelect?: (dataset: Dataset) => void
}

const DatasetManager: React.FC<DatasetManagerProps> = ({
  workspaceId,
  onDatasetSelect
}) => {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'ready' | 'processing' | 'error'>('all')
  const [filterType, setFilterType] = useState<'all' | 'import' | 'directquery'>('all')
  
  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showDatabaseModal, setShowDatabaseModal] = useState(false)
  const [previewDataset, setPreviewDataset] = useState<Dataset | null>(null)

  useEffect(() => {
    loadDatasets()
  }, [workspaceId])

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

  const handleDatasetUpload = async (file: File, name: string, mode: 'import' | 'directquery') => {
    try {
      const newDataset = await datasetService.uploadDataset(workspaceId, file, name)
      setDatasets(prev => [...prev, newDataset])
      setShowUploadModal(false)
    } catch (error) {
      console.error('Failed to upload dataset:', error)
    }
  }

  const handleDatabaseConnection = async (config: any) => {
    try {
      const newDataset = await datasetService.createDatabaseDataset(
        workspaceId,
        config.name,
        config.connector_type,
        config.connection_config
      )
      setDatasets(prev => [...prev, newDataset])
      setShowDatabaseModal(false)
    } catch (error) {
      console.error('Failed to create database connection:', error)
    }
  }

  const handleDeleteDataset = async (dataset: Dataset) => {
    if (window.confirm(`Are you sure you want to delete "${dataset.name}"?`)) {
      try {
        await datasetService.deleteDataset(workspaceId, dataset.id)
        setDatasets(prev => prev.filter(d => d.id !== dataset.id))
      } catch (error) {
        console.error('Failed to delete dataset:', error)
      }
    }
  }

  const handleRefreshDataset = async (dataset: Dataset) => {
    try {
      const refreshedDataset = await datasetService.refreshDataset(workspaceId, dataset.id)
      setDatasets(prev => prev.map(d => d.id === dataset.id ? refreshedDataset : d))
    } catch (error) {
      console.error('Failed to refresh dataset:', error)
    }
  }

  const handlePreviewDataset = (dataset: Dataset) => {
    setPreviewDataset(dataset)
  }

  const filteredDatasets = datasets.filter(dataset => {
    const matchesSearch = dataset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         dataset.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === 'all' || dataset.status === filterStatus
    const matchesType = filterType === 'all' || 
      (filterType === 'import' && ['csv', 'excel', 'json'].includes(dataset.connector_type)) ||
      (filterType === 'directquery' && !['csv', 'excel', 'json'].includes(dataset.connector_type))
    
    return matchesSearch && matchesStatus && matchesType
  })

  const getStatusColor = (status: Dataset['status']) => {
    switch (status) {
      case 'ready': return 'text-green-600 bg-green-50'
      case 'processing': return 'text-blue-600 bg-blue-50'
      case 'error': return 'text-red-600 bg-red-50'
      case 'refreshing': return 'text-yellow-600 bg-yellow-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getConnectorIcon = (connectorType: string) => {
    switch (connectorType) {
      case 'csv': return '📄'
      case 'excel': return '📊'
      case 'json': return '📋'
      case 'postgresql': return '🐘'
      case 'mysql': return '🐬'
      case 'bigquery': return '🔍'
      case 'snowflake': return '❄️'
      case 'rest_api': return '🌐'
      default: return '📦'
    }
  }

  const getDatasetMode = (dataset: Dataset): 'Import' | 'DirectQuery' => {
    return ['csv', 'excel', 'json'].includes(dataset.connector_type) ? 'Import' : 'DirectQuery'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600">Loading datasets...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Dataset Manager</h2>
          <p className="text-sm text-gray-600">Manage your data sources and datasets</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn btn-primary flex items-center space-x-2"
          >
            <ArrowUpTrayIcon className="h-4 w-4" />
            <span>Upload Data</span>
          </button>
          <button
            onClick={() => setShowDatabaseModal(true)}
            className="btn btn-outline flex items-center space-x-2"
          >
            <ServerIcon className="h-4 w-4" />
            <span>Connect Database</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-wrap items-center space-x-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search datasets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="input w-32"
            >
              <option value="all">All</option>
              <option value="ready">Ready</option>
              <option value="processing">Processing</option>
              <option value="error">Error</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Mode:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="input w-32"
            >
              <option value="all">All</option>
              <option value="import">Import</option>
              <option value="directquery">DirectQuery</option>
            </select>
          </div>
        </div>
      </div>

      {/* Dataset Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDatasets.map((dataset) => (
          <div
            key={dataset.id}
            className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
          >
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{getConnectorIcon(dataset.connector_type)}</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {dataset.name}
                    </h3>
                    <p className="text-xs text-gray-500 truncate">
                      {dataset.connector_type.toUpperCase()}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col items-end space-y-1">
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(dataset.status)}`}>
                    {dataset.status}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full ${ 
                    getDatasetMode(dataset) === 'Import' 
                      ? 'text-blue-600 bg-blue-50' 
                      : 'text-purple-600 bg-purple-50'
                  }`}>
                    {getDatasetMode(dataset)}
                  </span>
                </div>
              </div>

              {dataset.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {dataset.description}
                </p>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                <span>{dataset.row_count?.toLocaleString()} rows</span>
                <span>{new Date(dataset.updated_at).toLocaleDateString()}</span>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handlePreviewDataset(dataset)}
                  className="flex-1 btn btn-sm btn-outline flex items-center justify-center space-x-1"
                  title="Preview data"
                >
                  <EyeIcon className="h-3 w-3" />
                  <span>Preview</span>
                </button>
                
                <button
                  onClick={() => handleRefreshDataset(dataset)}
                  className="btn btn-sm btn-outline p-2"
                  title="Refresh dataset"
                  disabled={dataset.status === 'processing' || dataset.status === 'refreshing'}
                >
                  <ArrowPathIcon className="h-3 w-3" />
                </button>
                
                <button
                  onClick={() => onDatasetSelect?.(dataset)}
                  className="btn btn-sm btn-primary p-2"
                  title="Use in report"
                >
                  <CircleStackIcon className="h-3 w-3" />
                </button>
                
                <button
                  onClick={() => handleDeleteDataset(dataset)}
                  className="btn btn-sm text-red-600 hover:bg-red-50 p-2"
                  title="Delete dataset"
                >
                  <TrashIcon className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredDatasets.length === 0 && (
        <div className="text-center py-12">
          <CloudArrowUpIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No datasets found</h3>
          <p className="text-gray-600 mb-6">
            {searchQuery || filterStatus !== 'all' || filterType !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Get started by uploading a file or connecting to a database'}
          </p>
          <div className="flex justify-center space-x-3">
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn btn-primary"
            >
              Upload Data
            </button>
            <button
              onClick={() => setShowDatabaseModal(true)}
              className="btn btn-outline"
            >
              Connect Database
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showUploadModal && (
        <DatasetUploadModal
          onClose={() => setShowUploadModal(false)}
          onUpload={handleDatasetUpload}
        />
      )}
      
      {showDatabaseModal && (
        <DatabaseConnectionModal
          onClose={() => setShowDatabaseModal(false)}
          onConnect={handleDatabaseConnection}
        />
      )}
      
      {previewDataset && (
        <DatasetPreviewModal
          dataset={previewDataset}
          onClose={() => setPreviewDataset(null)}
        />
      )}
    </div>
  )
}

export default DatasetManager