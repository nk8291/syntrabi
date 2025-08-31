/**
 * Dataset Upload Modal Component
 * Handles CSV file upload with preview and configuration
 */

import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  XMarkIcon,
  DocumentArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  TrashIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'
import { datasetService } from '@/services/datasetService'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import toast from 'react-hot-toast'
import Papa from 'papaparse'

interface DatasetUploadModalProps {
  isOpen: boolean
  onClose: () => void
  workspaceId: string
  onSuccess: (dataset: any) => void
}

const DatasetUploadModal: React.FC<DatasetUploadModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  onSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [datasetName, setDatasetName] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [filePreview, setFilePreview] = useState<{
    headers: string[]
    rows: any[][]
    totalRows: number
    hasErrors: boolean
    errors: string[]
  } | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const analyzeFile = useCallback(async (file: File) => {
    setIsAnalyzing(true)
    setFilePreview(null)
    
    try {
      const text = await file.text()
      
      Papa.parse(text, {
        header: false,
        skipEmptyLines: true,
        preview: 100, // Only analyze first 100 rows
        complete: (results) => {
          const errors: string[] = []
          
          if (results.errors.length > 0) {
            errors.push(...results.errors.map(e => e.message))
          }
          
          if (results.data.length === 0) {
            errors.push('File appears to be empty')
          }
          
          const headers = results.data[0] as string[]
          const rows = results.data.slice(1)
          
          if (!headers || headers.length === 0) {
            errors.push('No headers found in the first row')
          }
          
          // Check for duplicate headers
          const headerSet = new Set()
          headers.forEach(header => {
            if (headerSet.has(header)) {
              errors.push(`Duplicate header found: ${header}`)
            }
            headerSet.add(header)
          })
          
          setFilePreview({
            headers,
            rows: rows.slice(0, 10), // Show first 10 rows
            totalRows: results.data.length - 1,
            hasErrors: errors.length > 0,
            errors
          })
        },
        error: (error) => {
          setFilePreview({
            headers: [],
            rows: [],
            totalRows: 0,
            hasErrors: true,
            errors: [error.message]
          })
        }
      })
    } catch (error: any) {
      setFilePreview({
        headers: [],
        rows: [],
        totalRows: 0,
        hasErrors: true,
        errors: [error.message || 'Failed to analyze file']
      })
    } finally {
      setIsAnalyzing(false)
    }
  }, [])

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0]
      if (rejection.errors[0].code === 'file-too-large') {
        toast.error('File is too large. Maximum size is 100MB.')
      } else if (rejection.errors[0].code === 'file-invalid-type') {
        toast.error('Invalid file type. Please upload a CSV, Excel, or text file.')
      } else {
        toast.error('File upload failed: ' + rejection.errors[0].message)
      }
      return
    }
    
    const file = acceptedFiles[0]
    if (file) {
      setSelectedFile(file)
      setDatasetName(file.name.replace(/\.(csv|xlsx?|txt)$/i, ''))
      
      // Auto-analyze CSV files
      if (file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')) {
        analyzeFile(file)
      }
    }
  }, [analyzeFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'text/plain': ['.txt'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024, // 100MB
  })

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
    setFilePreview(null)
    setIsAnalyzing(false)
  }

  const removeFile = () => {
    setSelectedFile(null)
    setFilePreview(null)
    setDatasetName('')
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
              Select File
            </label>
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                ${isDragActive 
                  ? 'border-primary-400 bg-primary-50' 
                  : 'border-gray-300 hover:border-primary-300 hover:bg-gray-50'
                }
                ${isUploading ? 'pointer-events-none opacity-50' : ''}
              `}
            >
              <input {...getInputProps()} />
              
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
                          {formatFileSize(selectedFile.size)} • {selectedFile.type || 'Unknown type'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {selectedFile.type === 'text/csv' && (
                        <button
                          type="button"
                          onClick={() => analyzeFile(selectedFile)}
                          disabled={isAnalyzing}
                          className="p-1 text-blue-600 hover:text-blue-500 disabled:opacity-50"
                          title="Analyze file"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={removeFile}
                        disabled={isUploading}
                        className="p-1 text-red-600 hover:text-red-500 disabled:opacity-50"
                        title="Remove file"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* File Analysis */}
                  {isAnalyzing && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <LoadingSpinner size="sm" />
                        <span className="text-sm text-blue-700">Analyzing file...</span>
                      </div>
                    </div>
                  )}
                  
                  {/* File Preview */}
                  {filePreview && (
                    <div className="space-y-3">
                      {filePreview.hasErrors && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-start space-x-2">
                            <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mt-0.5" />
                            <div>
                              <h4 className="text-sm font-medium text-red-800">File Issues Detected</h4>
                              <ul className="text-xs text-red-700 mt-1 list-disc list-inside">
                                {filePreview.errors.map((error, index) => (
                                  <li key={index}>{error}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-gray-800">Data Preview</h4>
                          <span className="text-xs text-gray-500">
                            {filePreview.headers.length} columns • {filePreview.totalRows.toLocaleString()} rows
                          </span>
                        </div>
                        
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-xs">
                            <thead>
                              <tr className="bg-white">
                                {filePreview.headers.map((header, index) => (
                                  <th key={index} className="px-2 py-1 text-left font-medium text-gray-700 border border-gray-300">
                                    {header}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {filePreview.rows.slice(0, 5).map((row, rowIndex) => (
                                <tr key={rowIndex} className="bg-white">
                                  {row.map((cell, cellIndex) => (
                                    <td key={cellIndex} className="px-2 py-1 text-gray-600 border border-gray-300 max-w-[100px] truncate">
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        
                        {filePreview.rows.length > 5 && (
                          <p className="text-xs text-gray-500 mt-2">
                            Showing first 5 rows of {filePreview.totalRows.toLocaleString()} total rows
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <DocumentArrowUpIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-sm text-gray-600">
                    {isDragActive
                      ? 'Drop the file here...'
                      : 'Drag & drop a CSV file here, or click to select'
                    }
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Supports CSV, XLS, XLSX (max 100MB)
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
                  <li>Date columns should be in YYYY-MM-DD format</li>
                  <li>Missing values will be handled automatically</li>
                  <li>Supported formats: CSV, Excel (.xlsx, .xls), Text (.txt)</li>
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
            disabled={!selectedFile || !datasetName.trim() || isUploading || (filePreview?.hasErrors)}
            className="btn btn-primary flex items-center space-x-2"
          >
            {isUploading ? (
              <>
                <LoadingSpinner size="sm" />
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

export default DatasetUploadModal