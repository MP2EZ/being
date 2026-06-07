/**
 * SENSITIVE-SCREEN COARSENING — UNIT TESTS (DEBUG-239)
 *
 * The shared sensitive-route/screen-name logic used by BOTH telemetry sinks
 * (PostHog product analytics + Sentry error reporting) so they cannot drift.
 */

import {
  isSensitiveRoute,
  coarsenScreenNameForAnalytics,
  sanitizeScreenName,
  GENERIC_SCREEN_BUCKET,
} from '@/core/utils/sensitiveScreens';

describe('sensitiveScreens (DEBUG-239)', () => {
  describe('isSensitiveRoute', () => {
    it.each([
      'CrisisResourcesScreen',
      'AssessmentScreen',
      'PHQ9Screen',
      'GAD7Screen',
      'JournalScreen',
      'ReflectionScreen',
      'EmergencyContactScreen',
      'SafetyPlanScreen',
      'InterventionScreen',
    ])('flags %s as sensitive', (name) => {
      expect(isSensitiveRoute(name)).toBe(true);
    });

    it.each([
      'HomeScreen',
      'SettingsScreen',
      'LearnScreen',
      'WellnessTrendsDetailScreen',
      'ProfileScreen',
    ])('does not flag %s', (name) => {
      expect(isSensitiveRoute(name)).toBe(false);
    });
  });

  describe('coarsenScreenNameForAnalytics', () => {
    it('coarsens sensitive screen names to the generic bucket', () => {
      expect(coarsenScreenNameForAnalytics('CrisisResourcesScreen')).toBe(GENERIC_SCREEN_BUCKET);
      expect(coarsenScreenNameForAnalytics('AssessmentScreen')).toBe(GENERIC_SCREEN_BUCKET);
      // Previously dropped entirely by PHIFilter (the 'reflection' keyword);
      // now bucketed so the view still emits, just without the sensitive name.
      expect(coarsenScreenNameForAnalytics('ReflectionScreen')).toBe(GENERIC_SCREEN_BUCKET);
    });

    it('passes non-sensitive screen names through unchanged (preserves funnels)', () => {
      expect(coarsenScreenNameForAnalytics('HomeScreen')).toBe('HomeScreen');
      expect(coarsenScreenNameForAnalytics('WellnessTrendsDetailScreen')).toBe(
        'WellnessTrendsDetailScreen'
      );
      expect(coarsenScreenNameForAnalytics('SettingsScreen')).toBe('SettingsScreen');
    });
  });

  describe('sanitizeScreenName (Sentry-side; preserves prior ExternalErrorReporter behavior)', () => {
    it('returns undefined for empty input', () => {
      expect(sanitizeScreenName(undefined)).toBeUndefined();
      expect(sanitizeScreenName('')).toBeUndefined();
    });

    it('strips the Screen suffix for allowlisted generic screens', () => {
      expect(sanitizeScreenName('HomeScreen')).toBe('Home');
      expect(sanitizeScreenName('SettingsScreen')).toBe('Settings');
    });

    it('buckets non-allowlisted / sensitive screens to the generic bucket', () => {
      expect(sanitizeScreenName('CrisisResourcesScreen')).toBe(GENERIC_SCREEN_BUCKET);
      expect(sanitizeScreenName('WellnessTrendsDetailScreen')).toBe(GENERIC_SCREEN_BUCKET);
    });
  });
});
