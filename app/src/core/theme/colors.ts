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
  shadows,
} from '@mp2ez/being-design-system/native';
import type { Theme, ThemeKey, Shadows, ShadowKey } from '@mp2ez/being-design-system/native';

// Re-export spacing, borderRadius, typography, getTheme, shadows directly.
// MAINT-222: shadows is now re-exported here so UI uses the DS elevation token
// instead of hand-rolled shadowColor:'#000' literals (DS guidance: prefer borders).
export { spacing, borderRadius, typography, getTheme, shadows };
export type { Theme, ThemeKey, Shadows, ShadowKey };

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
  principles: dsColors.principles, // MAINT-253: principle category colours for the Insights chart
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
    secondary: colorSystem.gray[700],
    // DEBUG-323: was gray[500], which is 1.98:1 on background.primary (white) —
    // failing WCAG AA for normal text (4.5:1) AND for large text (3:1). A
    // semantic *text* token that could not legally render text on the default
    // background; all 7 non-test consumers were latent AA failures.
    //
    // This is a DELIBERATE ALIAS of `secondary`, not an oversight. The
    // design-system gray ramp has no accessible step between gray[500] (1.98:1)
    // and gray[600] (4.61:1) — so any value light enough to read as distinct
    // from the passing step is by construction too light to pass. There is no
    // legal third text tier, and minting a hex would violate the
    // no-hardcoded-colour rule.
    //
    // Consequence: quieting must be expressed STRUCTURALLY — italic, position,
    // size, enclosure — never chromatically. Same ruling FEAT-292 already made
    // one level down at DailyLoopStepScreen.tsx ("subordination is preserved
    // structurally rather than chromatically"); this lifts it to the token so
    // the two cannot contradict each other.
    //
    // DEBUG-357: both tokens moved gray[600] -> gray[700]. gray[600] (#757575)
    // was legal ONLY on white (4.61:1) and failed AA on every other surface in
    // the app — gray[50] 4.38, gray[100] 4.41, gray[200] 3.97, and all four
    // getTheme backgrounds 4.26–4.37. That made the token a trap: the "correct"
    // choice silently failed the moment a site sat on a tinted surface, and the
    // pin at the time asserted white only, so nothing could detect it.
    //
    // gray[700] (#424242) clears 4.5:1 on EVERY surface (worst case 8.66 on
    // gray[200]), which makes these tokens SURFACE-INDEPENDENT. That property is
    // the point, not a side effect: `SkipLink` renders `muted` with no
    // backgroundColor of its own over five different hosts, so its surface is
    // not statically knowable and no per-site fix could ever cover it.
    //
    // The cost is that the subordinate tier and body text are now the same
    // colour. That is the DEBUG-323 ruling above being paid, not violated —
    // there was never a legal chromatic tier to preserve.
    //
    // Pinned by core/theme/__tests__/theme-contrast.accessibility.test.ts, which
    // DEBUG-357 widened from a single-surface assertion to a per-(foreground,
    // surface) matrix so "valid only on white" cannot become tribal knowledge again.
    muted: colorSystem.gray[700],
    inverse: colorSystem.base.white,
  },
  background: {
    primary: colorSystem.base.white,
    secondary: colorSystem.gray[100],
    // MAINT-263: single tab-screen surface token. Home/Learn/Insights/Profile (and the
    // Insights "full history" detail screen) all read from this so the cross-tab
    // background decision lives in one place. Unified to white (was: Insights gray[100])
    // after MAINT-257 made tab headers borderless — the screen background is now the
    // visual separator, so one surface keeps the tabs reading as a single coherent space.
    // Insights content cards take a 1px semantic.border.default hairline to stay defined
    // on white (they previously relied on the gray backdrop).
    screen: colorSystem.base.white,
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
