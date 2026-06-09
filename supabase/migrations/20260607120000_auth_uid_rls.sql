-- =====================================================
-- INFRA-260 — auth.uid() identity + RLS cutover (MAINT-226 T0b)
-- =====================================================
--
-- WHAT THIS DOES
-- Replaces the device-hash identity model (RLS keyed on the GUC
-- `current_setting('app.device_id', true)`, which the client never set → RLS
-- effectively unenforced at runtime) with a real Supabase anonymous-session
-- principal: `auth.uid()`. Every RLS policy is rewritten to key on `auth.uid()`
-- with `WITH CHECK` on writes so a client can no longer insert a row carrying a
-- forged `user_id`.
--
-- CLEAN CUTOVER (no backfill): verified against project yliycxslzdsgjtpxggtf on
-- 2026-06-07 — zero rows in users/encrypted_backups/analytics_events/
-- subscriptions/subscription_events and zero auth.users (pre-launch). There is
-- no device_id data to claim/migrate, so this simply drops the old model and
-- installs the new one.
--
-- IDENTITY: `public.users.id` becomes `auth.uid()` (FK → auth.users(id) ON DELETE
-- CASCADE). An AFTER INSERT trigger on auth.users auto-provisions the public.users
-- row on `signInAnonymously()`, so the client never inserts it and child-table FKs
-- always resolve. The device_id column + its identity function are removed.
--
-- LANDING (shared dev+prod DB): apply on a Supabase BRANCH first and run the RLS
-- negative suite there. Co-land with the session-enabled client build — once these
-- policies key on auth.uid(), any still-running sessionless client is denied. A
-- manual ROLLBACK block (non-destructive at zero rows) is at the bottom.
--
-- Idempotent: drops use IF EXISTS; policies are dropped-then-created; the FK and
-- trigger adds are guarded.

-- -----------------------------------------------------
-- 1. Drop the legacy device_id-GUC policies
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Users can only access own data" ON users;
DROP POLICY IF EXISTS "Users can only access own backups" ON encrypted_backups;
DROP POLICY IF EXISTS "Users can only access own analytics" ON analytics_events;
DROP POLICY IF EXISTS "Users can only access own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Users can only access own subscription events" ON subscription_events;

-- -----------------------------------------------------
-- 2. Retire the device_id identity (function + column)
-- -----------------------------------------------------
-- get_or_create_user(device_id) is obsolete: identity is now minted by Supabase
-- auth (signInAnonymously), not by a device-hash lookup.
DROP FUNCTION IF EXISTS get_or_create_user(TEXT);

-- users.id: drop the random default — the row id IS the auth principal, supplied
-- by the auth-user provisioning trigger (below). Drop the device_id column and
-- its constraints/index (clean cutover; no rows to preserve).
ALTER TABLE users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE users DROP CONSTRAINT IF EXISTS device_id_length;
ALTER TABLE users DROP CONSTRAINT IF EXISTS device_id_format;
DROP INDEX IF EXISTS idx_users_device_id;
ALTER TABLE users DROP COLUMN IF EXISTS device_id;

-- FK users.id → auth.users(id): binds the app principal to the auth principal and
-- gives CCPA/TDPSA/GDPR erasure a single cascade key (delete auth user → cascade).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_id_auth_fkey'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_id_auth_fkey
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- -----------------------------------------------------
-- 3. Auto-provision public.users on anonymous sign-in
-- -----------------------------------------------------
-- SECURITY DEFINER so it bypasses RLS to create the row; search_path pinned to
-- public to avoid hijack. ON CONFLICT DO NOTHING keeps it idempotent across
-- session restores.
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_auth_user();

-- -----------------------------------------------------
-- 4. New auth.uid() RLS policies — explicit verbs, WITH CHECK on writes
-- -----------------------------------------------------
-- users: the row id IS the principal.
CREATE POLICY users_select ON users
  FOR SELECT USING (id = auth.uid());
CREATE POLICY users_insert ON users
  FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY users_update ON users
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- encrypted_backups: client may read/write/delete only its own row (DELETE
-- supports re-backup + data-subject erasure).
CREATE POLICY backups_select ON encrypted_backups
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY backups_insert ON encrypted_backups
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY backups_update ON encrypted_backups
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY backups_delete ON encrypted_backups
  FOR DELETE USING (user_id = auth.uid());

-- analytics_events: SELECT + INSERT only. Client DELETE is intentionally withheld
-- to preserve crisis-audit integrity (INFRA-214); retention cleanup runs as the
-- service role, which bypasses RLS.
CREATE POLICY analytics_select ON analytics_events
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY analytics_insert ON analytics_events
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- subscriptions / subscription_events: own rows only. (Edge-function writes use
-- the service role and bypass RLS — the IAP replay guard is a UNIQUE constraint +
-- in-function ownership check, landed in PR2, not an RLS policy.)
CREATE POLICY subscriptions_select ON subscriptions
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY subscriptions_insert ON subscriptions
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY subscriptions_update ON subscriptions
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY subscription_events_select ON subscription_events
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY subscription_events_insert ON subscription_events
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------
-- 5. Grants — anon (unauthenticated) gets nothing; the anonymous SESSION is the
--    `authenticated` role and keeps the existing grants.
-- -----------------------------------------------------
REVOKE ALL PRIVILEGES ON users, encrypted_backups, analytics_events,
  subscriptions, subscription_events FROM anon;

-- =====================================================
-- ROLLBACK (manual — rehearse on the Supabase branch before applying up to the
-- shared DB). Non-destructive at zero rows. Uncomment + run to revert:
-- =====================================================
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- DROP FUNCTION IF EXISTS handle_new_auth_user();
-- DROP POLICY IF EXISTS users_select ON users;
-- DROP POLICY IF EXISTS users_insert ON users;
-- DROP POLICY IF EXISTS users_update ON users;
-- DROP POLICY IF EXISTS backups_select ON encrypted_backups;
-- DROP POLICY IF EXISTS backups_insert ON encrypted_backups;
-- DROP POLICY IF EXISTS backups_update ON encrypted_backups;
-- DROP POLICY IF EXISTS backups_delete ON encrypted_backups;
-- DROP POLICY IF EXISTS analytics_select ON analytics_events;
-- DROP POLICY IF EXISTS analytics_insert ON analytics_events;
-- DROP POLICY IF EXISTS subscriptions_select ON subscriptions;
-- DROP POLICY IF EXISTS subscriptions_insert ON subscriptions;
-- DROP POLICY IF EXISTS subscriptions_update ON subscriptions;
-- DROP POLICY IF EXISTS subscription_events_select ON subscription_events;
-- DROP POLICY IF EXISTS subscription_events_insert ON subscription_events;
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_id_auth_fkey;
-- ALTER TABLE users ADD COLUMN device_id TEXT;
-- ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid();
-- -- (restore device_id NOT NULL/UNIQUE/CHECKs + idx_users_device_id +
-- --  get_or_create_user + the 5 device_id-GUC policies from base_schema if needed)
