/**
 * Content Type Configuration
 * Centralized config for content types with labels, colors, and business rules
 */

/**
 * Content type constants
 */
export const CONTENT_TYPE = {
  ANNOUNCEMENT: 'Announcement',
  SHORT_LESSON: 'Short Lesson',
  FULL_LESSON: 'Full Lesson'
};

/**
 * Content type display and rule configuration
 * Uses semantic CSS variable-based colors for theme compatibility
 */
export const CONTENT_TYPE_CONFIG = {
  [CONTENT_TYPE.ANNOUNCEMENT]: {
    label: 'Announcement',
    // Calendar/list marker color (theme-aware)
    accentColor: 'bg-ministry-status-draft',
    markerColor: 'bg-ministry-status-draft',
    // Business rules
    videoRequired: false,
    maxScriptLength: 500,
    order: 1,
    visible: true
  },
  [CONTENT_TYPE.SHORT_LESSON]: {
    label: 'Short Lesson',
    accentColor: 'bg-ministry-status-submitted',
    markerColor: 'bg-ministry-status-submitted',
    videoRequired: true,
    maxScriptLength: 2000,
    order: 2,
    visible: true
  },
  [CONTENT_TYPE.FULL_LESSON]: {
    label: 'Full Lesson',
    accentColor: 'bg-ministry-status-inprogress',
    markerColor: 'bg-ministry-status-inprogress',
    videoRequired: true,
    maxScriptLength: 5000,
    order: 3,
    visible: true
  }
};

/**
 * Get accent/marker color for content type
 * @param {string} contentType - Content type value
 * @returns {string} Tailwind class for accent color
 */
export const getContentTypeAccent = (contentType) => {
  return CONTENT_TYPE_CONFIG[contentType]?.accentColor || 'bg-ministry-status-draft';
};

/**
 * Get content type label
 * @param {string} contentType - Content type value
 * @returns {string} Display label
 */
export const getContentTypeLabel = (contentType) => {
  return CONTENT_TYPE_CONFIG[contentType]?.label || contentType;
};

/**
 * Check if video is required for content type
 * @param {string} contentType - Content type value
 * @returns {boolean}
 */
export const isVideoRequired = (contentType) => {
  return CONTENT_TYPE_CONFIG[contentType]?.videoRequired ?? false;
};

/**
 * Get max script length for content type
 * @param {string} contentType - Content type value
 * @returns {number}
 */
export const getMaxScriptLength = (contentType) => {
  return CONTENT_TYPE_CONFIG[contentType]?.maxScriptLength || 2000;
};

/**
 * All content types as array (for dropdowns)
 * Sorted by order, filtered by visibility
 */
export const CONTENT_TYPE_LIST = Object.entries(CONTENT_TYPE_CONFIG)
  .filter(([_, config]) => config.visible)
  .sort((a, b) => a[1].order - b[1].order)
  .map(([type]) => type);

/**
 * Content types that require video for publishing
 */
export const VIDEO_REQUIRED_TYPES = Object.entries(CONTENT_TYPE_CONFIG)
  .filter(([_, config]) => config.videoRequired)
  .map(([type]) => type);
