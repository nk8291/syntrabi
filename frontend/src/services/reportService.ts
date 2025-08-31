/**
 * Report service for PowerBI Web Replica
 * Handles report management and visualization operations
 */

import { apiClient } from './apiClient'

export interface Report {
  id: string
  workspace_id: string
  owner_id: string
  dataset_id?: string
  name: string
  description?: string
  report_json: any
  version: number
  is_published: boolean
  is_public: boolean
  allow_embedding: boolean
  thumbnail_url?: string
  created_at: string
  updated_at: string
  published_at?: string
}

export interface CreateReportRequest {
  workspace_id: string
  name: string
  description?: string
  dataset_id?: string
  report_json?: any
}

export interface RenderRequest {
  format?: 'vega_lite'
  width?: number
  height?: number
}

export interface RenderResponse {
  vega_lite_spec: any
  data_url?: string
}

class ReportService {
  /**
   * Get reports for workspace or all reports
   */
  async getReports(workspaceId?: string): Promise<Report[]> {
    const params = workspaceId ? { workspace_id: workspaceId } : {}
    const response = await apiClient.get('/api/reports', { params })
    return response.data
  }

  /**
   * Get report by ID
   */
  async getReport(reportId: string): Promise<Report> {
    const response = await apiClient.get(`/api/reports/${reportId}`)
    return response.data
  }

  /**
   * Create new report
   */
  async createReport(data: CreateReportRequest): Promise<Report> {
    const response = await apiClient.post('/api/reports', data)
    return response.data
  }

  /**
   * Update report
   */
  async updateReport(reportId: string, reportData: any): Promise<Report> {
    const response = await apiClient.put(`/api/reports/${reportId}`, reportData)
    return response.data
  }

  /**
   * Delete report
   */
  async deleteReport(reportId: string): Promise<void> {
    await apiClient.delete(`/api/reports/${reportId}`)
  }

  /**
   * Render report to Vega-Lite specification
   */
  async renderReport(reportId: string, options?: RenderRequest): Promise<RenderResponse> {
    const response = await apiClient.post(`/api/reports/${reportId}/render`, options || {})
    return response.data
  }

  /**
   * Export report
   */
  async exportReport(reportId: string, format: 'png' | 'pdf' = 'png'): Promise<Blob> {
    const response = await apiClient.post(
      `/api/reports/${reportId}/export`,
      { format },
      { responseType: 'blob' }
    )
    return response.data
  }

  /**
   * Publish report
   */
  async publishReport(reportId: string): Promise<Report> {
    return this.updateReport(reportId, { is_published: true, published_at: new Date().toISOString() })
  }

  /**
   * Unpublish report
   */
  async unpublishReport(reportId: string): Promise<Report> {
    return this.updateReport(reportId, { is_published: false })
  }
}

export const reportService = new ReportService()