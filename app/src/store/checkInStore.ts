/**
 * Check-in Store - Zustand state management for check-in flows
 * Handles morning, midday, and evening check-ins with AsyncStorage persistence
 */

import { create } from 'zustand';
import { CheckIn } from '../types';
import { dataStore } from '../services/storage/SecureDataStore';
import { networkService } from '../services/NetworkService';
import { validateCheckInData, ValidationError, sanitizeTextInput, sanitizeArrayInput } from '../utils/validation';

interface CheckInState {
  checkIns: CheckIn[];
  currentCheckIn: Partial<CheckIn> | null;
  todaysCheckIns: CheckIn[];
  isLoading: boolean;
  error: string | null;
  hasPartialSession: boolean;
  
  // Actions
  loadCheckIns: () => Promise<void>;
  loadTodaysCheckIns: () => Promise<void>;
  startCheckIn: (type: 'morning' | 'midday' | 'evening') => void;
  resumeCheckIn: (type: 'morning' | 'midday' | 'evening') => Promise<boolean>;
  updateCurrentCheckIn: (data: Partial<CheckIn['data']>) => void;
  saveCurrentCheckIn: () => Promise<void>;
  savePartialProgress: () => Promise<void>;
  skipCheckIn: (type: 'morning' | 'midday' | 'evening') => Promise<void>;
  clearCurrentCheckIn: () => void;
  clearPartialSession: (type: 'morning' | 'midday' | 'evening') => Promise<void>;
  checkForPartialSession: (type: 'morning' | 'midday' | 'evening') => Promise<boolean>;
  
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
  hasPartialSession: false,

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
      id: `checkin_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`,
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
      // Sanitize and validate data before saving
      const sanitizedData = { ...currentCheckIn.data };
      
      // Sanitize text fields
      if (sanitizedData.intention) sanitizedData.intention = sanitizeTextInput(sanitizedData.intention);
      if (sanitizedData.dreams) sanitizedData.dreams = sanitizeTextInput(sanitizedData.dreams);
      if (sanitizedData.pleasantEvent) sanitizedData.pleasantEvent = sanitizeTextInput(sanitizedData.pleasantEvent);
      if (sanitizedData.unpleasantEvent) sanitizedData.unpleasantEvent = sanitizeTextInput(sanitizedData.unpleasantEvent);
      if (sanitizedData.currentNeed) sanitizedData.currentNeed = sanitizeTextInput(sanitizedData.currentNeed);
      if (sanitizedData.dayHighlight) sanitizedData.dayHighlight = sanitizeTextInput(sanitizedData.dayHighlight);
      if (sanitizedData.dayChallenge) sanitizedData.dayChallenge = sanitizeTextInput(sanitizedData.dayChallenge);
      if (sanitizedData.dayLearning) sanitizedData.dayLearning = sanitizeTextInput(sanitizedData.dayLearning);
      if (sanitizedData.releaseNote) sanitizedData.releaseNote = sanitizeTextInput(sanitizedData.releaseNote);
      if (sanitizedData.tomorrowFocus) sanitizedData.tomorrowFocus = sanitizeTextInput(sanitizedData.tomorrowFocus);
      if (sanitizedData.lettingGo) sanitizedData.lettingGo = sanitizeTextInput(sanitizedData.lettingGo);
      
      // Sanitize array fields
      if (sanitizedData.bodyAreas) sanitizedData.bodyAreas = sanitizeArrayInput(sanitizedData.bodyAreas);
      if (sanitizedData.emotions) sanitizedData.emotions = sanitizeArrayInput(sanitizedData.emotions);
      if (sanitizedData.thoughts) sanitizedData.thoughts = sanitizeArrayInput(sanitizedData.thoughts);
      if (sanitizedData.currentEmotions) sanitizedData.currentEmotions = sanitizeArrayInput(sanitizedData.currentEmotions);
      if (sanitizedData.dayEmotions) sanitizedData.dayEmotions = sanitizeArrayInput(sanitizedData.dayEmotions);
      if (sanitizedData.tensionAreas) sanitizedData.tensionAreas = sanitizeArrayInput(sanitizedData.tensionAreas);
      if (sanitizedData.sleepIntentions) sanitizedData.sleepIntentions = sanitizeArrayInput(sanitizedData.sleepIntentions);
      
      const completedCheckIn: CheckIn = {
        ...currentCheckIn as CheckIn,
        completedAt: new Date().toISOString(),
        data: sanitizedData
      };
      
      // Validate before saving
      validateCheckInData(completedCheckIn);
      
      // Use offline-aware saving
      await networkService.performWithOfflineFallback(
        // Online action
        async () => {
          await dataStore.saveCheckIn(completedCheckIn);
          return completedCheckIn;
        },
        // Offline fallback
        async () => {
          console.log('Check-in queued for offline sync');
        },
        'save_checkin',
        completedCheckIn
      );
      
      // Clear any partial session for this type
      if (completedCheckIn.type) {
        await dataStore.clearPartialCheckIn(completedCheckIn.type);
      }
      
      set({ currentCheckIn: null, hasPartialSession: false, isLoading: false });
      
      // Refresh data (only if online to avoid errors)
      if (networkService.isOnline()) {
        await Promise.all([loadCheckIns(), loadTodaysCheckIns()]);
      } else {
        // If offline, just add to local state optimistically
        const { checkIns, todaysCheckIns } = get();
        const updatedCheckIns = [...checkIns, completedCheckIn];
        const updatedTodaysCheckIns = completedCheckIn.completedAt?.startsWith(new Date().toISOString().split('T')[0])
          ? [...todaysCheckIns, completedCheckIn]
          : todaysCheckIns;
        set({ checkIns: updatedCheckIns, todaysCheckIns: updatedTodaysCheckIns });
      }
    } catch (error) {
      console.error('Failed to save check-in:', error);
      const errorMessage = error instanceof ValidationError 
        ? `Validation error: ${error.message}` 
        : error instanceof Error ? error.message : 'Failed to save check-in';
      set({ 
        error: errorMessage,
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
        id: `checkin_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`,
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
    set({ currentCheckIn: null, error: null, hasPartialSession: false });
  },

  // Resume interrupted session
  resumeCheckIn: async (type) => {
    set({ isLoading: true, error: null });
    
    try {
      const partialSession = await dataStore.getPartialCheckIn(type);
      
      if (partialSession) {
        set({ 
          currentCheckIn: partialSession, 
          hasPartialSession: true, 
          isLoading: false 
        });
        return true;
      } else {
        set({ hasPartialSession: false, isLoading: false });
        return false;
      }
    } catch (error) {
      console.error('Failed to resume check-in:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to resume check-in',
        hasPartialSession: false,
        isLoading: false 
      });
      return false;
    }
  },

  // Save current progress as partial session
  savePartialProgress: async () => {
    const { currentCheckIn } = get();
    if (!currentCheckIn || !currentCheckIn.type || !currentCheckIn.id) {
      set({ error: 'No valid check-in to save as partial' });
      return;
    }
    
    try {
      await dataStore.savePartialCheckIn(currentCheckIn);
      set({ hasPartialSession: true, error: null });
    } catch (error) {
      console.error('Failed to save partial progress:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to save progress'
      });
    }
  },

  // Clear partial session
  clearPartialSession: async (type) => {
    try {
      await dataStore.clearPartialCheckIn(type);
      set({ hasPartialSession: false, error: null });
    } catch (error) {
      console.error('Failed to clear partial session:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to clear partial session'
      });
    }
  },

  // Check if partial session exists
  checkForPartialSession: async (type) => {
    try {
      const partialSession = await dataStore.getPartialCheckIn(type);
      const hasSession = !!partialSession;
      set({ hasPartialSession: hasSession });
      return hasSession;
    } catch (error) {
      console.error('Failed to check for partial session:', error);
      set({ hasPartialSession: false });
      return false;
    }
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