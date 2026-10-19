/**
 * GRACE PERIOD AUTOMATION EDGE FUNCTION — deploy entry point.
 *
 * LAYOUT (MAINT-770, MAINT-753 precedent): the request handling lives in handler.ts so tests
 * can import it. This file binds the real Supabase client (by literal env name - the INFRA-442
 * deploy-drift reconcile matches on those literals) and nothing else.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { type AutomationDeps, handle } from './handler.ts';

function productionDeps(): AutomationDeps {
  return {
    createSupabase: () =>
      createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      ),
  };
}

serve((req) => handle(req, productionDeps()));
