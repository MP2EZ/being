/**
 * verify-google-receipt request handler (MAINT-753). Import-safe: no serve(), no createClient,
 * no network at import - index.ts binds the real client and the real Google calls, tests inject
 * fakes. index.ts's header describes the function; it applies here unchanged.
 *
 * Injectable (deps): the Supabase client, the two Google calls (token mint, purchase lookup)
 * and the clock. The deps carry no fetch: the only fetch seam lives inside
 * _shared/googlePlayDeveloperApi.ts (pinned by _tests/verifier-seam-call-sites.test.ts).
 * Deliberately NOT injectable, so a test cannot weaken them:
 *   - identity (getAuthUidFromRequest, read INLINE from the gateway-verified JWT);
 *   - the packageName / subscriptionId / purchaseToken validation, which runs before any
 *     client is built or token minted (DEBUG-752);
 *   - the transaction-identifier guard and assertNoCrossIdentityReplay;
 *   - the ALLOW_MOCK_RECEIPTS gate and the config reads (GOOGLE_SERVICE_ACCOUNT,
 *     RECEIPT_ENCRYPTION_KEY), including parseServiceAccountCredential.
 *
 * Pinned by _tests/google-receipt-handler.test.ts. The structural guards (mock-receipt-gate,
 * receipt-binding-call-site-guard) read THIS file as a single file.
 */

import { getAuthUidFromRequest } from '../_shared/auth.ts';
import { encryptReceipt, receiptHash } from '../_shared/receiptCrypto.ts';
import {
  assertNoCrossIdentityReplay,
  ReceiptReplayError,
  isUniqueViolation,
  InvalidTransactionIdentifierError,
  isUsableTransactionIdentifier,
} from '../_shared/receiptBinding.ts';
import { logSubscriptionEvent } from '../_shared/subscriptionAudit.ts';
import {
  assertBeingPackageName,
  assertValidPurchaseToken,
  assertValidSubscriptionId,
  type GoogleServiceAccountCredential,
  type GoogleSubscriptionPurchase,
  InvalidGooglePurchaseError,
  parseServiceAccountCredential,
} from '../_shared/googlePlayDeveloperApi.ts';

export interface GoogleReceiptDeps {
  /** Called lazily, only after identity and the request validation pass. */
  // deno-lint-ignore no-explicit-any
  createSupabase: () => any;
  /** Bound by reference to the real service-account token mint in production. */
  getGoogleAccessToken: (credential: GoogleServiceAccountCredential) => Promise<string>;
  /** Bound by reference to the real purchases.subscriptions.get lookup in production. */
  fetchSubscriptionPurchase: (
    identifiers: { subscriptionId: unknown; purchaseToken: unknown },
    accessToken: string,
  ) => Promise<GoogleSubscriptionPurchase>;
  now: () => number;
}

interface GoogleReceiptRequest {
  packageName: string;
  subscriptionId: string;
  purchaseToken: string;
}

type GoogleSubscriptionResponse = GoogleSubscriptionPurchase;

interface VerificationResult {
  valid: boolean;
  subscriptionId?: string;
  productId?: string;
  expiresDate?: string;
  autoRenewEnabled?: boolean;
  error?: string;
}

/**
 * Verify purchase token with Google Play (DEBUG-752).
 *
 * The service-account assertion is now really signed (it was a literal
 * `signature_placeholder`), and the lookup URL is built and pinned inside
 * `_shared/googlePlayDeveloperApi.ts`. Every error it throws carries a fixed message, so
 * the audit row written by the caller's catch holds no credential, purchase token or
 * Google response text. The secret is read here, inside the request path, so the INFRA-442
 * reconcile keeps seeing a literal reader.
 */
async function verifyWithGoogle(
  subscriptionId: string,
  purchaseToken: string,
  deps: GoogleReceiptDeps
): Promise<GoogleSubscriptionResponse> {
  const credential = parseServiceAccountCredential(Deno.env.get('GOOGLE_SERVICE_ACCOUNT'));
  const accessToken = await deps.getGoogleAccessToken(credential);
  return await deps.fetchSubscriptionPurchase({ subscriptionId, purchaseToken }, accessToken);
}

/**
 * Parse Google receipt response
 */
export function parseGoogleReceipt(
  response: GoogleSubscriptionResponse,
  subscriptionId: string,
  nowMs: number
): VerificationResult {
  // Check if subscription is active (not expired)
  const expiresMs = parseInt(response.expiryTimeMillis);
  const now = nowMs;
  const isActive = expiresMs > now;

  // Check if cancelled
  const isCancelled = response.cancelReason !== undefined;

  // Check acknowledgement
  const isAcknowledged = response.acknowledgementState === 1;

  return {
    valid: isActive && !isCancelled && isAcknowledged,
    subscriptionId: response.orderId,
    productId: subscriptionId,
    expiresDate: new Date(expiresMs).toISOString(),
    autoRenewEnabled: response.autoRenewing,
  };
}

/**
 * Update subscription in database
 */
async function updateSubscription(
  supabase: any,
  userId: string,
  verification: VerificationResult,
  purchaseToken: string,
  deps: GoogleReceiptDeps
): Promise<void> {
  const now = new Date(deps.now()).toISOString();

  // Determine subscription status
  const status = 'active'; // Google subscriptions are always 'active' (no trial flag)

  // Parse product ID to determine interval
  const interval = verification.productId?.includes('yearly') ? 'yearly' : 'monthly';

  // DEBUG-447 — independent call-site guard. assertNoCrossIdentityReplay now fails closed on
  // a missing identifier too, so this is deliberately redundant: it means a future edit to the
  // helper alone cannot silently reopen the gap here. Both layers must be removed to write an
  // unbound subscription row, and this one sits before the upsert so no row is written.
  if (!isUsableTransactionIdentifier(purchaseToken)) {
    throw new InvalidTransactionIdentifierError('google');
  }

  // Replay guard binds on the purchaseToken — the Google bearer credential that
  // could be replayed across identities (orderId is not the replay vector).
  // Same-user re-verification (restore-purchases) passes through idempotently.
  await assertNoCrossIdentityReplay(supabase, 'google', purchaseToken, userId);

  // Encrypt the purchase token at rest + hash it for dedup (was a plaintext TODO).
  const receipt_data_encrypted = await encryptReceipt(purchaseToken, Deno.env.get('RECEIPT_ENCRYPTION_KEY'));
  const receipt_hash = await receiptHash(purchaseToken);

  // Upsert subscription
  const { error: upsertError } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      platform: 'google',
      platform_subscription_id: verification.subscriptionId,
      original_transaction_id: purchaseToken,
      receipt_hash,
      status,
      tier: 'standard',
      interval,
      subscription_start_date: now,
      subscription_end_date: verification.expiresDate,
      last_receipt_verified: now,
      receipt_data_encrypted,
      updated_at: now,
    }, {
      onConflict: 'user_id'
    });

  if (upsertError) {
    // uniq_txn_per_platform is the TOCTOU backstop behind the ownership check.
    if (isUniqueViolation(upsertError)) {
      throw new ReceiptReplayError('google', purchaseToken);
    }
    throw new Error(`Failed to update subscription: ${upsertError.message}`);
  }

  // Log verification event
  await logSubscriptionEvent(supabase, {
    userId: userId,
    subscriptionId: verification.subscriptionId,
    eventType: 'receipt_verification_succeeded',
    metadata: {
      platform: 'google',
      verified_at: now,
    },
  });
}

/**
 * Main handler
 */
export async function handle(req: Request, deps: GoogleReceiptDeps): Promise<Response> {
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
    // Validate request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Extract user identity from the gateway-verified JWT. The userId field
    // formerly in the request body was forgeable by any caller holding the
    // project's public key; auth.uid() is cryptographically tied to the
    // signed-in user's session.
    let authUid: string;
    try {
      authUid = getAuthUidFromRequest(req);
    } catch (err) {
      return new Response(
        JSON.stringify({ error: err instanceof Error ? err.message : 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: GoogleReceiptRequest = await req.json();
    const { packageName, subscriptionId, purchaseToken } = body;

    if (!packageName || !subscriptionId || !purchaseToken) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: packageName, subscriptionId, purchaseToken' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // DEBUG-752 — validate before any token is minted or any client is built. The package
    // name is pinned to Being's (a purchase token for another app under the same developer
    // account must not become a Being entitlement), and both identifiers are checked
    // because they become path segments of an authenticated request.
    try {
      assertBeingPackageName(packageName);
      assertValidSubscriptionId(subscriptionId);
      assertValidPurchaseToken(purchaseToken);
    } catch (err) {
      if (err instanceof InvalidGooglePurchaseError) {
        return new Response(
          JSON.stringify({ error: 'Invalid purchase parameters' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      throw err;
    }

    // Initialize Supabase client (service role for DB writes; bypasses RLS).
    const supabase = deps.createSupabase();

    console.log('[Google Receipt Verification] Starting verification for user:', authUid);

    // MOCK MODE: Handle mock purchase tokens for local development.
    //
    // FAIL CLOSED — same reasoning as verify-apple-receipt's mock branch: this
    // returns a valid subscription for an attacker-supplied prefix, the gate is
    // opt-in, and an unset ALLOW_MOCK_RECEIPTS rejects. Both functions share one
    // variable deliberately: they are the same trust domain, and a per-function
    // variable is how one of them gets re-enabled and forgotten.
    if (purchaseToken.startsWith('mock_token_')) {
      if (Deno.env.get('ALLOW_MOCK_RECEIPTS') !== 'true') {
        console.warn('[Google Receipt Verification] Mock token rejected - ALLOW_MOCK_RECEIPTS not enabled');
        return new Response(
          JSON.stringify({ error: 'Invalid purchase token' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      console.log('[Google Receipt Verification] Mock mode - auto-approving token');

      // Extract interval from subscription ID
      const interval = subscriptionId.includes('yearly') ? 'yearly' : 'monthly';

      // Generate mock subscription data
      const now = deps.now();
      const expiresDate = interval === 'yearly'
        ? new Date(now + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
        : new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();  // 1 month

      const mockVerification: VerificationResult = {
        valid: true,
        subscriptionId: `mock_sub_${deps.now()}`,
        productId: subscriptionId,
        expiresDate,
        autoRenewEnabled: true,
      };

      console.log('[Google Receipt Verification] Mock verification successful:', mockVerification.subscriptionId);

      return new Response(
        JSON.stringify(mockVerification),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify with Google Play
    let googleResponse: GoogleSubscriptionResponse;
    try {
      googleResponse = await verifyWithGoogle(subscriptionId, purchaseToken, deps);
    } catch (error) {
      console.error('[Google Receipt Verification] Google API error:', error);

      // Log failed verification
      await logSubscriptionEvent(supabase, {
        userId: authUid,
        subscriptionId: null,
        eventType: 'receipt_verification_failed',
        metadata: {
          platform: 'google',
          error: error.message,
          timestamp: new Date(deps.now()).toISOString(),
        },
      });

      return new Response(
        JSON.stringify({
          valid: false,
          error: 'Failed to verify receipt with Google Play',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse receipt
    const verification = parseGoogleReceipt(googleResponse, subscriptionId, deps.now());

    if (verification.valid) {
      // Update subscription in database
      try {
        await updateSubscription(supabase, authUid, verification, purchaseToken, deps);
      } catch (err) {
        if (err instanceof ReceiptReplayError) {
          console.warn('[Google Receipt Verification] Replay rejected for user:', authUid);
          await logSubscriptionEvent(supabase, {
            userId: authUid,
            subscriptionId: null,
            eventType: 'receipt_verification_failed',
            metadata: { platform: 'google', reason: 'txn_bound_to_other_user', timestamp: new Date(deps.now()).toISOString() },
          });
          return new Response(
            JSON.stringify({ valid: false, error: 'Receipt already bound to another account' }),
            { status: 409, headers: { 'Content-Type': 'application/json' } }
          );
        }
        if (err instanceof InvalidTransactionIdentifierError) {
          // DEBUG-447 — no usable purchaseToken reached the binding, so the replay guard
          // cannot be evaluated. Fail closed: no subscriptions row is written (the throw
          // happens before the upsert).
          //
          // This branch is not optional dressing. Without it the throw falls through to the
          // generic outer catch and becomes an undifferentiated 500 with NO audit row —
          // technically fail-closed but indistinguishable from any other bug, which defeats
          // the point of failing closed at all.
          console.error('[Google Receipt Verification] No stable transaction identifier for user:', authUid);
          await logSubscriptionEvent(supabase, {
            userId: authUid,
            subscriptionId: null,
            eventType: 'receipt_verification_failed',
            metadata: { platform: 'google', reason: 'missing_txn_identifier', timestamp: new Date(deps.now()).toISOString() },
          });
          // 500, not 4xx: the caller's request was well-formed. What failed is that
          // verification produced no usable identifier — an upstream/internal condition,
          // matching the existing Google-API-failure branch's framing.
          return new Response(
            JSON.stringify({ valid: false, error: 'Verification produced no stable transaction identifier' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }
        throw err;
      }

      console.log('[Google Receipt Verification] Success:', verification.subscriptionId);

      return new Response(
        JSON.stringify(verification),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      console.log('[Google Receipt Verification] Invalid receipt');

      // Log failed verification
      await logSubscriptionEvent(supabase, {
        userId: authUid,
        subscriptionId: null,
        eventType: 'receipt_verification_failed',
        metadata: {
          platform: 'google',
          error: 'Receipt validation failed',
          timestamp: new Date(deps.now()).toISOString(),
        },
      });

      return new Response(
        JSON.stringify(verification),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('[Google Receipt Verification] Unexpected error:', error);

    return new Response(
      JSON.stringify({
        valid: false,
        error: 'Internal server error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
