/**
 * EDUCATION STORE
 * Zustand store for Educational Modules (FEAT-49)
 *
 * STORAGE:
 * - In-memory only, never persisted (DEBUG-672). It used to write a plaintext
 *   `@education:state` blob that nothing read back; the legacy key is purged at
 *   launch (`legacyPlaintextRecordSweeper`) and on account erasure.
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
 * - Negative-visualization safety is NOT enforced here (DEBUG-670). `optOutFlags` and
 *   add/removeOptOut have no caller, and this store is never hydrated. The daily
 *   loop's premeditatio is withheld at its call site by useGuidanceGate()'s
 *   'suppressed' arm (Q9 > 0, PHQ-9 ≥ 20, GAD-7 ≥ 15) — read that, never this.
 */

import { create } from 'zustand';
import type {
  ModuleId,
  ModuleStatus,
  DevelopmentalStage,
  ModuleProgress,
  EducationState,
  MODULE_ORDER,
} from '@/features/learn/types/education';

/**
 * Art. 9 disposition (FEAT-667 founder ruling 2026-09-29): `practiceCount` records
 * the same fact as a Learn principle engagement. Since DEBUG-672 that ruling is met
 * by never writing it, under any consent state; memory still counts.
 *
 * Crisis ruling: `optOutFlags` is a protective safety preference and must ALWAYS
 * persist if it is ever revived. It has no writer today. Reviving
 * `addOptOut`/`removeOptOut` needs a NEW persistence path that writes it ungated,
 * plus a fresh crisis/compliance pass — pinned dormant by
 * `educationStore.wellnessWriteGate.privacy.test.ts`.
 */

/**
 * Insight tip IDs that can be dismissed
 * FEAT-133: Principle Engagement Insights Enhancement
 */
export type InsightTipId = 'principle-engagement-beginner';

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
 * Extended Education State with FEAT-133 additions
 */
interface ExtendedEducationState extends EducationState {
  /** Insight tips dismissed this session (FEAT-133); in-memory like the rest of the store */
  dismissedInsightTips: InsightTipId[];
  /** Dismiss an insight tip for the session */
  dismissInsightTip: (tipId: InsightTipId) => void;
  /** Check if a tip is dismissed */
  isInsightTipDismissed: (tipId: InsightTipId) => boolean;
}

/**
 * Education Store
 */
export const useEducationStore = create<ExtendedEducationState>((set, get) => ({
  // Initial State
  modules: initializeModules(),
  currentModule: null,
  recommendedNext: 'aware-presence', // Default recommendation for new users
  dismissedInsightTips: [], // FEAT-133: No tips dismissed by default

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
  },

  /**
   * Dismiss an insight tip for the session (FEAT-133)
   */
  dismissInsightTip: (tipId: InsightTipId) => {
    set((state) => {
      if (state.dismissedInsightTips.includes(tipId)) {
        return state; // Already dismissed
      }
      return {
        dismissedInsightTips: [...state.dismissedInsightTips, tipId],
      };
    });
  },

  /**
   * Check if an insight tip is dismissed (FEAT-133)
   */
  isInsightTipDismissed: (tipId: InsightTipId): boolean => {
    return get().dismissedInsightTips.includes(tipId);
  },
}));

