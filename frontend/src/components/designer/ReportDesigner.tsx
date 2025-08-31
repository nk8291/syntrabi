/**
 * Report Designer Component
 * Main report design interface with drag-and-drop functionality
 */

import React, { useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import FieldsPanel from './FieldsPanel'
import FilterPanel from './FilterPanel'
import DesignCanvas from './DesignCanvas'
import PropertiesPanel from './PropertiesPanel'
import VisualizationGallery from './VisualizationGallery'
import { Visual, VisualType, ReportPage } from '@/types/report'

interface ReportDesignerProps {
  workspaceId: string
  reportId: string
}

interface DesignerState {
  pages: ReportPage[]
  currentPageId: string
  selectedVisual: Visual | null
  showVisualGallery: boolean
  isRenamingPage: string | null
  snapToGrid: boolean
  gridSize: number
  copiedVisual: Visual | null
}

const ReportDesigner = forwardRef<any, ReportDesignerProps>(({
  workspaceId,
  reportId,
}, ref) => {
  const [designerState, setDesignerState] = useState<DesignerState>({
    pages: [{
      id: 'page-1',
      name: 'Page 1',
      visuals: []
    }],
    currentPageId: 'page-1',
    selectedVisual: null,
    showVisualGallery: false,
    isRenamingPage: null,
    snapToGrid: true,
    gridSize: 20,
    copiedVisual: null,
  })

  const currentPage = designerState.pages.find(p => p.id === designerState.currentPageId) || designerState.pages[0]

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    getReportData: () => {
      return {
        name: "Demo Report",
        description: "Report created in demo mode",
        dataset_id: null,
        report_json: {
          version: "1.0",
          pages: designerState.pages,
          theme: {
            name: "default",
            colors: ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"]
          }
        }
      }
    },
    getCurrentPage: () => currentPage,
    getVisuals: () => currentPage.visuals
  }), [designerState])

  const handleAddVisual = useCallback((type: VisualType, position: { x: number, y: number }) => {
    const newVisual: Visual = {
      id: `visual-${Date.now()}`,
      type,
      position: {
        x: position.x,
        y: position.y,
        width: 300,
        height: 200,
      },
      data_binding: {
        dataset_id: '',
        fields: [],
      },
      config: {
        colors: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'],
        legend: {
          show: true,
          position: 'right',
        },
        axes: {
          x: { show: true },
          y: { show: true },
        },
        formatting: {}
      },
    }

    setDesignerState(prev => ({
      ...prev,
      pages: prev.pages.map(page =>
        page.id === prev.currentPageId
          ? { ...page, visuals: [...page.visuals, newVisual] }
          : page
      ),
      selectedVisual: newVisual,
      showVisualGallery: false,
    }))
  }, [])

  const handleSelectVisual = useCallback((visual: Visual | null) => {
    setDesignerState(prev => ({
      ...prev,
      selectedVisual: visual,
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
    setDesignerState(prev => ({
      ...prev,
      pages: prev.pages.map(page =>
        page.id === prev.currentPageId
          ? { ...page, visuals: [...page.visuals, visual] }
          : page
      ),
      selectedVisual: visual
    }))
  }, [])

  // Page management functions
  const handleAddPage = useCallback(() => {
    const newPageId = `page-${Date.now()}`
    const newPage: ReportPage = {
      id: newPageId,
      name: `Page ${designerState.pages.length + 1}`,
      visuals: []
    }
    
    setDesignerState(prev => ({
      ...prev,
      pages: [...prev.pages, newPage],
      currentPageId: newPageId,
      selectedVisual: null
    }))
  }, [designerState.pages.length])

  const handleDeletePage = useCallback((pageId: string) => {
    if (designerState.pages.length <= 1) return // Don't delete the last page
    
    setDesignerState(prev => {
      const remainingPages = prev.pages.filter(p => p.id !== pageId)
      const newCurrentPageId = prev.currentPageId === pageId 
        ? remainingPages[0].id 
        : prev.currentPageId
      
      return {
        ...prev,
        pages: remainingPages,
        currentPageId: newCurrentPageId,
        selectedVisual: prev.currentPageId === pageId ? null : prev.selectedVisual
      }
    })
  }, [designerState.pages.length])

  const handleRenamePage = useCallback((pageId: string, newName: string) => {
    setDesignerState(prev => ({
      ...prev,
      pages: prev.pages.map(page =>
        page.id === pageId ? { ...page, name: newName } : page
      ),
      isRenamingPage: null
    }))
  }, [])

  const handleSwitchPage = useCallback((pageId: string) => {
    setDesignerState(prev => ({
      ...prev,
      currentPageId: pageId,
      selectedVisual: null
    }))
  }, [])

  const handleFilterChange = useCallback((filterId: string, filterConfig: any) => {
    // TODO: Implement filter application logic
    console.log('Filter changed:', filterId, filterConfig)
  }, [])

  // Snap to grid function
  const snapToGrid = useCallback((value: number) => {
    if (!designerState.snapToGrid) return value
    return Math.round(value / designerState.gridSize) * designerState.gridSize
  }, [designerState.snapToGrid, designerState.gridSize])

  // Copy visual
  const handleCopyVisual = useCallback(() => {
    if (designerState.selectedVisual) {
      setDesignerState(prev => ({
        ...prev,
        copiedVisual: { ...prev.selectedVisual! }
      }))
    }
  }, [designerState.selectedVisual])

  // Paste visual
  const handlePasteVisual = useCallback(() => {
    if (designerState.copiedVisual) {
      const newVisual: Visual = {
        ...designerState.copiedVisual,
        id: `visual-${Date.now()}`,
        position: {
          ...designerState.copiedVisual.position,
          x: snapToGrid(designerState.copiedVisual.position.x + 20),
          y: snapToGrid(designerState.copiedVisual.position.y + 20),
        }
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
    }
  }, [designerState.copiedVisual, snapToGrid])

  // Alignment functions
  const alignVisuals = useCallback((alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (!designerState.selectedVisual || currentPage.visuals.length < 2) return

    const selectedVisual = designerState.selectedVisual
    const otherVisuals = currentPage.visuals.filter(v => v.id !== selectedVisual.id)
    
    let alignValue: number
    
    switch (alignment) {
      case 'left':
        alignValue = Math.min(...otherVisuals.map(v => v.position.x))
        handleUpdateVisual(selectedVisual.id, {
          position: { ...selectedVisual.position, x: snapToGrid(alignValue) }
        })
        break
      case 'center':
        alignValue = otherVisuals.reduce((acc, v) => acc + v.position.x + v.position.width / 2, 0) / otherVisuals.length
        handleUpdateVisual(selectedVisual.id, {
          position: { ...selectedVisual.position, x: snapToGrid(alignValue - selectedVisual.position.width / 2) }
        })
        break
      case 'right':
        alignValue = Math.max(...otherVisuals.map(v => v.position.x + v.position.width))
        handleUpdateVisual(selectedVisual.id, {
          position: { ...selectedVisual.position, x: snapToGrid(alignValue - selectedVisual.position.width) }
        })
        break
      case 'top':
        alignValue = Math.min(...otherVisuals.map(v => v.position.y))
        handleUpdateVisual(selectedVisual.id, {
          position: { ...selectedVisual.position, y: snapToGrid(alignValue) }
        })
        break
      case 'middle':
        alignValue = otherVisuals.reduce((acc, v) => acc + v.position.y + v.position.height / 2, 0) / otherVisuals.length
        handleUpdateVisual(selectedVisual.id, {
          position: { ...selectedVisual.position, y: snapToGrid(alignValue - selectedVisual.position.height / 2) }
        })
        break
      case 'bottom':
        alignValue = Math.max(...otherVisuals.map(v => v.position.y + v.position.height))
        handleUpdateVisual(selectedVisual.id, {
          position: { ...selectedVisual.position, y: snapToGrid(alignValue - selectedVisual.position.height) }
        })
        break
    }
  }, [designerState.selectedVisual, currentPage.visuals, snapToGrid, handleUpdateVisual])

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case 'c':
            event.preventDefault()
            handleCopyVisual()
            break
          case 'v':
            event.preventDefault()
            handlePasteVisual()
            break
          case 'd':
            event.preventDefault()
            if (designerState.selectedVisual) {
              handleDuplicateVisual({
                ...designerState.selectedVisual,
                id: `visual-${Date.now()}`,
                position: {
                  ...designerState.selectedVisual.position,
                  x: snapToGrid(designerState.selectedVisual.position.x + 20),
                  y: snapToGrid(designerState.selectedVisual.position.y + 20),
                }
              })
            }
            break
        }
      }
      
      if (event.key === 'Delete' && designerState.selectedVisual) {
        event.preventDefault()
        handleDeleteVisual(designerState.selectedVisual.id)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [designerState.selectedVisual, handleCopyVisual, handlePasteVisual, handleDuplicateVisual, handleDeleteVisual, snapToGrid])

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="grid grid-designer h-full">
        {/* Fields Panel */}
        <FieldsPanel
          workspaceId={workspaceId}
          onFieldDrop={() => {}}
        />

        {/* Filter Panel */}
        <FilterPanel
          workspaceId={workspaceId}
          currentPage={currentPage}
          selectedVisual={designerState.selectedVisual}
          onFilterChange={handleFilterChange}
        />

        {/* Main Canvas */}
        <div className="relative flex flex-col">
          {/* Canvas Toolbar */}
          <div className="toolbar border-b">
            <div className="toolbar-group">
              <button
                onClick={() => setDesignerState(prev => ({
                  ...prev,
                  showVisualGallery: !prev.showVisualGallery
                }))}
                className="btn btn-outline btn-sm"
              >
                Add Visual
              </button>
            </div>
            
            {/* Alignment Tools */}
            {designerState.selectedVisual && (
              <div className="toolbar-group">
                <span className="text-xs text-gray-600 mr-2">Align:</span>
                <div className="flex space-x-1">
                  <button
                    onClick={() => alignVisuals('left')}
                    className="btn btn-ghost btn-sm text-xs"
                    title="Align Left"
                  >
                    ⬅️
                  </button>
                  <button
                    onClick={() => alignVisuals('center')}
                    className="btn btn-ghost btn-sm text-xs"
                    title="Align Center"
                  >
                    ↔️
                  </button>
                  <button
                    onClick={() => alignVisuals('right')}
                    className="btn btn-ghost btn-sm text-xs"
                    title="Align Right"
                  >
                    ➡️
                  </button>
                  <button
                    onClick={() => alignVisuals('top')}
                    className="btn btn-ghost btn-sm text-xs"
                    title="Align Top"
                  >
                    ⬆️
                  </button>
                  <button
                    onClick={() => alignVisuals('middle')}
                    className="btn btn-ghost btn-sm text-xs"
                    title="Align Middle"
                  >
                    ↕️
                  </button>
                  <button
                    onClick={() => alignVisuals('bottom')}
                    className="btn btn-ghost btn-sm text-xs"
                    title="Align Bottom"
                  >
                    ⬇️
                  </button>
                </div>
              </div>
            )}
            
            {/* Copy/Paste Tools */}
            <div className="toolbar-group">
              <button
                onClick={handleCopyVisual}
                disabled={!designerState.selectedVisual}
                className="btn btn-ghost btn-sm text-xs"
                title="Copy (Ctrl+C)"
              >
                📋
              </button>
              <button
                onClick={handlePasteVisual}
                disabled={!designerState.copiedVisual}
                className="btn btn-ghost btn-sm text-xs"
                title="Paste (Ctrl+V)"
              >
                📄
              </button>
            </div>
            
            {/* Grid Options */}
            <div className="toolbar-group">
              <button
                onClick={() => setDesignerState(prev => ({
                  ...prev,
                  snapToGrid: !prev.snapToGrid
                }))}
                className={`btn btn-sm text-xs ${
                  designerState.snapToGrid ? 'btn-primary' : 'btn-ghost'
                }`}
                title="Snap to Grid"
              >
                📐
              </button>
              <select
                value={designerState.gridSize}
                onChange={(e) => setDesignerState(prev => ({
                  ...prev,
                  gridSize: parseInt(e.target.value)
                }))}
                className="input text-xs w-16"
                title="Grid Size"
              >
                <option value="10">10px</option>
                <option value="20">20px</option>
                <option value="25">25px</option>
                <option value="50">50px</option>
              </select>
            </div>
            
            <div className="toolbar-group">
              <span className="text-sm text-gray-600">
                Page: {currentPage.name}
              </span>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 relative">
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

            {/* Visual Gallery Overlay */}
            {designerState.showVisualGallery && (
              <VisualizationGallery
                onSelectVisualization={handleAddVisual}
                onClose={() => setDesignerState(prev => ({
                  ...prev,
                  showVisualGallery: false
                }))}
              />
            )}
          </div>
        </div>

        {/* Properties Panel */}
        <PropertiesPanel
          selectedVisual={designerState.selectedVisual}
          onUpdateVisual={handleUpdateVisual}
        />

        {/* Page Tabs - spans full width at bottom */}
        <div className="col-span-4 bg-white border-t border-gray-200 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between h-10 px-4">
            {/* Page Tabs */}
            <div className="flex items-center space-x-1">
              {designerState.pages.map((page) => (
                <div key={page.id} className="relative group">
                  {designerState.isRenamingPage === page.id ? (
                    <input
                      type="text"
                      defaultValue={page.name}
                      className="w-24 px-2 py-1 text-xs bg-transparent border rounded focus:outline-none focus:border-primary-500"
                      autoFocus
                      onBlur={(e) => handleRenamePage(page.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleRenamePage(page.id, e.currentTarget.value)
                        } else if (e.key === 'Escape') {
                          setDesignerState(prev => ({ ...prev, isRenamingPage: null }))
                        }
                      }}
                    />
                  ) : (
                    <button
                      onClick={() => handleSwitchPage(page.id)}
                      className={`px-3 py-1 text-xs rounded-t transition-colors duration-200 ${
                        page.id === designerState.currentPageId
                          ? 'bg-primary-50 text-primary-700 border-t border-l border-r border-primary-200 dark:bg-primary-900/20 dark:text-primary-300'
                          : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700'
                      }`}
                    >
                      {page.name}
                    </button>
                  )}
                  
                  {/* Page Actions Menu */}
                  <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="flex space-x-1 mt-1 mr-1">
                      <button
                        onClick={() => setDesignerState(prev => ({ ...prev, isRenamingPage: page.id }))}
                        className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        title="Rename page"
                      >
                        ✏️
                      </button>
                      {designerState.pages.length > 1 && (
                        <button
                          onClick={() => handleDeletePage(page.id)}
                          className="w-4 h-4 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                          title="Delete page"
                        >
                          ❌
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Add Page Button */}
              <button
                onClick={handleAddPage}
                className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 rounded transition-colors duration-200 dark:text-gray-400 dark:hover:bg-gray-700"
                title="Add new page"
              >
                + Add Page
              </button>
            </div>
            
            {/* Page Info */}
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {currentPage.visuals.length} visual{currentPage.visuals.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>
    </DndProvider>
  )
})

ReportDesigner.displayName = 'ReportDesigner'

export default ReportDesigner