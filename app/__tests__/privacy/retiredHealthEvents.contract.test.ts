/**
 * DEBUG-821 — the health-signal events PostHog no longer receives.
 *
 * Ruling B ("minimise", founder decision 2026-10-23). With Usage Analytics on, PostHog
 * used to learn — under the persistent installation distinct_id, with a GeoIP city —
 * that someone opened crisis resources, tapped a crisis line, started or finished a
 * wellness screening, opened hardship guidance, or viewed their PHQ-9/GAD-7 history.
 * Under WA MHMDA each of those is consumer health data on its own.
 *
 * This file is the single anchor for that removal. It pins all three layers, because
 * any one alone can be undone without the others noticing:
 *   1. the names are off the whitelist, so even a direct trackEvent is rejected;
 *   2. the trackers are no-ops, so the call sites in features/crisis/ and
 *      features/assessment/ (deliberately untouched) send nothing;
 *   3. trackScreenView drops the sensitive and screening-history screens, and the
 *      generic `App` bucket they used to collapse into is itself rejected.
 *
 * Every assertion that something is NOT sent sits beside a control proving the same
 * harness does send a live event (DEBUG-390).
 */

import { renderHook } from '@testing-library/react-native';
import { useAnalytics } from '@/core/analytics/useAnalytics';
import { PHIFilter, AnalyticsEvents, RETIRED_ANALYTICS_EVENTS } from '@/core/analytics/PHIFilter';
import { useConsentStore } from '@/core/stores/consentStore';

const mockCapture = jest.fn();
jest.mock('posthog-react-native', () => ({
  usePostHog: () => ({ capture: (...args: unknown[]) => mockCapture(...args) }),
}));

beforeEach(() => {
  mockCapture.mockClear();
  useConsentStore.setState({
    currentConsent: { preferences: { analyticsEnabled: true }, universalOptOut: false },
  } as unknown as Parameters<typeof useConsentStore.setState>[0]);
});

/** Hand-listed, so a rename or a quiet re-add cannot move this list with it. */
const RETIRED_NAMES = [
  'crisis_resources_viewed',
  'crisis_hotline_tapped',
  'assessment_started',
  'assessment_completed',
  'guidance_opened',
] as const;

/** The retired trackers, with the arguments their real call sites pass. */
const RETIRED_TRACKERS: ReadonlyArray<readonly [string, readonly unknown[]]> = [
  ['trackCrisisResourcesViewed', []],
  ['trackCrisisHotlineTapped', [true]],
  ['trackCrisisHotlineTapped', [false]],
  ['trackAssessmentStarted', []],
  ['trackAssessmentCompleted', [180000]],
  ['trackGuidanceOpened', []],
];

/** Screens whose view alone says "this person looked for support or took a screening". */
const SILENT_SCREENS = [
  'CrisisResourcesScreen',
  'EnhancedAssessmentFlow',
  'JournalScreen',
  'DomainGuidanceScreen',
  'InsightsScreen',
  'WellnessTrendsDetailScreen',
];

const hook = () => renderHook(() => useAnalytics()).result.current as unknown as Record<
  string,
  (...a: unknown[]) => void
>;

describe('DEBUG-821 — retired health events', () => {
  it('the exported anchor and this hand list agree', () => {
    expect([...RETIRED_ANALYTICS_EVENTS].sort()).toEqual([...RETIRED_NAMES].sort());
  });

  describe('layer 1 — the names are off the whitelist', () => {
    it.each(RETIRED_NAMES)('%s is not whitelisted and does not validate', (name) => {
      expect(PHIFilter.isWhitelisted(name)).toBe(false);
      expect(Object.values(AnalyticsEvents)).not.toContain(name);
      expect(PHIFilter.validate(name, {}).valid).toBe(false);
    });

    it('a direct trackEvent of a retired name captures nothing', () => {
      const t = hook();
      for (const name of RETIRED_NAMES) t.trackEvent(name);
      expect(mockCapture).not.toHaveBeenCalled();
    });
  });

  describe('layer 2 — the trackers are no-ops', () => {
    it.each(RETIRED_TRACKERS)('%s(%p) captures nothing', (name, args) => {
      const fn = hook()[name];
      expect(typeof fn).toBe('function');
      fn(...(args as unknown[]));
      expect(mockCapture).not.toHaveBeenCalled();
    });
  });

  describe('layer 3 — sensitive and screening-history screens send nothing', () => {
    it.each(SILENT_SCREENS)('trackScreenView(%s) captures nothing', (screen) => {
      hook().trackScreenView(screen);
      expect(mockCapture).not.toHaveBeenCalled();
    });

    it('the generic bucket they used to collapse into is rejected', () => {
      expect(PHIFilter.validate('screen_viewed', { screen_name: 'App' }).valid).toBe(false);
      // The rule is that one value, not screen_viewed itself.
      expect(PHIFilter.validate('screen_viewed', { screen_name: 'HomeScreen' }).valid).toBe(true);
    });
  });

  describe('control — the same harness does send a live event', () => {
    it('trackSettingsOpened and a non-sensitive screen view both capture, with GeoIP off', () => {
      const t = hook();
      t.trackSettingsOpened();
      t.trackScreenView('HomeScreen');
      expect(mockCapture).toHaveBeenCalledTimes(2);
      expect(mockCapture).toHaveBeenNthCalledWith(1, 'settings_opened', { $geoip_disable: true });
      expect(mockCapture).toHaveBeenNthCalledWith(2, 'screen_viewed', {
        screen_name: 'HomeScreen',
        $geoip_disable: true,
      });
    });
  });
});
