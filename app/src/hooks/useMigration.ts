/**
 * Migration Hook for Being. MBCT App
 *
 * Provides React interface for monitoring and controlling storage migrations.
 * Includes real-time progress tracking, error handling, and user-friendly status updates.
 *
 * SAFETY FEATURES:
 * - Real-time progress monitoring
 * - Critical data status tracking
 * - Emergency rollback capabilities
 * - User-friendly error messages
 * - Automatic retry logic
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { migrationOrchestrator, CompleteMigrationProgress, CompleteMigrationResult, MigrationStatus } from '../services/storage/MigrationOrchestrator';

export interface MigrationHookState {
  // Status
  isRequired: boolean;
  isInProgress: boolean;
  isComplete: boolean;
  hasError: boolean;

  // Progress
  progress: CompleteMigrationProgress | null;
  result: CompleteMigrationResult | null;
  status: MigrationStatus | null;

  // User-friendly messages
  currentStage: string;
  statusMessage: string;
  estimatedTimeRemaining: string;

  // Safety indicators
  criticalDataStatus: {
    assessmentsSecure: boolean;
    crisisDataSecure: boolean;
    userDataSecure: boolean;
    overallSecure: boolean;
  };

  // Error handling
  errors: string[];
  warnings: string[];
  canRetry: boolean;
  canRollback: boolean;
}

export interface MigrationHookActions {
  // Primary actions
  checkMigrationStatus: () => Promise<void>;
  startMigration: () => Promise<void>;
  retryMigration: () => Promise<void>;

  // Emergency actions
  emergencyRollback: () => Promise<void>;

  // Utility actions
  refreshStatus: () => Promise<void>;
  clearErrors: () => void;
  dismissWarnings: () => void;
}

export interface UseMigrationOptions {
  autoCheck?: boolean;
  autoMigrate?: boolean;
  pollInterval?: number;
  retryAttempts?: number;
  showDetailedProgress?: boolean;
}

export interface UseMigrationReturn {
  state: MigrationHookState;
  actions: MigrationHookActions;
}

/**
 * React hook for managing storage migrations
 */
export function useMigration(options: UseMigrationOptions = {}): UseMigrationReturn {
  const {
    autoCheck = true,
    autoMigrate = false,
    pollInterval = 2000,
    retryAttempts = 3,
    showDetailedProgress = false
  } = options;

  // State
  const [state, setState] = useState<MigrationHookState>({
    isRequired: false,
    isInProgress: false,
    isComplete: false,
    hasError: false,
    progress: null,
    result: null,
    status: null,
    currentStage: 'Checking migration status...',
    statusMessage: 'Initializing migration check',
    estimatedTimeRemaining: '',
    criticalDataStatus: {
      assessmentsSecure: false,
      crisisDataSecure: false,
      userDataSecure: false,
      overallSecure: false
    },
    errors: [],
    warnings: [],
    canRetry: false,
    canRollback: false
  });

  // Refs for cleanup and retry logic
  const retryCountRef = useRef(0);
  const pollIntervalRef = useRef<NodeJS.Timeout>();
  const isActiveRef = useRef(true);

  /**
   * Update state safely (only if component is still mounted)
   */
  const safeSetState = useCallback((updater: (prev: MigrationHookState) => MigrationHookState) => {
    if (isActiveRef.current) {
      setState(updater);
    }
  }, []);

  /**
   * Format time remaining in user-friendly format
   */
  const formatTimeRemaining = useCallback((milliseconds: number): string => {
    if (milliseconds <= 0) return '';

    const minutes = Math.ceil(milliseconds / 60000);
    if (minutes < 1) return 'Less than a minute remaining';
    if (minutes === 1) return '1 minute remaining';
    return `${minutes} minutes remaining`;
  }, []);

  /**
   * Get user-friendly stage description
   */
  const getStageDescription = useCallback((stage: CompleteMigrationProgress['stage']): string => {
    switch (stage) {
      case 'assessment':
        return 'Analyzing your data';
      case 'storage_keys':
        return 'Updating storage keys';
      case 'encryption':
        return 'Securing your data';
      case 'validation':
        return 'Verifying migration';
      case 'complete':
        return 'Migration complete';
      case 'error':
        return 'Migration failed';
      default:
        return 'Processing...';
    }
  }, []);

  /**
   * Get status message based on current state
   */
  const getStatusMessage = useCallback((progress: CompleteMigrationProgress | null, status: MigrationStatus | null): string => {
    if (progress) {
      const stage = getStageDescription(progress.stage);

      if (progress.stage === 'complete') {
        return 'Your data has been successfully migrated and secured';
      }

      if (progress.stage === 'error') {
        return 'Migration encountered an error and needs attention';
      }

      if (showDetailedProgress && progress.storageKeyProgress) {
        const { processedKeys, totalKeys } = progress.storageKeyProgress;
        return `${stage} (${processedKeys}/${totalKeys} items)`;
      }

      return `${stage} (${Math.round(progress.overallProgress)}% complete)`;
    }

    if (status) {
      if (!status.isRequired) {
        return 'Your data is already secure and up to date';
      }

      const criticalCount = status.criticalDataAtRisk.length;
      if (criticalCount > 0) {
        return `${criticalCount} critical data items need to be migrated for security`;
      }

      return 'Data migration recommended for enhanced security';
    }

    return 'Checking migration requirements...';
  }, [getStageDescription, showDetailedProgress]);

  /**
   * Check migration status
   */
  const checkMigrationStatus = useCallback(async () => {
    try {
      safeSetState(prev => ({
        ...prev,
        currentStage: 'Checking migration status...',
        hasError: false
      }));

      const status = await migrationOrchestrator.assessMigrationStatus();

      safeSetState(prev => ({
        ...prev,
        status,
        isRequired: status.isRequired,
        currentStage: status.isRequired ? 'Migration required' : 'No migration needed',
        statusMessage: getStatusMessage(null, status),
        warnings: status.safetyAssessment.recommendations,
        canRetry: !status.safetyAssessment.safe,
        canRollback: false // Will be set later if needed
      }));

      // Auto-migrate if enabled and safe
      if (autoMigrate && status.isRequired && status.safetyAssessment.safe) {
        await startMigration();
      }

    } catch (error) {
      safeSetState(prev => ({
        ...prev,
        hasError: true,
        errors: [`Failed to check migration status: ${error}`],
        canRetry: true
      }));
    }
  }, [autoMigrate, getStatusMessage, safeSetState]);

  /**
   * Start migration process
   */
  const startMigration = useCallback(async () => {
    try {
      safeSetState(prev => ({
        ...prev,
        isInProgress: true,
        hasError: false,
        errors: [],
        warnings: [],
        isComplete: false,
        canRetry: false
      }));

      const result = await migrationOrchestrator.performCompleteMigration((progress) => {
        safeSetState(prev => ({
          ...prev,
          progress,
          currentStage: getStageDescription(progress.stage),
          statusMessage: getStatusMessage(progress, null),
          estimatedTimeRemaining: formatTimeRemaining(progress.estimatedTimeRemaining),
          criticalDataStatus: {
            ...progress.criticalDataStatus,
            overallSecure: progress.criticalDataStatus.assessmentsSecure &&
                          progress.criticalDataStatus.crisisDataSecure &&
                          progress.criticalDataStatus.userDataSecure
          },
          warnings: progress.warnings,
          errors: progress.errors
        }));
      });

      safeSetState(prev => ({
        ...prev,
        result,
        isInProgress: false,
        isComplete: result.success,
        hasError: !result.success,
        errors: result.errors,
        warnings: result.warnings,
        canRetry: !result.success && retryCountRef.current < retryAttempts,
        canRollback: result.backupIds.length > 0,
        criticalDataStatus: {
          assessmentsSecure: result.success && result.criticalDataValidated,
          crisisDataSecure: result.success && result.criticalDataValidated,
          userDataSecure: result.success && result.criticalDataValidated,
          overallSecure: result.success && result.criticalDataValidated
        }
      }));

      if (result.success) {
        retryCountRef.current = 0;
        console.log('Migration completed successfully');
      } else {
        retryCountRef.current++;
        console.error('Migration failed:', result.errors);
      }

    } catch (error) {
      safeSetState(prev => ({
        ...prev,
        isInProgress: false,
        hasError: true,
        errors: [`Migration failed: ${error}`],
        canRetry: retryCountRef.current < retryAttempts
      }));

      retryCountRef.current++;
    }
  }, [getStageDescription, getStatusMessage, formatTimeRemaining, retryAttempts, safeSetState]);

  /**
   * Retry migration
   */
  const retryMigration = useCallback(async () => {
    if (retryCountRef.current >= retryAttempts) {
      safeSetState(prev => ({
        ...prev,
        errors: [...prev.errors, 'Maximum retry attempts reached'],
        canRetry: false
      }));
      return;
    }

    console.log(`Retrying migration (attempt ${retryCountRef.current + 1}/${retryAttempts})`);
    await startMigration();
  }, [retryAttempts, startMigration, safeSetState]);

  /**
   * Emergency rollback
   */
  const emergencyRollback = useCallback(async () => {
    try {
      safeSetState(prev => ({
        ...prev,
        currentStage: 'Emergency rollback in progress...',
        isInProgress: true,
        hasError: false,
        errors: [],
        warnings: ['Emergency rollback initiated - data will be restored to previous state']
      }));

      const rollbackResult = await migrationOrchestrator.performEmergencyRollback();

      safeSetState(prev => ({
        ...prev,
        isInProgress: false,
        currentStage: rollbackResult.success ? 'Rollback completed' : 'Rollback failed',
        statusMessage: rollbackResult.success
          ? `Rollback completed - ${rollbackResult.restoredItems} items restored`
          : 'Rollback failed - manual intervention may be required',
        hasError: !rollbackResult.success,
        errors: rollbackResult.errors,
        canRollback: false,
        canRetry: true,
        isRequired: rollbackResult.success, // Will need to migrate again
        isComplete: false
      }));

      if (rollbackResult.success) {
        console.log('Emergency rollback completed successfully');
        // Reset retry count after successful rollback
        retryCountRef.current = 0;
      }

    } catch (error) {
      safeSetState(prev => ({
        ...prev,
        isInProgress: false,
        hasError: true,
        errors: [`Emergency rollback failed: ${error}`],
        currentStage: 'Rollback failed'
      }));
    }
  }, [safeSetState]);

  /**
   * Refresh status
   */
  const refreshStatus = useCallback(async () => {
    await checkMigrationStatus();
  }, [checkMigrationStatus]);

  /**
   * Clear errors
   */
  const clearErrors = useCallback(() => {
    safeSetState(prev => ({
      ...prev,
      errors: [],
      hasError: false
    }));
  }, [safeSetState]);

  /**
   * Dismiss warnings
   */
  const dismissWarnings = useCallback(() => {
    safeSetState(prev => ({
      ...prev,
      warnings: []
    }));
  }, [safeSetState]);

  /**
   * Setup polling for progress updates
   */
  useEffect(() => {
    if (state.isInProgress && pollInterval > 0) {
      pollIntervalRef.current = setInterval(() => {
        // Polling is handled by the progress callback in startMigration
        // This interval just ensures we don't get stuck
        if (migrationOrchestrator.isMigrationInProgress()) {
          // Migration is still active, continue polling
          return;
        } else {
          // Migration seems to have stopped, refresh status
          refreshStatus();
        }
      }, pollInterval);

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
      };
    }
  }, [state.isInProgress, pollInterval, refreshStatus]);

  /**
   * Auto-check on mount
   */
  useEffect(() => {
    if (autoCheck) {
      checkMigrationStatus();
    }
  }, [autoCheck, checkMigrationStatus]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const actions: MigrationHookActions = {
    checkMigrationStatus,
    startMigration,
    retryMigration,
    emergencyRollback,
    refreshStatus,
    clearErrors,
    dismissWarnings
  };

  return { state, actions };
}

/**
 * Simplified hook for basic migration status checking
 */
export function useMigrationStatus(): {
  isRequired: boolean;
  isInProgress: boolean;
  isComplete: boolean;
  hasError: boolean;
  refresh: () => Promise<void>;
} {
  const { state, actions } = useMigration({
    autoCheck: true,
    autoMigrate: false,
    showDetailedProgress: false
  });

  return {
    isRequired: state.isRequired,
    isInProgress: state.isInProgress,
    isComplete: state.isComplete,
    hasError: state.hasError,
    refresh: actions.refreshStatus
  };
}

/**
 * Hook for automatic migration with minimal UI
 */
export function useAutoMigration(): {
  isComplete: boolean;
  hasError: boolean;
  errorMessage: string;
  progress: number;
} {
  const { state } = useMigration({
    autoCheck: true,
    autoMigrate: true,
    showDetailedProgress: false
  });

  return {
    isComplete: state.isComplete,
    hasError: state.hasError,
    errorMessage: state.errors.join('; '),
    progress: state.progress?.overallProgress || 0
  };
}