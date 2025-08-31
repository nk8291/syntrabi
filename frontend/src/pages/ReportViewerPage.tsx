/**
 * Report Viewer Page Component
 * Read-only report viewing interface
 */

import React from 'react'
import { useParams } from 'react-router-dom'

const ReportViewerPage: React.FC = () => {
  const { workspaceId, reportId } = useParams<{ workspaceId: string; reportId: string }>()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Report Viewer
      </h1>
      <p className="text-gray-600">
        Workspace ID: {workspaceId}
      </p>
      <p className="text-gray-600">
        Report ID: {reportId}
      </p>
      <p className="text-sm text-gray-500 mt-4">
        This page will display the report in view-only mode with interactive filters and drill-through capabilities.
      </p>
    </div>
  )
}

export default ReportViewerPage