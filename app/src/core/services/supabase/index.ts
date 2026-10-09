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
import { CONNECTIVITY_EVENT } from './operationalEvents';
import { useConsentStore } from '@/core/stores/consentStore';

// Type definitions
export interface CloudSyncStatus {
  isInitialized: boolean;
  isOnline: boolean;
  lastBackupTime?: number | undefined;
  lastSyncTime?: number;
  pendingOperations: number;
  circuitBreakerState: 'closed' | 'open' | 'half-open';
  error?: string | undefined;
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
 * Whether cloud_sync consent permits a cloud act right now. Read on every call and never
 * memoised: consent is still 'loading' at import (DEBUG-409) and can be withdrawn mid-session.
 */
function hasCloudSyncConsent(): boolean {
  return useConsentStore.getState().canPerformOperation('cloud_sync');
}

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
      console.log('[CloudServices] Starting initialization...');

      // Initialize services in order
      await supabaseService.initialize();
      await cloudBackupService.initialize();

      // Setup app lifecycle handlers
      setupAppLifecycleHandlers();

      isInitialized = true;
      console.log('[CloudServices] Initialization completed successfully');

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
      // App came to foreground. Defence in depth (DEBUG-756): the authoritative gate, and
      // the drop/hold decision, are in SupabaseService.processOfflineQueue.
      if (!hasCloudSyncConsent()) return;
      try {
        await supabaseService.processOfflineQueue();
      } catch (error) {
        logSecurity('[CloudServices] Failed to process offline queue:', 'medium', { error });
      }
    } else if (nextAppState === 'background') {
      // App going to background
      try {
        await cloudBackupService.createBackup();
      } catch (error) {
        logSecurity('[CloudServices] Background backup failed:', 'medium', { error });
      }
    }
  });
}

/**
 * Get comprehensive status of cloud services
 */
export async function getCloudSyncStatus(): Promise<CloudSyncStatus> {
  try {
    // DEBUG-757: a passive status read (screen mount, 30s poll) may not start Supabase or read
    // the backup without consent. Local-only status, and no `error`: the screen renders it as
    // a fresh install rather than a failure banner.
    if (!hasCloudSyncConsent()) {
      const local = supabaseService.getStatus();
      return {
        isInitialized: false,
        isOnline: false,
        pendingOperations: local.offlineQueueSize,
        circuitBreakerState: local.circuitBreakerState as any,
      };
    }

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
      lastSyncTime: supabaseStatus.lastSyncTime as any,
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
    logSecurity('[CloudServices] Failed to get stats:', 'medium', { error });
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
export async function forceSync(): Promise<{ success: boolean; error?: string | undefined }> {
  try {
    // Consent gate (MAINT-173): defense in depth. createBackup() self-guards,
    // but bail before initializing/connecting to Supabase or processing the
    // offline queue when cloud sync is not consented.
    if (!hasCloudSyncConsent()) {
      logSecurity('[CloudServices] forceSync skipped — cloud_sync consent absent', 'low');
      return { success: false, error: 'cloud_sync_consent_absent' };
    }

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
  backupTime?: number | undefined;
  shouldPromptRestore: boolean;
}> {
  try {
    // DEBUG-757: its only caller is useCloudSync's mount effect - a passive read, not a user
    // act - so it is gated like any other read. Without consent there is no backup to offer.
    if (!hasCloudSyncConsent()) {
      return { hasBackup: false, shouldPromptRestore: false };
    }

    // Initialize services if needed
    await initializeCloudServices();

    const backupStatus = await cloudBackupService.getBackupStatus();

    return {
      hasBackup: backupStatus.hasCloudBackup,
      backupTime: backupStatus.cloudBackupTime,
      shouldPromptRestore: backupStatus.hasCloudBackup && !backupStatus.hasLocalData,
    };

  } catch (error) {
    logSecurity('[CloudServices] Failed to check for backup:', 'medium', { error });
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
}): Promise<void> {
  try {
    // DEBUG-757: toggling auto-backup sets a preference; it is not the consent grant.
    if (!hasCloudSyncConsent()) {
      logSecurity('[CloudServices] configureCloudBackup skipped — cloud_sync consent absent', 'low');
      return;
    }
    await initializeCloudServices();
    await cloudBackupService.updateConfig(config);
  } catch (error) {
    logSecurity('[CloudServices] Failed to update config:', 'medium', { error });
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
    logSecurity('[CloudServices] Cleanup failed:', 'medium', { error });
  }
}

/**
 * Test cloud connectivity
 */
export async function testCloudConnectivity(): Promise<{
  canConnect: boolean;
  responseTimeMs?: number;
  error?: string | undefined;
}> {
  try {
    // DEBUG-757: user-tapped, but its only network act is a cloud_sync-consented event, so
    // without consent it would mint an identity for nothing and report a false success.
    if (!hasCloudSyncConsent()) {
      return { canConnect: false, error: 'cloud_sync_consent_absent' };
    }

    const startTime = Date.now();

    // Try to initialize services
    await initializeCloudServices();

    // Test basic connectivity with analytics ping
    await supabaseService.trackEvent(CONNECTIVITY_EVENT.TEST);

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

// Auto-initialize on module load (non-blocking).
// Consent gate (MAINT-173): only eagerly connect to Supabase when the user
// has consented to cloud sync. Without consent we skip the eager connection
// entirely rather than silently opening a backend session.
//
// Every cloud act checks consent at call time (DEBUG-757): this import-time
// init, getCloudSyncStatus, checkForCloudRestore, configureCloudBackup,
// testCloudConnectivity and forceSync. The ONE exemption is restoreFromCloud:
// a Restore tap followed by a destructive confirm is user-initiated recovery.
// checkForCloudRestore used to share that exemption, but its only caller is
// useCloudSync's mount effect - a passive read - so it is gated like the rest.
if (hasCloudSyncConsent()) {
  initializeCloudServices().catch(() => {
    // Ignore initialization errors - app should work offline
  });
}

// Default export with main functions
export default {
  initializeCloudServices,
  getCloudSyncStatus,
  getCloudSyncStats,
  forceSync,
  checkForCloudRestore,
  restoreFromCloud,
  configureCloudBackup,
  cleanupCloudServices,
  testCloudConnectivity,
};