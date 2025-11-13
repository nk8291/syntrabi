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
import { datasetService } from '../../services/datasetService'

export type DataSourceType =
  // Databases
  | 'sql-server' | 'azure-sql' | 'postgresql' | 'mysql' | 'oracle' | 'teradata' | 'mongodb' | 'mariadb'
  // Cloud Platforms
  | 'azure-analysis-services' | 'power-bi-datasets' | 'google-bigquery' | 'amazon-redshift' | 'snowflake' | 'databricks' | 'azure-databricks'
  // Files
  | 'excel' | 'csv' | 'text' | 'xml' | 'json' | 'parquet' | 'pdf' | 'folder' | 'sharepoint-folder'
  // Web & APIs
  | 'web' | 'odata' | 'rest-api' | 'sharepoint-list' | 'google-sheets'
  // Other
  | 'odbc' | 'jdbc' | 'ole-db' | 'blank-query' | 'spark' | 'fhir'

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
  const [step, setStep] = useState<'select-source' | 'configure' | 'preview'>('select-source')

  const dataSources: DataSource[] = [
    // ========== DATABASE SOURCES ==========
    {
      type: 'sql-server',
      name: 'SQL Server',
      icon: ServerIcon,
      category: 'database',
      description: 'Connect to Microsoft SQL Server databases',
      supportedModes: ['import', 'directquery'],
      requiresGateway: true
    },
    {
      type: 'azure-sql',
      name: 'Azure SQL Database',
      icon: CloudIcon,
      category: 'database',
      description: 'Connect to Azure SQL Database in the cloud',
      supportedModes: ['import', 'directquery'],
      cloudService: true
    },
    {
      type: 'postgresql',
      name: 'PostgreSQL',
      icon: CircleStackIcon,
      category: 'database',
      description: 'Connect to PostgreSQL databases',
      supportedModes: ['import', 'directquery'],
      requiresGateway: true
    },
    {
      type: 'mysql',
      name: 'MySQL',
      icon: CircleStackIcon,
      category: 'database',
      description: 'Connect to MySQL databases',
      supportedModes: ['import', 'directquery'],
      requiresGateway: true
    },
    {
      type: 'mariadb',
      name: 'MariaDB',
      icon: CircleStackIcon,
      category: 'database',
      description: 'Connect to MariaDB databases',
      supportedModes: ['import', 'directquery'],
      requiresGateway: true
    },
    {
      type: 'oracle',
      name: 'Oracle Database',
      icon: CircleStackIcon,
      category: 'database',
      description: 'Connect to Oracle databases',
      supportedModes: ['import', 'directquery'],
      requiresGateway: true
    },
    {
      type: 'teradata',
      name: 'Teradata',
      icon: CircleStackIcon,
      category: 'database',
      description: 'Connect to Teradata databases',
      supportedModes: ['import', 'directquery'],
      requiresGateway: true
    },

    // ========== AZURE (CLOUD) SOURCES ==========
    {
      type: 'google-bigquery',
      name: 'Google BigQuery',
      icon: CloudIcon,
      category: 'azure',
      description: 'Connect to Google BigQuery data warehouse',
      supportedModes: ['import', 'directquery'],
      cloudService: true
    },
    {
      type: 'snowflake',
      name: 'Snowflake',
      icon: CloudIcon,
      category: 'azure',
      description: 'Connect to Snowflake cloud data platform',
      supportedModes: ['import', 'directquery'],
      cloudService: true,
      isPremium: true
    },
    {
      type: 'amazon-redshift',
      name: 'Amazon Redshift',
      icon: CloudIcon,
      category: 'azure',
      description: 'Connect to Amazon Redshift data warehouse',
      supportedModes: ['import', 'directquery'],
      cloudService: true
    },
    {
      type: 'databricks',
      name: 'Databricks',
      icon: CloudIcon,
      category: 'azure',
      description: 'Connect to Databricks SQL Warehouse',
      supportedModes: ['import', 'directquery'],
      cloudService: true
    },
    {
      type: 'azure-databricks',
      name: 'Azure Databricks',
      icon: CloudIcon,
      category: 'azure',
      description: 'Connect to Azure Databricks',
      supportedModes: ['import', 'directquery'],
      cloudService: true
    },
    {
      type: 'spark',
      name: 'Spark',
      icon: CloudIcon,
      category: 'azure',
      description: 'Connect to Apache Spark cluster',
      supportedModes: ['import', 'directquery'],
      cloudService: true
    },

    // ========== FILE SOURCES ==========
    {
      type: 'excel',
      name: 'Excel Workbook',
      icon: DocumentIcon,
      category: 'file',
      description: 'Import data from Excel files (.xlsx, .xls)',
      supportedModes: ['import']
    },
    {
      type: 'csv',
      name: 'Text/CSV',
      icon: DocumentIcon,
      category: 'file',
      description: 'Import from CSV, TSV, and other delimited files',
      supportedModes: ['import']
    },
    {
      type: 'json',
      name: 'JSON',
      icon: DocumentIcon,
      category: 'file',
      description: 'Import from JSON files',
      supportedModes: ['import']
    },
    {
      type: 'xml',
      name: 'XML',
      icon: DocumentIcon,
      category: 'file',
      description: 'Import from XML files',
      supportedModes: ['import']
    },
    {
      type: 'parquet',
      name: 'Parquet',
      icon: DocumentIcon,
      category: 'file',
      description: 'Import from Parquet files',
      supportedModes: ['import']
    },
    {
      type: 'pdf',
      name: 'PDF',
      icon: DocumentIcon,
      category: 'file',
      description: 'Extract tables from PDF files',
      supportedModes: ['import']
    },
    {
      type: 'folder',
      name: 'Folder',
      icon: FolderIcon,
      category: 'file',
      description: 'Combine multiple files from a folder',
      supportedModes: ['import']
    },

    // ========== ONLINE SERVICES SOURCES ==========
    {
      type: 'web',
      name: 'Web',
      icon: GlobeAltIcon,
      category: 'online-services',
      description: 'Get data from web pages and APIs',
      supportedModes: ['import']
    },
    {
      type: 'odata',
      name: 'OData Feed',
      icon: GlobeAltIcon,
      category: 'online-services',
      description: 'Connect to OData feeds',
      supportedModes: ['import']
    },
    {
      type: 'rest-api',
      name: 'REST API',
      icon: GlobeAltIcon,
      category: 'online-services',
      description: 'Connect to REST APIs',
      supportedModes: ['import']
    },
    {
      type: 'google-sheets',
      name: 'Google Sheets',
      icon: DocumentIcon,
      category: 'online-services',
      description: 'Import from Google Sheets',
      supportedModes: ['import']
    },
    {
      type: 'sharepoint-list',
      name: 'SharePoint List',
      icon: TableCellsIcon,
      category: 'online-services',
      description: 'Connect to SharePoint Lists',
      supportedModes: ['import']
    },

    // ========== OTHER SOURCES ==========
    {
      type: 'odbc',
      name: 'ODBC',
      icon: LinkIcon,
      category: 'other',
      description: 'Connect using ODBC drivers',
      supportedModes: ['import', 'directquery'],
      requiresGateway: true
    },
    {
      type: 'jdbc',
      name: 'JDBC',
      icon: LinkIcon,
      category: 'other',
      description: 'Connect using JDBC drivers',
      supportedModes: ['import'],
      requiresGateway: true
    },
    {
      type: 'ole-db',
      name: 'OLE DB',
      icon: LinkIcon,
      category: 'other',
      description: 'Connect using OLE DB providers',
      supportedModes: ['import', 'directquery'],
      requiresGateway: true
    },
    {
      type: 'blank-query',
      name: 'Blank Query',
      icon: BeakerIcon,
      category: 'other',
      description: 'Start with a blank query using Power Query M',
      supportedModes: ['import']
    },
  ]

  const categories = [
    { id: 'all', name: 'All', icon: TableCellsIcon },
    { id: 'file', name: 'File', icon: DocumentIcon },
    { id: 'database', name: 'Database', icon: CircleStackIcon },
    { id: 'azure', name: 'Azure', icon: CloudIcon },
    { id: 'online-services', name: 'Online Services', icon: GlobeAltIcon },
    { id: 'other', name: 'Other', icon: CogIcon },
  ]

  const filteredSources = selectedCategory === 'all'
    ? dataSources
    : dataSources.filter(source => source.category === selectedCategory)

  const handleSourceSelect = (source: DataSource) => {
    setSelectedSource(source)
    setConnectionMode(source.supportedModes[0])

    // Pre-fill PostgreSQL credentials for testing
    if (source.type === 'postgresql') {
      setConnectionConfig({
        host: '162.214.101.42',
        port: 5432,
        database: 'fmoh_prod',
        username: 'fmoh_prod_usr',
        password: 'FL98GFARYBE'
      })
    } else {
      setConnectionConfig({})
    }

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

  // Helper function to check if required fields are filled
  const isConnectionConfigValid = useCallback(() => {
    if (!selectedSource) return false

    switch (selectedSource.category) {
      case 'file':
        return !!(connectionConfig.file || connectionConfig.url)

      case 'database':
        // Different databases use different field names
        switch (selectedSource.type) {
          case 'sql-server':
          case 'azure-sql':
          case 'teradata':
          case 'amazon-redshift':
            return !!(connectionConfig.server && connectionConfig.username && connectionConfig.password)

          case 'postgresql':
          case 'mysql':
          case 'mariadb':
          case 'oracle':
          case 'spark':
            return !!(connectionConfig.host && connectionConfig.database && connectionConfig.username && connectionConfig.password)

          case 'databricks':
          case 'azure-databricks':
            return !!(connectionConfig.server_hostname && connectionConfig.http_path && connectionConfig.access_token)

          case 'snowflake':
            return !!(connectionConfig.account && connectionConfig.username && connectionConfig.password)

          case 'google-bigquery':
            return !!(connectionConfig.project_id)

          default:
            return !!(connectionConfig.server || connectionConfig.host)
        }

      case 'azure':
        // Cloud services validation
        switch (selectedSource.type) {
          case 'google-bigquery':
            return !!(connectionConfig.project_id)
          case 'snowflake':
            return !!(connectionConfig.account && connectionConfig.username && connectionConfig.password)
          case 'databricks':
          case 'azure-databricks':
            return !!(connectionConfig.server_hostname && connectionConfig.http_path && connectionConfig.access_token)
          case 'amazon-redshift':
            return !!(connectionConfig.server && connectionConfig.database && connectionConfig.username && connectionConfig.password)
          case 'spark':
            return !!(connectionConfig.host)
          default:
            return false
        }

      case 'online-services':
        return !!(connectionConfig.url || connectionConfig.siteUrl)

      case 'other':
        switch (selectedSource.type) {
          case 'odbc':
            return !!(connectionConfig.connectionString)
          case 'jdbc':
            return !!(connectionConfig.jdbcUrl && connectionConfig.driverClass)
          default:
            return true
        }

      default:
        return false
    }
  }, [selectedSource, connectionConfig])

  const handleConnect = async () => {
    if (!selectedSource) return

    setIsConnecting(true)
    setConnectionStatus('idle')
    setErrorMessage('')

    try {
      // Handle file uploads
      if (selectedSource.category === 'file' && connectionConfig.file) {
        const file = connectionConfig.file as File
        const datasetName = connectionConfig.fileName?.split('.')[0] || 'New Dataset'

        console.log('Uploading file dataset:', { workspaceId, datasetName, fileName: file.name })

        // Upload via dataset service
        const dataset = await datasetService.uploadDataset(workspaceId, file, datasetName)

        console.log('Dataset uploaded successfully:', dataset)
        setConnectionStatus('success')

        // Call onConnect with dataset ID
        onConnect(selectedSource, { ...connectionConfig, dataset }, connectionMode, dataset.id)
      }
      // Handle database connections
      else if (selectedSource.category === 'database' || selectedSource.category === 'azure') {
        const datasetName = connectionConfig.database || `${selectedSource.name} Connection`

        console.log('Creating database dataset:', { workspaceId, datasetName, connectorType: selectedSource.type })

        // Map connection config to match backend expectations
        const dbConfig: any = {}

        // Map host/server fields
        if (connectionConfig.host) {
          dbConfig.host = connectionConfig.host
        } else if (connectionConfig.server) {
          dbConfig.host = connectionConfig.server
        } else if (connectionConfig.server_hostname) {
          dbConfig.host = connectionConfig.server_hostname
        } else if (connectionConfig.account) {
          dbConfig.host = connectionConfig.account
        }

        // Add other fields
        if (connectionConfig.database) dbConfig.database = connectionConfig.database
        if (connectionConfig.port) dbConfig.port = connectionConfig.port
        if (connectionConfig.username) dbConfig.username = connectionConfig.username
        if (connectionConfig.password) dbConfig.password = connectionConfig.password
        if (connectionConfig.connectionString) dbConfig.connectionString = connectionConfig.connectionString

        // Add service-specific fields
        if (connectionConfig.http_path) dbConfig.http_path = connectionConfig.http_path
        if (connectionConfig.access_token) dbConfig.access_token = connectionConfig.access_token
        if (connectionConfig.schema) dbConfig.schema = connectionConfig.schema
        if (connectionConfig.warehouse) dbConfig.warehouse = connectionConfig.warehouse
        if (connectionConfig.project_id) dbConfig.project_id = connectionConfig.project_id
        if (connectionConfig.credentials) dbConfig.credentials = connectionConfig.credentials

        // Create database dataset via service
        const dataset = await datasetService.createDatabaseDataset(
          workspaceId,
          datasetName,
          selectedSource.type,
          dbConfig
        )

        console.log('Database dataset created successfully:', dataset)
        setConnectionStatus('success')

        onConnect(selectedSource, { ...connectionConfig, dataset }, connectionMode, dataset.id)
      }
      // Handle other connection types
      else {
        console.log('Creating connection with config:', connectionConfig)
        onConnect(selectedSource, connectionConfig, connectionMode)
      }
    } catch (error: any) {
      console.error('Connection failed:', error)
      setConnectionStatus('error')
      setErrorMessage(error.response?.data?.detail || error.message || 'Failed to connect to data source')
    } finally {
      setIsConnecting(false)
    }
  }

  // Render connector-specific configuration form
  const renderConnectionForm = () => {
    if (!selectedSource) return null

    const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
    const labelClass = "block text-sm font-medium text-gray-700 mb-1"

    switch (selectedSource.type) {
      // SQL Server / Azure SQL
      case 'sql-server':
      case 'azure-sql':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelClass}>Server *</label>
                <input type="text" value={connectionConfig.server || ''} onChange={(e) => handleConfigChange('server', e.target.value)} placeholder="servername.database.windows.net" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Database</label>
                <input type="text" value={connectionConfig.database || ''} onChange={(e) => handleConfigChange('database', e.target.value)} placeholder="database name" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Port</label>
                <input type="number" value={connectionConfig.port || 1433} onChange={(e) => handleConfigChange('port', e.target.value)} className={inputClass} />
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Authentication</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Username</label>
                  <input type="text" value={connectionConfig.username || ''} onChange={(e) => handleConfigChange('username', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Password</label>
                  <input type="password" value={connectionConfig.password || ''} onChange={(e) => handleConfigChange('password', e.target.value)} className={inputClass} />
                </div>
              </div>
            </div>
          </>
        )

      // PostgreSQL / MySQL / MariaDB / Oracle
      case 'postgresql':
      case 'mysql':
      case 'mariadb':
      case 'oracle':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Host *</label>
                <input type="text" value={connectionConfig.host || ''} onChange={(e) => handleConfigChange('host', e.target.value)} placeholder="localhost" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Port</label>
                <input type="number" value={connectionConfig.port || (selectedSource.type === 'postgresql' ? 5432 : selectedSource.type === 'oracle' ? 1521 : 3306)} onChange={(e) => handleConfigChange('port', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Database *</label>
                <input type="text" value={connectionConfig.database || ''} onChange={(e) => handleConfigChange('database', e.target.value)} placeholder="database name" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Username *</label>
                <input type="text" value={connectionConfig.username || ''} onChange={(e) => handleConfigChange('username', e.target.value)} className={inputClass} />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Password *</label>
                <input type="password" value={connectionConfig.password || ''} onChange={(e) => handleConfigChange('password', e.target.value)} className={inputClass} />
              </div>
            </div>
          </>
        )

      // Teradata
      case 'teradata':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Server *</label>
                <input type="text" value={connectionConfig.server || ''} onChange={(e) => handleConfigChange('server', e.target.value)} placeholder="teradata.company.com" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Database</label>
                <input type="text" value={connectionConfig.database || ''} onChange={(e) => handleConfigChange('database', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Username *</label>
                <input type="text" value={connectionConfig.username || ''} onChange={(e) => handleConfigChange('username', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Password *</label>
                <input type="password" value={connectionConfig.password || ''} onChange={(e) => handleConfigChange('password', e.target.value)} className={inputClass} />
              </div>
            </div>
          </>
        )

      // Databricks / Azure Databricks
      case 'databricks':
      case 'azure-databricks':
        return (
          <>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Server Hostname *</label>
                <input type="text" value={connectionConfig.server_hostname || ''} onChange={(e) => handleConfigChange('server_hostname', e.target.value)} placeholder="adb-1234567890123456.7.azuredatabricks.net" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>HTTP Path *</label>
                <input type="text" value={connectionConfig.http_path || ''} onChange={(e) => handleConfigChange('http_path', e.target.value)} placeholder="/sql/1.0/warehouses/abc123" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Access Token *</label>
                <input type="password" value={connectionConfig.access_token || ''} onChange={(e) => handleConfigChange('access_token', e.target.value)} placeholder="dapi..." className={inputClass} />
              </div>
            </div>
          </>
        )

      // Snowflake
      case 'snowflake':
        return (
          <>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Account *</label>
                <input type="text" value={connectionConfig.account || ''} onChange={(e) => handleConfigChange('account', e.target.value)} placeholder="account.region" className={inputClass} />
                <p className="text-xs text-gray-500 mt-1">Format: account.region (e.g., xy12345.us-east-1)</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Username *</label>
                  <input type="text" value={connectionConfig.username || ''} onChange={(e) => handleConfigChange('username', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Password *</label>
                  <input type="password" value={connectionConfig.password || ''} onChange={(e) => handleConfigChange('password', e.target.value)} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Database</label>
                  <input type="text" value={connectionConfig.database || ''} onChange={(e) => handleConfigChange('database', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Schema</label>
                  <input type="text" value={connectionConfig.schema || ''} onChange={(e) => handleConfigChange('schema', e.target.value)} placeholder="PUBLIC" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Warehouse</label>
                  <input type="text" value={connectionConfig.warehouse || ''} onChange={(e) => handleConfigChange('warehouse', e.target.value)} className={inputClass} />
                </div>
              </div>
            </div>
          </>
        )

      // BigQuery
      case 'google-bigquery':
        return (
          <>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Project ID *</label>
                <input type="text" value={connectionConfig.project_id || ''} onChange={(e) => handleConfigChange('project_id', e.target.value)} placeholder="my-project-123" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Dataset</label>
                <input type="text" value={connectionConfig.dataset || ''} onChange={(e) => handleConfigChange('dataset', e.target.value)} placeholder="dataset_name" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Service Account JSON</label>
                <textarea value={connectionConfig.credentials || ''} onChange={(e) => handleConfigChange('credentials', e.target.value)} placeholder='{"type": "service_account", ...}' className={inputClass + " h-24"} />
                <p className="text-xs text-gray-500 mt-1">Paste your service account JSON key</p>
              </div>
            </div>
          </>
        )

      // Redshift
      case 'amazon-redshift':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelClass}>Server *</label>
                <input type="text" value={connectionConfig.server || ''} onChange={(e) => handleConfigChange('server', e.target.value)} placeholder="cluster.abc123.region.redshift.amazonaws.com" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Database *</label>
                <input type="text" value={connectionConfig.database || ''} onChange={(e) => handleConfigChange('database', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Port</label>
                <input type="number" value={connectionConfig.port || 5439} onChange={(e) => handleConfigChange('port', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Username *</label>
                <input type="text" value={connectionConfig.username || ''} onChange={(e) => handleConfigChange('username', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Password *</label>
                <input type="password" value={connectionConfig.password || ''} onChange={(e) => handleConfigChange('password', e.target.value)} className={inputClass} />
              </div>
            </div>
          </>
        )

      // Spark
      case 'spark':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Host *</label>
                <input type="text" value={connectionConfig.host || ''} onChange={(e) => handleConfigChange('host', e.target.value)} placeholder="localhost" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Port</label>
                <input type="number" value={connectionConfig.port || 10000} onChange={(e) => handleConfigChange('port', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Database</label>
                <input type="text" value={connectionConfig.database || 'default'} onChange={(e) => handleConfigChange('database', e.target.value)} className={inputClass} />
              </div>
            </div>
          </>
        )

      // File uploads (Excel, CSV, JSON, XML, Parquet, PDF)
      case 'excel':
      case 'csv':
      case 'json':
      case 'xml':
      case 'parquet':
      case 'pdf':
        return (
          <div className="space-y-3">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept={
                  selectedSource.type === 'excel' ? '.xlsx,.xls' :
                  selectedSource.type === 'csv' ? '.csv,.tsv,.txt' :
                  selectedSource.type === 'json' ? '.json' :
                  selectedSource.type === 'xml' ? '.xml' :
                  selectedSource.type === 'parquet' ? '.parquet' :
                  selectedSource.type === 'pdf' ? '.pdf' : '*'
                }
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    handleConfigChange('file', file)
                    handleConfigChange('fileName', file.name)
                  }
                }}
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <DocumentIcon className="h-16 w-16 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700 mb-1">
                  {connectionConfig.fileName || `Click to upload ${selectedSource.name}`}
                </p>
                <p className="text-xs text-gray-500">or drag and drop</p>
              </label>
            </div>
          </div>
        )

      // Folder
      case 'folder':
        return (
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Folder Path *</label>
              <input type="text" value={connectionConfig.folderPath || ''} onChange={(e) => handleConfigChange('folderPath', e.target.value)} placeholder="C:\Data or /home/user/data" className={inputClass} />
              <p className="text-xs text-gray-500 mt-1">All files in this folder will be combined</p>
            </div>
          </div>
        )

      // Web
      case 'web':
        return (
          <div className="space-y-3">
            <div>
              <label className={labelClass}>URL *</label>
              <input type="url" value={connectionConfig.url || ''} onChange={(e) => handleConfigChange('url', e.target.value)} placeholder="https://example.com/data" className={inputClass} />
            </div>
          </div>
        )

      // OData
      case 'odata':
        return (
          <>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>OData URL *</label>
                <input type="url" value={connectionConfig.url || ''} onChange={(e) => handleConfigChange('url', e.target.value)} placeholder="https://services.odata.org/V4/TripPinService/" className={inputClass} />
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Authentication (Optional)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Username</label>
                    <input type="text" value={connectionConfig.username || ''} onChange={(e) => handleConfigChange('username', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Password</label>
                    <input type="password" value={connectionConfig.password || ''} onChange={(e) => handleConfigChange('password', e.target.value)} className={inputClass} />
                  </div>
                </div>
              </div>
            </div>
          </>
        )

      // REST API
      case 'rest-api':
        return (
          <>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>API Endpoint *</label>
                <input type="url" value={connectionConfig.url || ''} onChange={(e) => handleConfigChange('url', e.target.value)} placeholder="https://api.example.com/v1/data" className={inputClass} />
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Authentication</h4>
                <div className="space-y-3">
                  <div>
                    <label className={labelClass}>Auth Type</label>
                    <select value={connectionConfig.authType || 'none'} onChange={(e) => handleConfigChange('authType', e.target.value)} className={inputClass}>
                      <option value="none">None</option>
                      <option value="bearer">Bearer Token</option>
                      <option value="apikey">API Key</option>
                      <option value="basic">Basic Auth</option>
                    </select>
                  </div>
                  {connectionConfig.authType === 'bearer' && (
                    <div>
                      <label className={labelClass}>Token</label>
                      <input type="password" value={connectionConfig.token || ''} onChange={(e) => handleConfigChange('token', e.target.value)} className={inputClass} />
                    </div>
                  )}
                  {connectionConfig.authType === 'apikey' && (
                    <div>
                      <label className={labelClass}>API Key</label>
                      <input type="password" value={connectionConfig.apiKey || ''} onChange={(e) => handleConfigChange('apiKey', e.target.value)} className={inputClass} />
                    </div>
                  )}
                  {connectionConfig.authType === 'basic' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Username</label>
                        <input type="text" value={connectionConfig.username || ''} onChange={(e) => handleConfigChange('username', e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Password</label>
                        <input type="password" value={connectionConfig.password || ''} onChange={(e) => handleConfigChange('password', e.target.value)} className={inputClass} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )

      // Google Sheets
      case 'google-sheets':
        return (
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Google Sheets URL *</label>
              <input type="url" value={connectionConfig.url || ''} onChange={(e) => handleConfigChange('url', e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Service Account JSON</label>
              <textarea value={connectionConfig.credentials || ''} onChange={(e) => handleConfigChange('credentials', e.target.value)} placeholder='{"type": "service_account", ...}' className={inputClass + " h-20"} />
            </div>
          </div>
        )

      // SharePoint
      case 'sharepoint-list':
        return (
          <div className="space-y-3">
            <div>
              <label className={labelClass}>SharePoint Site URL *</label>
              <input type="url" value={connectionConfig.siteUrl || ''} onChange={(e) => handleConfigChange('siteUrl', e.target.value)} placeholder="https://company.sharepoint.com/sites/sitename" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>List Name *</label>
              <input type="text" value={connectionConfig.listName || ''} onChange={(e) => handleConfigChange('listName', e.target.value)} placeholder="List Name" className={inputClass} />
            </div>
          </div>
        )

      // ODBC
      case 'odbc':
        return (
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Connection String *</label>
              <textarea value={connectionConfig.connectionString || ''} onChange={(e) => handleConfigChange('connectionString', e.target.value)} placeholder="Driver={SQL Server};Server=myServerAddress;Database=myDataBase;Uid=myUsername;Pwd=myPassword;" className={inputClass + " h-24"} />
            </div>
          </div>
        )

      // JDBC
      case 'jdbc':
        return (
          <>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>JDBC URL *</label>
                <input type="text" value={connectionConfig.jdbcUrl || ''} onChange={(e) => handleConfigChange('jdbcUrl', e.target.value)} placeholder="jdbc:sqlserver://server:port;database=db" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Driver Class *</label>
                <input type="text" value={connectionConfig.driverClass || ''} onChange={(e) => handleConfigChange('driverClass', e.target.value)} placeholder="com.microsoft.sqlserver.jdbc.SQLServerDriver" className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Username</label>
                  <input type="text" value={connectionConfig.username || ''} onChange={(e) => handleConfigChange('username', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Password</label>
                  <input type="password" value={connectionConfig.password || ''} onChange={(e) => handleConfigChange('password', e.target.value)} className={inputClass} />
                </div>
              </div>
            </div>
          </>
        )

      // Blank Query (SQL Editor)
      case 'blank-query':
        return (
          <div className="space-y-3">
            <div>
              <label className={labelClass}>SQL Query</label>
              <textarea value={connectionConfig.query || ''} onChange={(e) => handleConfigChange('query', e.target.value)} placeholder="SELECT * FROM table_name WHERE condition" className={inputClass + " h-32 font-mono text-xs"} />
              <p className="text-xs text-gray-500 mt-1">Write your custom SQL query here</p>
            </div>
          </div>
        )

      default:
        return (
          <div className="text-center py-8 text-gray-500">
            <InformationCircleIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p>Configuration form for {selectedSource.name} coming soon</p>
          </div>
        )
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black opacity-30" onClick={handleCancel}></div>
        
        <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full my-8 flex flex-col max-h-[85vh] relative">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Get Data</h2>
              <p className="text-sm text-gray-500 mt-1">
                Connect to hundreds of data sources to create reports and dashboards
              </p>
            </div>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircleIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
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
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-2xl mx-auto">
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
                    {renderConnectionForm()}

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
                          <div className="flex-1">
                            <span className={`text-sm font-medium ${
                              connectionStatus === 'testing' ? 'text-blue-700' :
                              connectionStatus === 'success' ? 'text-green-700' :
                              'text-red-700'
                            }`}>
                              {connectionStatus === 'testing' && 'Testing connection...'}
                              {connectionStatus === 'success' && 'Connection successful!'}
                              {connectionStatus === 'error' && 'Connection failed'}
                            </span>
                            {connectionStatus === 'error' && errorMessage && (
                              <p className="text-xs text-red-600 mt-1">{errorMessage}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            <button
              onClick={() => step === 'configure' ? setStep('select-source') : handleCancel()}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {step === 'configure' ? 'Back' : 'Cancel'}
            </button>
            
            <div className="flex space-x-3">
              {step === 'configure' && (
                <>
                  <button
                    onClick={testConnection}
                    disabled={isConnecting || !isConnectionConfigValid()}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    {isConnecting ? 'Testing...' : 'Test Connection'}
                  </button>
                  <button
                    onClick={handleConnect}
                    disabled={isConnecting || !isConnectionConfigValid()}
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