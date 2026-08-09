/**
 * STOIC PRACTICE STORE UNIT TESTS
 *
 * Tests for Zustand-based Stoic practice state management with encryption.
 * Validates streak tracking, check-in completion, and persistence.
 *
 * TDD Approach: Tests written first, store implemented to pass tests.
 *
 * MAINT-300: the algorithm-assigned developmental-stage field + calc were
 * removed (stages are an educational map, not a computed mechanic). Stage
 * tests were dropped here; legacy-blob rehydration tolerance is covered by
 * stoicPracticeStore.rehydration.test.ts.
 *
 * MAINT-320 / MAINT-371: virtue recording and domain progress are gone from
 * this store entirely — writers first, then the read path and the persisted
 * fields. This suite no longer covers them because they no longer exist; the
 * only remaining obligation is that blobs still carrying those keys rehydrate
 * without crashing, which lives in stoicPracticeStore.rehydration.test.ts.
 *
 * Key Requirements:
 * - Zustand store with persistence
 * - SecureStore encryption for sensitive data
 * - Streak + practice-day tracking
 * - Debounced persistence (PERF-01)
 */

import * as SecureStore from 'expo-secure-store';
import {
  useStoicPracticeStore,
  StoicPracticeState,
  flushStoicPracticePersist,
} from '@/features/practices/stores/stoicPracticeStore';

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
      // MAINT-371 removed virtueInstances / virtueChallenges / domainProgress from
      // state entirely. Asserted absent rather than simply dropped, so a
      // reintroduction has to trip a test rather than sail through.
      expect(state).not.toHaveProperty('virtueInstances');
      expect(state).not.toHaveProperty('virtueChallenges');
      expect(state).not.toHaveProperty('domainProgress');
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
  // exists and that no reachable code path ever invoked in production.
  //
  // MAINT-371 finished the job — the read path they fed is gone too. See the
  // note where 'Data Retrieval' used to sit, below.

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

  /*
   * 'Data Retrieval' (getRecentVirtueInstances) was DELETED by MAINT-371.
   *
   * MAINT-320 kept that accessor alive for one reason, recorded here at the time:
   * exportService read it into `payload.practices.virtues`. MAINT-371 removed that
   * export member (EXPORT_SCHEMA_VERSION 2 -> 3) along with the state it read, so
   * the accessor lost its last consumer and went with them. The suite it had is
   * not replaced — there is nothing left to retrieve.
   *
   * Rehydration tolerance for blobs that STILL carry the removed keys is covered
   * by stoicPracticeStore.rehydration.test.ts, which is also where the
   * persist-then-reload round trip guarding the domainProgress landmine lives.
   */

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
      // The blob deliberately still carries FOUR removed keys — developmentalStage
      // (MAINT-300) plus virtueInstances / virtueChallenges / domainProgress
      // (MAINT-371) — because that is what a real device holds after upgrading.
      // Rehydration must hand-pick the live fields and ignore the rest.
      // Dedicated coverage: stoicPracticeStore.rehydration.test.ts.
      expect(state.totalPracticeDays).toBe(50);
      expect(state.currentStreak).toBe(10);
      expect(state).not.toHaveProperty('virtueInstances');
      expect(state).not.toHaveProperty('domainProgress');
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
