/**
 * RootCrisisButton — MAINT-290
 *
 * Deterministic guard for the single persistent crisis-button overlay. This is
 * the "988 access can never regress" pin that runs in CI (the Maestro
 * crisis-button-reachability flow is local-only). It asserts the route→behavior
 * contract that the on-device flow cannot cheaply cover for every route:
 *   - suppression on routes that own their own crisis affordance,
 *   - immersive mode during meditative practice flows/timers,
 *   - standard mode everywhere else,
 *   - navigation via the root ref (guarded on isReady).
 */
import React from 'react';
import { render } from '@testing-library/react-native';

// Capture the props handed to the (heavy, animation-driven) CollapsibleCrisisButton
// without mounting it for real.
const receivedProps: Array<Record<string, any>> = [];
jest.mock('../CollapsibleCrisisButton', () => {
  const ReactActual = require('react');
  const { Text } = require('react-native');
  const Stub = (props: any) => {
    receivedProps.push(props);
    return ReactActual.createElement(Text, { testID: props.testID }, `mode:${props.mode}`);
  };
  return { __esModule: true, CollapsibleCrisisButton: Stub, default: Stub };
});

const mockNavigate = jest.fn();
let mockReady = true;
// DEBUG-341: the not-ready branch now dials through openCrisisUrl, so it must be
// mocked here or the tests would hit the real Linking/Alert path.
jest.mock('@/features/crisis/utils/openCrisisUrl', () => ({
  openCrisisUrl: jest.fn(),
}));

jest.mock('@/core/navigation/navigationRef', () => ({
  navigationRef: {
    isReady: () => mockReady,
    navigate: (...args: any[]) => mockNavigate(...args),
  },
  getActiveRootRouteName: jest.fn(),
}));

import {
  RootCrisisButton,
  ROOT_CRISIS_BUTTON_TEST_ID,
  SUPPRESSED_ROUTES,
  IMMERSIVE_ROUTES,
} from '../RootCrisisButton';
import { openCrisisUrl } from '@/features/crisis/utils/openCrisisUrl';

const mockOpenCrisisUrl = openCrisisUrl as jest.MockedFunction<typeof openCrisisUrl>;

/**
 * FEAT-417 — WHY THIS FILE'S ROUTE LISTS WERE REWORKED.
 *
 * Until FEAT-417 this suite iterated three HARDCODED arrays (`SUPPRESSED`,
 * `IMMERSIVE`, `STANDARD`) that were independent copies of the source Sets,
 * which were not exported at all. The consequence, traced while planning the
 * `ReConsent` route: adding a brand-new route name to `SUPPRESSED_ROUTES` —
 * i.e. silently deleting the 988 affordance from a screen — failed **zero**
 * tests. Removals were caught (the route would start rendering and the mode
 * assertion would fail); additions were caught only if the route happened to
 * appear in one of the other two copies. The actual regression shape was
 * uncovered.
 *
 * Four assertion classes now, because no single one of them is sufficient:
 *
 *   (A) DERIVED behavioural coverage — `it.each` over the real Sets. Proves
 *       behaviour matches classification and can never go stale. It CANNOT
 *       catch a bad classification: on its own it asserts only that the code
 *       does what the code says.
 *   (B) LITERAL MEMBERSHIP SNAPSHOT — a change-detector. Not a tautology,
 *       because the right-hand side is written by a human: any edit to a source
 *       Set fails it, so growing a safety allowlist costs a deliberate test
 *       edit a reviewer sees. It is a speed bump, and it is meant to be.
 *   (C) NEGATIVE ALLOWLIST — `MUST_RENDER_STANDARD`, hardcoded ON PURPOSE.
 *       (B) will eventually be re-baselined by someone making CI green; this is
 *       what still stops them if what they added was a route that must keep the
 *       overlay.
 *   (D) FALSIFIER — a derived matcher that silently matches nothing looks
 *       exactly like a passing one (DEBUG-390). Proves the Sets are non-empty
 *       and the classes disjoint before any derived case is trusted.
 *
 * 🚫 Do NOT derive `MUST_RENDER_STANDARD` from the source. Deriving it is what
 * turns (C) back into a tautology.
 */

/**
 * (C) Routes that MUST keep the root crisis overlay, in `standard` mode.
 *
 * Hardcoded deliberately. Each entry is a screen where losing 988 access would
 * be a real regression, and the per-route reasoning is why they are named
 * individually rather than swept up by a derived list:
 *
 *   · ReConsent      — FEAT-417 / founder decision D1. The root overlay is this
 *                      screen's ONLY 988 affordance: it owns no crisis section,
 *                      deliberately, so that it does not end up with two
 *                      differently-labelled Call-988 controls the way
 *                      CombinedLegalGateScreen would if copied here.
 *   · PracticeLibrary — FEAT-293. A browsable LISTING surface, not a practice
 *                      the user is immersed in. Unknown routes fall through to
 *                      `standard`, which is the fail-safe direction, but "safe
 *                      by accident" is not a contract.
 *   · VoiceReflection — FEAT-283. Crisis text may be on screen here, so the
 *                      always-available affordance matters most. Also pinned
 *                      end-to-end by `.maestro/journal-crisis-scan.yaml`.
 *
 * The remaining entries are the former `STANDARD` array, folded in — its
 * standalone `it.each` is gone because these cases assert strictly more (not
 * suppressed, AND renders, AND `standard` mode).
 */
const MUST_RENDER_STANDARD = [
  'ReConsent',
  'PracticeLibrary',
  'VoiceReflection',
  'Main',
  'Onboarding',
  'ModuleDetail',
  'ClassicalLibrary',
  'PassageReader',
  'WellnessTrendsDetail',
  'Subscription',
  'SubscriptionStatus',
] as const;

describe('RootCrisisButton (MAINT-290 single root mount)', () => {
  beforeEach(() => {
    receivedProps.length = 0;
    mockNavigate.mockClear();
    mockReady = true;
  });

  // ── (D) FALSIFIER — run these before trusting any derived case below ───────
  describe('the derived route sets are usable as test inputs (DEBUG-390)', () => {
    it('are non-empty, so the derived it.each blocks are not vacuous', () => {
      expect(SUPPRESSED_ROUTES.size).toBeGreaterThan(0);
      expect(IMMERSIVE_ROUTES.size).toBeGreaterThan(0);
    });

    it('are disjoint from each other and from MUST_RENDER_STANDARD', () => {
      for (const route of SUPPRESSED_ROUTES) {
        expect(IMMERSIVE_ROUTES.has(route)).toBe(false);
      }
      for (const route of MUST_RENDER_STANDARD) {
        expect(SUPPRESSED_ROUTES.has(route)).toBe(false);
        expect(IMMERSIVE_ROUTES.has(route)).toBe(false);
      }
    });
  });

  // ── (B) LITERAL MEMBERSHIP SNAPSHOT — the change-detector ──────────────────
  describe('route-set membership is pinned literally, not derived', () => {
    /**
     * Intentionally a speed bump. This fails on ANY edit to the source Set,
     * including a legitimate one — that is the point: suppression removes 988
     * access from a whole screen, so growing this Set must cost a visible test
     * edit rather than passing silently.
     *
     * Each of the three earns suppression by owning a crisis affordance
     * reachable WITHOUT SCROLLING (see the source file's header for why the
     * distinction is load-bearing after DEBUG-390).
     */
    it('SUPPRESSED_ROUTES holds exactly the three routes that earn it', () => {
      expect([...SUPPRESSED_ROUTES].sort()).toEqual([
        'AssessmentFlow',
        'CrisisResources',
        'LegalGate',
      ]);
    });

    /**
     * FEAT-298 slice 6c removed MorningFlow / MiddayFlow / EveningFlow with
     * their flows, leaving DailyLoop as the ONLY daily-practice immersive route
     * — which raises the stakes here, since it is the sole surface where the
     * overlay must render faded rather than absent or full-opacity.
     */
    it('IMMERSIVE_ROUTES holds exactly the six meditative routes', () => {
      expect([...IMMERSIVE_ROUTES].sort()).toEqual([
        'BodyScan',
        'DailyLoop',
        'GuidedBodyScan',
        'PracticeTimer',
        'ReflectionTimer',
        'SortingPractice',
      ]);
    });
  });

  // ── (C) NEGATIVE ALLOWLIST — the backstop that survives a re-baselined (B) ─
  it.each(MUST_RENDER_STANDARD)(
    'never suppresses %s — the root overlay is its 988 affordance',
    (route) => {
      expect(SUPPRESSED_ROUTES.has(route)).toBe(false);
      const { getByTestId } = render(<RootCrisisButton routeName={route} />);
      expect(getByTestId(ROOT_CRISIS_BUTTON_TEST_ID)).toBeTruthy();
      expect(receivedProps[0]?.mode).toBe('standard');
      expect(receivedProps[0]?.testID).toBe(ROOT_CRISIS_BUTTON_TEST_ID);
    },
  );

  // ── (A) DERIVED behavioural coverage — cannot go stale ─────────────────────
  it.each([...SUPPRESSED_ROUTES])(
    'renders nothing on suppressed route %s (owns its own crisis affordance)',
    (route) => {
      const { queryByTestId } = render(<RootCrisisButton routeName={route} />);
      expect(queryByTestId(ROOT_CRISIS_BUTTON_TEST_ID)).toBeNull();
      expect(receivedProps).toHaveLength(0);
    },
  );

  it.each([...IMMERSIVE_ROUTES])('uses immersive mode on practice route %s', (route) => {
    render(<RootCrisisButton routeName={route} />);
    expect(receivedProps[0]?.mode).toBe('immersive');
    expect(receivedProps[0]?.testID).toBe(ROOT_CRISIS_BUTTON_TEST_ID);
  });

  it('renders in standard mode when route is undefined (pre-ready)', () => {
    const { getByTestId } = render(<RootCrisisButton />);
    expect(getByTestId(ROOT_CRISIS_BUTTON_TEST_ID)).toBeTruthy();
    expect(receivedProps[0]?.mode).toBe('standard');
  });

  it('navigates to CrisisResources via the root ref when ready', () => {
    render(<RootCrisisButton routeName="Main" />);
    receivedProps[0]?.onNavigate();
    expect(mockNavigate).toHaveBeenCalledWith('CrisisResources', { source: 'crisis_button' });
  });

  /**
   * DEBUG-341 — THIS BLOCK'S INTENT IS DELIBERATELY REWRITTEN, NOT EXTENDED.
   *
   * The case here used to be "does not throw or navigate when the nav container is not
   * ready", asserting `expect(mockNavigate).not.toHaveBeenCalled()`. That PINNED THE
   * SILENT DROP AS CORRECT — the very behaviour crisisTapTrace.ts names verbatim as "the
   * known live producer" of vanished crisis taps. Leaving it in place and adding cases
   * beside it would have left the suite asserting two contradictory contracts.
   *
   * The contract now: not-ready still must not throw, and must not navigate ON THE TAP
   * FRAME — but it must not end in nothing either. It retries to a 400ms ceiling and then
   * dials 988 unconditionally.
   */
  describe('when the nav container is not ready (DEBUG-341)', () => {
    beforeEach(() => {
      mockOpenCrisisUrl.mockClear();
      mockReady = false;
    });

    it('still does not throw, and does not navigate synchronously', () => {
      render(<RootCrisisButton routeName="Main" />);
      expect(() => receivedProps[0]?.onNavigate()).not.toThrow();
      expect(mockNavigate).not.toHaveBeenCalled();
      // ...but it has NOT given up: the retry is armed. See the deadline case below.
      expect(mockOpenCrisisUrl).not.toHaveBeenCalled();
    });

    it('dials 988 once the 400ms deadline passes', () => {
      jest.useFakeTimers();
      try {
        render(<RootCrisisButton routeName="Main" />);
        receivedProps[0]?.onNavigate();
        jest.advanceTimersByTime(500);
        expect(mockOpenCrisisUrl).toHaveBeenCalledWith('tel:988', { manualLabel: '988' });
      } finally {
        jest.useRealTimers();
      }
    });

    it('navigates instead of dialling if the container becomes ready in time', () => {
      // The reason this is retry-then-fallback rather than immediate-fallback: an early
      // tap on a cold start is a one-frame race, and turning that into a phone call for
      // someone who expected the resources screen is a materially different action.
      jest.useFakeTimers();
      try {
        render(<RootCrisisButton routeName="Main" />);
        receivedProps[0]?.onNavigate();
        mockReady = true;
        jest.advanceTimersByTime(100);
        expect(mockNavigate).toHaveBeenCalledWith('CrisisResources', {
          source: 'crisis_button',
        });
        // SINGLE-FLIGHT: the pending fallback must be cancelled. Firing both would yank
        // the user out of the CrisisResources screen they just reached and into the
        // dialer.
        jest.advanceTimersByTime(1000);
        expect(mockOpenCrisisUrl).not.toHaveBeenCalled();
      } finally {
        jest.useRealTimers();
      }
    });

    it('produces exactly one terminal outcome per tap', () => {
      jest.useFakeTimers();
      try {
        render(<RootCrisisButton routeName="Main" />);
        receivedProps[0]?.onNavigate();
        jest.advanceTimersByTime(2000);
        // Never both, never twice.
        expect(mockOpenCrisisUrl).toHaveBeenCalledTimes(1);
        expect(mockNavigate).not.toHaveBeenCalled();
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
