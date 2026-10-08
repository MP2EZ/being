/**
 * verify-apple-receipt request handler (MAINT-753). Import-safe: no serve(), no createClient,
 * no network at import - index.ts binds the real client and the real Apple calls, tests inject
 * fakes. The design rationale (App Store Server API cutover, the environment cross-check,
 * what is encrypted and hashed) is in index.ts's header and applies here unchanged.
 *
 * Injectable (deps): the Supabase client, the Apple transaction fetch, the signature
 * verification and the clock. Deliberately NOT injectable, so a test cannot weaken them:
 *   - identity (getAuthUidFromRequest, read INLINE from the gateway-verified JWT);
 *   - assertAppleAppScope and the scope.environment !== requestedEnvironment cross-check;
 *   - the transaction-identifier guard and assertNoCrossIdentityReplay;
 *   - the ALLOW_MOCK_RECEIPTS gate and the config reads (RECEIPT_ENCRYPTION_KEY, APPLE_*).
 *
 * Pinned by _tests/apple-receipt-handler.test.ts. The structural guards (mock-receipt-gate,
 * receipt-binding-call-site-guard, apple-transaction-claims) read THIS file as a single file.
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
import { assertAppleAppScope } from '../_shared/verifyAppleJWS.ts';
import {
  AppleAuthError,
  AppleUnavailableError,
  AppStoreConnectConfigError,
  type AppStoreConnectCredentials,
  InvalidTransactionIdError,
  type SignedTransactionResult,
  TransactionNotFoundError,
} from '../_shared/appStoreServerApi.ts';
import {
  AppleTransactionClaims,
  parseTransaction,
  VerificationResult,
} from '../_shared/appleTransactionClaims.ts';

export interface AppleReceiptDeps {
  /** Called lazily, only after identity and the request fields pass. */
  // deno-lint-ignore no-explicit-any
  createSupabase: () => any;
  /** Bound by reference to the real App Store Server API call in production. */
  fetchSignedTransactionInfo: (
    transactionId: unknown,
    environment: unknown,
    credentials: AppStoreConnectCredentials,
  ) => Promise<SignedTransactionResult>;
  /** Production: (jws) => verifyAppleJWS(jws) against the pinned Apple root. */
  verifyTransaction: (jws: string) => Promise<{ payload: Record<string, unknown> }>;
  now: () => number;
}

interface AppleReceiptRequest {
  transactionId?: string;
  environment?: string;
  /**
   * Legacy field. Still sent by the slice-2 client and deliberately IGNORED — it plays no
   * part in verification any more. Retiring it from the client is a follow-up slice; the
   * server does not wait on that, because it never reads this.
   */
  receiptData?: string;
}

/**
 * Update subscription in database.
 *
 * `signedTransactionInfo` is the VERIFIED JWS, and it is what gets encrypted and hashed —
 * see the compliance note in the file header for why a bare identifier would not do.
 */
async function updateSubscription(
  supabase: any,
  userId: string,
  verification: VerificationResult,
  signedTransactionInfo: string,
  deps: AppleReceiptDeps
): Promise<void> {
  const now = new Date(deps.now()).toISOString();

  // Determine subscription status
  let status = 'active';
  if (verification.isTrialPeriod) {
    status = 'trial';
  }

  // Parse product ID to determine interval
  const interval = verification.productId?.includes('yearly') ? 'yearly' : 'monthly';

  // DEBUG-447 — independent call-site guard. assertNoCrossIdentityReplay now fails closed on
  // a missing identifier too, so this is deliberately redundant: it means a future edit to the
  // helper alone cannot silently reopen the gap here. Both layers must be removed to write an
  // unbound subscription row, and this one sits before the upsert so no row is written.
  if (!isUsableTransactionIdentifier(verification.subscriptionId)) {
    throw new InvalidTransactionIdentifierError('apple');
  }

  // Replay guard: reject if this transaction is already bound to another user
  // (service-role writes bypass RLS, so this check is the gate). Same-user
  // re-verification (restore-purchases) passes through as an idempotent refresh.
  await assertNoCrossIdentityReplay(supabase, 'apple', verification.subscriptionId, userId);

  const receipt_data_encrypted = await encryptReceipt(signedTransactionInfo, Deno.env.get('RECEIPT_ENCRYPTION_KEY'));
  const receipt_hash = await receiptHash(signedTransactionInfo);

  // Upsert subscription
  const { error: upsertError } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      platform: 'apple',
      platform_subscription_id: verification.subscriptionId,
      original_transaction_id: verification.subscriptionId,
      receipt_hash,
      status,
      tier: 'standard',
      interval,
      subscription_start_date: now,
      subscription_end_date: verification.expiresDate,
      last_receipt_verified: now,
      receipt_data_encrypted,
      // DEBUG-474 — the VERIFIED environment claim, persisted so the nightly cron has a
      // trusted host source. This traces to `assertAppleAppScope(payload).environment`
      // (see `scope.environment` below), NOT to `body.environment`: the client's hint is
      // advisory and routes the request, and storing it here would make it load-bearing
      // one write later. `subscriptions_apple_environment_present` requires this column on
      // every apple row, so dropping this line fails the upsert rather than writing a row
      // the cron could never re-verify.
      environment: verification.environment,
      updated_at: now,
    }, {
      onConflict: 'user_id'
    });

  if (upsertError) {
    // The uniq_txn_per_platform index is the TOCTOU backstop behind the
    // ownership check above — surface a race as a replay, not a 500.
    if (isUniqueViolation(upsertError)) {
      throw new ReceiptReplayError('apple', verification.subscriptionId ?? '');
    }
    throw new Error(`Failed to update subscription: ${upsertError.message}`);
  }

  // Log verification event
  await logSubscriptionEvent(supabase, {
    userId: userId,
    subscriptionId: verification.subscriptionId,
    eventType: 'receipt_verification_succeeded',
    metadata: {
      platform: 'apple',
      environment: verification.environment,
      verified_at: now,
    },
  });
}

/**
 * Main handler
 */
export async function handle(req: Request, deps: AppleReceiptDeps): Promise<Response> {
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
    const body: AppleReceiptRequest = await req.json();
    const { transactionId } = body;

    if (!transactionId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: transactionId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client (service role for DB writes; bypasses RLS).
    const supabase = deps.createSupabase();

    console.log('[Apple Receipt Verification] Starting verification for user:', authUid);

    // MOCK MODE: Handle mock transactions for local development.
    //
    // FAIL CLOSED. This branch returns a valid year-long subscription for any
    // caller who supplies a string with the right prefix, so it must never be
    // reachable in a deployed environment. The gate is opt-in and defaults off:
    // an unset ALLOW_MOCK_RECEIPTS rejects, so a project that has never heard of
    // this variable is safe rather than exposed.
    //
    // The client-side guard is NOT a control. IAPService.ts gates its own mock
    // path on `this.mockMode` (= __DEV__) and returns locally without calling
    // this function at all, so no legitimate caller reaches this branch from
    // either a dev or a Release build. Only a direct request does.
    if (transactionId.startsWith('mock_receipt_')) {
      if (Deno.env.get('ALLOW_MOCK_RECEIPTS') !== 'true') {
        console.warn('[Apple Receipt Verification] Mock transaction rejected - ALLOW_MOCK_RECEIPTS not enabled');
        return new Response(
          JSON.stringify({ error: 'Invalid transaction' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      console.log('[Apple Receipt Verification] Mock mode - auto-approving transaction');

      // Extract interval from mock id (format: mock_receipt_{interval}_{timestamp})
      const parts = transactionId.split('_');
      const interval = parts[2] || 'monthly';
      const productId = interval === 'yearly'
        ? 'com.being.subscription.yearly'
        : 'com.being.subscription.monthly';

      // Generate mock subscription data
      const now = deps.now();
      const expiresDate = interval === 'yearly'
        ? new Date(now + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
        : new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();  // 1 month

      const mockVerification: VerificationResult = {
        valid: true,
        subscriptionId: `mock_sub_${deps.now()}`,
        productId,
        expiresDate,
        isTrialPeriod: false,
        environment: 'Sandbox',
      };

      console.log('[Apple Receipt Verification] Mock verification successful:', mockVerification.subscriptionId);

      return new Response(
        JSON.stringify(mockVerification),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // An absent hint defaults to Production — see the header. This can only fail closed:
    // omitting the field cannot buy a sandbox lookup.
    const requestedEnvironment = body.environment ?? 'Production';

    let verification: VerificationResult;
    let signedTransactionInfo: string;
    try {
      const fetched = await deps.fetchSignedTransactionInfo(
        transactionId,
        requestedEnvironment,
        {
          issuerId: Deno.env.get('APPLE_ISSUER_ID') ?? '',
          keyId: Deno.env.get('APPLE_KEY_ID') ?? '',
          privateKeyPem: Deno.env.get('APPLE_PRIVATE_KEY') ?? '',
        },
      );
      signedTransactionInfo = fetched.signedTransactionInfo;

      // Apple signed it...
      const { payload } = await deps.verifyTransaction(signedTransactionInfo);
      // ...and Apple signed it for US (INFRA-449).
      const scope = assertAppleAppScope(payload, 'transaction');

      // ...and the host we asked is the one Apple says this transaction belongs to.
      // Without this, the client's environment hint would be load-bearing rather than
      // advisory, and a Sandbox claim would buy a free entitlement.
      if (scope.environment !== requestedEnvironment) {
        throw new Error(
          `Apple transaction environment "${scope.environment}" does not match the ` +
            `requested environment — refusing.`
        );
      }

      verification = parseTransaction(payload as AppleTransactionClaims, scope.environment, deps.now());
    } catch (error) {
      console.error('[Apple Receipt Verification] Verification failed:', error);

      await logSubscriptionEvent(supabase, {
        userId: authUid,
        subscriptionId: null,
        eventType: 'receipt_verification_failed',
        metadata: {
          platform: 'apple',
          reason: error instanceof Error ? error.name : 'unknown',
          timestamp: new Date(deps.now()).toISOString(),
        },
      });

      // The four upstream failure modes are kept distinct all the way to the status code.
      // Collapsing them is how a key-rotation outage would present as "every user suddenly
      // has an invalid receipt" — a 4xx blaming the client for our own misconfiguration.
      if (error instanceof TransactionNotFoundError || error instanceof InvalidTransactionIdError) {
        return new Response(
          JSON.stringify({ valid: false, error: 'No App Store transaction matches this identifier' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (error instanceof AppleUnavailableError) {
        return new Response(
          JSON.stringify({ valid: false, error: 'App Store is temporarily unavailable' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (error instanceof AppleAuthError || error instanceof AppStoreConnectConfigError) {
        return new Response(
          JSON.stringify({ valid: false, error: 'Receipt verification is misconfigured' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ valid: false, error: 'Failed to verify transaction with Apple' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (verification.valid) {
      // Update subscription in database
      try {
        await updateSubscription(supabase, authUid, verification, signedTransactionInfo, deps);
      } catch (err) {
        if (err instanceof ReceiptReplayError) {
          // Cross-identity replay: the receipt's transaction is bound to another
          // account. Reject without mutating state; audit the attempt.
          console.warn('[Apple Receipt Verification] Replay rejected for user:', authUid);
          await logSubscriptionEvent(supabase, {
            userId: authUid,
            subscriptionId: null,
            eventType: 'receipt_verification_failed',
            metadata: { platform: 'apple', reason: 'txn_bound_to_other_user', timestamp: new Date(deps.now()).toISOString() },
          });
          return new Response(
            JSON.stringify({ valid: false, error: 'Receipt already bound to another account' }),
            { status: 409, headers: { 'Content-Type': 'application/json' } }
          );
        }
        if (err instanceof InvalidTransactionIdentifierError) {
          // DEBUG-447 — Apple returned a verified transaction carrying no stable
          // originalTransactionId, so the replay guard cannot be evaluated. Fail closed:
          // no subscriptions row is written (the throw happens before the upsert).
          //
          // This branch is not optional dressing. Without it the throw falls through to the
          // generic outer catch and becomes an undifferentiated 500 with NO audit row —
          // technically fail-closed but indistinguishable from any other bug, which defeats
          // the point of failing closed at all.
          console.error('[Apple Receipt Verification] No stable transaction identifier for user:', authUid);
          await logSubscriptionEvent(supabase, {
            userId: authUid,
            subscriptionId: null,
            eventType: 'receipt_verification_failed',
            metadata: { platform: 'apple', reason: 'missing_txn_identifier', timestamp: new Date(deps.now()).toISOString() },
          });
          // 500, not 4xx: the caller's request was well-formed. What failed is that
          // verification produced no usable identifier — an upstream/internal condition,
          // matching the existing Apple-API-failure branch's framing.
          return new Response(
            JSON.stringify({ valid: false, error: 'Verification produced no stable transaction identifier' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }
        throw err;
      }

      console.log('[Apple Receipt Verification] Success:', verification.subscriptionId);

      return new Response(
        JSON.stringify(verification),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      console.log('[Apple Receipt Verification] Transaction not active:', verification.subscriptionId);

      // Log failed verification
      await logSubscriptionEvent(supabase, {
        userId: authUid,
        subscriptionId: verification.subscriptionId,
        eventType: 'receipt_verification_failed',
        metadata: {
          platform: 'apple',
          reason: 'expired_or_revoked',
          timestamp: new Date(deps.now()).toISOString(),
        },
      });

      return new Response(
        JSON.stringify({ ...verification, error: 'Subscription is expired or revoked' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('[Apple Receipt Verification] Unexpected error:', error);

    return new Response(
      JSON.stringify({
        valid: false,
        error: 'Internal server error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
