/**
 * Video Service Layer
 * Handles all video-related API calls and state management
 * Phase 4: Full upload implementation with local storage
 */

import axios from 'axios';
import { 
  VIDEO_STATUS, 
  VIDEO_STATUS_CONFIG,
  getVideoStatusLabel,
  getVideoStatusDescription 
} from '../config/statusConfig';
import { 
  VIDEO_RULES,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  SIZE_LIMITS,
  validateVideoFile as validateFile,
  formatFileSize,
  formatDuration
} from '../config/videoRules';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Re-export from config for backward compatibility
export { 
  VIDEO_STATUS, 
  VIDEO_STATUS_CONFIG,
  formatFileSize,
  formatDuration
};

/**
 * Video upload configuration (from videoRules)
 */
export const VIDEO_CONFIG = {
  MAX_SIZE_MB: SIZE_LIMITS.MAX_SIZE_MB,
  MAX_SIZE_BYTES: SIZE_LIMITS.MAX_SIZE_BYTES,
  ALLOWED_TYPES: ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS: ALLOWED_EXTENSIONS
};

/**
 * Get video metadata for a task
 * @param {string} taskId - The task ID
 * @returns {Promise<Object|null>} Video metadata or null if no video
 */
export const getTaskVideo = async (taskId) => {
  try {
    const response = await axios.get(`${API_URL}/tasks/${taskId}/video`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

/**
 * Get video status for a task (lightweight)
 * @param {string} taskId - The task ID
 * @returns {Promise<Object>} Video status info
 */
export const getVideoStatus = async (taskId) => {
  try {
    const response = await axios.get(`${API_URL}/tasks/${taskId}/video/status`);
    return response.data;
  } catch (error) {
    return { has_video: false, status: null, error_message: null };
  }
};

/**
 * Initialize a video record (preparation for upload)
 * @param {string} taskId - The task ID
 * @param {Object} videoData - Video metadata
 * @returns {Promise<Object>} Created video record
 */
export const createVideoRecord = async (taskId, videoData) => {
  const response = await axios.post(`${API_URL}/tasks/${taskId}/video`, {
    task_id: taskId,
    original_filename: videoData.filename,
    file_size: videoData.size,
    mime_type: videoData.type
  });
  return response.data;
};

/**
 * Update video status
 * @param {string} taskId - The task ID
 * @param {Object} updateData - Update data (status, duration, error_message)
 * @returns {Promise<Object>} Updated video record
 */
export const updateVideoStatus = async (taskId, updateData) => {
  const response = await axios.patch(`${API_URL}/tasks/${taskId}/video`, updateData);
  return response.data;
};

/**
 * Delete video for a task
 * @param {string} taskId - The task ID
 * @returns {Promise<void>}
 */
export const deleteVideo = async (taskId) => {
  await axios.delete(`${API_URL}/tasks/${taskId}/video`);
};

/**
 * Download video file for a task
 * @param {string} taskId - The task ID
 * @param {string} filename - Original filename for the download
 * @returns {Promise<void>}
 */
export const downloadVideo = async (taskId, filename = 'video.mp4') => {
  const response = await axios.get(`${API_URL}/tasks/${taskId}/video/download`, {
    responseType: 'blob'
  });
  
  // Create blob URL and trigger download
  const blob = new Blob([response.data], { type: 'video/mp4' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Get video stream URL (for in-browser preview)
 * @param {string} taskId - The task ID
 * @returns {string} Stream URL
 */
export const getVideoStreamUrl = (taskId) => {
  return `${API_URL}/tasks/${taskId}/video/stream`;
};

/**
 * Upload a video file for a task
 * @param {string} taskId - The task ID
 * @param {File} file - The video file to upload
 * @param {function} onProgress - Progress callback (0-100)
 * @returns {Promise<Object>} Uploaded video record
 */
export const uploadVideo = async (taskId, file, onProgress) => {
  // Validate file before upload
  const validation = validateVideoFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post(
    `${API_URL}/tasks/${taskId}/video/upload`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    }
  );

  return response.data;
};

/**
 * Validate a video file before upload
 * Uses centralized validation from videoRules config
 * @param {File} file - The file to validate
 * @returns {Object} { valid: boolean, error?: string, warning?: string }
 */
export const validateVideoFile = (file) => {
  return validateFile(file);
};

/**
 * Check if a task can be published (has ready video)
 * @param {string} taskId - The task ID
 * @returns {Promise<Object>} { canPublish: boolean, reason?: string }
 */
export const canTaskBePublished = async (taskId) => {
  const videoStatus = await getVideoStatus(taskId);
  
  if (!videoStatus.has_video) {
    return {
      canPublish: false,
      reason: 'A video is required before publishing'
    };
  }
  
  if (videoStatus.status !== VIDEO_STATUS.READY) {
    return {
      canPublish: false,
      reason: `Video is not ready (current status: ${videoStatus.status})`
    };
  }
  
  return { canPublish: true };
};

// Note: formatFileSize and formatDuration are imported from videoRules config
// and re-exported at the top of this file for backward compatibility

export default {
  getTaskVideo,
  getVideoStatus,
  createVideoRecord,
  updateVideoStatus,
  deleteVideo,
  downloadVideo,
  getVideoStreamUrl,
  uploadVideo,
  validateVideoFile,
  canTaskBePublished,
  formatFileSize,
  formatDuration,
  VIDEO_STATUS,
  VIDEO_STATUS_CONFIG,
  VIDEO_CONFIG
};
