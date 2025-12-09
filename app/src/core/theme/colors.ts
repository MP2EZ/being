/**
 * Being. Color System - Powered by @mp2ez/being-design-system
 *
 * Re-exports design tokens from the shared design system package.
 * The Proxy wrapper on themes provides safe access with fallback warnings.
 */
import {
  colors as dsColors,
  spacing,
  borderRadius,
  typography,
  getTheme,
} from '@mp2ez/being-design-system/native';
import type { Theme, ThemeKey } from '@mp2ez/being-design-system/native';

// Re-export spacing, borderRadius, typography, getTheme directly
export { spacing, borderRadius, typography, getTheme };
export type { Theme, ThemeKey };

// Create themes object with Proxy for safe access (maintains backward compatibility)
const themesHandler: ProxyHandler<typeof dsColors.themes> = {
  get(target, prop) {
    if (prop in target) {
      return target[prop as keyof typeof target];
    }
    console.warn(`[Theme Warning] Attempted to access undefined theme: ${String(prop)}, falling back to morning`);
    return target.morning;
  }
};

const themesProxy = new Proxy(dsColors.themes, themesHandler);

// Build colorSystem from design system values with Proxy-wrapped themes
export const colorSystem = {
  themes: themesProxy,
  base: dsColors.base,
  gray: dsColors.gray,
  status: dsColors.status,
  accessibility: dsColors.accessibility,
  navigation: dsColors.navigation,
};

// Export as 'colors' for backward compatibility
export const colors = colorSystem;

// Re-export commonColors for shared color aliases
export { commonColors } from './commonColors';

/**
 * Semantic color tokens for common UI patterns
 * Maps intent to specific color values
 */
export const semantic = {
  text: {
    primary: colorSystem.base.black,
    secondary: colorSystem.gray[600],
    muted: colorSystem.gray[500],
    inverse: colorSystem.base.white,
  },
  background: {
    primary: colorSystem.base.white,
    secondary: colorSystem.gray[100],
  },
  border: {
    default: colorSystem.gray[200],
    strong: colorSystem.gray[400],
  },
} as const;

// Flat re-exports for direct destructuring (optional convenience)
import { commonColors as _cc } from './commonColors';
export const {
  white, black, midnightBlue,
  gray100, gray200, gray300, gray400, gray500, gray600, gray700,
  morningPrimary, eveningPrimary,
  error, warning, success, crisis,
  focusPrimary,
} = _cc;
