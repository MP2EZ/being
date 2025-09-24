/**
 * Fixed User Store - New Architecture Compatible
 * Temporarily removes problematic native services to isolate JSI conflicts
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';

// Core types (no native services)
interface UserProfile {
  id: string;
  name: string;
  email?: string;
}

interface FixedUserState {
  // Core state
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  initializeStore: () => Promise<void>;
  login: (user: UserProfile) => void;
  logout: () => void;
}

// SecureStore adapter
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

export const useUserStore = create<FixedUserState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        user: null,
        isLoading: false,
        isAuthenticated: false,

        initializeStore: async () => {
          set({ isLoading: true });

          try {
            // Simulate initialization without native services
            await new Promise(resolve => setTimeout(resolve, 100));

            const mockUser: UserProfile = {
              id: 'fixed-user',
              name: 'Fixed User Store',
              email: 'test@example.com'
            };

            set({
              user: mockUser,
              isAuthenticated: true,
              isLoading: false
            });
          } catch (error) {
            console.error('Store initialization error:', error);
            set({ isLoading: false });
          }
        },

        login: (user: UserProfile) => {
          set({
            user,
            isAuthenticated: true,
            isLoading: false
          });
        },

        logout: () => {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false
          });
        }
      }),
      {
        name: 'being-user-storage',
        storage: createJSONStorage(() => secureStorage),
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated
        })
      }
    )
  )
);