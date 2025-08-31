"""
Dataset model for PowerBI Web Replica.
Defines datasets, data sources, schemas, and connection configurations.
"""

from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Integer, JSON, Boolean, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from app.core.database import Base


class ConnectorType(enum.Enum):
    """Supported data source connector types."""
    CSV = "csv"
    POSTGRESQL = "postgresql"
    MYSQL = "mysql"
    BIGQUERY = "bigquery"
    SNOWFLAKE = "snowflake"
    EXCEL = "excel"
    JSON = "json"
    REST_API = "rest_api"


class DatasetStatus(enum.Enum):
    """Dataset processing status."""
    PENDING = "pending"
    PROCESSING = "processing"
    READY = "ready"
    ERROR = "error"
    REFRESHING = "refreshing"


class Dataset(Base):
    """Dataset model for data sources and their schemas."""
    
    __tablename__ = "datasets"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Basic fields
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    
    # Workspace relationship
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False)
    
    # Connector configuration
    connector_type = Column(SQLEnum(ConnectorType), nullable=False)
    connector_config = Column(JSON, nullable=False)  # Connection details (encrypted)
    
    # Schema and data info
    schema_json = Column(JSON, nullable=True)  # Inferred or configured schema
    sample_rows = Column(JSON, nullable=True)  # Sample data for preview
    row_count = Column(Integer, nullable=True)
    file_size = Column(Integer, nullable=True)  # For file-based datasets
    
    # Processing status
    status = Column(SQLEnum(DatasetStatus), default=DatasetStatus.PENDING, nullable=False)
    error_message = Column(Text, nullable=True)
    
    # File storage (for uploaded files)
    file_path = Column(String(500), nullable=True)  # S3 key or file path
    file_url = Column(String(500), nullable=True)   # Public access URL
    
    # Refresh configuration
    refresh_enabled = Column(Boolean, default=False)
    refresh_schedule = Column(JSON, nullable=True)  # Cron-like schedule
    last_refresh = Column(DateTime(timezone=True), nullable=True)
    next_refresh = Column(DateTime(timezone=True), nullable=True)
    
    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    workspace = relationship("Workspace", back_populates="datasets")
    tables = relationship("Table", back_populates="dataset", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="dataset")
    
    def __repr__(self):
        return f"<Dataset(id={self.id}, name={self.name}, connector_type={self.connector_type})>"
    
    def to_dict(self):
        """Convert dataset to dictionary for API responses."""
        return {
            "id": str(self.id),
            "workspace_id": str(self.workspace_id),
            "name": self.name,
            "description": self.description,
            "connector_type": self.connector_type.value if self.connector_type else None,
            "schema_json": self.schema_json,
            "sample_rows": self.sample_rows,
            "row_count": self.row_count,
            "file_size": self.file_size,
            "status": self.status.value if self.status else None,
            "error_message": self.error_message,
            "file_url": self.file_url,
            "refresh_enabled": self.refresh_enabled,
            "last_refresh": self.last_refresh.isoformat() if self.last_refresh else None,
            "next_refresh": self.next_refresh.isoformat() if self.next_refresh else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
    
    def to_summary_dict(self):
        """Convert dataset to summary dictionary (minimal info)."""
        return {
            "id": str(self.id),
            "name": self.name,
            "connector_type": self.connector_type.value if self.connector_type else None,
            "status": self.status.value if self.status else None,
            "row_count": self.row_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Table(Base):
    """Table model for dataset tables/views."""
    
    __tablename__ = "tables"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Dataset relationship
    dataset_id = Column(UUID(as_uuid=True), ForeignKey("datasets.id"), nullable=False)
    
    # Basic fields
    name = Column(String(255), nullable=False)
    display_name = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    
    # Schema information
    columns = Column(JSON, nullable=False)  # Column definitions
    primary_key = Column(JSON, nullable=True)  # Primary key columns
    indexes = Column(JSON, nullable=True)  # Index definitions
    
    # Statistics
    row_count = Column(Integer, nullable=True)
    
    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    dataset = relationship("Dataset", back_populates="tables")
    
    def __repr__(self):
        return f"<Table(id={self.id}, name={self.name}, dataset_id={self.dataset_id})>"
    
    def to_dict(self):
        """Convert table to dictionary for API responses."""
        return {
            "id": str(self.id),
            "dataset_id": str(self.dataset_id),
            "name": self.name,
            "display_name": self.display_name,
            "description": self.description,
            "columns": self.columns,
            "primary_key": self.primary_key,
            "indexes": self.indexes,
            "row_count": self.row_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }