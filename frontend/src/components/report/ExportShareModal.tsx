/**
 * Export and Share Modal Component
 * Comprehensive sharing and export options for reports
 */

import React, { useState, useRef } from 'react'
import {
  XMarkIcon,
  ShareIcon,
  ArrowDownTrayIcon,
  LinkIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  LockClosedIcon,
  EyeIcon,
  PencilIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  PhotoIcon,
  DocumentIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline'
import { reportService } from '@/services/reportService'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import toast from 'react-hot-toast'

interface ExportShareModalProps {
  isOpen: boolean
  onClose: () => void
  reportId: string
  reportName: string
}

interface ShareSettings {
  isPublic: boolean
  allowEmbedding: boolean
  requireLogin: boolean
  expiresAt?: string
  permissions: 'view' | 'edit'
}

interface ExportOptions {
  format: 'png' | 'pdf' | 'xlsx' | 'csv'
  quality: 'low' | 'medium' | 'high'
  includeData: boolean
  pageSize: 'a4' | 'a3' | 'letter' | 'custom'
  orientation: 'portrait' | 'landscape'
}

const ExportShareModal: React.FC<ExportShareModalProps> = ({
  isOpen,
  onClose,
  reportId,
  reportName,
}) => {
  const [activeTab, setActiveTab] = useState<'share' | 'export'>('share')
  const [shareSettings, setShareSettings] = useState<ShareSettings>({
    isPublic: false,
    allowEmbedding: false,
    requireLogin: true,
    permissions: 'view'
  })
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'pdf',
    quality: 'high',
    includeData: false,
    pageSize: 'a4',
    orientation: 'portrait'
  })
  const [shareUrl, setShareUrl] = useState('')
  const [embedCode, setEmbedCode] = useState('')
  const [isGeneratingLink, setIsGeneratingLink] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [copied, setCopied] = useState<'link' | 'embed' | null>(null)
  const [emailRecipients, setEmailRecipients] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  
  const linkInputRef = useRef<HTMLInputElement>(null)
  const embedInputRef = useRef<HTMLTextAreaElement>(null)

  const generateShareLink = async () => {
    setIsGeneratingLink(true)
    try {
      // Simulate API call to generate share link
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const baseUrl = window.location.origin
      const shareId = Math.random().toString(36).substring(7)
      const url = `${baseUrl}/shared/reports/${shareId}`
      
      setShareUrl(url)
      
      // Generate embed code
      const embed = `<iframe src="${url}?embed=true" width="100%" height="600" frameborder="0"></iframe>`
      setEmbedCode(embed)
      
      toast.success('Share link generated successfully!')
    } catch (error) {
      toast.error('Failed to generate share link')
    } finally {
      setIsGeneratingLink(false)
    }
  }

  const copyToClipboard = async (text: string, type: 'link' | 'embed') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
      toast.success(`${type === 'link' ? 'Link' : 'Embed code'} copied to clipboard!`)
    } catch (error) {
      toast.error('Failed to copy to clipboard')
    }
  }

  const sendEmailShare = async () => {
    if (!emailRecipients.trim()) {
      toast.error('Please enter email recipients')
      return
    }

    try {
      // Simulate email sharing
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success('Share email sent successfully!')
      setEmailRecipients('')
      setEmailMessage('')
    } catch (error) {
      toast.error('Failed to send share email')
    }
  }

  const exportReport = async () => {
    setIsExporting(true)
    try {
      const blob = await reportService.exportReport(reportId, exportOptions.format)
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${reportName}.${exportOptions.format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast.success(`Report exported as ${exportOptions.format.toUpperCase()}!`)
      onClose()
    } catch (error: any) {
      toast.error(error.message || 'Failed to export report')
    } finally {
      setIsExporting(false)
    }
  }

  const tabs = [
    { id: 'share', name: 'Share', icon: ShareIcon },
    { id: 'export', name: 'Export', icon: ArrowDownTrayIcon }
  ]

  const exportFormats = [
    { format: 'pdf', name: 'PDF Document', icon: DocumentIcon, description: 'Portable document with layout preserved' },
    { format: 'png', name: 'PNG Image', icon: PhotoIcon, description: 'High-quality image format' },
    { format: 'xlsx', name: 'Excel Workbook', icon: DocumentArrowDownIcon, description: 'Spreadsheet with data and charts' },
    { format: 'csv', name: 'CSV Data', icon: DocumentArrowDownIcon, description: 'Raw data in comma-separated format' }
  ]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Share & Export</h2>
            <p className="text-sm text-gray-500 mt-1">{reportName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'share' && (
            <div className="space-y-6">
              {/* Share Link */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Share Link</h3>
                
                {/* Privacy Settings */}
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-800 mb-3">Privacy Settings</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {shareSettings.isPublic ? (
                          <GlobeAltIcon className="h-4 w-4 text-green-500" />
                        ) : (
                          <LockClosedIcon className="h-4 w-4 text-gray-400" />
                        )}
                        <div>
                          <label className="text-sm font-medium text-gray-700">Public Access</label>
                          <p className="text-xs text-gray-500">Anyone with the link can view</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShareSettings(prev => ({ ...prev, isPublic: !prev.isPublic }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          shareSettings.isPublic ? 'bg-primary-600' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          shareSettings.isPublic ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Allow Embedding</label>
                        <p className="text-xs text-gray-500">Can be embedded in websites</p>
                      </div>
                      <button
                        onClick={() => setShareSettings(prev => ({ ...prev, allowEmbedding: !prev.allowEmbedding }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          shareSettings.allowEmbedding ? 'bg-primary-600' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          shareSettings.allowEmbedding ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Permissions</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['view', 'edit'] as const).map(permission => (
                          <button
                            key={permission}
                            onClick={() => setShareSettings(prev => ({ ...prev, permissions: permission }))}
                            className={`p-2 border rounded-lg text-sm flex items-center space-x-2 ${
                              shareSettings.permissions === permission
                                ? 'border-primary-500 bg-primary-50 text-primary-700'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            {permission === 'view' ? (
                              <EyeIcon className="h-4 w-4" />
                            ) : (
                              <PencilIcon className="h-4 w-4" />
                            )}
                            <span className="capitalize">{permission} Only</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Generate Link */}
                <div className="space-y-3">
                  <button
                    onClick={generateShareLink}
                    disabled={isGeneratingLink}
                    className="btn btn-primary w-full"
                  >
                    {isGeneratingLink ? (
                      <>
                        <LoadingSpinner size="sm" />
                        <span>Generating Link...</span>
                      </>
                    ) : (
                      <>
                        <LinkIcon className="h-4 w-4 mr-2" />
                        Generate Share Link
                      </>
                    )}
                  </button>

                  {shareUrl && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">Share URL</label>
                        <div className="flex">
                          <input
                            ref={linkInputRef}
                            type="text"
                            value={shareUrl}
                            readOnly
                            className="input flex-1 rounded-r-none"
                          />
                          <button
                            onClick={() => copyToClipboard(shareUrl, 'link')}
                            className="btn btn-outline rounded-l-none border-l-0 flex-shrink-0"
                          >
                            {copied === 'link' ? (
                              <CheckIcon className="h-4 w-4 text-green-500" />
                            ) : (
                              <ClipboardDocumentIcon className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {shareSettings.allowEmbedding && (
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-1 block">Embed Code</label>
                          <div className="relative">
                            <textarea
                              ref={embedInputRef}
                              value={embedCode}
                              readOnly
                              rows={3}
                              className="input w-full font-mono text-xs"
                            />
                            <button
                              onClick={() => copyToClipboard(embedCode, 'embed')}
                              className="absolute top-2 right-2 p-1 rounded text-gray-400 hover:text-gray-600"
                            >
                              {copied === 'embed' ? (
                                <CheckIcon className="h-4 w-4 text-green-500" />
                              ) : (
                                <ClipboardDocumentIcon className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Email Sharing */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Share via Email</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Recipients</label>
                    <input
                      type="email"
                      value={emailRecipients}
                      onChange={(e) => setEmailRecipients(e.target.value)}
                      placeholder="Enter email addresses separated by commas"
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Message (Optional)</label>
                    <textarea
                      value={emailMessage}
                      onChange={(e) => setEmailMessage(e.target.value)}
                      placeholder="Add a personal message..."
                      rows={3}
                      className="input w-full"
                    />
                  </div>
                  <button
                    onClick={sendEmailShare}
                    disabled={!emailRecipients.trim()}
                    className="btn btn-primary"
                  >
                    <EnvelopeIcon className="h-4 w-4 mr-2" />
                    Send Email
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Export Format</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {exportFormats.map((format) => {
                    const Icon = format.icon
                    return (
                      <button
                        key={format.format}
                        onClick={() => setExportOptions(prev => ({ ...prev, format: format.format as any }))}
                        className={`p-4 border-2 rounded-lg text-left transition-all ${
                          exportOptions.format === format.format
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-primary-300'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <Icon className="h-6 w-6 text-gray-400 mt-1" />
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">{format.name}</h4>
                            <p className="text-xs text-gray-500 mt-1">{format.description}</p>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Export Options */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Export Options</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(exportOptions.format === 'pdf' || exportOptions.format === 'png') && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Quality</label>
                      <select
                        value={exportOptions.quality}
                        onChange={(e) => setExportOptions(prev => ({ ...prev, quality: e.target.value as any }))}
                        className="input w-full"
                      >
                        <option value="low">Low (Fast)</option>
                        <option value="medium">Medium</option>
                        <option value="high">High (Best Quality)</option>
                      </select>
                    </div>
                  )}

                  {exportOptions.format === 'pdf' && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Page Size</label>
                        <select
                          value={exportOptions.pageSize}
                          onChange={(e) => setExportOptions(prev => ({ ...prev, pageSize: e.target.value as any }))}
                          className="input w-full"
                        >
                          <option value="a4">A4</option>
                          <option value="a3">A3</option>
                          <option value="letter">Letter</option>
                          <option value="custom">Custom</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Orientation</label>
                        <select
                          value={exportOptions.orientation}
                          onChange={(e) => setExportOptions(prev => ({ ...prev, orientation: e.target.value as any }))}
                          className="input w-full"
                        >
                          <option value="portrait">Portrait</option>
                          <option value="landscape">Landscape</option>
                        </select>
                      </div>
                    </>
                  )}

                  {(exportOptions.format === 'xlsx' || exportOptions.format === 'csv') && (
                    <div className="md:col-span-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="includeData"
                          checked={exportOptions.includeData}
                          onChange={(e) => setExportOptions(prev => ({ ...prev, includeData: e.target.checked }))}
                          className="checkbox"
                        />
                        <label htmlFor="includeData" className="ml-2 text-sm text-gray-700">
                          Include underlying data
                        </label>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Export the raw data used in the report along with the visualization
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={exportReport}
                  disabled={isExporting}
                  className="btn btn-primary"
                >
                  {isExporting ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Exporting...</span>
                    </>
                  ) : (
                    <>
                      <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                      Export {exportOptions.format.toUpperCase()}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ExportShareModal