/**
 * Dataset service for PowerBI Web Replica
 * Handles dataset management and data operations
 */

import { apiClient } from './apiClient'

export interface Dataset {
  id: string
  workspace_id: string
  name: string
  description?: string
  connector_type: 'csv' | 'postgresql' | 'mysql' | 'bigquery' | 'snowflake' | 'excel' | 'json' | 'rest_api'
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

class DatasetService {
  /**
   * Get datasets for workspace
   */
  async getDatasets(workspaceId: string): Promise<Dataset[]> {
    const response = await apiClient.get(`/api/datasets/workspaces/${workspaceId}/datasets`)
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
    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', name)
    formData.append('connector_type', 'csv')

    const response = await apiClient.post(
      `/api/datasets/workspaces/${workspaceId}/datasets`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  }

  /**
   * Create database connection
   */
  async createDatabaseDataset(
    workspaceId: string,
    name: string,
    connectorType: string,
    connectionConfig: any
  ): Promise<Dataset> {
    // Use FormData to match the backend endpoint
    const formData = new FormData()
    formData.append('name', name)
    formData.append('connector_type', connectorType)
    formData.append('connection_config', JSON.stringify(connectionConfig))

    const response = await apiClient.post(
      `/api/datasets/workspaces/${workspaceId}/datasets`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  }

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
    await apiClient.delete(`/api/datasets/${datasetId}`)
  }

  /**
   * Refresh dataset
   */
  async refreshDataset(workspaceId: string, datasetId: string): Promise<Dataset> {
    const response = await apiClient.post(`/api/datasets/${datasetId}/refresh`)
    return response.data
  }

  /**
   * Get dataset preview with enhanced functionality
   */
  async getDatasetPreview(workspaceId: string, datasetId: string): Promise<DatasetQueryResult> {
    return this.queryDataset(datasetId, { limit: 100 })
  }
}

export const datasetService = new DatasetService()