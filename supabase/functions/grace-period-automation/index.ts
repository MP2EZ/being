/**
 * GRACE PERIOD AUTOMATION EDGE FUNCTION
 * Daily cron job for subscription lifecycle management
 *
 * FEATURES:
 * - Expire old trials automatically
 * - Expire grace periods automatically
 * - Send notifications for expiring trials (3 days before)
 * - Send notifications for expiring grace periods (2 days before)
 * - Verify receipts periodically (24-hour intervals)
 *
 * SCHEDULE:
 * - Runs daily at 2:00 AM UTC
 * - Configured via Supabase Edge Function cron
 *
 * PERFORMANCE:
 * - Target: <5s for daily automation run
 * - Batch processing for notifications
 * - Async operations
 *
 * COMPLIANCE:
 * - Audit logging for all state changes
 * - Grace period guarantees (7 days)
 * - Trial period guarantees (28 days)
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { timingSafeEqual } from 'node:crypto';
import { shouldPingSubscriptionHealthcheck } from './healthcheckGate.ts';
import {
  summarizeStaleVerification,
  type StaleVerificationOutcome,
  type StaleVerificationReport,
} from './staleVerificationTally.ts';
import { logSubscriptionEvent } from '../_shared/subscriptionAudit.ts';
import { fetchSubscriptionStatuses } from '../_shared/appStoreServerApi.ts';
import { assertAppleAppScope, verifyAppleJWS } from '../_shared/verifyAppleJWS.ts';

/**
 * Constant-time string comparison via node:crypto's timingSafeEqual.
 * Returns false (without timing leak) when the byte-lengths differ, so the
 * secret length itself isn't a side channel.
 */
function constantTimeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  if (aBytes.byteLength !== bBytes.byteLength) return false;
  return timingSafeEqual(aBytes, bBytes);
}

interface AutomationResult {
  trialsExpired: number;
  gracePeriodsExpired: number;
  trialsExpiringSoon: number;
  gracePeriodsExpiringSoon: number;
  receiptsVerified: number;
  errors: string[];
}

/**
 * Write one heartbeat row to grace_period_automation_runs so a successful (or failed)
 * scheduled run is observable (INFRA-266). PII-free counters only — no user/receipt data.
 * Best-effort: a heartbeat-write failure is logged but NEVER changes the function's HTTP
 * result, so observability can't take down the automation it observes.
 *
 * RETURNS whether the row actually landed (INFRA-296). This used to return void, and the
 * `await ... .insert()` below was unchecked — but supabase-js `.insert()` does NOT throw
 * on a DB/RLS/permission error, it RESOLVES with `{ error }`. So the try/catch caught
 * nothing that mattered and a heartbeat that never landed looked exactly like success.
 * That was survivable while the only consumer was the in-Supabase watchdog (which reads
 * the table directly and correctly saw no row), but the external dead-man's-switch gates
 * its ping on this boolean: without a truthful answer the switch would report health at
 * the exact moment the watchdog reports failure. The crisis alerter has always checked
 * `insErr` for this reason; this brings the ops side to the same standard.
 *
 * The best-effort property is preserved deliberately: a false return does NOT push into
 * `errors`, does NOT flip the run status, and does NOT throw. It only suppresses the ping.
 */
async function recordRun(
  supabase: any,
  status: 'ok' | 'error',
  result: AutomationResult,
  durationMs: number,
  errors: string[],
): Promise<boolean> {
  try {
    const { error: insErr } = await supabase.from('grace_period_automation_runs').insert({
      status,
      trials_expired: result.trialsExpired,
      grace_periods_expired: result.gracePeriodsExpired,
      trials_expiring_soon: result.trialsExpiringSoon,
      grace_periods_expiring_soon: result.gracePeriodsExpiringSoon,
      receipts_verified: result.receiptsVerified,
      errors: errors.length > 0 ? errors : null,
      duration_ms: durationMs,
    });
    if (insErr) {
      console.error('[Automation] Heartbeat run-record insert returned an error:', insErr);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[Automation] Failed to write heartbeat run-record:', e);
    return false;
  }
}

/**
 * Fire the ops-domain healthchecks.io dead-man's-switch success ping (INFRA-296).
 *
 * The check URL (e.g. https://hc-ping.com/<uuid>) is a CAPABILITY URL — anyone holding it
 * can silence the alarm, so treat it as a secret. It is read BY NAME from the
 * `SUBSCRIPTION_HEALTHCHECK_PING_URL` Edge secret and used ONLY as the fetch target: never
 * interpolated into a logged/thrown/response string, never written to the heartbeat row,
 * never appended with run details. GET, no body, no query params, no custom headers — so
 * the only thing healthchecks.io observes is the fact and timestamp of the request.
 *
 * TRUST-DOMAIN SEPARATION IS THE POINT (AC2). This is a DIFFERENT secret name and a
 * DIFFERENT healthchecks.io check from the crisis pipeline's `CRISIS_HEALTHCHECK_PING_URL`
 * (INFRA-264). Do not merge them or point both at one check: the two domains must rotate
 * and page independently, and a shared check would let an ops-side rotation silently break
 * crisis paging. Mirrors the existing `subscription_alert_*` vs `crisis_alert_*` Vault
 * split. Note the static pin cannot verify distinctness — it forbids both URLs identically
 * — so that part is console discipline, recorded in the runbook.
 *
 * Fully best-effort and bounded, matching INFRA-264:
 *   - Unset/blank secret → skip silently. The switch is simply not provisioned yet, and a
 *     missing-config state must NOT page through the internal watchdog. The runbook's
 *     setup checklist is what confirms the first ping actually landed.
 *   - GET with `redirect: 'error'` (a capability URL resolves directly to a known host;
 *     following an unexpected redirect would be an exfiltration vector) and a 5s timeout
 *     (a hung endpoint must never stall the function or bleed into the next cron tick).
 *   - Any failure is swallowed with a generic, URL-free console line, so a healthchecks.io
 *     outage can never flip this run to 'error' or falsely trip the in-Supabase watchdog.
 */
async function pingOpsHealthcheck(): Promise<void> {
  const pingUrl = Deno.env.get('SUBSCRIPTION_HEALTHCHECK_PING_URL');
  if (!pingUrl) return; // not provisioned — skip silently (see runbook §3 setup checklist)
  try {
    const res = await fetch(pingUrl, {
      method: 'GET',
      redirect: 'error',
      signal: AbortSignal.timeout(5000),
    });
    // Outcome recorded as status only, never the URL.
    if (!res.ok) {
      console.warn(`[Automation] ops healthcheck ping returned non-2xx (${res.status})`);
    }
  } catch {
    // URL-free by construction — never echo the capability URL into logs.
    console.warn('[Automation] ops healthcheck ping failed (network/timeout)');
  }
}

/**
 * Expire old trials
 */
async function expireTrials(supabase: any): Promise<number> {
  console.log('[Automation] Expiring old trials...');

  const { data, error } = await supabase.rpc('expire_old_trials');

  if (error) {
    console.error('[Automation] Failed to expire trials:', error);
    throw error;
  }

  const count = data || 0;
  console.log(`[Automation] Expired ${count} trials`);
  return count;
}

/**
 * Expire grace periods
 */
async function expireGracePeriods(supabase: any): Promise<number> {
  console.log('[Automation] Expiring grace periods...');

  const { data, error } = await supabase.rpc('expire_grace_periods');

  if (error) {
    console.error('[Automation] Failed to expire grace periods:', error);
    throw error;
  }

  const count = data || 0;
  console.log(`[Automation] Expired ${count} grace periods`);
  return count;
}

/**
 * Check for expiring trials and notify users
 */
async function notifyExpiringTrials(supabase: any): Promise<number> {
  console.log('[Automation] Checking for expiring trials...');

  const { data: expiringTrials, error } = await supabase.rpc('get_expiring_trials', {
    days_until_expiry: 3,
  });

  if (error) {
    console.error('[Automation] Failed to get expiring trials:', error);
    throw error;
  }

  if (!expiringTrials || expiringTrials.length === 0) {
    console.log('[Automation] No expiring trials found');
    return 0;
  }

  console.log(`[Automation] Found ${expiringTrials.length} expiring trials`);

  // Log events for expiring trials
  for (const trial of expiringTrials) {
    await logSubscriptionEvent(supabase, {
      userId: trial.user_id,
      subscriptionId: null,
      eventType: 'trial_ending_soon',
      metadata: {
        trial_end_date: trial.trial_end_date,
        days_remaining: trial.days_remaining,
        timestamp: new Date().toISOString(),
      },
    });

    // TODO: Send push notification to user
    // TODO: Send email notification (if email available)
  }

  return expiringTrials.length;
}

/**
 * Check for expiring grace periods and notify users
 */
async function notifyExpiringGracePeriods(supabase: any): Promise<number> {
  console.log('[Automation] Checking for expiring grace periods...');

  const { data: expiringGrace, error } = await supabase.rpc('get_expiring_grace_periods', {
    days_until_expiry: 2,
  });

  if (error) {
    console.error('[Automation] Failed to get expiring grace periods:', error);
    throw error;
  }

  if (!expiringGrace || expiringGrace.length === 0) {
    console.log('[Automation] No expiring grace periods found');
    return 0;
  }

  console.log(`[Automation] Found ${expiringGrace.length} expiring grace periods`);

  // Log events for expiring grace periods
  for (const grace of expiringGrace) {
    await logSubscriptionEvent(supabase, {
      userId: grace.user_id,
      subscriptionId: null,
      eventType: 'grace_period_ending',
      metadata: {
        grace_period_end: grace.grace_period_end,
        days_remaining: grace.days_remaining,
        timestamp: new Date().toISOString(),
      },
    });

    // TODO: Send push notification to user
    // TODO: Send email notification (if email available)
  }

  return expiringGrace.length;
}

/**
 * Re-verify subscriptions Apple has not confirmed for us in 24 hours (DEBUG-474).
 *
 * ---------------------------------------------------------------------------
 * WHAT REPLACED WHAT
 * ---------------------------------------------------------------------------
 * Until now this function ran the stale-row query for its diagnostic count and then said,
 * loudly, that it verified nothing. That deferral existed because the pre-INFRA-467 loop
 * could never have worked: it POSTed `receipt_data_encrypted` (AES-256-GCM ciphertext) to a
 * user-scoped verifier under the SERVICE-ROLE key, whose JWT carries no `sub`, so every call
 * 401'd — and the loop silently did not count non-ok responses and discarded the throw. A run
 * in which all 100 verifications failed was indistinguishable from a clean one.
 *
 * The pretence is what was removed then, and it is what must not come back now. Every design
 * choice below is downstream of that: honest counting, aggregate errors that actually reach
 * the run status, and no mutation on any unverified outcome.
 *
 * ---------------------------------------------------------------------------
 * WHY THE SUBSCRIPTION-STATUS ENDPOINT AND NOT THE TRANSACTION ONE
 * ---------------------------------------------------------------------------
 * `GET /inApps/v1/subscriptions/{originalTransactionId}` answers "is this STILL renewing?".
 * `GET /inApps/v1/transactions/{id}` answers "was this one purchase real?" — a point-in-time
 * record that cannot see a lapse. `subscriptions.original_transaction_id` is plaintext
 * (migration 20260607130000), so nothing is decrypted to make the call and
 * `RECEIPT_ENCRYPTION_KEY` is deliberately NOT a secret this function reads.
 *
 * ---------------------------------------------------------------------------
 * THIS CRON CAN DOWNGRADE BUT CAN NEVER RESTORE — read before touching any branch below
 * ---------------------------------------------------------------------------
 * The stale query selects `active | trial | grace` ONLY. A row this function moves to
 * `expired` therefore drops out of tomorrow's query and every query after it: the mistake is
 * not self-healing, and nothing here will ever pick it back up. Only a client re-verification
 * or an Apple webhook can undo it.
 *
 * That asymmetry is the entire reason every failure mode below leaves the row byte-identical.
 * It is specifically why a 404 is NOT read as "expired" (it is equally consistent with
 * environment drift, a purged sandbox transaction, or a bad stored id) and why an empty
 * `data[]` is NOT read as "no longer subscribed". Absence of evidence is not evidence of
 * expiry. If a future edit is tempted to treat a failure as a downgrade, this paragraph is
 * the objection it has to answer first.
 *
 * ---------------------------------------------------------------------------
 * THE RUN-SCOPED QUOTA BUDGET
 * ---------------------------------------------------------------------------
 * App Store Connect quotas are PER-KEY, and `verify-apple-receipt` — the live, user-facing
 * path — draws on the same key. A cron has no principal to throttle per-user, so it owes a
 * run-scoped budget instead: serial calls only, a floor between them, a bounded batch, a
 * wall-clock deadline, and an immediate abort on the two systemic failures. `BATCH_LIMIT` and
 * `INTER_REQUEST_DELAY_MS` are one budget expressed as two numbers and are kept adjacent for
 * that reason — raising either alone silently moves the deadline.
 *
 * ---------------------------------------------------------------------------
 * WHAT MAY BE WRITTEN, AND WHERE FAILURES GO
 * ---------------------------------------------------------------------------
 * Only `status`, `subscription_end_date`, `last_receipt_verified`, `updated_at`. Never
 * `user_id`, `platform`, `original_transaction_id`, `receipt_hash`, `receipt_data_encrypted`
 * or `environment` — those are set by the binding/verification path, and rewriting them here
 * would let a cron failure unbind a receipt. Never `crisis_access_enabled`: its
 * `CHECK (crisis_access_enabled = TRUE)` is the backstop that keeps any entitlement bug
 * non-safety-critical, and crisis features are never gated by subscription.
 *
 * `last_receipt_verified` advances ONLY on a fully verified outcome. Advancing it on failure
 * would drop the row out of tomorrow's stale query and convert a loud repeated failure into
 * permanent silent blindness.
 *
 * Failures reach the caller's `errors` array AGGREGATED — class and count, plus Apple's
 * numeric errorCode where there is one. Never one entry per row and never an identifier:
 * `grace_period_automation_runs.errors` is jsonb with NO size CHECK, and that table's COMMENT
 * promises "PII-free subscription-ops counters only". Identified per-row detail goes to
 * `subscription_events` via `logSubscriptionEvent`, which is RLS-protected, ownership-checked
 * and 2KB-capped. Not PHI — Being is not a HIPAA covered entity. Applicable regimes:
 * FTC Act §5, TDPSA, VCDPA, CPA, CTDPA, GDPR (docs/legal/regulatory-applicability.md).
 */

/** Rows per run. Paired with the delay below — together they must fit STEP_DEADLINE_MS. */
const BATCH_LIMIT = 40;
/** Floor between the END of one Apple call and the START of the next, failures included.
 * Without a floor, 40 fast 404s complete in seconds and read as enumeration against a
 * quota the user-facing verifier shares. */
const INTER_REQUEST_DELAY_MS = 250;
/** Wall clock for the whole step, checked BEFORE each row. `REQUEST_TIMEOUT_MS` is 10s, so
 * an unbounded worst case would be ~400s — past the edge wall clock, and a run cut off
 * mid-flight writes no heartbeat at all, flipping the watchdog for a reason unrelated to
 * Apple. Rows not reached are reported as skipped, never as verified. */
const STEP_DEADLINE_MS = 60_000;
/** Consecutive `AppleUnavailableError`s that abort the step. An Apple outage should cost a
 * handful of calls, not the whole batch. */
const CONSECUTIVE_FAILURE_LIMIT = 5;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Decide the row's new state from CLAIMS THAT HAVE BEEN VERIFIED. Never called with anything
 * unverified.
 *
 * A downgrade requires POSITIVE signed evidence: a revocation, or an elapsed expiry with the
 * renewal half showing the subscription is not in Apple's billing-retry window and not inside
 * an unexpired grace period. Without that last clause a user whose card is being retried —
 * whose money is fine — gets cut off by a cron.
 */
function decideStatus(
  txn: { expiresDate?: number; revocationDate?: number },
  renewal: { isInBillingRetryPeriod?: boolean; gracePeriodExpiresDate?: number },
  currentStatus: string,
  now: number,
): { status: string; expiresDateIso?: string } | null {
  if (typeof txn.revocationDate === 'number') {
    return { status: 'expired' };
  }
  const expiresMs = typeof txn.expiresDate === 'number' ? txn.expiresDate : undefined;
  if (expiresMs === undefined) return null; // malformed — caller treats as payload_malformed

  const expiresDateIso = new Date(expiresMs).toISOString();
  if (expiresMs > now) {
    // Still inside the paid period. A trial stays a trial — this cron does not adjudicate
    // trial-vs-active; `parseTransaction` owns that at verification time.
    const status = currentStatus === 'trial' ? 'trial' : 'active';
    return { status, expiresDateIso };
  }

  const inGrace =
    renewal.isInBillingRetryPeriod === true ||
    (typeof renewal.gracePeriodExpiresDate === 'number' && renewal.gracePeriodExpiresDate > now);

  return { status: inGrace ? 'grace' : 'expired', expiresDateIso };
}

async function verifyStaleReceipts(supabase: any): Promise<StaleVerificationReport> {
  console.log('[Automation] Verifying stale receipts...');
  const stepStart = Date.now();

  const staleBefore = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const staleFilter = `last_receipt_verified.is.null,last_receipt_verified.lt.${staleBefore}`;

  // APPLE ONLY, filtered IN THE QUERY rather than after it. Two reasons, both load-bearing:
  // `BATCH_LIMIT` would otherwise bound a mixed set, so a backlog of Google rows could
  // starve the Apple rows this step can actually act on; and Google rows must not enter the
  // tally at all (see the deferral note below).
  //
  // `updated_at` is selected because the UPDATE is conditioned on it — see the race note at
  // the write. `receipt_data_encrypted` is deliberately NOT selected: pulling an encrypted,
  // bearer-ish credential into memory for no consumer is a data-minimization regression.
  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select('id, user_id, platform, status, original_transaction_id, environment, updated_at')
    .eq('platform', 'apple')
    .in('status', ['active', 'trial', 'grace'])
    .or(staleFilter)
    .limit(BATCH_LIMIT);

  if (error) {
    console.error('[Automation] Failed to get stale receipts:', error);
    throw error;
  }

  // GOOGLE IS AN EXPLICIT NON-GOAL, and the deferral is kept loud rather than replaced by a
  // branch that cannot run. `GOOGLE_SERVICE_ACCOUNT` is `required: false` in
  // deploy-manifest.json pending Play Console enrolment, so `verify-google-receipt` cannot
  // be exercised at all. Note for whoever picks it up: `assertValidTransactionId`'s
  // /^[0-9]{1,19}$/ rejects a Google purchaseToken outright, although the same
  // `original_transaction_id` column stores it — a Google path needs its own validator.
  //
  // COUNTED SEPARATELY AND DELIBERATELY KEPT OUT OF THE TALLY. A deferred row is not a
  // failed verification, and routing it into the error tally would suppress the ops
  // healthcheck ping every night for as long as one stale Google row exists — the same
  // standing-false-alarm shape that `subscriptions_apple_environment_present` exists to
  // prevent for a missing environment. It is reported here, where it is visible without
  // being mistaken for a regression.
  const { count: staleGoogle, error: googleCountError } = await supabase
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('platform', 'google')
    .in('status', ['active', 'trial', 'grace'])
    .or(staleFilter);

  if (googleCountError) {
    // Diagnostics only — a failed COUNT must not fail the Apple step beside it.
    console.warn('[Automation] Could not count stale google subscriptions (diagnostic only)');
  } else if ((staleGoogle ?? 0) > 0) {
    console.warn(
      `[Automation] ${staleGoogle} stale google subscription(s) NOT re-verified — the Google ` +
        `verifier is unprovisioned (Play Console enrolment). Deferred, not attempted, and ` +
        `deliberately not counted as a failure.`,
    );
  }

  const appleRows = subscriptions ?? [];
  if (appleRows.length === 0) {
    console.log('[Automation] No stale apple receipts found');
    return summarizeStaleVerification({ selected: 0, outcomes: [] });
  }

  const credentials = {
    issuerId: Deno.env.get('APPLE_ISSUER_ID') ?? '',
    keyId: Deno.env.get('APPLE_KEY_ID') ?? '',
    privateKeyPem: Deno.env.get('APPLE_PRIVATE_KEY') ?? '',
  };

  const outcomes: StaleVerificationOutcome[] = [];

  let consecutiveUnavailable = 0;
  let aborted = false;

  for (const row of appleRows) {
    if (aborted || Date.now() - stepStart > STEP_DEADLINE_MS) {
      outcomes.push({ outcome: 'deadline_skipped' });
      continue;
    }

    try {
      // Fails closed with NO Apple call. Unreachable on real data since
      // `subscriptions_apple_environment_present`; kept because the constraint is the
      // guarantee and this is the behaviour if it is ever dropped.
      if (row.environment !== 'Production' && row.environment !== 'Sandbox') {
        outcomes.push({ outcome: 'environment_missing' });
        continue;
      }

      const statuses = await fetchSubscriptionStatuses(
        row.original_transaction_id,
        row.environment,
        credentials,
      );
      consecutiveUnavailable = 0;

      // Find OUR item by the id decoded from the VERIFIED transaction payload. Selecting on
      // the unsigned `originalTransactionId` beside it would make an authorization decision
      // on an unauthenticated field, and `uniq_txn_per_platform` means writing from an
      // unmatched item is a cross-user write.
      let matched: { txn: Record<string, unknown>; renewal: Record<string, unknown> } | null = null;
      let sawScopeFailure = false;
      let sawJwsFailure = false;
      let sawEnvironmentMismatch = false;

      for (const item of statuses.items) {
        let txnClaims: Record<string, unknown>;
        let renewalClaims: Record<string, unknown>;
        try {
          const txnVerified = await verifyAppleJWS(item.signedTransactionInfo);
          txnClaims = txnVerified.payload;
          const renewalVerified = await verifyAppleJWS(item.signedRenewalInfo);
          renewalClaims = renewalVerified.payload;
        } catch {
          sawJwsFailure = true;
          continue;
        }

        // Apple signed it, AND Apple signed it for US. Called unmodified — INFRA-449 ships
        // this assertion deliberately ahead of its callers so a caller cannot relax it.
        let scope;
        try {
          scope = assertAppleAppScope(txnClaims, 'cron subscription-status transaction');
        } catch {
          sawScopeFailure = true;
          continue;
        }

        // The host we asked must be the one Apple says this belongs to, and the renewal half
        // — which carries NO bundleId and so cannot be app-scoped alone — must be bound to
        // the transaction half we just scoped.
        if (
          scope.environment !== row.environment ||
          renewalClaims.environment !== scope.environment ||
          renewalClaims.originalTransactionId !== txnClaims.originalTransactionId
        ) {
          sawEnvironmentMismatch = true;
          continue;
        }

        if (txnClaims.originalTransactionId === row.original_transaction_id) {
          matched = { txn: txnClaims, renewal: renewalClaims };
          break;
        }
      }

      if (!matched) {
        // Ordered by severity: a security-class failure must not be reported as a benign
        // "no match" just because a later item also failed to match.
        if (sawScopeFailure) outcomes.push({ outcome: 'app_scope_mismatch' });
        else if (sawEnvironmentMismatch) outcomes.push({ outcome: 'environment_mismatch' });
        else if (sawJwsFailure) outcomes.push({ outcome: 'jws_verification_failed' });
        else outcomes.push({ outcome: 'no_matching_transaction' });
        continue;
      }

      const decided = decideStatus(
        matched.txn as { expiresDate?: number; revocationDate?: number },
        matched.renewal as { isInBillingRetryPeriod?: boolean; gracePeriodExpiresDate?: number },
        row.status,
        Date.now(),
      );
      if (!decided) {
        outcomes.push({ outcome: 'payload_malformed' });
        continue;
      }

      const nowIso = new Date().toISOString();
      const patch: Record<string, unknown> = {
        status: decided.status,
        last_receipt_verified: nowIso,
        updated_at: nowIso,
      };
      if (decided.expiresDateIso) patch.subscription_end_date = decided.expiresDateIso;

      // OPTIMISTIC CONCURRENCY, not decoration. `subscription-webhook` writes this same
      // `status` column from Apple's ASSNv2 notifications, and this batch can run for a
      // minute holding reads taken at its start — so an unconditional UPDATE could clobber a
      // DID_RENEW that landed mid-batch, downgrading a user who had just paid. Matching zero
      // rows means fresher data won, which is the correct outcome, so it is counted `raced`
      // rather than as an error, and `last_receipt_verified` stays put so the row is simply
      // re-verified tomorrow.
      const { data: updated, error: updateError } = await supabase
        .from('subscriptions')
        .update(patch)
        .eq('id', row.id)
        .eq('original_transaction_id', row.original_transaction_id)
        .eq('updated_at', row.updated_at)
        .select('id');

      if (updateError) throw updateError;

      if (!updated || updated.length === 0) {
        outcomes.push({ outcome: 'raced' });
        continue;
      }

      const changed = decided.status !== row.status;
      outcomes.push({
        outcome: changed ? 'verified_status_changed' : 'verified_unchanged',
      });

      // Identified detail belongs here, not in `errors` or `console`: RLS-protected,
      // ownership-checked, 2KB-capped. Non-fatal by ruling — a failed audit write must not
      // reject the entitlement operation that has already committed above.
      if (changed) {
        // All three values are already permitted by `subscription_events_event_type_check`
        // (base schema's 12 plus DEBUG-446's addition), so this needs no migration. Picking
        // the accurate one matters because this table is the audit trail for an entitlement
        // change made with no user present: `subscription_renewed` on a grace->active
        // recovery would misdescribe what happened.
        const eventType = decided.status === 'expired'
          ? 'subscription_expired'
          : row.status === 'grace'
          ? 'subscription_restored'
          : 'subscription_renewed';
        await logSubscriptionEvent(supabase, {
          userId: row.user_id,
          subscriptionId: row.id,
          eventType,
          metadata: {
            platform: 'apple',
            source: 'grace_period_automation',
            previous_status: row.status,
            new_status: decided.status,
            verified_at: nowIso,
          },
        });
      }
    } catch (err) {
      const name = (err as Error)?.name;
      const status = (err as { status?: number })?.status;
      const appleErrorCode = (err as { errorCode?: number })?.errorCode;

      if (name === 'AppleAuthError') {
        // Systemic: a rotated or revoked key. Every remaining row fails identically, and
        // each attempt clears the token cache and forces a fresh PKCS#8 import plus
        // signature — burning quota and CPU to learn nothing already known.
        outcomes.push({ outcome: 'apple_auth', httpStatus: status, appleErrorCode });
        aborted = true;
        continue;
      }
      if (status === 429) {
        // Continuing through a 429 is exactly what starves the live user-facing path. The
        // correct retry is tomorrow's tick, never a sleep inside this run — Apple's retry
        // windows exceed this function's whole budget.
        outcomes.push({ outcome: 'apple_rate_limited', httpStatus: 429, appleErrorCode });
        aborted = true;
        continue;
      }
      if (name === 'TransactionNotFoundError') {
        // NEVER "expired". See the downgrade-only ruling in this function's header.
        outcomes.push({ outcome: 'not_found', appleErrorCode });
      } else if (name === 'AppleUnavailableError') {
        // A 200 carrying garbage arrives as AppleUnavailableError with status 200 — a
        // different operator story from "Apple is down", so it is classified separately.
        outcomes.push(
          status === 200
            ? { outcome: 'payload_malformed', httpStatus: 200 }
            : { outcome: 'apple_unavailable', httpStatus: status, appleErrorCode },
        );
        if (++consecutiveUnavailable >= CONSECUTIVE_FAILURE_LIMIT) aborted = true;
      } else {
        outcomes.push({ outcome: 'payload_malformed' });
      }
    } finally {
      // In `finally` so a failed call is throttled exactly like a successful one — a burst
      // of fast failures draws on the shared quota just as hard as a burst of successes.
      if (!aborted) await sleep(INTER_REQUEST_DELAY_MS);
    }
  }

  const report = summarizeStaleVerification({ selected: appleRows.length, outcomes });
  console.log(report.summary);
  return report;
}

/**
 * Main handler
 */
serve(async (req) => {
  const startTime = Date.now();
  const errors: string[] = [];
  const result: AutomationResult = {
    trialsExpired: 0,
    gracePeriodsExpired: 0,
    trialsExpiringSoon: 0,
    gracePeriodsExpiringSoon: 0,
    receiptsVerified: 0,
    errors: [],
  };
  // Hoisted so the outer catch can still write an 'error' heartbeat (INFRA-266).
  let supabase: any = null;

  try {
    // Authenticate via X-Cron-Secret header with constant-time comparison.
    // Replaces the previous `Authorization.includes(cronSecret)` substring
    // check, which would accept anything like `Bearer leak-<secret>-trailing`
    // and didn't defend against timing-based secret extraction.
    //
    // READS ITS OWN EDGE SECRET, NOT THE SHARED `CRON_SECRET` (INFRA-379).
    // Edge secrets are PROJECT-WIDE — there is no per-function scoping — and
    // `crisis-detection-alerting` + `crisis-liveness-probe` both authenticate against
    // `CRON_SECRET`, whose value is the crisis pipeline's `crisis_alert_cron_secret`.
    // 20260616000000_grace_period_automation_cron.sql requires this function's bearer to
    // be DISTINCT from that one (separate trust domain) while also equalling the secret
    // this line reads. Both cannot hold for one shared name: reading `CRON_SECRET` here
    // either 401s every cron tick (if the Vault value is genuinely distinct, as the
    // migration instructs) or collapses the two trust domains into one bearer, so that an
    // ops-side rotation silently breaks crisis paging. A distinct name is what makes the
    // documented separation actually true. Do not rename this back.
    const providedSecret = req.headers.get('x-cron-secret');
    const expectedSecret = Deno.env.get('GRACE_PERIOD_CRON_SECRET');

    if (!expectedSecret || !providedSecret || !constantTimeEqual(providedSecret, expectedSecret)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[Automation] Starting daily automation run...');

    // 1. Expire old trials
    try {
      result.trialsExpired = await expireTrials(supabase);
    } catch (error) {
      errors.push(`Expire trials failed: ${error.message}`);
    }

    // 2. Expire grace periods
    try {
      result.gracePeriodsExpired = await expireGracePeriods(supabase);
    } catch (error) {
      errors.push(`Expire grace periods failed: ${error.message}`);
    }

    // 3. Notify expiring trials
    try {
      result.trialsExpiringSoon = await notifyExpiringTrials(supabase);
    } catch (error) {
      errors.push(`Notify expiring trials failed: ${error.message}`);
    }

    // 4. Notify expiring grace periods
    try {
      result.gracePeriodsExpiringSoon = await notifyExpiringGracePeriods(supabase);
    } catch (error) {
      errors.push(`Notify expiring grace periods failed: ${error.message}`);
    }

    // 5. Verify stale receipts
    //
    // This step is the one that can fail PARTIALLY, so it does not follow the
    // count-or-throw shape of steps 1-4. It returns both an honest success count and an
    // aggregate error list, and BOTH are consumed: a run where 97 of 100 verifications
    // failed must not be able to report `receiptsVerified` and look clean. Pushing the
    // report's errors into the same array steps 1-4 use is what flips the run to 'error'
    // and suppresses the ops dead-man's-switch ping — the healthcheck gate's own
    // ANY-error-means-no-ping doctrine, generalised to the per-subscription case.
    try {
      const staleReport = await verifyStaleReceipts(supabase);
      result.receiptsVerified = staleReport.receiptsVerified;
      errors.push(...staleReport.errors);
    } catch (error) {
      // A whole-step throw (the query itself failed). The message is OURS — a Postgres
      // error string — never Apple's response text and never a per-row identifier; the
      // per-row classes are aggregated inside the step and arrive via the line above.
      errors.push(`Verify stale receipts failed: ${error.message}`);
    }

    const duration = Date.now() - startTime;
    result.errors = errors;

    console.log('[Automation] Completed daily automation run:', {
      duration: `${duration}ms`,
      ...result,
    });

    // Heartbeat: a per-step failure is collected in `errors` but still returns 200, so
    // the run is 'error' only when at least one step failed; otherwise 'ok' (INFRA-266).
    const heartbeatPersisted = await recordRun(
      supabase,
      errors.length > 0 ? 'error' : 'ok',
      result,
      duration,
      errors,
    );

    // --- External dead-man's-switch, subscription/ops domain (INFRA-296). LAST action
    //     before return, gated on BOTH a clean run and a persisted heartbeat. Mirrors
    //     INFRA-264's placement in the crisis alerter, one trust domain over.
    //
    //     Every non-clean path deliberately reaches this with no ping: the 401 above
    //     returns before any run exists; any of the five per-step failures put an entry in
    //     `errors` (note the function still returns HTTP 200 in that case, which is exactly
    //     why the gate reads `errors` and not the status code); the outer catch below
    //     returns 500 without coming through here at all; and a silently-failed heartbeat
    //     write now yields heartbeatPersisted === false. A total Supabase/edge outage or an
    //     unscheduled cron means the function never runs, so no ping either. In every case
    //     the check's grace window lapses and healthchecks.io pages from an independent
    //     failure domain. ---
    if (shouldPingSubscriptionHealthcheck({ errorCount: errors.length, heartbeatPersisted })) {
      await pingOpsHealthcheck();
    }

    return new Response(
      JSON.stringify({
        success: true,
        duration: `${duration}ms`,
        result,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Automation] Unexpected error:', error);

    // Best-effort 'error' heartbeat for a top-level failure (e.g. an RPC threw before the
    // per-step try/catch). Skipped only when the client wasn't initialized (auth-fail path
    // returns 401 before this and writes no heartbeat — an unauthorized probe is not a run).
    if (supabase) {
      await recordRun(supabase, 'error', result, Date.now() - startTime, [...errors, error.message]);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error.message,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
