/**
 * Enhanced Feature Flag Context System
 *
 * Provider-based feature flag system with safe defaults and clinical safety.
 * Integrates with the existing FeatureFlagStore using safe patterns.
 */

import React, { ReactNode, useContext, useEffect, useState } from 'react';
import { createSafeContext } from '../utils/SafeImports';
import { useFeatureFlagStore } from '../store/featureFlagStore';
import type { P0CloudFeatureFlags, FeatureAccessResult } from '../types/feature-flags';

/**
 * Feature Flag Context Interface
 */
export interface FeatureFlagContextValue {
  // Flag evaluation
  isEnabled: (flag: keyof P0CloudFeatureFlags) => boolean;
  requestAccess: (flag: keyof P0CloudFeatureFlags) => Promise<FeatureAccessResult>;

  // Status information
  isLoading: boolean;
  error: string | null;
  healthStatus: 'healthy' | 'warning' | 'critical';

  // User actions
  updateConsent: (flag: keyof P0CloudFeatureFlags, consent: boolean) => Promise<void>;

  // Emergency controls
  enableSafeMode: () => Promise<void>;
  disableAllFeatures: () => Promise<void>;

  // Provider status
  isReady: boolean;
}

/**
 * Default context value with safe fallbacks
 */
const defaultContextValue: FeatureFlagContextValue = {
  isEnabled: () => false, // Safe default: all features disabled
  requestAccess: async () => ({ granted: false, reason: 'Context not ready' }),
  isLoading: true,
  error: null,
  healthStatus: 'warning',
  updateConsent: async () => {
    console.warn('FeatureFlagContext: updateConsent called before ready');
  },
  enableSafeMode: async () => {
    console.warn('FeatureFlagContext: enableSafeMode called before ready');
  },
  disableAllFeatures: async () => {
    console.warn('FeatureFlagContext: disableAllFeatures called before ready');
  },
  isReady: false,
};

/**
 * Create safe context with proper error handling
 */
const {
  Provider: FeatureFlagContextProvider,
  useContext: useFeatureFlagContext,
} = createSafeContext(defaultContextValue, 'FeatureFlagContext');

/**
 * Feature Flag Provider Props
 */
export interface FeatureFlagProviderProps {
  children: ReactNode;
  enabled?: boolean;
  safeMode?: boolean;
  onError?: (error: Error) => void;
  onReady?: () => void;
}

/**
 * Feature Flag Provider Component
 *
 * Provides feature flag functionality using the existing store
 * with enhanced safety and error handling.
 */
export const FeatureFlagProvider: React.FC<FeatureFlagProviderProps> = ({
  children,
  enabled = true,
  safeMode = false,
  onError,
  onReady,
}) => {
  const [providerState, setProviderState] = useState({
    isReady: false,
    error: null as string | null,
  });

  // Access the feature flag store
  const store = useFeatureFlagStore();

  /**
   * Initialize feature flags
   */
  useEffect(() => {
    if (!enabled) {
      setProviderState({ isReady: true, error: null });
      onReady?.();
      return;
    }

    const initialize = async () => {
      try {
        // Initialize the store
        await store.initializeFlags();

        // Enable safe mode if requested
        if (safeMode) {
          await store.emergencyEnableOfflineMode();
        }

        setProviderState({ isReady: true, error: null });
        onReady?.();

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Feature flag initialization failed';
        setProviderState({ isReady: false, error: errorMessage });
        onError?.(new Error(errorMessage));
      }
    };

    initialize();
  }, [enabled, safeMode, store, onError, onReady]);

  /**
   * Create context value with safe implementations
   */
  const contextValue: FeatureFlagContextValue = {
    isEnabled: (flag: keyof P0CloudFeatureFlags): boolean => {
      if (!enabled || !providerState.isReady) {
        return false; // Safe default
      }

      try {
        return store.evaluateFlag(flag);
      } catch (error) {
        console.error('Feature flag evaluation error:', error);
        return false; // Safe fallback
      }
    },

    requestAccess: async (flag: keyof P0CloudFeatureFlags): Promise<FeatureAccessResult> => {
      if (!enabled || !providerState.isReady) {
        return { granted: false, reason: 'Feature flags not ready' };
      }

      try {
        return await store.requestFeatureAccess(flag);
      } catch (error) {
        console.error('Feature access request error:', error);
        return { granted: false, reason: 'Request failed' };
      }
    },

    isLoading: store.isLoading || !providerState.isReady,
    error: providerState.error || store.error,
    healthStatus: store.healthStatus?.overall || 'warning',

    updateConsent: async (flag: keyof P0CloudFeatureFlags, consent: boolean): Promise<void> => {
      if (!enabled || !providerState.isReady) {
        console.warn('Cannot update consent: Feature flags not ready');
        return;
      }

      try {
        await store.updateUserConsent(flag, consent);
      } catch (error) {
        console.error('Consent update error:', error);
        throw error;
      }
    },

    enableSafeMode: async (): Promise<void> => {
      try {
        await store.emergencyEnableOfflineMode();
        console.log('Safe mode enabled');
      } catch (error) {
        console.error('Failed to enable safe mode:', error);
        throw error;
      }
    },

    disableAllFeatures: async (): Promise<void> => {
      try {
        // Get all feature flags and disable them
        const flags = Object.keys(store.flags) as (keyof P0CloudFeatureFlags)[];

        for (const flag of flags) {
          await store.emergencyDisable(flag, 'Provider requested disable all');
        }

        console.log('All features disabled');
      } catch (error) {
        console.error('Failed to disable all features:', error);
        throw error;
      }
    },

    isReady: enabled && providerState.isReady,
  };

  return (
    <FeatureFlagContextProvider value={contextValue}>
      {children}
    </FeatureFlagContextProvider>
  );
};

/**
 * Hook to use Feature Flag Context
 *
 * Provides safe access to feature flag functionality with proper error handling.
 */
export const useFeatureFlags = () => {
  const context = useFeatureFlagContext();

  // Additional safety check
  if (!context) {
    console.warn('useFeatureFlags called outside FeatureFlagProvider');
    return defaultContextValue;
  }

  return context;
};

/**
 * Higher-Order Component for Feature Flag Protection
 *
 * Wraps components to only render when specific feature flags are enabled.
 */
export const withFeatureFlag = <P extends object>(
  flag: keyof P0CloudFeatureFlags,
  FallbackComponent?: React.ComponentType<P>
) => {
  return (WrappedComponent: React.ComponentType<P>) => {
    const WithFeatureFlagComponent: React.FC<P> = (props) => {
      const { isEnabled, isReady } = useFeatureFlags();

      // Show nothing while loading
      if (!isReady) {
        return null;
      }

      // Show fallback or nothing if feature disabled
      if (!isEnabled(flag)) {
        return FallbackComponent ? <FallbackComponent {...props} /> : null;
      }

      // Render wrapped component if feature enabled
      return <WrappedComponent {...props} />;
    };

    WithFeatureFlagComponent.displayName = `withFeatureFlag(${flag})(${WrappedComponent.displayName || WrappedComponent.name})`;

    return WithFeatureFlagComponent;
  };
};

/**
 * Hook for conditional feature rendering
 *
 * Provides a simple way to conditionally render content based on feature flags.
 */
export const useFeature = (flag: keyof P0CloudFeatureFlags) => {
  const { isEnabled, isReady, requestAccess } = useFeatureFlags();

  return {
    isEnabled: isReady ? isEnabled(flag) : false,
    isReady,
    requestAccess: () => requestAccess(flag),
  };
};

/**
 * Crisis-Safe Feature Flag Hook
 *
 * Ensures certain features remain available during crisis situations.
 */
export const useCrisisSafeFeature = (flag: keyof P0CloudFeatureFlags) => {
  const { isEnabled, isReady, healthStatus } = useFeatureFlags();

  // Crisis-critical features that should always be available
  const crisisCriticalFeatures: (keyof P0CloudFeatureFlags)[] = [
    'EMERGENCY_CONTACTS_CLOUD',
    'PUSH_NOTIFICATIONS_ENABLED',
  ];

  const isCrisisCritical = crisisCriticalFeatures.includes(flag);

  return {
    isEnabled: isReady && (isEnabled(flag) || (isCrisisCritical && healthStatus === 'critical')),
    isReady,
    isCrisisCritical,
    healthStatus,
  };
};

/**
 * Development-only Feature Flag Hook
 *
 * Provides access to development features with proper safeguards.
 */
export const useDevFeature = (flag: keyof P0CloudFeatureFlags) => {
  const feature = useFeature(flag);

  // Only allow in development mode
  if (!__DEV__) {
    return {
      ...feature,
      isEnabled: false,
    };
  }

  return feature;
};

/**
 * Export for external usage
 */
export default FeatureFlagProvider;