"""
Models package for PowerBI Web Replica.
Imports all database models for SQLAlchemy registration.
"""

from app.models.user import User
from app.models.workspace import Workspace
from app.models.dataset import Dataset, Table, ConnectorType, DatasetStatus
from app.models.report import Report, Dashboard, DashboardTile, ReportSnapshot
from app.models.job import Job, JobType, JobStatus
from app.models.permission import Permission, DataModel, PermissionRole, PermissionObjectType

__all__ = [
    # User models
    "User",
    
    # Workspace models
    "Workspace",
    
    # Dataset models
    "Dataset",
    "Table",
    "ConnectorType", 
    "DatasetStatus",
    
    # Report and Dashboard models
    "Report",
    "Dashboard", 
    "DashboardTile",
    "ReportSnapshot",
    
    # Job models
    "Job",
    "JobType",
    "JobStatus",
    
    # Permission models
    "Permission",
    "DataModel",
    "PermissionRole",
    "PermissionObjectType",
]