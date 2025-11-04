"""
Settings routes for PowerBI Web Replica.
Handles user settings, preferences, and application configuration.
"""

from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
import structlog
import json

from app.core.database import get_async_session
from app.core.security import get_current_user
from app.models.user import User

logger = structlog.get_logger()
router = APIRouter()


# Request/Response Models
class UserPreferences(BaseModel):
    """User preferences model."""
    theme: Optional[str] = "light"  # light, dark, auto
    language: Optional[str] = "en"
    timezone: Optional[str] = "UTC"
    date_format: Optional[str] = "MM/DD/YYYY"
    number_format: Optional[str] = "1,234.56"
    default_workspace_id: Optional[str] = None
    email_notifications: Optional[bool] = True
    push_notifications: Optional[bool] = True
    auto_refresh_reports: Optional[bool] = True
    default_visual_theme: Optional[str] = "default"
    show_tips: Optional[bool] = True


class WorkspaceSettings(BaseModel):
    """Workspace-specific settings model."""
    workspace_id: str
    default_dataset_refresh_schedule: Optional[str] = None
    allow_external_sharing: Optional[bool] = False
    require_approval_for_publishing: Optional[bool] = True
    default_report_theme: Optional[str] = "default"
    auto_save_interval: Optional[int] = 300  # seconds


class GlobalSettings(BaseModel):
    """Global application settings model."""
    max_file_upload_size: Optional[int] = 104857600  # 100MB
    allowed_file_types: Optional[list] = ["csv", "xlsx", "json", "parquet"]
    session_timeout: Optional[int] = 3600  # 1 hour
    max_concurrent_queries: Optional[int] = 10
    enable_analytics: Optional[bool] = True
    maintenance_mode: Optional[bool] = False


# In-memory storage for demo purposes (replace with database in production)
user_preferences_store: Dict[str, Dict[str, Any]] = {}
workspace_settings_store: Dict[str, Dict[str, Any]] = {}
global_settings_store: Dict[str, Any] = {
    "max_file_upload_size": 104857600,
    "allowed_file_types": ["csv", "xlsx", "json", "parquet"],
    "session_timeout": 3600,
    "max_concurrent_queries": 10,
    "enable_analytics": True,
    "maintenance_mode": False
}


# User Preferences Routes
@router.get("/user/preferences")
async def get_user_preferences(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get current user's preferences."""
    try:
        user_id = str(current_user.id)
        preferences = user_preferences_store.get(user_id, {
            "theme": "light",
            "language": "en",
            "timezone": "UTC",
            "date_format": "MM/DD/YYYY",
            "number_format": "1,234.56",
            "default_workspace_id": None,
            "email_notifications": True,
            "push_notifications": True,
            "auto_refresh_reports": True,
            "default_visual_theme": "default",
            "show_tips": True
        })
        
        return UserPreferences(**preferences)
        
    except Exception as e:
        logger.error("Failed to get user preferences", user_id=str(current_user.id), error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user preferences"
        )


@router.put("/user/preferences")
async def update_user_preferences(
    preferences: UserPreferences,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Update current user's preferences."""
    try:
        user_id = str(current_user.id)
        
        # Get existing preferences or defaults
        existing_preferences = user_preferences_store.get(user_id, {})
        
        # Update with new values (only non-None values)
        updated_preferences = {
            **existing_preferences,
            **{k: v for k, v in preferences.dict().items() if v is not None}
        }
        
        # Store updated preferences
        user_preferences_store[user_id] = updated_preferences
        
        logger.info("User preferences updated", user_id=user_id)
        return UserPreferences(**updated_preferences)
        
    except Exception as e:
        logger.error("Failed to update user preferences", user_id=str(current_user.id), error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user preferences"
        )


# Workspace Settings Routes
@router.get("/workspace/{workspace_id}/settings")
async def get_workspace_settings(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get workspace settings."""
    try:
        settings = workspace_settings_store.get(workspace_id, {
            "workspace_id": workspace_id,
            "default_dataset_refresh_schedule": None,
            "allow_external_sharing": False,
            "require_approval_for_publishing": True,
            "default_report_theme": "default",
            "auto_save_interval": 300
        })
        
        return WorkspaceSettings(**settings)
        
    except Exception as e:
        logger.error("Failed to get workspace settings", workspace_id=workspace_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve workspace settings"
        )


@router.put("/workspace/{workspace_id}/settings")
async def update_workspace_settings(
    workspace_id: str,
    settings: WorkspaceSettings,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Update workspace settings."""
    try:
        # Get existing settings or defaults
        existing_settings = workspace_settings_store.get(workspace_id, {})
        
        # Update with new values (only non-None values)
        updated_settings = {
            **existing_settings,
            "workspace_id": workspace_id,
            **{k: v for k, v in settings.dict().items() if v is not None and k != "workspace_id"}
        }
        
        # Store updated settings
        workspace_settings_store[workspace_id] = updated_settings
        
        logger.info("Workspace settings updated", workspace_id=workspace_id, user_id=str(current_user.id))
        return WorkspaceSettings(**updated_settings)
        
    except Exception as e:
        logger.error("Failed to update workspace settings", workspace_id=workspace_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update workspace settings"
        )


# Global Settings Routes (Admin only)
@router.get("/global")
async def get_global_settings(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get global application settings."""
    try:
        # In production, check if user is admin
        # For now, return settings for all users
        return GlobalSettings(**global_settings_store)
        
    except Exception as e:
        logger.error("Failed to get global settings", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve global settings"
        )


@router.put("/global")
async def update_global_settings(
    settings: GlobalSettings,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Update global application settings (admin only)."""
    try:
        # In production, check if user is admin
        # For now, allow all users to update (demo purposes)
        
        # Update global settings
        global global_settings_store
        updated_settings = {
            **global_settings_store,
            **{k: v for k, v in settings.dict().items() if v is not None}
        }
        global_settings_store = updated_settings
        
        logger.info("Global settings updated", user_id=str(current_user.id))
        return GlobalSettings(**updated_settings)
        
    except Exception as e:
        logger.error("Failed to update global settings", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update global settings"
        )


# Export/Import Settings
@router.get("/export")
async def export_user_settings(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Export all user settings as JSON."""
    try:
        user_id = str(current_user.id)
        
        export_data = {
            "user_preferences": user_preferences_store.get(user_id, {}),
            "workspace_settings": {
                k: v for k, v in workspace_settings_store.items()
                # In production, filter by workspaces user has access to
            },
            "export_timestamp": "2025-08-31T00:00:00Z",
            "version": "1.1.0"
        }
        
        return export_data
        
    except Exception as e:
        logger.error("Failed to export settings", user_id=str(current_user.id), error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to export settings"
        )


@router.post("/import")
async def import_user_settings(
    settings_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Import user settings from JSON."""
    try:
        user_id = str(current_user.id)
        
        # Import user preferences
        if "user_preferences" in settings_data:
            user_preferences_store[user_id] = settings_data["user_preferences"]
        
        # Import workspace settings (validate access in production)
        if "workspace_settings" in settings_data:
            for workspace_id, settings in settings_data["workspace_settings"].items():
                workspace_settings_store[workspace_id] = settings
        
        logger.info("Settings imported successfully", user_id=user_id)
        return {"message": "Settings imported successfully"}
        
    except Exception as e:
        logger.error("Failed to import settings", user_id=str(current_user.id), error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to import settings"
        )


# Reset Settings
@router.post("/reset")
async def reset_user_settings(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Reset user settings to defaults."""
    try:
        user_id = str(current_user.id)
        
        # Remove user preferences (will use defaults)
        if user_id in user_preferences_store:
            del user_preferences_store[user_id]
        
        logger.info("User settings reset to defaults", user_id=user_id)
        return {"message": "Settings reset to defaults"}
        
    except Exception as e:
        logger.error("Failed to reset settings", user_id=str(current_user.id), error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset settings"
        )