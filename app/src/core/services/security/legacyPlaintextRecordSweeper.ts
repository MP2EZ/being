/**
 * legacyPlaintextRecordSweeper — purges pre-existing plaintext wellness records
 * left on device by shipped builds (DEBUG-305)
 *
 * WHAT THIS CLEANS UP
 *
 * `CrisisDetectionService.logCrisisIntervention` used to write
 * `crisis_intervention_<assessmentId>` to AsyncStorage as raw JSON — carrying
 * `primaryTrigger: 'phq9_suicidal_ideation'` and `triggerValue`, i.e. the Q9
 * self-harm response — under a key matching none of the erasure prefixes. It
 * was therefore both unencrypted and invisible to account deletion. DEBUG-305
 * removed the write, but removing a write does nothing for records already on
 * the devices of TestFlight users. This sweeper is that half of the fix.
 *
 * It also removes the legacy bare `assessment_audit_trail` key, which moved
 * under `ASSESSMENT_ASYNC_PREFIX` in the same change for the same reason
 * (content-free, so not a disclosure defect, but the same erasure gap).
 *
 * WHY THE PATTERNS ARE THIS NARROW
 *
 * The keys being removed live in the same namespace as keys that must NEVER be
 * removed. `crisis_async_*` holds the AES-256-encrypted safety plan and
 * emergency contacts; `crisis_secure_*` is the legacy migration fallback. A
 * `startsWith('crisis_')` sweep would destroy a user's safety plan at app
 * launch, silently, with no error message — converting a privacy defect into a
 * safety incident. Every pattern here is anchored and specific, and the
 * suite in `__tests__/legacyPlaintextRecordSweeper.test.ts` asserts the
 * survival of each neighbouring namespace explicitly.
 *
 * Deliberately NOT swept: the `crisis_<assessmentId>` key from
 * `CrisisPerformanceOptimizer.logCrisisInterventionOptimized`. That method was
 * only reachable via `triggerOptimizedEmergencyResponse`, which `git log -S`
 * confirms never had a caller outside its own file in any commit — so no such
 * record was ever written on any device. Matching it would require a broad
 * `crisis_*` pattern with carve-outs, buying real collision risk to clean up
 * records that provably do not exist. The dead method was deleted instead.
 *
 * This module never throws. It runs at app launch, before render, so a failure
 * here must not be able to break app start.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Legacy keys to purge. Anchored at the start; `crisis_intervention_` cannot
 * collide with `crisis_async_` / `crisis_secure_`, and the audit-trail entry is
 * an exact match rather than a prefix.
 */
const LEGACY_PLAINTEXT_PATTERNS: readonly RegExp[] = [
  /^crisis_intervention_/,
  /^assessment_audit_trail$/,
];

function isLegacyPlaintextRecord(key: string): boolean {
  return LEGACY_PLAINTEXT_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Remove legacy plaintext wellness records. Safe to call at app launch, and
 * idempotent — a second run finds nothing and reports 0.
 *
 * @returns the number of keys removed, for launch-time logging.
 */
export async function sweepLegacyPlaintextRecords(): Promise<number> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const toRemove = keys.filter(isLegacyPlaintextRecord);

    if (toRemove.length === 0) {
      return 0;
    }

    await AsyncStorage.multiRemove(toRemove);
    return toRemove.length;
  } catch {
    // An unreadable or unwritable store is not actionable here, and this runs
    // before app render. Report nothing swept and let the next launch retry.
    return 0;
  }
}
