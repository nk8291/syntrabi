"""
Configuration settings for PowerBI Web Replica backend.
Uses Pydantic Settings for environment variable management with validation.
"""

from functools import lru_cache
from typing import List, Optional
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings
import os


class Settings(BaseSettings):
    """Application settings with environment variable support."""
    
    # Application
    app_name: str = "PowerBI Web Replica"
    environment: str = Field(default="development", env="ENVIRONMENT")
    debug: bool = Field(default=False, env="DEBUG")
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    
    # Database
    database_url: str = Field(env="DATABASE_URL")
    db_echo: bool = Field(default=False, env="DB_ECHO")
    db_pool_size: int = Field(default=10, env="DB_POOL_SIZE")
    db_max_overflow: int = Field(default=20, env="DB_MAX_OVERFLOW")
    
    # Redis
    redis_url: str = Field(default="redis://localhost:6379", env="REDIS_URL")
    redis_password: Optional[str] = Field(default=None, env="REDIS_PASSWORD")
    
    # Authentication
    jwt_secret_key: str = Field(env="JWT_SECRET_KEY")
    jwt_algorithm: str = Field(default="HS256", env="JWT_ALGORITHM")
    jwt_expire_minutes: int = Field(default=1440, env="JWT_EXPIRE_MINUTES")  # 24 hours
    
    # CORS
    cors_origins: str = Field(
        default="http://localhost:3000,http://localhost:5173",
        env="CORS_ORIGINS"
    )
    
    # Object Storage (S3/MinIO)
    s3_endpoint: str = Field(default="http://localhost:9000", env="S3_ENDPOINT")
    s3_access_key: str = Field(default="minioadmin", env="S3_ACCESS_KEY")
    s3_secret_key: str = Field(default="minioadmin", env="S3_SECRET_KEY")
    s3_bucket: str = Field(default="powerbi-data", env="S3_BUCKET")
    s3_region: str = Field(default="us-east-1", env="S3_REGION")
    s3_secure: bool = Field(default=False, env="S3_SECURE")
    
    # File Upload
    max_upload_size: int = Field(default=104857600, env="MAX_UPLOAD_SIZE")  # 100MB
    allowed_extensions: str = Field(
        default="csv,xlsx,json,parquet",
        env="ALLOWED_EXTENSIONS"
    )
    
    # Performance
    query_timeout: int = Field(default=30, env="QUERY_TIMEOUT")
    query_row_limit: int = Field(default=10000, env="QUERY_ROW_LIMIT")
    cache_ttl: int = Field(default=3600, env="CACHE_TTL")  # 1 hour
    
    # Rate Limiting
    rate_limit_requests: int = Field(default=1000, env="RATE_LIMIT_REQUESTS")
    rate_limit_window: int = Field(default=3600, env="RATE_LIMIT_WINDOW")  # 1 hour
    
    # External Services
    celery_broker_url: str = Field(
        default="redis://localhost:6379/0", 
        env="CELERY_BROKER_URL"
    )
    celery_result_backend: str = Field(
        default="redis://localhost:6379/1", 
        env="CELERY_RESULT_BACKEND"
    )
    
    # Email (for report scheduling)
    smtp_host: Optional[str] = Field(default=None, env="SMTP_HOST")
    smtp_port: int = Field(default=587, env="SMTP_PORT")
    smtp_user: Optional[str] = Field(default=None, env="SMTP_USER")
    smtp_password: Optional[str] = Field(default=None, env="SMTP_PASSWORD")
    smtp_tls: bool = Field(default=True, env="SMTP_TLS")
    email_from: str = Field(default="noreply@powerbi.local", env="EMAIL_FROM")
    
    # Monitoring
    sentry_dsn: Optional[str] = Field(default=None, env="SENTRY_DSN")
    prometheus_enabled: bool = Field(default=False, env="PROMETHEUS_ENABLED")
    
    # Feature Flags
    enable_offline_mode: bool = Field(default=True, env="ENABLE_OFFLINE_MODE")
    enable_real_time_collaboration: bool = Field(default=False, env="ENABLE_REAL_TIME_COLLABORATION")
    enable_advanced_exports: bool = Field(default=True, env="ENABLE_ADVANCED_EXPORTS")
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from string."""
        return [i.strip() for i in self.cors_origins.split(",")]
    
    @property 
    def allowed_extensions_list(self) -> List[str]:
        """Parse allowed file extensions from string."""
        return [ext.strip().lower() for ext in self.allowed_extensions.split(",")]
    
    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, v):
        """Ensure database URL is provided."""
        if not v:
            raise ValueError("DATABASE_URL is required")
        return v
    
    @field_validator("jwt_secret_key")
    @classmethod
    def validate_jwt_secret(cls, v):
        """Ensure JWT secret key is provided and secure."""
        if not v:
            raise ValueError("JWT_SECRET_KEY is required")
        if len(v) < 32:
            raise ValueError("JWT_SECRET_KEY must be at least 32 characters long")
        return v
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()