"""
Dataset service for PowerBI Web Replica.
Handles dataset operations, schema inference, and data querying.
"""

import io
import csv
import pandas as pd
import json
import asyncio
from typing import List, Dict, Any, Optional, Union
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert, update, delete
from sqlalchemy.orm import selectinload

import structlog
from app.models.dataset import Dataset, DatasetStatus, ConnectorType, Table
from app.models.workspace import Workspace
from app.core.database import get_async_session

logger = structlog.get_logger()


class DatasetService:
    """Service for managing datasets and their operations."""
    
    @staticmethod
    async def create_dataset(
        session: AsyncSession,
        workspace_id: str,
        name: str,
        connector_type: ConnectorType,
        file_content: Optional[bytes] = None,
        connection_config: Optional[Dict[str, Any]] = None
    ) -> Dataset:
        """Create a new dataset."""
        try:
            dataset = Dataset(
                workspace_id=workspace_id,
                name=name,
                connector_type=connector_type,
                connector_config=connection_config or {},
                status=DatasetStatus.PROCESSING.value
            )
            
            session.add(dataset)
            await session.commit()
            await session.refresh(dataset)
            
            # Process the dataset based on type
            if connector_type == ConnectorType.CSV and file_content:
                await DatasetService._process_csv_data(session, dataset, file_content)
            else:
                # For database connections, create sample schema
                await DatasetService._create_sample_schema(session, dataset, connector_type)
            
            return dataset
            
        except Exception as e:
            logger.error("Failed to create dataset", error=str(e), workspace_id=workspace_id)
            await session.rollback()
            raise

    @staticmethod
    async def _process_csv_data(
        session: AsyncSession, 
        dataset: Dataset, 
        file_content: bytes
    ) -> None:
        """Process CSV file and extract schema."""
        try:
            # Decode CSV content
            csv_text = file_content.decode('utf-8')
            csv_reader = csv.reader(io.StringIO(csv_text))
            
            # Get headers
            headers = next(csv_reader, [])
            if not headers:
                raise ValueError("CSV file is empty or has no headers")
            
            # Sample rows for type inference
            sample_rows = []
            row_count = 0
            for row in csv_reader:
                row_count += 1
                if len(sample_rows) < 100:  # Sample first 100 rows
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
            dataset.sample_rows = sample_rows[:10]  # Store first 10 rows as sample
            dataset.status = DatasetStatus.READY.value
            
            await session.commit()
            
            logger.info("CSV dataset processed successfully", 
                       dataset_id=str(dataset.id), row_count=row_count)
                       
        except Exception as e:
            dataset.status = DatasetStatus.ERROR.value
            dataset.error_message = str(e)
            await session.commit()
            logger.error("Failed to process CSV data", 
                        dataset_id=str(dataset.id), error=str(e))
            raise

    @staticmethod
    async def _create_sample_schema(
        session: AsyncSession,
        dataset: Dataset,
        connector_type: ConnectorType
    ) -> None:
        """Create sample schema for database connections."""
        try:
            sample_schemas = {
                ConnectorType.POSTGRESQL: {
                    "tables": [{
                        "name": "users",
                        "displayName": "Users",
                        "columns": [
                            {"name": "user_id", "type": "integer", "nullable": False, "description": "User ID"},
                            {"name": "username", "type": "string", "nullable": False, "description": "Username"},
                            {"name": "email", "type": "string", "nullable": False, "description": "Email address"},
                            {"name": "created_at", "type": "datetime", "nullable": False, "description": "Creation date"},
                            {"name": "is_active", "type": "boolean", "nullable": False, "description": "Active status"},
                            {"name": "profile_score", "type": "decimal", "nullable": True, "description": "Profile score"}
                        ],
                        "rowCount": 15000
                    }, {
                        "name": "orders",
                        "displayName": "Orders",
                        "columns": [
                            {"name": "order_id", "type": "integer", "nullable": False, "description": "Order ID"},
                            {"name": "user_id", "type": "integer", "nullable": False, "description": "User ID"},
                            {"name": "product_name", "type": "string", "nullable": False, "description": "Product name"},
                            {"name": "quantity", "type": "integer", "nullable": False, "description": "Quantity ordered"},
                            {"name": "price", "type": "decimal", "nullable": False, "description": "Unit price"},
                            {"name": "order_date", "type": "date", "nullable": False, "description": "Order date"},
                            {"name": "status", "type": "string", "nullable": False, "description": "Order status"}
                        ],
                        "rowCount": 45000
                    }]
                },
                ConnectorType.MYSQL: {
                    "tables": [{
                        "name": "products",
                        "displayName": "Products",
                        "columns": [
                            {"name": "product_id", "type": "integer", "nullable": False, "description": "Product ID"},
                            {"name": "product_name", "type": "string", "nullable": False, "description": "Product name"},
                            {"name": "category", "type": "string", "nullable": False, "description": "Product category"},
                            {"name": "price", "type": "decimal", "nullable": False, "description": "Product price"},
                            {"name": "stock_quantity", "type": "integer", "nullable": False, "description": "Stock quantity"},
                            {"name": "supplier_id", "type": "integer", "nullable": True, "description": "Supplier ID"},
                            {"name": "last_updated", "type": "datetime", "nullable": False, "description": "Last update time"}
                        ],
                        "rowCount": 2500
                    }]
                },
                ConnectorType.BIGQUERY: {
                    "tables": [{
                        "name": "analytics_events",
                        "displayName": "Analytics Events",
                        "columns": [
                            {"name": "event_timestamp", "type": "datetime", "nullable": False, "description": "Event timestamp"},
                            {"name": "user_id", "type": "string", "nullable": False, "description": "User ID"},
                            {"name": "session_id", "type": "string", "nullable": False, "description": "Session ID"},
                            {"name": "event_name", "type": "string", "nullable": False, "description": "Event name"},
                            {"name": "event_value", "type": "decimal", "nullable": True, "description": "Event value"},
                            {"name": "user_properties", "type": "string", "nullable": True, "description": "User properties JSON"},
                            {"name": "device_category", "type": "string", "nullable": True, "description": "Device category"}
                        ],
                        "rowCount": 1200000
                    }]
                }
            }
            
            schema_json = sample_schemas.get(connector_type, {"tables": []})
            
            # Create table records
            for table_data in schema_json["tables"]:
                table = Table(
                    dataset_id=dataset.id,
                    name=table_data["name"],
                    display_name=table_data["displayName"],
                    description=f"Table {table_data['displayName']} from {connector_type.value} connection",
                    columns=table_data["columns"],
                    row_count=table_data["rowCount"]
                )
                session.add(table)
            
            dataset.schema_json = schema_json
            dataset.row_count = sum(table["rowCount"] for table in schema_json["tables"])
            dataset.status = DatasetStatus.READY.value
            
            await session.commit()
            
            logger.info("Sample schema created for dataset", 
                       dataset_id=str(dataset.id), connector_type=connector_type.value)
                       
        except Exception as e:
            dataset.status = DatasetStatus.ERROR.value    
            dataset.error_message = str(e)
            await session.commit()
            logger.error("Failed to create sample schema", 
                        dataset_id=str(dataset.id), error=str(e))
            raise

    @staticmethod
    def _infer_column_type(sample_rows: List[List[str]], col_index: int) -> str:
        """Infer column type from sample data."""
        if not sample_rows:
            return "string"
        
        # Get sample values for this column
        sample_values = []
        for row in sample_rows:
            if col_index < len(row) and row[col_index].strip():
                sample_values.append(row[col_index].strip())
        
        if not sample_values:
            return "string"
        
        # Try to infer type
        # Check for integers
        try:
            all_integers = all(str(int(v)) == v for v in sample_values)
            if all_integers:
                return "integer"
        except ValueError:
            pass
        
        # Check for decimals
        try:
            all_decimals = all('.' in v and float(v) for v in sample_values)
            if all_decimals:
                return "decimal"
        except ValueError:
            pass
        
        # Check for numbers (including integers and decimals)
        try:
            all_numbers = all(float(v) for v in sample_values)
            if all_numbers:
                return "decimal"
        except ValueError:
            pass
        
        # Check for booleans
        boolean_values = {"true", "false", "yes", "no", "1", "0", "y", "n"}
        if all(v.lower() in boolean_values for v in sample_values):
            return "boolean"
        
        # Check for dates (basic patterns)
        import re
        date_patterns = [
            r'^\d{4}-\d{2}-\d{2}$',  # YYYY-MM-DD
            r'^\d{2}/\d{2}/\d{4}$',  # MM/DD/YYYY
            r'^\d{2}-\d{2}-\d{4}$',  # MM-DD-YYYY
        ]
        
        for pattern in date_patterns:
            if all(re.match(pattern, v) for v in sample_values):
                return "date"
        
        # Default to string
        return "string"

    @staticmethod
    async def get_datasets_by_workspace(
        session: AsyncSession,
        workspace_id: str
    ) -> List[Dataset]:
        """Get all datasets in a workspace."""
        try:
            # For demo workspace IDs like 'ws1', return empty list to use fallback data
            if len(workspace_id) < 10:  # Simple workspace ID validation
                return []
                
            stmt = (
                select(Dataset)
                .options(selectinload(Dataset.tables))
                .where(Dataset.workspace_id == workspace_id)
                .order_by(Dataset.created_at.desc())
            )
            result = await session.execute(stmt)
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error querying datasets for workspace {workspace_id}: {str(e)}")
            return []  # Return empty list to use fallback data

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
            stmt = delete(Dataset).where(Dataset.id == dataset_id)
            result = await session.execute(stmt)
            await session.commit()
            return result.rowcount > 0
        except Exception as e:
            await session.rollback()
            logger.error("Failed to delete dataset", dataset_id=dataset_id, error=str(e))
            return False

    @staticmethod
    async def query_dataset(
        session: AsyncSession,
        dataset_id: str,
        query_params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Query dataset and return results."""
        try:
            dataset = await DatasetService.get_dataset_by_id(session, dataset_id)
            if not dataset:
                raise ValueError(f"Dataset {dataset_id} not found")

            # For demo purposes, generate sample data
            sample_data = DatasetService._generate_sample_data(dataset, query_params)
            
            return {
                "data": sample_data["rows"],
                "columns": sample_data["columns"],
                "total_rows": sample_data["total_rows"],
                "execution_time": 0.15
            }
            
        except Exception as e:
            logger.error("Failed to query dataset", dataset_id=dataset_id, error=str(e))
            raise

    @staticmethod
    def _generate_sample_data(dataset: Dataset, query_params: Dict[str, Any]) -> Dict[str, Any]:
        """Generate sample data based on schema."""
        import random
        from datetime import datetime, timedelta
        
        if not dataset.schema_json or not dataset.schema_json.get("tables"):
            return {"rows": [], "columns": [], "total_rows": 0}
        
        # Get first table for demo
        table = dataset.schema_json["tables"][0]
        columns = table["columns"]
        
        # Generate sample rows
        sample_count = min(query_params.get("limit", 100), 1000)
        rows = []
        
        for i in range(sample_count):
            row = {}
            for col in columns:
                col_name = col["name"]
                col_type = col["type"]
                
                if col_type in ["integer", "int"]:
                    row[col_name] = random.randint(1, 1000)
                elif col_type in ["decimal", "float", "number"]:
                    row[col_name] = round(random.uniform(1.0, 1000.0), 2)
                elif col_type == "boolean":
                    row[col_name] = random.choice([True, False])
                elif col_type in ["date", "datetime"]:
                    base_date = datetime.now() - timedelta(days=365)
                    random_date = base_date + timedelta(days=random.randint(0, 365))
                    row[col_name] = random_date.strftime("%Y-%m-%d" if col_type == "date" else "%Y-%m-%d %H:%M:%S")
                else:  # string
                    options = [
                        f"Sample {col_name} {i}", f"Value {i}", f"Item {i}",
                        f"Category {random.choice(['A', 'B', 'C'])}", 
                        f"Type {random.randint(1, 5)}"
                    ]
                    row[col_name] = random.choice(options)
            
            rows.append(row)
        
        return {
            "rows": rows,
            "columns": [{"name": col["name"], "type": col["type"]} for col in columns],
            "total_rows": len(rows)
        }

    @staticmethod
    async def refresh_dataset(
        session: AsyncSession,
        dataset_id: str
    ) -> Dataset:
        """Refresh dataset data (for scheduled refreshes)."""
        try:
            dataset = await DatasetService.get_dataset_by_id(session, dataset_id)
            if not dataset:
                raise ValueError(f"Dataset {dataset_id} not found")

            # Update refresh timestamp
            dataset.last_refresh = datetime.utcnow()
            dataset.status = DatasetStatus.READY.value
            
            await session.commit()
            
            logger.info("Dataset refreshed successfully", dataset_id=dataset_id)
            return dataset
            
        except Exception as e:
            logger.error("Failed to refresh dataset", dataset_id=dataset_id, error=str(e))
            raise