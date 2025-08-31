/**
 * Data Transformation Modal Component
 * Advanced data cleaning and transformation interface
 */

import React, { useState, useEffect } from 'react'
import {
  XMarkIcon,
  WrenchScrewdriverIcon,
  PlusIcon,
  TrashIcon,
  EyeIcon,
  PlayIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { datasetService, DatasetQueryResult } from '@/services/datasetService'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import toast from 'react-hot-toast'

interface DataTransformationModalProps {
  isOpen: boolean
  onClose: () => void
  datasetId: string
  datasetName?: string
  onTransformationComplete: (transformedDataset: any) => void
}

interface TransformationStep {
  id: string
  type: 'filter' | 'sort' | 'group' | 'calculate' | 'rename' | 'remove' | 'convert' | 'replace'
  name: string
  description: string
  config: any
  enabled: boolean
}

interface ColumnInfo {
  name: string
  type: 'string' | 'number' | 'date' | 'boolean'
  samples: any[]
  nullCount: number
  uniqueCount: number
}

const transformationTypes = [
  {
    type: 'filter',
    name: 'Filter Rows',
    description: 'Remove rows based on conditions',
    icon: '🔍'
  },
  {
    type: 'sort',
    name: 'Sort Data',
    description: 'Sort rows by column values',
    icon: '📊'
  },
  {
    type: 'group',
    name: 'Group & Aggregate',
    description: 'Group data and calculate aggregations',
    icon: '📈'
  },
  {
    type: 'calculate',
    name: 'Add Calculated Column',
    description: 'Create new columns with formulas',
    icon: '🧮'
  },
  {
    type: 'rename',
    name: 'Rename Column',
    description: 'Change column names',
    icon: '✏️'
  },
  {
    type: 'remove',
    name: 'Remove Column',
    description: 'Delete unnecessary columns',
    icon: '🗑️'
  },
  {
    type: 'convert',
    name: 'Convert Data Type',
    description: 'Change column data types',
    icon: '🔄'
  },
  {
    type: 'replace',
    name: 'Replace Values',
    description: 'Find and replace specific values',
    icon: '🔁'
  }
]

const DataTransformationModal: React.FC<DataTransformationModalProps> = ({
  isOpen,
  onClose,
  datasetId,
  datasetName,
  onTransformationComplete,
}) => {
  const [loading, setLoading] = useState(false)
  const [previewData, setPreviewData] = useState<DatasetQueryResult | null>(null)
  const [columns, setColumns] = useState<ColumnInfo[]>([])
  const [transformationSteps, setTransformationSteps] = useState<TransformationStep[]>([])
  const [selectedStepType, setSelectedStepType] = useState<string>('')
  const [showAddStep, setShowAddStep] = useState(false)
  const [isApplying, setIsApplying] = useState(false)

  useEffect(() => {
    if (isOpen && datasetId) {
      loadDatasetInfo()
    }
  }, [isOpen, datasetId])

  const loadDatasetInfo = async () => {
    setLoading(true)
    try {
      // Load preview data
      const preview = await datasetService.previewDataset(datasetId)
      setPreviewData(preview)
      
      // Generate column info from preview
      if (preview.columns.length > 0 && preview.data.length > 0) {
        const columnInfo: ColumnInfo[] = preview.columns.map(col => {
          const columnName = Object.keys(col)[0]
          const columnType = Object.values(col)[0] as string
          const columnData = preview.data.map(row => row[columnName])
          
          return {
            name: columnName,
            type: columnType as any,
            samples: columnData.slice(0, 5),
            nullCount: columnData.filter(v => v === null || v === undefined).length,
            uniqueCount: new Set(columnData).size
          }
        })
        setColumns(columnInfo)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load dataset information')
    } finally {
      setLoading(false)
    }
  }

  const addTransformationStep = (type: string) => {
    const stepType = transformationTypes.find(t => t.type === type)
    if (!stepType) return

    const newStep: TransformationStep = {
      id: `step-${Date.now()}`,
      type: type as any,
      name: stepType.name,
      description: stepType.description,
      config: getDefaultConfig(type),
      enabled: true
    }

    setTransformationSteps([...transformationSteps, newStep])
    setShowAddStep(false)
    setSelectedStepType('')
  }

  const getDefaultConfig = (type: string) => {
    switch (type) {
      case 'filter':
        return { column: '', operator: 'equals', value: '' }
      case 'sort':
        return { column: '', direction: 'asc' }
      case 'group':
        return { groupBy: [], aggregations: [] }
      case 'calculate':
        return { newColumn: '', formula: '' }
      case 'rename':
        return { oldName: '', newName: '' }
      case 'remove':
        return { columns: [] }
      case 'convert':
        return { column: '', newType: 'string' }
      case 'replace':
        return { column: '', findValue: '', replaceValue: '' }
      default:
        return {}
    }
  }

  const updateStepConfig = (stepId: string, config: any) => {
    setTransformationSteps(steps =>
      steps.map(step =>
        step.id === stepId ? { ...step, config } : step
      )
    )
  }

  const toggleStep = (stepId: string) => {
    setTransformationSteps(steps =>
      steps.map(step =>
        step.id === stepId ? { ...step, enabled: !step.enabled } : step
      )
    )
  }

  const removeStep = (stepId: string) => {
    setTransformationSteps(steps => steps.filter(step => step.id !== stepId))
  }

  const applyTransformations = async () => {
    if (transformationSteps.length === 0) {
      toast.error('No transformation steps to apply')
      return
    }

    setIsApplying(true)
    try {
      // Simulate transformation application
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const transformedDataset = {
        id: `${datasetId}_transformed`,
        name: `${datasetName || 'Dataset'} (Transformed)`,
        transformationSteps: transformationSteps.filter(step => step.enabled)
      }
      
      toast.success('Transformations applied successfully!')
      onTransformationComplete(transformedDataset)
      onClose()
    } catch (error: any) {
      toast.error(error.message || 'Failed to apply transformations')
    } finally {
      setIsApplying(false)
    }
  }

  const renderStepConfig = (step: TransformationStep) => {
    switch (step.type) {
      case 'filter':
        return (
          <div className="grid grid-cols-3 gap-2">
            <select
              value={step.config.column}
              onChange={(e) => updateStepConfig(step.id, { ...step.config, column: e.target.value })}
              className="input text-xs"
            >
              <option value="">Select column</option>
              {columns.map(col => (
                <option key={col.name} value={col.name}>{col.name}</option>
              ))}
            </select>
            <select
              value={step.config.operator}
              onChange={(e) => updateStepConfig(step.id, { ...step.config, operator: e.target.value })}
              className="input text-xs"
            >
              <option value="equals">Equals</option>
              <option value="not_equals">Not Equals</option>
              <option value="greater">Greater Than</option>
              <option value="less">Less Than</option>
              <option value="contains">Contains</option>
            </select>
            <input
              type="text"
              value={step.config.value}
              onChange={(e) => updateStepConfig(step.id, { ...step.config, value: e.target.value })}
              placeholder="Value"
              className="input text-xs"
            />
          </div>
        )
      case 'sort':
        return (
          <div className="grid grid-cols-2 gap-2">
            <select
              value={step.config.column}
              onChange={(e) => updateStepConfig(step.id, { ...step.config, column: e.target.value })}
              className="input text-xs"
            >
              <option value="">Select column</option>
              {columns.map(col => (
                <option key={col.name} value={col.name}>{col.name}</option>
              ))}
            </select>
            <select
              value={step.config.direction}
              onChange={(e) => updateStepConfig(step.id, { ...step.config, direction: e.target.value })}
              className="input text-xs"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
        )
      case 'rename':
        return (
          <div className="grid grid-cols-2 gap-2">
            <select
              value={step.config.oldName}
              onChange={(e) => updateStepConfig(step.id, { ...step.config, oldName: e.target.value })}
              className="input text-xs"
            >
              <option value="">Select column</option>
              {columns.map(col => (
                <option key={col.name} value={col.name}>{col.name}</option>
              ))}
            </select>
            <input
              type="text"
              value={step.config.newName}
              onChange={(e) => updateStepConfig(step.id, { ...step.config, newName: e.target.value })}
              placeholder="New name"
              className="input text-xs"
            />
          </div>
        )
      default:
        return <div className="text-xs text-gray-500">Configuration for {step.type} not implemented</div>
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[95vh] mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <WrenchScrewdriverIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Data Transformation</h2>
              <p className="text-sm text-gray-500">
                {datasetName || `Dataset ${datasetId}`} • Clean and transform your data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isApplying}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Panel - Transformations */}
          <div className="w-96 border-r flex flex-col">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Transformation Steps</h3>
                <button
                  onClick={() => setShowAddStep(true)}
                  disabled={isApplying}
                  className="btn btn-primary btn-sm"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Step
                </button>
              </div>
              
              {showAddStep && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-800 mb-2">Choose Transformation</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {transformationTypes.map(type => (
                      <button
                        key={type.type}
                        onClick={() => addTransformationStep(type.type)}
                        className="p-2 text-left border border-gray-200 rounded hover:bg-white hover:border-primary-300 transition-colors"
                      >
                        <div className="text-lg mb-1">{type.icon}</div>
                        <div className="text-xs font-medium text-gray-900">{type.name}</div>
                        <div className="text-xs text-gray-500">{type.description}</div>
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => setShowAddStep(false)}
                      className="btn btn-outline btn-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {transformationSteps.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <WrenchScrewdriverIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm">No transformation steps yet</p>
                  <p className="text-xs text-gray-400 mt-1">Add steps to clean and transform your data</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transformationSteps.map((step, index) => (
                    <div
                      key={step.id}
                      className={`border border-gray-200 rounded-lg p-3 ${
                        step.enabled ? 'bg-white' : 'bg-gray-50 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                            {index + 1}
                          </span>
                          <h4 className="text-sm font-medium text-gray-900">{step.name}</h4>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => toggleStep(step.id)}
                            className={`p-1 rounded ${step.enabled ? 'text-green-600' : 'text-gray-400'}`}
                          >
                            <CheckCircleIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => removeStep(step.id)}
                            disabled={isApplying}
                            className="p-1 text-red-600 hover:text-red-500 disabled:opacity-50"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="mb-2">
                        {renderStepConfig(step)}
                      </div>
                      <p className="text-xs text-gray-500">{step.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t">
              <button
                onClick={applyTransformations}
                disabled={transformationSteps.length === 0 || isApplying}
                className="btn btn-primary w-full"
              >
                {isApplying ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Applying Transformations...</span>
                  </>
                ) : (
                  <>
                    <PlayIcon className="h-4 w-4 mr-2" />
                    Apply Transformations
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Panel - Data Preview */}
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Data Preview</h3>
                <button
                  onClick={loadDatasetInfo}
                  disabled={loading}
                  className="btn btn-outline btn-sm"
                >
                  <ArrowPathIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <LoadingSpinner size="lg" />
                    <p className="text-sm text-gray-500 mt-3">Loading data preview...</p>
                  </div>
                </div>
              ) : previewData ? (
                <div className="p-4">
                  {/* Column Summary */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-800 mb-3">Column Summary</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {columns.map(col => (
                        <div key={col.name} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="text-sm font-medium text-gray-900">{col.name}</h5>
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              {col.type}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600 space-y-1">
                            <div>Unique: {col.uniqueCount}</div>
                            <div>Nulls: {col.nullCount}</div>
                            <div className="truncate">Sample: {col.samples.slice(0, 3).join(', ')}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Data Table */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-800 mb-3">Data Preview</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-200 rounded-lg">
                        <thead className="bg-gray-50">
                          <tr>
                            {previewData.columns.map((col, index) => (
                              <th
                                key={index}
                                className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border-b"
                              >
                                {Object.keys(col)[0]}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.data.slice(0, 10).map((row, rowIndex) => (
                            <tr key={rowIndex} className="hover:bg-gray-50">
                              {previewData.columns.map((col, colIndex) => {
                                const columnName = Object.keys(col)[0]
                                const value = row[columnName]
                                return (
                                  <td
                                    key={colIndex}
                                    className="px-4 py-2 text-sm text-gray-900 border-b"
                                  >
                                    {value === null || value === undefined ? (
                                      <span className="text-gray-400 italic">null</span>
                                    ) : (
                                      String(value)
                                    )}
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Showing first 10 rows of {previewData.total_rows.toLocaleString()} total rows
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <EyeIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-sm">No data to preview</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DataTransformationModal