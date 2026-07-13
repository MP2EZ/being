/**
 * SENSITIVE-SCREEN DETECTION & COARSENING (DEBUG-239)
 *
 * Single source of truth, shared across telemetry sinks so they cannot drift:
 *  - PostHog product analytics (`useAnalytics.trackScreenView`)
 *  - Sentry error reporting (`ExternalErrorReporter`)
 *
 * A "sensitive" screen is one whose name reveals a wellness-sensitive context
 * (assessment, crisis, journal, ...). Such names are coarsened to a generic
 * bucket before any telemetry leaves the device, so a screen-view event cannot
 * by itself disclose that a user visited, e.g., the crisis or assessment flow.
 *
 * Terminology: "wellness/personal data," not "PHI" — Being is a consumer
 * wellness app, not a HIPAA-covered entity.
 */

/** Generic bucket label substituted for a sensitive screen name. */
export const GENERIC_SCREEN_BUCKET = 'App';

/**
 * Route / screen-name fragments that mark a wellness-sensitive surface.
 * Matched case-insensitively as substrings.
 */
const SENSITIVE_ROUTE_KEYWORDS: ReadonlyArray<string> = [
  'assessment',
  'phq',
  'gad',
  'crisis',
  'emergency',
  'safety',
  'intervention',
  'journal',
  'reflection',
];

/**
 * Generic, non-sensitive screen labels that Sentry's stricter allowlist lets
 * through (with the trailing "Screen" stripped).
 */
const ALLOWED_GENERIC_SCREENS: ReadonlyArray<string> = [
  'Home',
  'Settings',
  'Profile',
  'Learn',
  'Practice',
  'Morning',
  'Midday',
  'Evening',
  'CheckIn',
  'Progress',
];

/** True if a route / screen name references a wellness-sensitive surface. */
export function isSensitiveRoute(route: string): boolean {
  const routeLower = route.toLowerCase();
  return SENSITIVE_ROUTE_KEYWORDS.some((r) => routeLower.includes(r));
}

/**
 * Coarsen a screen name for the PostHog analytics path: a sensitive screen
 * collapses to the generic bucket; any other name passes through unchanged so
 * non-sensitive per-screen funnels are preserved (DEBUG-239).
 */
export function coarsenScreenNameForAnalytics(screenName: string): string {
  return isSensitiveRoute(screenName) ? GENERIC_SCREEN_BUCKET : screenName;
}

/**
 * Sentry-side screen-name coarsening: a stricter allowlist that strips the
 * trailing "Screen" suffix and permits only a fixed generic set, defaulting
 * everything else to the bucket. Preserves the prior ExternalErrorReporter
 * behavior verbatim (returns undefined for empty input).
 */
export function sanitizeScreenName(name?: string): string | undefined {
  if (!name) return undefined;

  const genericName = name.replace(/Screen$/, '');
  if (
    ALLOWED_GENERIC_SCREENS.some((s) =>
      genericName.toLowerCase().includes(s.toLowerCase())
    )
  ) {
    return genericName;
  }

  return GENERIC_SCREEN_BUCKET;
}
