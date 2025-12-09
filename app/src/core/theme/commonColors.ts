/**
 * Common Color Aliases
 * Pre-mapped color tokens for common UI patterns
 * Reduces boilerplate in component files
 */
import { colors } from './colors';

/**
 * Flat color aliases for common use cases
 * Eliminates per-file localColors duplication
 */
export const commonColors = {
  // Base colors
  white: colors.base.white,
  black: colors.base.black,
  midnightBlue: colors.base.midnightBlue,

  // Gray scale (flat access)
  gray100: colors.gray[100],
  gray200: colors.gray[200],
  gray300: colors.gray[300],
  gray400: colors.gray[400],
  gray500: colors.gray[500],
  gray600: colors.gray[600],
  gray700: colors.gray[700],

  // Theme shortcuts
  morningPrimary: colors.themes.morning.primary,
  eveningPrimary: colors.themes.evening.primary,

  // Status colors
  error: colors.status.error,
  warning: colors.status.warning,
  success: colors.status.success,
  crisis: colors.status.critical,

  // Accessibility colors
  focusPrimary: colors.accessibility.focus.primary,
} as const;

export type CommonColorKey = keyof typeof commonColors;
