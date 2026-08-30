/**
 * Analytics identity reset on account erasure (DEBUG-539).
 *
 * `deleteAccountAndWipe` erases the server account and sweeps local wellness
 * data, but nothing reset the PostHog analytics identity — so `.posthog-rn.json`
 * retained the pre-erasure `distinct_id`, and any batch already queued shipped
 * under it on the next flush. This module is the reset primitive that closes
 * that, and nothing more.
 *
 * WHAT THIS FILE DELIBERATELY NO LONGER DOES
 * ------------------------------------------
 * It used to maintain a local "deletion request" audit trail keyed by
 * `previousDistinctId`, persisted to `@being/analytics_deletion_requests`. That
 * key matches neither `SWEPT_EXACT_KEYS` nor `SWEPT_ASYNC_PREFIXES`, so it
 * SURVIVED erasure — meaning the audit trail retained the exact identifier the
 * erasure exists to destroy. It had zero production callers, so nothing was ever
 * written; wiring it up as documented would have introduced the leak. The record,
 * its storage key and its readers are gone. The reset primitive is kept.
 *
 * The erasure attestation lives in `consentStore.recordAccountDeletionAttestation`
 * and carries NO identifier — not a previous id, not a hash, not a reset-succeeded
 * flag. See DEBUG-545 for its durability across launches.
 *
 * WHY A MODULE-LEVEL REGISTRY AND NOT `usePostHog()`
 * -------------------------------------------------
 * This is the whole correctness argument, so it is written down rather than
 * inferred.
 *
 * Analytics is opt-in and default OFF, and `PostHogProvider` only renders
 * `<PHProvider>` while consent is granted. A user who consented, later revoked,
 * then deleted their account therefore has NO provider in the tree — `usePostHog()`
 * returns undefined — while a PostHog INSTANCE constructed during the consented
 * period is still alive: the library registers `AppState` listeners in its
 * constructor and never removes them, and its provider builds the client in a bare
 * `useMemo` with no `shutdown()` on unmount.
 *
 * That instance holds a `memoryCache`, and `persist()` re-serialises the WHOLE
 * cache on every write. So deleting the files under a live instance is a FAKE
 * CONTROL: the next `AppState` change writes the pre-erasure id straight back, and
 * a test asserting "the file is gone" passes while the identity survives. This is
 * the same shape `SecureStorageService` records for `storeMetadata` — sweeping the
 * key alone "reads as coverage and provides none".
 *
 * So the branch condition is NOT "is a client mounted" but "does an instance
 * EXIST". `registerAnalyticsClient` is called from inside the provider and the
 * reference is held at module scope, which deliberately OUTLIVES unmount:
 *
 *   instance exists  -> reset THROUGH it, so the write-back re-serialises empty
 *   never existed    -> unlink the files, because nothing can rewrite them
 *
 * Unlinking is never both. Doing both would race the live instance's next persist.
 */

import { Alert } from 'react-native';
import { File, Paths } from 'expo-file-system';
import { PostHogPersistedProperty } from 'posthog-react-native';
import { logSecurity } from '@/core/services/logging';

/**
 * Deletion request types for regulatory categorization.
 */
export type DeletionRequestType = 'gdpr' | 'ccpa' | 'user_request';

/**
 * The narrow surface `resetAnalyticsIdentity` needs.
 *
 * Structural rather than the concrete `PostHog` type so `AccountDeletionService`
 * — a pure privacy service — does not acquire a `posthog-react-native` import,
 * and so tests can pass a fake without constructing a real client.
 */
export interface AnalyticsIdentityResetTarget {
  reset: () => void;
  setPersistedProperty: (key: PostHogPersistedProperty, value: unknown | null) => void;
}

/**
 * PostHog RN's storage KEYS, which under the `expo-file-system` backend are
 * FILENAMES in the document directory — not AsyncStorage keys.
 *
 * Adding these to `SECURE_STORAGE_CONFIG.SWEPT_EXACT_KEYS` deletes NOTHING, and a
 * test asserting "no AsyncStorage key matches /posthog/i" passes today, before any
 * fix, and would pass forever. Both were verified and both are refused.
 *
 * `Queue` and `LogsQueue` route to DIFFERENT files, so nulling only the first
 * leaves the second intact.
 */
export const POSTHOG_RN_STORAGE_FILES = [
  '.posthog-rn.json',
  '.posthog-rn-logs.json',
] as const;

/**
 * Module-scope reference to the live PostHog instance, if one was ever built.
 *
 * Set by `PostHogProvider`. Deliberately NOT cleared on unmount: an unmounted
 * provider does not destroy the instance, and it is precisely the
 * consented-then-revoked-then-erased path that needs the reference after the
 * provider has stopped rendering.
 */
let registeredClient: AnalyticsIdentityResetTarget | null = null;

/** Record the live analytics client. Called from `PostHogProvider`. */
export function registerAnalyticsClient(client: AnalyticsIdentityResetTarget | null): void {
  if (client) registeredClient = client;
}

/** Test seam: forget the registered instance. Never called from production code. */
export function __resetRegisteredAnalyticsClientForTests(): void {
  registeredClient = null;
}

/**
 * Destroy the analytics identity and drop anything queued under it.
 *
 * Structurally non-throwing: every arm is individually guarded. The caller runs
 * this between a successful server erasure and the local wipe, and a failure here
 * must never abort that wipe.
 *
 * @param posthog The client the caller holds, or `null` when it has none. The
 *   parameter is REQUIRED and explicitly nullable so a future caller must decide
 *   rather than silently inheriting today's defect. A registered instance is used
 *   as a fallback when the caller passes null.
 */
export function resetAnalyticsIdentity({
  posthog,
}: {
  posthog: AnalyticsIdentityResetTarget | null;
}): void {
  const client = posthog ?? registeredClient;

  if (client) {
    try {
      // reset() clears DistinctId/AnonymousId/SessionId and mints a FRESH
      // anonymous id, so the file is neither empty nor absent afterwards. Assert
      // "the old id is gone and the queues are empty", never "the file is gone".
      client.reset();
      // reset() explicitly PRESERVES both queues — it prepends them to its
      // keep-list — so they must be nulled separately, and AFTER the reset so
      // anything re-enqueued in the same tick goes too. Nulling routes through
      // `removeItem` -> `persist()`, which re-serialises the cache empty.
      //
      // Do NOT call flush() to drain them: that TRANSMITS the pre-erasure batch,
      // which is strictly worse than the defect being fixed.
      client.setPersistedProperty(PostHogPersistedProperty.Queue, null);
      client.setPersistedProperty(PostHogPersistedProperty.LogsQueue, null);
    } catch (error) {
      logSecurity('[AnalyticsIdentity] reset through the live client failed', 'high', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    // Deliberately no unlink here. The live instance's next persist would write
    // the file straight back from its in-memory cache.
    return;
  }

  // No instance was ever built — the never-consented and consented-then-revoked
  // paths. Nothing can rewrite the files, so removing them is sound and is the
  // only arm that reaches residue left by a previously-consented session.
  for (const name of POSTHOG_RN_STORAGE_FILES) {
    try {
      const file = new File(Paths.document, name);
      // `delete()` throws when the target is absent, and a never-consented user
      // has no such file — so the guard is required, not defensive.
      if (file.exists) file.delete();
    } catch (error) {
      logSecurity('[AnalyticsIdentity] could not remove PostHog storage file', 'high', {
        file: name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

/**
 * Reset the analytics identity on explicit user request.
 *
 * Retained as the public name it has always had, now free of the audit trail that
 * carried `previousDistinctId`. It has no production callers today: DEBUG-534
 * ruled that the privacy policy's "Delete Analytics Data" control is corrected in
 * COPY rather than built, so no UI invokes this. Kept rather than deleted so the
 * name does not silently disappear, and so a future control has a correct
 * primitive to call instead of re-deriving a leaky one.
 */
export function handleAnalyticsDeletion(
  type: DeletionRequestType = 'user_request',
  posthog?: AnalyticsIdentityResetTarget | null
): { success: boolean; message: string } {
  resetAnalyticsIdentity({ posthog: posthog ?? null });
  logSecurity(`Analytics identity reset: type=${type}`, 'low', { type });
  return { success: true, message: 'Analytics identity reset successfully' };
}

/**
 * Show deletion confirmation alert with regulatory-appropriate language.
 */
export function showDeletionConfirmation(type: DeletionRequestType = 'user_request'): void {
  const title = 'Analytics Data Request Submitted';

  let message =
    'Your analytics identity has been reset and previous data is no longer linked to you.';

  if (type === 'gdpr' || type === 'ccpa') {
    message +=
      '\n\nFor complete deletion of historical data, contact privacy@being.fyi. ' +
      'We will process your request within 30 days (GDPR) or 45 days (CCPA).';
  } else {
    message += '\n\nFor complete deletion of historical data, contact privacy@being.fyi.';
  }

  Alert.alert(title, message, [{ text: 'OK' }]);
}
