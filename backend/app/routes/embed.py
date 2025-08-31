"""
Embed routes for PowerBI Web Replica.
Handles secure embedding and token generation for external sharing.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.core.database import get_async_session
from app.core.security import get_current_user, security
from app.models.user import User

logger = structlog.get_logger()
router = APIRouter()


class EmbedTokenRequest(BaseModel):
    """Embed token request model."""
    report_id: str
    expires_in: int = 3600  # 1 hour default
    permissions: list[str] = ["view"]


@router.post("/token")
async def create_embed_token(
    token_request: EmbedTokenRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Create secure embed token for report."""
    # TODO: Implement proper permission checking and token generation
    
    embed_token = security.create_embed_token(
        report_id=token_request.report_id,
        permissions=token_request.permissions
    )
    
    return {
        "embed_token": embed_token,
        "embed_url": f"/embed/report/{token_request.report_id}",
        "expires_in": token_request.expires_in
    }