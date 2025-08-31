"""
Job routes for PowerBI Web Replica.
Handles background job monitoring and management.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.core.database import get_async_session
from app.core.security import get_current_user
from app.models.user import User

logger = structlog.get_logger()
router = APIRouter()


@router.get("/{job_id}")
async def get_job_status(
    job_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get job status."""
    return {
        "id": job_id,
        "type": "export_png",
        "status": "completed",
        "progress": {"completed": 100},
        "result": {"download_url": f"/api/exports/{job_id}/download"}
    }