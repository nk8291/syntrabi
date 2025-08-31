/**
 * Workspace service for PowerBI Web Replica
 * Handles workspace management operations
 */

import { apiClient } from './apiClient'

// Mock data for development
let mockWorkspaces: Workspace[] = [
  {
    id: 'ws1',
    name: 'My Workspace',
    description: 'Default workspace for admin user',
    owner_id: 'user1',
    is_public: false,
    allow_external_sharing: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    datasets_count: 0,
    reports_count: 0,
    dashboards_count: 0
  }
]

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
    try {
      const response = await apiClient.get('/api/workspaces')
      return response.data
    } catch (error) {
      // Fallback to mock data for development
      return {
        workspaces: mockWorkspaces,
        total: mockWorkspaces.length
      }
    }
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
    try {
      const response = await apiClient.post('/api/workspaces', data)
      return response.data
    } catch (error) {
      // Fallback to mock data for development
      const newWorkspace: Workspace = {
        id: `ws-${Date.now()}`,
        name: data.name,
        description: data.description || '',
        owner_id: 'user1',
        is_public: data.is_public || false,
        allow_external_sharing: data.allow_external_sharing || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        datasets_count: 0,
        reports_count: 0,
        dashboards_count: 0
      }
      mockWorkspaces.push(newWorkspace)
      return newWorkspace
    }
  }

  /**
   * Update workspace
   */
  async updateWorkspace(workspaceId: string, data: Partial<CreateWorkspaceRequest>): Promise<Workspace> {
    try {
      const response = await apiClient.put(`/api/workspaces/${workspaceId}`, data)
      return response.data
    } catch (error) {
      // Fallback to mock data for development
      const index = mockWorkspaces.findIndex(ws => ws.id === workspaceId)
      if (index !== -1) {
        mockWorkspaces[index] = {
          ...mockWorkspaces[index],
          ...data,
          updated_at: new Date().toISOString()
        }
        return mockWorkspaces[index]
      }
      throw new Error('Workspace not found')
    }
  }

  /**
   * Delete workspace
   */
  async deleteWorkspace(workspaceId: string): Promise<void> {
    try {
      await apiClient.delete(`/api/workspaces/${workspaceId}`)
    } catch (error) {
      // Fallback to mock data for development
      mockWorkspaces = mockWorkspaces.filter(ws => ws.id !== workspaceId)
    }
  }
}

export const workspaceService = new WorkspaceService()