"""
Rate Limiter Service - In-Memory Implementation

Provides basic rate limiting for login attempts to prevent brute force attacks.
Uses in-memory storage (suitable for single-instance deployments).

For production multi-instance deployments, consider Redis-based rate limiting.
"""

import time
import logging
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Dict, Tuple
from threading import Lock

logger = logging.getLogger(__name__)


@dataclass
class AttemptRecord:
    """Track login attempts for an IP"""
    attempts: int = 0
    first_attempt_time: float = 0.0
    lockout_until: float = 0.0


class RateLimiter:
    """
    In-memory rate limiter for login attempts.
    
    Configuration:
    - max_attempts: Maximum attempts allowed in the time window
    - window_seconds: Time window for counting attempts
    - lockout_seconds: How long to lock out after max attempts exceeded
    """
    
    def __init__(
        self,
        max_attempts: int = 5,
        window_seconds: int = 60,
        lockout_seconds: int = 300
    ):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self.lockout_seconds = lockout_seconds
        self._records: Dict[str, AttemptRecord] = defaultdict(AttemptRecord)
        self._lock = Lock()
        
    def _get_client_key(self, ip: str, identifier: str = "") -> str:
        """Generate a unique key for the client"""
        return f"{ip}:{identifier}" if identifier else ip
    
    def _cleanup_old_records(self):
        """Remove expired records to prevent memory growth"""
        current_time = time.time()
        expired_keys = []
        
        for key, record in self._records.items():
            # Remove if lockout expired and window passed
            if (record.lockout_until < current_time and 
                current_time - record.first_attempt_time > self.window_seconds * 2):
                expired_keys.append(key)
        
        for key in expired_keys:
            del self._records[key]
    
    def check_rate_limit(self, ip: str, identifier: str = "") -> Tuple[bool, str, int]:
        """
        Check if a request should be allowed.
        
        Args:
            ip: Client IP address
            identifier: Optional additional identifier (e.g., email for login)
            
        Returns:
            Tuple of (allowed: bool, message: str, retry_after: int)
        """
        key = self._get_client_key(ip, identifier)
        current_time = time.time()
        
        with self._lock:
            # Periodic cleanup
            if len(self._records) > 10000:
                self._cleanup_old_records()
            
            record = self._records[key]
            
            # Check if currently locked out
            if record.lockout_until > current_time:
                retry_after = int(record.lockout_until - current_time)
                return False, f"Too many attempts. Try again in {retry_after} seconds.", retry_after
            
            # Check if window has expired, reset if so
            if current_time - record.first_attempt_time > self.window_seconds:
                record.attempts = 0
                record.first_attempt_time = current_time
                record.lockout_until = 0.0
            
            # Check attempt count
            if record.attempts >= self.max_attempts:
                # Apply lockout
                record.lockout_until = current_time + self.lockout_seconds
                retry_after = self.lockout_seconds
                logger.warning(f"Rate limit exceeded for {key}, locked out for {retry_after}s")
                return False, f"Too many attempts. Try again in {retry_after} seconds.", retry_after
            
            return True, "", 0
    
    def record_attempt(self, ip: str, identifier: str = "", success: bool = False):
        """
        Record a login attempt.
        
        Args:
            ip: Client IP address
            identifier: Optional additional identifier
            success: Whether the attempt was successful
        """
        key = self._get_client_key(ip, identifier)
        current_time = time.time()
        
        with self._lock:
            record = self._records[key]
            
            if success:
                # Reset on successful login
                record.attempts = 0
                record.first_attempt_time = 0.0
                record.lockout_until = 0.0
            else:
                # Increment failed attempts
                if record.first_attempt_time == 0:
                    record.first_attempt_time = current_time
                record.attempts += 1
                logger.info(f"Failed login attempt {record.attempts}/{self.max_attempts} for {key}")
    
    def get_remaining_attempts(self, ip: str, identifier: str = "") -> int:
        """Get the number of remaining attempts for a client"""
        key = self._get_client_key(ip, identifier)
        
        with self._lock:
            record = self._records[key]
            current_time = time.time()
            
            # Check if window expired
            if current_time - record.first_attempt_time > self.window_seconds:
                return self.max_attempts
            
            return max(0, self.max_attempts - record.attempts)
    
    def reset(self, ip: str, identifier: str = ""):
        """Manually reset rate limit for a client (admin use)"""
        key = self._get_client_key(ip, identifier)
        
        with self._lock:
            if key in self._records:
                del self._records[key]
                logger.info(f"Rate limit reset for {key}")


# Create singleton instance with default config
from config import SECURITY_CONFIG

login_rate_limiter = RateLimiter(
    max_attempts=SECURITY_CONFIG.LOGIN_MAX_ATTEMPTS,
    window_seconds=SECURITY_CONFIG.LOGIN_WINDOW_SECONDS,
    lockout_seconds=SECURITY_CONFIG.LOGIN_LOCKOUT_SECONDS
)

__all__ = ['RateLimiter', 'login_rate_limiter']
