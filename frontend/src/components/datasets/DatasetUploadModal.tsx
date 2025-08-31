/**
 * Dataset Upload Modal
 * Modal for uploading CSV, Excel, and JSON files with Import mode configuration
 */

import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  XMarkIcon,
  DocumentArrowUpIcon,
  InformationCircleIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline'

interface DatasetUploadModalProps {
  onClose: () => void
  onUpload: (file: File, name: string, mode: 'import' | 'directquery') => Promise<void>
}

const DatasetUploadModal: React.FC<DatasetUploadModalProps> = ({
  onClose,
  onUpload
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [datasetName, setDatasetName] = useState('')
  const [description, setDescription] = useState('')
  const [mode, setMode] = useState<'import' | 'directquery'>('import')
  const [uploading, setUploading] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      setSelectedFile(file)
      if (!datasetName) {
        setDatasetName(file.name.replace(/\.[^/.]+$/, ''))
      }
    }
  }, [datasetName])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/json': ['.json']
    },
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024 // 100MB
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile || !datasetName) return

    try {
      setUploading(true)
      await onUpload(selectedFile, datasetName, mode)
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setUploading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Upload Dataset</h2>
            <p className="text-sm text-gray-600 mt-1">
              Upload CSV, Excel, or JSON files to create a new dataset
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* File Upload Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select File
            </label>
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                ${isDragActive 
                  ? 'border-primary-400 bg-primary-50' 
                  : selectedFile
                  ? 'border-green-400 bg-green-50'
                  : 'border-gray-300 hover:border-gray-400'
                }
              `}
            >
              <input {...getInputProps()} />
              
              {selectedFile ? (
                <div className="space-y-2">
                  <DocumentArrowUpIcon className="h-8 w-8 mx-auto text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedFile(null)
                      setDatasetName('')
                    }}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <CloudArrowUpIcon className="h-8 w-8 mx-auto text-gray-400" />
                  {isDragActive ? (
                    <p className="text-sm text-primary-600">Drop the file here...</p>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-600">
                        Drag & drop a file here, or click to select
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Supports CSV, Excel (.xlsx, .xls), and JSON files up to 100MB
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Dataset Configuration */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dataset Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                placeholder="Enter dataset name"
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description of the dataset"
                rows={3}
                className="input"
              />
            </div>

            {/* Import Mode Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-800">Import Mode</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Files will be imported and stored in our system for fast access. 
                    The data will be processed and optimized for visualization.
                  </p>
                  <ul className="text-xs text-blue-600 mt-2 space-y-1">
                    <li>• Data is copied and stored in our database</li>
                    <li>• Fast query performance</li>
                    <li>• Supports data refresh from source</li>
                    <li>• Ideal for static datasets and regular updates</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!selectedFile || !datasetName || uploading}
            >
              {uploading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Uploading...</span>
                </div>
              ) : (
                'Upload Dataset'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default DatasetUploadModal