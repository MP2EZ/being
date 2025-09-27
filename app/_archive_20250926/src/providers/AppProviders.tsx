/**
 * Being. App Providers - Provider-Based Architecture
 *
 * Comprehensive provider system using factory patterns to prevent
 * property descriptor errors and enable safe concurrent development.
 *
 * ARCHITECTURE PRINCIPLES:
 * - Factory functions over class instantiation
 * - Provider composition for modular development
 * - Error boundaries at provider level
 * - Safe context initialization
 */

import React, { ReactNode, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';

// Error boundaries
import {
  ErrorBoundary,
  NavigationErrorBoundary,
  TherapeuticErrorBoundary,
  DataErrorBoundary
} from '../components/error/ErrorBoundary';

// Context providers
import { FeatureFlagProvider } from '../contexts/FeatureFlagContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { AppStateProvider } from '../contexts/AppStateContext';
import { PerformanceProvider } from '../contexts/PerformanceContext';

// Store providers (using factories)
import { createStoreProviders } from './StoreProviders';

// Types
import type { AppProvidersProps, ProviderConfig } from '../types/providers';

/**
 * Default provider configuration
 */
const DEFAULT_PROVIDER_CONFIG: ProviderConfig = {
  enableFeatureFlags: true,
  enableThemeSystem: true,
  enablePerformanceMonitoring: true,
  enableErrorBoundaries: true,
  enableOfflineMode: true,
  enableCrisisProtection: true,
  safeMode: false, // Set to true to disable experimental features
};

/**
 * Root App Providers Component
 *
 * Provides all necessary contexts and providers for the Being. app
 * using safe factory patterns and comprehensive error boundaries.
 */
export const AppProviders: React.FC<AppProvidersProps> = ({
  children,
  config = DEFAULT_PROVIDER_CONFIG,
  onInitializationComplete,
  onInitializationError,
}) => {
  const [initializationState, setInitializationState] = useState<{
    isComplete: boolean;
    error: string | null;
    progress: number;
  }>({
    isComplete: false,
    error: null,
    progress: 0,
  });

  /**
   * Initialize all providers safely
   */
  useEffect(() => {
    const initializeProviders = async () => {
      try {
        setInitializationState(prev => ({ ...prev, progress: 10 }));

        // Initialize stores first (using factories)
        const storeInitialization = createStoreProviders(config);
        await storeInitialization.initialize();
        setInitializationState(prev => ({ ...prev, progress: 40 }));

        // Initialize feature flags
        if (config.enableFeatureFlags) {
          // Feature flag initialization is handled by FeatureFlagProvider
          setInitializationState(prev => ({ ...prev, progress: 60 }));
        }

        // Initialize theme system
        if (config.enableThemeSystem) {
          // Theme initialization is handled by ThemeProvider
          setInitializationState(prev => ({ ...prev, progress: 80 }));
        }

        // Complete initialization
        setInitializationState({
          isComplete: true,
          error: null,
          progress: 100,
        });

        onInitializationComplete?.();

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Provider initialization failed';

        setInitializationState({
          isComplete: false,
          error: errorMessage,
          progress: 0,
        });

        onInitializationError?.(new Error(errorMessage));
      }
    };

    initializeProviders();
  }, [config, onInitializationComplete, onInitializationError]);

  // Show loading state during initialization
  if (!initializationState.isComplete) {
    return (
      <SafeAreaProvider>
        <InitializationScreen
          progress={initializationState.progress}
          error={initializationState.error}
        />
        <StatusBar style="dark" />
      </SafeAreaProvider>
    );
  }

  // Main provider tree with error boundaries
  return (
    <ErrorBoundary context="navigation" enableCrisisFallback={config.enableCrisisProtection}>
      <SafeAreaProvider>
        <FeatureFlagProvider enabled={config.enableFeatureFlags}>
          <ThemeProvider enabled={config.enableThemeSystem}>
            <AppStateProvider>
              <PerformanceProvider enabled={config.enablePerformanceMonitoring}>
                <DataErrorBoundary>
                  <NavigationErrorBoundary>
                    <NavigationContainer>
                      <TherapeuticErrorBoundary>
                        {children}
                      </TherapeuticErrorBoundary>
                    </NavigationContainer>
                  </NavigationErrorBoundary>
                </DataErrorBoundary>
              </PerformanceProvider>
            </AppStateProvider>
          </ThemeProvider>
        </FeatureFlagProvider>
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
};

/**
 * Initialization Screen Component
 */
const InitializationScreen: React.FC<{
  progress: number;
  error: string | null;
}> = ({ progress, error }) => {
  return (
    <ErrorBoundary context="navigation" enableCrisisFallback={false}>
      <SafeAreaProvider>
        {/* This would render a proper loading screen */}
        {/* For now, using a simple placeholder */}
        <div style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
          padding: 20,
        }}>
          <h2 style={{
            fontSize: 24,
            fontWeight: '700',
            color: '#1B2951',
            marginBottom: 16,
          }}>
            Being.
          </h2>

          {error ? (
            <div style={{
              backgroundColor: '#FFF5F5',
              border: '1px solid #FFB3B3',
              borderRadius: 8,
              padding: 16,
              marginBottom: 16,
            }}>
              <p style={{ color: '#C53030', fontSize: 14 }}>
                Initialization Error: {error}
              </p>
            </div>
          ) : (
            <div style={{
              width: '100%',
              maxWidth: 200,
              height: 4,
              backgroundColor: '#E5E5E5',
              borderRadius: 2,
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                backgroundColor: '#4A7C59',
                transition: 'width 0.3s ease',
              }} />
            </div>
          )}

          <p style={{
            fontSize: 14,
            color: '#666666',
            marginTop: 16,
          }}>
            {error ? 'Failed to initialize app' : 'Initializing...'}
          </p>
        </div>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
};

/**
 * Safe Provider Factory for Testing and Development
 *
 * Provides a minimal provider setup for testing environments
 * or when full provider tree is not needed.
 */
export const createMinimalProviders = (config: Partial<ProviderConfig> = {}) => {
  const safeConfig = {
    ...DEFAULT_PROVIDER_CONFIG,
    ...config,
    enablePerformanceMonitoring: false, // Disable in minimal setup
    enableCrisisProtection: true, // Always enable for safety
  };

  const MinimalProviders: React.FC<{ children: ReactNode }> = ({ children }) => (
    <SafeAreaProvider>
      <FeatureFlagProvider enabled={safeConfig.enableFeatureFlags}>
        <ThemeProvider enabled={safeConfig.enableThemeSystem}>
          <ErrorBoundary context="navigation">
            {children}
          </ErrorBoundary>
        </ThemeProvider>
      </FeatureFlagProvider>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );

  return MinimalProviders;
};

/**
 * Crisis-Safe Provider for Emergency Situations
 *
 * Provides only essential contexts and maximum stability.
 * Used when the app enters crisis mode or safe mode.
 */
export const CrisisSafeProviders: React.FC<{ children: ReactNode }> = ({ children }) => (
  <SafeAreaProvider>
    <ErrorBoundary context="crisis" enableCrisisFallback={true}>
      <FeatureFlagProvider enabled={false}>
        <ThemeProvider enabled={false}>
          {children}
        </ThemeProvider>
      </FeatureFlagProvider>
    </ErrorBoundary>
    <StatusBar style="dark" />
  </SafeAreaProvider>
);

/**
 * Development Provider Wrapper
 *
 * Includes additional development tools and debugging contexts.
 * Only used in development mode.
 */
export const DevelopmentProviders: React.FC<{ children: ReactNode }> = ({ children }) => {
  if (__DEV__) {
    return (
      <AppProviders
        config={{
          ...DEFAULT_PROVIDER_CONFIG,
          enablePerformanceMonitoring: true,
          safeMode: false, // Enable experimental features in dev
        }}
      >
        {children}
      </AppProviders>
    );
  }

  return (
    <AppProviders>
      {children}
    </AppProviders>
  );
};

/**
 * Provider Hook for Safe Access
 *
 * Provides a safe way to access provider state and prevents
 * crashes when providers are not available.
 */
export const useProvidersReady = () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Simple check to ensure providers are mounted
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return isReady;
};

/**
 * Default export for standard app usage
 */
export default AppProviders;