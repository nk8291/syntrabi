/**
 * Workspace Create Modal Component
 * Modal for creating and managing workspaces
 */

import React, { useState } from 'react'
import { XMarkIcon, FolderIcon, GlobeAltIcon, LockClosedIcon } from '@heroicons/react/24/outline'
import { workspaceService, CreateWorkspaceRequest } from '@/services/workspaceService'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import toast from 'react-hot-toast'

interface WorkspaceCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (workspace: any) => void
  initialData?: any
}

const WorkspaceCreateModal: React.FC<WorkspaceCreateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const isEditMode = !!initialData
  
  const [formData, setFormData] = useState<CreateWorkspaceRequest>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    is_public: initialData?.is_public || false,
    allow_external_sharing: initialData?.allow_external_sharing || false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (field: keyof CreateWorkspaceRequest, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Please provide a workspace name')
      return
    }

    setIsSubmitting(true)
    try {
      let workspace
      if (isEditMode) {
        // Mock update workspace (in real app would use workspaceService.updateWorkspace)
        workspace = { ...initialData, ...formData }
        toast.success('Workspace updated successfully!')
      } else {
        workspace = await workspaceService.createWorkspace(formData)
        toast.success('Workspace created successfully!')
      }
      onSuccess(workspace)
      onClose()
      resetForm()
    } catch (error: any) {
      toast.error(error.message || `Failed to ${isEditMode ? 'update' : 'create'} workspace`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      is_public: false,
      allow_external_sharing: false,
    })
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
      resetForm()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <FolderIcon className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {isEditMode ? 'Edit Workspace' : 'Create Workspace'}
              </h2>
              <p className="text-sm text-gray-500">
                {isEditMode ? 'Update your workspace settings' : 'Set up a new workspace for your team'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Workspace Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Workspace Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="input w-full"
              placeholder="Enter workspace name"
              disabled={isSubmitting}
              maxLength={100}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Choose a descriptive name for your workspace
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="input w-full h-20 resize-none"
              placeholder="Describe the purpose of this workspace..."
              disabled={isSubmitting}
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              Help others understand what this workspace is for
            </p>
          </div>

          {/* Privacy Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Privacy & Access</h3>
            
            {/* Public Workspace */}
            <div className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={formData.is_public}
                  onChange={(e) => handleInputChange('is_public', e.target.checked)}
                  disabled={isSubmitting}
                  className="checkbox"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="is_public" className="flex items-center space-x-2 cursor-pointer">
                  <GlobeAltIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">Public Workspace</span>
                </label>
                <p className="text-xs text-gray-600 mt-1">
                  Anyone in your organization can discover and access this workspace
                </p>
              </div>
            </div>

            {/* External Sharing */}
            <div className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  id="allow_external_sharing"
                  checked={formData.allow_external_sharing}
                  onChange={(e) => handleInputChange('allow_external_sharing', e.target.checked)}
                  disabled={isSubmitting}
                  className="checkbox"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="allow_external_sharing" className="flex items-center space-x-2 cursor-pointer">
                  <LockClosedIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">Allow External Sharing</span>
                </label>
                <p className="text-xs text-gray-600 mt-1">
                  Members can share reports and dashboards with users outside your organization
                </p>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <FolderIcon className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-blue-800">What's a workspace?</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Workspaces help you organize your reports, dashboards, and datasets. 
                  You can control who has access and how content is shared.
                </p>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50 rounded-b-lg">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="btn btn-outline"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.name.trim()}
            className="btn btn-primary flex items-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner size="sm" />
                <span>{isEditMode ? 'Updating...' : 'Creating...'}</span>
              </>
            ) : (
              <>
                <FolderIcon className="h-4 w-4" />
                <span>{isEditMode ? 'Update Workspace' : 'Create Workspace'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default WorkspaceCreateModal