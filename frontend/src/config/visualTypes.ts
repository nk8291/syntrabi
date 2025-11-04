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
    icon: '↔️',
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
    icon: '🔴',
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
  },

  // DONUT CHART  
  {
    id: 'donut-chart',
    name: 'Donut Chart',
    category: 'chart',
    icon: '🍩',
    description: 'Show parts of a whole with center space',
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
          radius: ['40%', '70%'],
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

  // STACKED COLUMN CHART
  {
    id: 'stacked-column-chart',
    name: 'Stacked Column Chart',
    category: 'chart',
    icon: '📚',
    description: 'Compare totals and parts across categories',
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
        required: true, 
        accepts: ['dimension'], 
        fields: [] 
      },
    },
    properties: {
      showTitle: { type: 'boolean', label: 'Show Title', default: true },
      title: { type: 'text', label: 'Chart Title', default: '' },
      showAxes: { type: 'boolean', label: 'Show Axes', default: true },
    },
    getEChartsOption: (data, fieldWells, config) => {
      const xAxisField = fieldWells.xAxis?.fields[0]
      const yAxisField = fieldWells.yAxis?.fields[0] 
      const legendField = fieldWells.legend?.fields[0]
      
      if (!xAxisField || !yAxisField || !legendField) {
        return createEmptyOption()
      }
      
      const legendValues = [...new Set(data.map(d => d[legendField.name]))]
      const series = legendValues.map(legendValue => ({
        name: legendValue,
        type: 'bar',
        stack: 'total',
        data: data
          .filter(d => d[legendField.name] === legendValue)
          .map(d => d[yAxisField.name] || 0)
      }))

      return {
        title: config.showTitle !== false ? {
          text: config.title || '',
        } : undefined,
        tooltip: { trigger: 'axis' },
        legend: { data: legendValues },
        xAxis: {
          type: 'category',
          data: [...new Set(data.map(d => d[xAxisField.name] || ''))],
          name: xAxisField.name,
          show: config.showAxes !== false
        },
        yAxis: {
          type: 'value',
          name: yAxisField.name,
          show: config.showAxes !== false
        },
        series
      }
    }
  },

  // GAUGE CHART
  {
    id: 'gauge-chart',
    name: 'Gauge',
    category: 'gauge',
    icon: '🌡️',
    description: 'Display progress toward a goal',
    chartType: 'gauge',
    fieldWells: {
      values: { 
        label: 'Value', 
        max: 1, 
        required: true, 
        accepts: ['measure'], 
        fields: [] 
      },
      target: { 
        label: 'Target', 
        max: 1, 
        required: false, 
        accepts: ['measure'], 
        fields: [] 
      }
    },
    properties: {
      showTitle: { type: 'boolean', label: 'Show Title', default: true },
      title: { type: 'text', label: 'Gauge Title', default: '' },
      minValue: { type: 'number', label: 'Min Value', default: 0 },
      maxValue: { type: 'number', label: 'Max Value', default: 100 },
    },
    getEChartsOption: (data, fieldWells, config) => {
      const valueField = fieldWells.values?.fields[0]
      const targetField = fieldWells.target?.fields[0]
      
      if (!valueField || data.length === 0) {
        return createEmptyOption()
      }

      const value = data[0][valueField.name] || 0
      const target = targetField ? data[0][targetField.name] : config.maxValue || 100

      return {
        title: config.showTitle !== false ? {
          text: config.title || '',
        } : undefined,
        series: [{
          type: 'gauge',
          min: config.minValue || 0,
          max: target || config.maxValue || 100,
          data: [{
            value: value,
            name: valueField.name
          }],
          progress: {
            show: true
          },
          detail: {
            valueAnimation: true,
            formatter: '{value}'
          }
        }]
      }
    }
  },

  // FUNNEL CHART
  {
    id: 'funnel-chart',
    name: 'Funnel Chart',
    category: 'chart',
    icon: '🍷',
    description: 'Show stages in a linear process',
    chartType: 'funnel',
    fieldWells: {
      category: { 
        label: 'Category', 
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
      sort: { 
        type: 'select', 
        label: 'Sort', 
        default: 'descending',
        options: ['ascending', 'descending', 'none']
      }
    },
    getEChartsOption: (data, fieldWells, config) => {
      const categoryField = fieldWells.category?.fields[0]
      const valueField = fieldWells.values?.fields[0]
      
      if (!categoryField || !valueField) {
        return createEmptyOption()
      }

      let sortedData = [...data]
      if (config.sort === 'ascending') {
        sortedData.sort((a, b) => a[valueField.name] - b[valueField.name])
      } else if (config.sort === 'descending') {
        sortedData.sort((a, b) => b[valueField.name] - a[valueField.name])
      }

      return {
        title: config.showTitle !== false ? {
          text: config.title || '',
        } : undefined,
        tooltip: {
          trigger: 'item',
          formatter: '{b}: {c}'
        },
        series: [{
          type: 'funnel',
          data: sortedData.map(d => ({
            name: d[categoryField.name] || '',
            value: d[valueField.name] || 0
          })),
          sort: config.sort === 'none' ? 'none' : config.sort,
          gap: 2,
          label: {
            show: true,
            position: 'inside'
          }
        }]
      }
    }
  },

  // INTERACTIVE MAP
  {
    id: 'interactive-map',
    name: 'Interactive Map',
    category: 'map',
    icon: '🗺️',
    description: 'Geographic visualization with interactive markers',
    chartType: 'map',
    fieldWells: {
      latitude: { 
        label: 'Latitude', 
        max: 1, 
        required: true, 
        accepts: ['measure'], 
        fields: [] 
      },
      longitude: { 
        label: 'Longitude', 
        max: 1, 
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
      },
      values: { 
        label: 'Values', 
        max: 1, 
        required: false, 
        accepts: ['measure'], 
        fields: [] 
      },
      labels: { 
        label: 'Labels', 
        max: 1, 
        required: false, 
        accepts: ['dimension'], 
        fields: [] 
      }
    },
    properties: {
      showTitle: { type: 'boolean', label: 'Show Title', default: true },
      title: { type: 'text', label: 'Map Title', default: '' },
      mapType: { 
        type: 'select', 
        label: 'Map Type', 
        default: 'markers',
        options: ['markers', 'choropleth', 'heatmap']
      },
      centerLat: { type: 'number', label: 'Center Latitude', default: 51.505 },
      centerLng: { type: 'number', label: 'Center Longitude', default: -0.09 },
      zoom: { type: 'slider', label: 'Zoom Level', default: 2, min: 1, max: 18 },
      showLegend: { type: 'boolean', label: 'Show Legend', default: true },
      clusterMarkers: { type: 'boolean', label: 'Cluster Markers', default: false }
    },
    getEChartsOption: (data, fieldWells, config) => {
      const latField = fieldWells.latitude?.fields[0]
      const lngField = fieldWells.longitude?.fields[0]
      
      if (!latField || !lngField) {
        return createEmptyOption('Map visualization - add latitude and longitude fields')
      }

      // Transform data for map component
      const mapData = data.map((d, index) => ({
        id: `point-${index}`,
        latitude: d[latField.name] || 0,
        longitude: d[lngField.name] || 0,
        value: fieldWells.values?.fields[0] ? d[fieldWells.values.fields[0].name] : undefined,
        label: fieldWells.labels?.fields[0] ? d[fieldWells.labels.fields[0].name] : `Point ${index + 1}`,
        category: fieldWells.category?.fields[0] ? d[fieldWells.category.fields[0].name] : undefined
      }))

      return {
        title: config.showTitle !== false ? {
          text: config.title || 'Interactive Map',
        } : undefined,
        // Custom map configuration for our InteractiveMap component
        mapType: 'leaflet',
        mapData,
        mapConfig: {
          center: [config.centerLat || 51.505, config.centerLng || -0.09],
          zoom: config.zoom || 2,
          mapType: config.mapType || 'markers',
          showLegend: config.showLegend !== false,
          clusterMarkers: config.clusterMarkers || false
        }
      }
    }
  },

  // SMALL MULTIPLES
  {
    id: 'small-multiples',
    name: 'Small Multiples',
    category: 'custom',
    icon: '🔢',
    description: 'Multiple small charts for comparative analysis',
    chartType: 'small-multiples',
    fieldWells: {
      splitBy: { 
        label: 'Split By', 
        max: 1, 
        required: true, 
        accepts: ['dimension'], 
        fields: [] 
      },
      xAxis: { 
        label: 'X-Axis', 
        max: 1, 
        required: true, 
        accepts: ['dimension'], 
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
        label: 'Legend', 
        max: 1, 
        required: false, 
        accepts: ['dimension'], 
        fields: [] 
      }
    },
    properties: {
      showTitle: { type: 'boolean', label: 'Show Title', default: true },
      title: { type: 'text', label: 'Chart Title', default: '' },
      columns: { 
        type: 'slider', 
        label: 'Columns', 
        default: 3, 
        min: 1, 
        max: 6 
      },
      maxRows: { 
        type: 'slider', 
        label: 'Max Rows', 
        default: 4, 
        min: 1, 
        max: 8 
      },
      showIndividualTitles: { type: 'boolean', label: 'Show Individual Titles', default: true },
      syncScales: { type: 'boolean', label: 'Sync Scales', default: true },
      chartType: { 
        type: 'select', 
        label: 'Individual Chart Type', 
        default: 'column',
        options: ['column', 'line', 'area', 'bar']
      }
    },
    getEChartsOption: (data, fieldWells, config) => {
      const splitField = fieldWells.splitBy?.fields[0]
      const xField = fieldWells.xAxis?.fields[0]
      const yField = fieldWells.yAxis?.fields[0]
      
      if (!splitField || !xField || !yField) {
        return createEmptyOption('Small Multiples - add Split By, X-Axis, and Y-Axis fields')
      }

      return {
        title: config.showTitle !== false ? {
          text: config.title || 'Small Multiples',
        } : undefined,
        // Custom configuration for SmallMultiples component
        chartType: 'small-multiples',
        splitBy: splitField.name,
        baseVisualType: config.chartType || 'column',
        smallMultipleConfig: {
          id: `sm_${Date.now()}`,
          name: config.title || 'Small Multiples',
          splitBy: splitField.name,
          columns: config.columns || 3,
          maxRows: config.maxRows || 4,
          showTitle: config.showIndividualTitles !== false,
          syncScales: config.syncScales !== false
        }
      }
    }
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

// Map visual type IDs to standardized names for consistency
export const VISUAL_TYPE_MAPPING: { [key: string]: string } = {
  'column': 'column-chart',
  'bar': 'bar-chart', 
  'line': 'line-chart',
  'pie': 'pie-chart',
  'area': 'area-chart',
  'scatter': 'scatter-plot',
  'table': 'table',
  'card': 'card',
  'donut': 'donut-chart',
  'stacked-column': 'stacked-column-chart',
  'gauge': 'gauge-chart',
  'funnel': 'funnel-chart',
  'map': 'interactive-map',
  'interactive-map': 'interactive-map',
  'small-multiples': 'small-multiples',
  // Additional mappings
  'column-chart': 'column-chart',
  'bar-chart': 'bar-chart',
  'line-chart': 'line-chart',
  'pie-chart': 'pie-chart',
  'area-chart': 'area-chart',
  'scatter-plot': 'scatter-plot'
}