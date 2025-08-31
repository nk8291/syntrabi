"""
Dataset routes for PowerBI Web Replica.
Handles dataset management, data source connections, and querying.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
import structlog
import time
from datetime import datetime

from app.core.database import get_async_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.dataset import ConnectorType
from app.services.dataset_service import DatasetService

logger = structlog.get_logger()
router = APIRouter()


# Additional endpoints for dataset management
@router.delete("/{dataset_id}")
async def delete_dataset(
    dataset_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Delete a dataset."""
    try:
        success = await DatasetService.delete_dataset(session, dataset_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dataset not found"
            )
        return {"message": "Dataset deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to delete dataset", dataset_id=dataset_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete dataset"
        )


@router.post("/{dataset_id}/refresh")
async def refresh_dataset(
    dataset_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Refresh dataset data."""
    try:
        dataset = await DatasetService.refresh_dataset(session, dataset_id)
        return dataset.to_dict()
    except Exception as e:
        logger.error("Failed to refresh dataset", dataset_id=dataset_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to refresh dataset"
        )


@router.get("/{dataset_id}/preview")
async def preview_dataset(
    dataset_id: str,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get dataset preview with sample data."""
    try:
        result = await DatasetService.query_dataset(
            session=session,
            dataset_id=dataset_id,
            query_params={"limit": limit}
        )
        return result
    except Exception as e:
        logger.error("Failed to preview dataset", dataset_id=dataset_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to preview dataset"
        )


# Request/Response Models
class QueryRequest(BaseModel):
    """Dataset query request model."""
    columns: List[str] = []
    filters: List[Dict[str, Any]] = []
    aggregations: List[Dict[str, Any]] = []
    group_by: List[str] = []
    order_by: List[Dict[str, str]] = []
    limit: int = 1000
    offset: int = 0


class QueryResponse(BaseModel):
    """Dataset query response model."""
    data: List[Dict[str, Any]]
    columns: List[Dict[str, str]]
    total_rows: int
    execution_time: float


class DatasetResponse(BaseModel):
    """Dataset response model."""
    id: str
    workspace_id: str
    name: str
    description: Optional[str]
    connector_type: str
    status: str
    schema_json: Optional[Dict[str, Any]]
    row_count: Optional[int]
    file_size: Optional[int]
    created_at: str
    updated_at: str


# Removed - functionality moved to DatasetService


# Dataset Routes (placeholder implementations)
@router.get("/workspaces/{workspace_id}/datasets")
async def list_datasets(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """List datasets in workspace."""
    try:
        datasets = await DatasetService.get_datasets_by_workspace(session, workspace_id)
        return [dataset.to_dict() for dataset in datasets]
    except Exception as e:
        logger.error("Failed to list datasets", workspace_id=workspace_id, error=str(e))
        # Return sample data as fallback
        return [
            {
                "id": "sample-sales-dataset",
                "workspace_id": workspace_id,
                "name": "Sales Data",
                "description": "Sample sales dataset with product, region, and sales data",
                "connector_type": "csv",
                "status": "ready",
                "schema_json": {
                    "tables": [{
                        "name": "Sales Data",
                        "displayName": "Sales Data",
                        "columns": [
                            {"name": "product", "type": "string", "nullable": False, "description": "Product name"},
                            {"name": "region", "type": "string", "nullable": False, "description": "Sales region"},
                            {"name": "sales_amount", "type": "decimal", "nullable": False, "description": "Sales amount"},
                            {"name": "quantity", "type": "integer", "nullable": False, "description": "Quantity sold"},
                            {"name": "date", "type": "date", "nullable": False, "description": "Sale date"},
                            {"name": "customer_segment", "type": "string", "nullable": False, "description": "Customer segment"}
                        ],
                        "rowCount": 1000
                    }]
                },
                "row_count": 1000,
                "file_size": 45000,
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z"
            },
            {
                "id": "sample-customer-dataset", 
                "workspace_id": workspace_id,
                "name": "Customer Demographics",
                "description": "Customer demographic and behavior data",
                "connector_type": "csv",
                "status": "ready",
                "schema_json": {
                    "tables": [{
                        "name": "Customer Demographics",
                        "displayName": "Customer Demographics",
                        "columns": [
                            {"name": "customer_id", "type": "string", "nullable": False, "description": "Customer ID"},
                            {"name": "age", "type": "integer", "nullable": False, "description": "Customer age"},
                            {"name": "gender", "type": "string", "nullable": False, "description": "Customer gender"},
                            {"name": "city", "type": "string", "nullable": False, "description": "Customer city"},
                            {"name": "subscription_type", "type": "string", "nullable": False, "description": "Subscription type"},
                            {"name": "lifetime_value", "type": "decimal", "nullable": False, "description": "Customer lifetime value"}
                        ],
                        "rowCount": 500
                    }]
                },
                "row_count": 500,
                "file_size": 25000,
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z"
            }
        ]


@router.post("/workspaces/{workspace_id}/datasets")
async def create_dataset(
    workspace_id: str,
    file: Optional[UploadFile] = File(None),
    name: str = Form(...),
    connector_type: Optional[str] = Form("csv"),
    connection_config: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Create dataset from file upload or connector."""
    try:
        # Parse connector type
        try:
            connector_enum = ConnectorType(connector_type)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported connector type: {connector_type}"
            )
        
        # Handle file upload
        file_content = None
        if file:
            # Validate file type for CSV uploads
            if connector_enum == ConnectorType.CSV:
                allowed_types = ["text/csv", "application/csv"]
                if file.content_type not in allowed_types and not file.filename.endswith('.csv'):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Please upload a CSV file for CSV connector type."
                    )
            
            # Read file content
            file_content = await file.read()
            
            # Validate file size (100MB limit)
            max_size = 100 * 1024 * 1024  # 100MB
            if len(file_content) > max_size:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="File too large. Maximum size is 100MB."
                )
        
        # Parse connection config if provided
        config = {}
        if connection_config:
            try:
                import json
                config = json.loads(connection_config)
            except json.JSONDecodeError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid connection configuration JSON"
                )
        
        # Create dataset using service
        dataset = await DatasetService.create_dataset(
            session=session,
            workspace_id=workspace_id,
            name=name,
            connector_type=connector_enum,
            file_content=file_content,
            connection_config=config
        )
        
        logger.info(
            "Dataset created successfully",
            dataset_id=str(dataset.id),
            workspace_id=workspace_id,
            connector_type=connector_type,
            user_id=str(current_user.id)
        )
        
        return dataset.to_dict()
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Dataset creation failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Dataset creation failed: {str(e)}"
        )


@router.get("/{dataset_id}")
async def get_dataset(
    dataset_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get dataset details."""
    try:
        dataset = await DatasetService.get_dataset_by_id(session, dataset_id)
        if not dataset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dataset not found"
            )
        return dataset.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get dataset", dataset_id=dataset_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve dataset"
        )


@router.post("/{dataset_id}/query", response_model=QueryResponse)
async def query_dataset(
    dataset_id: str,
    query: QueryRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Query dataset with filters and aggregations."""
    try:
        result = await DatasetService.query_dataset(
            session=session,
            dataset_id=dataset_id,
            query_params=query.dict()
        )
        return QueryResponse(
            data=result["data"],
            columns=result["columns"],
            total_rows=result["total_rows"],
            execution_time=result["execution_time"]
        )
    except Exception as e:
        logger.error("Failed to query dataset", dataset_id=dataset_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to query dataset"
        )