/**
 * Video Upload Rules Configuration
 * Centralized config for video upload constraints and validation
 */

/**
 * Allowed video MIME types
 */
export const ALLOWED_MIME_TYPES = ['video/mp4'];

/**
 * Allowed file extensions
 */
export const ALLOWED_EXTENSIONS = ['.mp4'];

/**
 * File size limits (in bytes)
 */
export const SIZE_LIMITS = {
  // Soft limit - show warning but allow upload
  SOFT_LIMIT_MB: 100,
  SOFT_LIMIT_BYTES: 100 * 1024 * 1024,
  
  // Hard limit - block upload
  HARD_LIMIT_MB: 120,
  HARD_LIMIT_BYTES: 120 * 1024 * 1024,
  
  // Maximum allowed (for display/validation)
  MAX_SIZE_MB: 120,
  MAX_SIZE_BYTES: 120 * 1024 * 1024
};

/**
 * Upload configuration
 */
export const UPLOAD_CONFIG = {
  // Chunk size for chunked uploads (if implemented)
  CHUNK_SIZE_MB: 5,
  CHUNK_SIZE_BYTES: 5 * 1024 * 1024,
  
  // Maximum concurrent uploads
  MAX_CONCURRENT_UPLOADS: 1,
  
  // Upload timeout in milliseconds
  UPLOAD_TIMEOUT_MS: 300000, // 5 minutes
  
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000
};

/**
 * Storage configuration
 */
export const STORAGE_CONFIG = {
  // Current storage provider
  PROVIDER: 'local', // 'local' | 's3' | 'gcs'
  
  // Local storage path (relative to backend)
  LOCAL_PATH: 'uploads/videos',
  
  // URL path for serving videos
  SERVE_PATH: '/api/tasks/{taskId}/video'
};

/**
 * Video validation rules
 */
export const VIDEO_RULES = {
  allowedTypes: ALLOWED_MIME_TYPES,
  allowedExtensions: ALLOWED_EXTENSIONS,
  softLimitMB: SIZE_LIMITS.SOFT_LIMIT_MB,
  softLimitBytes: SIZE_LIMITS.SOFT_LIMIT_BYTES,
  hardLimitMB: SIZE_LIMITS.HARD_LIMIT_MB,
  hardLimitBytes: SIZE_LIMITS.HARD_LIMIT_BYTES,
  maxSizeMB: SIZE_LIMITS.MAX_SIZE_MB,
  maxSizeBytes: SIZE_LIMITS.MAX_SIZE_BYTES
};

/**
 * Validate video file
 * @param {File} file - File to validate
 * @returns {{ valid: boolean, error?: string, warning?: string }}
 */
export const validateVideoFile = (file) => {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }
  
  // Check file type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { 
      valid: false, 
      error: `Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}` 
    };
  }
  
  // Check file extension
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return { 
      valid: false, 
      error: `Invalid file extension. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` 
    };
  }
  
  // Check hard limit
  if (file.size > SIZE_LIMITS.HARD_LIMIT_BYTES) {
    return { 
      valid: false, 
      error: `File too large. Maximum size: ${SIZE_LIMITS.HARD_LIMIT_MB}MB` 
    };
  }
  
  // Check soft limit (warning only)
  if (file.size > SIZE_LIMITS.SOFT_LIMIT_BYTES) {
    return { 
      valid: true, 
      warning: `Large file (${formatFileSize(file.size)}). Upload may take longer.` 
    };
  }
  
  return { valid: true };
};

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted size string
 */
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Format duration for display
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration string (MM:SS or HH:MM:SS)
 */
export const formatDuration = (seconds) => {
  if (!seconds || seconds === 0) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Error messages for video validation
 */
export const VIDEO_ERROR_MESSAGES = {
  NO_FILE: 'Please select a video file',
  INVALID_TYPE: `Only ${ALLOWED_EXTENSIONS.join(', ')} files are allowed`,
  FILE_TOO_LARGE: `File exceeds maximum size of ${SIZE_LIMITS.HARD_LIMIT_MB}MB`,
  UPLOAD_FAILED: 'Video upload failed. Please try again.',
  PROCESSING_FAILED: 'Video processing failed. Please try uploading again.'
};

/**
 * Get human-readable size limit text
 * @returns {string}
 */
export const getSizeLimitText = () => {
  return `Maximum file size: ${SIZE_LIMITS.HARD_LIMIT_MB}MB`;
};

/**
 * Get allowed types text for display
 * @returns {string}
 */
export const getAllowedTypesText = () => {
  return `Supported formats: ${ALLOWED_EXTENSIONS.map(e => e.replace('.', '').toUpperCase()).join(', ')}`;
};
