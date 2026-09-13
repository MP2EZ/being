-- DEBUG-440 (AC5) — five subscription-domain SECURITY DEFINER functions are executable by
-- anon. Two of them return other users' data. Close all five.
--
-- ============================================================================
-- HOW THIS WAS FOUND, AND WHY IT IS NOT THE DEFECT THE TICKET WAS FILED FOR
-- ============================================================================
-- DEBUG-440 was filed against `crisis_alert_watchdog()` alone (fixed in the sibling
-- migration 20260815000000). Its AC5 required enumerating every OTHER `public` SECURITY
-- DEFINER function carrying a live PUBLIC EXECUTE grant. That enumeration found eight, and
-- the crisis one — which only sends an email — turned out to be among the least severe.
--
-- ROOT CAUSE, identical for all of them: Postgres grants EXECUTE to PUBLIC by default on
-- every new function. PostgREST exposes every `public` function at /rest/v1/rpc/<name>, and
-- the anon key ships inside the mobile binary. So "PUBLIC can execute" means "anyone on the
-- internet can execute", and it has been true since 20260523000000_base_schema.sql — roughly
-- twelve weeks.
--
-- WHAT EACH ONE LETS AN UNAUTHENTICATED CALLER DO:
--
--   get_expiring_trials(int)         RETURNS TABLE(user_id, trial_end_date, days_remaining).
--   get_expiring_grace_periods(int)  No `auth.uid()` predicate; SECURITY DEFINER, so RLS is
--                                    bypassed. Pass a large `days_until_expiry` and enumerate
--                                    EVERY trialing/grace user's auth.uid() plus their exact
--                                    subscription timing. This is the highest-severity item.
--   expire_old_trials()              UPDATEs subscriptions + subscription_events across ALL
--   expire_grace_periods()           users. Correct scope for a batch cron job; wrong scope
--                                    for anyone else.
--   log_subscription_event(...)      `p_user_id` is caller-supplied and there is NO auth.uid()
--                                    check; the ownership check only fires when
--                                    `p_subscription_id IS NOT NULL`. Pass NULL and forge a
--                                    subscription_events row against any user_id — corrupting
--                                    the audit trail the DPIA credits as a control.
--
-- NOT A NEW DATA CLASSIFICATION. `docs/legal/dpia-sensitive-wellness-data.md` §3 has carried
-- category 7 — "Subscription status and transaction history" — as SENSITIVE since v1.0
-- (2026-05-24), on the rationale that correlation confirms ongoing engagement with mental
-- wellness self-monitoring. The two getters return exactly that category, keyed by user_id.
-- This sits inside a boundary already drawn, not adjacent to it.
--
-- CENSUS AT TIME OF FIX (the evidence-preservation step, taken prospectively): `subscriptions`
-- 0 rows, `subscription_events` 0 rows, `users` 2 rows. So the exposure returns and affects
-- nothing TODAY. That is what keeps this a defect rather than an incident — but note the
-- conclusion rests on the tables having been empty for the whole ~12-week window, which the
-- 24h log retention cannot confirm. Recorded as a stated limit, not glossed.
--
-- ============================================================================
-- ⚠️  THE ORDERING THAT MATTERS: service_role REACHES THESE ONLY VIA PUBLIC
-- ============================================================================
-- Verified live before writing this file, for all five:
--     has_function_privilege('service_role', …, 'EXECUTE') = true
--     proacl carries NO explicit service_role entry (three are outright NULL = defaults)
--     pg_has_role('service_role','postgres','USAGE')      = false
--     pg_has_role('service_role','authenticated','USAGE') = false
--
-- So service_role's EXECUTE is inherited from PUBLIC and nothing else. `grace-period-automation`
-- calls all five with the service_role key through PostgREST, and it is WORKING — its first
-- unattended scheduled run landed 2026-08-15 02:00:05 UTC, status 'ok'. **A REVOKE without the
-- matching GRANT would break that pipeline on the next 02:00 tick** — re-breaking, one day
-- later, precisely what INFRA-379 fixed. The GRANTs below are therefore not tidiness; they are
-- the reason this migration is safe. They are in the same file, hence the same transaction.
--
-- THIS IS WHY THE SIBLING CRISIS MIGRATION DELIBERATELY OMITS THE SAME GRANT, and the
-- difference is worth internalising rather than pattern-matching: `crisis_alert_watchdog()` is
-- invoked by pg_cron as `postgres`, which OWNS it, so ownership carries EXECUTE and losing the
-- PUBLIC-inherited service_role grant is correct there. These five are invoked by an EDGE
-- FUNCTION presenting the service_role key, which authenticates as the `service_role` role.
-- Identical SQL, opposite consequence, and nothing in the source of either function
-- distinguishes them — only knowing the caller does.
--
-- ============================================================================
-- SCOPE — what is deliberately NOT here
-- ============================================================================
--   • `crisis_alert_watchdog()` — crisis trust domain, fixed in 20260815000000 behind its own
--     `crisis` agent pass. Do NOT tidy it in here; that is the third time this boundary has
--     been drawn (20260814000000:85 declined it, 20260815000000 honours it).
--   • `handle_new_auth_user()` — included below as HYGIENE ONLY, not exposure. It RETURNS
--     trigger, and Postgres refuses to invoke a trigger-typed function outside trigger context
--     (ERROR 42809) regardless of grants, so it was never reachable. Verified, not assumed.
--   • `rls_auto_enable()` — NOT touched. Same 42809 immunity (RETURNS event_trigger), so no
--     exposure to close; and it appears in NO tracked migration, with a body matching the
--     standard Supabase auto-enable-RLS event trigger, i.e. a platform-managed object rather
--     than our DDL. A bare REVOKE here would fail `supabase db reset` on any fresh local stack
--     where nothing creates it, and guarding it would be ceremony for zero exposure on an
--     object we do not own. **Its untracked status is a real finding** — "the migrations
--     directory is ground truth for production" is currently false — and is filed separately
--     rather than silently absorbed into a grant fix.
--   • Mutable `search_path` on all five (an advisor WARN, and a genuine hijack surface for a
--     SECURITY DEFINER function) is NOT fixed here. It is a real defect and a separate one;
--     bundling an `ALTER FUNCTION … SET search_path` into a privilege migration would widen
--     the blast radius of a change whose safety argument is currently airtight. Filed.

-- ---------------------------------------------------------------------------
-- 1. Revoke the inherited PUBLIC grant, and the explicit `authenticated` grant
-- ---------------------------------------------------------------------------
-- The `authenticated` grant (base_schema.sql §16) is as wrong as the PUBLIC one and is not
-- an oversight to preserve: every Being user holds a free ANONYMOUS `authenticated` session
-- (INFRA-260), so granting it on the two getters is the identical cross-user exposure, merely
-- behind a sign-in step that costs an attacker nothing. Zero client call sites exist — every
-- real caller is a server-side edge function.
REVOKE EXECUTE ON FUNCTION public.expire_old_trials()                            FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_grace_periods()                         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_expiring_trials(integer)                   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_expiring_grace_periods(integer)            FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_subscription_event(uuid, uuid, text, jsonb) FROM PUBLIC, anon, authenticated;

-- Hygiene only — never reachable (RETURNS trigger ⇒ ERROR 42809 on direct invocation). The
-- `on_auth_user_created` trigger invokes it as owner and is unaffected by EXECUTE grants.
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user()                         FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Restore the ONE principal that legitimately calls them
-- ---------------------------------------------------------------------------
-- Explicit, so it no longer depends on an inherited PUBLIC grant that a future hardening pass
-- would remove again without noticing. `handle_new_auth_user` gets none — it has no RPC caller.
GRANT EXECUTE ON FUNCTION public.expire_old_trials()                             TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_grace_periods()                          TO service_role;
GRANT EXECUTE ON FUNCTION public.get_expiring_trials(integer)                    TO service_role;
GRANT EXECUTE ON FUNCTION public.get_expiring_grace_periods(integer)             TO service_role;
GRANT EXECUTE ON FUNCTION public.log_subscription_event(uuid, uuid, text, jsonb) TO service_role;

-- ---------------------------------------------------------------------------
-- 3. Fail-closed assertion — both directions
-- ---------------------------------------------------------------------------
-- RAISE EXCEPTION, not WARNING: applying this migration and leaving a hole open, or applying
-- it and severing the pipeline, must both abort rather than report success. The service_role
-- half is the one that would otherwise turn a security fix into an outage.
DO $$
DECLARE
  fn   text;
  fns  text[] := ARRAY[
    'public.expire_old_trials()',
    'public.expire_grace_periods()',
    'public.get_expiring_trials(integer)',
    'public.get_expiring_grace_periods(integer)',
    'public.log_subscription_event(uuid, uuid, text, jsonb)'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    IF has_function_privilege('anon', fn, 'EXECUTE') THEN
      RAISE EXCEPTION 'DEBUG-440 FAIL: anon still holds EXECUTE on %', fn;
    END IF;
    IF has_function_privilege('authenticated', fn, 'EXECUTE') THEN
      RAISE EXCEPTION 'DEBUG-440 FAIL: authenticated still holds EXECUTE on %', fn;
    END IF;
    IF NOT has_function_privilege('service_role', fn, 'EXECUTE') THEN
      RAISE EXCEPTION
        'DEBUG-440 FAIL: service_role LOST EXECUTE on % — grace-period-automation calls this '
        'with the service_role key and would break on the next 02:00 UTC tick. Aborting.', fn;
    END IF;
  END LOOP;

  IF has_function_privilege('anon', 'public.handle_new_auth_user()', 'EXECUTE') THEN
    RAISE EXCEPTION 'DEBUG-440 FAIL: anon still holds EXECUTE on public.handle_new_auth_user()';
  END IF;

  RAISE NOTICE
    'DEBUG-440 PASS: 5 subscription RPCs — anon/authenticated denied, service_role explicitly '
    'granted; handle_new_auth_user locked (hygiene).';
END $$;
