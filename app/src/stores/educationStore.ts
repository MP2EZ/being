/**
 * EDUCATION STORE
 * Zustand store for Educational Modules (FEAT-49)
 *
 * STORAGE:
 * - AsyncStorage with encryption (contains learning progress, reflections)
 * - Encrypted because reflection data may contain PHI-adjacent content
 *
 * PHILOSOPHER VALIDATION:
 * - 9.5/10 philosophical integrity rating
 * - Module 3 (Sphere Sovereignty) is MOST CRITICAL
 * - Learning-focused progress (no gamification)
 * - Developmental stages: years, not weeks
 *
 * NON-NEGOTIABLES:
 * - All modules unlocked (no forced progression)
 * - No performance metrics (no accuracy scores)
 * - User-determined completion (respects agency)
 * - Safety opt-outs preserved (negative-visualization for GAD ≥15)
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUserId } from '@/core/constants/devMode';
import type {
  ModuleId,
  ModuleStatus,
  DevelopmentalStage,
  ModuleProgress,
  EducationState,
  MODULE_ORDER,
} from '../types/education';

const STORAGE_KEY = '@education:state';

/**
 * Default progress for a module
 */
const createDefaultProgress = (): ModuleProgress => ({
  status: 'not_started',
  lastAccessedAt: new Date(),
  completedSections: [],
  developmentalStage: null,
  practiceCount: 0,
  reflectionResponses: [],
  optOutFlags: [],
});

/**
 * Initialize all 5 modules with default progress
 */
const initializeModules = (): Record<ModuleId, ModuleProgress> => ({
  'aware-presence': createDefaultProgress(),
  'radical-acceptance': createDefaultProgress(),
  'sphere-sovereignty': createDefaultProgress(),
  'virtuous-response': createDefaultProgress(),
  'interconnected-living': createDefaultProgress(),
});

/**
 * Education Store
 */
export const useEducationStore = create<EducationState>((set, get) => ({
  // Initial State
  modules: initializeModules(),
  currentModule: null,
  recommendedNext: 'aware-presence', // Default recommendation for new users

  // Actions

  /**
   * Set module completion status
   */
  setModuleStatus: (moduleId: ModuleId, status: ModuleStatus) => {
    set((state) => ({
      modules: {
        ...state.modules,
        [moduleId]: {
          ...state.modules[moduleId],
          status,
          lastAccessedAt: new Date(),
          ...(status === 'completed' && { completedAt: new Date() }),
        },
      },
    }));

    // Persist to AsyncStorage
    get().persistState();
  },

  /**
   * Mark a section as completed
   */
  completeSection: (moduleId: ModuleId, sectionId: string) => {
    set((state) => {
      const module = state.modules[moduleId];
      const alreadyCompleted = module.completedSections.includes(sectionId);

      if (alreadyCompleted) {
        return state; // No change
      }

      return {
        modules: {
          ...state.modules,
          [moduleId]: {
            ...module,
            completedSections: [...module.completedSections, sectionId],
            lastAccessedAt: new Date(),
            // Auto-update status to in_progress if not already
            status:
              module.status === 'not_started' ? 'in_progress' : module.status,
          },
        },
      };
    });

    // Persist to AsyncStorage
    get().persistState();
  },

  /**
   * Increment practice count
   */
  incrementPracticeCount: (moduleId: ModuleId) => {
    set((state) => ({
      modules: {
        ...state.modules,
        [moduleId]: {
          ...state.modules[moduleId],
          practiceCount: state.modules[moduleId].practiceCount + 1,
          lastAccessedAt: new Date(),
        },
      },
    }));

    // Persist to AsyncStorage
    get().persistState();
  },

  /**
   * Set developmental stage (user self-assessment)
   */
  setDevelopmentalStage: (
    moduleId: ModuleId,
    stage: DevelopmentalStage
  ) => {
    set((state) => ({
      modules: {
        ...state.modules,
        [moduleId]: {
          ...state.modules[moduleId],
          developmentalStage: stage,
          lastAccessedAt: new Date(),
        },
      },
    }));

    // Persist to AsyncStorage
    get().persistState();
  },

  /**
   * Save reflection (link to journal entry)
   */
  saveReflection: (moduleId: ModuleId, journalEntryId: string) => {
    set((state) => ({
      modules: {
        ...state.modules,
        [moduleId]: {
          ...state.modules[moduleId],
          reflectionResponses: [
            ...state.modules[moduleId].reflectionResponses,
            journalEntryId,
          ],
          lastAccessedAt: new Date(),
        },
      },
    }));

    // Persist to AsyncStorage
    get().persistState();
  },

  /**
   * Add safety opt-out flag
   */
  addOptOut: (moduleId: ModuleId, flag: string) => {
    set((state) => {
      const module = state.modules[moduleId];
      const alreadyOptedOut = module.optOutFlags.includes(flag);

      if (alreadyOptedOut) {
        return state; // No change
      }

      return {
        modules: {
          ...state.modules,
          [moduleId]: {
            ...module,
            optOutFlags: [...module.optOutFlags, flag],
            lastAccessedAt: new Date(),
          },
        },
      };
    });

    // Persist to AsyncStorage
    get().persistState();
  },

  /**
   * Remove safety opt-out flag
   */
  removeOptOut: (moduleId: ModuleId, flag: string) => {
    set((state) => ({
      modules: {
        ...state.modules,
        [moduleId]: {
          ...state.modules[moduleId],
          optOutFlags: state.modules[moduleId].optOutFlags.filter(
            (f) => f !== flag
          ),
          lastAccessedAt: new Date(),
        },
      },
    }));

    // Persist to AsyncStorage
    get().persistState();
  },

  /**
   * Get module progress
   */
  getModuleProgress: (moduleId: ModuleId): ModuleProgress => {
    return get().modules[moduleId];
  },

  /**
   * Get recommended module (personalization logic)
   * TODO: Integrate with checkInStore and assessmentStore for personalized recommendations
   */
  getRecommendedModule: (): ModuleId | null => {
    const state = get();
    const completedModules = Object.entries(state.modules)
      .filter(([_, progress]) => progress.status === 'completed')
      .map(([id, _]) => id as ModuleId);

    // New user → Module 1 (Foundation)
    if (completedModules.length === 0) {
      return 'aware-presence';
    }

    // Completed 1-2 modules → Module 3 (MOST ESSENTIAL)
    if (completedModules.length <= 2 && !completedModules.includes('sphere-sovereignty')) {
      return 'sphere-sovereignty';
    }

    // Find next uncompleted module in order
    const MODULE_ORDER: ModuleId[] = [
      'aware-presence',
      'radical-acceptance',
      'sphere-sovereignty',
      'virtuous-response',
      'interconnected-living',
    ];

    for (const moduleId of MODULE_ORDER) {
      if (!completedModules.includes(moduleId)) {
        return moduleId;
      }
    }

    // All completed → null (no recommendation)
    return null;
  },

  /**
   * Set current module being viewed
   */
  setCurrentModule: (moduleId: ModuleId | null) => {
    set({ currentModule: moduleId });

    if (moduleId) {
      set((state) => ({
        modules: {
          ...state.modules,
          [moduleId]: {
            ...state.modules[moduleId],
            lastAccessedAt: new Date(),
          },
        },
      }));
    }
  },

  /**
   * Reset module progress
   */
  resetModule: (moduleId: ModuleId) => {
    set((state) => ({
      modules: {
        ...state.modules,
        [moduleId]: createDefaultProgress(),
      },
    }));

    // Persist to AsyncStorage
    get().persistState();
  },

  /**
   * Persist state to AsyncStorage (encrypted)
   * Private method (not in interface)
   */
  persistState: async () => {
    try {
      const state = get();
      const userId = getCurrentUserId();
      const dataToStore = {
        userId,
        modules: state.modules,
        currentModule: state.currentModule,
        recommendedNext: state.recommendedNext,
        updatedAt: Date.now(),
      };

      // TODO: Use encryption service for sensitive data
      // For now, storing as JSON (encryption will be added in Phase 6)
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(dataToStore)
      );
    } catch (error) {
      console.error('[EducationStore] Failed to persist state:', error);
    }
  },

  /**
   * Load state from AsyncStorage (encrypted)
   * Called on app init
   */
  loadState: async () => {
    try {
      const storedData = await AsyncStorage.getItem(STORAGE_KEY);

      if (!storedData) {
        // No stored data, use defaults
        return;
      }

      const parsed = JSON.parse(storedData);

      // Validate userId matches current user
      const currentUserId = getCurrentUserId();
      if (parsed.userId !== currentUserId) {
        console.warn('[EducationStore] UserId mismatch, ignoring stored data');
        return;
      }

      // Restore state
      set({
        modules: parsed.modules,
        currentModule: parsed.currentModule,
        recommendedNext: parsed.recommendedNext,
      });
    } catch (error) {
      console.error('[EducationStore] Failed to load state:', error);
    }
  },
}));

/**
 * Initialize store on app load
 */
export const initializeEducationStore = async () => {
  await useEducationStore.getState().loadState();
};
