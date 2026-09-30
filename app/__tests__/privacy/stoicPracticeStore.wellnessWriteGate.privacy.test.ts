/**
 * Art. 9 write gate on the stoic practice blob (FEAT-667, FEAT-318 slice C).
 *
 * Founder ruling 2026-09-29 (FEAT-667 body, "AC1 RULING + SCOPE-DOWN"): every live
 * field of `stoic_practice_state` — check-ins, principle engagements (daily AND
 * learn) and weekly reflection text — is withheld while `decideWellnessWrite()`
 * blocks. The mechanism is skip-the-write, so what is on disk from before the
 * withdrawal is left exactly as it was. Capture is never gated: in-memory state
 * still updates, so the practice and today's UI keep working.
 *
 * WHAT THIS SUITE PINS
 *   1. Granted writes; every blocked reason but `loading` writes nothing.
 *   2. Pre-withdrawal bytes on disk are untouched by a blocked write.
 *   3. A record captured while blocked is never written — not even by the first
 *      permitted write after a re-grant in the same process.
 *   4. `loading` DEFERS: the write lands once consent resolves to granted.
 *   5. No read is involved, so an unreadable disk cannot become an empty overwrite.
 *   6. `flushStoicPracticePersist` never rejects (the AppState flush fires on a
 *      988 tel: handoff), and erasure stays ungated.
 *
 * Each test gets a fresh module (the withheld/persisted record sets are module
 * state) via `jest.resetModules`, with one shared in-memory disk.
 *
 * `.privacy.` so the `Safety + privacy gates` CI job runs it (INFRA-368).
 */

import type { SeededWellnessWriteConsent } from '../helpers/wellnessWriteConsent';

const mockDisk: Record<string, string> = {};
const mockCounts = { writes: 0, deletes: 0 };
const mockFaults = { readFails: false, writeFails: false };

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => {
    if (mockFaults.readFails) throw new Error('keychain unavailable');
    return mockDisk[key] ?? null;
  }),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    if (mockFaults.writeFails) throw new Error('keychain unavailable');
    mockCounts.writes += 1;
    mockDisk[key] = value;
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockCounts.deletes += 1;
    delete mockDisk[key];
  }),
}));

const KEY = 'stoic_practice_state';

type StoicModule = typeof import('@/features/practices/stores/stoicPracticeStore');
let stoic: StoicModule;
let seed: (state: SeededWellnessWriteConsent) => void;

const store = () => stoic.useStoicPracticeStore.getState();
const onDisk = () => JSON.parse(mockDisk[KEY]!) as {
  checkInCompletions: { type: string; date: string }[];
  principleEngagements: { principle: string; flowType: string }[];
  weeklyReflections: { text: string }[];
};

/**
 * A blob written before the user withdrew: a daily check-in two LOCAL days ago and a
 * reflection. Local, not UTC, because the store de-dupes same-local-day check-ins.
 */
function seedPreWithdrawalBlob(): string {
  const earlier = new Date();
  earlier.setDate(earlier.getDate() - 2);
  const date = [
    earlier.getFullYear(),
    String(earlier.getMonth() + 1).padStart(2, '0'),
    String(earlier.getDate()).padStart(2, '0'),
  ].join('-');
  const blob = JSON.stringify({
    version: 2,
    practiceStartDate: null,
    totalPracticeDays: 0,
    currentStreak: 0,
    longestStreak: 0,
    checkInCompletions: [{ type: 'daily', completedAt: earlier.toISOString(), date }],
    principleEngagements: [
      { principle: 'aware_presence', flowType: 'daily', engagementType: 'applied', date, timestamp: earlier.toISOString() },
    ],
    weeklyReflections: [{ id: 'r1', weekStartIso: '2000-01-03', text: 'before withdrawal', savedAt: earlier.toISOString() }],
  });
  mockDisk[KEY] = blob;
  return blob;
}

async function loadFresh(): Promise<void> {
  jest.resetModules();
  stoic = require('@/features/practices/stores/stoicPracticeStore');
  seed = require('../helpers/wellnessWriteConsent').seedWellnessWriteConsent;
  await store().loadPersistedState();
}

beforeEach(() => {
  for (const key of Object.keys(mockDisk)) delete mockDisk[key];
  mockCounts.writes = 0;
  mockCounts.deletes = 0;
  mockFaults.readFails = false;
  mockFaults.writeFails = false;
});

describe('granted', () => {
  it('writes check-ins, engagements and reflections', async () => {
    await loadFresh();
    seed('granted');
    await store().markCheckInComplete('daily');
    await store().recordPrincipleEngagement('aware_presence', 'daily', 'applied');
    await store().recordPrincipleEngagement('sphere_sovereignty', 'learn', 'practiced');
    await store().addWeeklyReflection('noticed a lot');
    await stoic.flushStoicPracticePersist();

    expect(mockCounts.writes).toBe(1);
    const blob = onDisk();
    expect(blob.checkInCompletions.map((c) => c.type)).toEqual(['daily']);
    expect(blob.principleEngagements.map((e) => e.flowType)).toEqual(['daily', 'learn']);
    expect(blob.weeklyReflections.map((r) => r.text)).toEqual(['noticed a lot']);
  });
});

describe.each<SeededWellnessWriteConsent>(['refused', 'revoked', 'under_age', 'missing'])(
  'blocked (%s)',
  (reason) => {
    it.each([
      ['markCheckInComplete', () => store().markCheckInComplete('daily')],
      ['recordPrincipleEngagement (daily)', () => store().recordPrincipleEngagement('aware_presence', 'daily', 'applied')],
      ['recordPrincipleEngagement (learn)', () => store().recordPrincipleEngagement('aware_presence', 'learn', 'practiced')],
      ['addWeeklyReflection', () => store().addWeeklyReflection('not to be kept')],
    ])('%s updates memory and writes nothing', async (_name, act) => {
      await loadFresh();
      seed(reason);
      await act();
      await stoic.flushStoicPracticePersist();

      expect(mockCounts.writes).toBe(0);
      expect(mockDisk[KEY]).toBeUndefined();
      // Capture is never gated: the practice and today's UI still see it.
      const s = store();
      expect(s.checkInCompletions.length + s.principleEngagements.length + s.weeklyReflections.length).toBe(1);
    });

    it('leaves the pre-withdrawal blob byte-identical', async () => {
      const before = seedPreWithdrawalBlob();
      await loadFresh();
      seed(reason);
      await store().markCheckInComplete('daily');
      await store().recordPrincipleEngagement('aware_presence', 'daily', 'applied');
      await stoic.flushStoicPracticePersist();

      expect(mockCounts.writes).toBe(0);
      expect(mockDisk[KEY]).toBe(before);
    });
  },
);

describe('re-grant in the same process', () => {
  it('never writes what was captured while blocked, and keeps what was on disk', async () => {
    seedPreWithdrawalBlob();
    await loadFresh();

    seed('refused');
    await store().markCheckInComplete('daily'); // captured while withheld
    await store().recordPrincipleEngagement('radical_acceptance', 'daily', 'applied');
    await stoic.flushStoicPracticePersist();
    expect(mockCounts.writes).toBe(0);

    seed('granted');
    await store().recordPrincipleEngagement('sphere_sovereignty', 'learn', 'practiced'); // after the grant
    await stoic.flushStoicPracticePersist();

    expect(mockCounts.writes).toBe(1);
    const blob = onDisk();
    // The pre-withdrawal check-in survives; today's withheld one does not.
    expect(blob.checkInCompletions).toHaveLength(1);
    expect(blob.checkInCompletions[0]!.date).not.toBe(store().checkInCompletions.at(-1)!.date);
    expect(store().checkInCompletions).toHaveLength(2);
    expect(blob.principleEngagements.map((e) => e.principle)).toEqual(['aware_presence', 'sphere_sovereignty']);
    expect(blob.weeklyReflections.map((r) => r.text)).toEqual(['before withdrawal']);
  });

  it('keeps withholding a blocked record across later permitted writes', async () => {
    await loadFresh();
    seed('refused');
    await store().addWeeklyReflection('written while withheld');
    await stoic.flushStoicPracticePersist();

    seed('granted');
    await store().markCheckInComplete('daily');
    await stoic.flushStoicPracticePersist();
    await store().recordPrincipleEngagement('aware_presence', 'daily', 'applied');
    await stoic.flushStoicPracticePersist();

    expect(mockCounts.writes).toBe(2);
    expect(onDisk().weeklyReflections).toEqual([]);
  });
});

describe('loading', () => {
  it('defers the write rather than dropping it', async () => {
    await loadFresh();
    seed('loading');
    await store().markCheckInComplete('daily');
    await stoic.flushStoicPracticePersist();
    expect(mockCounts.writes).toBe(0);

    seed('granted');
    await stoic.flushStoicPracticePersist();

    expect(mockCounts.writes).toBe(1);
    expect(onDisk().checkInCompletions.map((c) => c.type)).toEqual(['daily']);
  });

  it('withholds a deferred record if consent resolves to refused', async () => {
    await loadFresh();
    seed('loading');
    await store().markCheckInComplete('daily');
    await stoic.flushStoicPracticePersist();

    seed('refused');
    await stoic.flushStoicPracticePersist();
    seed('granted');
    await store().recordPrincipleEngagement('aware_presence', 'daily', 'applied');
    await stoic.flushStoicPracticePersist();

    expect(mockCounts.writes).toBe(1);
    expect(onDisk().checkInCompletions).toEqual([]);
  });
});

describe('fault paths', () => {
  it('a failed load cannot become an empty overwrite while blocked', async () => {
    seedPreWithdrawalBlob();
    const before = mockDisk[KEY];
    mockFaults.readFails = true;
    await loadFresh();
    mockFaults.readFails = false;

    seed('refused');
    await store().markCheckInComplete('daily');
    await stoic.flushStoicPracticePersist();

    expect(mockCounts.writes).toBe(0);
    expect(mockDisk[KEY]).toBe(before);
  });

  it.each<SeededWellnessWriteConsent>(['granted', 'refused', 'loading'])(
    'flush resolves when the write throws (%s)',
    async (state) => {
      await loadFresh();
      seed(state);
      mockFaults.writeFails = true;
      await store().markCheckInComplete('daily');
      await expect(stoic.flushStoicPracticePersist()).resolves.toBeUndefined();
    },
  );

  it('erasure is ungated: resetStore deletes while blocked', async () => {
    seedPreWithdrawalBlob();
    await loadFresh();
    seed('refused');
    await store().resetStore();

    expect(mockCounts.deletes).toBe(1);
    expect(mockDisk[KEY]).toBeUndefined();
  });
});
