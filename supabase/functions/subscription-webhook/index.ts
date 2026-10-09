/**
 * SUBSCRIPTION WEBHOOK HANDLER EDGE FUNCTION
 * Handles server-to-server notifications from Apple and Google
 *
 * APPLE: App Store Server Notifications V2
 * - Subscription renewals
 * - Subscription cancellations
 * - Billing issues
 * - Grace period events
 *
 * GOOGLE: Real-time Developer Notifications
 * - Subscription renewals
 * - Subscription cancellations
 * - Billing retry events
 * - Grace period events
 *
 * SECURITY:
 * - Verifies webhook signatures
 * - Prevents replay attacks
 * - Idempotent processing
 *
 * PERFORMANCE:
 * - Target: <500ms for webhook processing
 * - Async database updates
 * - Event deduplication
 *
 * LAYOUT (DEBUG-739): the handlers live in handlers.ts and the type → status mapping in
 * notificationMapping.ts, so tests can import them. This file is the deploy entry point: it
 * binds the real verifiers and the client, and reads env by literal name (the INFRA-442
 * deploy-drift reconcile matches on those literals).
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { verifyAppleJWS } from '../_shared/verifyAppleJWS.ts';
import { verifyGoogleOIDC } from './verifyGoogleOIDC.ts';
import { createWebhookHandler } from './handlers.ts';

serve(
  createWebhookHandler({
    createSupabase: () =>
      createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      ),
    // Delegates to verifyAppleJWS, which anchors the x5c chain to the pinned Apple Root CA
    // - G3, verifies every link and the ES256 signature, and rejects stale or future-dated
    // payloads (audit SEC-01).
    verifyAppleSignature: async (signedPayload: string) =>
      (await verifyAppleJWS(signedPayload)).payload,
    verifyGoogleOIDC,
    readGoogleConfig: () => ({
      audience: Deno.env.get('GOOGLE_PUBSUB_AUDIENCE'),
      serviceAccount: Deno.env.get('GOOGLE_PUBSUB_SERVICE_ACCOUNT'),
    }),
    now: () => Date.now(),
  }),
);
