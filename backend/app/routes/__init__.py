"""
API routes package for PowerBI Web Replica.
Exports all route modules for FastAPI application.
"""

from app.routes import auth, workspaces, datasets, reports, dashboards, jobs, embed

__all__ = [
    "auth",
    "workspaces", 
    "datasets",
    "reports",
    "dashboards", 
    "jobs",
    "embed"
]