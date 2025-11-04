"""
Export Routes for Server-side Report Rendering
Handles PNG, PDF, and other format exports
"""

from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, Query, Body
from fastapi.responses import Response
import structlog

from app.services.export_service import export_service
from app.routes.auth import get_current_user
from app.models.user import User

logger = structlog.get_logger()
router = APIRouter()

@router.post("/reports/export/image")
async def export_report_image(
    report_data: Dict[str, Any] = Body(..., description="Report JSON data"),
    format: str = Query("png", description="Image format (png, jpeg)"),
    width: int = Query(1200, description="Export width in pixels"),
    height: int = Query(800, description="Export height in pixels"), 
    quality: int = Query(90, description="JPEG quality (10-100)"),
    current_user: User = Depends(get_current_user)
):
    """Export report as PNG or JPEG image"""
    
    try:
        if format.lower() not in ['png', 'jpeg', 'jpg']:
            raise HTTPException(status_code=400, detail="Format must be png, jpeg, or jpg")
        
        if not (10 <= quality <= 100):
            raise HTTPException(status_code=400, detail="Quality must be between 10 and 100")
            
        if not (200 <= width <= 4000) or not (200 <= height <= 4000):
            raise HTTPException(status_code=400, detail="Dimensions must be between 200 and 4000 pixels")
        
        # Export the report
        image_bytes, filename = await export_service.export_report_as_image(
            report_json=report_data,
            format=format.lower(),
            width=width,
            height=height,
            quality=quality
        )
        
        # Save to storage if configured
        storage_url = await export_service.save_export_to_storage(image_bytes, filename)
        
        logger.info("Report exported as image", 
                   user_id=current_user.id,
                   format=format,
                   filename=filename,
                   storage_url=storage_url)
        
        # Return the image directly
        content_type = "image/png" if format.lower() == "png" else "image/jpeg"
        
        return Response(
            content=image_bytes,
            media_type=content_type,
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "X-Storage-URL": storage_url or ""
            }
        )
        
    except Exception as e:
        logger.error("Failed to export report as image", error=str(e), user_id=current_user.id)
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

@router.post("/reports/export/pdf")
async def export_report_pdf(
    report_data: Dict[str, Any] = Body(..., description="Report JSON data"),
    width: int = Query(1200, description="Export width in pixels"),
    height: int = Query(800, description="Export height in pixels"),
    page_format: str = Query("A4", description="PDF page format (A4, Letter)"),
    current_user: User = Depends(get_current_user)
):
    """Export report as PDF"""
    
    try:
        if page_format not in ['A4', 'Letter']:
            raise HTTPException(status_code=400, detail="Page format must be A4 or Letter")
            
        if not (200 <= width <= 4000) or not (200 <= height <= 4000):
            raise HTTPException(status_code=400, detail="Dimensions must be between 200 and 4000 pixels")
        
        # Export the report
        pdf_bytes, filename = await export_service.export_report_as_pdf(
            report_json=report_data,
            width=width,
            height=height,
            page_format=page_format
        )
        
        # Save to storage if configured
        storage_url = await export_service.save_export_to_storage(pdf_bytes, filename)
        
        logger.info("Report exported as PDF",
                   user_id=current_user.id,
                   filename=filename,
                   storage_url=storage_url)
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "X-Storage-URL": storage_url or ""
            }
        )
        
    except Exception as e:
        logger.error("Failed to export report as PDF", error=str(e), user_id=current_user.id)
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

@router.post("/visuals/export/image")
async def export_visual_image(
    visual_config: Dict[str, Any] = Body(..., description="Visual configuration"),
    data: list = Body(..., description="Visual data"),
    format: str = Query("png", description="Image format (png, jpeg)"),
    width: int = Query(600, description="Export width in pixels"),
    height: int = Query(400, description="Export height in pixels"),
    quality: int = Query(90, description="JPEG quality (10-100)"),
    current_user: User = Depends(get_current_user)
):
    """Export single visualization as image"""
    
    try:
        if format.lower() not in ['png', 'jpeg', 'jpg']:
            raise HTTPException(status_code=400, detail="Format must be png, jpeg, or jpg")
        
        if not (10 <= quality <= 100):
            raise HTTPException(status_code=400, detail="Quality must be between 10 and 100")
            
        if not (200 <= width <= 2000) or not (200 <= height <= 2000):
            raise HTTPException(status_code=400, detail="Dimensions must be between 200 and 2000 pixels")
        
        # Export the visual
        image_bytes, filename = await export_service.export_visual_as_image(
            visual_config=visual_config,
            data=data,
            format=format.lower(),
            width=width,
            height=height
        )
        
        # Save to storage if configured  
        storage_url = await export_service.save_export_to_storage(image_bytes, filename)
        
        logger.info("Visual exported as image",
                   user_id=current_user.id,
                   visual_type=visual_config.get('type', 'unknown'),
                   format=format,
                   filename=filename)
        
        content_type = "image/png" if format.lower() == "png" else "image/jpeg"
        
        return Response(
            content=image_bytes,
            media_type=content_type,
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "X-Storage-URL": storage_url or ""
            }
        )
        
    except Exception as e:
        logger.error("Failed to export visual as image", error=str(e), user_id=current_user.id)
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

@router.get("/formats")
async def get_export_formats(
    current_user: User = Depends(get_current_user)
):
    """Get available export formats and their capabilities"""
    
    return {
        "image_formats": [
            {
                "format": "png",
                "label": "PNG Image",
                "supports_transparency": True,
                "max_quality": 100,
                "recommended_for": ["reports", "charts", "high_quality"]
            },
            {
                "format": "jpeg", 
                "label": "JPEG Image",
                "supports_transparency": False,
                "max_quality": 100,
                "recommended_for": ["photos", "web", "smaller_files"]
            }
        ],
        "pdf_formats": [
            {
                "format": "A4",
                "label": "A4 (210 × 297 mm)",
                "width": 595,
                "height": 842
            },
            {
                "format": "Letter", 
                "label": "US Letter (8.5 × 11 in)",
                "width": 612,
                "height": 792
            }
        ],
        "capabilities": {
            "max_image_dimensions": {"width": 4000, "height": 4000},
            "max_visual_dimensions": {"width": 2000, "height": 2000},
            "supported_chart_types": ["column-chart", "line-chart", "pie-chart", "bar-chart", "area-chart", "map"],
            "server_side_rendering": True,
            "storage_integration": True
        }
    }