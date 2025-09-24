/**
 * Test Store - persist middleware only
 * Testing if persist middleware causes property descriptor errors
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TestPersistState {
  user: { id: string; name: string } | null;
  isLoading: boolean;
  initializeStore: () => Promise<void>;
}

export const useTestPersistStore = create<TestPersistState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,

      initializeStore: async () => {
        set({ isLoading: true });
        // Simulate initialization
        await new Promise(resolve => setTimeout(resolve, 100));
        set({
          user: { id: 'test-persist', name: 'Persist Test User' },
          isLoading: false
        });
      }
    }),
    {
      name: 'test-persist-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);