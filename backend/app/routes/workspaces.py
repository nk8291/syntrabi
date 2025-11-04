"""
Workspace routes for PowerBI Web Replica.
Handles workspace management, permissions, and organization.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.core.database import get_async_session
from app.routes.auth import get_current_user
from app.models.user import User
from app.models.workspace import Workspace
from app.services.workspace_service import WorkspaceService

logger = structlog.get_logger()
router = APIRouter()


# Request/Response Models
class CreateWorkspaceRequest(BaseModel):
    """Create workspace request model."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    is_public: bool = False
    allow_external_sharing: bool = False


class UpdateWorkspaceRequest(BaseModel):
    """Update workspace request model."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    is_public: Optional[bool] = None
    allow_external_sharing: Optional[bool] = None


class WorkspaceResponse(BaseModel):
    """Workspace response model."""
    id: str
    name: str
    description: Optional[str]
    owner_id: str
    is_public: bool
    allow_external_sharing: bool
    created_at: Optional[str]
    updated_at: Optional[str]
    datasets_count: int = 0
    reports_count: int = 0
    dashboards_count: int = 0


class WorkspaceListResponse(BaseModel):
    """Workspace list response model."""
    workspaces: List[WorkspaceResponse]
    total: int
    limit: int
    offset: int


# Workspace Routes
@router.get("", response_model=WorkspaceListResponse)
async def list_workspaces(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: Optional[str] = Query(None, max_length=255),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """List user's workspaces with pagination and search."""
    try:
        workspace_service = WorkspaceService(session)
        
        # Get workspaces - admins see all, regular users see only accessible ones
        workspaces, total = await workspace_service.list_user_workspaces(
            user_id=str(current_user.id),
            limit=limit,
            offset=offset,
            search=search,
            is_admin=current_user.is_admin
        )
        
        workspace_list = [WorkspaceResponse(**ws.to_dict()) for ws in workspaces]
        
        return WorkspaceListResponse(
            workspaces=workspace_list,
            total=total,
            limit=limit,
            offset=offset
        )
        
    except Exception as e:
        logger.error("Failed to list workspaces", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve workspaces"
        )


@router.post("", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    workspace_data: CreateWorkspaceRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Create new workspace."""
    try:
        workspace_service = WorkspaceService(session)
        
        workspace = await workspace_service.create_workspace(
            name=workspace_data.name,
            description=workspace_data.description,
            owner_id=str(current_user.id),
            is_public=workspace_data.is_public,
            allow_external_sharing=workspace_data.allow_external_sharing
        )
        
        logger.info("Workspace created", workspace_id=str(workspace.id), name=workspace.name)
        return WorkspaceResponse(**workspace.to_dict())
        
    except Exception as e:
        logger.error("Failed to create workspace", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create workspace"
        )


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get workspace by ID."""
    try:
        workspace_service = WorkspaceService(session)
        
        # Check if user has access to workspace
        workspace = await workspace_service.get_workspace_with_access_check(
            workspace_id=workspace_id,
            user_id=str(current_user.id)
        )
        
        if not workspace:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workspace not found"
            )
        
        return WorkspaceResponse(**workspace.to_dict())
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get workspace", workspace_id=workspace_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve workspace"
        )


@router.put("/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace(
    workspace_id: str,
    workspace_data: UpdateWorkspaceRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Update workspace."""
    try:
        workspace_service = WorkspaceService(session)
        
        # Check if user has write access to workspace
        workspace = await workspace_service.get_workspace_with_access_check(
            workspace_id=workspace_id,
            user_id=str(current_user.id),
            require_write=True
        )
        
        if not workspace:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workspace not found"
            )
        
        # Prepare update data (only include non-None values)
        update_data = {
            k: v for k, v in workspace_data.dict().items() 
            if v is not None
        }
        
        if not update_data:
            # No changes to make
            return WorkspaceResponse(**workspace.to_dict())
        
        updated_workspace = await workspace_service.update_workspace(
            workspace_id=workspace_id,
            update_data=update_data
        )
        
        if not updated_workspace:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update workspace"
            )
        
        logger.info("Workspace updated", workspace_id=workspace_id)
        return WorkspaceResponse(**updated_workspace.to_dict())
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to update workspace", workspace_id=workspace_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update workspace"
        )


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Delete workspace."""
    try:
        workspace_service = WorkspaceService(session)
        
        # Check if user owns the workspace
        workspace = await workspace_service.get_workspace_by_id(workspace_id)
        
        if not workspace:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workspace not found"
            )
        
        if str(workspace.owner_id) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only workspace owner can delete workspace"
            )
        
        success = await workspace_service.delete_workspace(workspace_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete workspace"
            )
        
        logger.info("Workspace deleted", workspace_id=workspace_id)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to delete workspace", workspace_id=workspace_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete workspace"
        )