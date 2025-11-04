"""
Workspace service for PowerBI Web Replica.
Handles workspace management, permissions, and access control.
"""

from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, and_, or_, func
from sqlalchemy.orm import selectinload
import structlog

from app.models.workspace import Workspace
from app.models.permission import Permission, PermissionRole, PermissionObjectType

logger = structlog.get_logger()


class WorkspaceService:
    """Service class for workspace operations."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def get_workspace_by_id(self, workspace_id: str) -> Optional[Workspace]:
        """Get workspace by ID."""
        try:
            stmt = (
                select(Workspace)
                .options(
                    selectinload(Workspace.datasets),
                    selectinload(Workspace.reports),
                    selectinload(Workspace.dashboards)
                )
                .where(Workspace.id == workspace_id)
            )
            
            result = await self.session.execute(stmt)
            return result.scalar_one_or_none()
            
        except Exception as e:
            logger.error("Failed to get workspace by ID", workspace_id=workspace_id, error=str(e))
            return None
    
    async def create_workspace(
        self,
        name: str,
        owner_id: str,
        description: Optional[str] = None,
        is_public: bool = False,
        allow_external_sharing: bool = False
    ) -> Workspace:
        """Create new workspace."""
        try:
            workspace = Workspace(
                name=name,
                description=description,
                owner_id=owner_id,
                is_public=is_public,
                allow_external_sharing=allow_external_sharing
            )
            
            self.session.add(workspace)
            await self.session.flush()  # This generates the workspace.id
            
            # Create owner permission using the flushed workspace ID
            owner_permission = Permission(
                user_id=owner_id,
                object_type=PermissionObjectType.WORKSPACE,
                object_id=workspace.id,
                workspace_id=workspace.id,
                role=PermissionRole.OWNER,
                granted_by=owner_id
            )
            
            self.session.add(owner_permission)
            await self.session.commit()
            
            # Refresh workspace after commit to get all fields
            await self.session.refresh(workspace)
            
            logger.info("Workspace created", workspace_id=str(workspace.id), name=name)
            return workspace
            
        except Exception as e:
            await self.session.rollback()
            logger.error("Failed to create workspace", error=str(e))
            raise
    
    async def update_workspace(
        self,
        workspace_id: str,
        update_data: Dict[str, Any]
    ) -> Optional[Workspace]:
        """Update workspace."""
        try:
            stmt = (
                update(Workspace)
                .where(Workspace.id == workspace_id)
                .values(**update_data)
                .returning(Workspace)
            )
            
            result = await self.session.execute(stmt)
            await self.session.commit()
            
            updated_workspace = result.scalar_one_or_none()
            if updated_workspace:
                logger.info("Workspace updated", workspace_id=workspace_id)
            
            return updated_workspace
            
        except Exception as e:
            await self.session.rollback()
            logger.error("Failed to update workspace", workspace_id=workspace_id, error=str(e))
            return None
    
    async def delete_workspace(self, workspace_id: str) -> bool:
        """Delete workspace and all associated data."""
        try:
            # First, delete all permissions associated with this workspace
            # This includes both permissions scoped to this workspace AND permissions for this workspace itself
            permissions_stmt = delete(Permission).where(
                or_(
                    Permission.workspace_id == workspace_id,
                    and_(Permission.object_type == PermissionObjectType.WORKSPACE, Permission.object_id == workspace_id)
                )
            )
            await self.session.execute(permissions_stmt)
            
            # Delete workspace
            workspace_stmt = delete(Workspace).where(Workspace.id == workspace_id)
            result = await self.session.execute(workspace_stmt)
            await self.session.commit()
            
            deleted = result.rowcount > 0
            if deleted:
                logger.info("Workspace deleted", workspace_id=workspace_id)
            
            return deleted
            
        except Exception as e:
            await self.session.rollback()
            logger.error("Failed to delete workspace", workspace_id=workspace_id, error=str(e))
            return False
    
    async def list_user_workspaces(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
        search: Optional[str] = None,
        is_admin: bool = False
    ) -> Tuple[List[Workspace], int]:
        """List workspaces accessible to user with pagination."""
        try:
            # Base query with eager loading of relationships
            base_query = (
                select(Workspace)
                .options(
                    selectinload(Workspace.datasets),
                    selectinload(Workspace.reports),
                    selectinload(Workspace.dashboards)
                )
            )
            
            # Admin users can see ALL workspaces, regular users see only accessible ones
            if not is_admin:
                base_query = base_query.where(
                    or_(
                        Workspace.owner_id == user_id,
                        Workspace.id.in_(
                            select(Permission.object_id)
                            .where(
                                and_(
                                    Permission.user_id == user_id,
                                    Permission.object_type == PermissionObjectType.WORKSPACE
                                )
                            )
                        ),
                        Workspace.is_public == True  # Public workspaces
                    )
                )
            
            # Add search filter if provided
            if search:
                base_query = base_query.where(
                    or_(
                        Workspace.name.ilike(f"%{search}%"),
                        Workspace.description.ilike(f"%{search}%")
                    )
                )
            
            # Count total results
            count_query = select(func.count()).select_from(base_query.subquery())
            count_result = await self.session.execute(count_query)
            total = count_result.scalar()
            
            # Apply pagination and execute
            paginated_query = (
                base_query
                .order_by(Workspace.updated_at.desc())
                .limit(limit)
                .offset(offset)
            )
            
            result = await self.session.execute(paginated_query)
            workspaces = result.scalars().all()
            
            return workspaces, total
            
        except Exception as e:
            logger.error("Failed to list user workspaces", user_id=user_id, error=str(e))
            return [], 0
    
    async def get_workspace_with_access_check(
        self,
        workspace_id: str,
        user_id: str,
        require_write: bool = False
    ) -> Optional[Workspace]:
        """Get workspace with access control check."""
        try:
            workspace = await self.get_workspace_by_id(workspace_id)
            if not workspace:
                return None
            
            # Check if user has access
            has_access = await self.check_user_access(
                workspace_id=workspace_id,
                user_id=user_id,
                require_write=require_write
            )
            
            return workspace if has_access else None
            
        except Exception as e:
            logger.error("Failed workspace access check", workspace_id=workspace_id, error=str(e))
            return None
    
    async def check_user_access(
        self,
        workspace_id: str,
        user_id: str,
        require_write: bool = False
    ) -> bool:
        """Check if user has access to workspace."""
        try:
            workspace = await self.get_workspace_by_id(workspace_id)
            if not workspace:
                return False
            
            # Owner always has access
            if str(workspace.owner_id) == str(user_id):
                return True
            
            # Check public workspace (read-only unless owner)
            if workspace.is_public and not require_write:
                return True
            
            # Check explicit permissions
            stmt = (
                select(Permission)
                .where(
                    and_(
                        Permission.user_id == user_id,
                        Permission.object_type == PermissionObjectType.WORKSPACE,
                        Permission.object_id == workspace_id
                    )
                )
            )
            
            result = await self.session.execute(stmt)
            permission = result.scalar_one_or_none()
            
            if not permission:
                return False
            
            # Check if permission level is sufficient
            if require_write:
                return permission.role in [PermissionRole.OWNER, PermissionRole.EDITOR]
            else:
                return permission.role in [
                    PermissionRole.OWNER, 
                    PermissionRole.EDITOR, 
                    PermissionRole.VIEWER
                ]
                
        except Exception as e:
            logger.error("Failed to check user access", workspace_id=workspace_id, user_id=user_id, error=str(e))
            return False
    
    async def add_user_permission(
        self,
        workspace_id: str,
        user_id: str,
        role: PermissionRole,
        granted_by: str
    ) -> bool:
        """Add user permission to workspace."""
        try:
            # Check if permission already exists
            stmt = (
                select(Permission)
                .where(
                    and_(
                        Permission.user_id == user_id,
                        Permission.object_type == PermissionObjectType.WORKSPACE,
                        Permission.object_id == workspace_id
                    )
                )
            )
            
            result = await self.session.execute(stmt)
            existing_permission = result.scalar_one_or_none()
            
            if existing_permission:
                # Update existing permission
                existing_permission.role = role
                existing_permission.granted_by = granted_by
            else:
                # Create new permission
                permission = Permission(
                    user_id=user_id,
                    object_type=PermissionObjectType.WORKSPACE,
                    object_id=workspace_id,
                    workspace_id=workspace_id,
                    role=role,
                    granted_by=granted_by
                )
                self.session.add(permission)
            
            await self.session.commit()
            logger.info("User permission added", workspace_id=workspace_id, user_id=user_id, role=role.value)
            return True
            
        except Exception as e:
            await self.session.rollback()
            logger.error("Failed to add user permission", error=str(e))
            return False
    
    async def remove_user_permission(self, workspace_id: str, user_id: str) -> bool:
        """Remove user permission from workspace."""
        try:
            stmt = (
                delete(Permission)
                .where(
                    and_(
                        Permission.user_id == user_id,
                        Permission.object_type == PermissionObjectType.WORKSPACE,
                        Permission.object_id == workspace_id
                    )
                )
            )
            
            result = await self.session.execute(stmt)
            await self.session.commit()
            
            removed = result.rowcount > 0
            if removed:
                logger.info("User permission removed", workspace_id=workspace_id, user_id=user_id)
            
            return removed
            
        except Exception as e:
            await self.session.rollback()
            logger.error("Failed to remove user permission", error=str(e))
            return False