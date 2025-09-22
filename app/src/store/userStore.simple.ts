/**
 * Simplified User Store - Phase 2 Compatible
 * Temporary implementation without complex security services to resolve property descriptor error
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UserProfile } from '../types';
import * as SecureStore from 'expo-secure-store';

interface SimpleUserState {
  // Core State
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  initializeStore: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;

  // Selectors
  isOnboardingComplete: () => boolean;
  hasNotificationsEnabled: () => boolean;

  // Cleanup
  clearError: () => void;
}

// Simple storage for user data
const simpleUserStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(name);
    } catch (error) {
      console.error('Failed to get user data:', error);
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(name, value);
    } catch (error) {
      console.error('Failed to save user data:', error);
      throw error;
    }
  },
  removeItem: async (name: string): Promise<void> => {
    await SecureStore.deleteItemAsync(name);
  },
};

export const useUserStore = create<SimpleUserState>(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial State
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,

        // Initialize Store
        initializeStore: async () => {
          set({ isLoading: true });
          try {
            // Simple initialization without complex security services
            console.log('User store initialized (simplified)');
          } catch (error) {
            console.error('User store initialization failed:', error);
            set({ error: 'Failed to initialize user store' });
          } finally {
            set({ isLoading: false });
          }
        },

        // Authentication Actions
        signIn: async (email: string, password: string) => {
          set({ isLoading: true, error: null });
          try {
            // Simplified sign in - no complex authentication
            const user: UserProfile = {
              id: `user_${Date.now()}`,
              createdAt: new Date().toISOString(),
              onboardingCompleted: false,
              notifications: {
                enabled: true,
                morning: '08:00',
                midday: '13:00',
                evening: '20:00'
              },
              preferences: {
                haptics: true,
                theme: 'system' as const
              },
              values: []
            };

            set({
              user,
              isAuthenticated: true,
              isLoading: false
            });

            console.log('User signed in successfully (simplified)');
          } catch (error) {
            console.error('Sign in failed:', error);
            set({
              error: error instanceof Error ? error.message : 'Sign in failed',
              isLoading: false
            });
          }
        },

        signUp: async (email: string, password: string) => {
          set({ isLoading: true, error: null });
          try {
            // Simplified sign up
            const user: UserProfile = {
              id: `user_${Date.now()}`,
              createdAt: new Date().toISOString(),
              onboardingCompleted: false,
              notifications: {
                enabled: true,
                morning: '08:00',
                midday: '13:00',
                evening: '20:00'
              },
              preferences: {
                haptics: true,
                theme: 'system' as const
              },
              values: []
            };

            set({
              user,
              isAuthenticated: true,
              isLoading: false
            });

            console.log('User signed up successfully (simplified)');
          } catch (error) {
            console.error('Sign up failed:', error);
            set({
              error: error instanceof Error ? error.message : 'Sign up failed',
              isLoading: false
            });
          }
        },

        signOut: async () => {
          set({ isLoading: true });
          try {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: null
            });
            console.log('User signed out successfully');
          } catch (error) {
            console.error('Sign out failed:', error);
            set({
              error: error instanceof Error ? error.message : 'Sign out failed',
              isLoading: false
            });
          }
        },

        updateProfile: async (updates: Partial<UserProfile>) => {
          const { user } = get();
          if (!user) {
            set({ error: 'Not authenticated' });
            return;
          }

          set({ isLoading: true, error: null });
          try {
            const updatedUser = { ...user, ...updates };
            set({ user: updatedUser, isLoading: false });
            console.log('Profile updated successfully');
          } catch (error) {
            console.error('Profile update failed:', error);
            set({
              error: error instanceof Error ? error.message : 'Profile update failed',
              isLoading: false
            });
          }
        },

        // Selectors
        isOnboardingComplete: (): boolean => {
          const { user } = get();
          return user?.onboardingCompleted ?? false;
        },

        hasNotificationsEnabled: (): boolean => {
          const { user } = get();
          return user?.notifications.enabled ?? false;
        },

        // Error Handling
        clearError: (): void => {
          set({ error: null });
        }
      }),
      {
        name: 'being-user-store-simple',
        storage: createJSONStorage(() => simpleUserStorage),
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated
        }),
        version: 1
      }
    )
  )
);