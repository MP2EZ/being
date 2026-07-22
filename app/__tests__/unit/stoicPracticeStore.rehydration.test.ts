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
import { useStoicPracticeStore } from '@/features/practices/stores/stoicPracticeStore';

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
    expect(state.domainProgress.work.practiceInstances).toBe(1);
    expect(state.isLoading).toBe(false);

    // The removed field is never resurrected onto state.
    expect((state as Record<string, unknown>).developmentalStage).toBeUndefined();
  });
});
