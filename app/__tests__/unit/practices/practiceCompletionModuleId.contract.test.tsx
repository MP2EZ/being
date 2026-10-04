/**
 * DEBUG-695 CONTRACT — an invalid moduleId degrades at completion; it never throws or corrupts.
 *
 * `being://practice/<id>` reaches `usePracticeCompletion` with whatever `moduleId` the URL
 * carried, or none. Before this item `markComplete` called `incrementPracticeCount(moduleId)`
 * and `recordPrincipleEngagement(getPrincipleForModuleId(moduleId), …)` unguarded:
 *   - an absent or unknown id threw a TypeError inside the timer callback. RootCrisisBoundary
 *     never sees that, so a Release build died, taking the 988 affordance with it. Observed on
 *     a simulator, 2026-10-02.
 *   - a prototype key such as `constructor` threw nothing and wrote garbage: a NaN practice
 *     count, and an engagement for the principle `Object`.
 *
 * Driven against the REAL stores, because a mocked store hides the TypeError and passes
 * vacuously. Same "degrade, never throw" contract as DEBUG-344's practiceId half.
 */

jest.mock('@/core/analytics', () => ({
  useAnalytics: () => ({ trackPracticeStarted: jest.fn(), trackPracticeCompleted: jest.fn() }),
}));

import { act, render, renderHook } from '@testing-library/react-native';
import { logger } from '@/core/services/logging';
import { usePracticeCompletion } from '@/features/learn/practices/shared/usePracticeCompletion';
import { useEducationStore } from '@/features/learn/stores/educationStore';
import { useStoicPracticeStore } from '@/features/practices/stores/stoicPracticeStore';
import { isModuleId, type ModuleId } from '@/features/learn/types/education';
import { MODULE_TO_PRINCIPLE_MAP } from '@/features/learn/utils/principleMapping';
import { seedWellnessWriteConsent } from '../../helpers/wellnessWriteConsent';

let mockWarn: jest.SpyInstance;

const VALID: ModuleId[] = [
  'aware-presence',
  'radical-acceptance',
  'sphere-sovereignty',
  'virtuous-response',
  'interconnected-living',
];
/** Every own key of Object.prototype that survives linking.ts's sanitiser, plus one fixed key. */
const PROTOTYPE_KEYS = Object.getOwnPropertyNames(Object.prototype).filter(
  (k) => /^[a-zA-Z0-9-]+$/.test(k),
);
const INVALID: (string | undefined)[] = [undefined, 'bogus', ...PROTOTYPE_KEYS];
/** A sentinel no fixed warning text could contain. */
const SENTINEL = 'zq-sentinel-module-7731';

function freshModules() {
  // `resetEducationStoreForErasure` restores initializeModules() without importing it.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@/features/learn/stores/educationStore').resetEducationStoreForErasure();
}

function complete(moduleId: string | undefined) {
  const { result } = renderHook(() =>
    usePracticeCompletion({
      practiceId: 'breathing-space',
      moduleId: moduleId as ModuleId | undefined,
      title: 'Breathing Space',
      onComplete: () => {},
    }),
  );
  act(() => result.current.markComplete());
  return result;
}

beforeEach(() => {
  freshModules();
  useStoicPracticeStore.setState({ principleEngagements: [] });
  seedWellnessWriteConsent('granted');
  mockWarn = jest.spyOn(logger, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  mockWarn.mockRestore();
});

describe('isModuleId', () => {
  it('admits exactly the authored set: the store\'s modules and the principle map', () => {
    const storeIds = Object.keys(useEducationStore.getState().modules).sort();
    expect(storeIds).toEqual([...VALID].sort());
    expect(Object.keys(MODULE_TO_PRINCIPLE_MAP).sort()).toEqual(storeIds);
    for (const id of storeIds) expect(isModuleId(id)).toBe(true);
  });

  it('rejects prototype keys, unknown strings, wrong case, non-strings and arrays', () => {
    expect(PROTOTYPE_KEYS.length).toBeGreaterThan(5); // control: the sweep has members
    for (const bad of [...PROTOTYPE_KEYS, '__proto__', 'bogus', 'Aware-Presence', '', undefined, null, 1, {}]) {
      expect(isModuleId(bad)).toBe(false);
    }
    expect(isModuleId(['aware-presence'])).toBe(false);
  });
});

describe('markComplete with an invalid moduleId', () => {
  it.each(INVALID.map((id) => [String(id), id]))('%s: never throws, still completes', (_label, id) => {
    let result: ReturnType<typeof complete> | undefined;
    expect(() => {
      result = complete(id);
    }).not.toThrow();
    expect(result!.current.isComplete).toBe(true);
    const { getByText } = render(result!.current.renderCompletion()!);
    expect(getByText('Practice Complete')).toBeTruthy();
  });

  it.each(INVALID.map((id) => [String(id), id]))('%s: writes no progress and no engagement', (_label, id) => {
    const before = JSON.stringify(useEducationStore.getState().modules);
    complete(id);
    const modules = useEducationStore.getState().modules as Record<string, { practiceCount: number }>;
    expect(JSON.stringify(modules)).toBe(before);
    for (const key of PROTOTYPE_KEYS) expect(Object.prototype.hasOwnProperty.call(modules, key)).toBe(false);
    expect(useStoicPracticeStore.getState().principleEngagements).toHaveLength(0);
  });

  it('logs one fixed warning that does not echo the id', () => {
    complete(SENTINEL);
    expect(mockWarn).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(mockWarn.mock.calls)).not.toContain(SENTINEL);
  });
});

describe('markComplete with a valid moduleId', () => {
  it.each(VALID)('%s: counts once and records one engagement for its principle', (id) => {
    const before = useEducationStore.getState().modules[id].practiceCount;
    complete(id);
    expect(useEducationStore.getState().modules[id].practiceCount).toBe(before + 1);
    const engagements = useStoicPracticeStore.getState().principleEngagements;
    expect(engagements).toHaveLength(1);
    expect(engagements[0]!.principle).toBe(MODULE_TO_PRINCIPLE_MAP[id]);
    expect(mockWarn).not.toHaveBeenCalled();
  });
});

describe('the store writes are backstopped, defence in depth', () => {
  it('a synchronous throw from incrementPracticeCount does not escape', () => {
    const original = useEducationStore.getState().incrementPracticeCount;
    useEducationStore.setState({
      incrementPracticeCount: () => {
        throw new Error('store drift');
      },
    });
    try {
      expect(() => complete('aware-presence')).not.toThrow();
    } finally {
      useEducationStore.setState({ incrementPracticeCount: original });
    }
  });

  it('a rejection from recordPrincipleEngagement is handled, not left unhandled', async () => {
    const original = useStoicPracticeStore.getState().recordPrincipleEngagement;
    const unhandled = jest.fn();
    process.on('unhandledRejection', unhandled);
    useStoicPracticeStore.setState({
      recordPrincipleEngagement: () => Promise.reject(new Error('persist failed')),
    });
    try {
      expect(() => complete('aware-presence')).not.toThrow();
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off('unhandledRejection', unhandled);
      useStoicPracticeStore.setState({ recordPrincipleEngagement: original });
    }
  });
});
