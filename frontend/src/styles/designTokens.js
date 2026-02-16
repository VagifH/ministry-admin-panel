/**
 * Ministry Admin Panel - Design System Tokens
 * Microsoft Fluent-inspired design system
 */

export const designTokens = {
  // ==================== COLORS ====================
  colors: {
    // Background
    background: {
      primary: '#fafafa',
      secondary: '#ffffff',
      tertiary: '#f3f2f1',
    },
    
    // Text
    text: {
      primary: '#323130',
      secondary: '#605e5c',
      muted: '#8a8886',
      inverse: '#ffffff',
    },
    
    // Brand/Accent
    accent: {
      primary: '#0078d4',
      hover: '#106ebe',
      light: '#deecf9',
    },
    
    // Semantic
    semantic: {
      success: '#107c10',
      warning: '#ffaa44',
      error: '#d13438',
      info: '#0078d4',
    },
    
    // Status badges
    status: {
      draft: '#8a8886',
      submitted: '#0078d4',
      producing: '#8764b8',
      review: '#ffaa44',
      scheduled: '#107c10',
      published: '#498205',
      rejected: '#d13438',
    },
    
    // Borders
    border: {
      default: '#e5e5e5',
      light: '#f3f2f1',
      focus: '#0078d4',
    },
  },

  // ==================== SPACING ====================
  spacing: {
    xs: '4px',    // 0.25rem
    sm: '8px',    // 0.5rem
    md: '12px',   // 0.75rem
    lg: '16px',   // 1rem
    xl: '24px',   // 1.5rem
    '2xl': '32px', // 2rem
    '3xl': '48px', // 3rem
    
    // Component-specific
    component: {
      padding: {
        input: '8px 12px',
        button: '8px 16px',
        card: '16px',
        modal: '24px',
      },
      gap: {
        xs: '4px',
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
    },
  },

  // ==================== TYPOGRAPHY ====================
  typography: {
    fontFamily: {
      primary: "'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    },
    fontSize: {
      xs: '12px',      // 0.75rem
      sm: '14px',      // 0.875rem
      base: '16px',    // 1rem
      lg: '18px',      // 1.125rem
      xl: '20px',      // 1.25rem
      '2xl': '24px',   // 1.5rem
      '3xl': '32px',   // 2rem
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
  },

  // ==================== BORDERS ====================
  borders: {
    radius: {
      sm: '4px',
      md: '8px',
      lg: '12px',
      full: '9999px',
    },
    width: {
      thin: '1px',
      medium: '2px',
      thick: '4px',
    },
  },

  // ==================== SHADOWS ====================
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 2px 4px 0 rgba(0, 0, 0, 0.08)',
    lg: '0 4px 8px 0 rgba(0, 0, 0, 0.12)',
    card: '0 1.6px 3.6px 0 rgba(0, 0, 0, 0.132)',
    dialog: '0 6.4px 14.4px 0 rgba(0, 0, 0, 0.132)',
  },

  // ==================== COMPONENTS ====================
  components: {
    // Button variants
    button: {
      height: {
        sm: '32px',
        md: '36px',
        lg: '40px',
      },
      padding: {
        sm: '8px 12px',
        md: '8px 16px',
        lg: '12px 20px',
      },
      variants: {
        primary: {
          background: '#0078d4',
          backgroundHover: '#106ebe',
          text: '#ffffff',
          border: 'transparent',
        },
        secondary: {
          background: 'transparent',
          backgroundHover: '#f3f2f1',
          text: '#323130',
          border: '#e5e5e5',
        },
        danger: {
          background: '#d13438',
          backgroundHover: '#a4262c',
          text: '#ffffff',
          border: 'transparent',
        },
      },
    },

    // Input variants
    input: {
      height: {
        sm: '32px',
        md: '36px',
        lg: '40px',
      },
      padding: '8px 12px',
      border: '#e5e5e5',
      borderFocus: '#0078d4',
      borderRadius: '8px',
      background: '#ffffff',
    },

    // Modal/Dialog
    modal: {
      maxWidth: {
        sm: '480px',
        md: '560px',
        lg: '760px',
        xl: '960px',
      },
      padding: {
        header: '24px',
        content: '24px',
        footer: '16px 24px',
      },
      background: '#ffffff',
      borderRadius: '8px',
      shadow: '0 6.4px 14.4px 0 rgba(0, 0, 0, 0.132)',
    },

    // Card
    card: {
      background: '#ffffff',
      border: '#e5e5e5',
      borderRadius: '8px',
      padding: '16px',
      shadow: '0 1.6px 3.6px 0 rgba(0, 0, 0, 0.132)',
    },

    // Table
    table: {
      headerBackground: 'transparent',
      headerText: '#323130',
      rowHover: '#f3f2f1',
      border: '#e5e5e5',
    },

    // Badge
    badge: {
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '500',
    },
  },

  // ==================== LAYOUT ====================
  layout: {
    sidebar: {
      width: '224px', // 56 * 4
      background: '#ffffff',
      border: '#e5e5e5',
    },
    header: {
      height: '60px',
      background: '#ffffff',
      border: '#e5e5e5',
    },
    maxWidth: {
      content: '1440px',
      narrow: '800px',
      wide: '1920px',
    },
  },

  // ==================== TRANSITIONS ====================
  transitions: {
    duration: {
      fast: '150ms',
      normal: '250ms',
      slow: '350ms',
    },
    easing: {
      default: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
    },
  },
};

// ==================== REUSABLE CLASSES ====================
export const componentClasses = {
  button: {
    base: 'inline-flex items-center justify-center rounded-lg font-medium transition-colors',
    primary: 'bg-[#0078d4] hover:bg-[#106ebe] text-white',
    secondary: 'border border-[#e5e5e5] hover:bg-[#f3f2f1] text-[#323130]',
    danger: 'bg-[#d13438] hover:bg-[#a4262c] text-white',
    sizes: {
      sm: 'h-8 px-3 text-sm',
      md: 'h-9 px-4 text-sm',
      lg: 'h-10 px-5 text-base',
    },
  },
  
  input: {
    base: 'h-9 px-3 border border-[#e5e5e5] rounded-lg bg-white text-[#323130] placeholder:text-[#8a8886] focus:outline-none focus:ring-2 focus:ring-[#0078d4] focus:border-transparent',
    error: 'border-[#d13438] focus:ring-[#d13438]',
  },
  
  card: {
    base: 'bg-white rounded-lg border border-[#e5e5e5] shadow-sm',
    padding: 'p-4',
  },
  
  modal: {
    overlay: 'fixed inset-0 bg-black/50 z-50',
    content: 'bg-white rounded-lg shadow-lg',
    header: 'px-6 pt-6 pb-4 border-b border-[#e5e5e5]',
    body: 'px-6 py-4',
    footer: 'px-6 py-4 border-t border-[#e5e5e5] flex justify-end gap-2',
  },
  
  table: {
    container: 'bg-white rounded-lg border border-[#e5e5e5]',
    header: 'border-b border-[#e5e5e5]',
    row: 'border-b border-[#e5e5e5] hover:bg-[#f3f2f1] transition-colors',
    cell: 'px-4 py-3 text-[#323130]',
  },
  
  badge: {
    base: 'inline-flex items-center px-2 py-1 rounded text-xs font-medium',
    status: {
      draft: 'bg-[#8a8886] text-white',
      submitted: 'bg-[#0078d4] text-white',
      producing: 'bg-[#8764b8] text-white',
      review: 'bg-[#ffaa44] text-white',
      scheduled: 'bg-[#107c10] text-white',
      published: 'bg-[#498205] text-white',
      rejected: 'bg-[#d13438] text-white',
    },
  },
  
  text: {
    h1: 'text-2xl font-semibold text-[#323130]',
    h2: 'text-xl font-semibold text-[#323130]',
    h3: 'text-lg font-semibold text-[#323130]',
    body: 'text-base text-[#323130]',
    muted: 'text-sm text-[#605e5c]',
    small: 'text-xs text-[#605e5c]',
  },
};

export default designTokens;
