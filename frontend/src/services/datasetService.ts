/**
 * Dataset service for PowerBI Web Replica
 * Handles dataset management and data operations
 */

import { apiClient } from './apiClient'
import { v5 as uuidv5, validate as validateUUID } from 'uuid'

export interface Dataset {
  id: string
  workspace_id: string
  name: string
  description?: string
  connector_type: string  // Supports all backend ConnectorType enum values
  status: 'pending' | 'processing' | 'ready' | 'error' | 'refreshing'
  connection_config: any
  schema_json: any
  row_count?: number
  file_size?: number
  created_at: string
  updated_at: string
}

export interface DatasetColumn {
  name: string
  type: 'string' | 'number' | 'boolean' | 'date' | 'datetime'
  nullable?: boolean
}

export interface DatasetSchema {
  columns: DatasetColumn[]
}

export interface DatasetQuery {
  columns?: string[]
  filters?: any[]
  aggregations?: any[]
  group_by?: string[]
  order_by?: { [key: string]: 'asc' | 'desc' }[]
  limit?: number
  offset?: number
}

export interface DatasetQueryResult {
  data: any[]
  columns: { [key: string]: string }[]
  total_rows: number
  execution_time: number
}

const WORKSPACE_NAMESPACE = 'b5e6f4b2-1234-5678-9abc-def012345678'

class DatasetService {
  /**
   * Normalize workspace ID: if not a valid UUID, generate a deterministic UUID v5
   */
  private normalizeWorkspaceId(workspaceId: string): string {
    if (validateUUID(workspaceId)) return workspaceId
    console.warn(`Invalid workspaceId "${workspaceId}" detected. Generating UUID v5.`)
    return uuidv5(workspaceId, WORKSPACE_NAMESPACE)
  }

  /**
   * Normalize connector type: convert to lowercase and replace hyphens with underscores
   * to match backend enum format (Phase 1 connectors only)
   */
  private normalizeConnectorType(connectorType: string): string {
    // Convert to lowercase and replace hyphens with underscores
    const normalized = connectorType.toLowerCase().replace(/-/g, '_')

    // Phase 1 supported connector types (matching backend ConnectorType enum)
    const allowed = [
      // File-based sources (Phase 1)
      'csv', 'excel', 'json', 'pdf',
      // Database sources (Phase 1)
      'postgresql', 'mysql', 'mariadb'
    ]

    if (!allowed.includes(normalized)) {
      throw new Error(
        `Invalid connector type: ${connectorType}. Phase 1 supports only: ${allowed.join(', ')}`
      )
    }
    return normalized
  }

  /**
   * Get datasets for workspace
   */
  async getDatasets(workspaceId: string): Promise<Dataset[]> {
    const normalizedWorkspaceId = this.normalizeWorkspaceId(workspaceId)
    const response = await apiClient.get(`/api/datasets/workspaces/${normalizedWorkspaceId}/datasets`)
    return response.data
  }

  /**
   * Get dataset by ID
   */
  async getDataset(datasetId: string): Promise<Dataset> {
    const response = await apiClient.get(`/api/datasets/${datasetId}`)
    return response.data
  }

  /**
   * Upload CSV dataset
   */
  async uploadDataset(workspaceId: string, file: File, name: string): Promise<Dataset> {
    const normalizedWorkspaceId = this.normalizeWorkspaceId(workspaceId)
    const connectorType = this.normalizeConnectorType('csv')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', name)
    formData.append('connector_type', connectorType)

    console.log('Uploading dataset payload:', { workspaceId: normalizedWorkspaceId, name, connector_type: connectorType })


    const response = await apiClient.post(
      `/api/datasets/workspaces/${normalizedWorkspaceId}/datasets`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return response.data
  }

  /**
   * Create database connection dataset
   */
  // async createDatabaseDataset(
  //   workspaceId: string,
  //   name: string,
  //   connectorType: string,
  //   connectionConfig: any
  // ): Promise<Dataset> {
  //   const normalizedWorkspaceId = this.normalizeWorkspaceId(workspaceId)
  //   const normalizedConnector = this.normalizeConnectorType(connectorType)

  //   const formData = new FormData()
  //   formData.append('name', name)
  //   formData.append('connector_type', normalizedConnector)
  //   formData.append('connection_config', JSON.stringify(connectionConfig))

  //   console.log('Creating database dataset payload:', { workspaceId: normalizedWorkspaceId, name, connector_type: normalizedConnector })

  //   const response = await apiClient.post(
  //     `/api/datasets/workspaces/${normalizedWorkspaceId}/datasets`,
  //     formData,
  //     {
  //       headers: { 'Content-Type': 'multipart/form-data' },
  //       timeout: 200000000 // 60 seconds for database connection and schema fetch
  //     }
  //   )
  //   return response.data
  // }

  /**
   * Query dataset
   */
  async queryDataset(datasetId: string, query: DatasetQuery): Promise<DatasetQueryResult> {
    const response = await apiClient.post(`/api/datasets/${datasetId}/query`, query)
    return response.data
  }

  /**
   * Get dataset preview (first 100 rows)
   */
  async previewDataset(datasetId: string): Promise<DatasetQueryResult> {
    return this.queryDataset(datasetId, { limit: 100 })
  }

  /**
   * Get dataset schema
   */
  async getDatasetSchema(datasetId: string): Promise<DatasetSchema> {
    const dataset = await this.getDataset(datasetId)
    return dataset.schema_json
  }

  /**
   * Delete dataset
   */
  async deleteDataset(workspaceId: string, datasetId: string): Promise<void> {
    this.normalizeWorkspaceId(workspaceId) // normalize just in case
    await apiClient.delete(`/api/datasets/${datasetId}`)
  }

  /**
   * Refresh dataset
   */
  async refreshDataset(workspaceId: string, datasetId: string): Promise<Dataset> {
    this.normalizeWorkspaceId(workspaceId)
    const response = await apiClient.post(`/api/datasets/${datasetId}/refresh`)
    return response.data
  }

  /**
   * Get dataset preview with enhanced functionality
   */
  async getDatasetPreview(workspaceId: string, datasetId: string): Promise<DatasetQueryResult> {
    this.normalizeWorkspaceId(workspaceId)
    return this.queryDataset(datasetId, { limit: 100 })
  }

  /**
   * Test database connection (Phase 1)
   */
  async testConnection(connectorType: string, connectionConfig: any): Promise<{ success: boolean; message: string }> {
    const normalizedConnector = this.normalizeConnectorType(connectorType)

    try {
      // Backend expects POST /api/datasets/connectors/test with connector_type and config
      const response = await apiClient.post('/api/datasets/connectors/test', {
        connector_type: normalizedConnector,
        config: connectionConfig  // Note: backend expects 'config', not 'connection_config'
      })
      return response.data
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.detail || error.message || 'Connection test failed'
      }
    }
  }

  /**
   * Get database schema (tables and columns) after successful connection test
   */
  async getDatabaseSchema(connectorType: string, connectionConfig: any): Promise<any> {
    const normalizedConnector = this.normalizeConnectorType(connectorType)

    const response = await apiClient.post('/api/datasets/connectors/schema', {
      connector_type: normalizedConnector,
      config: connectionConfig
    })
    return response.data
  }

  async getAvailableTables(payload: {
    connector_type: string
    config: any
  }) {
    const res = await apiClient.post('/connectors/tables', payload)
    return res.data
  }
  
 async createDatabaseDatasetWithTables(workspaceId: string, payload: any) {
  return apiClient.post(
    `/workspaces/${workspaceId}/datasets`,
    payload,
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  )
}


}

export const datasetService = new DatasetService()