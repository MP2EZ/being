/**
 * PostHog Analytics Provider
 *
 * Wraps the app with PostHog context for privacy-respecting analytics.
 * - EU data residency (Frankfurt)
 * - Consent-based (opt-in, default OFF)
 * - No session recording (privacy)
 * - No autocapture (we control what's sent)
 *
 * @see docs/architecture/analytics-architecture.md
 */

import React from 'react';
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-react-native';
import { registerAnalyticsClient } from './analyticsIdentityReset';
import { AppLifecycleTracker } from './AppLifecycleTracker';
import { useAnalyticsConsent } from './useAnalyticsConsent';
import { env } from '@/core/config/env';

// Environment configuration (validated at startup — see core/config/env.ts)
const POSTHOG_API_KEY = env.EXPO_PUBLIC_POSTHOG_API_KEY;
const POSTHOG_HOST = env.EXPO_PUBLIC_POSTHOG_HOST;

/**
 * Whether this BUILD has a usable PostHog key. Derived from a module-scope
 * constant, so it is fixed for the life of the process — see the note on the
 * single remaining conditional in `PostHogProvider` below.
 */
const POSTHOG_CONFIGURED =
  Boolean(POSTHOG_API_KEY) && POSTHOG_API_KEY !== 'phc_your_api_key_here';

/**
 * Constructor-time options. Module scope because `<PHProvider>` builds its client
 * in `useMemo(..., [client, apiKey])` — `options` is NOT a dependency, so whatever
 * is passed on first render is what the client keeps forever. Nothing here may be
 * consent-reactive; the consent lever is `optIn()`/`optOut()` in `ConsentSync`.
 *
 * THE FIVE PRIVACY-LOAD-BEARING KEYS (DEBUG-559 `compliance` ruling)
 * -----------------------------------------------------------------
 * Since the fix mounts this provider before consent, the client is constructed at
 * launch. `defaultOptIn: false` alone does NOT make that client silent: the SDK's
 * internal `optedOut` check gates only `enqueue()`/`sendImmediate()` — i.e. the
 * capture path — and the RN constructor's init sequence is gated on `isDisabled`,
 * which reads `disabled` ONLY and never consults `optedOut`. Left at their
 * defaults, `reloadRemoteConfigAsync()` and the feature-flag preload each fire a
 * `/flags` request carrying the anonymous device id, BEFORE consent. The three
 * `disable*`/`preload*` keys below are what actually close that, and each was
 * traced in the shipped tarball rather than taken from the docs:
 *
 *   disabled: false           — must STAY false; there is no `enable()` to undo a
 *                               `true`, and it would also kill the post-consent client.
 *   defaultOptIn: false       — start opted OUT, so no capture can enqueue pre-consent.
 *   disableRemoteConfig: true — blocks reloadRemoteConfigAsync()'s flagsAsync().
 *   preloadFeatureFlags: false— blocks the unconditional flagsAsync() in the
 *                               surveys-and-flags init path.
 *   disableSurveys: true      — makes the one remaining init fetch self-gate to a no-op.
 *
 * Net effect, and this is the claim DEBUG-559's AC required ESTABLISHED rather
 * than assumed: while opted out, no code path in the SDK reaches the network. An
 * anonymous device id is still minted to on-device storage at launch; it is never
 * transmitted, and it is the same identifier already disclosed for the opted-in
 * state — see docs/architecture/analytics-architecture.md.
 *
 * `errorTracking` is deliberately ABSENT: with the option undefined the SDK
 * installs no global handlers. Populating it would add a transmission vector and
 * needs a fresh compliance pass.
 */
const POSTHOG_OPTIONS = {
  // EU data residency for GDPR compliance
  host: POSTHOG_HOST,

  // --- Pre-consent network suppression (see the block comment above) ---
  disabled: false,
  defaultOptIn: false,
  disableRemoteConfig: true,
  preloadFeatureFlags: false,
  disableSurveys: true,

  // Privacy settings - session replay is OFF by default
  enableSessionReplay: false,

  // Batching settings
  flushAt: 10, // Batch 10 events before sending
  flushInterval: 30000, // Or flush every 30 seconds

  // Don't capture device identifiers automatically.
  // Stays false, and since INFRA-542 the claim below is true:
  // AppLifecycleTracker (mounted just under this provider) emits our own
  // app_opened / app_backgrounded with a first-open marker and a coarse
  // time-away bucket that pass PHIFilter. Enabling PostHog's own
  // Application Installed/Opened/Backgrounded would double-count them.
  captureAppLifecycleEvents: false, // We handle this ourselves — see AppLifecycleTracker
} as const;

interface PostHogProviderProps {
  children: React.ReactNode;
}

/**
 * Drives the client's opt state from the consent store (DEBUG-559).
 *
 * This is the runtime consent lever, and it has to be imperative. `disabled` and
 * `defaultOptIn` are read once in the client constructor, and the constructor runs
 * inside a `useMemo` keyed on `[client, apiKey]` — so neither can be flipped by
 * re-rendering with different options. Forcing a rebuild by swapping `apiKey`
 * WOULD take effect and must never be used: it constructs a second client, which
 * reintroduces an identity discontinuity and a lost in-memory queue — the same
 * class of damage, one level down, that this whole item exists to remove.
 *
 * `optIn()`/`optOut()` mutate a persisted flag on the EXISTING instance, which is
 * both runtime-reactive and identity-preserving.
 */
function ConsentSync(): null {
  const posthog = usePostHog();
  const mayEmit = useAnalyticsConsent();

  React.useEffect(() => {
    if (!posthog) return;
    // Runs on mount too, not just on change: a never-consented client's persisted
    // OptedOut is undefined, and asserting it explicitly keeps the client's state
    // a function of the consent store rather than of a library default.
    void (mayEmit ? posthog.optIn() : posthog.optOut());
  }, [posthog, mayEmit]);

  return null;
}

/**
 * Tags every PostHog event with `surface: 'app'` so the app's data
 * stays distinguishable from being-website's data in the shared PostHog
 * project (free-tier constraint: 1 project per account). The website
 * mirrors this with `ph.register({ surface: 'web' })` in its own
 * PosthogProvider — see mp2ez/being-website#42.
 *
 * Renders inside <PHProvider> so `usePostHog()` returns the initialized
 * instance. Runs once when the instance becomes available.
 */
function RegisterSurfaceProperty(): null {
  const posthog = usePostHog();
  const mayEmit = useAnalyticsConsent();

  React.useEffect(() => {
    if (!posthog) return;
    // DEBUG-539: hand the instance to module scope so account erasure can reset
    // it even after this provider stops rendering. Revoking consent unmounts
    // <PHProvider> but does NOT destroy the client — it keeps AppState
    // listeners and an in-memory cache that re-persists the pre-erasure
    // distinct_id on the next write. Erasing by deleting the storage files
    // under a live instance is therefore a fake control; the reset has to go
    // THROUGH the instance, which means holding a reference that outlives the
    // render tree.
    //
    // DEBUG-559 note: since this provider is now always mounted, the reference is
    // registered at launch rather than at first consent, so it is always current.
    // That STRENGTHENS the erasure path — but it also means
    // `resetAnalyticsIdentity`'s "no instance was ever built" fallback is now
    // effectively unreachable in a configured build. See analyticsIdentityReset.ts.
    registerAnalyticsClient(posthog);
  }, [posthog]);

  React.useEffect(() => {
    // Gated on consent (DEBUG-559): `register` persists super-properties to disk
    // through `wrap()`, which checks `disabled` and NOT `optedOut`, so it would
    // otherwise write pre-consent. The value is a static, non-personal string and
    // is never transmitted while opted out — but there is no reason for it to be
    // on disk before the user has opted in.
    if (!posthog || !mayEmit) return;
    posthog.register({ surface: 'app' });
  }, [posthog, mayEmit]);

  return null;
}

/**
 * PostHog Provider Component
 *
 * Provides PostHog analytics context to the app with privacy-first configuration.
 * Analytics is DISABLED unless user explicitly grants consent.
 *
 * WHY THE ELEMENT TYPE HERE IS INVARIANT UNDER CONSENT (DEBUG-559)
 * ---------------------------------------------------------------
 * This component used to return a bare fragment without consent and
 * `<PHProvider>` with it. React reconciles by element TYPE at a tree position, so
 * granting consent mid-session deleted and recreated everything below
 * `App.tsx`'s `<PostHogProvider>` — `SafeAreaProvider`, `RootCrisisBoundary`,
 * `CleanRootNavigator` and `RootCrisisButton` included. Measured, not derived:
 * mounts 1→2, unmounts 0→1, component state lost.
 *
 * That is a crisis defect, not a state-loss annoyance. `App.tsx` mounts
 * `<SafeAreaProvider>` with no `initialMetrics`, and that provider renders NOTHING
 * until its native insets round-trip lands — and EVERY 988 affordance in the app
 * (the root button, the keyboard accessory, both `Static988Button` fallbacks) is
 * inside it. So the remount was a blank, zero-988 screen on an ordinary consent
 * tap, with no error involved.
 *
 * Two things are therefore load-bearing and must survive future edits:
 *
 *  1. NO CONSENT-DEPENDENT ELEMENT TYPE. A stable `key` does not help — element
 *     type dominates key in reconciliation, measured on both the children wrapper
 *     and the returned root (DEBUG-557). Neither does hoisting `children` under a
 *     stable wrapper while alternating what sits between: that is the identical
 *     defect one level down.
 *  2. NO CONSENT-DEPENDENT SIBLING INDEX. React reconciles unkeyed children by
 *     position, so a `null`-returning child that renders only under consent still
 *     occupies a slot and shifts `children` — remounting the subtree just as
 *     surely. The three children below therefore render UNCONDITIONALLY, in a
 *     fixed order, and each early-returns internally.
 *
 * The one remaining conditional is on `POSTHOG_CONFIGURED`, which is derived from
 * a module-scope constant and so is fixed for the whole process: a build either
 * always takes that branch or never does. It cannot flip at runtime and therefore
 * cannot remount anything. It is kept so a build with no key (dev — the
 * `.env.development` key is empty) constructs no client at all.
 */
export function PostHogProvider({ children }: PostHogProviderProps): React.ReactElement {
  if (!POSTHOG_CONFIGURED) {
    // No usable key in THIS BUILD — render children without PostHog.
    // AppLifecycleTracker still mounts here: it owns the always-on
    // setLastActiveTimestamp write that feeds the Home intro animation, which
    // is not analytics and must keep working without a client.
    return (
      <>
        <AppLifecycleTracker />
        {children}
      </>
    );
  }

  return (
    <PHProvider
      apiKey={POSTHOG_API_KEY}
      autocapture={false} // We control exactly what's sent via PHIFilter
      options={POSTHOG_OPTIONS}
    >
      <ConsentSync />
      <RegisterSurfaceProperty />
      <AppLifecycleTracker />
      {children}
    </PHProvider>
  );
}

/**
 * Hook to check if PostHog is properly configured
 * Useful for conditional rendering of analytics UI
 */
export function usePostHogConfigured(): boolean {
  return POSTHOG_CONFIGURED;
}

export default PostHogProvider;
