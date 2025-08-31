"""
Job model for PowerBI Web Replica.
Defines background jobs for exports, data refresh, and async processing.
"""

from sqlalchemy import Column, String, DateTime, Text, JSON, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
import enum

from app.core.database import Base


class JobType(enum.Enum):
    """Background job types."""
    EXPORT_PNG = "export_png"
    EXPORT_PDF = "export_pdf"
    DATA_REFRESH = "data_refresh"
    DATASET_IMPORT = "dataset_import"
    REPORT_SNAPSHOT = "report_snapshot"
    EMAIL_REPORT = "email_report"


class JobStatus(enum.Enum):
    """Job execution status."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class Job(Base):
    """Background job model for async processing."""
    
    __tablename__ = "jobs"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Job identification
    type = Column(SQLEnum(JobType), nullable=False, index=True)
    status = Column(SQLEnum(JobStatus), default=JobStatus.PENDING, nullable=False, index=True)
    
    # Job payload and configuration
    payload = Column(JSON, nullable=False)  # Input parameters
    result = Column(JSON, nullable=True)    # Output results
    
    # Progress tracking
    progress = Column(JSON, nullable=True)  # Progress information
    
    # Error handling
    error_message = Column(Text, nullable=True)
    error_details = Column(JSON, nullable=True)
    retry_count = Column(String(10), default=0, nullable=False)
    max_retries = Column(String(10), default=3, nullable=False)
    
    # Scheduling
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Expiration (for cleanup)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    def __repr__(self):
        return f"<Job(id={self.id}, type={self.type}, status={self.status})>"
    
    def to_dict(self):
        """Convert job to dictionary for API responses."""
        return {
            "id": str(self.id),
            "type": self.type.value if self.type else None,
            "status": self.status.value if self.status else None,
            "payload": self.payload,
            "result": self.result,
            "progress": self.progress,
            "error_message": self.error_message,
            "error_details": self.error_details,
            "retry_count": self.retry_count,
            "max_retries": self.max_retries,
            "scheduled_at": self.scheduled_at.isoformat() if self.scheduled_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
    
    def to_summary_dict(self):
        """Convert job to summary dictionary (minimal info)."""
        return {
            "id": str(self.id),
            "type": self.type.value if self.type else None,
            "status": self.status.value if self.status else None,
            "progress": self.progress,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }