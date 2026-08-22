/**
 * DEBUG-474 — stale-subscription re-verification outcome tally.
 *
 * WHY A SEPARATE PURE MODULE EXISTS TO BE TESTED AT ALL.
 * `grace-period-automation/index.ts` calls `serve()` at top level, so nothing can import
 * it — exactly the constraint that put `healthcheckGate.ts` and `_shared/appleTransactionClaims.ts`
 * in their own files. The counting and error-aggregation logic below is the one part of this
 * feature whose bugs are SILENT: a miscount reports a clean run, the ops dead-man's-switch
 * pings, and nothing anywhere says otherwise. Left inside the handler it would be untestable
 * by construction, which is the same as untested.
 *
 * WHAT THESE EXIST TO CATCH. The whole defect class DEBUG-474 closes is "reported success by
 * omission": the pre-INFRA-467 loop discarded non-ok responses and swallowed throws, so a run
 * in which every verification 401'd was indistinguishable from a clean one. The tests that
 * matter are therefore the ones asserting a run CANNOT look clean when it was not, with
 * PARTIAL failure — not total — as the case under test. A test that only pins total failure
 * passes against an implementation that reports 3 verified out of 100 attempted as success.
 *
 * The identifier-hygiene tests are not stylistic. These strings are written to
 * `grace_period_automation_runs.errors`, a jsonb column with NO size CHECK (unlike
 * `subscription_events.metadata_size`) whose table COMMENT promises "PII-free
 * subscription-ops counters only". A transaction id or user id landing there falsifies a
 * documented claim in a table a regulator could be shown — the same shape as DEBUG-446,
 * where a credited control had quietly stopped being true.
 *
 * Applicable regimes for that claim: FTC Act §5, TDPSA, VCDPA, CPA, CTDPA, GDPR. Being is
 * not HIPAA-covered (docs/legal/regulatory-applicability.md).
 */

import {
  assert,
  assertEquals,
  assertFalse,
  assertStringIncludes,
} from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import { shouldPingSubscriptionHealthcheck } from '../grace-period-automation/healthcheckGate.ts';
import {
  summarizeStaleVerification,
  type StaleVerificationOutcome,
} from '../grace-period-automation/staleVerificationTally.ts';

// ---------------------------------------------------------------------------
// HARNESS CONTROL.
//
// Every assertion below this point exercises a module that did not exist when this file
// was written, so on the red run they fail together — and an all-red run is
// indistinguishable from a harness that never executed. This control pins behaviour that
// is ALREADY live and must stay green across the whole change. If it is red, stop reading
// the failures below: the suite did not run, or the healthcheck gate regressed.
// ---------------------------------------------------------------------------
Deno.test('CONTROL — the already-live healthcheck gate still holds (proves this suite ran)', () => {
  assert(shouldPingSubscriptionHealthcheck({ errorCount: 0, heartbeatPersisted: true }));
  assertFalse(shouldPingSubscriptionHealthcheck({ errorCount: 1, heartbeatPersisted: true }));
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ok = (): StaleVerificationOutcome => ({ outcome: 'verified_unchanged' });
const changed = (): StaleVerificationOutcome => ({ outcome: 'verified_status_changed' });
const authFail = (): StaleVerificationOutcome => ({
  outcome: 'apple_auth',
  httpStatus: 401,
  appleErrorCode: 4040005,
});

function repeat(make: () => StaleVerificationOutcome, n: number): StaleVerificationOutcome[] {
  return Array.from({ length: n }, make);
}

/** Identifiers that must never appear in anything written to the heartbeat row. */
const FORBIDDEN = [
  '2000000012345678', // an original_transaction_id
  'b3f1c2d4-5e6a-7b8c-9d0e-1f2a3b4c5d6e', // a subscriptions.id / user_id
  'fyi.being.app', // a bundle id
  'aGVhZGVy.cGF5bG9hZA.c2lnbmF0dXJl', // a JWS (fixture shape — see the sibling suite)
];

// ---------------------------------------------------------------------------
// THE CASE UNDER TEST — partial failure
// ---------------------------------------------------------------------------

Deno.test('PARTIAL FAILURE — 97 of 100 failing does not read as a clean run', () => {
  const report = summarizeStaleVerification({
    selected: 100,
    outcomes: [...repeat(ok, 3), ...repeat(authFail, 97)],
  });

  // The three that worked are counted honestly...
  assertEquals(report.receiptsVerified, 3);
  // ...and the run is NOT clean, which is the half the pre-INFRA-467 loop got wrong.
  assert(report.errors.length > 0, 'a partially failed run must produce errors');
  // The gate reads the error tally, so this is what actually suppresses the ping.
  assertFalse(
    shouldPingSubscriptionHealthcheck({
      errorCount: report.errors.length,
      heartbeatPersisted: true,
    }),
  );
});

Deno.test('PARTIAL FAILURE — a single failure among many successes is still not clean', () => {
  // The dangerous rounding direction: 99/100 is tempting to treat as healthy. The
  // healthcheck gate's own doctrine is ANY error -> no ping, and this generalises it to
  // the per-subscription case.
  const report = summarizeStaleVerification({
    selected: 100,
    outcomes: [...repeat(ok, 99), ...repeat(authFail, 1)],
  });
  assertEquals(report.receiptsVerified, 99);
  assert(report.errors.length > 0, 'one failed row must still flip the run to error');
});

Deno.test('a fully clean run produces no errors and pings', () => {
  const report = summarizeStaleVerification({
    selected: 5,
    outcomes: [...repeat(ok, 4), ...repeat(changed, 1)],
  });
  assertEquals(report.receiptsVerified, 5);
  assertEquals(report.errors, []);
  assert(
    shouldPingSubscriptionHealthcheck({
      errorCount: report.errors.length,
      heartbeatPersisted: true,
    }),
  );
});

Deno.test('an empty batch is clean — nothing stale is not a failure', () => {
  const report = summarizeStaleVerification({ selected: 0, outcomes: [] });
  assertEquals(report.receiptsVerified, 0);
  assertEquals(report.errors, []);
});

// ---------------------------------------------------------------------------
// receiptsVerified — attempts are not successes
// ---------------------------------------------------------------------------

Deno.test('ATTEMPTS ARE NOT SUCCESSES — every failure mode counts zero verified', () => {
  // Named exhaustively rather than sampled: the failure this guards is someone adding a
  // new outcome and defaulting it into the success branch, which would make a novel
  // failure mode report as verified.
  const failureModes: StaleVerificationOutcome['outcome'][] = [
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
  ];
  for (const outcome of failureModes) {
    const report = summarizeStaleVerification({ selected: 1, outcomes: [{ outcome }] });
    assertEquals(report.receiptsVerified, 0, `${outcome} must not count as verified`);
    assert(report.errors.length > 0, `${outcome} must reach the error tally`);
  }
});

Deno.test('a raced row is neither a success nor an error', () => {
  // The row moved under us — subscription-webhook writes the same status column, so a
  // conditional UPDATE matching zero rows means fresher data already landed. Counting it
  // verified would overstate; counting it an error would page for a correct outcome.
  // `last_receipt_verified` is untouched, so the row is simply re-verified tomorrow.
  const report = summarizeStaleVerification({
    selected: 3,
    outcomes: [ok(), ok(), { outcome: 'raced' }],
  });
  assertEquals(report.receiptsVerified, 2);
  assertEquals(report.errors, []);
  assertStringIncludes(report.summary, 'raced=1');
});

// ---------------------------------------------------------------------------
// Aggregation — one line per failure class, never one per row
// ---------------------------------------------------------------------------

Deno.test('errors are AGGREGATED per class, not emitted per row', () => {
  // `grace_period_automation_runs.errors` has no size CHECK, so per-row entries make the
  // column's growth a function of how many users are affected — which is itself a
  // disclosure, on top of being unbounded.
  const report = summarizeStaleVerification({
    selected: 50,
    outcomes: repeat(authFail, 50),
  });
  assertEquals(report.errors.length, 1, '50 identical failures must aggregate to one line');
  assertStringIncludes(report.errors[0], 'count=50');
});

Deno.test('distinct failure classes get distinct lines, and the count is per class', () => {
  const report = summarizeStaleVerification({
    selected: 10,
    outcomes: [
      ...repeat(() => ({ outcome: 'not_found' as const }), 4),
      ...repeat(() => ({ outcome: 'jws_verification_failed' as const }), 6),
    ],
  });
  assertEquals(report.errors.length, 2);
  const joined = report.errors.join(' | ');
  assertStringIncludes(joined, 'not_found');
  assertStringIncludes(joined, 'count=4');
  assertStringIncludes(joined, 'jws_verification_failed');
  assertStringIncludes(joined, 'count=6');
});

Deno.test('the same class with different Apple error codes does not silently merge', () => {
  // Collapsing them would turn "one weird row plus a systemic outage" into a single
  // indistinguishable number, which is the diagnostic the operator actually needs.
  const report = summarizeStaleVerification({
    selected: 2,
    outcomes: [
      { outcome: 'apple_unavailable', httpStatus: 500, appleErrorCode: 5000000 },
      { outcome: 'apple_unavailable', httpStatus: 503, appleErrorCode: 5000001 },
    ],
  });
  assertEquals(report.errors.length, 2);
});

// ---------------------------------------------------------------------------
// Identifier hygiene — the heartbeat row promises "PII-free counters only"
// ---------------------------------------------------------------------------

Deno.test('NO error line or summary carries an identifier, even when one is supplied', () => {
  // The outcome objects deliberately carry junk in an unexpected field: the point is that
  // the summariser emits from a FIXED vocabulary rather than echoing what it was handed,
  // so a future caller cannot leak by passing something new.
  const contaminated = FORBIDDEN.map((leak) => ({
    outcome: 'not_found' as const,
    // deno-lint-ignore no-explicit-any
    ...({ transactionId: leak, userId: leak, message: leak } as any),
  }));
  const report = summarizeStaleVerification({ selected: 4, outcomes: contaminated });

  const emitted = [...report.errors, report.summary].join(' | ');
  for (const leak of FORBIDDEN) {
    assertFalse(
      emitted.includes(leak),
      `"${leak}" reached the heartbeat surface: ${emitted}`,
    );
  }
});

Deno.test('CONTROL — the leak matchers actually fire against a known-bad string', () => {
  // Pairs with the test above. A hygiene assertion that can never go red is worse than no
  // assertion, because it reads as coverage. This proves the matcher works.
  const knownBad = FORBIDDEN.map((leak) => `class=not_found txn=${leak}`).join(' | ');
  for (const leak of FORBIDDEN) {
    assert(knownBad.includes(leak), 'the matcher must detect a genuine leak');
  }
});

// ---------------------------------------------------------------------------
// The summary line — denominators, so a counter can be read
// ---------------------------------------------------------------------------

Deno.test('the summary carries denominators, not just the success count', () => {
  // `receipts_verified` alone cannot distinguish "3 of 3" from "3 of 40", and that
  // distinction is the entire diagnostic value of the counter.
  const report = summarizeStaleVerification({
    selected: 40,
    outcomes: [
      ...repeat(ok, 30),
      ...repeat(changed, 3),
      ...repeat(authFail, 2),
      ...repeat(() => ({ outcome: 'deadline_skipped' as const }), 5),
    ],
  });
  assertStringIncludes(report.summary, 'selected=40');
  assertStringIncludes(report.summary, 'verified=33');
  assertStringIncludes(report.summary, 'status_changed=3');
  assertStringIncludes(report.summary, 'failed=2');
  assertStringIncludes(report.summary, 'skipped=5');
});

Deno.test('a batch cut short by the deadline cannot read as a complete clean batch', () => {
  // A silently short batch looks exactly like a full one. The deferral this feature
  // replaces existed precisely to remove that pretence; reintroducing it via the deadline
  // would be the same bug in a new place.
  const report = summarizeStaleVerification({
    selected: 40,
    outcomes: [...repeat(ok, 10), ...repeat(() => ({ outcome: 'deadline_skipped' as const }), 30)],
  });
  assertEquals(report.receiptsVerified, 10);
  assert(report.errors.length > 0, 'unreached rows must be visible as an error, not omitted');
  assertStringIncludes(report.errors.join(' | '), 'deadline_skipped');
});

Deno.test('the outcome list and the selected count are reconciled, not assumed equal', () => {
  // If they disagree, something dropped a row on the floor between the query and the
  // loop — silently the worst outcome available, so it is surfaced.
  const report = summarizeStaleVerification({ selected: 10, outcomes: repeat(ok, 7) });
  assertEquals(report.receiptsVerified, 7);
  assert(
    report.errors.length > 0,
    'an unaccounted-for row must not be silently dropped',
  );
  assertStringIncludes(report.errors.join(' | '), 'unaccounted');
});
