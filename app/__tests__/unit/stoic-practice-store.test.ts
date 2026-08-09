/**
 * STOIC PRACTICE STORE UNIT TESTS
 *
 * Tests for Zustand-based Stoic practice state management with encryption.
 * Validates domain progress, streak tracking, and virtue recording.
 *
 * TDD Approach: Tests written first, store implemented to pass tests.
 *
 * MAINT-300: the algorithm-assigned developmental-stage field + calc were
 * removed (stages are an educational map, not a computed mechanic). Stage
 * tests were dropped here; legacy-blob rehydration tolerance is covered by
 * stoicPracticeStore.rehydration.test.ts.
 *
 * Key Requirements:
 * - Zustand store with persistence
 * - SecureStore encryption for sensitive data
 * - Domain progress tracking
 * - Virtue instance/challenge recording
 */

import * as SecureStore from 'expo-secure-store';
import {
  useStoicPracticeStore,
  StoicPracticeState,
  flushStoicPracticePersist,
} from '@/features/practices/stores/stoicPracticeStore';
import type {
  CardinalVirtue,
  PracticeDomain,
  VirtueInstance,
  VirtueChallenge,
} from '@/features/practices/types/stoic';

// Mock SecureStore
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

describe('StoicPracticeStore', () => {
  beforeEach(async () => {
    // Clear store state before each test
    await useStoicPracticeStore.getState().resetStore();
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with default state', () => {
      const state = useStoicPracticeStore.getState();

      expect(state.practiceStartDate).toBeNull();
      expect(state.totalPracticeDays).toBe(0);
      expect(state.currentStreak).toBe(0);
      expect(state.longestStreak).toBe(0);
      expect(state.virtueInstances).toEqual([]);
      expect(state.virtueChallenges).toEqual([]);
      expect(state.domainProgress).toEqual({
        work: { domain: 'work', practiceInstances: 0, principlesApplied: [], lastPracticeDate: null },
        relationships: { domain: 'relationships', practiceInstances: 0, principlesApplied: [], lastPracticeDate: null },
        adversity: { domain: 'adversity', practiceInstances: 0, principlesApplied: [], lastPracticeDate: null },
      });
    });

    it('should track isLoading state during initialization', () => {
      const state = useStoicPracticeStore.getState();
      expect(state.isLoading).toBe(false);
    });
  });

  // MAINT-320: 'Virtue Instance Recording', 'Virtue Challenge Recording' and
  // 'Domain Progress Tracking' were deleted with the writers they exercised
  // (addVirtueInstance / addVirtueChallenge / updateDomainProgressForInstance).
  // They are not re-homed anywhere: they asserted behaviour that no longer
  // exists and that no reachable code path ever invoked in production. Coverage
  // of the surviving read path lives in 'Data Retrieval' below.

  describe('Practice Streak Tracking', () => {
    it('should track current streak', () => {
      const store = useStoicPracticeStore.getState();

      store.updateStreak(5);

      const state = useStoicPracticeStore.getState();
      expect(state.currentStreak).toBe(5);
    });

    it('should track longest streak', () => {
      const store = useStoicPracticeStore.getState();

      store.updateStreak(10);
      store.updateStreak(5); // Streak broke, but longest preserved

      const state = useStoicPracticeStore.getState();
      expect(state.currentStreak).toBe(5);
      expect(state.longestStreak).toBe(10);
    });

    it('should increment total practice days', async () => {
      const store = useStoicPracticeStore.getState();

      await store.incrementPracticeDays();

      const state = useStoicPracticeStore.getState();
      expect(state.totalPracticeDays).toBe(1);
    });
  });

  describe('Data Retrieval', () => {
    // MAINT-320: getVirtueInstancesByDomain / getVirtueInstancesByVirtue are
    // gone (no callers, ever). getRecentVirtueInstances SURVIVES because
    // exportService reads it into payload.practices.virtues, so it keeps
    // coverage — but seeded via rehydration, which is now the only way a record
    // can reach this state at all. That is the honest shape of the contract.
    it('should retrieve recent virtue instances (last 7 days) from rehydrated state', async () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      const yesterday = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);

      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(
        JSON.stringify({
          virtueInstances: [
            {
              id: 'old',
              virtue: 'wisdom',
              context: 'Old',
              domain: 'work',
              principleApplied: null,
              timestamp: tenDaysAgo.toISOString(),
            },
            {
              id: 'recent',
              virtue: 'courage',
              context: 'Recent',
              domain: 'work',
              principleApplied: null,
              timestamp: yesterday.toISOString(),
            },
          ],
          virtueChallenges: [],
          // domainProgress is REQUIRED in any fixture blob, and its absence is
          // not a cosmetic omission. loadFromSecureStore reads every other key
          // with `?.` but dereferences `parsed.domainProgress.work` (and
          // .relationships / .adversity) unguarded. A blob without it throws,
          // the outer catch swallows the throw, and loadPersistedState silently
          // returns null — leaving the store at initial state, with an empty
          // array here rather than a failure anyone can see.
          //
          // ⚠️  MAINT-371 (removing domainProgress) MUST add the optional
          // chaining first. Dropping the key from the WRITER while the READER
          // still dereferences it unguarded would make every subsequent load
          // throw, and the next schedulePersist() would then overwrite the
          // user's real checkInCompletions / principleEngagements with initial
          // state. This is the one place that failure mode is visible.
          domainProgress: {
            work: { domain: 'work', practiceInstances: 0, principlesApplied: [], lastPracticeDate: null },
            relationships: { domain: 'relationships', practiceInstances: 0, principlesApplied: [], lastPracticeDate: null },
            adversity: { domain: 'adversity', practiceInstances: 0, principlesApplied: [], lastPracticeDate: null },
          },
        })
      );

      await useStoicPracticeStore.getState().loadPersistedState();

      const recentInstances = useStoicPracticeStore.getState().getRecentVirtueInstances(7);
      expect(recentInstances).toHaveLength(1);
      expect(recentInstances[0].context).toBe('Recent');
    });
  });

  describe('Persistence and Encryption', () => {
    it('should load persisted state from SecureStore on initialization', async () => {
      const mockPersistedData = JSON.stringify({
        developmentalStage: 'effortful',
        totalPracticeDays: 50,
        currentStreak: 10,
        longestStreak: 15,
        virtueInstances: [
          {
            id: '1',
            virtue: 'wisdom',
            context: 'Test',
            domain: 'work',
            principleApplied: null,
            timestamp: new Date().toISOString(),
          },
        ],
        virtueChallenges: [],
        domainProgress: {
          work: { domain: 'work', practiceInstances: 1, principlesApplied: [], lastPracticeDate: new Date().toISOString() },
          relationships: { domain: 'relationships', practiceInstances: 0, principlesApplied: [], lastPracticeDate: null },
          adversity: { domain: 'adversity', practiceInstances: 0, principlesApplied: [], lastPracticeDate: null },
        },
      });

      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(mockPersistedData);

      const store = useStoicPracticeStore.getState();
      await store.loadPersistedState();

      const state = useStoicPracticeStore.getState();
      // developmentalStage is a legacy key in the blob (MAINT-300 removed the
      // field); rehydration ignores it. Dedicated coverage:
      // stoicPracticeStore.rehydration.test.ts.
      expect(state.totalPracticeDays).toBe(50);
      expect(state.virtueInstances).toHaveLength(1);
    });

    it('should persist state changes to SecureStore', async () => {
      const store = useStoicPracticeStore.getState();

      await store.markCheckInComplete('daily');

      await flushStoicPracticePersist();

      // Should call SecureStore.setItemAsync with encrypted data
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'stoic_practice_state',
        expect.any(String)
      );
    });

    it('should handle SecureStore errors gracefully', async () => {
      (SecureStore.setItemAsync as jest.Mock).mockRejectedValueOnce(
        new Error('SecureStore error')
      );

      const store = useStoicPracticeStore.getState();

      await store.markCheckInComplete('daily');

      await flushStoicPracticePersist();

      const state = useStoicPracticeStore.getState();
      // Should not throw; the local mutation still stands even though the
      // write failed.
      expect(state.checkInCompletions).toHaveLength(1);
    });

    it('PERF-01: debounces multiple mutations into a single SecureStore write', async () => {
      const store = useStoicPracticeStore.getState();
      (SecureStore.setItemAsync as jest.Mock).mockClear();

      // Three rapid mutations within the 500ms debounce window. MAINT-320
      // swapped the vehicle from addVirtueInstance to surviving mutations; the
      // count is deliberately still three, because collapsing a BURST is the
      // property under test and a single mutation would not test it.
      await store.recordPrincipleEngagement('aware_presence', 'daily', 'selected');
      await store.recordPrincipleEngagement('radical_acceptance', 'daily', 'applied');
      await store.incrementPracticeDays();

      // Before flush: writes are scheduled but haven't fired yet
      expect(SecureStore.setItemAsync).not.toHaveBeenCalled();

      // Flush coalesces into one write of the latest state
      await flushStoicPracticePersist();

      expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('Store Reset', () => {
    it('should reset store to initial state', async () => {
      const store = useStoicPracticeStore.getState();

      // Dirty the store with surviving mutations (MAINT-320: was addVirtueInstance).
      await store.markCheckInComplete('daily');
      store.updateStreak(10);

      // Reset
      await store.resetStore();

      const state = useStoicPracticeStore.getState();
      expect(state.checkInCompletions).toHaveLength(0);
      expect(state.currentStreak).toBe(0);
    });

    it('should clear SecureStore on reset', async () => {
      const store = useStoicPracticeStore.getState();

      await store.resetStore();

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('stoic_practice_state');
    });
  });
});
