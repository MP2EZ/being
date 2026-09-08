/**
 * App-lifecycle telemetry helpers (INFRA-542).
 *
 * Supports `app_opened` / `app_backgrounded`, which had no emitter at all
 * before this item — PostHog's own `captureAppLifecycleEvents` is off, so the
 * product had no first-open marker anywhere and installs were uncohortable.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Device-level "this install has launched before" anchor.
 *
 * DELIBERATELY EXCLUDED FROM ERASURE (compliance ruling, INFRA-542) — mirrors
 * the `auth_device_id` exclusion in SecureStorageService. This key holds a
 * boolean install-state fact: no wellness content, no PII, no user identifier.
 * It must SURVIVE `clearAllWellnessData` on both the logout and the
 * delete-master-key branch, so it carries none of `SWEPT_ASYNC_PREFIXES`
 * (`crisis_async_`, `assessment_async_`, `wellness_async_`,
 * `wellness_migrated:`, `audit_log_`) and is not in `SWEPT_EXACT_KEYS`.
 * Do not "fix" it into the sweep — that would report a fresh install to
 * analytics every time a user clears their data.
 */
export const FIRST_OPEN_MARKER_KEY = '@being/analytics_has_launched_before';

/**
 * The closed enum for `app_opened`'s `since_last_active` property.
 *
 * A bucket, never a raw elapsed value: coarse ranges spanning minutes to
 * multiple days cannot reconstruct a near-exact timestamp. `unknown` is the
 * fail-closed value — every error path lands here rather than emitting a
 * number. Widening or narrowing this list changes what the privacy policy
 * discloses; it is not a free implementation detail.
 */
export const SINCE_LAST_ACTIVE_BUCKETS = [
  'cold_start',
  'lt_5m',
  '5m_30m',
  '30m_24h',
  'gt_24h',
  'unknown',
] as const;

export type SinceLastActiveBucket = (typeof SINCE_LAST_ACTIVE_BUCKETS)[number];

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

/**
 * Coarsen "time since the app was last active" into an approved bucket.
 *
 * `null`/`undefined` means no prior timestamp exists — a genuine first launch.
 * Anything non-finite, or a last-active in the future (clock skew), fails
 * closed to `unknown`.
 */
export function bucketSinceLastActive(
  lastActiveAt: number | null | undefined,
  now: number
): SinceLastActiveBucket {
  if (lastActiveAt === null || lastActiveAt === undefined) return 'cold_start';
  if (!Number.isFinite(lastActiveAt) || !Number.isFinite(now)) return 'unknown';

  const elapsed = now - lastActiveAt;
  if (elapsed < 0) return 'unknown';
  if (elapsed < 5 * MINUTE_MS) return 'lt_5m';
  if (elapsed < 30 * MINUTE_MS) return '5m_30m';
  if (elapsed < 24 * HOUR_MS) return '30m_24h';
  return 'gt_24h';
}

/**
 * Read-then-set the first-open marker. Returns true exactly once per install.
 *
 * Fails CLOSED to `false` on a read error: a broken read reported as `true`
 * would claim a fresh install on every launch, which is worse than having no
 * marker because it looks like data. A failed WRITE still returns true — the
 * read is what decides — and never throws into app launch.
 *
 * Call this only when an analytics client exists. Consuming the marker while
 * the event would be dropped loses the first open permanently.
 */
export async function consumeColdStart(): Promise<boolean> {
  try {
    const existing = await AsyncStorage.getItem(FIRST_OPEN_MARKER_KEY);
    if (existing !== null) return false;
  } catch {
    return false;
  }

  try {
    await AsyncStorage.setItem(FIRST_OPEN_MARKER_KEY, '1');
  } catch {
    // Over-counting a first open on the next launch is the acceptable
    // failure; blocking or throwing during launch is not.
  }
  return true;
}
