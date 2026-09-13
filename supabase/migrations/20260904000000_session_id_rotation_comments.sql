-- INFRA-568 — correct the deployed catalog comments about session_id.
--
-- COMMENT-ONLY. No DDL, no CHECK change, no view redefinition, no index rebuild.
-- Deliberately so: the client-side rotation this accompanies needs NO schema change,
-- because the rotated value is byte-shape-identical to today's and still satisfies
--   CONSTRAINT session_id_format CHECK (session_id ~ '^session_[0-9]{4}-[0-9]{2}-[0-9]{2}_[a-z0-9]+$')
-- which was verified byte-identical on the live project before this was written.
--
-- WHY A MIGRATION AT ALL. The false claims are not only in `--` prose that a reader of
-- the repo sees; two of them are DEPLOYED CATALOG OBJECTS that an operator reads in the
-- Supabase SQL editor. Editing the historical base_schema.sql in place changes the repo
-- and not the database, so the correction has to travel forward.
--
-- DEPLOY ORDER. Comments are inert to the client, so this is safe in either direction and
-- carries no client/schema skew risk. Push and verify it live (col_description /
-- obj_description) regardless — Supabase migrations do NOT auto-deploy on merge, and
-- `analytics_events` is the sink for the vital-interest `crisis_detected` event.
--
-- WHAT CHANGED, AND WHY THE UNDER-COUNT NOTE REVERSES. session_id used to be minted once
-- per process, so a device produced at most one id per calendar day and
-- COUNT(DISTINCT session_id) UNDER-counted same-day episodes. With INFRA-568's rotation
-- (UTC day boundary OR 30 minutes idle) one device can produce several ids in a day, so
-- the same expression now counts EPISODES more honestly while OVER-counting devices.
-- An operator reading the old comment would draw the wrong conclusion in the wrong
-- direction, which is the whole reason this is not deferred.
--
-- NOT claimed here: that session_id rotation makes FEAT-129 pillar 3 true. It does not.
-- analytics_events.user_id is NOT NULL REFERENCES users(id) and carries the persistent
-- INFRA-260 auth.uid() principal on the same row, so a session token cannot be the
-- anonymity control at table level. See docs/legal/lia-crisis-telemetry.md §2 and §4.

COMMENT ON COLUMN public.analytics_events.session_id IS
  'INFRA-568 bounded-lifetime session token. Rotates at the UTC day boundary AND after 30 minutes idle (the SINCE_LAST_ACTIVE_BUCKETS boundary INFRA-542 already uses), so it links only events within one engagement. Format pinned by session_id_format. NOT an anonymity control at table level — every row also carries the persistent user_id (auth.uid()); identity protection is the operator-only views plus RLS isolation and the non-enumerability of auth.uid(). Prior to INFRA-568 this was minted once per process, so its date could disagree with created_at.';

COMMENT ON VIEW public.crisis_detection_volume_daily IS
  'FEAT-129 operator-only aggregate: per-day crisis_detected volume. COUNT(*) is authoritative. distinct_sessions counts EPISODES, not devices — since INFRA-568 session_id rotates at the UTC day boundary and after 30 min idle, so one device can contribute several ids in a day. It over-counts devices; before INFRA-568 it under-counted episodes. Never treat it as a floor or as a device count.';

COMMENT ON VIEW public.crisis_detection_daily IS
  'FEAT-129 operator-only aggregate: crisis_detected counts per day x assessment_type x trigger_type x severity_bucket. PII-free (bucketed counts; selects neither user_id nor session_id). No k-anon suppression — a safety monitor must not hide the first crisis. severity_bucket=''undefined'' rows are surfaced, not filtered (inline-Q9 emit bug).';
