-- MAINT-441 service_role grant verification — proves the no-grant decision on
-- public.users and public.encrypted_backups is still in force, and that the
-- privilege query itself still works.
--
-- WHAT THIS EXISTS TO CATCH. The audit that produced this file found ZERO direct
-- `.from('users')` and ZERO `.from('encrypted_backups')` call sites across all seven
-- edge functions, so compliance ruled: no grant. A recorded ruling does not survive
-- contact with an eighth edge function. This file is what does.
--
-- The failure mode is specific and it has already happened once, on a different table:
-- service_role held only REFERENCES/TRIGGER/TRUNCATE on `subscriptions`, so every
-- service_role `.from('subscriptions')` failed `permission denied` — taking out receipt
-- verification, store webhooks and trial/grace expiry, INVISIBLY, because there are no
-- live subscribers to notice. INFRA-379 found it by accident. Absence of observed
-- breakage is not evidence here: public.users holds a handful of rows and
-- encrypted_backups holds zero, which is the same condition that hid the subscriptions
-- defect for months.
--
-- WHY NO GRANT, stated correctly. The reasoning in 20260814000000's prose and in
-- MAINT-441's own body cited DPIA §6.1 Scenario 3 / control 7 as crediting "no
-- operational reason to touch these rows". IT DOES NOT SAY THAT. Scenario 3 credits KEY
-- CUSTODY and blob opacity ("decryption key never leaves the device") and expressly holds
-- "even in the event of a full Supabase compromise"; control 12 in the same table credits
-- the delete-account cascade OVER those rows. The argument that actually holds:
-- DPIA control 6 credits auth.uid() RLS as a LIVE isolation control, and
-- `service_role.rolbypassrls` is true — so a service_role DML grant sits entirely OUTSIDE
-- the control the DPIA credits, converting a per-row privilege into an all-users one.
-- Do not restate the misquote.
--
-- ⚠️  THE TRAP, for whoever eventually adds a real call site. `public.update_backup_stats()`
-- is SECURITY INVOKER (prosecdef = false) and its body is `UPDATE users ...`, wired as
-- `AFTER INSERT OR UPDATE ON public.encrypted_backups`. Because it is INVOKER, that inner
-- UPDATE is permission-checked against the CALLING role. So granting service_role INSERT on
-- encrypted_backups and nothing else — the literal reading of "grant only the verbs the call
-- site exercises" — dies on the first insert with `permission denied for table users`. The
-- genuinely minimal grant for that call site is {INSERT on encrypted_backups} ∪ {UPDATE on
-- users}. Tests 3 and 4 pin the coupling so it cannot be rediscovered the expensive way.
--
-- NEVER grant DELETE on encrypted_backups. MAINT-347 deleted cleanup_orphaned_backups()
-- because a non-user-act server-side delete contradicts privacy-policy §7.3 ("Retained
-- until you disable backup or request deletion") — an FTC Act §5 promise. Lawful erasure is
-- the auth.users FK cascade and needs no table grant.
--
-- NEVER justify a service_role grant by symmetry with `authenticated`. INFRA-379 used that
-- reasoning ("mirrors the verb set §16 already chose"). It does not hold: `authenticated` is
-- RLS-confined to one row, service_role bypasses RLS across all rows, so identical verbs are
-- not identical privileges.
--
-- HOW TO RUN (local stack; no remote/paid resources):
--   supabase start && supabase db reset            # applies all migrations
--   docker exec -i supabase_db_$(basename "$PWD") psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/maint441_service_role_grants.sql
--   # exit 0 + "ALL MAINT-441 SERVICE_ROLE GRANT TESTS PASSED" = green; any RAISE = a regression.
--
-- This suite is READ-ONLY — it queries catalogs only, inserts nothing, and is safe to run
-- against the shared project as well as a local stack.
--
-- ⚠️  NOT YET A MERGE GATE. Since INFRA-782, ci.yml's `Supabase SQL suites` job runs every
-- file in this directory on each PR against a freshly reset local stack, but the step is
-- continue-on-error until INFRA-829 promotes it: a red suite leaves the check green. Read the
-- job log's `N/N suites passed, 0 SKIP` line, never the check colour. A fresh reset is not
-- the shared project either, so a prod-only grant drift still needs a run against it.
--
-- Last validated: 2026-10-22 in CI — INFRA-782 `Supabase SQL suites` job, fresh local reset,
--   run 39889958826 (15/15 suites passed, 0 SKIP).
-- Previously: 2026-08-16 against the shared project yliycxslzdsgjtpxggtf (catalog reads
-- only). Live state at that time matched every assertion below.

\set ON_ERROR_STOP on

-- ============ Test 1: service_role holds NO DML on public.users ============
DO $$
DECLARE
  verb TEXT;
BEGIN
  FOREACH verb IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE'] LOOP
    IF has_table_privilege('service_role', 'public.users', verb) THEN
      RAISE EXCEPTION
        'FAIL(1): service_role holds % on public.users. MAINT-441 recorded a deliberate '
        'no-grant decision: there are zero direct .from(''users'') call sites across the '
        'edge functions, and service_role bypasses RLS, so a DML grant here is an '
        'all-users privilege outside DPIA control 6. If a real call site now exists, that '
        'is fine — but update this test and record the call site, do not just widen the '
        'grant. Note INSERT and DELETE are never correct: rows are provisioned by the '
        'handle_new_auth_user trigger, and erasure is the auth.users FK cascade.', verb;
    END IF;
  END LOOP;
END $$;

-- ============ Test 2: service_role holds NO DML on public.encrypted_backups ============
DO $$
DECLARE
  verb TEXT;
BEGIN
  FOREACH verb IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE'] LOOP
    IF has_table_privilege('service_role', 'public.encrypted_backups', verb) THEN
      RAISE EXCEPTION
        'FAIL(2): service_role holds % on public.encrypted_backups. DPIA control 7 credits '
        'the invariant that ciphertext is only ever produced ON DEVICE, so a server write '
        'path is the capability to corrupt or substitute a user''s only restore point — '
        'INSERT/UPDATE there is a DPIA §1 material-change trigger requiring re-review '
        'BEFORE the grant, not after. DELETE is barred outright by privacy-policy §7.3 '
        '(see MAINT-347). If SELECT is genuinely needed, scope it to columns and exclude '
        'encrypted_data and checksum — size_bytes/version/created_at are already '
        'behavioural metadata.', verb;
    END IF;
  END LOOP;
END $$;

-- ============ Test 3: the update_backup_stats coupling still exists ============
-- If this function ever stops being SECURITY INVOKER, or stops touching users, the trap
-- documented in the header is gone and Test 4's warning becomes wrong. Fail loudly so the
-- header gets corrected rather than silently misleading the next reader.
DO $$
DECLARE
  is_definer BOOLEAN;
  body       TEXT;
BEGIN
  SELECT p.prosecdef, p.prosrc INTO is_definer, body
    FROM pg_proc p
   WHERE p.proname = 'update_backup_stats'
     AND p.pronamespace = 'public'::regnamespace;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'FAIL(3): public.update_backup_stats() no longer exists. The INVOKER/UPDATE-users '
      'coupling documented in this file''s header may no longer apply — re-derive it and '
      'correct the header before deleting this test.';
  END IF;

  IF is_definer THEN
    RAISE EXCEPTION
      'FAIL(3): public.update_backup_stats() is now SECURITY DEFINER. That REMOVES the '
      'coupling this file warns about (the inner UPDATE would run as the owner, not the '
      'caller). The change may be correct, but the header''s trap warning is now false and '
      'must be corrected in the same commit.';
  END IF;

  IF body !~* 'update\s+users' THEN
    RAISE EXCEPTION
      'FAIL(3): public.update_backup_stats() no longer UPDATEs users. Re-derive the minimal '
      'grant set in this file''s header; it is stated in terms of that UPDATE.';
  END IF;
END $$;

-- ============ Test 4: that function is still wired to encrypted_backups ============
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_trigger t
      JOIN pg_class  c ON c.oid = t.tgrelid
      JOIN pg_proc   p ON p.oid = t.tgfoid
     WHERE c.relname = 'encrypted_backups'
       AND c.relnamespace = 'public'::regnamespace
       AND p.proname = 'update_backup_stats'
       AND NOT t.tgisinternal
  ) THEN
    RAISE EXCEPTION
      'FAIL(4): update_backup_stats is no longer triggered from public.encrypted_backups. '
      'The coupling in this file''s header (an INSERT grant on encrypted_backups also '
      'requiring UPDATE on users) is stated in terms of that trigger — re-derive it.';
  END IF;
END $$;

-- ============ Test 5: ANTI-VACUITY — the privilege query still discriminates ============
-- Tests 1 and 2 are negative assertions, so they pass trivially if has_table_privilege
-- silently stops answering (a renamed role, a moved table, a typo'd schema qualifier). This
-- is the positive control: INFRA-379 deliberately granted service_role SELECT/INSERT/UPDATE
-- on subscriptions and deliberately withheld DELETE, so that one table exercises BOTH
-- directions of the same query. If this test fails, treat tests 1-2 as UNVERIFIED rather
-- than as passing.
DO $$
DECLARE
  verb TEXT;
BEGIN
  FOREACH verb IN ARRAY ARRAY['SELECT','INSERT','UPDATE'] LOOP
    IF NOT has_table_privilege('service_role', 'public.subscriptions', verb) THEN
      RAISE EXCEPTION
        'FAIL(5): service_role LACKS % on public.subscriptions, which INFRA-379 granted. '
        'Either that grant was reverted — re-breaking receipt verification, store webhooks '
        'and trial/grace expiry invisibly — or this file''s privilege query has stopped '
        'discriminating, in which case tests 1 and 2 above proved nothing.', verb;
    END IF;
  END LOOP;

  IF has_table_privilege('service_role', 'public.subscriptions', 'DELETE') THEN
    RAISE EXCEPTION
      'FAIL(5): service_role holds DELETE on public.subscriptions. INFRA-379 withheld it '
      'deliberately — no call site deletes — and its presence means someone applied a '
      'blanket grant. Narrow it back to SELECT, INSERT, UPDATE.';
  END IF;
END $$;

-- ============ Test 6: TRUNCATE/REFERENCES/TRIGGER are inherent — do not "fix" them ======
-- These are NOT granted by our migrations. pg_default_acl carries
-- `service_role=Dxtm/postgres` (D=TRUNCATE, x=REFERENCES, t=TRIGGER, m=MAINTAIN) with
-- grantor postgres, and the platform re-applies it at every CREATE TABLE. service_role is
-- also rolcanlogin=false (assumed via SET ROLE by PostgREST/GoTrue only) and PostgREST
-- exposes no TRUNCATE verb, so there is no request shape that reaches it. A two-table
-- REVOKE would create an undocumented exception that the next `supabase db push` silently
-- re-establishes for any new table — more likely to mislead than to protect. This test
-- asserts the CURRENT understanding so that if the platform default ever changes, the
-- reasoning above gets revisited rather than silently rotting.
DO $$
BEGIN
  IF NOT has_table_privilege('service_role', 'public.users', 'TRUNCATE') THEN
    RAISE EXCEPTION
      'FAIL(6): service_role no longer holds TRUNCATE on public.users. This file''s header '
      'argues TRUNCATE is an inherent platform default that is not worth revoking. If it '
      'was deliberately revoked, that argument is now stale — record the decision and '
      'update this test. If it vanished on its own, the platform default changed and the '
      'reasoning needs re-deriving.';
  END IF;
END $$;

-- ============ Test 7: server-internal tables — exact verbs, client roles locked out ======
-- DEBUG-795. webhook_replay_cache shipped with RLS on, no policies and NO grant, on the
-- false premise that "RLS with no policies" lets service_role through. It does not: the
-- GRANT is checked first, so every wasProcessed() failed `permission denied` and every
-- store notification died at the replay check — the INFRA-379 class again, latent because
-- there are no subscribers. Both server-internal tables are written only by edge functions
-- via service_role: SELECT + INSERT, never UPDATE (markProcessed is a plain insert that
-- swallows 23505) and never DELETE (the INFRA-846 prune runs as the table owner under
-- pg_cron, not as service_role). anon/authenticated hold NOTHING — not even the default
-- REFERENCES/TRIGGER/TRUNCATE: a TRUNCATE of the replay cache re-arms every captured
-- notification inside the 24h freshness window.
DO $$
DECLARE
  tbl  TEXT;
  verb TEXT;
  rol  TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['public.webhook_replay_cache','public.grace_period_automation_runs'] LOOP
    FOREACH verb IN ARRAY ARRAY['SELECT','INSERT'] LOOP
      IF NOT has_table_privilege('service_role', tbl, verb) THEN
        RAISE EXCEPTION
          'FAIL(7): service_role LACKS % on %. Its edge function selects and inserts '
          'here, so every call fails permission denied (DEBUG-795 / INFRA-266).', verb, tbl;
      END IF;
    END LOOP;

    FOREACH verb IN ARRAY ARRAY['UPDATE','DELETE'] LOOP
      IF has_table_privilege('service_role', tbl, verb) THEN
        RAISE EXCEPTION
          'FAIL(7): service_role holds % on %. No call site updates or deletes; '
          'narrow it back to SELECT, INSERT.', verb, tbl;
      END IF;
    END LOOP;

    FOREACH rol IN ARRAY ARRAY['anon','authenticated'] LOOP
      FOREACH verb IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] LOOP
        IF has_table_privilege(rol, tbl, verb) THEN
          RAISE EXCEPTION
            'FAIL(7): % holds % on %. This table is server-internal; clients get no '
            'privilege at all (REVOKE ALL ... FROM anon, authenticated).', rol, verb, tbl;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

SELECT 'ALL MAINT-441 SERVICE_ROLE GRANT TESTS PASSED' AS result;
