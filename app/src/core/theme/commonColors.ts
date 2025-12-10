/**
 * Common Color Aliases
 * Pre-mapped color tokens for common UI patterns
 * Reduces boilerplate in component files
 *
 * NOTE: Imports directly from design system to avoid circular dependency
 * with colors.ts which re-exports this module
 */
import { colors as dsColors } from '@mp2ez/being-design-system/native';

/**
 * Flat color aliases for common use cases
 * Eliminates per-file localColors duplication
 */
export const commonColors = {
  // Base colors
  white: dsColors.base.white,
  black: dsColors.base.black,
  midnightBlue: dsColors.base.midnightBlue,

  // Gray scale (flat access)
  gray100: dsColors.gray[100],
  gray200: dsColors.gray[200],
  gray300: dsColors.gray[300],
  gray400: dsColors.gray[400],
  gray500: dsColors.gray[500],
  gray600: dsColors.gray[600],
  gray700: dsColors.gray[700],

  // Theme shortcuts
  morningPrimary: dsColors.themes.morning.primary,
  eveningPrimary: dsColors.themes.evening.primary,

  // Status colors
  error: dsColors.status.error,
  warning: dsColors.status.warning,
  success: dsColors.status.success,
  crisis: dsColors.status.critical,

  // Accessibility colors
  focusPrimary: dsColors.accessibility.focus.primary,
} as const;

export type CommonColorKey = keyof typeof commonColors;
