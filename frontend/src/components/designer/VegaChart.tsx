/**
 * Vega Chart Component
 * Renders charts using Vega-Lite specification
 */

import React, { useEffect, useRef } from 'react'
import * as vega from 'vega'
import * as vegaLite from 'vega-lite'
import vegaEmbed from 'vega-embed'
import { VisualType, VisualConfig } from '@/types/report'

interface VegaChartProps {
  type: VisualType
  data: any[]
  config: VisualConfig
  width?: number
  height?: number
}

const VegaChart: React.FC<VegaChartProps> = ({ 
  type, 
  data, 
  config, 
  width, 
  height 
}) => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current || !data || data.length === 0) return

    const spec = generateVegaLiteSpec(type, data, config, width, height)

    vegaEmbed(containerRef.current, spec, {
      actions: false,
      renderer: 'svg',
      padding: { top: 5, left: 5, right: 5, bottom: 5 },
    }).catch(console.error)

    // Cleanup on unmount
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [type, data, config, width, height])

  return (
    <div 
      ref={containerRef} 
      className="vega-chart w-full h-full"
      style={{ minHeight: '100px' }}
    />
  )
}

/**
 * Generate Vega-Lite specification based on visual type and data
 */
function generateVegaLiteSpec(
  type: VisualType, 
  data: any[], 
  config: VisualConfig,
  width?: number,
  height?: number
): any {
  const baseSpec = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    data: { values: data },
    width: width ? width - 40 : 'container',
    height: height ? height - 80 : 'container',
    config: {
      legend: config.legend?.show ? {
        orient: config.legend.position || 'right'
      } : null,
      axis: {
        labelFontSize: 10,
        titleFontSize: 11,
      },
      mark: {
        fontSize: 10,
      }
    }
  }

  switch (type) {
    case 'bar':
    case 'column-chart':
    case 'stacked-column-chart':
    case 'clustered-column-chart':
      return {
        ...baseSpec,
        mark: { 
          type: 'bar',
          color: config.colors?.[0] || '#3b82f6',
          tooltip: true
        },
        encoding: {
          x: { 
            field: 'category', 
            type: 'nominal',
            title: config.axes?.x?.title || 'Category',
            axis: config.axes?.x?.show !== false ? {} : null
          },
          y: { 
            field: 'value', 
            type: 'quantitative',
            title: config.axes?.y?.title || 'Value', 
            axis: config.axes?.y?.show !== false ? {} : null
          },
          tooltip: [
            { field: 'category', type: 'nominal', title: 'Category' },
            { field: 'value', type: 'quantitative', title: 'Value' }
          ]
        }
      }

    case 'line':
    case 'line-chart':
      return {
        ...baseSpec,
        mark: { 
          type: 'line',
          color: config.colors?.[0] || '#3b82f6',
          point: true,
          tooltip: true
        },
        encoding: {
          x: { 
            field: 'x', 
            type: 'ordinal',
            title: config.axes?.x?.title || 'X Axis',
            axis: config.axes?.x?.show !== false ? {} : null
          },
          y: { 
            field: 'y', 
            type: 'quantitative',
            title: config.axes?.y?.title || 'Y Axis',
            axis: config.axes?.y?.show !== false ? {} : null
          },
          tooltip: [
            { field: 'x', type: 'ordinal', title: 'X' },
            { field: 'y', type: 'quantitative', title: 'Y' }
          ]
        }
      }

    case 'pie':
    case 'pie-chart':
      return {
        ...baseSpec,
        mark: { 
          type: 'arc',
          tooltip: true,
          innerRadius: 0
        },
        encoding: {
          theta: { field: 'value', type: 'quantitative' },
          color: { 
            field: 'category', 
            type: 'nominal',
            scale: { range: config.colors || ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'] }
          },
          tooltip: [
            { field: 'category', type: 'nominal', title: 'Category' },
            { field: 'value', type: 'quantitative', title: 'Value' }
          ]
        }
      }

    case 'donut-chart':
      return {
        ...baseSpec,
        mark: { 
          type: 'arc',
          tooltip: true,
          innerRadius: 50
        },
        encoding: {
          theta: { field: 'value', type: 'quantitative' },
          color: { 
            field: 'category', 
            type: 'nominal',
            scale: { range: config.colors || ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'] }
          },
          tooltip: [
            { field: 'category', type: 'nominal', title: 'Category' },
            { field: 'value', type: 'quantitative', title: 'Value' }
          ]
        }
      }

    case 'area':
    case 'area-chart':
      return {
        ...baseSpec,
        mark: { 
          type: 'area',
          color: config.colors?.[0] || '#3b82f6',
          tooltip: true
        },
        encoding: {
          x: { 
            field: 'x', 
            type: 'ordinal',
            title: config.axes?.x?.title || 'X Axis',
            axis: config.axes?.x?.show !== false ? {} : null
          },
          y: { 
            field: 'y', 
            type: 'quantitative',
            title: config.axes?.y?.title || 'Y Axis',
            axis: config.axes?.y?.show !== false ? {} : null
          },
          tooltip: [
            { field: 'x', type: 'ordinal', title: 'X' },
            { field: 'y', type: 'quantitative', title: 'Y' }
          ]
        }
      }

    case 'scatter':
    case 'scatter-plot':
      return {
        ...baseSpec,
        mark: { 
          type: 'circle',
          size: 100,
          tooltip: true
        },
        encoding: {
          x: { 
            field: 'x', 
            type: 'quantitative',
            title: config.axes?.x?.title || 'X Axis',
            axis: config.axes?.x?.show !== false ? {} : null
          },
          y: { 
            field: 'y', 
            type: 'quantitative',
            title: config.axes?.y?.title || 'Y Axis',
            axis: config.axes?.y?.show !== false ? {} : null
          },
          color: { 
            field: 'category', 
            type: 'nominal',
            scale: { range: config.colors || ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'] }
          },
          tooltip: [
            { field: 'x', type: 'quantitative', title: 'X' },
            { field: 'y', type: 'quantitative', title: 'Y' },
            { field: 'category', type: 'nominal', title: 'Category' }
          ]
        }
      }

    case 'bubble-chart':
      return {
        ...baseSpec,
        mark: { 
          type: 'circle',
          tooltip: true
        },
        encoding: {
          x: { 
            field: 'x', 
            type: 'quantitative',
            title: config.axes?.x?.title || 'X Axis',
            axis: config.axes?.x?.show !== false ? {} : null
          },
          y: { 
            field: 'y', 
            type: 'quantitative',
            title: config.axes?.y?.title || 'Y Axis',
            axis: config.axes?.y?.show !== false ? {} : null
          },
          size: { 
            field: 'size', 
            type: 'quantitative',
            scale: { range: [50, 200] }
          },
          color: { 
            field: 'category', 
            type: 'nominal',
            scale: { range: config.colors || ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'] }
          },
          tooltip: [
            { field: 'x', type: 'quantitative', title: 'X' },
            { field: 'y', type: 'quantitative', title: 'Y' },
            { field: 'size', type: 'quantitative', title: 'Size' },
            { field: 'category', type: 'nominal', title: 'Category' }
          ]
        }
      }

    case 'waterfall-chart':
      return {
        ...baseSpec,
        mark: { 
          type: 'bar',
          tooltip: true
        },
        encoding: {
          x: { 
            field: 'category', 
            type: 'ordinal',
            title: config.axes?.x?.title || 'Category'
          },
          y: { 
            field: 'start', 
            type: 'quantitative'
          },
          y2: { 
            field: 'end', 
            type: 'quantitative'
          },
          color: { 
            field: 'type', 
            type: 'nominal',
            scale: { range: ['#28a745', '#dc3545', '#6c757d'] }
          },
          tooltip: [
            { field: 'category', type: 'ordinal', title: 'Category' },
            { field: 'value', type: 'quantitative', title: 'Value' }
          ]
        }
      }

    case 'funnel-chart':
      return {
        ...baseSpec,
        mark: { 
          type: 'bar',
          tooltip: true
        },
        encoding: {
          x: { 
            field: 'value', 
            type: 'quantitative',
            title: config.axes?.x?.title || 'Value'
          },
          y: { 
            field: 'category', 
            type: 'ordinal',
            title: config.axes?.y?.title || 'Stage',
            sort: null
          },
          color: { 
            field: 'category', 
            type: 'nominal',
            scale: { range: config.colors || ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'] }
          },
          tooltip: [
            { field: 'category', type: 'ordinal', title: 'Stage' },
            { field: 'value', type: 'quantitative', title: 'Value' }
          ]
        }
      }

    case 'table':
    case 'matrix':
      return {
        ...baseSpec,
        mark: { type: 'text', fontSize: 12 },
        encoding: {
          text: { value: 'Table visualization coming soon...' }
        }
      }

    case 'gauge':
    case 'kpi':
    case 'card':
      return {
        ...baseSpec,
        mark: { type: 'text', fontSize: 24, fontWeight: 'bold' },
        encoding: {
          text: { field: 'value', type: 'quantitative' }
        }
      }

    case 'map':
    case 'filled-map':
      return {
        ...baseSpec,
        width: width ? width - 40 : 300,
        height: height ? height - 80 : 200,
        mark: { 
          type: 'circle',
          size: 100,
          tooltip: true 
        },
        encoding: {
          longitude: { 
            field: 'longitude', 
            type: 'quantitative' 
          },
          latitude: { 
            field: 'latitude', 
            type: 'quantitative' 
          },
          color: { 
            field: 'value', 
            type: 'quantitative',
            scale: { scheme: 'blues' }
          },
          tooltip: [
            { field: 'location', type: 'nominal', title: 'Location' },
            { field: 'value', type: 'quantitative', title: 'Value' }
          ]
        },
        projection: { type: 'mercator' }
      }

    default:
      return {
        ...baseSpec,
        mark: { type: 'bar', color: '#6b7280' },
        encoding: {
          x: { field: 'category', type: 'nominal' },
          y: { field: 'value', type: 'quantitative' }
        }
      }
  }
}

export default VegaChart