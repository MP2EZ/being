/**
 * ACCOUNT DELETION EDGE FUNCTION (INFRA-260 PR3)
 *
 * Data-subject right to erasure (CCPA/CPRA, TDPSA, GDPR Art. 17). Binding all
 * server data to auth.uid() (INFRA-260) created the obligation to delete that
 * principal: this function hard-deletes the caller's auth.users row, which
 * cascades (ON DELETE CASCADE on public.users.id → encrypted_backups,
 * analytics_events, subscriptions, subscription_events) to remove every
 * uid-keyed row in one transaction.
 *
 * SECURITY:
 * - verify_jwt=true: the gateway verifies the JWT before invoke; we delete ONLY
 *   the caller's own uid (read from the verified `sub`), never a body-supplied id.
 * - Service-role client (admin API) — required to delete an auth user.
 *
 * NOTE: erasure also removes this user's crisis_detected telemetry rows. That is
 * correct for a right-to-erasure request; the operator-only aggregate views are
 * already de-identified (bucketed, session-rotated) and had counted the event.
 *
 * The client pairs a 200 here with a local wipe
 * (SecureStorageService.clearAllWellnessData({ deleteMasterKey: true })) and a
 * session sign-out, so no identity or wellness data survives on-device either.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getAuthUidFromRequest } from '../_shared/auth.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // Identity from the gateway-verified JWT — the caller can only delete itself.
  let authUid: string;
  try {
    authUid = getAuthUidFromRequest(req);
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unauthorized' }),
      { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Hard delete (shouldSoftDelete=false): removes the auth.users row so the FK
    // cascade fires and no PII/wellness data remains for this uid.
    const { error } = await supabase.auth.admin.deleteUser(authUid, false);
    if (error) {
      console.error('[delete-account] admin.deleteUser failed:', error.message);
      return new Response(JSON.stringify({ success: false, error: 'Deletion failed' }), {
        status: 500,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    console.log('[delete-account] erased account + cascade for user:', authUid);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[delete-account] unexpected error:', err);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
