/**
 * INFRA-741 — the stale re-verification step's per-row classification, extracted from
 * handler.ts so it can be tested. Pure: no I/O, no clock. handler.ts keeps the loop, the
 * inter-request sleep and the `aborted` flag; it resets the consecutive-unavailable counter
 * itself whenever `fetchSubscriptionStatuses` returns.
 *
 * This is a characterisation of the behaviour that shipped, not a redesign. Two of its edges are
 * deliberate and pinned by _tests/stale-row-classification.test.ts: a 200 carrying garbage is
 * reported `payload_malformed` yet still counts toward the outage abort, and an error with no
 * recognised name (a PostgrestError from the conditional UPDATE included) is also
 * `payload_malformed`.
 */

import type { StaleVerificationOutcome } from './staleVerificationTally.ts';

/** Consecutive `AppleUnavailableError`s that abort the step. An Apple outage should cost a
 * handful of calls, not the whole batch. */
export const CONSECUTIVE_FAILURE_LIMIT = 5;

export interface RowErrorClassification {
  outcome: StaleVerificationOutcome;
  /** Stop calling Apple for the rest of this run. */
  abort: boolean;
  /** The consecutive-unavailable count after this row. */
  consecutiveUnavailable: number;
}

/** Classify an error thrown while verifying one row. */
export function classifyRowError(err: unknown, consecutiveUnavailable: number): RowErrorClassification {
  const name = (err as Error)?.name;
  const status = (err as { status?: number })?.status;
  const appleErrorCode = (err as { errorCode?: number })?.errorCode;

  if (name === 'AppleAuthError') {
    // Systemic: a rotated or revoked key. Every remaining row fails identically, and each
    // attempt clears the token cache and forces a fresh PKCS#8 import plus signature —
    // burning quota and CPU to learn nothing already known.
    return {
      outcome: { outcome: 'apple_auth', httpStatus: status, appleErrorCode },
      abort: true,
      consecutiveUnavailable,
    };
  }
  if (status === 429) {
    // Continuing through a 429 is exactly what starves the live user-facing path. The correct
    // retry is tomorrow's tick, never a sleep inside this run — Apple's retry windows exceed
    // this function's whole budget.
    return {
      outcome: { outcome: 'apple_rate_limited', httpStatus: 429, appleErrorCode },
      abort: true,
      consecutiveUnavailable,
    };
  }
  if (name === 'TransactionNotFoundError') {
    // NEVER "expired". See the downgrade-only ruling in handler.ts.
    return { outcome: { outcome: 'not_found', appleErrorCode }, abort: false, consecutiveUnavailable };
  }
  if (name === 'AppleUnavailableError') {
    // A 200 carrying garbage arrives as AppleUnavailableError with status 200 — a different
    // operator story from "Apple is down", so it is classified separately.
    const next = consecutiveUnavailable + 1;
    return {
      outcome: status === 200
        ? { outcome: 'payload_malformed', httpStatus: 200 }
        : { outcome: 'apple_unavailable', httpStatus: status, appleErrorCode },
      abort: next >= CONSECUTIVE_FAILURE_LIMIT,
      consecutiveUnavailable: next,
    };
  }
  return { outcome: { outcome: 'payload_malformed' }, abort: false, consecutiveUnavailable };
}

/**
 * The outcome for a row whose status response held no item matching it. Ordered by severity:
 * a security-class failure must not be reported as a benign "no match" just because a later
 * item also failed to match.
 */
export function noMatchOutcome(seen: {
  scopeFailure: boolean;
  environmentMismatch: boolean;
  jwsFailure: boolean;
}): StaleVerificationOutcome {
  if (seen.scopeFailure) return { outcome: 'app_scope_mismatch' };
  if (seen.environmentMismatch) return { outcome: 'environment_mismatch' };
  if (seen.jwsFailure) return { outcome: 'jws_verification_failed' };
  return { outcome: 'no_matching_transaction' };
}
