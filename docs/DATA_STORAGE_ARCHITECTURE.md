# Data Storage Architecture - Syntra BI

**Date:** January 5, 2025
**Version:** 1.0

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [File-Based Data Storage](#file-based-data-storage)
3. [Database Connection Storage](#database-connection-storage)
4. [Metadata Storage (PostgreSQL)](#metadata-storage-postgresql)
5. [Data Flow Diagrams](#data-flow-diagrams)
6. [Storage Comparison](#storage-comparison)
7. [Query Execution](#query-execution)

---

## 1. Architecture Overview

Syntra BI uses a **hybrid storage approach** depending on the data source type:

```
┌─────────────────────────────────────────────────────────┐
│                    DATA SOURCES                          │
├─────────────────────┬───────────────────────────────────┤
│  FILE-BASED         │  DATABASE-BASED                    │
│  (CSV, Excel,       │  (PostgreSQL, MySQL, MariaDB)      │
│   JSON, PDF)        │                                    │
└──────┬──────────────┴──────────┬─────────────────────────┘
       │                         │
       ▼                         ▼
┌──────────────┐         ┌──────────────────┐
│   STORAGE    │         │   STORAGE        │
│   METHOD     │         │   METHOD         │
├──────────────┤         ├──────────────────┤
│ IMPORT MODE  │         │ DIRECTQUERY MODE │
│ (Copy data   │         │ (Live connection │
│  to MinIO)   │         │  to source DB)   │
└──────┬───────┘         └────────┬─────────┘
       │                          │
       └──────────┬───────────────┘
                  ▼
         ┌────────────────┐
         │   METADATA     │
         │  PostgreSQL    │
         │  (Schema info, │
         │   credentials, │
         │   config)      │
         └────────────────┘
```

---

## 2. File-Based Data Storage

### 2.1 Import Mode (Files)

**Connector Types:** CSV, Excel, JSON, PDF

**Storage Strategy:** Full data import - all file data is copied into Syntra's storage

### 2.2 File Upload Flow

```
┌─────────┐
│ Browser │ Upload CSV/Excel/JSON/PDF
└────┬────┘
     │
     │ POST /api/datasets/workspaces/{id}/datasets
     │ (multipart/form-data: file + name + connector_type)
     ▼
┌──────────────┐
│   Backend    │
│   FastAPI    │
└──────┬───────┘
       │
       │ 1. Receive file upload
       │ 2. Save to temp location
       │ 3. Parse and analyze file
       │ 4. Infer schema (columns, types)
       │ 5. Extract sample data (first 100 rows)
       ▼
┌──────────────────────────────────┐
│   File Processing Service        │
│   (DatasetService)                │
│                                   │
│   CSV:    pandas.read_csv()       │
│   Excel:  openpyxl               │
│   JSON:   json.load()            │
│   PDF:    pdfplumber             │
└──────┬────────────────────────────┘
       │
       │ 6. Store full data in MinIO (S3-compatible)
       ▼
┌──────────────────────────────────┐
│   MinIO Object Storage           │
│   Bucket: syntra-data            │
│                                   │
│   Path Structure:                │
│   {workspace_id}/                │
│     {dataset_id}/                │
│       data.parquet  (full data)  │
│       metadata.json (optional)   │
└──────┬────────────────────────────┘
       │
       │ 7. Store metadata in PostgreSQL
       ▼
┌──────────────────────────────────┐
│   PostgreSQL (Metadata DB)       │
│                                   │
│   datasets table:                │
│   - id (UUID)                    │
│   - workspace_id                 │
│   - name                         │
│   - connector_type: "csv"        │
│   - file_path: "ws123/ds456/..." │
│   - schema_json: {...}           │
│   - sample_rows: [...]           │
│   - row_count: 5000              │
│   - file_size: 1024000           │
│   - status: "ready"              │
└──────────────────────────────────┘
```

### 2.3 File Storage Details

**Storage Location:** MinIO (S3-compatible object storage)

**Bucket:** `syntra-data`

**Path Structure:**
```
syntra-data/
├── {workspace_id_1}/
│   ├── {dataset_id_1}/
│   │   ├── data.parquet          # Full dataset in Parquet format
│   │   ├── original.csv          # Original uploaded file (optional)
│   │   └── metadata.json         # Additional metadata (optional)
│   ├── {dataset_id_2}/
│   │   ├── data.parquet
│   │   └── original.xlsx
│   └── {dataset_id_3}/
│       └── data.parquet
└── {workspace_id_2}/
    └── ...
```

**Storage Format:** **Apache Parquet** (columnar storage)

**Why Parquet?**
- ✅ Columnar format (efficient for analytics)
- ✅ Compression (smaller file sizes)
- ✅ Schema embedded (self-describing)
- ✅ Fast read performance
- ✅ Compatible with pandas, DuckDB, Apache Arrow

### 2.4 File Data Processing

#### CSV Processing
```python
# backend/app/services/dataset_service.py

async def _process_csv_data(file_path: str) -> dict:
    # 1. Read CSV with pandas
    df = pd.read_csv(file_path)

    # 2. Infer column types
    schema = {
        "columns": [
            {
                "name": col,
                "type": infer_type(df[col]),  # string, integer, number, boolean, datetime
                "nullable": df[col].isnull().any()
            }
            for col in df.columns
        ]
    }

    # 3. Extract sample rows (first 100)
    sample_rows = df.head(100).to_dict('records')

    # 4. Convert to Parquet and store in MinIO
    parquet_buffer = df.to_parquet()
    file_path = f"{workspace_id}/{dataset_id}/data.parquet"

    s3_client.put_object(
        Bucket='syntra-data',
        Key=file_path,
        Body=parquet_buffer
    )

    # 5. Return metadata
    return {
        "schema": schema,
        "sample_rows": sample_rows,
        "row_count": len(df),
        "file_size": os.path.getsize(file_path)
    }
```

#### Excel Processing
```python
async def _process_excel_data(file_path: str) -> dict:
    # Read all sheets
    excel_file = pd.ExcelFile(file_path)

    # For multi-sheet Excel, user can select sheet
    # Or import all sheets as separate datasets

    for sheet_name in excel_file.sheet_names:
        df = pd.read_excel(excel_file, sheet_name=sheet_name)
        # Process similar to CSV
        # Store as: {workspace_id}/{dataset_id}/{sheet_name}.parquet
```

#### JSON Processing
```python
async def _process_json_data(file_path: str) -> dict:
    with open(file_path, 'r') as f:
        data = json.load(f)

    # Flatten nested JSON if needed
    if isinstance(data, list):
        df = pd.json_normalize(data)
    else:
        df = pd.json_normalize([data])

    # Continue processing like CSV
```

#### PDF Processing
```python
async def _process_pdf_data(file_path: str) -> dict:
    import pdfplumber

    with pdfplumber.open(file_path) as pdf:
        # Extract tables from all pages
        all_tables = []
        for page in pdf.pages:
            tables = page.extract_tables()
            all_tables.extend(tables)

        # Convert to DataFrame
        # Assume first row is header
        if all_tables:
            df = pd.DataFrame(all_tables[1:], columns=all_tables[0])

        # Continue processing like CSV
```

---

## 3. Database Connection Storage

### 3.1 DirectQuery Mode (Databases)

**Connector Types:** PostgreSQL, MySQL, MariaDB

**Storage Strategy:** **Metadata only** - Data stays in source database, queries executed live

### 3.2 Database Connection Flow

```
┌─────────┐
│ Browser │ Configure DB connection
└────┬────┘
     │
     │ Step 1: Test Connection
     │ POST /api/datasets/connectors/test
     │ Body: {connector_type: "postgresql", config: {...}}
     ▼
┌──────────────┐
│   Backend    │ Test connection to external DB
└──────┬───────┘
       │
       │ CREATE CONNECTION (asyncpg/aiomysql)
       │ SELECT 1  (test query)
       ▼
┌──────────────────────┐
│  External Database   │  Returns: {success: true, message: "Connected"}
│  PostgreSQL/MySQL    │
└──────┬───────────────┘
       │
       ▼
┌─────────┐
│ Browser │ Connection successful!
└────┬────┘
     │
     │ Step 2: Get Schema (optional for Phase 1)
     │ POST /api/datasets/connectors/schema
     │ Body: {connector_type: "postgresql", config: {...}}
     ▼
┌──────────────┐
│   Backend    │ Query database metadata
└──────┬───────┘
       │
       │ Query: SELECT table_schema, table_name, column_name, data_type
       │        FROM information_schema.columns
       ▼
┌──────────────────────┐
│  External Database   │  Returns: {tables: [...], columns: [...]}
└──────┬───────────────┘
       │
       ▼
┌─────────┐
│ Browser │ Display table/schema browser (future Phase 2)
└────┬────┘
     │
     │ Step 3: Create Dataset
     │ POST /api/datasets/workspaces/{id}/datasets
     │ Body: {name, connector_type, connection_config}
     ▼
┌──────────────┐
│   Backend    │ Save connection metadata ONLY
└──────┬───────┘
       │
       │ NO DATA IS COPIED!
       │ Only connection info is stored
       ▼
┌──────────────────────────────────┐
│   PostgreSQL (Metadata DB)       │
│                                   │
│   datasets table:                │
│   - id (UUID)                    │
│   - workspace_id                 │
│   - name: "Production DB"        │
│   - connector_type: "postgresql" │
│   - connector_config: {          │
│       "host": "db.example.com",  │
│       "port": 5432,              │
│       "database": "myapp",       │
│       "username": "reader",      │
│       "password": "***"          │  ← ENCRYPTED!
│     }                            │
│   - schema_json: {               │
│       "tables": [                │
│         {                        │
│           "name": "users",       │
│           "columns": [...]       │
│         }                        │
│       ]                          │
│     }                            │
│   - file_path: NULL              │  ← No file for DB connections
│   - status: "ready"              │
└──────────────────────────────────┘
```

### 3.3 Database Credentials Security

**Encryption:** Database passwords are encrypted before storage

```python
# backend/app/services/dataset_service.py

from cryptography.fernet import Fernet
import os

# Encryption key from environment variable
ENCRYPTION_KEY = os.getenv('DATABASE_ENCRYPTION_KEY')
cipher = Fernet(ENCRYPTION_KEY.encode())

def encrypt_credentials(config: dict) -> dict:
    """Encrypt sensitive fields in connection config"""
    encrypted_config = config.copy()

    # Encrypt password
    if 'password' in encrypted_config:
        encrypted_config['password'] = cipher.encrypt(
            encrypted_config['password'].encode()
        ).decode()

    return encrypted_config

def decrypt_credentials(config: dict) -> dict:
    """Decrypt sensitive fields when needed"""
    decrypted_config = config.copy()

    # Decrypt password
    if 'password' in decrypted_config:
        decrypted_config['password'] = cipher.decrypt(
            decrypted_config['password'].encode()
        ).decode()

    return decrypted_config
```

### 3.4 Database Metadata Storage

**What is stored in PostgreSQL?**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "workspace_id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Production Database",
  "connector_type": "postgresql",
  "connector_config": {
    "host": "db.example.com",
    "port": 5432,
    "database": "production",
    "username": "readonly_user",
    "password": "gAAAAABhXXXXXXXXXXXX...",  // ENCRYPTED
    "ssl_enabled": true,
    "connection_timeout": 30,
    "query_timeout": 300
  },
  "schema_json": {
    "tables": [
      {
        "schema": "public",
        "name": "users",
        "columns": [
          {"name": "id", "type": "integer", "nullable": false},
          {"name": "email", "type": "varchar", "nullable": false},
          {"name": "created_at", "type": "timestamp", "nullable": true}
        ]
      },
      {
        "schema": "sales",
        "name": "orders",
        "columns": [
          {"name": "id", "type": "integer", "nullable": false},
          {"name": "customer_id", "type": "integer", "nullable": false},
          {"name": "total", "type": "numeric", "nullable": false}
        ]
      }
    ]
  },
  "file_path": null,  // No file for database connections
  "row_count": null,  // Not applicable for DirectQuery
  "file_size": null,
  "status": "ready",
  "created_at": "2025-01-05T10:00:00Z",
  "updated_at": "2025-01-05T10:00:00Z"
}
```

**What is NOT stored?**
- ❌ Actual table data
- ❌ Query results (except temporary cache)
- ❌ Files

---

## 4. Metadata Storage (PostgreSQL)

All connector types store metadata in the main PostgreSQL database.

### 4.1 Datasets Table Schema

```sql
CREATE TABLE datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Connector information
    connector_type VARCHAR(50) NOT NULL,  -- csv, excel, json, pdf, postgresql, mysql, mariadb
    connector_config JSONB,               -- Connection details (encrypted for databases)

    -- Schema and data metadata
    schema_json JSONB,                    -- Inferred or fetched schema
    sample_rows JSONB,                    -- Sample data (files only, first 100 rows)

    -- File-specific fields
    file_path VARCHAR(500),               -- S3/MinIO path for files (NULL for databases)
    file_url VARCHAR(500),                -- Public URL if applicable
    file_size BIGINT,                     -- File size in bytes (NULL for databases)
    row_count INTEGER,                    -- Total rows (for files, NULL for databases)

    -- Status and refresh
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, ready, error, refreshing
    error_message TEXT,
    refresh_enabled BOOLEAN DEFAULT FALSE,
    refresh_schedule JSONB,               -- Future: cron schedule for refresh
    last_refresh_at TIMESTAMP,

    -- Audit fields
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_datasets_workspace ON datasets(workspace_id);
CREATE INDEX idx_datasets_status ON datasets(status);
CREATE INDEX idx_datasets_connector_type ON datasets(connector_type);
```

### 4.2 Field Comparison: Files vs Databases

| Field | File Connectors | Database Connectors |
|-------|----------------|---------------------|
| `connector_type` | csv, excel, json, pdf | postgresql, mysql, mariadb |
| `connector_config` | NULL or minimal | Connection credentials (encrypted) |
| `schema_json` | Inferred from file | Fetched from INFORMATION_SCHEMA |
| `sample_rows` | First 100 rows (JSONB) | NULL (too large) |
| `file_path` | `workspace_id/dataset_id/data.parquet` | NULL |
| `file_size` | File size in bytes | NULL |
| `row_count` | Total rows in file | NULL (dynamic) |
| `status` | ready / error | ready / error |

---

## 5. Data Flow Diagrams

### 5.1 File Upload Flow (CSV Example)

```
User Action          Frontend                Backend                  MinIO                PostgreSQL
──────────          ────────                ───────                  ─────                ──────────

1. Select CSV   →   Read file locally
                    (preview generation)

2. Click Import →   POST /api/datasets/
                    workspaces/{id}/datasets
                    FormData:
                      file: <blob>
                      name: "Sales Data"
                      connector_type: "csv"
                                        →   Receive upload
                                            Save to /tmp/upload.csv

                                            Parse CSV with pandas
                                            df = pd.read_csv()

                                            Infer schema:
                                            - Column names
                                            - Data types
                                            - Nullable flags

                                            Convert to Parquet:
                                            parquet = df.to_parquet()
                                                                →   Store in MinIO:
                                                                    PUT s3://syntra-data/
                                                                    ws123/ds456/data.parquet

                                            Save metadata     →                         INSERT INTO datasets
                                                                                        VALUES (...metadata...)

                                            Return Dataset object
                    ←   Response:
                        {
                          id: "ds456",
                          status: "ready",
                          schema_json: {...}
                        }

3. View dataset ←   Display in UI
                    Show schema
                    Preview data
```

### 5.2 Database Connection Flow (PostgreSQL Example)

```
User Action          Frontend                Backend                  External DB          PostgreSQL (Meta)
──────────          ────────                ───────                  ───────────          ─────────────────

1. Fill form    →   Connection config:
                      host: "db.example.com"
                      port: 5432
                      database: "myapp"
                      username: "reader"
                      password: "secret"

2. Test Conn    →   POST /api/datasets/
                    connectors/test
                    Body: {
                      connector_type: "postgresql",
                      config: {...}
                    }
                                        →   Create connector
                                            conn = PostgreSQLConnector(config)

                                            Test connection:
                                            await conn.test_connection()
                                                                →   Execute: SELECT 1
                                                                    Verify credentials
                                                            ←   Success / Error

                                            Return result
                    ←   {
                          success: true,
                          message: "Connected"
                        }

3. Create DS    →   POST /api/datasets/
                    workspaces/{id}/datasets
                    FormData:
                      name: "Prod DB"
                      connector_type: "postgresql"
                      connection_config: {...}
                                        →   Encrypt credentials
                                            encrypted = encrypt(password)

                                            Fetch schema (optional):
                                            await conn.get_schema()
                                                                →   Query:
                                                                    SELECT * FROM
                                                                    information_schema.tables
                                                            ←   Tables + columns

                                            Save metadata only   →              INSERT INTO datasets
                                                                                VALUES (
                                                                                  connector_type: "postgresql",
                                                                                  connector_config: {...encrypted},
                                                                                  schema_json: {...},
                                                                                  file_path: NULL
                                                                                )

                                            Return Dataset object
                    ←   {
                          id: "ds789",
                          status: "ready",
                          connector_type: "postgresql"
                        }
```

---

## 6. Storage Comparison

### 6.1 File Connectors (Import Mode)

**Pros:**
- ✅ Fast query performance (data is local)
- ✅ No dependency on external systems
- ✅ Works offline once imported
- ✅ Consistent schema
- ✅ No connection overhead

**Cons:**
- ❌ Data can become stale (requires refresh)
- ❌ Storage cost (duplicate data)
- ❌ Import time for large files
- ❌ Not real-time

**Best For:**
- Static data exports
- Small to medium datasets (< 100MB)
- Infrequent updates
- Offline analysis

**Storage Estimate:**
```
Original CSV:     10 MB
Parquet format:    3 MB  (70% compression typical)
Metadata:          5 KB
Total:            ~3 MB per dataset
```

### 6.2 Database Connectors (DirectQuery Mode)

**Pros:**
- ✅ Always up-to-date (real-time)
- ✅ No data duplication
- ✅ No storage costs
- ✅ Can access huge datasets
- ✅ Leverages source database optimizations

**Cons:**
- ❌ Slower query performance (network overhead)
- ❌ Depends on source database availability
- ❌ Query timeouts possible
- ❌ Credentials management required
- ❌ Potential security risks

**Best For:**
- Live operational data
- Large datasets (> 100MB)
- Frequently updated data
- Real-time dashboards

**Storage Estimate:**
```
Connection config:  1 KB  (encrypted credentials)
Schema metadata:    5 KB  (table/column definitions)
Sample data:        0 KB  (not stored)
Total:             ~6 KB per dataset
```

---

## 7. Query Execution

### 7.1 Querying File Data

When a user creates a visualization using a CSV dataset:

```python
# User creates a bar chart: Sales by Region

# Frontend sends:
POST /api/datasets/{dataset_id}/query
{
  "columns": ["region", "sales"],
  "aggregations": [{"field": "sales", "function": "sum"}],
  "group_by": ["region"],
  "limit": 1000
}

# Backend processes:
async def query_dataset(dataset_id: str, query: QueryRequest):
    # 1. Load dataset metadata
    dataset = await get_dataset(dataset_id)

    # 2. Load Parquet file from MinIO
    file_path = dataset.file_path  # "ws123/ds456/data.parquet"
    s3_object = s3_client.get_object(Bucket='syntra-data', Key=file_path)

    # 3. Read Parquet into pandas DataFrame
    df = pd.read_parquet(io.BytesIO(s3_object['Body'].read()))

    # 4. Apply query filters and aggregations
    if query.group_by:
        result = df.groupby(query.group_by)[query.columns].agg({
            'sales': 'sum'
        })

    # 5. Return result
    return {
        "data": result.to_dict('records'),
        "columns": result.columns.tolist(),
        "total_rows": len(result)
    }
```

**Alternative: DuckDB (Recommended for Phase 2)**
```python
import duckdb

async def query_dataset_with_duckdb(dataset_id: str, query: QueryRequest):
    # 1. Get file path
    dataset = await get_dataset(dataset_id)
    file_path = f"s3://syntra-data/{dataset.file_path}"

    # 2. Query Parquet directly with SQL
    conn = duckdb.connect(':memory:')

    result = conn.execute(f"""
        SELECT region, SUM(sales) as total_sales
        FROM read_parquet('{file_path}')
        GROUP BY region
        ORDER BY total_sales DESC
    """).fetchdf()

    return result.to_dict('records')
```

### 7.2 Querying Database Data

When a user creates a visualization using a PostgreSQL dataset:

```python
# User creates same chart from PostgreSQL dataset

# Frontend sends same query format:
POST /api/datasets/{dataset_id}/query
{
  "columns": ["region", "sales"],
  "aggregations": [{"field": "sales", "function": "sum"}],
  "group_by": ["region"]
}

# Backend processes:
async def query_dataset(dataset_id: str, query: QueryRequest):
    # 1. Load dataset metadata
    dataset = await get_dataset(dataset_id)

    # 2. Get encrypted credentials
    config = decrypt_credentials(dataset.connector_config)

    # 3. Create connector
    connector = PostgreSQLConnector(config)

    # 4. Translate query to SQL
    sql = f"""
        SELECT region, SUM(sales) as total_sales
        FROM {dataset.schema_json['table_name']}
        GROUP BY region
        ORDER BY total_sales DESC
        LIMIT 1000
    """

    # 5. Execute query on source database
    result = await connector.execute_query(sql)

    # 6. Cache result in Redis (optional)
    cache_key = f"query:{dataset_id}:{hash(sql)}"
    redis_client.setex(cache_key, 300, json.dumps(result))  # 5 min TTL

    # 7. Return result
    return result
```

---

## 8. Summary

### File Connectors
- **Storage:** Full data copied to MinIO (Parquet format)
- **Metadata:** PostgreSQL (schema, sample, stats)
- **Query:** Read from Parquet, process with pandas/DuckDB
- **Freshness:** Stale (requires manual refresh)
- **Performance:** Fast (local data)

### Database Connectors
- **Storage:** Metadata only (credentials encrypted)
- **Metadata:** PostgreSQL (connection config, schema)
- **Query:** Execute on source database (DirectQuery)
- **Freshness:** Real-time (always current)
- **Performance:** Variable (depends on network & source DB)

### Current Frontend Implementation

**The DatabaseConnectionModal component already has:**
- ✅ "Test Connection" button (line 467-478)
- ✅ "Create Connection" button (line 487-500)
- ✅ Connection status indicators (success/error)
- ✅ Proper error handling
- ✅ Encrypted credential storage

**The workflow is:**
1. User fills in connection form
2. User clicks "Test Connection" → Calls `POST /api/datasets/connectors/test`
3. Backend tests connection to external DB
4. If successful, "Create Connection" button enables
5. User clicks "Create Connection" → Calls `POST /api/datasets/workspaces/{id}/datasets`
6. Backend stores metadata only (no data import)
7. Dataset appears in workspace, ready for querying

---

**Document Version:** 1.0
**Last Updated:** January 5, 2025
**Status:** ✅ Current Implementation Documented
