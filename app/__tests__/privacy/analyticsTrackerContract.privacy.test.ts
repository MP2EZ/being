/**
 * Tracker contract (INFRA-535, PR2).
 *
 * The item's #1 declared success metric: "100% of trackers have a green
 * contract-test assertion that their real payload passes validate() with zero
 * redactions."
 *
 * WHY THIS EXISTS. `trackEvent` calls `PHIFilter.validate` and captures ONLY when
 * it returns valid; on a block it logs and returns. Nothing throws. So a tracker
 * whose payload the filter rejects looks completely correct at review, emits
 * nothing forever, and reads in PostHog as "nobody did it" rather than as a
 * defect. That is how FEAT-137 closed Done. This suite makes that failure
 * mechanical instead of silent: it drives every tracker the hook actually returns
 * and asserts each one reaches the sink.
 *
 * It is also the instrument for the scan-surface tightening shipped alongside it.
 * Widening what the filter looks at can only be trusted if something proves the
 * widening did not start eating live trackers — a hand-picked pair of "named false
 * positives" is not that proof. This is.
 *
 * HOW IT CANNOT GO VACUOUS (DEBUG-390):
 *   - the key list is DERIVED from the live hook, so a new tracker appears here
 *     automatically;
 *   - a derived key with no hand-authored fixture FAILS rather than being skipped,
 *     so the suite cannot quietly shrink to the trackers someone remembered;
 *   - fixtures are hand-authored, never generated from the implementation;
 *   - the enumeration itself is asserted non-empty and at a pinned minimum size.
 */

const mockCapture = jest.fn();
jest.mock('posthog-react-native', () => ({
  usePostHog: () => ({ capture: (...args: unknown[]) => mockCapture(...args) }),
}));

import { renderHook } from '@testing-library/react-native';
import { useAnalytics } from '@/core/analytics/useAnalytics';
import { PHIFilter, AnalyticsEvents } from '@/core/analytics/PHIFilter';

/**
 * HAND-AUTHORED fixtures: tracker name -> the arguments a real call site passes.
 *
 * Deliberately not derived from the implementation. A fixture generated from the
 * code under test would agree with it by construction, including when both are
 * wrong.
 */
const FIXTURES: Readonly<Record<string, readonly unknown[]>> = {
  trackScreenView: ['HomeScreen'],
  // INFRA-542: real call shapes — these two gained emitters and
  // properties. A bucketed string, never a raw elapsed number.
  trackAppOpened: [true, 'cold_start'],
  trackAppBackgrounded: [42],
  trackCheckInStarted: [],
  trackCheckInCompleted: [5000],
  trackAssessmentStarted: [],
  trackAssessmentCompleted: [42000],
  trackPracticeStarted: [],
  trackPracticeCompleted: [300000],
  trackCrisisResourcesViewed: [],
  trackCrisisHotlineTapped: [],
  trackGuidanceOpened: [],
  trackSettingsOpened: [],
  trackConsentChanged: [],
  trackLearnContentViewed: ['module-1'],
  trackLearnModuleStarted: ['module-1'],
  trackLearnModuleCompleted: ['module-1', 900],
  trackBreathingExerciseStarted: [],
  trackBreathingExerciseCompleted: [180000],
  trackOnboardingStarted: [],
  trackOnboardingStepCompleted: [3],
  trackOnboardingCompleted: [],
  trackErrorOccurred: ['network_error'],
};

/**
 * `trackEvent` is the generic escape hatch: it takes an arbitrary event name and
 * arbitrary properties, so there is no "real payload" to pin. Every NAMED tracker
 * routes through it, which is what this suite actually covers. Excluded explicitly
 * rather than by omission, so the exclusion is reviewable.
 */
const EXCLUDED = new Set(['trackEvent']);

/** Pinned floor: 23 named trackers today. Growth fine, shrinkage red. */
const MIN_TRACKERS = 23;

describe('every useAnalytics tracker transmits (INFRA-535)', () => {
  const { result } = renderHook(() => useAnalytics());
  const allKeys = Object.keys(result.current).filter(
    (k) => typeof (result.current as Record<string, unknown>)[k] === 'function'
  );
  const trackerKeys = allKeys.filter((k) => !EXCLUDED.has(k));

  describe('the enumeration is real (anti-vacuity)', () => {
    it('derives a non-empty tracker list from the live hook', () => {
      expect(trackerKeys.length).toBeGreaterThanOrEqual(MIN_TRACKERS);
    });

    it('every derived tracker has a hand-authored fixture', () => {
      // A key without a fixture FAILS. It must not be silently skipped: that is
      // exactly how a new tracker would ship uncovered.
      const missing = trackerKeys.filter((k) => !(k in FIXTURES));
      expect(missing).toEqual([]);
    });

    it('every fixture corresponds to a real tracker (no dead fixtures)', () => {
      const orphaned = Object.keys(FIXTURES).filter((k) => !trackerKeys.includes(k));
      expect(orphaned).toEqual([]);
    });

    it('the excluded key really is on the hook', () => {
      for (const key of EXCLUDED) expect(allKeys).toContain(key);
    });
  });

  describe('each tracker reaches the sink with its real payload', () => {
    it.each(Object.keys(FIXTURES).map((k) => [k] as const))('%s', (name) => {
      mockCapture.mockClear();

      const fn = (result.current as Record<string, (...a: unknown[]) => void>)[name];
      expect(typeof fn).toBe('function');
      fn(...(FIXTURES[name] as unknown[]));

      // trackEvent captures ONLY when PHIFilter.validate passes, and swallows the
      // block otherwise. So "capture was called" IS the assertion that this
      // tracker's real payload survives the filter.
      expect(mockCapture).toHaveBeenCalledTimes(1);

      // Re-assert directly, for a failure message that names the reason rather
      // than just "expected 1 call, got 0".
      const [eventName, payload] = mockCapture.mock.calls[0] as [
        string,
        Record<string, unknown>,
      ];
      expect(PHIFilter.validate(eventName, payload)).toEqual({ valid: true });
    });
  });

  describe('the suite would notice if the filter started eating trackers', () => {
    it('a deliberately bad payload on a real event IS rejected', () => {
      // Proves the assertion above discriminates — if validate() accepted
      // everything, every tracker would pass for the wrong reason.
      expect(PHIFilter.validate(AnalyticsEvents.SCREEN_VIEWED, { screen_name: 'grief' }).valid).toBe(
        false
      );
      expect(PHIFilter.validate('definitely_not_whitelisted', {}).valid).toBe(false);
    });
  });

  describe('catalog constants with no tracker at all (recorded for INFRA-552)', () => {
    it('session_started and session_ended are whitelisted but unreachable from the hook', () => {
      // Neither has a tracker function, so the derived enumeration above cannot
      // see them and this suite cannot protect them. The catalog prune must handle
      // them by hand rather than assuming the contract test covers the catalog.
      expect(PHIFilter.isWhitelisted('session_started')).toBe(true);
      expect(PHIFilter.isWhitelisted('session_ended')).toBe(true);

      const emitters = trackerKeys.filter((k) => /session/i.test(k));
      expect(emitters).toEqual([]);
    });
  });
});
