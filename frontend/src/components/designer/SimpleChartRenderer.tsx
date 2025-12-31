/**
 * Simple Chart Renderer
 * Renders basic charts without heavy dependencies
 */

import React from 'react'

interface SimpleChartRendererProps {
  type: string
  data: any[]
  fields: any[]
}

const SimpleChartRenderer: React.FC<SimpleChartRendererProps> = ({ type, data, fields }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <div className="text-center">
          <div className="text-sm">No data available</div>
        </div>
      </div>
    )
  }

  const field = fields[0]
  if (!field) return null

  const fieldName = field.name

  // Process data
  const processedData = data.slice(0, 20) // Limit to first 20 items for performance

  switch (type) {
    case 'bar':
      return <BarChart data={processedData} fieldName={fieldName} />
    case 'pie':
      return <PieChart data={processedData} fieldName={fieldName} />
    case 'line':
      return <LineChart data={processedData} fieldName={fieldName} />
    case 'table':
      return <TableView data={processedData} fields={fields} />
    default:
      return <BarChart data={processedData} fieldName={fieldName} />
  }
}

// Bar Chart Component
const BarChart: React.FC<{ data: any[]; fieldName: string }> = ({ data, fieldName }) => {
  const values = data.map(row => {
    const val = row[fieldName]
    return typeof val === 'number' ? val : 0
  })

  const maxValue = Math.max(...values, 1)

  return (
    <div className="h-full flex flex-col p-4">
      <div className="text-xs font-semibold text-gray-700 mb-2">{fieldName}</div>
      <div className="flex-1 flex items-end gap-1">
        {values.slice(0, 15).map((value, index) => {
          const height = (value / maxValue) * 100
          return (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div
                className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                style={{ height: `${height}%`, minHeight: '2px' }}
                title={`${value}`}
              />
            </div>
          )
        })}
      </div>
      <div className="text-xs text-gray-500 mt-1 text-center">
        Showing {Math.min(values.length, 15)} of {data.length} records
      </div>
    </div>
  )
}

// Pie Chart Component
const PieChart: React.FC<{ data: any[]; fieldName: string }> = ({ data, fieldName }) => {
  // Group data by categories
  const categoryCount: { [key: string]: number } = {}

  data.forEach(row => {
    const category = String(row[fieldName] || 'Unknown')
    categoryCount[category] = (categoryCount[category] || 0) + 1
  })

  const entries = Object.entries(categoryCount).slice(0, 5)
  const total = entries.reduce((sum, [_, count]) => sum + count, 0)

  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6']

  return (
    <div className="h-full flex flex-col items-center justify-center p-4">
      <div className="text-xs font-semibold text-gray-700 mb-3">{fieldName}</div>
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 100 100" className="transform -rotate-90">
          {entries.map(([category, count], index) => {
            const percentage = (count / total) * 100
            const angle = (percentage / 100) * 360
            const startAngle = entries.slice(0, index).reduce((sum, [_, c]) => {
              return sum + ((c / total) * 360)
            }, 0)

            return (
              <circle
                key={category}
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={colors[index % colors.length]}
                strokeWidth="20"
                strokeDasharray={`${(angle / 360) * 251.2} 251.2`}
                strokeDashoffset={-((startAngle / 360) * 251.2)}
              />
            )
          })}
        </svg>
      </div>
      <div className="mt-3 space-y-1">
        {entries.map(([category, count], index) => (
          <div key={category} className="flex items-center gap-2 text-xs">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            <span className="text-gray-700 truncate max-w-[100px]">{category}</span>
            <span className="text-gray-500">({count})</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Line Chart Component
const LineChart: React.FC<{ data: any[]; fieldName: string }> = ({ data, fieldName }) => {
  const values = data.map(row => {
    const val = row[fieldName]
    return typeof val === 'number' ? val : 0
  })

  const maxValue = Math.max(...values, 1)
  const minValue = Math.min(...values, 0)
  const range = maxValue - minValue || 1

  const points = values.slice(0, 20).map((value, index) => {
    const x = (index / Math.min(values.length - 1, 19)) * 100
    const y = 100 - ((value - minValue) / range) * 100
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="h-full flex flex-col p-4">
      <div className="text-xs font-semibold text-gray-700 mb-2">{fieldName}</div>
      <div className="flex-1 relative">
        <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
          <polyline
            points={points}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          <polyline
            points={`0,100 ${points} 100,100`}
            fill="rgba(59, 130, 246, 0.1)"
            stroke="none"
          />
        </svg>
      </div>
      <div className="text-xs text-gray-500 mt-1 text-center">
        Showing {Math.min(values.length, 20)} of {data.length} records
      </div>
    </div>
  )
}

// Table View Component
const TableView: React.FC<{ data: any[]; fields: any[] }> = ({ data, fields }) => {
  const displayFields = fields.length > 0 ? fields : Object.keys(data[0] || {}).map(key => ({ name: key }))
  const displayData = data.slice(0, 10)

  return (
    <div className="h-full overflow-auto p-2">
      <table className="w-full text-xs">
        <thead className="bg-gray-100 sticky top-0">
          <tr>
            {displayFields.map((field, index) => (
              <th key={index} className="px-2 py-1 text-left font-semibold text-gray-700 border-b">
                {field.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayData.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b hover:bg-gray-50">
              {displayFields.map((field, colIndex) => (
                <td key={colIndex} className="px-2 py-1 text-gray-600">
                  {String(row[field.name] || '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > 10 && (
        <div className="text-xs text-gray-500 text-center py-2">
          Showing 10 of {data.length} records
        </div>
      )}
    </div>
  )
}

export default SimpleChartRenderer
