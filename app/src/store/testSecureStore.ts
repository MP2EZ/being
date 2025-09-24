/**
 * Test Store - SecureStore encryption test
 * Testing if SecureStore causes property descriptor errors
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';

interface TestSecureState {
  user: { id: string; name: string } | null;
  isLoading: boolean;
  initializeStore: () => Promise<void>;
}

// SecureStore adapter for Zustand
const secureStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return await SecureStore.getItemAsync(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await SecureStore.deleteItemAsync(name);
  },
};

export const useTestSecureStore = create<TestSecureState>()(
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
            user: { id: 'test-secure', name: 'SecureStore Test User' },
            isLoading: false
          });
        }
      }),
      {
        name: 'test-secure-storage',
        storage: createJSONStorage(() => secureStorage),
      }
    )
  )
);