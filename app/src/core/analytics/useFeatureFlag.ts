/**
 * useFeatureFlag — runtime (PostHog-backed) feature-flag tier (INFRA-199).
 *
 * Companion to the synchronous build-time resolver in
 * `@/core/services/featureFlags` (`isFeatureEnabled`). That sync API is the
 * source of truth for safety/structural flags and stays offline-safe and
 * deterministic. THIS hook adds a runtime tier so product/growth flags can be
 * rolled out gradually (and eventually A/B-tested) without an App Store build.
 *
 * Two facts shape the design:
 *
 *  1. A flag value read from PostHog is async and only reachable through a
 *     React hook under a mounted provider — it cannot be served from the sync
 *     `isFeatureEnabled`. So the runtime tier is a hook, not a mutation of the
 *     sync function. (This also means a safety flag, which only ever uses the
 *     sync API, can never reach the network.)
 *
 *  2. `posthog.getFeatureFlag()` enqueues a `$feature_flag_called` event that
 *     carries the device `distinct_id`. So we MUST NOT read a flag on the
 *     no-consent path. We hand-roll `usePostHog()` + `onFeatureFlags` (rather
 *     than the SDK's own `useFeatureFlag`, which always reads and always
 *     subscribes) so the no-consent path stays completely inert.
 *
 * Classification is an explicit ALLOW-LIST (`PRODUCT_FLAGS`): a flag is
 * build-time-only unless deliberately listed here. A new or mistyped flag can
 * therefore never accidentally become network-gated, and the set of
 * remotely-controllable flags stays auditable for compliance.
 *
 * Rollout model: "PostHog promotes; build-time is the floor" — the PostHog
 * value only overrides the build-time default when it resolves to a clean
 * boolean under consent. Full rollout to everyone (including analytics
 * decliners) is achieved by flipping the build-time env default to `true` in a
 * later build, NOT by PostHog alone.
 *
 * Compliance boundary (INFRA-199 ruling): the flag governs UI visibility only.
 * It must NEVER substitute for a data-operation consent gate
 * (`useConsentStore.canPerformOperation(...)`). PostHog flag targeting uses the
 * anonymous device id + `surface: 'app'` super-property ONLY — never any
 * wellness-derived property.
 */

import { useEffect, useState } from 'react';
import { usePostHog } from 'posthog-react-native';
import { isFeatureEnabled, type FeatureFlag } from '@/core/services/featureFlags';
import { useConsentStore } from '@/core/stores/consentStore';

/**
 * Flags that may be resolved at runtime by PostHog. Everything NOT listed here
 * (all safety/structural flags) always resolves from the build-time default and
 * never consults PostHog. Adding a key here is the explicit, reviewable act of
 * making a flag remotely controllable.
 */
export const PRODUCT_FLAGS: ReadonlySet<string> = new Set<string>([
  'cloud_sync',
  'cross_device_sync',
  'emergency_sync',
]);

/**
 * Runtime feature-flag hook. Always returns a boolean.
 *
 * Resolution order (every branch falls back to the build-time default — the
 * hook is fail-safe, never fail-open):
 *   1. flag not in PRODUCT_FLAGS        → build-time default (never consults PostHog)
 *   2. no consent / universal opt-out / no PostHog client → build-time default
 *   3. PostHog value is not a clean boolean (undefined / unresolved / network
 *      failure / string variant)        → build-time default
 *   4. otherwise                        → the PostHog boolean
 *
 * Rules of hooks: every hook below is called unconditionally on every render.
 * All branching happens in the return computation and inside the effect body.
 */
export function useFeatureFlag(flag: FeatureFlag | string): boolean {
  // --- Hooks: always called, unconditionally, top of function ---

  // usePostHog() does NOT throw when no provider is mounted — at runtime it
  // returns undefined (its declared return type is non-nullable and lies, so we
  // widen it). The provider is unmounted whenever analytics consent is absent.
  const posthog = usePostHog() as ReturnType<typeof usePostHog> | undefined;

  const analyticsEnabled = useConsentStore(
    (s) => s.currentConsent?.preferences?.analyticsEnabled ?? false
  );
  const universalOptOut = useConsentStore(
    (s) => s.currentConsent?.universalOptOut ?? false
  );

  const buildTimeDefault = isFeatureEnabled(flag);

  // Only product flags, under granted consent, with a live client, may consult
  // PostHog. This mirrors the mount conditions in PostHogProvider so the two
  // never disagree.
  const mayConsultPostHog =
    PRODUCT_FLAGS.has(flag) && analyticsEnabled && !universalOptOut && posthog != null;

  // Reactive mirror of the PostHog value (null = "no usable PostHog boolean").
  // Seeded synchronously so first paint is correct when flags are already
  // cached/bootstrapped.
  const [phValue, setPhValue] = useState<boolean | null>(() => {
    if (!mayConsultPostHog || posthog == null) return null;
    const v = posthog.getFeatureFlag(flag);
    return typeof v === 'boolean' ? v : null;
  });

  useEffect(() => {
    // Inside the effect we may branch freely — this is not a hook call.
    if (!mayConsultPostHog || posthog == null) {
      setPhValue(null);
      return; // no read, no subscription on the fail-safe path
    }

    const read = (): void => {
      const v = posthog.getFeatureFlag(flag);
      setPhValue(typeof v === 'boolean' ? v : null);
    };

    read(); // re-read in case flags loaded between render and effect
    // onFeatureFlags fires on load/reload and returns an unsubscribe fn.
    return posthog.onFeatureFlags(read);
  }, [posthog, flag, mayConsultPostHog]);

  // --- Pure return computation (no hooks) ---
  if (!mayConsultPostHog) return buildTimeDefault; // (1) carve-out, (2) consent/opt-out/no-client
  if (phValue === null) return buildTimeDefault; // (3) unresolved / non-boolean / net fail
  return phValue; // (4) PostHog boolean
}
