/**
 * Shapes and Text Panel Component
 * Power BI-style shapes, text boxes, images, and buttons panel
 * https://learn.microsoft.com/en-us/power-bi/create-reports/power-bi-reports-add-text-and-shapes
 */

import React, { useState } from 'react'
import {
  Squares2X2Icon,
  RectangleStackIcon,
  CircleStackIcon,
  ArrowRightIcon,
  StarIcon,
  PhotoIcon,
  LinkIcon,
  PlusIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'
import { useDrag } from 'react-dnd'

export type ShapeType = 
  | 'textbox'
  | 'rectangle' 
  | 'rounded-rectangle'
  | 'oval'
  | 'line'
  | 'arrow'
  | 'triangle'
  | 'diamond'
  | 'pentagon'
  | 'hexagon'
  | 'star'
  | 'image'
  | 'button'
  | 'web-url'

interface Shape {
  type: ShapeType
  name: string
  icon: React.ElementType
  category: string
  description: string
}

interface ShapeItemProps {
  shape: Shape
}

const ShapeItem: React.FC<ShapeItemProps> = ({ shape }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'shape-type',
    item: { 
      type: 'shape-type',
      shapeType: shape.type,
      name: shape.name
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  const Icon = shape.icon

  return (
    <div
      ref={drag}
      className={`shape-item p-3 border rounded-lg cursor-move transition-all hover:border-blue-400 hover:bg-blue-50 group ${
        isDragging ? 'opacity-50' : ''
      }`}
      title={shape.description}
    >
      <div className="flex items-center space-x-3">
        <div className="shape-icon p-2 rounded bg-gray-100 group-hover:bg-blue-100 transition-colors">
          <Icon className="h-6 w-6 text-gray-600 group-hover:text-blue-600" />
        </div>
        <div>
          <div className="font-medium text-sm text-gray-800">{shape.name}</div>
          <div className="text-xs text-gray-500 truncate">{shape.description}</div>
        </div>
      </div>
    </div>
  )
}

interface CategorySectionProps {
  title: string
  shapes: Shape[]
  isExpanded: boolean
  onToggle: () => void
}

const CategorySection: React.FC<CategorySectionProps> = ({ title, shapes, isExpanded, onToggle }) => {
  return (
    <div className="category-section mb-4">
      <button
        onClick={onToggle}
        className="category-header w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded transition-colors"
      >
        <span className="font-medium text-sm text-gray-700">{title}</span>
        <div className="flex items-center space-x-1">
          <span className="text-xs text-gray-500">{shapes.length}</span>
          {isExpanded ? (
            <ChevronDownIcon className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRightIcon className="h-4 w-4 text-gray-500" />
          )}
        </div>
      </button>
      
      {isExpanded && (
        <div className="category-content mt-2 space-y-2">
          {shapes.map((shape) => (
            <ShapeItem key={shape.type} shape={shape} />
          ))}
        </div>
      )}
    </div>
  )
}

const ShapesPanel: React.FC = () => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['basic-shapes', 'text-objects']))

  const shapes: Shape[] = [
    // Text Objects
    { type: 'textbox', name: 'Text box', icon: Squares2X2Icon, category: 'text-objects', description: 'Add text content to your report' },
    { type: 'button', name: 'Button', icon: RectangleStackIcon, category: 'text-objects', description: 'Interactive button for navigation' },
    { type: 'web-url', name: 'Web URL', icon: LinkIcon, category: 'text-objects', description: 'Add clickable web links' },
    
    // Basic Shapes  
    { type: 'rectangle', name: 'Rectangle', icon: RectangleStackIcon, category: 'basic-shapes', description: 'Basic rectangular shape' },
    { type: 'rounded-rectangle', name: 'Rounded Rectangle', icon: RectangleStackIcon, category: 'basic-shapes', description: 'Rectangle with rounded corners' },
    { type: 'oval', name: 'Oval', icon: CircleStackIcon, category: 'basic-shapes', description: 'Circular or elliptical shape' },
    { type: 'line', name: 'Line', icon: ArrowRightIcon, category: 'basic-shapes', description: 'Straight line' },
    { type: 'arrow', name: 'Arrow', icon: ArrowRightIcon, category: 'basic-shapes', description: 'Directional arrow shape' },
    
    // Advanced Shapes
    { type: 'triangle', name: 'Triangle', icon: StarIcon, category: 'advanced-shapes', description: 'Triangular shape' },
    { type: 'diamond', name: 'Diamond', icon: StarIcon, category: 'advanced-shapes', description: 'Diamond shape' },
    { type: 'pentagon', name: 'Pentagon', icon: StarIcon, category: 'advanced-shapes', description: 'Five-sided shape' },
    { type: 'hexagon', name: 'Hexagon', icon: StarIcon, category: 'advanced-shapes', description: 'Six-sided shape' },
    { type: 'star', name: 'Star', icon: StarIcon, category: 'advanced-shapes', description: 'Star shape' },
    
    // Media
    { type: 'image', name: 'Image', icon: PhotoIcon, category: 'media', description: 'Insert images and graphics' },
  ]

  const categories = [
    { id: 'text-objects', name: 'Text objects', shapes: shapes.filter(s => s.category === 'text-objects') },
    { id: 'basic-shapes', name: 'Basic shapes', shapes: shapes.filter(s => s.category === 'basic-shapes') },
    { id: 'advanced-shapes', name: 'Advanced shapes', shapes: shapes.filter(s => s.category === 'advanced-shapes') },
    { id: 'media', name: 'Media', shapes: shapes.filter(s => s.category === 'media') },
  ]

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId)
      } else {
        newSet.add(categoryId)
      }
      return newSet
    })
  }

  return (
    <div className="shapes-panel h-full bg-white border-r border-gray-200">
      <div className="panel-header p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-800">Insert</h3>
          <button 
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Add new shape"
          >
            <PlusIcon className="h-4 w-4 text-gray-500" />
          </button>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          Drag shapes and text objects to the report canvas to enhance your visualizations.
        </p>
      </div>
      
      <div className="panel-content flex-1 overflow-y-auto p-4">
        {categories.map((category) => (
          <CategorySection
            key={category.id}
            title={category.name}
            shapes={category.shapes}
            isExpanded={expandedCategories.has(category.id)}
            onToggle={() => toggleCategory(category.id)}
          />
        ))}
        
        {/* Quick Insert Section */}
        <div className="quick-insert mt-6 pt-4 border-t border-gray-200">
          <div className="text-xs font-medium text-gray-600 mb-3">Quick Insert</div>
          <div className="grid grid-cols-3 gap-2">
            <button className="quick-insert-btn p-2 border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300 transition-colors group">
              <Squares2X2Icon className="h-5 w-5 text-gray-500 group-hover:text-blue-600 mx-auto" />
              <div className="text-xs text-gray-600 group-hover:text-blue-700 mt-1">Text</div>
            </button>
            <button className="quick-insert-btn p-2 border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300 transition-colors group">
              <RectangleStackIcon className="h-5 w-5 text-gray-500 group-hover:text-blue-600 mx-auto" />
              <div className="text-xs text-gray-600 group-hover:text-blue-700 mt-1">Shape</div>
            </button>
            <button className="quick-insert-btn p-2 border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300 transition-colors group">
              <PhotoIcon className="h-5 w-5 text-gray-500 group-hover:text-blue-600 mx-auto" />
              <div className="text-xs text-gray-600 group-hover:text-blue-700 mt-1">Image</div>
            </button>
          </div>
        </div>
        
        {/* Tips Section */}
        <div className="tips-section mt-6 pt-4 border-t border-gray-200">
          <div className="text-xs font-medium text-gray-600 mb-2">Tips</div>
          <div className="text-xs text-gray-500 leading-relaxed space-y-2">
            <p>• Use text boxes for titles, descriptions, and callouts</p>
            <p>• Shapes can highlight important areas</p>
            <p>• Buttons can navigate to other pages or URLs</p>
            <p>• Hold Shift while resizing to maintain proportions</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ShapesPanel