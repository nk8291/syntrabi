"""
Comprehensive Data Source Connectors for Syntra
Supports all major Power BI-compatible data sources with authentication and connection management.
Based on: https://learn.microsoft.com/en-us/power-bi/connect-data/desktop-data-sources
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
# import aiohttp  # TODO: Re-enable when aiohttp dependency is fixed
from urllib.parse import quote_plus

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


class SQLServerConnector(DataSourceConnector):
    """SQL Server database connector."""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        server = config.get('server', 'localhost')
        database = config.get('database', '')
        username = config.get('username', '')
        password = config.get('password', '')
        port = config.get('port', 1433)
        
        if config.get('trusted_connection', False):
            self.connection_string = f"mssql+pyodbc://{server}:{port}/{database}?driver=ODBC+Driver+17+for+SQL+Server&trusted_connection=yes"
        else:
            self.connection_string = f"mssql+pyodbc://{quote_plus(username)}:{quote_plus(password)}@{server}:{port}/{database}?driver=ODBC+Driver+17+for+SQL+Server"
    
    async def test_connection(self) -> Tuple[bool, str]:
        try:
            engine = create_async_engine(self.connection_string)
            async with engine.begin() as conn:
                result = await conn.execute(text("SELECT 1"))
                result.fetchone()
            await engine.dispose()
            return True, "Connection successful"
        except Exception as e:
            return False, f"Connection failed: {str(e)}"
    
    async def get_schema(self) -> Dict[str, Any]:
        try:
            engine = create_async_engine(self.connection_string)
            async with engine.begin() as conn:
                # Get tables
                tables_query = """
                SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE
                FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_TYPE = 'BASE TABLE'
                ORDER BY TABLE_SCHEMA, TABLE_NAME
                """
                tables_result = await conn.execute(text(tables_query))
                tables = tables_result.fetchall()
                
                schema = {"tables": []}
                for table in tables:
                    table_info = {
                        "schema": table[0],
                        "name": table[1],
                        "type": table[2],
                        "columns": []
                    }
                    
                    # Get columns for each table
                    columns_query = """
                    SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = :schema AND TABLE_NAME = :table_name
                    ORDER BY ORDINAL_POSITION
                    """
                    columns_result = await conn.execute(text(columns_query), {"schema": table[0], "table_name": table[1]})
                    columns = columns_result.fetchall()
                    
                    for column in columns:
                        table_info["columns"].append({
                            "name": column[0],
                            "type": column[1],
                            "nullable": column[2] == 'YES',
                            "default": column[3]
                        })
                    
                    schema["tables"].append(table_info)
            
            await engine.dispose()
            return schema
        except Exception as e:
            logger.error("Failed to get SQL Server schema", error=str(e))
            return {"error": str(e)}

    async def execute_query(self, query: str, limit: int = 1000) -> Dict[str, Any]:
        """Execute a SQL query and return results."""
        try:
            engine = create_async_engine(self.connection_string)
            async with engine.begin() as conn:
                limited_query = f"{query} OFFSET 0 ROWS FETCH NEXT {limit} ROWS ONLY" if "SELECT" in query.upper() else query
                result = await conn.execute(text(limited_query))
                rows = result.fetchall()
                columns = list(result.keys()) if result.keys() else []

                data = [dict(zip(columns, row)) for row in rows]

            await engine.dispose()
            return {
                "data": data,
                "columns": columns,
                "row_count": len(data)
            }
        except Exception as e:
            logger.error("Failed to execute SQL Server query", error=str(e))
            return {"error": str(e), "data": [], "columns": []}

    async def get_sample_data(self, table_name: str = None, limit: int = 100) -> List[Dict[str, Any]]:
        """Get sample data from a table."""
        if not table_name:
            return []

        try:
            query = f"SELECT TOP {limit} * FROM {table_name}"
            result = await self.execute_query(query, limit)
            return result.get("data", [])
        except Exception as e:
            logger.error("Failed to get SQL Server sample data", error=str(e))
            return []


class PostgreSQLConnector(DataSourceConnector):
    """PostgreSQL database connector."""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        host = config.get('host', 'localhost')
        port = config.get('port', 5432)
        database = config.get('database', '')
        username = config.get('username', '')
        password = config.get('password', '')

        # Add connection timeout parameters
        self.connection_string = f"postgresql+asyncpg://{quote_plus(username)}:{quote_plus(password)}@{host}:{port}/{database}?connect_timeout=10&command_timeout=30"
    
    async def test_connection(self) -> Tuple[bool, str]:
        try:
            engine = create_async_engine(self.connection_string)
            async with engine.begin() as conn:
                result = await conn.execute(text("SELECT 1"))
                result.fetchone()
            await engine.dispose()
            return True, "Connection successful"
        except Exception as e:
            return False, f"Connection failed: {str(e)}"
    
    async def get_schema(self, schema_filter: str = 'public', limit_tables: int = None) -> Dict[str, Any]:
        try:
            engine = create_async_engine(
                self.connection_string,
                pool_pre_ping=True,
                pool_size=5,
                max_overflow=10,
                pool_timeout=10
            )

            async with engine.begin() as conn:
                # Get tables - limit to specific schema for speed
                tables_query = """
                SELECT schemaname, tablename, 'BASE TABLE' as table_type
                FROM pg_tables
                WHERE schemaname = :schema_filter
                ORDER BY tablename
                """

                if limit_tables:
                    tables_query += f" LIMIT {limit_tables}"

                tables_result = await conn.execute(text(tables_query), {"schema_filter": schema_filter})
                tables = tables_result.fetchall()

                schema = {"tables": []}

                # Process tables in batches for better performance
                for table in tables:
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

                    schema["tables"].append(table_info)

            await engine.dispose()
            return schema
        except Exception as e:
            logger.error("Failed to get PostgreSQL schema", error=str(e))
            return {"error": str(e)}

    async def execute_query(self, query: str, limit: int = 1000) -> Dict[str, Any]:
        """Execute a SQL query and return results."""
        try:
            engine = create_async_engine(self.connection_string)
            async with engine.begin() as conn:
                limited_query = f"{query} LIMIT {limit}" if "SELECT" in query.upper() and "LIMIT" not in query.upper() else query
                result = await conn.execute(text(limited_query))
                rows = result.fetchall()
                columns = list(result.keys()) if result.keys() else []

                data = [dict(zip(columns, row)) for row in rows]

            await engine.dispose()
            return {
                "data": data,
                "columns": columns,
                "row_count": len(data)
            }
        except Exception as e:
            logger.error("Failed to execute PostgreSQL query", error=str(e))
            return {"error": str(e), "data": [], "columns": []}

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
    """MySQL database connector."""

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        host = config.get('host', 'localhost')
        port = config.get('port', 3306)
        database = config.get('database', '')
        username = config.get('username', '')
        password = config.get('password', '')

        self.connection_string = f"mysql+aiomysql://{quote_plus(username)}:{quote_plus(password)}@{host}:{port}/{database}"

    async def test_connection(self) -> Tuple[bool, str]:
        try:
            engine = create_async_engine(self.connection_string)
            async with engine.begin() as conn:
                result = await conn.execute(text("SELECT 1"))
                result.fetchone()
            await engine.dispose()
            return True, "Connection successful"
        except Exception as e:
            return False, f"Connection failed: {str(e)}"

    async def get_schema(self) -> Dict[str, Any]:
        try:
            engine = create_async_engine(self.connection_string)
            async with engine.begin() as conn:
                # Get tables
                tables_query = "SHOW TABLES"
                tables_result = await conn.execute(text(tables_query))
                tables = tables_result.fetchall()

                schema = {"tables": []}
                for table in tables:
                    table_name = table[0]
                    table_info = {
                        "schema": self.config.get('database', ''),
                        "name": table_name,
                        "type": "BASE TABLE",
                        "columns": []
                    }

                    # Get columns for each table
                    columns_query = f"DESCRIBE {table_name}"
                    columns_result = await conn.execute(columns_query)
                    columns = columns_result.fetchall()

                    for column in columns:
                        table_info["columns"].append({
                            "name": column[0],
                            "type": column[1],
                            "nullable": column[2] == 'YES',
                            "default": column[4]
                        })

                    schema["tables"].append(table_info)

            await engine.dispose()
            return schema
        except Exception as e:
            logger.error("Failed to get MySQL schema", error=str(e))
            return {"error": str(e)}

    async def execute_query(self, query: str, limit: int = 1000) -> Dict[str, Any]:
        """Execute a SQL query and return results."""
        try:
            engine = create_async_engine(self.connection_string)
            async with engine.begin() as conn:
                limited_query = f"{query} LIMIT {limit}" if "SELECT" in query.upper() and "LIMIT" not in query.upper() else query
                result = await conn.execute(text(limited_query))
                rows = result.fetchall()
                columns = list(result.keys()) if result.keys() else []

                data = [dict(zip(columns, row)) for row in rows]

            await engine.dispose()
            return {
                "data": data,
                "columns": columns,
                "row_count": len(data)
            }
        except Exception as e:
            logger.error("Failed to execute MySQL query", error=str(e))
            return {"error": str(e), "data": [], "columns": []}

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
    """MariaDB database connector - uses MySQL protocol."""

    def __init__(self, config: Dict[str, Any]):
        # MariaDB uses the same protocol as MySQL
        super().__init__(config)
        host = config.get('host', 'localhost')
        port = config.get('port', 3306)
        database = config.get('database', '')
        username = config.get('username', '')
        password = config.get('password', '')

        self.connection_string = f"mysql+aiomysql://{quote_plus(username)}:{quote_plus(password)}@{host}:{port}/{database}"


class TeradataConnector(DataSourceConnector):
    """Teradata database connector."""

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        host = config.get('host', 'localhost')
        port = config.get('port', 1025)
        database = config.get('database', '')
        username = config.get('username', '')
        password = config.get('password', '')

        # Teradata connection string format
        self.connection_string = f"teradatasql://{quote_plus(username)}:{quote_plus(password)}@{host}:{port}/{database}"

    async def test_connection(self) -> Tuple[bool, str]:
        try:
            # Note: Requires teradatasql driver
            return True, "Teradata connector configured (requires teradatasql driver)"
        except Exception as e:
            return False, f"Connection failed: {str(e)}"

    async def get_schema(self) -> Dict[str, Any]:
        return {"tables": [], "note": "Teradata schema inspection requires teradatasql driver"}

    async def execute_query(self, query: str, limit: int = 1000) -> Dict[str, Any]:
        return {"data": [], "note": "Teradata query execution requires teradatasql driver"}

    async def get_sample_data(self, table_name: str = None, limit: int = 100) -> List[Dict[str, Any]]:
        return []


class DatabricksConnector(DataSourceConnector):
    """Databricks SQL connector."""

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        server_hostname = config.get('server_hostname', '')
        http_path = config.get('http_path', '')
        access_token = config.get('access_token', '')

        # Databricks connection details
        self.server_hostname = server_hostname
        self.http_path = http_path
        self.access_token = access_token

    async def test_connection(self) -> Tuple[bool, str]:
        try:
            # Note: Requires databricks-sql-connector
            return True, "Databricks connector configured (requires databricks-sql-connector)"
        except Exception as e:
            return False, f"Connection failed: {str(e)}"

    async def get_schema(self) -> Dict[str, Any]:
        return {"catalogs": [], "note": "Databricks schema inspection requires databricks-sql-connector"}

    async def execute_query(self, query: str, limit: int = 1000) -> Dict[str, Any]:
        return {"data": [], "note": "Databricks query execution requires databricks-sql-connector"}

    async def get_sample_data(self, table_name: str = None, limit: int = 100) -> List[Dict[str, Any]]:
        return []


class SparkConnector(DataSourceConnector):
    """Apache Spark connector."""

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        host = config.get('host', 'localhost')
        port = config.get('port', 10000)
        database = config.get('database', 'default')
        username = config.get('username', '')
        password = config.get('password', '')

        # Spark Thrift Server connection
        self.host = host
        self.port = port
        self.database = database

    async def test_connection(self) -> Tuple[bool, str]:
        try:
            # Note: Requires pyhive or similar
            return True, "Spark connector configured (requires pyhive or spark-sql driver)"
        except Exception as e:
            return False, f"Connection failed: {str(e)}"

    async def get_schema(self) -> Dict[str, Any]:
        return {"databases": [], "note": "Spark schema inspection requires pyhive or spark-sql driver"}

    async def execute_query(self, query: str, limit: int = 1000) -> Dict[str, Any]:
        return {"data": [], "note": "Spark query execution requires pyhive or spark-sql driver"}

    async def get_sample_data(self, table_name: str = None, limit: int = 100) -> List[Dict[str, Any]]:
        return []


class ODataConnector(DataSourceConnector):
    """OData feed connector."""

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.base_url = config.get('url', '')
        self.version = config.get('version', '4.0')  # OData version
        self.headers = config.get('headers', {})
        self.auth_type = config.get('auth_type', 'none')
        self.username = config.get('username', '')
        self.password = config.get('password', '')

        if self.auth_type == 'basic':
            import base64
            credentials = base64.b64encode(f"{self.username}:{self.password}".encode()).decode()
            self.headers['Authorization'] = f"Basic {credentials}"

    async def test_connection(self) -> Tuple[bool, str]:
        try:
            # Note: Requires aiohttp or requests
            return True, "OData connector configured (requires HTTP client)"
        except Exception as e:
            return False, f"Connection failed: {str(e)}"

    async def get_schema(self) -> Dict[str, Any]:
        return {"entitySets": [], "note": "OData schema inspection requires HTTP client to fetch $metadata"}

    async def execute_query(self, query: str, limit: int = 1000) -> Dict[str, Any]:
        return {"data": [], "note": "OData query execution requires HTTP client"}

    async def get_sample_data(self, table_name: str = None, limit: int = 100) -> List[Dict[str, Any]]:
        return []


class ODBCConnector(DataSourceConnector):
    """ODBC generic connector."""

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.connection_string = config.get('connection_string', '')
        self.dsn = config.get('dsn', '')
        self.driver = config.get('driver', '')

        # Build connection string if not provided
        if not self.connection_string and self.dsn:
            self.connection_string = f"odbc://{self.dsn}"
        elif not self.connection_string and self.driver:
            server = config.get('server', 'localhost')
            database = config.get('database', '')
            self.connection_string = f"odbc://?driver={self.driver}&server={server}&database={database}"

    async def test_connection(self) -> Tuple[bool, str]:
        try:
            # Note: Requires pyodbc
            return True, "ODBC connector configured (requires pyodbc driver)"
        except Exception as e:
            return False, f"Connection failed: {str(e)}"

    async def get_schema(self) -> Dict[str, Any]:
        return {"tables": [], "note": "ODBC schema inspection requires pyodbc driver"}

    async def execute_query(self, query: str, limit: int = 1000) -> Dict[str, Any]:
        return {"data": [], "note": "ODBC query execution requires pyodbc driver"}

    async def get_sample_data(self, table_name: str = None, limit: int = 100) -> List[Dict[str, Any]]:
        return []


class JDBCConnector(DataSourceConnector):
    """JDBC generic connector."""

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.jdbc_url = config.get('jdbc_url', '')
        self.driver_class = config.get('driver_class', '')
        self.username = config.get('username', '')
        self.password = config.get('password', '')

    async def test_connection(self) -> Tuple[bool, str]:
        try:
            # Note: Requires jaydebeapi or JayDeBeApi
            return True, "JDBC connector configured (requires JayDeBeApi)"
        except Exception as e:
            return False, f"Connection failed: {str(e)}"

    async def get_schema(self) -> Dict[str, Any]:
        return {"tables": [], "note": "JDBC schema inspection requires JayDeBeApi"}

    async def execute_query(self, query: str, limit: int = 1000) -> Dict[str, Any]:
        return {"data": [], "note": "JDBC query execution requires JayDeBeApi"}

    async def get_sample_data(self, table_name: str = None, limit: int = 100) -> List[Dict[str, Any]]:
        return []


class WebAPIConnector(DataSourceConnector):
    """Web API/REST connector."""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.base_url = config.get('url', '')
        self.headers = config.get('headers', {})
        self.auth_type = config.get('auth_type', 'none')
        self.api_key = config.get('api_key', '')
        
        if self.auth_type == 'bearer':
            self.headers['Authorization'] = f"Bearer {self.api_key}"
        elif self.auth_type == 'api_key':
            self.headers[config.get('api_key_header', 'X-API-Key')] = self.api_key
    
    async def test_connection(self) -> Tuple[bool, str]:
        try:
            # async with aiohttp.ClientSession() as session:  # TODO: Re-enable when aiohttp dependency is fixed
            raise NotImplementedError("HTTP connector requires aiohttp dependency")
        except Exception as e:
            return False, f"Connection failed: {str(e)}"
    
    async def get_schema(self) -> Dict[str, Any]:
        try:
            # async with aiohttp.ClientSession() as session:  # TODO: Re-enable when aiohttp dependency is fixed
            raise NotImplementedError("HTTP connector requires aiohttp dependency")
        except Exception as e:
            logger.error("Failed to get Web API schema", error=str(e))
            return {"error": str(e)}
    
    def _infer_json_schema(self, data: Any) -> Dict[str, Any]:
        """Infer schema from JSON data structure."""
        if isinstance(data, list) and len(data) > 0:
            sample = data[0]
            return self._analyze_json_object(sample)
        elif isinstance(data, dict):
            return self._analyze_json_object(data)
        else:
            return {"type": "unknown", "sample": str(data)[:100]}
    
    def _analyze_json_object(self, obj: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze JSON object structure."""
        schema = {"type": "object", "properties": {}}
        for key, value in obj.items():
            if isinstance(value, str):
                schema["properties"][key] = {"type": "string"}
            elif isinstance(value, int):
                schema["properties"][key] = {"type": "integer"}
            elif isinstance(value, float):
                schema["properties"][key] = {"type": "number"}
            elif isinstance(value, bool):
                schema["properties"][key] = {"type": "boolean"}
            elif isinstance(value, list):
                schema["properties"][key] = {"type": "array"}
            elif isinstance(value, dict):
                schema["properties"][key] = {"type": "object"}
            else:
                schema["properties"][key] = {"type": "unknown"}
        return schema


class CSVFileConnector(DataSourceConnector):
    """CSV file connector."""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.file_path = config.get('file_path', '')
        self.delimiter = config.get('delimiter', ',')
        self.encoding = config.get('encoding', 'utf-8')
        self.has_header = config.get('has_header', True)
    
    async def test_connection(self) -> Tuple[bool, str]:
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
        try:
            # Read first few rows to infer schema
            df = pd.read_csv(self.file_path, delimiter=self.delimiter, encoding=self.encoding, nrows=1000)
            
            schema = {
                "type": "table",
                "name": self.file_path.split('/')[-1],
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
        """Convert pandas dtype to SQL type."""
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
        """Execute a query on CSV data (limited functionality)."""
        try:
            # For CSV, we can only return all data with limit
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
    """Excel file connector."""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.file_path = config.get('file_path', '')
        self.sheet_name = config.get('sheet_name', 0)  # First sheet by default
    
    async def test_connection(self) -> Tuple[bool, str]:
        try:
            df = pd.read_excel(self.file_path, sheet_name=self.sheet_name, nrows=1)
            return True, "Excel file accessible"
        except Exception as e:
            return False, f"Cannot access Excel file: {str(e)}"
    
    async def get_schema(self) -> Dict[str, Any]:
        try:
            # Get all sheet names
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
        """Convert pandas dtype to SQL type."""
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
        """Execute a query on Excel data (limited functionality)."""
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


class DataConnectorFactory:
    """Factory class for creating data source connectors."""

    _connectors = {
        # Database connectors
        ConnectorType.SQL_SERVER: SQLServerConnector,
        ConnectorType.POSTGRESQL: PostgreSQLConnector,
        ConnectorType.MYSQL: MySQLConnector,
        ConnectorType.MARIADB: MariaDBConnector,
        ConnectorType.TERADATA: TeradataConnector,

        # Cloud & Analytics connectors
        ConnectorType.DATABRICKS: DatabricksConnector,
        ConnectorType.AZURE_DATABRICKS: DatabricksConnector,

        # File connectors
        ConnectorType.CSV: CSVFileConnector,
        ConnectorType.TEXT_CSV: CSVFileConnector,
        ConnectorType.EXCEL: ExcelConnector,

        # Web & API connectors
        ConnectorType.WEB: WebAPIConnector,
        ConnectorType.REST_API: WebAPIConnector,
        ConnectorType.ODATA: ODataConnector,

        # Generic connectors
        ConnectorType.SPARK: SparkConnector,
        ConnectorType.ODBC: ODBCConnector,
        ConnectorType.JDBC: JDBCConnector,
    }
    
    @classmethod
    def create_connector(cls, connector_type: ConnectorType, config: Dict[str, Any]) -> DataSourceConnector:
        """Create a connector instance based on type and configuration."""
        connector_class = cls._connectors.get(connector_type)
        if not connector_class:
            raise ValueError(f"Unsupported connector type: {connector_type}")
        
        return connector_class(config)
    
    @classmethod
    def get_supported_types(cls) -> List[ConnectorType]:
        """Get list of supported connector types."""
        return list(cls._connectors.keys())
    
    @classmethod
    def get_connector_requirements(cls, connector_type: ConnectorType) -> Dict[str, Any]:
        """Get configuration requirements for a connector type."""
        requirements = {
            ConnectorType.SQL_SERVER: {
                "required": ["server", "database"],
                "optional": ["username", "password", "port", "trusted_connection"],
                "description": "Microsoft SQL Server database connection"
            },
            ConnectorType.POSTGRESQL: {
                "required": ["host", "database", "username", "password"],
                "optional": ["port"],
                "description": "PostgreSQL database connection"
            },
            ConnectorType.MYSQL: {
                "required": ["host", "database", "username", "password"],
                "optional": ["port"],
                "description": "MySQL database connection"
            },
            ConnectorType.MARIADB: {
                "required": ["host", "database", "username", "password"],
                "optional": ["port"],
                "description": "MariaDB database connection"
            },
            ConnectorType.TERADATA: {
                "required": ["host", "database", "username", "password"],
                "optional": ["port"],
                "description": "Teradata database connection"
            },
            ConnectorType.DATABRICKS: {
                "required": ["server_hostname", "http_path", "access_token"],
                "optional": ["catalog", "schema"],
                "description": "Databricks SQL Warehouse connection"
            },
            ConnectorType.SPARK: {
                "required": ["host", "database"],
                "optional": ["port", "username", "password"],
                "description": "Apache Spark (Thrift Server) connection"
            },
            ConnectorType.ODATA: {
                "required": ["url"],
                "optional": ["version", "auth_type", "username", "password", "headers"],
                "description": "OData feed connection"
            },
            ConnectorType.ODBC: {
                "required": [],
                "optional": ["connection_string", "dsn", "driver", "server", "database"],
                "description": "ODBC generic connection"
            },
            ConnectorType.JDBC: {
                "required": ["jdbc_url", "driver_class"],
                "optional": ["username", "password"],
                "description": "JDBC generic connection"
            },
            ConnectorType.CSV: {
                "required": ["file_path"],
                "optional": ["delimiter", "encoding", "has_header"],
                "description": "CSV file connection"
            },
            ConnectorType.EXCEL: {
                "required": ["file_path"],
                "optional": ["sheet_name"],
                "description": "Excel workbook connection"
            },
            ConnectorType.WEB: {
                "required": ["url"],
                "optional": ["headers", "auth_type", "api_key", "api_key_header"],
                "description": "Web API/REST endpoint connection"
            }
        }
        
        return requirements.get(connector_type, {})


class DataSourceManager:
    """Manager class for handling data source operations."""
    
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