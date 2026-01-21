/**
 * Table Selection Modal
 * Step 2 of database dataset creation:
 * - Fetch available tables from backend
 * - Allow user to select tables
 */

import React, { useEffect, useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { datasetService } from '@/services/datasetService'

interface TableInfo {
  schema: string
  name: string
  display_name: string
  row_count: number
  columns: any[]
}

interface Props {
  connectorType: string
  connectionConfig: any
  onConfirm: (tables: string[]) => void
  onClose: () => void
}

const TableSelectionModal: React.FC<Props> = ({
  connectorType,
  connectionConfig,
  onConfirm,
  onClose
}) => {
  const [tables, setTables] = useState<TableInfo[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTables()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchTables = async () => {
    try {
      setLoading(true)
      const res = await datasetService.getAvailableTables({
        connector_type: connectorType,
        config: connectionConfig
      })
      setTables(res.tables || [])
    } catch (e) {
      console.error(e)
      setError('Failed to load tables')
    } finally {
      setLoading(false)
    }
  }

  const toggleTable = (schema: string, name: string) => {
    const key = `${schema}.${name}`
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleConfirm = () => {
    if (selected.size === 0) return
    onConfirm(Array.from(selected))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Select Tables
            </h2>
            <p className="text-sm text-gray-600">
              Choose one or more tables to include in this dataset
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-auto max-h-[70vh]">
          {loading && (
            <div className="text-center text-gray-600">
              Loading tables...
            </div>
          )}

          {error && (
            <div className="text-center text-red-600">
              {error}
            </div>
          )}

          {!loading && !error && tables.length === 0 && (
            <div className="text-center text-gray-500">
              No tables found
            </div>
          )}

          {!loading && tables.length > 0 && (
            <table className="w-full border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 w-12"></th>
                  <th className="px-4 py-2 text-left">Table</th>
                  <th className="px-4 py-2 text-left">Schema</th>
                  <th className="px-4 py-2 text-right">Rows</th>
                </tr>
              </thead>
              <tbody>
                {tables.map(t => {
                  const key = `${t.schema}.${t.name}`
                  const checked = selected.has(key)

                  return (
                    <tr
                      key={key}
                      className="border-t hover:bg-gray-50"
                    >
                      <td className="px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTable(t.schema, t.name)}
                        />
                      </td>
                      <td className="px-4 py-2 font-medium">
                        {t.display_name}
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {t.schema}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-600">
                        {t.row_count.toLocaleString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t">
          <button
            onClick={onClose}
            className="btn btn-outline"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={selected.size === 0}
            className="btn btn-primary disabled:opacity-50"
          >
            Create Dataset
          </button>
        </div>

      </div>
    </div>
  )
}

export default TableSelectionModal
