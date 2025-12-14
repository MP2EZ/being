/**
 * INSIGHTS STORE - User-driven insights preferences
 *
 * Manages user-selectable settings for the unified Insights Dashboard.
 * Key philosophical principle: PROHAIRESIS (user moral agency)
 *
 * Design Principles:
 * - User self-selects their developmental stage (not algorithm-assigned)
 * - User chooses their current virtue focus (invitation, not prescription)
 * - No gamification metrics stored here
 *
 * NON-NEGOTIABLES:
 * - Developmental stage is USER-SELECTED, respecting prohairesis
 * - Focus is an "invitation" not a requirement
 * - All data encrypted via SecureStore
 *
 * @see FEAT-28: Progress Insights Dashboard
 */

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { CardinalVirtue, DevelopmentalStage } from '@/features/practices/types/stoic';

// ──────────────────────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────────────────────

/**
 * User's weekly focus - an invitation, not a requirement
 * null = user hasn't chosen (shows all virtues equally)
 */
export type WeeklyFocus = CardinalVirtue | null;

export interface InsightsState {
  // User-selected developmental stage (respects prohairesis)
  // null = user hasn't self-assessed yet
  userSelectedStage: DevelopmentalStage | null;

  // This week's virtue focus invitation
  currentFocus: WeeklyFocus;

  // When the focus was last set (for weekly rotation suggestion)
  focusSetAt: Date | null;

  // Whether user has dismissed the stage selection prompt
  hasSeenStagePrompt: boolean;

  // Loading state
  isLoading: boolean;

  // Actions
  setUserSelectedStage: (stage: DevelopmentalStage) => Promise<void>;
  setCurrentFocus: (virtue: CardinalVirtue | null) => Promise<void>;
  dismissStagePrompt: () => Promise<void>;
  loadPersistedState: () => Promise<void>;
  resetStore: () => Promise<void>;
}

// ──────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ──────────────────────────────────────────────────────────────────────────────

const SECURE_STORE_KEY = 'insights_preferences';

// ──────────────────────────────────────────────────────────────────────────────
// INITIAL STATE
// ──────────────────────────────────────────────────────────────────────────────

const getInitialState = (): Omit<
  InsightsState,
  | 'isLoading'
  | 'setUserSelectedStage'
  | 'setCurrentFocus'
  | 'dismissStagePrompt'
  | 'loadPersistedState'
  | 'resetStore'
> => ({
  userSelectedStage: null,
  currentFocus: null,
  focusSetAt: null,
  hasSeenStagePrompt: false,
});

// ──────────────────────────────────────────────────────────────────────────────
// PERSISTENCE HELPERS
// ──────────────────────────────────────────────────────────────────────────────

const persistToSecureStore = async (state: Partial<InsightsState>): Promise<void> => {
  try {
    const dataToStore = {
      userSelectedStage: state.userSelectedStage,
      currentFocus: state.currentFocus,
      focusSetAt: state.focusSetAt?.toISOString() ?? null,
      hasSeenStagePrompt: state.hasSeenStagePrompt,
    };

    await SecureStore.setItemAsync(SECURE_STORE_KEY, JSON.stringify(dataToStore));
  } catch (error) {
    console.error('Error persisting insights preferences:', error);
  }
};

const loadFromSecureStore = async (): Promise<Partial<InsightsState> | null> => {
  try {
    const storedData = await SecureStore.getItemAsync(SECURE_STORE_KEY);
    if (!storedData) return null;

    const parsed = JSON.parse(storedData);

    return {
      userSelectedStage: parsed.userSelectedStage,
      currentFocus: parsed.currentFocus,
      focusSetAt: parsed.focusSetAt ? new Date(parsed.focusSetAt) : null,
      hasSeenStagePrompt: parsed.hasSeenStagePrompt ?? false,
    };
  } catch (error) {
    console.error('Error loading insights preferences:', error);
    return null;
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// ZUSTAND STORE
// ──────────────────────────────────────────────────────────────────────────────

export const useInsightsStore = create<InsightsState>((set, get) => ({
  ...getInitialState(),
  isLoading: false,

  /**
   * Set user-selected developmental stage
   * Respects prohairesis - user decides where they are
   */
  setUserSelectedStage: async (stage: DevelopmentalStage) => {
    set({ userSelectedStage: stage });
    await persistToSecureStore({ ...get(), userSelectedStage: stage });
  },

  /**
   * Set this week's virtue focus
   * An invitation, not a prescription
   */
  setCurrentFocus: async (virtue: CardinalVirtue | null) => {
    const focusSetAt = virtue ? new Date() : null;
    set({ currentFocus: virtue, focusSetAt });
    await persistToSecureStore({ ...get(), currentFocus: virtue, focusSetAt });
  },

  /**
   * Dismiss the stage selection prompt
   */
  dismissStagePrompt: async () => {
    set({ hasSeenStagePrompt: true });
    await persistToSecureStore({ ...get(), hasSeenStagePrompt: true });
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
   * Reset store to initial state
   */
  resetStore: async () => {
    try {
      await SecureStore.deleteItemAsync(SECURE_STORE_KEY);
    } catch (error) {
      console.error('Error clearing insights preferences:', error);
    }

    set({
      ...getInitialState(),
      isLoading: false,
    });
  },
}));

// Auto-load persisted state on first import
useInsightsStore.getState().loadPersistedState();
