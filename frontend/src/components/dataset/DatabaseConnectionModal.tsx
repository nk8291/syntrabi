/**
 * Database Connection Modal Component
 * Modal for configuring database connections
 */

import React, { useState } from 'react'
import { 
  XMarkIcon, 
  CircleStackIcon, 
  EyeIcon, 
  EyeSlashIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { datasetService } from '@/services/datasetService'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import toast from 'react-hot-toast'

interface DatabaseConnectionModalProps {
  isOpen: boolean
  onClose: () => void
  workspaceId: string
  onSuccess: (dataset: any) => void
}

interface DatabaseConfig {
  host: string
  port: number
  database: string
  username: string
  password: string
  schema?: string
  ssl?: boolean
  connection_timeout?: number
  query_timeout?: number
}

interface ConnectionTemplate {
  id: string
  name: string
  description: string
  icon: string
  defaultPort: number
  supportsSSL: boolean
  requiresSchema: boolean
  connectionStringExample: string
}

const connectionTemplates: ConnectionTemplate[] = [
  {
    id: 'postgresql',
    name: 'PostgreSQL',
    description: 'Connect to PostgreSQL database',
    icon: '🐘',
    defaultPort: 5432,
    supportsSSL: true,
    requiresSchema: true,
    connectionStringExample: 'postgresql://user:password@host:5432/database'
  },
  {
    id: 'mysql',
    name: 'MySQL',
    description: 'Connect to MySQL database',
    icon: '🐬',
    defaultPort: 3306,
    supportsSSL: true,
    requiresSchema: false,
    connectionStringExample: 'mysql://user:password@host:3306/database'
  },
  {
    id: 'bigquery',
    name: 'Google BigQuery',
    description: 'Connect to Google BigQuery',
    icon: '📊',
    defaultPort: 443,
    supportsSSL: true,
    requiresSchema: false,
    connectionStringExample: 'bigquery://project_id/dataset_id'
  },
  {
    id: 'snowflake',
    name: 'Snowflake',
    description: 'Connect to Snowflake data warehouse',
    icon: '❄️',
    defaultPort: 443,
    supportsSSL: true,
    requiresSchema: true,
    connectionStringExample: 'snowflake://user:password@account.region.snowflakecomputing.com/database/schema'
  }
]

const DatabaseConnectionModal: React.FC<DatabaseConnectionModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  onSuccess,
}) => {
  const [selectedConnector, setSelectedConnector] = useState<ConnectionTemplate>(connectionTemplates[0])
  const [datasetName, setDatasetName] = useState('')
  const [config, setConfig] = useState<DatabaseConfig>({
    host: '',
    port: connectionTemplates[0].defaultPort,
    database: '',
    username: '',
    password: '',
    schema: '',
    ssl: true,
    connection_timeout: 30,
    query_timeout: 300
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [connectionError, setConnectionError] = useState<string>('')

  const handleConnectorChange = (connector: ConnectionTemplate) => {
    setSelectedConnector(connector)
    setConfig(prev => ({
      ...prev,
      port: connector.defaultPort,
      ssl: connector.supportsSSL,
      schema: connector.requiresSchema ? prev.schema : ''
    }))
    setDatasetName(`${connector.name} Connection`)
    setConnectionStatus('idle')
    setConnectionError('')
  }

  const handleConfigChange = (field: keyof DatabaseConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }))
    setConnectionStatus('idle')
    setConnectionError('')
  }

  const testConnection = async () => {
    if (!config.host || !config.database || !config.username) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsTestingConnection(true)
    setConnectionStatus('idle')
    setConnectionError('')

    try {
      // Simulate connection test - in real app this would call backend
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Mock success/failure based on config validity
      if (config.host.includes('localhost') || config.host.includes('127.0.0.1')) {
        throw new Error('Connection refused: Unable to connect to localhost')
      }
      
      setConnectionStatus('success')
      toast.success('Connection test successful!')
    } catch (error: any) {
      setConnectionStatus('error')
      setConnectionError(error.message || 'Connection test failed')
      toast.error('Connection test failed')
    } finally {
      setIsTestingConnection(false)
    }
  }

  const handleConnect = async () => {
    if (!datasetName.trim()) {
      toast.error('Please provide a dataset name')
      return
    }

    if (connectionStatus !== 'success') {
      toast.error('Please test the connection first')
      return
    }

    setIsConnecting(true)
    try {
      const dataset = await datasetService.createDatabaseDataset(
        workspaceId,
        datasetName,
        selectedConnector.id,
        {
          host: config.host,
          port: config.port,
          database: config.database,
          username: config.username,
          password: config.password,
          schema: config.schema || undefined,
          ssl: config.ssl,
          connection_timeout: config.connection_timeout,
          query_timeout: config.query_timeout
        }
      )
      
      toast.success('Database connection created successfully!')
      onSuccess(dataset)
      onClose()
      resetForm()
    } catch (error: any) {
      toast.error(error.message || 'Failed to create database connection')
    } finally {
      setIsConnecting(false)
    }
  }

  const resetForm = () => {
    setSelectedConnector(connectionTemplates[0])
    setDatasetName('')
    setConfig({
      host: '',
      port: connectionTemplates[0].defaultPort,
      database: '',
      username: '',
      password: '',
      schema: '',
      ssl: true,
      connection_timeout: 30,
      query_timeout: 300
    })
    setShowPassword(false)
    setConnectionStatus('idle')
    setConnectionError('')
  }

  const handleClose = () => {
    if (!isConnecting && !isTestingConnection) {
      onClose()
      resetForm()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CircleStackIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Database Connection</h2>
              <p className="text-sm text-gray-500">Connect to your database to import data</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isConnecting || isTestingConnection}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
            {/* Connector Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Database Type</h3>
              <div className="space-y-2">
                {connectionTemplates.map((connector) => (
                  <button
                    key={connector.id}
                    onClick={() => handleConnectorChange(connector)}
                    disabled={isConnecting || isTestingConnection}
                    className={`w-full p-3 border-2 rounded-lg text-left transition-all hover:shadow-sm disabled:opacity-50 ${
                      selectedConnector.id === connector.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-primary-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{connector.icon}</div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900">{connector.name}</h4>
                        <p className="text-xs text-gray-500 mt-1">{connector.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Connection Configuration */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Connection Details</h3>
                <div className="space-y-4">
                  {/* Dataset Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dataset Name *
                    </label>
                    <input
                      type="text"
                      value={datasetName}
                      onChange={(e) => setDatasetName(e.target.value)}
                      className="input w-full"
                      placeholder="Enter dataset name"
                      disabled={isConnecting || isTestingConnection}
                    />
                  </div>

                  {/* Host and Port */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Host *
                      </label>
                      <input
                        type="text"
                        value={config.host}
                        onChange={(e) => handleConfigChange('host', e.target.value)}
                        className="input w-full"
                        placeholder="database.example.com"
                        disabled={isConnecting || isTestingConnection}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Port *
                      </label>
                      <input
                        type="number"
                        value={config.port}
                        onChange={(e) => handleConfigChange('port', parseInt(e.target.value))}
                        className="input w-full"
                        disabled={isConnecting || isTestingConnection}
                      />
                    </div>
                  </div>

                  {/* Database and Schema */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Database *
                      </label>
                      <input
                        type="text"
                        value={config.database}
                        onChange={(e) => handleConfigChange('database', e.target.value)}
                        className="input w-full"
                        placeholder="database_name"
                        disabled={isConnecting || isTestingConnection}
                      />
                    </div>
                    {selectedConnector.requiresSchema && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Schema
                        </label>
                        <input
                          type="text"
                          value={config.schema || ''}
                          onChange={(e) => handleConfigChange('schema', e.target.value)}
                          className="input w-full"
                          placeholder="public"
                          disabled={isConnecting || isTestingConnection}
                        />
                      </div>
                    )}
                  </div>

                  {/* Username and Password */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Username *
                      </label>
                      <input
                        type="text"
                        value={config.username}
                        onChange={(e) => handleConfigChange('username', e.target.value)}
                        className="input w-full"
                        placeholder="username"
                        disabled={isConnecting || isTestingConnection}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={config.password}
                          onChange={(e) => handleConfigChange('password', e.target.value)}
                          className="input w-full pr-10"
                          placeholder="password"
                          disabled={isConnecting || isTestingConnection}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showPassword ? (
                            <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                          ) : (
                            <EyeIcon className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Advanced Options */}
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-800 mb-3">Advanced Options</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedConnector.supportsSSL && (
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="ssl"
                            checked={config.ssl || false}
                            onChange={(e) => handleConfigChange('ssl', e.target.checked)}
                            disabled={isConnecting || isTestingConnection}
                            className="checkbox"
                          />
                          <label htmlFor="ssl" className="ml-2 text-sm text-gray-700">
                            Use SSL/TLS encryption
                          </label>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Connection Timeout (seconds)
                        </label>
                        <input
                          type="number"
                          value={config.connection_timeout}
                          onChange={(e) => handleConfigChange('connection_timeout', parseInt(e.target.value))}
                          className="input w-full"
                          min="5"
                          max="300"
                          disabled={isConnecting || isTestingConnection}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Connection Status */}
                  {connectionStatus !== 'idle' && (
                    <div className={`p-3 rounded-lg border ${
                      connectionStatus === 'success' 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-center space-x-2">
                        {connectionStatus === 'success' ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                        ) : (
                          <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                        )}
                        <div>
                          <p className={`text-sm font-medium ${
                            connectionStatus === 'success' ? 'text-green-800' : 'text-red-800'
                          }`}>
                            {connectionStatus === 'success' ? 'Connection Successful' : 'Connection Failed'}
                          </p>
                          {connectionError && (
                            <p className="text-xs text-red-700 mt-1">{connectionError}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Connection String Example */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-start space-x-2">
                      <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-blue-800">Connection Example</h4>
                        <p className="text-xs text-blue-700 mt-1 font-mono">
                          {selectedConnector.connectionStringExample}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-6 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Connect to {selectedConnector.name} database
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleClose}
                disabled={isConnecting || isTestingConnection}
                className="btn btn-outline"
              >
                Cancel
              </button>
              
              <button
                onClick={testConnection}
                disabled={isTestingConnection || !config.host || !config.database || !config.username}
                className="btn btn-outline flex items-center space-x-2"
              >
                {isTestingConnection ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Testing...</span>
                  </>
                ) : (
                  <>
                    <CircleStackIcon className="h-4 w-4" />
                    <span>Test Connection</span>
                  </>
                )}
              </button>
              
              <button
                onClick={handleConnect}
                disabled={isConnecting || connectionStatus !== 'success' || !datasetName.trim()}
                className="btn btn-primary flex items-center space-x-2"
              >
                {isConnecting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <CircleStackIcon className="h-4 w-4" />
                    <span>Connect</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DatabaseConnectionModal