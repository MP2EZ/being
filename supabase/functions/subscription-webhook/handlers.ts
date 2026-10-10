/**
 * Subscription webhook handlers and dispatch (DEBUG-739).
 *
 * Lifted out of index.ts, which calls serve() at module scope and so could not be loaded by
 * a test. Import-safe: no serve(), no Deno.env, no network at import. index.ts binds the
 * production dependencies — the real Apple JWS verifier, the real Google OIDC verifier, the
 * Supabase client, env read by literal name — and every dependency here is REQUIRED, so no
 * request field, header or env value can select a stub verifier.
 *
 * WHAT CHANGED, AND WHY (DEBUG-739):
 *   - Both platforms resolve the subscription row by `(platform, original_transaction_id)`,
 *     the column verify-*-receipt actually binds and `uniq_txn_per_platform` indexes. Google
 *     used to compare the plain purchase token against `receipt_data_encrypted` — random-IV
 *     AES-GCM ciphertext — which can never match, so every Google notification was dropped.
 *     Apple used to key on `appAccountToken`, which the app never sets, so every Apple
 *     notification updated nothing. Both looked like success and were marked processed.
 *   - A notification whose row does not exist YET throws SubscriptionNotLinkedError → 503,
 *     not marked, so the store redelivers it once the client's receipt verification lands.
 *     For Google that is bounded by message age (RTDN_MAX_AGE_MS): past it the message is
 *     acknowledged with a loud error log, so a token that will never bind cannot loop for
 *     Pub/Sub's whole retention window. Configure a dead-letter topic too (supabase/README).
 *   - A handled Apple notification missing what it needs throws WebhookPayloadRejectedError
 *     → non-2xx, not marked (AC4 ruling). It is Apple-signed for this app, so this is loud
 *     and recoverable (Apple retries ~5 times over 72h; Notification History holds 180 days),
 *     never a silent "handled". A rejected AUDIT row is not possible: subscription_events
 *     .user_id is NOT NULL and a payload with no transaction has no user to attribute.
 *   - Messages that legitimately carry no transaction are acknowledged as ignored and
 *     write nothing: Apple TEST, unhandled types, and Google messages with no
 *     subscriptionNotification (test, one-time product, a voided one-time purchase). A
 *     malformed Google message is permanent, so it is acknowledged too: redelivering the same
 *     bytes cannot fix it.
 *   - The Pub/Sub service-account pin is mandatory. Without it any Google-signed OIDC token
 *     for this audience — which any GCP account can mint — passes verification, and once
 *     the lookup above works the Google path writes entitlements.
 *
 * WHAT DEBUG-751 ADDED:
 *   - A MONOTONIC GUARD. Stores deliver at-least-once and out of order, and a 503 defers a
 *     notification behind newer ones, so applying in arrival order lets a late EXPIRED undo a
 *     newer RENEWED (or a late PURCHASED resurrect an expired row). subscriptions
 *     .last_store_event_at holds the store event time (Apple's outer signedDate, Google's
 *     eventTimeMillis) of the newest notification applied; an event strictly older is
 *     acknowledged as 'stale_notification' - marked, no write, no audit row. Event time is
 *     required to order anything: a handled Apple type without a numeric signedDate is a 422
 *     (missing_signed_date), a Google message without a believable eventTimeMillis (not a
 *     number, or more than EVENT_CLOCK_SKEW_MS ahead of now) is acknowledged unwritten.
 *   - AN OPTIMISTIC WRITE. The read-check-write above is not atomic, so the UPDATE is
 *     conditioned on the updated_at that was read (the grace-period-automation pattern). If
 *     another writer got in between, nothing is written, SubscriptionWriteRaceError -> 503,
 *     not marked, and the store's redelivery re-reads and re-checks.
 *   - VOIDED PURCHASES. A Google voidedPurchaseNotification for a subscription (productType 1:
 *     refund, chargeback) revokes access: status 'expired', audited as subscription_cancelled.
 *     It goes through the same lookup, guard and write as a subscription notification, and a
 *     lookup or update failure on it is non-2xx and never marked. A voided one-time product is
 *     acknowledged unwritten. Revocation never touches crisis_access_enabled.
 *   - A PACKAGE CHECK. A Pub/Sub message for any package other than BEING_ANDROID_PACKAGE is
 *     acknowledged unwritten ('package_mismatch') on both Google paths, loudly. The OIDC pin
 *     authenticates the sender, not whose subscription the message describes.
 *
 * WHAT DEBUG-772 ADDED (Apple; Google is DEBUG-777):
 *   - STATUS FROM SIGNED STATE where the type alone cannot say. DID_FAIL_TO_RENEW is decided by
 *     the same decideAppleStatus the daily job uses, from the signed transaction and the signed
 *     renewal info - bound to that transaction by environment and originalTransactionId, since
 *     renewal info has no bundleId and cannot be app-scoped alone (an unbound one is a 422,
 *     renewal_info_mismatch). 'grace' is written only with its signed, bounded end in
 *     grace_period_end; billing retry alone is 'expired'. Every other status write clears
 *     grace_period_end; a status-null transition leaves it.
 *   - REFUNDS OF OLDER TRANSACTIONS. REFUND / REVOKE revoke only when the refunded transaction's
 *     signed expiresDate is at least the row's subscription_end_date (it is the current paid
 *     period). Otherwise - or when the row has no usable end date, which the daily job then
 *     converges - it is acknowledged as 'refund_of_superseded_transaction' with no write and no
 *     audit row. REFUND_REVERSED restores 'active' only for a still-running, unrevoked period at
 *     least as late as the stored one ('refund_reversal_no_current_period' otherwise); it never
 *     downgrades. No App Store re-fetch: no new secret, no new failure mode on this endpoint.
 *   - subscription_end_date is never moved backwards by an Apple write.
 *
 * LOGS AND RESPONSES (MAINT-765). Nothing identifying and no error text reaches a log line or
 * a response body: no user id, transaction id, purchase token, subscription row id or
 * per-notification id (notificationUUID, messageId), no whole error object, no error message.
 * A failure is described by webhookFailureReason(): a closed reason plus, for a database error,
 * a validated SQLSTATE. The 500 body is a fixed string and the 422 body carries only the closed
 * reason. A purchase token is a bearer credential, and a constraint-violation message quotes
 * row values, so this is not belt-and-braces.
 */

import { assertAppleAppScope } from '../_shared/verifyAppleJWS.ts';
import { logSubscriptionEvent } from '../_shared/subscriptionAudit.ts';
import { safeStoreCode, stringCodeOf, sqlStateOf } from '../_shared/logSafe.ts';
import { assertValidPurchaseToken, BEING_ANDROID_PACKAGE } from '../_shared/googlePlayDeveloperApi.ts';
import {
  decideAppleStatus,
  renewalBoundToTransaction,
  type SignedRenewalClaims,
} from '../_shared/subscriptionStatusDecision.ts';
import { markProcessed, wasProcessed } from './replayCache.ts';
import {
  EVENT_CLOCK_SKEW_MS,
  isStaleEvent,
  mapAppleNotification,
  mapGoogleNotification,
  mapGoogleVoidedPurchase,
  type StatusTransition,
} from './notificationMapping.ts';

/**
 * How long an unmatched Google notification is redelivered before it is acknowledged and
 * abandoned. Covers the client's verify-google-receipt race (seconds to minutes) with wide
 * margin. A constant, not an env var: a new env read would need a deploy-manifest entry and
 * a value nobody would ever tune.
 */
export const RTDN_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** The row exists only once the client verifies its receipt. Retryable: 503, not marked. */
export class SubscriptionNotLinkedError extends Error {
  constructor(platform: 'apple' | 'google') {
    super(`No ${platform} subscription is bound to this notification yet`);
    this.name = 'SubscriptionNotLinkedError';
  }
}

/**
 * Another writer changed the row between this handler's read and its write (DEBUG-751).
 * Retryable: 503, not marked, so the store redelivers and the guard re-runs on fresh data.
 */
export class SubscriptionWriteRaceError extends Error {
  constructor() {
    super('The subscription row changed between read and write');
    this.name = 'SubscriptionWriteRaceError';
  }
}

/** Why a signed, in-scope notification was rejected. A closed set: it is logged and returned. */
export type WebhookRejectReason =
  | 'missing_signed_transaction_info'
  | 'missing_original_transaction_id'
  | 'unusable_expires_date'
  | 'app_account_token_mismatch'
  | 'missing_signed_date'
  | 'renewal_info_mismatch';

/** A signed, in-scope notification missing what its type requires. Non-2xx, not marked. */
export class WebhookPayloadRejectedError extends Error {
  constructor(public readonly reason: WebhookRejectReason) {
    // The message is for a debugger holding the object; no log or response ever reads it.
    super(`Webhook payload rejected: ${reason}`);
    this.name = 'WebhookPayloadRejectedError';
  }
}

/**
 * Error names a log may carry when nothing more specific applies. Built-ins only: a name any
 * dependency could set is not evidence of anything, so an unlisted name is 'unknown'.
 */
const LOGGABLE_ERROR_NAMES = new Set(['Error', 'SyntaxError', 'TypeError', 'RangeError']);

/**
 * The closed description of a failure that a log line or a response may carry (MAINT-765):
 *   - SubscriptionNotLinkedError / SubscriptionWriteRaceError / WebhookPayloadRejectedError:
 *     their own closed reason, matched by class;
 *   - anything with a string `code` (a PostgrestError may not extend Error, so this is
 *     checked before instanceof Error): 'db_error', plus the code only when it is a valid
 *     SQLSTATE;
 *   - a built-in Error: its name;
 *   - everything else: 'unknown'.
 * Never the message, details, hint or stack.
 */
export function webhookFailureReason(err: unknown): { reason: string; code?: string } {
  if (err instanceof SubscriptionNotLinkedError) return { reason: 'subscription_not_linked' };
  if (err instanceof SubscriptionWriteRaceError) return { reason: 'subscription_write_race' };
  if (err instanceof WebhookPayloadRejectedError) return { reason: err.reason };
  if (stringCodeOf(err) !== null) {
    const code = sqlStateOf(err);
    return code === null ? { reason: 'db_error' } : { reason: 'db_error', code };
  }
  if (err instanceof Error && LOGGABLE_ERROR_NAMES.has(err.name)) return { reason: err.name };
  return { reason: 'unknown' };
}

export type HandlerOutcome = { kind: 'applied' } | { kind: 'ignored'; reason: string };

// deno-lint-ignore no-explicit-any
type Supabase = any;

export interface GoogleWebhookPayload {
  message: {
    data: string; // Base64 encoded JSON
    messageId: string;
    publishTime: string;
  };
  subscription: string;
}

export interface WebhookDeps {
  createSupabase: () => Supabase;
  /** Verifies an Apple JWS and returns its payload. Production: verifyAppleJWS(...).payload. */
  // deno-lint-ignore no-explicit-any
  verifyAppleSignature: (signedPayload: string) => Promise<any>;
  /** Production: verifyGoogleOIDC from ./verifyGoogleOIDC.ts. */
  verifyGoogleOIDC: (
    authorizationHeader: string | null,
    expectedAudience: string,
    pinnedServiceAccountEmail?: string,
  ) => Promise<{ serviceAccountEmail: string | undefined }>;
  /** Read per request, so a missing value fails that request rather than the deploy. */
  readGoogleConfig: () => { audience?: string; serviceAccount?: string };
  now: () => number;
}

function isUsableId(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

/** The columns both lookups select; BoundRow is what comes back. */
const ROW_COLUMNS = 'user_id, id, status, subscription_end_date, last_store_event_at, updated_at';

interface BoundRow {
  user_id: string;
  id: string;
  status?: string | null;
  /** The stored paid-through date: what an Apple refund is compared against (DEBUG-772). */
  subscription_end_date?: string | null;
  /** Store event time of the newest notification applied to this row (DEBUG-751). */
  last_store_event_at: string | null;
  /** The optimistic-concurrency token: the write only lands if this is still current. */
  updated_at: string | null;
}

/**
 * The update payload: `status` is written only when the transition names one. Any status other
 * than 'grace' clears grace_period_end (DEBUG-772); a 'grace' write brings its own bounded end
 * in `extra`, and a status-null transition leaves the column alone.
 */
function transitionPatch(t: StatusTransition, extra: Record<string, unknown>) {
  return {
    ...(t.status !== null ? { status: t.status } : {}),
    ...(t.status !== null && t.status !== 'grace' ? { grace_period_end: null } : {}),
    ...extra,
    updated_at: new Date().toISOString(),
  };
}

/** A stored timestamptz as ms, or undefined when absent or unparseable. */
function storedMs(v: unknown): number | undefined {
  if (typeof v !== 'string') return undefined;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? ms : undefined;
}

/**
 * The notification's signed renewal info, verified and bound to its scoped transaction, or
 * null when the notification carries none. Never app-scoped directly: it has no bundleId.
 */
async function boundRenewalInfo(
  signedRenewalInfo: unknown,
  // deno-lint-ignore no-explicit-any
  transaction: any,
  environment: string,
  verifyAppleSignature: WebhookDeps['verifyAppleSignature'],
): Promise<SignedRenewalClaims | null> {
  if (typeof signedRenewalInfo !== 'string' || signedRenewalInfo === '') return null;
  const renewal = await verifyAppleSignature(signedRenewalInfo);
  if (!renewalBoundToTransaction(renewal, transaction ?? {}, environment)) {
    throw new WebhookPayloadRejectedError('renewal_info_mismatch');
  }
  return renewal;
}

/** A store event time we can order by and write: a positive number that is a valid Date. */
function isUsableEventMs(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 && Number.isFinite(new Date(v).getTime());
}

interface TransitionWrite {
  platform: 'apple' | 'google';
  row: BoundRow;
  transition: StatusTransition;
  /** The store's own time for this notification (Apple signedDate, Google eventTimeMillis). */
  eventMs: number;
  nowMs: number;
  /** For log lines only: a sanitised store code or a fixed constant, never a store value. */
  label: string;
  /** Columns beyond status / last_store_event_at / updated_at. */
  extraPatch: Record<string, unknown>;
  /** Audit metadata keys; `timestamp` is added. Closed keys only. */
  auditMetadata: Record<string, unknown>;
}

/**
 * Handle a verified Apple App Store Server Notification v2 payload.
 */
export async function handleAppleWebhook(
  supabase: Supabase,
  // deno-lint-ignore no-explicit-any
  payload: any,
  verifyAppleSignature: WebhookDeps['verifyAppleSignature'],
  nowMs: number = Date.now(),
): Promise<HandlerOutcome> {
  const { notificationType, subtype, data } = payload;

  // INFRA-449 — SCOPE THE NOTIFICATION TO THIS APP BEFORE ACTING ON IT.
  //
  // Everything above proves Apple signed this. It does not prove Apple signed it
  // for US: every developer's payload chains to the same pinned Apple Root CA - G3,
  // so a genuine notification from another developer's app reaches this line fully
  // verified. Throws rather than returning: dispatch maps a thrown error to a non-2xx,
  // and a silent `return` would ACK a forged notification to Apple as handled.
  const outerScope = assertAppleAppScope(data ?? {}, 'ASSNv2 notification body');

  if (notificationType === 'TEST') {
    console.log('[Apple Webhook] TEST notification acknowledged');
    return { kind: 'ignored', reason: 'apple_test_notification' };
  }

  const transition = mapAppleNotification(notificationType, subtype);
  if (!transition) {
    console.log('[Apple Webhook] Unhandled notification, no write:', safeStoreCode(notificationType), safeStoreCode(subtype));
    return { kind: 'ignored', reason: 'unhandled_notification_type' };
  }

  // The store's own time for this notification: the verified OUTER payload's signedDate (ms).
  // Without it nothing can be ordered, and applying unordered is the defect the guard exists
  // to close - so a handled type lacking it is rejected, retryably, not applied.
  const signedDate = payload.signedDate;
  if (!isUsableEventMs(signedDate)) {
    throw new WebhookPayloadRejectedError('missing_signed_date');
  }

  const transactionInfo = data?.signedTransactionInfo;
  if (!transactionInfo) {
    throw new WebhookPayloadRejectedError('missing_signed_transaction_info');
  }

  // Decode transaction info (also JWS)
  const transaction = await verifyAppleSignature(transactionInfo);

  // The inner transaction is a SEPARATELY signed JWS and carries its own claims, so
  // scoping the envelope says nothing about it. Validate it in its own right, then
  // require the two to agree — an envelope and a transaction disagreeing on app or
  // environment is incoherent, and treating either as authoritative would be a choice
  // an attacker gets to make.
  const innerScope = assertAppleAppScope(transaction ?? {}, 'inner signed transaction');

  if (innerScope.environment !== outerScope.environment) {
    throw new Error(
      `Apple payload environment mismatch: notification says ` +
        `"${outerScope.environment}", inner transaction says "${innerScope.environment}" — refusing.`,
    );
  }

  const originalTransactionId = transaction?.originalTransactionId;
  if (!isUsableId(originalTransactionId)) {
    throw new WebhookPayloadRejectedError('missing_original_transaction_id');
  }
  const expiresMs = Number.parseInt(String(transaction?.expiresDate), 10);
  if (!Number.isFinite(expiresMs)) {
    throw new WebhookPayloadRejectedError('unusable_expires_date');
  }

  // Resolve the row the way verify-apple-receipt bound it.
  const { data: subscription, error: lookupError } = await supabase
    .from('subscriptions')
    .select(ROW_COLUMNS)
    .eq('platform', 'apple')
    .eq('original_transaction_id', originalTransactionId)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (!subscription) throw new SubscriptionNotLinkedError('apple');

  // appAccountToken is optional (the app does not set it today). When present it must name
  // the user the transaction is bound to; disagreeing is an incoherent payload, not a hint.
  const appAccountToken = transaction?.appAccountToken;
  if (isUsableId(appAccountToken) && appAccountToken !== subscription.user_id) {
    throw new WebhookPayloadRejectedError('app_account_token_mismatch');
  }

  const label = safeStoreCode(notificationType);
  const rowEndMs = storedMs(subscription.subscription_end_date);
  let resolved: StatusTransition = transition;
  const extraPatch: Record<string, unknown> = {};

  switch (transition.signedState) {
    case 'post_expiry': {
      const renewal = await boundRenewalInfo(data?.signedRenewalInfo, transaction, innerScope.environment, verifyAppleSignature);
      const decided = decideAppleStatus(transaction ?? {}, renewal, nowMs);
      if (!decided) throw new WebhookPayloadRejectedError('unusable_expires_date');
      resolved = { ...transition, status: decided.status };
      if (decided.status === 'grace') extraPatch.grace_period_end = new Date(decided.gracePeriodEndMs!).toISOString();
      break;
    }
    case 'revocation':
      // Revoke only the CURRENT paid period. A refund of an older transaction, or a row with no
      // end date to compare against, is not applied; the daily job re-verifies the row.
      if (rowEndMs === undefined || expiresMs < rowEndMs) {
        console.log('[Apple Webhook] Refund of a superseded transaction, no write:', label);
        return { kind: 'ignored', reason: 'refund_of_superseded_transaction' };
      }
      break;
    case 'reversal': {
      const decided = decideAppleStatus(transaction ?? {}, null, nowMs);
      if (!decided || decided.status !== 'active' || (rowEndMs !== undefined && expiresMs < rowEndMs)) {
        console.log('[Apple Webhook] Refund reversal for no current period, no write:', label);
        return { kind: 'ignored', reason: 'refund_reversal_no_current_period' };
      }
      break;
    }
  }

  // Never move the paid-through date backwards.
  const endMs = rowEndMs !== undefined && rowEndMs > expiresMs ? rowEndMs : expiresMs;
  return await applyTransition(supabase, {
    platform: 'apple',
    row: subscription,
    transition: resolved,
    eventMs: signedDate,
    nowMs,
    label,
    extraPatch: { ...extraPatch, subscription_end_date: new Date(endMs).toISOString() },
    auditMetadata: { platform: 'apple', notification_type: notificationType },
  });
}

/**
 * The guard, the optimistic write and the audit row - shared by every path that changes a
 * subscription row (Apple, Google subscription notifications, Google voided purchases).
 *
 *   1. An event strictly older than the row's watermark is acknowledged unwritten.
 *   2. The UPDATE is conditioned on the updated_at that was read. Zero rows matched means
 *      another writer got in first: throw, so the store redelivers and this re-runs.
 *   3. The audit row, non-fatal by the audit module's ruling.
 */
async function applyTransition(supabase: Supabase, w: TransitionWrite): Promise<HandlerOutcome> {
  const tag = w.platform === 'apple' ? '[Apple Webhook]' : '[Google Webhook]';

  if (isStaleEvent(w.eventMs, w.row.last_store_event_at, w.nowMs)) {
    console.log(tag, 'Stale notification, a newer one is already applied, no write:', w.label);
    return { kind: 'ignored', reason: 'stale_notification' };
  }

  console.log(tag, 'Processing:', w.label);

  const patch = transitionPatch(w.transition, {
    ...w.extraPatch,
    last_store_event_at: new Date(w.eventMs).toISOString(),
  });
  const base = supabase.from('subscriptions').update(patch).eq('id', w.row.id);
  // eq('updated_at', null) matches nothing in PostgREST; a NULL token needs IS NULL.
  const conditioned = typeof w.row.updated_at === 'string'
    ? base.eq('updated_at', w.row.updated_at)
    : base.is('updated_at', null);
  const { data: updated, error: updateError } = await conditioned.select('id');

  if (updateError) {
    console.error(tag, 'Failed to update subscription:', webhookFailureReason(updateError));
    throw updateError;
  }
  if (!Array.isArray(updated) || updated.length === 0) throw new SubscriptionWriteRaceError();

  await logSubscriptionEvent(supabase, {
    userId: w.row.user_id,
    subscriptionId: w.row.id,
    eventType: w.transition.eventType,
    metadata: { ...w.auditMetadata, timestamp: new Date().toISOString() },
  });

  console.log(tag, 'Successfully processed:', w.label);
  return { kind: 'applied' };
}

/**
 * Google's own time for a message, from the top-level eventTimeMillis (a string of ms): null
 * unless it is a positive, valid time no more than EVENT_CLOCK_SKEW_MS ahead of `nowMs`. A
 * message the guard cannot order must not be written, so the caller acknowledges it.
 */
function googleEventMs(raw: unknown, nowMs: number): number | null {
  const ms = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : typeof raw === 'number' ? raw : NaN;
  return isUsableEventMs(ms) && ms <= nowMs + EVENT_CLOCK_SKEW_MS ? ms : null;
}

/**
 * Resolve the row the way verify-google-receipt bound it: the purchase token is stored in
 * plaintext as original_transaction_id. maybeSingle: 0 rows is data=null with no error, so a
 * real DB error is not mistaken for "not linked".
 *
 * No row yet: within RTDN_MAX_AGE_MS of publishTime that is SubscriptionNotLinkedError (503,
 * redelivered); past it, or with a publishTime that cannot be aged, the message is abandoned
 * loudly and null is returned.
 */
async function resolveGoogleRow(
  supabase: Supabase,
  purchaseToken: string,
  publishTime: unknown,
  nowMs: number,
  label: string,
): Promise<BoundRow | null> {
  const { data: subscription, error: lookupError } = await supabase
    .from('subscriptions')
    .select(ROW_COLUMNS)
    .eq('platform', 'google')
    .eq('original_transaction_id', purchaseToken)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (subscription) return subscription;

  const publishedMs = Date.parse(String(publishTime));
  // Pub/Sub always sets publishTime; one that cannot be aged cannot be bounded either.
  if (!Number.isFinite(publishedMs) || nowMs - publishedMs > RTDN_MAX_AGE_MS) {
    console.error(
      '[Google Webhook] unresolved RTDN abandoned: no subscription bound within the redelivery ' +
        'window; acknowledged without a write. notificationType:',
      label,
    );
    return null;
  }
  throw new SubscriptionNotLinkedError('google');
}

/**
 * The OIDC pin authenticates the SENDER, not whose subscription the message describes. A
 * message for any other package is not ours to act on.
 */
function packageMismatch(): HandlerOutcome {
  console.error('[Google Webhook] message is for a different package, acknowledged without a write');
  return { kind: 'ignored', reason: 'package_mismatch' };
}

/** A voidedPurchaseNotification (refund / chargeback): revoke the subscription it names. */
async function handleGoogleVoidedPurchase(
  supabase: Supabase,
  payload: GoogleWebhookPayload,
  // deno-lint-ignore no-explicit-any
  messageData: any,
  // deno-lint-ignore no-explicit-any
  voided: any,
  nowMs: number,
): Promise<HandlerOutcome> {
  if (messageData.packageName !== BEING_ANDROID_PACKAGE) return packageMismatch();

  // productType 1 is a subscription; 2 is a one-time product, which grants no entitlement here.
  const transition = mapGoogleVoidedPurchase(voided.productType);
  if (!transition) {
    console.log('[Google Webhook] Voided purchase is not a subscription, acknowledged without a write');
    return { kind: 'ignored', reason: 'voided_non_subscription' };
  }

  let purchaseToken: string;
  try {
    purchaseToken = assertValidPurchaseToken(voided.purchaseToken);
  } catch {
    console.error('[Google Webhook] Voided purchase missing a usable purchase token, acknowledged without a write');
    return { kind: 'ignored', reason: 'missing_required_fields' };
  }

  const eventMs = googleEventMs(messageData.eventTimeMillis, nowMs);
  if (eventMs === null) {
    console.error('[Google Webhook] Voided purchase missing a usable event time, acknowledged without a write');
    return { kind: 'ignored', reason: 'missing_required_fields' };
  }

  // Revocation: any failure from here is non-2xx and the message is never marked, so Pub/Sub
  // redelivers it. (The same throw semantics as the subscription path; stated because a
  // silently acknowledged refund is a user keeping access they were refunded for.)
  const subscription = await resolveGoogleRow(supabase, purchaseToken, payload.message.publishTime, nowMs, 'voided_purchase');
  if (!subscription) return { kind: 'ignored', reason: 'unresolved_rtdn_abandoned' };

  return await applyTransition(supabase, {
    platform: 'google',
    row: subscription,
    transition,
    eventMs,
    nowMs,
    label: 'voided_purchase',
    extraPatch: {},
    auditMetadata: {
      platform: 'google',
      notification_type: 'voided_purchase',
      product_type: voided.productType,
      ...(Number.isInteger(voided.refundType) ? { refund_type: voided.refundType } : {}),
    },
  });
}

/**
 * Handle a Google Play RTDN delivered by Pub/Sub push. `nowMs` bounds redelivery.
 */
export async function handleGoogleWebhook(
  supabase: Supabase,
  payload: GoogleWebhookPayload,
  nowMs: number,
): Promise<HandlerOutcome> {
  // deno-lint-ignore no-explicit-any
  let messageData: any;
  try {
    messageData = JSON.parse(atob(payload.message.data));
  } catch {
    // Permanent: the same bytes are redelivered, so a non-2xx can never succeed.
    console.error('[Google Webhook] Malformed message data, acknowledged without a write');
    return { kind: 'ignored', reason: 'malformed_message' };
  }

  const notification = messageData?.subscriptionNotification;
  const voided = messageData?.voidedPurchaseNotification;
  if (!notification && typeof voided === 'object' && voided !== null) {
    return await handleGoogleVoidedPurchase(supabase, payload, messageData, voided, nowMs);
  }
  if (!notification) {
    // testNotification, oneTimeProductNotification: neither is a subscription state change
    // this function handles. Acknowledge, or the console's "send test notification"
    // redelivers forever.
    const kind = ['testNotification', 'oneTimeProductNotification', 'voidedPurchaseNotification']
      .find((k) => messageData && k in messageData) ?? 'unknown';
    console.log('[Google Webhook] Non-subscription message acknowledged:', kind);
    return { kind: 'ignored', reason: `no_subscription_notification:${kind}` };
  }

  if (messageData.packageName !== BEING_ANDROID_PACKAGE) return packageMismatch();

  const notificationType = notification.notificationType;
  const purchaseToken = notification.purchaseToken;
  if (!notificationType || !isUsableId(purchaseToken)) {
    console.error('[Google Webhook] Missing required fields, acknowledged without a write');
    return { kind: 'ignored', reason: 'missing_required_fields' };
  }

  const transition = mapGoogleNotification(notificationType);
  if (!transition) {
    console.log('[Google Webhook] Unhandled notification, no write:', safeStoreCode(notificationType));
    return { kind: 'ignored', reason: 'unhandled_notification_type' };
  }

  const eventMs = googleEventMs(messageData.eventTimeMillis, nowMs);
  if (eventMs === null) {
    console.error('[Google Webhook] Missing a usable event time, acknowledged without a write');
    return { kind: 'ignored', reason: 'missing_required_fields' };
  }

  const label = safeStoreCode(notificationType);
  const subscription = await resolveGoogleRow(supabase, purchaseToken, payload.message.publishTime, nowMs, label);
  if (!subscription) return { kind: 'ignored', reason: 'unresolved_rtdn_abandoned' };

  return await applyTransition(supabase, {
    platform: 'google',
    row: subscription,
    transition,
    eventMs,
    nowMs,
    label,
    extraPatch: {},
    auditMetadata: { platform: 'google', notification_type: notificationType },
  });
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * The request handler. Order is the pre-DEBUG-739 order: OPTIONS, 405, client, parse,
 * verify, replay check, handle, mark. Verification precedes the replay check so an
 * unauthenticated caller cannot probe the cache; mark follows a successful (or ignored)
 * handle only, so a throw leaves the notification unmarked and the store retries it.
 */
export function createWebhookHandler(deps: WebhookDeps): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    // CORS headers
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      });
    }

    try {
      if (req.method !== 'POST') {
        return json(405, { error: 'Method not allowed' });
      }

      const supabase = deps.createSupabase();
      const body = await req.json();

      let outcome: HandlerOutcome;
      if (body.signedPayload) {
        console.log('[Webhook] Processing Apple webhook');
        const payload = await deps.verifyAppleSignature(body.signedPayload);
        const notificationUUID = payload.notificationUUID;
        if (await wasProcessed(supabase, 'apple', notificationUUID)) {
          console.log('[Apple Webhook] Replay detected, no-op');
          return json(200, { success: true, replay: true });
        }
        outcome = await handleAppleWebhook(supabase, payload, deps.verifyAppleSignature, deps.now());
        await markProcessed(supabase, 'apple', notificationUUID);
      } else if (body.message?.data) {
        // Pub/Sub push delivers an Authorization: Bearer <jwt> signed by Google for the
        // push subscription's service account. Verify it before trusting the body.
        console.log('[Webhook] Processing Google webhook');
        const { audience, serviceAccount } = deps.readGoogleConfig();
        if (!audience) {
          throw new Error('GOOGLE_PUBSUB_AUDIENCE env var is not configured');
        }
        if (!serviceAccount) {
          throw new Error('GOOGLE_PUBSUB_SERVICE_ACCOUNT env var is not configured');
        }
        await deps.verifyGoogleOIDC(
          req.headers.get('Authorization'),
          audience,
          serviceAccount,
        );
        console.log('[Google Webhook] OIDC verified');
        const messageId = body.message.messageId;
        if (await wasProcessed(supabase, 'google', messageId)) {
          console.log('[Google Webhook] Replay detected, no-op');
          return json(200, { success: true, replay: true });
        }
        outcome = await handleGoogleWebhook(supabase, body, deps.now());
        await markProcessed(supabase, 'google', messageId);
      } else {
        console.error('[Webhook] Unknown webhook format');
        return json(400, { error: 'Unknown webhook format' });
      }

      return json(
        200,
        outcome.kind === 'ignored' ? { success: true, ignored: outcome.reason } : { success: true },
      );
    } catch (error) {
      if (error instanceof SubscriptionNotLinkedError) {
        console.warn('[Webhook] Deferred for redelivery:', webhookFailureReason(error));
        return json(503, { error: 'subscription_not_linked', retry: true });
      }
      if (error instanceof SubscriptionWriteRaceError) {
        console.warn('[Webhook] Deferred for redelivery:', webhookFailureReason(error));
        return json(503, { error: 'subscription_write_race', retry: true });
      }
      if (error instanceof WebhookPayloadRejectedError) {
        console.error('[Webhook] Rejected:', webhookFailureReason(error));
        return json(422, { error: 'payload_rejected', reason: error.reason });
      }
      console.error('[Webhook] Error processing webhook:', webhookFailureReason(error));
      // Fixed: error.message used to be echoed here, and a dependency's text can carry an
      // identifier or a credential (MAINT-765). The store only needs the non-2xx.
      return json(500, { error: 'internal_error' });
    }
  };
}
