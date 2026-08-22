// ---------------------------------------------------------------------------
// Stale-subscription re-verification outcome tally (DEBUG-474)
// ---------------------------------------------------------------------------
//
// WHY THIS IS A SEPARATE FILE AND NOT A FEW LINES IN index.ts.
// `index.ts` calls `serve()` at top level, so nothing can import it — no `_tests/` file can
// resolve its module graph. Pure decision logic living in there is untestable by
// construction, which is the argument `_shared/appleTransactionClaims.ts` already makes for
// itself and the reason `healthcheckGate.ts` sits beside this file rather than inside the
// handler. This logic qualifies for exactly the same reason those do: getting it wrong does
// not fail loudly, it silently reports a clean run.
//
// WHAT THIS DECIDES, AND WHY IT IS LOAD-BEARING.
// The defect DEBUG-474 closes is "reported success by omission". The pre-INFRA-467 loop
// POSTed to a user-scoped verifier, silently did not count a non-ok response, and discarded
// the throw — so a run in which every single verification 401'd was indistinguishable from a
// clean one. INFRA-467 slice 4 replaced that with an honest zero rather than a working path.
// This module is the honest accounting the working path needs:
//
//   - `receiptsVerified` counts verifications that ACTUALLY SUCCEEDED. An attempt is not a
//     success, and no failure mode may default into the success branch.
//   - Any failure reaches `errors`, which flips the run to 'error' in `recordRun` and
//     suppresses the ops dead-man's-switch ping via `shouldPingSubscriptionHealthcheck`.
//     PARTIAL failure is the case that matters: 97 of 100 failing must not read as clean.
//   - Nothing here mutates anything or talks to anything. It is a fold over outcomes.
//
// WHY THE OUTPUT VOCABULARY IS FIXED AND NOTHING IS ECHOED.
// These strings are written to `grace_period_automation_runs.errors`, a jsonb column with NO
// size CHECK (unlike `subscription_events.metadata_size`) whose table COMMENT promises
// "PII-free subscription-ops counters only (no user/receipt data)". So this module emits
// only from the closed vocabulary below plus integer counts — it never interpolates a caller
// -supplied string, and it type-guards the two numeric fields it does carry. A caller that
// hands it a transaction id cannot leak one through, today or after a future edit adds a
// field. Apple's numeric `errorCode` is deliberately carried: `_shared/appStoreServerApi.ts`
// rules it a low-entropy documented enum safe as a structured field, unlike the free-text
// `errorMessage` beside it, which is never read anywhere.
//
// Identified per-row detail belongs in `subscription_events` via `logSubscriptionEvent` —
// RLS-protected, ownership-checked, 2KB-capped — never here and never in `console`.
//
// The `subscriptions` row is already classified sensitive wellness data (see its table
// COMMENT and the DPIA's category 7). Not PHI; Being is not a HIPAA covered entity.
// Applicable regimes: FTC Act §5, TDPSA, VCDPA, CPA, CTDPA, GDPR
// (docs/legal/regulatory-applicability.md).
// ---------------------------------------------------------------------------

/**
 * Every way one stale subscription row can end its turn through the loop.
 *
 * Enumerated exhaustively rather than collapsed into ok/failed because the classes need
 * different operator responses: `apple_auth` means a key was rotated or revoked and every
 * remaining row will fail too, while `not_found` on one row among many is a data question
 * about that row. Collapsing them makes a credential outage present as "some receipts look
 * invalid", which is the same mistake `_shared/appStoreServerApi.ts` refuses to make with
 * its four distinct error types.
 */
export type StaleVerificationOutcomeName =
  // --- successes: Apple answered, the answer was fully verified, the row was written ---
  /** Verified; Apple's state matches what we already held. No write was needed. */
  | 'verified_unchanged'
  /** Verified; the row's status was updated to match Apple. */
  | 'verified_status_changed'
  // --- neither: correct outcomes that are not verifications ---
  /**
   * The conditional UPDATE matched zero rows — the row moved between SELECT and UPDATE.
   * `subscription-webhook` writes the same `status` column from Apple's ASSNv2
   * notifications, so this is the batch losing a race to FRESHER data, which is the
   * correct outcome and not a failure. Counting it verified would overstate;
   * counting it an error would page for something working as designed.
   * `last_receipt_verified` is left untouched, so the row is simply re-verified tomorrow.
   */
  | 'raced'
  // --- failures: every one of these leaves the subscription row byte-identical ---
  /** No `subscriptions.environment`, so no host could be chosen. Unreachable on real data
   *  since `subscriptions_apple_environment_present`; retained as belt-and-braces. */
  | 'environment_missing'
  /** Apple 404. NEVER read as "expired" — see the ruling in index.ts. */
  | 'not_found'
  /** Apple 401/403. Systemic; aborts the step. */
  | 'apple_auth'
  /** Apple 429. Aborts the step — continuing is what starves the live user path. */
  | 'apple_rate_limited'
  /** Apple 5xx, timeout, or any unclassified status. */
  | 'apple_unavailable'
  /** A returned JWS did not verify against the pinned Apple root. Security class. */
  | 'jws_verification_failed'
  /** `assertAppleAppScope` rejected the payload — correctly Apple-signed, wrong app. */
  | 'app_scope_mismatch'
  /** The signed `environment` claim disagreed with the host we asked, or the transaction
   *  and renewal halves disagreed with each other. Security class. */
  | 'environment_mismatch'
  /** A verified payload was missing a claim the decision needs. */
  | 'payload_malformed'
  /** Apple returned no `data[]` item whose SIGNED id matches ours. Never read as
   *  "no longer subscribed" — absence of evidence is not evidence of expiry. */
  | 'no_matching_transaction'
  /** The step's wall-clock deadline was reached before this row was attempted. */
  | 'deadline_skipped';

const SUCCESS_OUTCOMES: ReadonlySet<string> = new Set([
  'verified_unchanged',
  'verified_status_changed',
]);

/** Correct outcomes that are neither a verification nor a failure. */
const NEUTRAL_OUTCOMES: ReadonlySet<string> = new Set(['raced']);

const KNOWN_OUTCOMES: ReadonlySet<string> = new Set([
  'verified_unchanged',
  'verified_status_changed',
  'raced',
  'environment_missing',
  'not_found',
  'apple_auth',
  'apple_rate_limited',
  'apple_unavailable',
  'jws_verification_failed',
  'app_scope_mismatch',
  'environment_mismatch',
  'payload_malformed',
  'no_matching_transaction',
  'deadline_skipped',
]);

export interface StaleVerificationOutcome {
  outcome: StaleVerificationOutcomeName;
  /** HTTP status from Apple. Carried for HTTP classes only; never a body or message. */
  httpStatus?: number;
  /** Apple's documented numeric errorCode. A low-entropy enum, never the free text. */
  appleErrorCode?: number;
}

export interface StaleVerificationTally {
  /** Rows the stale query returned. The denominator. */
  selected: number;
  /** One entry per row that reached the loop, in any order. */
  outcomes: StaleVerificationOutcome[];
}

export interface StaleVerificationReport {
  /** Feeds `AutomationResult.receiptsVerified`. Successes only. */
  receiptsVerified: number;
  /** Aggregate, identifier-free lines. Non-empty => run status 'error' => no ping. */
  errors: string[];
  /** One identifier-free line for `console.log`. Carries the denominators. */
  summary: string;
}

/** Emit an integer only if it genuinely is one — a caller cannot smuggle a string through. */
function safeInt(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : undefined;
}

/**
 * Fold per-row outcomes into the two things the handler needs: an honest success count and
 * an aggregate error list.
 *
 * A row present in `selected` but absent from `outcomes` is reported as `unaccounted`
 * rather than ignored. That gap can only mean the loop dropped a row on the floor, and a
 * dropped row is the silent-failure shape this whole feature exists to remove — so it is
 * surfaced as an error even though nothing observed it fail.
 */
export function summarizeStaleVerification(tally: StaleVerificationTally): StaleVerificationReport {
  const counts = new Map<string, { line: string; count: number }>();
  let verified = 0;
  let statusChanged = 0;
  let raced = 0;
  let failed = 0;
  let skipped = 0;

  for (const entry of tally.outcomes ?? []) {
    // An unrecognized outcome is treated as a failure, never waved through. A new outcome
    // added without updating this module must not report as a success by default.
    const name = KNOWN_OUTCOMES.has(entry?.outcome) ? entry.outcome : 'payload_malformed';

    if (SUCCESS_OUTCOMES.has(name)) {
      verified++;
      if (name === 'verified_status_changed') statusChanged++;
      continue;
    }
    if (NEUTRAL_OUTCOMES.has(name)) {
      raced++;
      continue;
    }

    if (name === 'deadline_skipped') skipped++;
    else failed++;

    const httpStatus = safeInt(entry?.httpStatus);
    const appleErrorCode = safeInt(entry?.appleErrorCode);
    // Keyed on the full triple: the same class at two different Apple error codes is two
    // different operator stories, and merging them hides "one weird row" inside "an outage".
    const key = `${name}|${httpStatus ?? ''}|${appleErrorCode ?? ''}`;
    const existing = counts.get(key);
    if (existing) {
      existing.count++;
    } else {
      let line = `class=${name}`;
      if (httpStatus !== undefined) line += ` http_status=${httpStatus}`;
      if (appleErrorCode !== undefined) line += ` apple_error_code=${appleErrorCode}`;
      counts.set(key, { line, count: 1 });
    }
  }

  const accounted = verified + raced + failed + skipped;
  const unaccounted = Math.max(0, (tally.selected ?? 0) - accounted);
  if (unaccounted > 0) {
    counts.set('unaccounted||', { line: 'class=unaccounted', count: unaccounted });
  }

  const errors = [...counts.values()].map(({ line, count }) => `${line} count=${count}`);

  const summary =
    `[Automation] stale re-verification: selected=${tally.selected ?? 0} ` +
    `verified=${verified} status_changed=${statusChanged} raced=${raced} ` +
    `failed=${failed} skipped=${skipped} unaccounted=${unaccounted}`;

  return { receiptsVerified: verified, errors, summary };
}
