"""
Report and Dashboard models for PowerBI Web Replica.
Defines report definitions, dashboard layouts, and visualization configurations.
"""

from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Integer, JSON, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.core.database import Base


class Report(Base):
    """Report model for visualization definitions."""
    
    __tablename__ = "reports"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Basic fields
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    
    # Relationships
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    dataset_id = Column(UUID(as_uuid=True), ForeignKey("datasets.id"), nullable=True)
    
    # Report definition
    report_json = Column(JSON, nullable=False)  # Complete report definition
    version = Column(Integer, default=1, nullable=False)
    
    # Publishing and sharing
    is_published = Column(Boolean, default=False, nullable=False)
    is_public = Column(Boolean, default=False, nullable=False)
    allow_embedding = Column(Boolean, default=False, nullable=False)
    
    # Snapshots and exports
    thumbnail_url = Column(String(500), nullable=True)
    last_snapshot = Column(DateTime(timezone=True), nullable=True)
    
    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    published_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    workspace = relationship("Workspace", back_populates="reports")
    owner = relationship("User", back_populates="reports")
    dataset = relationship("Dataset", back_populates="reports")
    dashboard_tiles = relationship("DashboardTile", back_populates="report")
    snapshots = relationship("ReportSnapshot", back_populates="report", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Report(id={self.id}, name={self.name}, owner_id={self.owner_id})>"
    
    def to_dict(self):
        """Convert report to dictionary for API responses."""
        return {
            "id": str(self.id),
            "workspace_id": str(self.workspace_id),
            "owner_id": str(self.owner_id),
            "dataset_id": str(self.dataset_id) if self.dataset_id else None,
            "name": self.name,
            "description": self.description,
            "report_json": self.report_json,
            "version": self.version,
            "is_published": self.is_published,
            "is_public": self.is_public,
            "allow_embedding": self.allow_embedding,
            "thumbnail_url": self.thumbnail_url,
            "last_snapshot": self.last_snapshot.isoformat() if self.last_snapshot else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "published_at": self.published_at.isoformat() if self.published_at else None,
        }
    
    def to_summary_dict(self):
        """Convert report to summary dictionary (minimal info)."""
        return {
            "id": str(self.id),
            "name": self.name,
            "description": self.description,
            "is_published": self.is_published,
            "thumbnail_url": self.thumbnail_url,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class Dashboard(Base):
    """Dashboard model for collections of report tiles."""
    
    __tablename__ = "dashboards"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Basic fields
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    
    # Relationships
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Dashboard definition
    dashboard_json = Column(JSON, nullable=False)  # Layout and configuration
    
    # Publishing and sharing
    is_published = Column(Boolean, default=False, nullable=False)
    is_public = Column(Boolean, default=False, nullable=False)
    allow_embedding = Column(Boolean, default=False, nullable=False)
    
    # Display settings
    theme = Column(String(50), default="light", nullable=False)
    auto_refresh_interval = Column(Integer, nullable=True)  # Minutes
    
    # Snapshots and exports
    thumbnail_url = Column(String(500), nullable=True)
    last_snapshot = Column(DateTime(timezone=True), nullable=True)
    
    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    published_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    workspace = relationship("Workspace", back_populates="dashboards")
    owner = relationship("User", back_populates="dashboards")
    tiles = relationship("DashboardTile", back_populates="dashboard", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Dashboard(id={self.id}, name={self.name}, owner_id={self.owner_id})>"
    
    def to_dict(self):
        """Convert dashboard to dictionary for API responses."""
        return {
            "id": str(self.id),
            "workspace_id": str(self.workspace_id),
            "owner_id": str(self.owner_id),
            "name": self.name,
            "description": self.description,
            "dashboard_json": self.dashboard_json,
            "is_published": self.is_published,
            "is_public": self.is_public,
            "allow_embedding": self.allow_embedding,
            "theme": self.theme,
            "auto_refresh_interval": self.auto_refresh_interval,
            "thumbnail_url": self.thumbnail_url,
            "last_snapshot": self.last_snapshot.isoformat() if self.last_snapshot else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "published_at": self.published_at.isoformat() if self.published_at else None,
            "tiles_count": len(self.tiles) if self.tiles else 0,
        }


class DashboardTile(Base):
    """Dashboard tile model for individual visualizations on dashboards."""
    
    __tablename__ = "dashboard_tiles"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Relationships
    dashboard_id = Column(UUID(as_uuid=True), ForeignKey("dashboards.id"), nullable=False)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id"), nullable=True)
    
    # Basic fields
    title = Column(String(255), nullable=True)
    
    # Layout and positioning
    position_x = Column(Integer, nullable=False, default=0)
    position_y = Column(Integer, nullable=False, default=0)
    width = Column(Integer, nullable=False, default=6)  # Grid units
    height = Column(Integer, nullable=False, default=4)  # Grid units
    
    # Tile configuration
    tile_json = Column(JSON, nullable=False)  # Tile-specific settings
    
    # Display settings
    show_title = Column(Boolean, default=True, nullable=False)
    show_border = Column(Boolean, default=True, nullable=False)
    
    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    dashboard = relationship("Dashboard", back_populates="tiles")
    report = relationship("Report", back_populates="dashboard_tiles")
    
    def __repr__(self):
        return f"<DashboardTile(id={self.id}, dashboard_id={self.dashboard_id}, report_id={self.report_id})>"
    
    def to_dict(self):
        """Convert dashboard tile to dictionary for API responses."""
        return {
            "id": str(self.id),
            "dashboard_id": str(self.dashboard_id),
            "report_id": str(self.report_id) if self.report_id else None,
            "title": self.title,
            "position_x": self.position_x,
            "position_y": self.position_y,
            "width": self.width,
            "height": self.height,
            "tile_json": self.tile_json,
            "show_title": self.show_title,
            "show_border": self.show_border,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class ReportSnapshot(Base):
    """Report snapshot model for versioning and history."""
    
    __tablename__ = "report_snapshots"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Relationships
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id"), nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Snapshot data
    version = Column(Integer, nullable=False)
    report_json = Column(JSON, nullable=False)  # Snapshot of report definition
    comment = Column(Text, nullable=True)  # Optional comment about changes
    
    # File exports
    thumbnail_url = Column(String(500), nullable=True)
    pdf_url = Column(String(500), nullable=True)
    
    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    report = relationship("Report", back_populates="snapshots")
    creator = relationship("User")
    
    def __repr__(self):
        return f"<ReportSnapshot(id={self.id}, report_id={self.report_id}, version={self.version})>"
    
    def to_dict(self):
        """Convert snapshot to dictionary for API responses."""
        return {
            "id": str(self.id),
            "report_id": str(self.report_id),
            "created_by": str(self.created_by),
            "version": self.version,
            "comment": self.comment,
            "thumbnail_url": self.thumbnail_url,
            "pdf_url": self.pdf_url,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }