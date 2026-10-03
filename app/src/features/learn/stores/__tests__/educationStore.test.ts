/**
 * Education Store tests
 *
 * The store is in-memory only (DEBUG-672): it used to write a plaintext
 * `@education:state` blob that nothing ever read back, so TEST-19b's round-trip
 * suite was asserting persistence no user benefited from. What remains worth
 * pinning is the in-session behaviour every Learn surface reads, and that no
 * action touches storage. The privacy-lane pin on writes is
 * `__tests__/privacy/educationStore.wellnessWriteGate.privacy.test.ts`.
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

import { useEducationStore } from '../educationStore';

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

  describe('in-session state', () => {
    test('setModuleStatus records the status and a completion time', () => {
      state().setModuleStatus('sphere-sovereignty', 'completed');
      expect(state().modules['sphere-sovereignty'].status).toBe('completed');
      expect(state().modules['sphere-sovereignty'].completedAt).toBeInstanceOf(Date);
    });

    test('completeSection adds a section once and moves the module to in_progress', () => {
      state().completeSection('aware-presence', 'introduction');
      state().completeSection('aware-presence', 'introduction');
      expect(state().modules['aware-presence'].completedSections).toEqual(['introduction']);
      expect(state().modules['aware-presence'].status).toBe('in_progress');
    });

    test('incrementPracticeCount counts in memory', () => {
      state().incrementPracticeCount('radical-acceptance');
      state().incrementPracticeCount('radical-acceptance');
      state().incrementPracticeCount('radical-acceptance');
      expect(state().modules['radical-acceptance'].practiceCount).toBe(3);
    });

    test('setCurrentModule tracks the module being viewed', () => {
      state().setCurrentModule('virtuous-response');
      expect(state().currentModule).toBe('virtuous-response');
    });

    test('dismissInsightTip holds for the session', () => {
      state().dismissInsightTip('principle-engagement-beginner');
      expect(state().isInsightTipDismissed('principle-engagement-beginner')).toBe(true);
    });

    test('resetModule restores default progress', () => {
      state().incrementPracticeCount('aware-presence');
      state().completeSection('aware-presence', 'introduction');
      state().resetModule('aware-presence');
      expect(state().modules['aware-presence'].practiceCount).toBe(0);
      expect(state().modules['aware-presence'].completedSections).toEqual([]);
    });
  });

  describe('getRecommendedModule', () => {
    test('a new user is pointed at aware-presence', () => {
      expect(state().getRecommendedModule()).toBe('aware-presence');
    });

    test('after one module, sphere-sovereignty comes next', () => {
      state().setModuleStatus('aware-presence', 'completed');
      expect(state().getRecommendedModule()).toBe('sphere-sovereignty');
    });

    test('all completed yields no recommendation', () => {
      for (const id of ['aware-presence', 'radical-acceptance', 'sphere-sovereignty', 'virtuous-response', 'interconnected-living'] as const) {
        state().setModuleStatus(id, 'completed');
      }
      expect(state().getRecommendedModule()).toBeNull();
    });
  });

  test('no action writes to storage (DEBUG-672)', async () => {
    state().setModuleStatus('sphere-sovereignty', 'completed');
    state().completeSection('aware-presence', 'introduction');
    state().incrementPracticeCount('radical-acceptance');
    state().setCurrentModule('virtuous-response');
    state().dismissInsightTip('principle-engagement-beginner');
    await new Promise((r) => setTimeout(r, 10));
    expect(mockAsyncStorage).toEqual({});
  });
});
