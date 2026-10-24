/**
 * Analytics Hook
 *
 * Provides safe analytics tracking with automatic PHI filtering.
 * All events are validated against the whitelist before transmission.
 *
 * @see docs/architecture/analytics-architecture.md
 */

import { useCallback } from 'react';
import { usePostHog } from 'posthog-react-native';
import { useAnalyticsConsent } from './useAnalyticsConsent';
import { PHIFilter, AnalyticsEvents } from './PHIFilter';
import { logAnalytics } from '@/core/services/logging';
import { coarsenScreenNameForAnalytics, isSensitiveRoute } from '@/core/utils/sensitiveScreens';
import type { SinceLastActiveBucket } from './appLifecycleTelemetry';

/**
 * Screens that show a person's PHQ-9/GAD-7 history but match no sensitive-route
 * keyword. Their screen views are not sent (DEBUG-821).
 */
const SCREENING_HISTORY_SCREENS: ReadonlySet<string> = new Set([
  'InsightsScreen',
  'WellnessTrendsDetailScreen',
]);

/**
 * Hook for safe analytics tracking
 *
 * @example
 * const { trackEvent, trackScreenView } = useAnalytics();
 *
 * // Track a screen view
 * trackScreenView('HomeScreen');
 *
 * // Track an event
 * trackEvent(AnalyticsEvents.CHECK_IN_COMPLETED, { duration_ms: 5000 });
 */
export function useAnalytics() {
  const posthog = usePostHog();
  const mayEmit = useAnalyticsConsent();

  /**
   * Track an event with PHI validation
   * Only whitelisted events with safe data will be transmitted
   */
  const trackEvent = useCallback(
    (eventName: string, properties?: Record<string, string | number | boolean>) => {
      // Two independent gates, and the ORDER OF IMPORTANCE is the second one.
      //
      // `!posthog` used to be the whole gate, and it worked only as a side effect
      // of a bug: PostHogProvider withheld <PHProvider> without consent, so
      // usePostHog() was undefined and this returned early. DEBUG-559 fixed that
      // shape (the conditional was remounting every 988 affordance in the app), so
      // a client now exists from launch and this check is no longer a consent
      // signal — it only means "no key in this build".
      //
      // `mayEmit` is the consent gate. Without it, enforcement would rest entirely
      // on the vendored SDK's internal `optedOut` check inside `capture`. That does
      // hold today, but it makes our privacy posture a property of a third party's
      // internals and it is silent when it changes. Ruled non-negotiable by the
      // DEBUG-559 compliance pass: usePostHog() truthiness is never a consent signal.
      if (!posthog || !mayEmit) {
        return;
      }

      const eventData = properties || {};
      const validation = PHIFilter.validate(eventName, eventData);

      if (validation.valid) {
        // `$geoip_disable` is added AFTER validation, so the filter never scans it.
        // It is the per-event opt-out from PostHog's GeoIP enrichment (DEBUG-821).
        // @posthog/core defaults `disableGeoip` to false, so without this every
        // event carried $geoip_city_name. The project's GeoIP transformation is
        // disabled too (founder console step); this half covers that setting
        // being re-enabled, and is the half a test can pin.
        posthog.capture(eventName, { ...eventData, $geoip_disable: true });
        logAnalytics(`Event tracked: ${eventName}`, { category: 'tracking' });
      } else {
        // PHIFilter already logs the block reason
        logAnalytics(`Event blocked: ${eventName} - ${validation.reason}`, {
          category: 'blocked',
        });
      }
    },
    [posthog, mayEmit]
  );

  /**
   * Track a screen view (convenience method)
   */
  const trackScreenView = useCallback(
    (screenName: string) => {
      // A sensitive screen sends NOTHING (DEBUG-821). DEBUG-239 coarsened these
      // names to the bucket `App`, but CrisisResourcesScreen was the only
      // sensitive screen calling this, so `App` meant "opened crisis resources":
      // 2,288 screen_viewed{App} against 2,288 crisis_resources_viewed over 30
      // days. A bucket only one screen fills is not coarsening. The PHQ-9/GAD-7
      // history screens match no sensitive keyword, so they are named here.
      if (isSensitiveRoute(screenName) || SCREENING_HISTORY_SCREENS.has(screenName)) {
        return;
      }
      // Still coarsened: if a sensitive name ever slips past the check above it
      // becomes the bucket, which PHIFilter then rejects. Non-sensitive names pass
      // through unchanged.
      trackEvent(AnalyticsEvents.SCREEN_VIEWED, {
        screen_name: coarsenScreenNameForAnalytics(screenName),
      });
    },
    [trackEvent]
  );

  /**
   * Track app lifecycle events (INFRA-542).
   *
   * `since_last_active` is a coarse bucket, never a raw elapsed value —
   * `seconds_since_last_active` is absent from `SAFE_NUMERIC_KEYS`, so an
   * unlisted numeric key would make PHIFilter discard the whole event.
   * `duration_seconds` is whitelisted and means FOREGROUND DWELL on
   * `app_backgrounded` only; emitting one key that meant dwell here and time
   * away on `app_opened` would make any aggregate over it meaningless.
   */
  const trackAppOpened = useCallback(
    (isColdStart: boolean, sinceLastActive: SinceLastActiveBucket) => {
      trackEvent(AnalyticsEvents.APP_OPENED, {
        is_cold_start: isColdStart,
        since_last_active: sinceLastActive,
      });
    },
    [trackEvent]
  );

  const trackAppBackgrounded = useCallback(
    (durationSeconds: number) => {
      trackEvent(AnalyticsEvents.APP_BACKGROUNDED, { duration_seconds: durationSeconds });
    },
    [trackEvent]
  );

  /**
   * RETIRED — these five send nothing (DEBUG-821, ruling B "minimise").
   *
   * Opening a crisis resource, tapping a crisis line, starting or finishing a
   * wellness screening and opening hardship guidance were each sent to PostHog
   * under the persistent distinct_id, which made them consumer health data under
   * WA MHMDA. See `RETIRED_ANALYTICS_EVENTS` in PHIFilter.ts.
   *
   * They stay as no-ops with their signatures so the crisis and assessment call
   * sites keep compiling untouched, and they return BEFORE `trackEvent`, so a
   * crisis tap never reaches PHIFilter's synchronous `logSecurity` block log.
   * Accepted loss: FEAT-543's primary/secondary 988 split, the only behavioural
   * read on "988 in under three taps". Maestro still pins reachability.
   *
   * Do not re-wire them, and do not re-home these signals to any other sink keyed
   * to an identifier: either needs a new compliance ruling.
   */
  const trackCrisisResourcesViewed = useCallback(() => {}, []);
  const trackCrisisHotlineTapped = useCallback((_primary988: boolean) => {}, []);
  const trackGuidanceOpened = useCallback(() => {}, []);
  const trackAssessmentStarted = useCallback(() => {}, []);
  const trackAssessmentCompleted = useCallback((_durationMs?: number) => {}, []);

  const trackSettingsOpened = useCallback(() => {
    trackEvent(AnalyticsEvents.SETTINGS_OPENED);
  }, [trackEvent]);

  const trackConsentChanged = useCallback(() => {
    trackEvent(AnalyticsEvents.CONSENT_CHANGED);
  }, [trackEvent]);

  const trackLearnContentViewed = useCallback(
    (moduleId?: string) => {
      trackEvent(AnalyticsEvents.LEARN_CONTENT_VIEWED, {
        ...(moduleId !== undefined && { module_id: moduleId }),
      });
    },
    [trackEvent]
  );

  /**
   * Track learn module lifecycle
   */
  const trackLearnModuleStarted = useCallback(
    (moduleId?: string) => {
      trackEvent(AnalyticsEvents.LEARN_MODULE_STARTED, {
        ...(moduleId !== undefined && { module_id: moduleId }),
      });
    },
    [trackEvent]
  );


  /**
   * Track onboarding flow
   */
  /**
   * Feature-usage lifecycle (DEBUG-536). The assessment pair was retired by
   * DEBUG-821; see the no-ops above.
   *
   * Note the FILTER IS NOT THE CONTROL for property meaning: a key like
   * `instrument: 'depression'` would pass validation untouched. These comments are.
   *
   * 🔴 DO NOT ADD `practice_id` TO THE PRACTICE TRACKERS. An exhaustive
   * practice→token map is required first: `gratitude-reflection` and
   * `social-impact-reflection` both contain the PHI keyword `reflection` and would
   * be dropped while the other ten pass — partial blindness that reads as real data.
   *
   * 🔴 NO COMPLETION FIGURE DERIVED FROM THESE MAY BE SHOWN TO THE PRACTITIONER.
   * Founder-facing only, perpetually. FEAT-328's invariant is that completion may be
   * stated, never marked; a completion rate surfaced in Insights, on Home or in the
   * coda is an outcome verdict on someone's practice, which the framework forbids.
   */
  const trackCheckInStarted = useCallback(() => {
    trackEvent(AnalyticsEvents.CHECK_IN_STARTED);
  }, [trackEvent]);

  const trackCheckInCompleted = useCallback(
    (durationMs?: number) => {
      trackEvent(AnalyticsEvents.CHECK_IN_COMPLETED, {
        ...(durationMs !== undefined && { duration_ms: durationMs }),
      });
    },
    [trackEvent]
  );

  const trackPracticeStarted = useCallback(() => {
    trackEvent(AnalyticsEvents.PRACTICE_STARTED);
  }, [trackEvent]);

  const trackPracticeCompleted = useCallback(
    (durationMs?: number) => {
      trackEvent(AnalyticsEvents.PRACTICE_COMPLETED, {
        ...(durationMs !== undefined && { duration_ms: durationMs }),
      });
    },
    [trackEvent]
  );

  const trackOnboardingStarted = useCallback(() => {
    trackEvent(AnalyticsEvents.ONBOARDING_STARTED);
  }, [trackEvent]);

  const trackOnboardingStepCompleted = useCallback(
    (step: number) => {
      trackEvent(AnalyticsEvents.ONBOARDING_STEP_COMPLETED, { step });
    },
    [trackEvent]
  );

  const trackOnboardingCompleted = useCallback(() => {
    trackEvent(AnalyticsEvents.ONBOARDING_COMPLETED);
  }, [trackEvent]);


  return {
    // Core methods
    trackEvent,
    trackScreenView,

    // App lifecycle
    trackAppOpened,
    trackAppBackgrounded,

    // Features
    trackCrisisResourcesViewed,
    trackCrisisHotlineTapped,
    trackGuidanceOpened,
    trackSettingsOpened,
    trackConsentChanged,

    // Learn
    trackLearnContentViewed,
    trackLearnModuleStarted,
    trackCheckInStarted,
    trackCheckInCompleted,
    trackAssessmentStarted,
    trackAssessmentCompleted,
    trackPracticeStarted,
    trackPracticeCompleted,

    // Breathing

    // Onboarding
    trackOnboardingStarted,
    trackOnboardingStepCompleted,
    trackOnboardingCompleted,

    // Errors
  };
}

export default useAnalytics;
