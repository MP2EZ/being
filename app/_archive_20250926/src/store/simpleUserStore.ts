import { create } from 'zustand';
import { simpleStorage } from '../services/simple/SimpleStorageService';
import { simpleValidation } from '../services/simple/SimpleValidationService';

interface SimpleUser {
  id: string;
  name: string;
  isFirstTime: boolean;
  completedOnboarding: boolean;
}

interface SimpleUserStore {
  user: SimpleUser | null;
  isLoading: boolean;
  initializeUser: () => Promise<void>;
  updateUser: (updates: Partial<SimpleUser>) => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

export const useSimpleUserStore = create<SimpleUserStore>((set, get) => ({
  user: null,
  isLoading: false,

  initializeUser: async () => {
    set({ isLoading: true });

    try {
      // Try to load user from storage
      const storedUser = await simpleStorage.getObject<SimpleUser>('user');

      if (storedUser) {
        // Validate stored user data
        const validation = simpleValidation.validateUserData(storedUser);
        if (validation.isValid) {
          set({ user: storedUser, isLoading: false });
          return;
        } else {
          console.warn('Stored user data invalid:', validation.errors);
        }
      }

      // Create new user if none stored or invalid
      const mockUser: SimpleUser = {
        id: 'user-123',
        name: 'Being User',
        isFirstTime: true,
        completedOnboarding: false,
      };

      // Store new user
      await simpleStorage.setObject('user', mockUser);
      set({ user: mockUser, isLoading: false });
    } catch (error) {
      console.error('User initialization error:', error);
      set({ isLoading: false });
    }
  },

  updateUser: async (updates) => {
    const { user } = get();
    if (user) {
      const updatedUser = { ...user, ...updates };

      // Validate updated user data
      const validation = simpleValidation.validateUserData(updatedUser);
      if (!validation.isValid) {
        console.error('Invalid user data:', validation.errors);
        return;
      }

      try {
        await simpleStorage.setObject('user', updatedUser);
        set({ user: updatedUser });
      } catch (error) {
        console.error('Failed to save user updates:', error);
      }
    }
  },

  completeOnboarding: async () => {
    const { user } = get();
    if (user) {
      const updatedUser = {
        ...user,
        completedOnboarding: true,
        isFirstTime: false
      };

      try {
        await simpleStorage.setObject('user', updatedUser);
        set({ user: updatedUser });
      } catch (error) {
        console.error('Failed to save onboarding completion:', error);
      }
    }
  },
}));