/**
 * APPLE RECEIPT VERIFICATION EDGE FUNCTION
 * Server-side verification via the App Store Server API (INFRA-467 slice 3).
 *
 * MIGRATED OFF `verifyReceipt`. The legacy endpoint is deprecated by Apple and its
 * implementation here could not run at all: it required `APPLE_SHARED_SECRET`, which is
 * declared `deprecated` and "do NOT provision" in `supabase/deploy-manifest.json`, so
 * `verifyWithApple` threw on every call. Combined with zero rows in `subscriptions` and
 * `subscription_events`, no Apple receipt has ever verified successfully through this
 * function. There is therefore no old-client tail to drain and no dual path is kept: a
 * fallback branch that cannot execute is not a safety net, it is a misleading comment
 * with syntax.
 *
 * The flow is now: client sends a `transactionId` -> we ask Apple for a freshly-signed
 * transaction -> we verify that signature ourselves -> we trust the claims.
 *
 * SECURITY:
 * - Prevents client-side tampering with subscription status
 * - Every claim acted on comes from a payload signed by Apple and verified against the
 *   pinned Apple Root CA - G3 (`verifyAppleJWS`), then asserted to be scoped to THIS app
 *   (`assertAppleAppScope`, INFRA-449). Apple signing a payload and Apple signing a
 *   payload FOR US are different facts and both are required.
 * - Exactly one outbound call to Apple. The legacy 21007 production->sandbox retry is
 *   how a sandbox-minted transaction got accepted as a production one; it is gone.
 * - Transaction bound to one auth.uid(); cross-identity replay rejected.
 *
 * THE ENVIRONMENT CROSS-CHECK — the point of the whole design.
 * The client supplies `environment` to select which Apple host we ask. That value is
 * untrusted: a client can claim `Sandbox` and sandbox transactions are free to mint with
 * any sandbox Apple ID. What makes the hint safe is that we re-read the `environment`
 * claim from INSIDE Apple's signed response and reject any mismatch, so the hint can only
 * ever route the request, never grant anything. `assertAppleAppScope` deliberately does
 * not pin `environment` to Production (one Supabase project serves prod and dev, and edge
 * secrets are project-wide), which is exactly why this comparison has to happen here.
 *
 * An ABSENT hint defaults to Production, and that default is fail-closed rather than
 * permissive: omitting the field cannot get you a sandbox lookup, it gets you a
 * production lookup that will not find a sandbox transaction.
 *
 * COMPLIANCE:
 * - Subscription transaction data (sensitive under state privacy laws; not PHI —
 *   Being is not a HIPAA covered entity)
 * - The verified signed JWS is encrypted at rest (AES-256-GCM) and is what
 *   `receipt_hash` is computed over. It replaces the receipt blob deliberately: hashing
 *   a bare ~13-digit transaction integer would make the schema's "non-reversible" claim
 *   false, since that space is trivially enumerable.
 * - Audit logging for all verification attempts
 * - RLS ensures users only access their own data
 *
 * LAYOUT (MAINT-753): the request handling lives in handler.ts so tests can import it. This
 * file is the deploy entry point: it binds the real client (by literal env name - the INFRA-442
 * deploy-drift reconcile matches on those literals), the real App Store Server API call and the
 * real signature verification, and nothing else. `verifyTransaction` passes ONE argument on
 * purpose: verifyAppleJWS's second parameter is a test seam (trust anchor, clock) that no
 * production call site may reach (_tests/verifier-seam-call-sites.test.ts).
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { verifyAppleJWS } from '../_shared/verifyAppleJWS.ts';
import { fetchSignedTransactionInfo } from '../_shared/appStoreServerApi.ts';
import { type AppleReceiptDeps, handle } from './handler.ts';

function productionDeps(): AppleReceiptDeps {
  return {
    createSupabase: () =>
      createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      ),
    fetchSignedTransactionInfo,
    verifyTransaction: (jws) => verifyAppleJWS(jws),
    now: () => Date.now(),
  };
}

serve((req) => handle(req, productionDeps()));
