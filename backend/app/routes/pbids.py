"""
PBIDS routes for PowerBI Web Replica.
Handles PBIDS file operations, templates, and data source connections.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
import structlog
import tempfile
import os

from app.core.database import get_async_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.pbids import PBIDS, PBIDSTemplate, ConnectionType, AuthenticationKind, PrivacyLevel
from app.services.pbids_service import PBIDSService, PBIDSBuilderService

logger = structlog.get_logger()
router = APIRouter()


# Request/Response Models
class CreatePBIDSRequest(BaseModel):
    """Create PBIDS request model."""
    name: str
    description: Optional[str] = None
    connection_type: str
    connections: List[Dict[str, Any]]
    is_template: bool = False
    tags: List[str] = []


class UpdatePBIDSRequest(BaseModel):
    """Update PBIDS request model."""
    name: Optional[str] = None
    description: Optional[str] = None
    connections: Optional[List[Dict[str, Any]]] = None
    is_template: Optional[bool] = None
    tags: Optional[List[str]] = None


class PBIDSFromTemplateRequest(BaseModel):
    """Create PBIDS from template request model."""
    template_id: str
    name: str
    parameters: Dict[str, Any]


class PBIDSResponse(BaseModel):
    """PBIDS response model."""
    id: str
    workspace_id: str
    name: str
    description: Optional[str]
    connection_type: str
    connections: List[Dict[str, Any]]
    is_template: bool
    is_shared: bool
    tags: List[str]
    usage_count: int
    last_used: Optional[str]
    created_at: str
    updated_at: str


class PBIDSTemplateResponse(BaseModel):
    """PBIDS template response model."""
    id: str
    name: str
    description: Optional[str]
    category: str
    connection_type: str
    template_config: Dict[str, Any]
    default_values: Optional[Dict[str, Any]]
    ui_config: Optional[Dict[str, Any]]
    is_popular: bool
    is_premium: bool


# PBIDS Management Routes
@router.post("/workspaces/{workspace_id}/pbids", response_model=PBIDSResponse)
async def create_pbids(
    workspace_id: str,
    request: CreatePBIDSRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Create a new PBIDS file."""
    try:
        # Validate connection type
        try:
            connection_type_enum = ConnectionType(request.connection_type)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid connection type: {request.connection_type}"
            )
        
        pbids = await PBIDSService.create_pbids(
            session=session,
            workspace_id=workspace_id,
            user_id=str(current_user.id),
            name=request.name,
            connection_type=connection_type_enum,
            connections=request.connections,
            description=request.description,
            is_template=request.is_template,
            tags=request.tags
        )
        
        logger.info(
            "PBIDS created successfully",
            pbids_id=str(pbids.id),
            workspace_id=workspace_id,
            user_id=str(current_user.id)
        )
        
        return PBIDSResponse(**pbids.to_dict())
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to create PBIDS", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create PBIDS file"
        )


@router.get("/workspaces/{workspace_id}/pbids", response_model=List[PBIDSResponse])
async def list_pbids(
    workspace_id: str,
    include_templates: bool = True,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """List PBIDS files in workspace."""
    try:
        pbids_files = await PBIDSService.get_pbids_by_workspace(
            session, workspace_id, include_templates
        )
        return [PBIDSResponse(**pbids.to_dict()) for pbids in pbids_files]
        
    except Exception as e:
        logger.error("Failed to list PBIDS", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list PBIDS files"
        )


@router.get("/pbids/{pbids_id}", response_model=PBIDSResponse)
async def get_pbids(
    pbids_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get PBIDS file by ID."""
    try:
        pbids = await PBIDSService.get_pbids_by_id(session, pbids_id)
        if not pbids:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="PBIDS file not found"
            )
        
        return PBIDSResponse(**pbids.to_dict())
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get PBIDS", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve PBIDS file"
        )


@router.put("/pbids/{pbids_id}", response_model=PBIDSResponse)
async def update_pbids(
    pbids_id: str,
    request: UpdatePBIDSRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Update PBIDS file."""
    try:
        # Filter out None values
        updates = {k: v for k, v in request.dict().items() if v is not None}
        
        pbids = await PBIDSService.update_pbids(session, pbids_id, updates)
        if not pbids:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="PBIDS file not found"
            )
        
        return PBIDSResponse(**pbids.to_dict())
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to update PBIDS", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update PBIDS file"
        )


@router.delete("/pbids/{pbids_id}")
async def delete_pbids(
    pbids_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Delete PBIDS file."""
    try:
        success = await PBIDSService.delete_pbids(session, pbids_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="PBIDS file not found"
            )
        
        return {"message": "PBIDS file deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to delete PBIDS", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete PBIDS file"
        )


@router.post("/pbids/{pbids_id}/use")
async def use_pbids(
    pbids_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Mark PBIDS as used (increment usage count)."""
    try:
        success = await PBIDSService.increment_pbids_usage(session, pbids_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="PBIDS file not found"
            )
        
        return {"message": "PBIDS usage recorded"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to record PBIDS usage", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record PBIDS usage"
        )


# File Import/Export Routes
@router.get("/pbids/{pbids_id}/export")
async def export_pbids(
    pbids_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Export PBIDS as downloadable .pbids file."""
    try:
        pbids = await PBIDSService.get_pbids_by_id(session, pbids_id)
        if not pbids:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="PBIDS file not found"
            )
        
        # Generate .pbids file content
        file_content = await PBIDSService.export_pbids_file(session, pbids_id)
        if not file_content:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate PBIDS file"
            )
        
        # Create temporary file
        temp_file = tempfile.NamedTemporaryFile(
            delete=False,
            suffix='.pbids',
            prefix=f'{pbids.name}_'
        )
        temp_file.write(file_content)
        temp_file.close()
        
        # Record usage
        await PBIDSService.increment_pbids_usage(session, pbids_id)
        
        return FileResponse(
            temp_file.name,
            media_type='application/json',
            filename=f"{pbids.name}.pbids",
            background=None  # File will be cleaned up manually
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to export PBIDS", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to export PBIDS file"
        )


@router.post("/workspaces/{workspace_id}/pbids/import", response_model=PBIDSResponse)
async def import_pbids(
    workspace_id: str,
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Import PBIDS from uploaded .pbids file."""
    try:
        # Validate file type
        if not file.filename or not file.filename.endswith('.pbids'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please upload a .pbids file"
            )
        
        # Read file content
        file_content = await file.read()
        
        pbids = await PBIDSService.import_pbids_file(
            session=session,
            workspace_id=workspace_id,
            user_id=str(current_user.id),
            file_content=file_content,
            name=name or file.filename.replace('.pbids', '')
        )
        
        return PBIDSResponse(**pbids.to_dict())
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to import PBIDS", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to import PBIDS file"
        )


# Template Routes
@router.get("/pbids/templates/popular", response_model=List[PBIDSTemplateResponse])
async def get_popular_templates(
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get popular PBIDS templates."""
    try:
        templates = await PBIDSService.get_popular_templates(session, limit)
        return [PBIDSTemplateResponse(**template.to_dict()) for template in templates]
        
    except Exception as e:
        logger.error("Failed to get popular templates", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve templates"
        )


@router.get("/pbids/templates/category/{category}", response_model=List[PBIDSTemplateResponse])
async def get_templates_by_category(
    category: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get PBIDS templates by category."""
    try:
        templates = await PBIDSService.get_templates_by_category(session, category)
        return [PBIDSTemplateResponse(**template.to_dict()) for template in templates]
        
    except Exception as e:
        logger.error("Failed to get templates by category", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve templates"
        )


@router.post("/workspaces/{workspace_id}/pbids/from-template", response_model=PBIDSResponse)
async def create_pbids_from_template(
    workspace_id: str,
    request: PBIDSFromTemplateRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Create PBIDS from template."""
    try:
        pbids = await PBIDSService.create_pbids_from_template(
            session=session,
            template_id=request.template_id,
            workspace_id=workspace_id,
            user_id=str(current_user.id),
            name=request.name,
            parameters=request.parameters
        )
        
        return PBIDSResponse(**pbids.to_dict())
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to create PBIDS from template", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create PBIDS from template"
        )


# Connection Builder Routes
@router.get("/pbids/connection-schema/{connection_type}")
async def get_connection_schema(
    connection_type: str,
    current_user: User = Depends(get_current_user)
):
    """Get connection schema for a specific connection type."""
    try:
        connection_type_enum = ConnectionType(connection_type)
        schema = PBIDSBuilderService.get_connection_schema(connection_type_enum)
        return schema
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid connection type: {connection_type}"
        )
    except Exception as e:
        logger.error("Failed to get connection schema", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve connection schema"
        )


@router.post("/pbids/validate-connection")
async def validate_connection_config(
    connection_type: str,
    config: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """Validate connection configuration."""
    try:
        connection_type_enum = ConnectionType(connection_type)
        errors = PBIDSBuilderService.validate_connection_config(
            connection_type_enum, config
        )
        
        return {
            "is_valid": len(errors) == 0,
            "errors": errors
        }
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid connection type: {connection_type}"
        )
    except Exception as e:
        logger.error("Failed to validate connection config", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to validate connection configuration"
        )


# Search Routes
@router.get("/workspaces/{workspace_id}/pbids/search", response_model=List[PBIDSResponse])
async def search_pbids(
    workspace_id: str,
    q: str = "",
    connection_types: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Search PBIDS files."""
    try:
        # Parse connection types
        connection_type_enums = []
        if connection_types:
            for ct in connection_types.split(','):
                try:
                    connection_type_enums.append(ConnectionType(ct.strip()))
                except ValueError:
                    continue  # Skip invalid connection types
        
        pbids_files = await PBIDSService.search_pbids(
            session=session,
            workspace_id=workspace_id,
            query=q,
            connection_types=connection_type_enums if connection_type_enums else None
        )
        
        return [PBIDSResponse(**pbids.to_dict()) for pbids in pbids_files]
        
    except Exception as e:
        logger.error("Failed to search PBIDS", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to search PBIDS files"
        )