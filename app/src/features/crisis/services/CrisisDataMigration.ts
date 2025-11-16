/**
 * CRISIS DATA MIGRATION UTILITY
 *
 * PURPOSE:
 * Migrate crisis-related data from AsyncStorage to SecureStore for HIPAA compliance
 * This is a one-time migration that should run on app initialization
 *
 * MIGRATION SCOPE:
 * 1. Crisis detection logs (crisis_detection_*) - Contains PHQ-9/GAD-7 assessment answers
 * 2. Crisis intervention logs (crisis_intervention_*) - Contains intervention context
 * 3. Crisis data packages (crisis_data_*) - Contains complete crisis episode data
 * 4. PostCrisisSupport (handled by PostCrisisSupportService)
 *
 * COMPLIANCE:
 * - All PHI must be migrated from unencrypted AsyncStorage to hardware-encrypted SecureStore
 * - Old data must be deleted after successful migration
 * - Migration must be atomic (all-or-nothing per key)
 * - Migration errors must be logged but not block app initialization
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logError, logDebug, LogCategory } from '@/core/services/logging';

/**
 * Migration result tracking
 */
interface MigrationResult {
  totalKeys: number;
  migratedKeys: number;
  failedKeys: number;
  skippedKeys: number;
  errors: Array<{ key: string; error: string }>;
}

/**
 * Migrate all crisis-related data from AsyncStorage to SecureStore
 * This should be called once during app initialization
 */
export async function migrateCrisisDataToSecureStore(): Promise<MigrationResult> {
  const result: MigrationResult = {
    totalKeys: 0,
    migratedKeys: 0,
    failedKeys: 0,
    skippedKeys: 0,
    errors: []
  };

  try {
    logDebug(LogCategory.CRISIS, 'Starting crisis data migration to SecureStore');

    // Get all AsyncStorage keys
    const allKeys = await AsyncStorage.getAllKeys();

    // Filter for crisis-related keys (PHI data)
    const crisisKeys = allKeys.filter(key =>
      key.startsWith('crisis_detection_') ||
      key.startsWith('crisis_intervention_') ||
      key.startsWith('crisis_data_') ||
      key.startsWith('crisis_data_error_') ||
      key.startsWith('workflow_failure_') ||
      key.startsWith('emergency_failsafe_')
    );

    result.totalKeys = crisisKeys.length;

    if (crisisKeys.length === 0) {
      logDebug(LogCategory.CRISIS, 'No crisis data to migrate');
      return result;
    }

    logDebug(LogCategory.CRISIS, `Found ${crisisKeys.length} crisis data keys to migrate`, { count: crisisKeys.length });

    // Migrate each key
    for (const key of crisisKeys) {
      try {
        // Read from AsyncStorage
        const data = await AsyncStorage.getItem(key);

        if (!data) {
          result.skippedKeys++;
          continue;
        }

        // Write to SecureStore
        await SecureStore.setItemAsync(key, data);

        // Delete from AsyncStorage
        await AsyncStorage.removeItem(key);

        result.migratedKeys++;
      } catch (error) {
        result.failedKeys++;
        result.errors.push({
          key,
          error: error instanceof Error ? error.message : String(error)
        });
        logError(LogCategory.CRISIS, `Failed to migrate key: ${key}`, error as Error);
      }
    }

    logDebug(LogCategory.CRISIS, 'Crisis data migration complete', {
      total: result.totalKeys,
      migrated: result.migratedKeys,
      failed: result.failedKeys,
      skipped: result.skippedKeys
    });

  } catch (error) {
    logError(LogCategory.CRISIS, 'Crisis data migration failed', error as Error);
  }

  return result;
}

/**
 * Check if migration is needed
 * Returns true if any crisis-related keys exist in AsyncStorage
 */
export async function isCrisisMigrationNeeded(): Promise<boolean> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const crisisKeys = allKeys.filter(key =>
      key.startsWith('crisis_detection_') ||
      key.startsWith('crisis_intervention_') ||
      key.startsWith('crisis_data_') ||
      key.startsWith('crisis_data_error_') ||
      key.startsWith('workflow_failure_') ||
      key.startsWith('emergency_failsafe_')
    );
    return crisisKeys.length > 0;
  } catch (error) {
    logError(LogCategory.CRISIS, 'Failed to check migration status', error as Error);
    return false;
  }
}

/**
 * Get migration status summary
 * Useful for debugging and user transparency
 */
export async function getCrisisMigrationStatus(): Promise<{
  asyncStorageKeys: number;
  secureStoreKeys: number;
  migrationNeeded: boolean;
}> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const asyncCrisisKeys = allKeys.filter(key =>
      key.startsWith('crisis_detection_') ||
      key.startsWith('crisis_intervention_') ||
      key.startsWith('crisis_data_')
    );

    // Note: SecureStore doesn't have getAllKeys(), so we can't count directly
    // We can only infer based on AsyncStorage keys remaining

    return {
      asyncStorageKeys: asyncCrisisKeys.length,
      secureStoreKeys: -1, // Not available from SecureStore API
      migrationNeeded: asyncCrisisKeys.length > 0
    };
  } catch (error) {
    logError(LogCategory.CRISIS, 'Failed to get migration status', error as Error);
    return {
      asyncStorageKeys: 0,
      secureStoreKeys: -1,
      migrationNeeded: false
    };
  }
}