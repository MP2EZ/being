/**
 * healthcheckGate.ts behavioral tests — subscription/ops dead-man's-switch (INFRA-296)
 *
 * The gate is pure and load-bearing, so it is tested in isolation from the edge runtime
 * (no network, no Deno.env) exactly as the crisis-domain gate is.
 *
 * WHAT THESE EXIST TO CATCH. The safety property of a dead-man's-switch lives in the
 * SILENCE, which means every bug that matters is a bug in the NO-PAGE direction: a ping
 * that fires when it should not. Such a bug is invisible in production by construction —
 * the check stays green, nothing alerts, and the failure is only discovered when someone
 * asks why an outage went unreported. There is no runtime signal to notice. These tests
 * are therefore the only place the contract is enforced.
 *
 * The `heartbeatPersisted` half is the one worth the ceremony. Before INFRA-296, the ops
 * `recordRun` issued an unchecked `.insert()`, and supabase-js resolves with `{ error }`
 * rather than throwing — so a heartbeat that never landed was indistinguishable from
 * success. Gating on that would have produced the worst possible state: the in-Supabase
 * watchdog paging "no clean run" while the external switch reported health.
 */

import { assert, assertFalse } from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import { shouldPingSubscriptionHealthcheck } from '../grace-period-automation/healthcheckGate.ts';

Deno.test('ops healthcheck gate: clean run with a persisted heartbeat → ping', () => {
  assert(shouldPingSubscriptionHealthcheck({ errorCount: 0, heartbeatPersisted: true }));
});

Deno.test('ops healthcheck gate: ANY step error → no ping (dead-man fires)', () => {
  // The function returns HTTP 200 even when a step failed — errors are collected, not
  // thrown — so gating on the response code would wave a partially-failed run through.
  // The gate must read the error tally.
  assertFalse(shouldPingSubscriptionHealthcheck({ errorCount: 1, heartbeatPersisted: true }));
  assertFalse(shouldPingSubscriptionHealthcheck({ errorCount: 5, heartbeatPersisted: true }));
});

Deno.test('ops healthcheck gate: heartbeat that did not land → no ping, even on a clean run', () => {
  // The inverted failure mode this parameter exists to prevent: every step succeeded, but
  // the grace_period_automation_runs row never persisted. The in-Supabase watchdog reads
  // that table, sees nothing fresh, and pages "no clean run" — so if the external switch
  // pinged here, the two layers would assert opposite things about the same run.
  assertFalse(shouldPingSubscriptionHealthcheck({ errorCount: 0, heartbeatPersisted: false }));
});

Deno.test('ops healthcheck gate: both failure modes at once → no ping', () => {
  assertFalse(shouldPingSubscriptionHealthcheck({ errorCount: 2, heartbeatPersisted: false }));
});

Deno.test('ops healthcheck gate: both conditions are required, neither is sufficient', () => {
  // Pins the conjunction itself. A refactor to `errorCount === 0 || heartbeatPersisted`
  // passes every single-condition test above, and would silently restore the pre-INFRA-296
  // behaviour for the unpersisted-heartbeat case.
  const cases: Array<[number, boolean, boolean]> = [
    [0, true, true],
    [0, false, false],
    [1, true, false],
    [1, false, false],
  ];
  for (const [errorCount, heartbeatPersisted, expected] of cases) {
    const actual = shouldPingSubscriptionHealthcheck({ errorCount, heartbeatPersisted });
    assert(
      actual === expected,
      `errorCount=${errorCount} heartbeatPersisted=${heartbeatPersisted} → expected ${expected}, got ${actual}`,
    );
  }
});
