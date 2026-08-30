/**
 * FROZEN BASELINE — DO NOT EDIT (INFRA-535).
 *
 * A verbatim copy of `PHIFilter`'s whitelist, blocklist, safe-numeric set and
 * `validate()` as they stood at commit `d14d6178`, before the INFRA-535
 * scan-surface tightening. It exists so the differential test can compare the
 * live filter against a fixed reference rather than against itself.
 *
 * FOUR RULES, each load-bearing:
 *
 *  1. This file MUST NOT import from `@/core/analytics/PHIFilter`. A baseline
 *     that imports the implementation compares the implementation to itself and
 *     is green by construction, whatever the implementation does.
 *
 *  2. This file MUST NOT be reachable from `app/src/`. It is a working copy of a
 *     LOOSER filter; if it ever became importable from src, a mis-import would
 *     silently restore pre-change semantics on a module that is eager on the
 *     crisis path (`CrisisResourcesScreen.tsx` imports the analytics barrel), and
 *     no path-based safety detector would see it. `phiFilterDifferential.privacy.test.ts`
 *     asserts mechanically that nothing under `app/src/` references it.
 *
 *  3. It lives in `__tests__/helpers/` and nowhere else. jest `testMatch` globs
 *     `<rootDir>/__tests__/**\/*` and `testPathIgnorePatterns` exempts exactly
 *     `setup/ utils/ reporters/ helpers/` — so a `__tests__/privacy/fixtures/`
 *     directory would be collected as a suite and fail "Your test suite must
 *     contain at least one test."
 *
 *  4. This file is NEVER AMENDED to track a newly-added event type, and the
 *     `BASELINE_SAFE_EVENT_TYPES.size` pin in the differential is NEVER BUMPED.
 *     Both are anti-tamper guards on a fixed reference, not a headcount of the
 *     live whitelist. Adding a live event type here would restore the
 *     compare-to-itself failure rule 1 exists to prevent. A legitimate widening
 *     is recorded in the differential's `WIDENED` ledger instead — see the
 *     amendment procedure in that file's header (INFRA-558).
 *
 * DELIBERATE DEVIATION FROM VERBATIM: every `logSecurity(...)` call in the
 * original `validate()` has been REMOVED. The baseline is called thousands of
 * times by the differential corpus and its logging is not under test; keeping the
 * calls would flood the audit ring during the suite. Nothing else was changed —
 * no keyword added or removed, no branch reordered, no condition altered.
 */

export interface BaselineValidationResult {
  valid: boolean;
  reason?: string;
}

/** Verbatim as of d14d6178. */
export const BASELINE_SAFE_EVENT_TYPES: ReadonlySet<string> = new Set([
  'app_opened',
  'app_backgrounded',
  'session_started',
  'session_ended',
  'screen_viewed',
  'check_in_started',
  'check_in_completed',
  'assessment_started',
  'assessment_completed',
  'practice_started',
  'practice_completed',
  'breathing_exercise_started',
  'breathing_exercise_completed',
  'crisis_resources_viewed',
  'crisis_hotline_tapped',
  'settings_opened',
  'consent_changed',
  'error_occurred',
  'onboarding_started',
  'onboarding_completed',
  'onboarding_step_completed',
  'learn_content_viewed',
  'learn_module_started',
  'learn_module_completed',
  'guidance_opened',
]);

/** Verbatim as of d14d6178 — 28 entries. */
export const BASELINE_PHI_KEYWORDS: ReadonlyArray<string> = [
  'score',
  'phq',
  'gad',
  'severity',
  'result',
  'mood',
  'feeling',
  'emotion',
  'anxious',
  'depressed',
  'crisis_contact',
  'emergency_contact',
  'hotline_number',
  'suicid',
  'harm',
  'journal',
  'note',
  'entry',
  'reflection',
  'thought',
  'email',
  'phone',
  'name',
  'address',
  'conflict',
  'career',
  'grief',
  'pain',
];

/** Verbatim as of d14d6178. */
export const BASELINE_SAFE_NUMERIC_KEYS: ReadonlySet<string> = new Set([
  'duration',
  'duration_ms',
  'duration_seconds',
  'count',
  'timestamp',
  'step',
  'index',
  'page',
  'version',
]);

/**
 * Verbatim as of d14d6178, minus the `logSecurity` calls (see header).
 *
 * Note what it does NOT do, because these are the gaps INFRA-535 closes and the
 * differential must therefore permit as one-sided tightenings:
 *   - it never scans property KEYS at all;
 *   - it never calls `containsPHI`;
 *   - step 4 excludes arrays, so `{tags:['grief']}` passes intact.
 */
export function validateV1(
  eventType: string,
  eventData: Record<string, unknown>
): BaselineValidationResult {
  // 1. WHITELIST CHECK
  if (!BASELINE_SAFE_EVENT_TYPES.has(eventType)) {
    return { valid: false, reason: `Event type "${eventType}" not in whitelist` };
  }

  // 2. PHI KEYWORD CHECK: VALUES only
  for (const [key, value] of Object.entries(eventData)) {
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase();
      for (const keyword of BASELINE_PHI_KEYWORDS) {
        if (lowerValue.includes(keyword)) {
          return { valid: false, reason: `PHI keyword detected: "${keyword}" in key "${key}"` };
        }
      }
    }
  }

  // 3. NUMERIC VALUE CHECK
  for (const [key, value] of Object.entries(eventData)) {
    if (typeof value === 'number' && !BASELINE_SAFE_NUMERIC_KEYS.has(key)) {
      return { valid: false, reason: `Suspicious numeric value in key: "${key}"` };
    }
  }

  // 4. NESTED OBJECT CHECK — note the deliberate `!Array.isArray` exclusion.
  for (const [, value] of Object.entries(eventData)) {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const nested = validateV1(eventType, value as Record<string, unknown>);
      if (!nested.valid) return nested;
    }
  }

  return { valid: true };
}
