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
import { logSubscriptionEvent } from '../_shared/subscriptionAudit.ts';

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
 * Verify receipts that haven't been verified in 24 hours
 */
async function verifyStaleReceipts(supabase: any): Promise<number> {
  console.log('[Automation] Verifying stale receipts...');

  // Get subscriptions that need verification (last verified > 24 hours ago)
  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    // Only what the deferral below actually reports on. Selecting
    // `receipt_data_encrypted` would pull an encrypted bearer-ish credential into memory
    // for no consumer, which is a data-minimization regression the moment it is unused.
    .select('id, platform')
    .in('status', ['active', 'trial', 'grace'])
    .or('last_receipt_verified.is.null,last_receipt_verified.lt.' + new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .limit(100); // Limit to 100 per run to avoid timeout

  if (error) {
    console.error('[Automation] Failed to get stale receipts:', error);
    throw error;
  }

  if (!subscriptions || subscriptions.length === 0) {
    console.log('[Automation] No stale receipts found');
    return 0;
  }

  console.log(`[Automation] Found ${subscriptions.length} stale receipts`);

  // ---------------------------------------------------------------------------
  // DEFERRED TO DEBUG-474 — this path does not re-verify anything, and says so.
  //
  // It previously POSTed to verify-{apple,google}-receipt and counted a 2xx. It could
  // never have worked, for four independent reasons, and INFRA-467 slice 4 chose an
  // explicit deferral over a re-point because repairing it needs API surface that does
  // not exist yet:
  //
  //   1. It sent `receipt_data_encrypted` as `receiptData` / `purchaseToken`. That column
  //      holds AES-256-GCM CIPHERTEXT written by encryptReceipt — never a value a verifier
  //      could read. This predates both INFRA-260 and INFRA-467.
  //   2. It sent a `userId` body field that INFRA-260 stopped reading, identity having
  //      moved to auth.uid().
  //   3. The Authorization header is the SERVICE-ROLE key, whose JWT carries no `sub`.
  //      verify-apple-receipt runs verify_jwt=true and throws in getAuthUidFromRequest,
  //      so every call 401s before any of the above matters. Calling a user-scoped
  //      endpoint from cron cannot work by construction, not by accident.
  //   4. Since INFRA-467 slice 3, verify-apple-receipt does not accept `receiptData` at
  //      all — Apple verification is keyed on a transactionId.
  //
  // The correct fix is Apple's SUBSCRIPTION-STATUS endpoint
  // (/inApps/v1/subscriptions/{originalTransactionId}), called directly from here rather
  // than hopping through a user-scoped function. Re-verification asks "is this still
  // renewing?", which is renewal state — not the point-in-time transaction that
  // /inApps/v1/transactions/{id} returns. See DEBUG-474.
  //
  // WHY LOUD RATHER THAN DELETED. The query above is genuine diagnostics: the count of
  // stale rows is worth knowing even while nothing acts on it. What is removed is the
  // PRETENCE — the old loop reported success by omission, since a non-ok response was
  // silently not counted and the catch discarded the throw, so a run in which every single
  // verification 401'd was indistinguishable from a clean one.
  // ---------------------------------------------------------------------------
  const apple = subscriptions.filter((s: { platform: string }) => s.platform === 'apple').length;
  const google = subscriptions.filter((s: { platform: string }) => s.platform === 'google').length;
  console.error(
    `[Automation] STALE RECEIPT RE-VERIFICATION IS DISABLED (DEBUG-474). ` +
      `${subscriptions.length} subscription(s) past the 24h window were NOT re-verified ` +
      `(apple=${apple}, google=${google}). Their status may be stale in either direction.`
  );

  // Zero verified, reported as zero. The caller's `receiptsVerified` total therefore
  // stays honest rather than counting attempts that never happened.
  return 0;
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
    try {
      result.receiptsVerified = await verifyStaleReceipts(supabase);
    } catch (error) {
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
