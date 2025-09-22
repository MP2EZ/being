/**
 * Being. App Provider - Comprehensive Context Orchestration
 *
 * Top-level provider that orchestrates all context systems for the Being. MBCT app
 * with clinical safety protocols, encrypted persistence, and crisis-safe operation.
 */

import React, { ReactNode, useEffect, useState, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import {
  ContextComposer,
  BEING_CONTEXT_CONFIG,
  useAppInitialization,
  useCrisisSafeContext,
  useTherapeuticSessionContext,
  useClinicalDataContext,
} from './index';
import { createSafeContext } from '../utils/SafeImports';

/**
 * Being. App state interface
 */
export interface BeingAppState {
  readonly isReady: boolean;
  readonly isInitializing: boolean;
  readonly hasCriticalErrors: boolean;
  readonly initializationProgress: number;
  readonly canProceedToApp: boolean;
  readonly safeMode: boolean;
  readonly lastError: string | null;

  // App lifecycle
  onAppReady: () => void;
  onCriticalError: (error: Error) => void;
  enableSafeMode: () => void;
  retryInitialization: () => Promise<void>;

  // Crisis management
  readonly isCrisisMode: boolean;
  enableCrisisMode: (level: 'mild' | 'moderate' | 'severe') => Promise<void>;
  disableCrisisMode: () => Promise<void>;

  // Data management
  refreshAllData: () => Promise<void>;
  clearAppData: () => Promise<void>;
}

/**
 * Default app state
 */
const defaultAppState: BeingAppState = {
  isReady: false,
  isInitializing: false,
  hasCriticalErrors: false,
  initializationProgress: 0,
  canProceedToApp: false,
  safeMode: false,
  lastError: null,
  onAppReady: () => {
    console.warn('BeingApp: onAppReady called before ready');
  },
  onCriticalError: () => {
    console.warn('BeingApp: onCriticalError called before ready');
  },
  enableSafeMode: () => {
    console.warn('BeingApp: enableSafeMode called before ready');
  },
  retryInitialization: async () => {
    console.warn('BeingApp: retryInitialization called before ready');
  },
  isCrisisMode: false,
  enableCrisisMode: async () => {
    console.warn('BeingApp: enableCrisisMode called before ready');
  },
  disableCrisisMode: async () => {
    console.warn('BeingApp: disableCrisisMode called before ready');
  },
  refreshAllData: async () => {
    console.warn('BeingApp: refreshAllData called before ready');
  },
  clearAppData: async () => {
    console.warn('BeingApp: clearAppData called before ready');
  },
};

/**
 * Create safe Being. app context
 */
const {
  Provider: BeingAppContextProvider,
  useContext: useBeingAppContext,
} = createSafeContext(defaultAppState, 'BeingApp');

/**
 * Being. App Provider Props
 */
export interface BeingAppProviderProps {
  children: ReactNode;
  config?: Partial<typeof BEING_CONTEXT_CONFIG>;
  onReady?: () => void;
  onError?: (error: Error, context: string) => void;
  onCrisisDetected?: (level: string) => void;
  enableCrashReporting?: boolean;
  enableAnalytics?: boolean;
}

/**
 * Being. App Provider Component
 */
export const BeingAppProvider: React.FC<BeingAppProviderProps> = ({
  children,
  config: userConfig = {},
  onReady,
  onError,
  onCrisisDetected,
  enableCrashReporting = !__DEV__,
  enableAnalytics = !__DEV__,
}) => {
  const [appState, setAppState] = useState({
    isReady: false,
    isInitializing: false,
    hasCriticalErrors: false,
    initializationProgress: 0,
    safeMode: false,
    lastError: null as string | null,
  });

  const config = { ...BEING_CONTEXT_CONFIG, ...userConfig };

  /**
   * Handle initialization progress
   */
  const handleInitializationProgress = useCallback((progress: number) => {
    setAppState(prev => ({
      ...prev,
      initializationProgress: Math.max(prev.initializationProgress, progress),
    }));
  }, []);

  /**
   * Handle app ready state
   */
  const handleAppReady = useCallback(() => {
    setAppState(prev => ({
      ...prev,
      isReady: true,
      isInitializing: false,
      initializationProgress: 100,
    }));

    console.log('🎉 Being. app is ready');
    onReady?.();
  }, [onReady]);

  /**
   * Handle critical errors
   */
  const handleCriticalError = useCallback((error: Error, context: string = 'Unknown') => {
    const errorMessage = `${context}: ${error.message}`;

    setAppState(prev => ({
      ...prev,
      hasCriticalErrors: true,
      lastError: errorMessage,
      isInitializing: false,
    }));

    console.error('🚨 Critical error in Being. app:', errorMessage, error);
    onError?.(error, context);

    // Show user-friendly error message
    if (!__DEV__) {
      Alert.alert(
        'App Error',
        'The Being. app encountered an error. Please restart the app or contact support if the problem persists.',
        [
          { text: 'Retry', onPress: () => handleRetryInitialization() },
          { text: 'Safe Mode', onPress: () => handleEnableSafeMode() },
        ]
      );
    }
  }, [onError]);

  /**
   * Enable safe mode
   */
  const handleEnableSafeMode = useCallback(() => {
    setAppState(prev => ({
      ...prev,
      safeMode: true,
      hasCriticalErrors: false,
      lastError: null,
    }));

    console.log('🛡️ Safe mode enabled');
  }, []);

  /**
   * Retry initialization
   */
  const handleRetryInitialization = useCallback(async () => {
    setAppState(prev => ({
      ...prev,
      isInitializing: true,
      hasCriticalErrors: false,
      lastError: null,
      initializationProgress: 0,
    }));

    try {
      // Reset initialization progress
      handleInitializationProgress(0);

      // Wait for context system to reinitialize
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('🔄 Retrying Being. app initialization');
    } catch (error) {
      handleCriticalError(error as Error, 'Retry Initialization');
    }
  }, [handleCriticalError, handleInitializationProgress]);

  /**
   * Crisis mode management
   */
  const handleEnableCrisisMode = useCallback(async (level: 'mild' | 'moderate' | 'severe') => {
    try {
      console.log(`🚨 Enabling crisis mode: ${level}`);
      onCrisisDetected?.(level);

      // Enable crisis protocols in all contexts
      // This will be handled by the useCrisisSafeContext hook
    } catch (error) {
      console.error('Failed to enable crisis mode:', error);
      handleCriticalError(error as Error, 'Crisis Mode');
    }
  }, [onCrisisDetected, handleCriticalError]);

  /**
   * Data management
   */
  const handleRefreshAllData = useCallback(async () => {
    try {
      console.log('🔄 Refreshing all app data');
      // This will be handled by the useClinicalDataContext hook
    } catch (error) {
      console.error('Failed to refresh app data:', error);
      handleCriticalError(error as Error, 'Data Refresh');
    }
  }, [handleCriticalError]);

  /**
   * Clear app data
   */
  const handleClearAppData = useCallback(async () => {
    try {
      Alert.alert(
        'Clear App Data',
        'This will remove all your check-ins, assessments, and settings. This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear Data',
            style: 'destructive',
            onPress: async () => {
              console.log('🗑️ Clearing all app data');
              // Implementation would clear all stores and AsyncStorage
              // This is a placeholder for the actual implementation
            },
          },
        ]
      );
    } catch (error) {
      console.error('Failed to clear app data:', error);
      handleCriticalError(error as Error, 'Clear Data');
    }
  }, [handleCriticalError]);

  /**
   * App state value
   */
  const appStateValue: BeingAppState = {
    isReady: appState.isReady,
    isInitializing: appState.isInitializing,
    hasCriticalErrors: appState.hasCriticalErrors,
    initializationProgress: appState.initializationProgress,
    canProceedToApp: appState.isReady && !appState.hasCriticalErrors,
    safeMode: appState.safeMode,
    lastError: appState.lastError,

    onAppReady: handleAppReady,
    onCriticalError: handleCriticalError,
    enableSafeMode: handleEnableSafeMode,
    retryInitialization: handleRetryInitialization,

    isCrisisMode: false, // This will be provided by context hooks
    enableCrisisMode: handleEnableCrisisMode,
    disableCrisisMode: async () => {
      console.log('🟢 Disabling crisis mode');
    },

    refreshAllData: handleRefreshAllData,
    clearAppData: handleClearAppData,
  };

  /**
   * Enhanced error handling for React Native
   */
  useEffect(() => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      const originalConsoleError = console.error;
      console.error = (...args) => {
        originalConsoleError(...args);

        // Check for critical React Native errors
        const errorMessage = args.join(' ');
        if (
          errorMessage.includes('RCTFatalException') ||
          errorMessage.includes('Unhandled promise rejection') ||
          errorMessage.includes('Metro error')
        ) {
          handleCriticalError(new Error(errorMessage), 'React Native');
        }
      };

      return () => {
        console.error = originalConsoleError;
      };
    }
  }, [handleCriticalError]);

  return (
    <BeingAppContextProvider value={appStateValue}>
      <ContextComposer
        config={{
          ...config,
          safeMode: appState.safeMode,
        }}
        onReady={handleAppReady}
        onError={handleCriticalError}
      >
        <BeingAppInnerProvider>
          {children}
        </BeingAppInnerProvider>
      </ContextComposer>
    </BeingAppContextProvider>
  );
};

/**
 * Inner provider component that accesses initialized contexts
 */
const BeingAppInnerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isReady, readiness } = useAppInitialization();
  const crisisSafe = useCrisisSafeContext();
  const therapeuticSession = useTherapeuticSessionContext();
  const clinicalData = useClinicalDataContext();

  // Update app state with crisis mode from contexts
  const appState = useBeingAppContext();

  useEffect(() => {
    if (isReady && readiness.full) {
      appState.onAppReady();
    }
  }, [isReady, readiness.full, appState]);

  // Monitor crisis state
  useEffect(() => {
    if (crisisSafe.isCrisisMode && !appState.isCrisisMode) {
      appState.enableCrisisMode(crisisSafe.crisisLevel as 'mild' | 'moderate' | 'severe');
    }
  }, [crisisSafe.isCrisisMode, crisisSafe.crisisLevel, appState]);

  // Enhanced app state with context integration
  const enhancedAppState: BeingAppState = {
    ...appState,
    isCrisisMode: crisisSafe.isCrisisMode,
    enableCrisisMode: crisisSafe.enableCrisisMode,
    disableCrisisMode: crisisSafe.disableCrisisMode,
    refreshAllData: clinicalData.refreshAllData,
  };

  return (
    <BeingAppContextProvider value={enhancedAppState}>
      {children}
    </BeingAppContextProvider>
  );
};

/**
 * Hook to use Being. App state
 */
export const useBeingApp = () => {
  const context = useBeingAppContext();

  if (!context) {
    console.warn('useBeingApp called outside BeingAppProvider');
    return defaultAppState;
  }

  return context;
};

/**
 * Hook for app readiness checking
 */
export const useAppReadiness = () => {
  const { isReady, isInitializing, canProceedToApp, initializationProgress } = useBeingApp();
  const { readiness } = useAppInitialization();

  return {
    isReady,
    isInitializing,
    canProceed: canProceedToApp,
    progress: initializationProgress,
    criticalReady: readiness.critical,
    fullReady: readiness.full,
    percentage: readiness.percentage,
  };
};

/**
 * Hook for crisis-aware app state
 */
export const useCrisisAwareApp = () => {
  const appState = useBeingApp();
  const crisisSafe = useCrisisSafeContext();

  return {
    ...appState,
    crisis: {
      isActive: crisisSafe.isCrisisMode,
      level: crisisSafe.crisisLevel,
      enable: crisisSafe.enableCrisisMode,
      disable: crisisSafe.disableCrisisMode,
      trackResponse: crisisSafe.measureCrisisResponse,
      optimizePerformance: crisisSafe.optimizeForCrisisMode,
    },
    allSystemsOperational: appState.isReady && crisisSafe.allContextsReady && !crisisSafe.hasErrors,
  };
};

export default BeingAppProvider;