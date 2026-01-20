"""
Data Source Connectors for Syntra - Phase 1 Implementation
Supports essential file-based and database data sources.
"""

import asyncio
import json
import pandas as pd
from typing import Dict, List, Any, Optional, Union, Tuple
from abc import ABC, abstractmethod
from datetime import datetime
import structlog
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text
import aiofiles
from urllib.parse import quote_plus
from pathlib import Path

from app.models.dataset import ConnectorType

logger = structlog.get_logger()


class DataSourceConnector(ABC):
    """Abstract base class for data source connectors."""

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.connection_string = ""
        self.is_connected = False

    @abstractmethod
    async def test_connection(self) -> Tuple[bool, str]:
        """Test the connection to the data source."""
        pass

    @abstractmethod
    async def get_schema(self) -> Dict[str, Any]:
        """Get the schema/structure of the data source."""
        pass

    @abstractmethod
    async def execute_query(self, query: str, limit: int = 1000) -> Dict[str, Any]:
        """Execute a query and return results."""
        pass

    @abstractmethod
    async def get_sample_data(self, table_name: str = None, limit: int = 100) -> List[Dict[str, Any]]:
        """Get sample data from the source."""
        pass


# ============================================================================
# DATABASE CONNECTORS (Phase 1)
# ============================================================================

class PostgreSQLConnector(DataSourceConnector):
    """PostgreSQL database connector with async support."""

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        host = config.get('host', 'localhost')
        port = config.get('port', 5432)
        database = config.get('database', '')
        username = config.get('username', '')
        password = config.get('password', '')

        # Build connection string
        self.connection_string = f"postgresql+asyncpg://{quote_plus(username)}:{quote_plus(password)}@{host}:{port}/{database}"

        # Connection arguments for asyncpg
        self.connect_args = {
            'timeout': 30,  # Connection timeout in seconds
            'command_timeout': 30  # Query timeout in seconds
        }

    async def test_connection(self) -> Tuple[bool, str]:
        engine = None
        try:
            engine = create_async_engine(
                self.connection_string,
                connect_args=self.connect_args
            )
            async with engine.begin() as conn:
                result = await conn.execute(text("SELECT 1"))
                result.fetchone()
            return True, "Connection successful"
        except Exception as e:
            return False, f"Connection failed: {str(e)}"
        finally:
            if engine is not None:
                await engine.dispose()

    async def get_schema(self, schema_filter: str = None, limit_tables: int = None) -> Dict[str, Any]:
        """Get database schema with tables and columns from all user schemas."""
        engine = None
        try:
            engine = create_async_engine(
                self.connection_string,
                connect_args=self.connect_args,
                pool_pre_ping=True,
                pool_size=5,
                max_overflow=10,
                pool_timeout=10,
                isolation_level="AUTOCOMMIT"
            )

            async with engine.connect() as conn:
                tables_query = """
                SELECT schemaname, tablename, 'BASE TABLE' as table_type
                FROM pg_tables
                WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
                ORDER BY schemaname, tablename
                """

                if limit_tables:
                    tables_query += f" LIMIT {limit_tables}"

                tables_result = await conn.execute(text(tables_query))
                tables = tables_result.fetchall()

                schema = {"tables": []}

                for table in tables:
                    try:
                        table_info = {
                            "schema": table[0],
                            "name": table[1],
                            "type": table[2],
                            "columns": []
                        }

                        # Get columns for each table
                        columns_query = """
                        SELECT column_name, data_type, is_nullable, column_default
                        FROM information_schema.columns
                        WHERE table_schema = :schema AND table_name = :table_name
                        ORDER BY ordinal_position
                        """
                        try:
                            columns_result = await conn.execute(
                                text(columns_query),
                                {"schema": table[0], "table_name": table[1]}
                            )
                            columns = columns_result.fetchall()

                            for column in columns:
                                table_info["columns"].append({
                                    "name": column[0],
                                    "type": column[1],
                                    "nullable": column[2] == 'YES',
                                    "default": column[3]
                                })
                        except Exception as col_error:
                            logger.warning(f"Failed to get columns for {table[0]}.{table[1]}", error=str(col_error))
                            continue

                        # FIXED: Get approximate row count
                        # Use string formatting instead of parameter binding for regclass
                        try:
                            row_count_query = f"""
                            SELECT reltuples::bigint AS estimate
                            FROM pg_class
                            WHERE oid = '{table[0]}.{table[1]}'::regclass
                            """
                            row_result = await conn.execute(text(row_count_query))
                            row_count = row_result.scalar()
                            table_info["row_count"] = int(row_count) if row_count else 0
                        except Exception as row_error:
                            logger.warning(f"Failed to get row count for {table[0]}.{table[1]}", error=str(row_error))
                            table_info["row_count"] = 0

                        schema["tables"].append(table_info)

                    except Exception as table_error:
                        logger.warning(f"Failed to process table {table[0]}.{table[1]}", error=str(table_error))
                        continue

            return schema
        except Exception as e:
            logger.error("Failed to get PostgreSQL schema", error=str(e))
            return {"error": str(e)}
        finally:
            if engine is not None:
                await engine.dispose()

    async def execute_query(self, query: str, limit: int = 1000) -> Dict[str, Any]:
        """Execute a SQL query and return results."""
        engine = None
        try:
            engine = create_async_engine(
                self.connection_string,
                connect_args=self.connect_args
            )
            async with engine.begin() as conn:
                limited_query = f"{query} LIMIT {limit}" if "SELECT" in query.upper() and "LIMIT" not in query.upper() else query
                result = await conn.execute(text(limited_query))
                rows = result.fetchall()
                columns = list(result.keys()) if result.keys() else []

                data = [dict(zip(columns, row)) for row in rows]

            return {
                "data": data,
                "columns": columns,
                "row_count": len(data)
            }
        except Exception as e:
            logger.error("Failed to execute PostgreSQL query", error=str(e))
            return {"error": str(e), "data": [], "columns": []}
        finally:
            if engine is not None:
                await engine.dispose()

    async def get_sample_data(self, table_name: str = None, limit: int = 100) -> List[Dict[str, Any]]:
        """Get sample data from a table."""
        if not table_name:
            return []

        try:
            query = f"SELECT * FROM {table_name} LIMIT {limit}"
            result = await self.execute_query(query, limit)
            return result.get("data", [])
        except Exception as e:
            logger.error("Failed to get PostgreSQL sample data", error=str(e))
            return []


class MySQLConnector(DataSourceConnector):
    """MySQL database connector with async support."""

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        host = config.get('host', 'localhost')
        port = config.get('port', 3306)
        database = config.get('database', '')
        username = config.get('username', '')
        password = config.get('password', '')

        self.connection_string = f"mysql+aiomysql://{quote_plus(username)}:{quote_plus(password)}@{host}:{port}/{database}"

    async def test_connection(self) -> Tuple[bool, str]:
        engine = None
        try:
            engine = create_async_engine(self.connection_string)
            async with engine.begin() as conn:
                result = await conn.execute(text("SELECT 1"))
                result.fetchone()
            return True, "Connection successful"
        except Exception as e:
            return False, f"Connection failed: {str(e)}"
        finally:
            if engine is not None:
                await engine.dispose()

    async def get_schema(self) -> Dict[str, Any]:
        """Get database schema with tables and columns from all user databases."""
        engine = None
        try:
            engine = create_async_engine(self.connection_string)

            # Use connect() instead of begin() for read-only operations
            # This allows better error handling without transaction rollback issues
            async with engine.connect() as conn:
                # Get all user databases and their tables (excluding system databases)
                tables_query = """
                SELECT table_schema, table_name, table_type
                FROM information_schema.tables
                WHERE table_schema NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
                ORDER BY table_schema, table_name
                """
                tables_result = await conn.execute(text(tables_query))
                tables = tables_result.fetchall()

                schema = {"tables": []}
                for table in tables:
                    # Wrap each table's metadata fetch in try-except to prevent one failure from breaking the whole process
                    try:
                        schema_name = table[0]
                        table_name = table[1]
                        table_info = {
                            "schema": schema_name,
                            "name": table_name,
                            "type": table[2],
                            "columns": []
                        }

                        # Get columns for each table
                        columns_query = """
                        SELECT column_name, column_type, is_nullable, column_default
                        FROM information_schema.columns
                        WHERE table_schema = :schema AND table_name = :table
                        ORDER BY ordinal_position
                        """
                        try:
                            columns_result = await conn.execute(
                                text(columns_query),
                                {"schema": schema_name, "table": table_name}
                            )
                            columns = columns_result.fetchall()

                            for column in columns:
                                table_info["columns"].append({
                                    "name": column[0],
                                    "type": column[1],
                                    "nullable": column[2] == 'YES',
                                    "default": column[3]
                                })
                        except Exception as col_error:
                            logger.warning(f"Failed to get columns for {schema_name}.{table_name}", error=str(col_error))
                            # Skip this table if we can't get columns
                            continue

                        # Get approximate row count
                        try:
                            row_count_query = """
                            SELECT table_rows
                            FROM information_schema.tables
                            WHERE table_schema = :schema AND table_name = :table
                            """
                            row_result = await conn.execute(
                                text(row_count_query),
                                {"schema": schema_name, "table": table_name}
                            )
                            row_count = row_result.scalar()
                            table_info["row_count"] = int(row_count) if row_count else 0
                        except Exception as row_error:
                            logger.warning(f"Failed to get row count for {schema_name}.{table_name}", error=str(row_error))
                            table_info["row_count"] = 0

                        schema["tables"].append(table_info)

                    except Exception as table_error:
                        logger.warning(f"Failed to process table {schema_name}.{table_name}", error=str(table_error))
                        # Continue with next table
                        continue

            return schema
        except Exception as e:
            logger.error("Failed to get MySQL schema", error=str(e))
            return {"error": str(e)}
        finally:
            if engine is not None:
                await engine.dispose()

    async def execute_query(self, query: str, limit: int = 1000) -> Dict[str, Any]:
        """Execute a SQL query and return results."""
        engine = None
        try:
            engine = create_async_engine(self.connection_string)
            async with engine.begin() as conn:
                limited_query = f"{query} LIMIT {limit}" if "SELECT" in query.upper() and "LIMIT" not in query.upper() else query
                result = await conn.execute(text(limited_query))
                rows = result.fetchall()
                columns = list(result.keys()) if result.keys() else []

                data = [dict(zip(columns, row)) for row in rows]

            return {
                "data": data,
                "columns": columns,
                "row_count": len(data)
            }
        except Exception as e:
            logger.error("Failed to execute MySQL query", error=str(e))
            return {"error": str(e), "data": [], "columns": []}
        finally:
            if engine is not None:
                await engine.dispose()

    async def get_sample_data(self, table_name: str = None, limit: int = 100) -> List[Dict[str, Any]]:
        """Get sample data from a table."""
        if not table_name:
            return []

        try:
            query = f"SELECT * FROM {table_name} LIMIT {limit}"
            result = await self.execute_query(query, limit)
            return result.get("data", [])
        except Exception as e:
            logger.error("Failed to get MySQL sample data", error=str(e))
            return []


class MariaDBConnector(MySQLConnector):
    """MariaDB database connector - uses MySQL wire protocol."""

    def __init__(self, config: Dict[str, Any]):
        # MariaDB is compatible with MySQL protocol
        super().__init__(config)
        # Connection string is identical to MySQL
        host = config.get('host', 'localhost')
        port = config.get('port', 3306)
        database = config.get('database', '')
        username = config.get('username', '')
        password = config.get('password', '')

        self.connection_string = f"mysql+aiomysql://{quote_plus(username)}:{quote_plus(password)}@{host}:{port}/{database}"


# ============================================================================
# FILE CONNECTORS (Phase 1)
# ============================================================================

class CSVFileConnector(DataSourceConnector):
    """CSV file connector with pandas-based parsing."""

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.file_path = config.get('file_path', '')
        self.delimiter = config.get('delimiter', ',')
        self.encoding = config.get('encoding', 'utf-8')
        self.has_header = config.get('has_header', True)

    async def test_connection(self) -> Tuple[bool, str]:
        """Test if file is accessible and readable."""
        try:
            async with aiofiles.open(self.file_path, mode='r', encoding=self.encoding) as f:
                first_line = await f.readline()
                if first_line:
                    return True, "File accessible"
                else:
                    return False, "File is empty"
        except Exception as e:
            return False, f"Cannot access file: {str(e)}"

    async def get_schema(self) -> Dict[str, Any]:
        """Infer schema from CSV file."""
        try:
            # Read first 1000 rows to infer schema
            df = pd.read_csv(self.file_path, delimiter=self.delimiter, encoding=self.encoding, nrows=1000)

            schema = {
                "type": "table",
                "name": Path(self.file_path).name,
                "columns": []
            }

            for column in df.columns:
                dtype = str(df[column].dtype)
                schema["columns"].append({
                    "name": column,
                    "type": self._pandas_to_sql_type(dtype),
                    "nullable": df[column].isnull().any()
                })

            return schema
        except Exception as e:
            logger.error("Failed to get CSV schema", error=str(e))
            return {"error": str(e)}

    def _pandas_to_sql_type(self, pandas_type: str) -> str:
        """Convert pandas dtype to SQL-like type."""
        if 'int' in pandas_type:
            return 'integer'
        elif 'float' in pandas_type:
            return 'number'
        elif 'bool' in pandas_type:
            return 'boolean'
        elif 'datetime' in pandas_type:
            return 'datetime'
        else:
            return 'string'

    async def execute_query(self, query: str, limit: int = 1000) -> Dict[str, Any]:
        """Execute a query on CSV data (limited to returning rows with limit)."""
        try:
            df = pd.read_csv(self.file_path, delimiter=self.delimiter, encoding=self.encoding, nrows=limit)

            data = df.to_dict('records')
            columns = list(df.columns)

            return {
                "data": data,
                "columns": columns,
                "row_count": len(data)
            }
        except Exception as e:
            logger.error("Failed to query CSV data", error=str(e))
            return {"error": str(e), "data": [], "columns": []}

    async def get_sample_data(self, table_name: str = None, limit: int = 100) -> List[Dict[str, Any]]:
        """Get sample data from CSV file."""
        try:
            df = pd.read_csv(self.file_path, delimiter=self.delimiter, encoding=self.encoding, nrows=limit)
            return df.to_dict('records')
        except Exception as e:
            logger.error("Failed to get CSV sample data", error=str(e))
            return []


class ExcelConnector(DataSourceConnector):
    """Excel workbook connector with multi-sheet support."""

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.file_path = config.get('file_path', '')
        self.sheet_name = config.get('sheet_name', 0)  # First sheet by default

    async def test_connection(self) -> Tuple[bool, str]:
        """Test if Excel file is accessible."""
        try:
            df = pd.read_excel(self.file_path, sheet_name=self.sheet_name, nrows=1)
            return True, "Excel file accessible"
        except Exception as e:
            return False, f"Cannot access Excel file: {str(e)}"

    async def get_schema(self) -> Dict[str, Any]:
        """Get schema for all sheets in the workbook."""
        try:
            excel_file = pd.ExcelFile(self.file_path)
            sheets_info = []

            for sheet_name in excel_file.sheet_names:
                df = pd.read_excel(self.file_path, sheet_name=sheet_name, nrows=100)

                sheet_schema = {
                    "name": sheet_name,
                    "type": "sheet",
                    "columns": []
                }

                for column in df.columns:
                    dtype = str(df[column].dtype)
                    sheet_schema["columns"].append({
                        "name": column,
                        "type": self._pandas_to_sql_type(dtype),
                        "nullable": df[column].isnull().any()
                    })

                sheets_info.append(sheet_schema)

            return {"type": "workbook", "sheets": sheets_info}
        except Exception as e:
            logger.error("Failed to get Excel schema", error=str(e))
            return {"error": str(e)}

    def _pandas_to_sql_type(self, pandas_type: str) -> str:
        """Convert pandas dtype to SQL-like type."""
        if 'int' in pandas_type:
            return 'integer'
        elif 'float' in pandas_type:
            return 'number'
        elif 'bool' in pandas_type:
            return 'boolean'
        elif 'datetime' in pandas_type:
            return 'datetime'
        else:
            return 'string'

    async def execute_query(self, query: str, limit: int = 1000) -> Dict[str, Any]:
        """Execute a query on Excel data."""
        try:
            df = pd.read_excel(self.file_path, sheet_name=self.sheet_name, nrows=limit)

            data = df.to_dict('records')
            columns = list(df.columns)

            return {
                "data": data,
                "columns": columns,
                "row_count": len(data)
            }
        except Exception as e:
            logger.error("Failed to query Excel data", error=str(e))
            return {"error": str(e), "data": [], "columns": []}

    async def get_sample_data(self, table_name: str = None, limit: int = 100) -> List[Dict[str, Any]]:
        """Get sample data from Excel sheet."""
        try:
            df = pd.read_excel(self.file_path, sheet_name=self.sheet_name, nrows=limit)
            return df.to_dict('records')
        except Exception as e:
            logger.error("Failed to get Excel sample data", error=str(e))
            return []


class JSONConnector(DataSourceConnector):
    """JSON file connector with schema inference for flat and nested JSON."""

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.file_path = config.get('file_path', '')
        self.encoding = config.get('encoding', 'utf-8')
        self.json_path = config.get('json_path', None)  # Optional: JSONPath for nested data

    async def test_connection(self) -> Tuple[bool, str]:
        """Test if JSON file is accessible and valid."""
        try:
            async with aiofiles.open(self.file_path, mode='r', encoding=self.encoding) as f:
                content = await f.read()
                json.loads(content)  # Validate JSON
            return True, "JSON file accessible and valid"
        except json.JSONDecodeError as e:
            return False, f"Invalid JSON format: {str(e)}"
        except Exception as e:
            return False, f"Cannot access file: {str(e)}"

    async def get_schema(self) -> Dict[str, Any]:
        """Infer schema from JSON data structure."""
        try:
            async with aiofiles.open(self.file_path, mode='r', encoding=self.encoding) as f:
                content = await f.read()
                data = json.loads(content)

            # Handle different JSON structures
            if isinstance(data, list) and len(data) > 0:
                # Array of objects (most common for tabular data)
                sample = data[0]
                schema = self._analyze_json_object(sample)
                schema["type"] = "array_of_objects"
                schema["row_count"] = len(data)
            elif isinstance(data, dict):
                # Single object or nested structure
                schema = self._analyze_json_object(data)
                schema["type"] = "object"
            else:
                schema = {"type": "unknown", "error": "Unsupported JSON structure"}

            return schema
        except Exception as e:
            logger.error("Failed to get JSON schema", error=str(e))
            return {"error": str(e)}

    def _analyze_json_object(self, obj: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze JSON object structure and infer column types."""
        schema = {"type": "object", "columns": []}

        for key, value in obj.items():
            column_info = {"name": key}

            if isinstance(value, str):
                column_info["type"] = "string"
            elif isinstance(value, bool):
                column_info["type"] = "boolean"
            elif isinstance(value, int):
                column_info["type"] = "integer"
            elif isinstance(value, float):
                column_info["type"] = "number"
            elif isinstance(value, list):
                column_info["type"] = "array"
                if len(value) > 0:
                    column_info["item_type"] = type(value[0]).__name__
            elif isinstance(value, dict):
                column_info["type"] = "object"
                column_info["nested"] = True
            elif value is None:
                column_info["type"] = "null"
            else:
                column_info["type"] = "unknown"

            schema["columns"].append(column_info)

        return schema

    async def execute_query(self, query: str, limit: int = 1000) -> Dict[str, Any]:
        """Load JSON data (no query support, returns all data up to limit)."""
        try:
            async with aiofiles.open(self.file_path, mode='r', encoding=self.encoding) as f:
                content = await f.read()
                data = json.loads(content)

            # Convert to list of dicts if needed
            if isinstance(data, list):
                records = data[:limit]
            elif isinstance(data, dict):
                # Flatten single object into a list with one item
                records = [data]
            else:
                records = []

            columns = list(records[0].keys()) if records else []

            return {
                "data": records,
                "columns": columns,
                "row_count": len(records)
            }
        except Exception as e:
            logger.error("Failed to query JSON data", error=str(e))
            return {"error": str(e), "data": [], "columns": []}

    async def get_sample_data(self, table_name: str = None, limit: int = 100) -> List[Dict[str, Any]]:
        """Get sample data from JSON file."""
        try:
            result = await self.execute_query("", limit)
            return result.get("data", [])
        except Exception as e:
            logger.error("Failed to get JSON sample data", error=str(e))
            return []


class PDFConnector(DataSourceConnector):
    """PDF file connector with table extraction support.

    Note: This connector extracts tabular data from PDFs. It works best with
    simple, well-structured tables. Complex layouts may require preprocessing.
    """

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.file_path = config.get('file_path', '')
        self.page_number = config.get('page_number', 0)  # First page by default (0-indexed)
        self.table_settings = config.get('table_settings', {})

    async def test_connection(self) -> Tuple[bool, str]:
        """Test if PDF file is accessible and contains tables."""
        try:
            import pdfplumber

            with pdfplumber.open(self.file_path) as pdf:
                if len(pdf.pages) == 0:
                    return False, "PDF file is empty"

                # Try to extract tables from first page
                first_page = pdf.pages[0]
                tables = first_page.extract_tables()

                if not tables:
                    return True, f"PDF accessible (no tables found on page 1, total pages: {len(pdf.pages)})"

                return True, f"PDF accessible with {len(tables)} table(s) on page 1"
        except ImportError:
            return False, "pdfplumber library not installed (pip install pdfplumber)"
        except Exception as e:
            return False, f"Cannot access PDF file: {str(e)}"

    async def get_schema(self) -> Dict[str, Any]:
        """Extract schema from PDF tables."""
        try:
            import pdfplumber

            with pdfplumber.open(self.file_path) as pdf:
                if self.page_number >= len(pdf.pages):
                    return {"error": f"Page {self.page_number} not found (PDF has {len(pdf.pages)} pages)"}

                page = pdf.pages[self.page_number]
                tables = page.extract_tables(self.table_settings)

                if not tables:
                    return {
                        "type": "pdf",
                        "pages": len(pdf.pages),
                        "tables": [],
                        "note": "No tables found on specified page"
                    }

                schema_tables = []
                for idx, table in enumerate(tables):
                    if not table or len(table) < 2:
                        continue

                    # First row is typically header
                    headers = table[0]
                    sample_row = table[1] if len(table) > 1 else []

                    table_schema = {
                        "name": f"Table_{idx + 1}_Page_{self.page_number + 1}",
                        "type": "table",
                        "columns": []
                    }

                    for col_idx, header in enumerate(headers):
                        column_name = header if header else f"Column_{col_idx + 1}"
                        # Infer type from sample data
                        sample_value = sample_row[col_idx] if col_idx < len(sample_row) else None
                        inferred_type = self._infer_type(sample_value)

                        table_schema["columns"].append({
                            "name": column_name,
                            "type": inferred_type,
                            "nullable": True
                        })

                    schema_tables.append(table_schema)

                return {
                    "type": "pdf",
                    "pages": len(pdf.pages),
                    "tables": schema_tables
                }
        except ImportError:
            return {"error": "pdfplumber library not installed"}
        except Exception as e:
            logger.error("Failed to get PDF schema", error=str(e))
            return {"error": str(e)}

    def _infer_type(self, value: Any) -> str:
        """Infer data type from sample value."""
        if value is None or value == '':
            return 'string'

        try:
            # Try to convert to number
            float(value)
            if '.' in str(value):
                return 'number'
            return 'integer'
        except (ValueError, TypeError):
            pass

        return 'string'

    async def execute_query(self, query: str, limit: int = 1000) -> Dict[str, Any]:
        """Extract data from PDF tables."""
        try:
            import pdfplumber

            with pdfplumber.open(self.file_path) as pdf:
                page = pdf.pages[self.page_number]
                tables = page.extract_tables(self.table_settings)

                if not tables:
                    return {"data": [], "columns": [], "row_count": 0}

                # Use first table found
                table = tables[0]
                if len(table) < 2:
                    return {"data": [], "columns": [], "row_count": 0}

                headers = table[0]
                rows = table[1:limit+1]

                # Convert to list of dicts
                data = []
                for row in rows:
                    row_dict = {}
                    for idx, header in enumerate(headers):
                        column_name = header if header else f"Column_{idx + 1}"
                        value = row[idx] if idx < len(row) else None
                        row_dict[column_name] = value
                    data.append(row_dict)

                return {
                    "data": data,
                    "columns": headers,
                    "row_count": len(data)
                }
        except ImportError:
            return {"error": "pdfplumber library not installed", "data": [], "columns": []}
        except Exception as e:
            logger.error("Failed to query PDF data", error=str(e))
            return {"error": str(e), "data": [], "columns": []}

    async def get_sample_data(self, table_name: str = None, limit: int = 100) -> List[Dict[str, Any]]:
        """Get sample data from PDF table."""
        try:
            result = await self.execute_query("", limit)
            return result.get("data", [])
        except Exception as e:
            logger.error("Failed to get PDF sample data", error=str(e))
            return []


# ============================================================================
# FACTORY AND MANAGER CLASSES
# ============================================================================

class DataConnectorFactory:
    """Factory class for creating Phase 1 data source connectors."""

    _connectors = {
        # Database connectors (Phase 1)
        ConnectorType.POSTGRESQL: PostgreSQLConnector,
        ConnectorType.MYSQL: MySQLConnector,
        ConnectorType.MARIADB: MariaDBConnector,

        # File connectors (Phase 1)
        ConnectorType.CSV: CSVFileConnector,
        ConnectorType.EXCEL: ExcelConnector,
        ConnectorType.JSON: JSONConnector,
        ConnectorType.PDF: PDFConnector,
    }

    @classmethod
    def create_connector(cls, connector_type: ConnectorType, config: Dict[str, Any]) -> DataSourceConnector:
        """Create a connector instance based on type and configuration."""
        connector_class = cls._connectors.get(connector_type)
        if not connector_class:
            raise ValueError(f"Unsupported connector type: {connector_type}. Phase 1 supports: {list(cls._connectors.keys())}")

        return connector_class(config)

    @classmethod
    def get_supported_types(cls) -> List[ConnectorType]:
        """Get list of supported connector types for Phase 1."""
        return list(cls._connectors.keys())

    @classmethod
    def get_connector_requirements(cls, connector_type: ConnectorType) -> Dict[str, Any]:
        """Get configuration requirements for a connector type."""
        requirements = {
            # Database connectors
            ConnectorType.POSTGRESQL: {
                "required": ["host", "database", "username", "password"],
                "optional": ["port"],
                "defaults": {"port": 5432},
                "description": "PostgreSQL database connection"
            },
            ConnectorType.MYSQL: {
                "required": ["host", "database", "username", "password"],
                "optional": ["port"],
                "defaults": {"port": 3306},
                "description": "MySQL database connection"
            },
            ConnectorType.MARIADB: {
                "required": ["host", "database", "username", "password"],
                "optional": ["port"],
                "defaults": {"port": 3306},
                "description": "MariaDB database connection (MySQL compatible)"
            },

            # File connectors
            ConnectorType.CSV: {
                "required": ["file_path"],
                "optional": ["delimiter", "encoding", "has_header"],
                "defaults": {"delimiter": ",", "encoding": "utf-8", "has_header": True},
                "description": "CSV file connection"
            },
            ConnectorType.EXCEL: {
                "required": ["file_path"],
                "optional": ["sheet_name"],
                "defaults": {"sheet_name": 0},
                "description": "Excel workbook connection (.xlsx, .xls)"
            },
            ConnectorType.JSON: {
                "required": ["file_path"],
                "optional": ["encoding", "json_path"],
                "defaults": {"encoding": "utf-8"},
                "description": "JSON file connection (supports flat and nested structures)"
            },
            ConnectorType.PDF: {
                "required": ["file_path"],
                "optional": ["page_number", "table_settings"],
                "defaults": {"page_number": 0},
                "description": "PDF file table extraction (requires pdfplumber)"
            },
        }

        return requirements.get(connector_type, {})


class DataSourceManager:
    """Manager class for handling Phase 1 data source operations."""

    @staticmethod
    async def test_data_source(connector_type: ConnectorType, config: Dict[str, Any]) -> Dict[str, Any]:
        """Test a data source connection."""
        try:
            connector = DataConnectorFactory.create_connector(connector_type, config)
            is_connected, message = await connector.test_connection()

            return {
                "success": is_connected,
                "message": message,
                "connector_type": connector_type.value,
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error("Failed to test data source", connector_type=connector_type.value, error=str(e))
            return {
                "success": False,
                "message": f"Connection test failed: {str(e)}",
                "connector_type": connector_type.value,
                "timestamp": datetime.utcnow().isoformat()
            }

    @staticmethod
    async def get_data_source_schema(connector_type: ConnectorType, config: Dict[str, Any]) -> Dict[str, Any]:
        """Get schema information from a data source."""
        try:
            connector = DataConnectorFactory.create_connector(connector_type, config)
            schema = await connector.get_schema()

            return {
                "success": True,
                "schema": schema,
                "connector_type": connector_type.value,
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error("Failed to get data source schema", connector_type=connector_type.value, error=str(e))
            return {
                "success": False,
                "error": f"Schema retrieval failed: {str(e)}",
                "connector_type": connector_type.value,
                "timestamp": datetime.utcnow().isoformat()
            }
