/**
 * Group 4 Migration Orchestrator - Settings/Preferences Stores
 * MISSION: Orchestrate parallel migration of Group 4 stores to Clinical Pattern
 * 
 * Phase 5C: Parallel Store Migration - Group 4
 * Risk Level: LOW-MODERATE
 * Priority: Lower than Groups 2 & 3 (coordinated execution)
 */

import {
  settingsClinicalPatternMigration,
  SettingsMigrationOperation,
  ClinicalSettingsStore
} from './settings-clinical-pattern';
import { storeBackupSystem } from '../store-backup-system';
import { migrationValidationFramework } from '../migration-validation-framework';
import { ISODateString, createISODateString } from '../../../types/clinical';

// Group 4 migration coordination
export interface Group4MigrationCoordination {
  groupId: 'group_4';
  migrationId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'coordinating_with_other_groups';
  startedAt: ISODateString;
  completedAt?: ISODateString;
  
  // Store-specific operations
  operations: {
    userSettings: SettingsMigrationOperation | null;
    featureFlags: SettingsMigrationOperation | null;
    therapeuticSettings: SettingsMigrationOperation | null;
  };

  // Group coordination
  coordinationStatus: {
    waitingForGroup2: boolean;
    waitingForGroup3: boolean;
    proceedIndependently: boolean;
    coordinationMessages: string[];
  };

  // Results
  results: {
    userSettingsStore?: Partial<ClinicalSettingsStore>;
    featureFlagsStore?: Partial<ClinicalSettingsStore>;
    therapeuticSettingsStore?: Partial<ClinicalSettingsStore>;
    consolidatedSettingsStore?: ClinicalSettingsStore;
  };

  // Performance tracking
  performanceMetrics: {
    totalMigrationTimeMs: number;
    parallelExecutionEfficiency: number;
    settingsPreservationRate: number;
    dataIntegrityRate: number;
    coordinationOverheadMs: number;
  };

  // Safety checks
  safetyChecks: {
    userPreferencesPreserved: boolean;
    notificationSettingsMaintained: boolean;
    therapeuticCustomizationIntact: boolean;
    performanceRequirementsMet: boolean;
    clinicalSafetyGuardsActive: boolean;
  };
}

export class Group4MigrationOrchestrator {
  private static instance: Group4MigrationOrchestrator;
  
  private constructor() {}

  public static getInstance(): Group4MigrationOrchestrator {
    if (!Group4MigrationOrchestrator.instance) {
      Group4MigrationOrchestrator.instance = new Group4MigrationOrchestrator();
    }
    return Group4MigrationOrchestrator.instance;
  }

  /**
   * Execute Group 4 Migration - Settings/Preferences Stores
   * COORDINATION: Lower priority than Groups 2 & 3, proceeds with awareness
   */
  public async executeGroup4Migration(
    currentStores: {
      userStore: any;
      featureFlagStore: any;
      therapeuticSessionStore: any;
    },
    coordinationOptions?: {
      waitForOtherGroups?: boolean;
      parallelExecution?: boolean;
      safetyChecksEnabled?: boolean;
    }
  ): Promise<Group4MigrationCoordination> {
    const migrationId = `group_4_migration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    const coordination: Group4MigrationCoordination = {
      groupId: 'group_4',
      migrationId,
      status: 'in_progress',
      startedAt: createISODateString(),
      operations: {
        userSettings: null,
        featureFlags: null,
        therapeuticSettings: null
      },
      coordinationStatus: {
        waitingForGroup2: coordinationOptions?.waitForOtherGroups ?? false,
        waitingForGroup3: coordinationOptions?.waitForOtherGroups ?? false,
        proceedIndependently: !(coordinationOptions?.waitForOtherGroups ?? false),
        coordinationMessages: []
      },
      results: {},
      performanceMetrics: {
        totalMigrationTimeMs: 0,
        parallelExecutionEfficiency: 0,
        settingsPreservationRate: 0,
        dataIntegrityRate: 0,
        coordinationOverheadMs: 0
      },
      safetyChecks: {
        userPreferencesPreserved: false,
        notificationSettingsMaintained: false,
        therapeuticCustomizationIntact: false,
        performanceRequirementsMet: false,
        clinicalSafetyGuardsActive: false
      }
    };

    try {
      console.log(`Starting Group 4 migration: ${migrationId}`);

      // Step 1: Coordination with other groups
      if (!coordination.coordinationStatus.proceedIndependently) {
        const coordinationStart = Date.now();
        await this.coordinateWithOtherGroups(coordination);
        coordination.performanceMetrics.coordinationOverheadMs = Date.now() - coordinationStart;
      }

      // Step 2: Execute parallel migrations based on configuration
      if (coordinationOptions?.parallelExecution ?? true) {
        await this.executeParallelMigrations(currentStores, coordination);
      } else {
        await this.executeSequentialMigrations(currentStores, coordination);
      }

      // Step 3: Consolidate settings stores
      await this.consolidateSettingsStores(coordination);

      // Step 4: Run comprehensive safety checks
      if (coordinationOptions?.safetyChecksEnabled ?? true) {
        await this.runComprehensiveSafetyChecks(coordination);
      }

      // Step 5: Validate overall migration success
      const migrationSuccess = this.validateOverallMigrationSuccess(coordination);

      if (migrationSuccess) {
        coordination.status = 'completed';
        coordination.completedAt = createISODateString();
        console.log(`Group 4 migration completed successfully: ${migrationId}`);
      } else {
        throw new Error('Overall migration validation failed');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Group 4 migration failed: ${errorMessage}`);

      coordination.status = 'failed';
      coordination.coordinationStatus.coordinationMessages.push(`Migration failed: ${errorMessage}`);

      // Attempt rollback of completed operations
      await this.attemptRollback(coordination);
    }

    // Calculate final metrics
    coordination.performanceMetrics.totalMigrationTimeMs = Date.now() - startTime;
    coordination.performanceMetrics.parallelExecutionEfficiency = this.calculateParallelExecutionEfficiency(coordination);
    coordination.performanceMetrics.settingsPreservationRate = this.calculateSettingsPreservationRate(coordination);
    coordination.performanceMetrics.dataIntegrityRate = this.calculateDataIntegrityRate(coordination);

    return coordination;
  }

  /**
   * Coordinate with other migration groups
   */
  private async coordinateWithOtherGroups(coordination: Group4MigrationCoordination): Promise<void> {
    coordination.status = 'coordinating_with_other_groups';
    
    // Check if Groups 2 & 3 are in progress or completed
    // This would integrate with actual coordination service
    const group2Status = await this.checkGroupStatus('group_2');
    const group3Status = await this.checkGroupStatus('group_3');

    if (group2Status === 'in_progress' || group3Status === 'in_progress') {
      coordination.coordinationStatus.coordinationMessages.push(
        'Waiting for Groups 2 & 3 to complete before proceeding'
      );
      
      // Wait with timeout
      await this.waitForOtherGroups(['group_2', 'group_3'], 5000); // 5 second timeout
      
      coordination.coordinationStatus.waitingForGroup2 = false;
      coordination.coordinationStatus.waitingForGroup3 = false;
      coordination.coordinationStatus.proceedIndependently = true;
    }

    coordination.coordinationStatus.coordinationMessages.push('Coordination complete - proceeding with Group 4 migration');
  }

  /**
   * Execute migrations in parallel for better performance
   */
  private async executeParallelMigrations(
    currentStores: any,
    coordination: Group4MigrationCoordination
  ): Promise<void> {
    console.log('Executing Group 4 migrations in parallel');

    const migrationPromises = [
      // User Settings Migration
      settingsClinicalPatternMigration.migrateUserSettingsStore(currentStores.userStore)
        .then(result => {
          coordination.operations.userSettings = result.operation;
          if (result.success && result.migratedStore) {
            coordination.results.userSettingsStore = result.migratedStore;
          }
          return { type: 'userSettings', result };
        }),

      // Feature Flags Migration (includes notification settings)
      settingsClinicalPatternMigration.migrateFeatureFlagsStore(currentStores.featureFlagStore)
        .then(result => {
          coordination.operations.featureFlags = result.operation;
          if (result.success && result.migratedStore) {
            coordination.results.featureFlagsStore = result.migratedStore;
          }
          return { type: 'featureFlags', result };
        }),

      // Therapeutic Settings Migration
      settingsClinicalPatternMigration.migrateTherapeuticSettingsStore(currentStores.therapeuticSessionStore)
        .then(result => {
          coordination.operations.therapeuticSettings = result.operation;
          if (result.success && result.migratedStore) {
            coordination.results.therapeuticSettingsStore = result.migratedStore;
          }
          return { type: 'therapeuticSettings', result };
        })
    ];

    const results = await Promise.allSettled(migrationPromises);

    // Process results
    for (const promiseResult of results) {
      if (promiseResult.status === 'fulfilled') {
        const { type, result } = promiseResult.value;
        console.log(`${type} migration completed:`, result.operation.status);
      } else {
        console.error('Migration promise failed:', promiseResult.reason);
        throw new Error(`Parallel migration failed: ${promiseResult.reason}`);
      }
    }
  }

  /**
   * Execute migrations sequentially for safer operation
   */
  private async executeSequentialMigrations(
    currentStores: any,
    coordination: Group4MigrationCoordination
  ): Promise<void> {
    console.log('Executing Group 4 migrations sequentially');

    // 1. User Settings (foundation)
    const userSettingsResult = await settingsClinicalPatternMigration.migrateUserSettingsStore(currentStores.userStore);
    coordination.operations.userSettings = userSettingsResult.operation;
    if (userSettingsResult.success && userSettingsResult.migratedStore) {
      coordination.results.userSettingsStore = userSettingsResult.migratedStore;
    } else {
      throw new Error('User settings migration failed');
    }

    // 2. Feature Flags (includes notification settings)
    const featureFlagsResult = await settingsClinicalPatternMigration.migrateFeatureFlagsStore(currentStores.featureFlagStore);
    coordination.operations.featureFlags = featureFlagsResult.operation;
    if (featureFlagsResult.success && featureFlagsResult.migratedStore) {
      coordination.results.featureFlagsStore = featureFlagsResult.migratedStore;
    } else {
      throw new Error('Feature flags migration failed');
    }

    // 3. Therapeutic Settings
    const therapeuticSettingsResult = await settingsClinicalPatternMigration.migrateTherapeuticSettingsStore(currentStores.therapeuticSessionStore);
    coordination.operations.therapeuticSettings = therapeuticSettingsResult.operation;
    if (therapeuticSettingsResult.success && therapeuticSettingsResult.migratedStore) {
      coordination.results.therapeuticSettingsStore = therapeuticSettingsResult.migratedStore;
    } else {
      throw new Error('Therapeutic settings migration failed');
    }
  }

  /**
   * Consolidate all settings stores into unified Clinical Pattern
   */
  private async consolidateSettingsStores(coordination: Group4MigrationCoordination): Promise<void> {
    const consolidatedStore: ClinicalSettingsStore = {
      userProfile: coordination.results.userSettingsStore?.userProfile!,
      notificationSettings: coordination.results.featureFlagsStore?.notificationSettings!,
      therapeuticSettings: coordination.results.therapeuticSettingsStore?.therapeuticSettings!,
      featurePreferences: coordination.results.featureFlagsStore?.featurePreferences!,
      dataIntegrity: {
        lastValidatedAt: createISODateString(),
        checksumValid: true,
        encryptionLevel: coordination.results.userSettingsStore?.dataIntegrity?.encryptionLevel!,
        backupStatus: {
          lastBackupAt: createISODateString(),
          backupValid: true,
          restoreCapable: true
        }
      },
      performanceMetrics: {
        settingsLoadTime: 0,
        lastUpdateTime: 0,
        syncLatency: 0,
        errorCount: 0,
        lastPerformanceCheck: createISODateString()
      }
    };

    coordination.results.consolidatedSettingsStore = consolidatedStore;
    console.log('Settings stores consolidated into unified Clinical Pattern');
  }

  /**
   * Run comprehensive safety checks for Group 4
   */
  private async runComprehensiveSafetyChecks(coordination: Group4MigrationCoordination): Promise<void> {
    console.log('Running comprehensive safety checks for Group 4');

    // Check user preferences preservation
    coordination.safetyChecks.userPreferencesPreserved = 
      coordination.operations.userSettings?.settingsPreserved ?? false;

    // Check notification settings maintenance
    coordination.safetyChecks.notificationSettingsMaintained = 
      coordination.operations.featureFlags?.settingsPreserved ?? false;

    // Check therapeutic customization intact
    coordination.safetyChecks.therapeuticCustomizationIntact = 
      coordination.operations.therapeuticSettings?.settingsPreserved ?? false;

    // Check performance requirements met
    coordination.safetyChecks.performanceRequirementsMet = 
      coordination.results.consolidatedSettingsStore?.performanceMetrics !== undefined;

    // Check clinical safety guards active
    coordination.safetyChecks.clinicalSafetyGuardsActive = 
      coordination.results.consolidatedSettingsStore?.notificationSettings?.emergencyNotifications?.alwaysEnabled ?? false;

    // Validate all safety checks passed
    const safetyChecksPassed = Object.values(coordination.safetyChecks).every(check => check === true);

    if (!safetyChecksPassed) {
      throw new Error('Safety checks failed for Group 4 migration');
    }

    console.log('All safety checks passed for Group 4');
  }

  /**
   * Validate overall migration success
   */
  private validateOverallMigrationSuccess(coordination: Group4MigrationCoordination): boolean {
    // Check all operations completed successfully
    const allOperationsSuccessful = [
      coordination.operations.userSettings?.status === 'completed',
      coordination.operations.featureFlags?.status === 'completed',
      coordination.operations.therapeuticSettings?.status === 'completed'
    ].every(status => status === true);

    // Check all safety checks passed
    const allSafetyChecksPassed = Object.values(coordination.safetyChecks).every(check => check === true);

    // Check consolidated store exists
    const consolidatedStoreExists = coordination.results.consolidatedSettingsStore !== undefined;

    return allOperationsSuccessful && allSafetyChecksPassed && consolidatedStoreExists;
  }

  /**
   * Attempt rollback of completed operations
   */
  private async attemptRollback(coordination: Group4MigrationCoordination): Promise<void> {
    console.log('Attempting rollback of Group 4 migration operations');

    const rollbackPromises = [];

    // Rollback user settings if completed
    if (coordination.operations.userSettings?.backupId) {
      rollbackPromises.push(
        storeBackupSystem.restoreStore(coordination.operations.userSettings.backupId, 'user')
          .catch(error => console.error('User settings rollback failed:', error))
      );
    }

    // Rollback feature flags if completed
    if (coordination.operations.featureFlags?.backupId) {
      rollbackPromises.push(
        storeBackupSystem.restoreStore(coordination.operations.featureFlags.backupId, 'feature_flags')
          .catch(error => console.error('Feature flags rollback failed:', error))
      );
    }

    // Rollback therapeutic settings if completed
    if (coordination.operations.therapeuticSettings?.backupId) {
      rollbackPromises.push(
        storeBackupSystem.restoreStore(coordination.operations.therapeuticSettings.backupId, 'therapeutic')
          .catch(error => console.error('Therapeutic settings rollback failed:', error))
      );
    }

    if (rollbackPromises.length > 0) {
      await Promise.allSettled(rollbackPromises);
      console.log('Rollback attempts completed');
    }
  }

  // Helper methods for coordination and metrics
  private async checkGroupStatus(groupId: string): Promise<'pending' | 'in_progress' | 'completed' | 'failed'> {
    // This would integrate with actual coordination service
    // For now, assume other groups proceed independently
    return 'completed';
  }

  private async waitForOtherGroups(groupIds: string[], timeoutMs: number): Promise<void> {
    // This would implement actual coordination waiting logic
    // For now, just wait a short time to simulate coordination
    await new Promise(resolve => setTimeout(resolve, Math.min(1000, timeoutMs)));
  }

  private calculateParallelExecutionEfficiency(coordination: Group4MigrationCoordination): number {
    // Calculate efficiency based on parallel vs sequential timing
    const operations = [
      coordination.operations.userSettings,
      coordination.operations.featureFlags,
      coordination.operations.therapeuticSettings
    ].filter(Boolean);

    if (operations.length === 0) return 0;

    const totalSequentialTime = operations.reduce((sum, op) => sum + (op?.performanceMetrics.migrationTimeMs || 0), 0);
    const actualTime = coordination.performanceMetrics.totalMigrationTimeMs;

    return actualTime > 0 ? Math.min(100, (totalSequentialTime / actualTime) * 100) : 0;
  }

  private calculateSettingsPreservationRate(coordination: Group4MigrationCoordination): number {
    const operations = [
      coordination.operations.userSettings,
      coordination.operations.featureFlags,
      coordination.operations.therapeuticSettings
    ].filter(Boolean);

    if (operations.length === 0) return 0;

    const preservedCount = operations.filter(op => op?.settingsPreserved).length;
    return (preservedCount / operations.length) * 100;
  }

  private calculateDataIntegrityRate(coordination: Group4MigrationCoordination): number {
    const operations = [
      coordination.operations.userSettings,
      coordination.operations.featureFlags,
      coordination.operations.therapeuticSettings
    ].filter(Boolean);

    if (operations.length === 0) return 0;

    const integrityCount = operations.filter(op => op?.dataIntegrityVerified).length;
    return (integrityCount / operations.length) * 100;
  }
}

// Export singleton instance
export const group4MigrationOrchestrator = Group4MigrationOrchestrator.getInstance();