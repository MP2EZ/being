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
 *
 * LAYOUT (MAINT-753): the request handling lives in handler.ts so tests can import it. This
 * file is the deploy entry point: it binds the real client by literal env name (the INFRA-442
 * deploy-drift reconcile matches on those literals) and nothing else.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { type DeleteAccountDeps, handle } from './handler.ts';

function productionDeps(): DeleteAccountDeps {
  return {
    createSupabase: () =>
      createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      ),
  };
}

serve((req) => handle(req, productionDeps()));
