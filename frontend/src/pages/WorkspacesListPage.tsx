/**
 * Workspaces List Page Component
 * Shows all workspaces with ability to create new ones
 */

import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  PlusIcon,
  FolderIcon,
  EllipsisVerticalIcon,
  UsersIcon,
  CalendarIcon,
  Cog6ToothIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '@/contexts/AuthContext'
import WorkspaceCreateModal from '@/components/workspace/WorkspaceCreateModal'

const WorkspacesListPage: React.FC = () => {
  const { user } = useAuth()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingWorkspace, setEditingWorkspace] = useState(null)
  const [workspaces, setWorkspaces] = useState([
    {
      id: 'ws1',
      name: 'My Workspace',
      description: 'Default workspace for admin user',
      ownerId: user?.id,
      isOwner: true,
      memberCount: 1,
      reportCount: 0,
      datasetCount: 0,
      updatedAt: new Date(),
      createdAt: new Date(),
    }
  ])

  const handleCreateWorkspace = () => {
    setShowCreateModal(true)
  }

  const handleWorkspaceCreated = (newWorkspace: any) => {
    setWorkspaces(prev => [...prev, newWorkspace])
  }

  const handleEditWorkspace = (workspace: any) => {
    setEditingWorkspace(workspace)
    setShowEditModal(true)
  }

  const handleDeleteWorkspace = (workspaceId: string) => {
    if (confirm('Are you sure you want to delete this workspace?')) {
      setWorkspaces(prev => prev.filter(ws => ws.id !== workspaceId))
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workspaces</h1>
          <p className="text-gray-600 mt-1">
            Organize and collaborate on your reports and datasets
          </p>
        </div>
        <button
          onClick={handleCreateWorkspace}
          className="btn btn-primary flex items-center space-x-2"
        >
          <PlusIcon className="h-5 w-5" />
          <span>New Workspace</span>
        </button>
      </div>

      {/* Workspaces Grid */}
      {workspaces.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-12">
            <FolderIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No workspaces yet</h3>
            <p className="text-gray-500 mb-6">
              Create your first workspace to start organizing your reports and datasets
            </p>
            <button
              onClick={handleCreateWorkspace}
              className="btn btn-primary"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Your First Workspace
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces.map((workspace) => (
            <div key={workspace.id} className="card hover:shadow-md transition-shadow">
              <div className="card-body">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FolderIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        <Link
                          to={`/workspace/${workspace.id}`}
                          className="hover:text-primary-600"
                        >
                          {workspace.name}
                        </Link>
                      </h3>
                      {workspace.isOwner && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">
                          Owner
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="relative group">
                    <button className="text-gray-400 hover:text-gray-600 p-1">
                      <EllipsisVerticalIcon className="h-5 w-5" />
                    </button>
                    
                    {/* Dropdown Menu */}
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                      <button
                        onClick={() => handleEditWorkspace(workspace)}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Cog6ToothIcon className="h-4 w-4 mr-3 text-gray-400" />
                        Settings
                      </button>
                      <button
                        onClick={() => handleEditWorkspace(workspace)}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <PencilSquareIcon className="h-4 w-4 mr-3 text-gray-400" />
                        Edit Details
                      </button>
                      {workspace.isOwner && (
                        <button
                          onClick={() => handleDeleteWorkspace(workspace.id)}
                          className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <TrashIcon className="h-4 w-4 mr-3" />
                          Delete Workspace
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {workspace.description && (
                  <p className="text-sm text-gray-600 mb-4">
                    {workspace.description}
                  </p>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Reports</span>
                    <span className="font-medium">{workspace.reportCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Datasets</span>
                    <span className="font-medium">{workspace.datasetCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center">
                      <UsersIcon className="h-4 w-4 mr-1" />
                      Members
                    </span>
                    <span className="font-medium">{workspace.memberCount}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center text-xs text-gray-500">
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    Updated {workspace.updatedAt.toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Workspace Modal */}
      <WorkspaceCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleWorkspaceCreated}
      />

      {/* Edit Workspace Modal */}
      {editingWorkspace && (
        <WorkspaceCreateModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setEditingWorkspace(null)
          }}
          onSuccess={(updatedWorkspace) => {
            setWorkspaces(prev => prev.map(ws => 
              ws.id === updatedWorkspace.id ? updatedWorkspace : ws
            ))
            setEditingWorkspace(null)
          }}
          // Pass existing workspace data for editing
          initialData={editingWorkspace}
        />
      )}
    </div>
  )
}

export default WorkspacesListPage