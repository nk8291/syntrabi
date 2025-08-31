/**
 * Dataset related type definitions
 */

export type ConnectorType = 'csv' | 'postgresql' | 'mysql' | 'bigquery' | 'snowflake' | 'excel' | 'json' | 'rest_api'

export type DatasetStatus = 'pending' | 'processing' | 'ready' | 'error' | 'refreshing'

export interface Dataset {
  id: string
  workspace_id: string
  name: string
  description?: string
  connector_type: ConnectorType
  schema_json?: Record<string, any>
  sample_rows?: Record<string, any>[]
  row_count?: number
  file_size?: number
  status: DatasetStatus
  error_message?: string
  file_url?: string
  refresh_enabled: boolean
  last_refresh?: string
  next_refresh?: string
  created_at?: string
  updated_at?: string
}

export interface DatasetColumn {
  name: string
  type: 'string' | 'number' | 'boolean' | 'date' | 'datetime'
  nullable: boolean
  description?: string
}

export interface QueryRequest {
  columns?: string[]
  filters?: QueryFilter[]
  aggregations?: QueryAggregation[]
  group_by?: string[]
  order_by?: QueryOrderBy[]
  limit?: number
  offset?: number
}

export interface QueryFilter {
  column: string
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'like'
  value: any
}

export interface QueryAggregation {
  column: string
  function: 'sum' | 'count' | 'avg' | 'min' | 'max'
  alias?: string
}

export interface QueryOrderBy {
  column: string
  direction: 'asc' | 'desc'
}

export interface QueryResponse {
  data: Record<string, any>[]
  columns: DatasetColumn[]
  total_rows: number
  execution_time: number
}