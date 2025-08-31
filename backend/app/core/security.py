"""
Security utilities for PowerBI Web Replica.
Handles authentication, authorization, password hashing, and JWT tokens.
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import structlog

from app.core.config import get_settings
from app.core.database import get_async_session

logger = structlog.get_logger()
settings = get_settings()

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT token scheme
bearer_scheme = HTTPBearer()


class SecurityUtils:
    """Security utility functions."""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using bcrypt."""
        return pwd_context.hash(password)
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash."""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """Create a JWT access token."""
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.jwt_expire_minutes)
        
        to_encode.update({"exp": expire, "iat": datetime.utcnow()})
        
        encoded_jwt = jwt.encode(
            to_encode, 
            settings.jwt_secret_key, 
            algorithm=settings.jwt_algorithm
        )
        
        return encoded_jwt
    
    @staticmethod
    def create_refresh_token(data: Dict[str, Any]) -> str:
        """Create a JWT refresh token with longer expiration."""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=30)  # 30 days for refresh token
        to_encode.update({"exp": expire, "iat": datetime.utcnow(), "type": "refresh"})
        
        encoded_jwt = jwt.encode(
            to_encode, 
            settings.jwt_secret_key, 
            algorithm=settings.jwt_algorithm
        )
        
        return encoded_jwt
    
    @staticmethod
    def verify_token(token: str) -> Dict[str, Any]:
        """Verify and decode a JWT token."""
        try:
            payload = jwt.decode(
                token, 
                settings.jwt_secret_key, 
                algorithms=[settings.jwt_algorithm]
            )
            
            # Check if token is expired
            exp = payload.get("exp")
            if exp and datetime.utcfromtimestamp(exp) < datetime.utcnow():
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token has expired",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            return payload
            
        except JWTError as e:
            logger.warning("JWT verification failed", error=str(e))
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    @staticmethod
    def create_embed_token(report_id: str, permissions: list[str], expires_delta: Optional[timedelta] = None) -> str:
        """Create a secure embed token for report embedding."""
        data = {
            "report_id": report_id,
            "permissions": permissions,
            "type": "embed"
        }
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(hours=1)  # Default 1 hour for embed tokens
        
        data.update({"exp": expire, "iat": datetime.utcnow()})
        
        encoded_jwt = jwt.encode(
            data, 
            settings.jwt_secret_key, 
            algorithm=settings.jwt_algorithm
        )
        
        return encoded_jwt
    
    @staticmethod
    def verify_embed_token(token: str) -> Dict[str, Any]:
        """Verify an embed token and return its payload."""
        try:
            payload = jwt.decode(
                token, 
                settings.jwt_secret_key, 
                algorithms=[settings.jwt_algorithm]
            )
            
            # Check token type
            if payload.get("type") != "embed":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token type",
                )
            
            # Check expiration
            exp = payload.get("exp")
            if exp and datetime.utcfromtimestamp(exp) < datetime.utcnow():
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Embed token has expired",
                )
            
            return payload
            
        except JWTError as e:
            logger.warning("Embed token verification failed", error=str(e))
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid embed token",
            )


# Global security utils instance
security = SecurityUtils()


async def get_current_user_token(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> Dict[str, Any]:
    """Extract and verify JWT token from request headers."""
    token = credentials.credentials
    payload = security.verify_token(token)
    
    # Extract user ID from token
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user ID",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return payload


async def get_current_user(
    token_payload: Dict[str, Any] = Depends(get_current_user_token),
    session = Depends(get_async_session)
):
    """Get current user from database based on token."""
    from app.services.user_service import UserService
    
    user_id = token_payload.get("sub")
    user_service = UserService(session)
    user = await user_service.get_user_by_id(user_id)
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    return user


class RoleChecker:
    """Role-based access control checker."""
    
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles
    
    def __call__(self, current_user=Depends(get_current_user)):
        """Check if user has required role."""
        if not any(role in current_user.roles for role in self.allowed_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        return current_user


class PermissionChecker:
    """Permission-based access control checker."""
    
    def __init__(self, required_permission: str, resource_type: Optional[str] = None):
        self.required_permission = required_permission
        self.resource_type = resource_type
    
    def __call__(self, resource_id: Optional[str] = None, current_user=Depends(get_current_user)):
        """Check if user has required permission on resource."""
        from app.services.permission_service import PermissionService
        
        # For now, implement basic permission checking
        # In a full implementation, this would check database permissions
        if self.required_permission == "admin" and not current_user.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        return current_user


# Common role checkers
require_admin = RoleChecker(["admin"])
require_editor = RoleChecker(["admin", "editor"])
require_viewer = RoleChecker(["admin", "editor", "viewer"])

# Common permission checkers
require_workspace_access = PermissionChecker("workspace:read", "workspace")
require_workspace_edit = PermissionChecker("workspace:write", "workspace")
require_report_access = PermissionChecker("report:read", "report")
require_report_edit = PermissionChecker("report:write", "report")