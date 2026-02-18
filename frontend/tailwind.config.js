/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      // =========================================================================
      // MINISTRY FLUENT DESIGN SYSTEM
      // Enterprise-grade tokens for Microsoft Fluent 2 / Outlook / Teams styling
      // =========================================================================
      colors: {
        // Shadcn UI compatibility
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        
        // =========================================================================
        // MINISTRY DESIGN TOKENS (Fluent-Inspired)
        // =========================================================================
        ministry: {
          // =================================================================
          // SURFACE LAYERING (3-tier Fluent system)
          // =================================================================
          bg: {
            // Primary surfaces
            app: 'var(--theme-bg-app)',              // Deepest - page background
            surface: 'var(--theme-bg-surface)',       // Cards, panels
            'surface-raised': 'var(--theme-bg-surface-raised)', // Modals, popovers
            
            // Legacy aliases
            primary: 'var(--theme-bg-app)',
            secondary: 'var(--theme-bg-surface)',
            tertiary: 'var(--theme-bg-tertiary)',
            elevated: 'var(--theme-bg-surface-raised)',
            
            // Interactive states
            hover: 'var(--theme-bg-hover)',
            active: 'var(--theme-bg-active)',
            muted: 'var(--theme-bg-muted)',
          },
          
          // =================================================================
          // TEXT HIERARCHY (WCAG compliant)
          // =================================================================
          text: {
            primary: 'var(--theme-text-primary)',     // Headings, important
            secondary: 'var(--theme-text-secondary)', // Body text
            muted: 'var(--theme-text-muted)',         // Placeholders, hints
            disabled: 'var(--theme-text-disabled)',   // Disabled state
            inverse: 'var(--theme-text-inverse)',     // On brand/dark surfaces
            link: 'var(--theme-text-link)',           // Links
          },
          
          // =================================================================
          // BRAND COLORS
          // =================================================================
          brand: {
            primary: 'var(--theme-brand-primary)',
            hover: 'var(--theme-brand-hover)',
            active: 'var(--theme-brand-active)',
            light: 'var(--theme-brand-light)',
            muted: 'var(--theme-brand-muted)',
          },
          
          // =================================================================
          // BORDER TOKENS
          // =================================================================
          border: {
            subtle: 'var(--theme-border-subtle)',
            default: 'var(--theme-border-default)',
            strong: 'var(--theme-border-strong)',
            focus: 'var(--theme-border-focus)',
            divider: 'var(--theme-border-divider)',
          },
          
          // =================================================================
          // SEMANTIC STATUS COLORS
          // =================================================================
          status: {
            // Success (green)
            success: 'var(--theme-status-success)',
            'success-bg': 'var(--theme-status-success-bg)',
            'success-border': 'var(--theme-status-success-border)',
            
            // Warning (amber)
            warning: 'var(--theme-status-warning)',
            'warning-bg': 'var(--theme-status-warning-bg)',
            'warning-border': 'var(--theme-status-warning-border)',
            
            // Error (red)
            error: 'var(--theme-status-error)',
            'error-bg': 'var(--theme-status-error-bg)',
            'error-border': 'var(--theme-status-error-border)',
            
            // Info (blue)
            info: 'var(--theme-status-info)',
            'info-bg': 'var(--theme-status-info-bg)',
            'info-border': 'var(--theme-status-info-border)',
            
            // Workflow status colors
            draft: 'var(--theme-workflow-draft)',
            'draft-bg': 'var(--theme-workflow-draft-bg)',
            submitted: 'var(--theme-workflow-submitted)',
            'submitted-bg': 'var(--theme-workflow-submitted-bg)',
            inprogress: 'var(--theme-workflow-inprogress)',
            'inprogress-bg': 'var(--theme-workflow-inprogress-bg)',
            readyforreview: 'var(--theme-workflow-readyforreview)',
            'readyforreview-bg': 'var(--theme-workflow-readyforreview-bg)',
            changesrequested: 'var(--theme-workflow-changesrequested)',
            'changesrequested-bg': 'var(--theme-workflow-changesrequested-bg)',
            approved: 'var(--theme-workflow-approved)',
            'approved-bg': 'var(--theme-workflow-approved-bg)',
            rejected: 'var(--theme-workflow-rejected)',
            'rejected-bg': 'var(--theme-workflow-rejected-bg)',
            scheduled: 'var(--theme-workflow-scheduled)',
            'scheduled-bg': 'var(--theme-workflow-scheduled-bg)',
            published: 'var(--theme-workflow-published)',
            'published-bg': 'var(--theme-workflow-published-bg)',
            
            // Legacy mappings
            producing: 'var(--theme-workflow-inprogress)',
            review: 'var(--theme-workflow-readyforreview)',
          },
          
          // =================================================================
          // INTERACTIVE STATES
          // =================================================================
          interactive: {
            hover: 'var(--theme-interactive-hover)',
            active: 'var(--theme-interactive-active)',
            selected: 'var(--theme-interactive-selected)',
            'selected-hover': 'var(--theme-interactive-selected-hover)',
          },
          
          // =================================================================
          // CALENDAR TOKENS
          // =================================================================
          calendar: {
            'today-ring': 'var(--theme-calendar-today-ring)',
            'selected-bg': 'var(--theme-calendar-selected-bg)',
            'tasks-dot': 'var(--theme-calendar-has-tasks-dot)',
          },
          
          // =================================================================
          // FOCUS RING
          // =================================================================
          focus: {
            ring: 'var(--theme-focus-ring)',
          },
        },
      },
      
      // =========================================================================
      // TYPOGRAPHY (Fluent 2)
      // =========================================================================
      fontFamily: {
        fluent: ["'Segoe UI'", 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      fontSize: {
        'ministry-xs': ['12px', { lineHeight: '16px' }],
        'ministry-sm': ['13px', { lineHeight: '18px' }],
        'ministry-base': ['14px', { lineHeight: '20px' }],
        'ministry-lg': ['16px', { lineHeight: '22px' }],
        'ministry-xl': ['18px', { lineHeight: '24px' }],
        'ministry-2xl': ['20px', { lineHeight: '28px' }],
        'ministry-title': ['24px', { lineHeight: '32px', fontWeight: '600' }],
      },
      
      // =========================================================================
      // SPACING (Fluent 2 spacing scale)
      // =========================================================================
      spacing: {
        'ministry-xs': '4px',
        'ministry-sm': '8px',
        'ministry-md': '12px',
        'ministry-lg': '16px',
        'ministry-xl': '24px',
        'ministry-2xl': '32px',
      },
      
      // =========================================================================
      // BORDER RADIUS (Fluent 2 - slightly smaller)
      // =========================================================================
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        'ministry': '6px',
        'ministry-sm': '4px',
        'ministry-lg': '8px',
      },
      
      // =========================================================================
      // SHADOWS (Fluent elevation)
      // =========================================================================
      boxShadow: {
        'ministry-sm': 'var(--theme-shadow-sm)',
        'ministry-card': 'var(--theme-shadow-card)',
        'ministry-elevated': 'var(--theme-shadow-elevated)',
        'ministry-dialog': 'var(--theme-shadow-dialog)',
      },
      
      // =========================================================================
      // ANIMATIONS
      // =========================================================================
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' }
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.98)' },
          to: { opacity: '1', transform: 'scale(1)' }
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.15s ease-out',
        'scale-in': 'scale-in 0.15s ease-out',
      },
    }
  },
  plugins: [require("tailwindcss-animate")],
};
