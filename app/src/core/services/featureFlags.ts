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
 * where feature availability must never hinge on a network round-trip. If
 * remote runtime control (kill-switch, %-rollout, A/B) is ever needed, swap
 * the backing source here; the `isFeatureEnabled` call sites stay identical.
 *
 * Blob format: comma-separated `key:value` pairs, e.g.
 *   "cloud_sync:false,widget_support:true". Only the literal string "true"
 * enables a flag; any other value (or an unknown key) resolves to false.
 */

import { env } from '@/core/config/env';

/** Known build-time flags (the keys present in EXPO_PUBLIC_FEATURE_FLAGS). */
export type FeatureFlag =
  | 'cloud_sync'
  | 'emergency_sync'
  | 'cross_device_sync'
  | 'production_mode'
  | 'performance_monitoring'
  | 'crisis_detection'
  | 'clinical_accuracy'
  | 'data_encryption'
  | 'biometric_auth'
  | 'offline_mode'
  | 'widget_support';

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
