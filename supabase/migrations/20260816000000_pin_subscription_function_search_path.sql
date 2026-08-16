-- DEBUG-455 — seven `public` functions run with a mutable `search_path`. Pin all seven.
--
-- ============================================================================
-- WHAT THIS IS, AND HOW BADLY IT IS *NOT* AN EMERGENCY
-- ============================================================================
-- Five of the seven are SECURITY DEFINER, so they execute as the owner. A function with a
-- mutable `search_path` resolves its unqualified object references against whatever path the
-- CALLER has set, so an attacker who can create an object in a schema that sorts earlier can
-- redirect an elevated-privilege code path. That is the classic CVE-2018-1058 shape.
--
-- Calibrated honestly rather than inflated: exploiting it here requires the ability to CREATE
-- an object in a schema that precedes `public` on the resolution path. Since DEBUG-440
-- (20260815010000) these five are executable ONLY by `service_role` — a trusted server-side
-- principal — and modern Postgres does not grant CREATE on `public` to PUBLIC. So this is
-- genuine defense-in-depth on an elevated path, not an open door. It is worth doing because
-- it is nearly free, and because every one of those mitigating assumptions is someone else's
-- future change away from being false.
--
-- ============================================================================
-- WHY `ALTER FUNCTION` AND NOT `CREATE OR REPLACE` — A DELIBERATE BREAK FROM PRECEDENT
-- ============================================================================
-- The two most recent identical fixes in this repo (20260806000000, 20260808000000) both used
-- `CREATE OR REPLACE FUNCTION` with `SET search_path` inline in the header and the full body
-- restated. This migration deliberately does NOT follow them.
--
-- `CREATE OR REPLACE` requires retyping every body verbatim. That is a transcription-drift
-- risk on five functions for zero benefit: the resulting `proconfig` is identical either way.
-- It is also exactly the blast-radius widening that 20260815010000 warned against ONE DAY
-- earlier, in its own words — bundling more than the change needs into a migration whose
-- safety argument is otherwise airtight.
--
-- `ALTER FUNCTION ... SET search_path` changes ONLY the configuration parameter. It cannot
-- touch the body and it cannot touch the ACL. That is the whole point.
--
-- ============================================================================
-- WHY `public, pg_temp` RESOLVES EVERYTHING (the enumeration, not an assertion)
-- ============================================================================
-- Pinning a path breaks a function if any unqualified reference in its body no longer
-- resolves. That is the ONE way this change can cause harm, so the enumeration is recorded
-- here rather than asserted. Every unqualified NON-BUILTIN reference across all five
-- SECURITY DEFINER bodies:
--
--   expire_old_trials()                     -> subscriptions, subscription_events
--   expire_grace_periods()                  -> subscriptions, subscription_events
--   get_expiring_trials(integer)            -> subscriptions
--   get_expiring_grace_periods(integer)     -> subscriptions
--   log_subscription_event(uuid,uuid,...)   -> subscriptions, subscription_events
--
-- Both tables are created in `public` by 20260523000000_base_schema.sql (:436 and :502), so
-- `public` resolves all of them. The remaining references are builtins (NOW(), EXTRACT,
-- length, jsonb_build_object, RAISE), which resolve via `pg_catalog` — implicitly searched
-- FIRST regardless of `search_path` — so they are unaffected by this change.
--
-- ON `pg_temp` BEING LAST: there is a school of thought that including `pg_temp` in a
-- SECURITY DEFINER path is itself the hazard. That is true only when `pg_temp` PRECEDES the
-- trusted schema, or when an unqualified reference has no match in an earlier schema and a
-- temp-schema squatter can supply one. Neither holds here — the enumeration above proves
-- every reference resolves inside `public` first — so `pg_temp` is inert for these functions,
-- not merely tolerated. `public, pg_temp` also matches cleanup_old_analytics() and
-- run_analytics_retention_prune() (20260806000000, 20260808000000).
--
-- ============================================================================
-- SCOPE: SEVEN, NOT FIVE (DEBUG-455 AC6)
-- ============================================================================
-- update_backup_stats() and update_subscription_timestamp() are SECURITY INVOKER triggers.
-- They run with the CALLER's privileges, so `search_path` manipulation cannot cross a
-- privilege boundary there — no escalation surface, advisor hygiene only. They are included
-- because the pin is free and it clears the standing `function_search_path_mutable` warning
-- for all seven at once, not because they carry the same risk.
--
-- NOTE on update_backup_stats(): it fires on `encrypted_backups` (the cloud-backup feature),
-- NOT on subscriptions, so it sits outside this ticket's titular domain.
-- 20260808000000_retention_prune_heartbeat.sql already carries an on-record rationale for
-- leaving it alone pending a hypothetical future dormancy-prune feature that would add
-- SECURITY DEFINER + a pinned path + an AFTER DELETE branch together. This migration does not
-- contradict that note: it changes no body and adds no privilege, so if that feature ever
-- lands it still makes every decision that note reserved.
--
-- DELIBERATELY NOT TOUCHED: crisis_alert_watchdog(), subscription_verification_watchdog()
-- (already pinned `public, net, vault, extensions` — they legitimately reach those schemas),
-- cleanup_old_analytics(), run_analytics_retention_prune() (already `public, pg_temp`),
-- handle_new_auth_user() and rls_auto_enable() (trigger/event-trigger typed — Postgres refuses
-- direct invocation, ERROR 42809, and rls_auto_enable is platform-managed; see
-- supabase/README.md "Objects present in production but created by no migration").
--
-- ZERO GRANT/REVOKE STATEMENTS IN THIS FILE, deliberately. DEBUG-440 set the correct
-- service_role grants one day prior and re-touching them here would risk re-breaking the
-- 02:00 UTC grace-period-automation pipeline for a reason unconnected to this ticket. The
-- assertion block below proves those grants are untouched rather than trusting it.
--
-- Idempotent: ALTER FUNCTION ... SET is a no-op when the value already matches; safe to re-run.

ALTER FUNCTION public.expire_old_trials()                                  SET search_path = public, pg_temp;
ALTER FUNCTION public.expire_grace_periods()                               SET search_path = public, pg_temp;
ALTER FUNCTION public.get_expiring_trials(integer)                         SET search_path = public, pg_temp;
ALTER FUNCTION public.get_expiring_grace_periods(integer)                  SET search_path = public, pg_temp;
ALTER FUNCTION public.log_subscription_event(uuid, uuid, text, jsonb)      SET search_path = public, pg_temp;

-- SECURITY INVOKER triggers — advisor hygiene, no escalation surface (AC6).
ALTER FUNCTION public.update_backup_stats()                                SET search_path = public, pg_temp;
ALTER FUNCTION public.update_subscription_timestamp()                      SET search_path = public, pg_temp;

-- ============================================================================
-- Fail-closed assertions. Two questions, because a migration that pins the path but silently
-- disturbs the ACL would be a worse outcome than the defect it fixes.
-- ============================================================================
DO $$
DECLARE
  fn        text;
  all_fns   text[] := ARRAY[
    'public.expire_old_trials()',
    'public.expire_grace_periods()',
    'public.get_expiring_trials(integer)',
    'public.get_expiring_grace_periods(integer)',
    'public.log_subscription_event(uuid, uuid, text, jsonb)',
    'public.update_backup_stats()',
    'public.update_subscription_timestamp()'
  ];
  secdef_fns text[] := ARRAY[
    'public.expire_old_trials()',
    'public.expire_grace_periods()',
    'public.get_expiring_trials(integer)',
    'public.get_expiring_grace_periods(integer)',
    'public.log_subscription_event(uuid, uuid, text, jsonb)'
  ];
  v_config  text[];
BEGIN
  -- (i) every one of the seven now carries the pinned path.
  FOREACH fn IN ARRAY all_fns LOOP
    SELECT p.proconfig INTO v_config
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.oid = fn::regprocedure;

    IF v_config IS NULL
       OR NOT EXISTS (SELECT 1 FROM unnest(v_config) c WHERE c = 'search_path=public, pg_temp')
    THEN
      RAISE EXCEPTION
        'DEBUG-455 FAIL: % did not take the pinned search_path (proconfig = %)',
        fn, COALESCE(array_to_string(v_config, ', '), '(null)');
    END IF;
  END LOOP;

  -- (ii) DEBUG-440's grants are UNCHANGED. ALTER FUNCTION ... SET cannot alter an ACL, so
  -- this can only fail if something other than this migration moved them — which is exactly
  -- the case worth aborting on, since grace-period-automation calls all five with the
  -- service_role key and would break on the next 02:00 UTC tick.
  FOREACH fn IN ARRAY secdef_fns LOOP
    IF has_function_privilege('anon', fn, 'EXECUTE') THEN
      RAISE EXCEPTION 'DEBUG-455 FAIL: anon holds EXECUTE on % — DEBUG-440 regressed', fn;
    END IF;
    IF has_function_privilege('authenticated', fn, 'EXECUTE') THEN
      RAISE EXCEPTION 'DEBUG-455 FAIL: authenticated holds EXECUTE on % — DEBUG-440 regressed', fn;
    END IF;
    IF NOT has_function_privilege('service_role', fn, 'EXECUTE') THEN
      RAISE EXCEPTION
        'DEBUG-455 FAIL: service_role LOST EXECUTE on % — grace-period-automation would break '
        'on the next 02:00 UTC tick. Aborting.', fn;
    END IF;
  END LOOP;

  RAISE NOTICE
    'DEBUG-455 PASS: 7 functions pinned to search_path=public, pg_temp; DEBUG-440 grants intact '
    '(anon/authenticated denied, service_role granted on all 5 SECDEF).';
END $$;
