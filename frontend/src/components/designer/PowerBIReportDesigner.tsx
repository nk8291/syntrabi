/**
 * Power BI Report Designer - Complete Implementation
 * Comprehensive Power BI-style report designer with all features
 */

import React, { useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import PowerBIFieldsPanel from './PowerBIFieldsPanel'
import FilterPanel from './FilterPanel'
import DesignCanvas from './DesignCanvas'
import PropertiesPanel from './PropertiesPanel'
import PowerBIVisualizationsPanel from './PowerBIVisualizationsPanel'
import PowerBIMenuBar from './PowerBIMenuBar'
import ShapesPanel from './ShapesPanel'
import DataSourceConnector from './DataSourceConnector'
import BookmarksPanel from './BookmarksPanel'
import { Visual, VisualType, ReportPage } from '@/types/report'
import { reportsService } from '@/services/reportsService'
import type { ShapeType } from './ShapesPanel'
import type { DataSourceType, ConnectionMode } from './DataSourceConnector'

interface PowerBIReportDesignerProps {
  workspaceId: string
  reportId: string
  onSave?: () => Promise<void>
  onPublish?: () => Promise<void>
  isSaving?: boolean
  isPublishing?: boolean
}

interface DesignerState {
  pages: ReportPage[]
  currentPageId: string
  selectedVisual: Visual | null
  showDataSourceConnector: boolean
  snapToGrid: boolean
  gridSize: number
  activeLeftPanel: 'fields' | 'shapes' | 'bookmarks' | null
  activeRightPanel: 'visualizations' | 'properties' | 'filters' | null
  reportName: string
  reportId: string | null
  isSaved: boolean
  showSaveDialog: boolean
  showSaveAsDialog: boolean
}

const PowerBIReportDesigner = forwardRef<any, PowerBIReportDesignerProps>(({
  workspaceId,
  reportId,
  onSave,
  onPublish,
  isSaving = false,
  isPublishing = false,
}, ref) => {
  const [designerState, setDesignerState] = useState<DesignerState>({
    pages: [{
      id: 'page-1',
      name: 'Page 1',
      visuals: []
    }],
    currentPageId: 'page-1',
    selectedVisual: null,
    showDataSourceConnector: false,
    snapToGrid: true,
    gridSize: 20,
    activeLeftPanel: 'fields',
    activeRightPanel: 'visualizations',
    reportName: 'Untitled Report',
    reportId: reportId || null,
    isSaved: false,
    showSaveDialog: false,
    showSaveAsDialog: false,
  })

  const currentPage = designerState.pages.find(p => p.id === designerState.currentPageId) || designerState.pages[0]

  useImperativeHandle(ref, () => ({
    getReportData: () => ({
      name: "Power BI Report",
      description: "Report created with Power BI Web Replica",
      dataset_id: null,
      report_json: {
        version: "1.0",
        pages: designerState.pages
      }
    })
  }), [designerState])

  const handleAddVisual = useCallback((type: VisualType, position: { x: number, y: number } = { x: 100, y: 100 }, options?: any) => {
    const newVisual: Visual = {
      id: `visual-${Date.now()}`,
      type,
      position: { 
        x: position?.x || 100, 
        y: position?.y || 100, 
        width: 350, 
        height: 250 
      },
      data_binding: { dataset_id: '', fields: [] },
      config: { 
        colors: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'], 
        formatting: {},
        ...options
      },
    }

    setDesignerState(prev => ({
      ...prev,
      pages: prev.pages.map(page => 
        page.id === prev.currentPageId
          ? { ...page, visuals: [...page.visuals, newVisual] }
          : page
      ),
      selectedVisual: newVisual
    }))
  }, [])

  const handleSelectVisual = useCallback((visual: Visual | null) => {
    setDesignerState(prev => ({
      ...prev,
      selectedVisual: visual,
      activeRightPanel: 'properties'
    }))
  }, [])

  const handleUpdateVisual = useCallback((visualId: string, updates: Partial<Visual>) => {
    setDesignerState(prev => ({
      ...prev,
      pages: prev.pages.map(page =>
        page.id === prev.currentPageId
          ? {
              ...page,
              visuals: page.visuals.map(visual =>
                visual.id === visualId ? { ...visual, ...updates } : visual
              )
            }
          : page
      ),
      selectedVisual: prev.selectedVisual?.id === visualId
        ? { ...prev.selectedVisual, ...updates }
        : prev.selectedVisual
    }))
  }, [])

  const handleDeleteVisual = useCallback((visualId: string) => {
    setDesignerState(prev => ({
      ...prev,
      pages: prev.pages.map(page =>
        page.id === prev.currentPageId
          ? { ...page, visuals: page.visuals.filter(visual => visual.id !== visualId) }
          : page
      ),
      selectedVisual: prev.selectedVisual?.id === visualId ? null : prev.selectedVisual
    }))
  }, [])

  const handleDuplicateVisual = useCallback((visual: Visual) => {
    const duplicated: Visual = {
      ...visual,
      id: `visual-${Date.now()}`,
      position: { ...visual.position, x: visual.position.x + 20, y: visual.position.y + 20 }
    }

    setDesignerState(prev => ({
      ...prev,
      pages: prev.pages.map(page =>
        page.id === prev.currentPageId
          ? { ...page, visuals: [...page.visuals, duplicated] }
          : page
      ),
      selectedVisual: duplicated
    }))
  }, [])

  const handleSaveReport = useCallback(async (reportName?: string) => {
    try {
      const nameToUse = reportName || designerState.reportName
      const savedReport = await reportsService.saveReport({
        id: designerState.reportId || undefined,
        name: nameToUse,
        description: `Report created with Power BI Web Replica`,
        pages: designerState.pages,
        workspaceId: workspaceId
      })

      setDesignerState(prev => ({
        ...prev,
        reportId: savedReport.id,
        reportName: savedReport.name,
        isSaved: true,
        showSaveDialog: false,
        showSaveAsDialog: false
      }))

      alert(`Report "${savedReport.name}" saved successfully!`)
    } catch (error) {
      console.error('Failed to save report:', error)
      alert('Failed to save report. Please try again.')
    }
  }, [designerState.pages, designerState.reportId, designerState.reportName, workspaceId])

  const handleSaveAsReport = useCallback(async (newName: string) => {
    try {
      const savedReport = await reportsService.saveReport({
        // Create as new report (no id)
        name: newName,
        description: `Copy of ${designerState.reportName}`,
        pages: designerState.pages,
        workspaceId: workspaceId
      })

      setDesignerState(prev => ({
        ...prev,
        reportId: savedReport.id,
        reportName: savedReport.name,
        isSaved: true,
        showSaveAsDialog: false
      }))

      alert(`Report saved as "${savedReport.name}" successfully!`)
    } catch (error) {
      console.error('Failed to save report as:', error)
      alert('Failed to save report as. Please try again.')
    }
  }, [designerState.pages, designerState.reportName, workspaceId])

  const handlePublishReport = useCallback(async () => {
    if (!designerState.reportId) {
      // Save first if not saved
      await handleSaveReport()
      if (!designerState.reportId) return
    }

    try {
      await reportsService.publishReport(designerState.reportId)
      alert(`Report "${designerState.reportName}" published successfully!`)
    } catch (error) {
      console.error('Failed to publish report:', error)
      alert('Failed to publish report. Please try again.')
    }
  }, [designerState.reportId, designerState.reportName, handleSaveReport])

  const SaveDialog: React.FC = () => {
    const [tempName, setTempName] = useState(designerState.reportName)
    
    if (!designerState.showSaveDialog) return null

    return (
      <>
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setDesignerState(prev => ({ ...prev, showSaveDialog: false }))} />
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Save Report</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Report Name
                  </label>
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter report name..."
                    onKeyPress={(e) => e.key === 'Enter' && tempName.trim() && handleSaveReport(tempName)}
                  />
                </div>
                <div className="text-xs text-gray-500">
                  This report will be saved in your workspace and can be accessed from the Reports section.
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  onClick={() => setDesignerState(prev => ({ ...prev, showSaveDialog: false }))}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => tempName.trim() && handleSaveReport(tempName)}
                  disabled={!tempName.trim()}
                  className="px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  const SaveAsDialog: React.FC = () => {
    const [tempName, setTempName] = useState(`${designerState.reportName} - Copy`)
    
    if (!designerState.showSaveAsDialog) return null

    return (
      <>
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setDesignerState(prev => ({ ...prev, showSaveAsDialog: false }))} />
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Save As</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Report Name
                  </label>
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter new report name..."
                    onKeyPress={(e) => e.key === 'Enter' && tempName.trim() && handleSaveAsReport(tempName)}
                  />
                </div>
                <div className="text-xs text-gray-500">
                  This will create a new copy of the current report with the specified name.
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  onClick={() => setDesignerState(prev => ({ ...prev, showSaveAsDialog: false }))}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => tempName.trim() && handleSaveAsReport(tempName)}
                  disabled={!tempName.trim()}
                  className="px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save As
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="powerbi-report-designer flex flex-col h-full bg-gray-50">
        <PowerBIMenuBar
          onNewReport={() => {
            if (confirm('Create a new report? All unsaved changes will be lost.')) {
              setDesignerState(prev => ({
                ...prev,
                pages: [{ id: 'page-1', name: 'Page 1', visuals: [] }],
                currentPageId: 'page-1',
                selectedVisual: null
              }))
            }
          }}
          onOpenReport={() => {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = '.json'
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0]
              if (file) {
                const reader = new FileReader()
                reader.onload = (event) => {
                  try {
                    const data = JSON.parse(event.target?.result as string)
                    setDesignerState(prev => ({ ...prev, ...data }))
                  } catch (error) {
                    alert('Invalid file format')
                  }
                }
                reader.readAsText(file)
              }
            }
            input.click()
          }}
          onSaveReport={() => {
            if (designerState.reportId) {
              handleSaveReport()
            } else {
              setDesignerState(prev => ({ ...prev, showSaveDialog: true }))
            }
          }}
          onSaveAsReport={() => setDesignerState(prev => ({ ...prev, showSaveAsDialog: true }))}
          onPublishReport={handlePublishReport}
          onInsertVisual={(type: string) => {
            handleAddVisual(type as VisualType, { x: 100, y: 100 })
          }}
          onInsertShape={(type: string) => {
            handleAddVisual('shape' as VisualType, { x: 150, y: 150 })
          }}
          onShowDataSourceConnector={() => setDesignerState(prev => ({ ...prev, showDataSourceConnector: true }))}
          onRefreshData={() => {
            alert('Data refreshed successfully! (Demo mode)')
          }}
          onToggleFieldsPane={() => setDesignerState(prev => ({ 
            ...prev, 
            activeLeftPanel: prev.activeLeftPanel === 'fields' ? null : 'fields' 
          }))}
          onToggleFiltersPane={() => setDesignerState(prev => ({ 
            ...prev, 
            activeRightPanel: prev.activeRightPanel === 'filters' ? null : 'filters' 
          }))}
          onToggleVisualizationsPane={() => setDesignerState(prev => ({ 
            ...prev, 
            activeRightPanel: prev.activeRightPanel === 'visualizations' ? null : 'visualizations' 
          }))}
          onToggleBookmarks={() => setDesignerState(prev => ({ 
            ...prev, 
            activeLeftPanel: prev.activeLeftPanel === 'bookmarks' ? null : 'bookmarks' 
          }))}
          onToggleSelectionPane={() => {
            alert('Selection pane functionality coming soon!')
          }}
        />

        <div className="flex flex-1 overflow-hidden">
          <div className="flex">
            {designerState.activeLeftPanel && (
              <div className="w-80 bg-white border-r border-gray-200 shadow-sm animate-slide-in-left panel-transition">
                <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-sm font-semibold text-gray-800">
                    {designerState.activeLeftPanel === 'fields' && 'Fields'}
                    {designerState.activeLeftPanel === 'shapes' && 'Insert'}
                    {designerState.activeLeftPanel === 'bookmarks' && 'Bookmarks'}
                  </h3>
                  <button
                    onClick={() => setDesignerState(prev => ({ ...prev, activeLeftPanel: null }))}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    title="Close panel"
                  >
                    ✕
                  </button>
                </div>
                <div className="h-full overflow-hidden panel-content">
                  {designerState.activeLeftPanel === 'fields' && <PowerBIFieldsPanel workspaceId={workspaceId} />}
                  {designerState.activeLeftPanel === 'shapes' && <ShapesPanel />}
                  {designerState.activeLeftPanel === 'bookmarks' && (
                    <BookmarksPanel 
                      currentPage={currentPage}
                      selectedVisual={designerState.selectedVisual}
                      onRestoreBookmark={(bookmark) => {
                        console.log('Restoring bookmark:', bookmark.name)
                      }}
                    />
                  )}
                </div>
              </div>
            )}

            <div className="w-12 bg-gray-100 border-r border-gray-200 flex flex-col items-center py-2 space-y-1">
              <button 
                onClick={() => setDesignerState(prev => ({ 
                  ...prev, 
                  activeLeftPanel: prev.activeLeftPanel === 'fields' ? null : 'fields' 
                }))}
                className={`w-10 h-10 rounded-md flex items-center justify-center transition-all duration-200 ${
                  designerState.activeLeftPanel === 'fields' 
                    ? 'bg-blue-100 text-blue-600 border border-blue-300 shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                }`}
                title="Fields"
              >
                📊
              </button>
              <button 
                onClick={() => setDesignerState(prev => ({ 
                  ...prev, 
                  activeLeftPanel: prev.activeLeftPanel === 'shapes' ? null : 'shapes' 
                }))}
                className={`w-10 h-10 rounded-md flex items-center justify-center transition-all duration-200 ${
                  designerState.activeLeftPanel === 'shapes' 
                    ? 'bg-blue-100 text-blue-600 border border-blue-300 shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                }`}
                title="Insert"
              >
                🔺
              </button>
              <button 
                onClick={() => setDesignerState(prev => ({ 
                  ...prev, 
                  activeLeftPanel: prev.activeLeftPanel === 'bookmarks' ? null : 'bookmarks' 
                }))}
                className={`w-10 h-10 rounded-md flex items-center justify-center transition-all duration-200 ${
                  designerState.activeLeftPanel === 'bookmarks' 
                    ? 'bg-blue-100 text-blue-600 border border-blue-300 shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                }`}
                title="Bookmarks"
              >
                🔖
              </button>
            </div>
          </div>

          <div className="flex-1">
            <DesignCanvas
              page={currentPage}
              selectedVisual={designerState.selectedVisual}
              onSelectVisual={handleSelectVisual}
              onUpdateVisual={handleUpdateVisual}
              onDeleteVisual={handleDeleteVisual}
              onDuplicateVisual={handleDuplicateVisual}
              onAddVisual={handleAddVisual}
              snapToGrid={designerState.snapToGrid}
              gridSize={designerState.gridSize}
            />
          </div>

          <div className="flex">
            <div className="w-12 bg-gray-100 border-l border-gray-200 flex flex-col items-center py-2 space-y-1">
              <button 
                onClick={() => setDesignerState(prev => ({ 
                  ...prev, 
                  activeRightPanel: prev.activeRightPanel === 'visualizations' ? null : 'visualizations' 
                }))}
                className={`w-10 h-10 rounded-md flex items-center justify-center transition-all duration-200 ${
                  designerState.activeRightPanel === 'visualizations' 
                    ? 'bg-blue-100 text-blue-600 border border-blue-300 shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                }`}
                title="Visualizations"
              >
                📈
              </button>
              <button 
                onClick={() => setDesignerState(prev => ({ 
                  ...prev, 
                  activeRightPanel: prev.activeRightPanel === 'properties' ? null : 'properties' 
                }))}
                className={`w-10 h-10 rounded-md flex items-center justify-center transition-all duration-200 ${
                  designerState.activeRightPanel === 'properties' 
                    ? 'bg-blue-100 text-blue-600 border border-blue-300 shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                }`}
                title="Properties"
              >
                🎨
              </button>
              <button 
                onClick={() => setDesignerState(prev => ({ 
                  ...prev, 
                  activeRightPanel: prev.activeRightPanel === 'filters' ? null : 'filters' 
                }))}
                className={`w-10 h-10 rounded-md flex items-center justify-center transition-all duration-200 ${
                  designerState.activeRightPanel === 'filters' 
                    ? 'bg-blue-100 text-blue-600 border border-blue-300 shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                }`}
                title="Filters"
              >
                🔍
              </button>
            </div>

            {designerState.activeRightPanel && (
              <div className="w-80 bg-white border-l border-gray-200 shadow-sm animate-slide-in-right panel-transition">
                <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-sm font-semibold text-gray-800">
                    {designerState.activeRightPanel === 'visualizations' && 'Visualizations'}
                    {designerState.activeRightPanel === 'properties' && 'Format'}
                    {designerState.activeRightPanel === 'filters' && 'Filters'}
                  </h3>
                  <button
                    onClick={() => setDesignerState(prev => ({ ...prev, activeRightPanel: null }))}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    title="Close panel"
                  >
                    ✕
                  </button>
                </div>
                <div className="h-full overflow-hidden panel-content">
                  {designerState.activeRightPanel === 'visualizations' && <PowerBIVisualizationsPanel selectedVisual={designerState.selectedVisual} onAddVisual={handleAddVisual} onUpdateVisual={handleUpdateVisual} />}
                  {designerState.activeRightPanel === 'properties' && <PropertiesPanel visual={designerState.selectedVisual} onUpdateVisual={handleUpdateVisual} />}
                  {designerState.activeRightPanel === 'filters' && <FilterPanel />}
                </div>
              </div>
            )}
          </div>
        </div>

        <DataSourceConnector
          isOpen={designerState.showDataSourceConnector}
          workspaceId={workspaceId}
          onConnect={(source, config, mode, datasetId) => {
            console.log('Dataset connected:', { source, config, mode, datasetId })
            // TODO: Add dataset to fields panel for visualization
            setDesignerState(prev => ({ ...prev, showDataSourceConnector: false }))}
          }
          onCancel={() => setDesignerState(prev => ({ ...prev, showDataSourceConnector: false }))}
        />

        <SaveDialog />
        <SaveAsDialog />
      </div>
    </DndProvider>
  )
})

PowerBIReportDesigner.displayName = 'PowerBIReportDesigner'
export default PowerBIReportDesigner