/**
 * Report Designer Page Component
 * Main report design interface with drag-and-drop canvas
 */

import React, { useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import PowerBIReportDesigner from '@/components/designer/PowerBIReportDesigner'
import { reportService } from '@/services/reportService'
import toast from 'react-hot-toast'

const ReportDesignerPage: React.FC = () => {
  const { workspaceId, reportId } = useParams<{ workspaceId: string; reportId: string }>()
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const reportDesignerRef = useRef<any>(null)
  
  // Default values for demo mode
  const actualWorkspaceId = workspaceId || 'ws1'
  const actualReportId = reportId || 'demo-report'

  const handleSave = async () => {
    try {
      setIsSaving(true)
      
      // Get current report state from designer
      const reportData = reportDesignerRef.current?.getReportData?.() || {
        name: "Untitled Report",
        report_json: {
          version: "1.0",
          pages: [],
          theme: {
            name: "default",
            colors: ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"]
          }
        }
      }
      
      if (actualReportId === 'demo-report') {
        // Create new report for demo mode
        await reportService.createReport({
          workspace_id: actualWorkspaceId,
          name: reportData.name,
          description: reportData.description,
          dataset_id: reportData.dataset_id,
          report_json: reportData.report_json
        })
        toast.success('Report saved successfully!')
      } else {
        // Update existing report
        await reportService.updateReport(actualReportId, reportData)
        toast.success('Report saved successfully!')
      }
      
    } catch (error: any) {
      toast.error(error.message || 'Failed to save report')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublish = async () => {
    try {
      setIsPublishing(true)
      
      if (actualReportId === 'demo-report') {
        // For demo mode, first save then publish
        await handleSave()
      }
      
      await reportService.publishReport(actualReportId)
      toast.success('Report published successfully!')
      
    } catch (error: any) {
      toast.error(error.message || 'Failed to publish report')
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      <PowerBIReportDesigner 
        ref={reportDesignerRef}
        workspaceId={actualWorkspaceId} 
        reportId={actualReportId}
        onSave={handleSave}
        onPublish={handlePublish}
        isSaving={isSaving}
        isPublishing={isPublishing}
      />
    </div>
  )
}

export default ReportDesignerPage