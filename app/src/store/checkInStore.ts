/**
 * Check-in Store - Zustand state management for check-in flows
 * Enhanced with offline-first sync capabilities and clinical data integrity
 * Handles morning, midday, and evening check-ins with AsyncStorage persistence
 * Enhanced with ResumableSessionService for robust session management
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CheckIn } from '../types.ts';
import { dataStore } from '../services/storage/SecureDataStore';
import { networkService } from '../services/NetworkService';
import { resumableSessionService } from '../services/ResumableSessionService';
import { offlineQueueService as enhancedOfflineQueueService } from '../services/OfflineQueueService';
import { ResumableSession, SessionProgress } from '../types/ResumableSession';
import { validateCheckInData, ValidationError, sanitizeTextInput, sanitizeArrayInput } from '../utils/validation';
import {
  ValidatedTherapeuticCheckIn,
  ClinicalValidationState,
  TherapeuticTimingValidation,
  ClinicalCalculationCertified,
  TherapeuticTimingCertified
} from '../types/clinical-type-safety';
import {
  createClinicalValidationState,
  createClinicalCalculationCertified,
  createTherapeuticTimingCertified,
  validateClinicalData,
  validateTherapeuticTiming
} from '../utils/clinical-type-guards';
import { withSync } from './mixins/syncMixin';
import {
  SyncOperationType,
  SyncEntityType,
  SyncableData,
  ClinicalValidationResult
} from '../types/sync';
import { OfflinePriority } from '../types/offline';
import { createSafeStore } from '../utils/SafeImports';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { encryptionService, DataSensitivity } from '../services/security';

/**
 * Helper function to calculate total steps for each check-in type
 */
const getCheckInSteps = (type: 'morning' | 'midday' | 'evening'): number => {
  switch (type) {
    case 'morning':
      return 8; // Body scan, emotions, thoughts, sleep, energy, anxiety, value, intention
    case 'midday':
      return 5; // Emotions, breathing, pleasant event, unpleasant event, current need
    case 'evening':
      return 12; // Highlight, challenge, emotions, gratitude (3), learning, tension, release, sleep intentions, tomorrow focus, letting go
    default:
      return 5;
  }
};

/**
 * Helper function to calculate progress percentage based on completed steps
 */
const calculateProgress = (completedSteps: string[], totalSteps: number): number => {
  const completed = Math.min(completedSteps.length, totalSteps);
  return Math.round((completed / totalSteps) * 100);
};

/**
 * Helper function to determine completed steps based on check-in data
 */
const getCompletedSteps = (data: Partial<CheckIn['data']>, type: 'morning' | 'midday' | 'evening' | undefined): string[] => {
  const completedSteps: string[] = [];
  
  if (!data || !type) return completedSteps;
  
  switch (type) {
    case 'morning':
      if (data.bodyAreas && data.bodyAreas.length > 0) completedSteps.push('bodyAreas');
      if (data.emotions && data.emotions.length > 0) completedSteps.push('emotions');
      if (data.thoughts && data.thoughts.length > 0) completedSteps.push('thoughts');
      if (typeof data.sleepQuality === 'number') completedSteps.push('sleepQuality');
      if (typeof data.energyLevel === 'number') completedSteps.push('energyLevel');
      if (typeof data.anxietyLevel === 'number') completedSteps.push('anxietyLevel');
      if (data.todayValue) completedSteps.push('todayValue');
      if (data.intention) completedSteps.push('intention');
      break;
      
    case 'midday':
      if (data.currentEmotions && data.currentEmotions.length > 0) completedSteps.push('currentEmotions');
      if (typeof data.breathingCompleted === 'boolean') completedSteps.push('breathingCompleted');
      if (data.pleasantEvent) completedSteps.push('pleasantEvent');
      if (data.unpleasantEvent) completedSteps.push('unpleasantEvent');
      if (data.currentNeed) completedSteps.push('currentNeed');
      break;
      
    case 'evening':
      if (data.dayHighlight) completedSteps.push('dayHighlight');
      if (data.dayChallenge) completedSteps.push('dayChallenge');
      if (data.dayEmotions && data.dayEmotions.length > 0) completedSteps.push('dayEmotions');
      if (data.gratitude1) completedSteps.push('gratitude1');
      if (data.gratitude2) completedSteps.push('gratitude2');
      if (data.gratitude3) completedSteps.push('gratitude3');
      if (data.dayLearning) completedSteps.push('dayLearning');
      if (data.tensionAreas && data.tensionAreas.length > 0) completedSteps.push('tensionAreas');
      if (data.releaseNote) completedSteps.push('releaseNote');
      if (data.sleepIntentions && data.sleepIntentions.length > 0) completedSteps.push('sleepIntentions');
      if (data.tomorrowFocus) completedSteps.push('tomorrowFocus');
      if (data.lettingGo) completedSteps.push('lettingGo');
      break;
  }
  
  return completedSteps;
};

interface CheckInState {
  checkIns: CheckIn[];
  currentCheckIn: Partial<CheckIn> | null;
  todaysCheckIns: CheckIn[];
  isLoading: boolean;
  error: string | null;
  hasPartialSession: boolean;

  // Enhanced session state
  currentSession: ResumableSession | null;
  sessionProgress: SessionProgress | null;

  // Widget integration state
  widgetDataNeedsUpdate: boolean;
  lastWidgetUpdateTime: string | null;

  // Clinical validation state
  clinicalValidationEnabled: boolean;
  strictTimingEnabled: boolean;
  clinicalCalculator: ClinicalCalculationCertified | null;
  timingValidator: TherapeuticTimingCertified | null;
  validationErrors: string[];
  
  // Actions
  loadCheckIns: () => Promise<void>;
  loadTodaysCheckIns: () => Promise<void>;
  startCheckIn: (type: 'morning' | 'midday' | 'evening', currentScreen?: string) => Promise<void>;
  resumeCheckIn: (type: 'morning' | 'midday' | 'evening') => Promise<boolean>;
  updateCurrentCheckIn: (data: Partial<CheckIn['data']>, currentScreen?: string) => Promise<void>;
  saveCurrentCheckIn: () => Promise<void>;
  savePartialProgress: (currentScreen?: string, navigationStack?: string[]) => Promise<void>;
  skipCheckIn: (type: 'morning' | 'midday' | 'evening') => Promise<void>;
  clearCurrentCheckIn: () => void;
  clearPartialSession: (type: 'morning' | 'midday' | 'evening') => Promise<void>;
  checkForPartialSession: (type: 'morning' | 'midday' | 'evening') => Promise<boolean>;
  
  // Enhanced session management
  updateSessionProgress: (progressData: Partial<SessionProgress>, currentScreen?: string) => Promise<void>;
  getSessionProgress: (type: 'morning' | 'midday' | 'evening') => Promise<SessionProgress | null>;
  extendCurrentSession: (additionalHours?: number) => Promise<void>;
  
  // Queries
  getCheckInsByType: (type: 'morning' | 'midday' | 'evening', days?: number) => Promise<CheckIn[]>;
  getRecentCheckIns: (days?: number) => Promise<CheckIn[]>;
  getTodaysCheckIn: (type: 'morning' | 'midday' | 'evening') => CheckIn | null;
  
  // Computed properties
  hasCompletedTodaysCheckIn: (type: 'morning' | 'midday' | 'evening') => boolean;
  getTodaysProgress: () => { completed: number; total: number };
  getSessionProgressPercentage: () => number;
  
  // Widget integration methods
  markWidgetUpdateNeeded: () => void;
  markWidgetUpdated: () => void;
  getWidgetUpdateStatus: () => { needsUpdate: boolean; lastUpdate: string | null };

  // Clinical validation methods
  enableClinicalValidation: () => void;
  disableClinicalValidation: () => void;
  enableStrictTiming: () => void;
  disableStrictTiming: () => void;
  validateCheckInClinically: (checkIn: Partial<CheckIn>) => Promise<ValidatedTherapeuticCheckIn | null>;
  getClinicalValidationStatus: () => { enabled: boolean; errors: string[] };
}

/**
 * Custom validation for check-in data sync
 */
const validateCheckInSyncData = (data: SyncableData): ClinicalValidationResult => {
  const checkIn = data as CheckIn;
  
  const result: ClinicalValidationResult = {
    isValid: true,
    assessmentScoresValid: true,
    crisisThresholdsValid: true,
    therapeuticContinuityPreserved: true,
    dataIntegrityIssues: [],
    recommendations: [],
    validatedAt: new Date().toISOString()
  };

  // Validate check-in structure
  if (!checkIn.type || !['morning', 'midday', 'evening'].includes(checkIn.type)) {
    result.isValid = false;
    result.dataIntegrityIssues.push('Invalid check-in type');
  }

  if (!checkIn.timestamp) {
    result.isValid = false;
    result.dataIntegrityIssues.push('Missing timestamp');
  }

  // Validate therapeutic continuity (check-ins should be within reasonable time bounds)
  if (checkIn.timestamp) {
    const checkInTime = new Date(checkIn.timestamp);
    const now = new Date();
    const timeDiff = Math.abs(now.getTime() - checkInTime.getTime());
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    if (hoursDiff > 48) { // Check-ins older than 48 hours
      result.therapeuticContinuityPreserved = false;
      result.recommendations.push('Check-in timestamp may be outdated');
    }
  }

  // Validate data completeness based on type
  const completedSteps = getCompletedSteps(checkIn.data, checkIn.type);
  const expectedSteps = getCheckInSteps(checkIn.type);
  
  if (completedSteps.length === 0 && checkIn.completed) {
    result.isValid = false;
    result.dataIntegrityIssues.push('Check-in marked complete but no data present');
  }

  return result;
};

/**
 * Encrypted storage for clinical check-in data
 */
const encryptedStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const encryptedData = await AsyncStorage.getItem(name);
      if (!encryptedData) return null;

      const decrypted = await encryptionService.decryptData(
        JSON.parse(encryptedData),
        DataSensitivity.CLINICAL
      );
      return JSON.stringify(decrypted);
    } catch (error) {
      console.error('Failed to decrypt check-in data:', error);
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const data = JSON.parse(value);
      const encrypted = await encryptionService.encryptData(
        data,
        DataSensitivity.CLINICAL
      );
      await AsyncStorage.setItem(name, JSON.stringify(encrypted));
    } catch (error) {
      console.error('Failed to encrypt check-in data:', error);
      throw error;
    }
  },
  removeItem: async (name: string): Promise<void> => {
    await AsyncStorage.removeItem(name);
  },
};

export const useCheckInStore = create(
  subscribeWithSelector(
    persist(
      withSync(
        SyncEntityType.CHECK_IN,
        (set, get) => ({
  checkIns: [],
  currentCheckIn: null,
  todaysCheckIns: [],
  isLoading: false,
  error: null,
  hasPartialSession: false,
  
  // Enhanced session state
  currentSession: null,
  sessionProgress: null,
  
  // Widget integration state
  widgetDataNeedsUpdate: false,
  lastWidgetUpdateTime: null,

  // Clinical validation state
  clinicalValidationEnabled: false,
  strictTimingEnabled: false,
  clinicalCalculator: null,
  timingValidator: null,
  validationErrors: [],

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

  // Start a new check-in with enhanced session management
  startCheckIn: async (type, currentScreen = 'start') => {
    set({ isLoading: true, error: null });
    
    try {
      const now = new Date().toISOString();
      const checkInId = `checkin_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
      
      const newCheckIn: Partial<CheckIn> = {
        id: checkInId,
        type,
        startedAt: now,
        skipped: false,
        data: {}
      };
      
      // Calculate total steps based on check-in type
      const totalSteps = getCheckInSteps(type);
      
      // Create session progress tracking
      const sessionProgress: SessionProgress = {
        currentStep: 0,
        totalSteps,
        completedSteps: [],
        percentComplete: 0,
        estimatedTimeRemaining: totalSteps * 60, // Estimate 1 minute per step
      };
      
      // Create resumable session
      const session: Partial<ResumableSession> = {
        id: checkInId,
        type: 'checkin',
        subType: type,
        startedAt: now,
        progress: sessionProgress,
        data: newCheckIn.data || {},
        metadata: {
          resumeCount: 0,
          totalDuration: 0,
          lastScreen: currentScreen,
          navigationStack: [currentScreen],
        },
      };
      
      // Save session to ResumableSessionService
      await resumableSessionService.saveSession(session);
      
      set({ 
        currentCheckIn: newCheckIn, 
        currentSession: session as ResumableSession,
        sessionProgress,
        hasPartialSession: false,
        isLoading: false,
        error: null 
      });
    } catch (error) {
      console.error('Failed to start check-in:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to start check-in',
        isLoading: false 
      });
    }
  },

  // Update current check-in data with enhanced session tracking
  updateCurrentCheckIn: async (data, currentScreen = 'unknown') => {
    const { currentCheckIn, currentSession } = get();
    if (!currentCheckIn) {
      set({ error: 'No active check-in to update' });
      return;
    }
    
    try {
      const updatedCheckIn = {
        ...currentCheckIn,
        data: { ...currentCheckIn.data, ...data }
      };
      
      // Update session if it exists
      if (currentSession) {
        // Determine which steps are now completed based on the data
        const completedSteps = getCompletedSteps(updatedCheckIn.data, currentCheckIn.type);
        const totalSteps = getCheckInSteps(currentCheckIn.type as 'morning' | 'midday' | 'evening');
        const percentComplete = calculateProgress(completedSteps, totalSteps);
        const estimatedTimeRemaining = Math.max(0, (totalSteps - completedSteps.length) * 60);
        
        const progressUpdate: Partial<SessionProgress> = {
          completedSteps,
          percentComplete,
          estimatedTimeRemaining,
        };
        
        // Update session in ResumableSessionService
        await resumableSessionService.updateProgress(currentSession.id, progressUpdate);
        
        // Update session metadata
        const updatedSession: ResumableSession = {
          ...currentSession,
          data: updatedCheckIn.data || {},
          progress: {
            ...currentSession.progress,
            ...progressUpdate,
          },
          metadata: {
            ...currentSession.metadata,
            lastScreen: currentScreen,
            navigationStack: [...(currentSession.metadata.navigationStack || []), currentScreen],
          },
        };
        
        await resumableSessionService.saveSession(updatedSession);
        
        set({ 
          currentCheckIn: updatedCheckIn,
          currentSession: updatedSession,
          sessionProgress: updatedSession.progress,
          error: null 
        });
        
        // Perform optimistic update for sync if check-in has ID (partially saved)
        if (updatedCheckIn.id) {
          get()._performOptimisticUpdate(updatedCheckIn.id, updatedCheckIn);
        }
      } else {
        // Fallback: just update the check-in without session tracking
        set({ currentCheckIn: updatedCheckIn, error: null });
        
        // Perform optimistic update for sync if check-in has ID
        if (updatedCheckIn.id) {
          get()._performOptimisticUpdate(updatedCheckIn.id, updatedCheckIn);
        }
      }
    } catch (error) {
      console.error('Failed to update check-in:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update check-in'
      });
    }
  },

  // Save current check-in to storage with session cleanup
  saveCurrentCheckIn: async () => {
    const { currentCheckIn, currentSession, loadCheckIns, loadTodaysCheckIns } = get();
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
      
      // Save to local storage first
      await dataStore.saveCheckIn(completedCheckIn);
      
      // Prepare sync operation for offline queue
      const syncOperation = get()._prepareSyncOperation(
        SyncOperationType.CREATE,
        completedCheckIn,
        {
          priority: OfflinePriority.MEDIUM,
          optimistic: true,
          clinicalSafety: true
        }
      );
      
      // Add to enhanced offline queue for sync
      await enhancedOfflineQueueService.addAction({
        type: 'save_checkin' as any,
        data: completedCheckIn,
        priority: OfflinePriority.MEDIUM,
        clinicalSafety: true,
        metadata: {
          entityType: SyncEntityType.CHECK_IN,
          entityId: completedCheckIn.id,
          operation: 'create'
        }
      });
      
      // Clear resumable session after successful save
      if (currentSession) {
        await resumableSessionService.deleteSession(currentSession.id);
      }
      
      // Backward compatibility: Clear legacy partial session
      if (completedCheckIn.type) {
        await dataStore.clearPartialCheckIn(completedCheckIn.type);
      }
      
      set({ 
        currentCheckIn: null, 
        currentSession: null,
        sessionProgress: null,
        hasPartialSession: false, 
        isLoading: false 
      });
      
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

      // Emit reactive event for check-in completion
      try {
        const { reactiveStateManagerUtils } = await import('./reactiveStateManager');
        await reactiveStateManagerUtils.emitCheckInCompleted(completedCheckIn);
      } catch (error) {
        console.error('Failed to emit check-in completion event:', error);
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

  // Clear current check-in (abandon) with session cleanup
  clearCurrentCheckIn: () => {
    const { currentSession } = get();
    
    // Optionally save as partial session before clearing (commented out for abandon scenario)
    // if (currentSession) {
    //   resumableSessionService.saveSession({
    //     ...currentSession,
    //     metadata: { ...currentSession.metadata, interruptionReason: 'manual' }
    //   });
    // }
    
    set({ 
      currentCheckIn: null, 
      currentSession: null,
      sessionProgress: null,
      error: null, 
      hasPartialSession: false 
    });
  },

  // Resume interrupted session with enhanced session management
  resumeCheckIn: async (type) => {
    set({ isLoading: true, error: null });
    
    try {
      // Try to get session from ResumableSessionService first
      const resumableSession = await resumableSessionService.getSession('checkin', type);
      
      if (resumableSession && resumableSessionService.canResumeSession(resumableSession)) {
        // Increment resume count
        const updatedMetadata = {
          ...resumableSession.metadata,
          resumeCount: resumableSession.metadata.resumeCount + 1,
        };
        
        const updatedSession = {
          ...resumableSession,
          metadata: updatedMetadata,
          lastUpdatedAt: new Date().toISOString(),
        };
        
        await resumableSessionService.saveSession(updatedSession);
        
        // Recreate partial CheckIn from session data
        const resumedCheckIn: Partial<CheckIn> = {
          id: resumableSession.id,
          type,
          startedAt: resumableSession.startedAt,
          skipped: false,
          data: resumableSession.data as Partial<CheckIn['data']>,
        };
        
        set({ 
          currentCheckIn: resumedCheckIn,
          currentSession: updatedSession,
          sessionProgress: updatedSession.progress,
          hasPartialSession: true, 
          isLoading: false 
        });
        
        console.log(`Resumed check-in session: ${type} (${resumableSession.progress.percentComplete}% complete)`);
        return true;
      }
      
      // Fallback: try legacy partial session
      const legacyPartialSession = await dataStore.getPartialCheckIn(type);
      
      if (legacyPartialSession) {
        set({ 
          currentCheckIn: legacyPartialSession, 
          currentSession: null,
          sessionProgress: null,
          hasPartialSession: true, 
          isLoading: false 
        });
        
        console.log(`Resumed legacy partial session: ${type}`);
        return true;
      }
      
      // No resumable session found
      set({ 
        hasPartialSession: false, 
        currentSession: null,
        sessionProgress: null,
        isLoading: false 
      });
      return false;
      
    } catch (error) {
      console.error('Failed to resume check-in:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to resume check-in',
        hasPartialSession: false,
        currentSession: null,
        sessionProgress: null,
        isLoading: false 
      });
      return false;
    }
  },

  // Save current progress as partial session with enhanced tracking
  savePartialProgress: async (currentScreen = 'unknown', navigationStack?: string[]) => {
    const { currentCheckIn, currentSession } = get();
    if (!currentCheckIn || !currentCheckIn.type || !currentCheckIn.id) {
      set({ error: 'No valid check-in to save as partial' });
      return;
    }
    
    try {
      // Use ResumableSessionService if session exists
      if (currentSession) {
        // Calculate current progress
        const completedSteps = getCompletedSteps(currentCheckIn.data, currentCheckIn.type);
        const totalSteps = getCheckInSteps(currentCheckIn.type);
        const percentComplete = calculateProgress(completedSteps, totalSteps);
        const estimatedTimeRemaining = Math.max(0, (totalSteps - completedSteps.length) * 60);
        
        const sessionUpdate: Partial<ResumableSession> = {
          ...currentSession,
          data: currentCheckIn.data || {},
          progress: {
            ...currentSession.progress,
            completedSteps,
            percentComplete,
            estimatedTimeRemaining,
          },
          metadata: {
            ...currentSession.metadata,
            lastScreen: currentScreen,
            navigationStack: navigationStack || [...(currentSession.metadata.navigationStack || []), currentScreen],
            interruptionReason: 'manual',
          },
          lastUpdatedAt: new Date().toISOString(),
        };
        
        await resumableSessionService.saveSession(sessionUpdate);
        
        set({ 
          currentSession: sessionUpdate as ResumableSession,
          sessionProgress: sessionUpdate.progress,
          hasPartialSession: true, 
          error: null 
        });
        
        console.log(`Saved partial progress: ${currentCheckIn.type} (${percentComplete}% complete)`);
      } else {
        // Fallback: use legacy method
        await dataStore.savePartialCheckIn(currentCheckIn);
        set({ hasPartialSession: true, error: null });
        
        console.log(`Saved legacy partial progress: ${currentCheckIn.type}`);
      }
    } catch (error) {
      console.error('Failed to save partial progress:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to save progress'
      });
    }
  },

  // Clear partial session with enhanced cleanup
  clearPartialSession: async (type) => {
    try {
      // Clear from ResumableSessionService first
      const session = await resumableSessionService.getSession('checkin', type);
      if (session) {
        await resumableSessionService.deleteSession(session.id);
      }
      
      // Backward compatibility: clear legacy partial session
      await dataStore.clearPartialCheckIn(type);
      
      set({ 
        hasPartialSession: false, 
        currentSession: null,
        sessionProgress: null,
        error: null 
      });
      
      console.log(`Cleared partial session: ${type}`);
    } catch (error) {
      console.error('Failed to clear partial session:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to clear partial session'
      });
    }
  },

  // Check if partial session exists with enhanced detection
  checkForPartialSession: async (type) => {
    try {
      // Check ResumableSessionService first
      const hasResumableSession = await resumableSessionService.hasActiveSession('checkin', type);
      
      if (hasResumableSession) {
        set({ hasPartialSession: true });
        return true;
      }
      
      // Fallback: check legacy partial session
      const legacyPartialSession = await dataStore.getPartialCheckIn(type);
      const hasLegacySession = !!legacyPartialSession;
      
      set({ hasPartialSession: hasLegacySession });
      return hasLegacySession;
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
  },

  // Enhanced session management methods
  updateSessionProgress: async (progressData, currentScreen = 'unknown') => {
    const { currentSession } = get();
    if (!currentSession) {
      set({ error: 'No active session to update progress' });
      return;
    }

    try {
      const updatedProgress = {
        ...currentSession.progress,
        ...progressData,
      };

      const updatedSession: ResumableSession = {
        ...currentSession,
        progress: updatedProgress,
        metadata: {
          ...currentSession.metadata,
          lastScreen: currentScreen,
        },
        lastUpdatedAt: new Date().toISOString(),
      };

      await resumableSessionService.saveSession(updatedSession);

      set({
        currentSession: updatedSession,
        sessionProgress: updatedProgress,
        error: null,
      });
    } catch (error) {
      console.error('Failed to update session progress:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to update session progress'
      });
    }
  },

  getSessionProgress: async (type) => {
    try {
      const session = await resumableSessionService.getSession('checkin', type);
      return session?.progress || null;
    } catch (error) {
      console.error('Failed to get session progress:', error);
      return null;
    }
  },

  extendCurrentSession: async (additionalHours = 12) => {
    const { currentSession } = get();
    if (!currentSession) {
      set({ error: 'No active session to extend' });
      return;
    }

    try {
      await resumableSessionService.extendSession(currentSession.id, additionalHours);
      
      // Update local state with new expiration
      const expiresAt = new Date(currentSession.expiresAt);
      expiresAt.setHours(expiresAt.getHours() + additionalHours);
      
      const updatedSession = {
        ...currentSession,
        expiresAt: expiresAt.toISOString(),
      };

      set({
        currentSession: updatedSession,
        error: null,
      });

      console.log(`Extended session ${currentSession.id} by ${additionalHours} hours`);
    } catch (error) {
      console.error('Failed to extend session:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to extend session'
      });
    }
  },

  getSessionProgressPercentage: () => {
    const { sessionProgress } = get();
    return sessionProgress?.percentComplete || 0;
  },

  // Widget integration methods
  markWidgetUpdateNeeded: () => {
    set({ 
      widgetDataNeedsUpdate: true,
      error: null 
    });
  },

  markWidgetUpdated: () => {
    set({ 
      widgetDataNeedsUpdate: false,
      lastWidgetUpdateTime: new Date().toISOString(),
      error: null 
    });
  },

  getWidgetUpdateStatus: () => {
    const { widgetDataNeedsUpdate, lastWidgetUpdateTime } = get();
    return {
      needsUpdate: widgetDataNeedsUpdate,
      lastUpdate: lastWidgetUpdateTime
    };
  },

  // Clinical validation methods
  enableClinicalValidation: () => {
    try {
      const clinicalCalculator = createClinicalCalculationCertified();
      set({
        clinicalValidationEnabled: true,
        clinicalCalculator,
        validationErrors: [],
        error: null
      });
      console.log('Clinical validation enabled for check-ins');
    } catch (error) {
      console.error('Failed to enable clinical validation:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to enable clinical validation'
      });
    }
  },

  disableClinicalValidation: () => {
    set({
      clinicalValidationEnabled: false,
      clinicalCalculator: null,
      validationErrors: [],
      error: null
    });
    console.log('Clinical validation disabled for check-ins');
  },

  enableStrictTiming: () => {
    try {
      const timingValidator = createTherapeuticTimingCertified();
      set({
        strictTimingEnabled: true,
        timingValidator,
        validationErrors: [],
        error: null
      });
      console.log('Strict timing validation enabled for check-ins');
    } catch (error) {
      console.error('Failed to enable strict timing:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to enable strict timing'
      });
    }
  },

  disableStrictTiming: () => {
    set({
      strictTimingEnabled: false,
      timingValidator: null,
      validationErrors: [],
      error: null
    });
    console.log('Strict timing validation disabled for check-ins');
  },

  validateCheckInClinically: async (checkIn: Partial<CheckIn>): Promise<ValidatedTherapeuticCheckIn | null> => {
    const { clinicalValidationEnabled, clinicalCalculator, timingValidator } = get();

    if (!clinicalValidationEnabled || !clinicalCalculator) {
      console.warn('Clinical validation not enabled');
      return null;
    }

    try {
      // Create clinical validation state
      const validationState = createClinicalValidationState('check-in-store-v1.0');

      // Create timing validation if available
      let timingValidation: TherapeuticTimingValidation | undefined;
      if (timingValidator && checkIn.startedAt) {
        const startTime = new Date(checkIn.startedAt).getTime();
        const currentTime = Date.now();
        const duration = currentTime - startTime;

        timingValidation = {
          sessionStarted: checkIn.startedAt as any,
          expectedDuration: timingValidator.validateTotalSession(180000),
          actualDuration: duration,
          withinTherapeuticWindow: Math.abs(duration - 180000) <= 60000,
          timingAccuracy: duration <= 120000 ? 'precise' :
                         duration <= 240000 ? 'acceptable' : 'concerning'
        };
      }

      // Validate check-in data structure
      if (!checkIn.type || !['morning', 'midday', 'evening'].includes(checkIn.type)) {
        throw new Error('Invalid check-in type for clinical validation');
      }

      // Create validated therapeutic check-in
      const validatedCheckIn: ValidatedTherapeuticCheckIn = {
        id: checkIn.id as any,
        context: checkIn.type as any,
        startTime: (checkIn.startedAt || new Date().toISOString()) as any,
        completionTime: checkIn.completedAt as any,
        status: checkIn.completed ? 'completed' : 'in_progress',
        mood: checkIn.data?.mood ? {
          scale: Math.min(10, Math.max(1, checkIn.data.mood.value || 5)) as any,
          timestamp: new Date().toISOString() as any,
          intensity: 'moderate',
          context: checkIn.type as any,
          validatedAt: new Date().toISOString() as any,
          clinicallyRelevant: (checkIn.data.mood.value || 5) <= 4 || (checkIn.data.mood.value || 5) >= 8
        } : {
          scale: 5 as any,
          timestamp: new Date().toISOString() as any,
          intensity: 'moderate',
          context: checkIn.type as any,
          validatedAt: new Date().toISOString() as any,
          clinicallyRelevant: false
        },
        breathingCompleted: checkIn.data?.breathingCompleted || false,
        exercises: [],
        notes: checkIn.data?.intention || checkIn.data?.dayHighlight || '',
        validationStatus: 'valid',
        validationState,
        timingValidation: timingValidation || {
          sessionStarted: (checkIn.startedAt || new Date().toISOString()) as any,
          expectedDuration: 180000 as any,
          actualDuration: 0,
          withinTherapeuticWindow: true,
          timingAccuracy: 'acceptable'
        }
      };

      // Validate the complete structure
      const clinicallyValidated = validateClinicalData(validatedCheckIn, clinicalCalculator);
      const therapeuticallyTimed = timingValidator ?
        validateTherapeuticTiming(clinicallyValidated, timingValidator) :
        clinicallyValidated;

      set({ validationErrors: [], error: null });
      console.log('Check-in validated clinically:', {
        type: checkIn.type,
        clinicallyRelevant: validatedCheckIn.mood.clinicallyRelevant,
        timingAccuracy: validatedCheckIn.timingValidation.timingAccuracy
      });

      return therapeuticallyTimed as ValidatedTherapeuticCheckIn;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Clinical validation failed';
      console.error('Clinical validation error:', error);

      set({
        validationErrors: [errorMessage],
        error: `Clinical validation failed: ${errorMessage}`
      });

      return null;
    }
  },

  getClinicalValidationStatus: () => {
    const { clinicalValidationEnabled, validationErrors } = get();
    return {
      enabled: clinicalValidationEnabled,
      errors: validationErrors
    };
  }
        }),
        validateCheckInSyncData
      ),
      {
        name: 'being-checkin-store',
        storage: createJSONStorage(() => encryptedStorage),
        partialize: (state) => ({
          checkIns: state.checkIns,
          todaysCheckIns: state.todaysCheckIns,
          sessionProgress: state.sessionProgress,
          widgetDataNeedsUpdate: state.widgetDataNeedsUpdate,
          lastWidgetUpdateTime: state.lastWidgetUpdateTime,
        }),
        version: 1,
        migrate: (persistedState: any, version: number) => {
          // Handle data migration for clinical safety
          if (version === 0) {
            return {
              ...persistedState,
              sessionProgress: null,
              widgetDataNeedsUpdate: false,
              lastWidgetUpdateTime: null,
            };
          }
          return persistedState;
        },
        onRehydrateStorage: () => (state) => {
          if (state) {
            console.log('Check-in store rehydrated successfully');

            // Trigger reactive updates on rehydration
            setTimeout(() => {
              try {
                const { reactiveStateManagerUtils } = require('./reactiveStateManager');

                // Emit events for completed check-ins
                if (state.todaysCheckIns) {
                  const completedToday = state.todaysCheckIns.filter(c => c.completedAt && !c.skipped);
                  completedToday.forEach(checkIn => {
                    reactiveStateManagerUtils.emitCheckInCompleted(checkIn);
                  });
                }

                // Mark widget update if needed
                if (state.markWidgetUpdateNeeded) {
                  state.markWidgetUpdateNeeded();
                }
              } catch (error) {
                console.error('Failed to emit reactive events on rehydration:', error);
              }
            }, 1000);
          }
        },
      }
    )
  )
);