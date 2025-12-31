/**
 * Data Source Connector Component - Phase 1
 * Streamlined data source connection interface supporting essential file and database connectors
 * Phase 1 Connectors: CSV, Excel, JSON, PDF, PostgreSQL, MySQL, MariaDB
 */

import React, { useState } from 'react'
import {
  CircleStackIcon,
  DocumentIcon,
  TableCellsIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline'
import { datasetService } from '../../services/datasetService'
import DatabaseSchemaBrowser from '../dataset/DatabaseSchemaBrowser'

export type DataSourceType =
  // Files (Phase 1)
  | 'csv' | 'excel' | 'json' | 'pdf'
  // Databases (Phase 1)
  | 'postgresql' | 'mysql' | 'mariadb'

export type ConnectionMode = 'import' | 'directquery'

interface DataSource {
  type: DataSourceType
  name: string
  icon: React.ElementType
  category: 'file' | 'database'
  description: string
  supportedModes: ConnectionMode[]
}

interface ConnectionConfig {
  // Database fields
  host?: string
  database?: string
  username?: string
  password?: string
  port?: number
  ssl_enabled?: boolean

  // File fields
  file?: File
  filePath?: string

  [key: string]: any
}

interface DataSourceConnectorProps {
  onConnect: (source: DataSource, config: ConnectionConfig, mode: ConnectionMode, datasetId?: string) => void
  onCancel: () => void
  onClose?: () => void
  isOpen: boolean
  workspaceId: string
}

const DataSourceConnector: React.FC<DataSourceConnectorProps> = ({
  onConnect,
  onCancel,
  onClose,
  isOpen,
  workspaceId
}) => {
  const handleCancel = () => {
    if (onClose) {
      onClose()
    }
    onCancel()
  }

  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedSource, setSelectedSource] = useState<DataSource | null>(null)
  const [connectionConfig, setConnectionConfig] = useState<ConnectionConfig>({})
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('import')
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [step, setStep] = useState<'select-source' | 'configure' | 'schema-browser' | 'preview'>('select-source')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showSchemaBrowser, setShowSchemaBrowser] = useState(false)

  // Phase 1 Data Sources
  const dataSources: DataSource[] = [
    // ========== FILE SOURCES (Phase 1) ==========
    {
      type: 'csv',
      name: 'CSV',
      icon: DocumentIcon,
      category: 'file',
      description: 'Import data from CSV files (comma-separated values)',
      supportedModes: ['import']
    },
    {
      type: 'excel',
      name: 'Excel',
      icon: DocumentIcon,
      category: 'file',
      description: 'Import data from Excel workbooks (.xlsx, .xls)',
      supportedModes: ['import']
    },
    {
      type: 'json',
      name: 'JSON',
      icon: DocumentIcon,
      category: 'file',
      description: 'Import data from JSON files (supports flat and nested structures)',
      supportedModes: ['import']
    },
    {
      type: 'pdf',
      name: 'PDF',
      icon: DocumentIcon,
      category: 'file',
      description: 'Extract tables from PDF files (simple tabular layouts)',
      supportedModes: ['import']
    },

    // ========== DATABASE SOURCES (Phase 1) ==========
    {
      type: 'postgresql',
      name: 'PostgreSQL',
      icon: CircleStackIcon,
      category: 'database',
      description: 'Connect to PostgreSQL databases',
      supportedModes: ['import', 'directquery']
    },
    {
      type: 'mysql',
      name: 'MySQL',
      icon: CircleStackIcon,
      category: 'database',
      description: 'Connect to MySQL databases',
      supportedModes: ['import', 'directquery']
    },
    {
      type: 'mariadb',
      name: 'MariaDB',
      icon: CircleStackIcon,
      category: 'database',
      description: 'Connect to MariaDB databases (MySQL compatible)',
      supportedModes: ['import', 'directquery']
    }
  ]

  const categories = [
    { id: 'all', name: 'All', icon: TableCellsIcon },
    { id: 'file', name: 'File', icon: DocumentIcon },
    { id: 'database', name: 'Database', icon: CircleStackIcon }
  ]

  const filteredSources = dataSources.filter(
    source => selectedCategory === 'all' || source.category === selectedCategory
  )

  const handleSourceSelect = (source: DataSource) => {
    setSelectedSource(source)
    setConnectionConfig({})
    setConnectionStatus('idle')
    setErrorMessage('')
    setStep('configure')

    // Set default connection mode
    const defaultMode = source.supportedModes[0]
    if (defaultMode) {
      setConnectionMode(defaultMode)
    }

    // Pre-fill example credentials for PostgreSQL (for testing)
    if (source.type === 'postgresql') {
      setConnectionConfig({
        host: 'localhost',
        port: 5432,
        database: 'syntra',
        username: 'syntra',
        password: 'syntra123'
      })
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setConnectionConfig({ ...connectionConfig, file })
    }
  }

  const handleConfigChange = (field: string, value: any) => {
    setConnectionConfig(prev => ({ ...prev, [field]: value }))
  }

  const handleTestConnection = async () => {
    if (!selectedSource) return

    setIsConnecting(true)
    setConnectionStatus('testing')
    setErrorMessage('')

    try {
      // For file sources, just validate file is selected
      if (selectedSource.category === 'file') {
        if (!selectedFile) {
          throw new Error('Please select a file')
        }
        setConnectionStatus('success')
        return
      }

      // For database sources, test connection via API
      const result = await datasetService.testConnection(selectedSource.type, connectionConfig)

      if (result.success) {
        setConnectionStatus('success')
      } else {
        setConnectionStatus('error')
        setErrorMessage(result.message || 'Connection test failed')
      }
    } catch (error: any) {
      setConnectionStatus('error')
      setErrorMessage(error.message || 'Connection test failed')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleProceedToSchemaBrowser = () => {
    setShowSchemaBrowser(true)
    setStep('schema-browser')
  }

  const handleSchemaImport = async (selectedTables: Array<{ schema: string; table: string }>) => {
    if (!selectedSource) return

    setIsConnecting(true)
    try {
      // TODO: Create new endpoint for database table import
      // For now, use the existing createDatabaseDataset endpoint
      const dataset = await datasetService.createDatabaseDataset(
        workspaceId,
        `${connectionConfig.database} - ${selectedTables.length} tables`,
        selectedSource.type,
        {
          ...connectionConfig,
          selected_tables: selectedTables
        }
      )

      onConnect(selectedSource, connectionConfig, connectionMode, dataset.id)
    } catch (error: any) {
      setConnectionStatus('error')
      setErrorMessage(error.message || 'Import failed')
    } finally {
      setIsConnecting(false)
      setShowSchemaBrowser(false)
    }
  }

  const handleConnect = async () => {
    if (!selectedSource) return

    setIsConnecting(true)
    try {
      let datasetId: string | undefined

      // Handle file upload
      if (selectedSource.category === 'file' && selectedFile) {
        const formData = new FormData()
        formData.append('file', selectedFile)
        formData.append('name', selectedFile.name)

        const dataset = await datasetService.uploadDataset(workspaceId, selectedFile, selectedFile.name)
        datasetId = dataset.id

        onConnect(selectedSource, connectionConfig, connectionMode, datasetId)
      }
      // For database connections, show schema browser instead
      else if (selectedSource.category === 'database') {
        // Connection already tested, proceed to schema browser
        handleProceedToSchemaBrowser()
        return
      }
    } catch (error: any) {
      setConnectionStatus('error')
      setErrorMessage(error.message || 'Connection failed')
    } finally {
      setIsConnecting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-6 border w-11/12 max-w-6xl shadow-lg rounded-lg bg-white">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {step === 'select-source' ? 'Get Data' : `Connect to ${selectedSource?.name}`}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {step === 'select-source'
                ? 'Select a data source to get started (Phase 1: Essential connectors)'
                : 'Configure your connection settings'}
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Step 1: Select Source */}
        {step === 'select-source' && (
          <div>
            {/* Category Filters */}
            <div className="flex space-x-2 mb-6">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center px-4 py-2 rounded-lg border ${
                    selectedCategory === cat.id
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <cat.icon className="w-5 h-5 mr-2" />
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Data Source Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {filteredSources.map(source => (
                <button
                  key={source.type}
                  onClick={() => handleSourceSelect(source)}
                  className="flex items-start p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition text-left"
                >
                  <source.icon className="w-8 h-8 text-blue-600 mr-3 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{source.name}</h3>
                    <p className="text-xs text-gray-600 mt-1">{source.description}</p>
                    <div className="flex items-center mt-2 text-xs text-gray-500">
                      <span className="bg-gray-100 px-2 py-1 rounded">
                        {source.category}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Configure Connection */}
        {step === 'configure' && selectedSource && (
          <div>
            <div className="mb-6">
              <button
                onClick={() => setStep('select-source')}
                className="text-blue-600 hover:text-blue-800 text-sm mb-4"
              >
                ← Back to source selection
              </button>
            </div>

            {/* Connection Mode Selection */}
            {selectedSource.supportedModes.length > 1 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Connection Mode
                </label>
                <div className="flex space-x-4">
                  {selectedSource.supportedModes.map(mode => (
                    <label key={mode} className="flex items-center">
                      <input
                        type="radio"
                        name="connectionMode"
                        value={mode}
                        checked={connectionMode === mode}
                        onChange={(e) => setConnectionMode(e.target.value as ConnectionMode)}
                        className="mr-2"
                      />
                      <span className="text-sm capitalize">{mode.replace('-', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* File Upload Form */}
            {selectedSource.category === 'file' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select File
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-500 transition">
                    <div className="space-y-1 text-center">
                      <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                          <span>Upload a file</span>
                          <input
                            type="file"
                            className="sr-only"
                            accept={
                              selectedSource.type === 'csv' ? '.csv' :
                              selectedSource.type === 'excel' ? '.xlsx,.xls' :
                              selectedSource.type === 'json' ? '.json' :
                              selectedSource.type === 'pdf' ? '.pdf' : '*'
                            }
                            onChange={handleFileSelect}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        {selectedSource.type.toUpperCase()} file (max 100MB)
                      </p>
                      {selectedFile && (
                        <p className="text-sm text-green-600 mt-2">
                          Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Database Connection Form */}
            {selectedSource.category === 'database' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Host *
                    </label>
                    <input
                      type="text"
                      value={connectionConfig.host || ''}
                      onChange={(e) => handleConfigChange('host', e.target.value)}
                      placeholder="localhost"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Port
                    </label>
                    <input
                      type="number"
                      value={connectionConfig.port || (
                        selectedSource.type === 'postgresql' ? 5432 :
                        selectedSource.type === 'mysql' || selectedSource.type === 'mariadb' ? 3306 : ''
                      )}
                      onChange={(e) => handleConfigChange('port', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Database *
                  </label>
                  <input
                    type="text"
                    value={connectionConfig.database || ''}
                    onChange={(e) => handleConfigChange('database', e.target.value)}
                    placeholder="database_name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username *
                    </label>
                    <input
                      type="text"
                      value={connectionConfig.username || ''}
                      onChange={(e) => handleConfigChange('username', e.target.value)}
                      placeholder="username"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password *
                    </label>
                    <input
                      type="password"
                      value={connectionConfig.password || ''}
                      onChange={(e) => handleConfigChange('password', e.target.value)}
                      placeholder="password"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="ssl_enabled"
                    checked={connectionConfig.ssl_enabled || false}
                    onChange={(e) => handleConfigChange('ssl_enabled', e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="ssl_enabled" className="text-sm text-gray-700">
                    Enable SSL/TLS
                  </label>
                </div>

                {/* Test Connection Button */}
                <div>
                  <button
                    onClick={handleTestConnection}
                    disabled={isConnecting}
                    className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {isConnecting ? 'Testing...' : 'Test Connection'}
                  </button>

                  {/* Connection Status */}
                  {connectionStatus === 'success' && (
                    <div className="mt-3 flex items-center text-green-600 text-sm">
                      <CheckCircleIcon className="w-5 h-5 mr-2" />
                      Connection successful!
                    </div>
                  )}
                  {connectionStatus === 'error' && (
                    <div className="mt-3 flex items-center text-red-600 text-sm">
                      <XCircleIcon className="w-5 h-5 mr-2" />
                      {errorMessage || 'Connection failed'}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConnect}
                disabled={
                  isConnecting ||
                  (selectedSource.category === 'file' && !selectedFile) ||
                  (selectedSource.category === 'database' && connectionStatus !== 'success')
                }
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isConnecting
                  ? 'Connecting...'
                  : selectedSource.category === 'database'
                    ? 'Browse Tables'
                    : 'Import'}
              </button>
            </div>
          </div>
        )}

        {/* Schema Browser (for database connectors) */}
        {showSchemaBrowser && selectedSource && step === 'schema-browser' && (
          <DatabaseSchemaBrowser
            connectorType={selectedSource.type}
            connectionConfig={connectionConfig}
            onImport={handleSchemaImport}
            onCancel={() => {
              setShowSchemaBrowser(false)
              setStep('configure')
            }}
          />
        )}
      </div>
    </div>
  )
}

export default DataSourceConnector
