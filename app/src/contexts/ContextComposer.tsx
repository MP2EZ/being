/**
 * Context Composer for Being. MBCT App
 *
 * Provides hierarchical context composition with proper error handling,
 * performance optimization, and therapeutic safety protocols.
 */

import React, { ReactNode, useEffect, useState, useCallback } from 'react';
import { ErrorBoundaryProvider, DefaultErrorFallback } from './ErrorBoundary';
import { ThemeProvider } from './ThemeContext';
import { FeatureFlagProvider } from './FeatureFlagContext';
import { AppStateProvider } from './AppStateContext';
import { PerformanceProvider } from './PerformanceContext';
import { createSafeContext } from '../utils/SafeImports';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

/**
 * Context initialization status
 */
export interface ContextStatus {
  readonly name: string;
  readonly status: 'pending' | 'initializing' | 'ready' | 'error';
  readonly error?: string;
  readonly priority: number; // Lower numbers = higher priority
}

/**
 * Context Composer configuration
 */
export interface ContextComposerConfig {
  readonly enableErrorBoundary: boolean;
  readonly enablePerformanceMonitoring: boolean;
  readonly enableThemeSystem: boolean;
  readonly enableFeatureFlags: boolean;
  readonly enableAppState: boolean;
  readonly safeMode: boolean;
  readonly developmentMode: boolean;
  readonly skipNonCritical: boolean;
}

/**
 * Context Composer state interface
 */
export interface ContextComposerValue {
  readonly isReady: boolean;
  readonly isInitializing: boolean;
  readonly contextStatuses: readonly ContextStatus[];
  readonly criticalContextsReady: boolean;
  readonly allContextsReady: boolean;
  readonly hasErrors: boolean;
  readonly config: ContextComposerConfig;

  // Control actions
  retryFailedContexts: () => Promise<void>;
  enableSafeMode: () => void;
  reinitializeContexts: () => Promise<void>;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ContextComposerConfig = {
  enableErrorBoundary: true,
  enablePerformanceMonitoring: true,
  enableThemeSystem: true,
  enableFeatureFlags: true,
  enableAppState: true,
  safeMode: false,
  developmentMode: __DEV__,
  skipNonCritical: false,
};

/**
 * Critical contexts that must be ready before app start
 */
const CRITICAL_CONTEXTS = ['ErrorBoundary', 'AppState', 'Theme'];

/**
 * Context initialization order (by priority)
 */
const CONTEXT_PRIORITIES = {
  ErrorBoundary: 1,
  Performance: 2,
  AppState: 3,
  Theme: 4,
  FeatureFlags: 5,
};

/**
 * Default context composer value
 */
const defaultContextValue: ContextComposerValue = {
  isReady: false,
  isInitializing: false,
  contextStatuses: [],
  criticalContextsReady: false,
  allContextsReady: false,
  hasErrors: false,
  config: DEFAULT_CONFIG,
  retryFailedContexts: async () => {
    console.warn('ContextComposer: retryFailedContexts called before ready');
  },
  enableSafeMode: () => {
    console.warn('ContextComposer: enableSafeMode called before ready');
  },
  reinitializeContexts: async () => {
    console.warn('ContextComposer: reinitializeContexts called before ready');
  },
};

/**
 * Create safe context composer context
 */
const {
  Provider: ContextComposerProvider,
  useContext: useContextComposerContext,
} = createSafeContext(defaultContextValue, 'ContextComposer');

/**
 * Context Composer Props
 */
export interface ContextComposerProps {
  children: ReactNode;
  config?: Partial<ContextComposerConfig>;
  loadingComponent?: React.ComponentType;
  errorComponent?: React.ComponentType<{ error: string; onRetry: () => void }>;
  onReady?: () => void;
  onError?: (error: Error, context: string) => void;
}

/**
 * Context Composer Component
 */
export const ContextComposer: React.FC<ContextComposerProps> = ({
  children,
  config: userConfig = {},
  loadingComponent: LoadingComponent,
  errorComponent: ErrorComponent,
  onReady,
  onError,
}) => {
  const config = { ...DEFAULT_CONFIG, ...userConfig };

  const [composerState, setComposerState] = useState({
    isReady: false,
    isInitializing: false,
    contextStatuses: [] as ContextStatus[],
    hasErrors: false,
  });

  /**
   * Initialize context status tracking
   */
  const initializeContextStatuses = useCallback(() => {
    const statuses: ContextStatus[] = [];

    if (config.enableErrorBoundary) {
      statuses.push({
        name: 'ErrorBoundary',
        status: 'pending',
        priority: CONTEXT_PRIORITIES.ErrorBoundary,
      });
    }

    if (config.enablePerformanceMonitoring) {
      statuses.push({
        name: 'Performance',
        status: 'pending',
        priority: CONTEXT_PRIORITIES.Performance,
      });
    }

    if (config.enableAppState) {
      statuses.push({
        name: 'AppState',
        status: 'pending',
        priority: CONTEXT_PRIORITIES.AppState,
      });
    }

    if (config.enableThemeSystem) {
      statuses.push({
        name: 'Theme',
        status: 'pending',
        priority: CONTEXT_PRIORITIES.Theme,
      });
    }

    if (config.enableFeatureFlags) {
      statuses.push({
        name: 'FeatureFlags',
        status: 'pending',
        priority: CONTEXT_PRIORITIES.FeatureFlags,
      });
    }

    return statuses.sort((a, b) => a.priority - b.priority);
  }, [config]);

  /**
   * Update context status
   */
  const updateContextStatus = useCallback(
    (name: string, status: ContextStatus['status'], error?: string) => {
      setComposerState(prev => ({
        ...prev,
        contextStatuses: prev.contextStatuses.map(ctx =>
          ctx.name === name ? { ...ctx, status, error } : ctx
        ),
      }));
    },
    []
  );

  /**
   * Check if critical contexts are ready
   */
  const checkCriticalContextsReady = useCallback((statuses: ContextStatus[]): boolean => {
    const criticalStatuses = statuses.filter(ctx => CRITICAL_CONTEXTS.includes(ctx.name));
    return criticalStatuses.every(ctx => ctx.status === 'ready');
  }, []);

  /**
   * Check if all contexts are ready
   */
  const checkAllContextsReady = useCallback((statuses: ContextStatus[]): boolean => {
    return statuses.every(ctx => ctx.status === 'ready' || (config.skipNonCritical && !CRITICAL_CONTEXTS.includes(ctx.name)));
  }, [config.skipNonCritical]);

  /**
   * Initialize contexts sequentially
   */
  const initializeContexts = useCallback(async () => {
    setComposerState(prev => ({ ...prev, isInitializing: true }));

    const statuses = initializeContextStatuses();
    setComposerState(prev => ({ ...prev, contextStatuses: statuses }));

    // Initialize contexts in priority order
    for (const contextStatus of statuses) {
      try {
        updateContextStatus(contextStatus.name, 'initializing');

        // Simulate initialization delay (in real implementation, this would be actual initialization)
        await new Promise(resolve => setTimeout(resolve, 100));

        updateContextStatus(contextStatus.name, 'ready');

        // Check if critical contexts are ready
        const currentStatuses = statuses.map(ctx =>
          ctx.name === contextStatus.name ? { ...ctx, status: 'ready' as const } : ctx
        );

        if (CRITICAL_CONTEXTS.includes(contextStatus.name) && checkCriticalContextsReady(currentStatuses)) {
          console.log('Critical contexts are ready');
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Initialization failed';
        updateContextStatus(contextStatus.name, 'error', errorMessage);
        onError?.(error as Error, contextStatus.name);

        // For critical contexts, this is a blocking error
        if (CRITICAL_CONTEXTS.includes(contextStatus.name) && !config.safeMode) {
          setComposerState(prev => ({
            ...prev,
            hasErrors: true,
            isInitializing: false,
          }));
          return;
        }
      }
    }

    // Check final readiness state
    setComposerState(prev => {
      const criticalReady = checkCriticalContextsReady(prev.contextStatuses);
      const allReady = checkAllContextsReady(prev.contextStatuses);

      const isReady = config.safeMode ? criticalReady : allReady;

      if (isReady) {
        onReady?.();
      }

      return {
        ...prev,
        isReady,
        isInitializing: false,
        criticalContextsReady: criticalReady,
        allContextsReady: allReady,
      };
    });
  }, [
    config.safeMode,
    initializeContextStatuses,
    updateContextStatus,
    checkCriticalContextsReady,
    checkAllContextsReady,
    onReady,
    onError,
  ]);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    initializeContexts();
  }, [initializeContexts]);

  /**
   * Context value implementation
   */
  const contextValue: ContextComposerValue = {
    isReady: composerState.isReady,
    isInitializing: composerState.isInitializing,
    contextStatuses: composerState.contextStatuses,
    criticalContextsReady: checkCriticalContextsReady(composerState.contextStatuses),
    allContextsReady: checkAllContextsReady(composerState.contextStatuses),
    hasErrors: composerState.hasErrors,
    config,

    retryFailedContexts: async () => {
      const failedContexts = composerState.contextStatuses.filter(ctx => ctx.status === 'error');

      for (const context of failedContexts) {
        try {
          updateContextStatus(context.name, 'initializing');
          // Retry initialization
          await new Promise(resolve => setTimeout(resolve, 100));
          updateContextStatus(context.name, 'ready');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Retry failed';
          updateContextStatus(context.name, 'error', errorMessage);
        }
      }
    },

    enableSafeMode: () => {
      // Enable safe mode configuration
      setComposerState(prev => ({
        ...prev,
        hasErrors: false,
        isReady: checkCriticalContextsReady(prev.contextStatuses),
      }));
    },

    reinitializeContexts: async () => {
      setComposerState(prev => ({
        ...prev,
        isReady: false,
        hasErrors: false,
        contextStatuses: prev.contextStatuses.map(ctx => ({ ...ctx, status: 'pending' as const, error: undefined })),
      }));

      await initializeContexts();
    },
  };

  /**
   * Render loading state
   */
  if (composerState.isInitializing && !composerState.isReady) {
    if (LoadingComponent) {
      return <LoadingComponent />;
    }

    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A7C59" />
        <Text style={styles.loadingText}>Initializing Being. App...</Text>
        <View style={styles.statusContainer}>
          {composerState.contextStatuses.map(status => (
            <View key={status.name} style={styles.statusItem}>
              <Text style={styles.statusName}>{status.name}</Text>
              <Text style={[styles.statusText, { color: getStatusColor(status.status) }]}>
                {status.status}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  /**
   * Render error state
   */
  if (composerState.hasErrors && !config.safeMode) {
    const firstError = composerState.contextStatuses.find(ctx => ctx.status === 'error');
    const errorMessage = firstError?.error || 'Context initialization failed';

    if (ErrorComponent) {
      return (
        <ErrorComponent
          error={errorMessage}
          onRetry={() => contextValue.retryFailedContexts()}
        />
      );
    }

    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Initialization Error</Text>
        <Text style={styles.errorMessage}>{errorMessage}</Text>
        <Text style={styles.errorSubtext}>
          Critical contexts failed to initialize. Please restart the app.
        </Text>
      </View>
    );
  }

  /**
   * Render context hierarchy
   */
  let contextTree = (
    <ContextComposerProvider value={contextValue}>
      {children}
    </ContextComposerProvider>
  );

  // Wrap with contexts in reverse priority order (highest priority outermost)
  if (config.enableFeatureFlags) {
    contextTree = (
      <FeatureFlagProvider
        enabled={!config.safeMode}
        safeMode={config.safeMode}
        onError={(error) => onError?.(error, 'FeatureFlags')}
        onReady={() => updateContextStatus('FeatureFlags', 'ready')}
      >
        {contextTree}
      </FeatureFlagProvider>
    );
  }

  if (config.enableThemeSystem) {
    contextTree = (
      <ThemeProvider
        enabled={!config.safeMode}
        onError={(error) => onError?.(error, 'Theme')}
      >
        {contextTree}
      </ThemeProvider>
    );
  }

  if (config.enableAppState) {
    contextTree = (
      <AppStateProvider
        onError={(error) => onError?.(error, 'AppState')}
      >
        {contextTree}
      </AppStateProvider>
    );
  }

  if (config.enablePerformanceMonitoring) {
    contextTree = (
      <PerformanceProvider
        enabled={!config.safeMode}
        enableDetailedMetrics={config.developmentMode}
        onError={(error) => onError?.(error, 'Performance')}
      >
        {contextTree}
      </PerformanceProvider>
    );
  }

  if (config.enableErrorBoundary) {
    contextTree = (
      <ErrorBoundaryProvider
        fallbackComponent={DefaultErrorFallback}
        onError={(error) => onError?.(new Error(error.message), 'ErrorBoundary')}
        enableCrashReporting={!config.developmentMode}
      >
        {contextTree}
      </ErrorBoundaryProvider>
    );
  }

  return contextTree;
};

/**
 * Hook to use Context Composer
 */
export const useContextComposer = () => {
  const context = useContextComposerContext();

  if (!context) {
    console.warn('useContextComposer called outside ContextComposer');
    return defaultContextValue;
  }

  return context;
};

/**
 * Hook to check if app is ready
 */
export const useAppReady = () => {
  const { isReady, criticalContextsReady, hasErrors } = useContextComposer();

  return {
    isReady,
    criticalContextsReady,
    hasErrors,
    canProceed: isReady && !hasErrors,
  };
};

/**
 * Get status color for UI
 */
const getStatusColor = (status: ContextStatus['status']): string => {
  switch (status) {
    case 'ready': return '#4A7C59';
    case 'initializing': return '#40B5AD';
    case 'error': return '#DC2626';
    case 'pending': return '#666666';
    default: return '#666666';
  }
};

/**
 * Styles
 */
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFAF5',
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1B2951',
    marginTop: 16,
    marginBottom: 24,
  },
  statusContainer: {
    width: '100%',
    maxWidth: 300,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginVertical: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  statusName: {
    fontSize: 14,
    color: '#1B2951',
    fontWeight: '500',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#DC2626',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#1B2951',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default ContextComposer;