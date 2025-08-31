/**
 * Database Connection Modal
 * Modal for connecting to databases with Import and DirectQuery modes
 */

import React, { useState } from 'react'
import {
  XMarkIcon,
  ServerIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface DatabaseConnectionModalProps {
  onClose: () => void
  onConnect: (config: any) => Promise<void>
}

interface ConnectionConfig {
  name: string
  description: string
  connector_type: string
  mode: 'import' | 'directquery'
  connection_config: {
    host: string
    port: number
    database: string
    username: string
    password: string
    ssl?: boolean
    additional_params?: string
  }
}

const DATABASE_TYPES = [
  {
    id: 'postgresql',
    name: 'PostgreSQL',
    icon: '🐘',
    defaultPort: 5432,
    description: 'Connect to PostgreSQL database'
  },
  {
    id: 'mysql',
    name: 'MySQL',
    icon: '🐬',
    defaultPort: 3306,
    description: 'Connect to MySQL database'
  },
  {
    id: 'bigquery',
    name: 'Google BigQuery',
    icon: '🔍',
    defaultPort: 0,
    description: 'Connect to Google BigQuery'
  },
  {
    id: 'snowflake',
    name: 'Snowflake',
    icon: '❄️',
    defaultPort: 443,
    description: 'Connect to Snowflake data warehouse'
  }
]

const DatabaseConnectionModal: React.FC<DatabaseConnectionModalProps> = ({
  onClose,
  onConnect
}) => {
  const [step, setStep] = useState<'select' | 'configure' | 'test'>('select')
  const [selectedType, setSelectedType] = useState<string>('')
  const [config, setConfig] = useState<ConnectionConfig>({
    name: '',
    description: '',
    connector_type: '',
    mode: 'import',
    connection_config: {
      host: '',
      port: 5432,
      database: '',
      username: '',
      password: '',
      ssl: true
    }
  })
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)
  const [connecting, setConnecting] = useState(false)

  const handleTypeSelect = (type: any) => {
    setSelectedType(type.id)
    setConfig(prev => ({
      ...prev,
      connector_type: type.id,
      name: `${type.name} Connection`,
      connection_config: {
        ...prev.connection_config,
        port: type.defaultPort
      }
    }))
    setStep('configure')
  }

  const handleConfigChange = (field: string, value: any) => {
    if (field.startsWith('connection_config.')) {
      const configField = field.replace('connection_config.', '')
      setConfig(prev => ({
        ...prev,
        connection_config: {
          ...prev.connection_config,
          [configField]: value
        }
      }))
    } else {
      setConfig(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)
    
    try {
      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 2000))
      setTestResult('success')
    } catch (error) {
      setTestResult('error')
    } finally {
      setTesting(false)
    }
  }

  const handleConnect = async () => {
    try {
      setConnecting(true)
      await onConnect(config)
    } catch (error) {
      console.error('Connection failed:', error)
    } finally {
      setConnecting(false)
    }
  }

  const selectedDatabase = DATABASE_TYPES.find(db => db.id === selectedType)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Database Connection</h2>
            <p className="text-sm text-gray-600 mt-1">
              {step === 'select' && 'Choose your database type'}
              {step === 'configure' && `Configure ${selectedDatabase?.name} connection`}
              {step === 'test' && 'Test and finalize connection'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Step 1: Select Database Type */}
          {step === 'select' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Select Database Type</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {DATABASE_TYPES.map((dbType) => (
                  <button
                    key={dbType.id}
                    onClick={() => handleTypeSelect(dbType)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 text-left transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-3xl">{dbType.icon}</span>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{dbType.name}</h4>
                        <p className="text-xs text-gray-500">{dbType.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Configure Connection */}
          {step === 'configure' && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{selectedDatabase?.icon}</span>
                <h3 className="text-lg font-medium text-gray-900">
                  Configure {selectedDatabase?.name} Connection
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Basic Information</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Connection Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={config.name}
                      onChange={(e) => handleConfigChange('name', e.target.value)}
                      className="input"
                      placeholder="My Database Connection"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={config.description}
                      onChange={(e) => handleConfigChange('description', e.target.value)}
                      className="input"
                      rows={3}
                      placeholder="Optional description"
                    />
                  </div>

                  {/* Connection Mode */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Connection Mode
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-start space-x-3">
                        <input
                          type="radio"
                          value="import"
                          checked={config.mode === 'import'}
                          onChange={(e) => handleConfigChange('mode', e.target.value)}
                          className="mt-1"
                        />
                        <div>
                          <div className="font-medium text-sm">Import Mode</div>
                          <div className="text-xs text-gray-600">
                            Data is copied and stored for fast access
                          </div>
                        </div>
                      </label>
                      
                      <label className="flex items-start space-x-3">
                        <input
                          type="radio"
                          value="directquery"
                          checked={config.mode === 'directquery'}
                          onChange={(e) => handleConfigChange('mode', e.target.value)}
                          className="mt-1"
                        />
                        <div>
                          <div className="font-medium text-sm">DirectQuery Mode</div>
                          <div className="text-xs text-gray-600">
                            Query data directly from source in real-time
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Connection Details */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Connection Details</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Host <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={config.connection_config.host}
                      onChange={(e) => handleConfigChange('connection_config.host', e.target.value)}
                      className="input"
                      placeholder="localhost"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Port <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={config.connection_config.port}
                      onChange={(e) => handleConfigChange('connection_config.port', parseInt(e.target.value))}
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Database <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={config.connection_config.database}
                      onChange={(e) => handleConfigChange('connection_config.database', e.target.value)}
                      className="input"
                      placeholder="database_name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={config.connection_config.username}
                      onChange={(e) => handleConfigChange('connection_config.username', e.target.value)}
                      className="input"
                      placeholder="username"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={config.connection_config.password}
                      onChange={(e) => handleConfigChange('connection_config.password', e.target.value)}
                      className="input"
                      placeholder="password"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="ssl"
                      checked={config.connection_config.ssl}
                      onChange={(e) => handleConfigChange('connection_config.ssl', e.target.checked)}
                    />
                    <label htmlFor="ssl" className="text-sm text-gray-700">
                      Use SSL connection
                    </label>
                  </div>
                </div>
              </div>

              {/* Mode Information */}
              <div className={`border rounded-lg p-4 ${
                config.mode === 'import' 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'bg-purple-50 border-purple-200'
              }`}>
                <div className="flex items-start space-x-2">
                  <InformationCircleIcon className={`h-5 w-5 mt-0.5 ${
                    config.mode === 'import' ? 'text-blue-500' : 'text-purple-500'
                  }`} />
                  <div>
                    <h4 className={`text-sm font-medium ${
                      config.mode === 'import' ? 'text-blue-800' : 'text-purple-800'
                    }`}>
                      {config.mode === 'import' ? 'Import Mode' : 'DirectQuery Mode'}
                    </h4>
                    <p className={`text-sm mt-1 ${
                      config.mode === 'import' ? 'text-blue-700' : 'text-purple-700'
                    }`}>
                      {config.mode === 'import' 
                        ? 'Data will be copied and stored in our system for fast access. Ideal for datasets that don\'t change frequently.'
                        : 'Data stays in your database and queries are sent in real-time. Ideal for live data and large datasets.'
                      }
                    </p>
                    <ul className={`text-xs mt-2 space-y-1 ${
                      config.mode === 'import' ? 'text-blue-600' : 'text-purple-600'
                    }`}>
                      {config.mode === 'import' ? (
                        <>
                          <li>• Fastest query performance</li>
                          <li>• Data is refreshed on schedule</li>
                          <li>• Uses storage in our system</li>
                          <li>• Best for analytical workloads</li>
                        </>
                      ) : (
                        <>
                          <li>• Always shows live data</li>
                          <li>• No additional storage required</li>
                          <li>• Query performance depends on source</li>
                          <li>• Best for real-time dashboards</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-6 border-t">
            <div className="flex items-center space-x-3">
              {step === 'configure' && (
                <button
                  onClick={() => setStep('select')}
                  className="btn btn-outline"
                >
                  Back
                </button>
              )}
            </div>

            <div className="flex items-center space-x-3">
              {step === 'configure' && (
                <>
                  <button
                    onClick={handleTestConnection}
                    className="btn btn-outline flex items-center space-x-2"
                    disabled={testing}
                  >
                    {testing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                        <span>Testing...</span>
                      </>
                    ) : (
                      <>
                        <ServerIcon className="h-4 w-4" />
                        <span>Test Connection</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleConnect}
                    className="btn btn-primary flex items-center space-x-2"
                    disabled={connecting || !config.name || !config.connection_config.host}
                  >
                    {connecting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Connecting...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="h-4 w-4" />
                        <span>Connect</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`mt-4 p-3 rounded-lg flex items-center space-x-2 ${
              testResult === 'success' 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {testResult === 'success' ? (
                <>
                  <CheckCircleIcon className="h-4 w-4" />
                  <span className="text-sm">Connection test successful!</span>
                </>
              ) : (
                <>
                  <ExclamationTriangleIcon className="h-4 w-4" />
                  <span className="text-sm">Connection test failed. Please check your settings.</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DatabaseConnectionModal