/**
 * Check-in Store - Zustand state management for check-in flows
 * Handles morning, midday, and evening check-ins with AsyncStorage persistence
 */

import { create } from 'zustand';
import { CheckIn } from '../types';
import { dataStore } from '../services/storage/DataStore';

interface CheckInState {
  checkIns: CheckIn[];
  currentCheckIn: Partial<CheckIn> | null;
  todaysCheckIns: CheckIn[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadCheckIns: () => Promise<void>;
  loadTodaysCheckIns: () => Promise<void>;
  startCheckIn: (type: 'morning' | 'midday' | 'evening') => void;
  updateCurrentCheckIn: (data: Partial<CheckIn['data']>) => void;
  saveCurrentCheckIn: () => Promise<void>;
  skipCheckIn: (type: 'morning' | 'midday' | 'evening') => Promise<void>;
  clearCurrentCheckIn: () => void;
  
  // Queries
  getCheckInsByType: (type: 'morning' | 'midday' | 'evening', days?: number) => Promise<CheckIn[]>;
  getRecentCheckIns: (days?: number) => Promise<CheckIn[]>;
  getTodaysCheckIn: (type: 'morning' | 'midday' | 'evening') => CheckIn | null;
  
  // Computed properties
  hasCompletedTodaysCheckIn: (type: 'morning' | 'midday' | 'evening') => boolean;
  getTodaysProgress: () => { completed: number; total: number };
}

export const useCheckInStore = create<CheckInState>((set, get) => ({
  checkIns: [],
  currentCheckIn: null,
  todaysCheckIns: [],
  isLoading: false,
  error: null,

  // Load all check-ins from AsyncStorage
  loadCheckIns: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const checkIns = await dataStore.getCheckIns();
      set({ checkIns, isLoading: false });
    } catch (error) {
      console.error('Failed to load check-ins:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load check-ins',
        isLoading: false 
      });
    }
  },

  // Load today's check-ins specifically
  loadTodaysCheckIns: async () => {
    try {
      const todaysCheckIns = await dataStore.getTodayCheckIns();
      set({ todaysCheckIns });
    } catch (error) {
      console.error('Failed to load todays check-ins:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to load todays check-ins' });
    }
  },

  // Start a new check-in
  startCheckIn: (type) => {
    const now = new Date().toISOString();
    const newCheckIn: Partial<CheckIn> = {
      id: `checkin_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      startedAt: now,
      skipped: false,
      data: {}
    };
    
    set({ currentCheckIn: newCheckIn, error: null });
  },

  // Update current check-in data
  updateCurrentCheckIn: (data) => {
    const { currentCheckIn } = get();
    if (!currentCheckIn) {
      set({ error: 'No active check-in to update' });
      return;
    }
    
    const updatedCheckIn = {
      ...currentCheckIn,
      data: { ...currentCheckIn.data, ...data }
    };
    
    set({ currentCheckIn: updatedCheckIn });
  },

  // Save current check-in to storage
  saveCurrentCheckIn: async () => {
    const { currentCheckIn, loadCheckIns, loadTodaysCheckIns } = get();
    if (!currentCheckIn || !currentCheckIn.id) {
      set({ error: 'No valid check-in to save' });
      return;
    }
    
    set({ isLoading: true, error: null });
    
    try {
      const completedCheckIn: CheckIn = {
        ...currentCheckIn as CheckIn,
        completedAt: new Date().toISOString()
      };
      
      await dataStore.saveCheckIn(completedCheckIn);
      set({ currentCheckIn: null, isLoading: false });
      
      // Refresh data
      await Promise.all([loadCheckIns(), loadTodaysCheckIns()]);
    } catch (error) {
      console.error('Failed to save check-in:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to save check-in',
        isLoading: false 
      });
    }
  },

  // Skip a check-in
  skipCheckIn: async (type) => {
    set({ isLoading: true, error: null });
    
    try {
      const now = new Date().toISOString();
      const skippedCheckIn: CheckIn = {
        id: `checkin_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        startedAt: now,
        completedAt: now,
        skipped: true,
        data: {}
      };
      
      await dataStore.saveCheckIn(skippedCheckIn);
      set({ isLoading: false });
      
      // Refresh data
      const { loadCheckIns, loadTodaysCheckIns } = get();
      await Promise.all([loadCheckIns(), loadTodaysCheckIns()]);
    } catch (error) {
      console.error('Failed to skip check-in:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to skip check-in',
        isLoading: false 
      });
    }
  },

  // Clear current check-in (abandon)
  clearCurrentCheckIn: () => {
    set({ currentCheckIn: null, error: null });
  },

  // Query methods
  getCheckInsByType: async (type, days = 30) => {
    try {
      return await dataStore.getCheckInsByType(type, days);
    } catch (error) {
      console.error(`Failed to get ${type} check-ins:`, error);
      return [];
    }
  },

  getRecentCheckIns: async (days = 7) => {
    try {
      return await dataStore.getRecentCheckIns(days);
    } catch (error) {
      console.error('Failed to get recent check-ins:', error);
      return [];
    }
  },

  getTodaysCheckIn: (type) => {
    const { todaysCheckIns } = get();
    return todaysCheckIns.find(checkIn => 
      checkIn.type === type && checkIn.completedAt
    ) || null;
  },

  // Computed properties
  hasCompletedTodaysCheckIn: (type) => {
    const { getTodaysCheckIn } = get();
    const checkIn = getTodaysCheckIn(type);
    return !!(checkIn && checkIn.completedAt && !checkIn.skipped);
  },

  getTodaysProgress: () => {
    const { todaysCheckIns } = get();
    const completed = todaysCheckIns.filter(c => 
      c.completedAt && !c.skipped
    ).length;
    
    return { completed, total: 3 }; // morning, midday, evening
  }
}));