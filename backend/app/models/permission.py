"""
Permission and access control models for PowerBI Web Replica.
Defines role-based and object-level permissions.
"""

from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum, UniqueConstraint, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from app.core.database import Base


class PermissionRole(enum.Enum):
    """Permission roles for workspace and resource access."""
    OWNER = "owner"
    EDITOR = "editor" 
    VIEWER = "viewer"
    CONTRIBUTOR = "contributor"


class PermissionObjectType(enum.Enum):
    """Types of objects that can have permissions."""
    WORKSPACE = "workspace"
    DATASET = "dataset"
    REPORT = "report"
    DASHBOARD = "dashboard"


class Permission(Base):
    """Permission model for role-based access control."""
    
    __tablename__ = "permissions"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Subject (who has the permission)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # Object (what the permission is for)
    object_type = Column(SQLEnum(PermissionObjectType, name='permission_object_type', values_callable=lambda obj: [e.value for e in obj]), nullable=False, index=True)
    object_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Permission level
    role = Column(SQLEnum(PermissionRole, name='permission_role', values_callable=lambda obj: [e.value for e in obj]), nullable=False)
    
    # Workspace context (permissions are scoped to workspaces)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=True, index=True)
    
    # Grant information
    granted_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    granted_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Expiration (optional)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="workspace_permissions", foreign_keys=[user_id])
    grantor = relationship("User", foreign_keys=[granted_by], overlaps="granted_permissions")
    workspace = relationship("Workspace", back_populates="permissions")
    
    # Unique constraint to prevent duplicate permissions
    __table_args__ = (
        UniqueConstraint('user_id', 'object_type', 'object_id', name='_user_object_permission_uc'),
    )
    
    def __repr__(self):
        return f"<Permission(user_id={self.user_id}, object_type={self.object_type}, object_id={self.object_id}, role={self.role})>"
    
    def to_dict(self):
        """Convert permission to dictionary for API responses."""
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "object_type": self.object_type.value if self.object_type else None,
            "object_id": str(self.object_id),
            "role": self.role.value if self.role else None,
            "workspace_id": str(self.workspace_id) if self.workspace_id else None,
            "granted_by": str(self.granted_by) if self.granted_by else None,
            "granted_at": self.granted_at.isoformat() if self.granted_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class DataModel(Base):
    """Data model definition for relationships, measures, and calculated fields."""
    
    __tablename__ = "data_models"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Basic fields
    name = Column(String(255), nullable=False, index=True)
    description = Column(String(1000), nullable=True)
    
    # Relationships
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False)
    
    # Model definition
    definition_json = Column(JSON, nullable=False)  # Model structure, relationships, measures
    
    # Version tracking
    version = Column(String, default="1", nullable=False)
    
    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    workspace = relationship("Workspace", back_populates="models")
    
    def __repr__(self):
        return f"<DataModel(id={self.id}, name={self.name}, workspace_id={self.workspace_id})>"
    
    def to_dict(self):
        """Convert data model to dictionary for API responses."""
        return {
            "id": str(self.id),
            "workspace_id": str(self.workspace_id),
            "name": self.name,
            "description": self.description,
            "definition_json": self.definition_json,
            "version": self.version,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }