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
      // ENTERPRISE THEME COLORS (CSS Variable Based)
      // All colors reference CSS variables for seamless theme switching
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
        // MINISTRY DESIGN TOKENS (Theme-Aware)
        // =========================================================================
        ministry: {
          // Background hierarchy
          bg: {
            primary: 'var(--theme-bg-base)',
            secondary: 'var(--theme-bg-surface)',
            tertiary: 'var(--theme-bg-tertiary)',
            elevated: 'var(--theme-bg-elevated)',
            hover: 'var(--theme-bg-hover)',
            active: 'var(--theme-bg-active)',
            muted: 'var(--theme-bg-muted)',
          },
          
          // Text hierarchy
          text: {
            primary: 'var(--theme-text-primary)',
            secondary: 'var(--theme-text-secondary)',
            muted: 'var(--theme-text-muted)',
            disabled: 'var(--theme-text-disabled)',
            inverse: 'var(--theme-text-inverse)',
          },
          
          // Brand colors
          brand: {
            primary: 'var(--theme-brand-primary)',
            hover: 'var(--theme-brand-hover)',
            active: 'var(--theme-brand-active)',
            light: 'var(--theme-brand-light)',
            muted: 'var(--theme-brand-muted)',
          },
          
          // Border tokens
          border: {
            subtle: 'var(--theme-border-subtle)',
            default: 'var(--theme-border-subtle)',
            strong: 'var(--theme-border-strong)',
            focus: 'var(--theme-border-focus)',
            divider: 'var(--theme-border-divider)',
          },
          
          // Status colors (semantic)
          status: {
            success: 'var(--theme-status-success)',
            'success-bg': 'var(--theme-status-success-bg)',
            'success-border': 'var(--theme-status-success-border)',
            warning: 'var(--theme-status-warning)',
            'warning-bg': 'var(--theme-status-warning-bg)',
            'warning-border': 'var(--theme-status-warning-border)',
            error: 'var(--theme-status-error)',
            'error-bg': 'var(--theme-status-error-bg)',
            'error-border': 'var(--theme-status-error-border)',
            info: 'var(--theme-status-info)',
            'info-bg': 'var(--theme-status-info-bg)',
            'info-border': 'var(--theme-status-info-border)',
            
            // Workflow status
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
          
          // Interactive states
          interactive: {
            hover: 'var(--theme-interactive-hover)',
            active: 'var(--theme-interactive-active)',
            selected: 'var(--theme-interactive-selected)',
            'selected-hover': 'var(--theme-interactive-selected-hover)',
          },
        },
      },
      
      // =========================================================================
      // TYPOGRAPHY
      // =========================================================================
      fontFamily: {
        fluent: ["'Segoe UI'", 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      fontSize: {
        'ministry-xs': '12px',
        'ministry-sm': '14px',
        'ministry-base': '16px',
        'ministry-lg': '18px',
        'ministry-xl': '20px',
      },
      
      // =========================================================================
      // SPACING
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
      // BORDER RADIUS
      // =========================================================================
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        'ministry': '8px',
        'ministry-sm': '4px',
        'ministry-lg': '12px',
      },
      
      // =========================================================================
      // SHADOWS (Theme-Aware)
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
        'fade-out': {
          from: { opacity: '1' },
          to: { opacity: '0' }
        },
        'slide-in-from-top': {
          from: { transform: 'translateY(-10px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' }
        },
        'slide-in-from-bottom': {
          from: { transform: 'translateY(10px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' }
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.15s ease-out',
        'fade-out': 'fade-out 0.15s ease-out',
        'slide-in-from-top': 'slide-in-from-top 0.2s ease-out',
        'slide-in-from-bottom': 'slide-in-from-bottom 0.2s ease-out',
      },
    }
  },
  plugins: [require("tailwindcss-animate")],
};
