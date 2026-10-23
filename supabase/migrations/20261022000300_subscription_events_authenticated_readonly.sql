-- DEBUG-841 — clients can no longer write public.subscription_events.
--
-- THE DEFECT. base_schema granted `authenticated` SELECT, INSERT on subscription_events, and
-- 20260607120000 added an own-row INSERT policy (`WITH CHECK (user_id = auth.uid())`). So any
-- client could insert arbitrary event_type/metadata rows on its own uid — forged entries in a
-- table that exists to be the subscription audit trail — and, since created_at is nullable, a
-- NULL or far-future created_at that no created_at-based prune (DEBUG-840) ever reaches.
-- Nothing in the client writes this table (grepped both app test roots and
-- supabase/functions, 2026-10-22: comments and the schema.sql mirror only).
--
-- WHAT CHANGES (compliance ruling, 2026-10-22):
--   - REVOKE INSERT, UPDATE, DELETE, TRUNCATE from anon and authenticated.
--   - DROP the subscription_events_insert policy.
--
-- WHY DROP THE POLICY, when DEBUG-751 (20261008000000) kept subscriptions' write policies.
-- That migration's reason is backwards. With RLS on and no INSERT policy, a future re-GRANT of
-- INSERT is still DENIED by RLS — dropping the policy is the stricter state, not the
-- permissive one. Leaving it would mean one accidental GRANT re-opens client writes; removing
-- it means that GRANT and a new policy are both needed.
--
-- WHAT STAYS. SELECT and subscription_events_select (the app reads its own rows). service_role
-- gets nothing new: every server writer — log_subscription_event, expire_old_trials,
-- expire_grace_periods, transfer_subscription — is SECURITY DEFINER owned by the table owner
-- and writes as that owner. REFERENCES / TRIGGER / MAINTAIN stay (platform default ACL; see
-- docs/security/supabase-rls-verification.md).
--
-- Pinned by supabase/tests/debug841_subscription_events_authenticated_readonly.sql.
--
-- ROLLBACK (manual, only if a client writer is found):
--   GRANT INSERT ON public.subscription_events TO authenticated;
--   CREATE POLICY subscription_events_insert ON public.subscription_events
--     FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.subscription_events FROM anon, authenticated;
DROP POLICY IF EXISTS subscription_events_insert ON public.subscription_events;

DO $$
DECLARE
  r text;
  f text;
  v_table_owner oid;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF has_any_column_privilege(r, 'public.subscription_events', 'INSERT')
       OR has_any_column_privilege(r, 'public.subscription_events', 'UPDATE')
       OR has_table_privilege(r, 'public.subscription_events', 'DELETE')
       OR has_table_privilege(r, 'public.subscription_events', 'TRUNCATE') THEN
      RAISE EXCEPTION 'DEBUG-841: % still holds a write privilege on subscription_events', r;
    END IF;
  END LOOP;

  IF NOT has_table_privilege('authenticated', 'public.subscription_events', 'SELECT') THEN
    RAISE EXCEPTION 'DEBUG-841: authenticated lost SELECT on subscription_events';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policy
              WHERE polrelid = 'public.subscription_events'::regclass AND polcmd IN ('a', '*')) THEN
    RAISE EXCEPTION 'DEBUG-841: an INSERT or ALL policy remains on subscription_events';
  END IF;

  SELECT relowner INTO v_table_owner FROM pg_class WHERE oid = 'public.subscription_events'::regclass;
  FOREACH f IN ARRAY ARRAY[
    'public.log_subscription_event(uuid, uuid, text, jsonb)',
    'public.expire_old_trials()',
    'public.expire_grace_periods()',
    'public.transfer_subscription(text, text, uuid, uuid, jsonb, text)'
  ] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_proc
                    WHERE oid = f::regprocedure AND prosecdef AND proowner = v_table_owner) THEN
      RAISE EXCEPTION 'DEBUG-841: % is not SECURITY DEFINER owned by the table owner; it would lose write access', f;
    END IF;
  END LOOP;

  IF NOT has_function_privilege('service_role', 'public.log_subscription_event(uuid, uuid, text, jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'DEBUG-841: service_role cannot EXECUTE log_subscription_event';
  END IF;
END $$;
