/**
 * Cloud Sync React Hook
 *
 * INTEGRATION LAYER:
 * - Connects cloud services to React components
 * - Provides reactive cloud sync status
 * - Handles user interactions with cloud backup
 * - Error recovery and user feedback
 *
 * USAGE:
 * - Use in Settings screens for backup controls
 * - Use in Onboarding for restore prompts
 * - Provides loading states and error handling
 *
 * PERFORMANCE:
 * - Non-blocking operations
 * - Optimistic UI updates
 * - Background sync monitoring
 */


import { logSecurity, logPerformance, logError, LogCategory } from '../../logging';
import { useState, useEffect, useCallback } from 'react';
import CloudServices, { CloudSyncStatus, CloudSyncStats } from '../index';

export interface UseCloudSyncReturn {
  // Status
  status: CloudSyncStatus;
  stats: CloudSyncStats;
  isInitialized: boolean;
  isOnline: boolean;
  isLoading: boolean;
  error: string | null;

  // Backup operations
  createBackup: () => Promise<void>;
  restoreFromBackup: () => Promise<{ success: boolean; restoredStores: string[]; errors: string[] }>;
  forceSync: () => Promise<void>;

  // Configuration
  hasCloudBackup: boolean;
  shouldPromptRestore: boolean;
  lastBackupTime: Date | null;
  lastSyncTime: Date | null;

  // Actions
  checkForRestore: () => Promise<void>;
  testConnectivity: () => Promise<void>;
  clearError: () => void;
  refreshStatus: () => Promise<void>;
}

/**
 * Cloud sync hook for React components
 */
export function useCloudSync(): UseCloudSyncReturn {
  // State
  const [status, setStatus] = useState<CloudSyncStatus>({
    isInitialized: false,
    isOnline: false,
    pendingOperations: 0,
    circuitBreakerState: 'closed',
  });

  const [stats, setStats] = useState<CloudSyncStats>({
    totalBackups: 0,
    totalRestores: 0,
    successRate: 0,
    averageBackupSizeMB: 0,
    averageSyncTimeMs: 0,
    offlineOperationsProcessed: 0,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCloudBackup, setHasCloudBackup] = useState(false);
  const [shouldPromptRestore, setShouldPromptRestore] = useState(false);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Refresh status from cloud services
  const refreshStatus = useCallback(async () => {
    try {
      const [currentStatus, currentStats] = await Promise.all([
        CloudServices.getCloudSyncStatus(),
        CloudServices.getCloudSyncStats(),
      ]);

      setStatus(currentStatus);
      setStats(currentStats);

      if (currentStatus.error) {
        setError(currentStatus.error);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh status');
    }
  }, []);

  // Check for restore prompt
  const checkForRestore = useCallback(async () => {
    try {
      const restoreInfo = await CloudServices.checkForCloudRestore();
      setHasCloudBackup(restoreInfo.hasBackup);
      setShouldPromptRestore(restoreInfo.shouldPromptRestore);
    } catch (err) {
      logSecurity('Failed to check for restore:', 'medium', { error: err });
    }
  }, []);

  // Create backup
  const createBackup = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await CloudServices.forceSync();

      if (!result.success) {
        setError(result.error || 'Backup failed');
      } else {
        // Refresh status after successful backup
        await refreshStatus();
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backup failed');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, refreshStatus]);

  // Restore from backup
  const restoreFromBackup = useCallback(async () => {
    if (isLoading) return { success: false, restoredStores: [], errors: ['Operation in progress'] };

    setIsLoading(true);
    setError(null);

    try {
      const result = await CloudServices.restoreFromCloud();

      if (!result.success || result.errors.length > 0) {
        setError(result.errors.join(', ') || 'Restore failed');
      } else {
        // Refresh status after successful restore
        await refreshStatus();
        setShouldPromptRestore(false);
      }

      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Restore failed';
      setError(errorMessage);
      return { success: false, restoredStores: [], errors: [errorMessage] };
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, refreshStatus]);

  // Force sync
  const forceSync = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await CloudServices.forceSync();

      if (!result.success) {
        setError(result.error || 'Sync failed');
      } else {
        await refreshStatus();
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, refreshStatus]);

  // Test connectivity
  const testConnectivity = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await CloudServices.testCloudConnectivity();

      if (!result.canConnect) {
        setError(result.error || 'Connection test failed');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection test failed');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  // Initialize and setup periodic refresh
  useEffect(() => {
    let mounted = true;
    let refreshInterval: NodeJS.Timeout;

    const initialize = async () => {
      try {
        // Initial status refresh
        await refreshStatus();

        // Check for restore opportunity
        await checkForRestore();

        // Setup periodic refresh (every 30 seconds)
        if (mounted) {
          refreshInterval = setInterval(async () => {
            if (mounted) {
              await refreshStatus();
            }
          }, 30000);
        }

      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Initialization failed');
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [refreshStatus, checkForRestore]);

  // Computed values
  const lastBackupTime = status.lastBackupTime ? new Date(status.lastBackupTime) : null;
  const lastSyncTime = status.lastSyncTime ? new Date(status.lastSyncTime) : null;

  return {
    // Status
    status,
    stats,
    isInitialized: status.isInitialized,
    isOnline: status.isOnline,
    isLoading,
    error,

    // Backup operations
    createBackup,
    restoreFromBackup,
    forceSync,

    // Configuration
    hasCloudBackup,
    shouldPromptRestore,
    lastBackupTime,
    lastSyncTime,

    // Actions
    checkForRestore,
    testConnectivity,
    clearError,
    refreshStatus,
  };
}

/**
 * Hook for backup configuration
 */
export function useCloudBackupConfig() {
  const [config, setConfig] = useState({
    autoBackupEnabled: true,
    autoBackupIntervalMs: 4 * 60 * 60 * 1000, // 4 hours
    compressionEnabled: true,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateConfig = useCallback(async (newConfig: Partial<typeof config>) => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      await CloudServices.configureCloudBackup(newConfig);
      setConfig(prev => ({ ...prev, ...newConfig }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update configuration');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  return {
    config,
    updateConfig,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}

// INFRA-214 T4: the `useCloudAnalytics` hook (trackEvent / trackAssessmentCompletion /
// trackCrisisEvent / trackFeatureUse) was removed. It routed PRODUCT analytics to Supabase
// `analytics_events` — but per the legal-basis routing model (see analytics-architecture.md),
// product analytics belong on PostHog (consent-gated, PHIFilter), and the vital-interest
// crisis-detection event uses SupabaseService.trackCrisisDetection(). The hook was orphaned
// (never called) and its emitters duplicated those sinks, so it is deleted rather than rewired.

export default useCloudSync;