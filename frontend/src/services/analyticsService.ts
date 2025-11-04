/**
 * Analytics Service
 * Advanced analytics functionality including table calculations and small multiples
 */

export interface TableCalculation {
  id: string
  name: string
  type: 'running_total' | 'percent_of_total' | 'difference' | 'percent_difference' | 'moving_average' | 'rank' | 'percentile'
  field: string
  partitionBy?: string[]
  orderBy?: { field: string; direction: 'asc' | 'desc' }[]
  windowSize?: number // for moving averages
}

export interface SmallMultipleConfig {
  id: string
  name: string
  splitBy: string // field to split the data by
  columns?: number // number of columns in the grid
  maxRows?: number // maximum number of rows
  showTitle?: boolean
  titleTemplate?: string // template for individual chart titles
  syncScales?: boolean // whether to sync scales across all multiples
}

export interface AnalyticsData {
  original: any[]
  calculated: any[]
  metadata: {
    calculations: TableCalculation[]
    totalRecords: number
    calculatedFields: string[]
  }
}

class AnalyticsService {
  /**
   * Apply table calculations to dataset
   */
  async applyTableCalculations(
    data: any[], 
    calculations: TableCalculation[]
  ): Promise<AnalyticsData> {
    try {
      let processedData = [...data]
      const calculatedFields: string[] = []

      for (const calculation of calculations) {
        processedData = this.applyCalculation(processedData, calculation)
        calculatedFields.push(`${calculation.name}_${calculation.type}`)
      }

      return {
        original: data,
        calculated: processedData,
        metadata: {
          calculations,
          totalRecords: processedData.length,
          calculatedFields
        }
      }
    } catch (error) {
      console.error('Error applying table calculations:', error)
      throw new Error('Failed to apply table calculations')
    }
  }

  /**
   * Apply a single table calculation
   */
  private applyCalculation(data: any[], calculation: TableCalculation): any[] {
    const { type, field, partitionBy, orderBy, windowSize } = calculation
    const calcFieldName = `${calculation.name}_${type}`

    // Sort data if orderBy is specified
    let sortedData = [...data]
    if (orderBy && orderBy.length > 0) {
      sortedData = this.sortData(sortedData, orderBy)
    }

    // Group data by partition fields if specified
    if (partitionBy && partitionBy.length > 0) {
      const groupedData = this.groupBy(sortedData, partitionBy)
      const result: any[] = []

      for (const group of groupedData) {
        const calculatedGroup = this.calculateWithinGroup(group.items, calculation, calcFieldName)
        result.push(...calculatedGroup)
      }

      return result
    } else {
      return this.calculateWithinGroup(sortedData, calculation, calcFieldName)
    }
  }

  /**
   * Calculate values within a single group
   */
  private calculateWithinGroup(data: any[], calculation: TableCalculation, calcFieldName: string): any[] {
    const { type, field, windowSize } = calculation

    switch (type) {
      case 'running_total':
        return this.calculateRunningTotal(data, field, calcFieldName)
      
      case 'percent_of_total':
        return this.calculatePercentOfTotal(data, field, calcFieldName)
      
      case 'difference':
        return this.calculateDifference(data, field, calcFieldName)
      
      case 'percent_difference':
        return this.calculatePercentDifference(data, field, calcFieldName)
      
      case 'moving_average':
        return this.calculateMovingAverage(data, field, calcFieldName, windowSize || 3)
      
      case 'rank':
        return this.calculateRank(data, field, calcFieldName)
      
      case 'percentile':
        return this.calculatePercentile(data, field, calcFieldName)
      
      default:
        return data.map(row => ({ ...row, [calcFieldName]: null }))
    }
  }

  /**
   * Calculate running total
   */
  private calculateRunningTotal(data: any[], field: string, calcFieldName: string): any[] {
    let runningTotal = 0
    return data.map(row => {
      runningTotal += (row[field] || 0)
      return { ...row, [calcFieldName]: runningTotal }
    })
  }

  /**
   * Calculate percent of total
   */
  private calculatePercentOfTotal(data: any[], field: string, calcFieldName: string): any[] {
    const total = data.reduce((sum, row) => sum + (row[field] || 0), 0)
    return data.map(row => ({
      ...row,
      [calcFieldName]: total === 0 ? 0 : ((row[field] || 0) / total) * 100
    }))
  }

  /**
   * Calculate difference from previous value
   */
  private calculateDifference(data: any[], field: string, calcFieldName: string): any[] {
    return data.map((row, index) => {
      const currentValue = row[field] || 0
      const previousValue = index > 0 ? (data[index - 1][field] || 0) : 0
      return { ...row, [calcFieldName]: index === 0 ? null : currentValue - previousValue }
    })
  }

  /**
   * Calculate percent difference from previous value
   */
  private calculatePercentDifference(data: any[], field: string, calcFieldName: string): any[] {
    return data.map((row, index) => {
      const currentValue = row[field] || 0
      const previousValue = index > 0 ? (data[index - 1][field] || 0) : 0
      
      if (index === 0 || previousValue === 0) {
        return { ...row, [calcFieldName]: null }
      }
      
      const percentChange = ((currentValue - previousValue) / Math.abs(previousValue)) * 100
      return { ...row, [calcFieldName]: percentChange }
    })
  }

  /**
   * Calculate moving average
   */
  private calculateMovingAverage(data: any[], field: string, calcFieldName: string, windowSize: number): any[] {
    return data.map((row, index) => {
      const start = Math.max(0, index - windowSize + 1)
      const end = index + 1
      const windowData = data.slice(start, end)
      const average = windowData.reduce((sum, r) => sum + (r[field] || 0), 0) / windowData.length
      return { ...row, [calcFieldName]: average }
    })
  }

  /**
   * Calculate rank (1-based)
   */
  private calculateRank(data: any[], field: string, calcFieldName: string): any[] {
    // Sort by field descending to get ranks
    const sortedData = [...data].sort((a, b) => (b[field] || 0) - (a[field] || 0))
    const rankMap = new Map<any, number>()
    
    sortedData.forEach((row, index) => {
      if (!rankMap.has(row)) {
        rankMap.set(row, index + 1)
      }
    })

    return data.map(row => ({
      ...row,
      [calcFieldName]: rankMap.get(row) || data.length
    }))
  }

  /**
   * Calculate percentile rank
   */
  private calculatePercentile(data: any[], field: string, calcFieldName: string): any[] {
    const values = data.map(row => row[field] || 0).sort((a, b) => a - b)
    
    return data.map(row => {
      const value = row[field] || 0
      const rank = values.findIndex(v => v >= value)
      const percentile = (rank / (values.length - 1)) * 100
      return { ...row, [calcFieldName]: percentile }
    })
  }

  /**
   * Generate small multiples data
   */
  async generateSmallMultiples(
    data: any[],
    config: SmallMultipleConfig
  ): Promise<{
    multiples: { key: string; data: any[]; title: string }[]
    layout: { columns: number; rows: number }
  }> {
    try {
      const { splitBy, columns = 3, maxRows = 4, showTitle = true, titleTemplate } = config

      // Group data by split field
      const grouped = this.groupBy(data, [splitBy])
      
      // Limit the number of groups based on maxRows * columns
      const maxGroups = maxRows * columns
      const limitedGroups = grouped.slice(0, maxGroups)

      const multiples = limitedGroups.map(group => ({
        key: group.key,
        data: group.items,
        title: showTitle 
          ? (titleTemplate || `${splitBy}: ${group.key}`)
          : ''
      }))

      const actualRows = Math.ceil(multiples.length / columns)

      return {
        multiples,
        layout: {
          columns,
          rows: Math.min(actualRows, maxRows)
        }
      }
    } catch (error) {
      console.error('Error generating small multiples:', error)
      throw new Error('Failed to generate small multiples')
    }
  }

  /**
   * Utility: Group data by specified fields
   */
  private groupBy(data: any[], fields: string[]): { key: string; items: any[] }[] {
    const groups = new Map<string, any[]>()

    data.forEach(row => {
      const key = fields.map(field => row[field] || '').join('|')
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(row)
    })

    return Array.from(groups.entries()).map(([key, items]) => ({
      key: fields.length === 1 ? key : key.split('|').join(', '),
      items
    }))
  }

  /**
   * Utility: Sort data by multiple fields
   */
  private sortData(data: any[], orderBy: { field: string; direction: 'asc' | 'desc' }[]): any[] {
    return [...data].sort((a, b) => {
      for (const sort of orderBy) {
        const aVal = a[sort.field] || 0
        const bVal = b[sort.field] || 0
        
        let comparison = 0
        if (aVal > bVal) comparison = 1
        else if (aVal < bVal) comparison = -1
        
        if (sort.direction === 'desc') comparison *= -1
        
        if (comparison !== 0) return comparison
      }
      return 0
    })
  }

  /**
   * Get available calculation types
   */
  getCalculationTypes(): { type: string; label: string; description: string }[] {
    return [
      {
        type: 'running_total',
        label: 'Running Total',
        description: 'Cumulative sum of values'
      },
      {
        type: 'percent_of_total',
        label: 'Percent of Total',
        description: 'Percentage each value represents of the total'
      },
      {
        type: 'difference',
        label: 'Difference',
        description: 'Difference from previous value'
      },
      {
        type: 'percent_difference',
        label: 'Percent Difference',
        description: 'Percent change from previous value'
      },
      {
        type: 'moving_average',
        label: 'Moving Average',
        description: 'Average over a sliding window'
      },
      {
        type: 'rank',
        label: 'Rank',
        description: 'Rank values from highest to lowest'
      },
      {
        type: 'percentile',
        label: 'Percentile',
        description: 'Percentile rank of each value'
      }
    ]
  }

  /**
   * Validate calculation configuration
   */
  validateCalculation(calculation: TableCalculation, dataFields: string[]): string[] {
    const errors: string[] = []

    if (!calculation.name?.trim()) {
      errors.push('Calculation name is required')
    }

    if (!calculation.field || !dataFields.includes(calculation.field)) {
      errors.push('Valid field is required')
    }

    if (calculation.type === 'moving_average') {
      if (!calculation.windowSize || calculation.windowSize < 1) {
        errors.push('Window size must be greater than 0 for moving average')
      }
    }

    return errors
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService()
export default analyticsService