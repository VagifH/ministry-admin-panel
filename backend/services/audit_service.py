"""
Audit Logger Service - Enterprise Grade Audit Logging

Provides centralized audit logging for all critical actions.
Logs are stored in MongoDB `audit_logs` collection.

Usage:
    from services.audit_service import audit_logger
    
    await audit_logger.log(
        user=current_user,
        action="CREATE",
        entity_type="Task",
        entity_id=task_id,
        new_value=task_title,
        request=request  # Optional: for IP address
    )
"""

import uuid
from datetime import datetime, timezone
from typing import Optional, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi import Request


class AuditAction:
    """Standard audit action types"""
    # Auth actions
    LOGIN_SUCCESS = "LOGIN_SUCCESS"
    LOGIN_FAILED = "LOGIN_FAILED"
    LOGOUT = "LOGOUT"
    
    # CRUD actions
    CREATE = "CREATE"
    READ = "READ"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    
    # Task-specific actions
    STATUS_CHANGE = "STATUS_CHANGE"
    SUBMIT = "SUBMIT"
    APPROVE = "APPROVE"
    REJECT = "REJECT"
    SCHEDULE = "SCHEDULE"
    PUBLISH = "PUBLISH"
    ARCHIVE = "ARCHIVE"
    RESTORE = "RESTORE"
    
    # Video actions
    UPLOAD = "UPLOAD"
    UPLOAD_FAILED = "UPLOAD_FAILED"
    DOWNLOAD = "DOWNLOAD"
    
    # User actions
    PASSWORD_CHANGE = "PASSWORD_CHANGE"
    ROLE_CHANGE = "ROLE_CHANGE"
    DEACTIVATE = "DEACTIVATE"
    ACTIVATE = "ACTIVATE"
    
    # Comment action
    COMMENT = "COMMENT"


class EntityType:
    """Standard entity types for audit logging"""
    USER = "User"
    TASK = "Task"
    VIDEO = "Video"
    AVATAR = "Avatar"
    COMMENT = "Comment"
    SESSION = "Session"
    SYSTEM = "System"


class AuditLogger:
    """
    Enterprise-grade audit logger service.
    
    Features:
    - Centralized logging for all critical actions
    - IP address tracking
    - User role tracking
    - Old/new value tracking for changes
    - Async database storage
    """
    
    def __init__(self):
        self._db: Optional[AsyncIOMotorDatabase] = None
    
    def set_database(self, db: AsyncIOMotorDatabase):
        """Set the database instance (called during app startup)"""
        self._db = db
    
    @property
    def db(self) -> AsyncIOMotorDatabase:
        if self._db is None:
            raise RuntimeError("Audit logger database not initialized. Call set_database() first.")
        return self._db
    
    def _get_client_ip(self, request: Optional[Request]) -> Optional[str]:
        """Extract client IP address from request"""
        if not request:
            return None
        
        # Check for forwarded headers (reverse proxy)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            # Take first IP in chain (original client)
            return forwarded.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # Fall back to direct client
        if request.client:
            return request.client.host
        
        return None
    
    def _serialize_value(self, value: Any) -> Optional[str]:
        """Serialize a value for storage"""
        if value is None:
            return None
        if isinstance(value, str):
            return value
        if isinstance(value, (dict, list)):
            import json
            try:
                return json.dumps(value, default=str)
            except Exception:
                return str(value)
        return str(value)
    
    async def log(
        self,
        user: Optional[Any] = None,
        user_id: Optional[str] = None,
        user_name: Optional[str] = None,
        user_role: Optional[str] = None,
        action: str = "",
        entity_type: str = "",
        entity_id: Optional[str] = None,
        old_value: Any = None,
        new_value: Any = None,
        request: Optional[Request] = None,
        metadata: Optional[dict] = None
    ) -> str:
        """
        Log an audit event.
        
        Args:
            user: User object (extracts id, name, role)
            user_id: User ID (alternative to user object)
            user_name: User name (alternative to user object)
            user_role: User role (alternative to user object)
            action: Action type (use AuditAction constants)
            entity_type: Entity type (use EntityType constants)
            entity_id: Entity identifier
            old_value: Previous value (for updates)
            new_value: New value (for creates/updates)
            request: FastAPI request object (for IP extraction)
            metadata: Additional metadata dict
            
        Returns:
            Log entry ID
        """
        # Extract user info from user object or params
        if user:
            user_id = user_id or getattr(user, 'id', None)
            user_name = user_name or getattr(user, 'name', None)
            user_role = user_role or getattr(user, 'role', None)
        
        log_entry = {
            "id": str(uuid.uuid4()),
            "user_id": user_id or "system",
            "user_name": user_name or "System",
            "user_role": user_role or "System",
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "old_value": self._serialize_value(old_value),
            "new_value": self._serialize_value(new_value),
            "ip_address": self._get_client_ip(request),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "metadata": metadata
        }
        
        # Also include legacy fields for backward compatibility
        log_entry["actor_id"] = log_entry["user_id"]
        log_entry["actor_name"] = log_entry["user_name"]
        log_entry["object_type"] = log_entry["entity_type"]
        log_entry["object_id"] = log_entry["entity_id"]
        log_entry["created_at"] = log_entry["timestamp"]
        
        await self.db.audit_logs.insert_one(log_entry)
        
        return log_entry["id"]
    
    # Convenience methods for common actions
    
    async def log_login_success(self, user: Any, request: Optional[Request] = None):
        """Log successful login"""
        return await self.log(
            user=user,
            action=AuditAction.LOGIN_SUCCESS,
            entity_type=EntityType.SESSION,
            entity_id=user.id if user else None,
            new_value=user.email if hasattr(user, 'email') else None,
            request=request
        )
    
    async def log_login_failed(self, email: str, reason: str = "Invalid credentials", request: Optional[Request] = None):
        """Log failed login attempt"""
        return await self.log(
            user_id="anonymous",
            user_name=email,
            user_role="Anonymous",
            action=AuditAction.LOGIN_FAILED,
            entity_type=EntityType.SESSION,
            new_value=reason,
            request=request
        )
    
    async def log_task_create(self, user: Any, task_id: str, task_title: str, request: Optional[Request] = None):
        """Log task creation"""
        return await self.log(
            user=user,
            action=AuditAction.CREATE,
            entity_type=EntityType.TASK,
            entity_id=task_id,
            new_value=task_title,
            request=request
        )
    
    async def log_task_update(self, user: Any, task_id: str, changes: dict, request: Optional[Request] = None):
        """Log task update"""
        return await self.log(
            user=user,
            action=AuditAction.UPDATE,
            entity_type=EntityType.TASK,
            entity_id=task_id,
            new_value=changes,
            request=request
        )
    
    async def log_task_delete(self, user: Any, task_id: str, task_title: str = None, request: Optional[Request] = None):
        """Log task deletion"""
        return await self.log(
            user=user,
            action=AuditAction.DELETE,
            entity_type=EntityType.TASK,
            entity_id=task_id,
            old_value=task_title,
            request=request
        )
    
    async def log_status_change(self, user: Any, task_id: str, old_status: str, new_status: str, request: Optional[Request] = None):
        """Log task status transition"""
        return await self.log(
            user=user,
            action=AuditAction.STATUS_CHANGE,
            entity_type=EntityType.TASK,
            entity_id=task_id,
            old_value=old_status,
            new_value=new_status,
            request=request
        )
    
    async def log_video_upload(self, user: Any, task_id: str, filename: str, request: Optional[Request] = None):
        """Log video upload"""
        return await self.log(
            user=user,
            action=AuditAction.UPLOAD,
            entity_type=EntityType.VIDEO,
            entity_id=task_id,
            new_value=filename,
            request=request
        )
    
    async def log_video_delete(self, user: Any, task_id: str, filename: str = None, request: Optional[Request] = None):
        """Log video deletion"""
        return await self.log(
            user=user,
            action=AuditAction.DELETE,
            entity_type=EntityType.VIDEO,
            entity_id=task_id,
            old_value=filename,
            request=request
        )
    
    async def log_user_create(self, admin: Any, user_id: str, user_email: str, request: Optional[Request] = None):
        """Log user creation"""
        return await self.log(
            user=admin,
            action=AuditAction.CREATE,
            entity_type=EntityType.USER,
            entity_id=user_id,
            new_value=user_email,
            request=request
        )
    
    async def log_user_update(self, admin: Any, user_id: str, changes: dict, request: Optional[Request] = None):
        """Log user update"""
        return await self.log(
            user=admin,
            action=AuditAction.UPDATE,
            entity_type=EntityType.USER,
            entity_id=user_id,
            new_value=changes,
            request=request
        )
    
    async def log_user_delete(self, admin: Any, user_id: str, user_email: str = None, request: Optional[Request] = None):
        """Log user deletion"""
        return await self.log(
            user=admin,
            action=AuditAction.DELETE,
            entity_type=EntityType.USER,
            entity_id=user_id,
            old_value=user_email,
            request=request
        )
    
    async def log_avatar_update(self, user: Any, avatar_id: str, changes: dict, request: Optional[Request] = None):
        """Log avatar update"""
        return await self.log(
            user=user,
            action=AuditAction.UPDATE,
            entity_type=EntityType.AVATAR,
            entity_id=avatar_id,
            new_value=changes,
            request=request
        )
    
    async def log_avatar_photo_upload(self, user: Any, avatar_id: str, filename: str, request: Optional[Request] = None):
        """Log avatar photo upload"""
        return await self.log(
            user=user,
            action=AuditAction.UPLOAD,
            entity_type=EntityType.AVATAR,
            entity_id=avatar_id,
            new_value=filename,
            request=request
        )
    
    async def log_avatar_photo_delete(self, user: Any, avatar_id: str, request: Optional[Request] = None):
        """Log avatar photo deletion"""
        return await self.log(
            user=user,
            action=AuditAction.DELETE,
            entity_type=EntityType.AVATAR,
            entity_id=avatar_id,
            old_value="photo",
            request=request
        )
    
    async def log_comment_create(self, user: Any, task_id: str, comment_preview: str, request: Optional[Request] = None):
        """Log comment creation"""
        return await self.log(
            user=user,
            action=AuditAction.CREATE,
            entity_type=EntityType.COMMENT,
            entity_id=task_id,
            new_value=comment_preview,
            request=request
        )
    
    async def log_video_create(self, user: Any, video_id: str, filename: str, request: Optional[Request] = None):
        """Log video record creation"""
        return await self.log(
            user=user,
            action=AuditAction.CREATE,
            entity_type=EntityType.VIDEO,
            entity_id=video_id,
            new_value=filename,
            request=request
        )
    
    async def log_video_status_change(self, user: Any, video_id: str, old_status: str, new_status: str, request: Optional[Request] = None):
        """Log video status change"""
        return await self.log(
            user=user,
            action=AuditAction.STATUS_CHANGE,
            entity_type=EntityType.VIDEO,
            entity_id=video_id,
            old_value=old_status,
            new_value=new_status,
            request=request
        )
    
    async def safe_log(self, **kwargs) -> Optional[str]:
        """
        Safe wrapper for logging that catches exceptions.
        Audit logging should never break the main endpoint.
        Returns log_id on success, None on failure.
        """
        try:
            return await self.log(**kwargs)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Audit logging failed: {e}")
            return None


# Singleton instance
audit_logger = AuditLogger()

# Export classes and instance
__all__ = ['audit_logger', 'AuditLogger', 'AuditAction', 'EntityType']
