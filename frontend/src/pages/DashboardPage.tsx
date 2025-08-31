/**
 * Dashboard Page Component
 * Main landing page showing workspaces, recent reports, and quick actions
 */

import React from 'react'
import { Link } from 'react-router-dom'
import {
  PlusIcon,
  FolderIcon,
  DocumentChartBarIcon,
  TableCellsIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '@/contexts/AuthContext'

const DashboardPage: React.FC = () => {
  const { user } = useAuth()

  const quickActions = [
    {
      name: 'Create Report',
      description: 'Start building a new report',
      href: '/reports',
      icon: DocumentChartBarIcon,
      color: 'bg-blue-500',
    },
    {
      name: 'Add Dataset',
      description: 'Upload or connect to data',
      href: '/datasets',
      icon: TableCellsIcon,
      color: 'bg-green-500',
    },
    {
      name: 'New Workspace',
      description: 'Create a new workspace',
      href: '/workspaces',
      icon: FolderIcon,
      color: 'bg-purple-500',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-lg p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {user?.name}!
        </h1>
        <p className="text-primary-100 text-lg">
          Ready to create amazing reports and dashboards? Let's get started.
        </p>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action) => (
            <Link
              key={action.name}
              to={action.href}
              className="card hover:shadow-md transition-shadow duration-200 group"
            >
              <div className="card-body">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-lg ${action.color}`}>
                    <action.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 group-hover:text-primary-600">
                      {action.name}
                    </h3>
                    <p className="text-sm text-gray-500">{action.description}</p>
                  </div>
                  <ArrowRightIcon className="h-5 w-5 text-gray-400 group-hover:text-primary-500 transition-colors" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Workspaces */}
        <div className="card">
          <div className="card-header flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Recent Workspaces</h3>
            <Link
              to="/workspaces"
              className="text-sm text-primary-600 hover:text-primary-500 flex items-center space-x-1"
            >
              <span>View all</span>
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
          <div className="card-body">
            <div className="text-center py-8 text-gray-500">
              <FolderIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm">No workspaces yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Create your first workspace to get started
              </p>
              <Link to="/workspaces" className="btn btn-outline btn-sm mt-4">
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Workspace
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Reports */}
        <div className="card">
          <div className="card-header flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Recent Reports</h3>
            <Link
              to="/reports"
              className="text-sm text-primary-600 hover:text-primary-500 flex items-center space-x-1"
            >
              <span>View all</span>
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
          <div className="card-body">
            <div className="text-center py-8 text-gray-500">
              <DocumentChartBarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm">No reports yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Create your first report to start visualizing data
              </p>
              <Link to="/reports/demo" className="btn btn-outline btn-sm mt-4">
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Report
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Getting Started Guide */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Getting Started</h3>
        </div>
        <div className="card-body">
          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary-600">1</span>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Create a workspace</h4>
                <p className="text-sm text-gray-500">Organize your projects and collaborate with your team</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary-600">2</span>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Add your data</h4>
                <p className="text-sm text-gray-500">Upload CSV files or connect to databases</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary-600">3</span>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Build reports</h4>
                <p className="text-sm text-gray-500">Drag and drop to create beautiful visualizations</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary-600">4</span>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Share insights</h4>
                <p className="text-sm text-gray-500">Publish and share your reports with stakeholders</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage