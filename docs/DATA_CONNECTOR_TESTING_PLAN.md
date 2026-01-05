# Data Connector Testing Plan - Phase 1

**Date:** January 5, 2025
**Status:** Ready for Execution
**Scope:** Verify all 7 Phase 1 data connectors are functional

---

## Table of Contents
1. [Testing Objectives](#testing-objectives)
2. [Testing Scope](#testing-scope)
3. [Test Environment Setup](#test-environment-setup)
4. [Unit Tests](#unit-tests)
5. [Integration Tests](#integration-tests)
6. [Manual QA Tests](#manual-qa-tests)
7. [Performance Tests](#performance-tests)
8. [Security Tests](#security-tests)
9. [Test Data Requirements](#test-data-requirements)
10. [Success Criteria](#success-criteria)
11. [Test Execution Checklist](#test-execution-checklist)

---

## 1. Testing Objectives

### Primary Goals
- ✅ Verify all 7 Phase 1 connectors work end-to-end
- ✅ Validate data integration workflow from Phase 2 dev-plan
- ✅ Ensure schema inference works correctly for all file types
- ✅ Confirm database connectors can connect, query, and import data
- ✅ Validate error handling and user feedback

### Success Metrics
- **Coverage:** >80% unit test coverage for connector code
- **Reliability:** 100% of test cases pass
- **Performance:** All connectors meet performance targets
- **User Experience:** Clear error messages and progress indicators

---

## 2. Testing Scope

### 2.1 Phase 1 Connectors (7 Total)

#### File Connectors (4)
| Connector | Status | Priority | Test Focus |
|-----------|--------|----------|------------|
| **CSV** | ✅ Implemented | Critical | Type inference, delimiter detection, large files |
| **Excel** | ✅ Implemented | Critical | Multi-sheet support, .xlsx and .xls formats |
| **JSON** | ✅ Implemented | High | Flat/nested JSON, schema inference |
| **PDF** | ✅ Implemented | Medium | Table extraction, multi-page support |

#### Database Connectors (3)
| Connector | Status | Priority | Test Focus |
|-----------|--------|----------|------------|
| **PostgreSQL** | ✅ Implemented | Critical | Connection, schema browsing, query execution |
| **MySQL** | ✅ Implemented | Critical | Connection, SSL support, query execution |
| **MariaDB** | ✅ Implemented | High | Connection (inherits from MySQL) |

### 2.2 Out of Scope for Phase 1
- Cloud connectors (BigQuery, Snowflake, etc.)
- Azure services
- Advanced ETL and refresh scheduling
- Row-level security
- Custom visualization plugins

---

## 3. Test Environment Setup

### 3.1 Prerequisites

**Required Services (Docker Compose):**
```bash
# Start all services
cd D:\repos\syntrabi
docker-compose up -d

# Verify services are running
docker ps
```

**Expected Services:**
- PostgreSQL (port 5432)
- MySQL (port 3306) - if configured
- Redis (port 6379)
- MinIO (ports 9000, 9001)
- Backend API (port 8000)
- Frontend (port 3000)

### 3.2 Test Database Setup

**PostgreSQL Test Database:**
```sql
-- Create test database
CREATE DATABASE syntra_test;

-- Create test schema and tables
CREATE SCHEMA sales;

CREATE TABLE sales.orders (
    id SERIAL PRIMARY KEY,
    order_date DATE NOT NULL,
    customer_name VARCHAR(100),
    product VARCHAR(100),
    quantity INTEGER,
    unit_price NUMERIC(10,2),
    total NUMERIC(10,2)
);

-- Insert sample data
INSERT INTO sales.orders (order_date, customer_name, product, quantity, unit_price, total)
VALUES
    ('2024-01-15', 'John Doe', 'Widget A', 100, 12.99, 1299.00),
    ('2024-01-16', 'Jane Smith', 'Gadget B', 50, 24.50, 1225.00),
    ('2024-01-17', 'Bob Johnson', 'Tool C', 75, 18.25, 1368.75);
```

**MySQL Test Database:**
```sql
-- Create test database
CREATE DATABASE syntra_test;

USE syntra_test;

-- Create test table
CREATE TABLE customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO customers (name, email) VALUES
    ('Alice Brown', 'alice@example.com'),
    ('Charlie Davis', 'charlie@example.com'),
    ('Diana Evans', 'diana@example.com');
```

### 3.3 Test Files Preparation

**Create test data directory:**
```bash
mkdir -p D:\repos\syntrabi\test-data
cd D:\repos\syntrabi\test-data
```

**1. CSV Test File (test_sales.csv):**
```csv
date,product,region,sales,quantity
2024-01-01,Widget A,North,1500.00,100
2024-01-02,Widget B,South,2300.00,150
2024-01-03,Gadget C,East,1800.00,120
2024-01-04,Tool D,West,2100.00,140
2024-01-05,Widget A,North,1700.00,110
```

**2. Excel Test File (test_inventory.xlsx):**
Create with multiple sheets:
- Sheet 1: Products (id, name, category, price)
- Sheet 2: Stock (product_id, warehouse, quantity)

**3. JSON Test File (test_employees.json):**
```json
[
  {
    "id": 1,
    "name": "John Doe",
    "department": "Engineering",
    "salary": 75000,
    "hire_date": "2020-01-15",
    "is_active": true
  },
  {
    "id": 2,
    "name": "Jane Smith",
    "department": "Marketing",
    "salary": 65000,
    "hire_date": "2021-03-20",
    "is_active": true
  },
  {
    "id": 3,
    "name": "Bob Johnson",
    "department": "Sales",
    "salary": 70000,
    "hire_date": "2019-07-10",
    "is_active": false
  }
]
```

**4. Nested JSON Test File (test_nested.json):**
```json
[
  {
    "user": {
      "id": 1,
      "name": "Alice",
      "contact": {
        "email": "alice@example.com",
        "phone": "555-0001"
      }
    },
    "orders": [
      {"order_id": 101, "amount": 299.99},
      {"order_id": 102, "amount": 149.99}
    ]
  }
]
```

**5. PDF Test File (test_report.pdf):**
Create a simple PDF with a table (can use any PDF with tabular data)

---

## 4. Unit Tests

### 4.1 Backend Connector Unit Tests

**Location:** `backend/tests/test_data_connectors.py`

#### 4.1.1 CSV Connector Tests
```python
import pytest
from app.services.data_connectors import CSVFileConnector, DataConnectorFactory
from app.models.dataset import ConnectorType

class TestCSVConnector:
    """Test CSV file connector functionality"""

    @pytest.mark.asyncio
    async def test_csv_schema_inference(self):
        """Test that CSV schema is correctly inferred"""
        config = {"file_path": "test-data/test_sales.csv"}
        connector = CSVFileConnector(config)

        schema = await connector.get_schema()

        assert "columns" in schema
        assert len(schema["columns"]) == 5
        assert schema["columns"][0]["name"] == "date"
        assert schema["columns"][0]["type"] == "datetime"
        assert schema["columns"][3]["name"] == "sales"
        assert schema["columns"][3]["type"] == "number"

    @pytest.mark.asyncio
    async def test_csv_type_detection(self):
        """Test CSV type inference for different data types"""
        config = {"file_path": "test-data/test_sales.csv"}
        connector = CSVFileConnector(config)

        schema = await connector.get_schema()
        types = {col["name"]: col["type"] for col in schema["columns"]}

        assert types["date"] in ["datetime", "string"]  # Date detection
        assert types["product"] == "string"
        assert types["sales"] == "number"
        assert types["quantity"] == "integer"

    @pytest.mark.asyncio
    async def test_csv_sample_data(self):
        """Test CSV sample data retrieval"""
        config = {"file_path": "test-data/test_sales.csv"}
        connector = CSVFileConnector(config)

        sample = await connector.get_sample_data(limit=3)

        assert len(sample) <= 3
        assert "product" in sample[0]
        assert "sales" in sample[0]

    @pytest.mark.asyncio
    async def test_csv_delimiter_detection(self):
        """Test CSV delimiter auto-detection"""
        # Test with semicolon-delimited file
        config = {"file_path": "test-data/test_semicolon.csv"}
        connector = CSVFileConnector(config)

        schema = await connector.get_schema()
        assert len(schema["columns"]) > 1  # Should detect columns correctly

#### 4.1.2 Excel Connector Tests
```python
class TestExcelConnector:
    """Test Excel file connector functionality"""

    @pytest.mark.asyncio
    async def test_excel_multi_sheet_support(self):
        """Test Excel multi-sheet detection"""
        config = {"file_path": "test-data/test_inventory.xlsx"}
        connector = ExcelConnector(config)

        schema = await connector.get_schema()

        assert "sheets" in schema
        assert len(schema["sheets"]) >= 2
        assert any(sheet["name"] == "Products" for sheet in schema["sheets"])

    @pytest.mark.asyncio
    async def test_excel_schema_inference(self):
        """Test Excel schema inference"""
        config = {
            "file_path": "test-data/test_inventory.xlsx",
            "sheet_name": "Products"
        }
        connector = ExcelConnector(config)

        schema = await connector.get_schema()

        assert "columns" in schema
        assert len(schema["columns"]) > 0

    @pytest.mark.asyncio
    async def test_excel_xls_format(self):
        """Test legacy .xls format support"""
        config = {"file_path": "test-data/test_legacy.xls"}
        connector = ExcelConnector(config)

        schema = await connector.get_schema()
        assert "columns" in schema

#### 4.1.3 JSON Connector Tests
```python
class TestJSONConnector:
    """Test JSON file connector functionality"""

    @pytest.mark.asyncio
    async def test_json_flat_array(self):
        """Test flat JSON array parsing"""
        config = {"file_path": "test-data/test_employees.json"}
        connector = JSONConnector(config)

        schema = await connector.get_schema()

        assert "columns" in schema
        assert len(schema["columns"]) == 6
        assert any(col["name"] == "name" for col in schema["columns"])

    @pytest.mark.asyncio
    async def test_json_type_inference(self):
        """Test JSON type detection"""
        config = {"file_path": "test-data/test_employees.json"}
        connector = JSONConnector(config)

        schema = await connector.get_schema()
        types = {col["name"]: col["type"] for col in schema["columns"]}

        assert types["id"] == "integer"
        assert types["name"] == "string"
        assert types["salary"] == "number"
        assert types["is_active"] == "boolean"

    @pytest.mark.asyncio
    async def test_json_nested_structure(self):
        """Test nested JSON flattening"""
        config = {"file_path": "test-data/test_nested.json"}
        connector = JSONConnector(config)

        schema = await connector.get_schema()

        # Should flatten nested structures
        column_names = [col["name"] for col in schema["columns"]]
        assert any("user" in name or "contact" in name for name in column_names)

    @pytest.mark.asyncio
    async def test_json_sample_data(self):
        """Test JSON sample data retrieval"""
        config = {"file_path": "test-data/test_employees.json"}
        connector = JSONConnector(config)

        sample = await connector.get_sample_data(limit=2)

        assert len(sample) <= 2
        assert "name" in sample[0]

#### 4.1.4 PDF Connector Tests
```python
class TestPDFConnector:
    """Test PDF file connector functionality"""

    @pytest.mark.asyncio
    async def test_pdf_table_extraction(self):
        """Test PDF table extraction"""
        config = {"file_path": "test-data/test_report.pdf"}
        connector = PDFConnector(config)

        schema = await connector.get_schema()

        assert "columns" in schema
        assert len(schema["columns"]) > 0

    @pytest.mark.asyncio
    async def test_pdf_multi_page(self):
        """Test multi-page PDF support"""
        config = {
            "file_path": "test-data/test_multipage.pdf",
            "page": 1  # Extract from first page
        }
        connector = PDFConnector(config)

        schema = await connector.get_schema()
        assert "columns" in schema

    @pytest.mark.asyncio
    async def test_pdf_error_handling_no_tables(self):
        """Test error handling for PDFs without tables"""
        config = {"file_path": "test-data/test_no_tables.pdf"}
        connector = PDFConnector(config)

        with pytest.raises(Exception) as exc:
            await connector.get_schema()

        assert "No tables found" in str(exc.value)

#### 4.1.5 PostgreSQL Connector Tests
```python
class TestPostgreSQLConnector:
    """Test PostgreSQL database connector"""

    @pytest.mark.asyncio
    async def test_postgresql_connection(self):
        """Test PostgreSQL connection"""
        config = {
            "host": "localhost",
            "port": 5432,
            "database": "syntra_test",
            "username": "syntra",
            "password": "syntra123"
        }
        connector = PostgreSQLConnector(config)

        success, message = await connector.test_connection()

        assert success is True
        assert "successful" in message.lower()

    @pytest.mark.asyncio
    async def test_postgresql_schema_retrieval(self):
        """Test PostgreSQL schema browsing"""
        config = {
            "host": "localhost",
            "port": 5432,
            "database": "syntra_test",
            "username": "syntra",
            "password": "syntra123"
        }
        connector = PostgreSQLConnector(config)

        schema = await connector.get_schema()

        assert "tables" in schema
        assert any(table["schema"] == "sales" for table in schema["tables"])
        assert any(table["name"] == "orders" for table in schema["tables"])

    @pytest.mark.asyncio
    async def test_postgresql_query_execution(self):
        """Test PostgreSQL query execution"""
        config = {
            "host": "localhost",
            "port": 5432,
            "database": "syntra_test",
            "username": "syntra",
            "password": "syntra123"
        }
        connector = PostgreSQLConnector(config)

        result = await connector.execute_query(
            "SELECT * FROM sales.orders LIMIT 10"
        )

        assert "columns" in result
        assert "data" in result
        assert len(result["data"]) <= 10

    @pytest.mark.asyncio
    async def test_postgresql_connection_failure(self):
        """Test PostgreSQL connection error handling"""
        config = {
            "host": "invalid-host",
            "port": 5432,
            "database": "test",
            "username": "user",
            "password": "pass"
        }
        connector = PostgreSQLConnector(config)

        success, message = await connector.test_connection()

        assert success is False
        assert len(message) > 0

#### 4.1.6 MySQL Connector Tests
```python
class TestMySQLConnector:
    """Test MySQL database connector"""

    @pytest.mark.asyncio
    async def test_mysql_connection(self):
        """Test MySQL connection"""
        config = {
            "host": "localhost",
            "port": 3306,
            "database": "syntra_test",
            "username": "root",
            "password": "password"
        }
        connector = MySQLConnector(config)

        success, message = await connector.test_connection()

        assert success is True

    @pytest.mark.asyncio
    async def test_mysql_schema_retrieval(self):
        """Test MySQL schema browsing"""
        config = {
            "host": "localhost",
            "port": 3306,
            "database": "syntra_test",
            "username": "root",
            "password": "password"
        }
        connector = MySQLConnector(config)

        schema = await connector.get_schema()

        assert "tables" in schema
        assert any(table["name"] == "customers" for table in schema["tables"])

    @pytest.mark.asyncio
    async def test_mysql_ssl_connection(self):
        """Test MySQL SSL connection"""
        config = {
            "host": "localhost",
            "port": 3306,
            "database": "syntra_test",
            "username": "root",
            "password": "password",
            "ssl_enabled": True
        }
        connector = MySQLConnector(config)

        success, message = await connector.test_connection()
        # May succeed or fail depending on server SSL config
        assert isinstance(success, bool)

#### 4.1.7 MariaDB Connector Tests
```python
class TestMariaDBConnector:
    """Test MariaDB database connector (inherits from MySQL)"""

    @pytest.mark.asyncio
    async def test_mariadb_connection(self):
        """Test MariaDB connection"""
        config = {
            "host": "localhost",
            "port": 3306,
            "database": "syntra_test",
            "username": "root",
            "password": "password"
        }
        connector = MariaDBConnector(config)

        success, message = await connector.test_connection()

        assert success is True

#### 4.1.8 Data Connector Factory Tests
```python
class TestDataConnectorFactory:
    """Test connector factory pattern"""

    def test_factory_creates_csv_connector(self):
        """Test factory creates CSV connector"""
        connector = DataConnectorFactory.create_connector(
            ConnectorType.CSV,
            {"file_path": "test.csv"}
        )
        assert isinstance(connector, CSVFileConnector)

    def test_factory_creates_postgresql_connector(self):
        """Test factory creates PostgreSQL connector"""
        connector = DataConnectorFactory.create_connector(
            ConnectorType.POSTGRESQL,
            {"host": "localhost", "database": "test"}
        )
        assert isinstance(connector, PostgreSQLConnector)

    def test_factory_unsupported_type(self):
        """Test factory raises error for unsupported type"""
        with pytest.raises(ValueError) as exc:
            DataConnectorFactory.create_connector(
                "unsupported_type",
                {}
            )
        assert "not supported" in str(exc.value).lower()
```

### 4.2 Running Unit Tests

```bash
# Install test dependencies
cd backend
pip install pytest pytest-asyncio pytest-cov

# Run all connector tests
pytest tests/test_data_connectors.py -v

# Run with coverage
pytest tests/test_data_connectors.py --cov=app/services/data_connectors --cov-report=html

# Run specific test class
pytest tests/test_data_connectors.py::TestCSVConnector -v

# Run specific test
pytest tests/test_data_connectors.py::TestCSVConnector::test_csv_schema_inference -v
```

---

## 5. Integration Tests

### 5.1 End-to-End Workflow Tests

**Location:** `backend/tests/integration/test_connector_workflows.py`

```python
import pytest
from httpx import AsyncClient
from app.main import app

class TestCSVWorkflow:
    """Test complete CSV upload workflow"""

    @pytest.mark.asyncio
    async def test_csv_upload_to_visualization(self):
        """Test: CSV upload → dataset creation → query → visualization"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            # Step 1: Login
            login_response = await client.post("/api/auth/login", json={
                "email": "test@example.com",
                "password": "password"
            })
            assert login_response.status_code == 200
            token = login_response.json()["access_token"]

            headers = {"Authorization": f"Bearer {token}"}

            # Step 2: Create workspace
            workspace_response = await client.post(
                "/api/workspaces",
                json={"name": "Test Workspace"},
                headers=headers
            )
            workspace_id = workspace_response.json()["id"]

            # Step 3: Upload CSV file
            with open("test-data/test_sales.csv", "rb") as f:
                files = {"file": ("test_sales.csv", f, "text/csv")}
                dataset_response = await client.post(
                    f"/api/datasets/workspaces/{workspace_id}/datasets",
                    files=files,
                    headers=headers
                )

            assert dataset_response.status_code == 201
            dataset_id = dataset_response.json()["id"]

            # Step 4: Get dataset preview
            preview_response = await client.get(
                f"/api/datasets/{dataset_id}/preview?limit=100",
                headers=headers
            )
            assert preview_response.status_code == 200
            preview = preview_response.json()
            assert len(preview["data"]) > 0

            # Step 5: Query dataset
            query_response = await client.post(
                f"/api/datasets/{dataset_id}/query",
                json={
                    "columns": ["region", "sales"],
                    "aggregations": [{"field": "sales", "function": "sum"}],
                    "group_by": ["region"]
                },
                headers=headers
            )
            assert query_response.status_code == 200
            result = query_response.json()
            assert "data" in result

            # Step 6: Create report with visualization
            report_response = await client.post(
                "/api/reports",
                json={
                    "workspace_id": workspace_id,
                    "name": "Sales by Region",
                    "report_json": {
                        "pages": [{
                            "visuals": [{
                                "type": "bar",
                                "dataset_id": dataset_id,
                                "encoding": {
                                    "x": {"field": "region"},
                                    "y": {"field": "sales", "aggregate": "sum"}
                                }
                            }]
                        }]
                    }
                },
                headers=headers
            )
            assert report_response.status_code == 201

class TestDatabaseWorkflow:
    """Test complete database connection workflow"""

    @pytest.mark.asyncio
    async def test_postgresql_connection_to_query(self):
        """Test: PostgreSQL connection → test → create dataset → query"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            # Login and setup
            token = await self._login_and_get_token(client)
            workspace_id = await self._create_workspace(client, token)
            headers = {"Authorization": f"Bearer {token}"}

            # Test connection
            test_response = await client.post(
                "/api/datasets/connectors/test",
                json={
                    "connector_type": "postgresql",
                    "config": {
                        "host": "localhost",
                        "port": 5432,
                        "database": "syntra_test",
                        "username": "syntra",
                        "password": "syntra123"
                    }
                },
                headers=headers
            )
            assert test_response.status_code == 200
            assert test_response.json()["success"] is True

            # Create database dataset
            dataset_response = await client.post(
                f"/api/datasets/workspaces/{workspace_id}/datasets",
                json={
                    "name": "PostgreSQL Test",
                    "connector_type": "postgresql",
                    "connector_config": {
                        "host": "localhost",
                        "port": 5432,
                        "database": "syntra_test",
                        "username": "syntra",
                        "password": "syntra123"
                    }
                },
                headers=headers
            )
            assert dataset_response.status_code == 201
            dataset_id = dataset_response.json()["id"]

            # Query dataset
            query_response = await client.post(
                f"/api/datasets/{dataset_id}/query",
                json={
                    "query": "SELECT product, SUM(total) as revenue FROM sales.orders GROUP BY product"
                },
                headers=headers
            )
            assert query_response.status_code == 200
            assert len(query_response.json()["data"]) > 0
```

### 5.2 Frontend Integration Tests (Playwright)

**Location:** `frontend/tests/e2e/connectors.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Data Connector Workflows', () => {

  test('CSV upload workflow', async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button:has-text("Login")');

    // Navigate to workspace
    await expect(page.locator('text=Workspaces')).toBeVisible();
    await page.click('text=Create Workspace');
    await page.fill('[name="workspace-name"]', 'Test Workspace');
    await page.click('button:has-text("Create")');

    // Get Data - CSV
    await page.click('text=Get Data');
    await page.click('text=CSV');

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('test-data/test_sales.csv');

    // Verify preview appears
    await expect(page.locator('text=Preview')).toBeVisible();
    await expect(page.locator('table')).toBeVisible();

    // Import
    await page.fill('[name="dataset-name"]', 'Sales Data');
    await page.click('button:has-text("Import")');

    // Verify dataset created
    await expect(page.locator('text=Sales Data')).toBeVisible();
    await expect(page.locator('text=ready')).toBeVisible();
  });

  test('PostgreSQL connection workflow', async ({ page }) => {
    // Login and navigate
    await page.goto('http://localhost:3000');
    // ... login steps ...

    // Get Data - PostgreSQL
    await page.click('text=Get Data');
    await page.click('text=PostgreSQL');

    // Fill connection form
    await page.fill('[name="host"]', 'localhost');
    await page.fill('[name="port"]', '5432');
    await page.fill('[name="database"]', 'syntra_test');
    await page.fill('[name="username"]', 'syntra');
    await page.fill('[name="password"]', 'syntra123');

    // Test connection
    await page.click('button:has-text("Test Connection")');

    // Verify success
    await expect(page.locator('text=Connection successful')).toBeVisible();

    // Create dataset
    await page.fill('[name="dataset-name"]', 'PG Test Database');
    await page.click('button:has-text("Create Dataset")');

    // Verify dataset created
    await expect(page.locator('text=PG Test Database')).toBeVisible();
  });

  test('JSON upload with nested data', async ({ page }) => {
    // ... login and navigation ...

    // Upload JSON
    await page.click('text=Get Data');
    await page.click('text=JSON');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('test-data/test_nested.json');

    // Verify schema inference
    await expect(page.locator('text=Detected Schema')).toBeVisible();

    // Check for flattened fields
    await expect(page.locator('text=user.name')).toBeVisible();

    // Import
    await page.click('button:has-text("Import")');
    await expect(page.locator('text=ready')).toBeVisible();
  });
});
```

---

## 6. Manual QA Tests

### 6.1 File Upload Tests

#### CSV Upload
- [ ] **TC-CSV-01:** Upload 5-row CSV, verify schema detection
- [ ] **TC-CSV-02:** Upload 100MB CSV, verify progress indicator
- [ ] **TC-CSV-03:** Upload CSV with special characters (ñ, é, ü)
- [ ] **TC-CSV-04:** Upload CSV with semicolon delimiter
- [ ] **TC-CSV-05:** Upload CSV with tab delimiter
- [ ] **TC-CSV-06:** Upload malformed CSV, verify error message
- [ ] **TC-CSV-07:** Upload CSV with mixed data types in column
- [ ] **TC-CSV-08:** Upload CSV with empty rows
- [ ] **TC-CSV-09:** Upload CSV with no header row

#### Excel Upload
- [ ] **TC-XLS-01:** Upload .xlsx file with 2 sheets
- [ ] **TC-XLS-02:** Upload .xls (legacy) file
- [ ] **TC-XLS-03:** Upload Excel with formulas (verify values, not formulas)
- [ ] **TC-XLS-04:** Upload Excel with charts/images (ignore non-data)
- [ ] **TC-XLS-05:** Upload Excel with merged cells
- [ ] **TC-XLS-06:** Select specific sheet to import
- [ ] **TC-XLS-07:** Upload password-protected Excel (verify error)

#### JSON Upload
- [ ] **TC-JSON-01:** Upload flat JSON array
- [ ] **TC-JSON-02:** Upload nested JSON (2 levels deep)
- [ ] **TC-JSON-03:** Upload deeply nested JSON (3+ levels)
- [ ] **TC-JSON-04:** Upload JSON with arrays inside objects
- [ ] **TC-JSON-05:** Upload malformed JSON, verify error
- [ ] **TC-JSON-06:** Upload JSON with mixed types
- [ ] **TC-JSON-07:** Upload large JSON file (10MB+)

#### PDF Upload
- [ ] **TC-PDF-01:** Upload PDF with simple table
- [ ] **TC-PDF-02:** Upload multi-page PDF with tables
- [ ] **TC-PDF-03:** Upload PDF without tables (verify error)
- [ ] **TC-PDF-04:** Upload scanned PDF (verify handling)
- [ ] **TC-PDF-05:** Upload PDF with complex table layout
- [ ] **TC-PDF-06:** Select specific page for table extraction

### 6.2 Database Connection Tests

#### PostgreSQL
- [ ] **TC-PG-01:** Connect with valid credentials
- [ ] **TC-PG-02:** Test connection before saving
- [ ] **TC-PG-03:** Connect with invalid host (verify error)
- [ ] **TC-PG-04:** Connect with wrong password (verify error)
- [ ] **TC-PG-05:** Browse database schemas
- [ ] **TC-PG-06:** View tables and columns
- [ ] **TC-PG-07:** Preview sample data (100 rows)
- [ ] **TC-PG-08:** Connect with SSL enabled
- [ ] **TC-PG-09:** Connect to remote PostgreSQL server
- [ ] **TC-PG-10:** Query execution with filters

#### MySQL
- [ ] **TC-MY-01:** Connect with valid credentials
- [ ] **TC-MY-02:** Test connection before saving
- [ ] **TC-MY-03:** Browse schemas and tables
- [ ] **TC-MY-04:** Connect with SSL
- [ ] **TC-MY-05:** Connect to MySQL 8.0
- [ ] **TC-MY-06:** Connect to MySQL 5.7
- [ ] **TC-MY-07:** Query execution

#### MariaDB
- [ ] **TC-MA-01:** Connect with valid credentials
- [ ] **TC-MA-02:** Verify inherits MySQL functionality
- [ ] **TC-MA-03:** Test connection
- [ ] **TC-MA-04:** Query execution

### 6.3 User Experience Tests

#### Progress Indicators
- [ ] **TC-UX-01:** File upload shows progress bar
- [ ] **TC-UX-02:** Database connection test shows spinner
- [ ] **TC-UX-03:** Dataset processing shows status
- [ ] **TC-UX-04:** Large file import shows estimated time

#### Error Messages
- [ ] **TC-UX-05:** Invalid file format shows clear error
- [ ] **TC-UX-06:** Connection failure shows helpful message
- [ ] **TC-UX-07:** File too large shows size limit
- [ ] **TC-UX-08:** Network error shows retry option
- [ ] **TC-UX-09:** Malformed data shows specific issue

#### Data Preview
- [ ] **TC-UX-10:** CSV preview shows first 5 rows
- [ ] **TC-UX-11:** Schema shows detected types
- [ ] **TC-UX-12:** Column count is accurate
- [ ] **TC-UX-13:** Row count estimate is displayed
- [ ] **TC-UX-14:** Preview renders within 2 seconds

---

## 7. Performance Tests

### 7.1 File Upload Performance

| Test | File Size | Expected Time | Pass/Fail |
|------|-----------|--------------|-----------|
| Small CSV | 1 MB | < 5 seconds | |
| Medium CSV | 10 MB | < 15 seconds | |
| Large CSV | 50 MB | < 60 seconds | |
| Max CSV | 100 MB | < 120 seconds | |
| Small Excel | 2 MB | < 10 seconds | |
| Large Excel | 20 MB | < 45 seconds | |
| JSON | 5 MB | < 15 seconds | |
| PDF | 10 MB | < 30 seconds | |

### 7.2 Database Query Performance

| Test | Rows | Expected Time | Pass/Fail |
|------|------|--------------|-----------|
| Small query | 100 | < 1 second | |
| Medium query | 10,000 | < 5 seconds | |
| Large query | 100,000 | < 15 seconds | |
| Aggregation | 10,000 | < 5 seconds | |
| Join query | 5,000 | < 10 seconds | |

### 7.3 Schema Inference Performance

| Test | Records | Expected Time | Pass/Fail |
|------|---------|--------------|-----------|
| CSV type detection | 1,000 | < 2 seconds | |
| JSON schema | 500 | < 3 seconds | |
| Database schema | 50 tables | < 10 seconds | |

---

## 8. Security Tests

### 8.1 Authentication Tests
- [ ] **SEC-01:** Cannot upload file without authentication
- [ ] **SEC-02:** Cannot test database connection without token
- [ ] **SEC-03:** Token expiration redirects to login
- [ ] **SEC-04:** Invalid token returns 401

### 8.2 Authorization Tests
- [ ] **SEC-05:** User cannot access other workspace datasets
- [ ] **SEC-06:** Viewer cannot create datasets
- [ ] **SEC-07:** Editor can create but not delete workspace

### 8.3 Data Security Tests
- [ ] **SEC-08:** Database credentials encrypted in storage
- [ ] **SEC-09:** Passwords not visible in API responses
- [ ] **SEC-10:** Connection strings sanitized in logs
- [ ] **SEC-11:** File uploads validated for type
- [ ] **SEC-12:** SQL injection prevention in queries
- [ ] **SEC-13:** File size limits enforced (100MB)

---

## 9. Test Data Requirements

### 9.1 Files Required
- ✅ test_sales.csv (5 rows, mixed types)
- ✅ test_large.csv (100MB, performance test)
- ✅ test_inventory.xlsx (multi-sheet)
- ✅ test_legacy.xls (old format)
- ✅ test_employees.json (flat array)
- ✅ test_nested.json (nested structure)
- ✅ test_report.pdf (simple table)
- ✅ test_multipage.pdf (multiple pages)
- ✅ test_semicolon.csv (semicolon delimiter)
- ✅ test_malformed.csv (invalid format)

### 9.2 Databases Required
- ✅ PostgreSQL test database (syntra_test)
- ✅ MySQL test database (syntra_test)
- ✅ Sample tables with various data types
- ✅ Multi-schema setup for PostgreSQL
- ✅ Test data (100-10,000 rows)

---

## 10. Success Criteria

### 10.1 Unit Tests
- ✅ **All 7 connectors** have unit tests
- ✅ **>80% code coverage** for connector services
- ✅ **100% pass rate** for all tests
- ✅ Tests run in **< 2 minutes**

### 10.2 Integration Tests
- ✅ **All E2E workflows** pass (CSV, Excel, JSON, PDF, PostgreSQL, MySQL, MariaDB)
- ✅ **Authentication flow** works correctly
- ✅ **Error handling** verified for all connector types

### 10.3 Manual QA
- ✅ **All manual test cases** executed
- ✅ **No critical bugs** found
- ✅ **UI/UX** meets usability standards
- ✅ **Error messages** are clear and helpful

### 10.4 Performance
- ✅ **File uploads** meet time targets
- ✅ **Database queries** meet time targets
- ✅ **Schema inference** completes quickly

### 10.5 Security
- ✅ **No security vulnerabilities** detected
- ✅ **Authentication/authorization** working correctly
- ✅ **Data encryption** verified

---

## 11. Test Execution Checklist

### Phase 1: Setup (Day 1)
- [ ] Set up test environment (Docker Compose)
- [ ] Create test databases (PostgreSQL, MySQL)
- [ ] Prepare test files (CSV, Excel, JSON, PDF)
- [ ] Install test dependencies (pytest, playwright)
- [ ] Configure test credentials

### Phase 2: Unit Tests (Day 2-3)
- [ ] Write connector unit tests
- [ ] Run unit tests for all 7 connectors
- [ ] Fix any failing tests
- [ ] Verify >80% code coverage
- [ ] Document test results

### Phase 3: Integration Tests (Day 4)
- [ ] Write E2E integration tests
- [ ] Run backend integration tests
- [ ] Run frontend E2E tests (Playwright)
- [ ] Fix any integration issues
- [ ] Document test results

### Phase 4: Manual QA (Day 5)
- [ ] Execute all manual test cases
- [ ] Test file uploads (all 4 types)
- [ ] Test database connections (all 3 types)
- [ ] Test error scenarios
- [ ] Verify UI/UX requirements
- [ ] Document bugs and issues

### Phase 5: Performance Tests (Day 6)
- [ ] Run file upload performance tests
- [ ] Run database query performance tests
- [ ] Run schema inference tests
- [ ] Measure and document results
- [ ] Optimize if needed

### Phase 6: Security Tests (Day 6)
- [ ] Execute security test cases
- [ ] Verify authentication/authorization
- [ ] Check data encryption
- [ ] Review API security
- [ ] Document security findings

### Phase 7: Final Report (Day 7)
- [ ] Compile all test results
- [ ] Create test summary report
- [ ] Document known issues
- [ ] Provide recommendations
- [ ] Sign-off on Phase 1 data connectors

---

## Test Execution Timeline

| Phase | Duration | Tasks | Status |
|-------|----------|-------|--------|
| Setup | 4 hours | Environment + test data | ⏳ Pending |
| Unit Tests | 16 hours | Write and run tests | ⏳ Pending |
| Integration | 8 hours | E2E workflows | ⏳ Pending |
| Manual QA | 8 hours | All test cases | ⏳ Pending |
| Performance | 4 hours | Performance benchmarks | ⏳ Pending |
| Security | 4 hours | Security validation | ⏳ Pending |
| Reporting | 4 hours | Final documentation | ⏳ Pending |
| **Total** | **48 hours** | **~1 week** | **⏳ Ready to Start** |

---

## Appendix A: Test Commands Reference

### Backend Tests
```bash
# Run all tests
pytest backend/tests/ -v

# Run connector tests only
pytest backend/tests/test_data_connectors.py -v

# Run with coverage
pytest --cov=app/services/data_connectors --cov-report=html

# Run specific test
pytest backend/tests/test_data_connectors.py::TestCSVConnector::test_csv_schema_inference -v
```

### Frontend Tests
```bash
# Run Playwright E2E tests
cd frontend
npx playwright test

# Run specific test file
npx playwright test tests/e2e/connectors.spec.ts

# Run with UI
npx playwright test --ui

# Generate test report
npx playwright show-report
```

### Docker Commands
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Reset environment
docker-compose down -v && docker-compose up -d

# Access PostgreSQL
docker exec -it syntra-postgres psql -U syntra -d syntra_test
```

---

**Document Status:** ✅ Ready for Execution
**Created:** January 5, 2025
**Version:** 1.0
**Next Review:** After test execution completion
