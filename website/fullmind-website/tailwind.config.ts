import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // FullMind brand colors matching app themes
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
        // Theme variants
        morning: {
          primary: '#FF9F43',
          success: '#E8863A',
        },
        midday: {
          primary: '#40B5AD',
          success: '#2C8A82',
        },
        evening: {
          primary: '#4A7C59',
          success: '#2D5016',
        },
        // Clinical colors for healthcare UI
        clinical: {
          safe: '#10b981',    // green-500
          caution: '#f59e0b', // amber-500
          warning: '#ef4444', // red-500
          neutral: '#6b7280', // gray-500
        },
        // Accessibility-compliant text colors
        text: {
          primary: '#111827',   // gray-900 - AAA contrast
          secondary: '#374151', // gray-700 - AA contrast
          muted: '#6b7280',     // gray-500 - AA contrast on light bg
        },
        background: "var(--background)",
        foreground: "var(--foreground)",
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
      },

      // Shadow system for depth
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'medium': '0 4px 16px rgba(0, 0, 0, 0.12)',
        'strong': '0 8px 32px rgba(0, 0, 0, 0.16)',
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
      // Add base accessibility styles
      addBase({
        // Ensure focus is visible by default
        '*:focus-visible': {
          outline: `2px solid ${theme('colors.primary.500')}`,
          outlineOffset: '2px',
        },
        
        // Ensure sufficient line height for readability
        'body': {
          lineHeight: theme('lineHeight.6'), // 1.6
        },
        
        // High contrast media query styles
        '@media (prefers-contrast: high)': {
          '*': {
            borderColor: 'currentColor !important',
          },
          'button, [role="button"]': {
            border: '2px solid currentColor !important',
          },
        },
        
        // Reduced motion media query styles
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            animationDuration: '0.01ms !important',
            animationIterationCount: '1 !important',
            transitionDuration: '0.01ms !important',
            scrollBehavior: 'auto !important',
          },
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
        
        // Focus utilities
        '.focus-visible': {
          '&:focus-visible': {
            outline: `2px solid ${theme('colors.primary.500')}`,
            outlineOffset: '2px',
          },
        },
        
        '.focus-enhanced': {
          '&:focus, &:focus-visible': {
            outline: `3px solid ${theme('colors.primary.500')}`,
            outlineOffset: '3px',
            boxShadow: `0 0 0 5px ${theme('colors.primary.500')}33`, // 20% opacity
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
        
        // Skip link utility
        '.skip-link': {
          position: 'absolute',
          top: '-100px',
          left: '-100px',
          zIndex: '10000',
          padding: '8px 16px',
          backgroundColor: theme('colors.clinical.safe'),
          color: theme('colors.white'),
          textDecoration: 'none',
          fontWeight: '600',
          borderRadius: '0 0 4px 4px',
          transition: 'all 0.2s ease',
          
          '&:focus': {
            top: '0',
            left: '0',
            clip: 'auto',
            height: 'auto',
            width: 'auto',
            overflow: 'visible',
          },
        },
      });
    },
  ],
};

export default config;
