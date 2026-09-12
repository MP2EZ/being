/**
 * AppLifecycleTracker (INFRA-542)
 *
 * Owns the app's single `AppState` listener for two unrelated jobs:
 *  1. the ALWAYS-ON `setLastActiveTimestamp` write that feeds the Home
 *     intro animation, and
 *  2. the CONSENT-GATED `app_opened` / `app_backgrounded` emits.
 *
 * WHY THIS COMPONENT EXISTS. The listener used to live in `App.tsx`, which is
 * the component that RENDERS `<PostHogProvider>` — so it sat above the
 * provider, `usePostHog()` returned undefined there, and any emit added at
 * that site would have early-returned in `trackEvent` forever. It would have
 * compiled, type-checked, passed review, and passed any test that mocks
 * `usePostHog`. That is the FEAT-137 shape: instrumentation that looks correct
 * and transmits nothing.
 *
 * WHY IT RENDERS UNCONDITIONALLY. Job (1) is not analytics and must keep running
 * for a user who has not consented, so this may never be mounted only on a
 * consented path. Since DEBUG-559 it also may never be mounted CONDITIONALLY at
 * all: it is a sibling of `children` under `PostHogProvider`, and React reconciles
 * unkeyed children by index, so a component that renders only under consent shifts
 * every later sibling and remounts the crisis subtree — the same defect DEBUG-559
 * fixed, by a different route.
 *
 * Job (2) no longer self-disables. That used to be free — outside a provider
 * `usePostHog()` returned undefined and `trackEvent` early-returned — but the
 * provider is now always mounted, so both this component and `useAnalytics` gate
 * on `useAnalyticsConsent()` explicitly.
 *
 * The client is read through the React context hook ONLY. Never reach for the
 * module-scope reference in `analyticsIdentityReset` — that one deliberately
 * outlives unmount so erasure can reset it, and emitting through it would fire
 * events for a user who has revoked consent.
 */

import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { usePostHog } from 'posthog-react-native';
import { useAnalytics } from './useAnalytics';
import { useAnalyticsConsent } from './useAnalyticsConsent';
import { bucketSinceLastActive, consumeColdStart } from './appLifecycleTelemetry';
import { useSettingsStore } from '@/core/stores/settingsStore';

function isBackgroundish(state: AppStateStatus): boolean {
  return state === 'background' || state === 'inactive';
}

export function AppLifecycleTracker(): null {
  const posthog = usePostHog();
  const mayEmit = useAnalyticsConsent();
  const { trackAppOpened, trackAppBackgrounded } = useAnalytics();

  // `?? 'active'` because AppState.currentState is null on Android before the
  // first change event; without it the first background transition is missed.
  const appState = useRef<AppStateStatus>(AppState.currentState ?? 'active');
  const activatedAt = useRef<number>(Date.now());
  /** When this process last went to background. Null until it does. */
  const backgroundedAt = useRef<number | null>(null);
  const emittedOpenForThisMount = useRef(false);

  // Mount emit. Gated because consumeColdStart CONSUMES a one-shot marker, so
  // running it while the event would be dropped loses the first open permanently.
  //
  // THE GATE IS CONSENT, NOT CLIENT PRESENCE (corrected DEBUG-559). It used to be
  // `!posthog`, and this comment used to explain that "granting consent remounts
  // this whole subtree ... so a user who opts in still gets a mount with a client
  // present" — i.e. INFRA-542's first-open delivery was load-bearing on the very
  // remount DEBUG-559 removes. Two things broke at once when that remount went
  // away: a client now exists from launch, so `!posthog` no longer means "no
  // consent" and this effect would fire at launch for a non-consenting user,
  // burning the marker on an event `trackEvent` then drops; and there is no second
  // mount later to retry on. Reading `mayEmit` fixes both — it is false at launch
  // without consent, and it flips true in place when consent is granted, re-running
  // this effect without anything unmounting.
  useEffect(() => {
    if (!posthog || !mayEmit || emittedOpenForThisMount.current) return;
    emittedOpenForThisMount.current = true;

    let cancelled = false;
    void (async (): Promise<void> => {
      const isColdStart = await consumeColdStart();
      if (cancelled) return;
      const lastActiveAt = useSettingsStore.getState().getLastActiveTimestamp();
      trackAppOpened(isColdStart, bucketSinceLastActive(lastActiveAt, Date.now()));
    })();

    return (): void => {
      cancelled = true;
    };
  }, [posthog, mayEmit, trackAppOpened]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus): void => {
      const previous = appState.current;
      const now = Date.now();

      if (previous === 'active' && isBackgroundish(nextAppState)) {
        backgroundedAt.current = now;
        // Unconditional: this is the intro-animation timestamp, not analytics.
        void useSettingsStore.getState().setLastActiveTimestamp(now);
        // Foreground dwell — how long the app was open, never time away.
        trackAppBackgrounded(Math.max(0, Math.round((now - activatedAt.current) / 1000)));
      } else if (isBackgroundish(previous) && nextAppState === 'active') {
        activatedAt.current = now;
        // A re-foreground is never a first open, whatever the marker says.
        trackAppOpened(false, bucketSinceLastActive(backgroundedAt.current, now));
      }

      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return (): void => {
      subscription?.remove();
    };
  }, [trackAppOpened, trackAppBackgrounded]);

  return null;
}

export default AppLifecycleTracker;
