/**
 * Test Store - subscribeWithSelector middleware only
 * Testing if subscribeWithSelector causes property descriptor errors
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface TestSubscribeState {
  user: { id: string; name: string } | null;
  isLoading: boolean;
  initializeStore: () => Promise<void>;
}

export const useTestSubscribeStore = create<TestSubscribeState>()(
  subscribeWithSelector((set, get) => ({
    user: null,
    isLoading: false,

    initializeStore: async () => {
      set({ isLoading: true });
      // Simulate initialization
      await new Promise(resolve => setTimeout(resolve, 100));
      set({
        user: { id: 'test-subscribe', name: 'Subscribe Test User' },
        isLoading: false
      });
    }
  }))
);