/**
 * Properties Panel Component
 * Comprehensive configuration panel for selected visual properties
 */

import React, { useState } from 'react'
import {
  PaintBrushIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FunnelIcon,
  AdjustmentsHorizontalIcon,
  EyeIcon,
  ArrowsPointingOutIcon,
} from '@heroicons/react/24/outline'
import { Visual, FieldRole } from '@/types/report'
import { getVisualTypeById } from '@/config/visualTypes'
import FieldDropZone from './FieldDropZone'

interface DataField {
  name: string
  type: 'string' | 'number' | 'date' | 'boolean'
  table: string
  description?: string
  isCalculated?: boolean
  isMeasure?: boolean
  aggregation?: 'sum' | 'count' | 'avg' | 'min' | 'max'
}

interface PropertiesPanelProps {
  selectedVisual: Visual | null
  onUpdateVisual: (visualId: string, updates: Partial<Visual>) => void
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ 
  selectedVisual, 
  onUpdateVisual 
}) => {
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    general: true,
    data: false,
    formatting: false,
    dataColors: false,
    title: false,
    background: false,
    border: false,
    filters: false,
    analytics: false,
    position: false
  })

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  if (!selectedVisual) {
    return (
      <div className="panel">
        <div className="panel-header">
          <h3 className="text-sm font-semibold text-gray-900">Properties</h3>
        </div>
        <div className="panel-content">
          <div className="text-center py-8 text-gray-500">
            <ChartBarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm">Select a visual to edit its properties</p>
          </div>
        </div>
      </div>
    )
  }

  const visualConfig = getVisualTypeById(selectedVisual.type)
  
  // Fallback configuration for unsupported visual types
  const fallbackConfig = {
    id: selectedVisual.type,
    name: selectedVisual.type.charAt(0).toUpperCase() + selectedVisual.type.slice(1),
    description: `${selectedVisual.type} visualization`,
    icon: '📊',
    fieldWells: {
      values: {
        label: 'Values',
        max: 10,
        required: true,
        accepts: ['measure'],
        fields: []
      },
      category: {
        label: 'Category',
        max: 1,
        required: false,
        accepts: ['dimension'],
        fields: []
      }
    },
    properties: {}
  }
  
  const config = visualConfig || fallbackConfig

  const handlePropertyChange = (propertyKey: string, value: any) => {
    onUpdateVisual(selectedVisual.id, {
      config: {
        ...selectedVisual.config,
        [propertyKey]: value
      }
    })
  }

  const handleTitleChange = (title: string) => {
    onUpdateVisual(selectedVisual.id, { title })
  }

  const handleFieldDrop = (field: DataField, role: FieldRole) => {
    const currentFields = selectedVisual.data_binding?.fields || []
    const newField = {
      role,
      field: field.name,
      aggregation: field.aggregation,
      sort: { direction: 'asc' as const }
    }

    // Remove existing field with same role (for single-field roles)
    const filteredFields = currentFields.filter(f => f.role !== role)
    
    onUpdateVisual(selectedVisual.id, {
      data_binding: {
        ...selectedVisual.data_binding,
        dataset_id: selectedVisual.data_binding?.dataset_id || '',
        fields: [...filteredFields, newField]
      }
    })
  }

  const handleFieldRemove = (fieldName: string, role: FieldRole) => {
    const currentFields = selectedVisual.data_binding?.fields || []
    const filteredFields = currentFields.filter(f => !(f.field === fieldName && f.role === role))
    
    onUpdateVisual(selectedVisual.id, {
      data_binding: {
        ...selectedVisual.data_binding,
        dataset_id: selectedVisual.data_binding?.dataset_id || '',
        fields: filteredFields
      }
    })
  }

  const getFieldsForRole = (role: FieldRole): string[] => {
    return selectedVisual.data_binding?.fields
      ?.filter(f => f.role === role)
      ?.map(f => f.field) || []
  }

  const renderPropertyControl = (key: string, property: any) => {
    const currentValue = selectedVisual.config[key] ?? property.default

    switch (property.type) {
      case 'text':
        return (
          <input
            type="text"
            value={currentValue || ''}
            onChange={(e) => handlePropertyChange(key, e.target.value)}
            placeholder={property.default}
            className="input text-sm"
          />
        )
      
      case 'number':
        return (
          <input
            type="number"
            value={currentValue || property.default}
            onChange={(e) => handlePropertyChange(key, parseFloat(e.target.value))}
            min={property.min}
            max={property.max}
            className="input text-sm"
          />
        )
      
      case 'boolean':
        return (
          <button
            onClick={() => handlePropertyChange(key, !currentValue)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              currentValue ? 'bg-primary-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                currentValue ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        )
      
      case 'color':
        return (
          <input
            type="color"
            value={currentValue || property.default}
            onChange={(e) => handlePropertyChange(key, e.target.value)}
            className="w-12 h-8 rounded border border-gray-300 cursor-pointer"
          />
        )
      
      case 'select':
        return (
          <select
            value={currentValue || property.default}
            onChange={(e) => handlePropertyChange(key, e.target.value)}
            className="input text-sm"
          >
            {property.options?.map((option: any) => (
              <option key={option} value={option}>
                {option.toString()}
              </option>
            ))}
          </select>
        )
      
      case 'slider':
        return (
          <div className="space-y-2">
            <input
              type="range"
              min={property.min || 0}
              max={property.max || 100}
              value={currentValue || property.default}
              onChange={(e) => handlePropertyChange(key, parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="text-xs text-gray-500 text-center">{currentValue || property.default}</div>
          </div>
        )
      
      default:
        return null
    }
  }

  const CollapsibleSection = ({ title, icon, children, sectionKey }: any) => {
    const isExpanded = expandedSections[sectionKey]
    return (
      <div className="border-b border-gray-100 last:border-b-0">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-2">
            {icon}
            <h4 className="text-sm font-medium text-gray-800">{title}</h4>
          </div>
          {isExpanded ? (
            <ChevronDownIcon className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRightIcon className="h-4 w-4 text-gray-500" />
          )}
        </button>
        {isExpanded && (
          <div className="px-3 pb-3">
            {children}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="panel">
      <div className="panel-header border-b border-gray-200">
        <div className="flex items-center space-x-2 p-3">
          <div className="text-2xl">{config.icon}</div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{config.name}</h3>
            <p className="text-xs text-gray-500">{config.description}</p>
          </div>
        </div>
      </div>
      
      <div className="panel-content">
        {/* General Properties */}
        <CollapsibleSection 
          title="General" 
          icon={<Cog6ToothIcon className="h-4 w-4 text-gray-500" />}
          sectionKey="general"
        >
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={selectedVisual.title || ''}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder={config?.name || 'Chart title'}
                className="input text-sm"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Visual Type
              </label>
              <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-md flex items-center space-x-2">
                <span>{config.icon}</span>
                <span>{config.name}</span>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Data Binding */}
        <CollapsibleSection 
          title="Data" 
          icon={<ChartBarIcon className="h-4 w-4 text-gray-500" />}
          sectionKey="data"
        >
          <div className="space-y-2">
            {config && config.fieldWells && typeof config.fieldWells === 'object' ? Object.entries(config.fieldWells).map(([fieldKey, fieldConfig]) => (
              <FieldDropZone
                key={fieldKey}
                role={fieldKey as FieldRole}
                label={fieldConfig.label}
                description={`Drop ${fieldConfig.accepts?.join(' or ') || 'any'} fields here`}
                acceptedTypes={fieldConfig.accepts?.includes('measure') ? ['number'] : ['string', 'date']}
                currentFields={getFieldsForRole(fieldKey as FieldRole)}
                allowMultiple={fieldConfig.max > 1}
                onFieldDrop={handleFieldDrop}
                onFieldRemove={handleFieldRemove}
              />
            )) : (
              <div className="text-center py-4 text-gray-500 text-sm">
                No field wells defined for this visual type
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Chart Title */}
        <CollapsibleSection 
          title="Title" 
          icon={<PaintBrushIcon className="h-4 w-4 text-gray-500" />}
          sectionKey="title"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-700">Show Title</label>
              <button
                onClick={() => handlePropertyChange('showTitle', !selectedVisual.config.showTitle)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  selectedVisual.config.showTitle !== false ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    selectedVisual.config.showTitle !== false ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Title Text</label>
              <input
                type="text"
                value={selectedVisual.config.titleText || ''}
                onChange={(e) => handlePropertyChange('titleText', e.target.value)}
                placeholder="Chart title"
                className="input text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Font Size</label>
              <input
                type="range"
                min="10"
                max="24"
                value={selectedVisual.config.titleFontSize || 16}
                onChange={(e) => handlePropertyChange('titleFontSize', parseInt(e.target.value))}
                className="w-full"
              />
              <span className="text-xs text-gray-500">{selectedVisual.config.titleFontSize || 16}px</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Color</label>
              <input
                type="color"
                value={selectedVisual.config.titleColor || '#000000'}
                onChange={(e) => handlePropertyChange('titleColor', e.target.value)}
                className="w-12 h-8 rounded border border-gray-300 cursor-pointer"
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* Axes */}
        <CollapsibleSection 
          title="Axes" 
          icon={<AdjustmentsHorizontalIcon className="h-4 w-4 text-gray-500" />}
          sectionKey="axes"
        >
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-2">X-Axis</h4>
              <div className="space-y-2 ml-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-600">Show</label>
                  <button
                    onClick={() => handlePropertyChange('xAxisShow', !selectedVisual.config.xAxisShow)}
                    className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${
                      selectedVisual.config.xAxisShow !== false ? 'bg-primary-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-2 w-2 transform rounded-full bg-white transition-transform ${
                        selectedVisual.config.xAxisShow !== false ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Title</label>
                  <input
                    type="text"
                    value={selectedVisual.config.xAxisTitle || ''}
                    onChange={(e) => handlePropertyChange('xAxisTitle', e.target.value)}
                    placeholder="X-axis title"
                    className="input text-xs"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-2">Y-Axis</h4>
              <div className="space-y-2 ml-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-600">Show</label>
                  <button
                    onClick={() => handlePropertyChange('yAxisShow', !selectedVisual.config.yAxisShow)}
                    className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${
                      selectedVisual.config.yAxisShow !== false ? 'bg-primary-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-2 w-2 transform rounded-full bg-white transition-transform ${
                        selectedVisual.config.yAxisShow !== false ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Title</label>
                  <input
                    type="text"
                    value={selectedVisual.config.yAxisTitle || ''}
                    onChange={(e) => handlePropertyChange('yAxisTitle', e.target.value)}
                    placeholder="Y-axis title"
                    className="input text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Visual Properties */}
        <CollapsibleSection 
          title="Formatting" 
          icon={<PaintBrushIcon className="h-4 w-4 text-gray-500" />}
          sectionKey="formatting"
        >
          <div className="space-y-4">
            {config && config.properties && typeof config.properties === 'object' ? Object.entries(config.properties).map(([key, property]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  {property.label}
                </label>
                {renderPropertyControl(key, property)}
              </div>
            )) : (
              <div className="text-center py-4 text-gray-500 text-sm">
                No formatting options available
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Data Colors */}
        <CollapsibleSection 
          title="Data Colors" 
          icon={<PaintBrushIcon className="h-4 w-4 text-gray-500" />}
          sectionKey="dataColors"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Color Palette
              </label>
              <select
                value={selectedVisual.config.colorScheme || 'category10'}
                onChange={(e) => handlePropertyChange('colorScheme', e.target.value)}
                className="input text-sm"
              >
                <option value="category10">Default (Category10)</option>
                <option value="category20">Category20</option>
                <option value="tableau10">Tableau10</option>
                <option value="tableau20">Tableau20</option>
                <option value="pastel1">Pastel</option>
                <option value="dark2">Dark</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Custom Colors
              </label>
              <div className="flex flex-wrap gap-2">
                {(selectedVisual.config.colors || ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6']).map((color: string, index: number) => (
                  <input
                    key={index}
                    type="color"
                    value={color}
                    onChange={(e) => {
                      const newColors = [...(selectedVisual.config.colors || ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'])]
                      newColors[index] = e.target.value
                      handlePropertyChange('colors', newColors)
                    }}
                    className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                    title={`Color ${index + 1}`}
                  />
                ))}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-700">Show Legend</label>
              <button
                onClick={() => handlePropertyChange('showLegend', !selectedVisual.config.showLegend)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  selectedVisual.config.showLegend !== false ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    selectedVisual.config.showLegend !== false ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </CollapsibleSection>

        {/* Title Formatting */}
        <CollapsibleSection 
          title="Title" 
          icon={<EyeIcon className="h-4 w-4 text-gray-500" />}
          sectionKey="title"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-700">Show Title</label>
              <button
                onClick={() => handlePropertyChange('showTitle', !selectedVisual.config.showTitle)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  selectedVisual.config.showTitle !== false ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    selectedVisual.config.showTitle !== false ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            {selectedVisual.config.showTitle !== false && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Title Text
                  </label>
                  <input
                    type="text"
                    value={selectedVisual.title || ''}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder={config?.name || 'Chart title'}
                    className="input text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Font Size
                  </label>
                  <select
                    value={selectedVisual.config.titleFontSize || '16'}
                    onChange={(e) => handlePropertyChange('titleFontSize', e.target.value)}
                    className="input text-sm"
                  >
                    <option value="12">12pt</option>
                    <option value="14">14pt</option>
                    <option value="16">16pt</option>
                    <option value="18">18pt</option>
                    <option value="20">20pt</option>
                    <option value="24">24pt</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Title Color
                  </label>
                  <input
                    type="color"
                    value={selectedVisual.config.titleColor || '#000000'}
                    onChange={(e) => handlePropertyChange('titleColor', e.target.value)}
                    className="w-12 h-8 rounded border border-gray-300 cursor-pointer"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Alignment
                  </label>
                  <select
                    value={selectedVisual.config.titleAlignment || 'center'}
                    onChange={(e) => handlePropertyChange('titleAlignment', e.target.value)}
                    className="input text-sm"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>
              </>
            )}
          </div>
        </CollapsibleSection>

        {/* Background */}
        <CollapsibleSection 
          title="Background" 
          icon={<ArrowsPointingOutIcon className="h-4 w-4 text-gray-500" />}
          sectionKey="background"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-700">Show Background</label>
              <button
                onClick={() => handlePropertyChange('showBackground', !selectedVisual.config.showBackground)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  selectedVisual.config.showBackground !== false ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    selectedVisual.config.showBackground !== false ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            {selectedVisual.config.showBackground !== false && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Background Color
                  </label>
                  <input
                    type="color"
                    value={selectedVisual.config.backgroundColor || '#ffffff'}
                    onChange={(e) => handlePropertyChange('backgroundColor', e.target.value)}
                    className="w-12 h-8 rounded border border-gray-300 cursor-pointer"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Transparency (%)
                  </label>
                  <div className="space-y-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={selectedVisual.config.backgroundOpacity || 100}
                      onChange={(e) => handlePropertyChange('backgroundOpacity', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="text-xs text-gray-500 text-center">{selectedVisual.config.backgroundOpacity || 100}%</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </CollapsibleSection>

        {/* Border */}
        <CollapsibleSection 
          title="Border" 
          icon={<ArrowsPointingOutIcon className="h-4 w-4 text-gray-500" />}
          sectionKey="border"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-700">Show Border</label>
              <button
                onClick={() => handlePropertyChange('showBorder', !selectedVisual.config.showBorder)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  selectedVisual.config.showBorder ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    selectedVisual.config.showBorder ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            {selectedVisual.config.showBorder && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Border Color
                  </label>
                  <input
                    type="color"
                    value={selectedVisual.config.borderColor || '#cccccc'}
                    onChange={(e) => handlePropertyChange('borderColor', e.target.value)}
                    className="w-12 h-8 rounded border border-gray-300 cursor-pointer"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Border Width
                  </label>
                  <select
                    value={selectedVisual.config.borderWidth || '1'}
                    onChange={(e) => handlePropertyChange('borderWidth', e.target.value)}
                    className="input text-sm"
                  >
                    <option value="1">1px</option>
                    <option value="2">2px</option>
                    <option value="3">3px</option>
                    <option value="4">4px</option>
                    <option value="5">5px</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Border Radius
                  </label>
                  <div className="space-y-2">
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={selectedVisual.config.borderRadius || 0}
                      onChange={(e) => handlePropertyChange('borderRadius', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="text-xs text-gray-500 text-center">{selectedVisual.config.borderRadius || 0}px</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </CollapsibleSection>

        {/* Filters */}
        <CollapsibleSection 
          title="Filters" 
          icon={<FunnelIcon className="h-4 w-4 text-gray-500" />}
          sectionKey="filters"
        >
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Visual Level Filters
              </label>
              <div className="min-h-[40px] border-2 border-dashed border-gray-200 rounded-lg p-2 text-center text-xs text-gray-400">
                Drop fields here to filter this visual
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Top N Filter
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="10"
                  className="input text-xs flex-1"
                  min="1"
                  max="1000"
                />
                <select className="input text-xs">
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                </select>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Analytics */}
        <CollapsibleSection 
          title="Analytics" 
          icon={<AdjustmentsHorizontalIcon className="h-4 w-4 text-gray-500" />}
          sectionKey="analytics"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-700">Trend Line</label>
              <button
                onClick={() => {/* TODO: Toggle trend line */}}
                className="relative inline-flex h-5 w-9 items-center rounded-full bg-gray-200 transition-colors"
              >
                <span className="inline-block h-3 w-3 transform rounded-full bg-white transition-transform translate-x-1" />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-700">Average Line</label>
              <button
                onClick={() => {/* TODO: Toggle average line */}}
                className="relative inline-flex h-5 w-9 items-center rounded-full bg-gray-200 transition-colors"
              >
                <span className="inline-block h-3 w-3 transform rounded-full bg-white transition-transform translate-x-1" />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-700">Data Labels</label>
              <button
                onClick={() => {/* TODO: Toggle data labels */}}
                className="relative inline-flex h-5 w-9 items-center rounded-full bg-primary-600 transition-colors"
              >
                <span className="inline-block h-3 w-3 transform rounded-full bg-white transition-transform translate-x-5" />
              </button>
            </div>
          </div>
        </CollapsibleSection>

        {/* Position & Size */}
        <CollapsibleSection 
          title="Position & Size" 
          icon={<Cog6ToothIcon className="h-4 w-4 text-gray-500" />}
          sectionKey="position"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                X Position
              </label>
              <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-md">
                {Math.round(selectedVisual.position.x)}px
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Y Position
              </label>
              <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-md">
                {Math.round(selectedVisual.position.y)}px
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Width
              </label>
              <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-md">
                {Math.round(selectedVisual.position.width)}px
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Height
              </label>
              <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-md">
                {Math.round(selectedVisual.position.height)}px
              </div>
            </div>
          </div>
        </CollapsibleSection>
      </div>
    </div>
  )
}

export default PropertiesPanel