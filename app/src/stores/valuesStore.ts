/**
 * VALUES STORE - DEPRECATED (FEAT-51)
 *
 * ⚠️ DEPRECATION NOTICE:
 * This store is deprecated as of FEAT-51 (Virtue Tracking Dashboard).
 * The therapeutic values system has been replaced by the Stoic Mindfulness framework.
 *
 * This store is retained for backward compatibility with existing user data,
 * but no UI exists to interact with it anymore.
 *
 * Migration: None required - existing values remain in SecureStore but are no longer
 * displayed or editable. New users will use stoicPracticeStore exclusively.
 *
 * REPLACED BY:
 * - /src/stores/stoicPracticeStore.ts - Virtue tracking and practice store
 * - Tracks VirtueInstance and VirtueChallenge data
 * - 4 cardinal virtues instead of 15 therapeutic values
 *
 * ORIGINAL PURPOSE:
 * - 15 MBCT-aligned therapeutic values management
 * - Users selected 3-5 values during onboarding
 * - Values were viewable and editable in profile
 * - Encrypted storage via SecureStore
 *
 * @deprecated Use stoicPracticeStore instead
 */

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { THERAPEUTIC_VALUES, MIN_VALUES_SELECTION, MAX_VALUES_SELECTION } from '../constants/therapeuticValues';
import { getCurrentUserId } from '../constants/devMode';

const STORAGE_KEY = 'user_values_v1';

/**
 * User's selected value with metadata
 */
export interface UserValue {
  valueId: string; // ID from THERAPEUTIC_VALUES
  selectedAt: number; // When user selected this value
  lastReflectedAt?: number | undefined; // Optional: last time user reflected on this value
  importance?: (1 | 2 | 3 | 4 | 5) | undefined; // Optional importance rating (for future enhancement)
  alignment?: (1 | 2 | 3 | 4 | 5) | undefined; // Optional: current alignment self-assessment
  notes?: string | undefined; // Optional: user's personal notes about this value
}

/**
 * Values metadata structure
 */
export interface ValuesMetadata {
  userId: string;
  selectedValues: UserValue[];
  createdAt: number;
  updatedAt: number;
  version: number; // For future migrations
}

/**
 * Values Store State
 */
export interface ValuesStore {
  values: ValuesMetadata | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadValues: () => Promise<void>;
  saveValues: (selectedValueIds: string[]) => Promise<void>;
  addValue: (valueId: string) => Promise<void>;
  removeValue: (valueId: string) => Promise<void>;
  updateValue: (valueId: string, updates: Partial<UserValue>) => Promise<void>;
  clearValues: () => Promise<void>;

  // Getters
  getSelectedValueIds: () => string[];
  isValueSelected: (valueId: string) => boolean;
  getValueCount: () => number;
  canAddMoreValues: () => boolean;
  canRemoveValue: () => boolean;
}

/**
 * NOTE: getCurrentUserId() is now imported from devMode.ts
 * MVP: Returns 'dev-user-001' for single-user development mode
 * V2 (FEAT-16): Will integrate with real authentication service
 */

/**
 * Simple logger
 */
const logger = {
  info: (message: string, meta?: any) => {
    if (__DEV__) {
      console.log(`[Values] ${message}`, meta);
    }
  },
  error: (message: string, meta?: any) => {
    console.error(`[Values Error] ${message}`, meta);
  },
  performance: (message: string, timeMs: number) => {
    if (__DEV__) {
      console.log(`[Values Performance] ${message}: ${timeMs}ms`);
    }
  }
};

/**
 * Values Zustand Store
 */
export const useValuesStore = create<ValuesStore>((set, get) => ({
  values: null,
  isLoading: false,
  error: null,

  /**
   * Load values from encrypted storage
   * Performance target: <300ms
   */
  loadValues: async () => {
    const startTime = performance.now();
    set({ isLoading: true, error: null });

    try {
      const storedData = await SecureStore.getItemAsync(STORAGE_KEY);

      if (storedData) {
        const values = JSON.parse(storedData) as ValuesMetadata;
        set({ values, isLoading: false });

        const loadTime = performance.now() - startTime;
        logger.performance('Values loaded', loadTime);

        // Log warning if over target
        if (loadTime > 300) {
          logger.info(`Values load time exceeded target: ${loadTime}ms > 300ms`);
        }

        return;
      }

      // No values stored yet
      set({ values: null, isLoading: false });
      logger.info('No stored values found');
    } catch (error) {
      logger.error('Failed to load values', { error });
      set({ error: 'Failed to load values', isLoading: false });
    }
  },

  /**
   * Save values (replaces entire selection)
   * Used during onboarding or bulk update
   *
   * TODO (FEAT-6): This should be called from onboarding completion
   */
  saveValues: async (selectedValueIds: string[]) => {
    // Validate selection
    if (selectedValueIds.length < MIN_VALUES_SELECTION || selectedValueIds.length > MAX_VALUES_SELECTION) {
      set({ error: `Please select ${MIN_VALUES_SELECTION}-${MAX_VALUES_SELECTION} values` });
      return;
    }

    // Validate all IDs exist
    const invalidIds = selectedValueIds.filter(id =>
      !THERAPEUTIC_VALUES.some(v => v.id === id)
    );
    if (invalidIds.length > 0) {
      set({ error: `Invalid value IDs: ${invalidIds.join(', ')}` });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const userId = getCurrentUserId();
      const now = Date.now();

      const valuesMetadata: ValuesMetadata = {
        userId,
        selectedValues: selectedValueIds.map(valueId => ({
          valueId,
          selectedAt: now
        })),
        createdAt: now,
        updatedAt: now,
        version: 1
      };

      // Save to encrypted storage
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(valuesMetadata));

      set({ values: valuesMetadata, isLoading: false });
      logger.info('Values saved', { count: selectedValueIds.length });
    } catch (error) {
      logger.error('Failed to save values', { error });
      set({ error: 'Failed to save values', isLoading: false });
    }
  },

  /**
   * Add a single value
   * Used when user adds a value in profile screen
   */
  addValue: async (valueId: string) => {
    const { values } = get();

    // Check if already at max
    if (values && values.selectedValues.length >= MAX_VALUES_SELECTION) {
      set({ error: `Maximum ${MAX_VALUES_SELECTION} values allowed` });
      return;
    }

    // Check if already selected
    if (values && values.selectedValues.some(v => v.valueId === valueId)) {
      set({ error: 'Value already selected' });
      return;
    }

    // Validate value ID
    if (!THERAPEUTIC_VALUES.some(v => v.id === valueId)) {
      set({ error: 'Invalid value ID' });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const userId = getCurrentUserId();
      const now = Date.now();

      const newValue: UserValue = {
        valueId,
        selectedAt: now
      };

      const updatedValues: ValuesMetadata = values ? {
        ...values,
        selectedValues: [...values.selectedValues, newValue],
        updatedAt: now
      } : {
        userId,
        selectedValues: [newValue],
        createdAt: now,
        updatedAt: now,
        version: 1
      };

      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(updatedValues));

      set({ values: updatedValues, isLoading: false });
      logger.info('Value added', { valueId });
    } catch (error) {
      logger.error('Failed to add value', { error });
      set({ error: 'Failed to add value', isLoading: false });
    }
  },

  /**
   * Remove a single value
   * Used when user removes a value in profile screen
   */
  removeValue: async (valueId: string) => {
    const { values } = get();

    if (!values) {
      set({ error: 'No values to remove' });
      return;
    }

    // Check if at minimum
    if (values.selectedValues.length <= MIN_VALUES_SELECTION) {
      set({ error: `Minimum ${MIN_VALUES_SELECTION} values required` });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const now = Date.now();

      const updatedValues: ValuesMetadata = {
        ...values,
        selectedValues: values.selectedValues.filter(v => v.valueId !== valueId),
        updatedAt: now
      };

      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(updatedValues));

      set({ values: updatedValues, isLoading: false });
      logger.info('Value removed', { valueId });
    } catch (error) {
      logger.error('Failed to remove value', { error });
      set({ error: 'Failed to remove value', isLoading: false });
    }
  },

  /**
   * Update value metadata (importance, alignment, notes)
   * TODO (FEAT-6): Decide if we want importance/alignment ratings
   */
  updateValue: async (valueId: string, updates: Partial<UserValue>) => {
    const { values } = get();

    if (!values) {
      set({ error: 'No values to update' });
      return;
    }

    const valueIndex = values.selectedValues.findIndex(v => v.valueId === valueId);
    if (valueIndex === -1) {
      set({ error: 'Value not found' });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const now = Date.now();

      const updatedSelectedValues = [...values.selectedValues];
      updatedSelectedValues[valueIndex] = {
        ...updatedSelectedValues[valueIndex],
        ...updates
      } as UserValue;

      const updatedValues: ValuesMetadata = {
        ...values,
        selectedValues: updatedSelectedValues,
        updatedAt: now
      };

      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(updatedValues));

      set({ values: updatedValues, isLoading: false });
      logger.info('Value updated', { valueId, updates });
    } catch (error) {
      logger.error('Failed to update value', { error });
      set({ error: 'Failed to update value', isLoading: false });
    }
  },

  /**
   * Clear all values
   * Use with caution - should require confirmation
   */
  clearValues: async () => {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
      set({ values: null, error: null });
      logger.info('Values cleared');
    } catch (error) {
      logger.error('Failed to clear values', { error });
      set({ error: 'Failed to clear values' });
    }
  },

  /**
   * Get selected value IDs
   */
  getSelectedValueIds: (): string[] => {
    const { values } = get();
    return values?.selectedValues.map(v => v.valueId) || [];
  },

  /**
   * Check if a value is selected
   */
  isValueSelected: (valueId: string): boolean => {
    const { values } = get();
    return values?.selectedValues.some(v => v.valueId === valueId) || false;
  },

  /**
   * Get count of selected values
   */
  getValueCount: (): number => {
    const { values } = get();
    return values?.selectedValues.length || 0;
  },

  /**
   * Check if user can add more values
   */
  canAddMoreValues: (): boolean => {
    const { values } = get();
    const count = values?.selectedValues.length || 0;
    return count < MAX_VALUES_SELECTION;
  },

  /**
   * Check if user can remove a value (must maintain minimum)
   */
  canRemoveValue: (): boolean => {
    const { values } = get();
    const count = values?.selectedValues.length || 0;
    return count > MIN_VALUES_SELECTION;
  }
}));

/**
 * Convenience hooks
 */
export const useSelectedValues = () => useValuesStore((state) => state.values?.selectedValues || []);
export const useValueCount = () => useValuesStore((state) => state.getValueCount());
export const useCanAddMoreValues = () => useValuesStore((state) => state.canAddMoreValues());
export const useCanRemoveValue = () => useValuesStore((state) => state.canRemoveValue());
