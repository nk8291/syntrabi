/**
 * Workspace service for PowerBI Web Replica
 * Handles workspace management operations
 */

import { apiClient } from './apiClient'

export interface Workspace {
  id: string
  name: string
  description?: string
  owner_id: string
  is_public: boolean
  allow_external_sharing: boolean
  created_at: string
  updated_at: string
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

class WorkspaceService {
  /**
   * Get all workspaces for current user
   */
  async getWorkspaces(): Promise<{ workspaces: Workspace[]; total: number }> {
    const response = await apiClient.get('/api/workspaces')
    return response.data
  }

  /**
   * Get workspace by ID
   */
  async getWorkspace(workspaceId: string): Promise<Workspace> {
    const response = await apiClient.get(`/api/workspaces/${workspaceId}`)
    return response.data
  }

  /**
   * Create new workspace
   */
  async createWorkspace(data: CreateWorkspaceRequest): Promise<Workspace> {
    const response = await apiClient.post('/api/workspaces', data)
    return response.data
  }

  /**
   * Update workspace
   */
  async updateWorkspace(workspaceId: string, data: Partial<CreateWorkspaceRequest>): Promise<Workspace> {
    const response = await apiClient.put(`/api/workspaces/${workspaceId}`, data)
    return response.data
  }

  /**
   * Delete workspace
   */
  async deleteWorkspace(workspaceId: string): Promise<void> {
    await apiClient.delete(`/api/workspaces/${workspaceId}`)
  }
}

export const workspaceService = new WorkspaceService()