/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
        extend: {
                // Ministry Admin Design System - Microsoft Fluent inspired
                colors: {
                        // Keep shadcn compatibility
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
                        
                        // Ministry Design Tokens
                        ministry: {
                                bg: {
                                        primary: '#fafafa',
                                        secondary: '#ffffff',
                                        tertiary: '#f3f2f1',
                                },
                                text: {
                                        primary: '#323130',
                                        secondary: '#605e5c',
                                        muted: '#8a8886',
                                },
                                brand: {
                                        primary: '#0078d4',
                                        hover: '#106ebe',
                                        light: '#deecf9',
                                },
                                border: {
                                        default: '#e5e5e5',
                                        focus: '#0078d4',
                                },
                                status: {
                                        // Semantic status colors (Fluent 2)
                                        success: '#107c10',
                                        'success-bg': '#dff6dd',
                                        'success-border': '#9fd89f',
                                        warning: '#ffaa44',
                                        'warning-bg': '#fff4ce',
                                        'warning-border': '#ffe7a3',
                                        error: '#d13438',
                                        'error-bg': '#fde7e9',
                                        'error-border': '#f5c2c4',
                                        // Task workflow status
                                        draft: '#8a8886',
                                        submitted: '#0078d4',
                                        inprogress: '#8764b8',
                                        readyforreview: '#ffaa44',
                                        changesrequested: '#ca5010',
                                        approved: '#107c10',
                                        rejected: '#d13438',
                                        scheduled: '#107c10',
                                        published: '#107c10',
                                        // Legacy mappings (for transition period)
                                        producing: '#8764b8',
                                        review: '#ffaa44',
                                },
                        },
                },
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
                spacing: {
                        'ministry-xs': '4px',
                        'ministry-sm': '8px',
                        'ministry-md': '12px',
                        'ministry-lg': '16px',
                        'ministry-xl': '24px',
                        'ministry-2xl': '32px',
                },
                borderRadius: {
                        lg: 'var(--radius)',
                        md: 'calc(var(--radius) - 2px)',
                        sm: 'calc(var(--radius) - 4px)',
                        'ministry': '8px',
                        'ministry-sm': '4px',
                        'ministry-lg': '12px',
                },
                boxShadow: {
                        'ministry-card': '0 1.6px 3.6px 0 rgba(0, 0, 0, 0.132)',
                        'ministry-dialog': '0 6.4px 14.4px 0 rgba(0, 0, 0, 0.132)',
                        'ministry-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                },
                keyframes: {
                        'accordion-down': {
                                from: {
                                        height: '0'
                                },
                                to: {
                                        height: 'var(--radix-accordion-content-height)'
                                }
                        },
                        'accordion-up': {
                                from: {
                                        height: 'var(--radix-accordion-content-height)'
                                },
                                to: {
                                        height: '0'
                                }
                        }
                },
                animation: {
                        'accordion-down': 'accordion-down 0.2s ease-out',
                        'accordion-up': 'accordion-up 0.2s ease-out'
                }
        }
  },
  plugins: [require("tailwindcss-animate")],
};
