"""
Dataset routes for PowerBI Web Replica.
Handles dataset management with proper table selection and data import.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Body
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update, select
import structlog
import time
from datetime import datetime
from uuid import UUID

from app.core.database import get_async_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.dataset import ConnectorType
from app.models.workspace import Workspace
from app.services.dataset_service import DatasetService
from app.services.data_connectors import DataSourceManager, DataConnectorFactory

logger = structlog.get_logger()
router = APIRouter()


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class TableSelectionRequest(BaseModel):
    """Request model for table selection."""
    connector_type: str
    config: Dict[str, Any]


class TableInfo(BaseModel):
    """Table information for selection."""
    schema: str
    name: str
    display_name: str
    row_count: int
    columns: List[Dict[str, Any]]


class TableSelectionResponse(BaseModel):
    """Response model for table listing."""
    tables: List[TableInfo]
    total_count: int


class CreateDatasetRequest(BaseModel):
    """Request model for dataset creation with table selection."""
    name: str
    description: Optional[str] = None
    connector_type: str
    connection_config: Dict[str, Any]
    selected_tables: List[str]  # List of fully qualified table names (schema.table)
    import_data: bool = True  # Whether to import actual data or just schema


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


# ============================================================================
# NEW TABLE SELECTION ENDPOINT
# ============================================================================

@router.post("/connectors/tables", response_model=TableSelectionResponse)
async def get_available_tables(
    request: TableSelectionRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Get list of available tables from a database connection for user selection.
    This is Step 2 in the new dataset creation flow.
    """
    try:
        # Convert string to enum
        try:
            connector_enum = ConnectorType(request.connector_type)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported connector type: {request.connector_type}"
            )

        # Only database connectors have tables
        if connector_enum not in [
            ConnectorType.POSTGRESQL, 
            ConnectorType.MYSQL, 
            ConnectorType.MARIADB
        ]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Table listing only supported for database connectors"
            )

        # Get schema from data source
        result = await DataSourceManager.get_data_source_schema(
            connector_enum, 
            request.config
        )

        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("error", "Failed to retrieve tables")
            )

        schema_data = result.get("schema", {})
        tables = schema_data.get("tables", [])

        # Transform to response format
        table_list = []
        for table in tables:
            table_list.append(TableInfo(
                schema=table.get("schema", "public"),
                name=table["name"],
                display_name=table["name"].replace("_", " ").title(),
                row_count=table.get("row_count", 0),
                columns=table.get("columns", [])
            ))

        logger.info(
            "Tables retrieved for selection",
            connector_type=request.connector_type,
            table_count=len(table_list),
            user_id=str(current_user.id)
        )

        return TableSelectionResponse(
            tables=table_list,
            total_count=len(table_list)
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to retrieve tables", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve tables: {str(e)}"
        )


# ============================================================================
# UPDATED DATASET CREATION ENDPOINT
# ============================================================================

@router.post("/workspaces/{workspace_id}/datasets")
async def create_dataset(
    workspace_id: str,
    request: CreateDatasetRequest = Body(...),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """
    Create dataset with selected tables and import data.
    This is Step 3 in the new dataset creation flow.
    
    Flow:
    1. Validate workspace exists
    2. Create dataset record
    3. Import selected tables (schema + data)
    4. Store everything in our database
    """
    try:
        # Ensure workspace exists
        stmt = select(Workspace).where(Workspace.id == workspace_id)
        result = await session.execute(stmt)
        workspace = result.scalar_one_or_none()

        if not workspace:
            logger.info(f"Workspace {workspace_id} not found, creating default workspace")
            try:
                workspace_uuid = UUID(workspace_id) if isinstance(workspace_id, str) else workspace_id
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid workspace ID format: {workspace_id}"
                )

            workspace = Workspace(
                id=workspace_uuid,
                name="My Workspace",
                description="Default workspace",
                owner_id=current_user.id,
                is_public=False
            )
            session.add(workspace)
            await session.flush()
            logger.info(f"Created default workspace {workspace_id}")

        # Parse connector type
        try:
            connector_enum = ConnectorType(request.connector_type.lower())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported connector type: {request.connector_type}"
            )

        # Validate selected tables
        if not request.selected_tables or len(request.selected_tables) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one table must be selected"
            )

        # Create dataset using service with table selection
        dataset = await DatasetService.create_dataset_with_import(
            session=session,
            workspace_id=workspace_id,
            name=request.name,
            description=request.description,
            connector_type=connector_enum,
            connection_config=request.connection_config,
            selected_tables=request.selected_tables,
            import_data=request.import_data
        )
        
        logger.info(
            "Dataset created successfully with table import",
            dataset_id=str(dataset.id),
            workspace_id=workspace_id,
            connector_type=request.connector_type,
            selected_tables=len(request.selected_tables),
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


# ============================================================================
# FILE UPLOAD ENDPOINT (Separate from database connectors)
# ============================================================================

@router.post("/workspaces/{workspace_id}/datasets/upload")
async def upload_dataset_file(
    workspace_id: str,
    file: UploadFile = File(...),
    name: str = Form(...),
    description: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """
    Upload a file-based dataset (CSV, Excel, JSON, PDF).
    This is a separate flow from database connectors.
    """
    try:
        # Determine connector type from file extension
        filename = file.filename.lower()
        if filename.endswith('.csv'):
            connector_type = ConnectorType.CSV
        elif filename.endswith(('.xlsx', '.xls')):
            connector_type = ConnectorType.EXCEL
        elif filename.endswith('.json'):
            connector_type = ConnectorType.JSON
        elif filename.endswith('.pdf'):
            connector_type = ConnectorType.PDF
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported file type. Supported: CSV, Excel, JSON, PDF"
            )

        # Read file content
        file_content = await file.read()
        
        # Validate file size (100MB limit)
        max_size = 100 * 1024 * 1024
        if len(file_content) > max_size:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="File too large. Maximum size is 100MB."
            )

        # Ensure workspace exists
        stmt = select(Workspace).where(Workspace.id == workspace_id)
        result = await session.execute(stmt)
        workspace = result.scalar_one_or_none()

        if not workspace:
            workspace_uuid = UUID(workspace_id)
            workspace = Workspace(
                id=workspace_uuid,
                name="My Workspace",
                description="Default workspace",
                owner_id=current_user.id,
                is_public=False
            )
            session.add(workspace)
            await session.flush()

        # Create dataset from file
        dataset = await DatasetService.create_dataset(
            session=session,
            workspace_id=workspace_id,
            name=name,
            description=description,
            connector_type=connector_type,
            file_content=file_content,
            connection_config={}
        )

        logger.info(
            "File dataset uploaded successfully",
            dataset_id=str(dataset.id),
            connector_type=connector_type.value,
            file_size=len(file_content)
        )

        return dataset.to_dict()

    except HTTPException:
        raise
    except Exception as e:
        logger.error("File upload failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"File upload failed: {str(e)}"
        )


# ============================================================================
# EXISTING ENDPOINTS (Kept for compatibility)
# ============================================================================

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
        return []


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


# ============================================================================
# CONNECTOR UTILITY ENDPOINTS
# ============================================================================

@router.get("/connectors/types")
async def get_supported_connector_types():
    """Get list of supported data source connector types."""
    try:
        supported_types = DataConnectorFactory.get_supported_types()
        connectors_info = []
        
        for connector_type in supported_types:
            requirements = DataConnectorFactory.get_connector_requirements(connector_type)
            connectors_info.append({
                "type": connector_type.value,
                "name": connector_type.value.replace('_', ' ').title(),
                "description": requirements.get("description", ""),
                "required_fields": requirements.get("required", []),
                "optional_fields": requirements.get("optional", [])
            })
        
        return {
            "connectors": connectors_info,
            "total_count": len(connectors_info)
        }
    except Exception as e:
        logger.error("Failed to get connector types", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve connector types"
        )


@router.post("/connectors/test")
async def test_data_source_connection(
    request: Dict[str, Any] = Body(...),
    current_user: User = Depends(get_current_user)
):
    """Test connection to a data source."""
    try:
        connector_type = request.get("connector_type")
        config = request.get("config")

        if not connector_type or not config:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="connector_type and config are required"
            )

        try:
            connector_enum = ConnectorType(connector_type)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported connector type: {connector_type}"
            )

        result = await DataSourceManager.test_data_source(connector_enum, config)

        if result["success"]:
            logger.info(
                "Data source connection test successful",
                connector_type=connector_type,
                user_id=str(current_user.id)
            )
        else:
            logger.warning(
                "Data source connection test failed",
                connector_type=connector_type,
                message=result["message"],
                user_id=str(current_user.id)
            )

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Connection test error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Connection test failed: {str(e)}"
        )