/**
 * featureFlags.ts — build-time feature-flag consumer (MAINT-173).
 *
 * Parses the `EXPO_PUBLIC_FEATURE_FLAGS` env blob (validated as a non-empty
 * string in `env.ts`) into a lookup and exposes `isFeatureEnabled(name)`.
 *
 * Why build-time (env) rather than a remote flag service: these gate
 * release-level feature availability (e.g. `cloud_sync`), not per-user
 * rollout. An env-backed flag is offline-safe, deterministic, and adds no
 * network dependency — which matters in an app with crisis/safety surfaces
 * where feature availability must never hinge on a network round-trip.
 *
 * This sync API remains the source of truth for safety/structural flags. For
 * runtime control (kill-switch, %-rollout, A/B) of *product* flags, use the
 * PostHog-backed `useFeatureFlag` hook in `@/core/analytics` (INFRA-199): it
 * layers on top of this build-time default (which stays the fail-safe floor)
 * and only resolves remotely for the explicit `PRODUCT_FLAGS` allow-list, under
 * granted analytics consent.
 *
 * Blob format: comma-separated `key:value` pairs, e.g.
 *   "cloud_sync:false,cross_device_sync:true". Only the literal string "true"
 * enables a flag; any other value (or an unknown key) resolves to false.
 */

import { env } from '@/core/config/env';

/**
 * Known build-time flags (the keys present in EXPO_PUBLIC_FEATURE_FLAGS).
 *
 * Scope: only flags that some code path actually reads. Today that is the sync
 * family — `cloud_sync` flows through `isFeatureEnabled` via the runtime
 * `useFeatureFlag` hook (it is in `PRODUCT_FLAGS`), and `emergency_sync` /
 * `cross_device_sync` are reserved allow-list placeholders for upcoming sync
 * features — plus `wellness_trend_notes` (FEAT-195), read via the runtime
 * `useFeatureFlag` hook to gate the Wellness Trends "Your note" surface
 * (in `PRODUCT_FLAGS`; ships dark, build-time floor false). MAINT-213 removed
 * eight keys that lived here but were never read as flags (`production_mode`,
 * `performance_monitoring`, `crisis_detection`, `clinical_accuracy`,
 * `data_encryption`, `biometric_auth`, `offline_mode`, `widget_support`).
 *
 * NOTE — name collisions: several of those removed names still appear as string
 * literals elsewhere (`crisis_detection` in CircuitBreakerService /
 * CrisisSecurityProtocol, `performance_monitoring`, `biometric_auth`,
 * `offline_mode` in performance constraints, etc.). Those are independent
 * service / enum / constraint labels — NOT feature flags. Do not resurrect any
 * of them as a build-time flag here without first confirming there is a real
 * `isFeatureEnabled(...)` consumer; otherwise you re-introduce a decorative
 * env entry that gates nothing and reads like a live safety toggle.
 */
export type FeatureFlag =
  | 'cloud_sync'
  | 'emergency_sync'
  | 'cross_device_sync'
  | 'wellness_trend_notes'
  // FEAT-284: gates the internal-only "Report a bug / Send feedback" surface
  // (shake-to-report + Sentry feedback widget with screenshot). Build-time (not
  // runtime/PostHog) by design: availability must be deterministic, offline, and
  // NOT coupled to analytics consent (INFRA-199 safety carve-out). ON in dev +
  // `.env.production` PRE-LAUNCH so it ships to TestFlight (same binary as the
  // App Store — no build-time way to distinguish). ⚠️ LAUNCH GATE: flip OFF in
  // `.env.production` before the public v1.0.0 release. Pinned in
  // __tests__/privacy/feedbackScrub.contract.test.ts.
  | 'bug_reporting'
  // FEAT-285: haptic phase cues during timed practices. Build-time (not
  // runtime/PostHog) by design — this is a non-visual guidance channel for
  // low-vision and eyes-closed practitioners, so its availability must not be
  // coupled to analytics consent (INFRA-199 carve-out, same reasoning as
  // `bug_reporting`). A user who declined analytics must not thereby lose their
  // only non-visual cue channel. Ships dark: the item's 60fps / cue-latency /
  // degradation checks are on-device manual validation that CI cannot run
  // (100% ubuntu, and the iOS simulator emits no haptics at all), so the flag
  // stays false in production until that checklist is signed off.
  | 'practice_haptics'
  // FEAT-283: gates the voice journal / spoken reflection surface (capture,
  // on-device transcription, encrypted store, crisis scan). Build-time, NOT
  // runtime/PostHog, for three reasons: it gates a whole screen + entry point
  // rather than a per-user rollout (same shape as `daily_loop`); a zero-egress
  // feature must not have network-dependent availability; and INFRA-199 forbids
  // coupling availability to analytics consent, which the crisis-scan path on
  // this surface must never inherit. Ships dark (false in production).
  // NOTE: the e2e-sim EAS profile must enable this or the Maestro safety flow
  // runs against a dark flag and fails.
  | 'voice_journal';

/**
 * Parse a feature-flag blob into a boolean lookup.
 *
 * Malformed segments (no `:` separator, empty key) are skipped rather than
 * thrown — `env.ts` already guarantees the var is a non-empty string, and a
 * single bad pair must not crash the app at module load (this module is
 * imported by UI screens).
 */
function parseFlags(blob: string): Record<string, boolean> {
  const flags: Record<string, boolean> = {};
  for (const pair of blob.split(',')) {
    const idx = pair.indexOf(':');
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (key) flags[key] = value === 'true';
  }
  return flags;
}

// Parsed once at module load (mirrors env.ts's parse-once pattern); zero
// per-call cost.
const FLAGS = parseFlags(env.EXPO_PUBLIC_FEATURE_FLAGS);

/**
 * Returns true only if the flag is present AND set to "true".
 * Unknown flags default to false.
 */
export function isFeatureEnabled(name: FeatureFlag | string): boolean {
  return FLAGS[name] === true;
}

/** Test-only seam: exercise parsing logic without touching module state. */
export const __parseFlagsForTest = parseFlags;
