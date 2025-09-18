import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      // Being. brand colors matching app themes with dark mode support
      colors: {
        // Core brand colors
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#40B5AD', // midday theme primary
          600: '#2C8A82', // midday theme success
          700: '#164e63',
          900: '#0c4a6e',
        },
        // Theme variants with dark mode support
        morning: {
          primary: '#FF9F43',
          success: '#E8863A',
          dark: {
            primary: '#FF9F43', // Maintain warm therapeutic feeling in dark
            success: '#E8863A'
          }
        },
        midday: {
          primary: '#40B5AD',
          success: '#2C8A82',
          dark: {
            primary: '#40B5AD', // Maintain calming therapeutic feeling in dark
            success: '#2C8A82'
          }
        },
        evening: {
          primary: '#4A7C59',
          success: '#2D5016',
          dark: {
            primary: '#4A7C59', // Darker green for evening calm
            success: '#2D5016'
          }
        },
        // Clinical colors for healthcare UI
        clinical: {
          safe: '#10b981',    // green-500
          caution: '#f59e0b', // amber-500
          warning: '#ef4444', // red-500
          neutral: '#6b7280', // gray-500
        },
        // Dynamic theme-aware colors using CSS variables
        'theme-primary': 'var(--fm-theme-primary)',
        'theme-success': 'var(--fm-theme-success)',
        
        // Background colors (CSS variable-based)
        'bg-primary': 'var(--fm-bg-primary)',
        'bg-secondary': 'var(--fm-bg-secondary)',
        'bg-tertiary': 'var(--fm-bg-tertiary)',
        'bg-overlay': 'var(--fm-bg-overlay)',
        'bg-clinical': 'var(--fm-bg-clinical)',
        
        // Text colors (CSS variable-based)
        'text-primary': 'var(--fm-text-primary)',
        'text-secondary': 'var(--fm-text-secondary)',
        'text-tertiary': 'var(--fm-text-tertiary)',
        'text-inverse': 'var(--fm-text-inverse)',
        'text-clinical': 'var(--fm-text-clinical)',
        
        // Border colors (CSS variable-based)
        'border-primary': 'var(--fm-border-primary)',
        'border-secondary': 'var(--fm-border-secondary)',
        'border-focus': 'var(--fm-border-focus)',
        'border-clinical': 'var(--fm-border-clinical)',
        
        // Surface colors (CSS variable-based)
        'surface-elevated': 'var(--fm-surface-elevated)',
        'surface-depressed': 'var(--fm-surface-depressed)',
        'surface-interactive': 'var(--fm-surface-interactive)',
        'surface-hover': 'var(--fm-surface-hover)',
        'surface-active': 'var(--fm-surface-active)',
        
        // Crisis colors (always high contrast, CSS variable-based with fallbacks)
        'crisis-bg': 'var(--fm-crisis-bg, #dc2626)',
        'crisis-text': 'var(--fm-crisis-text, #ffffff)',
        'crisis-border': 'var(--fm-crisis-border, #991b1b)',
        'crisis-hover': 'var(--fm-crisis-hover, #b91c1c)',
        
        // Legacy compatibility
        text: {
          primary: 'var(--fm-text-primary)',
          secondary: 'var(--fm-text-secondary)',
          muted: 'var(--fm-text-tertiary)',
        },
        background: 'var(--fm-bg-primary)',
        foreground: 'var(--fm-text-primary)',
      },
      
      // Typography for clinical readability
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'Menlo', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.5' }],
        'sm': ['0.875rem', { lineHeight: '1.5' }],
        'base': ['1rem', { lineHeight: '1.6' }],
        'lg': ['1.125rem', { lineHeight: '1.6' }],
        'xl': ['1.25rem', { lineHeight: '1.6' }],
        '2xl': ['1.5rem', { lineHeight: '1.5' }],
        '3xl': ['1.875rem', { lineHeight: '1.4' }],
        '4xl': ['2.25rem', { lineHeight: '1.3' }],
        '5xl': ['3rem', { lineHeight: '1.2' }],
      },

      // Spacing for consistent component sizing
      spacing: {
        '18': '4.5rem',   // 72px
        '22': '5.5rem',   // 88px
        '26': '6.5rem',   // 104px
        '30': '7.5rem',   // 120px
        '34': '8.5rem',   // 136px
        '38': '9.5rem',   // 152px
      },

      // Clinical-grade animation (respectful of motion preferences)
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-gentle': 'pulseGentle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
        'theme-transition': 'themeTransition 0.15s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseGentle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(6deg)' },
          '50%': { transform: 'translateY(-8px) rotate(6deg)' },
        },
        themeTransition: {
          '0%': { opacity: '0.9' },
          '100%': { opacity: '1' },
        },
      },

      // Enhanced shadow system with dark mode support
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'medium': '0 4px 16px rgba(0, 0, 0, 0.12)',
        'strong': '0 8px 32px rgba(0, 0, 0, 0.16)',
        // Dark mode shadows (more prominent)
        'soft-dark': '0 2px 8px rgba(0, 0, 0, 0.25)',
        'medium-dark': '0 4px 16px rgba(0, 0, 0, 0.35)',
        'strong-dark': '0 8px 32px rgba(0, 0, 0, 0.45)',
        // Clinical shadows (always visible)
        'clinical': '0 2px 4px rgba(16, 185, 129, 0.15)',
        'crisis': '0 2px 8px rgba(220, 38, 38, 0.25)',
      },

      // Border radius for consistent component styling
      borderRadius: {
        'sm': '0.375rem',  // 6px
        'md': '0.5rem',    // 8px
        'lg': '0.75rem',   // 12px
        'xl': '1rem',      // 16px
        '2xl': '1.5rem',   // 24px
      },

      // Accessibility-specific customizations
      minWidth: {
        'touch-target': '44px',
        'touch-target-large': '48px',
        'crisis-button': '60px',
      },
      minHeight: {
        'touch-target': '44px',
        'touch-target-large': '48px',
        'crisis-button': '60px',
      },

      // Focus ring utilities
      ringWidth: {
        'focus': '2px',
        'focus-enhanced': '3px',
      },
      ringOffsetWidth: {
        'focus': '2px',
        'focus-enhanced': '3px',
      },
    },
  },
  
  plugins: [
    // Add custom plugin for accessibility utilities
    function({ addUtilities, theme, addBase }) {
      // Add base accessibility and dark mode styles
      addBase({
        // Root element preparation for themes
        ':root': {
          // Default CSS variables will be set by ThemeContext
          '--fm-transition-duration': '150ms',
        },
        
        // Base body styles with theme support
        'body': {
          lineHeight: theme('lineHeight.6'), // 1.6
          backgroundColor: 'var(--fm-bg-primary)',
          color: 'var(--fm-text-primary)',
          transition: 'background-color var(--fm-transition-duration) ease-in-out, color var(--fm-transition-duration) ease-in-out',
        },
        
        // Ensure focus is visible with theme awareness
        '*:focus-visible': {
          outline: '2px solid var(--fm-border-focus)',
          outlineOffset: '2px',
        },
        
        // High contrast media query styles
        '@media (prefers-contrast: high)': {
          ':root': {
            '--fm-contrast-multiplier': '1.5 !important',
          },
          '*': {
            borderColor: 'currentColor !important',
          },
          'button, [role="button"]': {
            border: '2px solid currentColor !important',
          },
          // Crisis elements get extra contrast in high contrast mode
          '.crisis-element, [data-crisis="true"], .crisis-button, #crisis-help-button': {
            backgroundColor: '#ff0000 !important',
            color: '#ffffff !important',
            border: '3px solid #000000 !important',
            outline: '3px solid #ffffff !important',
            outlineOffset: '2px !important',
          },
        },
        
        // Reduced motion media query styles (respect accessibility)
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            animationDuration: '0.01ms !important',
            animationIterationCount: '1 !important',
            transitionDuration: '0.01ms !important',
            scrollBehavior: 'auto !important',
          },
          // Override theme transition for reduced motion
          ':root': {
            '--fm-transition-duration': '0.01ms !important',
          },
        },
        
        // Color scheme based on theme mode
        '.light': {
          colorScheme: 'light',
        },
        '.dark': {
          colorScheme: 'dark',
        },
        
        // Crisis mode overrides (emergency high contrast)
        '.crisis-mode': {
          '--fm-crisis-bg': '#ff0000 !important',
          '--fm-crisis-text': '#ffffff !important',
          '--fm-crisis-border': '#000000 !important',
          '--fm-crisis-hover': '#cc0000 !important',
          '--fm-transition-duration': '0ms !important',
        },
        
        // Crisis mode ensures all crisis elements are immediately visible
        '.crisis-mode .crisis-button, .crisis-mode #crisis-help-button, .crisis-mode [data-crisis="true"]': {
          backgroundColor: '#ff0000 !important',
          color: '#ffffff !important',
          border: '3px solid #000000 !important',
          outline: 'none !important',
          transform: 'scale(1.1) !important',
          zIndex: '9999 !important',
        },
        
        // Theme-specific styles
        '.theme-morning': {
          '--fm-theme-hue': '30', // Orange hue for morning
        },
        '.theme-midday': {
          '--fm-theme-hue': '180', // Cyan hue for midday
        },
        '.theme-evening': {
          '--fm-theme-hue': '120', // Green hue for evening
        },
      });

      // Add custom utilities
      addUtilities({
        // Screen reader only utility
        '.sr-only': {
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: '0',
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          borderWidth: '0',
        },
        
        // Not screen reader only
        '.not-sr-only': {
          position: 'static',
          width: 'auto',
          height: 'auto',
          padding: '0',
          margin: '0',
          overflow: 'visible',
          clip: 'auto',
          whiteSpace: 'normal',
        },
        
        // Enhanced focus utilities with theme support
        '.focus-visible': {
          '&:focus-visible': {
            outline: '2px solid var(--fm-border-focus)',
            outlineOffset: '2px',
          },
        },
        
        '.focus-enhanced': {
          '&:focus, &:focus-visible': {
            outline: '3px solid var(--fm-border-focus)',
            outlineOffset: '3px',
            boxShadow: '0 0 0 5px var(--fm-border-focus)',
            filter: 'opacity(0.2)',
          },
        },
        
        // Crisis focus (always high visibility)
        '.focus-crisis': {
          '&:focus, &:focus-visible': {
            outline: '3px solid var(--fm-crisis-border)',
            outlineOffset: '2px',
            boxShadow: '0 0 0 6px var(--fm-crisis-bg)',
            filter: 'opacity(0.3)',
          },
        },
        
        // Touch target utilities
        '.touch-target': {
          minWidth: theme('minWidth.touch-target'),
          minHeight: theme('minHeight.touch-target'),
        },
        
        '.touch-target-large': {
          minWidth: theme('minWidth.touch-target-large'),
          minHeight: theme('minHeight.touch-target-large'),
        },
        
        // Crisis button utility (always maximum accessibility with failsafe fallbacks)
        '.crisis-button': {
          minWidth: theme('minWidth.crisis-button'),
          minHeight: theme('minHeight.crisis-button'),
          backgroundColor: 'var(--fm-crisis-bg, #dc2626)',
          color: 'var(--fm-crisis-text, #ffffff)',
          border: '2px solid var(--fm-crisis-border, #991b1b)',
          fontWeight: '700',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all var(--fm-transition-duration, 150ms) ease-in-out',
          
          '&:hover': {
            backgroundColor: 'var(--fm-crisis-hover, #b91c1c)',
            transform: 'translateY(-1px)',
            boxShadow: theme('boxShadow.crisis'),
          },
          
          '&:focus, &:focus-visible': {
            outline: '3px solid var(--fm-crisis-border, #991b1b)',
            outlineOffset: '2px',
            boxShadow: '0 0 0 6px var(--fm-crisis-bg, #dc2626)',
            filter: 'opacity(0.3)',
          },
        },
        
        // Theme-aware component utilities
        '.theme-card': {
          backgroundColor: 'var(--fm-surface-elevated)',
          color: 'var(--fm-text-primary)',
          border: '1px solid var(--fm-border-primary)',
          borderRadius: theme('borderRadius.lg'),
          transition: 'all var(--fm-transition-duration) ease-in-out',
          
          '&:hover': {
            backgroundColor: 'var(--fm-surface-hover)',
            borderColor: 'var(--fm-border-secondary)',
          },
        },
        
        // Clinical component styling
        '.clinical-card': {
          backgroundColor: 'var(--fm-bg-clinical)',
          color: 'var(--fm-text-clinical)',
          border: '1px solid var(--fm-border-clinical)',
          borderRadius: theme('borderRadius.lg'),
          boxShadow: theme('boxShadow.clinical'),
        },
        
        // Skip link utility with theme support
        '.skip-link': {
          position: 'absolute',
          top: '-100px',
          left: '-100px',
          zIndex: '10000',
          padding: '8px 16px',
          backgroundColor: 'var(--fm-crisis-bg)',
          color: 'var(--fm-crisis-text)',
          textDecoration: 'none',
          fontWeight: '600',
          borderRadius: '0 0 4px 4px',
          border: '2px solid var(--fm-crisis-border)',
          transition: 'all var(--fm-transition-duration) ease',
          
          '&:focus': {
            top: '0',
            left: '0',
            clip: 'auto',
            height: 'auto',
            width: 'auto',
            overflow: 'visible',
          },
        },
        
        // Theme transition utilities
        '.theme-transition': {
          transition: 'all var(--fm-transition-duration) ease-in-out',
        },
        
        '.theme-transition-fast': {
          transition: 'all 75ms ease-in-out',
        },
        
        '.theme-transition-slow': {
          transition: 'all 300ms ease-in-out',
        },
        
        // Shadow utilities that adapt to theme
        '.shadow-theme-soft': {
          '.light &': {
            boxShadow: theme('boxShadow.soft'),
          },
          '.dark &': {
            boxShadow: theme('boxShadow.soft-dark'),
          },
        },
        
        '.shadow-theme-medium': {
          '.light &': {
            boxShadow: theme('boxShadow.medium'),
          },
          '.dark &': {
            boxShadow: theme('boxShadow.medium-dark'),
          },
        },
        
        '.shadow-theme-strong': {
          '.light &': {
            boxShadow: theme('boxShadow.strong'),
          },
          '.dark &': {
            boxShadow: theme('boxShadow.strong-dark'),
          },
        },
      });
    },
  ],
};

export default config;
