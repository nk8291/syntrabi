/**
 * ECharts Renderer Component
 * Renders charts using ECharts library for better Power BI-like experience
 */

import React, { useMemo, useEffect, useRef, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { Visual, VisualType } from '@/types/report'
import { EChartsOption } from 'echarts'
import ChartContextMenu from './ChartContextMenu'
import { getVisualTypeById, VISUAL_TYPE_MAPPING } from '@/config/visualTypes'

interface EChartsRendererProps {
  visual: Visual
  data?: any[]
  width?: number
  height?: number
  className?: string
  showTooltip?: boolean
  showLegend?: boolean
}

const EChartsRenderer: React.FC<EChartsRendererProps> = ({
  visual,
  data = [],
  width,
  height,
  className = '',
  showTooltip = true,
  showLegend = true
}) => {
  const chartRef = useRef<ReactECharts>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  const getChartOption = (): EChartsOption => {
    console.log('Visual data binding:', visual.data_binding)
    console.log('Provided data:', data)
    const baseOption: EChartsOption = {
      animation: true,
      animationDuration: 750,
      animationEasing: 'cubicOut',
      backgroundColor: 'transparent',
      textStyle: {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 12,
        color: '#374151'
      },
      tooltip: showTooltip ? {
        trigger: 'item',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        borderRadius: 8,
        shadowBlur: 10,
        shadowColor: 'rgba(0, 0, 0, 0.1)',
        textStyle: {
          color: '#374151',
          fontSize: 12
        }
      } : undefined,
      grid: {
        left: '10%',
        right: '10%',
        top: '15%',
        bottom: '15%',
        containLabel: true
      }
    }

    // Check if visual has data binding with fields
    const hasDataBinding = visual.data_binding && visual.data_binding.fields && visual.data_binding.fields.length > 0
    
    // Use provided data or generate sample data only if no data binding exists
    const sampleData = data.length > 0 ? data : (hasDataBinding ? [] : generateSampleData(visual.type))

    // If no data and no binding, show empty state
    if (sampleData.length === 0 && hasDataBinding) {
      return getEmptyStateOption(visual.type)
    }

    // Map visual type to standardized format
    const mappedType = VISUAL_TYPE_MAPPING[visual.type] || visual.type
    const visualConfig = getVisualTypeById(mappedType)
    
    // Use visual config if available, otherwise fallback to switch
    if (visualConfig && visualConfig.getEChartsOption) {
      try {
        const fieldWells = visual.config?.fieldWells || {}
        const configuredOption = visualConfig.getEChartsOption(sampleData, fieldWells, visual.config || {})
        return { ...baseOption, ...configuredOption }
      } catch (error) {
        console.warn('Error generating chart option from config:', error)
      }
    }

    switch (mappedType) {
      case 'column-chart':
        return {
          ...baseOption,
          title: visual.config.showTitle !== false && (visual.config.titleText || visual.title) ? {
            text: visual.config.titleText || visual.title,
            textStyle: {
              color: visual.config.titleColor || '#374151',
              fontSize: visual.config.titleFontSize || 16,
              fontWeight: 'normal'
            },
            left: 'center',
            top: '10px'
          } : undefined,
          xAxis: {
            show: visual.config.xAxisShow !== false,
            type: 'category',
            data: sampleData.map(d => d.category || d.name),
            name: visual.config.xAxisTitle,
            nameTextStyle: {
              color: '#6b7280',
              fontSize: 12
            },
            axisLabel: {
              color: '#6b7280',
              fontSize: 11
            },
            axisLine: {
              lineStyle: { color: '#e5e7eb' }
            }
          },
          yAxis: {
            show: visual.config.yAxisShow !== false,
            type: 'value',
            name: visual.config.yAxisTitle,
            nameTextStyle: {
              color: '#6b7280',
              fontSize: 12
            },
            axisLabel: {
              color: '#6b7280',
              fontSize: 11
            },
            axisLine: {
              lineStyle: { color: '#e5e7eb' }
            },
            splitLine: {
              lineStyle: { color: '#f3f4f6' }
            }
          },
          series: [{
            data: sampleData.map(d => d.value),
            type: 'bar',
            itemStyle: {
              color: visual.config.colors?.[0] || '#3b82f6',
              borderRadius: [4, 4, 0, 0]
            },
            emphasis: {
              itemStyle: {
                color: visual.config.colors?.[1] || '#2563eb'
              }
            }
          }]
        }

      case 'line-chart':
        return {
          ...baseOption,
          title: visual.config.showTitle !== false && (visual.config.titleText || visual.title) ? {
            text: visual.config.titleText || visual.title,
            textStyle: {
              color: visual.config.titleColor || '#374151',
              fontSize: visual.config.titleFontSize || 16,
              fontWeight: 'normal'
            },
            left: 'center',
            top: '10px'
          } : undefined,
          xAxis: {
            show: visual.config.xAxisShow !== false,
            type: 'category',
            data: sampleData.map(d => d.category || d.name),
            name: visual.config.xAxisTitle,
            nameTextStyle: {
              color: '#6b7280',
              fontSize: 12
            },
            axisLabel: {
              color: '#6b7280',
              fontSize: 11
            },
            axisLine: {
              lineStyle: { color: '#e5e7eb' }
            }
          },
          yAxis: {
            show: visual.config.yAxisShow !== false,
            type: 'value',
            name: visual.config.yAxisTitle,
            nameTextStyle: {
              color: '#6b7280',
              fontSize: 12
            },
            axisLabel: {
              color: '#6b7280',
              fontSize: 11
            },
            axisLine: {
              lineStyle: { color: '#e5e7eb' }
            },
            splitLine: {
              lineStyle: { color: '#f3f4f6' }
            }
          },
          series: [{
            data: sampleData.map(d => d.value),
            type: 'line',
            smooth: true,
            lineStyle: {
              color: visual.config.colors?.[0] || '#3b82f6',
              width: 3
            },
            itemStyle: {
              color: visual.config.colors?.[0] || '#3b82f6'
            },
            areaStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [{
                  offset: 0, color: `${visual.config.colors?.[0] || '#3b82f6'}4D` // 30% opacity
                }, {
                  offset: 1, color: `${visual.config.colors?.[0] || '#3b82f6'}0D` // 5% opacity
                }]
              }
            }
          }]
        }

      case 'pie-chart':
        return {
          ...baseOption,
          tooltip: {
            ...baseOption.tooltip,
            trigger: 'item',
            formatter: '{a} <br/>{b}: {c} ({d}%)'
          },
          legend: {
            orient: 'vertical',
            left: 'left',
            textStyle: {
              color: '#6b7280',
              fontSize: 11
            }
          },
          series: [{
            name: visual.title || 'Data',
            type: 'pie',
            radius: '60%',
            data: sampleData.map(d => ({
              value: d.value,
              name: d.category || d.name
            })),
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            },
            itemStyle: {
              borderRadius: 4,
              borderColor: '#fff',
              borderWidth: 2
            }
          }]
        }

      case 'scatter-plot':
        return {
          ...baseOption,
          xAxis: {
            type: 'value',
            axisLabel: {
              color: '#6b7280',
              fontSize: 11
            },
            axisLine: {
              lineStyle: { color: '#e5e7eb' }
            },
            splitLine: {
              lineStyle: { color: '#f3f4f6' }
            }
          },
          yAxis: {
            type: 'value',
            axisLabel: {
              color: '#6b7280',
              fontSize: 11
            },
            axisLine: {
              lineStyle: { color: '#e5e7eb' }
            },
            splitLine: {
              lineStyle: { color: '#f3f4f6' }
            }
          },
          series: [{
            symbolSize: 8,
            data: sampleData.map(d => [d.x || d.value, d.y || d.value + Math.random() * 10]),
            type: 'scatter',
            itemStyle: {
              color: '#3b82f6'
            }
          }]
        }

      case 'area-chart':
        return {
          ...baseOption,
          xAxis: {
            type: 'category',
            data: sampleData.map(d => d.category || d.name),
            axisLabel: {
              color: '#6b7280',
              fontSize: 11
            },
            axisLine: {
              lineStyle: { color: '#e5e7eb' }
            }
          },
          yAxis: {
            type: 'value',
            axisLabel: {
              color: '#6b7280',
              fontSize: 11
            },
            axisLine: {
              lineStyle: { color: '#e5e7eb' }
            },
            splitLine: {
              lineStyle: { color: '#f3f4f6' }
            }
          },
          series: [{
            data: sampleData.map(d => d.value),
            type: 'line',
            areaStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [{
                  offset: 0, color: 'rgba(59, 130, 246, 0.6)'
                }, {
                  offset: 1, color: 'rgba(59, 130, 246, 0.1)'
                }]
              }
            },
            lineStyle: {
              color: '#3b82f6',
              width: 2
            },
            itemStyle: {
              color: '#3b82f6'
            }
          }]
        }

      case 'bar-chart':
        return {
          ...baseOption,
          title: visual.config.showTitle !== false && (visual.config.titleText || visual.title) ? {
            text: visual.config.titleText || visual.title,
            textStyle: {
              color: visual.config.titleColor || '#374151',
              fontSize: visual.config.titleFontSize || 16,
              fontWeight: 'normal'
            },
            left: 'center',
            top: '10px'
          } : undefined,
          xAxis: {
            show: visual.config.xAxisShow !== false,
            type: 'value',
            name: visual.config.xAxisTitle,
            nameTextStyle: {
              color: '#6b7280',
              fontSize: 12
            },
            axisLabel: {
              color: '#6b7280',
              fontSize: 11
            },
            axisLine: {
              lineStyle: { color: '#e5e7eb' }
            },
            splitLine: {
              lineStyle: { color: '#f3f4f6' }
            }
          },
          yAxis: {
            show: visual.config.yAxisShow !== false,
            type: 'category',
            data: sampleData.map(d => d.category || d.name),
            name: visual.config.yAxisTitle,
            nameTextStyle: {
              color: '#6b7280',
              fontSize: 12
            },
            axisLabel: {
              color: '#6b7280',
              fontSize: 11
            },
            axisLine: {
              lineStyle: { color: '#e5e7eb' }
            }
          },
          series: [{
            data: sampleData.map(d => d.value),
            type: 'bar',
            itemStyle: {
              color: visual.config.colors?.[0] || '#3b82f6',
              borderRadius: [0, 4, 4, 0]
            },
            emphasis: {
              itemStyle: {
                color: visual.config.colors?.[1] || '#2563eb'
              }
            }
          }]
        }

      case 'donut-chart':
        return {
          ...baseOption,
          tooltip: {
            ...baseOption.tooltip,
            trigger: 'item',
            formatter: '{a} <br/>{b}: {c} ({d}%)'
          },
          legend: {
            orient: 'vertical',
            left: 'left',
            textStyle: {
              color: '#6b7280',
              fontSize: 11
            }
          },
          series: [{
            name: visual.title || 'Data',
            type: 'pie',
            radius: ['40%', '70%'],
            data: sampleData.map(d => ({
              value: d.value,
              name: d.category || d.name
            })),
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            },
            itemStyle: {
              borderRadius: 4,
              borderColor: '#fff',
              borderWidth: 2
            }
          }]
        }

      case 'stacked-column-chart':
        return {
          ...baseOption,
          title: visual.config.showTitle !== false && (visual.config.titleText || visual.title) ? {
            text: visual.config.titleText || visual.title,
            textStyle: {
              color: visual.config.titleColor || '#374151',
              fontSize: visual.config.titleFontSize || 16,
              fontWeight: 'normal'
            },
            left: 'center',
            top: '10px'
          } : undefined,
          xAxis: {
            show: visual.config.xAxisShow !== false,
            type: 'category',
            data: sampleData.map(d => d.category || d.name),
            name: visual.config.xAxisTitle,
            axisLabel: {
              color: '#6b7280',
              fontSize: 11
            },
            axisLine: {
              lineStyle: { color: '#e5e7eb' }
            }
          },
          yAxis: {
            show: visual.config.yAxisShow !== false,
            type: 'value',
            name: visual.config.yAxisTitle,
            axisLabel: {
              color: '#6b7280',
              fontSize: 11
            },
            axisLine: {
              lineStyle: { color: '#e5e7eb' }
            },
            splitLine: {
              lineStyle: { color: '#f3f4f6' }
            }
          },
          series: [
            {
              name: 'Series 1',
              data: sampleData.map(d => d.value),
              type: 'bar',
              stack: 'total',
              itemStyle: {
                color: visual.config.colors?.[0] || '#3b82f6'
              }
            },
            {
              name: 'Series 2',
              data: sampleData.map(d => d.value * 0.7),
              type: 'bar',
              stack: 'total',
              itemStyle: {
                color: visual.config.colors?.[1] || '#ef4444'
              }
            }
          ]
        }

      case 'gauge-chart':
        return {
          ...baseOption,
          series: [{
            type: 'gauge',
            min: 0,
            max: 100,
            data: [{
              value: sampleData[0]?.value || 75,
              name: 'Progress'
            }],
            progress: {
              show: true
            },
            detail: {
              valueAnimation: true,
              formatter: '{value}%'
            }
          }]
        }

      case 'funnel-chart':
        return {
          ...baseOption,
          tooltip: {
            trigger: 'item',
            formatter: '{b}: {c}'
          },
          series: [{
            type: 'funnel',
            data: sampleData.map(d => ({
              name: d.category || d.name,
              value: d.value
            })),
            sort: 'descending',
            gap: 2,
            label: {
              show: true,
              position: 'inside'
            }
          }]
        }

      case 'card':
        // Card is handled separately below
        return {
          ...baseOption,
          title: {
            text: 'Card View',
            left: 'center',
            textStyle: {
              color: '#374151',
              fontSize: 14,
              fontWeight: 'normal'
            }
          }
        }

      case 'table':
        // For table, we'll return a simple config and handle separately
        return {
          ...baseOption,
          title: {
            text: 'Table View',
            left: 'center',
            textStyle: {
              color: '#374151',
              fontSize: 14,
              fontWeight: 'normal'
            }
          }
        }

      default:
        return {
          ...baseOption,
          title: {
            text: `${visual.type} Chart`,
            left: 'center',
            textStyle: {
              color: '#374151',
              fontSize: 14,
              fontWeight: 'normal'
            }
          }
        }
    }
  }

  const option = useMemo(() => getChartOption(), [visual, data])

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current) {
        chartRef.current.getEchartsInstance().resize()
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Context menu handlers
  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault()
    setContextMenu({ x: event.clientX, y: event.clientY })
  }

  const handleCloseContextMenu = () => {
    setContextMenu(null)
  }

  // Export handlers
  const handleExportImage = (visual: Visual, format: 'png' | 'svg' | 'pdf') => {
    if (!chartRef.current) return
    
    const chart = chartRef.current.getEchartsInstance()
    const dataURL = chart.getDataURL({
      type: format === 'svg' ? 'svg' : 'png',
      pixelRatio: 2,
      backgroundColor: '#fff'
    })
    
    const link = document.createElement('a')
    link.download = `${visual.title || 'chart'}.${format === 'svg' ? 'svg' : 'png'}`
    link.href = dataURL
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDownloadData = (visual: Visual, format: 'csv' | 'xlsx' | 'json') => {
    const exportData = data.length > 0 ? data : generateSampleData(visual.type)
    
    if (format === 'csv') {
      const csv = convertToCSV(exportData)
      downloadFile(csv, `${visual.title || 'data'}.csv`, 'text/csv')
    } else if (format === 'json') {
      const json = JSON.stringify(exportData, null, 2)
      downloadFile(json, `${visual.title || 'data'}.json`, 'application/json')
    }
    // XLSX would require a library like xlsx or exceljs
  }

  const handleFocusMode = (visual: Visual) => {
    // TODO: Implement focus mode - could open in modal or navigate to dedicated view
    console.log('Focus mode for visual:', visual.id)
  }

  const handleFullscreen = (visual: Visual) => {
    if (chartRef.current && chartRef.current.ele) {
      const element = chartRef.current.ele as HTMLElement
      if (element.requestFullscreen) {
        element.requestFullscreen()
      }
    }
  }

  const handleCopyToClipboard = (visual: Visual) => {
    if (!chartRef.current) return
    
    const chart = chartRef.current.getEchartsInstance()
    const dataURL = chart.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#fff'
    })
    
    // Convert data URL to blob and copy to clipboard
    fetch(dataURL)
      .then(res => res.blob())
      .then(blob => {
        navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ])
      })
      .catch(err => console.error('Failed to copy to clipboard:', err))
  }

  const handlePrint = (visual: Visual) => {
    if (!chartRef.current) return
    
    const chart = chartRef.current.getEchartsInstance()
    const dataURL = chart.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#fff'
    })
    
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>${visual.title || 'Chart'}</title></head>
          <body>
            <img src="${dataURL}" style="max-width: 100%; height: auto;" />
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  // Special handling for special visual types
  const mappedType = VISUAL_TYPE_MAPPING[visual.type] || visual.type
  
  if (mappedType === 'table') {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center text-gray-500">
          <div className="text-2xl mb-2">📋</div>
          <div className="text-sm">Table visualization</div>
          <div className="text-xs mt-1">Drag fields to configure</div>
        </div>
      </div>
    )
  }
  
  if (mappedType === 'card') {
    const value = data.length > 0 ? data[0]?.value : (generateSampleData(visual.type)[0]?.value || 0)
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center">
          <div className="text-4xl font-bold text-blue-600 mb-2">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
          <div className="text-sm text-gray-500">
            {visual.config?.name || visual.title || 'Card Value'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`w-full h-full ${className}`}>
      <div onContextMenu={handleContextMenu}>
        <ReactECharts
          ref={chartRef}
          option={option}
          style={{ width: width || '100%', height: height || '100%' }}
          opts={{
            renderer: 'svg',
            width: width,
            height: height
          }}
        />
      </div>
      
      {contextMenu && (
        <ChartContextMenu
          visual={visual}
          position={contextMenu}
          onClose={handleCloseContextMenu}
          onDownloadData={handleDownloadData}
          onExportImage={handleExportImage}
          onFocusMode={handleFocusMode}
          onFullscreen={handleFullscreen}
          onCopyToClipboard={handleCopyToClipboard}
          onPrint={handlePrint}
        />
      )}
    </div>
  )
}

// Generate sample data based on chart type
const generateSampleData = (type: VisualType) => {
  const categories = ['Q1', 'Q2', 'Q3', 'Q4']
  
  switch (type) {
    case 'pie':
    case 'pie-chart':
    case 'donut':
    case 'donut-chart':
      return [
        { name: 'Desktop', value: 45 },
        { name: 'Mobile', value: 35 },
        { name: 'Tablet', value: 20 }
      ]
    
    case 'scatter':
    case 'scatter-plot':
      return Array.from({ length: 20 }, (_, i) => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        value: Math.random() * 100
      }))
    
    default:
      return categories.map((cat, i) => ({
        category: cat,
        name: cat,
        value: Math.floor(Math.random() * 100) + 20
      }))
  }
}

// Generate empty state option for charts with data binding but no data
const getEmptyStateOption = (type: VisualType): EChartsOption => {
  const emptyStateText = getEmptyStateText(type)
  
  return {
    backgroundColor: 'transparent',
    graphic: {
      type: 'group',
      left: 'center',
      top: 'center',
      children: [
        {
          type: 'text',
          style: {
            text: emptyStateText.icon,
            fontSize: 48,
            fontWeight: 'normal',
            fill: '#d1d5db'
          }
        },
        {
          type: 'text',
          style: {
            text: emptyStateText.title,
            fontSize: 16,
            fontWeight: '500',
            fill: '#6b7280'
          },
          top: 60
        },
        {
          type: 'text',
          style: {
            text: emptyStateText.subtitle,
            fontSize: 12,
            fontWeight: 'normal',
            fill: '#9ca3af'
          },
          top: 85
        }
      ]
    }
  }
}

// Get empty state text based on chart type
const getEmptyStateText = (type: VisualType) => {
  const mappedType = VISUAL_TYPE_MAPPING[type] || type
  switch (mappedType) {
    case 'column-chart':
    case 'bar-chart':
    case 'stacked-column-chart':
      return {
        icon: '📊',
        title: 'No data to display',
        subtitle: 'Drag fields to configure this chart'
      }
    case 'line-chart':
      return {
        icon: '📈',
        title: 'No data to display',
        subtitle: 'Add fields to create a line chart'
      }
    case 'pie-chart':
    case 'donut-chart':
      return {
        icon: '🥧',
        title: 'No data to display', 
        subtitle: 'Add values to create a pie chart'
      }
    case 'scatter-plot':
      return {
        icon: '💎',
        title: 'No data to display',
        subtitle: 'Add X and Y fields for scatter plot'
      }
    case 'area-chart':
      return {
        icon: '📉',
        title: 'No data to display',
        subtitle: 'Add fields to create an area chart'
      }
    case 'gauge-chart':
      return {
        icon: '🌡️',
        title: 'No data to display',
        subtitle: 'Add a value for the gauge'
      }
    case 'funnel-chart':
      return {
        icon: '🍷',
        title: 'No data to display',
        subtitle: 'Add categories and values'
      }
    case 'card':
      return {
        icon: '🃏',
        title: 'No data to display',
        subtitle: 'Add a measure to show'
      }
    case 'table':
      return {
        icon: '📋',
        title: 'Empty table',
        subtitle: 'Drag fields to add columns'
      }
    default:
      return {
        icon: '📊',
        title: 'No data to display',
        subtitle: 'Configure this visual by adding fields'
      }
  }
}

// Utility functions
const convertToCSV = (data: any[]): string => {
  if (data.length === 0) return ''
  
  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => JSON.stringify(row[header] || '')).join(','))
  ].join('\n')
  
  return csvContent
}

const downloadFile = (content: string, filename: string, contentType: string) => {
  const blob = new Blob([content], { type: contentType })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

export default EChartsRenderer