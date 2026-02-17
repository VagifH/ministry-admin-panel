/**
 * Centralized Task & Video Status Configuration
 * Single source of truth for all status labels, colors, and workflow logic
 */

/**
 * Task status constants - use these instead of string literals
 */
export const TASK_STATUS = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  PRODUCING: 'Producing',
  REVIEW: 'Review',
  SCHEDULED: 'Scheduled',
  PUBLISHED: 'Published',
  REJECTED: 'Rejected'
};

/**
 * Task status display configuration
 * Maps status values to their display properties
 */
export const TASK_STATUS_CONFIG = {
  [TASK_STATUS.DRAFT]: {
    label: 'Draft',
    color: 'bg-ministry-status-draft',
    textColor: 'text-ministry-status-draft',
    badgeClass: 'bg-ministry-status-draft text-white',
    order: 1,
    visible: true
  },
  [TASK_STATUS.SUBMITTED]: {
    label: 'Submitted',
    color: 'bg-ministry-status-submitted',
    textColor: 'text-ministry-status-submitted',
    badgeClass: 'bg-ministry-status-submitted text-white',
    order: 2,
    visible: true
  },
  [TASK_STATUS.PRODUCING]: {
    label: 'Producing',
    color: 'bg-ministry-status-producing',
    textColor: 'text-ministry-status-producing',
    badgeClass: 'bg-ministry-status-producing text-white',
    order: 3,
    visible: true
  },
  [TASK_STATUS.REVIEW]: {
    label: 'Review',
    color: 'bg-ministry-status-review',
    textColor: 'text-ministry-status-review',
    badgeClass: 'bg-ministry-status-review text-white',
    order: 4,
    visible: true
  },
  [TASK_STATUS.SCHEDULED]: {
    label: 'Scheduled',
    color: 'bg-ministry-status-scheduled',
    textColor: 'text-ministry-status-scheduled',
    badgeClass: 'bg-ministry-status-scheduled text-white',
    order: 5,
    visible: true
  },
  [TASK_STATUS.PUBLISHED]: {
    label: 'Published',
    color: 'bg-ministry-status-published',
    textColor: 'text-ministry-status-published',
    badgeClass: 'bg-ministry-status-published text-white',
    order: 6,
    visible: true
  },
  [TASK_STATUS.REJECTED]: {
    label: 'Rejected',
    color: 'bg-ministry-status-rejected',
    textColor: 'text-ministry-status-rejected',
    badgeClass: 'bg-ministry-status-rejected text-white',
    order: 7,
    visible: true
  }
};

/**
 * Get badge class for a status
 * @param {string} status - Task status value
 * @returns {string} Tailwind class string for badge styling
 */
export const getStatusBadgeClass = (status) => {
  return TASK_STATUS_CONFIG[status]?.badgeClass || TASK_STATUS_CONFIG[TASK_STATUS.DRAFT].badgeClass;
};

/**
 * Get text color class for a status
 * @param {string} status - Task status value
 * @returns {string} Tailwind class string for text color
 */
export const getStatusTextColor = (status) => {
  return TASK_STATUS_CONFIG[status]?.textColor || TASK_STATUS_CONFIG[TASK_STATUS.DRAFT].textColor;
};

/**
 * All task statuses as array (for dropdowns, filters)
 * Sorted by order, filtered by visibility
 */
export const TASK_STATUS_LIST = Object.entries(TASK_STATUS_CONFIG)
  .filter(([_, config]) => config.visible)
  .sort((a, b) => a[1].order - b[1].order)
  .map(([status]) => status);

/**
 * Read-only statuses - tasks in these statuses cannot be edited by Editor/Approver
 */
export const READ_ONLY_STATUSES = [TASK_STATUS.SCHEDULED, TASK_STATUS.PUBLISHED];

/**
 * Check if a status is read-only for editing
 * @param {string} status - Task status value
 * @returns {boolean}
 */
export const isReadOnlyStatus = (status) => READ_ONLY_STATUSES.includes(status);

/**
 * Task workflow transitions by role
 * Defines which status transitions are allowed for each role
 */
export const TASK_WORKFLOW = {
  Admin: {
    [TASK_STATUS.DRAFT]: [{ label: 'Submit', targetStatus: TASK_STATUS.SUBMITTED }],
    [TASK_STATUS.SUBMITTED]: [{ label: 'Move to Producing', targetStatus: TASK_STATUS.PRODUCING }],
    [TASK_STATUS.PRODUCING]: [{ label: 'Move to Review', targetStatus: TASK_STATUS.REVIEW }],
    [TASK_STATUS.REVIEW]: [
      { label: 'Schedule', targetStatus: TASK_STATUS.SCHEDULED },
      { label: 'Reject', targetStatus: TASK_STATUS.REJECTED }
    ],
    [TASK_STATUS.REJECTED]: [{ label: 'Move to Draft', targetStatus: TASK_STATUS.DRAFT }],
    [TASK_STATUS.SCHEDULED]: [{ label: 'Publish', targetStatus: TASK_STATUS.PUBLISHED }],
    [TASK_STATUS.PUBLISHED]: []
  },
  Editor: {
    [TASK_STATUS.DRAFT]: [{ label: 'Submit', targetStatus: TASK_STATUS.SUBMITTED }],
    [TASK_STATUS.SUBMITTED]: [],
    [TASK_STATUS.PRODUCING]: [],
    [TASK_STATUS.REVIEW]: [],
    [TASK_STATUS.REJECTED]: [],
    [TASK_STATUS.SCHEDULED]: [],
    [TASK_STATUS.PUBLISHED]: []
  },
  Approver: {
    [TASK_STATUS.DRAFT]: [],
    [TASK_STATUS.SUBMITTED]: [],
    [TASK_STATUS.PRODUCING]: [],
    [TASK_STATUS.REVIEW]: [
      { label: 'Schedule', targetStatus: TASK_STATUS.SCHEDULED },
      { label: 'Reject', targetStatus: TASK_STATUS.REJECTED }
    ],
    [TASK_STATUS.REJECTED]: [],
    [TASK_STATUS.SCHEDULED]: [],
    [TASK_STATUS.PUBLISHED]: []
  }
};

/**
 * Get available status transitions for a task based on role
 * @param {string} currentStatus - Current task status
 * @param {string} role - User role (Admin, Editor, Approver)
 * @returns {Array} Array of available transitions
 */
export const getAvailableTransitions = (currentStatus, role) => {
  return TASK_WORKFLOW[role]?.[currentStatus] || [];
};

// ============================================
// VIDEO STATUS CONFIGURATION
// ============================================

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
    textColor: 'text-ministry-status-draft',
    description: 'Video upload initialized',
    order: 1,
    visible: true
  },
  [VIDEO_STATUS.UPLOADING]: {
    label: 'Uploading',
    color: 'bg-ministry-status-submitted',
    textColor: 'text-ministry-status-submitted',
    description: 'Video is being uploaded',
    order: 2,
    visible: true
  },
  [VIDEO_STATUS.PROCESSING]: {
    label: 'Processing',
    color: 'bg-ministry-status-producing',
    textColor: 'text-ministry-status-producing',
    description: 'Video is being processed',
    order: 3,
    visible: true
  },
  [VIDEO_STATUS.READY]: {
    label: 'Ready',
    color: 'bg-ministry-status-success',
    textColor: 'text-ministry-status-success',
    description: 'Video is ready for use',
    order: 4,
    visible: true
  },
  [VIDEO_STATUS.FAILED]: {
    label: 'Failed',
    color: 'bg-ministry-status-rejected',
    textColor: 'text-ministry-status-rejected',
    description: 'Video processing failed',
    order: 5,
    visible: true
  }
};

/**
 * Get video status badge class
 * @param {string} status - Video status value
 * @returns {string} Tailwind class string
 */
export const getVideoStatusBadgeClass = (status) => {
  return VIDEO_STATUS_CONFIG[status]?.color || VIDEO_STATUS_CONFIG[VIDEO_STATUS.PENDING].color;
};

/**
 * Get video status label
 * @param {string} status - Video status value
 * @returns {string} Display label
 */
export const getVideoStatusLabel = (status) => {
  return VIDEO_STATUS_CONFIG[status]?.label || status;
};

/**
 * Get video status description
 * @param {string} status - Video status value
 * @returns {string} Description text
 */
export const getVideoStatusDescription = (status) => {
  return VIDEO_STATUS_CONFIG[status]?.description || '';
};
