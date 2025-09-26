/**
 * Group 4 Migration Exports - Settings/Preferences Stores
 * 
 * Phase 5C: Parallel Store Migration - Group 4
 * MISSION: Migrate settings/preferences stores to Clinical Pattern
 * 
 * Group 4: Settings/Preferences Stores
 * - Settings stores - App configuration and user preferences
 * - Notification preferences
 * - Therapeutic customization settings
 * Risk Level: LOW-MODERATE
 */

// Core migration classes and functions
export {
  settingsClinicalPatternMigration,
  SettingsClinicalPatternMigration,
  type ClinicalSettingsStore,
  type SettingsMigrationOperation
} from './settings-clinical-pattern';

export {
  group4MigrationOrchestrator,
  Group4MigrationOrchestrator,
  type Group4MigrationCoordination
} from './group-4-migration-orchestrator';

// Testing and validation
export {
  Group4TestDataFactory,
  Group4MigrationTestSuite,
  runGroup4MigrationTests
} from './group-4-migration-test';

// Quick migration runner for Group 4
export const executeGroup4SettingsMigration = async (
  userStore: any,
  featureFlagStore: any,
  therapeuticSessionStore: any,
  options?: {
    waitForOtherGroups?: boolean;
    parallelExecution?: boolean;
    safetyChecksEnabled?: boolean;
    testMode?: boolean;
  }
) => {
  const stores = {
    userStore,
    featureFlagStore,
    therapeuticSessionStore
  };

  // Run tests first if in test mode
  if (options?.testMode) {
    console.log('Running Group 4 migration in test mode');
    const testResults = await runGroup4MigrationTests();
    
    if (!testResults.success) {
      console.error('Group 4 migration tests failed:', testResults.summary);
      return {
        success: false,
        error: 'Pre-migration tests failed',
        testResults
      };
    }
    
    console.log('Group 4 migration tests passed:', testResults.summary);
  }

  // Execute the actual migration
  try {
    const coordination = await group4MigrationOrchestrator.executeGroup4Migration(stores, options);
    
    return {
      success: coordination.status === 'completed',
      coordination,
      consolidatedSettingsStore: coordination.results.consolidatedSettingsStore
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Group 4 migration failed:', errorMessage);
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

// Migration status checker
export const checkGroup4MigrationStatus = async (): Promise<{
  isReady: boolean;
  requirements: {
    userStoreAvailable: boolean;
    featureFlagsStoreAvailable: boolean;
    therapeuticStoreAvailable: boolean;
    clinicalPatternReady: boolean;
    migrationSystemReady: boolean;
  };
  blockers: string[];
}> => {
  const requirements = {
    userStoreAvailable: true, // Would check actual store availability
    featureFlagsStoreAvailable: true, // Would check actual store availability
    therapeuticStoreAvailable: true, // Would check actual store availability
    clinicalPatternReady: true,
    migrationSystemReady: true
  };

  const blockers: string[] = [];
  
  // Check for any blockers
  if (!requirements.userStoreAvailable) {
    blockers.push('User store not available');
  }
  
  if (!requirements.featureFlagsStoreAvailable) {
    blockers.push('Feature flags store not available');
  }
  
  if (!requirements.therapeuticStoreAvailable) {
    blockers.push('Therapeutic store not available');
  }

  const isReady = blockers.length === 0;

  return {
    isReady,
    requirements,
    blockers
  };
};

// Group 4 migration summary
export const GROUP_4_MIGRATION_SUMMARY = {
  groupId: 'group_4',
  name: 'Settings/Preferences Stores',
  description: 'Migrate user preferences, notification settings, and therapeutic customization to Clinical Pattern',
  riskLevel: 'LOW-MODERATE',
  priority: 4,
  stores: [
    {
      name: 'userStore',
      type: 'user_settings',
      description: 'User profile and authentication preferences'
    },
    {
      name: 'featureFlagStore', 
      type: 'feature_flags',
      description: 'App configuration, notification preferences, and feature toggles'
    },
    {
      name: 'therapeuticSessionStore',
      type: 'therapeutic_settings',
      description: 'Therapeutic session customization settings'
    }
  ],
  requirements: [
    'User preferences preserved',
    'App settings maintained',
    'Notification configurations intact',
    'Performance maintained'
  ],
  safetyLocks: [
    'Coordinate with other state agents',
    'Lower priority than Groups 2 & 3',
    'Clinical safety guards always active',
    'Emergency notifications always enabled'
  ]
} as const;