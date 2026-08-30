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
 * WHY IT RENDERS IN BOTH PROVIDER BRANCHES. Job (1) is not analytics and must
 * keep running for a user who has not consented. Mounting this only inside the
 * gated `<PHProvider>` branch would silently stop the intro animation's
 * timestamp for every non-consenting user. Outside a provider `usePostHog()`
 * returns undefined, so job (2) becomes a no-op on its own — no extra gating
 * needed, and none should be added.
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
import { bucketSinceLastActive, consumeColdStart } from './appLifecycleTelemetry';
import { useSettingsStore } from '@/core/stores/settingsStore';

function isBackgroundish(state: AppStateStatus): boolean {
  return state === 'background' || state === 'inactive';
}

export function AppLifecycleTracker(): null {
  const posthog = usePostHog();
  const { trackAppOpened, trackAppBackgrounded } = useAnalytics();

  // `?? 'active'` because AppState.currentState is null on Android before the
  // first change event; without it the first background transition is missed.
  const appState = useRef<AppStateStatus>(AppState.currentState ?? 'active');
  const activatedAt = useRef<number>(Date.now());
  /** When this process last went to background. Null until it does. */
  const backgroundedAt = useRef<number | null>(null);
  const emittedOpenForThisMount = useRef(false);

  // Mount emit. Gated on a live client for a specific reason: consumeColdStart
  // CONSUMES the marker, so running it while the event would be dropped loses
  // the first open permanently. Granting consent remounts this whole subtree
  // (pinned by PostHogProvider.consentRemount.privacy.test.tsx), so a user who
  // opts in still gets a mount with a client present.
  useEffect(() => {
    if (!posthog || emittedOpenForThisMount.current) return;
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
  }, [posthog, trackAppOpened]);

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
