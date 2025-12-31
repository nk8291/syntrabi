/**
 * Database Connection Modal Component - Phase 1
 * Modal for configuring database connections
 * Phase 1 Databases: PostgreSQL, MySQL, MariaDB
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

// Phase 1 Database Templates
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
    id: 'mariadb',
    name: 'MariaDB',
    description: 'Connect to MariaDB database (MySQL compatible)',
    icon: '🦭',
    defaultPort: 3306,
    supportsSSL: true,
    requiresSchema: false,
    connectionStringExample: 'mysql://user:password@host:3306/database'
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
      const result = await datasetService.testConnection(selectedConnector.id, {
        host: config.host,
        port: config.port,
        database: config.database,
        username: config.username,
        password: config.password,
        schema: config.schema,
        ssl_enabled: config.ssl
      })

      if (result.success) {
        setConnectionStatus('success')
        toast.success('Connection successful!')
      } else {
        setConnectionStatus('error')
        setConnectionError(result.message || 'Connection test failed')
        toast.error(result.message || 'Connection test failed')
      }
    } catch (error: any) {
      setConnectionStatus('error')
      const errorMessage = error.response?.data?.detail || error.message || 'Connection test failed'
      setConnectionError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsTestingConnection(false)
    }
  }

  const createConnection = async () => {
    if (!config.host || !config.database || !config.username || !datasetName) {
      toast.error('Please fill in all required fields')
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
          schema: config.schema,
          ssl_enabled: config.ssl,
          connection_timeout: config.connection_timeout,
          query_timeout: config.query_timeout
        }
      )

      toast.success(`Database connection "${datasetName}" created successfully!`)
      onSuccess(dataset)
      handleClose()
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to create database connection'
      toast.error(errorMessage)
      console.error('Failed to create database connection:', error)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleClose = () => {
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
    setConnectionStatus('idle')
    setConnectionError('')
    setShowPassword(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-6 border w-full max-w-2xl shadow-lg rounded-lg bg-white">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <CircleStackIcon className="w-6 h-6 text-blue-600 mr-2" />
            <h2 className="text-2xl font-bold text-gray-900">Database Connection</h2>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Database Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Database Type
          </label>
          <div className="grid grid-cols-3 gap-3">
            {connectionTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleConnectorChange(template)}
                className={`p-4 border rounded-lg text-left transition ${
                  selectedConnector.id === template.id
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-1">{template.icon}</div>
                <div className="font-semibold text-sm">{template.name}</div>
                <div className="text-xs text-gray-500 mt-1">{template.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Dataset Name */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Connection Name *
          </label>
          <input
            type="text"
            value={datasetName}
            onChange={(e) => setDatasetName(e.target.value)}
            placeholder={`${selectedConnector.name} Connection`}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Connection Details */}
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Host *
              </label>
              <input
                type="text"
                value={config.host}
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
                value={config.port}
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
              value={config.database}
              onChange={(e) => handleConfigChange('database', e.target.value)}
              placeholder="database_name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {selectedConnector.requiresSchema && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Schema (optional for PostgreSQL)
              </label>
              <input
                type="text"
                value={config.schema}
                onChange={(e) => handleConfigChange('schema', e.target.value)}
                placeholder="public"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username *
              </label>
              <input
                type="text"
                value={config.username}
                onChange={(e) => handleConfigChange('username', e.target.value)}
                placeholder="username"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  placeholder="password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Advanced Options */}
          <details className="border border-gray-200 rounded-md p-3">
            <summary className="cursor-pointer font-medium text-sm text-gray-700">
              Advanced Options
            </summary>
            <div className="mt-3 space-y-3">
              {selectedConnector.supportsSSL && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="ssl"
                    checked={config.ssl}
                    onChange={(e) => handleConfigChange('ssl', e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="ssl" className="text-sm text-gray-700">
                    Enable SSL/TLS
                  </label>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Connection Timeout (seconds)
                  </label>
                  <input
                    type="number"
                    value={config.connection_timeout}
                    onChange={(e) => handleConfigChange('connection_timeout', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Query Timeout (seconds)
                  </label>
                  <input
                    type="number"
                    value={config.query_timeout}
                    onChange={(e) => handleConfigChange('query_timeout', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Connection String Example */}
              <div className="mt-3 p-3 bg-gray-50 rounded-md">
                <div className="flex items-start">
                  <InformationCircleIcon className="w-5 h-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-medium text-gray-700 mb-1">Connection String Format:</div>
                    <code className="text-xs text-gray-600 break-all">
                      {selectedConnector.connectionStringExample}
                    </code>
                  </div>
                </div>
              </div>
            </div>
          </details>
        </div>

        {/* Connection Status */}
        {connectionStatus === 'success' && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center">
            <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2" />
            <span className="text-sm text-green-800">Connection test successful!</span>
          </div>
        )}

        {connectionStatus === 'error' && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start">
            <ExclamationCircleIcon className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-red-800">Connection test failed</div>
              <div className="text-xs text-red-600 mt-1">{connectionError}</div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between space-x-3">
          <button
            onClick={testConnection}
            disabled={isTestingConnection || isConnecting}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isTestingConnection ? (
              <>
                <LoadingSpinner className="mr-2" />
                Testing Connection...
              </>
            ) : (
              'Test Connection'
            )}
          </button>
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            disabled={isConnecting}
          >
            Cancel
          </button>
          <button
            onClick={createConnection}
            disabled={isConnecting || connectionStatus !== 'success'}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isConnecting ? (
              <>
                <LoadingSpinner className="mr-2" />
                Creating...
              </>
            ) : (
              'Create Connection'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DatabaseConnectionModal
