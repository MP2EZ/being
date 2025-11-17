/**
 * Being Website Design Tokens
 * Extracted from /development/app/src/core/theme/colors.ts
 *
 * Using system fonts for performance (<0KB download vs 50KB custom fonts)
 * Prioritizing midnight blue (#1B2951) for brand consistency
 */

export const colors = {
  // Brand Colors (from app)
  brand: {
    midnight: '#1B2951',      // Primary logo color, headers (15.29:1 contrast)
    blueGray: '#2C3E50',      // Secondary headings, calm trust
    sage: '#4A9B8E',          // CTAs, mindfulness accent
    offWhite: '#F8F9FA',      // Backgrounds (softer than pure white)
  },

  // Text Colors (WCAG AA compliant)
  text: {
    primary: '#1C1C1C',       // Body text (black from app)
    secondary: '#424242',     // Gray-700
    tertiary: '#757575',      // Gray-600
    inverse: '#FFFFFF',       // White text on dark backgrounds
  },

  // Grayscale (9 levels from app)
  gray: {
    50: '#F9F9F9',
    100: '#FAFAFA',
    200: '#F5F5F5',
    300: '#E8E8E8',
    400: '#D1D1D1',
    500: '#B8B8B8',
    600: '#757575',
    700: '#424242',
    800: '#212121',
  },

  // Status Colors (WCAG AA compliant)
  status: {
    success: '#0F7A24',       // 7.12:1 contrast
    warning: '#A66100',       // 5.02:1 contrast
    error: '#DC2626',         // 4.5:1 contrast
    critical: '#991B1B',      // 7.85:1 contrast (crisis/emergency)
  },

  // Theme Colors (from app periods)
  themes: {
    morning: {
      primary: '#B45309',     // WCAG-AA: 4.69:1
      light: '#FFB366',
      background: '#FFF8F0',
    },
    midday: {
      primary: '#0F766E',     // WCAG-AA: 4.85:1
      light: '#5EC4BC',
      background: '#F0FBF9',
    },
    evening: {
      primary: '#4A7C59',
      light: '#6B9B78',
      background: '#F0F8F4',
    },
    learn: {
      primary: '#9B7EBD',
      light: '#B89DD1',
      background: '#F8F5FB',
    },
  },
};

export const spacing = {
  xs: '4px',      // 4px
  sm: '8px',      // 8px
  md: '16px',     // 16px
  lg: '24px',     // 24px
  xl: '32px',     // 32px
  '2xl': '48px',  // 48px
  '3xl': '64px',  // 64px
  '4xl': '96px',  // 96px (section spacing)
};

export const borderRadius = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
};

export const typography = {
  // System font stack (0KB download, instant render)
  fontFamily: {
    sans: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(', '),
  },

  // Font sizes (from app)
  fontSize: {
    micro: ['12px', { lineHeight: '1.4', fontWeight: '500' }],
    caption: ['14px', { lineHeight: '1.4', fontWeight: '400' }],
    bodySmall: ['14px', { lineHeight: '1.4', fontWeight: '400' }],
    bodyRegular: ['16px', { lineHeight: '1.5', fontWeight: '400' }],
    bodyLarge: ['18px', { lineHeight: '1.5', fontWeight: '400' }],
    headline3: ['22px', { lineHeight: '1.3', fontWeight: '600' }],
    headline2: ['28px', { lineHeight: '1.2', fontWeight: '600' }],
    headline1: ['34px', { lineHeight: '1.1', fontWeight: '700' }],
  },
};

export const breakpoints = {
  mobile: '640px',   // < 640px
  tablet: '768px',   // 640px - 1024px
  desktop: '1024px', // > 1024px
};

/**
 * Crisis/Emergency Colors (always accessible)
 * Used for 988 button, crisis resources
 */
export const crisis = {
  background: '#EFF6FF',  // Calm blue background
  text: '#1E40AF',        // Dark blue text (5.86:1 contrast)
  border: '#3B82F6',      // Blue border (calm, not alarm)
};

/**
 * Performance: Using system fonts = 0KB download
 * Trade-off: Less unique than Crimson Text + Inter
 * Rationale: Better UX for anxious users (instant render, familiar)
 */
