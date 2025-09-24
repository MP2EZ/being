/**
 * Test Store - Combined subscribeWithSelector + persist middleware
 * Testing if combined middleware causes property descriptor errors
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TestCombinedState {
  user: { id: string; name: string } | null;
  isLoading: boolean;
  initializeStore: () => Promise<void>;
}

export const useTestCombinedStore = create<TestCombinedState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        user: null,
        isLoading: false,

        initializeStore: async () => {
          set({ isLoading: true });
          // Simulate initialization
          await new Promise(resolve => setTimeout(resolve, 100));
          set({
            user: { id: 'test-combined', name: 'Combined Test User' },
            isLoading: false
          });
        }
      }),
      {
        name: 'test-combined-storage',
        storage: createJSONStorage(() => AsyncStorage),
      }
    )
  )
);