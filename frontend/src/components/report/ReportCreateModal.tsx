/**
 * Report Create Modal Component
 * Modal for creating new reports with dataset selection and templates
 */

import React, { useState, useEffect } from 'react'
import { XMarkIcon, DocumentChartBarIcon, TableCellsIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { reportService, CreateReportRequest } from '@/services/reportService'
import { datasetService, Dataset } from '@/services/datasetService'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import toast from 'react-hot-toast'

interface ReportCreateModalProps {
  isOpen: boolean
  onClose: () => void
  workspaceId: string
  onSuccess: (report: any) => void
}

interface ReportTemplate {
  id: string
  name: string
  description: string
  icon: string
  category: 'blank' | 'dashboard' | 'sales' | 'finance' | 'marketing'
  preview?: string
  reportJson?: any
}

const reportTemplates: ReportTemplate[] = [
  {
    id: 'blank',
    name: 'Blank Report',
    description: 'Start with an empty canvas',
    icon: '📄',
    category: 'blank',
    reportJson: {
      pages: [
        {
          id: 'page-1',
          name: 'Page 1',
          visuals: []
        }
      ]
    }
  },
  {
    id: 'dashboard',
    name: 'Executive Dashboard',
    description: 'KPI cards and key metrics overview',
    icon: '📊',
    category: 'dashboard',
    reportJson: {
      pages: [
        {
          id: 'page-1',
          name: 'Dashboard',
          visuals: [
            {
              id: 'kpi-1',
              type: 'card',
              position: { x: 20, y: 20, width: 200, height: 100 },
              title: 'Total Sales',
              data_binding: { fields: [] },
              config: { backgroundColor: '#3b82f6' }
            },
            {
              id: 'kpi-2',
              type: 'card',
              position: { x: 240, y: 20, width: 200, height: 100 },
              title: 'Total Orders',
              data_binding: { fields: [] },
              config: { backgroundColor: '#10b981' }
            },
            {
              id: 'chart-1',
              type: 'column-chart',
              position: { x: 20, y: 140, width: 420, height: 300 },
              title: 'Sales by Category',
              data_binding: { fields: [] },
              config: {}
            }
          ]
        }
      ]
    }
  },
  {
    id: 'sales-report',
    name: 'Sales Analytics',
    description: 'Sales performance and trends',
    icon: '💰',
    category: 'sales',
    reportJson: {
      pages: [
        {
          id: 'page-1',
          name: 'Sales Overview',
          visuals: [
            {
              id: 'trend-1',
              type: 'line-chart',
              position: { x: 20, y: 20, width: 400, height: 250 },
              title: 'Sales Trend',
              data_binding: { fields: [] },
              config: {}
            },
            {
              id: 'pie-1',
              type: 'pie-chart',
              position: { x: 440, y: 20, width: 300, height: 250 },
              title: 'Sales by Region',
              data_binding: { fields: [] },
              config: {}
            },
            {
              id: 'table-1',
              type: 'table',
              position: { x: 20, y: 290, width: 720, height: 200 },
              title: 'Top Products',
              data_binding: { fields: [] },
              config: {}
            }
          ]
        }
      ]
    }
  },
  {
    id: 'finance-report',
    name: 'Financial Report',
    description: 'Financial metrics and analysis',
    icon: '💼',
    category: 'finance',
    reportJson: {
      pages: [
        {
          id: 'page-1',
          name: 'Financial Summary',
          visuals: [
            {
              id: 'waterfall-1',
              type: 'waterfall-chart',
              position: { x: 20, y: 20, width: 400, height: 250 },
              title: 'Revenue Breakdown',
              data_binding: { fields: [] },
              config: {}
            },
            {
              id: 'gauge-1',
              type: 'gauge',
              position: { x: 440, y: 20, width: 200, height: 200 },
              title: 'Budget Performance',
              data_binding: { fields: [] },
              config: {}
            }
          ]
        }
      ]
    }
  }
]

const ReportCreateModal: React.FC<ReportCreateModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  onSuccess,
}) => {
  const [step, setStep] = useState<'template' | 'details'>('template')
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate>(reportTemplates[0])
  const [formData, setFormData] = useState<CreateReportRequest>({
    workspace_id: workspaceId,
    name: '',
    description: '',
    dataset_id: '',
  })
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadDatasets()
    }
  }, [isOpen, workspaceId])

  const loadDatasets = async () => {
    setLoading(true)
    try {
      const data = await datasetService.getDatasets(workspaceId)
      setDatasets(data.filter(d => d.status === 'ready'))
    } catch (error) {
      console.error('Failed to load datasets:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTemplateSelect = (template: ReportTemplate) => {
    setSelectedTemplate(template)
    setFormData(prev => ({
      ...prev,
      name: prev.name || `New ${template.name}`,
      report_json: template.reportJson
    }))
  }

  const handleInputChange = (field: keyof CreateReportRequest, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleNext = () => {
    setStep('details')
  }

  const handleBack = () => {
    setStep('template')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Please provide a report name')
      return
    }

    setIsSubmitting(true)
    try {
      const report = await reportService.createReport({
        ...formData,
        report_json: selectedTemplate.reportJson
      })
      toast.success('Report created successfully!')
      onSuccess(report)
      onClose()
      resetForm()
    } catch (error: any) {
      toast.error(error.message || 'Failed to create report')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setStep('template')
    setSelectedTemplate(reportTemplates[0])
    setFormData({
      workspace_id: workspaceId,
      name: '',
      description: '',
      dataset_id: '',
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DocumentChartBarIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {step === 'template' ? 'Choose Template' : 'Report Details'}
              </h2>
              <p className="text-sm text-gray-500">
                {step === 'template' 
                  ? 'Start with a template or create from scratch'
                  : 'Configure your report settings'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {step === 'details' && (
              <button
                onClick={handleBack}
                disabled={isSubmitting}
                className="btn btn-outline btn-sm"
              >
                Back
              </button>
            )}
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {step === 'template' && (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reportTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className={`p-4 border-2 rounded-lg text-left transition-all hover:shadow-md ${
                      selectedTemplate.id === template.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-primary-300'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="text-3xl">{template.icon}</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 mb-1">
                          {template.name}
                        </h3>
                        <p className="text-xs text-gray-500 leading-relaxed">
                          {template.description}
                        </p>
                        {selectedTemplate.id === template.id && (
                          <div className="mt-2 flex items-center text-primary-600">
                            <SparklesIcon className="h-4 w-4 mr-1" />
                            <span className="text-xs font-medium">Selected</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'details' && (
            <div className="p-6 space-y-6">
              {/* Report Details */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Report Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="input w-full"
                    placeholder="Enter report name"
                    disabled={isSubmitting}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="input w-full h-20 resize-none"
                    placeholder="Describe what this report shows..."
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dataset (Optional)
                  </label>
                  {loading ? (
                    <div className="border border-gray-300 rounded-md p-3 flex items-center justify-center">
                      <LoadingSpinner size="sm" />
                      <span className="text-sm text-gray-500 ml-2">Loading datasets...</span>
                    </div>
                  ) : (
                    <select
                      value={formData.dataset_id || ''}
                      onChange={(e) => handleInputChange('dataset_id', e.target.value)}
                      className="input w-full"
                      disabled={isSubmitting}
                    >
                      <option value="">Select a dataset (optional)</option>
                      {datasets.map((dataset) => (
                        <option key={dataset.id} value={dataset.id}>
                          {dataset.name} ({dataset.connector_type})
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    You can add or change datasets after creating the report
                  </p>
                </div>
              </div>

              {/* Template Preview */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                  <span className="text-lg mr-2">{selectedTemplate.icon}</span>
                  Template: {selectedTemplate.name}
                </h3>
                <p className="text-xs text-gray-600 mb-3">{selectedTemplate.description}</p>
                
                {selectedTemplate.reportJson?.pages[0]?.visuals && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-700">Includes:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedTemplate.reportJson.pages[0].visuals.map((visual: any, index: number) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-600"
                        >
                          {visual.title || visual.type}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-6 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {step === 'template' && 'Step 1 of 2: Choose your starting template'}
              {step === 'details' && 'Step 2 of 2: Configure report details'}
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="btn btn-outline"
              >
                Cancel
              </button>
              
              {step === 'template' ? (
                <button
                  onClick={handleNext}
                  className="btn btn-primary flex items-center space-x-2"
                >
                  <span>Next</span>
                  <DocumentChartBarIcon className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !formData.name.trim()}
                  className="btn btn-primary flex items-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <DocumentChartBarIcon className="h-4 w-4" />
                      <span>Create Report</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReportCreateModal