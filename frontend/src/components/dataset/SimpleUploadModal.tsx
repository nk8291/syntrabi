/**
 * Simple Upload Modal Component
 * Basic file upload without external dependencies
 */

import React, { useState, useRef } from 'react'
import {
  XMarkIcon,
  DocumentArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'
import { datasetService } from '@/services/datasetService'
import toast from 'react-hot-toast'

interface SimpleUploadModalProps {
  isOpen: boolean
  onClose: () => void
  workspaceId: string
  onSuccess: (dataset: any) => void
}

const SimpleUploadModal: React.FC<SimpleUploadModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  onSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [datasetName, setDatasetName] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Basic file validation
      const allowedTypes = ['text/csv', 'application/csv', 'application/vnd.ms-excel']
      const isValidType = allowedTypes.includes(file.type) || file.name.toLowerCase().endsWith('.csv')
      
      if (!isValidType) {
        toast.error('Please select a CSV file')
        return
      }

      const maxSize = 100 * 1024 * 1024 // 100MB
      if (file.size > maxSize) {
        toast.error('File is too large. Maximum size is 100MB.')
        return
      }

      setSelectedFile(file)
      setDatasetName(file.name.replace(/\.(csv|xlsx?|txt)$/i, ''))
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !datasetName.trim()) {
      toast.error('Please select a file and provide a dataset name')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const dataset = await datasetService.uploadDataset(
        workspaceId,
        selectedFile,
        datasetName
      )

      clearInterval(progressInterval)
      setUploadProgress(100)

      toast.success('Dataset uploaded successfully!')
      onSuccess(dataset)
      onClose()
      resetForm()
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload dataset')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const resetForm = () => {
    setSelectedFile(null)
    setDatasetName('')
    setUploadProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeFile = () => {
    setSelectedFile(null)
    setDatasetName('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Upload Dataset</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isUploading}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* File Upload Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select CSV File
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileSelect}
                disabled={isUploading}
                className="hidden"
              />
              
              {selectedFile ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CheckCircleIcon className="h-6 w-6 text-green-500" />
                      <div className="text-left">
                        <p className="text-sm font-medium text-gray-900">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(selectedFile.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeFile}
                      disabled={isUploading}
                      className="p-1 text-red-600 hover:text-red-500 disabled:opacity-50"
                      title="Remove file"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <DocumentArrowUpIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-sm text-gray-600">
                    Click to select a CSV file
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="btn btn-outline btn-sm mt-2"
                  >
                    Choose File
                  </button>
                  <p className="text-xs text-gray-400 mt-2">
                    Supports CSV files (max 100MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Dataset Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dataset Name *
            </label>
            <input
              type="text"
              value={datasetName}
              onChange={(e) => setDatasetName(e.target.value)}
              className="input w-full"
              placeholder="Enter dataset name"
              disabled={isUploading}
            />
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Uploading...</span>
                <span className="text-sm text-gray-600">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5 mr-2" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Upload Guidelines:</p>
                <ul className="mt-1 list-disc list-inside space-y-1 text-blue-700">
                  <li>Ensure your CSV has column headers in the first row</li>
                  <li>Use UTF-8 encoding for special characters</li>
                  <li>Missing values will be handled automatically</li>
                  <li>Maximum file size: 100MB</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t">
          <button
            onClick={onClose}
            className="btn btn-outline"
            disabled={isUploading}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || !datasetName.trim() || isUploading}
            className="btn btn-primary flex items-center space-x-2"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <DocumentArrowUpIcon className="h-4 w-4" />
                <span>Upload Dataset</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SimpleUploadModal