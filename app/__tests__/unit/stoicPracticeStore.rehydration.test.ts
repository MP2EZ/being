/**
 * STOIC PRACTICE STORE — LEGACY REHYDRATION TOLERANCE (MAINT-300)
 *
 * MAINT-300 removes the algorithm-assigned `developmentalStage` field (and its
 * calc) from the store. Existing users still have persisted SecureStore blobs
 * that carry a `developmentalStage` key. Rehydration must tolerate that stale
 * key: ignore/strip it, never crash, and still restore the real fields.
 *
 * The tolerance is structural — loadFromSecureStore hand-picks known keys from
 * the parsed blob (it never spreads ...parsed), so a removed key is simply
 * never read. This test pins that contract so a future refactor to a
 * spread-based rehydrate can't silently reintroduce the field.
 *
 * PLACEMENT: __tests__/unit/ so it is gated by `npm run test:unit`.
 */

import * as SecureStore from 'expo-secure-store';
import {
  useStoicPracticeStore,
  flushStoicPracticePersist,
} from '@/features/practices/stores/stoicPracticeStore';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

describe('StoicPracticeStore — legacy developmentalStage rehydration (MAINT-300)', () => {
  beforeEach(async () => {
    await useStoicPracticeStore.getState().resetStore();
    jest.clearAllMocks();
  });

  it('rehydrates a legacy blob still carrying developmentalStage without crashing, ignoring the stale key', async () => {
    // A pre-MAINT-300 persisted payload: still has the removed field.
    const legacyBlob = JSON.stringify({
      developmentalStage: 'integrated', // removed field — must be silently ignored
      practiceStartDate: null,
      totalPracticeDays: 42,
      currentStreak: 3,
      longestStreak: 9,
      virtueInstances: [],
      virtueChallenges: [],
      checkInCompletions: [],
      principleEngagements: [],
      weeklyReflections: [],
      domainProgress: {
        work: { domain: 'work', practiceInstances: 1, principlesApplied: [], lastPracticeDate: null },
        relationships: { domain: 'relationships', practiceInstances: 0, principlesApplied: [], lastPracticeDate: null },
        adversity: { domain: 'adversity', practiceInstances: 0, principlesApplied: [], lastPracticeDate: null },
      },
    });
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(legacyBlob);

    // Must resolve (no crash / no migration failure).
    await expect(useStoicPracticeStore.getState().loadPersistedState()).resolves.toBeUndefined();

    const state = useStoicPracticeStore.getState();

    // Real fields rehydrate intact.
    expect(state.totalPracticeDays).toBe(42);
    expect(state.currentStreak).toBe(3);
    expect(state.longestStreak).toBe(9);
    expect(state.isLoading).toBe(false);

    // Removed fields are never resurrected onto state. `developmentalStage` went
    // in MAINT-300; MAINT-371 added the three below. The blob above still carries
    // all of them, which is the point — this fixture is the stale-key tolerance
    // proof for both items at once.
    expect((state as Record<string, unknown>).developmentalStage).toBeUndefined();
    expect((state as Record<string, unknown>).virtueInstances).toBeUndefined();
    expect((state as Record<string, unknown>).virtueChallenges).toBeUndefined();
    expect((state as Record<string, unknown>).domainProgress).toBeUndefined();
  });

  /**
   * MAINT-371 landmine regression — PERSIST-THEN-RELOAD ROUND TRIP.
   *
   * This must be a round trip, not a single load. `loadFromSecureStore` used to
   * dereference `parsed.domainProgress.work` with NO optional chaining while every
   * sibling key used `?.`. Removing the writer without the reader would make every
   * load throw -> the outer catch swallows it -> `loadPersistedState` returns null
   * -> the next `schedulePersist()` overwrites the user's REAL `checkInCompletions`
   * and `principleEngagements` with initial state.
   *
   * The failure is invisible on the first post-upgrade launch, because the key is
   * still on disk from the old build. It lands on the SECOND launch, after one
   * persist has run. A single-load assertion passes straight through it — which is
   * exactly why this test reloads after persisting.
   */
  it('a blob WITHOUT domainProgress round-trips without wiping real practice data', async () => {
    // A prior check-in, in the real CheckInCompletion shape ({ type, completedAt,
    // date }). Three constraints, each of which this fixture got wrong at least once:
    //  1. Correctly shaped, or rehydration drops it and the assertion measures the
    //     fixture instead of the behaviour.
    //  2. Inside the 90-day window, or `cleanOldCheckInCompletions` prunes it.
    //  3. Not on TODAY's local date, or `markCheckInComplete`'s same-type-same-day
    //     dedupe replaces it and the assertion passes for the wrong reason.
    //
    // The date MUST be built with the same LOCAL-tz basis the store uses
    // (`toLocalDateString`). `toISOString().slice(0,10)` is UTC and silently lands a
    // day ahead for most of the US evening — which made "yesterday" resolve to
    // today's local date and quietly defeated constraint 3.
    const priorDay = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const ymd = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const postRemovalBlob = JSON.stringify({
      version: 2,
      totalPracticeDays: 42,
      currentStreak: 3,
      longestStreak: 9,
      checkInCompletions: [
        { type: 'daily', completedAt: priorDay.toISOString(), date: ymd(priorDay) },
      ],
      principleEngagements: [
        {
          principle: 'sphere_sovereignty',
          flowType: 'morning',
          engagementType: 'selected',
          date: ymd(priorDay),
          timestamp: priorDay.toISOString(),
        },
      ],
      weeklyReflections: [],
      // NOTE: no domainProgress / virtueInstances / virtueChallenges — this is the
      // shape a build after MAINT-371 writes.
    });
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(postRemovalBlob);

    // First load: must not throw, and must not silently fall back to initial state.
    await expect(useStoicPracticeStore.getState().loadPersistedState()).resolves.toBeUndefined();
    const afterFirstLoad = useStoicPracticeStore.getState();
    expect(afterFirstLoad.totalPracticeDays).toBe(42);
    expect(afterFirstLoad.checkInCompletions).toHaveLength(1);
    expect(afterFirstLoad.principleEngagements).toHaveLength(1);

    // Now drive a REAL mutation and let the debounced write flush, then read back
    // what actually hit disk. This is the second launch: the user does one ordinary
    // thing, `schedulePersist()` fires, and whatever is in memory becomes the new
    // truth on disk. If the load above had thrown and returned null, memory would
    // hold initial state and this write would silently destroy 42 practice days and
    // both history arrays — with no error anywhere, because the catch swallowed it.
    const setItem = SecureStore.setItemAsync as jest.Mock;
    setItem.mockClear();
    await useStoicPracticeStore.getState().markCheckInComplete('daily');
    await flushStoicPracticePersist();

    expect(setItem).toHaveBeenCalled();
    const written = JSON.parse(setItem.mock.calls.at(-1)![1] as string);

    // Pre-existing history survived the round trip — this is the actual assertion.
    expect(written.totalPracticeDays).toBe(42);
    expect(written.principleEngagements).toHaveLength(1);
    // The rehydrated check-in is still there by DATE, not merely by count — a count
    // assertion would also pass if the new completion had replaced the old one.
    expect(
      written.checkInCompletions.map((c: { date: string }) => c.date),
    ).toContain(ymd(priorDay));

    // And the removed keys are not re-emitted.
    expect(written.domainProgress).toBeUndefined();
    expect(written.virtueInstances).toBeUndefined();
    expect(written.virtueChallenges).toBeUndefined();
  });
});
