"""
Dataset service for PowerBI Web Replica.
Handles dataset operations with actual data import.
"""

import io
import csv
import pandas as pd
import json
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, MetaData, Table as SQLATable, Column, Integer, String, Float, Boolean, DateTime, create_engine
from sqlalchemy.orm import selectinload

import structlog
from app.models.dataset import Dataset, DatasetStatus, ConnectorType, Table
from app.models.workspace import Workspace

logger = structlog.get_logger()


class DatasetService:
    """Service for managing datasets and their operations."""
    
    @staticmethod
    async def create_dataset_with_import(
        session: AsyncSession,
        workspace_id: str,
        name: str,
        connector_type: ConnectorType,
        connection_config: Dict[str, Any],
        selected_tables: List[str],
        description: Optional[str] = None,
        import_data: bool = True
    ) -> Dataset:
        """
        Create a dataset with selected tables and import their data.
        This is the main method for database connectors.
        
        Args:
            session: Database session
            workspace_id: Workspace ID
            name: Dataset name
            connector_type: Type of connector (PostgreSQL, MySQL, etc.)
            connection_config: Connection configuration
            selected_tables: List of table names to import (schema.table format)
            description: Optional dataset description
            import_data: Whether to import actual data (True) or just schema (False)
        """
        try:
            # Create dataset record
            dataset = Dataset(
                workspace_id=workspace_id,
                name=name,
                description=description,
                connector_type=connector_type,
                connector_config=connection_config,
                status=DatasetStatus.IMPORTING
            )

            session.add(dataset)
            await session.flush()

            logger.info(
                f"Starting import for dataset {dataset.id}",
                selected_tables=len(selected_tables),
                import_data=import_data
            )

            # Import tables
            from app.services.data_connectors import DataConnectorFactory
            
            connector = DataConnectorFactory.create_connector(
                connector_type, 
                connection_config
            )

            schema_json = {"tables": []}
            total_rows = 0

            for table_name in selected_tables:
                try:
                    logger.info(f"Importing table: {table_name}")
                    
                    # Get table schema from source
                    full_schema = await connector.get_schema()
                    
                    # Find the specific table in the schema
                    table_schema = None
                    for tbl in full_schema.get("tables", []):
                        full_name = f"{tbl.get('schema', 'public')}.{tbl['name']}"
                        if full_name == table_name or tbl['name'] == table_name:
                            table_schema = tbl
                            break
                    
                    if not table_schema:
                        logger.warning(f"Table {table_name} not found in schema, skipping")
                        continue

                    # Prepare table info for our schema
                    table_info = {
                        "name": table_name,
                        "displayName": table_schema['name'].replace('_', ' ').title(),
                        "columns": [],
                        "rowCount": 0
                    }

                    # Map column types
                    type_mapping = {
                        'integer': 'integer', 'bigint': 'integer', 'smallint': 'integer',
                        'numeric': 'decimal', 'decimal': 'decimal', 'real': 'decimal',
                        'double precision': 'decimal', 'money': 'decimal',
                        'character varying': 'string', 'varchar': 'string',
                        'character': 'string', 'char': 'string', 'text': 'string',
                        'boolean': 'boolean', 'date': 'date',
                        'timestamp': 'datetime', 'timestamp without time zone': 'datetime',
                        'timestamp with time zone': 'datetime', 'time': 'datetime',
                        'json': 'string', 'jsonb': 'string', 'uuid': 'string'
                    }

                    for col in table_schema["columns"]:
                        col_type = col['type'].lower()
                        base_type = col_type.split('(')[0].strip()
                        mapped_type = type_mapping.get(base_type, 'string')

                        table_info["columns"].append({
                            "name": col['name'],
                            "type": mapped_type,
                            "nullable": col.get('nullable', True),
                            "description": f"{mapped_type.title()} column"
                        })

                    # Import actual data if requested
                    imported_data = []
                    if import_data:
                        try:
                            # Fetch data from source
                            query = f"SELECT * FROM {table_name} LIMIT 10000"  # Limit for safety
                            result = await connector.execute_query(query, limit=10000)
                            
                            if "error" not in result and result.get("data"):
                                imported_data = result["data"]
                                table_info["rowCount"] = len(imported_data)
                                total_rows += len(imported_data)
                                
                                logger.info(
                                    f"Imported {len(imported_data)} rows from {table_name}"
                                )
                            else:
                                logger.warning(
                                    f"Failed to import data from {table_name}: {result.get('error', 'Unknown error')}"
                                )
                        except Exception as data_err:
                            logger.error(
                                f"Error importing data from {table_name}: {str(data_err)}"
                            )

                    # Create Table record in our database
                    table_record = Table(
                        dataset_id=dataset.id,
                        name=table_name,
                        display_name=table_info["displayName"],
                        description=f"Imported from {connector_type.value}",
                        columns=table_info["columns"],
                        row_count=table_info["rowCount"]
                    )
                    session.add(table_record)

                    # Store imported data as JSON (for now - could be optimized to separate tables)
                    # In production, you might want to create actual database tables
                    if imported_data:
                        # Store sample data in dataset
                        if not hasattr(dataset, 'imported_data'):
                            dataset.sample_rows = {}
                        if dataset.sample_rows is None:
                            dataset.sample_rows = {}
                        dataset.sample_rows[table_name] = imported_data[:1000]  # Store first 1000 rows

                    schema_json["tables"].append(table_info)
                    
                except Exception as table_err:
                    logger.error(
                        f"Failed to import table {table_name}: {str(table_err)}"
                    )
                    continue

            # Update dataset with final info
            dataset.schema_json = schema_json
            dataset.row_count = total_rows
            dataset.status = DatasetStatus.READY if len(schema_json["tables"]) > 0 else DatasetStatus.ERROR
            
            if dataset.status == DatasetStatus.ERROR:
                dataset.error_message = "No tables were successfully imported"

            await session.commit()
            await session.refresh(dataset)

            logger.info(
                "Dataset import completed",
                dataset_id=str(dataset.id),
                tables_imported=len(schema_json["tables"]),
                total_rows=total_rows
            )

            return dataset

        except Exception as e:
            logger.error("Failed to create dataset with import", error=str(e))
            if dataset:
                dataset.status = DatasetStatus.ERROR
                dataset.error_message = str(e)
                await session.commit()
            raise

    @staticmethod
    async def create_dataset(
        session: AsyncSession,
        workspace_id: str,
        name: str,
        connector_type: ConnectorType,
        file_content: Optional[bytes] = None,
        description: Optional[str] = None,
        connection_config: Optional[Dict[str, Any]] = None
    ) -> Dataset:
        """
        Create a dataset from file upload.
        This is for file-based connectors (CSV, Excel, JSON, PDF).
        """
        try:
            dataset = Dataset(
                workspace_id=workspace_id,
                name=name,
                description=description,
                connector_type=connector_type,
                connector_config=connection_config or {},
                status=DatasetStatus.PROCESSING
            )

            session.add(dataset)
            await session.flush()

            # Process based on connector type
            if connector_type == ConnectorType.CSV and file_content:
                await DatasetService._process_csv_data(session, dataset, file_content)
            elif connector_type == ConnectorType.EXCEL and file_content:
                await DatasetService._process_excel_data(session, dataset, file_content)
            elif connector_type == ConnectorType.JSON and file_content:
                await DatasetService._process_json_data(session, dataset, file_content)
            elif connector_type == ConnectorType.PDF and file_content:
                await DatasetService._process_pdf_data(session, dataset, file_content)
            else:
                dataset.status = DatasetStatus.READY
                dataset.schema_json = {"tables": []}
                await session.commit()
                await session.refresh(dataset)

            return dataset

        except Exception as e:
            logger.error("Failed to create dataset", error=str(e))
            await session.rollback()
            raise

    @staticmethod
    async def _process_csv_data(
        session: AsyncSession,
        dataset: Dataset,
        file_content: bytes
    ) -> None:
        """Process CSV file and extract schema + data."""
        try:
            csv_text = file_content.decode('utf-8')
            csv_reader = csv.reader(io.StringIO(csv_text))

            headers = next(csv_reader, [])
            if not headers:
                raise ValueError("CSV file is empty or has no headers")

            sample_rows = []
            row_count = 0

            for row in csv_reader:
                row_count += 1
                if len(sample_rows) < 1000:
                    sample_rows.append(row)

            # Infer schema
            columns = []
            for i, header in enumerate(headers):
                col_type = DatasetService._infer_column_type(sample_rows, i) 
                columns.append({
                    "name": header.strip(),
                    "type": col_type,
                    "nullable": True,
                    "description": f"{col_type.title()} column"
                })

            schema_json = {
                "tables": [{
                    "name": dataset.name,
                    "displayName": dataset.name,
                    "columns": columns,
                    "rowCount": row_count
                }]
            }

            # Create table record
            table = Table(
                dataset_id=dataset.id,
                name=dataset.name,
                display_name=dataset.name,
                description=f"Table for {dataset.name}",
                columns=columns,
                row_count=row_count
            )
            session.add(table)

            # Update dataset
            dataset.schema_json = schema_json
            dataset.row_count = row_count
            dataset.file_size = len(file_content)
            dataset.sample_rows = sample_rows[:1000]
            dataset.status = DatasetStatus.READY

            await session.commit()
            await session.refresh(dataset)

            logger.info("CSV dataset processed", dataset_id=str(dataset.id))

        except Exception as e:
            dataset.status = DatasetStatus.ERROR
            dataset.error_message = str(e)
            await session.commit()
            logger.error("Failed to process CSV", error=str(e))
            raise

    @staticmethod
    async def _process_excel_data(
        session: AsyncSession,
        dataset: Dataset,
        file_content: bytes
    ) -> None:
        """Process Excel file and extract schema + data."""
        try:
            # Read Excel file
            df = pd.read_excel(io.BytesIO(file_content))
            
            # Convert to records
            sample_rows = df.head(1000).values.tolist()
            row_count = len(df)

            # Infer schema
            columns = []
            for col in df.columns:
                dtype = str(df[col].dtype)
                columns.append({
                    "name": col,
                    "type": DatasetService._pandas_to_sql_type(dtype),
                    "nullable": df[col].isnull().any(),
                    "description": f"{DatasetService._pandas_to_sql_type(dtype).title()} column"
                })

            schema_json = {
                "tables": [{
                    "name": dataset.name,
                    "displayName": dataset.name,
                    "columns": columns,
                    "rowCount": row_count
                }]
            }

            # Create table record
            table = Table(
                dataset_id=dataset.id,
                name=dataset.name,
                display_name=dataset.name,
                description=f"Table for {dataset.name}",
                columns=columns,
                row_count=row_count
            )
            session.add(table)

            dataset.schema_json = schema_json
            dataset.row_count = row_count
            dataset.file_size = len(file_content)
            dataset.sample_rows = sample_rows
            dataset.status = DatasetStatus.READY

            await session.commit()
            await session.refresh(dataset)

        except Exception as e:
            dataset.status = DatasetStatus.ERROR
            dataset.error_message = str(e)
            await session.commit()
            logger.error("Failed to process Excel", error=str(e))
            raise

    @staticmethod
    async def _process_json_data(
        session: AsyncSession,
        dataset: Dataset,
        file_content: bytes
    ) -> None:
        """Process JSON file and extract schema + data."""
        try:
            json_text = file_content.decode('utf-8')
            data = json.loads(json_text)

            if isinstance(data, list) and len(data) > 0:
                sample = data[0]
                sample_rows = data[:1000]
                row_count = len(data)
            elif isinstance(data, dict):
                sample_rows = [data]
                row_count = 1
            else:
                raise ValueError("Unsupported JSON structure")

            # Infer schema from first record
            columns = []
            for key in sample_rows[0].keys():
                value = sample_rows[0][key]
                col_type = "string"
                
                if isinstance(value, bool):
                    col_type = "boolean"
                elif isinstance(value, int):
                    col_type = "integer"
                elif isinstance(value, float):
                    col_type = "decimal"
                
                columns.append({
                    "name": key,
                    "type": col_type,
                    "nullable": True,
                    "description": f"{col_type.title()} column"
                })

            schema_json = {
                "tables": [{
                    "name": dataset.name,
                    "displayName": dataset.name,
                    "columns": columns,
                    "rowCount": row_count
                }]
            }

            table = Table(
                dataset_id=dataset.id,
                name=dataset.name,
                display_name=dataset.name,
                description=f"Table for {dataset.name}",
                columns=columns,
                row_count=row_count
            )
            session.add(table)

            dataset.schema_json = schema_json
            dataset.row_count = row_count
            dataset.file_size = len(file_content)
            dataset.sample_rows = sample_rows
            dataset.status = DatasetStatus.READY

            await session.commit()
            await session.refresh(dataset)

        except Exception as e:
            dataset.status = DatasetStatus.ERROR
            dataset.error_message = str(e)
            await session.commit()
            logger.error("Failed to process JSON", error=str(e))
            raise

    @staticmethod
    async def _process_pdf_data(
        session: AsyncSession,
        dataset: Dataset,
        file_content: bytes
    ) -> None:
        """Process PDF file and extract table data."""
        try:
            import pdfplumber
            
            with pdfplumber.open(io.BytesIO(file_content)) as pdf:
                if len(pdf.pages) == 0:
                    raise ValueError("PDF file is empty")
                
                # Extract tables from first page
                page = pdf.pages[0]
                tables = page.extract_tables()
                
                if not tables or len(tables[0]) < 2:
                    raise ValueError("No tables found in PDF")
                
                table_data = tables[0]
                headers = table_data[0]
                rows = table_data[1:]
                
                # Infer schema
                columns = []
                for i, header in enumerate(headers):
                    columns.append({
                        "name": header or f"Column_{i+1}",
                        "type": "string",
                        "nullable": True,
                        "description": "String column"
                    })
                
                schema_json = {
                    "tables": [{
                        "name": dataset.name,
                        "displayName": dataset.name,
                        "columns": columns,
                        "rowCount": len(rows)
                    }]
                }
                
                table = Table(
                    dataset_id=dataset.id,
                    name=dataset.name,
                    display_name=dataset.name,
                    description=f"Table for {dataset.name}",
                    columns=columns,
                    row_count=len(rows)
                )
                session.add(table)
                
                dataset.schema_json = schema_json
                dataset.row_count = len(rows)
                dataset.file_size = len(file_content)
                dataset.sample_rows = rows[:1000]
                dataset.status = DatasetStatus.READY
                
                await session.commit()
                await session.refresh(dataset)
                
        except Exception as e:
            dataset.status = DatasetStatus.ERROR
            dataset.error_message = str(e)
            await session.commit()
            logger.error("Failed to process PDF", error=str(e))
            raise

    @staticmethod
    def _pandas_to_sql_type(pandas_type: str) -> str:
        """Convert pandas dtype to SQL-like type."""
        if 'int' in pandas_type:
            return 'integer'
        elif 'float' in pandas_type:
            return 'decimal'
        elif 'bool' in pandas_type:
            return 'boolean'
        elif 'datetime' in pandas_type:
            return 'datetime'
        else:
            return 'string'

    @staticmethod
    def _infer_column_type(sample_rows: List[List[str]], col_index: int) -> str:
        """Infer column type from sample data."""
        if not sample_rows:
            return "string"
        
        sample_values = []
        for row in sample_rows:
            if col_index < len(row) and row[col_index].strip():
                sample_values.append(row[col_index].strip())
        
        if not sample_values:
            return "string"
        
        # Try integer
        try:
            if all(str(int(v)) == v for v in sample_values):
                return "integer"
        except ValueError:
            pass
        
        # Try decimal
        try:
            if all(float(v) for v in sample_values):
                return "decimal"
        except ValueError:
            pass
        
        # Try boolean
        boolean_values = {"true", "false", "yes", "no", "1", "0"}
        if all(v.lower() in boolean_values for v in sample_values):
            return "boolean"
        
        return "string"

    @staticmethod
    async def get_datasets_by_workspace(
        session: AsyncSession,
        workspace_id: str
    ) -> List[Dataset]:
        """Get all datasets in a workspace."""
        try:
            stmt = (
                select(Dataset)
                .options(selectinload(Dataset.tables))
                .where(Dataset.workspace_id == workspace_id)
                .order_by(Dataset.created_at.desc())
            )
            result = await session.execute(stmt)
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error querying datasets: {str(e)}")
            return []

    @staticmethod
    async def get_dataset_by_id(
        session: AsyncSession,
        dataset_id: str
    ) -> Optional[Dataset]:
        """Get dataset by ID with tables."""
        stmt = (
            select(Dataset)
            .options(selectinload(Dataset.tables))
            .where(Dataset.id == dataset_id)
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def delete_dataset(
        session: AsyncSession,
        dataset_id: str
    ) -> bool:
        """Delete a dataset and its associated tables."""
        try:
            dataset = await DatasetService.get_dataset_by_id(session, dataset_id)
            if not dataset:
                return False
            
            await session.delete(dataset)
            await session.commit()
            return True
        except Exception as e:
            await session.rollback()
            logger.error("Failed to delete dataset", error=str(e))
            return False

    @staticmethod
    async def query_dataset(
        session: AsyncSession,
        dataset_id: str,
        query_params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Query dataset and return results from imported data."""
        import time
        start_time = time.time()

        try:
            dataset = await DatasetService.get_dataset_by_id(session, dataset_id)
            if not dataset:
                raise ValueError(f"Dataset {dataset_id} not found")

            if dataset.status == DatasetStatus.ERROR:
                raise ValueError(f"Dataset error: {dataset.error_message}")

            # Get table name
            table_name = query_params.get("table_name")
            if not table_name and dataset.schema_json:
                tables = dataset.schema_json.get("tables", [])
                if tables:
                    table_name = tables[0]["name"]

            # Get data from imported sample_rows
            if dataset.sample_rows:
                if isinstance(dataset.sample_rows, dict):
                    # Database connector - data stored by table name
                    data = dataset.sample_rows.get(table_name, [])
                else:
                    # File connector - data stored directly
                    data = dataset.sample_rows
                
                limit = query_params.get("limit", 100)
                data = data[:limit]
                
                # Get columns from schema
                tables = dataset.schema_json.get("tables", [])
                columns = []
                for tbl in tables:
                    if tbl["name"] == table_name:
                        columns = [{"name": col["name"], "type": col["type"]} for col in tbl["columns"]]
                        break
                
                execution_time = time.time() - start_time
                return {
                    "data": data,
                    "columns": columns,
                    "total_rows": len(data),
                    "execution_time": execution_time
                }
            
            raise ValueError("No data available")

        except Exception as e:
            logger.error("Failed to query dataset", error=str(e))
            raise

    @staticmethod
    async def refresh_dataset(
        session: AsyncSession,
        dataset_id: str
    ) -> Dataset:
        """Refresh dataset data."""
        dataset = await DatasetService.get_dataset_by_id(session, dataset_id)
        if not dataset:
            raise ValueError(f"Dataset {dataset_id} not found")

        dataset.last_refresh = datetime.utcnow()
        await session.commit()
        await session.refresh(dataset)

        return dataset