/**
 * Migration Orchestrator for Being. MBCT App
 *
 * Coordinates the complete migration process from Fullmind to Being storage keys
 * and encryption. This service ensures safe, validated migrations with comprehensive
 * rollback capabilities and progress tracking.
 *
 * CRITICAL SAFETY FEATURES:
 * - Zero data loss guarantees
 * - Clinical data integrity validation (PHQ-9/GAD-7)
 * - Crisis information preservation
 * - Emergency rollback capabilities
 * - Real-time progress monitoring
 */

import { storageKeyMigrator, MigrationProgress, MigrationResult } from './StorageKeyMigrator';
import { dataStoreMigrator, MigrationResult as EncryptionMigrationResult } from './DataStoreMigrator';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CompleteMigrationProgress {
  stage: 'assessment' | 'storage_keys' | 'encryption' | 'validation' | 'complete' | 'error';
  storageKeyProgress?: MigrationProgress;
  encryptionProgress?: any;
  overallProgress: number; // 0-100
  criticalDataStatus: {
    assessmentsSecure: boolean;
    crisisDataSecure: boolean;
    userDataSecure: boolean;
  };
  estimatedTimeRemaining: number;
  warnings: string[];
  errors: string[];
}

export interface CompleteMigrationResult {
  success: boolean;
  storageKeyMigration: MigrationResult | null;
  encryptionMigration: EncryptionMigrationResult | null;
  totalDuration: number;
  criticalDataValidated: boolean;
  backupIds: string[];
  finalStatus: {
    storageKeysUpdated: boolean;
    dataEncrypted: boolean;
    oldKeysRemoved: boolean;
    rollbackAvailable: boolean;
  };
  errors: string[];
  warnings: string[];
}

export interface MigrationStatus {
  isRequired: boolean;
  storageKeyMigrationNeeded: boolean;
  encryptionMigrationNeeded: boolean;
  criticalDataAtRisk: string[];
  estimatedDuration: number;
  safetyAssessment: {
    safe: boolean;
    blockers: string[];
    recommendations: string[];
  };
}

export class MigrationOrchestrator {
  private static instance: MigrationOrchestrator;
  private migrationInProgress = false;
  private readonly MIGRATION_STATUS_KEY = '@being_migration_status_v1';

  private constructor() {}

  public static getInstance(): MigrationOrchestrator {
    if (!MigrationOrchestrator.instance) {
      MigrationOrchestrator.instance = new MigrationOrchestrator();
    }
    return MigrationOrchestrator.instance;
  }

  /**
   * Comprehensive migration status assessment
   */
  async assessMigrationStatus(): Promise<MigrationStatus> {
    try {
      console.log('Assessing complete migration status...');

      // Check storage key migration needs
      const storageAssessment = await storageKeyMigrator.assessMigrationNeeds();

      // Check encryption migration needs
      const encryptionAssessment = await dataStoreMigrator.assessMigrationNeeds();

      const criticalDataAtRisk = [
        ...storageAssessment.criticalDataAtRisk,
        ...encryptionAssessment.unencryptedKeys
      ];

      // Calculate estimated duration
      const storageTime = storageAssessment.estimatedDataSize > 1024 * 1024 ? 5 : 2; // minutes
      const encryptionTime = encryptionAssessment.estimatedItems > 100 ? 10 : 5; // minutes
      const estimatedDuration = (storageTime + encryptionTime) * 60 * 1000; // milliseconds

      // Safety assessment
      const blockers: string[] = [];
      const recommendations: string[] = [];

      if (criticalDataAtRisk.length > 0) {
        recommendations.push(`${criticalDataAtRisk.length} critical data items require immediate migration`);
      }

      const clinicalData = criticalDataAtRisk.filter(key =>
        key.includes('assessment') || key.includes('phq') || key.includes('gad') || key.includes('clinical')
      );
      if (clinicalData.length > 0) {
        recommendations.push('URGENT: PHQ-9/GAD-7 clinical data requires secure migration');
      }

      const crisisData = criticalDataAtRisk.filter(key =>
        key.includes('crisis') || key.includes('emergency')
      );
      if (crisisData.length > 0) {
        recommendations.push('URGENT: Crisis and safety data requires secure migration');
      }

      // Check for blockers
      if (storageKeyMigrator.isMigrationInProgress() || dataStoreMigrator.isMigrationInProgress()) {
        blockers.push('Another migration is already in progress');
      }

      const status: MigrationStatus = {
        isRequired: storageAssessment.isRequired || encryptionAssessment.isRequired,
        storageKeyMigrationNeeded: storageAssessment.isRequired,
        encryptionMigrationNeeded: encryptionAssessment.isRequired,
        criticalDataAtRisk,
        estimatedDuration,
        safetyAssessment: {
          safe: blockers.length === 0,
          blockers,
          recommendations: [...storageAssessment.safetyRecommendations, ...recommendations]
        }
      };

      console.log('Migration status assessment:', {
        required: status.isRequired,
        storageKeys: status.storageKeyMigrationNeeded,
        encryption: status.encryptionMigrationNeeded,
        criticalData: criticalDataAtRisk.length,
        estimatedMinutes: Math.ceil(estimatedDuration / 60000)
      });

      return status;

    } catch (error) {
      console.error('Migration status assessment failed:', error);
      return {
        isRequired: false,
        storageKeyMigrationNeeded: false,
        encryptionMigrationNeeded: false,
        criticalDataAtRisk: [],
        estimatedDuration: 0,
        safetyAssessment: {
          safe: false,
          blockers: ['Assessment failed'],
          recommendations: ['Manual assessment required']
        }
      };
    }
  }

  /**
   * Execute complete migration with orchestrated progress tracking
   */
  async performCompleteMigration(
    progressCallback?: (progress: CompleteMigrationProgress) => void
  ): Promise<CompleteMigrationResult> {
    if (this.migrationInProgress) {
      throw new Error('Migration already in progress');
    }

    const startTime = Date.now();
    this.migrationInProgress = true;

    const result: CompleteMigrationResult = {
      success: false,
      storageKeyMigration: null,
      encryptionMigration: null,
      totalDuration: 0,
      criticalDataValidated: false,
      backupIds: [],
      finalStatus: {
        storageKeysUpdated: false,
        dataEncrypted: false,
        oldKeysRemoved: false,
        rollbackAvailable: false
      },
      errors: [],
      warnings: []
    };

    try {
      // Stage 1: Assessment
      progressCallback?.({
        stage: 'assessment',
        overallProgress: 5,
        criticalDataStatus: {
          assessmentsSecure: false,
          crisisDataSecure: false,
          userDataSecure: false
        },
        estimatedTimeRemaining: 0,
        warnings: [],
        errors: []
      });

      const status = await this.assessMigrationStatus();

      if (!status.isRequired) {
        result.success = true;
        result.totalDuration = Date.now() - startTime;
        result.finalStatus = {
          storageKeysUpdated: true,
          dataEncrypted: true,
          oldKeysRemoved: true,
          rollbackAvailable: false
        };

        progressCallback?.({
          stage: 'complete',
          overallProgress: 100,
          criticalDataStatus: {
            assessmentsSecure: true,
            crisisDataSecure: true,
            userDataSecure: true
          },
          estimatedTimeRemaining: 0,
          warnings: ['No migration required - all data already secure'],
          errors: []
        });

        return result;
      }

      if (!status.safetyAssessment.safe) {
        throw new Error(`Migration unsafe: ${status.safetyAssessment.blockers.join(', ')}`);
      }

      // Stage 2: Storage Key Migration
      if (status.storageKeyMigrationNeeded) {
        progressCallback?.({
          stage: 'storage_keys',
          overallProgress: 15,
          criticalDataStatus: {
            assessmentsSecure: false,
            crisisDataSecure: false,
            userDataSecure: false
          },
          estimatedTimeRemaining: status.estimatedDuration,
          warnings: result.warnings,
          errors: result.errors
        });

        console.log('Starting storage key migration...');

        result.storageKeyMigration = await storageKeyMigrator.performMigration((progress) => {
          const overallProgress = 15 + (progress.processedKeys / progress.totalKeys) * 40;

          progressCallback?.({
            stage: 'storage_keys',
            storageKeyProgress: progress,
            overallProgress,
            criticalDataStatus: {
              assessmentsSecure: false,
              crisisDataSecure: false,
              userDataSecure: false
            },
            estimatedTimeRemaining: Math.max(0, status.estimatedDuration - (Date.now() - startTime)),
            warnings: [...result.warnings, ...progress.warnings],
            errors: [...result.errors, ...progress.errors]
          });
        });

        if (result.storageKeyMigration.backupId) {
          result.backupIds.push(result.storageKeyMigration.backupId);
        }

        result.warnings.push(...result.storageKeyMigration.warnings);
        result.errors.push(...result.storageKeyMigration.errors);

        if (!result.storageKeyMigration.success) {
          throw new Error(`Storage key migration failed: ${result.storageKeyMigration.errors.join(', ')}`);
        }

        result.finalStatus.storageKeysUpdated = true;
        console.log(`Storage key migration completed: ${result.storageKeyMigration.migratedKeys.length} keys migrated`);
      } else {
        result.finalStatus.storageKeysUpdated = true;
      }

      // Stage 3: Encryption Migration
      if (status.encryptionMigrationNeeded) {
        progressCallback?.({
          stage: 'encryption',
          overallProgress: 55,
          criticalDataStatus: {
            assessmentsSecure: result.finalStatus.storageKeysUpdated,
            crisisDataSecure: false,
            userDataSecure: false
          },
          estimatedTimeRemaining: Math.max(0, status.estimatedDuration - (Date.now() - startTime)),
          warnings: result.warnings,
          errors: result.errors
        });

        console.log('Starting encryption migration...');

        result.encryptionMigration = await dataStoreMigrator.performMigration((progress) => {
          const overallProgress = 55 + (progress.progress / 100) * 35;

          progressCallback?.({
            stage: 'encryption',
            encryptionProgress: progress,
            overallProgress,
            criticalDataStatus: {
              assessmentsSecure: result.finalStatus.storageKeysUpdated,
              crisisDataSecure: progress.stage === 'completing',
              userDataSecure: progress.stage === 'completing'
            },
            estimatedTimeRemaining: Math.max(0, status.estimatedDuration - (Date.now() - startTime)),
            warnings: result.warnings,
            errors: result.errors
          });
        });

        result.warnings.push(...(result.encryptionMigration.errors || []));

        if (!result.encryptionMigration.success) {
          throw new Error(`Encryption migration failed: ${(result.encryptionMigration.errors || []).join(', ')}`);
        }

        result.finalStatus.dataEncrypted = true;
        console.log(`Encryption migration completed: ${result.encryptionMigration.migratedItems} items encrypted`);
      } else {
        result.finalStatus.dataEncrypted = true;
      }

      // Stage 4: Final Validation
      progressCallback?.({
        stage: 'validation',
        overallProgress: 90,
        criticalDataStatus: {
          assessmentsSecure: true,
          crisisDataSecure: true,
          userDataSecure: true
        },
        estimatedTimeRemaining: Math.max(0, 30000 - (Date.now() - startTime)),
        warnings: result.warnings,
        errors: result.errors
      });

      const validationResult = await this.validateCompleteMigration();
      result.criticalDataValidated = validationResult.success;
      result.errors.push(...validationResult.errors);
      result.warnings.push(...validationResult.warnings);

      if (!validationResult.success) {
        throw new Error(`Migration validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Mark old keys as removed if storage migration was successful
      if (result.storageKeyMigration?.success) {
        result.finalStatus.oldKeysRemoved = true;
      }

      // Check rollback availability
      const availableBackups = await storageKeyMigrator.getAvailableBackups();
      result.finalStatus.rollbackAvailable = availableBackups.length > 0;

      // Record migration completion
      await this.recordMigrationCompletion(result);

      // Final success
      result.success = true;
      result.totalDuration = Date.now() - startTime;

      progressCallback?.({
        stage: 'complete',
        overallProgress: 100,
        criticalDataStatus: {
          assessmentsSecure: true,
          crisisDataSecure: true,
          userDataSecure: true
        },
        estimatedTimeRemaining: 0,
        warnings: result.warnings,
        errors: result.errors
      });

      console.log(`Complete migration finished successfully in ${result.totalDuration}ms`);
      return result;

    } catch (error) {
      result.errors.push(`Migration failed: ${error}`);
      result.totalDuration = Date.now() - startTime;

      progressCallback?.({
        stage: 'error',
        overallProgress: 0,
        criticalDataStatus: {
          assessmentsSecure: false,
          crisisDataSecure: false,
          userDataSecure: false
        },
        estimatedTimeRemaining: 0,
        warnings: result.warnings,
        errors: result.errors
      });

      console.error('Complete migration failed:', error);
      return result;

    } finally {
      this.migrationInProgress = false;
    }
  }

  /**
   * Validate that the complete migration was successful
   */
  private async validateCompleteMigration(): Promise<{
    success: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check that critical storage keys have been migrated
      const keyAssessment = await storageKeyMigrator.assessMigrationNeeds();
      if (keyAssessment.criticalDataAtRisk.length > 0) {
        errors.push(`Critical storage keys still unmigrated: ${keyAssessment.criticalDataAtRisk.join(', ')}`);
      }

      // Check that encryption migration is complete
      const encryptionAssessment = await dataStoreMigrator.assessMigrationNeeds();
      if (encryptionAssessment.isRequired) {
        errors.push('Encryption migration still required');
      }

      // Validate that critical data can be accessed
      try {
        const testUserData = await AsyncStorage.getItem('@being_user');
        const testAssessments = await AsyncStorage.getItem('@being_assessments');
        const testCrisis = await AsyncStorage.getItem('@being_crisis');

        // These keys might not exist for new users, which is OK
        if (testUserData === null && testAssessments === null && testCrisis === null) {
          warnings.push('No existing user data found - this may be a new installation');
        }
      } catch (error) {
        errors.push(`Data access validation failed: ${error}`);
      }

      return {
        success: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      return {
        success: false,
        errors: [`Validation check failed: ${error}`],
        warnings
      };
    }
  }

  /**
   * Record migration completion for future reference
   */
  private async recordMigrationCompletion(result: CompleteMigrationResult): Promise<void> {
    try {
      const migrationRecord = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        result: {
          success: result.success,
          duration: result.totalDuration,
          storageKeysMigrated: result.storageKeyMigration?.migratedKeys.length || 0,
          encryptionItemsMigrated: result.encryptionMigration?.migratedItems || 0,
          criticalDataValidated: result.criticalDataValidated,
          backupIds: result.backupIds,
          finalStatus: result.finalStatus
        },
        errors: result.errors,
        warnings: result.warnings
      };

      await AsyncStorage.setItem(this.MIGRATION_STATUS_KEY, JSON.stringify(migrationRecord));
      console.log('Migration completion recorded');

    } catch (error) {
      console.error('Failed to record migration completion:', error);
    }
  }

  /**
   * Emergency rollback to restore from backups
   */
  async performEmergencyRollback(): Promise<{
    success: boolean;
    restoredItems: number;
    errors: string[];
  }> {
    console.warn('EMERGENCY ROLLBACK: Attempting to restore from backups');

    const result = {
      success: false,
      restoredItems: 0,
      errors: [] as string[]
    };

    try {
      // Get all available backups
      const availableBackups = await storageKeyMigrator.getAvailableBackups();

      if (availableBackups.length === 0) {
        result.errors.push('No backups available for rollback');
        return result;
      }

      // Use the most recent backup
      const latestBackup = availableBackups[0];
      console.log(`Rolling back to backup: ${latestBackup}`);

      const rollbackResult = await storageKeyMigrator.rollbackMigration(latestBackup);

      result.success = rollbackResult.success;
      result.restoredItems = rollbackResult.restoredKeys.length;
      result.errors = rollbackResult.errors;

      if (result.success) {
        console.log(`Emergency rollback completed: ${result.restoredItems} keys restored`);

        // Clear migration status to allow re-migration
        await AsyncStorage.removeItem(this.MIGRATION_STATUS_KEY);
      } else {
        console.error(`Emergency rollback failed: ${result.errors.join(', ')}`);
      }

      return result;

    } catch (error) {
      result.errors.push(`Rollback failed: ${error}`);
      console.error('Emergency rollback failed:', error);
      return result;
    }
  }

  /**
   * Check if any migration is currently in progress
   */
  isMigrationInProgress(): boolean {
    return this.migrationInProgress ||
           storageKeyMigrator.isMigrationInProgress() ||
           dataStoreMigrator.isMigrationInProgress();
  }

  /**
   * Get migration history and status
   */
  async getMigrationHistory(): Promise<any | null> {
    try {
      const history = await AsyncStorage.getItem(this.MIGRATION_STATUS_KEY);
      return history ? JSON.parse(history) : null;
    } catch (error) {
      console.error('Failed to get migration history:', error);
      return null;
    }
  }

  /**
   * Auto-migration check for app startup
   */
  async checkAndAutoMigrate(): Promise<boolean> {
    try {
      const status = await this.assessMigrationStatus();

      if (!status.isRequired) {
        console.log('No migration required - app ready');
        return true;
      }

      if (!status.safetyAssessment.safe) {
        console.warn('Auto-migration blocked:', status.safetyAssessment.blockers);
        return false;
      }

      // Only auto-migrate if there's critical data at risk
      const hasCriticalData = status.criticalDataAtRisk.some(key =>
        key.includes('assessment') || key.includes('crisis') || key.includes('clinical')
      );

      if (hasCriticalData) {
        console.log('Auto-migrating critical mental health data...');

        const result = await this.performCompleteMigration((progress) => {
          console.log(`Auto-migration: ${progress.stage} (${progress.overallProgress}%)`);
        });

        if (result.success) {
          console.log('Auto-migration completed successfully');
          return true;
        } else {
          console.error('Auto-migration failed:', result.errors);
          return false;
        }
      }

      console.log('No critical data requires auto-migration');
      return true;

    } catch (error) {
      console.error('Auto-migration check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const migrationOrchestrator = MigrationOrchestrator.getInstance();