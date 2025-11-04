/**
 * Power BI Visualizations Panel
 * Replica of Power BI Desktop Visualizations panel with chart gallery and field wells
 */

import React from 'react'
import { useDrop, useDrag } from 'react-dnd'
import {
  ChartBarIcon,
  ChartPieIcon,
  PresentationChartLineIcon,
  ChartBarSquareIcon,
  CircleStackIcon,
  TableCellsIcon,
  XMarkIcon,
  SparklesIcon,
  RectangleGroupIcon,
  Square3Stack3DIcon,
  CreditCardIcon,
  ClockIcon,
  CubeIcon,
  FunnelIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import { Visual, VisualType } from '@/types/report'
import { VISUAL_TYPE_MAPPING, getVisualTypeById } from '@/config/visualTypes'

interface PowerBIVisualizationsPanelProps {
  activePanel?: 'visualizations' | 'format' | 'analytics'
  selectedVisual: Visual | null
  onAddVisual: (type: VisualType, position?: { x: number, y: number }) => void
  onUpdateVisual: (visualId: string, updates: Partial<Visual>) => void
  onFieldDrop?: (field: any, wellType: string, visualId?: string) => void
}

const PowerBIVisualizationsPanel: React.FC<PowerBIVisualizationsPanelProps> = ({
  activePanel = 'visualizations',
  selectedVisual,
  onAddVisual,
  onUpdateVisual,
  onFieldDrop
}) => {
  // Basic Charts
  const basicCharts = [
    { type: 'column-chart' as VisualType, icon: ChartBarIcon, label: 'Clustered column chart', description: 'Compare values across categories' },
    { type: 'stacked-column-chart' as VisualType, icon: RectangleGroupIcon, label: 'Stacked column chart', description: 'Compare parts of a whole across categories' },
    { type: 'bar-chart' as VisualType, icon: ChartBarSquareIcon, label: 'Clustered bar chart', description: 'Compare values across categories horizontally' },
    { type: 'line-chart' as VisualType, icon: PresentationChartLineIcon, label: 'Line chart', description: 'Show trends over time or ordered categories' },
    { type: 'area-chart' as VisualType, icon: CircleStackIcon, label: 'Area chart', description: 'Like line chart with filled areas' },
    { type: 'combo' as VisualType, icon: Square3Stack3DIcon, label: 'Line and clustered column chart', description: 'Combine line and column charts' }
  ]

  // Pie Charts
  const pieCharts = [
    { type: 'pie-chart' as VisualType, icon: ChartPieIcon, label: 'Pie chart', description: 'Show proportions of a whole' },
    { type: 'donut-chart' as VisualType, icon: ChartPieIcon, label: 'Donut chart', description: 'Like pie chart with hollow center' }
  ]

  // Scatter Charts
  const scatterCharts = [
    { type: 'scatter-plot' as VisualType, icon: SparklesIcon, label: 'Scatter chart', description: 'Show relationships between two measures' }
  ]

  // Advanced Charts
  const advancedCharts = [
    { type: 'funnel-chart' as VisualType, icon: FunnelIcon, label: 'Funnel chart', description: 'Show values at different stages of a process' },
    { type: 'gauge-chart' as VisualType, icon: ClockIcon, label: 'Gauge', description: 'Show progress toward a goal' }
  ]

  // Data Display
  const dataDisplay = [
    { type: 'table' as VisualType, icon: TableCellsIcon, label: 'Table', description: 'Display detailed data in rows and columns' },
    { type: 'card' as VisualType, icon: CreditCardIcon, label: 'Card', description: 'Display a single important number' }
  ]

  // Elements
  const elements = [
    { type: 'shape' as VisualType, icon: CubeIcon, label: 'Shapes', description: 'Add decorative shapes' }
  ]

  const VisualizationButton: React.FC<{ visual: any }> = ({ visual }) => {
    const [{ isDragging }, drag] = useDrag({
      type: 'visual-type',
      item: { 
        type: 'visual-type',
        visualType: visual.type,
        name: visual.label
      },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    })

    const visualConfig = getVisualTypeById(visual.type)
    
    return (
      <button
        ref={drag}
        key={visual.type}
        onClick={() => onAddVisual(visual.type)}
        className={`p-2 border border-gray-200 rounded hover:border-blue-500 hover:bg-blue-50 transition-colors group relative ${
          isDragging ? 'opacity-50' : ''
        }`}
        title={visual.description}
      >
        <visual.icon className="h-6 w-6 mx-auto text-gray-600 group-hover:text-blue-600" />
        {/* Show visual type icon from config if available */}
        {visualConfig && (
          <div className="absolute -top-1 -right-1 text-xs bg-blue-100 rounded-full w-4 h-4 flex items-center justify-center">
            {visualConfig.icon}
          </div>
        )}
      </button>
    )
  }

  const renderVisualizationCategory = (title: string, visuals: any[]) => (
    <div className="mb-4">
      <h5 className="text-xs font-medium text-gray-600 mb-2 uppercase tracking-wider">{title}</h5>
      <div className="grid grid-cols-4 gap-1">
        {visuals.map((visual) => (
          <VisualizationButton key={visual.type} visual={visual} />
        ))}
      </div>
    </div>
  )

  const renderVisualizationsTab = () => (
    <div className="p-3 overflow-auto">
      {/* Chart Gallery */}
      <div className="space-y-4">
        {renderVisualizationCategory('Basic Charts', basicCharts)}
        {renderVisualizationCategory('Pie Charts', pieCharts)}
        {renderVisualizationCategory('Scatter Charts', scatterCharts)}
        {renderVisualizationCategory('Advanced Charts', advancedCharts)}
        {renderVisualizationCategory('Data Display', dataDisplay)}
        {renderVisualizationCategory('Elements', elements)}
      </div>

      {/* Field Wells */}
      {selectedVisual && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <FieldWells
            visual={selectedVisual}
            onUpdateVisual={onUpdateVisual}
            onFieldDrop={onFieldDrop}
          />
        </div>
      )}
    </div>
  )

  const renderFormatTab = () => (
    <div className="p-4">
      {selectedVisual ? (
        <FormatPanel
          visual={selectedVisual}
          onUpdateVisual={onUpdateVisual}
        />
      ) : (
        <div className="text-center text-gray-500 py-8">
          <ChartBarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-sm">Select a visual to format it</p>
        </div>
      )}
    </div>
  )

  const renderAnalyticsTab = () => (
    <div className="p-4">
      {selectedVisual ? (
        <AnalyticsPanel
          visual={selectedVisual}
          onUpdateVisual={onUpdateVisual}
        />
      ) : (
        <div className="text-center text-gray-500 py-8">
          <PresentationChartLineIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-sm">Select a visual to add analytics</p>
        </div>
      )}
    </div>
  )

  return (
    <div className="h-full overflow-auto">
      {activePanel === 'visualizations' && renderVisualizationsTab()}
      {activePanel === 'format' && renderFormatTab()}
      {activePanel === 'analytics' && renderAnalyticsTab()}
    </div>
  )
}

// Field Wells Component
const FieldWells: React.FC<{
  visual: Visual
  onUpdateVisual: (visualId: string, updates: Partial<Visual>) => void
  onFieldDrop: (field: any, wellType: string, visualId?: string) => void
}> = ({ visual, onUpdateVisual, onFieldDrop }) => {
  const getFieldWellsForVisualType = (type: VisualType) => {
    switch (type) {
      case 'column':
      case 'clustered_column':
      case 'stacked_column':
      case '100_stacked_column':
      case 'clustered_bar':
      case 'stacked_bar':
      case '100_stacked_bar':
        return [
          { key: 'axis', label: 'Axis', description: 'Add data to group by' },
          { key: 'values', label: 'Values', description: 'Add data to measure' },
          { key: 'legend', label: 'Legend', description: 'Add data to break down by' },
          { key: 'tooltips', label: 'Tooltips', description: 'Add fields to show on hover' }
        ]
      case 'line':
      case 'area':
      case 'stacked_area':
      case '100_stacked_area':
        return [
          { key: 'axis', label: 'Axis', description: 'Add data for X-axis' },
          { key: 'values', label: 'Values', description: 'Add data for Y-axis' },
          { key: 'legend', label: 'Legend', description: 'Add data to break down by' },
          { key: 'tooltips', label: 'Tooltips', description: 'Add fields to show on hover' }
        ]
      case 'pie':
      case 'donut':
        return [
          { key: 'legend', label: 'Legend', description: 'Add data to group by' },
          { key: 'values', label: 'Values', description: 'Add data to measure' },
          { key: 'details', label: 'Details', description: 'Add fields for more detail' },
          { key: 'tooltips', label: 'Tooltips', description: 'Add fields to show on hover' }
        ]
      case 'scatter':
      case 'bubble':
        return [
          { key: 'xaxis', label: 'X Axis', description: 'Add data for X-axis' },
          { key: 'yaxis', label: 'Y Axis', description: 'Add data for Y-axis' },
          { key: 'legend', label: 'Legend', description: 'Add data to break down by' },
          { key: 'size', label: 'Size', description: 'Add data for bubble size' },
          { key: 'tooltips', label: 'Tooltips', description: 'Add fields to show on hover' }
        ]
      case 'treemap':
      case 'sunburst':
        return [
          { key: 'values', label: 'Values', description: 'Add data to measure' },
          { key: 'details', label: 'Details', description: 'Add fields for hierarchy' },
          { key: 'tooltips', label: 'Tooltips', description: 'Add fields to show on hover' }
        ]
      case 'waterfall':
        return [
          { key: 'axis', label: 'Category', description: 'Add categories for breakdown' },
          { key: 'values', label: 'Values', description: 'Add data to measure' }
        ]
      case 'funnel':
        return [
          { key: 'values', label: 'Values', description: 'Add data to measure' },
          { key: 'axis', label: 'Group', description: 'Add data to group by' }
        ]
      case 'gauge':
      case 'card':
      case 'kpi':
        return [
          { key: 'values', label: 'Values', description: 'Add data to measure' }
        ]
      case 'multi_row_card':
        return [
          { key: 'values', label: 'Fields', description: 'Add fields to display' }
        ]
      case 'table':
      case 'matrix':
        return [
          { key: 'values', label: 'Values', description: 'Add columns to show' },
          { key: 'axis', label: 'Rows', description: 'Add row groupings' },
          { key: 'legend', label: 'Columns', description: 'Add column groupings' }
        ]
      case 'slicer':
        return [
          { key: 'values', label: 'Field', description: 'Add field to filter by' }
        ]
      case 'map':
      case 'filled_map':
      case 'arcgis_map':
      case 'shape_map':
        return [
          { key: 'axis', label: 'Location', description: 'Add geographic data' },
          { key: 'values', label: 'Values', description: 'Add data to measure' },
          { key: 'legend', label: 'Legend', description: 'Add data to break down by' },
          { key: 'size', label: 'Size', description: 'Add data for bubble size' },
          { key: 'tooltips', label: 'Tooltips', description: 'Add fields to show on hover' }
        ]
      case 'combo':
        return [
          { key: 'axis', label: 'Shared Axis', description: 'Add data for X-axis' },
          { key: 'values', label: 'Column Values', description: 'Add data for columns' },
          { key: 'legend', label: 'Line Values', description: 'Add data for line' },
          { key: 'tooltips', label: 'Tooltips', description: 'Add fields to show on hover' }
        ]
      case 'ribbon':
        return [
          { key: 'axis', label: 'Axis', description: 'Add data for categories' },
          { key: 'legend', label: 'Legend', description: 'Add data to rank by' },
          { key: 'values', label: 'Values', description: 'Add data to measure' }
        ]
      default:
        return [
          { key: 'values', label: 'Values', description: 'Add data fields' },
          { key: 'tooltips', label: 'Tooltips', description: 'Add fields to show on hover' }
        ]
    }
  }

  const fieldWells = getFieldWellsForVisualType(visual.type)

  return (
    <div className="border-t border-gray-200 pt-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-3">Fields</h4>
      <div className="space-y-3">
        {fieldWells.map((well) => (
          <FieldWell
            key={well.key}
            wellType={well.key}
            label={well.label}
            description={well.description}
            fields={visual.config.fieldWells?.[well.key] || []}
            onFieldDrop={(field) => onFieldDrop(field, well.key, visual.id)}
            onRemoveField={(fieldIndex) => {
              const updatedFields = [...(visual.config.fieldWells?.[well.key] || [])]
              updatedFields.splice(fieldIndex, 1)
              onUpdateVisual(visual.id, {
                config: {
                  ...visual.config,
                  fieldWells: {
                    ...visual.config.fieldWells,
                    [well.key]: updatedFields
                  }
                }
              })
            }}
          />
        ))}
      </div>
    </div>
  )
}

// Individual Field Well Component
const FieldWell: React.FC<{
  wellType: string
  label: string
  description: string
  fields: any[]
  onFieldDrop: (field: any) => void
  onRemoveField: (index: number) => void
}> = ({ wellType, label, description, fields, onFieldDrop, onRemoveField }) => {
  const [{ isOver }, drop] = useDrop({
    accept: 'field',
    drop: (item: any) => {
      onFieldDrop(item)
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  })

  return (
    <div>
      <div className="text-xs font-medium text-gray-600 mb-1">{label}</div>
      <div
        ref={drop}
        className={`min-h-[40px] border-2 border-dashed rounded-md p-2 transition-colors ${
          isOver 
            ? 'border-blue-500 bg-blue-50' 
            : fields.length > 0
            ? 'border-gray-300 bg-white'
            : 'border-gray-200 bg-gray-50'
        }`}
      >
        {fields.length === 0 ? (
          <div className="text-xs text-gray-400 text-center py-2">
            {description}
          </div>
        ) : (
          <div className="space-y-1">
            {fields.map((field, index) => (
              <div
                key={`${field.name}-${index}`}
                className="flex items-center justify-between bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs"
              >
                <span className="truncate">{field.name}</span>
                <button
                  onClick={() => onRemoveField(index)}
                  className="ml-1 hover:bg-blue-200 p-0.5 rounded"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Format Panel Component
const FormatPanel: React.FC<{
  visual: Visual
  onUpdateVisual: (visualId: string, updates: Partial<Visual>) => void
}> = ({ visual, onUpdateVisual }) => {
  const [expandedSections, setExpandedSections] = React.useState<{[key: string]: boolean}>({
    general: true,
    title: false,
    background: false,
    dataColors: false,
    dataLabels: false,
    legend: false,
    xAxis: false,
    yAxis: false,
    tooltip: false,
    plotArea: false
  })

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({...prev, [section]: !prev[section]}))
  }

  const FormatSection: React.FC<{title: string, sectionKey: string, children: React.ReactNode}> = 
    ({ title, sectionKey, children }) => (
    <div className="border border-gray-200 rounded mb-2">
      <button
        onClick={() => toggleSection(sectionKey)}
        className="w-full bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center justify-between hover:bg-gray-100 transition-colors"
      >
        <h5 className="text-xs font-medium text-gray-700">{title}</h5>
        <ChevronDownIcon 
          className={`h-4 w-4 text-gray-500 transition-transform ${
            expandedSections[sectionKey] ? 'rotate-180' : ''
          }`} 
        />
      </button>
      {expandedSections[sectionKey] && (
        <div className="p-3 space-y-3">
          {children}
        </div>
      )}
    </div>
  )

  return (
    <div className="overflow-auto">
      <div className="p-3">
        <h4 className="text-sm font-semibold text-gray-700 mb-4">Format Visual</h4>
        
        {/* General */}
        <FormatSection title="General" sectionKey="general">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Show visual header</span>
            <input type="checkbox" className="rounded" defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Alt text</span>
            <input 
              type="text" 
              placeholder="Alt text"
              className="w-32 px-2 py-1 text-xs border border-gray-300 rounded"
            />
          </div>
        </FormatSection>

        {/* Title */}
        <FormatSection title="Title" sectionKey="title">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Title</span>
            <input
              type="checkbox"
              checked={!!visual.config.name}
              onChange={(e) => onUpdateVisual(visual.id, {
                config: {
                  ...visual.config,
                  name: e.target.checked ? 'Chart Title' : ''
                }
              })}
              className="rounded"
            />
          </div>
          {visual.config.name && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Title text</label>
                <input
                  type="text"
                  value={visual.config.name || ''}
                  onChange={(e) => onUpdateVisual(visual.id, {
                    config: {
                      ...visual.config,
                      name: e.target.value
                    }
                  })}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                  placeholder="Chart title"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Alignment</label>
                <select className="w-full px-2 py-1 text-xs border border-gray-300 rounded">
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Font size</label>
                  <input
                    type="number"
                    defaultValue={12}
                    min={8}
                    max={72}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Font color</label>
                  <input
                    type="color"
                    defaultValue="#333333"
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
              </div>
            </>
          )}
        </FormatSection>

        {/* Background */}
        <FormatSection title="Background" sectionKey="background">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Background</span>
            <input type="checkbox" className="rounded" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Color</label>
              <input
                type="color"
                defaultValue="#ffffff"
                className="w-full h-8 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Transparency</label>
              <input
                type="range"
                min="0"
                max="100"
                defaultValue="0"
                className="w-full"
              />
            </div>
          </div>
        </FormatSection>

        {/* Data Colors */}
        <FormatSection title="Data colors" sectionKey="dataColors">
          <div className="space-y-2">
            <div className="text-xs text-gray-600 mb-2">Default colors</div>
            <div className="grid grid-cols-6 gap-1">
              {visual.config.colors?.map((color, index) => (
                <div key={index} className="relative">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => {
                      const newColors = [...(visual.config.colors || [])]
                      newColors[index] = e.target.value
                      onUpdateVisual(visual.id, {
                        config: {
                          ...visual.config,
                          colors: newColors
                        }
                      })
                    }}
                    className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>
        </FormatSection>

        {/* Data Labels */}
        <FormatSection title="Data labels" sectionKey="dataLabels">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Data labels</span>
            <input
              type="checkbox"
              checked={visual.config.dataLabels?.show || false}
              onChange={(e) => onUpdateVisual(visual.id, {
                config: {
                  ...visual.config,
                  dataLabels: {
                    ...visual.config.dataLabels,
                    show: e.target.checked
                  }
                }
              })}
              className="rounded"
            />
          </div>
          {visual.config.dataLabels?.show && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Position</label>
                <select 
                  value={visual.config.dataLabels.position || 'outside'}
                  onChange={(e) => onUpdateVisual(visual.id, {
                    config: {
                      ...visual.config,
                      dataLabels: {
                        ...visual.config.dataLabels,
                        position: e.target.value
                      }
                    }
                  })}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                >
                  <option value="inside">Inside</option>
                  <option value="outside">Outside</option>
                  <option value="center">Center</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Font size</label>
                  <input
                    type="number"
                    value={visual.config.dataLabels.fontSize || 9}
                    onChange={(e) => onUpdateVisual(visual.id, {
                      config: {
                        ...visual.config,
                        dataLabels: {
                          ...visual.config.dataLabels,
                          fontSize: parseInt(e.target.value)
                        }
                      }
                    })}
                    min={6}
                    max={72}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Font color</label>
                  <input
                    type="color"
                    value={visual.config.dataLabels.fontColor || '#333333'}
                    onChange={(e) => onUpdateVisual(visual.id, {
                      config: {
                        ...visual.config,
                        dataLabels: {
                          ...visual.config.dataLabels,
                          fontColor: e.target.value
                        }
                      }
                    })}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
              </div>
            </>
          )}
        </FormatSection>

        {/* Legend */}
        <FormatSection title="Legend" sectionKey="legend">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Legend</span>
            <input
              type="checkbox"
              checked={visual.config.legend?.show || false}
              onChange={(e) => onUpdateVisual(visual.id, {
                config: {
                  ...visual.config,
                  legend: {
                    ...visual.config.legend,
                    show: e.target.checked
                  }
                }
              })}
              className="rounded"
            />
          </div>
          
          {visual.config.legend?.show && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Position</label>
                <select
                  value={visual.config.legend.position || 'right'}
                  onChange={(e) => onUpdateVisual(visual.id, {
                    config: {
                      ...visual.config,
                      legend: {
                        ...visual.config.legend,
                        position: e.target.value
                      }
                    }
                  })}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                >
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                  <option value="topCenter">Top center</option>
                  <option value="bottomCenter">Bottom center</option>
                  <option value="leftCenter">Left center</option>
                  <option value="rightCenter">Right center</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                <input
                  type="text"
                  value={visual.config.legend.title || ''}
                  onChange={(e) => onUpdateVisual(visual.id, {
                    config: {
                      ...visual.config,
                      legend: {
                        ...visual.config.legend,
                        title: e.target.value
                      }
                    }
                  })}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                  placeholder="Legend title"
                />
              </div>
            </>
          )}
        </FormatSection>

        {/* X-Axis */}
        {(visual.type === 'column' || visual.type === 'bar' || visual.type === 'line' || visual.type === 'area' || visual.type === 'scatter') && (
          <FormatSection title="X-Axis" sectionKey="xAxis">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">X-Axis</span>
              <input
                type="checkbox"
                checked={visual.config.axes?.x?.show !== false}
                onChange={(e) => onUpdateVisual(visual.id, {
                  config: {
                    ...visual.config,
                    axes: {
                      ...visual.config.axes,
                      x: {
                        ...visual.config.axes?.x,
                        show: e.target.checked
                      }
                    }
                  }
                })}
                className="rounded"
              />
            </div>
            {visual.config.axes?.x?.show !== false && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                  <input
                    type="text"
                    value={visual.config.axes?.x?.title || ''}
                    onChange={(e) => onUpdateVisual(visual.id, {
                      config: {
                        ...visual.config,
                        axes: {
                          ...visual.config.axes,
                          x: {
                            ...visual.config.axes?.x,
                            title: e.target.value
                          }
                        }
                      }
                    })}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                    placeholder="X-axis title"
                  />
                </div>
              </>
            )}
          </FormatSection>
        )}

        {/* Y-Axis */}
        {(visual.type === 'column' || visual.type === 'bar' || visual.type === 'line' || visual.type === 'area' || visual.type === 'scatter') && (
          <FormatSection title="Y-Axis" sectionKey="yAxis">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Y-Axis</span>
              <input
                type="checkbox"
                checked={visual.config.axes?.y?.show !== false}
                onChange={(e) => onUpdateVisual(visual.id, {
                  config: {
                    ...visual.config,
                    axes: {
                      ...visual.config.axes,
                      y: {
                        ...visual.config.axes?.y,
                        show: e.target.checked
                      }
                    }
                  }
                })}
                className="rounded"
              />
            </div>
            {visual.config.axes?.y?.show !== false && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                  <input
                    type="text"
                    value={visual.config.axes?.y?.title || ''}
                    onChange={(e) => onUpdateVisual(visual.id, {
                      config: {
                        ...visual.config,
                        axes: {
                          ...visual.config.axes,
                          y: {
                            ...visual.config.axes?.y,
                            title: e.target.value
                          }
                        }
                      }
                    })}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                    placeholder="Y-axis title"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Start</label>
                    <input
                      type="number"
                      value={visual.config.axes?.y?.min || ''}
                      onChange={(e) => onUpdateVisual(visual.id, {
                        config: {
                          ...visual.config,
                          axes: {
                            ...visual.config.axes,
                            y: {
                              ...visual.config.axes?.y,
                              min: parseFloat(e.target.value) || undefined
                            }
                          }
                        }
                      })}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      placeholder="Auto"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">End</label>
                    <input
                      type="number"
                      value={visual.config.axes?.y?.max || ''}
                      onChange={(e) => onUpdateVisual(visual.id, {
                        config: {
                          ...visual.config,
                          axes: {
                            ...visual.config.axes,
                            y: {
                              ...visual.config.axes?.y,
                              max: parseFloat(e.target.value) || undefined
                            }
                          }
                        }
                      })}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      placeholder="Auto"
                    />
                  </div>
                </div>
              </>
            )}
          </FormatSection>
        )}

        {/* Tooltip */}
        <FormatSection title="Tooltip" sectionKey="tooltip">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Tooltip</span>
            <input
              type="checkbox"
              checked={visual.config.tooltip?.show !== false}
              onChange={(e) => onUpdateVisual(visual.id, {
                config: {
                  ...visual.config,
                  tooltip: {
                    ...visual.config.tooltip,
                    show: e.target.checked
                  }
                }
              })}
              className="rounded"
            />
          </div>
        </FormatSection>
      </div>
    </div>
  )
}

// Analytics Panel Component
const AnalyticsPanel: React.FC<{
  visual: Visual
  onUpdateVisual: (visualId: string, updates: Partial<Visual>) => void
}> = ({ visual, onUpdateVisual }) => {
  const [expandedSections, setExpandedSections] = React.useState<{[key: string]: boolean}>({
    trendLine: false,
    constantLine: false,
    minMax: false,
    average: false,
    median: false,
    percentiles: false,
    forecast: false
  })

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({...prev, [section]: !prev[section]}))
  }

  const AnalyticsSection: React.FC<{title: string, sectionKey: string, children: React.ReactNode}> = 
    ({ title, sectionKey, children }) => (
    <div className="border border-gray-200 rounded mb-2">
      <button
        onClick={() => toggleSection(sectionKey)}
        className="w-full bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center justify-between hover:bg-gray-100 transition-colors"
      >
        <h5 className="text-xs font-medium text-gray-700">{title}</h5>
        <ChevronDownIcon 
          className={`h-4 w-4 text-gray-500 transition-transform ${
            expandedSections[sectionKey] ? 'rotate-180' : ''
          }`} 
        />
      </button>
      {expandedSections[sectionKey] && (
        <div className="p-3 space-y-3">
          {children}
        </div>
      )}
    </div>
  )

  return (
    <div className="overflow-auto">
      <div className="p-3">
        <h4 className="text-sm font-semibold text-gray-700 mb-4">Analytics</h4>
        
        {/* Trend Line */}
        <AnalyticsSection title="Trend line" sectionKey="trendLine">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Add trend line</span>
            <input type="checkbox" className="rounded" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Series</label>
            <select className="w-full px-2 py-1 text-xs border border-gray-300 rounded">
              <option value="all">All series</option>
              <option value="individual">Individual series</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Regression type</label>
            <select className="w-full px-2 py-1 text-xs border border-gray-300 rounded">
              <option value="linear">Linear</option>
              <option value="exponential">Exponential</option>
              <option value="logarithmic">Logarithmic</option>
              <option value="polynomial">Polynomial</option>
            </select>
          </div>
        </AnalyticsSection>

        {/* Constant Line */}
        <AnalyticsSection title="Constant line" sectionKey="constantLine">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Add constant line</span>
            <input type="checkbox" className="rounded" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Value</label>
            <input
              type="number"
              placeholder="Enter value"
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Color</label>
              <input
                type="color"
                defaultValue="#ff0000"
                className="w-full h-8 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Line style</label>
              <select className="w-full px-2 py-1 text-xs border border-gray-300 rounded">
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
            </div>
          </div>
        </AnalyticsSection>

        {/* Min/Max Lines */}
        <AnalyticsSection title="Min/Max lines" sectionKey="minMax">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Min line</span>
            <input type="checkbox" className="rounded" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Max line</span>
            <input type="checkbox" className="rounded" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Min color</label>
              <input
                type="color"
                defaultValue="#ff0000"
                className="w-full h-8 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Max color</label>
              <input
                type="color"
                defaultValue="#00ff00"
                className="w-full h-8 border border-gray-300 rounded"
              />
            </div>
          </div>
        </AnalyticsSection>

        {/* Average Line */}
        <AnalyticsSection title="Average line" sectionKey="average">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Add average line</span>
            <input type="checkbox" className="rounded" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Series</label>
            <select className="w-full px-2 py-1 text-xs border border-gray-300 rounded">
              <option value="all">All series</option>
              <option value="individual">Individual series</option>
            </select>
          </div>
        </AnalyticsSection>

        {/* Median Line */}
        <AnalyticsSection title="Median line" sectionKey="median">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Add median line</span>
            <input type="checkbox" className="rounded" />
          </div>
        </AnalyticsSection>

        {/* Percentiles */}
        <AnalyticsSection title="Percentile lines" sectionKey="percentiles">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Add percentile lines</span>
            <input type="checkbox" className="rounded" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Upper percentile</label>
              <input
                type="number"
                defaultValue={75}
                min={0}
                max={100}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Lower percentile</label>
              <input
                type="number"
                defaultValue={25}
                min={0}
                max={100}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
              />
            </div>
          </div>
        </AnalyticsSection>

        {/* Forecast */}
        <AnalyticsSection title="Forecast" sectionKey="forecast">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Add forecast</span>
            <input type="checkbox" className="rounded" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Forecast length</label>
            <input
              type="number"
              defaultValue={10}
              min={1}
              max={1000}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
              placeholder="Number of points"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Confidence interval</label>
            <input
              type="number"
              defaultValue={95}
              min={50}
              max={99}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
              placeholder="Percentage"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Ignore last</span>
            <input
              type="number"
              defaultValue={0}
              min={0}
              className="w-20 px-2 py-1 text-xs border border-gray-300 rounded"
              placeholder="0"
            />
          </div>
        </AnalyticsSection>
      </div>
    </div>
  )
}

export default PowerBIVisualizationsPanel