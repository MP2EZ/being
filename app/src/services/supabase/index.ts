/**
 * Supabase Services Integration Layer
 *
 * MAIN EXPORT MODULE:
 * - Centralized service initialization
 * - Service lifecycle management
 * - Error boundary integration
 * - Performance monitoring
 *
 * USAGE:
 * - Import services from this module
 * - Services auto-initialize on first use
 * - Automatic retry and error handling
 * - Circuit breaker protection
 *
 * INTEGRATION WITH EXISTING APP:
 * - Works alongside existing SecureStorageService
 * - Uses existing EncryptionService
 * - Integrates with Zustand stores
 * - Minimal performance impact on crisis detection
 */


import { logSecurity, logPerformance, logError, LogCategory } from '../logging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

// Service imports
import supabaseService from './SupabaseService';
import cloudBackupService from './CloudBackupService';

// Type definitions
export interface CloudSyncStatus {
  isInitialized: boolean;
  isOnline: boolean;
  lastBackupTime?: number;
  lastSyncTime?: number;
  pendingOperations: number;
  circuitBreakerState: 'closed' | 'open' | 'half-open';
  error?: string;
}

export interface CloudSyncStats {
  totalBackups: number;
  totalRestores: number;
  successRate: number;
  averageBackupSizeMB: number;
  averageSyncTimeMs: number;
  offlineOperationsProcessed: number;
}

// Service state
let isInitialized = false;
let initializationPromise: Promise<void> | null = null;

/**
 * Initialize all cloud services
 */
async function initializeCloudServices(): Promise<void> {
  if (isInitialized) return;

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      logPerformance('[CloudServices] Starting initialization...');

      // Initialize services in order
      await supabaseService.initialize();
      await cloudBackupService.initialize();

      // Setup app lifecycle handlers
      setupAppLifecycleHandlers();

      isInitialized = true;
      logPerformance('[CloudServices] Initialization completed successfully');

    } catch (error) {
      logError(LogCategory.SYSTEM, '[CloudServices] Initialization failed:', error instanceof Error ? error : new Error(String(error)));

      // Reset state on failure
      isInitialized = false;
      initializationPromise = null;

      // Don't throw - allow app to continue working offline
      logSecurity('[CloudServices] Continuing in offline mode', 'low');
    }
  })();

  return initializationPromise;
}

/**
 * Setup app lifecycle event handlers
 */
function setupAppLifecycleHandlers(): void {
  AppState.addEventListener('change', async (nextAppState) => {
    if (nextAppState === 'active') {
      // App came to foreground
      try {
        await supabaseService.processOfflineQueue();
      } catch (error) {
        logSecurity('[CloudServices] Failed to process offline queue:', error);
      }
    } else if (nextAppState === 'background') {
      // App going to background
      try {
        await cloudBackupService.createBackup();
      } catch (error) {
        logSecurity('[CloudServices] Background backup failed:', error);
      }
    }
  });
}

/**
 * Get comprehensive status of cloud services
 */
export async function getCloudSyncStatus(): Promise<CloudSyncStatus> {
  try {
    // Ensure services are initialized (non-blocking)
    if (!isInitialized) {
      initializeCloudServices().catch(() => {
        // Ignore errors - status will reflect offline state
      });
    }

    const supabaseStatus = supabaseService.getStatus();
    const backupStatus = await cloudBackupService.getBackupStatus();

    return {
      isInitialized: isInitialized && supabaseStatus.isInitialized,
      isOnline: supabaseStatus.circuitBreakerState === 'closed',
      lastBackupTime: backupStatus.lastBackupTime,
      lastSyncTime: supabaseStatus.lastSyncTime,
      pendingOperations: supabaseStatus.offlineQueueSize,
      circuitBreakerState: supabaseStatus.circuitBreakerState as any,
    };

  } catch (error) {
    return {
      isInitialized: false,
      isOnline: false,
      pendingOperations: 0,
      circuitBreakerState: 'open',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get cloud sync statistics
 */
export async function getCloudSyncStats(): Promise<CloudSyncStats> {
  try {
    const stats = await AsyncStorage.getItem('@being/cloud_sync/stats');

    if (stats) {
      return JSON.parse(stats);
    }

    return {
      totalBackups: 0,
      totalRestores: 0,
      successRate: 0,
      averageBackupSizeMB: 0,
      averageSyncTimeMs: 0,
      offlineOperationsProcessed: 0,
    };

  } catch (error) {
    logSecurity('[CloudServices] Failed to get stats:', error);
    return {
      totalBackups: 0,
      totalRestores: 0,
      successRate: 0,
      averageBackupSizeMB: 0,
      averageSyncTimeMs: 0,
      offlineOperationsProcessed: 0,
    };
  }
}

/**
 * Force manual sync operation
 */
export async function forceSync(): Promise<{ success: boolean; error?: string }> {
  try {
    // Ensure services are initialized
    await initializeCloudServices();

    // Create backup
    const backupResult = await cloudBackupService.createBackup();

    if (!backupResult.success) {
      return { success: false, error: backupResult.error };
    }

    // Process any pending operations
    await supabaseService.processOfflineQueue();

    return { success: true };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if cloud backup exists and prompt for restore
 */
export async function checkForCloudRestore(): Promise<{
  hasBackup: boolean;
  backupTime?: number;
  shouldPromptRestore: boolean;
}> {
  try {
    // Initialize services if needed
    await initializeCloudServices();

    const backupStatus = await cloudBackupService.getBackupStatus();

    return {
      hasBackup: backupStatus.hasCloudBackup,
      backupTime: backupStatus.cloudBackupTime,
      shouldPromptRestore: backupStatus.hasCloudBackup && !backupStatus.hasLocalData,
    };

  } catch (error) {
    logSecurity('[CloudServices] Failed to check for backup:', error);
    return {
      hasBackup: false,
      shouldPromptRestore: false,
    };
  }
}

/**
 * Restore data from cloud backup
 */
export async function restoreFromCloud(): Promise<{
  success: boolean;
  restoredStores: string[];
  errors: string[];
}> {
  try {
    // Ensure services are initialized
    await initializeCloudServices();

    const result = await cloudBackupService.restoreFromBackup();

    return {
      success: result.success,
      restoredStores: result.restoredStores,
      errors: result.errors,
    };

  } catch (error) {
    return {
      success: false,
      restoredStores: [],
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

/**
 * Configure cloud backup settings
 */
export async function configureCloudBackup(config: {
  autoBackupEnabled?: boolean;
  autoBackupIntervalMs?: number;
  compressionEnabled?: boolean;
}): Promise<void> {
  try {
    await initializeCloudServices();
    await cloudBackupService.updateConfig(config);
  } catch (error) {
    logSecurity('[CloudServices] Failed to update config:', error);
  }
}

/**
 * Track analytics event
 */
export async function trackAnalyticsEvent(
  eventType: string,
  properties: Record<string, any> = {}
): Promise<void> {
  try {
    // Initialize services if needed (non-blocking)
    if (!isInitialized) {
      initializeCloudServices().catch(() => {
        // Ignore errors - analytics is non-critical
      });
    }

    await supabaseService.trackEvent(eventType, properties);

  } catch (error) {
    // Analytics failures should not affect app functionality
    logSecurity('[CloudServices] Analytics tracking failed:', error);
  }
}

/**
 * Cleanup services (call on app shutdown)
 */
export async function cleanupCloudServices(): Promise<void> {
  try {
    if (isInitialized) {
      await Promise.all([
        cloudBackupService.cleanup(),
        supabaseService.cleanup(),
      ]);

      isInitialized = false;
      initializationPromise = null;
    }
  } catch (error) {
    logSecurity('[CloudServices] Cleanup failed:', error);
  }
}

/**
 * Test cloud connectivity
 */
export async function testCloudConnectivity(): Promise<{
  canConnect: boolean;
  responseTimeMs?: number;
  error?: string;
}> {
  try {
    const startTime = Date.now();

    // Try to initialize services
    await initializeCloudServices();

    // Test basic connectivity with analytics ping
    await supabaseService.trackEvent('connectivity_test', {
      timestamp: Date.now(),
    });

    const responseTime = Date.now() - startTime;

    return {
      canConnect: true,
      responseTimeMs: responseTime,
    };

  } catch (error) {
    return {
      canConnect: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Export services for direct access if needed
export { supabaseService, cloudBackupService };

// Auto-initialize on module load (non-blocking)
// This ensures services are ready when the app needs them
initializeCloudServices().catch(() => {
  // Ignore initialization errors - app should work offline
});

// Default export with main functions
export default {
  initializeCloudServices,
  getCloudSyncStatus,
  getCloudSyncStats,
  forceSync,
  checkForCloudRestore,
  restoreFromCloud,
  configureCloudBackup,
  trackAnalyticsEvent,
  cleanupCloudServices,
  testCloudConnectivity,
};