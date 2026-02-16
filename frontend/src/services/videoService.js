/**
 * Video Service Layer
 * Handles all video-related API calls and state management
 * Phase 3: Architecture skeleton - no upload logic
 */

import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

/**
 * Video status constants
 */
export const VIDEO_STATUS = {
  PENDING: 'pending',
  UPLOADING: 'uploading',
  PROCESSING: 'processing',
  READY: 'ready',
  FAILED: 'failed'
};

/**
 * Video status display configuration
 */
export const VIDEO_STATUS_CONFIG = {
  [VIDEO_STATUS.PENDING]: {
    label: 'Pending',
    color: 'bg-ministry-status-draft',
    description: 'Video upload initialized'
  },
  [VIDEO_STATUS.UPLOADING]: {
    label: 'Uploading',
    color: 'bg-ministry-status-submitted',
    description: 'Video is being uploaded'
  },
  [VIDEO_STATUS.PROCESSING]: {
    label: 'Processing',
    color: 'bg-ministry-status-producing',
    description: 'Video is being processed'
  },
  [VIDEO_STATUS.READY]: {
    label: 'Ready',
    color: 'bg-ministry-status-published',
    description: 'Video is ready for use'
  },
  [VIDEO_STATUS.FAILED]: {
    label: 'Failed',
    color: 'bg-ministry-status-rejected',
    description: 'Video processing failed'
  }
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

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (!bytes) return 'Unknown';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

/**
 * Format duration for display
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration (MM:SS or HH:MM:SS)
 */
export const formatDuration = (seconds) => {
  if (!seconds) return 'Unknown';
  
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default {
  getTaskVideo,
  getVideoStatus,
  createVideoRecord,
  updateVideoStatus,
  deleteVideo,
  canTaskBePublished,
  formatFileSize,
  formatDuration,
  VIDEO_STATUS,
  VIDEO_STATUS_CONFIG
};
