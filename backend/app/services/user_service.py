"""
User service for PowerBI Web Replica.
Handles user management, authentication, and profile operations.
"""

from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
import structlog

from app.models.user import User
from app.models.workspace import Workspace
from app.core.security import security

logger = structlog.get_logger()


class UserService:
    """Service class for user operations."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID."""
        try:
            stmt = select(User).where(User.id == user_id)
            result = await self.session.execute(stmt)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error("Failed to get user by ID", user_id=user_id, error=str(e))
            return None
    
    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email address."""
        try:
            stmt = select(User).where(User.email == email)
            result = await self.session.execute(stmt)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error("Failed to get user by email", email=email, error=str(e))
            return None
    
    async def create_user(self, user_data: Dict[str, Any]) -> User:
        """Create new user account."""
        try:
            # Hash password
            hashed_password = security.hash_password(user_data["password"])
            
            # Create user instance
            user = User(
                email=user_data["email"],
                hashed_password=hashed_password,
                name=user_data["name"],
                timezone=user_data.get("timezone", "UTC"),
                locale=user_data.get("locale", "en"),
                is_active=True,
                is_verified=False,  # Will be verified via email
                preferences=user_data.get("preferences", {})
            )
            
            self.session.add(user)
            await self.session.flush()  # Get the ID
            await self.session.refresh(user)
            
            # Create default workspace for user
            default_workspace = Workspace(
                name=f"{user.name}'s Workspace",
                description="Default workspace",
                owner_id=user.id
            )
            
            self.session.add(default_workspace)
            await self.session.commit()
            
            logger.info("User created successfully", user_id=str(user.id), email=user.email)
            return user
            
        except Exception as e:
            await self.session.rollback()
            logger.error("Failed to create user", error=str(e))
            raise
    
    async def authenticate_user(self, email: str, password: str) -> Optional[User]:
        """Authenticate user with email and password."""
        try:
            user = await self.get_user_by_email(email)
            if not user:
                return None
            
            if not security.verify_password(password, user.hashed_password):
                return None
            
            return user
            
        except Exception as e:
            logger.error("Authentication failed", email=email, error=str(e))
            return None
    
    async def update_user(self, user_id: str, update_data: Dict[str, Any]) -> Optional[User]:
        """Update user information."""
        try:
            # Hash password if provided
            if "password" in update_data:
                update_data["hashed_password"] = security.hash_password(update_data.pop("password"))
            
            stmt = (
                update(User)
                .where(User.id == user_id)
                .values(**update_data)
                .returning(User)
            )
            
            result = await self.session.execute(stmt)
            await self.session.commit()
            
            updated_user = result.scalar_one_or_none()
            if updated_user:
                logger.info("User updated successfully", user_id=user_id)
            
            return updated_user
            
        except Exception as e:
            await self.session.rollback()
            logger.error("Failed to update user", user_id=user_id, error=str(e))
            return None
    
    async def update_last_login(self, user_id: str) -> bool:
        """Update user's last login timestamp."""
        try:
            stmt = (
                update(User)
                .where(User.id == user_id)
                .values(
                    last_login=datetime.utcnow(),
                    last_seen=datetime.utcnow()
                )
            )
            
            await self.session.execute(stmt)
            await self.session.commit()
            return True
            
        except Exception as e:
            logger.error("Failed to update last login", user_id=user_id, error=str(e))
            return False
    
    async def update_preferences(self, user_id: str, preferences: Dict[str, Any]) -> Optional[User]:
        """Update user preferences."""
        try:
            user = await self.get_user_by_id(user_id)
            if not user:
                return None
            
            # Merge with existing preferences
            current_prefs = user.preferences or {}
            current_prefs.update(preferences)
            
            return await self.update_user(user_id, {"preferences": current_prefs})
            
        except Exception as e:
            logger.error("Failed to update preferences", user_id=user_id, error=str(e))
            return None
    
    async def deactivate_user(self, user_id: str) -> bool:
        """Deactivate user account."""
        try:
            result = await self.update_user(user_id, {"is_active": False})
            return result is not None
        except Exception as e:
            logger.error("Failed to deactivate user", user_id=user_id, error=str(e))
            return False
    
    async def activate_user(self, user_id: str) -> bool:
        """Activate user account."""
        try:
            result = await self.update_user(user_id, {"is_active": True})
            return result is not None
        except Exception as e:
            logger.error("Failed to activate user", user_id=user_id, error=str(e))
            return False
    
    async def verify_email(self, user_id: str) -> bool:
        """Mark user email as verified."""
        try:
            result = await self.update_user(user_id, {"is_verified": True})
            return result is not None
        except Exception as e:
            logger.error("Failed to verify email", user_id=user_id, error=str(e))
            return False
    
    async def get_user_workspaces(self, user_id: str) -> list[Workspace]:
        """Get all workspaces owned by user."""
        try:
            stmt = (
                select(User)
                .options(selectinload(User.owned_workspaces))
                .where(User.id == user_id)
            )
            
            result = await self.session.execute(stmt)
            user = result.scalar_one_or_none()
            
            return user.owned_workspaces if user else []
            
        except Exception as e:
            logger.error("Failed to get user workspaces", user_id=user_id, error=str(e))
            return []
    
    async def delete_user(self, user_id: str) -> bool:
        """Delete user account and all associated data."""
        try:
            # In a production system, this would:
            # 1. Transfer workspace ownership or delete workspaces
            # 2. Delete user's reports and dashboards
            # 3. Clean up permissions
            # 4. Archive data for compliance
            # For now, we'll just deactivate
            
            return await self.deactivate_user(user_id)
            
        except Exception as e:
            logger.error("Failed to delete user", user_id=user_id, error=str(e))
            return False