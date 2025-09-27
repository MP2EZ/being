/**
 * App State Context for Being. MBCT App
 *
 * Global app state management with clinical safety protocols.
 * Provides app lifecycle management and therapeutic session state.
 */

import React, { ReactNode, useEffect, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { createSafeContext } from '../utils/SafeImports';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Therapeutic session state
 */
export interface TherapeuticSession {
  readonly id: string;
  readonly startTime: string;
  readonly type: 'checkin' | 'breathing' | 'assessment' | 'crisis';
  readonly isActive: boolean;
  readonly progress?: number; // 0-1
  readonly data?: Record<string, any>;
}

/**
 * App State Context Interface
 */
export interface AppStateContextValue {
  // App lifecycle
  readonly appState: AppStateStatus;
  readonly isAppActive: boolean;
  readonly isAppInBackground: boolean;

  // Session management
  readonly currentSession: TherapeuticSession | null;
  readonly sessionHistory: readonly TherapeuticSession[];

  // App status
  readonly isOnline: boolean;
  readonly isOfflineModeEnabled: boolean;
  readonly lastSyncTime: string | null;

  // Crisis state
  readonly isCrisisMode: boolean;
  readonly crisisLevel: 'none' | 'mild' | 'moderate' | 'severe';

  // Actions
  startSession: (type: TherapeuticSession['type'], data?: Record<string, any>) => Promise<string>;
  updateSession: (sessionId: string, progress: number, data?: Record<string, any>) => Promise<void>;
  endSession: (sessionId: string) => Promise<void>;
  enableCrisisMode: (level: 'mild' | 'moderate' | 'severe') => Promise<void>;
  disableCrisisMode: () => Promise<void>;
  enableOfflineMode: () => Promise<void>;
  disableOfflineMode: () => Promise<void>;

  // Provider status
  readonly isReady: boolean;
  readonly error: string | null;
}

/**
 * Default context value
 */
const defaultContextValue: AppStateContextValue = {
  appState: 'active',
  isAppActive: true,
  isAppInBackground: false,
  currentSession: null,
  sessionHistory: [],
  isOnline: true,
  isOfflineModeEnabled: false,
  lastSyncTime: null,
  isCrisisMode: false,
  crisisLevel: 'none',
  startSession: async () => {
    console.warn('AppStateContext: startSession called before ready');
    return '';
  },
  updateSession: async () => {
    console.warn('AppStateContext: updateSession called before ready');
  },
  endSession: async () => {
    console.warn('AppStateContext: endSession called before ready');
  },
  enableCrisisMode: async () => {
    console.warn('AppStateContext: enableCrisisMode called before ready');
  },
  disableCrisisMode: async () => {
    console.warn('AppStateContext: disableCrisisMode called before ready');
  },
  enableOfflineMode: async () => {
    console.warn('AppStateContext: enableOfflineMode called before ready');
  },
  disableOfflineMode: async () => {
    console.warn('AppStateContext: disableOfflineMode called before ready');
  },
  isReady: false,
  error: null,
};

/**
 * Create safe context
 */
const {
  Provider: AppStateContextProvider,
  useContext: useAppStateContext,
} = createSafeContext(defaultContextValue, 'AppStateContext');

/**
 * App State Provider Props
 */
export interface AppStateProviderProps {
  children: ReactNode;
  onSessionStart?: (session: TherapeuticSession) => void;
  onSessionEnd?: (session: TherapeuticSession) => void;
  onCrisisStateChange?: (isCrisis: boolean, level: string) => void;
  onError?: (error: Error) => void;
}

/**
 * App State Provider Component
 */
export const AppStateProvider: React.FC<AppStateProviderProps> = ({
  children,
  onSessionStart,
  onSessionEnd,
  onCrisisStateChange,
  onError,
}) => {
  const [providerState, setProviderState] = useState({
    appState: 'active' as AppStateStatus,
    currentSession: null as TherapeuticSession | null,
    sessionHistory: [] as TherapeuticSession[],
    isOnline: true,
    isOfflineModeEnabled: false,
    lastSyncTime: null as string | null,
    isCrisisMode: false,
    crisisLevel: 'none' as 'none' | 'mild' | 'moderate' | 'severe',
    isReady: false,
    error: null as string | null,
  });

  /**
   * Generate session ID
   */
  const generateSessionId = useCallback((): string => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  /**
   * Initialize app state
   */
  useEffect(() => {
    const initialize = async () => {
      try {
        // Load saved state
        const savedSession = await AsyncStorage.getItem('being_current_session');
        const savedHistory = await AsyncStorage.getItem('being_session_history');
        const savedOfflineMode = await AsyncStorage.getItem('being_offline_mode');
        const savedLastSync = await AsyncStorage.getItem('being_last_sync');
        const savedCrisisState = await AsyncStorage.getItem('being_crisis_state');

        const currentSession = savedSession ? JSON.parse(savedSession) : null;
        const sessionHistory = savedHistory ? JSON.parse(savedHistory) : [];
        const isOfflineModeEnabled = savedOfflineMode === 'true';
        const lastSyncTime = savedLastSync;
        const crisisState = savedCrisisState ? JSON.parse(savedCrisisState) : {
          isCrisisMode: false,
          crisisLevel: 'none'
        };

        setProviderState(prev => ({
          ...prev,
          currentSession,
          sessionHistory: sessionHistory.slice(-50), // Keep last 50 sessions
          isOfflineModeEnabled,
          lastSyncTime,
          isCrisisMode: crisisState.isCrisisMode,
          crisisLevel: crisisState.crisisLevel,
          isReady: true,
        }));

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'App state initialization failed';
        setProviderState(prev => ({
          ...prev,
          error: errorMessage,
          isReady: false,
        }));
        onError?.(new Error(errorMessage));
      }
    };

    initialize();
  }, [onError]);

  /**
   * Handle app state changes
   */
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const isGoingToBackground = providerState.appState === 'active' && nextAppState !== 'active';
      const isComingToForeground = providerState.appState !== 'active' && nextAppState === 'active';

      setProviderState(prev => ({
        ...prev,
        appState: nextAppState,
      }));

      // Handle session preservation during backgrounding
      if (isGoingToBackground && providerState.currentSession) {
        // Save current session state
        AsyncStorage.setItem('being_current_session', JSON.stringify(providerState.currentSession));
      }

      // Handle session restoration on foreground
      if (isComingToForeground) {
        // Update last sync time
        setProviderState(prev => ({
          ...prev,
          lastSyncTime: new Date().toISOString(),
        }));
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [providerState.appState, providerState.currentSession]);

  /**
   * Save session history
   */
  const saveSessionHistory = useCallback(async (history: TherapeuticSession[]) => {
    try {
      await AsyncStorage.setItem('being_session_history', JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save session history:', error);
    }
  }, []);

  /**
   * Save crisis state
   */
  const saveCrisisState = useCallback(async (isCrisisMode: boolean, crisisLevel: string) => {
    try {
      await AsyncStorage.setItem('being_crisis_state', JSON.stringify({
        isCrisisMode,
        crisisLevel
      }));
    } catch (error) {
      console.error('Failed to save crisis state:', error);
    }
  }, []);

  /**
   * Context value implementation
   */
  const contextValue: AppStateContextValue = {
    appState: providerState.appState,
    isAppActive: providerState.appState === 'active',
    isAppInBackground: providerState.appState === 'background',
    currentSession: providerState.currentSession,
    sessionHistory: providerState.sessionHistory,
    isOnline: providerState.isOnline,
    isOfflineModeEnabled: providerState.isOfflineModeEnabled,
    lastSyncTime: providerState.lastSyncTime,
    isCrisisMode: providerState.isCrisisMode,
    crisisLevel: providerState.crisisLevel,

    startSession: async (type: TherapeuticSession['type'], data?: Record<string, any>): Promise<string> => {
      if (!providerState.isReady) {
        throw new Error('App state not ready');
      }

      try {
        // End current session if one exists
        if (providerState.currentSession) {
          await contextValue.endSession(providerState.currentSession.id);
        }

        const session: TherapeuticSession = {
          id: generateSessionId(),
          startTime: new Date().toISOString(),
          type,
          isActive: true,
          progress: 0,
          data: data || {},
        };

        setProviderState(prev => ({
          ...prev,
          currentSession: session,
        }));

        // Save current session
        await AsyncStorage.setItem('being_current_session', JSON.stringify(session));

        onSessionStart?.(session);
        return session.id;

      } catch (error) {
        console.error('Failed to start session:', error);
        throw error;
      }
    },

    updateSession: async (sessionId: string, progress: number, data?: Record<string, any>): Promise<void> => {
      if (!providerState.isReady || !providerState.currentSession) {
        return;
      }

      if (providerState.currentSession.id !== sessionId) {
        console.warn(`Session ID mismatch: ${sessionId} vs ${providerState.currentSession.id}`);
        return;
      }

      try {
        const updatedSession: TherapeuticSession = {
          ...providerState.currentSession,
          progress: Math.max(0, Math.min(1, progress)),
          data: {
            ...providerState.currentSession.data,
            ...data,
          },
        };

        setProviderState(prev => ({
          ...prev,
          currentSession: updatedSession,
        }));

        // Save updated session
        await AsyncStorage.setItem('being_current_session', JSON.stringify(updatedSession));

      } catch (error) {
        console.error('Failed to update session:', error);
        throw error;
      }
    },

    endSession: async (sessionId: string): Promise<void> => {
      if (!providerState.isReady || !providerState.currentSession) {
        return;
      }

      if (providerState.currentSession.id !== sessionId) {
        console.warn(`Session ID mismatch: ${sessionId} vs ${providerState.currentSession.id}`);
        return;
      }

      try {
        const endedSession: TherapeuticSession = {
          ...providerState.currentSession,
          isActive: false,
          progress: 1, // Mark as complete
        };

        const updatedHistory = [...providerState.sessionHistory, endedSession];

        setProviderState(prev => ({
          ...prev,
          currentSession: null,
          sessionHistory: updatedHistory.slice(-50), // Keep last 50
        }));

        // Clear current session and save history
        await AsyncStorage.removeItem('being_current_session');
        await saveSessionHistory(updatedHistory);

        onSessionEnd?.(endedSession);

      } catch (error) {
        console.error('Failed to end session:', error);
        throw error;
      }
    },

    enableCrisisMode: async (level: 'mild' | 'moderate' | 'severe'): Promise<void> => {
      if (!providerState.isReady) {
        return;
      }

      try {
        setProviderState(prev => ({
          ...prev,
          isCrisisMode: true,
          crisisLevel: level,
        }));

        await saveCrisisState(true, level);
        onCrisisStateChange?.(true, level);

        console.log(`Crisis mode enabled: ${level}`);

      } catch (error) {
        console.error('Failed to enable crisis mode:', error);
        throw error;
      }
    },

    disableCrisisMode: async (): Promise<void> => {
      if (!providerState.isReady) {
        return;
      }

      try {
        setProviderState(prev => ({
          ...prev,
          isCrisisMode: false,
          crisisLevel: 'none',
        }));

        await saveCrisisState(false, 'none');
        onCrisisStateChange?.(false, 'none');

        console.log('Crisis mode disabled');

      } catch (error) {
        console.error('Failed to disable crisis mode:', error);
        throw error;
      }
    },

    enableOfflineMode: async (): Promise<void> => {
      try {
        setProviderState(prev => ({
          ...prev,
          isOfflineModeEnabled: true,
          isOnline: false,
        }));

        await AsyncStorage.setItem('being_offline_mode', 'true');
        console.log('Offline mode enabled');

      } catch (error) {
        console.error('Failed to enable offline mode:', error);
        throw error;
      }
    },

    disableOfflineMode: async (): Promise<void> => {
      try {
        setProviderState(prev => ({
          ...prev,
          isOfflineModeEnabled: false,
          isOnline: true,
          lastSyncTime: new Date().toISOString(),
        }));

        await AsyncStorage.setItem('being_offline_mode', 'false');
        await AsyncStorage.setItem('being_last_sync', new Date().toISOString());
        console.log('Offline mode disabled');

      } catch (error) {
        console.error('Failed to disable offline mode:', error);
        throw error;
      }
    },

    isReady: providerState.isReady,
    error: providerState.error,
  };

  return (
    <AppStateContextProvider value={contextValue}>
      {children}
    </AppStateContextProvider>
  );
};

/**
 * Hook to use App State Context
 */
export const useAppState = () => {
  const context = useAppStateContext();

  if (!context) {
    console.warn('useAppState called outside AppStateProvider');
    return defaultContextValue;
  }

  return context;
};

/**
 * Hook for therapeutic session management
 */
export const useTherapeuticSession = () => {
  const {
    currentSession,
    sessionHistory,
    startSession,
    updateSession,
    endSession,
  } = useAppState();

  const isSessionActive = currentSession?.isActive ?? false;

  return {
    currentSession,
    sessionHistory,
    isSessionActive,
    startSession,
    updateSession,
    endSession,
  };
};

/**
 * Hook for crisis state management
 */
export const useCrisisState = () => {
  const {
    isCrisisMode,
    crisisLevel,
    enableCrisisMode,
    disableCrisisMode,
  } = useAppState();

  return {
    isCrisisMode,
    crisisLevel,
    enableCrisisMode,
    disableCrisisMode,
    isCritical: crisisLevel === 'severe',
  };
};

/**
 * Hook for offline state management
 */
export const useOfflineState = () => {
  const {
    isOnline,
    isOfflineModeEnabled,
    lastSyncTime,
    enableOfflineMode,
    disableOfflineMode,
  } = useAppState();

  return {
    isOnline,
    isOfflineModeEnabled,
    lastSyncTime,
    enableOfflineMode,
    disableOfflineMode,
  };
};

export default AppStateProvider;