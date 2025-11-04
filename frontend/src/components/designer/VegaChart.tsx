/**
 * Vega Chart Component
 * Fallback to ECharts-based rendering (vega-embed removed due to dependency conflicts)
 */

import React from 'react'
import { VisualType, VisualConfig } from '@/types/report'
import EChartsRenderer from './EChartsRenderer'

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
  // Fallback to ECharts renderer (vega-embed removed due to dependency conflicts)
  return (
    <EChartsRenderer
      type={type}
      data={data}
      config={config}
      width={width}
      height={height}
    />
  )
}


export default VegaChart