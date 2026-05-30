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
  therapeutic: dsColors.therapeutic,
};

// Export as 'colors' for backward compatibility
export const colors = colorSystem;

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

/**
 * Neutral severity reference-band tokens (FEAT-30).
 *
 * Used to shade the clinical reference ranges behind the Wellness Screening
 * Trends chart. Deliberately NOT a green→red stoplight ramp: a rising PHQ-9 /
 * GAD-7 score is information, not failure, so severity must read as neutral
 * depth + a text label — never as "you're winning / failing" colour
 * (philosopher red line on moralized severity colour).
 *
 * A single DS gray fill is rendered at increasing `fillOpacity` for higher
 * severity bands (deeper, not redder). Zero new hex — all values derive from
 * the design-system gray scale.
 */
export const severityBands = {
  /** Single neutral fill for every reference band (legacy filled-band style). */
  fill: colorSystem.gray[700],
  /** Hairline colour for reference-boundary gridlines (neutral, matches list dividers). */
  gridline: colorSystem.gray[300],
  /** Neutral colour for band range labels. */
  label: semantic.text.muted,
  /**
   * Per-severity fill opacity. Keyed by the clinical severity names used by
   * PHQ-9 (includes `moderately_severe`) and GAD-7. Stepped, not hued.
   */
  opacity: {
    minimal: 0.04,
    mild: 0.07,
    moderate: 0.1,
    moderately_severe: 0.13,
    severe: 0.16,
  },
} as const;

export type SeverityBandKey = keyof typeof severityBands.opacity;

// Flat re-exports for direct destructuring (optional convenience)
// Use colorSystem.* for most cases; these are for legacy compatibility
export const crisis = colorSystem.status.critical;
