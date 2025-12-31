/**
 * Simplified Report Designer - Clean, Responsive Layout
 * Focused on working at 100% zoom with proper visibility
 */

import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import {
  ChartBarIcon,
  ChartPieIcon,
  TableCellsIcon,
  PresentationChartLineIcon,
  XMarkIcon,
  PlusIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CircleStackIcon
} from '@heroicons/react/24/outline'
import { datasetService, Dataset } from '@/services/datasetService'
import SimpleChartRenderer from './SimpleChartRenderer'

interface Visual {
  id: string
  type: string
  position: { x: number; y: number; width: number; height: number }
  title: string
  fields: any[]
  data?: any[] // Actual data for the visualization
  loading?: boolean
}

interface SimplifiedReportDesignerProps {
  workspaceId: string
  reportId?: string
}

const SimplifiedReportDesigner = forwardRef<any, SimplifiedReportDesignerProps>(
  ({ workspaceId, reportId }, ref) => {
    const [visuals, setVisuals] = useState<Visual[]>([])
    const [selectedVisualId, setSelectedVisualId] = useState<string | null>(null)
    const [showVisualizationsPanel, setShowVisualizationsPanel] = useState(true)
    const [showFieldsPanel, setShowFieldsPanel] = useState(true)
    const [datasets, setDatasets] = useState<Dataset[]>([])
    const [loadingDatasets, setLoadingDatasets] = useState(true)
    const [expandedDatasets, setExpandedDatasets] = useState<Set<string>>(new Set())

    // Fetch datasets on mount
    useEffect(() => {
      const fetchDatasets = async () => {
        try {
          setLoadingDatasets(true)
          const data = await datasetService.getDatasets(workspaceId)
          setDatasets(data)
          // Auto-expand first dataset
          if (data.length > 0) {
            setExpandedDatasets(new Set([data[0].id]))
          }
          console.log('Loaded datasets:', data)
        } catch (error) {
          console.error('Failed to load datasets:', error)
        } finally {
          setLoadingDatasets(false)
        }
      }
      fetchDatasets()
    }, [workspaceId])

    const toggleDataset = (datasetId: string) => {
      const newExpanded = new Set(expandedDatasets)
      if (newExpanded.has(datasetId)) {
        newExpanded.delete(datasetId)
      } else {
        newExpanded.add(datasetId)
      }
      setExpandedDatasets(newExpanded)
    }

    useImperativeHandle(ref, () => ({
      getReportData: () => ({
        name: "Report",
        description: "Created with Power BI Web Replica",
        dataset_id: null,
        report_json: {
          version: "1.0",
          pages: [
            {
              id: 'page-1',
              name: 'Page 1',
              visuals: visuals
            }
          ]
        }
      })
    }), [visuals])

    const visualTypes = [
      { type: 'bar', icon: ChartBarIcon, label: 'Bar Chart' },
      { type: 'pie', icon: ChartPieIcon, label: 'Pie Chart' },
      { type: 'line', icon: PresentationChartLineIcon, label: 'Line Chart' },
      { type: 'table', icon: TableCellsIcon, label: 'Table' }
    ]

    const addVisual = (type: string, position: { x: number; y: number }, initialFields: any[] = []) => {
      const newVisual: Visual = {
        id: `visual-${Date.now()}`,
        type,
        position: { x: position.x, y: position.y, width: 400, height: 300 },
        title: initialFields.length > 0 ? `${initialFields[0].name} by ${type}` : `${type} Chart`,
        fields: initialFields
      }
      setVisuals([...visuals, newVisual])
      setSelectedVisualId(newVisual.id)
    }

    const addFieldToVisual = (visualId: string, field: any) => {
      setVisuals(visuals.map(v => {
        if (v.id === visualId) {
          const updatedFields = [...v.fields, field]
          return {
            ...v,
            fields: updatedFields,
            title: `${updatedFields[0]?.name || 'Data'} by ${v.type}`,
            loading: true
          }
        }
        return v
      }))
      // Fetch data after adding field
      fetchVisualData(visualId)
    }

    const fetchVisualData = async (visualId: string) => {
      const visual = visuals.find(v => v.id === visualId)
      if (!visual || visual.fields.length === 0) return

      const field = visual.fields[0]
      const datasetId = field.datasetId

      if (!datasetId) return

      try {
        // Query the dataset for preview data
        const result = await datasetService.queryDataset(datasetId, {
          limit: 100 // Get first 100 rows
        })

        setVisuals(prev => prev.map(v =>
          v.id === visualId
            ? { ...v, data: result.data, loading: false }
            : v
        ))

        console.log('Fetched data for visual:', visualId, result)
      } catch (error) {
        console.error('Failed to fetch visual data:', error)
        setVisuals(prev => prev.map(v =>
          v.id === visualId
            ? { ...v, loading: false }
            : v
        ))
      }
    }

    // Fetch data when visual is created with initial fields
    useEffect(() => {
      visuals.forEach(visual => {
        if (visual.fields.length > 0 && !visual.data && !visual.loading) {
          fetchVisualData(visual.id)
        }
      })
    }, [visuals.map(v => v.fields.length).join(',')])

    const deleteVisual = (id: string) => {
      setVisuals(visuals.filter(v => v.id !== id))
      if (selectedVisualId === id) {
        setSelectedVisualId(null)
      }
    }

    const updateVisualPosition = (id: string, position: { x: number; y: number }) => {
      setVisuals(visuals.map(v =>
        v.id === id ? { ...v, position: { ...v.position, ...position } } : v
      ))
    }

    return (
      <DndProvider backend={HTML5Backend}>
        <div className="h-screen flex flex-col bg-gray-100">
          {/* Top Menu Bar */}
          <div className="h-12 bg-gray-800 text-white flex items-center px-4 space-x-4">
            <span className="font-semibold">Power BI Report Designer</span>
            <button
              onClick={() => setShowFieldsPanel(!showFieldsPanel)}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
            >
              {showFieldsPanel ? 'Hide' : 'Show'} Fields
            </button>
            <button
              onClick={() => setShowVisualizationsPanel(!showVisualizationsPanel)}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
            >
              {showVisualizationsPanel ? 'Hide' : 'Show'} Visualizations
            </button>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Panel - Fields */}
            {showFieldsPanel && (
              <div className="w-72 bg-white border-r border-gray-300 flex flex-col">
                <div className="h-10 bg-gray-50 border-b border-gray-300 flex items-center px-3 font-semibold text-sm">
                  <CircleStackIcon className="w-4 h-4 mr-2" />
                  Fields
                </div>
                <div className="flex-1 overflow-y-auto">
                  {loadingDatasets ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      Loading datasets...
                    </div>
                  ) : datasets.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      <CircleStackIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No datasets found</p>
                      <p className="text-xs mt-1">Import a dataset to get started</p>
                    </div>
                  ) : (
                    <div className="py-2">
                      {datasets.map((dataset) => (
                        <DatasetSection
                          key={dataset.id}
                          dataset={dataset}
                          isExpanded={expandedDatasets.has(dataset.id)}
                          onToggle={() => toggleDataset(dataset.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Center - Canvas */}
            <div className="flex-1 flex flex-col">
              <Canvas
                visuals={visuals}
                selectedVisualId={selectedVisualId}
                onSelectVisual={setSelectedVisualId}
                onAddVisual={addVisual}
                onAddFieldToVisual={addFieldToVisual}
                onUpdateVisualPosition={updateVisualPosition}
                onDeleteVisual={deleteVisual}
              />
            </div>

            {/* Right Panel - Visualizations */}
            {showVisualizationsPanel && (
              <div className="w-80 bg-white border-l border-gray-300 flex flex-col">
                <div className="h-10 bg-gray-50 border-b border-gray-300 flex items-center px-3 font-semibold text-sm">
                  Visualizations
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="grid grid-cols-3 gap-2">
                    {visualTypes.map((visual) => (
                      <VisualizationButton
                        key={visual.type}
                        visual={visual}
                        onAddVisual={addVisual}
                      />
                    ))}
                  </div>

                  {/* Field Wells */}
                  {selectedVisualId && (
                    <div className="mt-6">
                      <div className="text-sm font-semibold mb-2">Field Wells</div>
                      <div className="space-y-2">
                        <FieldWell label="Axis" />
                        <FieldWell label="Values" />
                        <FieldWell label="Legend" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </DndProvider>
    )
  }
)

// Dataset Section Component
const DatasetSection: React.FC<{
  dataset: Dataset
  isExpanded: boolean
  onToggle: () => void
}> = ({ dataset, isExpanded, onToggle }) => {
  // Parse schema to get columns
  // Handle both direct columns and table-based schema
  let columns: any[] = []

  if (dataset.schema_json?.columns) {
    // Direct columns format
    columns = dataset.schema_json.columns
  } else if (dataset.schema_json?.tables && dataset.schema_json.tables.length > 0) {
    // Table-based format (used by CSV uploads)
    columns = dataset.schema_json.tables[0].columns || []
  }

  console.log('Dataset columns:', dataset.name, columns)

  return (
    <div className="mb-2">
      {/* Dataset Header */}
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-center hover:bg-gray-50 text-left"
      >
        {isExpanded ? (
          <ChevronDownIcon className="w-4 h-4 mr-1 text-gray-500" />
        ) : (
          <ChevronRightIcon className="w-4 h-4 mr-1 text-gray-500" />
        )}
        <CircleStackIcon className="w-4 h-4 mr-2 text-blue-600" />
        <span className="text-sm font-semibold text-gray-800 flex-1 truncate">
          {dataset.name}
        </span>
        <span className="text-xs text-gray-500">
          {columns.length} fields
        </span>
      </button>

      {/* Dataset Fields */}
      {isExpanded && (
        <div className="ml-7 mr-2 space-y-1">
          {columns.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400 italic">
              No fields available
            </div>
          ) : (
            columns.map((column: any, index: number) => (
              <FieldItem
                key={index}
                field={{
                  name: column.name,
                  type: column.type,
                  datasetId: dataset.id,
                  datasetName: dataset.name
                }}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// Field Item Component
const FieldItem: React.FC<{ field: any }> = ({ field }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'field',
    item: { type: 'field', field },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  })

  // Determine if field is a measure (number) or dimension (text/date)
  const fieldType = (field.type || '').toLowerCase()
  const isNumeric =
    fieldType === 'number' ||
    fieldType === 'integer' ||
    fieldType === 'decimal' ||
    fieldType === 'float' ||
    fieldType === 'numeric' ||
    fieldType === 'int' ||
    fieldType === 'bigint' ||
    fieldType === 'double' ||
    fieldType.includes('int') ||
    fieldType.includes('float') ||
    fieldType.includes('double') ||
    fieldType.includes('decimal') ||
    fieldType.includes('numeric')

  return (
    <div
      ref={drag}
      className={`px-2 py-1.5 bg-white hover:bg-blue-50 border border-gray-200 rounded cursor-move text-xs transition-colors ${
        isDragging ? 'opacity-50 scale-95' : ''
      }`}
      title={`${field.datasetName} - ${field.name} (${field.type})`}
    >
      <span className={isNumeric ? 'text-blue-600 font-mono' : 'text-gray-700'}>
        {isNumeric ? 'Σ' : '▼'} {field.name}
      </span>
    </div>
  )
}

// Visualization Button Component
const VisualizationButton: React.FC<{
  visual: any
  onAddVisual: (type: string, position: { x: number; y: number }) => void
}> = ({ visual, onAddVisual }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'visual-type',
    item: { type: 'visual-type', visualType: visual.type },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  })

  const Icon = visual.icon

  return (
    <button
      ref={drag}
      onClick={() => onAddVisual(visual.type, { x: 100, y: 100 })}
      className={`p-3 bg-gray-50 hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-400 rounded flex flex-col items-center gap-1 transition-all ${
        isDragging ? 'opacity-50' : ''
      }`}
      title={visual.label}
    >
      <Icon className="w-6 h-6 text-gray-700" />
      <span className="text-[10px] text-gray-600 text-center leading-tight">
        {visual.label.split(' ')[0]}
      </span>
    </button>
  )
}

// Field Well Component
const FieldWell: React.FC<{ label: string }> = ({ label }) => {
  const [{ isOver }, drop] = useDrop({
    accept: 'field',
    drop: (item: any) => {
      console.log('Field dropped:', item)
    },
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  })

  return (
    <div>
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      <div
        ref={drop}
        className={`min-h-[60px] border-2 border-dashed rounded p-2 ${
          isOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
        }`}
      >
        <div className="text-xs text-gray-400 text-center py-2">
          Drop field here
        </div>
      </div>
    </div>
  )
}

// Canvas Component
const Canvas: React.FC<{
  visuals: Visual[]
  selectedVisualId: string | null
  onSelectVisual: (id: string | null) => void
  onAddVisual: (type: string, position: { x: number; y: number }, fields?: any[]) => void
  onAddFieldToVisual: (visualId: string, field: any) => void
  onUpdateVisualPosition: (id: string, position: { x: number; y: number }) => void
  onDeleteVisual: (id: string) => void
}> = ({ visuals, selectedVisualId, onSelectVisual, onAddVisual, onAddFieldToVisual, onUpdateVisualPosition, onDeleteVisual }) => {
  const [{ isOver }, drop] = useDrop({
    accept: ['visual-type', 'field'],
    drop: (item: any, monitor) => {
      const offset = monitor.getClientOffset()
      if (!offset) return

      const canvasElement = document.querySelector('.report-canvas')
      if (!canvasElement) return

      const canvasRect = canvasElement.getBoundingClientRect()
      const position = {
        x: Math.max(0, offset.x - canvasRect.left - 200),
        y: Math.max(0, offset.y - canvasRect.top - 150)
      }

      if (item.type === 'visual-type') {
        onAddVisual(item.visualType, position)
      } else if (item.type === 'field') {
        // Check if dropping on a selected visual
        if (selectedVisualId) {
          // Add field to existing visual
          onAddFieldToVisual(selectedVisualId, item.field)
        } else {
          // Create a new visualization with this field
          onAddVisual('bar', position, [item.field])
        }
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  })

  return (
    <div
      ref={drop}
      className={`report-canvas flex-1 relative overflow-auto bg-white ${
        isOver ? 'bg-blue-50' : ''
      }`}
      onClick={() => onSelectVisual(null)}
    >
      {/* Grid Background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, #e5e7eb 1px, transparent 1px),
            linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }}
      />

      {/* Visuals */}
      {visuals.map((visual) => (
        <VisualBox
          key={visual.id}
          visual={visual}
          isSelected={selectedVisualId === visual.id}
          onSelect={() => onSelectVisual(visual.id)}
          onMove={(position) => onUpdateVisualPosition(visual.id, position)}
          onDelete={() => onDeleteVisual(visual.id)}
          onAddField={(field) => onAddFieldToVisual(visual.id, field)}
        />
      ))}

      {/* Empty State */}
      {visuals.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-gray-400">
            <PlusIcon className="w-16 h-16 mx-auto mb-2 opacity-50" />
            <p className="text-lg">Drag visualizations or fields here</p>
            <p className="text-sm">Or click visualization icons on the right</p>
          </div>
        </div>
      )}
    </div>
  )
}

// Visual Box Component
const VisualBox: React.FC<{
  visual: Visual
  isSelected: boolean
  onSelect: () => void
  onMove: (position: { x: number; y: number }) => void
  onDelete: () => void
  onAddField?: (field: any) => void
}> = ({ visual, isSelected, onSelect, onMove, onDelete, onAddField }) => {
  const [isDragging, setIsDragging] = useState(false)

  // Accept field drops on this visual
  const [{ isFieldOver }, drop] = useDrop({
    accept: 'field',
    drop: (item: any) => {
      if (item.field && onAddField) {
        onAddField(item.field)
        onSelect() // Select visual when field is added
      }
    },
    collect: (monitor) => ({
      isFieldOver: monitor.isOver() && monitor.canDrop()
    })
  })

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.visual-header')) {
      e.preventDefault()
      setIsDragging(true)
      onSelect()

      const startX = e.clientX
      const startY = e.clientY
      const startPosX = visual.position.x
      const startPosY = visual.position.y

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX
        const deltaY = moveEvent.clientY - startY
        onMove({
          x: Math.max(0, startPosX + deltaX),
          y: Math.max(0, startPosY + deltaY)
        })
      }

      const handleMouseUp = () => {
        setIsDragging(false)
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
  }

  return (
    <div
      ref={drop}
      className={`absolute bg-white rounded-lg border-2 shadow-lg transition-all ${
        isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'
      } ${isDragging ? 'cursor-grabbing' : 'cursor-default'} ${
        isFieldOver ? 'ring-4 ring-green-300 border-green-500 bg-green-50' : ''
      }`}
      style={{
        left: visual.position.x,
        top: visual.position.y,
        width: visual.position.width,
        height: visual.position.height
      }}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div className="visual-header h-8 bg-gray-50 border-b border-gray-200 flex items-center justify-between px-3 cursor-move">
        <span className="text-sm font-medium text-gray-700">{visual.title}</span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="text-gray-400 hover:text-red-600"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="h-[calc(100%-2rem)] flex flex-col overflow-hidden">
        {visual.fields.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center p-4">
              <div className="text-lg mb-2">{visual.type.toUpperCase()}</div>
              <div className="text-sm">Drag fields here to visualize data</div>
            </div>
          </div>
        ) : visual.loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <div className="text-xs text-gray-500">Loading data...</div>
            </div>
          </div>
        ) : visual.data && visual.data.length > 0 ? (
          <div className="flex-1 overflow-hidden">
            <SimpleChartRenderer
              type={visual.type}
              data={visual.data}
              fields={visual.fields}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center p-4">
              <div className="text-sm mb-2">No data available</div>
              <div className="text-xs">
                {visual.fields.length} field{visual.fields.length !== 1 ? 's' : ''} connected
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

SimplifiedReportDesigner.displayName = 'SimplifiedReportDesigner'
export default SimplifiedReportDesigner
