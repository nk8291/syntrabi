/**
 * Workspace related type definitions
 */

export interface Workspace {
  id: string
  name: string
  description?: string
  owner_id: string
  is_public: boolean
  allow_external_sharing: boolean
  created_at?: string
  updated_at?: string
  datasets_count: number
  reports_count: number
  dashboards_count: number
}

export interface CreateWorkspaceRequest {
  name: string
  description?: string
  is_public?: boolean
  allow_external_sharing?: boolean
}

export interface UpdateWorkspaceRequest {
  name?: string
  description?: string
  is_public?: boolean
  allow_external_sharing?: boolean
}