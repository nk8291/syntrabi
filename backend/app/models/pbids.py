"""
PBIDS (Power BI Data Source) model for PowerBI Web Replica.
Implements the .pbids file format for reusable data source connections.
https://docs.microsoft.com/en-us/power-bi/connect-data/desktop-data-source-prerequisites
"""

from sqlalchemy import Column, String, DateTime, Text, JSON, Boolean, Integer, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import json
import enum
from typing import Dict, Any, Optional

from app.core.database import Base


class ConnectionType(enum.Enum):
    """PBIDS connection types."""
    # Database connections
    SQL_SERVER = "Sql"
    ORACLE = "Oracle" 
    OLEDB = "OleDb"
    ODBC = "Odbc"
    MYSQL = "MySql"
    POSTGRESQL = "PostgreSql"
    TERADATA = "Teradata"
    MONGODB = "MongoDb"
    
    # Cloud services
    AZURE_SQL = "AzureSqlDatabase"
    AZURE_ANALYSIS_SERVICES = "AzureAnalysisServices"
    POWER_BI_DATASETS = "PowerBIDatasets"
    GOOGLE_BIGQUERY = "GoogleBigQuery"
    AMAZON_REDSHIFT = "AmazonRedshift"
    SNOWFLAKE = "Snowflake"
    
    # File sources
    EXCEL = "Excel"
    CSV = "Csv" 
    TEXT = "Text"
    XML = "Xml"
    JSON = "Json"
    PARQUET = "Parquet"
    FOLDER = "Folder"
    
    # Web sources
    WEB = "Web"
    ODATA = "OData"
    SHAREPOINT = "SharePoint"
    GOOGLE_SHEETS = "GoogleSheets"
    
    # Other
    BLANK_QUERY = "BlankQuery"
    SPARK = "Spark"


class AuthenticationKind(enum.Enum):
    """Authentication methods for PBIDS connections."""
    ANONYMOUS = "Anonymous"
    BASIC = "Basic"
    WINDOWS = "Windows"
    OAUTH2 = "OAuth2"
    OAUTH = "OAuth"
    SERVICE_PRINCIPAL = "ServicePrincipal"
    CERTIFICATE = "Certificate"
    KEY = "Key"
    ORGANIZATIONAL_ACCOUNT = "OrganizationalAccount"
    IMPLICIT = "Implicit"


class PrivacyLevel(enum.Enum):
    """Data privacy levels."""
    PRIVATE = "Private"
    ORGANIZATIONAL = "Organizational" 
    PUBLIC = "Public"
    NONE = "None"


class PBIDS(Base):
    """
    PBIDS (Power BI Data Source) model.
    Represents reusable data source connection definitions.
    """
    
    __tablename__ = "pbids"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Basic info
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    
    # Workspace relationship
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False)
    
    # PBIDS connection details
    connection_type = Column(SQLEnum(ConnectionType), nullable=False)
    version = Column(String(10), default="0.1", nullable=False)  # PBIDS format version
    
    # Connection configuration (matches PBIDS JSON structure)
    connections = Column(JSON, nullable=False)  # Array of connection objects
    
    # Metadata
    is_template = Column(Boolean, default=False)  # Can be used as template for new connections
    is_shared = Column(Boolean, default=False)   # Shared across workspace
    tags = Column(JSON, nullable=True)           # Tags for organization
    
    # Usage tracking
    usage_count = Column(Integer, default=0)     # How many times this PBIDS was used
    last_used = Column(DateTime(timezone=True), nullable=True)
    
    # Audit fields
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    workspace = relationship("Workspace", back_populates="pbids_files")
    creator = relationship("User")
    datasets = relationship("Dataset", back_populates="pbids_source")
    
    def __repr__(self):
        return f"<PBIDS(id={self.id}, name={self.name}, connection_type={self.connection_type})>"
    
    def to_pbids_format(self) -> Dict[str, Any]:
        """Export as standard PBIDS JSON format."""
        return {
            "version": self.version,
            "connections": self.connections
        }
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "id": str(self.id),
            "workspace_id": str(self.workspace_id),
            "name": self.name,
            "description": self.description,
            "connection_type": self.connection_type.value if self.connection_type else None,
            "version": self.version,
            "connections": self.connections,
            "is_template": self.is_template,
            "is_shared": self.is_shared,
            "tags": self.tags,
            "usage_count": self.usage_count,
            "last_used": self.last_used.isoformat() if self.last_used else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
    
    @classmethod
    def create_sql_server_pbids(
        cls,
        name: str,
        server: str,
        database: str,
        workspace_id: str,
        user_id: str,
        authentication_kind: AuthenticationKind = AuthenticationKind.WINDOWS,
        privacy_level: PrivacyLevel = PrivacyLevel.ORGANIZATIONAL
    ) -> 'PBIDS':
        """Create a SQL Server PBIDS configuration."""
        connections = [{
            "details": {
                "protocol": "tds",
                "address": {
                    "server": server,
                    "database": database
                }
            },
            "options": {
                "connectionString": f"Data Source={server};Initial Catalog={database}",
                "authenticationKind": authentication_kind.value,
                "privacyLevel": privacy_level.value
            },
            "mode": "DirectQuery"  # or "Import"
        }]
        
        return cls(
            name=name,
            workspace_id=workspace_id,
            created_by=user_id,
            connection_type=ConnectionType.SQL_SERVER,
            connections=connections
        )
    
    @classmethod
    def create_excel_pbids(
        cls,
        name: str,
        file_path: str,
        workspace_id: str,
        user_id: str,
        privacy_level: PrivacyLevel = PrivacyLevel.PRIVATE
    ) -> 'PBIDS':
        """Create an Excel PBIDS configuration."""
        connections = [{
            "details": {
                "protocol": "file",
                "address": {
                    "path": file_path
                }
            },
            "options": {
                "privacyLevel": privacy_level.value
            },
            "mode": "Import"
        }]
        
        return cls(
            name=name,
            workspace_id=workspace_id,
            created_by=user_id,
            connection_type=ConnectionType.EXCEL,
            connections=connections
        )
    
    @classmethod
    def create_web_pbids(
        cls,
        name: str,
        url: str,
        workspace_id: str,
        user_id: str,
        authentication_kind: AuthenticationKind = AuthenticationKind.ANONYMOUS,
        privacy_level: PrivacyLevel = PrivacyLevel.PUBLIC
    ) -> 'PBIDS':
        """Create a Web PBIDS configuration."""
        connections = [{
            "details": {
                "protocol": "http",
                "address": {
                    "url": url
                }
            },
            "options": {
                "authenticationKind": authentication_kind.value,
                "privacyLevel": privacy_level.value
            },
            "mode": "Import"
        }]
        
        return cls(
            name=name,
            workspace_id=workspace_id,
            created_by=user_id,
            connection_type=ConnectionType.WEB,
            connections=connections
        )
    
    @classmethod
    def create_google_bigquery_pbids(
        cls,
        name: str,
        project_id: str,
        workspace_id: str,
        user_id: str,
        privacy_level: PrivacyLevel = PrivacyLevel.ORGANIZATIONAL
    ) -> 'PBIDS':
        """Create a Google BigQuery PBIDS configuration."""
        connections = [{
            "details": {
                "protocol": "googlebigquery",
                "address": {
                    "project": project_id
                }
            },
            "options": {
                "authenticationKind": AuthenticationKind.OAUTH2.value,
                "privacyLevel": privacy_level.value
            },
            "mode": "DirectQuery"
        }]
        
        return cls(
            name=name,
            workspace_id=workspace_id,
            created_by=user_id,
            connection_type=ConnectionType.GOOGLE_BIGQUERY,
            connections=connections
        )
    
    @classmethod
    def create_blank_query_pbids(
        cls,
        name: str,
        workspace_id: str,
        user_id: str,
        query: str = "",
        privacy_level: PrivacyLevel = PrivacyLevel.PRIVATE
    ) -> 'PBIDS':
        """Create a blank query PBIDS configuration."""
        connections = [{
            "details": {
                "protocol": "m",
                "address": {}
            },
            "options": {
                "query": query,
                "privacyLevel": privacy_level.value
            },
            "mode": "Import"
        }]
        
        return cls(
            name=name,
            workspace_id=workspace_id,
            created_by=user_id,
            connection_type=ConnectionType.BLANK_QUERY,
            connections=connections
        )
    
    def increment_usage(self):
        """Increment usage count and update last used timestamp."""
        self.usage_count = (self.usage_count or 0) + 1
        self.last_used = func.now()


class PBIDSTemplate(Base):
    """
    Predefined PBIDS templates for common connection scenarios.
    Similar to Power BI's built-in connection templates.
    """
    
    __tablename__ = "pbids_templates"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=False)  # Database, Cloud, File, Web, etc.
    connection_type = Column(SQLEnum(ConnectionType), nullable=False)
    
    # Template configuration - parameters that users can fill in
    template_config = Column(JSON, nullable=False)
    
    # Default values
    default_values = Column(JSON, nullable=True)
    
    # UI configuration for the template
    ui_config = Column(JSON, nullable=True)  # Form fields, validation rules, etc.
    
    # Metadata
    is_popular = Column(Boolean, default=False)
    is_premium = Column(Boolean, default=False)  # Requires premium features
    sort_order = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    def __repr__(self):
        return f"<PBIDSTemplate(name={self.name}, connection_type={self.connection_type})>"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "id": str(self.id),
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "connection_type": self.connection_type.value if self.connection_type else None,
            "template_config": self.template_config,
            "default_values": self.default_values,
            "ui_config": self.ui_config,
            "is_popular": self.is_popular,
            "is_premium": self.is_premium,
            "sort_order": self.sort_order
        }


# Add relationship to existing models
from app.models.dataset import Dataset
from app.models.workspace import Workspace

# Add to Dataset model
Dataset.pbids_source = relationship("PBIDS", back_populates="datasets")

# Add to Workspace model  
Workspace.pbids_files = relationship("PBIDS", back_populates="workspace", cascade="all, delete-orphan")