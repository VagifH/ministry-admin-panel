/**
 * Centralized Task Status Configuration
 * Single source of truth for all task status labels, colors, and workflow logic
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
    badgeClass: 'bg-ministry-status-draft text-white'
  },
  [TASK_STATUS.SUBMITTED]: {
    label: 'Submitted',
    color: 'bg-ministry-status-submitted',
    textColor: 'text-ministry-status-submitted',
    badgeClass: 'bg-ministry-status-submitted text-white'
  },
  [TASK_STATUS.PRODUCING]: {
    label: 'Producing',
    color: 'bg-ministry-status-producing',
    textColor: 'text-ministry-status-producing',
    badgeClass: 'bg-ministry-status-producing text-white'
  },
  [TASK_STATUS.REVIEW]: {
    label: 'Review',
    color: 'bg-ministry-status-review',
    textColor: 'text-ministry-status-review',
    badgeClass: 'bg-ministry-status-review text-white'
  },
  [TASK_STATUS.SCHEDULED]: {
    label: 'Scheduled',
    color: 'bg-ministry-status-scheduled',
    textColor: 'text-ministry-status-scheduled',
    badgeClass: 'bg-ministry-status-scheduled text-white'
  },
  [TASK_STATUS.PUBLISHED]: {
    label: 'Published',
    color: 'bg-ministry-status-published',
    textColor: 'text-ministry-status-published',
    badgeClass: 'bg-ministry-status-published text-white'
  },
  [TASK_STATUS.REJECTED]: {
    label: 'Rejected',
    color: 'bg-ministry-status-rejected',
    textColor: 'text-ministry-status-rejected',
    badgeClass: 'bg-ministry-status-rejected text-white'
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
 */
export const TASK_STATUS_LIST = Object.values(TASK_STATUS);

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

/**
 * Content type configuration
 */
export const CONTENT_TYPE = {
  ANNOUNCEMENT: 'Announcement',
  SHORT_LESSON: 'Short Lesson',
  FULL_LESSON: 'Full Lesson'
};

export const CONTENT_TYPE_CONFIG = {
  [CONTENT_TYPE.ANNOUNCEMENT]: {
    label: 'Announcement',
    accentColor: 'bg-gray-400'
  },
  [CONTENT_TYPE.SHORT_LESSON]: {
    label: 'Short Lesson',
    accentColor: 'bg-blue-500'
  },
  [CONTENT_TYPE.FULL_LESSON]: {
    label: 'Full Lesson',
    accentColor: 'bg-purple-500'
  }
};

/**
 * Get accent color for content type
 * @param {string} contentType - Content type value
 * @returns {string} Tailwind class for accent color
 */
export const getContentTypeAccent = (contentType) => {
  return CONTENT_TYPE_CONFIG[contentType]?.accentColor || 'bg-gray-400';
};

/**
 * All content types as array (for dropdowns)
 */
export const CONTENT_TYPE_LIST = Object.values(CONTENT_TYPE);
