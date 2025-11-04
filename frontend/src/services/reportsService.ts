/**
 * Reports Service
 * Handles saving, loading, and managing Power BI reports
 */

import { ReportPage } from '@/types/report'
import { v4 as uuidv4, v5 as uuidv5, validate as validateUUID } from 'uuid'

export interface SavedReport {
  id: string
  name: string
  description?: string
  pages: ReportPage[]
  createdAt: string
  updatedAt: string
  workspaceId: string
  status: 'draft' | 'published'
}

// Constant namespace UUID for deterministic workspace ID generation
const WORKSPACE_NAMESPACE = 'b5e6f4b2-1234-5678-9abc-def012345678'

const API_BASE_URL = import.meta.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export class ReportsService {
  private static instance: ReportsService
  private reports: SavedReport[] = []

  private constructor() {
    this.loadReportsFromStorage()
  }

  public static getInstance(): ReportsService {
    if (!ReportsService.instance) {
      ReportsService.instance = new ReportsService()
    }
    return ReportsService.instance
  }

  private loadReportsFromStorage() {
    try {
      const stored = localStorage.getItem('powerbi_reports')
      if (stored) {
        this.reports = JSON.parse(stored)
      }
    } catch (error) {
      console.error('Failed to load reports from storage:', error)
      this.reports = []
    }
  }

  private saveReportsToStorage() {
    try {
      localStorage.setItem('powerbi_reports', JSON.stringify(this.reports))
    } catch (error) {
      console.error('Failed to save reports to storage:', error)
    }
  }
  private normalizeWorkspaceId(workspaceId: string): string {
    if (validateUUID(workspaceId)) {
      return workspaceId
    } else {
      // Generate deterministic UUID from short workspace IDs like 'ws1'
      return uuidv5(workspaceId, WORKSPACE_NAMESPACE)
    }
  }
  
  async saveReport(reportData: {
    name: string
    description?: string
    pages: ReportPage[]
    workspaceId: string
    id?: string
  }): Promise<SavedReport> {
    const now = new Date().toISOString()
    const workspaceId = this.normalizeWorkspaceId(reportData.workspaceId)

    // Replace reportData.workspaceId with validated UUID
    reportData.workspaceId = workspaceId

    let report: SavedReport
    
    // Always try backend first, fallback to localStorage
    try {
      if (reportData.id) {
        // Update existing report
        const response = await fetch(`${API_BASE_URL}/api/v1/reports/${reportData.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify({
            workspace_id: workspaceId,
            name: reportData.name,
            description: reportData.description,
            report_json: {
              version: '1.0',
              pages: reportData.pages
            }
          })
        })

        if (response.ok) {
          report = await response.json()
          report.pages = reportData.pages // Ensure pages are properly set
        } else {
          throw new Error('Backend update failed')
        }
      } else {
        // Create new report
        const response = await fetch(`${API_BASE_URL}/api/v1/reports`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify({
            workspace_id: workspaceId,
            name: reportData.name,
            description: reportData.description,
            report_json: {
              version: '1.0',
              pages: reportData.pages
            }
          })
        })

        if (response.ok) {
          report = await response.json()
          report.pages = reportData.pages // Ensure pages are properly set
        } else {
          throw new Error('Backend creation failed')
        }
      }
      
      // Update local cache
      const existingIndex = this.reports.findIndex(r => r.id === report.id)
      if (existingIndex >= 0) {
        this.reports[existingIndex] = report
      } else {
        this.reports.push(report)
      }
      this.saveReportsToStorage()

    } catch (error) {
      console.warn('Backend not available, using local storage fallback:', error)
      
      // Fallback to localStorage
      if (reportData.id) {
        const existingIndex = this.reports.findIndex(r => r.id === reportData.id)
        if (existingIndex >= 0) {
          report = {
            ...this.reports[existingIndex],
            ...reportData,
            updatedAt: now
          }
          this.reports[existingIndex] = report
        } else {
          throw new Error('Report not found')
        }
      } else {
        report = {
          id: `report-${Date.now()}`,
          name: reportData.name,
          description: reportData.description,
          pages: reportData.pages,
          createdAt: now,
          updatedAt: now,
          workspaceId,
          status: 'draft'
        }
        this.reports.push(report)
      }
      this.saveReportsToStorage()
    }

    return report
  }

  async publishReport(reportId: string): Promise<SavedReport> {
    const reportIndex = this.reports.findIndex(r => r.id === reportId)
    if (reportIndex < 0) {
      throw new Error('Report not found')
    }

    const report = this.reports[reportIndex]
    report.status = 'published'
    report.updatedAt = new Date().toISOString()

    this.saveReportsToStorage()

    // Try to publish to backend if available
    try {
      await fetch(`${API_BASE_URL}/api/v1/reports/${reportId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
    } catch (error) {
      console.warn('Backend not available for publishing:', error)
    }

    return report
  }

  getReports(workspaceId?: string): SavedReport[] {
    if (workspaceId) {
      const normalizedId = this.normalizeWorkspaceId(workspaceId)
      return this.reports.filter(r => r.workspaceId === normalizedId)
    }
    return [...this.reports]
  }

  getReport(reportId: string): SavedReport | null {
    return this.reports.find(r => r.id === reportId) || null
  }

  async deleteReport(reportId: string): Promise<void> {
    this.reports = this.reports.filter(r => r.id !== reportId)
    this.saveReportsToStorage()

    // Try to delete from backend if available
    try {
      await fetch(`${API_BASE_URL}/api/v1/reports/${reportId}`, {
        method: 'DELETE'
      })
    } catch (error) {
      console.warn('Backend not available for deletion:', error)
    }
  }

  async duplicateReport(reportId: string, newName: string): Promise<SavedReport> {
    const original = this.getReport(reportId)
    if (!original) {
      throw new Error('Report not found')
    }

    const duplicate = await this.saveReport({
      name: newName,
      description: original.description,
      pages: JSON.parse(JSON.stringify(original.pages)), // Deep clone
      workspaceId: original.workspaceId
    })

    return duplicate
  }
}

export const reportsService = ReportsService.getInstance()