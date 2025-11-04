/**
 * Table Calculations Component
 * UI for managing and applying table calculations to data
 */

import React, { useState } from 'react'
import { 
  PlusIcon, 
  XMarkIcon, 
  FunctionSquareIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline'
import { TableCalculation, analyticsService } from '@/services/analyticsService'

interface TableCalculationsProps {
  dataFields: string[]
  calculations: TableCalculation[]
  onCalculationsChange: (calculations: TableCalculation[]) => void
  onPreview?: (calculation: TableCalculation) => void
}

const TableCalculations: React.FC<TableCalculationsProps> = ({
  dataFields,
  calculations,
  onCalculationsChange,
  onPreview
}) => {
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newCalculation, setNewCalculation] = useState<Partial<TableCalculation>>({
    name: '',
    type: 'running_total',
    field: dataFields[0] || '',
    windowSize: 3
  })

  const calculationTypes = analyticsService.getCalculationTypes()

  const handleAdd = () => {
    if (!newCalculation.name?.trim() || !newCalculation.field || !newCalculation.type) {
      return
    }

    const calculation: TableCalculation = {
      id: `calc_${Date.now()}`,
      name: newCalculation.name,
      type: newCalculation.type as any,
      field: newCalculation.field,
      windowSize: newCalculation.windowSize,
      partitionBy: newCalculation.partitionBy || [],
      orderBy: newCalculation.orderBy || []
    }

    // Validate calculation
    const errors = analyticsService.validateCalculation(calculation, dataFields)
    if (errors.length > 0) {
      alert('Validation errors:\n' + errors.join('\n'))
      return
    }

    onCalculationsChange([...calculations, calculation])
    
    // Reset form
    setNewCalculation({
      name: '',
      type: 'running_total',
      field: dataFields[0] || '',
      windowSize: 3
    })
    setIsAdding(false)
  }

  const handleRemove = (id: string) => {
    onCalculationsChange(calculations.filter(calc => calc.id !== id))
  }

  const handleEdit = (calculation: TableCalculation) => {
    setNewCalculation(calculation)
    setEditingId(calculation.id)
    setIsAdding(true)
  }

  const handleUpdate = () => {
    if (!editingId) return

    const updatedCalculations = calculations.map(calc => 
      calc.id === editingId 
        ? { ...calc, ...newCalculation } as TableCalculation
        : calc
    )
    
    onCalculationsChange(updatedCalculations)
    setEditingId(null)
    setIsAdding(false)
    setNewCalculation({
      name: '',
      type: 'running_total',
      field: dataFields[0] || '',
      windowSize: 3
    })
  }

  const getCalculationIcon = (type: string) => {
    switch (type) {
      case 'running_total':
        return <ArrowTrendingUpIcon className="h-4 w-4" />
      case 'percent_of_total':
        return <ChartBarIcon className="h-4 w-4" />
      default:
        return <FunctionSquareIcon className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Table Calculations</h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="btn btn-primary btn-sm flex items-center gap-2"
        >
          <PlusIcon className="h-4 w-4" />
          Add Calculation
        </button>
      </div>

      {/* Existing Calculations */}
      <div className="space-y-2">
        {calculations.map((calculation) => (
          <div
            key={calculation.id}
            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50"
          >
            <div className="flex items-center space-x-3">
              <div className="text-blue-600">
                {getCalculationIcon(calculation.type)}
              </div>
              <div>
                <div className="font-medium text-gray-900">
                  {calculation.name}
                </div>
                <div className="text-sm text-gray-600">
                  {calculationTypes.find(t => t.type === calculation.type)?.label} 
                  {' on '} 
                  <span className="font-medium">{calculation.field}</span>
                  {calculation.windowSize && calculation.type === 'moving_average' && 
                    ` (${calculation.windowSize} period window)`
                  }
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {onPreview && (
                <button
                  onClick={() => onPreview(calculation)}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  Preview
                </button>
              )}
              <button
                onClick={() => handleEdit(calculation)}
                className="text-gray-600 hover:text-blue-600 text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => handleRemove(calculation.id)}
                className="text-red-600 hover:text-red-700"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Form */}
      {isAdding && (
        <div className="border border-gray-300 rounded-lg p-4 bg-white">
          <h4 className="font-semibold text-gray-900 mb-4">
            {editingId ? 'Edit' : 'Add'} Table Calculation
          </h4>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Calculation Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={newCalculation.name || ''}
                onChange={(e) => setNewCalculation({
                  ...newCalculation,
                  name: e.target.value
                })}
                className="input w-full"
                placeholder="e.g., Running Sales Total"
              />
            </div>

            {/* Calculation Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={newCalculation.type || ''}
                onChange={(e) => setNewCalculation({
                  ...newCalculation,
                  type: e.target.value as any
                })}
                className="input w-full"
              >
                {calculationTypes.map((type) => (
                  <option key={type.type} value={type.type}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Field
              </label>
              <select
                value={newCalculation.field || ''}
                onChange={(e) => setNewCalculation({
                  ...newCalculation,
                  field: e.target.value
                })}
                className="input w-full"
              >
                {dataFields.map((field) => (
                  <option key={field} value={field}>
                    {field}
                  </option>
                ))}
              </select>
            </div>

            {/* Window Size (for moving average) */}
            {newCalculation.type === 'moving_average' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Window Size
                </label>
                <input
                  type="number"
                  min="1"
                  value={newCalculation.windowSize || 3}
                  onChange={(e) => setNewCalculation({
                    ...newCalculation,
                    windowSize: parseInt(e.target.value) || 3
                  })}
                  className="input w-full"
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div className="mt-4">
            <div className="text-sm text-gray-600">
              {calculationTypes.find(t => t.type === newCalculation.type)?.description}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => {
                setIsAdding(false)
                setEditingId(null)
                setNewCalculation({
                  name: '',
                  type: 'running_total',
                  field: dataFields[0] || '',
                  windowSize: 3
                })
              }}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={editingId ? handleUpdate : handleAdd}
              className="btn btn-primary"
            >
              {editingId ? 'Update' : 'Add'} Calculation
            </button>
          </div>
        </div>
      )}

      {/* Info */}
      {calculations.length === 0 && !isAdding && (
        <div className="text-center py-8 text-gray-500">
          <FunctionSquareIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-sm">No table calculations defined</p>
          <p className="text-xs mt-1">Add calculations to derive new insights from your data</p>
        </div>
      )}
    </div>
  )
}

export default TableCalculations