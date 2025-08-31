/**
 * Workspace Page Component
 * Displays workspace contents and management options
 */

import React from 'react'
import { useParams } from 'react-router-dom'

const WorkspacePage: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Workspace Details
      </h1>
      <p className="text-gray-600">
        Workspace ID: {workspaceId}
      </p>
      <p className="text-sm text-gray-500 mt-4">
        This page will show workspace contents, reports, datasets, and management options.
      </p>
    </div>
  )
}

export default WorkspacePage