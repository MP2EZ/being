/**
 * DEBUG-536 — the consent gate on the six restored feature-usage trackers.
 *
 * `trackEvent`'s `if (!posthog) return;` (useAnalytics.ts) IS the consent gate:
 * declining analytics consent means no `<PHProvider>` is mounted, so `usePostHog()`
 * returns null and every tracker no-ops. Nothing asserted that before this item, and
 * this item adds emit points across five feature areas.
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

  describe('consent WITHHELD — usePostHog() returns null', () => {
    beforeEach(() => {
      mockClient = null;
    });

    it('none of the six reaches PostHog', () => {
      invokeAll();
      expect(mockCapture).toHaveBeenCalledTimes(0);
    });
  });

  describe('consent GRANTED — a live client is mounted', () => {
    beforeEach(() => {
      mockClient = { capture: mockCapture };
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
