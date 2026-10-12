/**
 * INFRA-741 — per-row error classification in the stale re-verification step
 * (`grace-period-automation/staleRowClassification.ts`).
 *
 * A characterisation of the behaviour that shipped. Where the code and a sentence in the work
 * item disagree, the code is pinned and the case says so: a 200-with-garbage counts toward the
 * outage abort, and a PostgrestError (no `name`) from the conditional UPDATE is reported
 * `payload_malformed`.
 */

import { assert, assertEquals, assertFalse } from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import {
  classifyRowError,
  CONSECUTIVE_FAILURE_LIMIT,
  noMatchOutcome,
} from '../grace-period-automation/staleRowClassification.ts';

const named = (name: string, extra: Record<string, unknown> = {}) =>
  Object.assign(new Error('never logged'), { name }, extra);

Deno.test('AppleAuthError aborts the step and leaves the outage counter alone', () => {
  const r = classifyRowError(named('AppleAuthError', { status: 401, errorCode: 4010 }), 2);
  assertEquals(r.outcome, { outcome: 'apple_auth', httpStatus: 401, appleErrorCode: 4010 });
  assert(r.abort);
  assertEquals(r.consecutiveUnavailable, 2);
});

Deno.test('429 aborts the step — even when the error is otherwise an outage', () => {
  for (const err of [named('Error', { status: 429 }), named('AppleUnavailableError', { status: 429 })]) {
    const r = classifyRowError(err, 0);
    assertEquals(r.outcome.outcome, 'apple_rate_limited');
    assertEquals(r.outcome.httpStatus, 429);
    assert(r.abort);
    assertEquals(r.consecutiveUnavailable, 0);
  }
});

Deno.test('the 5th consecutive AppleUnavailableError aborts; the 4th does not', () => {
  assertEquals(CONSECUTIVE_FAILURE_LIMIT, 5);
  let count = 0;
  for (let i = 1; i <= 4; i++) {
    const r = classifyRowError(named('AppleUnavailableError', { status: 503 }), count);
    assertEquals(r.outcome, { outcome: 'apple_unavailable', httpStatus: 503, appleErrorCode: undefined });
    assertFalse(r.abort, `aborted on unavailable #${i}`);
    count = r.consecutiveUnavailable;
  }
  assertEquals(count, 4);
  const fifth = classifyRowError(named('AppleUnavailableError', { status: 503 }), count);
  assert(fifth.abort);
  assertEquals(fifth.consecutiveUnavailable, 5);
});

Deno.test('the caller resets the counter after a fetch returns, so the abort needs five in a row', () => {
  // handler.ts sets the counter to 0 whenever fetchSubscriptionStatuses returns; this is the
  // classification half of that contract.
  const afterFour = [1, 2, 3, 4].reduce((c) => classifyRowError(named('AppleUnavailableError'), c).consecutiveUnavailable, 0);
  assertEquals(afterFour, 4);
  const afterReset = classifyRowError(named('AppleUnavailableError'), 0);
  assertFalse(afterReset.abort);
  assertEquals(afterReset.consecutiveUnavailable, 1);
});

Deno.test('AppleUnavailableError with status 200 is payload_malformed — and still counts toward the abort', () => {
  const r = classifyRowError(named('AppleUnavailableError', { status: 200 }), 4);
  assertEquals(r.outcome, { outcome: 'payload_malformed', httpStatus: 200 });
  assertEquals(r.consecutiveUnavailable, 5);
  assert(r.abort);
});

Deno.test('TransactionNotFoundError is not_found — never expired — and does not touch the counter', () => {
  const r = classifyRowError(named('TransactionNotFoundError', { status: 404, errorCode: 4040010 }), 3);
  assertEquals(r.outcome, { outcome: 'not_found', appleErrorCode: 4040010 });
  assertFalse(r.abort);
  assertEquals(r.consecutiveUnavailable, 3);
});

Deno.test('an unrecognised error is payload_malformed, PostgrestError and non-Errors included', () => {
  const postgrest = { code: '23514', message: 'never logged', details: null, hint: null };
  for (const err of [named('TypeError'), postgrest, 'a string', undefined]) {
    const r = classifyRowError(err, 1);
    assertEquals(r.outcome, { outcome: 'payload_malformed' });
    assertFalse(r.abort);
    assertEquals(r.consecutiveUnavailable, 1);
  }
});

Deno.test('the outcome never carries an error message', () => {
  for (const name of ['AppleAuthError', 'AppleUnavailableError', 'TransactionNotFoundError', 'Error']) {
    const r = classifyRowError(named(name, { status: 500 }), 0);
    assertFalse(JSON.stringify(r.outcome).includes('never logged'));
  }
});

Deno.test('no-match precedence: scope > environment > jws > no_matching', () => {
  const all = { scopeFailure: true, environmentMismatch: true, jwsFailure: true };
  assertEquals(noMatchOutcome(all), { outcome: 'app_scope_mismatch' });
  assertEquals(noMatchOutcome({ ...all, scopeFailure: false }), { outcome: 'environment_mismatch' });
  assertEquals(
    noMatchOutcome({ scopeFailure: false, environmentMismatch: false, jwsFailure: true }),
    { outcome: 'jws_verification_failed' },
  );
  assertEquals(
    noMatchOutcome({ scopeFailure: false, environmentMismatch: false, jwsFailure: false }),
    { outcome: 'no_matching_transaction' },
  );
});
