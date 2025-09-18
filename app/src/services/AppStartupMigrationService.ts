/**
 * App Startup Migration Service for Being. MBCT App
 *
 * Integrates storage key migration and encryption migration into the app startup flow.
 * Ensures seamless user experience while maintaining data safety and security.
 *
 * CRITICAL SAFETY FEATURES:
 * - Silent migration for non-critical data
 * - User consent for clinical data migration
 * - Automatic rollback on failure
 * - Crisis support always accessible
 * - Comprehensive error logging
 */

import { Alert } from 'react-native';
import { migrationOrchestrator, MigrationStatus } from './storage/MigrationOrchestrator';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StartupMigrationResult {
  migrationRequired: boolean;
  migrationCompleted: boolean;
  userInteractionRequired: boolean;
  errors: string[];
  warnings: string[];
  shouldProceedToApp: boolean;
  showMigrationScreen: boolean;
}

export interface StartupMigrationOptions {
  allowAutoMigration: boolean;
  requireUserConsent: boolean;
  showProgressToUser: boolean;
  skipNonCritical: boolean;
}

export class AppStartupMigrationService {
  private static instance: AppStartupMigrationService;
  private readonly STARTUP_MIGRATION_KEY = '@being_startup_migration_status';
  private readonly LAST_CHECK_KEY = '@being_last_migration_check';

  private constructor() {}

  public static getInstance(): AppStartupMigrationService {
    if (!AppStartupMigrationService.instance) {
      AppStartupMigrationService.instance = new AppStartupMigrationService();
    }
    return AppStartupMigrationService.instance;
  }

  /**
   * Main entry point for app startup migration check
   */
  async checkAndHandleStartupMigration(
    options: StartupMigrationOptions = {
      allowAutoMigration: true,
      requireUserConsent: false,
      showProgressToUser: false,
      skipNonCritical: false
    }
  ): Promise<StartupMigrationResult> {
    const result: StartupMigrationResult = {
      migrationRequired: false,
      migrationCompleted: false,
      userInteractionRequired: false,
      errors: [],
      warnings: [],
      shouldProceedToApp: true,
      showMigrationScreen: false
    };

    try {
      console.log('Checking startup migration requirements...');

      // Record this check
      await AsyncStorage.setItem(this.LAST_CHECK_KEY, new Date().toISOString());

      // Check if we've already completed startup migration
      const startupStatus = await this.getStartupMigrationStatus();
      if (startupStatus.completed && !startupStatus.hasErrors) {
        console.log('Startup migration already completed successfully');
        return result;
      }

      // Assess current migration needs
      const migrationStatus = await migrationOrchestrator.assessMigrationStatus();

      if (!migrationStatus.isRequired) {
        console.log('No migration required - app ready');
        await this.recordStartupMigrationComplete(true, []);
        return result;
      }

      result.migrationRequired = true;

      // Determine migration strategy based on data types and options
      const strategy = this.determineMigrationStrategy(migrationStatus, options);

      console.log('Migration strategy:', strategy);

      switch (strategy.type) {
        case 'auto_migrate':
          return await this.performAutoMigration(migrationStatus, options, result);

        case 'user_consent_required':
          return await this.requestUserConsent(migrationStatus, options, result);

        case 'show_migration_screen':
          result.showMigrationScreen = true;
          result.userInteractionRequired = true;
          result.shouldProceedToApp = false;
          return result;

        case 'skip_for_now':
          result.warnings.push('Migration skipped - data remains less secure');
          await this.recordStartupMigrationSkipped(strategy.reason);
          return result;

        default:
          throw new Error(`Unknown migration strategy: ${strategy.type}`);
      }

    } catch (error) {
      console.error('Startup migration check failed:', error);
      result.errors.push(`Migration check failed: ${error}`);
      result.shouldProceedToApp = false;
      result.showMigrationScreen = true;
      return result;
    }
  }

  /**
   * Determine the appropriate migration strategy
   */
  private determineMigrationStrategy(
    status: MigrationStatus,
    options: StartupMigrationOptions
  ): {
    type: 'auto_migrate' | 'user_consent_required' | 'show_migration_screen' | 'skip_for_now';
    reason: string;
  } {
    // Check for safety blockers
    if (!status.safetyAssessment.safe) {
      return {
        type: 'show_migration_screen',
        reason: 'Migration has safety concerns requiring user review'
      };
    }

    // Check for critical data
    const hasCriticalData = status.criticalDataAtRisk.length > 0;
    const hasClinicalData = status.criticalDataAtRisk.some(key =>
      key.includes('assessment') || key.includes('phq') || key.includes('gad') || key.includes('clinical')
    );
    const hasCrisisData = status.criticalDataAtRisk.some(key =>
      key.includes('crisis') || key.includes('emergency')
    );

    // Critical clinical or crisis data always requires attention
    if (hasClinicalData || hasCrisisData) {
      if (options.requireUserConsent) {
        return {
          type: 'user_consent_required',
          reason: 'Critical mental health data requires user consent for migration'
        };
      } else {
        return {
          type: 'auto_migrate',
          reason: 'Critical mental health data requires immediate secure migration'
        };
      }
    }

    // Non-critical data can be auto-migrated if allowed
    if (hasCriticalData && options.allowAutoMigration) {
      return {
        type: 'auto_migrate',
        reason: 'Personal data migration for enhanced security'
      };
    }

    // Large migrations or complex cases should show the migration screen
    if (status.estimatedDuration > 5 * 60 * 1000) { // 5 minutes
      return {
        type: 'show_migration_screen',
        reason: 'Large migration requires user awareness and progress monitoring'
      };
    }

    // Show migration screen for user control
    if (options.showProgressToUser) {
      return {
        type: 'show_migration_screen',
        reason: 'User requested to see migration progress'
      };
    }

    // Skip non-critical if requested
    if (options.skipNonCritical && !hasCriticalData) {
      return {
        type: 'skip_for_now',
        reason: 'Non-critical migration skipped per user preference'
      };
    }

    // Default to auto-migration for simple cases
    return {
      type: 'auto_migrate',
      reason: 'Simple migration can be performed automatically'
    };
  }

  /**
   * Perform automatic migration during startup
   */
  private async performAutoMigration(
    status: MigrationStatus,
    options: StartupMigrationOptions,
    result: StartupMigrationResult
  ): Promise<StartupMigrationResult> {
    try {
      console.log('Performing automatic migration during startup...');

      const migrationResult = await migrationOrchestrator.performCompleteMigration((progress) => {
        console.log(`Auto-migration: ${progress.stage} (${progress.overallProgress}%)`);

        // Log any critical errors immediately
        if (progress.errors.length > 0) {
          console.error('Migration errors:', progress.errors);
        }
      });

      result.migrationCompleted = migrationResult.success;
      result.errors = migrationResult.errors;
      result.warnings = migrationResult.warnings;

      if (migrationResult.success) {
        console.log('Automatic migration completed successfully');
        await this.recordStartupMigrationComplete(true, migrationResult.warnings);
      } else {
        console.error('Automatic migration failed:', migrationResult.errors);
        await this.recordStartupMigrationComplete(false, migrationResult.errors);

        // For failed auto-migration, show the migration screen for user intervention
        result.showMigrationScreen = true;
        result.userInteractionRequired = true;
        result.shouldProceedToApp = false;
      }

      return result;

    } catch (error) {
      console.error('Auto-migration failed:', error);
      result.errors.push(`Auto-migration failed: ${error}`);
      result.showMigrationScreen = true;
      result.userInteractionRequired = true;
      result.shouldProceedToApp = false;
      return result;
    }
  }

  /**
   * Request user consent for critical data migration
   */
  private async requestUserConsent(
    status: MigrationStatus,
    options: StartupMigrationOptions,
    result: StartupMigrationResult
  ): Promise<StartupMigrationResult> {
    return new Promise((resolve) => {
      const clinicalDataCount = status.criticalDataAtRisk.filter(key =>
        key.includes('assessment') || key.includes('clinical')
      ).length;

      const crisisDataCount = status.criticalDataAtRisk.filter(key =>
        key.includes('crisis') || key.includes('emergency')
      ).length;

      let message = 'Your mental health data needs to be migrated for enhanced security.\n\n';

      if (clinicalDataCount > 0) {
        message += `• ${clinicalDataCount} assessment records (PHQ-9/GAD-7)\n`;
      }

      if (crisisDataCount > 0) {
        message += `• ${crisisDataCount} safety and crisis support items\n`;
      }

      message += '\nThis process is safe and includes automatic backup.';

      Alert.alert(
        'Secure Your Data',
        message,
        [
          {
            text: 'Later',
            style: 'cancel',
            onPress: () => {
              result.warnings.push('User chose to postpone critical data migration');
              result.shouldProceedToApp = true;
              resolve(result);
            }
          },
          {
            text: 'Migrate Now',
            style: 'default',
            onPress: async () => {
              // Perform migration with user consent
              const migrationResult = await this.performAutoMigration(status, options, result);
              resolve(migrationResult);
            }
          }
        ],
        { cancelable: false }
      );
    });
  }

  /**
   * Get startup migration status
   */
  private async getStartupMigrationStatus(): Promise<{
    completed: boolean;
    timestamp: string | null;
    hasErrors: boolean;
    errors: string[];
  }> {
    try {
      const statusData = await AsyncStorage.getItem(this.STARTUP_MIGRATION_KEY);
      if (!statusData) {
        return {
          completed: false,
          timestamp: null,
          hasErrors: false,
          errors: []
        };
      }

      return JSON.parse(statusData);
    } catch (error) {
      console.error('Failed to get startup migration status:', error);
      return {
        completed: false,
        timestamp: null,
        hasErrors: true,
        errors: [`Status check failed: ${error}`]
      };
    }
  }

  /**
   * Record successful migration completion
   */
  private async recordStartupMigrationComplete(success: boolean, issues: string[]): Promise<void> {
    try {
      const status = {
        completed: success,
        timestamp: new Date().toISOString(),
        hasErrors: !success,
        errors: success ? [] : issues,
        warnings: success ? issues : []
      };

      await AsyncStorage.setItem(this.STARTUP_MIGRATION_KEY, JSON.stringify(status));
      console.log('Startup migration status recorded:', success ? 'SUCCESS' : 'FAILED');

    } catch (error) {
      console.error('Failed to record startup migration status:', error);
    }
  }

  /**
   * Record migration skipped
   */
  private async recordStartupMigrationSkipped(reason: string): Promise<void> {
    try {
      const status = {
        completed: false,
        skipped: true,
        reason,
        timestamp: new Date().toISOString(),
        hasErrors: false,
        errors: []
      };

      await AsyncStorage.setItem(this.STARTUP_MIGRATION_KEY, JSON.stringify(status));
      console.log('Startup migration skipped:', reason);

    } catch (error) {
      console.error('Failed to record migration skip:', error);
    }
  }

  /**
   * Reset startup migration status (for testing or manual retry)
   */
  async resetStartupMigrationStatus(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STARTUP_MIGRATION_KEY);
      await AsyncStorage.removeItem(this.LAST_CHECK_KEY);
      console.log('Startup migration status reset');
    } catch (error) {
      console.error('Failed to reset startup migration status:', error);
    }
  }

  /**
   * Check if enough time has passed for a migration recheck
   */
  async shouldRecheckMigration(intervalHours: number = 24): Promise<boolean> {
    try {
      const lastCheck = await AsyncStorage.getItem(this.LAST_CHECK_KEY);
      if (!lastCheck) return true;

      const lastCheckTime = new Date(lastCheck).getTime();
      const now = Date.now();
      const hoursSinceCheck = (now - lastCheckTime) / (1000 * 60 * 60);

      return hoursSinceCheck >= intervalHours;
    } catch (error) {
      console.error('Failed to check migration recheck interval:', error);
      return true; // Default to allowing recheck on error
    }
  }

  /**
   * Get migration status for UI display
   */
  async getMigrationStatusSummary(): Promise<{
    isRequired: boolean;
    hasBeenCompleted: boolean;
    lastCheckTime: string | null;
    criticalDataCount: number;
    estimatedDuration: string;
    safetyStatus: 'safe' | 'unsafe' | 'unknown';
  }> {
    try {
      const [startupStatus, migrationStatus, lastCheck] = await Promise.all([
        this.getStartupMigrationStatus(),
        migrationOrchestrator.assessMigrationStatus(),
        AsyncStorage.getItem(this.LAST_CHECK_KEY)
      ]);

      const estimatedMinutes = Math.ceil(migrationStatus.estimatedDuration / 60000);
      const estimatedDuration = estimatedMinutes < 1
        ? 'Less than 1 minute'
        : `About ${estimatedMinutes} minute${estimatedMinutes === 1 ? '' : 's'}`;

      return {
        isRequired: migrationStatus.isRequired,
        hasBeenCompleted: startupStatus.completed,
        lastCheckTime: lastCheck,
        criticalDataCount: migrationStatus.criticalDataAtRisk.length,
        estimatedDuration,
        safetyStatus: migrationStatus.safetyAssessment.safe
          ? 'safe'
          : (migrationStatus.safetyAssessment.blockers.length > 0 ? 'unsafe' : 'unknown')
      };

    } catch (error) {
      console.error('Failed to get migration status summary:', error);
      return {
        isRequired: false,
        hasBeenCompleted: false,
        lastCheckTime: null,
        criticalDataCount: 0,
        estimatedDuration: 'Unknown',
        safetyStatus: 'unknown'
      };
    }
  }
}

// Export singleton instance
export const appStartupMigrationService = AppStartupMigrationService.getInstance();