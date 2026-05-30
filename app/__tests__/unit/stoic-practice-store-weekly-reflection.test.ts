/**
 * Stoic Practice Store — Weekly Reflection slice tests (FEAT-194)
 *
 * Covers the weeklyReflections slice added in FEAT-194:
 *   - addWeeklyReflection: upsert-by-current-week semantics
 *   - getWeeklyReflectionForWeek selector
 *   - SecureStore persistence round-trip
 *   - Migration from a stored blob without the weeklyReflections key
 */

import * as SecureStore from 'expo-secure-store';
import {
  useStoicPracticeStore,
  flushStoicPracticePersist,
} from '@/features/practices/stores/stoicPracticeStore';
import { getIsoWeekStart } from '@/core/utils';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

describe('StoicPracticeStore — weeklyReflections', () => {
  beforeEach(async () => {
    await useStoicPracticeStore.getState().resetStore();
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('initializes weeklyReflections to an empty array', () => {
      expect(useStoicPracticeStore.getState().weeklyReflections).toEqual([]);
    });
  });

  describe('addWeeklyReflection', () => {
    it('adds a reflection with the current ISO week start', async () => {
      await useStoicPracticeStore.getState().addWeeklyReflection('Noticed less reactivity at work.');

      const reflections = useStoicPracticeStore.getState().weeklyReflections;
      expect(reflections).toHaveLength(1);
      expect(reflections[0]?.text).toBe('Noticed less reactivity at work.');
      expect(reflections[0]?.weekStartIso).toBe(getIsoWeekStart());
      expect(reflections[0]?.id).toBeTruthy();
      expect(reflections[0]?.savedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('upserts when called twice in the same ISO week (same id, replaced text)', async () => {
      await useStoicPracticeStore.getState().addWeeklyReflection('First draft.');
      const firstId = useStoicPracticeStore.getState().weeklyReflections[0]?.id;

      await useStoicPracticeStore.getState().addWeeklyReflection('Second draft, more refined.');

      const reflections = useStoicPracticeStore.getState().weeklyReflections;
      expect(reflections).toHaveLength(1);
      expect(reflections[0]?.id).toBe(firstId);
      expect(reflections[0]?.text).toBe('Second draft, more refined.');
    });
  });

  describe('getWeeklyReflectionForWeek', () => {
    it('returns undefined when no reflection exists for the given week', () => {
      const result = useStoicPracticeStore.getState().getWeeklyReflectionForWeek('2026-05-25');
      expect(result).toBeUndefined();
    });

    it('returns the reflection matching the requested week', async () => {
      await useStoicPracticeStore.getState().addWeeklyReflection('This week I noticed.');

      const currentWeek = getIsoWeekStart();
      const result = useStoicPracticeStore.getState().getWeeklyReflectionForWeek(currentWeek);
      expect(result?.text).toBe('This week I noticed.');
    });
  });

  describe('persistence', () => {
    it('round-trips weeklyReflections through SecureStore', async () => {
      let written: string | null = null;
      (SecureStore.setItemAsync as jest.Mock).mockImplementation(async (_k, v) => {
        written = v;
      });

      await useStoicPracticeStore.getState().addWeeklyReflection('Persisted thought.');
      await flushStoicPracticePersist();

      expect(written).toBeTruthy();
      const parsed = JSON.parse(written as unknown as string);
      expect(parsed.weeklyReflections).toHaveLength(1);
      expect(parsed.weeklyReflections[0].text).toBe('Persisted thought.');

      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(written);
      await useStoicPracticeStore.getState().resetStore();
      await useStoicPracticeStore.getState().loadPersistedState();

      expect(useStoicPracticeStore.getState().weeklyReflections).toHaveLength(1);
      expect(useStoicPracticeStore.getState().weeklyReflections[0]?.text).toBe('Persisted thought.');
    });

    it('migrates an existing blob without weeklyReflections to an empty array', async () => {
      const legacyBlob = JSON.stringify({
        developmentalStage: 'fragmented',
        practiceStartDate: null,
        totalPracticeDays: 0,
        currentStreak: 0,
        longestStreak: 0,
        virtueInstances: [],
        virtueChallenges: [],
        checkInCompletions: [],
        principleEngagements: [],
        domainProgress: {
          work: { domain: 'work', practiceInstances: 0, principlesApplied: [], lastPracticeDate: null },
          relationships: { domain: 'relationships', practiceInstances: 0, principlesApplied: [], lastPracticeDate: null },
          adversity: { domain: 'adversity', practiceInstances: 0, principlesApplied: [], lastPracticeDate: null },
        },
        // weeklyReflections intentionally absent
      });

      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(legacyBlob);

      await useStoicPracticeStore.getState().loadPersistedState();

      expect(useStoicPracticeStore.getState().weeklyReflections).toEqual([]);
    });
  });
});
