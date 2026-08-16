-- INFRA-379 — two grant defects found by deploying the ops dead-man's-switch.
--
-- Both were surfaced within ninety seconds of `grace-period-automation` being redeployed and
-- test-fired for the first time. Neither is a regression; both are original omissions that
-- had never been exercised because there are no live subscribers and no receipt has ever
-- been verified in production. That is the whole argument for the switch: a pipeline that is
-- merged, scheduled, and completely non-functional looks exactly like a healthy one until
-- something actually runs it.
--
-- ============================================================================
-- PART 1 — service_role could not read or write `subscriptions`
-- ============================================================================
--
-- THE DEFECT. `20260523000000_base_schema.sql` §16 granted `SELECT, INSERT, UPDATE ON
-- subscriptions TO authenticated` and never granted anything to `service_role`. The REVOKE in
-- `20260607120000_auth_uid_rls.sql` targeted `anon` only, so INFRA-260 did not cause this.
-- Live state before this migration: service_role held REFERENCES/TRIGGER/TRUNCATE and no DML.
--
-- WHAT IT BROKE. Every service_role edge function doing a direct `.from('subscriptions')`
-- failed with `permission denied for table subscriptions` — i.e. the entire server-side
-- subscription lifecycle:
--
--   verify-apple-receipt      .upsert()              INSERT + UPDATE
--   verify-google-receipt     .upsert()              INSERT + UPDATE
--   subscription-webhook      .update() + .select()  UPDATE + SELECT
--   grace-period-automation   .select()              SELECT
--
-- The SECURITY DEFINER RPCs (`expire_old_trials`, `expire_grace_periods`,
-- `log_subscription_event`, `get_expiring_*`) were unaffected and succeeded, which is why the
-- failure presented as a single partial error rather than a dead function. `delete-account` is
-- unaffected — it uses `auth.admin.deleteUser()` and touches no table directly.
--
-- WHY A TABLE GRANT AND NOT AN RPC. service_role's key lives only in Supabase Edge secrets and
-- is never client-exposed, and the role bypasses RLS as a role attribute regardless of grants —
-- so routing these calls through SECURITY DEFINER wrappers would add no RLS check that a direct
-- grant lacks. It would narrow the reachable surface (defense in depth), which is a legitimate
-- security-architecture call, but not a compliance requirement and not this migration's job.
-- The grant below mirrors the verb set §16 already chose for `authenticated` on this same
-- table, restoring the symmetry that was broken by omission.
--
-- NO DELETE. None of the four call sites deletes from `subscriptions`. DELETE would be a
-- standing privilege with no exercised caller, on a table holding encrypted receipt data —
-- declined deliberately, not overlooked.
--
-- SCOPED TO `subscriptions` ONLY. `users` and `encrypted_backups` carry the identical gap, but
-- no edge function touches either directly today (grepped: zero `.from('users')` /
-- `.from('encrypted_backups')` hits across all seven functions). Pre-granting them would be the
-- same over-grant this file just declined for DELETE — and `encrypted_backups` is the one table
-- the DPIA credits specifically because Supabase has no operational reason to touch its rows.
-- Tracked as a follow-up: grant the specific verbs a real call site needs, when one exists.

GRANT SELECT, INSERT, UPDATE ON public.subscriptions TO service_role;

-- ============================================================================
-- PART 2 — three cron-only SECURITY DEFINER functions were callable by anon
-- ============================================================================
--
-- THE DEFECT, and why the existing REVOKE did not prevent it.
-- `20260618000000` ends with `REVOKE ALL ON FUNCTION public.subscription_verification_watchdog()
-- FROM anon, authenticated`. That statement accomplishes nothing on its own: Postgres grants
-- EXECUTE to PUBLIC by default on every new function, and revoking from a *role* does not touch
-- the PUBLIC grant that role inherits. Verified in the live catalog after the push —
-- `proacl = {=X/postgres,postgres=X/postgres}`, where the leading `=X` IS PUBLIC holding
-- EXECUTE. `run_analytics_retention_prune()` and `cleanup_old_analytics()` showed
-- `proacl = null`, which is the same thing by default rather than by explicit entry.
--
-- WHY IT MATTERS HERE. PostgREST exposes every function in `public` at /rest/v1/rpc/<name>, and
-- the anon key is embedded in the shipped mobile app, so "PUBLIC can execute" means "anyone can
-- execute". Concretely, before this migration an unauthenticated caller could:
--   - POST /rest/v1/rpc/subscription_verification_watchdog  → send founder alert email on demand
--                                                             (mail-bomb + Resend quota burn)
--   - POST /rest/v1/rpc/run_analytics_retention_prune       → force the retention DELETE early
--   - POST /rest/v1/rpc/cleanup_old_analytics               → same
-- The deletion paths are bounded — they only remove rows already past the published §7.1/§7.2
-- windows, so the worst case is "deleted before 04:20 UTC rather than at it" — but the email
-- path is an unbounded outbound-send trigger, and none of the three has any legitimate caller
-- outside pg_cron.
--
-- SAFE BY CONSTRUCTION. pg_cron executes each job as its owner (`postgres`), which owns these
-- functions, and ownership carries EXECUTE independently of PUBLIC. Revoking PUBLIC therefore
-- cannot break the scheduled path. `run_analytics_retention_prune()` calls
-- `cleanup_old_analytics()` as a SECURITY DEFINER running as postgres, so that inner call is
-- likewise unaffected.
--
-- DELIBERATELY NOT FIXED HERE: `crisis_alert_watchdog()` (INFRA-219) has the identical
-- PUBLIC-EXECUTE exposure and is the more serious instance, since it triggers sends in the
-- CRISIS trust domain. It is untouched on purpose — it is pre-existing rather than introduced
-- by this deploy, and a crisis-path change belongs behind a `crisis` agent pass per the
-- Protected Paths table, not appended to an ops migration. Tracked in the same follow-up as the
-- `users`/`encrypted_backups` audit. Do not "tidy" it into this file.

REVOKE EXECUTE ON FUNCTION public.subscription_verification_watchdog() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.run_analytics_retention_prune()      FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_analytics()              FROM PUBLIC;

-- Belt and braces: explicit role-level revokes so the intent survives a future
-- `GRANT EXECUTE ... TO PUBLIC` restoring the default, and so `\df+` reads unambiguously.
REVOKE EXECUTE ON FUNCTION public.subscription_verification_watchdog() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.run_analytics_retention_prune()      FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_analytics()              FROM anon, authenticated;
