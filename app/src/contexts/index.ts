/**
 * Central Export for Being. Context System
 *
 * Provides comprehensive state management foundations with encrypted persistence,
 * error recovery, and therapeutic safety protocols.
 */

// Core Context Providers
export { ThemeProvider, useTheme, useThemeColors, useTherapeuticTheme, useAccessibility } from './ThemeContext';
export { FeatureFlagProvider, useFeatureFlags, withFeatureFlag, useFeature, useCrisisSafeFeature, useDevFeature } from './FeatureFlagContext';
export { AppStateProvider, useAppState, useTherapeuticSession, useCrisisState, useOfflineState } from './AppStateContext';
export { PerformanceProvider, usePerformance, useTherapeuticTiming, usePerformanceOptimization } from './PerformanceContext';

// Error Handling
export { ErrorBoundaryProvider, useErrorBoundary, DefaultErrorFallback } from './ErrorBoundary';
export type { EnhancedErrorInfo, ErrorSeverity, ErrorCategory, ErrorRecoveryStrategy } from './ErrorBoundary';

// Context Composition
export { ContextComposer, useContextComposer, useAppReady } from './ContextComposer';
export type { ContextComposerConfig, ContextStatus, ContextComposerValue } from './ContextComposer';

// Enhanced Store Exports with Encryption
export { useCheckInStore } from '../store/checkInStore';
export { useUserStore } from '../store/userStore';
export { useFeatureFlagStore } from '../store/featureFlagStore';
export { useAssessmentStore, useCrisisSafeAssessment, useAssessmentAnalytics } from '../store/assessmentStore';

// Safe Import Utilities
export {
  createSafeContext,
  createSafeComponent,
  createSafeStore,
  safeGet,
  safeExecute,
  safeExecuteAsync,
  SafePatterns
} from '../utils/SafeImports';

/**
 * Default Context Configuration for Being. App
 */
export const BEING_CONTEXT_CONFIG = {
  enableErrorBoundary: true,
  enablePerformanceMonitoring: true,
  enableThemeSystem: true,
  enableFeatureFlags: true,
  enableAppState: true,
  safeMode: false,
  developmentMode: __DEV__,
  skipNonCritical: false,
} as const;

/**
 * Context Provider Composition Order
 *
 * Higher priority contexts are listed first (outer providers)
 */
export const CONTEXT_PROVIDER_ORDER = [
  'ErrorBoundary',    // Highest priority - catches all errors
  'Performance',      // Performance monitoring and optimization
  'AppState',        // App lifecycle and session management
  'Theme',           // Therapeutic theming system
  'FeatureFlags',    // Feature flag evaluation system
] as const;

/**
 * Crisis-Safe Context Hook
 *
 * Provides access to critical contexts with guaranteed availability
 * during crisis situations.
 */
export const useCrisisSafeContext = () => {
  const appState = useAppState();
  const theme = useTheme();
  const performance = usePerformance();
  const errorBoundary = useErrorBoundary();

  return {
    // Always available crisis functions
    enableCrisisMode: appState.enableCrisisMode,
    disableCrisisMode: appState.disableCrisisMode,
    isCrisisMode: appState.isCrisisMode,
    crisisLevel: appState.crisisLevel,

    // Performance monitoring for crisis response
    measureCrisisResponse: performance.measureCrisisResponse,
    trackCrisisButton: performance.trackCrisisButton,
    optimizeForCrisisMode: performance.optimizeForCrisisMode,

    // Theme access for crisis UI
    currentTheme: theme.currentTheme,
    isReady: theme.isReady,

    // Error reporting for crisis scenarios
    reportCriticalError: errorBoundary.reportCriticalError,
    enableCrisisMode: errorBoundary.enableCrisisMode,

    // Status checks
    allContextsReady: appState.isReady && theme.isReady && performance.isReady,
    hasErrors: errorBoundary.hasErrors,
  };
};

/**
 * Therapeutic Session Context Hook
 *
 * Provides context specifically optimized for therapeutic sessions
 * with performance monitoring and continuity preservation.
 */
export const useTherapeuticSessionContext = () => {
  const { currentSession, isSessionActive, startSession, updateSession, endSession } = useTherapeuticSession();
  const { currentTheme, isAutoThemeEnabled, switchToTherapeuticMode } = useTherapeuticTheme();
  const {
    measureRender,
    startBreathingTimer,
    checkBreathingAccuracy,
    optimizeForTherapeuticSession,
    trackBreathingCycle
  } = useTherapeuticTiming();

  return {
    // Session management
    session: {
      current: currentSession,
      isActive: isSessionActive,
      start: startSession,
      update: updateSession,
      end: endSession,
    },

    // Therapeutic theming
    theme: {
      current: currentTheme,
      isAutoEnabled: isAutoThemeEnabled,
      enableTherapeuticMode: switchToTherapeuticMode,
    },

    // Performance optimization for therapeutic interactions
    performance: {
      measureRender,
      startBreathingTimer,
      checkBreathingAccuracy,
      optimizeForSession: optimizeForTherapeuticSession,
      trackBreathingCycle,
    },

    // Convenience methods
    startTherapeuticSession: async (type: 'checkin' | 'breathing' | 'assessment') => {
      // Enable therapeutic mode
      await switchToTherapeuticMode();

      // Optimize performance
      optimizeForTherapeuticSession();

      // Start session
      return await startSession(type);
    },
  };
};

/**
 * Clinical Data Context Hook
 *
 * Provides access to clinical assessment and check-in data
 * with proper encryption and crisis detection.
 */
export const useClinicalDataContext = () => {
  const checkInStore = useCheckInStore();
  const assessmentStore = useAssessmentStore();
  const { isCrisisDetected, lastCrisisAssessment, handleCrisisDetection } = useCrisisSafeAssessment();
  const { phq9Analytics, gad7Analytics, refreshAnalytics } = useAssessmentAnalytics();

  return {
    // Check-in data
    checkIns: {
      list: checkInStore.checkIns,
      current: checkInStore.currentCheckIn,
      today: checkInStore.todaysCheckIns,
      createCheckIn: checkInStore.createCheckIn,
      updateCheckIn: checkInStore.updateCheckIn,
      completeCheckIn: checkInStore.completeCheckIn,
      isLoading: checkInStore.isLoading,
    },

    // Assessment data
    assessments: {
      list: assessmentStore.assessments,
      current: assessmentStore.currentAssessment,
      startAssessment: assessmentStore.startAssessment,
      answerQuestion: assessmentStore.answerQuestion,
      saveAssessment: assessmentStore.saveAssessment,
      isLoading: assessmentStore.isLoading,
    },

    // Crisis detection
    crisis: {
      isDetected: isCrisisDetected,
      lastAssessment: lastCrisisAssessment,
      handleDetection: handleCrisisDetection,
    },

    // Analytics
    analytics: {
      phq9: phq9Analytics,
      gad7: gad7Analytics,
      refresh: refreshAnalytics,
    },

    // Data operations
    refreshAllData: async () => {
      await Promise.all([
        checkInStore.loadCheckIns(),
        assessmentStore.loadAssessments(),
        refreshAnalytics(),
      ]);
    },
  };
};

/**
 * App Initialization Hook
 *
 * Provides centralized app initialization status and control.
 */
export const useAppInitialization = () => {
  const { isReady, isInitializing, contextStatuses, hasErrors } = useContextComposer();
  const { isReady: userReady } = useUserStore();
  const { isReady: themeReady } = useTheme();
  const { isReady: performanceReady } = usePerformance();

  const initializationStatus = {
    contexts: isReady,
    user: userReady,
    theme: themeReady,
    performance: performanceReady,
  };

  const allReady = Object.values(initializationStatus).every(Boolean);

  return {
    isInitializing,
    isReady: allReady,
    hasErrors,
    contextStatuses,
    initializationStatus,

    // Detailed status
    readiness: {
      critical: initializationStatus.contexts && initializationStatus.user,
      full: allReady,
      percentage: Math.round(
        (Object.values(initializationStatus).filter(Boolean).length /
         Object.values(initializationStatus).length) * 100
      ),
    },
  };
};

/**
 * Export all context types for TypeScript users
 */
export type {
  ThemeContextValue,
  ThemeConfig,
  ThemeColors,
} from './ThemeContext';

export type {
  FeatureFlagContextValue,
} from './FeatureFlagContext';

export type {
  AppStateContextValue,
  TherapeuticSession,
} from './AppStateContext';

export type {
  PerformanceContextValue,
  PerformanceMetrics,
  PerformanceAlert,
  TherapeuticTimingRequirements,
} from './PerformanceContext';

export type {
  ErrorBoundaryContextValue,
} from './ErrorBoundary';