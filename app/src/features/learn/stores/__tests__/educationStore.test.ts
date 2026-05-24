/**
 * Education Store regression tests (TEST-19b)
 *
 * Validates round-trip persistence across the 9 sites that call
 * `get().persistState()`. The audit's concern: if AsyncStorage silently
 * fails, users lose Stoic-Mindfulness progress + module-unlock state
 * between sessions. Tests assert mutations land in storage AND survive
 * a "kill in-memory state, reload" cycle.
 *
 * Also covers:
 * - Default state (all 5 modules initialized, none completed)
 * - userId mismatch ignores stored data (security boundary)
 * - Corrupted JSON catch-block doesn't throw (caller swallow)
 */

const mockAsyncStorage: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockAsyncStorage[key] ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockAsyncStorage[key] = value;
    }),
    removeItem: jest.fn(async (key: string) => {
      delete mockAsyncStorage[key];
    }),
  },
}));

let mockUserId = 'test-user-id';
jest.mock('@/core/constants/devMode', () => ({
  getCurrentUserId: () => mockUserId,
}));

import { useEducationStore } from '../educationStore';

const STORAGE_KEY = '@education:state';
const state = () => useEducationStore.getState();

/** Reset zustand back to defaults between tests. */
const resetStore = () => {
  useEducationStore.setState({
    modules: {
      'aware-presence': defaultModuleProgress(),
      'radical-acceptance': defaultModuleProgress(),
      'sphere-sovereignty': defaultModuleProgress(),
      'virtuous-response': defaultModuleProgress(),
      'interconnected-living': defaultModuleProgress(),
    },
    currentModule: null,
    recommendedNext: 'aware-presence',
    dismissedInsightTips: [],
  });
};

function defaultModuleProgress() {
  return {
    status: 'not_started' as const,
    lastAccessedAt: new Date(),
    completedSections: [],
    developmentalStage: null,
    practiceCount: 0,
    reflectionResponses: [],
    optOutFlags: [],
  };
}

describe('educationStore', () => {
  beforeEach(() => {
    mockUserId = 'test-user-id';
    for (const k of Object.keys(mockAsyncStorage)) delete mockAsyncStorage[k];
    resetStore();
  });

  describe('default initialization', () => {
    test('all 5 modules initialized to not_started', () => {
      expect(state().modules['aware-presence'].status).toBe('not_started');
      expect(state().modules['radical-acceptance'].status).toBe('not_started');
      expect(state().modules['sphere-sovereignty'].status).toBe('not_started');
      expect(state().modules['virtuous-response'].status).toBe('not_started');
      expect(state().modules['interconnected-living'].status).toBe('not_started');
    });

    test('recommendedNext defaults to aware-presence for new users', () => {
      expect(state().recommendedNext).toBe('aware-presence');
    });

    test('no insight tips dismissed by default', () => {
      expect(state().dismissedInsightTips).toEqual([]);
      expect(state().isInsightTipDismissed('principle-engagement-beginner')).toBe(false);
    });
  });

  describe('round-trip persistence', () => {
    test('setModuleStatus persists + survives reload', async () => {
      state().setModuleStatus('sphere-sovereignty', 'completed');
      // setModuleStatus calls persistState() internally — wait a tick for it
      await new Promise((r) => setTimeout(r, 10));
      expect(mockAsyncStorage[STORAGE_KEY]).toBeDefined();

      resetStore();
      await state().loadState();
      expect(state().modules['sphere-sovereignty'].status).toBe('completed');
    });

    test('completeSection persists + survives reload', async () => {
      state().completeSection('aware-presence', 'introduction');
      await new Promise((r) => setTimeout(r, 10));
      resetStore();
      await state().loadState();
      expect(state().modules['aware-presence'].completedSections).toContain('introduction');
    });

    test('incrementPracticeCount persists + survives reload', async () => {
      state().incrementPracticeCount('radical-acceptance');
      state().incrementPracticeCount('radical-acceptance');
      state().incrementPracticeCount('radical-acceptance');
      await new Promise((r) => setTimeout(r, 10));
      resetStore();
      await state().loadState();
      expect(state().modules['radical-acceptance'].practiceCount).toBe(3);
    });

    test('setDevelopmentalStage persists + survives reload', async () => {
      state().setDevelopmentalStage('sphere-sovereignty', 'integrating');
      await new Promise((r) => setTimeout(r, 10));
      resetStore();
      await state().loadState();
      expect(state().modules['sphere-sovereignty'].developmentalStage).toBe('integrating');
    });

    test('setCurrentModule persists + survives reload', async () => {
      state().setCurrentModule('virtuous-response');
      await new Promise((r) => setTimeout(r, 10));
      resetStore();
      await state().loadState();
      expect(state().currentModule).toBe('virtuous-response');
    });

    test('dismissInsightTip persists + survives reload', async () => {
      state().dismissInsightTip('principle-engagement-beginner');
      await new Promise((r) => setTimeout(r, 10));
      expect(state().isInsightTipDismissed('principle-engagement-beginner')).toBe(true);
      resetStore();
      await state().loadState();
      expect(state().isInsightTipDismissed('principle-engagement-beginner')).toBe(true);
    });
  });

  describe('security boundaries', () => {
    test('userId mismatch on load ignores stored data', async () => {
      // Write state as user A
      mockUserId = 'user-A';
      state().setModuleStatus('sphere-sovereignty', 'completed');
      await new Promise((r) => setTimeout(r, 10));

      // Reload as user B
      mockUserId = 'user-B';
      resetStore();
      await state().loadState();

      // User B should see defaults, not user A's data
      expect(state().modules['sphere-sovereignty'].status).toBe('not_started');
    });
  });

  describe('persistState error handling', () => {
    test('corrupted JSON in storage is swallowed by loadState (no throw)', async () => {
      mockAsyncStorage[STORAGE_KEY] = '{ not valid json';
      // Should not throw
      await expect(state().loadState()).resolves.toBeUndefined();
      // State remains at defaults
      expect(state().modules['aware-presence'].status).toBe('not_started');
    });

    test('AsyncStorage.setItem rejection is caught (no throw)', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      AsyncStorage.setItem.mockRejectedValueOnce(new Error('disk full'));
      // setModuleStatus triggers persistState which should swallow the throw
      expect(() => state().setModuleStatus('aware-presence', 'in_progress')).not.toThrow();
      await new Promise((r) => setTimeout(r, 10));
      // Reset mock for subsequent tests
      AsyncStorage.setItem.mockImplementation(async (key: string, value: string) => {
        mockAsyncStorage[key] = value;
      });
    });
  });
});
