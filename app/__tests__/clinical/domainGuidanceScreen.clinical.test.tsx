/**
 * FEAT-433 slice 3a — the guidance gate's first production consumer.
 *
 * WHY THIS SITS IN `__tests__/clinical/` AND NOT BESIDE THE COMPONENT.
 * `check-ci-test-coverage.js` hard-fails any suite matching no CI `--testPathPattern`
 * that is absent from `ci-uncovered-tests.json`, which has zero guidance entries. A
 * suite under `src/features/guidance/__tests__/` matches nothing and would red the
 * `Safety + privacy gates` job. `test:clinical` is `--testPathPattern=clinical`, a
 * plain path substring, so this location is gated. Slice 2's suite sits here too.
 *
 * The filename deliberately avoids the substring `crisis`: `test:crisis-quick` is
 * `--testPathPattern="[Cc]risis" --testTimeout=5000`, and an RTL render plus
 * `waitFor` is exactly the shape that flakes under a 5s bound.
 *
 * These are safety assertions, not presentation ones. What each pins:
 *   · a suppressed reader sees NO domain content and is routed out, exactly once
 *   · a not-yet-hydrated reader sees NO domain content either
 *   · the escape clause survives to the screen in authored order, visibly distinct
 */

import React from 'react';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';

import type { GAD7Result, PHQ9Result } from '@/features/assessment/types';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({ params: { domain: 'conflict' } }),
}));

/**
 * A hand-rolled assessment-store mock carrying the `persist` surface the hook reads.
 *
 * Deliberately NOT a jest.mock of the real store: the real one pulls SecureStore and
 * an AES adapter into the test. But the REAL `useGuidanceGate` and the REAL
 * `decideGuidanceAccess` run against it, so every threshold below is decided by the
 * shipped gate rather than by a stub of it.
 *
 * Everything mutable lives on one `mock`-prefixed holder because a `jest.mock` factory
 * is hoisted above the file and may not close over ordinary out-of-scope names.
 */
const mockStore = {
  phq9: null as PHQ9Result | null,
  gad7: null as GAD7Result | null,
  hydrated: true,
  hydrationCallbacks: [] as Array<() => void>,
};

jest.mock('@/features/assessment/stores/assessmentStore', () => {
  const state = {
    get completedAssessments() {
      return [mockStore.phq9, mockStore.gad7].filter(Boolean);
    },
    getLastResult: (type: 'phq9' | 'gad7') =>
      type === 'phq9' ? mockStore.phq9 : mockStore.gad7,
  };

  const useAssessmentStore = Object.assign(
    (selector: (s: typeof state) => unknown) => selector(state),
    {
      getState: () => state,
      persist: {
        hasHydrated: () => mockStore.hydrated,
        onFinishHydration: (cb: () => void) => {
          mockStore.hydrationCallbacks.push(cb);
          return () => {
            mockStore.hydrationCallbacks = mockStore.hydrationCallbacks.filter((c) => c !== cb);
          };
        },
      },
    },
  );

  return { useAssessmentStore };
});

// Imported AFTER the mocks so the hook binds to them.
import DomainGuidanceScreen from '@/features/guidance/screens/DomainGuidanceScreen';
import { clearGuidanceContentCache } from '@/core/services/guidanceContent';

const phq9 = (totalScore: number, suicidalIdeation = false): PHQ9Result => ({
  totalScore,
  severity: 'moderate',
  isCrisis: totalScore >= 20,
  suicidalIdeation,
  completedAt: 1_700_000_000_000,
  answers: [],
});

const gad7 = (totalScore: number): GAD7Result => ({
  totalScore,
  severity: 'moderate',
  isCrisis: totalScore >= 15,
  completedAt: 1_700_000_000_000,
  answers: [],
});

beforeEach(() => {
  mockNavigate.mockClear();
  mockStore.phq9 = null;
  mockStore.gad7 = null;
  mockStore.hydrated = true;
  mockStore.hydrationCallbacks = [];
  clearGuidanceContentCache();
});

describe('DomainGuidanceScreen — suppressed readers see no philosophy', () => {
  // Each row is a distinct route into suppression. Q9 is separated from the score
  // floor on purpose: it suppresses REGARDLESS of total, so a low-scoring reader
  // answering it affirmatively must still be routed.
  const SUPPRESSING = [
    ['PHQ-9 Q9 > 0 at a low total', () => { mockStore.phq9 = phq9(3, true); mockStore.gad7 = gad7(1); }],
    ['PHQ-9 at the severe floor', () => { mockStore.phq9 = phq9(20); mockStore.gad7 = gad7(1); }],
    ['GAD-7 at the severe floor', () => { mockStore.phq9 = phq9(1); mockStore.gad7 = gad7(15); }],
  ] as const;

  for (const [label, seed] of SUPPRESSING) {
    it(`renders zero domain content and offers a route out: ${label}`, async () => {
      seed();
      const { queryByTestId, getByTestId } = render(<DomainGuidanceScreen />);

      await waitFor(() => expect(getByTestId('guidance-suppression-notice')).toBeTruthy());

      // The invariant, stated three ways so a partial regression cannot slip past.
      expect(queryByTestId('guidance-content')).toBeNull();
      expect(queryByTestId('guidance-tier0')).toBeNull();
      expect(queryByTestId('guidance-tier1')).toBeNull();

      // The route out is OFFERED, not taken for them.
      expect(getByTestId('guidance-open-crisis-resources')).toBeTruthy();
    });
  }

  /**
   * 🔴 THE HAND-OFF IS USER-INITIATED. `crisis` ruling, FEAT-433.
   *
   * An earlier draft auto-pushed CrisisResources once per mount. It was removed
   * because the trigger is a STORED result with no staleness window: a Q9 > 0 answer
   * from months ago would force-push a crisis screen on every mount of this route,
   * forever — which is the trust erosion the gate's own docblock warns about. Every
   * other CrisisResources navigation in this app is a user tap; this one is too.
   *
   * This assertion is what stops a future reader reinstating the auto-push as an
   * apparent safety improvement.
   */
  it('never navigates on its own — the reader is offered the route, not moved', async () => {
    mockStore.phq9 = phq9(24);
    mockStore.gad7 = gad7(2);
    const { getByTestId, rerender } = render(<DomainGuidanceScreen />);

    await waitFor(() => expect(getByTestId('guidance-suppression-notice')).toBeTruthy());
    expect(mockNavigate).not.toHaveBeenCalled();

    rerender(<DomainGuidanceScreen />);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('routes to crisis resources when the reader chooses it', async () => {
    mockStore.phq9 = phq9(24);
    mockStore.gad7 = gad7(2);
    const { getByTestId } = render(<DomainGuidanceScreen />);

    await waitFor(() => expect(getByTestId('guidance-open-crisis-resources')).toBeTruthy());

    fireEvent.press(getByTestId('guidance-open-crisis-resources'));
    expect(mockNavigate).toHaveBeenCalledWith('CrisisResources', {
      source: 'guidance_gate',
    });
  });
});

describe('DomainGuidanceScreen — the hydration window', () => {
  /**
   * The false negative this slice exists to avoid.
   *
   * The store rehydrates asynchronously from encrypted storage. Before it lands,
   * `getLastResult` returns null on both axes and the gate answers `gentle` — which
   * permits Tier 0/1. A suppressed reader opening guidance during that window would
   * be shown domain content for the whole mount if the decision were snapshotted.
   */
  it('renders no content before the store has hydrated', () => {
    mockStore.hydrated = false;
    mockStore.phq9 = phq9(24);
    const { queryByTestId, getByTestId } = render(<DomainGuidanceScreen />);

    expect(getByTestId('guidance-pending')).toBeTruthy();
    expect(queryByTestId('guidance-content')).toBeNull();
    expect(queryByTestId('guidance-tier0')).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('tears down to the suppression notice when hydration reveals a crisis reading', async () => {
    mockStore.hydrated = false;
    mockStore.phq9 = phq9(24);
    mockStore.gad7 = gad7(2);
    const { getByTestId, queryByTestId } = render(<DomainGuidanceScreen />);

    expect(getByTestId('guidance-pending')).toBeTruthy();

    // Hydration lands. A snapshotted decision would stay `gentle` and keep showing
    // Tier 0/1; a subscribed one flips to suppressed.
    act(() => {
      mockStore.hydrated = true;
      mockStore.hydrationCallbacks.forEach((cb) => cb());
    });

    await waitFor(() => expect(getByTestId('guidance-suppression-notice')).toBeTruthy());
    expect(queryByTestId('guidance-tier0')).toBeNull();
    // Still no automatic navigation — the tear-down is to the notice, which offers
    // the route rather than taking it.
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(getByTestId('guidance-open-crisis-resources')).toBeTruthy();
  });
});

describe('DomainGuidanceScreen — the gentle band', () => {
  it('renders Tier 0 and Tier 1, and nothing from Tier 2/3', async () => {
    mockStore.phq9 = phq9(17); // 15-19: gentle band
    mockStore.gad7 = gad7(2);
    const { getByTestId, queryByTestId, queryByText } = render(<DomainGuidanceScreen />);

    await waitFor(() => expect(getByTestId('guidance-content')).toBeTruthy());
    expect(getByTestId('guidance-tier0')).toBeTruthy();
    expect(getByTestId('guidance-tier1')).toBeTruthy();

    // Tier 2/3 content must not leak into the tree at any access level in 3a.
    expect(queryByText(/Marcus Aurelius/i)).toBeNull();
    expect(queryByTestId('guidance-tier2')).toBeNull();
    expect(queryByTestId('guidance-tier3')).toBeNull();
  });

  /**
   * 🔴 THE ORDERING GUARANTEE, AT THE PRESENTATION LAYER.
   *
   * Slice 2 pins `validation[0]` as `support` and `validation[1]` as the abuse/safety
   * escape clause (`warning`) in the JSON. Nothing pinned that the screen renders them
   * in that order or distinguishes them visually — and a warning that renders
   * identically to a supportive note is a guarantee that holds in the content and
   * evaporates on screen. The gentle-band cohort sees Tier 0/1 ONLY, so this is the
   * only place they encounter the clause at all.
   */
  it('renders the safety escape clause in authored order, visually distinct', async () => {
    mockStore.phq9 = phq9(17);
    mockStore.gad7 = gad7(2);
    const { getByTestId, UNSAFE_root } = render(<DomainGuidanceScreen />);

    await waitFor(() => expect(getByTestId('guidance-tier0')).toBeTruthy());

    const support = getByTestId('guidance-tier0-callout-support');
    const warning = getByTestId('guidance-tier0-callout-warning');
    expect(support).toBeTruthy();
    expect(warning).toBeTruthy();

    // Distinct containers, not merely distinct emoji (the icon is authored data, not
    // a styling contract).
    const flat = (s: unknown) => JSON.stringify(s);
    expect(flat(support.props.style)).not.toEqual(flat(warning.props.style));

    // Authored order: support precedes warning in the rendered tree. Filter to HOST
    // nodes — findAll returns the composite element and its host output for each
    // match, so an unfiltered walk reports every callout twice.
    const rendered = UNSAFE_root.findAll(
      (n) =>
        typeof n.type === 'string' &&
        typeof n.props?.testID === 'string' &&
        n.props.testID.startsWith('guidance-tier0-callout-'),
    );
    expect(rendered.map((n) => n.props.testID)).toEqual([
      'guidance-tier0-callout-support',
      'guidance-tier0-callout-warning',
    ]);
  });
});

/**
 * 🔴 A DELIBERATE TRIPWIRE FOR FEAT-457 — this test is DESIGNED to go red there.
 *
 * `guidanceGate.ts` has no GAD-7 gentle band: GAD-7 is used only for suppression at
 * ≥15, while PHQ-9 gets a 15-19 band. So GAD-7 10-14 resolves to `full`.
 *
 * That is INERT in slice 3a, because `full` and `gentle` both render Tier 0/1 and
 * nothing else — no reader sees anything the gate would have withheld. It stops being
 * inert the moment Tier 2/3 render, at which point a GAD-7 12 reader gets the complete
 * ladder while a PHQ-9 17 reader does not.
 *
 * Asserting the two levels are IDENTICAL is therefore not a tautology to be deleted:
 * it is what makes that gap surface as a failing build in FEAT-457 rather than
 * shipping silently. FEAT-457 must replace it with a real divergence assertion, and
 * resolve the GAD-7 floor (a NEW safety threshold, needing crisis + philosopher
 * sign-off) before it does.
 */
describe('FEAT-457 tripwire — full and gentle render an identical tier set', () => {
  const tierSet = async () => {
    const { getByTestId, queryByTestId } = render(<DomainGuidanceScreen />);
    await waitFor(() => expect(getByTestId('guidance-content')).toBeTruthy());
    return {
      tier0: queryByTestId('guidance-tier0') !== null,
      tier1: queryByTestId('guidance-tier1') !== null,
      tier2: queryByTestId('guidance-tier2') !== null,
      tier3: queryByTestId('guidance-tier3') !== null,
    };
  };

  it('GAD-7 in the unbanded 10-14 range sees exactly what the PHQ-9 gentle band sees', async () => {
    mockStore.phq9 = phq9(2);
    mockStore.gad7 = gad7(12); // resolves to `full` — no GAD-7 gentle band exists
    const full = await tierSet();

    mockStore.phq9 = phq9(17); // resolves to `gentle`
    mockStore.gad7 = gad7(2);
    clearGuidanceContentCache();
    const gentle = await tierSet();

    expect(full).toEqual(gentle);
    expect(full).toEqual({ tier0: true, tier1: true, tier2: false, tier3: false });
  });
});
