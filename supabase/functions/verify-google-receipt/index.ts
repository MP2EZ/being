/**
 * GOOGLE PLAY RECEIPT VERIFICATION EDGE FUNCTION
 * Server-side receipt verification via Google Play Developer API
 *
 * SECURITY:
 * - Prevents client-side tampering with subscription status
 * - Validates purchase tokens with Google's servers
 * - Stores encrypted receipt data for re-verification
 *
 * PERFORMANCE:
 * - Target: <2s for receipt verification
 * - Retries on network failures (3 attempts)
 * - Caches valid receipts for 24 hours
 *
 * COMPLIANCE:
 * - Subscription transaction history (sensitive under state privacy laws; not PHI —
 *   Being is not a HIPAA covered entity)
 * - Purchase token encrypted at rest (AES-256-GCM); bound to one auth.uid()
 * - Audit logging for all verification attempts
 * - RLS ensures users only access their own data
 *
 * LAYOUT (MAINT-753): the request handling lives in handler.ts so tests can import it. This
 * file is the deploy entry point: it binds the real client (by literal env name - the INFRA-442
 * deploy-drift reconcile matches on those literals) and the real Google calls, and nothing else.
 * The GOOGLE_SERVICE_ACCOUNT secret is still read, literally, inside handler.ts's request path.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import {
  fetchSubscriptionPurchase,
  getGoogleAccessToken,
} from '../_shared/googlePlayDeveloperApi.ts';
import { type GoogleReceiptDeps, handle } from './handler.ts';

function productionDeps(): GoogleReceiptDeps {
  return {
    createSupabase: () =>
      createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      ),
    getGoogleAccessToken,
    fetchSubscriptionPurchase,
    now: () => Date.now(),
  };
}

serve((req) => handle(req, productionDeps()));
