/**
 * STOIC PRACTICE STORE (Zustand + Encryption)
 *
 * Core state management for Stoic Mindfulness practice tracking.
 * Uses Zustand for reactive state + SecureStore for AES-256 encryption.
 *
 * Philosopher-validated (9.7/10 rating) - Tracks:
 * - Developmental stage (4 metrics: consistency, repertoire, integration, time)
 * - Domain progress (work, relationships, adversity)
 * - Virtue instances (successes) and challenges (struggles)
 * - Practice streaks and total days
 *
 * FEAT-45: Updated to 5-principle framework (2025-10-29)
 * Principle repertoire thresholds adjusted: 12 principles → 5 principles
 *
 * NON-NEGOTIABLES:
 * - All virtue/challenge data encrypted at rest (SecureStore)
 * - Self-compassion required in VirtueChallenge
 * - Balanced examination (instances + challenges)
 * - Privacy-first: No analytics on virtue content
 *
 * @see /docs/technical/Stoic-Mindfulness-Architecture-v1.0.md (v1.1 LOCKED)
 */

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type {
  CardinalVirtue,
  DevelopmentalStage,
  PracticeDomain,
  VirtueInstance,
  VirtueChallenge,
  DomainProgress,
} from '../types/stoic';

// ──────────────────────────────────────────────────────────────────────────────
// STORE STATE INTERFACE
// ──────────────────────────────────────────────────────────────────────────────

export interface StoicPracticeState {
  // Developmental tracking
  developmentalStage: DevelopmentalStage;
  practiceStartDate: Date | null;
  totalPracticeDays: number;
  currentStreak: number;
  longestStreak: number;

  // Virtue tracking (encrypted at rest)
  virtueInstances: VirtueInstance[];
  virtueChallenges: VirtueChallenge[];

  // Domain progress (work, relationships, adversity)
  domainProgress: {
    work: DomainProgress;
    relationships: DomainProgress;
    adversity: DomainProgress;
  };

  // Loading state
  isLoading: boolean;

  // Actions
  addVirtueInstance: (instance: Omit<VirtueInstance, 'id' | 'timestamp'>) => Promise<void>;
  addVirtueChallenge: (challenge: Omit<VirtueChallenge, 'id' | 'timestamp'>) => Promise<void>;
  updateStreak: (newStreak: number) => void;
  incrementPracticeDays: () => Promise<void>;
  setPracticeStartDate: (date: Date) => void;
  setDevelopmentalStage: (stage: DevelopmentalStage) => void;
  getVirtueInstancesByDomain: (domain: PracticeDomain) => VirtueInstance[];
  getVirtueInstancesByVirtue: (virtue: CardinalVirtue) => VirtueInstance[];
  getRecentVirtueInstances: (days: number) => VirtueInstance[];
  loadPersistedState: () => Promise<void>;
  persistState: () => Promise<void>;
  resetStore: () => Promise<void>;
}

// ──────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ──────────────────────────────────────────────────────────────────────────────

const SECURE_STORE_KEY = 'stoic_practice_state';

// Developmental stage thresholds (based on 4 metrics)
// FEAT-45: Updated for 5-principle framework (was 12 principles)
const STAGE_THRESHOLDS = {
  effortful: {
    minDays: 180, // 6 months
    minStreak: 7,
    minPrinciples: 2, // 2 of 5 principles (was 5 of 12)
    minDomains: 2,
  },
  fluid: {
    minDays: 730, // 2 years
    minStreak: 14,
    minPrinciples: 4, // 4 of 5 principles (was 8 of 12)
    minDomains: 3,
  },
  integrated: {
    minDays: 1825, // 5 years
    minStreak: 30,
    minPrinciples: 5, // All 5 principles (was 10 of 12)
    minDomains: 3,
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// INITIAL STATE
// ──────────────────────────────────────────────────────────────────────────────

const initialDomainProgress: DomainProgress = {
  domain: 'work',
  practiceInstances: 0,
  principlesApplied: [],
  lastPracticeDate: null,
};

const getInitialState = (): Omit<StoicPracticeState, 'isLoading' | keyof typeof actions> => ({
  developmentalStage: 'fragmented',
  practiceStartDate: null,
  totalPracticeDays: 0,
  currentStreak: 0,
  longestStreak: 0,
  virtueInstances: [],
  virtueChallenges: [],
  domainProgress: {
    work: { ...initialDomainProgress, domain: 'work' },
    relationships: { ...initialDomainProgress, domain: 'relationships' },
    adversity: { ...initialDomainProgress, domain: 'adversity' },
  },
});

// ──────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Generate unique ID for virtue instances/challenges
 */
const generateId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Calculate developmental stage based on 4 metrics
 *
 * Metrics:
 * 1. Practice consistency (current streak)
 * 2. Principle repertoire (unique principles applied)
 * 3. Cross-domain integration (domains with practice)
 * 4. Depth of practice (total days since start)
 */
const calculateDevelopmentalStage = (
  totalDays: number,
  currentStreak: number,
  domainProgress: StoicPracticeState['domainProgress']
): DevelopmentalStage => {
  // Count unique principles across all domains
  const allPrinciples = new Set([
    ...domainProgress.work.principlesApplied,
    ...domainProgress.relationships.principlesApplied,
    ...domainProgress.adversity.principlesApplied,
  ]);
  const uniquePrinciples = allPrinciples.size;

  // Count domains with active practice
  const activeDomains = [
    domainProgress.work,
    domainProgress.relationships,
    domainProgress.adversity,
  ].filter(d => d.practiceInstances > 0).length;

  // Check integrated stage (5+ years)
  if (
    totalDays >= STAGE_THRESHOLDS.integrated.minDays &&
    currentStreak >= STAGE_THRESHOLDS.integrated.minStreak &&
    uniquePrinciples >= STAGE_THRESHOLDS.integrated.minPrinciples &&
    activeDomains >= STAGE_THRESHOLDS.integrated.minDomains
  ) {
    return 'integrated';
  }

  // Check fluid stage (2-5 years)
  if (
    totalDays >= STAGE_THRESHOLDS.fluid.minDays &&
    currentStreak >= STAGE_THRESHOLDS.fluid.minStreak &&
    uniquePrinciples >= STAGE_THRESHOLDS.fluid.minPrinciples &&
    activeDomains >= STAGE_THRESHOLDS.fluid.minDomains
  ) {
    return 'fluid';
  }

  // Check effortful stage (6-18 months)
  if (
    totalDays >= STAGE_THRESHOLDS.effortful.minDays &&
    currentStreak >= STAGE_THRESHOLDS.effortful.minStreak &&
    uniquePrinciples >= STAGE_THRESHOLDS.effortful.minPrinciples &&
    activeDomains >= STAGE_THRESHOLDS.effortful.minDomains
  ) {
    return 'effortful';
  }

  // Default: fragmented stage (1-6 months)
  return 'fragmented';
};

/**
 * Update domain progress when virtue instance is added
 */
const updateDomainProgressForInstance = (
  domainProgress: StoicPracticeState['domainProgress'],
  domain: PracticeDomain,
  principleApplied: string | null
): StoicPracticeState['domainProgress'] => {
  const currentProgress = domainProgress[domain];

  // Add principle if not already applied in this domain
  const principlesApplied = principleApplied && !currentProgress.principlesApplied.includes(principleApplied)
    ? [...currentProgress.principlesApplied, principleApplied]
    : currentProgress.principlesApplied;

  return {
    ...domainProgress,
    [domain]: {
      ...currentProgress,
      practiceInstances: currentProgress.practiceInstances + 1,
      principlesApplied,
      lastPracticeDate: new Date(),
    },
  };
};

/**
 * Persist state to SecureStore (encrypted)
 */
const persistToSecureStore = async (state: Partial<StoicPracticeState>): Promise<void> => {
  try {
    const dataToStore = {
      developmentalStage: state.developmentalStage,
      practiceStartDate: state.practiceStartDate?.toISOString() ?? null,
      totalPracticeDays: state.totalPracticeDays,
      currentStreak: state.currentStreak,
      longestStreak: state.longestStreak,
      virtueInstances: state.virtueInstances?.map(vi => ({
        ...vi,
        timestamp: vi.timestamp.toISOString(),
      })) ?? [],
      virtueChallenges: state.virtueChallenges?.map(vc => ({
        ...vc,
        timestamp: vc.timestamp.toISOString(),
      })) ?? [],
      domainProgress: {
        work: {
          ...state.domainProgress?.work,
          lastPracticeDate: state.domainProgress?.work.lastPracticeDate?.toISOString() ?? null,
        },
        relationships: {
          ...state.domainProgress?.relationships,
          lastPracticeDate: state.domainProgress?.relationships.lastPracticeDate?.toISOString() ?? null,
        },
        adversity: {
          ...state.domainProgress?.adversity,
          lastPracticeDate: state.domainProgress?.adversity.lastPracticeDate?.toISOString() ?? null,
        },
      },
    };

    await SecureStore.setItemAsync(SECURE_STORE_KEY, JSON.stringify(dataToStore));
  } catch (error) {
    console.error('Error persisting to SecureStore:', error);
    // Don't throw - allow state to update locally even if persistence fails
  }
};

/**
 * Load state from SecureStore
 */
const loadFromSecureStore = async (): Promise<Partial<StoicPracticeState> | null> => {
  try {
    const storedData = await SecureStore.getItemAsync(SECURE_STORE_KEY);
    if (!storedData) return null;

    const parsed = JSON.parse(storedData);

    return {
      developmentalStage: parsed.developmentalStage,
      practiceStartDate: parsed.practiceStartDate ? new Date(parsed.practiceStartDate) : null,
      totalPracticeDays: parsed.totalPracticeDays,
      currentStreak: parsed.currentStreak,
      longestStreak: parsed.longestStreak,
      virtueInstances: parsed.virtueInstances?.map((vi: any) => ({
        ...vi,
        timestamp: new Date(vi.timestamp),
      })) ?? [],
      virtueChallenges: parsed.virtueChallenges?.map((vc: any) => ({
        ...vc,
        timestamp: new Date(vc.timestamp),
      })) ?? [],
      domainProgress: {
        work: {
          ...parsed.domainProgress.work,
          lastPracticeDate: parsed.domainProgress.work.lastPracticeDate
            ? new Date(parsed.domainProgress.work.lastPracticeDate)
            : null,
        },
        relationships: {
          ...parsed.domainProgress.relationships,
          lastPracticeDate: parsed.domainProgress.relationships.lastPracticeDate
            ? new Date(parsed.domainProgress.relationships.lastPracticeDate)
            : null,
        },
        adversity: {
          ...parsed.domainProgress.adversity,
          lastPracticeDate: parsed.domainProgress.adversity.lastPracticeDate
            ? new Date(parsed.domainProgress.adversity.lastPracticeDate)
            : null,
        },
      },
    };
  } catch (error) {
    console.error('Error loading from SecureStore:', error);
    return null;
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// ZUSTAND STORE
// ──────────────────────────────────────────────────────────────────────────────

export const useStoicPracticeStore = create<StoicPracticeState>((set, get) => ({
  ...getInitialState(),
  isLoading: false,

  /**
   * Add a virtue instance (successful practice)
   */
  addVirtueInstance: async (instance: Omit<VirtueInstance, 'id' | 'timestamp'>) => {
    const state = get();

    const newInstance: VirtueInstance = {
      ...instance,
      id: generateId(),
      timestamp: new Date(),
    };

    const updatedDomainProgress = updateDomainProgressForInstance(
      state.domainProgress,
      instance.domain,
      instance.principleApplied
    );

    const newState = {
      virtueInstances: [...state.virtueInstances, newInstance],
      domainProgress: updatedDomainProgress,
    };

    set(newState);
    await persistToSecureStore({ ...state, ...newState });

    // Auto-calculate developmental stage
    const calculatedStage = calculateDevelopmentalStage(
      state.totalPracticeDays,
      state.currentStreak,
      updatedDomainProgress
    );
    if (calculatedStage !== state.developmentalStage) {
      set({ developmentalStage: calculatedStage });
    }
  },

  /**
   * Add a virtue challenge (struggle with practice)
   */
  addVirtueChallenge: async (challenge: Omit<VirtueChallenge, 'id' | 'timestamp'>) => {
    const state = get();

    const newChallenge: VirtueChallenge = {
      ...challenge,
      id: generateId(),
      timestamp: new Date(),
    };

    const newState = {
      virtueChallenges: [...state.virtueChallenges, newChallenge],
    };

    set(newState);
    await persistToSecureStore({ ...state, ...newState });
  },

  /**
   * Update practice streak
   */
  updateStreak: (newStreak: number) => {
    const state = get();
    const longestStreak = Math.max(state.longestStreak, newStreak);

    set({
      currentStreak: newStreak,
      longestStreak,
    });
  },

  /**
   * Increment total practice days
   */
  incrementPracticeDays: async () => {
    const state = get();
    const newTotalDays = state.totalPracticeDays + 1;

    set({ totalPracticeDays: newTotalDays });
    await persistToSecureStore({ ...state, totalPracticeDays: newTotalDays });

    // Auto-calculate developmental stage
    const calculatedStage = calculateDevelopmentalStage(
      newTotalDays,
      state.currentStreak,
      state.domainProgress
    );
    if (calculatedStage !== state.developmentalStage) {
      set({ developmentalStage: calculatedStage });
    }
  },

  /**
   * Set practice start date (when user first started Stoic practice)
   */
  setPracticeStartDate: (date: Date) => {
    set({ practiceStartDate: date });
  },

  /**
   * Manually set developmental stage (allows override)
   */
  setDevelopmentalStage: (stage: DevelopmentalStage) => {
    set({ developmentalStage: stage });
  },

  /**
   * Get virtue instances by domain
   */
  getVirtueInstancesByDomain: (domain: PracticeDomain): VirtueInstance[] => {
    const state = get();
    return state.virtueInstances.filter(vi => vi.domain === domain);
  },

  /**
   * Get virtue instances by virtue
   */
  getVirtueInstancesByVirtue: (virtue: CardinalVirtue): VirtueInstance[] => {
    const state = get();
    return state.virtueInstances.filter(vi => vi.virtue === virtue);
  },

  /**
   * Get recent virtue instances (last N days)
   */
  getRecentVirtueInstances: (days: number): VirtueInstance[] => {
    const state = get();
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return state.virtueInstances.filter(vi => vi.timestamp >= cutoffDate);
  },

  /**
   * Load persisted state from SecureStore
   */
  loadPersistedState: async () => {
    set({ isLoading: true });

    const persistedState = await loadFromSecureStore();

    if (persistedState) {
      set({ ...persistedState, isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },

  /**
   * Persist current state to SecureStore
   */
  persistState: async () => {
    const state = get();
    await persistToSecureStore(state);
  },

  /**
   * Reset store to initial state
   */
  resetStore: async () => {
    try {
      await SecureStore.deleteItemAsync(SECURE_STORE_KEY);
    } catch (error) {
      console.error('Error clearing SecureStore:', error);
    }

    set({
      ...getInitialState(),
      isLoading: false,
    });
  },
}));

// Auto-load persisted state on first import
useStoicPracticeStore.getState().loadPersistedState();
