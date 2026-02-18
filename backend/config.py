"""
Application Configuration - Ministry Admin Panel

Centralized configuration for all app settings.
All limits, allowed types, and security settings should be defined here.
"""

from dataclasses import dataclass
from typing import Set


@dataclass(frozen=True)
class UploadConfig:
    """File upload configuration"""
    # Video settings
    VIDEO_MAX_SIZE_MB: int = 100
    VIDEO_MAX_SIZE_BYTES: int = 100 * 1024 * 1024  # 100MB
    VIDEO_ALLOWED_TYPES: Set[str] = frozenset({
        "video/mp4",
        "video/webm",
        "video/quicktime"
    })
    VIDEO_ALLOWED_EXTENSIONS: Set[str] = frozenset({".mp4", ".webm", ".mov"})
    
    # Avatar/Image settings
    AVATAR_MAX_SIZE_MB: int = 5
    AVATAR_MAX_SIZE_BYTES: int = 5 * 1024 * 1024  # 5MB
    AVATAR_ALLOWED_TYPES: Set[str] = frozenset({
        "image/jpeg",
        "image/png",
        "image/webp"
    })
    AVATAR_TARGET_SIZE: tuple = (256, 256)
    AVATAR_QUALITY: int = 85


@dataclass(frozen=True)
class SecurityConfig:
    """Security configuration"""
    # Rate limiting for login
    LOGIN_MAX_ATTEMPTS: int = 5
    LOGIN_WINDOW_SECONDS: int = 60  # 1 minute
    LOGIN_LOCKOUT_SECONDS: int = 300  # 5 minutes lockout after max attempts
    
    # JWT settings
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_HOURS: int = 24
    
    # Password requirements (for future use)
    PASSWORD_MIN_LENGTH: int = 8
    PASSWORD_REQUIRE_UPPERCASE: bool = True
    PASSWORD_REQUIRE_LOWERCASE: bool = True
    PASSWORD_REQUIRE_DIGIT: bool = True


@dataclass(frozen=True)
class AppConfig:
    """Main application configuration"""
    APP_NAME: str = "Ministry Admin Panel"
    APP_VERSION: str = "1.0.0-pilot"
    
    # Pagination defaults
    DEFAULT_PAGE_SIZE: int = 50
    MAX_PAGE_SIZE: int = 1000
    
    # Task settings
    TASK_SCRIPT_MIN_LENGTH: int = 20


# Singleton instances
UPLOAD_CONFIG = UploadConfig()
SECURITY_CONFIG = SecurityConfig()
APP_CONFIG = AppConfig()


# Export convenience constants for backward compatibility
VIDEO_MAX_SIZE_MB = UPLOAD_CONFIG.VIDEO_MAX_SIZE_MB
VIDEO_MAX_SIZE_BYTES = UPLOAD_CONFIG.VIDEO_MAX_SIZE_BYTES
ALLOWED_VIDEO_TYPES = UPLOAD_CONFIG.VIDEO_ALLOWED_TYPES

AVATAR_MAX_SIZE_MB = UPLOAD_CONFIG.AVATAR_MAX_SIZE_MB
AVATAR_MAX_SIZE_BYTES = UPLOAD_CONFIG.AVATAR_MAX_SIZE_BYTES
ALLOWED_AVATAR_TYPES = UPLOAD_CONFIG.AVATAR_ALLOWED_TYPES
