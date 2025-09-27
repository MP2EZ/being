/**
 * Minimal User Store - Testing Zustand compatibility with New Architecture
 * NO middleware, NO persist, NO complex features
 */

import { create } from 'zustand';

interface MinimalUserState {
  user: { id: string; name: string } | null;
  isLoading: boolean;
  initializeStore: () => Promise<void>;
}

export const useMinimalUserStore = create<MinimalUserState>((set, get) => ({
  user: null,
  isLoading: false,

  initializeStore: async () => {
    set({ isLoading: true });
    // Simulate initialization
    await new Promise(resolve => setTimeout(resolve, 100));
    set({
      user: { id: 'test-user', name: 'Test User' },
      isLoading: false
    });
  }
}));