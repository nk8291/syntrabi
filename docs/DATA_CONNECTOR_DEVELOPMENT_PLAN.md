# Data Connector End-to-End Development Plan

**Date:** December 31, 2024
**Scope:** Phase 1 Implementation - Power BI-Style Import Mode
**Status:** Development Plan

---

## Table of Contents
1. [Overview](#overview)
2. [Current State Analysis](#current-state-analysis)
3. [User Flow Design](#user-flow-design)
4. [Technical Implementation Plan](#technical-implementation-plan)
5. [Database Import Strategy](#database-import-strategy)
6. [File Upload Strategy](#file-upload-strategy)
7. [Development Roadmap](#development-roadmap)
8. [API Specifications](#api-specifications)
9. [Testing Strategy](#testing-strategy)

---

## 1. Overview

### 1.1 Goal
Implement a complete data connector workflow that mimics Power BI's import mode, allowing users to:
- Select and configure data connectors (files or databases)
- Test database connections before importing
- Preview file data before importing
- Browse database schemas and select tables
- Import data for use in reports

### 1.2 Target User Flow (Power BI Style)

```
┌─────────────────┐
│  Get Data       │
│  (Select Source)│
└────────┬────────┘
         │
    ┌────▼─────────────────────────┐
    │   File Source?               │
    └────┬─────────────────┬───────┘
         │                 │
    YES  │                 │  NO (Database)
         │                 │
    ┌────▼────────┐   ┌────▼──────────┐
    │ File Upload │   │ Configure DB   │
    │ + Preview   │   │ Connection     │
    └────┬────────┘   └────┬──────────┘
         │                 │
         │            ┌────▼──────────┐
         │            │ Test Connection│
         │            └────┬──────────┘
         │                 │
         │            ┌────▼──────────┐
         │            │ Select Tables  │
         │            │ (by Schema)    │
         │            └────┬──────────┘
         │                 │
    ┌────▼─────────────────▼──────────┐
    │  Import Data (Process & Store)   │
    └────┬─────────────────────────────┘
         │
    ┌────▼──────────┐
    │ Dataset Ready  │
    │ (Use in Report)│
    └────────────────┘
```

---

## 2. Current State Analysis

### 2.1 What Already Exists ✅

#### Backend Components
1. **Data Connectors** (`backend/app/services/data_connectors.py`)
   - ✅ PostgreSQLConnector - Full implementation with async
   - ✅ MySQLConnector - Full implementation
   - ✅ MariaDBConnector - Inherits from MySQL
   - ✅ CSVFileConnector - Full implementation
   - ✅ ExcelConnector - Full implementation
   - ✅ JSONConnector - Full implementation
   - ✅ PDFConnector - Full implementation

2. **Connector Methods** (All connectors implement)
   - ✅ `test_connection()` - Returns (success, message)
   - ✅ `get_schema()` - Returns tables/columns structure
   - ✅ `execute_query()` - Executes queries with limit
   - ✅ `get_sample_data()` - Returns preview rows

3. **API Routes** (`backend/app/routes/datasets.py`)
   - ✅ `POST /api/datasets/connectors/test` - Test connection
   - ✅ `POST /api/datasets/workspaces/{id}/datasets` - Create dataset
   - ✅ `GET /api/datasets/{id}/preview` - Get sample data
   - ✅ `DELETE /api/datasets/{id}` - Delete dataset

4. **Dataset Service** (`backend/app/services/dataset_service.py`)
   - ✅ `create_dataset()` - Creates and processes dataset
   - ✅ `_process_csv_data()` - CSV processing
   - ⚠️ Database import - **Partial** (creates dataset but doesn't import data)

#### Frontend Components
1. **DataSourceConnector** (`frontend/src/components/designer/DataSourceConnector.tsx`)
   - ✅ Source selection UI (7 connectors)
   - ✅ File upload with drag-and-drop
   - ✅ Database connection form
   - ✅ Test connection button
   - ⚠️ **Missing:** Table selection after successful test
   - ⚠️ **Missing:** File preview before import

2. **DatabaseConnectionModal** (`frontend/src/components/dataset/DatabaseConnectionModal.tsx`)
   - ✅ Database template selection
   - ✅ Connection testing
   - ✅ Create dataset after test
   - ⚠️ **Missing:** Schema/table browser
   - ⚠️ **Missing:** Table selection UI

3. **Dataset Service** (`frontend/src/services/datasetService.ts`)
   - ✅ `uploadDataset()` - File upload
   - ✅ `createDatabaseDataset()` - Database connection
   - ✅ `testConnection()` - Connection testing
   - ⚠️ **Missing:** Get schema endpoint call
   - ⚠️ **Missing:** Import selected tables

### 2.2 What Needs to Be Built 🔨

#### Critical Missing Features
1. **Database Schema Browser** (Frontend)
   - Component to display tables grouped by schema
   - Checkbox selection for tables
   - Search/filter functionality

2. **Database Import Logic** (Backend)
   - Import selected tables into storage (MinIO + PostgreSQL)
   - Data type mapping
   - Progress tracking

3. **File Preview** (Frontend)
   - CSV/Excel/JSON preview before import
   - Column detection display
   - Data type inference display

4. **Import Progress Tracking** (Full Stack)
   - WebSocket or polling for progress updates
   - Cancel import functionality
   - Error handling during import

---

## 3. User Flow Design

### 3.1 Database Connector Flow (Detailed)

#### Step 1: Select Database Connector
**UI Component:** `DataSourceConnector.tsx`

```
┌──────────────────────────────────────┐
│  Get Data                             │
├──────────────────────────────────────┤
│  [All] [File] [Database]              │
│                                        │
│  ┌──────┐  ┌──────┐  ┌──────┐       │
│  │ 🐘   │  │ 🐬   │  │ 🦭   │       │
│  │ PG   │  │ MySQL│  │ Maria│       │
│  └──────┘  └──────┘  └──────┘       │
└──────────────────────────────────────┘
```

**User Action:** Click PostgreSQL
**Result:** Navigate to connection configuration

---

#### Step 2: Configure Database Connection
**UI Component:** `DatabaseConnectionModal.tsx` (existing)

```
┌──────────────────────────────────────┐
│  Connect to PostgreSQL               │
├──────────────────────────────────────┤
│  Connection Name: [My Database    ]  │
│  Host: [localhost              ]     │
│  Port: [5432]                        │
│  Database: [myapp              ]     │
│  Username: [admin              ]     │
│  Password: [••••••             ]     │
│  [ ] Enable SSL/TLS                  │
│                                       │
│  [Test Connection]  [Cancel] [Next]  │
└──────────────────────────────────────┘
```

**User Action:** Fill form and click "Test Connection"
**Backend Call:** `POST /api/datasets/connectors/test`
**Backend Action:**
```python
# In data_connectors.py
connector = PostgreSQLConnector(config)
success, message = await connector.test_connection()
# Returns: {"success": true, "message": "Connection successful"}
```

**Result:**
- ✅ Success: Enable "Next" button
- ❌ Failure: Show error message

---

#### Step 3: Browse Database Schema (NEW COMPONENT NEEDED)
**UI Component:** `DatabaseSchemaBrowser.tsx` (TO BE CREATED)

```
┌──────────────────────────────────────────────┐
│  Select Tables to Import                      │
├──────────────────────────────────────────────┤
│  Database: myapp                              │
│  [Search tables...]                           │
│                                                │
│  ┌ public (5 tables)                          │
│  │ ☑ users (15 columns, ~1.2M rows)          │
│  │ ☑ orders (12 columns, ~850K rows)         │
│  │ ☐ order_items (8 columns, ~3.5M rows)     │
│  │ ☐ products (20 columns, ~50K rows)        │
│  │ ☐ categories (5 columns, ~200 rows)       │
│  └                                             │
│  ┌ sales (3 tables)                           │
│  │ ☑ transactions (25 columns, ~2M rows)     │
│  │ ☐ refunds (10 columns, ~50K rows)         │
│  │ ☐ invoices (15 columns, ~800K rows)       │
│  └                                             │
│                                                │
│  Selected: 3 tables, Est. size: ~4.05M rows   │
│  [Select All] [Clear]  [Cancel] [Import]      │
└──────────────────────────────────────────────┘
```

**User Action:** Select tables and click "Import"
**Backend Call:** `POST /api/datasets/workspaces/{id}/import-database`
**Payload:**
```json
{
  "name": "My Database",
  "connector_type": "postgresql",
  "connection_config": {...},
  "selected_tables": [
    {"schema": "public", "table": "users"},
    {"schema": "public", "table": "orders"},
    {"schema": "sales", "table": "transactions"}
  ]
}
```

---

#### Step 4: Import Data (Background Process)
**Backend Process:** Data import service

**Import Strategy (Power BI Style):**
```python
async def import_database_tables(
    workspace_id: str,
    connector_type: ConnectorType,
    connection_config: dict,
    selected_tables: List[dict]
) -> Dataset:
    """
    Import selected database tables into local storage
    """
    # 1. Create dataset record
    dataset = create_dataset_record(workspace_id, connector_type, config)

    # 2. For each selected table:
    for table_info in selected_tables:
        schema = table_info['schema']
        table = table_info['table']

        # 3. Extract table data
        connector = create_connector(connector_type, connection_config)
        data = await connector.execute_query(
            f"SELECT * FROM {schema}.{table}",
            limit=None  # Import all data
        )

        # 4. Store in MinIO as Parquet (efficient columnar format)
        file_path = f"{workspace_id}/{dataset.id}/{schema}.{table}.parquet"
        store_as_parquet(data, file_path)

        # 5. Store metadata in PostgreSQL
        store_table_metadata(dataset.id, schema, table, data['columns'])

    # 6. Mark dataset as ready
    dataset.status = 'ready'
    return dataset
```

**Progress Tracking:**
```
┌──────────────────────────────────────┐
│  Importing Database Tables...         │
├──────────────────────────────────────┤
│  ✓ public.users (1.2M rows)           │
│  ⏳ public.orders (425K/850K rows)    │
│  ⏸ sales.transactions (pending)       │
│                                        │
│  [████████░░░░░░░░░░] 55%             │
│  Estimated time: 2 minutes            │
│                                        │
│  [Cancel Import]                      │
└──────────────────────────────────────┘
```

---

### 3.2 File Connector Flow (Detailed)

#### Step 1: Select File Connector
**UI Component:** `DataSourceConnector.tsx`

```
┌──────────────────────────────────────┐
│  Get Data                             │
├──────────────────────────────────────┤
│  [All] [File] [Database]              │
│                                        │
│  ┌──────┐  ┌──────┐  ┌──────┐       │
│  │ 📄   │  │ 📊   │  │ 📋   │       │
│  │ CSV  │  │ Excel│  │ JSON │       │
│  └──────┘  └──────┘  └──────┘       │
└──────────────────────────────────────┘
```

**User Action:** Click CSV
**Result:** Show file upload dialog

---

#### Step 2: Upload File with Preview (ENHANCED)
**UI Component:** `DataSourceConnector.tsx` (enhanced)

```
┌──────────────────────────────────────────────┐
│  Upload CSV File                              │
├──────────────────────────────────────────────┤
│  ┌──────────────────────────────────────┐   │
│  │  📁 Drag and drop or click to upload │   │
│  │                                        │   │
│  │  Selected: sales_data.csv (2.5 MB)   │   │
│  └──────────────────────────────────────┘   │
│                                                │
│  Preview (first 5 rows):                      │
│  ┌────────────────────────────────────┐      │
│  │ Date       │Product│ Quantity│Price│      │
│  ├────────────────────────────────────┤      │
│  │ 2024-01-01│Widget │    100  │12.99│      │
│  │ 2024-01-02│Gadget │     50  │24.50│      │
│  │ 2024-01-03│Tool   │     75  │18.25│      │
│  │ ...                                 │      │
│  └────────────────────────────────────┘      │
│                                                │
│  Detected Schema:                             │
│  • Date (datetime) ✓                          │
│  • Product (string) ✓                         │
│  • Quantity (integer) ✓                       │
│  • Price (number) ✓                           │
│                                                │
│  Total Rows: 1,245                            │
│  [Cancel]  [Import]                           │
└──────────────────────────────────────────────┘
```

**User Action:** Upload file
**Frontend Processing:**
```typescript
// Parse file locally for preview
const parseFilePreview = async (file: File) => {
  if (file.type === 'text/csv') {
    const text = await file.text()
    const parsed = Papa.parse(text, {
      header: true,
      preview: 5  // Only parse first 5 rows
    })
    return {
      headers: parsed.meta.fields,
      rows: parsed.data,
      totalRows: estimateRowCount(file.size)
    }
  }
  // Similar for Excel, JSON
}
```

**User Action:** Click "Import"
**Backend Call:** `POST /api/datasets/workspaces/{id}/datasets`
**Payload:** FormData with file

---

#### Step 3: Process File Import
**Backend Process:** `DatasetService._process_csv_data()`

```python
async def _process_csv_data(file_path: str) -> dict:
    """
    Process uploaded CSV file
    """
    # 1. Read CSV with pandas
    df = pd.read_csv(file_path)

    # 2. Infer column types
    schema = {
        "columns": [
            {
                "name": col,
                "type": infer_type(df[col]),
                "nullable": df[col].isnull().any()
            }
            for col in df.columns
        ]
    }

    # 3. Extract sample rows (first 100)
    sample_rows = df.head(100).to_dict('records')

    # 4. Store full data in MinIO as Parquet
    parquet_path = f"{workspace_id}/{dataset_id}/data.parquet"
    df.to_parquet(parquet_path)

    # 5. Return metadata
    return {
        "schema": schema,
        "sample_rows": sample_rows,
        "row_count": len(df),
        "file_size": os.path.getsize(file_path)
    }
```

---

## 4. Technical Implementation Plan

### 4.1 Backend Implementation Tasks

#### Task 1: Enhance Database Import API
**File:** `backend/app/routes/datasets.py`

**New Endpoint:**
```python
@router.post("/connectors/{connector_type}/schema")
async def get_database_schema(
    connector_type: str,
    config: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """
    Get database schema (tables grouped by schema) after successful connection test
    """
    connector_enum = ConnectorType(connector_type)
    connector = DataConnectorFactory.create_connector(connector_enum, config)

    # Get schema with table metadata
    schema = await connector.get_schema()

    # Enhance with row counts (optional, can be slow)
    # for table in schema['tables']:
    #     row_count = await connector.get_row_count(table['name'])
    #     table['row_count'] = row_count

    return schema
```

**New Endpoint:**
```python
@router.post("/workspaces/{workspace_id}/import-database")
async def import_database_tables(
    workspace_id: str,
    request: DatabaseImportRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """
    Import selected database tables into local storage
    """
    # Create dataset record
    dataset = await DatasetService.create_dataset(
        session,
        workspace_id,
        request.name,
        request.connector_type,
        request.connection_config
    )

    # Start background import task
    background_tasks.add_task(
        import_tables_background,
        dataset.id,
        request.connector_type,
        request.connection_config,
        request.selected_tables
    )

    return dataset

class DatabaseImportRequest(BaseModel):
    name: str
    connector_type: str
    connection_config: Dict[str, Any]
    selected_tables: List[Dict[str, str]]  # [{"schema": "public", "table": "users"}]
```

---

#### Task 2: Implement Data Import Service
**File:** `backend/app/services/import_service.py` (NEW)

```python
"""
Data import service for database and file connectors
"""
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
from typing import List, Dict, Any
import structlog

logger = structlog.get_logger()

class DataImportService:
    """Service for importing data from various sources"""

    @staticmethod
    async def import_database_table(
        connector: DataSourceConnector,
        schema: str,
        table: str,
        workspace_id: str,
        dataset_id: str,
        s3_client: Any
    ) -> Dict[str, Any]:
        """
        Import a single database table

        Returns:
            {
                "schema": str,
                "table": str,
                "rows_imported": int,
                "file_path": str,
                "columns": List[dict]
            }
        """
        logger.info(f"Importing table {schema}.{table}")

        # 1. Fetch all data from table
        query = f"SELECT * FROM {schema}.{table}"
        result = await connector.execute_query(query, limit=None)

        # 2. Convert to DataFrame
        df = pd.DataFrame(result['data'])

        # 3. Store as Parquet in MinIO
        file_path = f"{workspace_id}/{dataset_id}/{schema}.{table}.parquet"
        parquet_buffer = df.to_parquet()

        s3_client.put_object(
            Bucket=settings.S3_BUCKET,
            Key=file_path,
            Body=parquet_buffer
        )

        # 4. Extract metadata
        return {
            "schema": schema,
            "table": table,
            "rows_imported": len(df),
            "file_path": file_path,
            "columns": result['columns']
        }

    @staticmethod
    async def import_csv_file(
        file_path: str,
        workspace_id: str,
        dataset_id: str,
        s3_client: Any
    ) -> Dict[str, Any]:
        """
        Import CSV file with type inference
        """
        # Read CSV
        df = pd.read_csv(file_path)

        # Infer types
        schema = DataImportService._infer_schema(df)

        # Convert to Parquet
        parquet_path = f"{workspace_id}/{dataset_id}/data.parquet"
        parquet_buffer = df.to_parquet()

        s3_client.put_object(
            Bucket=settings.S3_BUCKET,
            Key=parquet_path,
            Body=parquet_buffer
        )

        return {
            "schema": schema,
            "row_count": len(df),
            "file_path": parquet_path,
            "sample_rows": df.head(100).to_dict('records')
        }

    @staticmethod
    def _infer_schema(df: pd.DataFrame) -> Dict[str, Any]:
        """Infer schema from DataFrame"""
        return {
            "columns": [
                {
                    "name": col,
                    "type": DataImportService._pandas_to_syntra_type(df[col].dtype),
                    "nullable": df[col].isnull().any()
                }
                for col in df.columns
            ]
        }

    @staticmethod
    def _pandas_to_syntra_type(dtype) -> str:
        """Convert pandas dtype to Syntra type"""
        if pd.api.types.is_integer_dtype(dtype):
            return 'integer'
        elif pd.api.types.is_float_dtype(dtype):
            return 'number'
        elif pd.api.types.is_bool_dtype(dtype):
            return 'boolean'
        elif pd.api.types.is_datetime64_any_dtype(dtype):
            return 'datetime'
        else:
            return 'string'
```

---

### 4.2 Frontend Implementation Tasks

#### Task 1: Create Database Schema Browser Component
**File:** `frontend/src/components/dataset/DatabaseSchemaBrowser.tsx` (NEW)

```typescript
/**
 * Database Schema Browser Component
 * Displays tables grouped by schema with selection checkboxes
 */

import React, { useState, useEffect } from 'react'
import { CheckIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

interface Table {
  schema: string
  name: string
  type: string
  columns: Array<{ name: string; type: string }>
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

  useEffect(() => {
    fetchSchema()
  }, [])

  const fetchSchema = async () => {
    try {
      // Call new backend endpoint
      const response = await datasetService.getDatabaseSchema(
        connectorType,
        connectionConfig
      )
      setTables(response.tables)
    } catch (error) {
      console.error('Failed to fetch schema:', error)
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

  const handleImport = () => {
    const selected = Array.from(selectedTables).map(key => {
      const [schema, table] = key.split('.')
      return { schema, table }
    })
    onImport(selected)
  }

  // Group tables by schema
  const schemaGroups = tables.reduce((acc, table) => {
    if (!acc[table.schema]) {
      acc[table.schema] = []
    }
    acc[table.schema].push(table)
    return acc
  }, {} as Record<string, Table[]>)

  // Filter by search
  const filteredSchemas = Object.entries(schemaGroups).filter(([schema, tables]) =>
    schema.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tables.some(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

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
            className="w-full px-4 py-2 pl-10 border rounded-md"
          />
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
        </div>

        {/* Schema Groups */}
        <div className="max-h-96 overflow-y-auto border rounded-md p-4">
          {loading ? (
            <div className="text-center py-8">Loading schema...</div>
          ) : (
            filteredSchemas.map(([schema, tables]) => (
              <div key={schema} className="mb-6">
                <h3 className="font-semibold text-lg mb-2">
                  {schema} ({tables.length} tables)
                </h3>
                <div className="space-y-2 ml-4">
                  {tables.map((table) => {
                    const key = `${table.schema}.${table.name}`
                    const isSelected = selectedTables.has(key)

                    return (
                      <label
                        key={key}
                        className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleTable(table.schema, table.name)}
                          className="mr-3"
                        />
                        <div className="flex-1">
                          <div className="font-medium">{table.name}</div>
                          <div className="text-sm text-gray-500">
                            {table.columns.length} columns
                            {table.row_count && ` • ~${table.row_count.toLocaleString()} rows`}
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
            ))
          )}
        </div>

        {/* Selection Summary */}
        <div className="mt-4 p-3 bg-blue-50 rounded-md">
          <div className="text-sm text-blue-800">
            Selected: {selectedTables.size} table{selectedTables.size !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={selectedTables.size === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300"
          >
            Import {selectedTables.size > 0 && `(${selectedTables.size})`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DatabaseSchemaBrowser
```

---

#### Task 2: Add File Preview to DataSourceConnector
**File:** `frontend/src/components/designer/DataSourceConnector.tsx`

**Enhancements:**
```typescript
// Add state for file preview
const [filePreview, setFilePreview] = useState<{
  headers: string[]
  rows: any[]
  totalRows: number
  schema: any[]
} | null>(null)

// Update handleFileSelect
const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0]
  if (!file) return

  setSelectedFile(file)

  // Generate preview based on file type
  if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
    const preview = await previewCSV(file)
    setFilePreview(preview)
  } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
    const preview = await previewExcel(file)
    setFilePreview(preview)
  } else if (file.type === 'application/json') {
    const preview = await previewJSON(file)
    setFilePreview(preview)
  }
}

// Preview functions
const previewCSV = async (file: File) => {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      preview: 5,
      complete: (results) => {
        resolve({
          headers: results.meta.fields,
          rows: results.data,
          totalRows: estimateRowCount(file.size, results.data[0]),
          schema: inferSchemaFromSample(results.data)
        })
      }
    })
  })
}

// Add preview UI in render
{selectedFile && filePreview && (
  <div className="mt-4 border rounded-md p-4">
    <h4 className="font-semibold mb-2">Preview</h4>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            {filePreview.headers.map(header => (
              <th key={header} className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filePreview.rows.map((row, i) => (
            <tr key={i}>
              {filePreview.headers.map(header => (
                <td key={header} className="px-4 py-2 text-sm text-gray-900">
                  {row[header]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div className="mt-2 text-sm text-gray-600">
      Showing 5 of ~{filePreview.totalRows.toLocaleString()} rows
    </div>
  </div>
)}
```

---

#### Task 3: Integrate Schema Browser into Workflow
**File:** `frontend/src/components/designer/DataSourceConnector.tsx`

```typescript
// Add new step state
const [step, setStep] = useState<'select-source' | 'configure' | 'select-tables' | 'importing'>('select-source')

// After successful connection test for database
const handleTestConnection = async () => {
  // ... existing code ...

  if (result.success && selectedSource.category === 'database') {
    setConnectionStatus('success')
    // Move to table selection step
    setStep('select-tables')
  }
}

// Render schema browser step
{step === 'select-tables' && selectedSource && (
  <DatabaseSchemaBrowser
    connectorType={selectedSource.type}
    connectionConfig={connectionConfig}
    onImport={handleImportTables}
    onCancel={() => setStep('configure')}
  />
)}

// Handle table import
const handleImportTables = async (selectedTables: Array<{schema: string; table: string}>) => {
  setStep('importing')
  setIsConnecting(true)

  try {
    const dataset = await datasetService.importDatabaseTables(
      workspaceId,
      connectionConfig.database || 'Database Import',
      selectedSource.type,
      connectionConfig,
      selectedTables
    )

    onConnect(selectedSource, connectionConfig, connectionMode, dataset.id)
  } catch (error: any) {
    setConnectionStatus('error')
    setErrorMessage(error.message)
  } finally {
    setIsConnecting(false)
  }
}
```

---

#### Task 4: Add Dataset Service Methods
**File:** `frontend/src/services/datasetService.ts`

```typescript
/**
 * Get database schema (tables and columns)
 */
async getDatabaseSchema(connectorType: string, connectionConfig: any) {
  const normalizedConnector = this.normalizeConnectorType(connectorType)

  const response = await apiClient.post(
    `/api/datasets/connectors/${normalizedConnector}/schema`,
    { config: connectionConfig }
  )

  return response.data
}

/**
 * Import selected database tables
 */
async importDatabaseTables(
  workspaceId: string,
  name: string,
  connectorType: string,
  connectionConfig: any,
  selectedTables: Array<{schema: string; table: string}>
): Promise<Dataset> {
  const normalizedWorkspaceId = this.normalizeWorkspaceId(workspaceId)
  const normalizedConnector = this.normalizeConnectorType(connectorType)

  const response = await apiClient.post(
    `/api/datasets/workspaces/${normalizedWorkspaceId}/import-database`,
    {
      name,
      connector_type: normalizedConnector,
      connection_config: connectionConfig,
      selected_tables: selectedTables
    },
    {
      timeout: 300000 // 5 minutes for import
    }
  )

  return response.data
}
```

---

## 5. Database Import Strategy

### 5.1 Storage Format: Parquet

**Why Parquet?**
- Columnar storage (efficient for analytics)
- Compression (smaller storage size)
- Schema embedded (self-describing)
- Fast read performance
- Compatible with pandas, Apache Arrow, DuckDB

**Storage Structure:**
```
MinIO Bucket: syntra-data
├── {workspace_id}/
│   ├── {dataset_id}/
│   │   ├── public.users.parquet
│   │   ├── public.orders.parquet
│   │   ├── sales.transactions.parquet
│   │   └── metadata.json
```

### 5.2 Metadata Storage (PostgreSQL)

**Updated Dataset Model:**
```python
class Dataset(Base):
    __tablename__ = 'datasets'

    id = Column(UUID(as_uuid=True), primary_key=True)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey('workspaces.id'))
    name = Column(String, nullable=False)
    connector_type = Column(Enum(ConnectorType), nullable=False)
    connector_config = Column(JSONB)  # Encrypted

    # Import metadata
    import_mode = Column(String, default='import')  # import or directquery
    imported_tables = Column(JSONB)  # List of imported table metadata
    last_refresh_at = Column(DateTime)

    # Schema and data
    schema_json = Column(JSONB)
    row_count = Column(BigInteger)
    file_size = Column(BigInteger)

    status = Column(String, default='pending')
    error_message = Column(Text)
```

**Example imported_tables:**
```json
{
  "tables": [
    {
      "schema": "public",
      "table": "users",
      "file_path": "workspace-123/dataset-456/public.users.parquet",
      "row_count": 1200000,
      "file_size": 45000000,
      "imported_at": "2024-12-31T10:00:00Z",
      "columns": [
        {"name": "id", "type": "integer"},
        {"name": "email", "type": "string"},
        {"name": "created_at", "type": "datetime"}
      ]
    }
  ]
}
```

### 5.3 Query Execution on Imported Data

**Option 1: DuckDB (Recommended)**
```python
import duckdb

async def query_imported_dataset(dataset_id: str, query: str):
    """
    Query imported Parquet files using DuckDB
    """
    # Get dataset metadata
    dataset = await get_dataset(dataset_id)

    # Create DuckDB connection
    conn = duckdb.connect(':memory:')

    # Register Parquet files as tables
    for table_info in dataset.imported_tables['tables']:
        file_path = f"s3://{settings.S3_BUCKET}/{table_info['file_path']}"
        table_name = f"{table_info['schema']}_{table_info['table']}"

        conn.execute(f"""
            CREATE TABLE {table_name} AS
            SELECT * FROM read_parquet('{file_path}')
        """)

    # Execute user query
    result = conn.execute(query).fetchdf()

    return result.to_dict('records')
```

**Option 2: Pandas (Simple)**
```python
import pandas as pd

async def query_imported_dataset_pandas(dataset_id: str, filters: dict):
    """
    Query imported Parquet files using pandas
    """
    # Load Parquet
    df = pd.read_parquet(file_path)

    # Apply filters
    if filters:
        for field, condition in filters.items():
            df = df[df[field] == condition['value']]

    # Return as records
    return df.to_dict('records')
```

---

## 6. File Upload Strategy

### 6.1 Enhanced File Processing

**Current Flow (Keep):**
```
Upload → MinIO → Pandas → Infer Schema → Store Parquet → Ready
```

**Enhanced Flow (Add Preview):**
```
Select File → Local Preview (Papa Parse) → User Confirms → Upload → Process → Ready
```

### 6.2 File Size Handling

**Strategy:**
- Files < 10MB: Parse in browser for instant preview
- Files 10-100MB: Upload first, then show preview from backend
- Files > 100MB: Reject or implement chunked upload

**Implementation:**
```typescript
const handleFileSelect = async (file: File) => {
  if (file.size < 10 * 1024 * 1024) {
    // Small file: preview locally
    const preview = await previewFileLocally(file)
    setFilePreview(preview)
  } else if (file.size <= 100 * 1024 * 1024) {
    // Medium file: upload first
    setFilePreview({ loading: true })
    await uploadFile(file)
    const preview = await fetchPreviewFromBackend(file)
    setFilePreview(preview)
  } else {
    // Large file: reject
    alert('File too large. Maximum size: 100MB')
  }
}
```

---

## 7. Development Roadmap

### Phase 1: Core Functionality (Week 1)

#### Day 1-2: Backend Database Import
- [ ] Create `GET /connectors/{type}/schema` endpoint
- [ ] Create `POST /workspaces/{id}/import-database` endpoint
- [ ] Implement `DataImportService` class
- [ ] Test database import with PostgreSQL
- [ ] Test database import with MySQL

#### Day 3-4: Frontend Schema Browser
- [ ] Create `DatabaseSchemaBrowser` component
- [ ] Integrate with `DataSourceConnector`
- [ ] Add search/filter functionality
- [ ] Test UI workflow end-to-end

#### Day 5: File Preview
- [ ] Add CSV preview using Papa Parse
- [ ] Add Excel preview using xlsx library
- [ ] Add JSON preview
- [ ] Test file preview UI

#### Day 6-7: Integration & Testing
- [ ] End-to-end testing (database import)
- [ ] End-to-end testing (file upload)
- [ ] Error handling
- [ ] Loading states and progress indicators
- [ ] Documentation

### Phase 2: Enhancements (Week 2)

#### Day 1-2: Progress Tracking
- [ ] WebSocket for real-time progress
- [ ] Progress bar UI
- [ ] Cancel import functionality

#### Day 3-4: Query Optimization
- [ ] DuckDB integration for querying Parquet
- [ ] Query caching
- [ ] Performance testing

#### Day 5-7: Polish & Production
- [ ] Error logging and monitoring
- [ ] Security audit
- [ ] Performance optimization
- [ ] User documentation

---

## 8. API Specifications

### 8.1 New Backend Endpoints

#### Get Database Schema
```
POST /api/datasets/connectors/{connector_type}/schema

Request:
{
  "config": {
    "host": "localhost",
    "port": 5432,
    "database": "myapp",
    "username": "admin",
    "password": "password"
  }
}

Response:
{
  "tables": [
    {
      "schema": "public",
      "name": "users",
      "type": "BASE TABLE",
      "columns": [
        {"name": "id", "type": "integer", "nullable": false},
        {"name": "email", "type": "varchar", "nullable": false},
        {"name": "created_at", "type": "timestamp", "nullable": true}
      ],
      "row_count": 1200000  // Optional, can be slow
    }
  ]
}
```

#### Import Database Tables
```
POST /api/datasets/workspaces/{workspace_id}/import-database

Request:
{
  "name": "My Database Import",
  "connector_type": "postgresql",
  "connection_config": {...},
  "selected_tables": [
    {"schema": "public", "table": "users"},
    {"schema": "public", "table": "orders"}
  ]
}

Response:
{
  "id": "dataset-uuid",
  "status": "importing",
  "name": "My Database Import",
  "imported_tables": {
    "total": 2,
    "completed": 0,
    "tables": [...]
  }
}
```

#### Get Import Progress
```
GET /api/datasets/{dataset_id}/import-progress

Response:
{
  "status": "importing",
  "progress": {
    "total_tables": 2,
    "completed_tables": 1,
    "current_table": "public.orders",
    "current_rows": 425000,
    "total_rows_estimate": 850000,
    "percentage": 55
  }
}
```

---

## 9. Testing Strategy

### 9.1 Unit Tests

**Backend:**
- [ ] DataImportService.import_database_table()
- [ ] DataImportService.import_csv_file()
- [ ] Schema inference logic
- [ ] Type conversion functions

**Frontend:**
- [ ] DatabaseSchemaBrowser component
- [ ] File preview functions
- [ ] Schema display logic

### 9.2 Integration Tests

**Database Import:**
```python
async def test_database_import_postgresql():
    """Test complete PostgreSQL import flow"""
    # 1. Create test database
    # 2. Test connection
    # 3. Get schema
    # 4. Import tables
    # 5. Verify Parquet files created
    # 6. Verify metadata stored
    # 7. Query imported data
```

**File Upload:**
```python
async def test_csv_import():
    """Test CSV import flow"""
    # 1. Upload CSV file
    # 2. Verify preview generated
    # 3. Verify schema inferred
    # 4. Verify Parquet created
    # 5. Query data
```

### 9.3 E2E Tests (Playwright)

```typescript
test('import database tables', async ({ page }) => {
  // 1. Navigate to Get Data
  await page.click('text=Get Data')

  // 2. Select PostgreSQL
  await page.click('text=PostgreSQL')

  // 3. Fill connection details
  await page.fill('[name="host"]', 'localhost')
  await page.fill('[name="database"]', 'testdb')

  // 4. Test connection
  await page.click('text=Test Connection')
  await expect(page.locator('text=Connection successful')).toBeVisible()

  // 5. Select tables
  await page.check('input[value="public.users"]')
  await page.check('input[value="public.orders"]')

  // 6. Import
  await page.click('text=Import')

  // 7. Verify dataset created
  await expect(page.locator('text=My Database Import')).toBeVisible()
})
```

---

## 10. Next Steps

### Immediate Actions
1. **Review this plan** with the team
2. **Prioritize tasks** based on business needs
3. **Set up development environment** with test databases
4. **Create sprint backlog** for Week 1

### Key Decisions Needed
1. **Storage:** Confirm Parquet format for imported data
2. **Query Engine:** Choose between DuckDB, Pandas, or custom solution
3. **Progress Tracking:** WebSocket vs polling
4. **File Size Limits:** Confirm 100MB limit

### Success Metrics
- [ ] Can import 1M+ row database tables in < 5 minutes
- [ ] File preview renders in < 1 second
- [ ] Query on imported data completes in < 3 seconds
- [ ] UI workflow is intuitive (user testing)

---

**Document Version:** 1.0
**Last Updated:** December 31, 2024
**Status:** Ready for Implementation
