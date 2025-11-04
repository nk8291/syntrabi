"""
Report routes for PowerBI Web Replica.
Handles report creation, editing, rendering, and export functionality.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
import structlog
import time
from datetime import datetime

from app.core.database import get_async_session
from app.core.security import get_current_user
from app.models.user import User

logger = structlog.get_logger()
router = APIRouter()


# Request/Response Models
class CreateReportRequest(BaseModel):
    """Create report request model."""
    workspace_id: str
    name: str
    description: Optional[str] = None
    dataset_id: Optional[str] = None
    report_json: Dict[str, Any] = {}


class RenderRequest(BaseModel):
    """Report render request model."""
    format: str = "vega_lite"
    width: int = 800
    height: int = 600


class RenderResponse(BaseModel):
    """Report render response model."""
    vega_lite_spec: Dict[str, Any]
    data_url: Optional[str] = None


class ExportRequest(BaseModel):
    """Export request model."""
    format: str = "png"  # png, pdf
    width: int = 800
    height: int = 600
    quality: int = 90


# Report Routes
@router.get("")
async def list_reports(
    workspace_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """List reports for a workspace or all user reports."""
    try:
        from app.models.report import Report
        from sqlalchemy import select
        
        # Build query - admins see all reports, regular users see only their own
        query = select(Report)
        
        if not current_user.is_admin:
            query = query.where(Report.owner_id == str(current_user.id))
        
        if workspace_id:
            query = query.where(Report.workspace_id == workspace_id)
        
        query = query.order_by(Report.updated_at.desc())
        
        result = await session.execute(query)
        reports = result.scalars().all()
        
        # Convert to dict format
        reports_data = []
        for report in reports:
            report_dict = {
                "id": str(report.id),
                "workspace_id": str(report.workspace_id), 
                "owner_id": str(report.owner_id),
                "dataset_id": str(report.dataset_id) if report.dataset_id else None,
                "name": report.name,
                "description": report.description,
                "report_json": report.report_json or {},
                "version": report.version,
                "is_published": report.is_published,
                "is_public": report.is_public,
                "allow_embedding": report.allow_embedding,
                "thumbnail_url": report.thumbnail_url,
                "created_at": report.created_at.isoformat() if report.created_at else None,
                "updated_at": report.updated_at.isoformat() if report.updated_at else None,
                "published_at": report.published_at.isoformat() if report.published_at else None
            }
            reports_data.append(report_dict)
        
        return {"reports": reports_data}
        
    except Exception as e:
        logger.error("Failed to list reports", error=str(e), workspace_id=workspace_id)
        # Return empty array as fallback rather than error
        return {"reports": []}


@router.post("")
async def create_report(
    report_data: CreateReportRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Create new report."""
    try:
        from app.models.report import Report
        from uuid import uuid4
        
        # Create default report JSON structure
        default_report_json = {
            "version": "1.0",
            "pages": [{
                "id": "page-1",
                "name": "Page 1",
                "visuals": [],
                "filters": [],
                "layout": {
                    "width": 1280,
                    "height": 720
                }
            }],
            "theme": {
                "name": "default",
                "colors": ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"]
            }
        }
        
        # Create new report
        new_report = Report(
            id=uuid4(),
            workspace_id=report_data.workspace_id,
            owner_id=current_user.id,
            dataset_id=report_data.dataset_id,
            name=report_data.name,
            description=report_data.description,
            report_json=report_data.report_json or default_report_json,
            version=1,
            is_published=False,
            is_public=False,
            allow_embedding=False
        )
        
        session.add(new_report)
        await session.commit()
        await session.refresh(new_report)
        
        # Convert to dict format
        report_dict = {
            "id": str(new_report.id),
            "workspace_id": str(new_report.workspace_id),
            "owner_id": str(new_report.owner_id),
            "dataset_id": str(new_report.dataset_id) if new_report.dataset_id else None,
            "name": new_report.name,
            "description": new_report.description,
            "report_json": new_report.report_json,
            "version": new_report.version,
            "is_published": new_report.is_published,
            "is_public": new_report.is_public,
            "allow_embedding": new_report.allow_embedding,
            "thumbnail_url": new_report.thumbnail_url,
            "created_at": new_report.created_at.isoformat() if new_report.created_at else None,
            "updated_at": new_report.updated_at.isoformat() if new_report.updated_at else None,
            "published_at": new_report.published_at.isoformat() if new_report.published_at else None
        }
        
        logger.info(
            "Report created successfully", 
            report_id=str(new_report.id),
            workspace_id=report_data.workspace_id,
            user_id=str(current_user.id)
        )
        
        return report_dict
        
    except Exception as e:
        logger.error("Failed to create report", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create report"
        )


@router.get("/{report_id}")
async def get_report(
    report_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get report by ID."""
    try:
        from app.models.report import Report
        from sqlalchemy import select
        from app.services.storage_service import report_storage
        from uuid import UUID
        
        # Get report from database
        query = select(Report).where(
            Report.id == UUID(report_id),
            Report.owner_id == current_user.id
        )
        result = await session.execute(query)
        report = result.scalar_one_or_none()
        
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Report not found"
            )
        
        # Try to load from storage if report_json is empty
        if not report.report_json:
            try:
                storage_data = await report_storage.load_report(report_id)
                if storage_data:
                    report.report_json = storage_data
            except Exception as e:
                logger.warning("Failed to load report from storage", report_id=report_id, error=str(e))
        
        # Convert to dict format
        report_dict = {
            "id": str(report.id),
            "workspace_id": str(report.workspace_id),
            "owner_id": str(report.owner_id),
            "dataset_id": str(report.dataset_id) if report.dataset_id else None,
            "name": report.name,
            "description": report.description,
            "report_json": report.report_json,
            "version": report.version,
            "is_published": report.is_published,
            "is_public": report.is_public,
            "allow_embedding": report.allow_embedding,
            "thumbnail_url": report.thumbnail_url,
            "created_at": report.created_at.isoformat() if report.created_at else None,
            "updated_at": report.updated_at.isoformat() if report.updated_at else None,
            "published_at": report.published_at.isoformat() if report.published_at else None
        }
        
        return report_dict
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get report", report_id=report_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve report"
        )


@router.put("/{report_id}")
async def update_report(
    report_id: str,
    report_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Update report."""
    try:
        from app.models.report import Report
        from sqlalchemy import select
        from app.services.storage_service import report_storage
        from uuid import UUID
        
        # Get existing report
        query = select(Report).where(
            Report.id == UUID(report_id),
            Report.owner_id == current_user.id
        )
        result = await session.execute(query)
        existing_report = result.scalar_one_or_none()
        
        if not existing_report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Report not found"
            )
        
        # Update report fields
        existing_report.name = report_data.get("name", existing_report.name)
        existing_report.description = report_data.get("description", existing_report.description)
        existing_report.report_json = report_data.get("report_json", existing_report.report_json)
        existing_report.version += 1
        
        # Handle publishing
        if report_data.get("is_published") and not existing_report.is_published:
            existing_report.is_published = True
            existing_report.published_at = datetime.utcnow()
        
        # Save to database
        await session.commit()
        await session.refresh(existing_report)
        
        # Save to object storage
        try:
            await report_storage.save_report(report_id, existing_report.report_json or {})
            logger.info("Report saved to storage", report_id=report_id)
        except Exception as e:
            logger.warning("Failed to save report to storage", report_id=report_id, error=str(e))
        
        # Convert to dict format
        updated_report = {
            "id": str(existing_report.id),
            "workspace_id": str(existing_report.workspace_id),
            "owner_id": str(existing_report.owner_id),
            "dataset_id": str(existing_report.dataset_id) if existing_report.dataset_id else None,
            "name": existing_report.name,
            "description": existing_report.description,
            "report_json": existing_report.report_json,
            "version": existing_report.version,
            "is_published": existing_report.is_published,
            "is_public": existing_report.is_public,
            "allow_embedding": existing_report.allow_embedding,
            "thumbnail_url": existing_report.thumbnail_url,
            "created_at": existing_report.created_at.isoformat() if existing_report.created_at else None,
            "updated_at": existing_report.updated_at.isoformat() if existing_report.updated_at else None,
            "published_at": existing_report.published_at.isoformat() if existing_report.published_at else None
        }
        
        logger.info(
            "Report updated successfully",
            report_id=report_id,
            user_id=str(current_user.id),
            version=updated_report["version"]
        )
        
        return updated_report
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to update report", report_id=report_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update report"
        )


@router.post("/{report_id}/render", response_model=RenderResponse)
async def render_report(
    report_id: str,
    render_request: RenderRequest = RenderRequest(),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Render report to Vega-Lite specification."""
    # TODO: Implement report rendering
    sample_vega_spec = {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "data": {
            "values": [
                {"category": "A", "value": 28},
                {"category": "B", "value": 55},
                {"category": "C", "value": 43}
            ]
        },
        "mark": "bar",
        "encoding": {
            "x": {"field": "category", "type": "nominal"},
            "y": {"field": "value", "type": "quantitative"}
        },
        "width": render_request.width,
        "height": render_request.height
    }
    
    return RenderResponse(vega_lite_spec=sample_vega_spec)


@router.post("/{report_id}/publish")
async def publish_report(
    report_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Publish report."""
    try:
        from app.models.report import Report
        from sqlalchemy import select
        from app.services.storage_service import report_storage
        from uuid import UUID
        
        # Get existing report
        query = select(Report).where(
            Report.id == UUID(report_id),
            Report.owner_id == current_user.id
        )
        result = await session.execute(query)
        report = result.scalar_one_or_none()
        
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Report not found"
            )
        
        # Publish the report
        report.is_published = True
        report.published_at = datetime.utcnow()
        report.version += 1
        
        # Save to database
        await session.commit()
        await session.refresh(report)
        
        # Save to object storage
        try:
            await report_storage.save_report(report_id, report.report_json or {})
        except Exception as e:
            logger.warning("Failed to save published report to storage", report_id=report_id, error=str(e))
        
        logger.info("Report published successfully", report_id=report_id, user_id=str(current_user.id))
        
        return {
            "id": str(report.id),
            "name": report.name,
            "is_published": report.is_published,
            "published_at": report.published_at.isoformat(),
            "version": report.version
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to publish report", report_id=report_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to publish report"
        )

@router.post("/{report_id}/export")
async def export_report(
    report_id: str,
    export_request: ExportRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Export report as PNG or PDF."""
    # TODO: Implement report export with proper image generation
    return {
        "job_id": f"export-{report_id}-{int(time.time())}",
        "status": "processing",
        "format": export_request.format,
        "message": "Export functionality will be implemented with server-side rendering"
    }