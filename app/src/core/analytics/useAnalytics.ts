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
      trackEvent(AnalyticsEvents.SCREEN_VIEWED, { screen_name: screenName });
    },
    [trackEvent]
  );

  /**
   * Track app lifecycle events
   */
  const trackAppOpened = useCallback(() => {
    trackEvent(AnalyticsEvents.APP_OPENED);
  }, [trackEvent]);

  const trackAppBackgrounded = useCallback(() => {
    trackEvent(AnalyticsEvents.APP_BACKGROUNDED);
  }, [trackEvent]);

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
    trackSettingsOpened,
    trackConsentChanged,
    trackLearnContentViewed,
  };
}

export default useAnalytics;
