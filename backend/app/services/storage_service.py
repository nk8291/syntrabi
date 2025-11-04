"""
Object Storage Service for PowerBI Web Replica
Handles file uploads, reports, and dataset storage using MinIO/S3
"""

import io
import json
import uuid
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime, timedelta
import structlog
from minio import Minio
from minio.error import S3Error
import asyncio
from concurrent.futures import ThreadPoolExecutor

from app.core.config import get_settings

logger = structlog.get_logger()
settings = get_settings()

class StorageService:
    """MinIO/S3 object storage service"""
    
    def __init__(self):
        self.client = None
        self.bucket_name = settings.s3_bucket
        self.executor = ThreadPoolExecutor(max_workers=4)
        
    async def initialize(self):
        """Initialize MinIO client and create bucket if needed"""
        try:
            # Create MinIO client
            self.client = Minio(
                endpoint=settings.s3_endpoint.replace('http://', '').replace('https://', ''),
                access_key=settings.s3_access_key,
                secret_key=settings.s3_secret_key,
                secure=settings.s3_secure
            )
            
            # Create bucket if it doesn't exist
            if not self.client.bucket_exists(self.bucket_name):
                self.client.make_bucket(self.bucket_name)
                logger.info("Created storage bucket", bucket=self.bucket_name)
            
            logger.info("Storage service initialized", endpoint=settings.s3_endpoint)
            
        except Exception as e:
            logger.error("Failed to initialize storage service", error=str(e))
            raise
    
    async def upload_file(self, file_content: bytes, file_path: str, content_type: str = 'application/octet-stream') -> str:
        """Upload file to storage and return the key"""
        try:
            # Run in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            
            def _upload():
                file_stream = io.BytesIO(file_content)
                self.client.put_object(
                    bucket_name=self.bucket_name,
                    object_name=file_path,
                    data=file_stream,
                    length=len(file_content),
                    content_type=content_type
                )
                return file_path
            
            result = await loop.run_in_executor(self.executor, _upload)
            
            logger.info("File uploaded successfully", 
                       file_path=file_path, 
                       size=len(file_content),
                       content_type=content_type)
            
            return result
            
        except Exception as e:
            logger.error("Failed to upload file", file_path=file_path, error=str(e))
            raise
    
    async def download_file(self, file_path: str) -> Optional[bytes]:
        """Download file from storage"""
        try:
            loop = asyncio.get_event_loop()
            
            def _download():
                response = self.client.get_object(self.bucket_name, file_path)
                return response.read()
            
            result = await loop.run_in_executor(self.executor, _download)
            
            logger.info("File downloaded successfully", file_path=file_path, size=len(result))
            return result
            
        except Exception as e:
            if "NoSuchKey" in str(e) or "not found" in str(e).lower():
                logger.warning("File not found", file_path=file_path)
                return None
            logger.error("Failed to download file", file_path=file_path, error=str(e))
            raise
    
    async def delete_file(self, file_path: str) -> bool:
        """Delete file from storage"""
        try:
            loop = asyncio.get_event_loop()
            
            def _delete():
                self.client.remove_object(self.bucket_name, file_path)
                return True
            
            result = await loop.run_in_executor(self.executor, _delete)
            
            logger.info("File deleted successfully", file_path=file_path)
            return result
            
        except Exception as e:
            if "NoSuchKey" in str(e) or "not found" in str(e).lower():
                logger.warning("File not found for deletion", file_path=file_path)
                return False
            logger.error("Failed to delete file", file_path=file_path, error=str(e))
            raise
    
    async def file_exists(self, file_path: str) -> bool:
        """Check if file exists in storage"""
        try:
            loop = asyncio.get_event_loop()
            
            def _check():
                try:
                    self.client.stat_object(self.bucket_name, file_path)
                    return True
                except Exception as e:
                    if "NoSuchKey" in str(e) or "not found" in str(e).lower():
                        return False
                    raise
            
            result = await loop.run_in_executor(self.executor, _check)
            return result
            
        except Exception as e:
            logger.error("Failed to check file existence", file_path=file_path, error=str(e))
            return False
    
    async def get_file_info(self, file_path: str) -> Optional[Dict[str, Any]]:
        """Get file metadata"""
        try:
            loop = asyncio.get_event_loop()
            
            def _get_info():
                try:
                    stat = self.client.stat_object(self.bucket_name, file_path)
                    return {
                        'size': stat.size,
                        'etag': stat.etag,
                        'content_type': stat.content_type,
                        'last_modified': stat.last_modified.isoformat() if stat.last_modified else None
                    }
                except Exception as e:
                    if "NoSuchKey" in str(e) or "not found" in str(e).lower():
                        return None
                    raise
            
            result = await loop.run_in_executor(self.executor, _get_info)
            return result
            
        except Exception as e:
            logger.error("Failed to get file info", file_path=file_path, error=str(e))
            return None
    
    async def list_files(self, prefix: str = "", max_keys: int = 1000) -> List[Dict[str, Any]]:
        """List files in storage with optional prefix filter"""
        try:
            loop = asyncio.get_event_loop()
            
            def _list():
                objects = self.client.list_objects(
                    bucket_name=self.bucket_name,
                    prefix=prefix,
                    recursive=True
                )
                
                files = []
                for obj in objects:
                    files.append({
                        'key': obj.object_name,
                        'size': obj.size,
                        'etag': obj.etag,
                        'last_modified': obj.last_modified.isoformat() if obj.last_modified else None
                    })
                    
                    if len(files) >= max_keys:
                        break
                        
                return files
            
            result = await loop.run_in_executor(self.executor, _list)
            
            logger.info("Listed files", prefix=prefix, count=len(result))
            return result
            
        except Exception as e:
            logger.error("Failed to list files", prefix=prefix, error=str(e))
            return []
    
    async def generate_presigned_url(self, file_path: str, expires_in: timedelta = timedelta(hours=1)) -> Optional[str]:
        """Generate presigned URL for direct file access"""
        try:
            loop = asyncio.get_event_loop()
            
            def _generate():
                return self.client.presigned_get_object(
                    bucket_name=self.bucket_name,
                    object_name=file_path,
                    expires=expires_in
                )
            
            result = await loop.run_in_executor(self.executor, _generate)
            
            logger.info("Generated presigned URL", file_path=file_path, expires_in=str(expires_in))
            return result
            
        except Exception as e:
            logger.error("Failed to generate presigned URL", file_path=file_path, error=str(e))
            return None

class ReportStorageService:
    """Specialized service for storing PowerBI reports"""
    
    def __init__(self, storage: StorageService):
        self.storage = storage
        self.reports_prefix = "reports/"
        self.thumbnails_prefix = "thumbnails/"
    
    async def save_report(self, report_id: str, report_data: Dict[str, Any]) -> str:
        """Save report JSON to storage"""
        file_path = f"{self.reports_prefix}{report_id}.json"
        report_json = json.dumps(report_data, indent=2)
        
        await self.storage.upload_file(
            file_content=report_json.encode('utf-8'),
            file_path=file_path,
            content_type='application/json'
        )
        
        return file_path
    
    async def load_report(self, report_id: str) -> Optional[Dict[str, Any]]:
        """Load report JSON from storage"""
        file_path = f"{self.reports_prefix}{report_id}.json"
        
        content = await self.storage.download_file(file_path)
        if content:
            return json.loads(content.decode('utf-8'))
        return None
    
    async def save_thumbnail(self, report_id: str, image_data: bytes, format: str = 'png') -> str:
        """Save report thumbnail"""
        file_path = f"{self.thumbnails_prefix}{report_id}.{format}"
        content_type = f'image/{format}'
        
        await self.storage.upload_file(
            file_content=image_data,
            file_path=file_path,
            content_type=content_type
        )
        
        return file_path
    
    async def get_thumbnail_url(self, report_id: str, format: str = 'png') -> Optional[str]:
        """Get presigned URL for report thumbnail"""
        file_path = f"{self.thumbnails_prefix}{report_id}.{format}"
        
        if await self.storage.file_exists(file_path):
            return await self.storage.generate_presigned_url(file_path)
        return None
    
    async def delete_report(self, report_id: str) -> bool:
        """Delete report and its thumbnail"""
        report_path = f"{self.reports_prefix}{report_id}.json"
        thumbnail_path = f"{self.thumbnails_prefix}{report_id}.png"
        
        # Delete both files
        await self.storage.delete_file(report_path)
        await self.storage.delete_file(thumbnail_path)
        
        return True

class DatasetStorageService:
    """Specialized service for storing datasets"""
    
    def __init__(self, storage: StorageService):
        self.storage = storage
        self.datasets_prefix = "datasets/"
    
    async def save_dataset_file(self, dataset_id: str, file_content: bytes, filename: str) -> str:
        """Save dataset file to storage"""
        file_extension = filename.split('.')[-1] if '.' in filename else 'data'
        file_path = f"{self.datasets_prefix}{dataset_id}.{file_extension}"
        
        # Determine content type based on extension
        content_type_mapping = {
            'csv': 'text/csv',
            'json': 'application/json',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'parquet': 'application/octet-stream'
        }
        content_type = content_type_mapping.get(file_extension.lower(), 'application/octet-stream')
        
        await self.storage.upload_file(
            file_content=file_content,
            file_path=file_path,
            content_type=content_type
        )
        
        return file_path
    
    async def get_dataset_file_url(self, dataset_id: str, file_extension: str = 'csv') -> Optional[str]:
        """Get presigned URL for dataset file"""
        file_path = f"{self.datasets_prefix}{dataset_id}.{file_extension}"
        
        if await self.storage.file_exists(file_path):
            return await self.storage.generate_presigned_url(file_path, timedelta(hours=24))
        return None

# Global service instances
storage_service = StorageService()
report_storage = ReportStorageService(storage_service)
dataset_storage = DatasetStorageService(storage_service)

async def init_storage():
    """Initialize storage services"""
    await storage_service.initialize()
    logger.info("All storage services initialized")