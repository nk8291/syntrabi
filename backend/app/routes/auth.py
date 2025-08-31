"""
Authentication routes for PowerBI Web Replica.
Handles user login, registration, token management, and OAuth flows.
"""

from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.core.database import get_async_session
from app.core.security import security, get_current_user, get_current_user_token
from app.services.user_service import UserService
from app.core.redis_client import session_service

logger = structlog.get_logger()
router = APIRouter()


# Request/Response Models
class LoginRequest(BaseModel):
    """Login request model."""
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    """User registration request model."""
    email: EmailStr
    password: str
    name: str
    timezone: str = "UTC"
    locale: str = "en"


class TokenResponse(BaseModel):
    """Token response model."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_token: Optional[str] = None
    user: dict


class RefreshTokenRequest(BaseModel):
    """Refresh token request model."""
    refresh_token: str


class UserResponse(BaseModel):
    """User response model."""
    id: str
    email: str
    name: str
    avatar_url: Optional[str]
    timezone: str
    locale: str
    is_active: bool
    is_verified: bool
    is_admin: bool
    preferences: dict
    created_at: Optional[str]
    updated_at: Optional[str]
    last_login: Optional[str]


# Authentication Endpoints
@router.post("/login", response_model=TokenResponse)
async def login(
    login_data: LoginRequest,
    session: AsyncSession = Depends(get_async_session)
):
    """Authenticate user and return access token."""
    try:
        user_service = UserService(session)
        
        # Authenticate user
        user = await user_service.authenticate_user(login_data.email, login_data.password)
        if not user:
            logger.warning("Login attempt failed", email=login_data.email)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account is inactive",
            )
        
        # Create access token
        access_token_expires = timedelta(minutes=30)  # Short-lived access token
        access_token = security.create_access_token(
            data={"sub": str(user.id), "email": user.email, "name": user.name},
            expires_delta=access_token_expires
        )
        
        # Create refresh token
        refresh_token = security.create_refresh_token(
            data={"sub": str(user.id), "email": user.email}
        )
        
        # Update last login
        await user_service.update_last_login(user.id)
        
        # Create session
        await session_service.create_session(
            str(user.id), 
            {
                "email": user.email,
                "name": user.name,
                "login_time": datetime.utcnow().isoformat()
            }
        )
        
        logger.info("User logged in successfully", user_id=str(user.id), email=user.email)
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=int(access_token_expires.total_seconds()),
            refresh_token=refresh_token,
            user=user.to_dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Login failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )


@router.post("/register", response_model=TokenResponse)
async def register(
    register_data: RegisterRequest,
    session: AsyncSession = Depends(get_async_session)
):
    """Register new user account."""
    try:
        user_service = UserService(session)
        
        # Check if user already exists
        existing_user = await user_service.get_user_by_email(register_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create new user
        user_data = {
            "email": register_data.email,
            "password": register_data.password,
            "name": register_data.name,
            "timezone": register_data.timezone,
            "locale": register_data.locale,
        }
        
        user = await user_service.create_user(user_data)
        
        # Create tokens
        access_token_expires = timedelta(minutes=30)
        access_token = security.create_access_token(
            data={"sub": str(user.id), "email": user.email, "name": user.name},
            expires_delta=access_token_expires
        )
        
        refresh_token = security.create_refresh_token(
            data={"sub": str(user.id), "email": user.email}
        )
        
        # Create session
        await session_service.create_session(
            str(user.id),
            {
                "email": user.email,
                "name": user.name,
                "registration_time": datetime.utcnow().isoformat()
            }
        )
        
        logger.info("User registered successfully", user_id=str(user.id), email=user.email)
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer", 
            expires_in=int(access_token_expires.total_seconds()),
            refresh_token=refresh_token,
            user=user.to_dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Registration failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    refresh_data: RefreshTokenRequest,
    session: AsyncSession = Depends(get_async_session)
):
    """Refresh access token using refresh token."""
    try:
        # Verify refresh token
        payload = security.verify_token(refresh_data.refresh_token)
        
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )
        
        # Get user from database
        user_service = UserService(session)
        user = await user_service.get_user_by_id(user_id)
        
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )
        
        # Create new access token
        access_token_expires = timedelta(minutes=30)
        access_token = security.create_access_token(
            data={"sub": str(user.id), "email": user.email, "name": user.name},
            expires_delta=access_token_expires
        )
        
        logger.info("Token refreshed successfully", user_id=str(user.id))
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=int(access_token_expires.total_seconds()),
            user=user.to_dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Token refresh failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token refresh failed"
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user=Depends(get_current_user)
):
    """Get current authenticated user information."""
    return UserResponse(**current_user.to_dict())


@router.post("/logout")
async def logout(
    token_payload=Depends(get_current_user_token)
):
    """Logout user by invalidating session."""
    try:
        user_id = token_payload.get("sub")
        
        # In a production system, you would:
        # 1. Add token to blacklist
        # 2. Remove from session storage
        # 3. Clear any cached user data
        
        logger.info("User logged out", user_id=user_id)
        
        return {"message": "Logged out successfully"}
        
    except Exception as e:
        logger.error("Logout failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )


@router.post("/verify-email")
async def verify_email(
    token: str,
    session: AsyncSession = Depends(get_async_session)
):
    """Verify user email address."""
    # Implementation for email verification
    # This would typically involve checking a verification token
    # and updating the user's is_verified status
    pass


@router.post("/forgot-password")
async def forgot_password(
    email: EmailStr,
    session: AsyncSession = Depends(get_async_session)
):
    """Send password reset email."""
    # Implementation for password reset
    # This would typically involve:
    # 1. Generate reset token
    # 2. Send email with reset link
    # 3. Store token with expiration
    pass


@router.post("/reset-password")
async def reset_password(
    token: str,
    new_password: str,
    session: AsyncSession = Depends(get_async_session)
):
    """Reset password using reset token."""
    # Implementation for password reset
    # This would typically involve:
    # 1. Verify reset token
    # 2. Update user password
    # 3. Invalidate reset token
    pass


# OAuth endpoints (placeholder for future implementation)
@router.get("/oauth/{provider}")
async def oauth_redirect(provider: str):
    """Initiate OAuth flow with provider."""
    # Implementation for OAuth redirect
    # Supports: google, microsoft, github, etc.
    pass


@router.get("/oauth/{provider}/callback")
async def oauth_callback(
    provider: str,
    code: str,
    state: Optional[str] = None,
    session: AsyncSession = Depends(get_async_session)
):
    """Handle OAuth callback and create/login user."""
    # Implementation for OAuth callback handling
    # 1. Exchange code for access token
    # 2. Get user info from provider
    # 3. Create or login user
    # 4. Return JWT tokens
    pass