/**
 * DEBUG-670 — the daily loop's premeditatio prompt is withheld from suppressed readers.
 *
 * FEAT-291's crisis pass wrote "never on any acute-distress entry" into the
 * PREMEDITATIO contract and FEAT-301 called that gating "unchanged", but no score was
 * ever read: a user who had just scored GAD-7 21 in onboarding could tap "Start
 * morning practice" and be asked to rehearse a setback. The gate is now
 * `useGuidanceGate`'s `suppressed` arm, and this suite is its falsifier.
 *
 * WHY HERE. `test:clinical` is `--testPathPattern=clinical`, so this runs in precommit
 * and in CI; a suite beside the screen would match no CI pattern. The filename avoids
 * the substring `crisis` for the reason domainGuidanceScreen.clinical.test.tsx gives
 * (`test:crisis-quick`'s 5s timeout).
 *
 * WHAT IS REAL. The screen, `useGuidanceGate` and `decideGuidanceAccess` all run
 * unmocked; only the encrypted assessment store is hand-rolled, with the `persist`
 * surface the hook reads. Never mock the hook or the gate here — a stubbed decision
 * would make every row below pass against a screen that reads no score at all.
 *
 * The ruling being pinned (crisis, DEBUG-670):
 *   · withheld on Q9 > 0, PHQ-9 ≥ 20 or GAD-7 ≥ 15 — the latest reading per axis,
 *   · SHOWN at PHQ-9 15-19, GAD-7 10-14 and for never-assessed readers, by ruling,
 *   · withheld while the store hydrates, re-evaluated when it lands,
 *   · withheld means absent: the rest of the beat renders and Continue stays live,
 *   · text typed into a field that is then withheld is not saved.
 */

import React from 'react';
import { render, fireEvent, act, renderHook } from '@testing-library/react-native';

import type { GAD7Result, PHQ9Result } from '@/features/assessment/types';

/**
 * History, not a single slot per axis: the screen must decide on the LATEST reading
 * per axis. Exposing the whole history through `completedAssessments` means an
 * implementation that scans for "any severe reading ever", or reads the first one,
 * reds the latest-wins rows below instead of passing on a mock that only knows one.
 *
 * Mutable state lives on one `mock`-prefixed holder because the jest.mock factory is
 * hoisted and may not close over ordinary out-of-scope names.
 */
const mockStore = {
  phq9: [] as PHQ9Result[],
  gad7: [] as GAD7Result[],
  hydrated: true,
  hydrationCallbacks: [] as Array<() => void>,
};

jest.mock('@/features/assessment/stores/assessmentStore', () => {
  const state = {
    get completedAssessments() {
      return [
        ...mockStore.phq9.map((result) => ({ type: 'phq9', result })),
        ...mockStore.gad7.map((result) => ({ type: 'gad7', result })),
      ];
    },
    getLastResult: (type: 'phq9' | 'gad7') => {
      const history = type === 'phq9' ? mockStore.phq9 : mockStore.gad7;
      return history.length > 0 ? history[history.length - 1] : null;
    },
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

// Imported AFTER the mock so the hook binds to it.
import DailyLoopStepScreen from '@/features/practices/dailyloop/screens/DailyLoopStepScreen';
import { seedWellnessWriteConsent } from '../helpers/wellnessWriteConsent';
import { useGuidanceGate, type GuidanceGateState } from '@/features/guidance/hooks/useGuidanceGate';
import { useConsentStore } from '@/core/stores/consentStore';

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

const PREMEDITATIO = 'premeditatio-input';

/** The one beat the prompt lives on: Virtuous Response, morning, deep. */
const renderMorningVirtue = (onSave = jest.fn()) =>
  render(
    <DailyLoopStepScreen stepKey="VirtuousResponse" mode="morning" depth="deep" onSave={onSave} />,
  );

beforeEach(() => {
  // FEAT-673: consent boots at `loading`, which the gate reads as pending. Seed a
  // never-blocked grant so this suite keeps testing what it tested (B.start -Infinity).
  seedWellnessWriteConsent('granted');
  mockStore.phq9 = [];
  mockStore.gad7 = [];
  mockStore.hydrated = true;
  mockStore.hydrationCallbacks = [];
});

describe('premeditatio is withheld from a suppressed reader', () => {
  // Q9 is separated from the score floor on purpose: it suppresses REGARDLESS of
  // total. The one-axis rows pin that a missing axis contributes nothing rather than
  // rescuing a severe reading on the other.
  const WITHHELD = [
    ['GAD-7 at the severe floor (15)', () => { mockStore.phq9 = [phq9(2)]; mockStore.gad7 = [gad7(15)]; }],
    ['GAD-7 well above it (21)', () => { mockStore.phq9 = [phq9(2)]; mockStore.gad7 = [gad7(21)]; }],
    ['PHQ-9 at the severe floor (20), Q9 = 0', () => { mockStore.phq9 = [phq9(20)]; mockStore.gad7 = [gad7(2)]; }],
    ['PHQ-9 Q9 > 0 at a low total (3)', () => { mockStore.phq9 = [phq9(3, true)]; mockStore.gad7 = [gad7(2)]; }],
    ['GAD-7 15 with no PHQ-9 on record', () => { mockStore.gad7 = [gad7(15)]; }],
    ['Q9 > 0 with no GAD-7 on record', () => { mockStore.phq9 = [phq9(1, true)]; }],
    ['latest GAD-7 18 after an earlier GAD-7 5', () => { mockStore.phq9 = [phq9(2)]; mockStore.gad7 = [gad7(5), gad7(18)]; }],
  ] as const;

  for (const [label, seed] of WITHHELD) {
    it(`withholds the prompt: ${label}`, () => {
      seed();
      const { queryByTestId } = renderMorningVirtue();
      expect(queryByTestId(PREMEDITATIO)).toBeNull();
    });
  }
});

describe('premeditatio stays for everyone below the severe band', () => {
  // PHQ-9 15 and GAD-7 10 are the gentle band. They are SHOWN by ruling, and they
  // are the rows that catch a swap to `level === 'full'` or to `allowPremeditatio`
  // (false for every user while developmental stage is unwired).
  const SHOWN = [
    ['GAD-7 one below the severe floor (14)', () => { mockStore.phq9 = [phq9(2)]; mockStore.gad7 = [gad7(14)]; }],
    ['PHQ-9 one below the severe floor (19)', () => { mockStore.phq9 = [phq9(19)]; mockStore.gad7 = [gad7(2)]; }],
    ['PHQ-9 at the support floor (15)', () => { mockStore.phq9 = [phq9(15)]; mockStore.gad7 = [gad7(2)]; }],
    ['GAD-7 at the moderate floor (10)', () => { mockStore.phq9 = [phq9(2)]; mockStore.gad7 = [gad7(10)]; }],
    ['both axes absent (never assessed, store hydrated)', () => {}],
    ['latest GAD-7 5 after an earlier GAD-7 18', () => { mockStore.phq9 = [phq9(2)]; mockStore.gad7 = [gad7(18), gad7(5)]; }],
  ] as const;

  for (const [label, seed] of SHOWN) {
    it(`shows the prompt: ${label}`, () => {
      seed();
      const { getByTestId } = renderMorningVirtue();
      expect(getByTestId(PREMEDITATIO)).toBeTruthy();
    });
  }
});

describe('the hydration window fails closed and re-evaluates', () => {
  it('withholds the prompt before the store has hydrated, even for a calm reading', () => {
    mockStore.hydrated = false;
    mockStore.phq9 = [phq9(2)];
    mockStore.gad7 = [gad7(2)];
    const { queryByTestId } = renderMorningVirtue();
    expect(queryByTestId(PREMEDITATIO)).toBeNull();
  });

  it('shows the prompt once hydration lands with no data on record', () => {
    mockStore.hydrated = false;
    const { queryByTestId, getByTestId } = renderMorningVirtue();
    expect(queryByTestId(PREMEDITATIO)).toBeNull();

    // Through the hook's real `onFinishHydration` → `setHydrated`, so a decision
    // snapshotted at mount would stay withheld here and red this row.
    act(() => {
      mockStore.hydrated = true;
      mockStore.hydrationCallbacks.forEach((cb) => cb());
    });

    expect(getByTestId(PREMEDITATIO)).toBeTruthy();
  });

  it('stays withheld when hydration reveals a severe reading', () => {
    mockStore.hydrated = false;
    mockStore.phq9 = [phq9(2)];
    mockStore.gad7 = [gad7(21)];
    const { queryByTestId } = renderMorningVirtue();

    act(() => {
      mockStore.hydrated = true;
      mockStore.hydrationCallbacks.forEach((cb) => cb());
    });

    expect(queryByTestId(PREMEDITATIO)).toBeNull();
  });
});

describe('withheld means absent — the rest of the beat is untouched', () => {
  const assertBeatIntact = (getByTestId: (id: string) => { props: Record<string, unknown> }) => {
    expect(getByTestId('virtue-chip-wisdom')).toBeTruthy();
    expect(getByTestId('daily-loop-input-response')).toBeTruthy();
    const cont = getByTestId('continue-button');
    expect(cont.props.accessibilityState?.disabled).not.toBe(true);
  };

  it('renders the virtue chips, the action field and a live Continue while suppressed', () => {
    mockStore.phq9 = [phq9(2)];
    mockStore.gad7 = [gad7(21)];
    const { getByTestId, queryByTestId } = renderMorningVirtue();
    expect(queryByTestId(PREMEDITATIO)).toBeNull();
    assertBeatIntact(getByTestId);
  });

  it('renders the virtue chips, the action field and a live Continue while hydrating', () => {
    mockStore.hydrated = false;
    const { getByTestId, queryByTestId } = renderMorningVirtue();
    expect(queryByTestId(PREMEDITATIO)).toBeNull();
    assertBeatIntact(getByTestId);
  });
});

describe('a mid-beat flip to suppressed discards what was typed', () => {
  const TYPED = "If the meeting goes badly, I'll stay steady.";

  it('control: with no flip, the typed rehearsal is saved', () => {
    mockStore.phq9 = [phq9(2)];
    mockStore.gad7 = [gad7(2)];
    const onSave = jest.fn();
    const { getByTestId } = renderMorningVirtue(onSave);

    fireEvent.changeText(getByTestId(PREMEDITATIO), TYPED);
    fireEvent.press(getByTestId('continue-button'));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0].adversityRehearsal).toBe(TYPED);
  });

  it('after a flip to GAD-7 21 the field is gone and nothing typed into it is saved', () => {
    mockStore.phq9 = [phq9(2)];
    mockStore.gad7 = [gad7(2)];
    const onSave = jest.fn();
    const { getByTestId, queryByTestId, rerender } = renderMorningVirtue(onSave);

    fireEvent.changeText(getByTestId(PREMEDITATIO), TYPED);

    // A new assessment is recorded mid-beat. The hand-rolled store does not notify,
    // so rerender to re-run the selectors — the same path a real zustand update takes.
    mockStore.gad7 = [gad7(2), gad7(21)];
    rerender(
      <DailyLoopStepScreen stepKey="VirtuousResponse" mode="morning" depth="deep" onSave={onSave} />,
    );

    expect(queryByTestId(PREMEDITATIO)).toBeNull();
    fireEvent.press(getByTestId('continue-button'));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).not.toHaveProperty('adversityRehearsal');
  });
});

describe('the existing mode and depth gates are unchanged', () => {
  // Calm, complete readings — so the only thing that can withhold the prompt in
  // these rows is the tense/depth gate, which the score gate must AND with, never
  // replace or widen.
  beforeEach(() => {
    mockStore.phq9 = [phq9(2)];
    mockStore.gad7 = [gad7(2)];
  });

  it.each([
    ['evening', 'deep'],
    ['flat', 'deep'],
    ['morning', 'quick'],
  ] as const)('never renders the prompt in %s / %s, even for a calm reader', (mode, depth) => {
    const { queryByTestId } = render(
      <DailyLoopStepScreen stepKey="VirtuousResponse" mode={mode} depth={depth} onSave={jest.fn()} />,
    );
    expect(queryByTestId(PREMEDITATIO)).toBeNull();
  });

  it('never renders the prompt on another morning deep beat', () => {
    const { queryByTestId } = render(
      <DailyLoopStepScreen stepKey="SphereSovereignty" mode="morning" depth="deep" onSave={jest.fn()} />,
    );
    expect(queryByTestId(PREMEDITATIO)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FEAT-673 — readings count only from the Art. 9 write-block start
//
// Real consent store (seeded through A2a's helper, which checks its own verdict); the
// assessment mock above carries each reading's completedAt. Every row asserts the gate
// level AND whether DailyLoopStepScreen renders premeditatio.
// ─────────────────────────────────────────────────────────────────────────────

const T = 1_800_000_000_000; // the block start
const at = <R extends { completedAt: number }>(r: R, completedAt: number): R => ({ ...r, completedAt });
const levelOf = (state: GuidanceGateState) => (state.status === 'ready' ? state.decision.level : 'pending');
const gateLevel = () => levelOf(renderHook(() => useGuidanceGate()).result.current);
const premeditatioShown = () => renderMorningVirtue().queryByTestId(PREMEDITATIO) !== null;

describe('FEAT-673 AC4 — crisis-ruled rows (consent shape x reading set)', () => {
  const LOW_BEFORE = () => { mockStore.phq9 = [at(phq9(3), T - 1)]; mockStore.gad7 = [at(gad7(2), T - 1)]; };
  const Q9_BEFORE = () => { mockStore.phq9 = [at(phq9(1, true), T - 1)]; mockStore.gad7 = [at(gad7(2), T - 1)]; };

  it.each([
    ['(a) revoked', () => seedWellnessWriteConsent('revoked', { blockStartedAt: T })],
    ['(b) valid + Art. 9 switched off', () => seedWellnessWriteConsent('withdrawn', { blockStartedAt: T })],
    ['(c) revoked after relaunch (null)', () => seedWellnessWriteConsent('revoked_relaunched')],
  ] as const)('%s: a persisted PHQ-9 3 / GAD-7 2 from before the block is never full; premeditatio absent', (_l, seed) => {
    seed();
    LOW_BEFORE();
    expect(gateLevel()).toBe('gentle_withheld');
    expect(premeditatioShown()).toBe(false);
  });

  it.each([
    ['revoked', () => seedWellnessWriteConsent('revoked', { blockStartedAt: T })],
    ['withdrawn', () => seedWellnessWriteConsent('withdrawn', { blockStartedAt: T })],
    ['revoked_relaunched', () => seedWellnessWriteConsent('revoked_relaunched')],
  ] as const)('(d) a stale Q9 > 0 under %s still suppresses', (_l, seed) => {
    seed();
    Q9_BEFORE();
    expect(gateLevel()).toBe('suppressed');
    expect(premeditatioShown()).toBe(false);
  });

  it('(e) re-granted by an appended Art. 9 true entry, no reading at or after B.start -> withheld', () => {
    seedWellnessWriteConsent('regranted', { blockStartedAt: T, regrantedAt: T + 60_000 });
    LOW_BEFORE();
    expect(gateLevel()).toBe('gentle_withheld');
    expect(premeditatioShown()).toBe(false);
  });

  it('(e2) a low pair completed inside the now-closed block [B.start, re-grant) -> full + premeditatio (crisis confirmed)', () => {
    seedWellnessWriteConsent('regranted', { blockStartedAt: T, regrantedAt: T + 60_000 });
    mockStore.phq9 = [at(phq9(3), T + 10)];
    mockStore.gad7 = [at(gad7(2), T + 10)];
    expect(gateLevel()).toBe('full');
    expect(premeditatioShown()).toBe(true);
  });

  it('(f) a low pair after the re-grant -> shown', () => {
    seedWellnessWriteConsent('regranted', { blockStartedAt: T, regrantedAt: T + 60_000 });
    mockStore.phq9 = [at(phq9(3), T + 120_000)];
    mockStore.gad7 = [at(gad7(2), T + 120_000)];
    expect(gateLevel()).toBe('full');
    expect(premeditatioShown()).toBe(true);
  });

  it('(g) relaunch: stale low + a high after B.start suppresses in session; after the relaunch the cap holds, never full', () => {
    seedWellnessWriteConsent('revoked', { blockStartedAt: T });
    mockStore.phq9 = [at(phq9(3), T - 1), at(phq9(22), T + 10)];
    mockStore.gad7 = [at(gad7(2), T - 1)];
    expect(gateLevel()).toBe('suppressed');
    expect(premeditatioShown()).toBe(false);

    // The in-memory high is gone after a relaunch (FEAT-685 keeps it off disk); only the stale low remains.
    mockStore.phq9 = [at(phq9(3), T - 1)];
    seedWellnessWriteConsent('revoked_relaunched');
    expect(gateLevel()).toBe('gentle_withheld');
    expect(premeditatioShown()).toBe(false);
  });
});

describe('FEAT-673 AC5 — the accepted pre-A2b behaviour change, pinned', () => {
  it('(1) blocked, never screened: premeditatio withheld, Tier 0/1 stays', () => {
    seedWellnessWriteConsent('refused', { blockStartedAt: T });
    expect(gateLevel()).toBe('gentle_withheld');
    expect(premeditatioShown()).toBe(false);
  });

  it('(3) an onboarding refuser whose screening completed before the grant: withheld', () => {
    seedWellnessWriteConsent('refused', { blockStartedAt: T });
    mockStore.phq9 = [at(phq9(3), T - 5_000)];
    mockStore.gad7 = [at(gad7(2), T - 5_000)];
    expect(gateLevel()).toBe('gentle_withheld');
    expect(premeditatioShown()).toBe(false);
  });

  it.each(['version_mismatch', 'integrity_error'] as const)(
    '(4) a null B.start while writes are allowed (%s): withheld',
    (status) => {
      seedWellnessWriteConsent('granted');
      useConsentStore.setState({ consentStatus: status });
      mockStore.phq9 = [phq9(3)];
      mockStore.gad7 = [gad7(2)];
      expect(gateLevel()).toBe('gentle_withheld');
      expect(premeditatioShown()).toBe(false);
    },
  );

  it('control: never blocked and never screened is gentle and keeps premeditatio', () => {
    seedWellnessWriteConsent('granted');
    expect(gateLevel()).toBe('gentle');
    expect(premeditatioShown()).toBe(true);
  });
});

describe('FEAT-673 AC3 — the hook fails closed and follows consent in place', () => {
  it("consent `loading` is pending, so premeditatio is withheld", () => {
    seedWellnessWriteConsent('loading');
    mockStore.phq9 = [phq9(3)];
    mockStore.gad7 = [gad7(2)];
    expect(gateLevel()).toBe('pending');
    expect(premeditatioShown()).toBe(false);
  });

  it('an in-place switch from granted to revoked re-renders to the fourth level without a remount', () => {
    seedWellnessWriteConsent('granted');
    mockStore.phq9 = [at(phq9(3), T - 1)];
    mockStore.gad7 = [at(gad7(2), T - 1)];
    const { result } = renderHook(() => useGuidanceGate());
    expect(levelOf(result.current)).toBe('full');

    act(() => {
      seedWellnessWriteConsent('revoked', { blockStartedAt: T });
    });
    expect(levelOf(result.current)).toBe('gentle_withheld');
  });

  it('a consent store that throws on access answers the fourth level, never full, and renders no error boundary', () => {
    seedWellnessWriteConsent('granted');
    mockStore.phq9 = [phq9(3)];
    mockStore.gad7 = [gad7(2)];
    const state = useConsentStore.getState() as unknown as Record<string, unknown>;
    const saved = { consentStatus: state.consentStatus, consentCache: state.consentCache };
    const boom = () => { throw new Error('fault injected'); };
    try {
      for (const key of ['consentStatus', 'consentCache'] as const) {
        Object.defineProperty(state, key, { get: boom, configurable: true, enumerable: true });
      }
      // decideWellnessWrite takes its fail-open catch (allowed) and the selector answers null.
      expect(gateLevel()).toBe('gentle_withheld');
      expect(premeditatioShown()).toBe(false);
    } finally {
      for (const key of ['consentStatus', 'consentCache'] as const) {
        Object.defineProperty(state, key, { value: saved[key], writable: true, configurable: true, enumerable: true });
      }
    }
  });
});
