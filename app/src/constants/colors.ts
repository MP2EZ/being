/**
 * Being. Color System - Direct port from Design Library v1.1
 * React Native optimized version
 */

export const colorSystem = {
  // Check-in Themes (PRIMARY FOR COMPONENT USAGE)
  themes: {
    morning: {
      primary: '#FF9F43',    // Continue buttons, progress
      success: '#E8863A',    // Completion states (darker)
      light: '#FFB366',      // Hover states, backgrounds
      background: '#FFF8F0'  // Section backgrounds
    },
    midday: {
      primary: '#40B5AD',    // Continue buttons, midday sessions
      success: '#2C8A82',    // Completion states (darker)
      light: '#5EC4BC',      // Hover states, backgrounds
      background: '#F0FBF9'  // Section backgrounds
    },
    evening: {
      primary: '#4A7C59',    // Continue buttons, reflection progress
      success: '#2D5016',    // Reflection completion (much darker)
      light: '#6B9B78',      // Hover states, backgrounds  
      background: '#F0F8F4'  // Section backgrounds
    }
  },

  // Base System Colors
  base: {
    white: '#FFFFFF',
    black: '#1C1C1C', 
    midnightBlue: '#1B2951'  // Logo, system metrics, general
  },

  // Gray Scale (9 levels)
  gray: {
    50: '#F9F9F9',   // Lightest background tint
    100: '#FAFAFA',  // Secondary backgrounds
    200: '#F5F5F5',  // Tertiary backgrounds, input backgrounds
    300: '#E8E8E8',  // Borders, dividers, inactive elements
    400: '#D1D1D1',  // Placeholder text, disabled borders
    500: '#B8B8B8',  // Inactive navigation, secondary text
    600: '#757575',  // Secondary text, captions
    700: '#424242',  // Tertiary text, less important
    800: '#212121'   // High contrast secondary text
  },

  // System Status (WCAG AA Compliant)
  status: {
    success: '#0F7A24',  // 7.12:1 contrast - Success states, completion, positive trends (WCAG AA Enhanced)
    warning: '#A66100',  // 5.02:1 contrast - Warnings, caution, medium priority (WCAG AA Fixed)
    error: '#DC2626',    // 4.5:1 contrast - Errors, critical alerts, negative trends
    info: '#2563EB',     // 4.5:1 contrast - Information, links, general accent
    critical: '#991B1B', // 7.85:1 contrast - Crisis/emergency states (WCAG AA Enhanced for Safety)
    successBackground: '#F0FDF4',  // Success background tint
    warningBackground: '#FFFBEB',  // Warning background tint
    errorBackground: '#FEF2F2',    // Error background tint
    infoBackground: '#EFF6FF',     // Info background tint
    criticalBackground: '#FEF2F2'  // Critical background tint
  },

  // Accessibility-Enhanced Colors
  accessibility: {
    // High contrast alternatives for enhanced mode
    highContrast: {
      text: '#000000',      // Pure black for maximum contrast
      background: '#FFFFFF', // Pure white for maximum contrast
      focus: '#0066CC',     // High contrast focus indicator
      error: '#CC0000',     // High contrast error
      success: '#006600',   // High contrast success
    },
    // Focus indicators with WCAG AAA compliance
    focus: {
      primary: '#1D4ED8',   // 7:1 contrast ratio
      error: '#B91C1C',     // 7:1 contrast ratio for errors
      success: '#166534',   // 7:1 contrast ratio for success
      outline: '#3B82F6',   // 4.5:1 minimum for outlines
    },
    // Text contrast helpers
    text: {
      primary: '#111827',   // 15.3:1 contrast on white
      secondary: '#374151', // 9.4:1 contrast on white
      tertiary: '#6B7280',  // 4.5:1 contrast on white
      inverse: '#F9FAFB',   // 15.8:1 contrast on dark
    }
  }
};

export const spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48, xxxl: 64
};

export const borderRadius = {
  small: 4, medium: 8, large: 12, xl: 16, full: 9999
};

export const typography = {
  headline1: { size: 34, weight: '700' as const, spacing: -0.5 },
  headline2: { size: 28, weight: '600' as const, spacing: -0.3 },
  headline3: { size: 22, weight: '600' as const, spacing: 0 },
  bodyLarge: { size: 18, weight: '400' as const, spacing: 0.2, lineHeight: 1.5 },
  bodyRegular: { size: 16, weight: '400' as const, spacing: 0.1, lineHeight: 1.5 },
  caption: { size: 14, weight: '400' as const, spacing: 0.2 },
  micro: { size: 12, weight: '500' as const, spacing: 0.3 }
};