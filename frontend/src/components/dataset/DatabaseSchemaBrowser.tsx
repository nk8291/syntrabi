/**
 * Database Schema Browser Component
 * Displays tables grouped by schema with selection checkboxes
 * Power BI-style table selection interface
 */

import React, { useState, useEffect } from 'react'
import { CheckIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { datasetService } from '../../services/datasetService'

interface TableColumn {
  name: string
  type: string
  nullable?: boolean
}

interface Table {
  schema: string
  name: string
  type: string
  columns: TableColumn[]
  row_count?: number
}

interface DatabaseSchemaBrowserProps {
  connectorType: string
  connectionConfig: any
  onImport: (selectedTables: Array<{ schema: string; table: string }>) => void
  onCancel: () => void
}

const DatabaseSchemaBrowser: React.FC<DatabaseSchemaBrowserProps> = ({
  connectorType,
  connectionConfig,
  onImport,
  onCancel
}) => {
  const [tables, setTables] = useState<Table[]>([])
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSchema()
  }, [])

  const fetchSchema = async () => {
    try {
      setLoading(true)
      setError(null)

      // Call new backend endpoint
      const response = await datasetService.getDatabaseSchema(
        connectorType,
        connectionConfig
      )

      setTables(response.tables || [])
    } catch (err: any) {
      console.error('Failed to fetch schema:', err)
      setError(err.response?.data?.detail || err.message || 'Failed to fetch database schema')
    } finally {
      setLoading(false)
    }
  }

  const toggleTable = (schema: string, table: string) => {
    const key = `${schema}.${table}`
    const newSelected = new Set(selectedTables)

    if (newSelected.has(key)) {
      newSelected.delete(key)
    } else {
      newSelected.add(key)
    }

    setSelectedTables(newSelected)
  }

  const toggleSchema = (schema: string, schemaTables: Table[]) => {
    const newSelected = new Set(selectedTables)
    const schemaTableKeys = schemaTables.map(t => `${schema}.${t.name}`)

    // Check if all tables in schema are selected
    const allSelected = schemaTableKeys.every(key => newSelected.has(key))

    if (allSelected) {
      // Deselect all
      schemaTableKeys.forEach(key => newSelected.delete(key))
    } else {
      // Select all
      schemaTableKeys.forEach(key => newSelected.add(key))
    }

    setSelectedTables(newSelected)
  }

  const handleSelectAll = () => {
    const allKeys = tables.map(t => `${t.schema}.${t.name}`)
    setSelectedTables(new Set(allKeys))
  }

  const handleClearAll = () => {
    setSelectedTables(new Set())
  }

  const handleImport = () => {
    const selected = Array.from(selectedTables)
      .map(key => {
        const parts = key.split('.')
        if (parts.length === 2) {
          return { schema: parts[0], table: parts[1] }
        }
        return null
      })
      .filter((item): item is { schema: string; table: string } => item !== null)
    onImport(selected)
  }

  // Group tables by schema
  const schemaGroups = tables.reduce((acc, table) => {
    if (!acc[table.schema]) {
      acc[table.schema] = []
    }
    acc[table.schema]!.push(table)
    return acc
  }, {} as Record<string, Table[]>)

  // Filter by search
  const filteredSchemas = Object.entries(schemaGroups).filter(([schema, tables]) =>
    schema.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tables.some(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // Calculate total estimated rows
  const totalRows = Array.from(selectedTables).reduce((sum, key) => {
    const table = tables.find(t => `${t.schema}.${t.name}` === key)
    return sum + (table?.row_count ?? 0)
  }, 0)

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-6 border w-full max-w-4xl shadow-lg rounded-lg bg-white">
        <h2 className="text-2xl font-bold mb-4">Select Tables to Import</h2>

        {/* Search */}
        <div className="relative mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tables..."
            className="w-full px-4 py-2 pl-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
        </div>

        {/* Schema Groups */}
        <div className="max-h-96 overflow-y-auto border rounded-md p-4 bg-gray-50">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <div className="mt-2 text-gray-600">Loading schema...</div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-600 mb-2">Error loading schema</div>
              <div className="text-sm text-gray-600">{error}</div>
              <button
                onClick={fetchSchema}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : filteredSchemas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery ? 'No tables found matching your search' : 'No tables found in this database'}
            </div>
          ) : (
            filteredSchemas.map(([schema, schemaTables]) => {
              const schemaTableKeys = schemaTables.map(t => `${schema}.${t.name}`)
              const selectedCount = schemaTableKeys.filter(key => selectedTables.has(key)).length
              const allSelected = selectedCount === schemaTables.length

              return (
                <div key={schema} className="mb-6 bg-white rounded-md p-4 shadow-sm">
                  <div className="flex items-center mb-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => toggleSchema(schema, schemaTables)}
                      className="mr-3"
                    />
                    <h3 className="font-semibold text-lg flex-1">
                      {schema} ({schemaTables.length} table{schemaTables.length !== 1 ? 's' : ''})
                      {selectedCount > 0 && selectedCount < schemaTables.length && (
                        <span className="ml-2 text-sm text-blue-600">({selectedCount} selected)</span>
                      )}
                    </h3>
                  </div>
                  <div className="space-y-2 ml-6">
                    {schemaTables.map((table) => {
                      const key = `${table.schema}.${table.name}`
                      const isSelected = selectedTables.has(key)

                      return (
                        <label
                          key={key}
                          className={`flex items-center p-3 rounded cursor-pointer transition-colors ${
                            isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50 border border-transparent'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleTable(table.schema, table.name)}
                            className="mr-3"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{table.name}</div>
                            <div className="text-sm text-gray-500">
                              {table.columns.length} column{table.columns.length !== 1 ? 's' : ''}
                              {table.row_count !== undefined && table.row_count !== null && (
                                <> • ~{table.row_count.toLocaleString()} row{table.row_count !== 1 ? 's' : ''}</>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <CheckIcon className="w-5 h-5 text-blue-600" />
                          )}
                        </label>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Selection Summary */}
        <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
          <div className="flex justify-between items-center">
            <div className="text-sm text-blue-800">
              <strong>Selected:</strong> {selectedTables.size} table{selectedTables.size !== 1 ? 's' : ''}
              {totalRows > 0 && (
                <> • Est. {totalRows.toLocaleString()} row{totalRows !== 1 ? 's' : ''}</>
              )}
            </div>
            <div className="space-x-2">
              <button
                onClick={handleSelectAll}
                disabled={tables.length === 0}
                className="text-sm px-3 py-1 text-blue-600 hover:text-blue-800 disabled:text-gray-400"
              >
                Select All
              </button>
              <button
                onClick={handleClearAll}
                disabled={selectedTables.size === 0}
                className="text-sm px-3 py-1 text-blue-600 hover:text-blue-800 disabled:text-gray-400"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={selectedTables.size === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Import {selectedTables.size > 0 && `(${selectedTables.size})`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DatabaseSchemaBrowser
