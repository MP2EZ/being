/**
 * User Store - Zustand state management for user profile and preferences
 * Syncs with AsyncStorage for persistence
 */

import { create } from 'zustand';
import { UserProfile } from '../types';
import { dataStore } from '../services/storage/DataStore';

interface UserState {
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadUser: () => Promise<void>;
  updateUser: (updates: Partial<UserProfile>) => Promise<void>;
  createUser: (userData: Omit<UserProfile, 'id' | 'createdAt'>) => Promise<void>;
  clearUser: () => Promise<void>;
  
  // Computed properties
  isOnboardingComplete: () => boolean;
  hasNotificationsEnabled: () => boolean;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  isLoading: false,
  error: null,

  // Load user from AsyncStorage
  loadUser: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const user = await dataStore.getUser();
      set({ user, isLoading: false });
    } catch (error) {
      console.error('Failed to load user:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load user',
        isLoading: false 
      });
    }
  },

  // Update existing user
  updateUser: async (updates) => {
    const { user } = get();
    if (!user) {
      set({ error: 'No user to update' });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const updatedUser = { ...user, ...updates };
      await dataStore.saveUser(updatedUser);
      set({ user: updatedUser, isLoading: false });
    } catch (error) {
      console.error('Failed to update user:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update user',
        isLoading: false 
      });
    }
  },

  // Create new user
  createUser: async (userData) => {
    set({ isLoading: true, error: null });

    try {
      const newUser: UserProfile = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
          theme: 'auto'
        },
        ...userData
      };

      await dataStore.saveUser(newUser);
      set({ user: newUser, isLoading: false });
    } catch (error) {
      console.error('Failed to create user:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create user',
        isLoading: false 
      });
    }
  },

  // Clear user data
  clearUser: async () => {
    set({ isLoading: true, error: null });

    try {
      await dataStore.clearAllData();
      set({ user: null, isLoading: false });
    } catch (error) {
      console.error('Failed to clear user:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to clear user',
        isLoading: false 
      });
    }
  },

  // Computed properties
  isOnboardingComplete: () => {
    const { user } = get();
    return user?.onboardingCompleted ?? false;
  },

  hasNotificationsEnabled: () => {
    const { user } = get();
    return user?.notifications.enabled ?? false;
  }
}));