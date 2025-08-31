"""
User model for PowerBI Web Replica.
Defines user accounts, authentication, and profile information.
"""

from sqlalchemy import Column, String, Boolean, DateTime, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.core.database import Base


class User(Base):
    """User account model."""
    
    __tablename__ = "users"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Authentication fields
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    
    # Profile fields
    name = Column(String(255), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    timezone = Column(String(50), default="UTC", nullable=False)
    locale = Column(String(10), default="en", nullable=False)
    
    # OAuth fields
    oauth_provider = Column(String(50), nullable=True)  # google, microsoft, etc.
    oauth_id = Column(String(255), nullable=True)
    oauth_data = Column(JSON, nullable=True)
    
    # Preferences
    preferences = Column(JSON, default=dict, nullable=False)
    
    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    last_login = Column(DateTime(timezone=True), nullable=True)
    last_seen = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    owned_workspaces = relationship("Workspace", back_populates="owner", cascade="all, delete-orphan")
    workspace_permissions = relationship("Permission", back_populates="user", foreign_keys="Permission.user_id", cascade="all, delete-orphan")
    granted_permissions = relationship("Permission", foreign_keys="Permission.granted_by")
    reports = relationship("Report", back_populates="owner")
    dashboards = relationship("Dashboard", back_populates="owner")
    
    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, name={self.name})>"
    
    def to_dict(self):
        """Convert user to dictionary for API responses."""
        return {
            "id": str(self.id),
            "email": self.email,
            "name": self.name,
            "avatar_url": self.avatar_url,
            "timezone": self.timezone,
            "locale": self.locale,
            "is_active": self.is_active,
            "is_verified": self.is_verified,
            "is_admin": self.is_admin,
            "preferences": self.preferences,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_login": self.last_login.isoformat() if self.last_login else None,
        }
    
    def to_public_dict(self):
        """Convert user to public dictionary (excludes sensitive data)."""
        return {
            "id": str(self.id),
            "name": self.name,
            "avatar_url": self.avatar_url,
        }