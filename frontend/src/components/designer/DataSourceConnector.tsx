/**
 * Data Source Connector Component
 * Power BI-style comprehensive data source connection interface
 * Supports all major data sources including databases, files, web services, and cloud platforms
 */

import React, { useState, useCallback } from 'react'
import {
  ServerIcon,
  CircleStackIcon,
  CloudIcon,
  DocumentIcon,
  GlobeAltIcon,
  TableCellsIcon,
  FolderIcon,
  LinkIcon,
  BeakerIcon,
  CogIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

export type DataSourceType = 
  // Databases
  | 'sql-server' | 'azure-sql' | 'postgresql' | 'mysql' | 'oracle' | 'teradata' | 'mongodb' | 'mariadb'
  // Cloud Platforms  
  | 'azure-analysis-services' | 'power-bi-datasets' | 'google-bigquery' | 'amazon-redshift' | 'snowflake'
  // Files
  | 'excel' | 'csv' | 'text' | 'xml' | 'json' | 'parquet' | 'pdf' | 'folder' | 'sharepoint-folder'
  // Web & APIs
  | 'web' | 'odata' | 'rest-api' | 'sharepoint-list' | 'google-sheets'
  // Other
  | 'odbc' | 'ole-db' | 'blank-query' | 'spark' | 'fhir'

export type ConnectionMode = 'import' | 'directquery' | 'live-connection'

interface DataSource {
  type: DataSourceType
  name: string
  icon: React.ElementType
  category: string
  description: string
  supportedModes: ConnectionMode[]
  requiresGateway?: boolean
  cloudService?: boolean
  isPremium?: boolean
}

interface ConnectionConfig {
  server?: string
  database?: string
  username?: string
  password?: string
  port?: number
  connectionString?: string
  filePath?: string
  url?: string
  apiKey?: string
  authType?: 'none' | 'basic' | 'oauth' | 'windows' | 'certificate'
  [key: string]: any
}

interface DataSourceConnectorProps {
  onConnect: (source: DataSource, config: ConnectionConfig, mode: ConnectionMode) => void
  onCancel: () => void
  isOpen: boolean
}

const DataSourceConnector: React.FC<DataSourceConnectorProps> = ({
  onConnect,
  onCancel,
  isOpen
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('databases')
  const [selectedSource, setSelectedSource] = useState<DataSource | null>(null)
  const [connectionConfig, setConnectionConfig] = useState<ConnectionConfig>({})
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('import')
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [step, setStep] = useState<'select-source' | 'configure' | 'preview'>('select-source')

  const dataSources: DataSource[] = [
    // Database Sources
    { 
      type: 'sql-server', 
      name: 'SQL Server', 
      icon: ServerIcon, 
      category: 'databases',
      description: 'Connect to Microsoft SQL Server databases',
      supportedModes: ['import', 'directquery'],
      requiresGateway: true
    },
    { 
      type: 'azure-sql', 
      name: 'Azure SQL Database', 
      icon: CloudIcon, 
      category: 'databases',
      description: 'Connect to Azure SQL Database in the cloud',
      supportedModes: ['import', 'directquery'],
      cloudService: true
    },
    { 
      type: 'postgresql', 
      name: 'PostgreSQL', 
      icon: CircleStackIcon, 
      category: 'databases',
      description: 'Connect to PostgreSQL databases',
      supportedModes: ['import', 'directquery'],
      requiresGateway: true
    },
    { 
      type: 'mysql', 
      name: 'MySQL', 
      icon: CircleStackIcon, 
      category: 'databases',
      description: 'Connect to MySQL databases',
      supportedModes: ['import', 'directquery'],
      requiresGateway: true
    },
    { 
      type: 'oracle', 
      name: 'Oracle Database', 
      icon: CircleStackIcon, 
      category: 'databases',
      description: 'Connect to Oracle databases',
      supportedModes: ['import', 'directquery'],
      requiresGateway: true
    },
    
    // Cloud Analytics
    { 
      type: 'google-bigquery', 
      name: 'Google BigQuery', 
      icon: CloudIcon, 
      category: 'cloud',
      description: 'Connect to Google BigQuery data warehouse',
      supportedModes: ['import', 'directquery'],
      cloudService: true
    },
    { 
      type: 'snowflake', 
      name: 'Snowflake', 
      icon: CloudIcon, 
      category: 'cloud',
      description: 'Connect to Snowflake cloud data platform',
      supportedModes: ['import', 'directquery'],
      cloudService: true,
      isPremium: true
    },
    { 
      type: 'amazon-redshift', 
      name: 'Amazon Redshift', 
      icon: CloudIcon, 
      category: 'cloud',
      description: 'Connect to Amazon Redshift data warehouse',
      supportedModes: ['import', 'directquery'],
      cloudService: true
    },
    
    // File Sources
    { 
      type: 'excel', 
      name: 'Excel Workbook', 
      icon: DocumentIcon, 
      category: 'files',
      description: 'Import data from Excel files (.xlsx, .xls)',
      supportedModes: ['import']
    },
    { 
      type: 'csv', 
      name: 'Text/CSV', 
      icon: DocumentIcon, 
      category: 'files',
      description: 'Import from CSV, TSV, and other delimited files',
      supportedModes: ['import']
    },
    { 
      type: 'json', 
      name: 'JSON', 
      icon: DocumentIcon, 
      category: 'files',
      description: 'Import from JSON files',
      supportedModes: ['import']
    },
    { 
      type: 'xml', 
      name: 'XML', 
      icon: DocumentIcon, 
      category: 'files',
      description: 'Import from XML files',
      supportedModes: ['import']
    },
    { 
      type: 'parquet', 
      name: 'Parquet', 
      icon: DocumentIcon, 
      category: 'files',
      description: 'Import from Parquet files',
      supportedModes: ['import']
    },
    { 
      type: 'folder', 
      name: 'Folder', 
      icon: FolderIcon, 
      category: 'files',
      description: 'Combine multiple files from a folder',
      supportedModes: ['import']
    },
    
    // Web Sources
    { 
      type: 'web', 
      name: 'Web', 
      icon: GlobeAltIcon, 
      category: 'web',
      description: 'Get data from web pages and APIs',
      supportedModes: ['import']
    },
    { 
      type: 'rest-api', 
      name: 'REST API', 
      icon: GlobeAltIcon, 
      category: 'web',
      description: 'Connect to REST APIs',
      supportedModes: ['import']
    },
    { 
      type: 'google-sheets', 
      name: 'Google Sheets', 
      icon: DocumentIcon, 
      category: 'web',
      description: 'Import from Google Sheets',
      supportedModes: ['import']
    },
    
    // Other Sources
    { 
      type: 'blank-query', 
      name: 'Blank Query', 
      icon: BeakerIcon, 
      category: 'other',
      description: 'Start with a blank query using Power Query M',
      supportedModes: ['import']
    },
    { 
      type: 'odbc', 
      name: 'ODBC', 
      icon: LinkIcon, 
      category: 'other',
      description: 'Connect using ODBC drivers',
      supportedModes: ['import', 'directquery'],
      requiresGateway: true
    },
  ]

  const categories = [
    { id: 'databases', name: 'Database', icon: CircleStackIcon },
    { id: 'cloud', name: 'Azure', icon: CloudIcon },
    { id: 'files', name: 'File', icon: DocumentIcon },
    { id: 'web', name: 'Online Services', icon: GlobeAltIcon },
    { id: 'other', name: 'Other', icon: CogIcon },
  ]

  const filteredSources = dataSources.filter(source => source.category === selectedCategory)

  const handleSourceSelect = (source: DataSource) => {
    setSelectedSource(source)
    setConnectionMode(source.supportedModes[0])
    setConnectionConfig({})
    setStep('configure')
  }

  const handleConfigChange = (key: string, value: any) => {
    setConnectionConfig(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const testConnection = async () => {
    if (!selectedSource) return
    
    setIsConnecting(true)
    setConnectionStatus('testing')
    
    try {
      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 2000))
      setConnectionStatus('success')
    } catch (error) {
      setConnectionStatus('error')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleConnect = async () => {
    if (selectedSource) {
      setIsConnecting(true)
      try {
        // If it's a file upload, process the file
        if (selectedSource.category === 'files' && connectionConfig.file) {
          const formData = new FormData()
          formData.append('file', connectionConfig.file)
          formData.append('datasetName', connectionConfig.fileName?.split('.')[0] || 'New Dataset')
          formData.append('workspaceId', 'demo-workspace')
          
          // Simulate file upload API call
          await new Promise(resolve => setTimeout(resolve, 1500))
          
          // Create a mock dataset response
          const mockDataset = {
            id: `dataset-${Date.now()}`,
            name: connectionConfig.fileName?.split('.')[0] || 'New Dataset',
            tables: [{
              name: 'Table1',
              columns: [
                { name: 'ID', type: 'number' },
                { name: 'Name', type: 'string' },
                { name: 'Sales', type: 'number' },
                { name: 'Date', type: 'date' }
              ]
            }]
          }
          
          onConnect(selectedSource, { ...connectionConfig, dataset: mockDataset }, connectionMode)
        } else {
          onConnect(selectedSource, connectionConfig, connectionMode)
        }
      } catch (error) {
        console.error('Connection failed:', error)
        setConnectionStatus('error')
      } finally {
        setIsConnecting(false)
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black opacity-30" onClick={onCancel}></div>
        
        <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-screen overflow-hidden relative">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Get Data</h2>
              <p className="text-sm text-gray-500 mt-1">
                Connect to hundreds of data sources to create reports and dashboards
              </p>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircleIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="flex h-96">
            {step === 'select-source' && (
              <>
                {/* Categories Sidebar */}
                <div className="w-64 bg-gray-50 border-r border-gray-200">
                  <div className="p-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Categories</h3>
                    <div className="space-y-1">
                      {categories.map((category) => {
                        const Icon = category.icon
                        return (
                          <button
                            key={category.id}
                            onClick={() => setSelectedCategory(category.id)}
                            className={`w-full flex items-center space-x-3 px-3 py-2 text-left rounded-md transition-colors ${
                              selectedCategory === category.id
                                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                            <span className="text-sm">{category.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Data Sources Grid */}
                <div className="flex-1 p-6">
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 max-h-full overflow-y-auto">
                    {filteredSources.map((source) => {
                      const Icon = source.icon
                      return (
                        <button
                          key={source.type}
                          onClick={() => handleSourceSelect(source)}
                          className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
                        >
                          <div className="flex items-start space-x-3">
                            <div className="p-2 bg-gray-100 group-hover:bg-blue-100 rounded-md transition-colors">
                              <Icon className="h-6 w-6 text-gray-600 group-hover:text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 text-sm">{source.name}</h4>
                              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{source.description}</p>
                              <div className="flex items-center space-x-2 mt-2">
                                {source.cloudService && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    Cloud
                                  </span>
                                )}
                                {source.requiresGateway && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                    Gateway
                                  </span>
                                )}
                                {source.isPremium && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    Premium
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>
            )}

            {step === 'configure' && selectedSource && (
              <div className="flex-1 p-6">
                <div className="max-w-2xl">
                  <div className="flex items-center space-x-3 mb-6">
                    <selectedSource.icon className="h-8 w-8 text-blue-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{selectedSource.name}</h3>
                      <p className="text-sm text-gray-500">{selectedSource.description}</p>
                    </div>
                  </div>

                  {/* Connection Mode Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Data Connectivity mode
                    </label>
                    <div className="space-y-2">
                      {selectedSource.supportedModes.map((mode) => (
                        <label key={mode} className="flex items-center">
                          <input
                            type="radio"
                            name="connectionMode"
                            value={mode}
                            checked={connectionMode === mode}
                            onChange={(e) => setConnectionMode(e.target.value as ConnectionMode)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-3 text-sm">
                            <span className="font-medium capitalize">{mode.replace('-', ' ')}</span>
                            <span className="text-gray-500 ml-2">
                              {mode === 'import' && '- Load data into Power BI for best performance'}
                              {mode === 'directquery' && '- Query data in real-time from the source'}
                              {mode === 'live-connection' && '- Connect live to the data source'}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Connection Configuration */}
                  <div className="space-y-4">
                    {selectedSource.category === 'databases' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Server
                          </label>
                          <input
                            type="text"
                            value={connectionConfig.server || ''}
                            onChange={(e) => handleConfigChange('server', e.target.value)}
                            placeholder="localhost or server.domain.com"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Database (optional)
                          </label>
                          <input
                            type="text"
                            value={connectionConfig.database || ''}
                            onChange={(e) => handleConfigChange('database', e.target.value)}
                            placeholder="Database name"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </>
                    )}

                    {selectedSource.category === 'files' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            Upload File or Enter URL
                          </label>
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                            <input
                              type="file"
                              id="file-upload"
                              className="hidden"
                              accept={selectedSource.type === 'excel' ? '.xlsx,.xls' :
                                      selectedSource.type === 'csv' ? '.csv,.tsv,.txt' :
                                      selectedSource.type === 'json' ? '.json' :
                                      selectedSource.type === 'xml' ? '.xml' :
                                      selectedSource.type === 'parquet' ? '.parquet' : '*'}
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  handleConfigChange('file', file)
                                  handleConfigChange('fileName', file.name)
                                }
                              }}
                            />
                            <label htmlFor="file-upload" className="cursor-pointer">
                              <div className="flex flex-col items-center">
                                <DocumentIcon className="h-12 w-12 text-gray-400 mb-4" />
                                <span className="text-sm font-medium text-gray-700">
                                  {connectionConfig.fileName || 'Click to upload file'}
                                </span>
                                <span className="text-xs text-gray-500 mt-1">
                                  Or drag and drop your file here
                                </span>
                              </div>
                            </label>
                          </div>
                        </div>
                        <div className="text-center text-gray-500">- OR -</div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            File URL
                          </label>
                          <input
                            type="url"
                            value={connectionConfig.url || ''}
                            onChange={(e) => handleConfigChange('url', e.target.value)}
                            placeholder="https://example.com/data.csv"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    )}

                    {selectedSource.category === 'web' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          URL
                        </label>
                        <input
                          type="url"
                          value={connectionConfig.url || ''}
                          onChange={(e) => handleConfigChange('url', e.target.value)}
                          placeholder="https://api.example.com/data"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}

                    {/* Connection Status */}
                    {connectionStatus !== 'idle' && (
                      <div className={`p-3 rounded-md ${
                        connectionStatus === 'testing' ? 'bg-blue-50 border border-blue-200' :
                        connectionStatus === 'success' ? 'bg-green-50 border border-green-200' :
                        'bg-red-50 border border-red-200'
                      }`}>
                        <div className="flex items-center space-x-2">
                          {connectionStatus === 'testing' && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          )}
                          {connectionStatus === 'success' && <CheckCircleIcon className="h-5 w-5 text-green-600" />}
                          {connectionStatus === 'error' && <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />}
                          <span className={`text-sm font-medium ${
                            connectionStatus === 'testing' ? 'text-blue-700' :
                            connectionStatus === 'success' ? 'text-green-700' :
                            'text-red-700'
                          }`}>
                            {connectionStatus === 'testing' && 'Testing connection...'}
                            {connectionStatus === 'success' && 'Connection successful!'}
                            {connectionStatus === 'error' && 'Connection failed. Please check your settings.'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={() => step === 'configure' ? setStep('select-source') : onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {step === 'configure' ? 'Back' : 'Cancel'}
            </button>
            
            <div className="flex space-x-3">
              {step === 'configure' && (
                <>
                  <button
                    onClick={testConnection}
                    disabled={isConnecting}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    {isConnecting ? 'Testing...' : 'Test Connection'}
                  </button>
                  <button
                    onClick={handleConnect}
                    disabled={selectedSource.category === 'files' ? 
                      (!connectionConfig.file && !connectionConfig.url) :
                      connectionStatus !== 'success'}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isConnecting ? 'Connecting...' : 'Connect'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DataSourceConnector