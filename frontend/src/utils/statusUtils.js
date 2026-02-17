/**
 * STATUS UTILITIES
 * 
 * Helper functions for working with task statuses.
 * All status logic should go through these utilities.
 * 
 * @module statusUtils
 */

import {
  TASK_STATUSES,
  STATUS,
  STATUS_TRANSITIONS,
  ROLE_TRANSITIONS,
  STATUS_COLOR_MAP,
  STATUS_MIGRATION_MAP,
  TERMINAL_STATUSES,
  READ_ONLY_STATUSES,
} from '../config/taskStatuses';

// ============================================
// MIGRATION
// ============================================

/**
 * Migrate a status value from old to new (if needed)
 * @param {string} status - Status value (possibly old)
 * @returns {string} Current status value
 */
export const migrateStatus = (status) => {
  if (!status) return STATUS.DRAFT;
  return STATUS_MIGRATION_MAP[status] || status;
};

// ============================================
// STATUS METADATA
// ============================================

/**
 * Get full metadata for a status
 * @param {string} status - Status value
 * @returns {Object|null} Status metadata object
 */
export const getStatusMeta = (status) => {
  const normalizedStatus = migrateStatus(status);
  const entry = Object.values(TASK_STATUSES).find((s) => s.value === normalizedStatus);
  return entry || null;
};

/**
 * Get status label for display
 * @param {string} status - Status value
 * @returns {string} Display label
 */
export const getStatusLabel = (status) => {
  const meta = getStatusMeta(status);
  return meta?.label || status;
};

/**
 * Get status color classes
 * @param {string} status - Status value
 * @returns {Object} Object with bg, text, badge classes
 */
export const getStatusColors = (status) => {
  const meta = getStatusMeta(status);
  const colorKey = meta?.color || 'neutral';
  return STATUS_COLOR_MAP[colorKey] || STATUS_COLOR_MAP.neutral;
};

/**
 * Get badge class for a status
 * @param {string} status - Status value
 * @returns {string} Tailwind badge class
 */
export const getStatusBadgeClass = (status) => {
  return getStatusColors(status).badge;
};

/**
 * Get text color class for a status
 * @param {string} status - Status value
 * @returns {string} Tailwind text color class
 */
export const getStatusTextColor = (status) => {
  return getStatusColors(status).text;
};

/**
 * Get background color class for a status
 * @param {string} status - Status value
 * @returns {string} Tailwind bg color class
 */
export const getStatusBgColor = (status) => {
  return getStatusColors(status).bg;
};

/**
 * Get sort order for a status
 * @param {string} status - Status value
 * @returns {number} Sort order (1-9)
 */
export const getStatusOrder = (status) => {
  const meta = getStatusMeta(status);
  return meta?.order || 99;
};

// ============================================
// TRANSITION LOGIC
// ============================================

/**
 * Get all possible next statuses (role-agnostic)
 * @param {string} currentStatus - Current status value
 * @returns {string[]} Array of valid target status values
 */
export const getNextStatuses = (currentStatus) => {
  const normalized = migrateStatus(currentStatus);
  return STATUS_TRANSITIONS[normalized] || [];
};

/**
 * Get available transitions for a role
 * @param {string} currentStatus - Current status value
 * @param {string} role - User role (Admin, Editor, Producer, Approver)
 * @returns {Array<{label: string, target: string}>} Array of transition objects
 */
export const getAvailableTransitions = (currentStatus, role) => {
  const normalized = migrateStatus(currentStatus);
  const roleTransitions = ROLE_TRANSITIONS[role];
  if (!roleTransitions) return [];
  return roleTransitions[normalized] || [];
};

/**
 * Check if a transition is structurally valid (regardless of role)
 * @param {string} fromStatus - Current status
 * @param {string} toStatus - Target status
 * @returns {boolean}
 */
export const canTransition = (fromStatus, toStatus) => {
  const normalizedFrom = migrateStatus(fromStatus);
  const normalizedTo = migrateStatus(toStatus);
  const validTargets = STATUS_TRANSITIONS[normalizedFrom] || [];
  return validTargets.includes(normalizedTo);
};

/**
 * Check if a role can perform a specific transition
 * @param {string} fromStatus - Current status
 * @param {string} toStatus - Target status
 * @param {string} role - User role
 * @returns {boolean}
 */
export const canRoleTransition = (fromStatus, toStatus, role) => {
  const transitions = getAvailableTransitions(fromStatus, role);
  const normalizedTo = migrateStatus(toStatus);
  return transitions.some((t) => t.target === normalizedTo);
};

/**
 * Validate a transition and return result
 * @param {string} fromStatus - Current status
 * @param {string} toStatus - Target status
 * @param {string} role - User role
 * @returns {{valid: boolean, error: string|null}}
 */
export const validateTransition = (fromStatus, toStatus, role) => {
  const normalizedFrom = migrateStatus(fromStatus);
  const normalizedTo = migrateStatus(toStatus);
  
  // Check if transition is structurally valid
  if (!canTransition(normalizedFrom, normalizedTo)) {
    // Special case: Admin can reset Rejected to Draft
    if (role === 'Admin' && normalizedFrom === STATUS.REJECTED && normalizedTo === STATUS.DRAFT) {
      return { valid: true, error: null };
    }
    return {
      valid: false,
      error: `Invalid transition: ${getStatusLabel(normalizedFrom)} → ${getStatusLabel(normalizedTo)}`,
    };
  }
  
  // Check if role is allowed
  if (!canRoleTransition(normalizedFrom, normalizedTo, role)) {
    return {
      valid: false,
      error: `${role} cannot transition from ${getStatusLabel(normalizedFrom)} to ${getStatusLabel(normalizedTo)}`,
    };
  }
  
  return { valid: true, error: null };
};

// ============================================
// STATUS STATE CHECKS
// ============================================

/**
 * Check if a status is terminal (end state)
 * @param {string} status - Status value
 * @returns {boolean}
 */
export const isTerminalStatus = (status) => {
  const normalized = migrateStatus(status);
  return TERMINAL_STATUSES.includes(normalized);
};

/**
 * Check if a status is read-only for editing
 * @param {string} status - Status value
 * @returns {boolean}
 */
export const isReadOnlyStatus = (status) => {
  const normalized = migrateStatus(status);
  return READ_ONLY_STATUSES.includes(normalized);
};

/**
 * Check if task fields can be edited in this status
 * @param {string} status - Status value
 * @param {string} role - User role
 * @returns {boolean}
 */
export const canEditInStatus = (status, role) => {
  if (role === 'Admin') return true;
  if (role === 'Approver') return false;
  return !isReadOnlyStatus(status);
};

// ============================================
// LIST HELPERS
// ============================================

/**
 * Get all statuses as array sorted by order
 * @returns {Array<{value: string, label: string}>}
 */
export const getStatusList = () => {
  return Object.values(TASK_STATUSES)
    .sort((a, b) => a.order - b.order)
    .map((s) => ({ value: s.value, label: s.label }));
};

/**
 * Get status options for select/filter components
 * @param {boolean} includeAll - Whether to include "All" option
 * @returns {Array<{value: string, label: string}>}
 */
export const getStatusFilterOptions = (includeAll = true) => {
  const options = getStatusList();
  if (includeAll) {
    return [{ value: '', label: 'All Statuses' }, ...options];
  }
  return options;
};

// Re-export constants for convenience
export { STATUS, TASK_STATUSES, TERMINAL_STATUSES, READ_ONLY_STATUSES } from '../config/taskStatuses';
