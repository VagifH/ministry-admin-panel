"""
Unified Error Handling Service - Enterprise Grade

Provides centralized error classes and exception handlers for consistent
JSON error responses across all API endpoints.

Error Response Format:
{
    "error": {
        "code": "ERROR_CODE",
        "message": "Human-readable error message"
    }
}
"""

import logging
from typing import Optional, Any
from fastapi import Request
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


# ==================== ERROR CODES ====================

class ErrorCode:
    """Standard error codes for the application"""
    # Authentication errors (401)
    INVALID_TOKEN = "INVALID_TOKEN"
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
    TOKEN_EXPIRED = "TOKEN_EXPIRED"
    
    # Authorization errors (403)
    FORBIDDEN = "FORBIDDEN"
    PERMISSION_DENIED = "PERMISSION_DENIED"
    ACCOUNT_DISABLED = "ACCOUNT_DISABLED"
    TASK_ARCHIVED = "TASK_ARCHIVED"
    DELETE_REQUIRES_ARCHIVE = "DELETE_REQUIRES_ARCHIVE"
    DELETE_REQUIRES_NO_VIDEO = "DELETE_REQUIRES_NO_VIDEO"
    TASK_HAS_VIDEO = "TASK_HAS_VIDEO"
    
    # Validation errors (400)
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INVALID_INPUT = "INVALID_INPUT"
    DUPLICATE_ENTRY = "DUPLICATE_ENTRY"
    INVALID_FILE_TYPE = "INVALID_FILE_TYPE"
    FILE_TOO_LARGE = "FILE_TOO_LARGE"
    INVALID_STATUS_TRANSITION = "INVALID_STATUS_TRANSITION"
    TASK_NOT_ARCHIVED = "TASK_NOT_ARCHIVED"
    TASK_ALREADY_ARCHIVED = "TASK_ALREADY_ARCHIVED"
    
    # Not found errors (404)
    NOT_FOUND = "NOT_FOUND"
    USER_NOT_FOUND = "USER_NOT_FOUND"
    TASK_NOT_FOUND = "TASK_NOT_FOUND"
    VIDEO_NOT_FOUND = "VIDEO_NOT_FOUND"
    AVATAR_NOT_FOUND = "AVATAR_NOT_FOUND"
    FILE_NOT_FOUND = "FILE_NOT_FOUND"
    
    # Conflict errors (409)
    CONFLICT = "CONFLICT"
    RESOURCE_CONFLICT = "RESOURCE_CONFLICT"
    
    # Rate limit errors (429)
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
    
    # Server errors (500)
    INTERNAL_ERROR = "INTERNAL_ERROR"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
    
    # Not implemented (501)
    NOT_IMPLEMENTED = "NOT_IMPLEMENTED"


# ==================== ERROR CLASSES ====================

class AppError(Exception):
    """Base application error class"""
    
    def __init__(
        self,
        message: str,
        code: str = ErrorCode.INTERNAL_ERROR,
        status_code: int = 500,
        details: Optional[Any] = None
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details
        super().__init__(self.message)
    
    def to_response(self) -> dict:
        """Convert error to JSON response format"""
        return {
            "error": {
                "code": self.code,
                "message": self.message
            }
        }


class ValidationError(AppError):
    """400 Bad Request - Invalid input or validation failure"""
    
    def __init__(self, message: str, code: str = ErrorCode.VALIDATION_ERROR, details: Optional[Any] = None):
        super().__init__(message=message, code=code, status_code=400, details=details)


class AuthError(AppError):
    """401 Unauthorized - Authentication required or failed"""
    
    def __init__(self, message: str = "Authentication required", code: str = ErrorCode.INVALID_CREDENTIALS):
        super().__init__(message=message, code=code, status_code=401)


class ForbiddenError(AppError):
    """403 Forbidden - Access denied for authenticated user"""
    
    def __init__(self, message: str = "Access denied", code: str = ErrorCode.FORBIDDEN):
        super().__init__(message=message, code=code, status_code=403)


class NotFoundError(AppError):
    """404 Not Found - Resource does not exist"""
    
    def __init__(self, message: str = "Resource not found", code: str = ErrorCode.NOT_FOUND):
        super().__init__(message=message, code=code, status_code=404)


class ConflictError(AppError):
    """409 Conflict - Resource state conflict"""
    
    def __init__(self, message: str = "Resource conflict", code: str = ErrorCode.CONFLICT):
        super().__init__(message=message, code=code, status_code=409)


class RateLimitError(AppError):
    """429 Too Many Requests - Rate limit exceeded"""
    
    def __init__(self, message: str = "Too many requests. Please try again later.", code: str = ErrorCode.RATE_LIMIT_EXCEEDED, retry_after: int = 60):
        super().__init__(message=message, code=code, status_code=429)
        self.retry_after = retry_after
    
    def to_response(self) -> dict:
        """Convert error to JSON response format with retry info"""
        return {
            "error": {
                "code": self.code,
                "message": self.message,
                "retry_after": self.retry_after
            }
        }


class ServerError(AppError):
    """500 Internal Server Error - Unexpected server error"""
    
    def __init__(self, message: str = "Something went wrong. Please try again.", code: str = ErrorCode.INTERNAL_ERROR):
        super().__init__(message=message, code=code, status_code=500)


class NotImplementedError(AppError):
    """501 Not Implemented - Feature not implemented"""
    
    def __init__(self, message: str = "This feature is not implemented", code: str = ErrorCode.NOT_IMPLEMENTED):
        super().__init__(message=message, code=code, status_code=501)


# ==================== EXCEPTION HANDLERS ====================

async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    """
    Handle AppError exceptions and return unified JSON response.
    Does not log as these are expected application errors.
    """
    return JSONResponse(
        status_code=exc.status_code,
        content=exc.to_response()
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Handle unexpected exceptions.
    - Logs the full exception server-side
    - Returns generic error message to client (no stack trace exposure)
    """
    try:
        logger.exception(f"Unexpected error on {request.method} {request.url.path}: {exc}")
    except Exception:
        pass  # Never block response if logging fails
    
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": ErrorCode.INTERNAL_ERROR,
                "message": "Something went wrong. Please try again."
            }
        }
    )


async def validation_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Handle Pydantic validation errors from request body parsing.
    """
    try:
        logger.warning(f"Validation error on {request.method} {request.url.path}: {exc}")
    except Exception:
        pass
    
    # Extract meaningful message from Pydantic error
    message = "Invalid request data"
    if hasattr(exc, 'errors') and callable(exc.errors):
        errors = exc.errors()
        if errors:
            first_error = errors[0]
            field = '.'.join(str(loc) for loc in first_error.get('loc', []))
            msg = first_error.get('msg', 'invalid')
            message = f"{field}: {msg}" if field else msg
    
    return JSONResponse(
        status_code=400,
        content={
            "error": {
                "code": ErrorCode.VALIDATION_ERROR,
                "message": message
            }
        }
    )


# ==================== UTILITY FUNCTIONS ====================

def raise_not_found(resource: str, resource_id: Optional[str] = None) -> None:
    """Convenience function to raise NotFoundError"""
    message = f"{resource} not found"
    if resource_id:
        message = f"{resource} with ID '{resource_id}' not found"
    
    code_map = {
        "User": ErrorCode.USER_NOT_FOUND,
        "Task": ErrorCode.TASK_NOT_FOUND,
        "Video": ErrorCode.VIDEO_NOT_FOUND,
        "Avatar": ErrorCode.AVATAR_NOT_FOUND,
        "File": ErrorCode.FILE_NOT_FOUND,
    }
    code = code_map.get(resource, ErrorCode.NOT_FOUND)
    raise NotFoundError(message=message, code=code)


def raise_forbidden(message: str = "Access denied") -> None:
    """Convenience function to raise ForbiddenError"""
    raise ForbiddenError(message=message, code=ErrorCode.PERMISSION_DENIED)


def raise_validation(message: str, code: str = ErrorCode.VALIDATION_ERROR) -> None:
    """Convenience function to raise ValidationError"""
    raise ValidationError(message=message, code=code)


# Export all classes and handlers
__all__ = [
    'AppError',
    'ValidationError', 
    'AuthError',
    'ForbiddenError',
    'NotFoundError',
    'ConflictError',
    'ServerError',
    'NotImplementedError',
    'ErrorCode',
    'app_error_handler',
    'generic_exception_handler',
    'validation_exception_handler',
    'raise_not_found',
    'raise_forbidden',
    'raise_validation',
]
