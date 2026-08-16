-- DEBUG-440 — `crisis_alert_watchdog()` is executable by anon. Close it.
--
-- THE DEFECT, and why the existing REVOKE did not prevent it.
-- `20260607000000_crisis_alert_cron.sql:154` already reads:
--
--     REVOKE ALL ON FUNCTION public.crisis_alert_watchdog() FROM anon, authenticated;
--
-- That statement is INERT. Postgres grants EXECUTE to PUBLIC by default on every new
-- function, and revoking from a *role* does not touch the PUBLIC grant that role inherits.
-- Verified in the live catalog before this migration: `proacl = {=X/postgres,postgres=X/postgres}`
-- — the leading `=X` IS PUBLIC holding EXECUTE — and `has_function_privilege('anon', …)` = true.
--
-- WHY THAT IS REACHABLE. PostgREST exposes every `public` function at /rest/v1/rpc/<name>
-- (`config.toml` schemas = ["public", …]), and the anon key ships inside the mobile binary.
-- "PUBLIC can execute" therefore means "anyone on the internet can execute".
--
-- WHAT THE EXPOSURE ACTUALLY IS — worse than "an attacker can send an email", and worth
-- stating precisely because the severity is state-dependent in an adversarially aligned way.
-- An anon call today sends NOTHING: `crisis_alert_runs` is healthy, so the 26h /
-- `IS DISTINCT FROM 'error'` guard early-returns before Vault is ever read. The mail path
-- arms itself exactly when the alerter goes UNHEALTHY — i.e. an anonymous caller can burn
-- the Resend quota on the founder's only crisis escalation channel *during the outage that
-- channel exists to report*.
--
-- SAFE BY CONSTRUCTION, and empirically so rather than only in theory.
-- `cron.job` jobid 2 (`crisis-alerter-watchdog`, `0 */6 * * *`) runs with `username='postgres'`,
-- and `postgres` OWNS this function, so the explicit `postgres=X/postgres` ACL entry survives a
-- PUBLIC revoke. The identical change already ran in production: INFRA-379 revoked PUBLIC from
-- `subscription_verification_watchdog()` on 2026-08-14, and jobid 8 logged four `succeeded`
-- runs on 2026-08-15 (latest 18:00 UTC) afterwards.
--
-- CALLER SWEEP (complete, before revoking): zero `.rpc(` call sites naming this function
-- anywhere in `app/src`, the seven edge functions, `supabase/tests/`, `scripts/` or
-- `.github/`; and `SELECT … FROM pg_proc WHERE prosrc ILIKE '%crisis_alert_watchdog%'`
-- returns empty, so no other function or trigger calls it. pg_cron as `postgres` is the sole
-- caller. `service_role` currently holds EXECUTE only by inheriting PUBLIC and will lose it —
-- that is CORRECT and matches the precedent functions. Do NOT add a compensating grant.
--
-- ⚠️  NEVER `DROP` THIS FUNCTION. `CREATE OR REPLACE` preserves the ACL, but a
-- drop-and-recreate silently resets EXECUTE to PUBLIC and reopens exactly this hole. Any
-- future migration that changes this function's signature MUST re-apply both REVOKEs below
-- in the same file.
--
-- SCOPE — crisis domain only, deliberately. Seven other `public` SECURITY DEFINER functions
-- carry the same live PUBLIC EXECUTE grant (`expire_old_trials`, `expire_grace_periods`,
-- `get_expiring_trials`, `get_expiring_grace_periods`, `log_subscription_event`,
-- `handle_new_auth_user`, `rls_auto_enable`). They share no table, Vault secret, cron job or
-- code path with this one and are independent single-statement revokes with no ordering
-- relationship, so they are NOT bundled here: a crisis-domain migration that can be reviewed,
-- applied and reverted without touching subscription or identity privileges is worth more
-- than the round-trip it saves. This is the reciprocal of the note at
-- `20260814000000_service_role_subscriptions_grant.sql:85`, which declined to tidy THIS
-- function into an ops migration for the same reason.
--
-- NO SOURCE PIN — deliberately, and this is the sharpest lesson of the defect. A test
-- asserting the REVOKE statement's presence in source would have been GREEN on the broken
-- state, because line 154 above has always contained one. Privilege is RUNTIME state; no
-- source assertion can reach it. The enforcement is the fail-closed assertion below (which
-- makes "applied" and "correct" the same event) plus the re-runnable
-- `supabase/tests/debug440_watchdog_privilege.sql`.

-- ---------------------------------------------------------------------------
-- The fix. PUBLIC first, then the roles.
-- ---------------------------------------------------------------------------
-- The role-level revoke is NOT redundant after the PUBLIC one: it is what survives a future
-- default-restoring `GRANT ... TO PUBLIC` and what makes `\df+` read unambiguously. Mirrors
-- the belt-and-braces pair in 20260814000000.
REVOKE EXECUTE ON FUNCTION public.crisis_alert_watchdog() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.crisis_alert_watchdog() FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- Fail-closed assertion — makes "applied" and "correct" the same event.
-- ---------------------------------------------------------------------------
-- RAISE EXCEPTION, not WARNING. This deliberately diverges from the `RAISE WARNING` at the
-- foot of 20260607000000: that one warns because `postgres` genuinely cannot revoke the
-- pg_net PUBLIC grant, so a failure there is not actionable. Here it can, so a failure is a
-- real failure and the migration must abort rather than report success on an open hole.
--
-- The second half is the one that earns its keep: it asserts we did not OVER-revoke and
-- sever the cron path in the same breath. A migration that closed the hole and silently
-- killed the crisis watchdog would be a strictly worse outcome than the defect.
DO $$
BEGIN
  IF has_function_privilege('anon', 'public.crisis_alert_watchdog()', 'EXECUTE') THEN
    RAISE EXCEPTION 'DEBUG-440 FAIL: anon still holds EXECUTE on crisis_alert_watchdog()';
  END IF;
  IF has_function_privilege('authenticated', 'public.crisis_alert_watchdog()', 'EXECUTE') THEN
    RAISE EXCEPTION 'DEBUG-440 FAIL: authenticated still holds EXECUTE on crisis_alert_watchdog()';
  END IF;
  IF NOT has_function_privilege('postgres', 'public.crisis_alert_watchdog()', 'EXECUTE') THEN
    RAISE EXCEPTION
      'DEBUG-440 FAIL: postgres LOST EXECUTE on crisis_alert_watchdog() — the pg_cron '
      'watchdog (cron.job jobid 2, runs as postgres) would silently stop escalating. '
      'This is worse than the defect being fixed; aborting.';
  END IF;
  RAISE NOTICE
    'DEBUG-440 PASS: crisis_alert_watchdog() — anon/authenticated denied, postgres retains '
    'EXECUTE (pg_cron path intact).';
END $$;

COMMENT ON FUNCTION public.crisis_alert_watchdog() IS
  'INFRA-219 dead-man''s-switch. Escalates via an independent direct Resend POST when the '
  'primary alerter has no clean run in 26h or its latest run errored. Shares Supabase''s '
  'failure domain — an external watcher (healthchecks.io) is the tracked follow-up. '
  'DEBUG-440: EXECUTE is revoked from PUBLIC/anon/authenticated; pg_cron reaches it as the '
  'owner (postgres). Do NOT drop-and-recreate this function — that resets EXECUTE to PUBLIC.';
