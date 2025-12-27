/**
 * MAINT-123: Automated Data Retention Cleanup Service
 *
 * Enforces the 90-day data retention policy promised in the privacy policy.
 * Runs cleanup on app launch and provides user deletion request handling.
 *
 * REGULATORY CONTEXT (Non-Privacy Covered Entity):
 * - FTC Act Section 5: Unfair/deceptive practices (must match privacy policy promises)
 * - FTC Health Breach Notification Rule: Notify users of unauthorized disclosures
 * - GDPR: Right to erasure, data minimization
 * - CCPA/CPRA: Right to delete, purpose limitation
 * - VCDPA/CPA/CTDPA: Similar deletion rights
 * - NY SHIELD Act: Security requirements
 * - Texas Data Privacy Act: Deletion rights
 *
 * DATA CLASSIFICATION:
 * - Check-in completions: 90-day auto-delete
 * - Principle engagements: 90-day auto-delete
 * - Assessment history: 90-day auto-delete
 * - Practice progress: User-controlled (delete on request)
 * - Consent records: Indefinite (audit trail)
 *
 * NON-NEGOTIABLES:
 * - Privacy policy: 90-day retention for check-in/assessment data
 * - User rights: Immediate deletion on request (no retention exception)
 * - Audit trail: Log all deletion events for legal defense
 * - Secure deletion: Use SecureStore deletion (OS-level secure wipe)
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logSecurity, logError, LogCategory } from '@/core/services/logging';

// ──────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Data retention configuration
 * All periods are in milliseconds
 */
export const DATA_RETENTION_CONFIG = {
  // Privacy policy commitment: 90 days
  DEFAULT_RETENTION_DAYS: 90,
  DEFAULT_RETENTION_MS: 90 * 24 * 60 * 60 * 1000,

  // Audit log retention (for legal defense)
  AUDIT_LOG_RETENTION_DAYS: 365,
  AUDIT_LOG_RETENTION_MS: 365 * 24 * 60 * 60 * 1000,

  // Cleanup frequency (run on app launch, max once per day)
  MIN_CLEANUP_INTERVAL_MS: 24 * 60 * 60 * 1000,

  // Storage keys
  LAST_CLEANUP_KEY: 'data_retention_last_cleanup',
  DELETION_AUDIT_KEY: 'data_retention_audit_log',
} as const;

// ──────────────────────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Data category for retention management
 */
export type DataCategory =
  | 'check_in_completions'
  | 'principle_engagements'
  | 'assessment_history'
  | 'practice_progress'
  | 'consent_records';

/**
 * Deletion reason for audit trail
 */
export type DeletionReason =
  | 'retention_expiry'      // Automatic 90-day cleanup
  | 'user_request'          // User explicitly requested deletion
  | 'account_deletion'      // User deleted their account
  | 'data_export_cleanup';  // Cleanup after data export

/**
 * Audit log entry for deletion events
 */
export interface DeletionAuditEntry {
  id: string;
  timestamp: number;
  dataCategory: DataCategory;
  recordCount: number;
  deletionReason: DeletionReason;
  oldestRecordDate: number | null;
  newestRecordDate: number | null;
  success: boolean;
  errorMessage?: string;
}

/**
 * Cleanup result from a retention run
 */
export interface CleanupResult {
  success: boolean;
  categoriesProcessed: DataCategory[];
  totalRecordsDeleted: number;
  errors: string[];
  durationMs: number;
  auditEntries: DeletionAuditEntry[];
}

/**
 * User deletion request result
 */
export interface UserDeletionResult {
  success: boolean;
  categoriesDeleted: DataCategory[];
  recordsDeleted: number;
  errors: string[];
  auditEntry: DeletionAuditEntry | null;
}

// ──────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Generate unique ID for audit entries
 */
const generateAuditId = (): string => {
  return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get cutoff date for 90-day retention
 */
const getRetentionCutoffDate = (): Date => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - DATA_RETENTION_CONFIG.DEFAULT_RETENTION_DAYS);
  return cutoff;
};

/**
 * Get cutoff timestamp for 90-day retention
 */
const getRetentionCutoffMs = (): number => {
  return Date.now() - DATA_RETENTION_CONFIG.DEFAULT_RETENTION_MS;
};

// ──────────────────────────────────────────────────────────────────────────────
// DATA RETENTION SERVICE
// ──────────────────────────────────────────────────────────────────────────────

/**
 * DataRetentionService - Singleton service for automated data cleanup
 *
 * Usage:
 * ```typescript
 * // On app launch (in App.tsx or similar)
 * await DataRetentionService.getInstance().runRetentionCleanup();
 *
 * // On user deletion request (in settings)
 * await DataRetentionService.getInstance().handleUserDeletionRequest(['assessment_history']);
 * ```
 */
class DataRetentionServiceImpl {
  private static instance: DataRetentionServiceImpl;
  private isCleanupRunning = false;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): DataRetentionServiceImpl {
    if (!DataRetentionServiceImpl.instance) {
      DataRetentionServiceImpl.instance = new DataRetentionServiceImpl();
    }
    return DataRetentionServiceImpl.instance;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Run automated retention cleanup on app launch
   *
   * This method:
   * 1. Checks if cleanup is needed (max once per day)
   * 2. Cleans up check-in completions older than 90 days
   * 3. Cleans up principle engagements older than 90 days
   * 4. Cleans up assessment history older than 90 days
   * 5. Logs audit entries for all deletions
   *
   * Safe to call on every app launch - will skip if recently run.
   */
  async runRetentionCleanup(): Promise<CleanupResult> {
    const startTime = Date.now();

    // Prevent concurrent cleanup runs
    if (this.isCleanupRunning) {
      return {
        success: true,
        categoriesProcessed: [],
        totalRecordsDeleted: 0,
        errors: ['Cleanup already in progress'],
        durationMs: 0,
        auditEntries: [],
      };
    }

    // Check if cleanup is needed (max once per day)
    const shouldRun = await this.shouldRunCleanup();
    if (!shouldRun) {
      return {
        success: true,
        categoriesProcessed: [],
        totalRecordsDeleted: 0,
        errors: [],
        durationMs: Date.now() - startTime,
        auditEntries: [],
      };
    }

    this.isCleanupRunning = true;
    const errors: string[] = [];
    const auditEntries: DeletionAuditEntry[] = [];
    let totalDeleted = 0;
    const categoriesProcessed: DataCategory[] = [];

    try {
      // 1. Clean up stoicPracticeStore data (check-ins, engagements)
      const practiceResult = await this.cleanupStoicPracticeData();
      if (practiceResult.success) {
        totalDeleted += practiceResult.recordsDeleted;
        categoriesProcessed.push('check_in_completions', 'principle_engagements');
        auditEntries.push(...practiceResult.auditEntries);
      } else if (practiceResult.error) {
        errors.push(practiceResult.error);
      }

      // 2. Clean up assessment history
      const assessmentResult = await this.cleanupAssessmentData();
      if (assessmentResult.success) {
        totalDeleted += assessmentResult.recordsDeleted;
        categoriesProcessed.push('assessment_history');
        if (assessmentResult.auditEntry) {
          auditEntries.push(assessmentResult.auditEntry);
        }
      } else if (assessmentResult.error) {
        errors.push(assessmentResult.error);
      }

      // 3. Clean up old audit logs (keep 1 year)
      await this.cleanupOldAuditLogs();

      // Update last cleanup timestamp
      await AsyncStorage.setItem(
        DATA_RETENTION_CONFIG.LAST_CLEANUP_KEY,
        Date.now().toString()
      );

      // Log successful cleanup
      logSecurity('Data retention cleanup completed', 'low', {
        categoriesProcessed,
        totalDeleted,
        durationMs: Date.now() - startTime,
      });

      return {
        success: errors.length === 0,
        categoriesProcessed,
        totalRecordsDeleted: totalDeleted,
        errors,
        durationMs: Date.now() - startTime,
        auditEntries,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logError(
        LogCategory.SYSTEM,
        'Data retention cleanup failed:',
        error instanceof Error ? error : new Error(errorMessage)
      );

      return {
        success: false,
        categoriesProcessed,
        totalRecordsDeleted: totalDeleted,
        errors: [...errors, errorMessage],
        durationMs: Date.now() - startTime,
        auditEntries,
      };
    } finally {
      this.isCleanupRunning = false;
    }
  }

  /**
   * Handle user deletion request
   *
   * Immediately deletes specified data categories.
   * Used when user explicitly requests data deletion in settings.
   *
   * @param categories - Data categories to delete
   * @returns Result of deletion operation
   */
  async handleUserDeletionRequest(
    categories: DataCategory[]
  ): Promise<UserDeletionResult> {
    const errors: string[] = [];
    const categoriesDeleted: DataCategory[] = [];
    let recordsDeleted = 0;

    try {
      for (const category of categories) {
        try {
          const result = await this.deleteDataCategory(category, 'user_request');
          if (result.success) {
            categoriesDeleted.push(category);
            recordsDeleted += result.recordsDeleted;
          } else if (result.error) {
            errors.push(`${category}: ${result.error}`);
          }
        } catch (error) {
          errors.push(`${category}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Create audit entry for user deletion request
      const auditEntry: DeletionAuditEntry = {
        id: generateAuditId(),
        timestamp: Date.now(),
        dataCategory: categories[0] || 'check_in_completions',
        recordCount: recordsDeleted,
        deletionReason: 'user_request',
        oldestRecordDate: null,
        newestRecordDate: null,
        success: errors.length === 0,
        ...(errors.length > 0 && { errorMessage: errors.join('; ') }),
      };

      await this.saveAuditEntry(auditEntry);

      logSecurity('User deletion request processed', 'medium', {
        categoriesDeleted,
        recordsDeleted,
        hasErrors: errors.length > 0,
      });

      return {
        success: errors.length === 0,
        categoriesDeleted,
        recordsDeleted,
        errors,
        auditEntry,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logError(
        LogCategory.SYSTEM,
        'User deletion request failed:',
        error instanceof Error ? error : new Error(errorMessage)
      );

      return {
        success: false,
        categoriesDeleted,
        recordsDeleted,
        errors: [...errors, errorMessage],
        auditEntry: null,
      };
    }
  }

  /**
   * Delete all user data (account deletion)
   *
   * Used when user deletes their account.
   * Deletes everything except consent audit trail.
   */
  async handleAccountDeletion(): Promise<UserDeletionResult> {
    const allCategories: DataCategory[] = [
      'check_in_completions',
      'principle_engagements',
      'assessment_history',
      'practice_progress',
    ];

    const result = await this.handleUserDeletionRequest(allCategories);

    if (result.auditEntry) {
      result.auditEntry.deletionReason = 'account_deletion';
      await this.saveAuditEntry(result.auditEntry);
    }

    return result;
  }

  /**
   * Get deletion audit history
   *
   * Returns audit log entries for compliance reporting.
   */
  async getAuditHistory(): Promise<DeletionAuditEntry[]> {
    try {
      const auditData = await AsyncStorage.getItem(DATA_RETENTION_CONFIG.DELETION_AUDIT_KEY);
      return auditData ? JSON.parse(auditData) : [];
    } catch (error) {
      logError(
        LogCategory.SYSTEM,
        'Failed to load audit history:',
        error instanceof Error ? error : new Error(String(error))
      );
      return [];
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // PRIVATE METHODS
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Check if cleanup should run (max once per day)
   */
  private async shouldRunCleanup(): Promise<boolean> {
    try {
      const lastCleanup = await AsyncStorage.getItem(DATA_RETENTION_CONFIG.LAST_CLEANUP_KEY);
      if (!lastCleanup) return true;

      const lastCleanupTime = parseInt(lastCleanup, 10);
      const timeSinceLastCleanup = Date.now() - lastCleanupTime;

      return timeSinceLastCleanup >= DATA_RETENTION_CONFIG.MIN_CLEANUP_INTERVAL_MS;
    } catch {
      return true; // Run cleanup if we can't check
    }
  }

  /**
   * Clean up stoic practice data (check-ins, principle engagements)
   */
  private async cleanupStoicPracticeData(): Promise<{
    success: boolean;
    recordsDeleted: number;
    auditEntries: DeletionAuditEntry[];
    error?: string;
  }> {
    const auditEntries: DeletionAuditEntry[] = [];

    try {
      const SECURE_STORE_KEY = 'stoic_practice_state';
      const storedData = await SecureStore.getItemAsync(SECURE_STORE_KEY);

      if (!storedData) {
        return { success: true, recordsDeleted: 0, auditEntries };
      }

      const parsed = JSON.parse(storedData);
      const cutoffDate = getRetentionCutoffDate();
      const cutoffString = cutoffDate.toISOString().split('T')[0];

      // Clean check-in completions
      const originalCheckIns = parsed.checkInCompletions?.length || 0;
      const filteredCheckIns = (parsed.checkInCompletions || []).filter(
        (c: { date: string }) => cutoffString && c.date >= cutoffString
      );
      const checkInsDeleted = originalCheckIns - filteredCheckIns.length;

      // Clean principle engagements
      const originalEngagements = parsed.principleEngagements?.length || 0;
      const filteredEngagements = (parsed.principleEngagements || []).filter(
        (pe: { date: string }) => cutoffString && pe.date >= cutoffString
      );
      const engagementsDeleted = originalEngagements - filteredEngagements.length;

      // Update storage if any records were deleted
      const totalDeleted = checkInsDeleted + engagementsDeleted;

      if (totalDeleted > 0) {
        parsed.checkInCompletions = filteredCheckIns;
        parsed.principleEngagements = filteredEngagements;
        await SecureStore.setItemAsync(SECURE_STORE_KEY, JSON.stringify(parsed));

        // Create audit entries
        if (checkInsDeleted > 0) {
          auditEntries.push({
            id: generateAuditId(),
            timestamp: Date.now(),
            dataCategory: 'check_in_completions',
            recordCount: checkInsDeleted,
            deletionReason: 'retention_expiry',
            oldestRecordDate: null,
            newestRecordDate: cutoffDate.getTime(),
            success: true,
          });
        }

        if (engagementsDeleted > 0) {
          auditEntries.push({
            id: generateAuditId(),
            timestamp: Date.now(),
            dataCategory: 'principle_engagements',
            recordCount: engagementsDeleted,
            deletionReason: 'retention_expiry',
            oldestRecordDate: null,
            newestRecordDate: cutoffDate.getTime(),
            success: true,
          });
        }

        // Save audit entries
        for (const entry of auditEntries) {
          await this.saveAuditEntry(entry);
        }
      }

      return { success: true, recordsDeleted: totalDeleted, auditEntries };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        recordsDeleted: 0,
        auditEntries,
        error: `Stoic practice cleanup failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Clean up assessment history data
   */
  private async cleanupAssessmentData(): Promise<{
    success: boolean;
    recordsDeleted: number;
    auditEntry: DeletionAuditEntry | null;
    error?: string;
  }> {
    try {
      const STORAGE_KEY = 'assessment_store_encrypted';
      const storedData = await SecureStore.getItemAsync(STORAGE_KEY);

      if (!storedData) {
        return { success: true, recordsDeleted: 0, auditEntry: null };
      }

      const parsed = JSON.parse(storedData);
      const cutoffMs = getRetentionCutoffMs();

      // Clean completed assessments older than 90 days
      const originalCount = parsed.completedAssessments?.length || 0;
      const filteredAssessments = (parsed.completedAssessments || []).filter(
        (assessment: { progress?: { startedAt?: number } }) => {
          const startedAt = assessment.progress?.startedAt;
          return startedAt && startedAt >= cutoffMs;
        }
      );
      const recordsDeleted = originalCount - filteredAssessments.length;

      if (recordsDeleted > 0) {
        parsed.completedAssessments = filteredAssessments;
        await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(parsed));

        const auditEntry: DeletionAuditEntry = {
          id: generateAuditId(),
          timestamp: Date.now(),
          dataCategory: 'assessment_history',
          recordCount: recordsDeleted,
          deletionReason: 'retention_expiry',
          oldestRecordDate: null,
          newestRecordDate: cutoffMs,
          success: true,
        };

        await this.saveAuditEntry(auditEntry);

        return { success: true, recordsDeleted, auditEntry };
      }

      return { success: true, recordsDeleted: 0, auditEntry: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        recordsDeleted: 0,
        auditEntry: null,
        error: `Assessment cleanup failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Delete a specific data category (for user requests)
   */
  private async deleteDataCategory(
    category: DataCategory,
    reason: DeletionReason
  ): Promise<{ success: boolean; recordsDeleted: number; error?: string }> {
    try {
      switch (category) {
        case 'check_in_completions':
        case 'principle_engagements': {
          const SECURE_STORE_KEY = 'stoic_practice_state';
          const storedData = await SecureStore.getItemAsync(SECURE_STORE_KEY);
          if (!storedData) return { success: true, recordsDeleted: 0 };

          const parsed = JSON.parse(storedData);
          const field = category === 'check_in_completions' ? 'checkInCompletions' : 'principleEngagements';
          const recordsDeleted = parsed[field]?.length || 0;
          parsed[field] = [];
          await SecureStore.setItemAsync(SECURE_STORE_KEY, JSON.stringify(parsed));

          return { success: true, recordsDeleted };
        }

        case 'assessment_history': {
          const STORAGE_KEY = 'assessment_store_encrypted';
          const storedData = await SecureStore.getItemAsync(STORAGE_KEY);
          if (!storedData) return { success: true, recordsDeleted: 0 };

          const parsed = JSON.parse(storedData);
          const recordsDeleted = parsed.completedAssessments?.length || 0;
          parsed.completedAssessments = [];
          await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(parsed));

          return { success: true, recordsDeleted };
        }

        case 'practice_progress': {
          // Reset practice progress in stoicPracticeStore
          const SECURE_STORE_KEY = 'stoic_practice_state';
          const storedData = await SecureStore.getItemAsync(SECURE_STORE_KEY);
          if (!storedData) return { success: true, recordsDeleted: 0 };

          const parsed = JSON.parse(storedData);
          const recordsDeleted =
            (parsed.virtueInstances?.length || 0) + (parsed.virtueChallenges?.length || 0);

          parsed.virtueInstances = [];
          parsed.virtueChallenges = [];
          parsed.totalPracticeDays = 0;
          parsed.currentStreak = 0;
          parsed.longestStreak = 0;
          parsed.practiceStartDate = null;

          await SecureStore.setItemAsync(SECURE_STORE_KEY, JSON.stringify(parsed));

          return { success: true, recordsDeleted };
        }

        case 'consent_records':
          // Consent records are kept for audit trail
          return {
            success: false,
            recordsDeleted: 0,
            error: 'Consent records cannot be deleted (required for audit trail)',
          };

        default:
          return { success: false, recordsDeleted: 0, error: `Unknown category: ${category}` };
      }
    } catch (error) {
      return {
        success: false,
        recordsDeleted: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Save audit entry to AsyncStorage
   */
  private async saveAuditEntry(entry: DeletionAuditEntry): Promise<void> {
    try {
      const existingData = await AsyncStorage.getItem(DATA_RETENTION_CONFIG.DELETION_AUDIT_KEY);
      const auditLog: DeletionAuditEntry[] = existingData ? JSON.parse(existingData) : [];

      auditLog.push(entry);

      // Keep only last 1000 entries
      if (auditLog.length > 1000) {
        auditLog.splice(0, auditLog.length - 1000);
      }

      await AsyncStorage.setItem(
        DATA_RETENTION_CONFIG.DELETION_AUDIT_KEY,
        JSON.stringify(auditLog)
      );
    } catch (error) {
      logError(
        LogCategory.SYSTEM,
        'Failed to save audit entry:',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Clean up old audit logs (keep 1 year)
   */
  private async cleanupOldAuditLogs(): Promise<void> {
    try {
      const existingData = await AsyncStorage.getItem(DATA_RETENTION_CONFIG.DELETION_AUDIT_KEY);
      if (!existingData) return;

      const auditLog: DeletionAuditEntry[] = JSON.parse(existingData);
      const cutoffMs = Date.now() - DATA_RETENTION_CONFIG.AUDIT_LOG_RETENTION_MS;

      const filteredLog = auditLog.filter((entry) => entry.timestamp >= cutoffMs);

      if (filteredLog.length < auditLog.length) {
        await AsyncStorage.setItem(
          DATA_RETENTION_CONFIG.DELETION_AUDIT_KEY,
          JSON.stringify(filteredLog)
        );
      }
    } catch (error) {
      logError(
        LogCategory.SYSTEM,
        'Failed to cleanup audit logs:',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
}

// Export singleton instance
export const DataRetentionService = DataRetentionServiceImpl.getInstance();

// Export types for external use
export type { DataRetentionServiceImpl };
