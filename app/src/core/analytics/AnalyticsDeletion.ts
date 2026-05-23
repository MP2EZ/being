/**
 * Analytics Data Deletion Workflow
 *
 * Implements GDPR Article 17 (Right to Erasure) and CCPA deletion requirements.
 *
 * Process:
 * 1. Log deletion request (audit trail for compliance)
 * 2. Reset PostHog identity (immediate unlinking)
 * 3. Provide user confirmation with regulatory-appropriate language
 *
 * Note: Full historical data deletion requires contacting privacy@being.app
 * PostHog API deletion is handled via their dashboard or support.
 *
 * @see docs/development/PostHog-Integration-Plan.md
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { logSecurity } from '@/core/services/logging';

/**
 * Deletion request types for regulatory categorization
 */
export type DeletionRequestType = 'gdpr' | 'ccpa' | 'user_request';

/**
 * Audit record for deletion requests
 * Kept locally for compliance audit trail
 */
interface DeletionRequestRecord {
  timestamp: number;
  type: DeletionRequestType;
  previousDistinctId: string;
  completed: boolean;
}

// Storage key for deletion request audit trail
const DELETION_REQUESTS_KEY = '@being/analytics_deletion_requests';

/**
 * Handle analytics data deletion request
 *
 * @param type - Type of deletion request (for regulatory categorization)
 * @param posthog - PostHog instance (optional, for testing)
 * @returns Promise resolving when deletion is processed
 */
export async function handleAnalyticsDeletion(
  type: DeletionRequestType = 'user_request',
  posthog?: { getDistinctId: () => string; reset: () => void }
): Promise<{ success: boolean; message: string }> {
  try {
    // Get previous distinct ID for audit trail (before reset)
    let previousDistinctId = 'unknown';

    if (posthog) {
      try {
        previousDistinctId = posthog.getDistinctId();
      } catch {
        // PostHog not initialized - continue with deletion
      }
    }

    // Create deletion request record for audit trail
    const deletionRecord: DeletionRequestRecord = {
      timestamp: Date.now(),
      type,
      previousDistinctId,
      completed: false,
    };

    // Store deletion request (audit trail for CCPA 45-day requirement)
    await storeDeletionRequest(deletionRecord);

    // Reset PostHog identity (immediate unlinking)
    if (posthog) {
      try {
        posthog.reset();
      } catch {
        // PostHog not initialized - continue
      }
    }

    // Mark deletion as completed
    deletionRecord.completed = true;
    await storeDeletionRequest(deletionRecord);

    // Log for security audit
    logSecurity(
      `Analytics deletion processed: type=${type}`,
      'low',
      { type, timestamp: deletionRecord.timestamp }
    );

    return {
      success: true,
      message: 'Analytics identity reset successfully',
    };
  } catch (error) {
    logSecurity(
      'Analytics deletion failed',
      'high',
      { type, error: error instanceof Error ? error.message : 'Unknown error' }
    );

    return {
      success: false,
      message: 'Failed to process deletion request',
    };
  }
}

/**
 * Show deletion confirmation alert with regulatory-appropriate language
 *
 * @param type - Type of deletion request
 */
export function showDeletionConfirmation(type: DeletionRequestType = 'user_request'): void {
  const title = 'Analytics Data Request Submitted';

  let message =
    'Your analytics identity has been reset and previous data is no longer linked to you.';

  if (type === 'gdpr' || type === 'ccpa') {
    message +=
      '\n\nFor complete deletion of historical data, contact privacy@being.app. ' +
      'We will process your request within 30 days (GDPR) or 45 days (CCPA).';
  } else {
    message +=
      '\n\nFor complete deletion of historical data, contact privacy@being.app.';
  }

  Alert.alert(title, message, [{ text: 'OK' }]);
}

/**
 * Store deletion request in audit trail
 */
async function storeDeletionRequest(record: DeletionRequestRecord): Promise<void> {
  try {
    // Get existing requests
    const existingJson = await AsyncStorage.getItem(DELETION_REQUESTS_KEY);
    const existing: DeletionRequestRecord[] = existingJson
      ? JSON.parse(existingJson)
      : [];

    // Add new request (or update if same timestamp)
    const index = existing.findIndex((r) => r.timestamp === record.timestamp);
    if (index >= 0) {
      existing[index] = record;
    } else {
      existing.push(record);
    }

    // Keep only last 100 requests (compliance audit trail)
    const trimmed = existing.slice(-100);

    await AsyncStorage.setItem(DELETION_REQUESTS_KEY, JSON.stringify(trimmed));
  } catch {
    // Storage failure shouldn't block deletion
  }
}

/**
 * Get deletion request history (for compliance audits)
 */
export async function getDeletionRequestHistory(): Promise<DeletionRequestRecord[]> {
  try {
    const json = await AsyncStorage.getItem(DELETION_REQUESTS_KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

/**
 * Check if there are pending deletion requests
 * (requests made but not yet confirmed by PostHog)
 */
export async function hasPendingDeletionRequests(): Promise<boolean> {
  const history = await getDeletionRequestHistory();
  return history.some((r) => !r.completed);
}
