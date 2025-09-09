/**
 * Widget Integration Hook
 * React hook providing widget functionality with clinical-grade error handling
 * Manages widget data updates, deep link handling, and performance monitoring
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { WidgetDataService } from '../services/WidgetDataService';
import { widgetStoreIntegration } from '../store/widgetIntegration';
import {
  WidgetData,
  WidgetCrisisButton,
  WidgetBridgeError,
  UseWidgetIntegrationOptions,
  UseWidgetIntegrationReturn,
  WidgetUpdateTrigger,
  WidgetTodayProgress,
  WidgetEvent
} from '../types/widget';

const defaultOptions: UseWidgetIntegrationOptions = {
  autoUpdate: true,
  updateOnForeground: true,
  throttleMs: 60000, // 1 minute
  retryConfig: {
    maxRetries: 3,
    backoffMs: 1000,
    exponentialBackoff: true
  }
};

/**
 * Hook for comprehensive widget integration
 */
export function useWidgetIntegration(
  options: Partial<UseWidgetIntegrationOptions> = {}
): UseWidgetIntegrationReturn {
  const config = { ...defaultOptions, ...options };
  
  // State
  const [widgetData, setWidgetData] = useState<WidgetData | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<WidgetBridgeError | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);

  // Refs
  const widgetServiceRef = useRef(new WidgetDataService());
  const lastThrottleTimeRef = useRef<number>(0);
  const unsubscribersRef = useRef<Array<() => void>>([]);

  /**
   * Update widget data with error handling and throttling
   */
  const updateWidgetData = useCallback(async (): Promise<void> => {
    // Throttling check
    const now = Date.now();
    if (now - lastThrottleTimeRef.current < config.throttleMs && !config.autoUpdate) {
      return;
    }

    if (isUpdating) {
      return;
    }

    setIsUpdating(true);
    setError(null);
    
    try {
      const trigger: WidgetUpdateTrigger = {
        source: 'manual_refresh',
        reason: 'data_refresh',
        timestamp: new Date().toISOString(),
        priority: 'normal'
      };

      await widgetServiceRef.current.updateWidgetData(trigger);
      
      // Get updated widget data
      const updatedData = await widgetServiceRef.current.getCurrentWidgetData();
      
      if (updatedData) {
        setWidgetData(updatedData);
        setLastUpdateTime(updatedData.lastUpdateTime);
        lastThrottleTimeRef.current = now;
      }
      
    } catch (err) {
      const widgetError = err instanceof WidgetBridgeError 
        ? err 
        : new WidgetBridgeError(
            'Widget update failed in hook',
            'UPDATE_THROTTLED',
            err
          );
      
      setError(widgetError);
      console.error('Widget update failed:', widgetError);
      
    } finally {
      setIsUpdating(false);
    }
  }, [config.throttleMs, config.autoUpdate, isUpdating]);

  /**
   * Handle deep link with comprehensive validation
   */
  const handleDeepLink = useCallback(async (url: string): Promise<void> => {
    try {
      setError(null);
      await widgetServiceRef.current.handleWidgetDeepLink(url);
      
      // Schedule widget data update after navigation
      setTimeout(() => updateWidgetData(), 1000);
      
    } catch (err) {
      const deepLinkError = err instanceof WidgetBridgeError 
        ? err 
        : new WidgetBridgeError(
            'Deep link handling failed in hook',
            'DEEP_LINK_INVALID',
            err
          );
      
      setError(deepLinkError);
      console.error('Deep link handling failed:', deepLinkError);
    }
  }, [updateWidgetData]);

  /**
   * Clear error state
   */
  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  /**
   * Handle app state changes for foreground updates
   */
  const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
    if (config.updateOnForeground && nextAppState === 'active') {
      // Update widget data when app comes to foreground
      setTimeout(() => updateWidgetData(), 500);
    }
  }, [config.updateOnForeground, updateWidgetData]);

  /**
   * Handle store-triggered updates
   */
  const handleStoreUpdate = useCallback((trigger: WidgetUpdateTrigger) => {
    if (config.autoUpdate) {
      // High-priority updates bypass throttling
      if (trigger.priority === 'high' || trigger.priority === 'critical') {
        lastThrottleTimeRef.current = 0;
      }
      updateWidgetData();
    }
  }, [config.autoUpdate, updateWidgetData]);

  /**
   * Handle progress updates from store
   */
  const handleProgressUpdate = useCallback((progress: WidgetTodayProgress) => {
    // Update local widget data with new progress
    setWidgetData(prevData => {
      if (!prevData) return null;
      
      return {
        ...prevData,
        todayProgress: progress,
        lastUpdateTime: new Date().toISOString()
      };
    });
  }, []);

  /**
   * Handle widget events
   */
  const handleWidgetEvent = useCallback((event: WidgetEvent) => {
    console.log('Widget event received:', event);
    
    // Handle crisis events with high priority
    if (event.type === 'crisis_mode_activated') {
      lastThrottleTimeRef.current = 0; // Bypass throttling for crisis
      updateWidgetData();
    }
  }, [updateWidgetData]);

  /**
   * Initialize widget integration
   */
  useEffect(() => {
    // Initialize widget store integration
    widgetStoreIntegration.initialize();
    
    // Subscribe to store updates
    if (config.autoUpdate) {
      const unsubscribeUpdates = widgetStoreIntegration.subscribeToCheckInUpdates(handleStoreUpdate);
      const unsubscribeProgress = widgetStoreIntegration.subscribeToSessionProgress(handleProgressUpdate);
      const unsubscribeEvents = widgetStoreIntegration.subscribeToUserEvents(handleWidgetEvent);
      
      unsubscribersRef.current.push(unsubscribeUpdates, unsubscribeProgress, unsubscribeEvents);
    }

    // Subscribe to app state changes
    if (config.updateOnForeground) {
      const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
      unsubscribersRef.current.push(() => appStateSubscription?.remove());
    }

    // Initial widget data load
    updateWidgetData();

    return () => {
      // Cleanup subscriptions
      unsubscribersRef.current.forEach(unsubscribe => unsubscribe());
      unsubscribersRef.current = [];
    };
  }, [config.autoUpdate, config.updateOnForeground, handleStoreUpdate, handleProgressUpdate, handleWidgetEvent, handleAppStateChange, updateWidgetData]);

  return {
    widgetData,
    isUpdating,
    error,
    lastUpdateTime,
    updateWidgetData,
    handleDeepLink,
    clearError
  };
}

/**
 * Simpler hook for basic widget functionality
 */
export function useSimpleWidgetIntegration() {
  return useWidgetIntegration({
    autoUpdate: true,
    updateOnForeground: true,
    throttleMs: 60000
  });
}

/**
 * Hook for high-performance widget integration (minimal updates)
 */
export function useMinimalWidgetIntegration() {
  return useWidgetIntegration({
    autoUpdate: false,
    updateOnForeground: false,
    throttleMs: 300000 // 5 minutes
  });
}

/**
 * Hook for crisis-aware widget integration (immediate updates)
 */
export function useCrisisAwareWidgetIntegration() {
  return useWidgetIntegration({
    autoUpdate: true,
    updateOnForeground: true,
    throttleMs: 30000, // 30 seconds
    retryConfig: {
      maxRetries: 5,
      backoffMs: 500,
      exponentialBackoff: true
    }
  });
}

/**
 * Hook for testing widget integration
 */
export function useTestableWidgetIntegration(mockData?: Partial<WidgetData>) {
  const integration = useWidgetIntegration({
    autoUpdate: false,
    updateOnForeground: false,
    throttleMs: 0
  });

  useEffect(() => {
    if (mockData && integration.widgetData) {
      const updatedData: WidgetData = {
        ...integration.widgetData,
        ...mockData,
        lastUpdateTime: new Date().toISOString(),
        encryptionHash: 'test_hash'
      };
      // This would need to be implemented in the actual hook state management
    }
  }, [mockData, integration.widgetData]);

  return integration;
}