/**
 * Data Retention Service Module
 *
 * Provides automated data cleanup to enforce the 90-day retention
 * policy promised in the privacy policy.
 *
 * Usage:
 * ```typescript
 * import { DataRetentionService } from '@/core/services/data-retention';
 *
 * // Run on app launch (safe to call multiple times - max once per day)
 * await DataRetentionService.runRetentionCleanup();
 *
 * // Handle user deletion request
 * await DataRetentionService.handleUserDeletionRequest(['assessment_history']);
 *
 * // Handle account deletion
 * await DataRetentionService.handleAccountDeletion();
 * ```
 */

export {
  DataRetentionService,
  DATA_RETENTION_CONFIG,
  type DataCategory,
  type DeletionReason,
  type DeletionAuditEntry,
  type CleanupResult,
  type UserDeletionResult,
} from './DataRetentionService';
