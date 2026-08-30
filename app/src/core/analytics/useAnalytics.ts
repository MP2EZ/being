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
import { PHIFilter, AnalyticsEvents } from './PHIFilter';
import { logAnalytics } from '@/core/services/logging';
import { coarsenScreenNameForAnalytics } from '@/core/utils/sensitiveScreens';
import type { SinceLastActiveBucket } from './appLifecycleTelemetry';

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

  /**
   * Track an event with PHI validation
   * Only whitelisted events with safe data will be transmitted
   */
  const trackEvent = useCallback(
    (eventName: string, properties?: Record<string, string | number | boolean>) => {
      // Skip if PostHog not available (no consent or not configured)
      if (!posthog) {
        return;
      }

      const eventData = properties || {};
      const validation = PHIFilter.validate(eventName, eventData);

      if (validation.valid) {
        posthog.capture(eventName, eventData);
        logAnalytics(`Event tracked: ${eventName}`, { category: 'tracking' });
      } else {
        // PHIFilter already logs the block reason
        logAnalytics(`Event blocked: ${eventName} - ${validation.reason}`, {
          category: 'blocked',
        });
      }
    },
    [posthog]
  );

  /**
   * Track a screen view (convenience method)
   */
  const trackScreenView = useCallback(
    (screenName: string) => {
      // Coarsen sensitive screen names (e.g. CrisisResourcesScreen,
      // AssessmentScreen) to a generic bucket BEFORE the event reaches
      // PHIFilter/PostHog, so a screen-view cannot disclose a wellness-
      // sensitive context. Non-sensitive names pass through unchanged so
      // per-screen funnels survive (DEBUG-239). Mirrors the Sentry path,
      // which uses the same shared sensitive-route list.
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
   * Track feature usage
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

  const trackAssessmentStarted = useCallback(() => {
    trackEvent(AnalyticsEvents.ASSESSMENT_STARTED);
  }, [trackEvent]);

  const trackAssessmentCompleted = useCallback(
    (durationMs?: number) => {
      trackEvent(AnalyticsEvents.ASSESSMENT_COMPLETED, {
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

  const trackCrisisResourcesViewed = useCallback(() => {
    trackEvent(AnalyticsEvents.CRISIS_RESOURCES_VIEWED);
  }, [trackEvent]);

  const trackCrisisHotlineTapped = useCallback(() => {
    trackEvent(AnalyticsEvents.CRISIS_HOTLINE_TAPPED);
  }, [trackEvent]);

  /**
   * Domain guidance opened from its Home entry point (FEAT-457).
   *
   * 🔴 TAKES NO ARGUMENTS, DELIBERATELY. Do not add a `domain` parameter.
   *
   * The hardship domain ("this user opened grief") IS the wellness inference, and
   * `docs/architecture/analytics-architecture.md` publishes "What We NEVER
   * Collect: … Any mental health data." Shipping it would make that published
   * promise false — an FTC Act §5 exposure, not a disclosure gap you can close by
   * editing the policy — and would trip the DPIA's own material-change trigger
   * plus new App Store mental-health labels.
   *
   * The house pattern this follows: track ACCESS, never CONTENT.
   * `assessment_started` carries no score; `crisis_resources_viewed` carries no
   * contact details; this carries no domain.
   */
  const trackGuidanceOpened = useCallback(() => {
    trackEvent(AnalyticsEvents.GUIDANCE_OPENED);
  }, [trackEvent]);

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

  const trackLearnModuleCompleted = useCallback(
    (moduleId?: string, durationMs?: number) => {
      trackEvent(AnalyticsEvents.LEARN_MODULE_COMPLETED, {
        ...(moduleId !== undefined && { module_id: moduleId }),
        ...(durationMs !== undefined && { duration_ms: durationMs }),
      });
    },
    [trackEvent]
  );

  /**
   * Track breathing exercise lifecycle
   */
  const trackBreathingExerciseStarted = useCallback(() => {
    trackEvent(AnalyticsEvents.BREATHING_EXERCISE_STARTED);
  }, [trackEvent]);

  const trackBreathingExerciseCompleted = useCallback(
    (durationMs?: number) => {
      trackEvent(AnalyticsEvents.BREATHING_EXERCISE_COMPLETED, {
        ...(durationMs !== undefined && { duration_ms: durationMs }),
      });
    },
    [trackEvent]
  );

  /**
   * Track onboarding flow
   */
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

  /**
   * Track errors (sanitized - no PHI in error messages)
   */
  const trackErrorOccurred = useCallback(
    (errorType: string) => {
      trackEvent(AnalyticsEvents.ERROR_OCCURRED, { error_type: errorType });
    },
    [trackEvent]
  );

  return {
    // Core methods
    trackEvent,
    trackScreenView,

    // App lifecycle
    trackAppOpened,
    trackAppBackgrounded,

    // Features
    trackCheckInStarted,
    trackCheckInCompleted,
    trackAssessmentStarted,
    trackAssessmentCompleted,
    trackPracticeStarted,
    trackPracticeCompleted,
    trackCrisisResourcesViewed,
    trackCrisisHotlineTapped,
    trackGuidanceOpened,
    trackSettingsOpened,
    trackConsentChanged,

    // Learn
    trackLearnContentViewed,
    trackLearnModuleStarted,
    trackLearnModuleCompleted,

    // Breathing
    trackBreathingExerciseStarted,
    trackBreathingExerciseCompleted,

    // Onboarding
    trackOnboardingStarted,
    trackOnboardingStepCompleted,
    trackOnboardingCompleted,

    // Errors
    trackErrorOccurred,
  };
}

export default useAnalytics;
