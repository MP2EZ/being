-- INFRA-782 — encode the service_role DML posture that MAINT-441 / INFRA-379 / DEBUG-795 /
-- INFRA-266 recorded, so a freshly reset database matches the shared project.
--
-- THE DIVERGENCE. The local image's pg_default_acl grants service_role arwdDxtm on every new
-- public table (measured on this PR's first `Supabase SQL suites` run: every one of the 96
-- service_role rows has grantor `postgres`). The shared project's default ACL grants only
-- Dxtm, so the no-DML decisions in docs/security/supabase-rls-verification.md hold there by
-- ABSENCE of a grant and nothing in the migration history says so. A fresh reset therefore
-- carries an all-users DML privilege those decisions declined, and maint441 fails on it.
--
-- WHAT IS REVOKED (compliance ruling, 2026-10-22):
--   users, encrypted_backups      — SELECT, INSERT, UPDATE, DELETE (MAINT-441: no call site;
--                                   service_role bypasses RLS, so DML is an all-users grant)
--   subscriptions                 — DELETE (INFRA-379 granted SELECT, INSERT, UPDATE only)
--   webhook_replay_cache,
--   grace_period_automation_runs  — UPDATE, DELETE (DEBUG-795 / INFRA-266 call sites select
--                                   and insert only; the prune crons run as postgres)
--
-- WHAT IS KEPT, deliberately:
--   - REFERENCES, TRIGGER, TRUNCATE, MAINTAIN everywhere. The platform default ACL re-applies
--     them at every CREATE TABLE, so revoking them here would be an undocumented exception the
--     next table silently lacks (rls-verification.md, MAINT-441 reasoning).
--   - subscriptions SELECT, INSERT, UPDATE; webhook_replay_cache and
--     grace_period_automation_runs SELECT, INSERT.
--   - pg_default_acl itself. No ALTER DEFAULT PRIVILEGES: that is platform-owned state.
--
-- Never REVOKE ALL: it would strip the kept verbs above.
--
-- On the shared project every REVOKE below is expected to be a no-op (the founder's read-only
-- pre-push query proves it). Pinned by supabase/tests/maint441_service_role_grants.sql, which
-- CI's `Supabase SQL suites` job runs against a fresh reset.

REVOKE SELECT, INSERT, UPDATE, DELETE ON public.users, public.encrypted_backups FROM service_role;
REVOKE DELETE ON public.subscriptions FROM service_role;
REVOKE UPDATE, DELETE ON public.webhook_replay_cache, public.grace_period_automation_runs
  FROM service_role;

-- Fail closed in both directions: a revoke that did not take, and a kept verb that went with it.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('public.users',                        'SELECT'), ('public.users',             'INSERT'),
      ('public.users',                        'UPDATE'), ('public.users',             'DELETE'),
      ('public.encrypted_backups',            'SELECT'), ('public.encrypted_backups', 'INSERT'),
      ('public.encrypted_backups',            'UPDATE'), ('public.encrypted_backups', 'DELETE'),
      ('public.subscriptions',                'DELETE'),
      ('public.webhook_replay_cache',         'UPDATE'), ('public.webhook_replay_cache', 'DELETE'),
      ('public.grace_period_automation_runs', 'UPDATE'),
      ('public.grace_period_automation_runs', 'DELETE')
    ) AS t(tbl, verb)
  LOOP
    IF has_table_privilege('service_role', r.tbl, r.verb) THEN
      RAISE EXCEPTION 'INFRA-782: service_role still holds % on % after the REVOKE', r.verb, r.tbl;
    END IF;
  END LOOP;

  FOR r IN
    SELECT * FROM (VALUES
      ('public.subscriptions',                'SELECT'), ('public.subscriptions', 'INSERT'),
      ('public.subscriptions',                'UPDATE'),
      ('public.webhook_replay_cache',         'SELECT'), ('public.webhook_replay_cache', 'INSERT'),
      ('public.grace_period_automation_runs', 'SELECT'),
      ('public.grace_period_automation_runs', 'INSERT'),
      ('public.users',                        'TRUNCATE'),
      ('public.encrypted_backups',            'TRUNCATE')
    ) AS t(tbl, verb)
  LOOP
    IF NOT has_table_privilege('service_role', r.tbl, r.verb) THEN
      RAISE EXCEPTION 'INFRA-782: service_role lost % on %; this migration must only narrow DML',
        r.verb, r.tbl;
    END IF;
  END LOOP;
END $$;
