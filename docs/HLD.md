# Syntra BI - High Level Design Document

**Version:** 1.0
**Date:** December 30, 2024
**Document Type:** Technical Architecture & Design

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Component Design](#component-design)
4. [Data Flow](#data-flow)
5. [Technology Stack](#technology-stack)
6. [Database Schema](#database-schema)
7. [API Design](#api-design)
8. [Security Architecture](#security-architecture)
9. [Deployment Architecture](#deployment-architecture)
10. [Design Patterns](#design-patterns)

---

## 1. System Overview

### 1.1 Purpose
Syntra BI is a web-based Business Intelligence platform that enables users to:
- Connect to various data sources (files and databases)
- Create interactive visualizations and reports
- Share insights across teams via workspaces
- Export reports and dashboards

### 1.2 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                             │
│  ┌────────────────────────────────────────────────────────┐    │
│  │           React Frontend (TypeScript + Vite)            │    │
│  │  • Authentication UI      • Report Designer             │    │
│  │  • Dataset Management     • Visualization Canvas        │    │
│  │  • Connector Config Forms • Vega-Lite Renderer         │    │
│  └─────────────────┬───────────────────────────────────────┘    │
│                    │ HTTPS (REST API + WebSocket)               │
└────────────────────┼────────────────────────────────────────────┘
                     │
┌────────────────────┼────────────────────────────────────────────┐
│                    ▼         Backend Services                    │
│  ┌──────────────────────────────────────────────────────┐       │
│  │         FastAPI Application (Python 3.11+)            │       │
│  │  ┌─────────────────────────────────────────────────┐ │       │
│  │  │ API Routes Layer                                 │ │       │
│  │  │ • /auth  • /workspaces  • /datasets  • /reports │ │       │
│  │  └────────────────┬─────────────────────────────────┘ │       │
│  │  ┌────────────────▼─────────────────────────────────┐ │       │
│  │  │ Business Logic Layer (Services)                  │ │       │
│  │  │ • AuthService      • DatasetService              │ │       │
│  │  │ • WorkspaceService • ReportService               │ │       │
│  │  │ • DataConnectorFactory                           │ │       │
│  │  └────────────────┬─────────────────────────────────┘ │       │
│  │  ┌────────────────▼─────────────────────────────────┐ │       │
│  │  │ Data Access Layer (SQLAlchemy ORM)               │ │       │
│  │  │ • Models: User, Workspace, Dataset, Report       │ │       │
│  │  │ • Async database operations                      │ │       │
│  │  └──────────────────────────────────────────────────┘ │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                   │
│  ┌──────────────────────────────────────────────────────┐       │
│  │         Data Connector Implementations                │       │
│  │  • CSVFileConnector     • PostgreSQLConnector        │       │
│  │  • ExcelConnector       • MySQLConnector             │       │
│  │  • JSONConnector        • MariaDBConnector           │       │
│  │  • PDFConnector         (Factory Pattern)            │       │
│  └──────────────────────────────────────────────────────┘       │
└───────────────────────────────────────────────────────────────┘
                     │                    │
        ┌────────────┴────────┐  ┌────────┴─────────┐
        ▼                     ▼  ▼                  ▼
┌───────────────┐   ┌──────────────┐   ┌─────────────────┐
│  PostgreSQL   │   │    Redis     │   │  MinIO (S3)     │
│  (Metadata)   │   │   (Cache)    │   │ (File Storage)  │
│               │   │              │   │                 │
│ • Users       │   │ • Sessions   │   │ • Uploaded CSVs │
│ • Workspaces  │   │ • Query Cache│   │ • Excel files   │
│ • Datasets    │   │ • Temp Data  │   │ • Exports (PNG) │
│ • Reports     │   │              │   │ • JSON/PDF files│
└───────────────┘   └──────────────┘   └─────────────────┘
```

### 1.3 Key Design Principles
1. **Separation of Concerns:** Frontend, backend services, and data layer are independent
2. **Async-First:** All I/O operations are asynchronous for better performance
3. **Factory Pattern:** Connectors are instantiated via factory for extensibility
4. **Stateless API:** RESTful API design with JWT authentication
5. **Schema-Driven:** Dynamic schema inference and validation
6. **Containerized:** All services run in Docker for portability

---

## 2. Architecture

### 2.1 Architectural Style
**Three-Tier Architecture with Microservices Characteristics**

**Presentation Tier:**
- React Single Page Application (SPA)
- Client-side rendering with Vega-Lite
- State management via Zustand stores
- Offline-first with IndexedDB

**Application Tier:**
- FastAPI RESTful API server
- Async request handling with uvicorn ASGI server
- Business logic in service layer
- Data connectors as pluggable modules

**Data Tier:**
- PostgreSQL for relational metadata
- Redis for caching and sessions
- MinIO for object storage (files)
- External databases via connectors

### 2.2 Communication Protocols
- **Frontend ↔ Backend:** HTTPS/REST (JSON payloads)
- **Backend ↔ PostgreSQL:** PostgreSQL wire protocol (asyncpg)
- **Backend ↔ Redis:** RESP (Redis protocol)
- **Backend ↔ MinIO:** S3 API (HTTP)
- **Backend ↔ External DBs:** Database-specific protocols (MySQL wire, PostgreSQL wire)

### 2.3 Scalability Considerations
- **Horizontal Scaling:** Backend API servers are stateless and can scale horizontally
- **Vertical Scaling:** Database connections use connection pooling to maximize throughput
- **Caching:** Redis reduces database load for frequently accessed datasets
- **Asynchronous Processing:** Long-running operations (file uploads, schema extraction) use async tasks

---

## 3. Component Design

### 3.1 Frontend Components

#### 3.1.1 Core Components
```
src/
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx          # User authentication
│   │   └── ProtectedRoute.tsx     # Route guards
│   ├── designer/
│   │   ├── ReportCanvas.tsx       # Drag-and-drop canvas
│   │   ├── VisualGallery.tsx      # Chart type selector
│   │   └── DataSourceConnector.tsx # Connector configuration UI
│   ├── dataset/
│   │   ├── DatasetUploadModal.tsx # File upload interface
│   │   ├── DatabaseConnectionModal.tsx # DB connection form
│   │   └── DatasetList.tsx        # Dataset browser
│   └── visualizations/
│       └── VegaChart.tsx          # Vega-Lite wrapper
├── pages/
│   ├── Login.tsx                  # Login page
│   ├── Workspaces.tsx             # Workspace list
│   ├── Designer.tsx               # Report design page
│   └── Dashboard.tsx              # Dashboard viewer
├── services/
│   ├── authService.ts             # Authentication API client
│   ├── datasetService.ts          # Dataset API client
│   ├── reportService.ts           # Report API client
│   └── api.ts                     # Axios instance with interceptors
├── stores/
│   ├── authStore.ts               # Zustand auth state
│   ├── workspaceStore.ts          # Workspace state
│   └── datasetStore.ts            # Dataset cache
└── types/
    ├── dataset.ts                 # Dataset interfaces
    ├── report.ts                  # Report interfaces
    └── connector.ts               # Connector config types
```

#### 3.1.2 State Management
**Zustand Stores:**
- `authStore`: User session, JWT token, current user
- `workspaceStore`: Active workspace, workspace list
- `datasetStore`: Cached dataset metadata
- `reportStore`: Current report being edited

**Local State:**
- Component-level state with React hooks (useState, useReducer)
- Form state with controlled inputs
- UI state (modals, dropdowns, loading indicators)

#### 3.1.3 Data Fetching Strategy
- **API Calls:** Axios with centralized error handling
- **Caching:** React Query or SWR for server state caching (optional)
- **Offline Support:** IndexedDB for storing reports locally
- **Optimistic Updates:** Update UI immediately, rollback on error

### 3.2 Backend Components

#### 3.2.1 Application Structure
```
backend/
├── app/
│   ├── core/
│   │   ├── config.py              # Environment configuration
│   │   ├── security.py            # JWT, password hashing
│   │   └── database.py            # SQLAlchemy engine setup
│   ├── models/
│   │   ├── user.py                # User model
│   │   ├── workspace.py           # Workspace model
│   │   ├── dataset.py             # Dataset, Table models
│   │   ├── report.py              # Report, Dashboard models
│   │   └── pbids.py               # PBIDS format support
│   ├── routes/
│   │   ├── auth.py                # /api/auth endpoints
│   │   ├── workspaces.py          # /api/workspaces endpoints
│   │   ├── datasets.py            # /api/datasets endpoints
│   │   └── reports.py             # /api/reports endpoints
│   ├── services/
│   │   ├── auth_service.py        # Authentication logic
│   │   ├── dataset_service.py     # Dataset processing
│   │   ├── report_service.py      # Report rendering
│   │   └── data_connectors.py     # Connector implementations
│   └── schemas/
│       ├── user.py                # Pydantic request/response models
│       ├── dataset.py             # Dataset DTOs
│       └── report.py              # Report DTOs
├── main.py                        # FastAPI app entry point
├── alembic/                       # Database migrations
└── tests/                         # Unit and integration tests
```

#### 3.2.2 Service Layer Design

**AuthService:**
- `authenticate_user(email, password) → JWT token`
- `get_current_user(token) → User object`
- `create_user(user_data) → User`

**DatasetService:**
- `create_dataset(workspace_id, file/config) → Dataset`
- `_process_csv_data(file) → schema, sample_data`
- `_process_excel_data(file) → schema, sample_data`
- `query_dataset(dataset_id, query) → rows, columns`

**DataConnectorFactory:**
- `create_connector(type, config) → DataSourceConnector`
- `get_supported_types() → List[ConnectorType]`
- `get_connector_requirements(type) → ConfigSchema`

**DataSourceConnector (Abstract Base):**
```python
class DataSourceConnector(ABC):
    @abstractmethod
    async def test_connection(self) -> bool:
        """Test if connection is valid"""

    @abstractmethod
    async def get_schema(self) -> Dict[str, Any]:
        """Retrieve database/file schema"""

    @abstractmethod
    async def execute_query(self, query: QueryRequest) -> QueryResult:
        """Execute query and return results"""

    @abstractmethod
    async def get_sample_data(self, limit: int = 100) -> List[Dict]:
        """Fetch sample rows for preview"""
```

**Concrete Implementations:**
- `PostgreSQLConnector`: Uses asyncpg for async PostgreSQL operations
- `MySQLConnector`: Uses aiomysql for async MySQL operations
- `MariaDBConnector`: Inherits from MySQLConnector
- `CSVFileConnector`: Uses pandas for CSV parsing and type inference
- `ExcelConnector`: Uses openpyxl for Excel file reading
- `JSONConnector`: Uses json module with schema inference
- `PDFConnector`: Uses pdfplumber or tabula-py for table extraction

### 3.3 Database Components

#### 3.3.1 PostgreSQL Schema

**users table:**
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    is_superuser BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**workspaces table:**
```sql
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**datasets table:**
```sql
CREATE TABLE datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    connector_type VARCHAR(50) NOT NULL, -- csv, excel, postgresql, mysql, etc.
    connector_config JSONB,              -- Encrypted connection details
    schema_json JSONB,                   -- Inferred schema
    sample_rows JSONB,                   -- First 100 rows for preview
    file_path VARCHAR(500),              -- S3 key for uploaded files
    file_url VARCHAR(500),               -- Public URL if applicable
    file_size BIGINT,                    -- File size in bytes
    row_count INTEGER,
    status VARCHAR(50) DEFAULT 'pending', -- pending, ready, error, refreshing
    error_message TEXT,
    refresh_enabled BOOLEAN DEFAULT FALSE,
    refresh_schedule JSONB,              -- Cron schedule config
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**reports table:**
```sql
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    report_json JSONB NOT NULL,          -- Complete report definition
    thumbnail_url VARCHAR(500),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**dashboards table:**
```sql
CREATE TABLE dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    layout_json JSONB NOT NULL,          -- Dashboard tiles and layout
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**permissions table:**
```sql
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,           -- owner, editor, viewer
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, workspace_id)
);
```

#### 3.3.2 Indexes
```sql
CREATE INDEX idx_datasets_workspace ON datasets(workspace_id);
CREATE INDEX idx_reports_workspace ON reports(workspace_id);
CREATE INDEX idx_permissions_user ON permissions(user_id);
CREATE INDEX idx_permissions_workspace ON permissions(workspace_id);
CREATE INDEX idx_datasets_status ON datasets(status);
```

---

## 4. Data Flow

### 4.1 User Authentication Flow
```
1. User enters email/password → POST /api/auth/login
2. Backend validates credentials (bcrypt hash comparison)
3. If valid, generate JWT token (HS256 algorithm)
4. Return token + user info to frontend
5. Frontend stores token in localStorage
6. Subsequent requests include: Authorization: Bearer <token>
7. Backend middleware validates token on every protected route
```

### 4.2 CSV File Upload Flow
```
┌─────────┐                    ┌─────────┐                   ┌─────────┐
│ Browser │                    │ Backend │                   │ MinIO   │
└────┬────┘                    └────┬────┘                   └────┬────┘
     │                              │                             │
     │ 1. Select CSV file           │                             │
     │────────────────────────────► │                             │
     │                              │                             │
     │ 2. POST /api/datasets        │                             │
     │    (multipart/form-data)     │                             │
     │────────────────────────────► │                             │
     │                              │ 3. Store file in MinIO      │
     │                              │───────────────────────────► │
     │                              │                             │
     │                              │ 4. Read file for analysis   │
     │                              │◄────────────────────────────│
     │                              │                             │
     │                              │ 5. Parse CSV with pandas    │
     │                              │    • Infer column types     │
     │                              │    • Extract sample rows    │
     │                              │    • Count total rows       │
     │                              │                             │
     │                              │ 6. Save Dataset to PostgreSQL
     │                              │    status=READY             │
     │                              │                             │
     │ 7. Return Dataset object     │                             │
     │◄─────────────────────────────│                             │
     │                              │                             │
     │ 8. Display in dataset list   │                             │
     │                              │                             │
```

### 4.3 Database Connection Flow
```
┌─────────┐              ┌─────────┐              ┌──────────────┐
│ Browser │              │ Backend │              │ External DB  │
└────┬────┘              └────┬────┘              └──────┬───────┘
     │                        │                          │
     │ 1. Fill DB config form │                          │
     │────────────────────────►│                          │
     │                        │                          │
     │ 2. Test Connection btn │                          │
     │────────────────────────►│ 3. Create connector     │
     │                        │    (PostgreSQLConnector) │
     │                        │                          │
     │                        │ 4. Test connection       │
     │                        │─────────────────────────►│
     │                        │                          │
     │                        │ 5. Connection OK         │
     │                        │◄─────────────────────────│
     │                        │                          │
     │ 6. Success message     │                          │
     │◄────────────────────────│                          │
     │                        │                          │
     │ 7. Create Dataset btn  │                          │
     │────────────────────────►│ 8. Get schema            │
     │                        │─────────────────────────►│
     │                        │                          │
     │                        │ 9. Tables + columns      │
     │                        │◄─────────────────────────│
     │                        │                          │
     │                        │ 10. Save Dataset with    │
     │                        │     encrypted config     │
     │                        │     to PostgreSQL        │
     │                        │                          │
     │ 11. Dataset created    │                          │
     │◄────────────────────────│                          │
```

### 4.4 Report Creation Flow
```
1. User selects dataset → Frontend loads schema
2. User drags fields to canvas (X-axis, Y-axis, filters)
3. User selects visualization type (bar, line, pie, etc.)
4. Frontend generates Vega-Lite spec locally
5. Frontend renders preview with Vega-Lite renderer
6. User clicks "Save Report"
7. Frontend POSTs report JSON to /api/reports
8. Backend validates and stores report in PostgreSQL
9. Backend returns report ID
10. Frontend navigates to saved report view
```

### 4.5 Query Execution Flow
```
1. User opens report with visualizations
2. Frontend identifies required datasets
3. Frontend builds QueryRequest for each visual:
   {
     "columns": ["category", "sales"],
     "filters": [{"field": "year", "operator": "=", "value": 2024}],
     "group_by": ["category"],
     "aggregations": [{"field": "sales", "function": "sum"}],
     "limit": 1000
   }
4. POST /api/datasets/{id}/query
5. Backend checks Redis cache (key: dataset_id + query hash)
6. If cached, return cached result
7. If not cached:
   a. Load connector config from dataset
   b. Instantiate connector (PostgreSQLConnector, etc.)
   c. Translate QueryRequest to SQL or file operation
   d. Execute query with timeout
   e. Cache result in Redis (TTL: 5 minutes)
8. Return query result to frontend
9. Frontend passes data to Vega-Lite for rendering
```

---

## 5. Technology Stack

### 5.1 Frontend Stack
| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| Framework | React | 18.x | UI component library |
| Language | TypeScript | 5.x | Type-safe JavaScript |
| Build Tool | Vite | 5.x | Fast build and HMR |
| State Management | Zustand | 4.x | Lightweight state management |
| Routing | React Router | 6.x | Client-side routing |
| HTTP Client | Axios | 1.x | API communication |
| Visualization | Vega-Lite | 5.x | Declarative charts |
| UI Components | Custom + Tailwind | - | Styled components |
| File Parsing | Papa Parse | 5.x | CSV parsing in browser |
| Local Storage | IndexedDB | - | Offline data storage |
| Form Handling | React Hook Form | 7.x | Form validation |

### 5.2 Backend Stack
| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| Framework | FastAPI | 0.104+ | Async web framework |
| Language | Python | 3.11+ | Backend language |
| ASGI Server | Uvicorn | 0.24+ | High-performance server |
| ORM | SQLAlchemy | 2.0+ | Database ORM with async |
| Database Driver | asyncpg | 0.29+ | PostgreSQL async driver |
| MySQL Driver | aiomysql | 0.2+ | MySQL async driver |
| Authentication | PyJWT | 2.8+ | JWT token generation |
| Password Hashing | bcrypt | 4.x | Secure password hashing |
| File Processing | pandas | 2.x | CSV/Excel data processing |
| Excel Support | openpyxl | 3.x | Excel file reading |
| PDF Support | pdfplumber | 0.10+ | PDF table extraction |
| S3 Client | boto3 | 1.x | MinIO/S3 operations |
| Caching | redis-py | 5.x | Redis client |
| Testing | pytest | 7.x | Unit testing framework |

### 5.3 Infrastructure Stack
| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Database | PostgreSQL | 15 | Metadata storage |
| Cache | Redis | 7 | Session and query cache |
| Object Storage | MinIO | Latest | S3-compatible file storage |
| Containerization | Docker | 24+ | Application containers |
| Orchestration | Docker Compose | 2.x | Multi-container setup |
| Reverse Proxy | Nginx | 1.25 (optional) | Load balancing, SSL |

### 5.4 Development Tools
| Tool | Purpose |
|------|---------|
| Git | Version control |
| GitHub | Code repository |
| VS Code | IDE |
| Alembic | Database migrations |
| Black | Python code formatting |
| ESLint | JavaScript linting |
| Prettier | Code formatting |
| Postman | API testing |

---

## 6. Database Schema

### 6.1 Entity Relationship Diagram
```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│    Users    │         │  Workspaces  │         │  Datasets   │
├─────────────┤         ├──────────────┤         ├─────────────┤
│ id (PK)     │◄───┐    │ id (PK)      │◄───┐    │ id (PK)     │
│ email       │    │    │ name         │    │    │ name        │
│ password    │    └────┤ owner_id(FK) │    └────┤ workspace_id│
│ full_name   │         │ description  │         │ type        │
│ is_active   │         │ created_at   │         │ config      │
│ created_at  │         └──────────────┘         │ schema_json │
└─────────────┘                │                 │ status      │
       │                       │                 │ file_path   │
       │                       │                 └─────────────┘
       │                       │                        │
       │                       │                        │
       │                       ▼                        │
       │             ┌──────────────┐                   │
       │             │   Reports    │                   │
       │             ├──────────────┤                   │
       │             │ id (PK)      │                   │
       │             │ workspace_id │                   │
       │             │ name         │                   │
       │             │ report_json  │───────────────────┘
       │             │ created_by   │  (references datasets)
       │             │ created_at   │
       │             └──────────────┘
       │
       ▼
┌─────────────┐         ┌──────────────┐
│ Permissions │         │  Dashboards  │
├─────────────┤         ├──────────────┤
│ id (PK)     │         │ id (PK)      │
│ user_id(FK) │         │ workspace_id │
│ workspace_id│         │ name         │
│ role        │         │ layout_json  │
│ created_at  │         │ created_at   │
└─────────────┘         └──────────────┘
```

### 6.2 Key Relationships
- **User → Workspace:** One-to-Many (one user owns multiple workspaces)
- **User → Permission:** One-to-Many (one user has permissions on multiple workspaces)
- **Workspace → Dataset:** One-to-Many (one workspace contains multiple datasets)
- **Workspace → Report:** One-to-Many (one workspace contains multiple reports)
- **Report → Dataset:** Many-to-Many (reports can reference multiple datasets via report_json)

### 6.3 Data Types and Constraints
- **UUID:** All primary keys use UUID v4 for global uniqueness
- **JSONB:** Schema and config data stored as JSONB for flexible querying
- **Timestamps:** All tables have created_at and updated_at
- **Cascade Deletes:** Deleting workspace deletes all datasets and reports
- **Encryption:** connector_config fields encrypted at application layer before storage

---

## 7. API Design

### 7.1 API Conventions
- **Base URL:** `http://localhost:8000/api`
- **Authentication:** Bearer token in `Authorization` header
- **Content-Type:** `application/json` (except file uploads: `multipart/form-data`)
- **Status Codes:**
  - 200: Success
  - 201: Created
  - 400: Bad Request (validation error)
  - 401: Unauthorized (missing/invalid token)
  - 403: Forbidden (insufficient permissions)
  - 404: Not Found
  - 500: Internal Server Error

### 7.2 Authentication Endpoints
```
POST /api/auth/register
Request:
{
  "email": "user@example.com",
  "password": "securepassword",
  "full_name": "John Doe"
}
Response:
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "John Doe"
}

POST /api/auth/login
Request:
{
  "email": "user@example.com",
  "password": "securepassword"
}
Response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe"
  }
}

GET /api/auth/me
Headers: Authorization: Bearer <token>
Response:
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "is_active": true
}
```

### 7.3 Workspace Endpoints
```
GET /api/workspaces
Response:
[
  {
    "id": "uuid",
    "name": "My Workspace",
    "description": "Analytics workspace",
    "created_at": "2024-12-30T10:00:00Z"
  }
]

POST /api/workspaces
Request:
{
  "name": "Sales Analytics",
  "description": "Q4 2024 sales data"
}
Response:
{
  "id": "uuid",
  "name": "Sales Analytics",
  "description": "Q4 2024 sales data",
  "owner_id": "uuid",
  "created_at": "2024-12-30T10:00:00Z"
}

DELETE /api/workspaces/{workspace_id}
Response: 204 No Content
```

### 7.4 Dataset Endpoints
```
POST /api/workspaces/{workspace_id}/datasets (CSV Upload)
Headers: Content-Type: multipart/form-data
FormData:
  file: <file binary>
  name: "Sales Data Q4"
Response:
{
  "id": "uuid",
  "workspace_id": "uuid",
  "name": "Sales Data Q4",
  "connector_type": "csv",
  "schema_json": {
    "columns": [
      {"name": "product", "type": "string"},
      {"name": "sales", "type": "number"}
    ]
  },
  "row_count": 1500,
  "file_size": 45000,
  "status": "ready",
  "created_at": "2024-12-30T10:00:00Z"
}

POST /api/workspaces/{workspace_id}/datasets (Database Connection)
Request:
{
  "name": "PostgreSQL Prod DB",
  "connector_type": "postgresql",
  "connector_config": {
    "host": "db.example.com",
    "port": 5432,
    "database": "sales",
    "username": "reader",
    "password": "securepass",
    "ssl_enabled": true
  }
}
Response:
{
  "id": "uuid",
  "workspace_id": "uuid",
  "name": "PostgreSQL Prod DB",
  "connector_type": "postgresql",
  "schema_json": {
    "tables": [
      {
        "name": "orders",
        "columns": [
          {"name": "id", "type": "integer"},
          {"name": "customer_id", "type": "integer"},
          {"name": "total", "type": "numeric"}
        ]
      }
    ]
  },
  "status": "ready",
  "created_at": "2024-12-30T10:00:00Z"
}

GET /api/datasets/{dataset_id}/preview?limit=100
Response:
{
  "columns": ["product", "sales", "region"],
  "data": [
    ["Widget A", 1500, "North"],
    ["Widget B", 2300, "South"]
  ],
  "total_rows": 1500
}

POST /api/datasets/{dataset_id}/query
Request:
{
  "columns": ["region", "sales"],
  "filters": [
    {"field": "year", "operator": "=", "value": 2024}
  ],
  "group_by": ["region"],
  "aggregations": [
    {"field": "sales", "function": "sum", "alias": "total_sales"}
  ],
  "order_by": [{"field": "total_sales", "direction": "desc"}],
  "limit": 100
}
Response:
{
  "columns": ["region", "total_sales"],
  "data": [
    ["North", 45000],
    ["South", 38000],
    ["East", 29000]
  ],
  "total_rows": 3,
  "execution_time_ms": 125
}

DELETE /api/datasets/{dataset_id}
Response: 204 No Content
```

### 7.5 Report Endpoints
```
POST /api/reports
Request:
{
  "workspace_id": "uuid",
  "name": "Sales Dashboard",
  "report_json": {
    "pages": [
      {
        "id": "page1",
        "visuals": [
          {
            "id": "chart1",
            "type": "bar",
            "dataset_id": "uuid",
            "encoding": {
              "x": {"field": "region", "type": "ordinal"},
              "y": {"field": "sales", "type": "quantitative"}
            },
            "position": {"x": 0, "y": 0, "width": 400, "height": 300}
          }
        ]
      }
    ]
  }
}
Response:
{
  "id": "uuid",
  "workspace_id": "uuid",
  "name": "Sales Dashboard",
  "report_json": {...},
  "created_at": "2024-12-30T10:00:00Z"
}

GET /api/reports/{report_id}
Response:
{
  "id": "uuid",
  "workspace_id": "uuid",
  "name": "Sales Dashboard",
  "report_json": {...},
  "created_at": "2024-12-30T10:00:00Z"
}

POST /api/reports/{report_id}/export
Request:
{
  "format": "png",
  "width": 1200,
  "height": 800
}
Response:
{
  "export_url": "https://minio:9000/syntra-data/exports/report-uuid.png"
}

DELETE /api/reports/{report_id}
Response: 204 No Content
```

---

## 8. Security Architecture

### 8.1 Authentication & Authorization
**JWT Token Structure:**
```json
{
  "sub": "user_id_uuid",
  "email": "user@example.com",
  "exp": 1735574400,
  "iat": 1735488000
}
```

**Token Lifecycle:**
1. User logs in → Backend generates JWT signed with HS256 algorithm
2. Token expires after 60 minutes (configurable)
3. Frontend stores token in localStorage
4. Every API request includes token in Authorization header
5. Backend middleware validates token signature and expiration
6. If invalid/expired, return 401 Unauthorized

### 8.2 Password Security
- **Hashing:** bcrypt with salt rounds = 12
- **Storage:** Only hashed passwords stored in database
- **Validation:** Constant-time comparison to prevent timing attacks
- **Requirements:** Minimum 8 characters (configurable)

### 8.3 Data Protection
**In Transit:**
- HTTPS/TLS 1.3 for all production traffic
- WebSocket connections use WSS (WebSocket Secure)

**At Rest:**
- Database credentials in `connector_config` encrypted with AES-256
- S3 files can use server-side encryption (MinIO supports SSE-S3)
- PostgreSQL passwords hashed with bcrypt

**Secrets Management:**
- Environment variables for sensitive config (JWT secret, DB passwords)
- `.env` file for local development (not committed to Git)
- Production: Use secret management (AWS Secrets Manager, Vault)

### 8.4 Input Validation
- **Backend:** Pydantic models validate all request payloads
- **Frontend:** React Hook Form with Zod schemas
- **SQL Injection Prevention:** SQLAlchemy ORM with parameterized queries
- **File Upload Validation:**
  - File type whitelist (csv, xlsx, json, pdf)
  - Max file size: 100MB
  - Virus scanning (optional, future phase)

### 8.5 CORS Configuration
```python
CORS_ORIGINS = [
    "http://localhost:3000",  # React dev server
    "http://localhost:5173",  # Vite dev server
    "https://syntra.example.com"  # Production domain
]
```

### 8.6 Rate Limiting (Future Enhancement)
- API rate limits per user: 100 requests/minute
- File upload limits: 10 uploads/hour per user
- Query execution: 60 queries/minute per dataset

---

## 9. Deployment Architecture

### 9.1 Local Development (Docker Compose)
```yaml
services:
  postgres:
    image: postgres:15-alpine
    ports: ["5432:5432"]
    volumes: [postgres_data:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  minio:
    image: minio/minio:latest
    ports: ["9000:9000", "9001:9001"]
    volumes: [minio_data:/data]

  backend:
    build: ./backend
    ports: ["8000:8000"]
    depends_on: [postgres, redis, minio]
    environment:
      - DATABASE_URL=postgresql://syntra:syntra123@postgres:5432/syntra
      - REDIS_URL=redis://redis:6379
      - S3_ENDPOINT=http://minio:9000

  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    depends_on: [backend]
    environment:
      - VITE_API_BASE_URL=http://localhost:8000
```

**Startup:**
```bash
docker-compose up --build
```

**Access:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- MinIO Console: http://localhost:9001

### 9.2 Production Deployment (Future)

**Option 1: Docker Swarm**
```
Load Balancer (Nginx)
  ├─ Backend (3 replicas)
  ├─ Frontend (2 replicas)
  ├─ PostgreSQL (1 primary + 1 standby)
  ├─ Redis (1 instance with persistence)
  └─ MinIO (distributed mode, 4 nodes)
```

**Option 2: Kubernetes**
```
Ingress Controller
  ├─ Backend Deployment (HPA: 2-10 pods)
  ├─ Frontend Deployment (2 replicas)
  ├─ PostgreSQL StatefulSet (1 pod with PVC)
  ├─ Redis StatefulSet (1 pod with PVC)
  └─ MinIO StatefulSet (4 pods with PVCs)
```

### 9.3 Environment Configuration

**Development:**
- DATABASE_URL: Local PostgreSQL container
- DEBUG: True
- LOG_LEVEL: DEBUG
- CORS: Allow localhost

**Staging:**
- DATABASE_URL: Cloud PostgreSQL (managed)
- DEBUG: False
- LOG_LEVEL: INFO
- CORS: Allow staging domain

**Production:**
- DATABASE_URL: Cloud PostgreSQL with read replicas
- DEBUG: False
- LOG_LEVEL: WARNING
- CORS: Allow production domain only
- SSL: Enforced
- Monitoring: Prometheus + Grafana

---

## 10. Design Patterns

### 10.1 Factory Pattern
**DataConnectorFactory** creates connector instances based on type:
```python
def create_connector(connector_type: str, config: dict) -> DataSourceConnector:
    if connector_type == "postgresql":
        return PostgreSQLConnector(config)
    elif connector_type == "mysql":
        return MySQLConnector(config)
    elif connector_type == "csv":
        return CSVFileConnector(config)
    # ...
```

### 10.2 Strategy Pattern
Each connector implements the same interface (`DataSourceConnector`) but with different strategies for querying data:
- PostgreSQL: SQL queries via asyncpg
- CSV: Pandas DataFrame operations
- Excel: Openpyxl sheet iteration

### 10.3 Repository Pattern
Service layer abstracts database operations:
```python
class DatasetService:
    async def get_dataset(self, dataset_id: UUID) -> Dataset:
        # Database query logic encapsulated

    async def create_dataset(self, workspace_id: UUID, data) -> Dataset:
        # Create logic encapsulated
```

### 10.4 Dependency Injection
FastAPI uses dependency injection for:
- Database sessions
- Current authenticated user
- Configuration objects

```python
@router.get("/datasets/{dataset_id}")
async def get_dataset(
    dataset_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Dependencies automatically injected
```

### 10.5 Async/Await Pattern
All I/O operations are async to prevent blocking:
```python
async def query_dataset(dataset_id: UUID, query: QueryRequest):
    connector = await create_connector(...)
    result = await connector.execute_query(query)
    return result
```

---

## 11. Performance Considerations

### 11.1 Query Optimization
- **Caching:** Redis caches query results (TTL: 5 minutes)
- **Connection Pooling:** SQLAlchemy pool size: 20, overflow: 10
- **Pagination:** Default limit 1000 rows, max 10,000
- **Indexes:** Database indexes on frequently queried fields

### 11.2 File Upload Optimization
- **Streaming:** Large files uploaded in chunks
- **Async Processing:** File parsing happens asynchronously
- **Progress Tracking:** WebSocket updates for upload progress (future)

### 11.3 Frontend Optimization
- **Code Splitting:** Lazy load routes and components
- **Memoization:** React.memo for expensive components
- **Virtual Scrolling:** For large dataset previews
- **Debouncing:** Search and filter inputs debounced 300ms

---

## 12. Monitoring & Logging

### 12.1 Logging
**Backend:**
- Log level: INFO (production), DEBUG (development)
- Format: JSON structured logging
- Destination: stdout (captured by Docker)
- Key events: API requests, errors, database queries

**Frontend:**
- Console logging (development only)
- Error tracking: Sentry (future)

### 12.2 Metrics (Future)
- Request latency (p50, p95, p99)
- Database connection pool usage
- Query execution times
- File upload success/failure rates
- User session duration

---

## Appendix

### A. Glossary
- **Dataset:** Configured connection to a data source with metadata
- **Connector:** Implementation that reads data from a specific source type
- **Workspace:** Logical grouping of datasets and reports
- **Report:** Saved visualization configuration
- **Schema:** Structure definition (tables, columns, data types)
- **Query Request:** Declarative query specification (filters, aggregations, etc.)

### B. References
- FastAPI Documentation: https://fastapi.tiangolo.com/
- SQLAlchemy 2.0: https://docs.sqlalchemy.org/en/20/
- Vega-Lite: https://vega.github.io/vega-lite/
- React: https://react.dev/
- PostgreSQL: https://www.postgresql.org/docs/

### C. Revision History
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-12-30 | Dev Team | Initial HLD for Phase 1 |

---

**Document Status:** APPROVED FOR PHASE 1 IMPLEMENTATION
**Next Review:** 2025-01-15
