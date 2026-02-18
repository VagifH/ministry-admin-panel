/**
 * Enterprise Theme Token System
 * 
 * Semantic design tokens for Light and Dark modes.
 * All components should reference these tokens via CSS variables.
 * 
 * Design Language: Microsoft Fluent / Linear.app / Notion Dark
 * - Deep neutral backgrounds (not pure black)
 * - Elevated surfaces with subtle depth
 * - Calm, professional color palette
 * - Accessible contrast ratios
 */

// =============================================================================
// LIGHT THEME TOKENS
// =============================================================================
export const lightTheme = {
  // Background hierarchy (base → surface → elevated)
  bg: {
    base: '#fafafa',        // Page background
    surface: '#ffffff',      // Cards, panels
    elevated: '#ffffff',     // Modals, dropdowns
    tertiary: '#f3f2f1',     // Hover states, subtle fills
    hover: '#f5f5f5',        // Row/item hover
    active: '#ebebeb',       // Active/pressed state
    muted: '#f8f8f8',        // Disabled backgrounds
  },
  
  // Text hierarchy
  text: {
    primary: '#1a1a1a',      // Headings, important content
    secondary: '#5c5c5c',    // Body text, descriptions
    muted: '#8a8886',        // Placeholders, hints
    disabled: '#bdbdbd',     // Disabled text
    inverse: '#ffffff',      // Text on dark backgrounds
  },
  
  // Border tokens
  border: {
    subtle: '#e5e5e5',       // Default borders
    default: '#d4d4d4',      // Emphasized borders
    strong: '#a3a3a3',       // High contrast borders
    focus: '#0078d4',        // Focus rings
    divider: '#edebe9',      // Section dividers
  },
  
  // Brand colors
  brand: {
    primary: '#0078d4',      // Primary actions
    hover: '#106ebe',        // Primary hover
    active: '#005a9e',       // Primary pressed
    light: '#deecf9',        // Primary backgrounds
    muted: '#f0f6fc',        // Subtle brand tint
  },
  
  // Status colors (semantic)
  status: {
    success: '#107c10',
    successBg: '#dff6dd',
    successBorder: '#9fd89f',
    warning: '#d29200',
    warningBg: '#fff4ce',
    warningBorder: '#ffe7a3',
    error: '#d13438',
    errorBg: '#fde7e9',
    errorBorder: '#f5c2c4',
    info: '#0078d4',
    infoBg: '#deecf9',
    infoBorder: '#a9d3f2',
  },
  
  // Workflow status colors
  workflow: {
    draft: '#8a8886',
    draftBg: '#f3f2f1',
    submitted: '#0078d4',
    submittedBg: '#deecf9',
    inProgress: '#8764b8',
    inProgressBg: '#f0e6fa',
    readyForReview: '#d29200',
    readyForReviewBg: '#fff4ce',
    changesRequested: '#ca5010',
    changesRequestedBg: '#fef0e5',
    approved: '#107c10',
    approvedBg: '#dff6dd',
    rejected: '#d13438',
    rejectedBg: '#fde7e9',
    scheduled: '#107c10',
    scheduledBg: '#dff6dd',
    published: '#107c10',
    publishedBg: '#dff6dd',
  },
  
  // Shadows
  shadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    card: '0 1.6px 3.6px 0 rgba(0, 0, 0, 0.11)',
    elevated: '0 3.2px 7.2px 0 rgba(0, 0, 0, 0.13)',
    dialog: '0 6.4px 14.4px 0 rgba(0, 0, 0, 0.18)',
  },
  
  // Interactive states
  interactive: {
    hover: 'rgba(0, 0, 0, 0.04)',
    active: 'rgba(0, 0, 0, 0.08)',
    selected: 'rgba(0, 120, 212, 0.08)',
    selectedHover: 'rgba(0, 120, 212, 0.12)',
  },
  
  // Scrollbar
  scrollbar: {
    track: '#f5f5f5',
    thumb: '#c1c1c1',
    thumbHover: '#a8a8a8',
  },
};

// =============================================================================
// DARK THEME TOKENS
// =============================================================================
export const darkTheme = {
  // Background hierarchy - Deep neutral graphite (not pure black)
  bg: {
    base: '#1a1a1a',         // Page background - deep graphite
    surface: '#242424',       // Cards, panels - elevated surface
    elevated: '#2d2d2d',      // Modals, dropdowns - highest elevation
    tertiary: '#333333',      // Hover states, subtle fills
    hover: '#383838',         // Row/item hover
    active: '#404040',        // Active/pressed state
    muted: '#2a2a2a',         // Disabled backgrounds
  },
  
  // Text hierarchy - High contrast for readability
  text: {
    primary: '#f5f5f5',       // Headings, important content
    secondary: '#b3b3b3',     // Body text, descriptions
    muted: '#808080',         // Placeholders, hints
    disabled: '#5c5c5c',      // Disabled text
    inverse: '#1a1a1a',       // Text on light backgrounds
  },
  
  // Border tokens - Subtle but visible
  border: {
    subtle: '#3d3d3d',        // Default borders
    default: '#4a4a4a',       // Emphasized borders
    strong: '#666666',        // High contrast borders
    focus: '#4da6ff',         // Focus rings (brighter for visibility)
    divider: '#333333',       // Section dividers
  },
  
  // Brand colors - Adjusted for dark backgrounds
  brand: {
    primary: '#4da6ff',       // Primary actions (brighter blue)
    hover: '#66b3ff',         // Primary hover
    active: '#3399ff',        // Primary pressed
    light: '#1a3a52',         // Primary backgrounds (dark tint)
    muted: '#1f2d3d',         // Subtle brand tint
  },
  
  // Status colors - Adjusted for dark mode visibility
  status: {
    success: '#4caf50',
    successBg: '#1a2e1a',
    successBorder: '#2e5a2e',
    warning: '#ffb74d',
    warningBg: '#3d3019',
    warningBorder: '#5c4a1f',
    error: '#f44336',
    errorBg: '#3d1a1a',
    errorBorder: '#5c2424',
    info: '#4da6ff',
    infoBg: '#1a3a52',
    infoBorder: '#2a5a7a',
  },
  
  // Workflow status colors - Bright enough for dark mode
  workflow: {
    draft: '#9e9e9e',
    draftBg: '#2d2d2d',
    submitted: '#4da6ff',
    submittedBg: '#1a3a52',
    inProgress: '#b388ff',
    inProgressBg: '#2d2345',
    readyForReview: '#ffb74d',
    readyForReviewBg: '#3d3019',
    changesRequested: '#ff8a50',
    changesRequestedBg: '#3d2519',
    approved: '#4caf50',
    approvedBg: '#1a2e1a',
    rejected: '#f44336',
    rejectedBg: '#3d1a1a',
    scheduled: '#4caf50',
    scheduledBg: '#1a2e1a',
    published: '#4caf50',
    publishedBg: '#1a2e1a',
  },
  
  // Shadows - Darker, more pronounced for depth
  shadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    card: '0 1.6px 3.6px 0 rgba(0, 0, 0, 0.35)',
    elevated: '0 3.2px 7.2px 0 rgba(0, 0, 0, 0.4)',
    dialog: '0 6.4px 14.4px 0 rgba(0, 0, 0, 0.5)',
  },
  
  // Interactive states
  interactive: {
    hover: 'rgba(255, 255, 255, 0.06)',
    active: 'rgba(255, 255, 255, 0.1)',
    selected: 'rgba(77, 166, 255, 0.15)',
    selectedHover: 'rgba(77, 166, 255, 0.22)',
  },
  
  // Scrollbar
  scrollbar: {
    track: '#2d2d2d',
    thumb: '#4a4a4a',
    thumbHover: '#5c5c5c',
  },
};

// =============================================================================
// THEME COLLECTION
// =============================================================================
export const THEMES = {
  light: lightTheme,
  dark: darkTheme,
};

// =============================================================================
// CSS VARIABLE GENERATOR
// =============================================================================
export function generateCSSVariables(theme) {
  const flattenObject = (obj, prefix = '') => {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      const newKey = prefix ? `${prefix}-${key}` : key;
      if (typeof value === 'object' && value !== null) {
        return { ...acc, ...flattenObject(value, newKey) };
      }
      return { ...acc, [`--theme-${newKey}`]: value };
    }, {});
  };

  return flattenObject(theme);
}

// Default export for convenience
export default THEMES;
