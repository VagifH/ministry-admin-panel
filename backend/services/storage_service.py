"""
Storage Service - Abstract storage layer for file operations
Implements local filesystem storage with interface for future S3 migration

Usage:
    from services.storage_service import storage_service
    
    # Save file
    result = await storage_service.save_file(file_bytes, "video.mp4", "videos")
    # result = {"stored_filename": "uuid.mp4", "storage_path": "videos/task_id/uuid.mp4"}
    
    # Stream file
    async for chunk in storage_service.stream_file("videos/task_id/uuid.mp4"):
        yield chunk
    
    # Delete file
    await storage_service.delete_file("videos/task_id/uuid.mp4")
"""

import os
import uuid
import aiofiles
from pathlib import Path
from typing import Optional, AsyncGenerator, Union
from fastapi import HTTPException
from fastapi.responses import StreamingResponse

# Base upload directory
UPLOAD_DIR = Path("/app/backend/uploads")

class StorageService:
    """
    Abstract storage service interface.
    Current implementation: Local filesystem
    Future: Can be swapped for S3, GCS, Azure Blob, etc.
    """
    
    def __init__(self, base_dir: Path = UPLOAD_DIR):
        self.base_dir = base_dir
        self.provider = "local"  # Will be "s3", "gcs", etc. in future
        
    async def save_file(
        self, 
        file_data: Union[bytes, AsyncGenerator], 
        original_filename: str,
        folder: str = "files",
        subfolder: Optional[str] = None
    ) -> dict:
        """
        Save a file to storage.
        
        Args:
            file_data: File bytes or async generator of chunks
            original_filename: Original filename (for extension)
            folder: Top-level folder (e.g., "videos", "avatars")
            subfolder: Optional subfolder (e.g., task_id)
            
        Returns:
            dict with:
                - stored_filename: The generated filename
                - storage_path: Full relative path in storage
                - provider: Storage provider name ("local", "s3", etc.)
        """
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
        chunk_size: int = 1024 * 1024  # 1MB chunks
    ) -> AsyncGenerator[bytes, None]:
        """
        Stream a file from storage.
        
        Args:
            storage_path: Relative path in storage
            chunk_size: Size of chunks to yield
            
        Yields:
            File content in chunks
        """
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
        """
        Get a streaming response for file download.
        
        Args:
            storage_path: Relative path in storage
            original_filename: Filename for Content-Disposition header
            media_type: MIME type for the response
            as_attachment: If True, triggers download; if False, displays inline
            
        Returns:
            StreamingResponse for FastAPI
        """
        file_path = self.base_dir / storage_path
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found on server")
        
        # Get file size for Content-Length header
        file_size = file_path.stat().st_size
        
        headers = {
            "Content-Length": str(file_size),
        }
        
        if as_attachment:
            # Safe filename encoding for Content-Disposition
            safe_filename = original_filename.replace('"', '\\"')
            headers["Content-Disposition"] = f'attachment; filename="{safe_filename}"'
        
        return StreamingResponse(
            self.stream_file(storage_path),
            media_type=media_type,
            headers=headers
        )
    
    async def delete_file(self, storage_path: str) -> bool:
        """
        Delete a file from storage.
        
        Args:
            storage_path: Relative path in storage
            
        Returns:
            True if file was deleted, False if file didn't exist
        """
        file_path = self.base_dir / storage_path
        
        if file_path.exists():
            file_path.unlink()
            
            # Try to clean up empty parent directories
            try:
                parent = file_path.parent
                if parent != self.base_dir and parent.exists() and not any(parent.iterdir()):
                    parent.rmdir()
            except OSError:
                pass  # Directory not empty or other issue
                
            return True
        return False
    
    def file_exists(self, storage_path: str) -> bool:
        """
        Check if a file exists in storage.
        
        Args:
            storage_path: Relative path in storage
            
        Returns:
            True if file exists
        """
        file_path = self.base_dir / storage_path
        return file_path.exists()
    
    def get_file_size(self, storage_path: str) -> Optional[int]:
        """
        Get the size of a file in storage.
        
        Args:
            storage_path: Relative path in storage
            
        Returns:
            File size in bytes, or None if file doesn't exist
        """
        file_path = self.base_dir / storage_path
        if file_path.exists():
            return file_path.stat().st_size
        return None
    
    def get_full_path(self, storage_path: str) -> Path:
        """
        Get the full filesystem path for a storage path.
        Note: This is specific to local storage and may not apply to cloud providers.
        
        Args:
            storage_path: Relative path in storage
            
        Returns:
            Full Path object
        """
        return self.base_dir / storage_path


# Singleton instance
storage_service = StorageService()

# Export for convenience
__all__ = ['storage_service', 'StorageService', 'UPLOAD_DIR']
