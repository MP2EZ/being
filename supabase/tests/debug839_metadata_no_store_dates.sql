-- DEBUG-839 — subscription_events refuses a store date in metadata, from any writer.
--
-- The code-side pin (supabase/functions/_tests/subscription-audit-metadata-allowlist.test.ts)
-- covers edge-function writers. This covers what it cannot: SQL writers and SECURITY DEFINER
-- functions, through the subscription_events_metadata_no_store_dates CHECK (20261022000400).
--
-- Self-provisioning, never SKIPs, every write rolled back. ci.yml's `Supabase SQL suites` job
-- runs it on every PR.
--
-- HOW TO RUN (local stack only; it seeds auth.users):
--   supabase start && supabase db reset
--   docker exec -i supabase_db_$(basename "$PWD") psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/debug839_metadata_no_store_dates.sql
--   # exit 0 + "DEBUG-839 TESTS PASSED" = green.

\set ON_ERROR_STOP on

DO $$
DECLARE
  v_user uuid := '83900000-0000-0000-0000-000000000839';
  v_key  text;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
  VALUES (v_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          true, now(), now());

  -- Control: an ordinary audit row still lands.
  PERFORM public.log_subscription_event(v_user, NULL, 'subscription_renewed',
                                        jsonb_build_object('platform', 'apple'));
  IF (SELECT count(*) FROM public.subscription_events WHERE user_id = v_user) <> 1 THEN
    RAISE EXCEPTION 'DEBUG-839 FAIL: a clean audit row did not land (the refusal below would be vacuous)';
  END IF;
  RAISE NOTICE 'DEBUG-839 PASS: a clean audit row lands';

  FOREACH v_key IN ARRAY ARRAY['trial_end_date', 'grace_period_end'] LOOP
    BEGIN
      PERFORM public.log_subscription_event(v_user, NULL, 'subscription_renewed',
                                            jsonb_build_object(v_key, '2031-01-02T03:04:05Z'));
      RAISE EXCEPTION 'DEBUG-839 FAIL: a row carrying % was accepted', v_key;
    EXCEPTION WHEN check_violation THEN
      IF SQLERRM NOT LIKE '%subscription_events_metadata_no_store_dates%' THEN
        RAISE EXCEPTION 'DEBUG-839 FAIL: % refused by the wrong constraint: %', v_key, SQLERRM;
      END IF;
      RAISE NOTICE 'DEBUG-839 PASS: metadata carrying % refused by the store-date CHECK', v_key;
    END;
  END LOOP;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conrelid = 'public.subscription_events'::regclass
                    AND conname = 'subscription_events_metadata_no_store_dates' AND convalidated) THEN
    RAISE EXCEPTION 'DEBUG-839 FAIL: the store-date CHECK is missing or NOT VALID';
  END IF;

  RAISE EXCEPTION 'DEBUG839_ROLLBACK_SENTINEL';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'DEBUG839_ROLLBACK_SENTINEL' THEN
    RAISE NOTICE 'DEBUG-839: probe rows rolled back';
  ELSE
    RAISE;
  END IF;
END $$;

SELECT 'DEBUG-839 TESTS PASSED' AS result;
