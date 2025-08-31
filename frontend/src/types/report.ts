/**
 * Report and visualization related type definitions
 */

export interface Report {
  id: string
  workspace_id: string
  owner_id: string
  dataset_id?: string
  name: string
  description?: string
  report_json: ReportDefinition
  version: number
  is_published: boolean
  is_public: boolean
  allow_embedding: boolean
  thumbnail_url?: string
  last_snapshot?: string
  created_at?: string
  updated_at?: string
  published_at?: string
}

export interface ReportDefinition {
  pages: ReportPage[]
  theme?: ReportTheme
  variables?: ReportVariable[]
  filters?: ReportFilter[]
}

export interface ReportPage {
  id: string
  name: string
  width?: number
  height?: number
  background?: string
  visuals: Visual[]
  filters?: ReportFilter[]
}

export interface Visual {
  id: string
  type: VisualType
  title?: string
  position: {
    x: number
    y: number
    width: number
    height: number
  }
  data_binding: DataBinding
  config: VisualConfig
  interactions?: VisualInteraction[]
}

export type VisualType = 
  // Basic Charts
  | 'bar' 
  | 'column'
  | 'stacked_column'
  | '100_stacked_column'
  | 'clustered_column'
  | 'stacked_bar'
  | '100_stacked_bar'
  | 'clustered_bar'
  | 'line' 
  | 'area' 
  | 'stacked_area'
  | '100_stacked_area'
  | 'pie' 
  | 'donut'
  | 'scatter'
  | 'bubble'
  // Advanced Charts
  | 'waterfall'
  | 'funnel'
  | 'treemap'
  | 'sunburst'
  | 'combo'
  | 'ribbon'
  | 'decomposition_tree'
  | 'key_influencers'
  // Data Display
  | 'table' 
  | 'matrix' 
  | 'card' 
  | 'multi_row_card'
  | 'kpi'
  | 'gauge' 
  | 'slicer'
  // Maps & Geographic
  | 'map'
  | 'filled_map'
  | 'arcgis_map'
  | 'shape_map'
  // Analytics
  | 'Q&A'
  | 'smart_narrative'
  | 'paginated_report'
  // Custom Elements
  | 'text_box'
  | 'image'
  | 'button'
  | 'shape'

export interface DataBinding {
  dataset_id: string
  fields: FieldMapping[]
  filters?: DataFilter[]
}

export interface FieldMapping {
  role: FieldRole
  field: string
  aggregation?: AggregationType
  sort?: SortConfig
}

export type FieldRole = 'x' | 'y' | 'color' | 'size' | 'detail' | 'tooltip' | 'label'

export type AggregationType = 'sum' | 'count' | 'avg' | 'min' | 'max' | 'first' | 'last'

export interface SortConfig {
  direction: 'asc' | 'desc'
  by?: 'field' | 'value'
}

export interface DataFilter {
  field: string
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'not_in' | 'contains' | 'starts_with' | 'ends_with'
  value: any
  condition?: 'and' | 'or'
}

export interface VisualConfig {
  name?: string
  colors?: string[]
  legend?: LegendConfig
  axes?: AxesConfig
  formatting?: FormattingConfig
  fieldWells?: FieldWells
  interactions?: InteractionConfig
  tooltip?: TooltipConfig
  dataLabels?: DataLabelsConfig
  [key: string]: any
}

export interface FieldWells {
  axis?: any[]
  values?: any[]
  legend?: any[]
  details?: any[]
  xaxis?: any[]
  yaxis?: any[]
  size?: any[]
  color?: any[]
  tooltips?: any[]
  [key: string]: any[]
}

export interface InteractionConfig {
  crossFilter?: boolean
  crossHighlight?: boolean
  drillThrough?: boolean
  tooltip?: boolean
}

export interface TooltipConfig {
  show?: boolean
  fields?: string[]
  reportPage?: string
}

export interface DataLabelsConfig {
  show?: boolean
  position?: 'inside' | 'outside' | 'center'
  fontSize?: number
  fontColor?: string
  showCategory?: boolean
  showValue?: boolean
  showPercent?: boolean
}

export interface LegendConfig {
  show: boolean
  position: 'top' | 'bottom' | 'left' | 'right'
  title?: string
}

export interface AxesConfig {
  x?: AxisConfig
  y?: AxisConfig
}

export interface AxisConfig {
  show: boolean
  title?: string
  format?: string
  scale?: 'linear' | 'log' | 'category'
  min?: number
  max?: number
}

export interface FormattingConfig {
  number_format?: string
  date_format?: string
  currency?: string
  decimal_places?: number
  font_family?: string
  font_size?: number
  font_color?: string
  background_color?: string
  border_color?: string
  border_width?: number
  padding?: number
  margin?: number
}

export interface VisualInteraction {
  type: 'filter' | 'highlight' | 'drill' | 'navigate'
  target?: string
  config: Record<string, any>
}

export interface ReportTheme {
  name: string
  colors: {
    background: string
    foreground: string
    accent: string
    data_colors: string[]
  }
  fonts: {
    heading: string
    body: string
  }
}

export interface ReportVariable {
  id: string
  name: string
  type: 'text' | 'number' | 'date' | 'boolean' | 'list'
  default_value: any
  allowed_values?: any[]
}

export interface ReportFilter {
  id: string
  field: string
  type: 'basic' | 'advanced' | 'relative_date'
  operator: string
  value: any
  applies_to: string[] // Visual IDs
}

export interface VegaLiteSpec {
  $schema: string
  data: any
  mark: any
  encoding: any
  width?: number
  height?: number
  [key: string]: any
}

export interface RenderRequest {
  format?: 'vega_lite' | 'png' | 'svg'
  width?: number
  height?: number
}

export interface RenderResponse {
  vega_lite_spec: VegaLiteSpec
  data_url?: string
}