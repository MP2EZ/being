/**
 * delete-account request handler (MAINT-753). Import-safe: no serve(), no Deno.env, no
 * network at import - index.ts binds the real client, tests inject a fake.
 *
 * Contract, pinned by _tests/delete-account-handler.test.ts:
 * - identity is read INLINE from the gateway-verified JWT (getAuthUidFromRequest) and is
 *   deliberately NOT a dep: a test must not be able to inject an identity.
 * - the request body is never read; the caller can only delete itself.
 * - the client is built lazily, only after identity succeeds, inside the try.
 * - no log line carries the uid or upstream error text (DEBUG-761), pinned by
 *   _tests/delete-account-uid-log.test.ts.
 */

import { getAuthUidFromRequest } from '../_shared/auth.ts';

/** The one Supabase call this function makes, structurally typed so tests can fake it. */
export interface DeleteAccountClient {
  auth: {
    admin: {
      deleteUser(
        id: string,
        shouldSoftDelete: boolean,
      ): Promise<{ error: { message: string; name?: string; status?: number } | null }>;
    };
  };
}

export interface DeleteAccountDeps {
  createSupabase: () => DeleteAccountClient;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export async function handle(req: Request, deps: DeleteAccountDeps): Promise<Response> {
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
    const supabase = deps.createSupabase();

    // Hard delete (shouldSoftDelete=false): removes the auth.users row so the FK
    // cascade fires and no PII/wellness data remains for this uid.
    const { error } = await supabase.auth.admin.deleteUser(authUid, false);
    if (error) {
      // Never error.message: a network failure's text carries the request URL, which ends in
      // the uid being erased (DEBUG-761). The name/status is enough to triage.
      console.error('[delete-account] admin.deleteUser failed:', error.name, error.status);
      return new Response(JSON.stringify({ success: false, error: 'Deletion failed' }), {
        status: 500,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // No identifier: this line would outlive the erasure it reports (DEBUG-761).
    console.log('[delete-account] erased account + cascade');
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    // The name only - a thrown error's message and stack can carry the uid (DEBUG-761).
    console.error('[delete-account] unexpected error:', err instanceof Error ? err.name : typeof err);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
}
