/**
 * The operational telemetry emitted under `cloud_sync` consent (DEBUG-625).
 *
 * WHY THIS EXISTS AS A SHARED CONST rather than string literals at their call
 * sites: `cloudBackupConsentCopy.privacy.test.ts` asserts the consent card covers this
 * list, so adding an ops event red-lines that suite until the card discloses it.
 * A hand-maintained list in the test would drift the moment someone adds an emitter —
 * which is exactly how this gap opened. DEBUG-614 pinned the backup PAYLOAD against the
 * card and deliberately left the telemetry out of scope, so the card ended up describing
 * strictly less than the consent actually covers.
 *
 * ROUTING (INFRA-214 T5). These land in Supabase `analytics_events`, NOT PostHog.
 * `SupabaseService.trackEvent` gates them on `canPerformOperation('cloud_sync')`, so a
 * consent signal is the operative control even though the recorded basis is legitimate
 * interest. Each row carries `auth.uid()`, a `session_id` and a full-precision
 * `created_at`, and is retained 90 days — which is why the card has to say so.
 *
 * NOT A WHITELIST. Adding a name here does not permit an event; it declares one that
 * already exists so the disclosure check can see it. `PHIFilter.SAFE_EVENT_TYPES` is the
 * PostHog allow-list and is a different mechanism on a different sink.
 */

/**
 * Emitted by `CloudBackupService`. Call sites use these members, not literals — the
 * disclosure check is only real if the emitters and the list are the same thing.
 */
export const BACKUP_EVENT = {
  COMPLETED: 'backup_completed',
  FAILED: 'backup_failed',
  RESTORED: 'backup_restored',
  RESTORE_FAILED: 'backup_restore_failed',
} as const;

export const BACKUP_OPERATIONAL_EVENTS = Object.values(BACKUP_EVENT);

// `connectivity_test` was retired by DEBUG-783: the connection test is now a read that
// writes nothing, so it sends no event.

/**
 * Every operational event sent under `cloud_sync` consent.
 *
 * The consent card must disclose this as ONE CATEGORY, not a list of event names — a list of
 * internal identifiers is worse disclosure, not better. The requirement the compliance
 * ruling set is: category + sink + the fact that rows are timestamped and bound to the
 * random account ID.
 */
export const CLOUD_SYNC_OPERATIONAL_EVENTS = [...BACKUP_OPERATIONAL_EVENTS] as const;

export type CloudSyncOperationalEvent = (typeof CLOUD_SYNC_OPERATIONAL_EVENTS)[number];

/**
 * The single `whatWeCollect` bullet that discloses the whole category.
 *
 * Pinned against the live card by `cloudBackupConsentCopy.privacy.test.ts`, so the copy
 * and this constant cannot drift apart silently.
 */
export const OPERATIONAL_TELEMETRY_DISCLOSURE =
  "Records of when a backup or restore ran, whether it succeeded, how long it took and how large it was — stored on Being's servers with your random account ID (no name or email)";

/**
 * DEBUG-853: what Supabase keeps against the random account ID once backup has created it.
 *
 * Worded with the exact phrases of privacy policy §4.1, and pinned to them by
 * `cloudBackupConsentCopy.privacy.test.ts`. Conditional on purpose: a crisis-detection event
 * or a purchase also creates the ID, so the card must not imply that leaving backup off
 * prevents these records. No retention figure: INFRA-851 changes it.
 */
export const CONNECTION_RECORDS_DISCLOSURE =
  "If backup creates your random account ID, our database provider (Supabase) also keeps against it the IP address of your device's most recent connection, device and app details from that connection (the app's build number and your device's operating system version), and when the app last connected";
