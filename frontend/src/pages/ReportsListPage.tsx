/**
 * Reports List Page Component
 * Shows all reports across workspaces with filtering and search
 */

import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  PlusIcon,
  DocumentChartBarIcon,
  EyeIcon,
  PencilIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CalendarIcon,
  FolderIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '@/contexts/AuthContext'

const ReportsListPage: React.FC = () => {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedWorkspace, setSelectedWorkspace] = useState('all')

  // Mock data - this would come from API
  const reports = [
    {
      id: 'rpt1',
      name: 'Sales Dashboard',
      description: 'Interactive sales dashboard showing key metrics and trends',
      workspaceId: 'ws1',
      workspaceName: 'My Workspace',
      ownerId: user?.id,
      isOwner: true,
      isPublished: true,
      updatedAt: new Date(),
      createdAt: new Date(),
      thumbnailUrl: null,
    }
  ]

  const workspaces = [
    { id: 'ws1', name: 'My Workspace' }
  ]

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesWorkspace = selectedWorkspace === 'all' || report.workspaceId === selectedWorkspace
    return matchesSearch && matchesWorkspace
  })

  const handleCreateReport = () => {
    // For demo purposes, navigate directly to the report designer
    window.location.href = '/reports/demo'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600 mt-1">
            Create and manage your data visualizations
          </p>
        </div>
        <button
          onClick={handleCreateReport}
          className="btn btn-primary flex items-center space-x-2"
        >
          <PlusIcon className="h-5 w-5" />
          <span>New Report</span>
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
        <div className="flex items-center space-x-2">
          <FunnelIcon className="h-5 w-5 text-gray-400" />
          <select
            value={selectedWorkspace}
            onChange={(e) => setSelectedWorkspace(e.target.value)}
            className="select"
          >
            <option value="all">All Workspaces</option>
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Reports Grid */}
      {filteredReports.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-12">
            <DocumentChartBarIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {reports.length === 0 ? 'No reports yet' : 'No reports match your search'}
            </h3>
            <p className="text-gray-500 mb-6">
              {reports.length === 0 
                ? 'Create your first report to start visualizing your data'
                : 'Try adjusting your search terms or filters'
              }
            </p>
            {reports.length === 0 && (
              <button
                onClick={handleCreateReport}
                className="btn btn-primary"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Create Your First Report
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map((report) => (
            <div key={report.id} className="card hover:shadow-md transition-shadow">
              <div className="card-body">
                {/* Report Thumbnail */}
                <div className="aspect-video bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                  {report.thumbnailUrl ? (
                    <img
                      src={report.thumbnailUrl}
                      alt={report.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <DocumentChartBarIcon className="h-12 w-12 text-gray-400" />
                  )}
                </div>

                {/* Report Info */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {report.name}
                    </h3>
                    {report.isPublished && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 ml-2">
                        Published
                      </span>
                    )}
                  </div>

                  {report.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {report.description}
                    </p>
                  )}

                  <div className="flex items-center text-xs text-gray-500">
                    <FolderIcon className="h-4 w-4 mr-1" />
                    {report.workspaceName}
                  </div>

                  <div className="flex items-center text-xs text-gray-500">
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    Updated {report.updatedAt.toLocaleDateString()}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2 mt-4">
                  <Link
                    to={`/workspace/${report.workspaceId}/report/${report.id}/view`}
                    className="btn btn-outline btn-sm flex-1"
                  >
                    <EyeIcon className="h-4 w-4 mr-1" />
                    View
                  </Link>
                  {report.isOwner && (
                    <Link
                      to={`/workspace/${report.workspaceId}/report/${report.id}/design`}
                      className="btn btn-primary btn-sm flex-1"
                    >
                      <PencilIcon className="h-4 w-4 mr-1" />
                      Edit
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ReportsListPage