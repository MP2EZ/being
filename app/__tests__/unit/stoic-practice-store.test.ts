/**
 * STOIC PRACTICE STORE UNIT TESTS
 *
 * Tests for Zustand-based Stoic practice state management with encryption.
 * Validates developmental stage tracking, domain progress, and virtue recording.
 *
 * TDD Approach: Tests written first, store implemented to pass tests.
 *
 * Key Requirements:
 * - Zustand store with persistence
 * - SecureStore encryption for sensitive data
 * - Developmental stage calculation (4 metrics)
 * - Domain progress tracking
 * - Virtue instance/challenge recording
 */

import * as SecureStore from 'expo-secure-store';
import {
  useStoicPracticeStore,
  StoicPracticeState,
} from '../../src/stores/stoicPracticeStore';
import type {
  CardinalVirtue,
  DevelopmentalStage,
  PracticeDomain,
  VirtueInstance,
  VirtueChallenge,
} from '../../src/types/stoic';

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

      expect(state.developmentalStage).toBe('fragmented');
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

  describe('Virtue Instance Recording', () => {
    it('should add a virtue instance and update domain progress', async () => {
      const store = useStoicPracticeStore.getState();

      const instance: Omit<VirtueInstance, 'id' | 'timestamp'> = {
        virtue: 'wisdom',
        context: 'Paused before reacting to criticism',
        domain: 'work',
        principleApplied: 'principle_2',
      };

      await store.addVirtueInstance(instance);

      const updatedState = useStoicPracticeStore.getState();
      expect(updatedState.virtueInstances).toHaveLength(1);
      expect(updatedState.virtueInstances[0].virtue).toBe('wisdom');
      expect(updatedState.virtueInstances[0].id).toBeTruthy();
      expect(updatedState.virtueInstances[0].timestamp).toBeInstanceOf(Date);

      // Domain progress should update
      expect(updatedState.domainProgress.work.practiceInstances).toBe(1);
      expect(updatedState.domainProgress.work.principlesApplied).toContain('principle_2');
      expect(updatedState.domainProgress.work.lastPracticeDate).toBeInstanceOf(Date);
    });

    it('should handle multiple virtue instances across domains', async () => {
      const store = useStoicPracticeStore.getState();

      await store.addVirtueInstance({
        virtue: 'wisdom',
        context: 'Work context',
        domain: 'work',
        principleApplied: 'principle_1',
      });
      await store.addVirtueInstance({
        virtue: 'courage',
        context: 'Relationship context',
        domain: 'relationships',
        principleApplied: 'principle_2',
      });
      await store.addVirtueInstance({
        virtue: 'temperance',
        context: 'Adversity context',
        domain: 'adversity',
        principleApplied: null,
      });

      const state = useStoicPracticeStore.getState();
      expect(state.virtueInstances).toHaveLength(3);
      expect(state.domainProgress.work.practiceInstances).toBe(1);
      expect(state.domainProgress.relationships.practiceInstances).toBe(1);
      expect(state.domainProgress.adversity.practiceInstances).toBe(1);
    });

    it('should persist virtue instances to SecureStore (encrypted)', async () => {
      const store = useStoicPracticeStore.getState();

      await store.addVirtueInstance({
        virtue: 'wisdom',
        context: 'Test',
        domain: 'work',
        principleApplied: null,
      });

      // Should call SecureStore.setItemAsync to encrypt and persist
      expect(SecureStore.setItemAsync).toHaveBeenCalled();
    });
  });

  describe('Virtue Challenge Recording', () => {
    it('should add a virtue challenge with required self-compassion', async () => {
      const store = useStoicPracticeStore.getState();

      const challenge: Omit<VirtueChallenge, 'id' | 'timestamp'> = {
        situation: 'Reacted defensively to feedback',
        virtueViolated: 'wisdom',
        whatICouldHaveDone: 'Paused and listened',
        triggerIdentified: 'Felt criticized',
        whatWillIPractice: 'Pause before responding',
        selfCompassion: 'I\'m learning. This is hard.',
      };

      await store.addVirtueChallenge(challenge);

      const state = useStoicPracticeStore.getState();
      expect(state.virtueChallenges).toHaveLength(1);
      expect(state.virtueChallenges[0].situation).toBe('Reacted defensively to feedback');
      expect(state.virtueChallenges[0].selfCompassion).toBe('I\'m learning. This is hard.');
      expect(state.virtueChallenges[0].id).toBeTruthy();
      expect(state.virtueChallenges[0].timestamp).toBeInstanceOf(Date);
    });

    it('should persist virtue challenges to SecureStore (encrypted)', async () => {
      const store = useStoicPracticeStore.getState();

      await store.addVirtueChallenge({
        situation: 'Test',
        virtueViolated: 'wisdom',
        whatICouldHaveDone: 'Test',
        triggerIdentified: null,
        whatWillIPractice: 'Test',
        selfCompassion: 'Test',
      });

      expect(SecureStore.setItemAsync).toHaveBeenCalled();
    });
  });

  describe('Domain Progress Tracking', () => {
    it('should update domain progress when principles are applied', async () => {
      const store = useStoicPracticeStore.getState();

      await store.addVirtueInstance({
        virtue: 'wisdom',
        context: 'Test 1',
        domain: 'work',
        principleApplied: 'principle_1',
      });
      await store.addVirtueInstance({
        virtue: 'courage',
        context: 'Test 2',
        domain: 'work',
        principleApplied: 'principle_2',
      });
      await store.addVirtueInstance({
        virtue: 'justice',
        context: 'Test 3',
        domain: 'work',
        principleApplied: 'principle_1', // Duplicate principle
      });

      const state = useStoicPracticeStore.getState();
      const workProgress = state.domainProgress.work;
      expect(workProgress.practiceInstances).toBe(3);
      expect(workProgress.principlesApplied).toHaveLength(2); // Only unique principles
      expect(workProgress.principlesApplied).toContain('principle_1');
      expect(workProgress.principlesApplied).toContain('principle_2');
    });

    it('should track cross-domain integration', async () => {
      const store = useStoicPracticeStore.getState();

      // Practice in all 3 domains
      await store.addVirtueInstance({
        virtue: 'wisdom',
        context: 'Work',
        domain: 'work',
        principleApplied: 'principle_1',
      });
      await store.addVirtueInstance({
        virtue: 'courage',
        context: 'Relationship',
        domain: 'relationships',
        principleApplied: 'principle_2',
      });
      await store.addVirtueInstance({
        virtue: 'temperance',
        context: 'Adversity',
        domain: 'adversity',
        principleApplied: 'principle_3',
      });

      const state = useStoicPracticeStore.getState();
      expect(state.domainProgress.work.practiceInstances).toBeGreaterThan(0);
      expect(state.domainProgress.relationships.practiceInstances).toBeGreaterThan(0);
      expect(state.domainProgress.adversity.practiceInstances).toBeGreaterThan(0);
    });
  });

  describe('Developmental Stage Tracking', () => {
    it('should start at fragmented stage', () => {
      const state = useStoicPracticeStore.getState();
      expect(state.developmentalStage).toBe('fragmented');
    });

    it('should calculate stage based on 4 metrics', async () => {
      const store = useStoicPracticeStore.getState();

      // Metric 1: Practice consistency (streak)
      // Metric 2: Principle repertoire (unique principles applied)
      // Metric 3: Cross-domain integration (practice in multiple domains)
      // Metric 4: Depth of practice (time in practice)

      // Simulate consistent practice over time
      for (let i = 0; i < 20; i++) {
        await store.addVirtueInstance({
          virtue: 'wisdom',
          context: `Practice ${i}`,
          domain: i % 3 === 0 ? 'work' : i % 3 === 1 ? 'relationships' : 'adversity',
          principleApplied: `principle_${(i % 10) + 1}`,
        });
      }

      // Set practice start date to 8 months ago (effortful stage range)
      store.setPracticeStartDate(
        new Date(Date.now() - 8 * 30 * 24 * 60 * 60 * 1000)
      );

      // Update streak to simulate consistency
      store.updateStreak(30); // 30 day streak

      // Set total practice days
      for (let i = 0; i < 200; i++) {
        await store.incrementPracticeDays();
      }

      const state = useStoicPracticeStore.getState();
      // Should advance to effortful stage (6-18 months + consistent practice)
      expect(state.developmentalStage).toBe('effortful');
    });

    it('should allow manual developmental stage override', () => {
      const store = useStoicPracticeStore.getState();

      store.setDevelopmentalStage('fluid');

      const state = useStoicPracticeStore.getState();
      expect(state.developmentalStage).toBe('fluid');
    });
  });

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
    it('should retrieve virtue instances by domain', async () => {
      const store = useStoicPracticeStore.getState();

      await store.addVirtueInstance({
        virtue: 'wisdom',
        context: 'Work context',
        domain: 'work',
        principleApplied: 'principle_1',
      });
      await store.addVirtueInstance({
        virtue: 'courage',
        context: 'Relationship context',
        domain: 'relationships',
        principleApplied: 'principle_2',
      });

      const workInstances = store.getVirtueInstancesByDomain('work');
      expect(workInstances).toHaveLength(1);
      expect(workInstances[0].domain).toBe('work');
    });

    it('should retrieve virtue instances by virtue', async () => {
      const store = useStoicPracticeStore.getState();

      await store.addVirtueInstance({
        virtue: 'wisdom',
        context: 'Context 1',
        domain: 'work',
        principleApplied: null,
      });
      await store.addVirtueInstance({
        virtue: 'wisdom',
        context: 'Context 2',
        domain: 'relationships',
        principleApplied: null,
      });
      await store.addVirtueInstance({
        virtue: 'courage',
        context: 'Context 3',
        domain: 'work',
        principleApplied: null,
      });

      const wisdomInstances = store.getVirtueInstancesByVirtue('wisdom');
      expect(wisdomInstances).toHaveLength(2);
      expect(wisdomInstances.every(i => i.virtue === 'wisdom')).toBe(true);
    });

    it('should retrieve recent virtue instances (last 7 days)', async () => {
      const store = useStoicPracticeStore.getState();

      await store.addVirtueInstance({
        virtue: 'wisdom',
        context: 'Old',
        domain: 'work',
        principleApplied: null,
      });

      const state = useStoicPracticeStore.getState();
      // Manually set timestamp to old date
      const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      state.virtueInstances[0].timestamp = oldDate;

      await store.addVirtueInstance({
        virtue: 'courage',
        context: 'Recent',
        domain: 'work',
        principleApplied: null,
      });

      const recentInstances = store.getRecentVirtueInstances(7);
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
      expect(state.developmentalStage).toBe('effortful');
      expect(state.totalPracticeDays).toBe(50);
      expect(state.virtueInstances).toHaveLength(1);
    });

    it('should persist state changes to SecureStore', async () => {
      const store = useStoicPracticeStore.getState();

      await store.addVirtueInstance({
        virtue: 'wisdom',
        context: 'Test',
        domain: 'work',
        principleApplied: null,
      });

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

      await store.addVirtueInstance({
        virtue: 'wisdom',
        context: 'Test',
        domain: 'work',
        principleApplied: null,
      });

      const state = useStoicPracticeStore.getState();
      // Should not throw error, should log error
      expect(state.virtueInstances).toHaveLength(1); // State updated locally
    });
  });

  describe('Store Reset', () => {
    it('should reset store to initial state', async () => {
      const store = useStoicPracticeStore.getState();

      // Add some data
      await store.addVirtueInstance({
        virtue: 'wisdom',
        context: 'Test',
        domain: 'work',
        principleApplied: null,
      });
      store.updateStreak(10);

      // Reset
      await store.resetStore();

      const state = useStoicPracticeStore.getState();
      expect(state.virtueInstances).toHaveLength(0);
      expect(state.currentStreak).toBe(0);
      expect(state.developmentalStage).toBe('fragmented');
    });

    it('should clear SecureStore on reset', async () => {
      const store = useStoicPracticeStore.getState();

      await store.resetStore();

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('stoic_practice_state');
    });
  });
});
