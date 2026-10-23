-- INFRA-848 — count the anonymous identities a subscription transfer leaves behind (census
-- mode). This migration deletes nothing.
--
-- THE GAP. Nothing bounds an orphaned anonymous identity. GoTrue's 30-day anonymous cleanup runs
-- only with DB cleanup enabled (off on this project), and no Being job touches auth.users. After
-- transfer_subscription() moves a subscription to a new uid, the old uid keeps its auth.users
-- row, its sessions (latest IP address and user agent, DEBUG-850) and its tombstone for as long
-- as it exists, which today is forever (MAINT-847: oldest anonymous identity 2026-07-26).
--
-- SCOPE (founder decision at batch approval, 2026-10-23). The transfer-tombstone class only, in
-- CENSUS mode: each run writes candidate counts and would-cascade counts, never a uid, and
-- deletes nothing. Delete mode is written and pinned here but not enabled. Enabling it, the
-- inactive-identity class, client re-mint and the policy text are INFRA-852.
--
-- THE CLASS. A candidate meets EVERY leg, so a missing leg keeps the identity:
--   - auth.users.is_anonymous.
--   - Its subscriptions row has the shape transfer_subscription() writes (20261021000000,
--     20261022000600): status 'expired', every store column NULL, and created_at = updated_at =
--     a UTC midnight. An expired row the stores wrote keeps its original_transaction_id, so
--     it is never a candidate. UNIQUE (user_id) means no live, trial or grace row can sit beside
--     it; the predicate checks that anyway.
--   - The tombstone is older than inactivity_days.
--   - No encrypted_backups row. A backup holder keeps its data: that decision is INFRA-852's.
--   - Its last auth activity is older than inactivity_days. Last activity is the latest of
--     auth.users created_at and last_sign_in_at, and of auth.sessions created_at, updated_at
--     and refreshed_at, and of auth.refresh_tokens created_at and updated_at. GoTrue's refresh
--     never updates last_sign_in_at, so the session and token legs are what see a live install.
--     An identity with no dated activity is kept.
--
-- DELETE MODE (not enabled). Fails closed above max_per_run: deletes nothing and writes an
-- error row. Otherwise it locks the candidates, re-checks the whole predicate in a new
-- statement, and deletes from auth.users only. The FKs cascade: public.users (INFRA-260) and
-- through it every public child table, and GoTrue's sessions, refresh tokens and identities.
-- Child tables are never deleted directly.
--
-- LOGGING. One retention_prune_runs row per run: job 'orphaned-identity-census' (rows_deleted 0)
-- for census, so retention_prune_health never reads a census as a delete, and
-- 'orphaned-identity-prune' for delete. The error path records SQLSTATE and a fixed reason,
-- never SQLERRM, which can quote a key value. No uid appears in any column.
--
-- Operator-only throughout: the config table has RLS on, no policies, no client privilege and
-- no service_role DML. Both functions are revoked from PUBLIC, anon, authenticated and
-- service_role. pg_cron runs the job as the owner.
--
-- Idempotent: the table and its row are created if absent (an existing mode is never reset),
-- the functions are replaced, and the job is unscheduled before it is rescheduled.
-- Pinned by supabase/tests/infra848_orphaned_identity_prune.sql.

CREATE TABLE IF NOT EXISTS public.orphaned_identity_prune_config (
  id              boolean PRIMARY KEY DEFAULT true CHECK (id),
  mode            text    NOT NULL DEFAULT 'census' CHECK (mode IN ('off', 'census', 'delete')),
  inactivity_days integer NOT NULL DEFAULT 30 CHECK (inactivity_days >= 30),
  max_per_run     integer NOT NULL DEFAULT 25 CHECK (max_per_run BETWEEN 1 AND 100)
);
ALTER TABLE public.orphaned_identity_prune_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.orphaned_identity_prune_config FROM PUBLIC, anon, authenticated;
-- service_role loses DML only. Its TRUNCATE/REFERENCES/TRIGGER are the platform default (maint441
-- Test 6), and a truncated config reads as mode off, which deletes nothing.
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.orphaned_identity_prune_config FROM service_role;
INSERT INTO public.orphaned_identity_prune_config (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.orphaned_identity_prune_config IS
  'INFRA-848: operator-only settings for orphaned-identity-prune. mode off | census | delete; '
  'census counts and deletes nothing. Delete mode is enabled only by an INFRA-852 migration.';

-- The candidate set. Called twice by the prune: to count or lock, then to re-check.
CREATE OR REPLACE FUNCTION public.orphaned_identity_candidates(p_cutoff timestamptz)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT u.id
    FROM auth.users u
    JOIN public.subscriptions s ON s.user_id = u.id
   WHERE u.is_anonymous
     -- The tombstone, exactly as transfer_subscription() leaves it.
     AND s.status = 'expired'
     AND s.original_transaction_id IS NULL
     AND s.platform_subscription_id IS NULL
     AND s.platform_customer_id IS NULL
     AND s.receipt_hash IS NULL
     AND s.receipt_data_encrypted IS NULL
     AND s.trial_start_date IS NULL
     AND s.trial_end_date IS NULL
     AND s.subscription_start_date IS NULL
     AND s.subscription_end_date IS NULL
     AND s.grace_period_end IS NULL
     AND s.last_payment_date IS NULL
     AND s.last_receipt_verified IS NULL
     AND s.last_store_event_at IS NULL
     AND s.created_at = s.updated_at
     AND s.updated_at = date_trunc('day', s.updated_at, 'UTC')
     AND s.updated_at < p_cutoff
     AND NOT EXISTS (SELECT 1 FROM public.subscriptions l
                      WHERE l.user_id = u.id AND l.status IN ('active', 'trial', 'grace'))
     AND NOT EXISTS (SELECT 1 FROM public.encrypted_backups b WHERE b.user_id = u.id)
     AND (
       SELECT GREATEST(
         u.created_at, u.last_sign_in_at,
         (SELECT max(GREATEST(se.created_at, se.updated_at, se.refreshed_at AT TIME ZONE 'UTC'))
            FROM auth.sessions se WHERE se.user_id = u.id),
         (SELECT max(GREATEST(rt.created_at, rt.updated_at))
            FROM auth.refresh_tokens rt WHERE rt.user_id = u.id::text)
       )
     ) < p_cutoff
$$;
REVOKE EXECUTE ON FUNCTION public.orphaned_identity_candidates(timestamptz)
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION public.orphaned_identity_candidates(timestamptz) IS
  'INFRA-848: anonymous identities left behind by a subscription transfer and inactive since '
  'p_cutoff. Every leg must hold; a NULL last activity keeps the identity. Operator-only.';

CREATE OR REPLACE FUNCTION public.run_orphaned_identity_prune()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  started_at timestamptz := clock_timestamp();
  cfg        public.orphaned_identity_prune_config%ROWTYPE;
  v_job      text := 'orphaned-identity-census';
  v_cutoff   timestamptz;
  v_ids      uuid[];
  v_n        integer;
  n_deleted  integer;
BEGIN
  SELECT * INTO cfg FROM public.orphaned_identity_prune_config WHERE id;
  IF NOT FOUND OR cfg.mode = 'off' THEN
    RETURN;
  END IF;
  IF cfg.mode = 'delete' THEN
    v_job := 'orphaned-identity-prune';
  END IF;
  v_cutoff := now() - make_interval(days => cfg.inactivity_days);

  SELECT coalesce(array_agg(c), '{}') INTO v_ids FROM public.orphaned_identity_candidates(v_cutoff) c;
  v_n := cardinality(v_ids);

  IF cfg.mode = 'census' THEN
    -- Counts only: what a delete run would remove, child table by child table.
    INSERT INTO public.retention_prune_runs (job_name, status, rows_deleted, duration_ms, detail)
    VALUES (
      v_job, 'ok', 0,
      (EXTRACT(EPOCH FROM (clock_timestamp() - started_at)) * 1000)::integer,
      format('candidates=%s subscriptions=%s subscription_events=%s analytics_events=%s '
             'proof_failures=%s sessions=%s refresh_tokens=%s identities=%s',
        v_n,
        (SELECT count(*) FROM public.subscriptions WHERE user_id = ANY (v_ids)),
        (SELECT count(*) FROM public.subscription_events WHERE user_id = ANY (v_ids)),
        (SELECT count(*) FROM public.analytics_events WHERE user_id = ANY (v_ids)),
        (SELECT count(*) FROM public.subscription_transfer_proof_failures WHERE user_id = ANY (v_ids)),
        (SELECT count(*) FROM auth.sessions WHERE user_id = ANY (v_ids)),
        (SELECT count(*) FROM auth.refresh_tokens rt
           JOIN auth.sessions se ON se.id = rt.session_id WHERE se.user_id = ANY (v_ids)),
        (SELECT count(*) FROM auth.identities WHERE user_id = ANY (v_ids)))
    );
    RETURN;
  END IF;

  -- Delete mode. Fail closed: a surprising count is a question for the operator, not a batch.
  IF v_n > cfg.max_per_run THEN
    INSERT INTO public.retention_prune_runs (job_name, status, rows_deleted, duration_ms, detail)
    VALUES (
      v_job, 'error', 0,
      (EXTRACT(EPOCH FROM (clock_timestamp() - started_at)) * 1000)::integer,
      format('cap exceeded: candidates=%s max_per_run=%s; nothing deleted', v_n, cfg.max_per_run)
    );
    RETURN;
  END IF;

  PERFORM 1 FROM auth.users WHERE id = ANY (v_ids) ORDER BY id FOR UPDATE;
  -- Re-checked in a new statement: an identity active since the count is no longer a candidate.
  DELETE FROM auth.users
   WHERE id = ANY (v_ids)
     AND id IN (SELECT c FROM public.orphaned_identity_candidates(v_cutoff) c);
  GET DIAGNOSTICS n_deleted = ROW_COUNT;
  INSERT INTO public.retention_prune_runs (job_name, status, rows_deleted, duration_ms)
  VALUES (
    v_job, 'ok', n_deleted,
    (EXTRACT(EPOCH FROM (clock_timestamp() - started_at)) * 1000)::integer
  );
EXCEPTION WHEN OTHERS THEN
  -- ⚠️ No RAISE here: re-raising would roll back this heartbeat row too (see 20260808000000).
  -- A fixed reason, never SQLERRM: an FK or lock message can quote the uid it failed on.
  INSERT INTO public.retention_prune_runs (job_name, status, duration_ms, sqlstate, detail)
  VALUES (
    v_job, 'error',
    (EXTRACT(EPOCH FROM (clock_timestamp() - started_at)) * 1000)::integer,
    SQLSTATE, 'orphaned-identity run failed'
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.run_orphaned_identity_prune()
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION public.run_orphaned_identity_prune() IS
  'INFRA-848: census (default) counts transfer-orphaned anonymous identities; delete mode, not '
  'enabled, removes them through the auth.users cascade. One retention_prune_runs row per run, '
  'never a uid. Scheduled as orphaned-identity-prune.';

CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.unschedule('orphaned-identity-prune')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'orphaned-identity-prune');
SELECT cron.schedule(
  'orphaned-identity-prune',
  '35 4 * * *',
  $cron$ SELECT public.run_orphaned_identity_prune(); $cron$
);

-- Fail closed.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job
                  WHERE jobname = 'orphaned-identity-prune' AND schedule = '35 4 * * *') THEN
    RAISE EXCEPTION 'INFRA-848: orphaned-identity-prune is not scheduled';
  END IF;
  IF NOT (SELECT prosecdef FROM pg_proc
           WHERE oid = 'public.run_orphaned_identity_prune()'::regprocedure) THEN
    RAISE EXCEPTION 'INFRA-848: run_orphaned_identity_prune is not SECURITY DEFINER';
  END IF;
  IF (SELECT mode FROM public.orphaned_identity_prune_config WHERE id) = 'delete' THEN
    RAISE EXCEPTION 'INFRA-848: delete mode is enabled; this migration ships census only';
  END IF;
END $$;

-- =====================================================
-- ROLLBACK (manual). Census writes only heartbeat rows; nothing to restore.
-- =====================================================
-- SELECT cron.unschedule('orphaned-identity-prune');
-- DROP FUNCTION IF EXISTS public.run_orphaned_identity_prune();
-- DROP FUNCTION IF EXISTS public.orphaned_identity_candidates(timestamptz);
-- DROP TABLE IF EXISTS public.orphaned_identity_prune_config;
