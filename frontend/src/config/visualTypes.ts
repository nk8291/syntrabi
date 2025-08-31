/**
 * Visual Types Configuration
 * Comprehensive list of all visualization types with ECharts integration
 */

export interface VisualField {
  name: string
  type: 'dimension' | 'measure'
  dataType: 'string' | 'number' | 'date' | 'boolean'
  aggregation?: 'sum' | 'count' | 'avg' | 'min' | 'max' | 'distinct'
}

export interface FieldWell {
  label: string
  max: number
  required: boolean
  accepts: ('dimension' | 'measure')[]
  fields: VisualField[]
}

export interface VisualConfig {
  id: string
  name: string
  category: 'chart' | 'table' | 'map' | 'gauge' | 'custom'
  icon: string
  description: string
  fieldWells: {
    [key: string]: FieldWell
  }
  properties: {
    [key: string]: {
      type: 'text' | 'number' | 'color' | 'boolean' | 'select' | 'slider'
      label: string
      default: any
      options?: string[] | number[]
      min?: number
      max?: number
    }
  }
  chartType: string // ECharts chart type
  getEChartsOption: (data: any[], fieldWells: { [key: string]: FieldWell }, config: any) => any
}

// Helper function to create empty chart option
const createEmptyOption = (title: string = 'Drop fields here to create visualization') => ({
  title: {
    text: title,
    left: 'center',
    top: 'middle',
    textStyle: {
      color: '#999',
      fontSize: 14
    }
  },
  xAxis: { show: false },
  yAxis: { show: false },
  series: []
})

// Helper function for column/bar charts
const createColumnBarOption = (data: any[], fieldWells: { [key: string]: FieldWell }, config: any, isHorizontal = false) => {
  const xAxisField = fieldWells.xAxis?.fields[0]
  const yAxisField = fieldWells.yAxis?.fields[0] 
  const legendField = fieldWells.legend?.fields[0]
  
  if (!xAxisField || !yAxisField) {
    return createEmptyOption()
  }
  
  // Group data by legend field if present
  const series = legendField ? 
    // Multiple series for legend
    [...new Set(data.map(d => d[legendField.name]))].map(legendValue => ({
      name: legendValue,
      type: isHorizontal ? 'bar' : 'bar',
      data: data
        .filter(d => d[legendField.name] === legendValue)
        .map(d => d[yAxisField.name] || 0),
      itemStyle: { color: config.colors?.[0] || '#3b82f6' }
    })) :
    // Single series
    [{
      type: isHorizontal ? 'bar' : 'bar',
      data: data.map(d => d[yAxisField.name] || 0),
      itemStyle: { color: config.colors?.[0] || '#3b82f6' }
    }]

  return {
    title: config.showTitle !== false ? {
      text: config.title || '',
      textStyle: { 
        color: config.titleColor || '#000', 
        fontSize: parseInt(config.titleFontSize) || 16 
      }
    } : undefined,
    tooltip: { trigger: 'axis' },
    legend: legendField ? { data: [...new Set(data.map(d => d[legendField.name]))] } : undefined,
    xAxis: {
      type: isHorizontal ? 'value' : 'category',
      data: isHorizontal ? undefined : data.map(d => d[xAxisField.name] || ''),
      name: isHorizontal ? yAxisField.name : xAxisField.name,
      show: config.showAxes !== false
    },
    yAxis: {
      type: isHorizontal ? 'category' : 'value', 
      data: isHorizontal ? data.map(d => d[xAxisField.name] || '') : undefined,
      name: isHorizontal ? xAxisField.name : yAxisField.name,
      show: config.showAxes !== false
    },
    series,
    backgroundColor: config.backgroundColor || 'transparent'
  }
}

export const VISUAL_TYPES: VisualConfig[] = [
  // COLUMN CHART
  {
    id: 'column-chart',
    name: 'Clustered Column Chart',
    category: 'chart',
    icon: '📊',
    description: 'Compare values across categories using vertical bars',
    chartType: 'bar',
    fieldWells: {
      xAxis: { 
        label: 'X-Axis', 
        max: 1, 
        required: true, 
        accepts: ['dimension'], 
        fields: [] 
      },
      yAxis: { 
        label: 'Y-Axis', 
        max: 10, 
        required: true, 
        accepts: ['measure'], 
        fields: [] 
      },
      legend: { 
        label: 'Legend', 
        max: 1, 
        required: false, 
        accepts: ['dimension'], 
        fields: [] 
      },
    },
    properties: {
      showTitle: { type: 'boolean', label: 'Show Title', default: true },
      title: { type: 'text', label: 'Chart Title', default: '' },
      showAxes: { type: 'boolean', label: 'Show Axes', default: true },
      showGridLines: { type: 'boolean', label: 'Show Grid Lines', default: true },
    },
    getEChartsOption: (data, fieldWells, config) => createColumnBarOption(data, fieldWells, config, false)
  },

  // BAR CHART
  {
    id: 'bar-chart',
    name: 'Clustered Bar Chart', 
    category: 'chart',
    icon: '📈',
    description: 'Compare values across categories using horizontal bars',
    chartType: 'bar',
    fieldWells: {
      xAxis: { 
        label: 'Y-Axis', 
        max: 1, 
        required: true, 
        accepts: ['dimension'], 
        fields: [] 
      },
      yAxis: { 
        label: 'X-Axis', 
        max: 10, 
        required: true, 
        accepts: ['measure'], 
        fields: [] 
      },
      legend: { 
        label: 'Legend', 
        max: 1, 
        required: false, 
        accepts: ['dimension'], 
        fields: [] 
      },
    },
    properties: {
      showTitle: { type: 'boolean', label: 'Show Title', default: true },
      title: { type: 'text', label: 'Chart Title', default: '' },
      showAxes: { type: 'boolean', label: 'Show Axes', default: true },
    },
    getEChartsOption: (data, fieldWells, config) => createColumnBarOption(data, fieldWells, config, true)
  },

  // LINE CHART
  {
    id: 'line-chart',
    name: 'Line Chart',
    category: 'chart', 
    icon: '📈',
    description: 'Show trends over time or ordered categories',
    chartType: 'line',
    fieldWells: {
      xAxis: { 
        label: 'X-Axis', 
        max: 1, 
        required: true, 
        accepts: ['dimension'], 
        fields: [] 
      },
      yAxis: { 
        label: 'Y-Axis', 
        max: 10, 
        required: true, 
        accepts: ['measure'], 
        fields: [] 
      },
      legend: { 
        label: 'Legend', 
        max: 1, 
        required: false, 
        accepts: ['dimension'], 
        fields: [] 
      },
    },
    properties: {
      showTitle: { type: 'boolean', label: 'Show Title', default: true },
      title: { type: 'text', label: 'Chart Title', default: '' },
      showMarkers: { type: 'boolean', label: 'Show Markers', default: true },
      lineWidth: { type: 'slider', label: 'Line Width', default: 2, min: 1, max: 10 }
    },
    getEChartsOption: (data, fieldWells, config) => {
      const xAxisField = fieldWells.xAxis?.fields[0]
      const yAxisField = fieldWells.yAxis?.fields[0]
      const legendField = fieldWells.legend?.fields[0]
      
      if (!xAxisField || !yAxisField) {
        return createEmptyOption()
      }

      const series = legendField ? 
        [...new Set(data.map(d => d[legendField.name]))].map(legendValue => ({
          name: legendValue,
          type: 'line',
          data: data
            .filter(d => d[legendField.name] === legendValue)
            .map(d => d[yAxisField.name] || 0),
          lineStyle: { width: config.lineWidth || 2 },
          symbol: config.showMarkers !== false ? 'circle' : 'none'
        })) :
        [{
          type: 'line',
          data: data.map(d => d[yAxisField.name] || 0),
          lineStyle: { width: config.lineWidth || 2 },
          symbol: config.showMarkers !== false ? 'circle' : 'none'
        }]

      return {
        title: config.showTitle !== false ? {
          text: config.title || '',
        } : undefined,
        tooltip: { trigger: 'axis' },
        legend: legendField ? { data: [...new Set(data.map(d => d[legendField.name]))] } : undefined,
        xAxis: {
          type: 'category',
          data: data.map(d => d[xAxisField.name] || ''),
          name: xAxisField.name
        },
        yAxis: {
          type: 'value',
          name: yAxisField.name
        },
        series
      }
    }
  },

  // PIE CHART
  {
    id: 'pie-chart',
    name: 'Pie Chart',
    category: 'chart',
    icon: '🥧', 
    description: 'Show parts of a whole',
    chartType: 'pie',
    fieldWells: {
      legend: { 
        label: 'Legend', 
        max: 1, 
        required: true, 
        accepts: ['dimension'], 
        fields: [] 
      },
      values: { 
        label: 'Values', 
        max: 1, 
        required: true, 
        accepts: ['measure'], 
        fields: [] 
      },
    },
    properties: {
      showTitle: { type: 'boolean', label: 'Show Title', default: true },
      title: { type: 'text', label: 'Chart Title', default: '' },
      showLabels: { type: 'boolean', label: 'Show Labels', default: true },
      showPercentages: { type: 'boolean', label: 'Show Percentages', default: true }
    },
    getEChartsOption: (data, fieldWells, config) => {
      const legendField = fieldWells.legend?.fields[0]
      const valueField = fieldWells.values?.fields[0]
      
      if (!legendField || !valueField) {
        return createEmptyOption()
      }

      return {
        title: config.showTitle !== false ? {
          text: config.title || '',
        } : undefined,
        tooltip: {
          trigger: 'item',
          formatter: config.showPercentages !== false ? '{b}: {c} ({d}%)' : '{b}: {c}'
        },
        series: [{
          type: 'pie',
          data: data.map(d => ({
            name: d[legendField.name] || '',
            value: d[valueField.name] || 0
          })),
          label: {
            show: config.showLabels !== false,
            formatter: config.showPercentages !== false ? '{b}: {d}%' : '{b}'
          }
        }]
      }
    }
  },

  // AREA CHART
  {
    id: 'area-chart', 
    name: 'Area Chart',
    category: 'chart',
    icon: '⛰️',
    description: 'Show cumulative totals over time',
    chartType: 'area',
    fieldWells: {
      xAxis: { 
        label: 'X-Axis', 
        max: 1, 
        required: true, 
        accepts: ['dimension'], 
        fields: [] 
      },
      yAxis: { 
        label: 'Y-Axis', 
        max: 10, 
        required: true, 
        accepts: ['measure'], 
        fields: [] 
      },
      legend: { 
        label: 'Legend', 
        max: 1, 
        required: false, 
        accepts: ['dimension'], 
        fields: [] 
      },
    },
    properties: {
      showTitle: { type: 'boolean', label: 'Show Title', default: true },
      title: { type: 'text', label: 'Chart Title', default: '' },
      stackType: { 
        type: 'select', 
        label: 'Stack Type', 
        default: 'none',
        options: ['none', 'normal', 'percent']
      },
      opacity: { type: 'slider', label: 'Area Opacity', default: 0.7, min: 0.1, max: 1 }
    },
    getEChartsOption: (data, fieldWells, config) => {
      const xAxisField = fieldWells.xAxis?.fields[0]
      const yAxisField = fieldWells.yAxis?.fields[0]
      const legendField = fieldWells.legend?.fields[0]
      
      if (!xAxisField || !yAxisField) {
        return createEmptyOption()
      }

      const series = legendField ? 
        [...new Set(data.map(d => d[legendField.name]))].map(legendValue => ({
          name: legendValue,
          type: 'line',
          areaStyle: { opacity: config.opacity || 0.7 },
          stack: config.stackType !== 'none' ? 'total' : undefined,
          data: data
            .filter(d => d[legendField.name] === legendValue)  
            .map(d => d[yAxisField.name] || 0)
        })) :
        [{
          type: 'line',
          areaStyle: { opacity: config.opacity || 0.7 },
          data: data.map(d => d[yAxisField.name] || 0)
        }]

      return {
        title: config.showTitle !== false ? {
          text: config.title || '',
        } : undefined,
        tooltip: { trigger: 'axis' },
        legend: legendField ? { data: [...new Set(data.map(d => d[legendField.name]))] } : undefined,
        xAxis: {
          type: 'category',
          data: data.map(d => d[xAxisField.name] || ''),
          name: xAxisField.name
        },
        yAxis: {
          type: 'value',
          name: yAxisField.name
        },
        series
      }
    }
  },

  // SCATTER PLOT
  {
    id: 'scatter-plot',
    name: 'Scatter Plot',
    category: 'chart',
    icon: '⚪',
    description: 'Show correlation between two measures',
    chartType: 'scatter',
    fieldWells: {
      xAxis: { 
        label: 'X-Axis', 
        max: 1, 
        required: true, 
        accepts: ['measure'], 
        fields: [] 
      },
      yAxis: { 
        label: 'Y-Axis', 
        max: 1, 
        required: true, 
        accepts: ['measure'], 
        fields: [] 
      },
      legend: { 
        label: 'Details', 
        max: 1, 
        required: false, 
        accepts: ['dimension'], 
        fields: [] 
      },
      size: { 
        label: 'Size', 
        max: 1, 
        required: false, 
        accepts: ['measure'], 
        fields: [] 
      }
    },
    properties: {
      showTitle: { type: 'boolean', label: 'Show Title', default: true },
      title: { type: 'text', label: 'Chart Title', default: '' },
      pointSize: { type: 'slider', label: 'Point Size', default: 10, min: 5, max: 50 }
    },
    getEChartsOption: (data, fieldWells, config) => {
      const xAxisField = fieldWells.xAxis?.fields[0]
      const yAxisField = fieldWells.yAxis?.fields[0]
      const legendField = fieldWells.legend?.fields[0]
      const sizeField = fieldWells.size?.fields[0]
      
      if (!xAxisField || !yAxisField) {
        return createEmptyOption()
      }

      return {
        title: config.showTitle !== false ? {
          text: config.title || '',
        } : undefined,
        tooltip: { trigger: 'item' },
        legend: legendField ? { data: [...new Set(data.map(d => d[legendField.name]))] } : undefined,
        xAxis: {
          type: 'value',
          name: xAxisField.name
        },
        yAxis: {
          type: 'value', 
          name: yAxisField.name
        },
        series: [{
          type: 'scatter',
          data: data.map(d => [
            d[xAxisField.name] || 0,
            d[yAxisField.name] || 0,
            sizeField ? d[sizeField.name] || config.pointSize || 10 : config.pointSize || 10
          ]),
          symbolSize: sizeField ? 
            (value: number[]) => Math.sqrt(value[2]) * 2 :
            config.pointSize || 10
        }]
      }
    }
  },

  // TABLE
  {
    id: 'table',
    name: 'Table',
    category: 'table',
    icon: '📋',
    description: 'Display detailed data in rows and columns',
    chartType: 'table',
    fieldWells: {
      columns: { 
        label: 'Columns', 
        max: 50, 
        required: true, 
        accepts: ['dimension', 'measure'], 
        fields: [] 
      }
    },
    properties: {
      showTitle: { type: 'boolean', label: 'Show Title', default: true },
      title: { type: 'text', label: 'Table Title', default: '' },
      showRowNumbers: { type: 'boolean', label: 'Show Row Numbers', default: false },
      pageSize: { 
        type: 'select', 
        label: 'Rows Per Page', 
        default: 25,
        options: [10, 25, 50, 100]
      }
    },
    getEChartsOption: () => createEmptyOption('Table visualization - drop fields to configure')
  },

  // CARD
  {
    id: 'card',
    name: 'Card',
    category: 'gauge', 
    icon: '🃏',
    description: 'Display single important number',
    chartType: 'card',
    fieldWells: {
      values: { 
        label: 'Fields', 
        max: 1, 
        required: true, 
        accepts: ['measure'], 
        fields: [] 
      }
    },
    properties: {
      showTitle: { type: 'boolean', label: 'Show Title', default: true },
      title: { type: 'text', label: 'Card Title', default: '' },
      displayUnits: { 
        type: 'select', 
        label: 'Display Units', 
        default: 'auto',
        options: ['auto', 'none', 'thousands', 'millions', 'billions']
      },
    },
    getEChartsOption: () => createEmptyOption('Card visualization - drop a measure to configure')
  }
]

export const getVisualTypeById = (id: string): VisualConfig | undefined => {
  return VISUAL_TYPES.find(visual => visual.id === id)
}

export const getVisualTypesByCategory = (category: string): VisualConfig[] => {
  return VISUAL_TYPES.filter(visual => visual.category === category)
}

export const VISUAL_CATEGORIES = [
  { id: 'chart', name: 'Charts', icon: '📊' },
  { id: 'table', name: 'Tables', icon: '📋' },
  { id: 'gauge', name: 'Gauges', icon: '🌡️' },
  { id: 'map', name: 'Maps', icon: '🗺️' },
  { id: 'custom', name: 'Custom', icon: '🔧' }
]