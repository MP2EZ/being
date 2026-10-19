/**
 * `useGuidanceGate` in isolation (MAINT-745, TEST-23).
 *
 * The screen suite proves the screen honours the gate; nothing proved the hook
 * narrows `getLastResult`'s undiscriminated return by runtime shape. These rows do.
 * Each mis-shape row pairs the wrong record with a VALID low reading on the other
 * axis, so the only thing standing between it and `full` is the
 * `'suicidalIdeation' in result` check in `asPhq9` (or `asGad7`). Drop either check
 * and the matching row reads `full`.
 *
 * Mis-shape rows assert "ready, not full, no Tier 2+", never `gentle` by name: a
 * mis-shaped record narrowing to `gentle` is the documented fail-safe, not the
 * contract — the contract is that it never unlocks the ladder.
 *
 * Same hand-rolled store mock as `domainGuidanceScreen.clinical.test.tsx`; the REAL
 * hook and the REAL `decideGuidanceAccess` run against it.
 */

import { renderHook, act } from '@testing-library/react-native';

import type { GAD7Result, PHQ9Result } from '@/features/assessment/types';

const mockStore = {
  phq9: null as unknown,
  gad7: null as unknown,
  hydrated: true,
  hydrationCallbacks: [] as Array<() => void>,
};

jest.mock('@/features/assessment/stores/assessmentStore', () => {
  const state = {
    getLastResult: (type: 'phq9' | 'gad7') => (type === 'phq9' ? mockStore.phq9 : mockStore.gad7),
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

import { useGuidanceGate, type GuidanceGateState } from '@/features/guidance/hooks/useGuidanceGate';

const phq9 = (totalScore: number, suicidalIdeation = false): PHQ9Result => ({
  totalScore,
  severity: 'minimal',
  isCrisis: false,
  suicidalIdeation,
  completedAt: 1_700_000_000_000,
  answers: [],
});

const gad7 = (totalScore: number): GAD7Result => ({
  totalScore,
  severity: 'minimal',
  isCrisis: totalScore >= 15,
  completedAt: 1_700_000_000_000,
  answers: [],
});

const decisionOf = (state: GuidanceGateState) => {
  if (state.status !== 'ready') throw new Error(`expected ready, got ${state.status}`);
  return state.decision;
};

const expectNotFull = (state: GuidanceGateState) => {
  expect(state.status).toBe('ready');
  const decision = decisionOf(state);
  expect(decision.level).not.toBe('full');
  expect(decision.allowTier2Plus).toBe(false);
};

beforeEach(() => {
  mockStore.phq9 = null;
  mockStore.gad7 = null;
  mockStore.hydrated = true;
  mockStore.hydrationCallbacks = [];
});

describe('useGuidanceGate — positive control', () => {
  it('a valid low PHQ-9 and a valid low GAD-7 read ready at full', () => {
    // Without this row every "not full" row below could pass against a hook that
    // never answers full at all.
    mockStore.phq9 = phq9(2);
    mockStore.gad7 = gad7(2);
    const { result } = renderHook(() => useGuidanceGate());
    expect(result.current.status).toBe('ready');
    expect(decisionOf(result.current).level).toBe('full');
    expect(decisionOf(result.current).allowTier2Plus).toBe(true);
  });
});

describe('useGuidanceGate — narrowing by runtime shape (asPhq9 / asGad7)', () => {
  it('a GAD-7 result in the PHQ-9 slot does not unlock the ladder', () => {
    mockStore.phq9 = gad7(2);
    mockStore.gad7 = gad7(2);
    const { result } = renderHook(() => useGuidanceGate());
    expectNotFull(result.current);
  });

  it('a PHQ-9 result in the GAD-7 slot does not unlock the ladder', () => {
    mockStore.phq9 = phq9(2);
    mockStore.gad7 = phq9(2);
    const { result } = renderHook(() => useGuidanceGate());
    expectNotFull(result.current);
  });

  it('a mis-shaped object in the PHQ-9 slot does not unlock the ladder', () => {
    mockStore.phq9 = { totalScore: 1 };
    mockStore.gad7 = gad7(2);
    const { result } = renderHook(() => useGuidanceGate());
    expectNotFull(result.current);
  });

  it('a PHQ-9-shaped record lacking suicidalIdeation does not unlock the ladder', () => {
    // A persisted record with Q9 dropped must never be read as "Q9 answered 0".
    const { suicidalIdeation: _dropped, ...noQ9 } = phq9(2);
    mockStore.phq9 = noQ9;
    mockStore.gad7 = gad7(2);
    const { result } = renderHook(() => useGuidanceGate());
    expectNotFull(result.current);
  });
});

describe('useGuidanceGate — suppression', () => {
  it('suppresses on PHQ-9 Q9 > 0 at a LOW total', () => {
    mockStore.phq9 = phq9(3, true);
    mockStore.gad7 = gad7(1);
    const { result } = renderHook(() => useGuidanceGate());
    expect(decisionOf(result.current).level).toBe('suppressed');
    expect(decisionOf(result.current).allowTier2Plus).toBe(false);
  });

  it('suppresses on GAD-7 at the severe floor', () => {
    mockStore.phq9 = phq9(1);
    mockStore.gad7 = gad7(15);
    const { result } = renderHook(() => useGuidanceGate());
    expect(decisionOf(result.current).level).toBe('suppressed');
  });
});

describe('useGuidanceGate — hydration', () => {
  it('reports pending until the store hydrates, then ready', () => {
    mockStore.hydrated = false;
    mockStore.phq9 = phq9(3, true);
    mockStore.gad7 = gad7(1);
    const { result } = renderHook(() => useGuidanceGate());
    expect(result.current).toEqual({ status: 'pending' });

    act(() => {
      mockStore.hydrated = true;
      mockStore.hydrationCallbacks.forEach((cb) => cb());
    });

    expect(result.current.status).toBe('ready');
    expect(decisionOf(result.current).level).toBe('suppressed');
  });
});
