/**
 * Drop everything PostHog has queued but not yet sent (DEBUG-686; extracted from
 * DEBUG-539's `resetAnalyticsIdentity`).
 *
 * Nulls `Queue` and `LogsQueue` THROUGH the live client. The two route to
 * different storage files (`.posthog-rn.json` / `.posthog-rn-logs.json`), so
 * nulling only the first leaves the second intact. Nulling routes through the
 * SDK's `removeItem` -> `persist()`, which re-serialises the in-memory cache, so
 * the on-disk copy goes too — deleting the files under a live instance would be
 * a fake control (its next persist writes them straight back).
 *
 * Deliberately NOT done here, and each is a correctness property:
 *  - no `flush()`: draining the queue TRANSMITS it, the exact harm being removed;
 *  - no `reset()`: identity is a separate decision (erasure resets, consent
 *    withdrawal does not — compliance ruling 8(b) on DEBUG-686);
 *  - never throws: both callers run it on a privacy path that must complete.
 *
 * Its own module, not inside `analyticsIdentityReset.ts`, because
 * `PostHogProvider.consentRemount.privacy.test.tsx` mocks that module down to
 * `registerAnalyticsClient` alone.
 */

import { PostHogPersistedProperty } from 'posthog-react-native';
import { logSecurity } from '@/core/services/logging';

/** The one method the purge needs. Structural so a fake can stand in. */
export interface AnalyticsQueuePurgeTarget {
  setPersistedProperty: (key: PostHogPersistedProperty, value: unknown | null) => void;
}

export function purgeAnalyticsQueues(client: AnalyticsQueuePurgeTarget | null | undefined): void {
  if (!client || typeof client.setPersistedProperty !== 'function') return;
  // Each key individually guarded: a failure on one must not leave the other.
  for (const key of [PostHogPersistedProperty.Queue, PostHogPersistedProperty.LogsQueue]) {
    try {
      client.setPersistedProperty(key, null);
    } catch (error) {
      logSecurity('[Analytics] could not purge a queued-analytics store', 'high', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
