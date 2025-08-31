"""
Redis client configuration and utilities for PowerBI Web Replica.
Handles caching, session storage, and rate limiting.
"""

import json
import time
from typing import Any, Optional, Union
import redis.asyncio as redis
import structlog
from contextlib import asynccontextmanager

from app.core.config import get_settings

logger = structlog.get_logger()
settings = get_settings()

# Global Redis connection pool
redis_pool: Optional[redis.ConnectionPool] = None
redis_client: Optional[redis.Redis] = None


async def init_redis():
    """Initialize Redis connection pool."""
    global redis_pool, redis_client
    
    try:
        # Create connection pool
        redis_pool = redis.ConnectionPool.from_url(
            settings.redis_url,
            password=settings.redis_password,
            encoding="utf-8",
            decode_responses=True,
            max_connections=20,
        )
        
        # Create Redis client
        redis_client = redis.Redis(connection_pool=redis_pool)
        
        # Test connection
        await redis_client.ping()
        logger.info("Redis connection initialized successfully")
        
    except Exception as e:
        logger.error("Failed to initialize Redis", error=str(e))
        raise


async def get_redis_client() -> redis.Redis:
    """Get Redis client instance."""
    if redis_client is None:
        await init_redis()
    return redis_client


@asynccontextmanager
async def get_redis_connection():
    """Context manager for Redis connections."""
    client = await get_redis_client()
    try:
        yield client
    finally:
        # Connection is returned to pool automatically
        pass


class CacheService:
    """Redis-based caching service."""
    
    def __init__(self):
        self.default_ttl = settings.cache_ttl
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        try:
            async with get_redis_connection() as redis:
                value = await redis.get(key)
                if value:
                    return json.loads(value)
                return None
        except Exception as e:
            logger.warning("Cache get failed", key=key, error=str(e))
            return None
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache with TTL."""
        try:
            async with get_redis_connection() as redis:
                ttl = ttl or self.default_ttl
                serialized_value = json.dumps(value)
                await redis.setex(key, ttl, serialized_value)
                return True
        except Exception as e:
            logger.warning("Cache set failed", key=key, error=str(e))
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete key from cache."""
        try:
            async with get_redis_connection() as redis:
                result = await redis.delete(key)
                return result > 0
        except Exception as e:
            logger.warning("Cache delete failed", key=key, error=str(e))
            return False
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in cache."""
        try:
            async with get_redis_connection() as redis:
                result = await redis.exists(key)
                return result > 0
        except Exception as e:
            logger.warning("Cache exists check failed", key=key, error=str(e))
            return False
    
    async def increment(self, key: str, amount: int = 1, ttl: Optional[int] = None) -> int:
        """Increment counter in cache."""
        try:
            async with get_redis_connection() as redis:
                result = await redis.incrby(key, amount)
                if ttl and result == amount:  # First increment, set TTL
                    await redis.expire(key, ttl)
                return result
        except Exception as e:
            logger.warning("Cache increment failed", key=key, error=str(e))
            return 0
    
    async def get_many(self, keys: list[str]) -> dict[str, Any]:
        """Get multiple values from cache."""
        try:
            async with get_redis_connection() as redis:
                values = await redis.mget(keys)
                result = {}
                for key, value in zip(keys, values):
                    if value:
                        try:
                            result[key] = json.loads(value)
                        except json.JSONDecodeError:
                            result[key] = None
                    else:
                        result[key] = None
                return result
        except Exception as e:
            logger.warning("Cache get_many failed", keys=keys, error=str(e))
            return {key: None for key in keys}
    
    async def set_many(self, data: dict[str, Any], ttl: Optional[int] = None) -> bool:
        """Set multiple values in cache."""
        try:
            async with get_redis_connection() as redis:
                ttl = ttl or self.default_ttl
                pipe = redis.pipeline()
                
                for key, value in data.items():
                    serialized_value = json.dumps(value)
                    pipe.setex(key, ttl, serialized_value)
                
                await pipe.execute()
                return True
        except Exception as e:
            logger.warning("Cache set_many failed", error=str(e))
            return False
    
    async def clear_pattern(self, pattern: str) -> int:
        """Clear all keys matching a pattern."""
        try:
            async with get_redis_connection() as redis:
                keys = await redis.keys(pattern)
                if keys:
                    return await redis.delete(*keys)
                return 0
        except Exception as e:
            logger.warning("Cache clear_pattern failed", pattern=pattern, error=str(e))
            return 0


class SessionService:
    """Redis-based session management."""
    
    def __init__(self):
        self.session_prefix = "session:"
        self.default_ttl = settings.jwt_expire_minutes * 60  # Convert to seconds
    
    async def create_session(self, user_id: str, data: dict) -> str:
        """Create new session."""
        import uuid
        session_id = str(uuid.uuid4())
        session_key = f"{self.session_prefix}{session_id}"
        
        session_data = {
            "user_id": user_id,
            "created_at": time.time(),
            **data
        }
        
        try:
            async with get_redis_connection() as redis:
                await redis.setex(session_key, self.default_ttl, json.dumps(session_data))
                return session_id
        except Exception as e:
            logger.error("Failed to create session", error=str(e))
            raise
    
    async def get_session(self, session_id: str) -> Optional[dict]:
        """Get session data."""
        session_key = f"{self.session_prefix}{session_id}"
        
        try:
            async with get_redis_connection() as redis:
                data = await redis.get(session_key)
                if data:
                    return json.loads(data)
                return None
        except Exception as e:
            logger.warning("Failed to get session", session_id=session_id, error=str(e))
            return None
    
    async def update_session(self, session_id: str, data: dict) -> bool:
        """Update session data."""
        session_key = f"{self.session_prefix}{session_id}"
        
        try:
            async with get_redis_connection() as redis:
                # Get current data
                current_data = await redis.get(session_key)
                if not current_data:
                    return False
                
                # Merge with new data
                session_data = json.loads(current_data)
                session_data.update(data)
                session_data["updated_at"] = time.time()
                
                # Set with original TTL
                ttl = await redis.ttl(session_key)
                await redis.setex(session_key, ttl, json.dumps(session_data))
                return True
        except Exception as e:
            logger.warning("Failed to update session", session_id=session_id, error=str(e))
            return False
    
    async def delete_session(self, session_id: str) -> bool:
        """Delete session."""
        session_key = f"{self.session_prefix}{session_id}"
        
        try:
            async with get_redis_connection() as redis:
                result = await redis.delete(session_key)
                return result > 0
        except Exception as e:
            logger.warning("Failed to delete session", session_id=session_id, error=str(e))
            return False


class RateLimitService:
    """Redis-based rate limiting service."""
    
    def __init__(self):
        self.rate_limit_prefix = "rate_limit:"
        self.default_window = settings.rate_limit_window
        self.default_limit = settings.rate_limit_requests
    
    async def is_rate_limited(self, key: str, limit: Optional[int] = None, window: Optional[int] = None) -> bool:
        """Check if key is rate limited."""
        limit = limit or self.default_limit
        window = window or self.default_window
        rate_key = f"{self.rate_limit_prefix}{key}"
        
        try:
            async with get_redis_connection() as redis:
                current = await redis.incr(rate_key)
                if current == 1:
                    await redis.expire(rate_key, window)
                
                return current > limit
        except Exception as e:
            logger.warning("Rate limit check failed", key=key, error=str(e))
            return False  # Fail open
    
    async def get_rate_limit_status(self, key: str, limit: Optional[int] = None) -> dict:
        """Get current rate limit status."""
        limit = limit or self.default_limit
        rate_key = f"{self.rate_limit_prefix}{key}"
        
        try:
            async with get_redis_connection() as redis:
                current = await redis.get(rate_key) or 0
                ttl = await redis.ttl(rate_key)
                
                return {
                    "current": int(current),
                    "limit": limit,
                    "remaining": max(0, limit - int(current)),
                    "reset_in": max(0, ttl)
                }
        except Exception as e:
            logger.warning("Rate limit status check failed", key=key, error=str(e))
            return {
                "current": 0,
                "limit": limit,
                "remaining": limit,
                "reset_in": 0
            }


# Service instances
cache_service = CacheService()
session_service = SessionService()
rate_limit_service = RateLimitService()


async def check_redis_connection() -> bool:
    """Check Redis connectivity for health checks."""
    try:
        async with get_redis_connection() as redis:
            await redis.ping()
        return True
    except Exception as e:
        logger.error("Redis health check failed", error=str(e))
        return False