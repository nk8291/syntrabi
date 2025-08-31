"""
Database configuration and session management for PowerBI Web Replica.
Handles SQLAlchemy setup, connection pooling, and async session management.
"""

from contextlib import asynccontextmanager
from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.pool import QueuePool
import structlog
from typing import AsyncGenerator

from app.core.config import get_settings

logger = structlog.get_logger()
settings = get_settings()

# Database URL conversion for async
ASYNC_DATABASE_URL = settings.database_url.replace("postgresql://", "postgresql+asyncpg://")

# Create async engine with connection pooling
async_engine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=settings.db_echo,
    poolclass=QueuePool,
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    pool_pre_ping=True,  # Validate connections before use
    pool_recycle=3600,   # Recycle connections every hour
)

# Create async session factory
async_session_factory = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=True,
    autocommit=False,
)

# Create sync engine for migrations
sync_engine = create_engine(
    settings.database_url,
    echo=settings.db_echo,
    poolclass=QueuePool,
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
)

# Base class for all models
Base = declarative_base()

# Metadata for migrations
metadata = MetaData()


async def init_db():
    """Initialize database connection and create tables if needed."""
    try:
        async with async_engine.begin() as conn:
            # Import all models to ensure they are registered
            from app.models import user, workspace, dataset, report, job, permission
            
            # Create all tables
            await conn.run_sync(Base.metadata.create_all)
            logger.info("Database tables created successfully")
            
    except Exception as e:
        logger.error("Failed to initialize database", error=str(e))
        raise


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """Get async database session for dependency injection."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error("Database session error", error=str(e))
            raise
        finally:
            await session.close()


@asynccontextmanager
async def get_session():
    """Context manager for database sessions."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def check_db_connection():
    """Check database connectivity for health checks."""
    try:
        async with async_engine.connect() as conn:
            await conn.execute("SELECT 1")
        return True
    except Exception as e:
        logger.error("Database health check failed", error=str(e))
        return False


class DatabaseHealthCheck:
    """Database health check utility."""
    
    @staticmethod
    async def check() -> bool:
        """Perform database health check."""
        return await check_db_connection()