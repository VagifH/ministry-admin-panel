"""
Storage Service - Pluggable storage layer for file operations
Supports Local filesystem (default) and Google Cloud Storage (GCS)

Configuration via environment variables:
    STORAGE_PROVIDER=local|gcs (default: local)
    
    For GCS:
        GCS_BUCKET_NAME=your-bucket-name
        GCS_PROJECT_ID=your-project-id (optional)
        GCS_CREDENTIALS_JSON={"type":"service_account",...} (JSON string)
        GCS_SIGNED_URL_EXP_SECONDS=900 (optional, default: 900)

Usage:
    from services.storage_service import storage_service
    
    # Save file
    result = await storage_service.save_file(file_bytes, "video.mp4", "videos")
    # result = {"stored_filename": "uuid.mp4", "storage_path": "videos/task_id/uuid.mp4", "provider": "local|gcs"}
    
    # Stream file (works for both local and GCS)
    async for chunk in storage_service.stream_file("videos/task_id/uuid.mp4"):
        yield chunk
    
    # Get download response
    response = await storage_service.get_file_response("videos/task_id/uuid.mp4", "original.mp4")
    
    # Delete file
    await storage_service.delete_file("videos/task_id/uuid.mp4")
"""

import os
import uuid
import aiofiles
import json
import io
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional, AsyncGenerator, Union
from fastapi import HTTPException
from fastapi.responses import StreamingResponse
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)

# Base upload directory for local storage
UPLOAD_DIR = Path("/app/backend/uploads")


class BaseStorageService(ABC):
    """Abstract base class for storage providers"""
    
    provider: str = "base"
    
    @abstractmethod
    async def save_file(
        self, 
        file_data: Union[bytes, AsyncGenerator], 
        original_filename: str,
        folder: str = "files",
        subfolder: Optional[str] = None
    ) -> dict:
        """Save a file to storage. Returns dict with stored_filename, storage_path, provider."""
        pass
    
    @abstractmethod
    async def stream_file(
        self, 
        storage_path: str,
        chunk_size: int = 1024 * 1024
    ) -> AsyncGenerator[bytes, None]:
        """Stream a file from storage in chunks."""
        pass
    
    @abstractmethod
    async def get_file_response(
        self,
        storage_path: str,
        original_filename: str,
        media_type: str = "application/octet-stream",
        as_attachment: bool = True
    ) -> StreamingResponse:
        """Get a streaming response for file download."""
        pass
    
    @abstractmethod
    async def delete_file(self, storage_path: str) -> bool:
        """Delete a file from storage. Returns True if deleted."""
        pass
    
    @abstractmethod
    def file_exists(self, storage_path: str) -> bool:
        """Check if a file exists in storage."""
        pass
    
    @abstractmethod
    def get_file_size(self, storage_path: str) -> Optional[int]:
        """Get the size of a file in bytes."""
        pass


class LocalStorageService(BaseStorageService):
    """
    Local filesystem storage implementation.
    Default provider - stores files in /app/backend/uploads/
    """
    
    provider = "local"
    
    def __init__(self, base_dir: Path = UPLOAD_DIR):
        self.base_dir = base_dir
        
    async def save_file(
        self, 
        file_data: Union[bytes, AsyncGenerator], 
        original_filename: str,
        folder: str = "files",
        subfolder: Optional[str] = None
    ) -> dict:
        """Save a file to local storage."""
        # Generate unique filename
        file_extension = Path(original_filename).suffix.lower() or ""
        stored_filename = f"{uuid.uuid4()}{file_extension}"
        
        # Build storage path
        if subfolder:
            storage_path = f"{folder}/{subfolder}/{stored_filename}"
            dir_path = self.base_dir / folder / subfolder
        else:
            storage_path = f"{folder}/{stored_filename}"
            dir_path = self.base_dir / folder
            
        # Ensure directory exists
        dir_path.mkdir(parents=True, exist_ok=True)
        
        # Full file path
        file_path = self.base_dir / storage_path
        
        # Write file
        if isinstance(file_data, bytes):
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(file_data)
        else:
            # Async generator (chunked upload)
            async with aiofiles.open(file_path, 'wb') as f:
                async for chunk in file_data:
                    await f.write(chunk)
        
        return {
            "stored_filename": stored_filename,
            "storage_path": storage_path,
            "provider": self.provider
        }
    
    async def stream_file(
        self, 
        storage_path: str,
        chunk_size: int = 1024 * 1024
    ) -> AsyncGenerator[bytes, None]:
        """Stream a file from local storage."""
        file_path = self.base_dir / storage_path
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found in storage")
            
        async with aiofiles.open(file_path, 'rb') as f:
            while chunk := await f.read(chunk_size):
                yield chunk
    
    async def get_file_response(
        self,
        storage_path: str,
        original_filename: str,
        media_type: str = "application/octet-stream",
        as_attachment: bool = True
    ) -> StreamingResponse:
        """Get a streaming response for file download."""
        file_path = self.base_dir / storage_path
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found on server")
        
        # Get file size for Content-Length header
        file_size = file_path.stat().st_size
        
        headers = {
            "Content-Length": str(file_size),
        }
        
        if as_attachment:
            safe_filename = original_filename.replace('"', '\\"')
            headers["Content-Disposition"] = f'attachment; filename="{safe_filename}"'
        
        return StreamingResponse(
            self.stream_file(storage_path),
            media_type=media_type,
            headers=headers
        )
    
    async def delete_file(self, storage_path: str) -> bool:
        """Delete a file from local storage."""
        file_path = self.base_dir / storage_path
        
        if file_path.exists():
            file_path.unlink()
            
            # Try to clean up empty parent directories
            try:
                parent = file_path.parent
                if parent != self.base_dir and parent.exists() and not any(parent.iterdir()):
                    parent.rmdir()
            except OSError:
                pass
                
            return True
        return False
    
    def file_exists(self, storage_path: str) -> bool:
        """Check if a file exists in local storage."""
        file_path = self.base_dir / storage_path
        return file_path.exists()
    
    def get_file_size(self, storage_path: str) -> Optional[int]:
        """Get the size of a file in local storage."""
        file_path = self.base_dir / storage_path
        if file_path.exists():
            return file_path.stat().st_size
        return None
    
    def get_full_path(self, storage_path: str) -> Path:
        """Get the full filesystem path for a storage path (local only)."""
        return self.base_dir / storage_path


class GCSStorageService(BaseStorageService):
    """
    Google Cloud Storage implementation.
    Streams files through backend (no signed URLs exposed to frontend).
    
    Required env vars:
        GCS_BUCKET_NAME: Name of the GCS bucket
        GCS_CREDENTIALS_JSON: Service account JSON as string
        
    Optional env vars:
        GCS_PROJECT_ID: GCP project ID (usually in credentials)
    """
    
    provider = "gcs"
    
    def __init__(self):
        from google.cloud import storage as gcs_storage
        from google.oauth2 import service_account
        
        self.bucket_name = os.environ.get("GCS_BUCKET_NAME")
        if not self.bucket_name:
            raise ValueError("GCS_BUCKET_NAME environment variable is required for GCS storage")
        
        # Parse credentials from JSON string
        credentials_json = os.environ.get("GCS_CREDENTIALS_JSON")
        if not credentials_json:
            raise ValueError("GCS_CREDENTIALS_JSON environment variable is required for GCS storage")
        
        try:
            credentials_info = json.loads(credentials_json)
            credentials = service_account.Credentials.from_service_account_info(credentials_info)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid GCS_CREDENTIALS_JSON format: {e}")
        
        # Optional project ID
        project_id = os.environ.get("GCS_PROJECT_ID") or credentials_info.get("project_id")
        
        # Initialize client
        self.client = gcs_storage.Client(project=project_id, credentials=credentials)
        self.bucket = self.client.bucket(self.bucket_name)
        
        logger.info(f"GCS Storage initialized with bucket: {self.bucket_name}")
    
    def _build_object_key(self, folder: str, subfolder: Optional[str], filename: str) -> str:
        """Build the GCS object key (path)."""
        if subfolder:
            return f"{folder}/{subfolder}/{filename}"
        return f"{folder}/{filename}"
    
    async def save_file(
        self, 
        file_data: Union[bytes, AsyncGenerator], 
        original_filename: str,
        folder: str = "files",
        subfolder: Optional[str] = None
    ) -> dict:
        """Save a file to GCS."""
        # Generate unique filename
        file_extension = Path(original_filename).suffix.lower() or ""
        stored_filename = f"{uuid.uuid4()}{file_extension}"
        
        # Build storage path (object key)
        storage_path = self._build_object_key(folder, subfolder, stored_filename)
        
        # Get blob
        blob = self.bucket.blob(storage_path)
        
        # Handle bytes or async generator
        if isinstance(file_data, bytes):
            content = file_data
        else:
            # Collect chunks from async generator
            chunks = []
            async for chunk in file_data:
                chunks.append(chunk)
            content = b''.join(chunks)
        
        # Determine content type from extension
        content_type = self._get_content_type(file_extension)
        
        # Upload to GCS (synchronous, but fast for reasonable file sizes)
        blob.upload_from_string(content, content_type=content_type)
        
        logger.info(f"Uploaded to GCS: {storage_path} ({len(content)} bytes)")
        
        return {
            "stored_filename": stored_filename,
            "storage_path": storage_path,
            "provider": self.provider
        }
    
    def _get_content_type(self, extension: str) -> str:
        """Get MIME type from file extension."""
        mime_types = {
            ".mp4": "video/mp4",
            ".webm": "video/webm",
            ".mov": "video/quicktime",
            ".avi": "video/x-msvideo",
            ".mkv": "video/x-matroska",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".webp": "image/webp",
            ".pdf": "application/pdf",
            ".txt": "text/plain",
        }
        return mime_types.get(extension.lower(), "application/octet-stream")
    
    async def stream_file(
        self, 
        storage_path: str,
        chunk_size: int = 1024 * 1024
    ) -> AsyncGenerator[bytes, None]:
        """Stream a file from GCS."""
        blob = self.bucket.blob(storage_path)
        
        if not blob.exists():
            raise HTTPException(status_code=404, detail="File not found in storage")
        
        # Download to bytes and yield in chunks
        # For large files, consider using blob.download_as_bytes(start=, end=) for range requests
        content = blob.download_as_bytes()
        
        # Yield in chunks
        for i in range(0, len(content), chunk_size):
            yield content[i:i + chunk_size]
    
    async def get_file_response(
        self,
        storage_path: str,
        original_filename: str,
        media_type: str = "application/octet-stream",
        as_attachment: bool = True
    ) -> StreamingResponse:
        """Get a streaming response for file download from GCS."""
        blob = self.bucket.blob(storage_path)
        
        if not blob.exists():
            raise HTTPException(status_code=404, detail="File not found on server")
        
        # Get file size
        blob.reload()  # Refresh metadata
        file_size = blob.size or 0
        
        headers = {
            "Content-Length": str(file_size),
        }
        
        if as_attachment:
            safe_filename = original_filename.replace('"', '\\"')
            headers["Content-Disposition"] = f'attachment; filename="{safe_filename}"'
        
        return StreamingResponse(
            self.stream_file(storage_path),
            media_type=media_type,
            headers=headers
        )
    
    async def delete_file(self, storage_path: str) -> bool:
        """Delete a file from GCS."""
        blob = self.bucket.blob(storage_path)
        
        if blob.exists():
            blob.delete()
            logger.info(f"Deleted from GCS: {storage_path}")
            return True
        return False
    
    def file_exists(self, storage_path: str) -> bool:
        """Check if a file exists in GCS."""
        blob = self.bucket.blob(storage_path)
        return blob.exists()
    
    def get_file_size(self, storage_path: str) -> Optional[int]:
        """Get the size of a file in GCS."""
        blob = self.bucket.blob(storage_path)
        if blob.exists():
            blob.reload()
            return blob.size
        return None
    
    def generate_signed_url(self, storage_path: str, expiration_seconds: int = 900) -> str:
        """
        Generate a signed URL for direct download (optional feature).
        Not used by default - backend streams instead for security.
        """
        blob = self.bucket.blob(storage_path)
        if not blob.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        url = blob.generate_signed_url(
            version="v4",
            expiration=timedelta(seconds=expiration_seconds),
            method="GET"
        )
        return url


class StorageServiceFactory:
    """
    Factory to create the appropriate storage service based on configuration.
    
    Reads STORAGE_PROVIDER env var:
        - "local" (default): LocalStorageService
        - "gcs": GCSStorageService
    """
    
    _instance: Optional[BaseStorageService] = None
    
    @classmethod
    def get_service(cls) -> BaseStorageService:
        """Get or create the storage service singleton."""
        if cls._instance is None:
            provider = os.environ.get("STORAGE_PROVIDER", "local").lower()
            
            if provider == "gcs":
                logger.info("Initializing GCS storage provider")
                cls._instance = GCSStorageService()
            else:
                logger.info("Initializing Local storage provider")
                cls._instance = LocalStorageService()
        
        return cls._instance
    
    @classmethod
    def reset(cls):
        """Reset the singleton (useful for testing)."""
        cls._instance = None


# Legacy class for backward compatibility
class StorageService(LocalStorageService):
    """
    Legacy StorageService class for backward compatibility.
    New code should use storage_service singleton from factory.
    """
    pass


# Singleton instance via factory
storage_service = StorageServiceFactory.get_service()

# Export for convenience
__all__ = [
    'storage_service', 
    'StorageService',  # Legacy
    'BaseStorageService',
    'LocalStorageService', 
    'GCSStorageService',
    'StorageServiceFactory',
    'UPLOAD_DIR'
]
