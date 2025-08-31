/**
 * Visualization Gallery Component
 * Comprehensive modal gallery showing all available visualization types
 */

import React, { useState } from 'react'
import { useDrag } from 'react-dnd'
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { VisualType } from '@/types/report'
import { VISUAL_TYPES, VISUAL_CATEGORIES, getVisualTypesByCategory } from '@/config/visualTypes'

interface VisualizationGalleryProps {
  onSelectVisualization: (type: VisualType, position: { x: number; y: number }) => void
  onClose: () => void
}

const VisualizationItem: React.FC<{
  visualization: any
  onSelect: (type: VisualType) => void
}> = ({ visualization, onSelect }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'visual-type',
    item: { visualType: visualization.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  return (
    <div
      ref={drag}
      onClick={() => onSelect(visualization.id as VisualType)}
      className={`group p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:shadow-md cursor-pointer transition-all duration-200 bg-white hover:bg-primary-50 ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="text-center">
        <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-200">{visualization.icon}</div>
        <h3 className="text-sm font-medium text-gray-900 mb-1">{visualization.name}</h3>
        <p className="text-xs text-gray-500 leading-relaxed">{visualization.description}</p>
      </div>
    </div>
  )
}

const VisualizationGallery: React.FC<VisualizationGalleryProps> = ({
  onSelectVisualization,
  onClose,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('chart')
  const [searchQuery, setSearchQuery] = useState('')

  const handleSelect = (type: VisualType) => {
    // Default position in center of canvas
    onSelectVisualization(type, { x: 100, y: 100 })
  }

  const filteredVisuals = getVisualTypesByCategory(selectedCategory)
    .filter(visual => 
      visual.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      visual.description.toLowerCase().includes(searchQuery.toLowerCase())
    )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Add Visualization</h2>
            <p className="text-sm text-gray-500 mt-1">Choose from our comprehensive collection of chart types</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Categories Sidebar */}
          <div className="w-48 border-r bg-gray-50">
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Categories</h3>
              <div className="space-y-1">
                {VISUAL_CATEGORIES.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center space-x-2 transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-primary-100 text-primary-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span>{category.icon}</span>
                    <span>{category.name}</span>
                    <span className="ml-auto text-xs bg-gray-200 px-2 py-1 rounded-full">
                      {getVisualTypesByCategory(category.id).length}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Search Bar */}
            <div className="p-4 border-b">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search visualizations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Visual Types Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredVisuals.map((visual) => (
                  <VisualizationItem
                    key={visual.id}
                    visualization={visual}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
              
              {filteredVisuals.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">🔍</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No visualizations found</h3>
                  <p className="text-gray-500">Try adjusting your search or selecting a different category.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>Select a visualization to add to your report canvas</div>
            <div className="flex space-x-4">
              <span>{filteredVisuals.length} visualizations available</span>
              <span>•</span>
              <span>Category: {VISUAL_CATEGORIES.find(c => c.id === selectedCategory)?.name}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VisualizationGallery