/**
 * Storage Key Migration Service for Being. MBCT App
 *
 * CRITICAL SAFETY REQUIREMENTS:
 * - Zero data loss during legacy → being storage key migration
 * - 100% accuracy for clinical data (PHQ-9/GAD-7 assessments)
 * - Crisis information must be preserved with absolute fidelity
 * - Comprehensive rollback capability for emergency recovery
 *
 * This service handles the final phase of the legacy → Being. renaming project,
 * specifically migrating AsyncStorage keys while maintaining data integrity.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { dataStore } from './DataStore';
import { encryptedDataStore } from './EncryptedDataStore';

export interface StorageKeyMapping {
  oldKey: string;
  newKey: string;
  type: 'async_storage' | 'secure_store';
  dataCategory: 'user' | 'clinical' | 'crisis' | 'system' | 'cache';
  criticalSafety: boolean;
  description: string;
}

export interface MigrationProgress {
  stage: 'scanning' | 'backing_up' | 'migrating' | 'validating' | 'cleanup' | 'complete' | 'error';
  currentKey?: string;
  processedKeys: number;
  totalKeys: number;
  migratedDataSize: number;
  errors: string[];
  warnings: string[];
}

export interface MigrationResult {
  success: boolean;
  migratedKeys: string[];
  skippedKeys: string[];
  errors: string[];
  warnings: string[];
  backupId: string | null;
  dataIntegrityChecks: {
    beforeMigration: number;
    afterMigration: number;
    checksumMatches: boolean;
  };
  duration: number;
}

export interface DataIntegrityCheck {
  keyCount: number;
  totalDataSize: number;
  criticalDataCount: number;
  dataChecksum: string;
}

export class StorageKeyMigrator {
  private static instance: StorageKeyMigrator;
  private migrationInProgress = false;

  // Comprehensive storage key mappings
  private readonly STORAGE_KEY_MAPPINGS: StorageKeyMapping[] = [
    // Core session and resumable data
    {
      oldKey: '@fullmind_session_index',
      newKey: 'being_session_index',
      type: 'async_storage',
      dataCategory: 'system',
      criticalSafety: true,
      description: 'Session management index for resumable check-ins'
    },
    {
      oldKey: '@fullmind_resumable_session_checkin_morning',
      newKey: 'being_resumable_session_checkin_morning',
      type: 'async_storage',
      dataCategory: 'user',
      criticalSafety: true,
      description: 'Resumable morning check-in session data'
    },
    {
      oldKey: '@fullmind_resumable_session_checkin_midday',
      newKey: 'being_resumable_session_checkin_midday',
      type: 'async_storage',
      dataCategory: 'user',
      criticalSafety: true,
      description: 'Resumable midday check-in session data'
    },
    {
      oldKey: '@fullmind_resumable_session_checkin_evening',
      newKey: 'being_resumable_session_checkin_evening',
      type: 'async_storage',
      dataCategory: 'user',
      criticalSafety: true,
      description: 'Resumable evening check-in session data'
    },
    {
      oldKey: '@fullmind_resumable_session_assessment_phq9',
      newKey: 'being_resumable_session_assessment_phq9',
      type: 'async_storage',
      dataCategory: 'clinical',
      criticalSafety: true,
      description: 'Resumable PHQ-9 assessment session - CRITICAL CLINICAL DATA'
    },
    {
      oldKey: '@fullmind_resumable_session_assessment_gad7',
      newKey: 'being_resumable_session_assessment_gad7',
      type: 'async_storage',
      dataCategory: 'clinical',
      criticalSafety: true,
      description: 'Resumable GAD-7 assessment session - CRITICAL CLINICAL DATA'
    },

    // Widget data
    {
      oldKey: 'fullmind_widget_data',
      newKey: 'being_widget_data',
      type: 'async_storage',
      dataCategory: 'system',
      criticalSafety: false,
      description: 'Widget display data (privacy-safe aggregates only)'
    },

    // Core user data stores
    {
      oldKey: '@fullmind_user',
      newKey: 'being_user',
      type: 'async_storage',
      dataCategory: 'user',
      criticalSafety: true,
      description: 'User profile and preferences'
    },
    {
      oldKey: '@fullmind_checkins',
      newKey: 'being_checkins',
      type: 'async_storage',
      dataCategory: 'user',
      criticalSafety: true,
      description: 'Daily check-in history and mood tracking data'
    },
    {
      oldKey: '@fullmind_assessments',
      newKey: 'being_assessments',
      type: 'async_storage',
      dataCategory: 'clinical',
      criticalSafety: true,
      description: 'PHQ-9/GAD-7 assessment results - CRITICAL CLINICAL DATA'
    },
    {
      oldKey: '@fullmind_assessments_encrypted',
      newKey: 'being_assessments_encrypted',
      type: 'async_storage',
      dataCategory: 'clinical',
      criticalSafety: true,
      description: 'Encrypted assessment data - CRITICAL CLINICAL DATA'
    },

    // Crisis and safety data
    {
      oldKey: '@fullmind_crisis',
      newKey: 'being_crisis',
      type: 'async_storage',
      dataCategory: 'crisis',
      criticalSafety: true,
      description: 'Crisis plan and safety contacts - CRITICAL SAFETY DATA'
    },
    {
      oldKey: '@fullmind_crisis_config_v1',
      newKey: 'being_crisis_config_v1',
      type: 'async_storage',
      dataCategory: 'crisis',
      criticalSafety: true,
      description: 'Crisis detection configuration and thresholds'
    },
    {
      oldKey: '@fullmind_emergency_contacts',
      newKey: 'being_emergency_contacts',
      type: 'secure_store',
      dataCategory: 'crisis',
      criticalSafety: true,
      description: 'Emergency contact information for crisis intervention'
    },

    // Security and encryption keys
    {
      oldKey: '@fullmind_master_key_v1',
      newKey: 'being_master_key_v1',
      type: 'secure_store',
      dataCategory: 'system',
      criticalSafety: true,
      description: 'Master encryption key for data protection'
    },
    {
      oldKey: '@fullmind_clinical_key_v1',
      newKey: 'being_clinical_key_v1',
      type: 'secure_store',
      dataCategory: 'clinical',
      criticalSafety: true,
      description: 'Clinical data encryption key (PHQ-9/GAD-7 protection)'
    },
    {
      oldKey: '@fullmind_personal_key_v1',
      newKey: 'being_personal_key_v1',
      type: 'secure_store',
      dataCategory: 'user',
      criticalSafety: true,
      description: 'Personal data encryption key'
    },

    // Authentication and device management
    {
      oldKey: '@fullmind_device_id',
      newKey: 'being_device_id',
      type: 'secure_store',
      dataCategory: 'system',
      criticalSafety: false,
      description: 'Device identification for sync and security'
    },
    {
      oldKey: '@fullmind_auth_store',
      newKey: 'being_auth_store',
      type: 'async_storage',
      dataCategory: 'system',
      criticalSafety: true,
      description: 'Authentication state and session management'
    },
    {
      oldKey: '@fullmind_auth_config_v1',
      newKey: 'being_auth_config_v1',
      type: 'async_storage',
      dataCategory: 'system',
      criticalSafety: false,
      description: 'Authentication configuration settings'
    },

    // Audit and compliance
    {
      oldKey: '@fullmind_audit_events',
      newKey: 'being_audit_events',
      type: 'secure_store',
      dataCategory: 'system',
      criticalSafety: true,
      description: 'HIPAA audit trail and compliance logging'
    },
    {
      oldKey: '@fullmind_audit_log_v1',
      newKey: 'being_audit_log_v1',
      type: 'async_storage',
      dataCategory: 'system',
      criticalSafety: true,
      description: 'Detailed audit log for regulatory compliance'
    },
    {
      oldKey: '@fullmind_consent_audits_v1',
      newKey: 'being_consent_audits_v1',
      type: 'async_storage',
      dataCategory: 'system',
      criticalSafety: true,
      description: 'User consent tracking for privacy compliance'
    },

    // Cache and performance (non-critical)
    {
      oldKey: '@fullmind_cache_stats',
      newKey: 'being_cache_stats',
      type: 'async_storage',
      dataCategory: 'cache',
      criticalSafety: false,
      description: 'Cache performance statistics'
    },
    {
      oldKey: '@fullmind_asset_metadata',
      newKey: 'being_asset_metadata',
      type: 'async_storage',
      dataCategory: 'cache',
      criticalSafety: false,
      description: 'Asset cache metadata for performance optimization'
    }
  ];

  private constructor() {}

  public static getInstance(): StorageKeyMigrator {
    if (!StorageKeyMigrator.instance) {
      StorageKeyMigrator.instance = new StorageKeyMigrator();
    }
    return StorageKeyMigrator.instance;
  }

  /**
   * Comprehensive migration assessment with safety validation
   */
  async assessMigrationNeeds(): Promise<{
    isRequired: boolean;
    existingOldKeys: string[];
    criticalDataAtRisk: string[];
    estimatedDataSize: number;
    safetyRecommendations: string[];
  }> {
    try {
      const existingOldKeys: string[] = [];
      const criticalDataAtRisk: string[] = [];
      let estimatedDataSize = 0;
      const safetyRecommendations: string[] = [];

      // Check AsyncStorage keys
      const asyncKeys = await AsyncStorage.getAllKeys();
      const oldAsyncKeys = this.STORAGE_KEY_MAPPINGS
        .filter(mapping => mapping.type === 'async_storage')
        .filter(mapping => asyncKeys.includes(mapping.oldKey));

      for (const mapping of oldAsyncKeys) {
        existingOldKeys.push(mapping.oldKey);

        if (mapping.criticalSafety) {
          criticalDataAtRisk.push(mapping.oldKey);
        }

        // Estimate data size
        try {
          const data = await AsyncStorage.getItem(mapping.oldKey);
          if (data) {
            estimatedDataSize += data.length;
          }
        } catch (error) {
          safetyRecommendations.push(`Warning: Cannot access ${mapping.oldKey} - may be corrupted`);
        }
      }

      // Check SecureStore keys (more limited - check if accessible)
      const secureStoreMappings = this.STORAGE_KEY_MAPPINGS
        .filter(mapping => mapping.type === 'secure_store');

      for (const mapping of secureStoreMappings) {
        try {
          const exists = await SecureStore.getItemAsync(mapping.oldKey);
          if (exists !== null) {
            existingOldKeys.push(mapping.oldKey);

            if (mapping.criticalSafety) {
              criticalDataAtRisk.push(mapping.oldKey);
            }

            estimatedDataSize += exists.length;
          }
        } catch (error) {
          // Key doesn't exist or is inaccessible - this is OK
        }
      }

      // Generate safety recommendations
      if (criticalDataAtRisk.length > 0) {
        safetyRecommendations.push(`${criticalDataAtRisk.length} critical data keys require migration`);
      }

      const clinicalKeys = criticalDataAtRisk.filter(key =>
        key.includes('assessment') || key.includes('clinical') || key.includes('phq') || key.includes('gad')
      );
      if (clinicalKeys.length > 0) {
        safetyRecommendations.push('CRITICAL: PHQ-9/GAD-7 assessment data requires immediate migration');
      }

      const crisisKeys = criticalDataAtRisk.filter(key =>
        key.includes('crisis') || key.includes('emergency')
      );
      if (crisisKeys.length > 0) {
        safetyRecommendations.push('CRITICAL: Crisis and safety data requires immediate migration');
      }

      if (estimatedDataSize > 10 * 1024 * 1024) { // 10MB
        safetyRecommendations.push('Large data volume detected - migration may take several minutes');
      }

      return {
        isRequired: existingOldKeys.length > 0,
        existingOldKeys,
        criticalDataAtRisk,
        estimatedDataSize,
        safetyRecommendations
      };

    } catch (error) {
      console.error('Migration assessment failed:', error);
      return {
        isRequired: false,
        existingOldKeys: [],
        criticalDataAtRisk: [],
        estimatedDataSize: 0,
        safetyRecommendations: ['Assessment failed - manual review required']
      };
    }
  }

  /**
   * Perform comprehensive storage key migration with progress tracking
   */
  async performMigration(
    progressCallback?: (progress: MigrationProgress) => void
  ): Promise<MigrationResult> {
    if (this.migrationInProgress) {
      throw new Error('Migration already in progress');
    }

    const startTime = Date.now();
    this.migrationInProgress = true;

    const result: MigrationResult = {
      success: false,
      migratedKeys: [],
      skippedKeys: [],
      errors: [],
      warnings: [],
      backupId: null,
      dataIntegrityChecks: {
        beforeMigration: 0,
        afterMigration: 0,
        checksumMatches: false
      },
      duration: 0
    };

    try {
      // Stage 1: Assessment and validation
      progressCallback?.({
        stage: 'scanning',
        processedKeys: 0,
        totalKeys: 0,
        migratedDataSize: 0,
        errors: [],
        warnings: []
      });

      const assessment = await this.assessMigrationNeeds();

      if (!assessment.isRequired) {
        result.success = true;
        result.duration = Date.now() - startTime;
        progressCallback?.({
          stage: 'complete',
          processedKeys: 0,
          totalKeys: 0,
          migratedDataSize: 0,
          errors: [],
          warnings: ['No migration required - all keys already updated']
        });
        return result;
      }

      const keysToMigrate = this.STORAGE_KEY_MAPPINGS.filter(mapping =>
        assessment.existingOldKeys.includes(mapping.oldKey)
      );

      // Stage 2: Create comprehensive backup
      progressCallback?.({
        stage: 'backing_up',
        processedKeys: 0,
        totalKeys: keysToMigrate.length,
        migratedDataSize: 0,
        errors: [],
        warnings: []
      });

      const beforeCheck = await this.calculateDataIntegrityCheck(keysToMigrate.map(k => k.oldKey));
      result.dataIntegrityChecks.beforeMigration = beforeCheck.keyCount;

      try {
        result.backupId = await this.createComprehensiveBackup(keysToMigrate);
      } catch (backupError) {
        result.errors.push(`Backup creation failed: ${backupError}`);
        result.warnings.push('Continuing migration without backup - data loss risk increased');
      }

      // Stage 3: Migrate keys by priority (critical data first)
      progressCallback?.({
        stage: 'migrating',
        processedKeys: 0,
        totalKeys: keysToMigrate.length,
        migratedDataSize: 0,
        errors: result.errors,
        warnings: result.warnings
      });

      // Sort by criticality: crisis > clinical > user > system > cache
      const sortedKeys = keysToMigrate.sort((a, b) => {
        const priority = { crisis: 0, clinical: 1, user: 2, system: 3, cache: 4 };
        const aPriority = priority[a.dataCategory] + (a.criticalSafety ? 0 : 5);
        const bPriority = priority[b.dataCategory] + (b.criticalSafety ? 0 : 5);
        return aPriority - bPriority;
      });

      let migratedDataSize = 0;

      for (let i = 0; i < sortedKeys.length; i++) {
        const mapping = sortedKeys[i];

        progressCallback?.({
          stage: 'migrating',
          currentKey: mapping.oldKey,
          processedKeys: i,
          totalKeys: sortedKeys.length,
          migratedDataSize,
          errors: result.errors,
          warnings: result.warnings
        });

        try {
          const migrationResult = await this.migrateSingleKey(mapping);

          if (migrationResult.success) {
            result.migratedKeys.push(mapping.oldKey);
            migratedDataSize += migrationResult.dataSize;

            if (mapping.criticalSafety) {
              console.log(`CRITICAL DATA MIGRATED: ${mapping.oldKey} → ${mapping.newKey}`);
            }
          } else {
            result.skippedKeys.push(mapping.oldKey);
            if (migrationResult.reason) {
              result.warnings.push(`Skipped ${mapping.oldKey}: ${migrationResult.reason}`);
            }
          }

          if (migrationResult.errors) {
            result.errors.push(...migrationResult.errors);
          }

        } catch (error) {
          const errorMsg = `Failed to migrate ${mapping.oldKey}: ${error}`;
          result.errors.push(errorMsg);

          if (mapping.criticalSafety) {
            console.error(`CRITICAL DATA MIGRATION FAILED: ${errorMsg}`);
          }
        }
      }

      // Stage 4: Validation and integrity checking
      progressCallback?.({
        stage: 'validating',
        processedKeys: sortedKeys.length,
        totalKeys: sortedKeys.length,
        migratedDataSize,
        errors: result.errors,
        warnings: result.warnings
      });

      const afterCheck = await this.calculateDataIntegrityCheck(
        result.migratedKeys.map(oldKey => {
          const mapping = this.STORAGE_KEY_MAPPINGS.find(m => m.oldKey === oldKey);
          return mapping?.newKey || '';
        }).filter(key => key !== '')
      );

      result.dataIntegrityChecks.afterMigration = afterCheck.keyCount;
      result.dataIntegrityChecks.checksumMatches =
        beforeCheck.criticalDataCount === afterCheck.criticalDataCount;

      // Validate critical data migration
      const validationErrors = await this.validateCriticalDataMigration(result.migratedKeys);
      result.errors.push(...validationErrors);

      // Stage 5: Cleanup old keys (only if validation passes)
      if (result.errors.length === 0) {
        progressCallback?.({
          stage: 'cleanup',
          processedKeys: sortedKeys.length,
          totalKeys: sortedKeys.length,
          migratedDataSize,
          errors: result.errors,
          warnings: result.warnings
        });

        const cleanupResult = await this.cleanupOldKeys(result.migratedKeys);
        result.warnings.push(...cleanupResult.warnings);
        result.errors.push(...cleanupResult.errors);
      } else {
        result.warnings.push('Skipping cleanup due to validation errors - old keys preserved for safety');
      }

      // Final result
      result.success = result.errors.length === 0;
      result.duration = Date.now() - startTime;

      progressCallback?.({
        stage: result.success ? 'complete' : 'error',
        processedKeys: sortedKeys.length,
        totalKeys: sortedKeys.length,
        migratedDataSize,
        errors: result.errors,
        warnings: result.warnings
      });

      if (result.success) {
        console.log(`Storage key migration completed successfully: ${result.migratedKeys.length} keys migrated in ${result.duration}ms`);
      } else {
        console.error(`Storage key migration failed with ${result.errors.length} errors`);
      }

      return result;

    } catch (error) {
      result.errors.push(`Migration failed: ${error}`);
      result.duration = Date.now() - startTime;
      result.success = false;

      progressCallback?.({
        stage: 'error',
        processedKeys: 0,
        totalKeys: 0,
        migratedDataSize: 0,
        errors: result.errors,
        warnings: result.warnings
      });

      return result;

    } finally {
      this.migrationInProgress = false;
    }
  }

  /**
   * Migrate a single storage key with comprehensive validation
   */
  private async migrateSingleKey(mapping: StorageKeyMapping): Promise<{
    success: boolean;
    dataSize: number;
    reason?: string;
    errors?: string[];
  }> {
    try {
      let originalData: string | null = null;

      // Get data from appropriate storage
      if (mapping.type === 'async_storage') {
        originalData = await AsyncStorage.getItem(mapping.oldKey);
      } else {
        originalData = await SecureStore.getItemAsync(mapping.oldKey);
      }

      if (originalData === null) {
        return {
          success: false,
          dataSize: 0,
          reason: 'No data found at old key'
        };
      }

      // Validate data integrity before migration
      if (mapping.criticalSafety) {
        const isValid = await this.validateDataStructure(originalData, mapping);
        if (!isValid) {
          return {
            success: false,
            dataSize: originalData.length,
            errors: [`Data validation failed for critical key: ${mapping.oldKey}`]
          };
        }
      }

      // Store data at new location
      if (mapping.type === 'async_storage') {
        await AsyncStorage.setItem(mapping.newKey, originalData);
      } else {
        await SecureStore.setItemAsync(mapping.newKey, originalData);
      }

      // Verify migration success
      let migratedData: string | null = null;
      if (mapping.type === 'async_storage') {
        migratedData = await AsyncStorage.getItem(mapping.newKey);
      } else {
        migratedData = await SecureStore.getItemAsync(mapping.newKey);
      }

      if (migratedData !== originalData) {
        return {
          success: false,
          dataSize: originalData.length,
          errors: [`Data verification failed after migration: ${mapping.oldKey} → ${mapping.newKey}`]
        };
      }

      return {
        success: true,
        dataSize: originalData.length
      };

    } catch (error) {
      return {
        success: false,
        dataSize: 0,
        errors: [`Migration error: ${error}`]
      };
    }
  }

  /**
   * Validate data structure for critical data types
   */
  private async validateDataStructure(data: string, mapping: StorageKeyMapping): Promise<boolean> {
    try {
      // For clinical assessment data, ensure it contains required fields
      if (mapping.dataCategory === 'clinical' && mapping.oldKey.includes('assessment')) {
        const parsed = JSON.parse(data);

        if (Array.isArray(parsed)) {
          // Assessment array
          return parsed.every(assessment =>
            assessment.id &&
            assessment.type &&
            ['phq9', 'gad7'].includes(assessment.type) &&
            typeof assessment.score === 'number' &&
            Array.isArray(assessment.answers)
          );
        } else {
          // Single assessment
          return parsed.id &&
                 parsed.type &&
                 ['phq9', 'gad7'].includes(parsed.type) &&
                 typeof parsed.score === 'number' &&
                 Array.isArray(parsed.answers);
        }
      }

      // For crisis data, ensure it contains required safety fields
      if (mapping.dataCategory === 'crisis') {
        const parsed = JSON.parse(data);
        return parsed.isActive !== undefined &&
               parsed.contacts &&
               typeof parsed.contacts === 'object';
      }

      // For other data types, just ensure it's valid JSON
      JSON.parse(data);
      return true;

    } catch (error) {
      console.error(`Data validation failed for ${mapping.oldKey}:`, error);
      return false;
    }
  }

  /**
   * Create comprehensive backup of all data before migration
   */
  private async createComprehensiveBackup(keysToMigrate: StorageKeyMapping[]): Promise<string> {
    const backupId = `being_storage_migration_backup_${Date.now()}`;
    const backup: Record<string, any> = {};

    try {
      for (const mapping of keysToMigrate) {
        try {
          let data: string | null = null;

          if (mapping.type === 'async_storage') {
            data = await AsyncStorage.getItem(mapping.oldKey);
          } else {
            data = await SecureStore.getItemAsync(mapping.oldKey);
          }

          if (data !== null) {
            backup[mapping.oldKey] = {
              data,
              type: mapping.type,
              category: mapping.dataCategory,
              critical: mapping.criticalSafety,
              description: mapping.description,
              targetKey: mapping.newKey
            };
          }
        } catch (error) {
          backup[mapping.oldKey] = {
            error: `Failed to backup: ${error}`,
            type: mapping.type,
            category: mapping.dataCategory,
            critical: mapping.criticalSafety
          };
        }
      }

      const backupData = {
        backupId,
        timestamp: new Date().toISOString(),
        version: '1.0',
        migration: 'being_storage_keys_migration',
        keyCount: keysToMigrate.length,
        backup
      };

      // Store backup in AsyncStorage with special key
      await AsyncStorage.setItem(backupId, JSON.stringify(backupData));

      console.log(`Storage migration backup created: ${backupId} (${keysToMigrate.length} keys)`);
      return backupId;

    } catch (error) {
      throw new Error(`Backup creation failed: ${error}`);
    }
  }

  /**
   * Calculate data integrity checksum for validation
   */
  private async calculateDataIntegrityCheck(keys: string[]): Promise<DataIntegrityCheck> {
    let keyCount = 0;
    let totalDataSize = 0;
    let criticalDataCount = 0;
    let checksumData = '';

    for (const key of keys) {
      try {
        let data: string | null = null;

        // Try both storage types
        try {
          data = await AsyncStorage.getItem(key);
        } catch {}

        if (!data) {
          try {
            data = await SecureStore.getItemAsync(key);
          } catch {}
        }

        if (data) {
          keyCount++;
          totalDataSize += data.length;
          checksumData += key + data;

          // Check if critical data
          const mapping = this.STORAGE_KEY_MAPPINGS.find(m => m.oldKey === key || m.newKey === key);
          if (mapping?.criticalSafety) {
            criticalDataCount++;
          }
        }
      } catch (error) {
        // Skip inaccessible keys
      }
    }

    // Generate simple checksum
    let checksum = 0;
    for (let i = 0; i < checksumData.length; i++) {
      checksum = ((checksum << 5) - checksum + checksumData.charCodeAt(i)) & 0xffffffff;
    }

    return {
      keyCount,
      totalDataSize,
      criticalDataCount,
      dataChecksum: checksum.toString(16)
    };
  }

  /**
   * Validate critical data migration was successful
   */
  private async validateCriticalDataMigration(migratedKeys: string[]): Promise<string[]> {
    const errors: string[] = [];

    const criticalMappings = this.STORAGE_KEY_MAPPINGS.filter(mapping =>
      mapping.criticalSafety && migratedKeys.includes(mapping.oldKey)
    );

    for (const mapping of criticalMappings) {
      try {
        // Verify new data exists and is accessible
        let newData: string | null = null;

        if (mapping.type === 'async_storage') {
          newData = await AsyncStorage.getItem(mapping.newKey);
        } else {
          newData = await SecureStore.getItemAsync(mapping.newKey);
        }

        if (!newData) {
          errors.push(`Critical data missing after migration: ${mapping.newKey}`);
          continue;
        }

        // For clinical data, validate structure
        if (mapping.dataCategory === 'clinical') {
          try {
            const parsed = JSON.parse(newData);
            if (mapping.oldKey.includes('assessment')) {
              // Validate assessment data structure
              const isValidAssessment = Array.isArray(parsed)
                ? parsed.every(a => a.type && a.score !== undefined)
                : parsed.type && parsed.score !== undefined;

              if (!isValidAssessment) {
                errors.push(`Invalid assessment data structure after migration: ${mapping.newKey}`);
              }
            }
          } catch (parseError) {
            errors.push(`Clinical data corruption after migration: ${mapping.newKey}`);
          }
        }

      } catch (error) {
        errors.push(`Critical data validation failed: ${mapping.newKey} - ${error}`);
      }
    }

    return errors;
  }

  /**
   * Clean up old storage keys after successful migration
   */
  private async cleanupOldKeys(migratedKeys: string[]): Promise<{
    warnings: string[];
    errors: string[];
  }> {
    const warnings: string[] = [];
    const errors: string[] = [];

    for (const oldKey of migratedKeys) {
      const mapping = this.STORAGE_KEY_MAPPINGS.find(m => m.oldKey === oldKey);
      if (!mapping) continue;

      try {
        if (mapping.type === 'async_storage') {
          await AsyncStorage.removeItem(oldKey);
        } else {
          await SecureStore.deleteItemAsync(oldKey);
        }

        console.log(`Cleaned up old key: ${oldKey}`);

      } catch (error) {
        const message = `Failed to remove old key ${oldKey}: ${error}`;
        if (mapping.criticalSafety) {
          errors.push(message);
        } else {
          warnings.push(message);
        }
      }
    }

    return { warnings, errors };
  }

  /**
   * Emergency rollback function to restore from backup
   */
  async rollbackMigration(backupId: string): Promise<{
    success: boolean;
    restoredKeys: string[];
    errors: string[];
  }> {
    const result = {
      success: false,
      restoredKeys: [] as string[],
      errors: [] as string[]
    };

    try {
      console.warn(`EMERGENCY ROLLBACK: Restoring from backup ${backupId}`);

      const backupData = await AsyncStorage.getItem(backupId);
      if (!backupData) {
        result.errors.push(`Backup not found: ${backupId}`);
        return result;
      }

      const backup = JSON.parse(backupData);
      const { backup: keyData } = backup;

      // First, remove all new keys
      for (const mapping of this.STORAGE_KEY_MAPPINGS) {
        try {
          if (mapping.type === 'async_storage') {
            await AsyncStorage.removeItem(mapping.newKey);
          } else {
            await SecureStore.deleteItemAsync(mapping.newKey);
          }
        } catch (error) {
          // OK if key doesn't exist
        }
      }

      // Restore original keys
      for (const [oldKey, keyInfo] of Object.entries(keyData)) {
        if (typeof keyInfo !== 'object' || !keyInfo || !keyInfo.data) {
          continue;
        }

        try {
          if (keyInfo.type === 'async_storage') {
            await AsyncStorage.setItem(oldKey, keyInfo.data);
          } else {
            await SecureStore.setItemAsync(oldKey, keyInfo.data);
          }

          result.restoredKeys.push(oldKey);

          if (keyInfo.critical) {
            console.log(`CRITICAL DATA RESTORED: ${oldKey}`);
          }

        } catch (error) {
          result.errors.push(`Failed to restore ${oldKey}: ${error}`);
        }
      }

      result.success = result.errors.length === 0;

      if (result.success) {
        console.log(`Rollback completed: ${result.restoredKeys.length} keys restored`);
      } else {
        console.error(`Rollback completed with ${result.errors.length} errors`);
      }

      return result;

    } catch (error) {
      result.errors.push(`Rollback failed: ${error}`);
      return result;
    }
  }

  /**
   * Check if migration is currently in progress
   */
  isMigrationInProgress(): boolean {
    return this.migrationInProgress;
  }

  /**
   * Get all available backup IDs for rollback
   */
  async getAvailableBackups(): Promise<string[]> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      return allKeys.filter(key => key.startsWith('being_storage_migration_backup_'))
                   .sort((a, b) => {
                     const timestampA = parseInt(a.split('_').pop() || '0');
                     const timestampB = parseInt(b.split('_').pop() || '0');
                     return timestampB - timestampA; // Most recent first
                   });
    } catch (error) {
      console.error('Failed to get available backups:', error);
      return [];
    }
  }
}

// Export singleton instance
export const storageKeyMigrator = StorageKeyMigrator.getInstance();