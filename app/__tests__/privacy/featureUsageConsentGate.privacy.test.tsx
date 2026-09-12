/**
 * DEBUG-536 — the consent gate on the six restored feature-usage trackers.
 *
 * `trackEvent` (useAnalytics.ts) is the consent gate every tracker funnels through.
 * Nothing asserted that before this item, and this item adds emit points across five
 * feature areas.
 *
 * MECHANISM CORRECTED BY DEBUG-559. This file was authored when the gate was
 * `if (!posthog) return;` alone, on the reasoning that declining consent meant no
 * `<PHProvider>` was mounted so `usePostHog()` returned null. That equivalence was a
 * side effect of a defect: withholding the provider swapped the element type above
 * `SafeAreaProvider` and remounted every 988 affordance in the app on a consent tap.
 * With that fixed the provider is always mounted, a client exists from launch, and
 * client presence is no longer a consent signal — so the halves below set the CONSENT
 * STORE, which is what `trackEvent` now reads. The suite's shape and intent are
 * unchanged. The "client present but consent denied" axis this correction opens is
 * pinned separately in `src/core/analytics/__tests__/useAnalytics.consentGate.privacy.test.tsx`.
 *
 * The negative half alone would be worthless. A tracker that is broken, misnamed, or
 * never reached produces the identical "zero captures" reading as a tracker correctly
 * suppressed by the gate. So this suite is deliberately TWO halves over the SAME
 * hand-listed six and the SAME payloads: consent withheld must capture nothing,
 * consent granted must capture all six. Only the pair distinguishes "the gate held"
 * from "the code never ran" (DEBUG-390).
 *
 * The six are hand-listed rather than derived from the hook. Deriving would silently
 * follow the hook if a tracker were renamed or dropped; the point here is to pin
 * exactly the six this item restored.
 */

import { renderHook } from '@testing-library/react-native';
import { useAnalytics } from '@/core/analytics';
import { useConsentStore } from '@/core/stores/consentStore';

/** DEBUG-559: trackEvent reads the consent store, not the client's presence. */
const setAnalyticsConsent = (analyticsEnabled: boolean): void => {
  useConsentStore.setState({
    currentConsent: { preferences: { analyticsEnabled }, universalOptOut: false },
  } as unknown as Parameters<typeof useConsentStore.setState>[0]);
};

const mockCapture = jest.fn();
let mockClient: { capture: jest.Mock } | null = null;

jest.mock('posthog-react-native', () => ({
  usePostHog: () => mockClient,
}));

/**
 * The six restored trackers and the arguments their real call sites pass. Kept
 * in step with `analyticsTrackerContract.privacy.test.ts`'s FIXTURES, but written
 * out separately on purpose — a shared constant would let one edit move both halves
 * of a control and its own check.
 */
const RESTORED: ReadonlyArray<readonly [string, readonly unknown[]]> = [
  ['trackCheckInStarted', []],
  ['trackCheckInCompleted', [420000]],
  ['trackAssessmentStarted', []],
  ['trackAssessmentCompleted', [180000]],
  ['trackPracticeStarted', []],
  ['trackPracticeCompleted', [300000]],
];

const invokeAll = (): void => {
  const { result } = renderHook(() => useAnalytics());
  for (const [name, args] of RESTORED) {
    const fn = (result.current as Record<string, (...a: unknown[]) => void>)[name];
    expect(typeof fn).toBe('function');
    fn(...(args as unknown[]));
  }
};

describe('DEBUG-536 feature-usage trackers respect the analytics consent gate', () => {
  beforeEach(() => {
    mockCapture.mockClear();
  });

  it('pins exactly the six trackers this item restored', () => {
    // Anti-vacuity: an empty or truncated list makes both halves below pass over
    // nothing, in exactly the same way.
    expect(RESTORED).toHaveLength(6);
  });

  describe('consent WITHHELD — declined in the consent store', () => {
    beforeEach(() => {
      mockClient = null;
      setAnalyticsConsent(false);
    });

    it('none of the six reaches PostHog', () => {
      invokeAll();
      expect(mockCapture).toHaveBeenCalledTimes(0);
    });
  });

  describe('consent GRANTED — granted in the store, live client mounted', () => {
    beforeEach(() => {
      mockClient = { capture: mockCapture };
      setAnalyticsConsent(true);
    });

    it('all six reach PostHog, which is what makes the suppression above meaningful', () => {
      invokeAll();
      expect(mockCapture).toHaveBeenCalledTimes(6);
    });

    it('each captured event carries its restored name and nothing self-disclosing', () => {
      invokeAll();
      const captured = mockCapture.mock.calls.map(([name]) => name as string);
      expect(captured).toEqual([
        'check_in_started',
        'check_in_completed',
        'assessment_started',
        'assessment_completed',
        'practice_started',
        'practice_completed',
      ]);

      // ACCESS, never CONTENT. The only properties any of the six may carry are a
      // duration — no score, no instrument, no severity, no practice identity, no
      // free text.
      const allowed = new Set(['duration_ms']);
      for (const [, props] of mockCapture.mock.calls) {
        for (const key of Object.keys((props ?? {}) as Record<string, unknown>)) {
          expect(allowed.has(key)).toBe(true);
        }
      }
    });
  });
});
