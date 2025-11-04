/**
 * Small Multiples Component
 * Renders multiple small charts in a grid layout for comparative analysis
 */

import React, { useMemo } from 'react'
import EChartsRenderer from './EChartsRenderer'
import { Visual } from '@/types/report'
import { analyticsService, SmallMultipleConfig } from '@/services/analyticsService'

interface SmallMultiplesProps {
  visual: Visual
  data: any[]
  config: SmallMultipleConfig
  width: number
  height: number
  onChartClick?: (chartKey: string, data: any[]) => void
}

const SmallMultiples: React.FC<SmallMultiplesProps> = ({
  visual,
  data,
  config,
  width,
  height,
  onChartClick
}) => {
  // Generate small multiples data
  const [resolvedData, setResolvedData] = React.useState<{
    multiples: { key: string; data: any[]; title: string }[]
    layout: { columns: number; rows: number }
  }>({ multiples: [], layout: { columns: 0, rows: 0 } })

  React.useEffect(() => {
    const generateData = async () => {
      if (!data || data.length === 0) {
        setResolvedData({ multiples: [], layout: { columns: 0, rows: 0 } })
        return
      }

      try {
        const result = await analyticsService.generateSmallMultiples(data, config)
        setResolvedData(result)
      } catch (error) {
        console.error('Error generating small multiples:', error)
        setResolvedData({ multiples: [], layout: { columns: 0, rows: 0 } })
      }
    }

    generateData()
  }, [data, config])

  const { multiples, layout } = resolvedData

  if (multiples.length === 0) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg"
        style={{ width, height }}
      >
        <div className="text-center">
          <p className="text-gray-500 text-sm">No data available for small multiples</p>
          <p className="text-gray-400 text-xs mt-1">
            Configure the split field: {config.splitBy}
          </p>
        </div>
      </div>
    )
  }

  // Calculate individual chart dimensions
  const chartWidth = Math.floor((width - (layout.columns + 1) * 8) / layout.columns) // 8px gaps
  const chartHeight = Math.floor((height - (layout.rows + 1) * 8 - (config.showTitle ? 20 * layout.rows : 0)) / layout.rows)

  return (
    <div 
      className="grid gap-2 p-2 bg-white rounded-lg"
      style={{ 
        width, 
        height,
        gridTemplateColumns: `repeat(${layout.columns}, 1fr)`,
        gridTemplateRows: `repeat(${layout.rows}, 1fr)`
      }}
    >
      {multiples.map((multiple, index) => (
        <div
          key={multiple.key}
          className="border border-gray-200 rounded-lg p-2 bg-white hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onChartClick?.(multiple.key, multiple.data)}
        >
          {/* Individual chart title */}
          {config.showTitle && (
            <div className="text-xs font-medium text-gray-700 mb-2 text-center truncate">
              {multiple.title}
            </div>
          )}
          
          {/* Individual chart */}
          <div className="relative">
            <EChartsRenderer
              visual={{
                ...visual,
                id: `${visual.id}_multiple_${index}`,
                title: multiple.title
              }}
              data={multiple.data}
              width={chartWidth - 16} // subtract padding
              height={chartHeight - (config.showTitle ? 20 : 0) - 16} // subtract title and padding
              showTooltip={false} // Disable tooltip for cleaner look in small charts
              showLegend={false} // Disable individual legends
            />
            
            {/* Data count overlay */}
            <div className="absolute top-1 right-1 bg-black bg-opacity-70 text-white text-xs px-1 py-0.5 rounded">
              {multiple.data.length}
            </div>
          </div>
        </div>
      ))}
      
      {/* Fill empty cells if needed */}
      {Array.from({ 
        length: (layout.columns * layout.rows) - multiples.length 
      }).map((_, index) => (
        <div 
          key={`empty-${index}`}
          className="border border-gray-100 rounded-lg bg-gray-25"
        />
      ))}
    </div>
  )
}

export default SmallMultiples