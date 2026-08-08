// ---------------------------------------------------------------------------
// External dead-man's-switch gate — subscription/ops trust domain (INFRA-296)
// ---------------------------------------------------------------------------
//
// This deliberately DUPLICATES the ~3 lines of `shouldPingHealthcheck` in
// crisis-detection-alerting/alertLogic.ts rather than sharing them via `_shared/`.
// The two trust domains must stay code-independent: an edit made for an ops reason must
// not be able to change when the crisis alerter pings. That is the same reason the crisis
// gate lives in its own function's directory instead of `_shared/`, and the same reason
// this check gets its own healthchecks.io check and its own ping-URL secret rather than
// reusing the crisis one. Twelve lines of intentional duplication is the cheap side of
// that trade.

/**
 * Decide whether this run may emit a success ping to the ops healthchecks.io
 * dead-man's-switch. Pure by design (no network, no Deno.env) so the load-bearing gate is
 * unit-tested rather than buried in edge glue — the actual GET ping lives in index.ts.
 *
 * THE CONTRACT, which is the whole point of a dead-man's-switch: a success ping means
 * ONLY "this automation run completed cleanly AND persisted its own heartbeat". Both
 * halves matter, and the second is why `heartbeatPersisted` is a parameter rather than an
 * assumption:
 *
 *   - `errorCount === 0` — no step failed. Note the function returns HTTP 200 even when a
 *     step failed (errors are collected, not thrown), so gating on the response code would
 *     wave through a partially-failed run.
 *   - `heartbeatPersisted` — the grace_period_automation_runs row actually landed. Without
 *     this, the inverted failure mode is live: the heartbeat write fails, the in-Supabase
 *     watchdog sees no fresh row and pages "no clean run", while the external switch stays
 *     cheerfully green. The external layer would then be asserting health precisely when
 *     the internal layer is asserting failure.
 *
 * The safety property is in the SILENCE: any error → no ping → healthchecks.io sees a
 * missed expected ping within its grace window → it pages the founder. This is the only
 * layer that survives a total Supabase/edge outage, which blinds both this automation and
 * its in-Supabase watchdog (they share Supabase's failure domain).
 *
 * What a green check does NOT prove: nothing about receipt validity, StoreKit/Play state,
 * or whether any user's subscription status is correct. Only that this cron ran clean.
 */
export function shouldPingSubscriptionHealthcheck(input: {
  errorCount: number;
  heartbeatPersisted: boolean;
}): boolean {
  return input.errorCount === 0 && input.heartbeatPersisted;
}
