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
 *     subscriptionNotification (test, one-time product, voided purchase — revocation is
 *     DEBUG-751). A malformed Google message is permanent, so it is acknowledged too:
 *     redelivering the same bytes cannot fix it.
 *   - The Pub/Sub service-account pin is mandatory. Without it any Google-signed OIDC token
 *     for this audience — which any GCP account can mint — passes verification, and once
 *     the lookup above works the Google path writes entitlements.
 *
 * Tokens never enter an error message or log line: the catch-all response echoes
 * error.message, and a purchase token is a bearer credential.
 */

import { assertAppleAppScope } from '../_shared/verifyAppleJWS.ts';
import { logSubscriptionEvent } from '../_shared/subscriptionAudit.ts';
import { markProcessed, wasProcessed } from './replayCache.ts';
import {
  mapAppleNotification,
  mapGoogleNotification,
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

/** A signed, in-scope notification missing what its type requires. Non-2xx, not marked. */
export class WebhookPayloadRejectedError extends Error {
  constructor(reason: string) {
    super(`Webhook payload rejected: ${reason}`);
    this.name = 'WebhookPayloadRejectedError';
  }
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

/** The update payload: `status` is written only when the transition names one. */
function transitionPatch(t: StatusTransition, extra: Record<string, unknown>) {
  return {
    ...(t.status !== null ? { status: t.status } : {}),
    ...extra,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Handle a verified Apple App Store Server Notification v2 payload.
 */
export async function handleAppleWebhook(
  supabase: Supabase,
  // deno-lint-ignore no-explicit-any
  payload: any,
  verifyAppleSignature: WebhookDeps['verifyAppleSignature'],
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
    console.log('[Apple Webhook] Unhandled notification, no write:', notificationType, subtype ?? '');
    return { kind: 'ignored', reason: 'unhandled_notification_type' };
  }

  const transactionInfo = data?.signedTransactionInfo;
  if (!transactionInfo) {
    throw new WebhookPayloadRejectedError(`${notificationType} carries no signedTransactionInfo`);
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
    throw new WebhookPayloadRejectedError(`${notificationType} transaction has no originalTransactionId`);
  }
  const expiresMs = Number.parseInt(String(transaction?.expiresDate), 10);
  if (!Number.isFinite(expiresMs)) {
    throw new WebhookPayloadRejectedError(`${notificationType} transaction has no usable expiresDate`);
  }

  // Resolve the row the way verify-apple-receipt bound it.
  const { data: subscription, error: lookupError } = await supabase
    .from('subscriptions')
    .select('user_id, id')
    .eq('platform', 'apple')
    .eq('original_transaction_id', originalTransactionId)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (!subscription) throw new SubscriptionNotLinkedError('apple');

  // appAccountToken is optional (the app does not set it today). When present it must name
  // the user the transaction is bound to; disagreeing is an incoherent payload, not a hint.
  const appAccountToken = transaction?.appAccountToken;
  if (isUsableId(appAccountToken) && appAccountToken !== subscription.user_id) {
    throw new WebhookPayloadRejectedError('appAccountToken does not match the bound subscription');
  }

  console.log('[Apple Webhook] Processing:', notificationType, subtype ?? '');

  const { error: updateError } = await supabase
    .from('subscriptions')
    .update(transitionPatch(transition, {
      subscription_end_date: new Date(expiresMs).toISOString(),
    }))
    .eq('id', subscription.id);

  if (updateError) {
    console.error('[Apple Webhook] Failed to update subscription:', updateError);
    throw updateError;
  }

  await logSubscriptionEvent(supabase, {
    userId: subscription.user_id,
    subscriptionId: subscription.id,
    eventType: transition.eventType,
    metadata: {
      platform: 'apple',
      notification_type: notificationType,
      timestamp: new Date().toISOString(),
    },
  });

  console.log('[Apple Webhook] Successfully processed:', notificationType);
  return { kind: 'applied' };
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
  if (!notification) {
    // testNotification, oneTimeProductNotification, voidedPurchaseNotification: none is a
    // subscription state change this function handles (voided-purchase revocation is
    // DEBUG-751). Acknowledge, or the console's "send test notification" redelivers forever.
    const kind = ['testNotification', 'oneTimeProductNotification', 'voidedPurchaseNotification']
      .find((k) => messageData && k in messageData) ?? 'unknown';
    console.log('[Google Webhook] Non-subscription message acknowledged:', kind);
    return { kind: 'ignored', reason: `no_subscription_notification:${kind}` };
  }

  const notificationType = notification.notificationType;
  const purchaseToken = notification.purchaseToken;
  if (!notificationType || !isUsableId(purchaseToken)) {
    console.error('[Google Webhook] Missing required fields, acknowledged without a write');
    return { kind: 'ignored', reason: 'missing_required_fields' };
  }

  const transition = mapGoogleNotification(notificationType);
  if (!transition) {
    console.log('[Google Webhook] Unhandled notification, no write:', notificationType);
    return { kind: 'ignored', reason: 'unhandled_notification_type' };
  }

  // Resolve the row the way verify-google-receipt bound it: the purchase token is stored in
  // plaintext as original_transaction_id. maybeSingle: 0 rows is data=null with no error,
  // so a real DB error is not mistaken for "not linked".
  const { data: subscription, error: lookupError } = await supabase
    .from('subscriptions')
    .select('user_id, id')
    .eq('platform', 'google')
    .eq('original_transaction_id', purchaseToken)
    .maybeSingle();
  if (lookupError) throw lookupError;

  if (!subscription) {
    const publishedMs = Date.parse(payload.message.publishTime);
    // Pub/Sub always sets publishTime; one that cannot be aged cannot be bounded either.
    if (!Number.isFinite(publishedMs) || nowMs - publishedMs > RTDN_MAX_AGE_MS) {
      console.error(
        '[Google Webhook] unresolved RTDN abandoned: no subscription bound within the redelivery ' +
          'window; acknowledged without a write. notificationType:',
        notificationType,
      );
      return { kind: 'ignored', reason: 'unresolved_rtdn_abandoned' };
    }
    throw new SubscriptionNotLinkedError('google');
  }

  console.log('[Google Webhook] Processing:', notificationType);

  const { error: updateError } = await supabase
    .from('subscriptions')
    .update(transitionPatch(transition, {}))
    .eq('id', subscription.id);

  if (updateError) {
    console.error('[Google Webhook] Failed to update subscription:', updateError);
    throw updateError;
  }

  await logSubscriptionEvent(supabase, {
    userId: subscription.user_id,
    subscriptionId: subscription.id,
    eventType: transition.eventType,
    metadata: {
      platform: 'google',
      notification_type: notificationType,
      timestamp: new Date().toISOString(),
    },
  });

  console.log('[Google Webhook] Successfully processed:', notificationType);
  return { kind: 'applied' };
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
          console.log('[Apple Webhook] Replay detected, no-op:', notificationUUID);
          return json(200, { success: true, replay: true });
        }
        outcome = await handleAppleWebhook(supabase, payload, deps.verifyAppleSignature);
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
        const { serviceAccountEmail } = await deps.verifyGoogleOIDC(
          req.headers.get('Authorization'),
          audience,
          serviceAccount,
        );
        console.log('[Google Webhook] OIDC verified, sa:', serviceAccountEmail);
        const messageId = body.message.messageId;
        if (await wasProcessed(supabase, 'google', messageId)) {
          console.log('[Google Webhook] Replay detected, no-op:', messageId);
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
        console.warn('[Webhook] Deferred for redelivery:', error.message);
        return json(503, { error: 'subscription_not_linked', retry: true });
      }
      if (error instanceof WebhookPayloadRejectedError) {
        console.error('[Webhook] Rejected:', error.message);
        return json(422, { error: 'payload_rejected', message: error.message });
      }
      console.error('[Webhook] Error processing webhook:', error);
      return json(500, {
        error: 'Internal server error',
        message: (error as { message?: string })?.message,
      });
    }
  };
}

