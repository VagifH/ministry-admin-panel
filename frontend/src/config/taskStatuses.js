/**
 * TASK STATUS ENGINE - Single Source of Truth
 * 
 * This file defines ALL task statuses, their metadata, and transition rules.
 * No status strings should be hardcoded anywhere else in the application.
 * 
 * @module taskStatuses
 */

// ============================================
// STATUS DEFINITIONS
// ============================================

/**
 * Task status enumeration with full metadata
 * 
 * @property {string} key - Database/API value (lowercase with underscores)
 * @property {string} value - Display value (PascalCase, used in API responses)
 * @property {number} order - Sort order for lists/filters
 * @property {string} color - Semantic color name
 * @property {boolean} terminal - Whether this is an end state
 * @property {boolean} editable - Whether task fields can be edited in this status
 */
export const TASK_STATUSES = {
  DRAFT: {
    key: 'draft',
    value: 'Draft',
    label: 'Draft',
    order: 1,
    color: 'neutral',
    terminal: false,
    editable: true,
  },
  SUBMITTED: {
    key: 'submitted',
    value: 'Submitted',
    label: 'Submitted',
    order: 2,
    color: 'blue',
    terminal: false,
    editable: true,
  },
  IN_PROGRESS: {
    key: 'in_progress',
    value: 'InProgress',
    label: 'In Progress',
    order: 3,
    color: 'purple',
    terminal: false,
    editable: true,
  },
  READY_FOR_REVIEW: {
    key: 'ready_for_review',
    value: 'ReadyForReview',
    label: 'Ready for Review',
    order: 4,
    color: 'orange',
    terminal: false,
    editable: true,
  },
  CHANGES_REQUESTED: {
    key: 'changes_requested',
    value: 'ChangesRequested',
    label: 'Changes Requested',
    order: 5,
    color: 'amber',
    terminal: false,
    editable: true,
  },
  APPROVED: {
    key: 'approved',
    value: 'Approved',
    label: 'Approved',
    order: 6,
    color: 'green',
    terminal: false,
    editable: false,
  },
  REJECTED: {
    key: 'rejected',
    value: 'Rejected',
    label: 'Rejected',
    order: 7,
    color: 'red',
    terminal: true,
    editable: false,
  },
  SCHEDULED: {
    key: 'scheduled',
    value: 'Scheduled',
    label: 'Scheduled',
    order: 8,
    color: 'teal',
    terminal: false,
    editable: false,
  },
  PUBLISHED: {
    key: 'published',
    value: 'Published',
    label: 'Published',
    order: 9,
    color: 'green',
    terminal: true,
    editable: false,
  },
};

// ============================================
// STATUS VALUE CONSTANTS (for easy import)
// ============================================

/**
 * Status values as used in API/database
 * Use these constants instead of hardcoding strings
 */
export const STATUS = {
  DRAFT: TASK_STATUSES.DRAFT.value,
  SUBMITTED: TASK_STATUSES.SUBMITTED.value,
  IN_PROGRESS: TASK_STATUSES.IN_PROGRESS.value,
  READY_FOR_REVIEW: TASK_STATUSES.READY_FOR_REVIEW.value,
  CHANGES_REQUESTED: TASK_STATUSES.CHANGES_REQUESTED.value,
  APPROVED: TASK_STATUSES.APPROVED.value,
  REJECTED: TASK_STATUSES.REJECTED.value,
  SCHEDULED: TASK_STATUSES.SCHEDULED.value,
  PUBLISHED: TASK_STATUSES.PUBLISHED.value,
};

// ============================================
// TRANSITION MAP
// ============================================

/**
 * Allowed status transitions (role-agnostic)
 * Maps from status value to array of valid target status values
 */
export const STATUS_TRANSITIONS = {
  [STATUS.DRAFT]: [STATUS.SUBMITTED],
  [STATUS.SUBMITTED]: [STATUS.IN_PROGRESS],
  [STATUS.IN_PROGRESS]: [STATUS.READY_FOR_REVIEW],
  [STATUS.READY_FOR_REVIEW]: [STATUS.APPROVED, STATUS.CHANGES_REQUESTED, STATUS.REJECTED],
  [STATUS.CHANGES_REQUESTED]: [STATUS.IN_PROGRESS],
  [STATUS.APPROVED]: [STATUS.SCHEDULED],
  [STATUS.SCHEDULED]: [STATUS.PUBLISHED],
  [STATUS.PUBLISHED]: [],
  [STATUS.REJECTED]: [], // Terminal - Admin can reset via special action
};

// ============================================
// ROLE-BASED TRANSITIONS
// ============================================

/**
 * Role-based transition permissions
 * Each role can only perform specific transitions
 */
export const ROLE_TRANSITIONS = {
  Admin: {
    [STATUS.DRAFT]: [{ label: 'Submit', target: STATUS.SUBMITTED }],
    [STATUS.SUBMITTED]: [{ label: 'Start Production', target: STATUS.IN_PROGRESS }],
    [STATUS.IN_PROGRESS]: [{ label: 'Ready for Review', target: STATUS.READY_FOR_REVIEW }],
    [STATUS.READY_FOR_REVIEW]: [
      { label: 'Approve', target: STATUS.APPROVED },
      { label: 'Request Changes', target: STATUS.CHANGES_REQUESTED },
      { label: 'Reject', target: STATUS.REJECTED },
    ],
    [STATUS.CHANGES_REQUESTED]: [{ label: 'Resume Production', target: STATUS.IN_PROGRESS }],
    [STATUS.APPROVED]: [{ label: 'Schedule', target: STATUS.SCHEDULED }],
    [STATUS.REJECTED]: [{ label: 'Reset to Draft', target: STATUS.DRAFT }],
    [STATUS.SCHEDULED]: [{ label: 'Publish', target: STATUS.PUBLISHED }],
    [STATUS.PUBLISHED]: [],
  },
  Editor: {
    [STATUS.DRAFT]: [{ label: 'Submit', target: STATUS.SUBMITTED }],
    [STATUS.SUBMITTED]: [],
    [STATUS.IN_PROGRESS]: [],
    [STATUS.READY_FOR_REVIEW]: [],
    [STATUS.CHANGES_REQUESTED]: [],
    [STATUS.APPROVED]: [{ label: 'Schedule', target: STATUS.SCHEDULED }],
    [STATUS.REJECTED]: [],
    [STATUS.SCHEDULED]: [{ label: 'Publish', target: STATUS.PUBLISHED }],
    [STATUS.PUBLISHED]: [],
  },
  Producer: {
    [STATUS.DRAFT]: [],
    [STATUS.SUBMITTED]: [{ label: 'Start Production', target: STATUS.IN_PROGRESS }],
    [STATUS.IN_PROGRESS]: [{ label: 'Ready for Review', target: STATUS.READY_FOR_REVIEW }],
    [STATUS.READY_FOR_REVIEW]: [],
    [STATUS.CHANGES_REQUESTED]: [{ label: 'Resume Production', target: STATUS.IN_PROGRESS }],
    [STATUS.APPROVED]: [],
    [STATUS.REJECTED]: [],
    [STATUS.SCHEDULED]: [],
    [STATUS.PUBLISHED]: [],
  },
  Approver: {
    [STATUS.DRAFT]: [],
    [STATUS.SUBMITTED]: [],
    [STATUS.IN_PROGRESS]: [],
    [STATUS.READY_FOR_REVIEW]: [
      { label: 'Approve', target: STATUS.APPROVED },
      { label: 'Request Changes', target: STATUS.CHANGES_REQUESTED },
      { label: 'Reject', target: STATUS.REJECTED },
    ],
    [STATUS.CHANGES_REQUESTED]: [],
    [STATUS.APPROVED]: [],
    [STATUS.REJECTED]: [],
    [STATUS.SCHEDULED]: [],
    [STATUS.PUBLISHED]: [],
  },
};

// ============================================
// STATUS COLOR MAPPING
// ============================================

/**
 * Maps semantic color names to Tailwind classes
 */
export const STATUS_COLOR_MAP = {
  neutral: {
    bg: 'bg-ministry-status-draft',
    text: 'text-ministry-status-draft',
    badge: 'bg-ministry-status-draft text-white',
  },
  blue: {
    bg: 'bg-ministry-status-submitted',
    text: 'text-ministry-status-submitted',
    badge: 'bg-ministry-status-submitted text-white',
  },
  purple: {
    bg: 'bg-ministry-status-inprogress',
    text: 'text-ministry-status-inprogress',
    badge: 'bg-ministry-status-inprogress text-white',
  },
  orange: {
    bg: 'bg-ministry-status-readyforreview',
    text: 'text-ministry-status-readyforreview',
    badge: 'bg-ministry-status-readyforreview text-white',
  },
  amber: {
    bg: 'bg-ministry-status-changesrequested',
    text: 'text-ministry-status-changesrequested',
    badge: 'bg-ministry-status-changesrequested text-white',
  },
  green: {
    bg: 'bg-ministry-status-approved',
    text: 'text-ministry-status-approved',
    badge: 'bg-ministry-status-approved text-white',
  },
  red: {
    bg: 'bg-ministry-status-rejected',
    text: 'text-ministry-status-rejected',
    badge: 'bg-ministry-status-rejected text-white',
  },
  teal: {
    bg: 'bg-ministry-status-scheduled',
    text: 'text-ministry-status-scheduled',
    badge: 'bg-ministry-status-scheduled text-white',
  },
};

// ============================================
// MIGRATION MAP (for backward compatibility)
// ============================================

/**
 * Maps old status values to new ones
 * Used when loading existing data from database
 */
export const STATUS_MIGRATION_MAP = {
  Producing: STATUS.IN_PROGRESS,
  Review: STATUS.READY_FOR_REVIEW,
};

// ============================================
// DERIVED LISTS
// ============================================

/**
 * All statuses sorted by order (for dropdowns/filters)
 */
export const STATUS_LIST = Object.values(TASK_STATUSES)
  .sort((a, b) => a.order - b.order)
  .map((s) => s.value);

/**
 * Terminal statuses (end states)
 */
export const TERMINAL_STATUSES = Object.values(TASK_STATUSES)
  .filter((s) => s.terminal)
  .map((s) => s.value);

/**
 * Non-editable statuses
 */
export const READ_ONLY_STATUSES = Object.values(TASK_STATUSES)
  .filter((s) => !s.editable)
  .map((s) => s.value);
