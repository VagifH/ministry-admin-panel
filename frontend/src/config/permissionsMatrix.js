/**
 * Permissions Matrix Configuration
 * Centralized role-based access control for all actions and pages
 */

/**
 * User roles
 */
export const ROLES = {
  ADMIN: 'Admin',
  EDITOR: 'Editor',           // Ministry Editor
  PRODUCER: 'Producer',       // V Studio Producer
  APPROVER: 'Approver'
};

/**
 * Page access permissions
 */
export const PAGE_PERMISSIONS = {
  dashboard: [ROLES.ADMIN, ROLES.EDITOR, ROLES.PRODUCER, ROLES.APPROVER],
  tasks: [ROLES.ADMIN, ROLES.EDITOR, ROLES.PRODUCER, ROLES.APPROVER],
  task_details: [ROLES.ADMIN, ROLES.EDITOR, ROLES.PRODUCER, ROLES.APPROVER],
  calendar: [ROLES.ADMIN, ROLES.EDITOR, ROLES.PRODUCER, ROLES.APPROVER],
  activity_log: [ROLES.ADMIN, ROLES.EDITOR],  // Only Admin and Editor
  settings: [ROLES.ADMIN],  // Admin only
};

/**
 * Action types
 */
export const ACTIONS = {
  // Task actions
  VIEW_TASKS: 'view_tasks',
  CREATE_TASK: 'create_task',
  EDIT_TASK: 'edit_task',
  DELETE_TASK: 'delete_task',
  
  // Status transition actions
  SUBMIT_TASK: 'submit_task',
  PRODUCE_TASK: 'produce_task',
  REVIEW_TASK: 'review_task',
  SCHEDULE_TASK: 'schedule_task',
  PUBLISH_TASK: 'publish_task',
  REJECT_TASK: 'reject_task',
  
  // Video actions
  UPLOAD_VIDEO: 'upload_video',
  DOWNLOAD_VIDEO: 'download_video',
  DELETE_VIDEO: 'delete_video',
  STREAM_VIDEO: 'stream_video',
  
  // User management actions
  VIEW_USERS: 'view_users',
  CREATE_USER: 'create_user',
  EDIT_USER: 'edit_user',
  DELETE_USER: 'delete_user',
  
  // Avatar management
  MANAGE_AVATARS: 'manage_avatars',
  
  // Audit actions
  VIEW_AUDIT_LOGS: 'view_audit_logs',
  
  // Comment actions
  VIEW_COMMENTS: 'view_comments',
  ADD_COMMENT: 'add_comment'
};

/**
 * Permissions matrix
 * Maps roles to their allowed actions
 */
export const PERMISSIONS_MATRIX = {
  [ROLES.ADMIN]: {
    // Full access to all actions
    [ACTIONS.VIEW_TASKS]: true,
    [ACTIONS.CREATE_TASK]: true,
    [ACTIONS.EDIT_TASK]: true,
    [ACTIONS.DELETE_TASK]: true,
    
    [ACTIONS.SUBMIT_TASK]: true,
    [ACTIONS.PRODUCE_TASK]: true,
    [ACTIONS.REVIEW_TASK]: true,
    [ACTIONS.SCHEDULE_TASK]: true,
    [ACTIONS.PUBLISH_TASK]: true,
    [ACTIONS.REJECT_TASK]: true,
    
    [ACTIONS.UPLOAD_VIDEO]: true,
    [ACTIONS.DOWNLOAD_VIDEO]: true,
    [ACTIONS.DELETE_VIDEO]: true,
    [ACTIONS.STREAM_VIDEO]: true,
    
    [ACTIONS.VIEW_USERS]: true,
    [ACTIONS.CREATE_USER]: true,
    [ACTIONS.EDIT_USER]: true,
    [ACTIONS.DELETE_USER]: true,
    
    [ACTIONS.MANAGE_AVATARS]: true,
    
    [ACTIONS.VIEW_AUDIT_LOGS]: true,
    
    [ACTIONS.VIEW_COMMENTS]: true,
    [ACTIONS.ADD_COMMENT]: true
  },
  
  [ROLES.EDITOR]: {
    // Ministry Editor: Create/edit tasks, submit, schedule approved, publish
    [ACTIONS.VIEW_TASKS]: true,
    [ACTIONS.CREATE_TASK]: true,
    [ACTIONS.EDIT_TASK]: true,  // Conditional: only for non-finalized
    [ACTIONS.DELETE_TASK]: false,
    
    [ACTIONS.SUBMIT_TASK]: true,
    [ACTIONS.PRODUCE_TASK]: false,
    [ACTIONS.REVIEW_TASK]: false,
    [ACTIONS.SCHEDULE_TASK]: true,  // Can schedule approved tasks
    [ACTIONS.PUBLISH_TASK]: true,   // Can publish scheduled tasks
    [ACTIONS.REJECT_TASK]: false,
    
    [ACTIONS.UPLOAD_VIDEO]: true,
    [ACTIONS.DOWNLOAD_VIDEO]: true,
    [ACTIONS.DELETE_VIDEO]: true,
    [ACTIONS.STREAM_VIDEO]: true,
    
    [ACTIONS.VIEW_USERS]: false,
    [ACTIONS.CREATE_USER]: false,
    [ACTIONS.EDIT_USER]: false,
    [ACTIONS.DELETE_USER]: false,
    
    [ACTIONS.MANAGE_AVATARS]: false,
    
    [ACTIONS.VIEW_AUDIT_LOGS]: true,
    
    [ACTIONS.VIEW_COMMENTS]: true,
    [ACTIONS.ADD_COMMENT]: true
  },
  
  [ROLES.PRODUCER]: {
    // V Studio Producer: Start production, submit for review
    [ACTIONS.VIEW_TASKS]: true,
    [ACTIONS.CREATE_TASK]: false,
    [ACTIONS.EDIT_TASK]: true,  // Can edit during production
    [ACTIONS.DELETE_TASK]: false,
    
    [ACTIONS.SUBMIT_TASK]: false,
    [ACTIONS.PRODUCE_TASK]: true,  // Start production, submit for review
    [ACTIONS.REVIEW_TASK]: false,
    [ACTIONS.SCHEDULE_TASK]: false,
    [ACTIONS.PUBLISH_TASK]: false,
    [ACTIONS.REJECT_TASK]: false,
    
    [ACTIONS.UPLOAD_VIDEO]: false,
    [ACTIONS.DOWNLOAD_VIDEO]: true,
    [ACTIONS.DELETE_VIDEO]: false,
    [ACTIONS.STREAM_VIDEO]: true,
    
    [ACTIONS.VIEW_USERS]: false,
    [ACTIONS.CREATE_USER]: false,
    [ACTIONS.EDIT_USER]: false,
    [ACTIONS.DELETE_USER]: false,
    
    [ACTIONS.MANAGE_AVATARS]: false,
    
    [ACTIONS.VIEW_AUDIT_LOGS]: false,
    
    [ACTIONS.VIEW_COMMENTS]: true,
    [ACTIONS.ADD_COMMENT]: true
  },
  
  [ROLES.APPROVER]: {
    // Approver: Approve/reject tasks in review
    [ACTIONS.VIEW_TASKS]: true,
    [ACTIONS.CREATE_TASK]: false,
    [ACTIONS.EDIT_TASK]: false,
    [ACTIONS.DELETE_TASK]: false,
    
    [ACTIONS.SUBMIT_TASK]: false,
    [ACTIONS.PRODUCE_TASK]: false,
    [ACTIONS.REVIEW_TASK]: true,   // Can approve/reject
    [ACTIONS.SCHEDULE_TASK]: false,
    [ACTIONS.PUBLISH_TASK]: false,
    [ACTIONS.REJECT_TASK]: true,
    
    [ACTIONS.UPLOAD_VIDEO]: false,
    [ACTIONS.DOWNLOAD_VIDEO]: true,
    [ACTIONS.DELETE_VIDEO]: false,
    [ACTIONS.STREAM_VIDEO]: true,
    
    [ACTIONS.VIEW_USERS]: false,
    [ACTIONS.CREATE_USER]: false,
    [ACTIONS.EDIT_USER]: false,
    [ACTIONS.DELETE_USER]: false,
    
    [ACTIONS.MANAGE_AVATARS]: false,
    
    [ACTIONS.VIEW_AUDIT_LOGS]: false,
    
    [ACTIONS.VIEW_COMMENTS]: true,
    [ACTIONS.ADD_COMMENT]: true
  }
};

/**
 * Check if a role has permission for an action
 * @param {string} role - User role
 * @param {string} action - Action to check
 * @returns {boolean}
 */
export const hasPermission = (role, action) => {
  return PERMISSIONS_MATRIX[role]?.[action] ?? false;
};

/**
 * Check if user can perform action (convenience function)
 * @param {Object} user - User object with role property
 * @param {string} action - Action to check
 * @returns {boolean}
 */
export const canPerformAction = (user, action) => {
  if (!user?.role) return false;
  return hasPermission(user.role, action);
};

/**
 * Check if a role can access a page
 * @param {string} role - User role
 * @param {string} page - Page name
 * @returns {boolean}
 */
export const canAccessPage = (role, page) => {
  const allowedRoles = PAGE_PERMISSIONS[page] || [];
  return allowedRoles.includes(role);
};

/**
 * Check if user can access a page
 * @param {Object} user - User object with role property
 * @param {string} page - Page name
 * @returns {boolean}
 */
export const userCanAccessPage = (user, page) => {
  if (!user?.role) return false;
  return canAccessPage(user.role, page);
};

/**
 * Get all allowed actions for a role
 * @param {string} role - User role
 * @returns {string[]} Array of allowed action names
 */
export const getAllowedActions = (role) => {
  const permissions = PERMISSIONS_MATRIX[role];
  if (!permissions) return [];
  return Object.entries(permissions)
    .filter(([_, allowed]) => allowed)
    .map(([action]) => action);
};

/**
 * Get all accessible pages for a role
 * @param {string} role - User role
 * @returns {string[]} Array of accessible page names
 */
export const getAccessiblePages = (role) => {
  return Object.entries(PAGE_PERMISSIONS)
    .filter(([_, roles]) => roles.includes(role))
    .map(([page]) => page);
};

/**
 * Role display configuration
 */
export const ROLE_CONFIG = {
  [ROLES.ADMIN]: {
    label: 'Admin',
    description: 'Full system access',
    order: 1
  },
  [ROLES.EDITOR]: {
    label: 'Editor (Ministry)',
    description: 'Create and manage content',
    order: 2
  },
  [ROLES.PRODUCER]: {
    label: 'Producer (V Studio)',
    description: 'Production workflow',
    order: 3
  },
  [ROLES.APPROVER]: {
    label: 'Approver',
    description: 'Review and approve content',
    order: 4
  }
};

/**
 * All roles as array (for dropdowns)
 */
export const ROLE_LIST = Object.values(ROLES);
