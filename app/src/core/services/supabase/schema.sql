-- =====================================================
-- SUPABASE SCHEMA FOR BEING MBCT APP
-- Encrypted Blob Storage with Privacy-Preserving Analytics
-- =====================================================

-- LEGAL COMPLIANCE:
-- - Being is a consumer wellness app under Palouse Labs LLC, NOT a HIPAA covered entity
--   (see docs/legal/regulatory-applicability.md).
-- - No sensitive wellness data stored server-side in plaintext (only client-encrypted blobs)
-- - Anonymous users only (no PII)
-- - Applicable regulations: FTC HBNR (16 CFR Part 318), state privacy laws
--   (CCPA / TDPSA / CPA / VCDPA / CTDPA), GDPR for EEA users

-- PERFORMANCE TARGETS:
-- - <200ms for backup operations
-- - <100ms for analytics inserts
-- - Support 5,000 users on free tier

-- =====================================================
-- 1. ANONYMOUS USERS TABLE
-- =====================================================

-- INFRA-260: identity is the Supabase anonymous session. `id` IS auth.uid()
-- (FK → auth.users), provisioned by the on_auth_user_created trigger below. No
-- device_id column — the device-hash model was retired in INFRA-260.
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_sync TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata for free tier monitoring
  backup_count INTEGER DEFAULT 0,
  total_backup_size_bytes BIGINT DEFAULT 0
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_last_sync ON users(last_sync);

-- =====================================================
-- 2. ENCRYPTED BACKUPS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS encrypted_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Encrypted data (AES-256-GCM encrypted JSON)
  encrypted_data TEXT NOT NULL,
  checksum TEXT NOT NULL, -- SHA256 for integrity verification

  -- Metadata
  version INTEGER DEFAULT 1,
  size_bytes INTEGER NOT NULL,
  compression_used BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT one_backup_per_user UNIQUE(user_id),
  CONSTRAINT checksum_format CHECK (checksum ~ '^[a-f0-9]{64}$'), -- SHA256 format
  CONSTRAINT size_limit CHECK (size_bytes <= 10485760), -- 10MB limit
  CONSTRAINT version_positive CHECK (version > 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_encrypted_backups_user_id ON encrypted_backups(user_id);
CREATE INDEX IF NOT EXISTS idx_encrypted_backups_created_at ON encrypted_backups(created_at);
CREATE INDEX IF NOT EXISTS idx_encrypted_backups_size ON encrypted_backups(size_bytes);

-- =====================================================
-- 3. ANALYTICS EVENTS TABLE (NO SENSITIVE WELLNESS DATA)
-- =====================================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Event information
  event_type TEXT NOT NULL,
  properties JSONB DEFAULT '{}',

  -- Privacy-preserving session tracking
  session_id TEXT NOT NULL, -- Daily-rotated session ID

  -- Timestamp (rounded to hour for privacy)
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT event_type_length CHECK (length(event_type) <= 50),
  CONSTRAINT session_id_format CHECK (session_id ~ '^session_[0-9]{4}-[0-9]{2}-[0-9]{2}_[a-z0-9]+$'),
  CONSTRAINT properties_size CHECK (pg_column_size(properties) <= 1024) -- 1KB limit
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_session_id ON analytics_events(session_id);

-- Partial index for common queries
CREATE INDEX IF NOT EXISTS idx_analytics_assessment_events
  ON analytics_events(created_at)
  WHERE event_type LIKE '%assessment%';

-- =====================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE encrypted_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- INFRA-260: RLS keys on auth.uid() (the anonymous-session principal), split into
-- explicit verbs with WITH CHECK on writes so a forged user_id cannot be inserted.
-- users: the row id IS the principal.
CREATE POLICY users_select ON users
  FOR SELECT USING (id = auth.uid());
CREATE POLICY users_insert ON users
  FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY users_update ON users
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- encrypted_backups: own row only; DELETE supports re-backup + data-subject erasure.
CREATE POLICY backups_select ON encrypted_backups
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY backups_insert ON encrypted_backups
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY backups_update ON encrypted_backups
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY backups_delete ON encrypted_backups
  FOR DELETE USING (user_id = auth.uid());

-- analytics_events: SELECT + INSERT only. Client DELETE withheld to preserve
-- crisis-audit integrity (INFRA-214); retention cleanup runs as the service role.
CREATE POLICY analytics_select ON analytics_events
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY analytics_insert ON analytics_events
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 5. FUNCTIONS FOR COMMON OPERATIONS
-- =====================================================

-- INFRA-260: auto-provision the public.users row when an anonymous auth user is
-- created (signInAnonymously), so child-table FKs to users(id) always resolve and
-- the client never inserts the row itself. SECURITY DEFINER to bypass RLS;
-- search_path pinned to public.
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

-- Function to update backup statistics
CREATE OR REPLACE FUNCTION update_backup_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update user statistics when backup is created/updated
  UPDATE users
  SET
    backup_count = backup_count + 1,
    total_backup_size_bytes = total_backup_size_bytes + NEW.size_bytes,
    last_sync = NOW()
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;

-- Trigger to automatically update backup statistics
DROP TRIGGER IF EXISTS update_backup_stats_trigger ON encrypted_backups;
CREATE TRIGGER update_backup_stats_trigger
  AFTER INSERT OR UPDATE ON encrypted_backups
  FOR EACH ROW
  EXECUTE FUNCTION update_backup_stats();

-- =====================================================
-- 6. FREE TIER MONITORING VIEWS
-- =====================================================

-- View for monitoring free tier usage
CREATE OR REPLACE VIEW free_tier_usage AS
SELECT
  COUNT(*) as total_users,
  SUM(backup_count) as total_backups,
  SUM(total_backup_size_bytes) as total_storage_bytes,
  AVG(total_backup_size_bytes) as avg_user_storage,
  COUNT(*) FILTER (WHERE last_sync > NOW() - INTERVAL '7 days') as active_users_7d,
  COUNT(*) FILTER (WHERE last_sync > NOW() - INTERVAL '1 day') as active_users_1d
FROM users;

-- View for analytics summary
CREATE OR REPLACE VIEW analytics_summary AS
SELECT
  event_type,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_id) as unique_users,
  DATE_TRUNC('day', created_at) as event_date
FROM analytics_events
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY event_type, DATE_TRUNC('day', created_at)
ORDER BY event_date DESC, event_count DESC;

-- =====================================================
-- 6b. CRISIS-DETECTION ANALYTICS VIEWS (FEAT-129)
-- =====================================================
-- Operator-only aggregate views over the vital-interests `crisis_detected` event
-- (routed to analytics_events by INFRA-214, GDPR Art. 6(1)(d)/9(2)(c) basis) for
-- release-health safety monitoring — "did the crisis safety net survive this release?"
--
-- PRIVACY (PII-free by construction; reviewed by crisis + compliance, FEAT-129):
--   Re-identification is managed by (1) severity-bucketing — no raw PHQ-9/GAD-7 scores
--   or Q9 values; (2) absence of quasi-identifiers — no device id, name, IP, geo;
--   (3) daily session rotation — session_id cannot be joined to a user identity; and
--   (4) operator-only access — these views are NOT granted to `authenticated`/`anon`
--   (service-role only, via the Supabase SQL editor / MCP), matching analytics_summary
--   and subscription_metrics. k-anonymity / differential privacy are NOT claimed; at
--   pre-launch scale such thresholds are not operationally meaningful, AND a safety
--   monitor must never suppress the FIRST detected crisis.
--
-- SAFETY INVARIANTS (do not "optimize" these away):
--   * NO `HAVING COUNT(*) >= N` / k-anon suppression — it would hide a single/rare crisis.
--   * `COUNT(*)` is the AUTHORITATIVE crisis count. `COUNT(DISTINCT session_id)` is a
--     secondary same-day episode proxy and UNDER-counts (daily-rotated session_id
--     collapses repeat same-day detections on one device); never treat it as the floor.
--   * Rows whose severity_bucket / assessment_type are the literal text 'undefined' are
--     NOT filtered. The inline PHQ-9 Q9 (suicidal-ideation) path currently emits
--     String(undefined) for those fields; dropping them would launder away the
--     highest-acuity detections. The breakdown groups by the raw value so the mis-tag is
--     VISIBLE. (Emit-path fix tracked as a follow-up; see crisis-analytics-runbook.md.)
--   * Monitoring-only. These views MUST NOT be referenced by any detection / 988 /
--     intervention code path, and are NOT the safety mechanism — the on-device crisis
--     audit log remains the accountability record.
--
-- No time-window filter is applied: retention (cleanup_old_analytics) already bounds the
-- rows, and a window would drop durably-queued events that flush late with an older
-- created_at (offline / first-run reconciliation).
--
-- DEBUG-340 CORRECTION: this comment used to say "the 90-day analytics retention ...
-- already bounds the rows". That was doubly wrong. (a) cleanup_old_analytics was never
-- cron.schedule'd, so nothing bounded these rows at all — real retention was INDEFINITE.
-- (b) It is no longer 90 days for this view's rows: crisis_detected is now retained for
-- 3 YEARS (privacy-policy §7.2) while every other event type is pruned at 90 days
-- (§7.1). So these views are bounded at 3 years, not 90 days, and that is deliberate —
-- they are the FEAT-129 operator aggregates and the alerter's dead-vs-quiet baseline,
-- both of which need history longer than a quarter.

-- (a) Detection mix — per-day breakdown by assessment, trigger, and severity bucket.
CREATE OR REPLACE VIEW crisis_detection_daily AS
SELECT
  DATE_TRUNC('day', created_at)                                       AS event_date,
  properties->>'assessment_type'                                      AS assessment_type,
  properties->>'trigger_type'                                         AS trigger_type,
  properties->>'severity_bucket'                                      AS severity_bucket,
  COUNT(*)                                                            AS detection_count,
  COUNT(*) FILTER (WHERE properties->>'intervention_surfaced' = 'true')
                                                                      AS intervention_surfaced_count
FROM analytics_events
WHERE event_type = 'crisis_detected'
GROUP BY 1, 2, 3, 4
ORDER BY event_date DESC, detection_count DESC;

-- (b) Detection volume — per-day total for spike/drift monitoring.
CREATE OR REPLACE VIEW crisis_detection_volume_daily AS
SELECT
  DATE_TRUNC('day', created_at)  AS event_date,
  COUNT(*)                       AS detection_count,
  COUNT(DISTINCT session_id)     AS distinct_sessions
FROM analytics_events
WHERE event_type = 'crisis_detected'
GROUP BY 1
ORDER BY event_date DESC;

-- (c) Liveness / reconciliation — supports the post-release check that distinguishes
--     "zero crises (healthy)" from "pipeline dead (no events landing)". A count alone
--     cannot tell these apart; the runbook pairs `last_detection_at` with an ACTIVE
--     synthetic-detection assertion in staging after each release.
CREATE OR REPLACE VIEW crisis_detection_liveness AS
SELECT
  COUNT(*)         AS total_detections_retained,
  MAX(created_at)  AS last_detection_at,
  MIN(created_at)  AS first_detection_retained_at
FROM analytics_events
WHERE event_type = 'crisis_detected';

-- Intentionally NO GRANT to authenticated/anon — operator/service-role access only.
COMMENT ON VIEW crisis_detection_daily IS
  'FEAT-129 operator-only aggregate: crisis_detected counts per day x assessment_type x trigger_type x severity_bucket. PII-free (bucketed counts; no user_id/session_id). No k-anon suppression — safety monitor must not hide the first crisis. severity_bucket=''undefined'' rows are surfaced, not filtered (inline-Q9 emit bug).';
COMMENT ON VIEW crisis_detection_volume_daily IS
  'FEAT-129 operator-only aggregate: per-day crisis_detected volume. COUNT(*) is authoritative; distinct_sessions under-counts (daily-rotated session_id).';
COMMENT ON VIEW crisis_detection_liveness IS
  'FEAT-129 operator-only: total retained crisis_detected + last_detection_at, for the post-release safety-pipeline liveness check (distinguish zero-crises from pipeline-dead).';

-- =====================================================
-- 7. DATA RETENTION POLICIES
-- =====================================================

-- Function to cleanup old analytics — TWO tiers (DEBUG-340).
-- 90 days for general analytics (privacy-policy §7.1); 3 years for crisis_detected
-- (privacy-policy §7.2). Before DEBUG-340 this deleted EVERYTHING at 90 days with no
-- carve-out, contradicting the published 3-year crisis promise — and it was never
-- cron.schedule'd, so nothing pruned at all and real server retention was INDEFINITE.
-- Both halves are fixed in supabase/migrations/20260806000000_analytics_retention_crisis_carveout.sql,
-- which also adds the schedule. Keep this mirror byte-identical to that function body.
CREATE OR REPLACE FUNCTION public.cleanup_old_analytics()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.analytics_events
  WHERE
    (event_type <> 'crisis_detected' AND created_at < NOW() - INTERVAL '90 days')
    OR
    (event_type = 'crisis_detected' AND created_at < NOW() - INTERVAL '3 years');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Function to cleanup orphaned backups
CREATE OR REPLACE FUNCTION cleanup_orphaned_backups()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete backups for users who haven't synced in 180 days
  DELETE FROM encrypted_backups
  WHERE user_id IN (
    SELECT id FROM users
    WHERE last_sync < NOW() - INTERVAL '180 days'
  );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- =====================================================
-- 8. PERFORMANCE OPTIMIZATION
-- =====================================================

-- Analyze tables for better query planning
ANALYZE users;
ANALYZE encrypted_backups;
ANALYZE analytics_events;

-- =====================================================
-- 9. GRANTS AND PERMISSIONS
-- =====================================================

-- Grant necessary permissions to authenticated role.
-- INFRA-260: the anonymous SESSION is the `authenticated` role; the bare `anon`
-- (unauthenticated) role gets nothing on user tables.
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON encrypted_backups TO authenticated;
GRANT SELECT, INSERT ON analytics_events TO authenticated;
REVOKE ALL PRIVILEGES ON users, encrypted_backups, analytics_events FROM anon;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- 10. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE users IS 'Anonymous users; id = auth.uid() (Supabase anonymous session). No PII stored.';
COMMENT ON TABLE encrypted_backups IS 'Client-side encrypted data backups. Server cannot decrypt contents.';
COMMENT ON TABLE analytics_events IS 'Privacy-preserving analytics with no sensitive wellness data. Severity buckets only.';

COMMENT ON COLUMN encrypted_backups.encrypted_data IS 'AES-256-GCM encrypted JSON blob. Server has no decryption keys.';
COMMENT ON COLUMN encrypted_backups.checksum IS 'SHA256 checksum for integrity verification.';
COMMENT ON COLUMN analytics_events.properties IS 'Anonymous event metadata. No scores or sensitive wellness data allowed.';

-- =====================================================
-- 11. SUBSCRIPTION TABLES (SENSITIVE WELLNESS DATA)
-- =====================================================

-- COMPLIANCE NOTE:
-- Subscription metadata is treated as sensitive wellness data because it correlates
-- with mental health activity: a user's subscription status combined with their
-- encrypted wellness data forms a sensitive-data set under state privacy laws
-- (TDPSA §541.001(b)(28), CPA §6-1-1303(24), VCDPA / CTDPA equivalents).
-- Therefore, the same security standards as encrypted_backups apply.

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Platform Information
  platform TEXT NOT NULL CHECK (platform IN ('apple', 'google', 'none')),
  platform_subscription_id TEXT, -- Opaque Apple/Google subscription ID
  platform_customer_id TEXT,     -- Apple/Google customer ID (if available)

  -- Subscription Details
  status TEXT NOT NULL CHECK (status IN ('trial', 'active', 'grace', 'expired', 'crisis_only')),
  tier TEXT NOT NULL DEFAULT 'standard' CHECK (tier IN ('standard')),
  interval TEXT NOT NULL CHECK (interval IN ('monthly', 'yearly')),

  -- Pricing (display only, NOT authoritative)
  price_usd DECIMAL(10, 2),
  currency TEXT DEFAULT 'USD',

  -- Timing
  trial_start_date TIMESTAMPTZ,
  trial_end_date TIMESTAMPTZ,
  subscription_start_date TIMESTAMPTZ,
  subscription_end_date TIMESTAMPTZ,
  grace_period_end TIMESTAMPTZ,

  -- Receipt Verification
  last_receipt_verified TIMESTAMPTZ,
  receipt_data_encrypted TEXT, -- AES-256-GCM-encrypted receipt for re-verification (INFRA-260 PR2)
  -- INFRA-260 PR2: replay binding. Holds Apple original_transaction_id / Google
  -- purchaseToken; UNIQUE per platform binds the txn to one auth.uid().
  original_transaction_id TEXT,
  receipt_hash TEXT, -- SHA-256 of the raw receipt/token (dedup; non-reversible)

  -- Payment History (minimal)
  last_payment_date TIMESTAMPTZ,
  payment_failure_count INTEGER DEFAULT 0,

  -- Feature Access (crisis ALWAYS true)
  crisis_access_enabled BOOLEAN DEFAULT TRUE NOT NULL CHECK (crisis_access_enabled = TRUE),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT one_subscription_per_user UNIQUE(user_id),
  CONSTRAINT trial_dates_valid CHECK (
    (trial_start_date IS NULL AND trial_end_date IS NULL) OR
    (trial_start_date IS NOT NULL AND trial_end_date IS NOT NULL AND trial_end_date > trial_start_date)
  ),
  CONSTRAINT subscription_dates_valid CHECK (
    (subscription_start_date IS NULL AND subscription_end_date IS NULL) OR
    (subscription_start_date IS NOT NULL AND subscription_end_date IS NOT NULL AND subscription_end_date > subscription_start_date)
  ),
  CONSTRAINT payment_failure_count_positive CHECK (payment_failure_count >= 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_platform ON subscriptions(platform);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_platform_subscription_id ON subscriptions(platform_subscription_id);
-- INFRA-260 PR2: one IAP transaction binds to one row (one auth.uid()) per platform.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_txn_per_platform
  ON subscriptions (platform, original_transaction_id)
  WHERE original_transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_end_date ON subscriptions(trial_end_date) WHERE status = 'trial';
CREATE INDEX IF NOT EXISTS idx_subscriptions_grace_period_end ON subscriptions(grace_period_end) WHERE status = 'grace';
CREATE INDEX IF NOT EXISTS idx_subscriptions_updated_at ON subscriptions(updated_at);

-- =====================================================
-- 12. SUBSCRIPTION EVENTS (AUDIT LOGGING)
-- =====================================================

CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,

  -- Event information
  event_type TEXT NOT NULL CHECK (event_type IN (
    'trial_started',
    'trial_ending_soon',
    'trial_ended',
    'subscription_started',
    'subscription_renewed',
    'subscription_cancelled',
    'payment_failed',
    'grace_period_started',
    'grace_period_ending',
    'subscription_expired',
    'subscription_restored',
    'receipt_verification_failed'
  )),

  -- Event metadata (JSONB for flexibility)
  metadata JSONB DEFAULT '{}',

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT metadata_size CHECK (pg_column_size(metadata) <= 2048) -- 2KB limit
);

-- Indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id ON subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_subscription_id ON subscription_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_event_type ON subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_events_created_at ON subscription_events(created_at);

-- =====================================================
-- 13. ROW LEVEL SECURITY (SUBSCRIPTIONS)
-- =====================================================

-- Enable RLS on subscription tables
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

-- INFRA-260: own rows only via auth.uid(). Edge-function writes use the service
-- role (bypass RLS); the IAP replay guard is a UNIQUE constraint + in-function
-- ownership check (PR2), not an RLS policy.
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

-- =====================================================
-- 14. SUBSCRIPTION FUNCTIONS
-- =====================================================

-- Function to update subscription updated_at timestamp
CREATE OR REPLACE FUNCTION update_subscription_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_subscription_timestamp_trigger ON subscriptions;
CREATE TRIGGER update_subscription_timestamp_trigger
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_timestamp();

-- Function to log subscription events
-- SECURITY: Ownership validation added per MAINT-116 security review (MED-01)
CREATE OR REPLACE FUNCTION log_subscription_event(
  p_user_id UUID,
  p_subscription_id UUID,
  p_event_type TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  event_uuid UUID;
  subscription_owner_id UUID;
BEGIN
  -- Input validation
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id cannot be NULL';
  END IF;

  IF p_event_type IS NULL OR length(p_event_type) = 0 THEN
    RAISE EXCEPTION 'event_type cannot be NULL or empty';
  END IF;

  -- Ownership validation: If subscription_id provided, verify it belongs to user
  IF p_subscription_id IS NOT NULL THEN
    SELECT user_id INTO subscription_owner_id
    FROM subscriptions
    WHERE id = p_subscription_id;

    IF subscription_owner_id IS NULL THEN
      RAISE EXCEPTION 'subscription_id % does not exist', p_subscription_id;
    END IF;

    IF subscription_owner_id != p_user_id THEN
      RAISE EXCEPTION 'subscription_id % does not belong to user_id %', p_subscription_id, p_user_id;
    END IF;
  END IF;

  -- Insert validated event
  INSERT INTO subscription_events (user_id, subscription_id, event_type, metadata)
  VALUES (p_user_id, p_subscription_id, p_event_type, p_metadata)
  RETURNING id INTO event_uuid;

  RETURN event_uuid;
END;
$$;

-- Function to check for expiring trials (for daily cron job)
CREATE OR REPLACE FUNCTION get_expiring_trials(days_until_expiry INTEGER DEFAULT 3)
RETURNS TABLE (
  user_id UUID,
  trial_end_date TIMESTAMPTZ,
  days_remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.user_id,
    s.trial_end_date,
    EXTRACT(DAY FROM (s.trial_end_date - NOW()))::INTEGER as days_remaining
  FROM subscriptions s
  WHERE s.status = 'trial'
    AND s.trial_end_date IS NOT NULL
    AND s.trial_end_date > NOW()
    AND s.trial_end_date <= NOW() + (days_until_expiry || ' days')::INTERVAL
  ORDER BY s.trial_end_date ASC;
END;
$$;

-- Function to check for expiring grace periods (for daily cron job)
CREATE OR REPLACE FUNCTION get_expiring_grace_periods(days_until_expiry INTEGER DEFAULT 2)
RETURNS TABLE (
  user_id UUID,
  grace_period_end TIMESTAMPTZ,
  days_remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.user_id,
    s.grace_period_end,
    EXTRACT(DAY FROM (s.grace_period_end - NOW()))::INTEGER as days_remaining
  FROM subscriptions s
  WHERE s.status = 'grace'
    AND s.grace_period_end IS NOT NULL
    AND s.grace_period_end > NOW()
    AND s.grace_period_end <= NOW() + (days_until_expiry || ' days')::INTERVAL
  ORDER BY s.grace_period_end ASC;
END;
$$;

-- Function to expire trials automatically (for daily cron job)
-- FIXED: Uses single CTE for both update and event logging
CREATE OR REPLACE FUNCTION expire_old_trials()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Update expired trials and log events in one operation
  WITH expired_trials AS (
    UPDATE subscriptions
    SET
      status = 'expired',
      updated_at = NOW()
    WHERE status = 'trial'
      AND trial_end_date IS NOT NULL
      AND trial_end_date <= NOW()
    RETURNING id, user_id
  ),
  logged_events AS (
    INSERT INTO subscription_events (user_id, subscription_id, event_type, metadata)
    SELECT
      et.user_id,
      et.id,
      'trial_ended',
      jsonb_build_object('expired_at', NOW())
    FROM expired_trials et
    RETURNING 1
  )
  SELECT COUNT(*) INTO updated_count FROM expired_trials;

  RETURN updated_count;
END;
$$;

-- Function to expire grace periods automatically (for daily cron job)
-- FIXED: Uses single CTE for both update and event logging
CREATE OR REPLACE FUNCTION expire_grace_periods()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Update expired grace periods and log events in one operation
  WITH expired_grace AS (
    UPDATE subscriptions
    SET
      status = 'expired',
      updated_at = NOW()
    WHERE status = 'grace'
      AND grace_period_end IS NOT NULL
      AND grace_period_end <= NOW()
    RETURNING id, user_id
  ),
  logged_events AS (
    INSERT INTO subscription_events (user_id, subscription_id, event_type, metadata)
    SELECT
      eg.user_id,
      eg.id,
      'subscription_expired',
      jsonb_build_object('expired_at', NOW(), 'previous_status', 'grace')
    FROM expired_grace eg
    RETURNING 1
  )
  SELECT COUNT(*) INTO updated_count FROM expired_grace;

  RETURN updated_count;
END;
$$;

-- =====================================================
-- 15. SUBSCRIPTION MONITORING VIEWS
-- =====================================================

-- View for subscription metrics
CREATE OR REPLACE VIEW subscription_metrics AS
SELECT
  COUNT(*) as total_subscriptions,
  COUNT(*) FILTER (WHERE status = 'trial') as trial_count,
  COUNT(*) FILTER (WHERE status = 'active') as active_count,
  COUNT(*) FILTER (WHERE status = 'grace') as grace_count,
  COUNT(*) FILTER (WHERE status = 'expired') as expired_count,
  COUNT(*) FILTER (WHERE status = 'crisis_only') as crisis_only_count,
  COUNT(*) FILTER (WHERE platform = 'apple') as apple_count,
  COUNT(*) FILTER (WHERE platform = 'google') as google_count,
  COUNT(*) FILTER (WHERE interval = 'monthly') as monthly_count,
  COUNT(*) FILTER (WHERE interval = 'yearly') as yearly_count,
  AVG(payment_failure_count) FILTER (WHERE status = 'grace') as avg_payment_failures
FROM subscriptions;

-- View for subscription events summary
CREATE OR REPLACE VIEW subscription_events_summary AS
SELECT
  event_type,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_id) as unique_users,
  DATE_TRUNC('day', created_at) as event_date
FROM subscription_events
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY event_type, DATE_TRUNC('day', created_at)
ORDER BY event_date DESC, event_count DESC;

-- =====================================================
-- 16. GRANTS AND PERMISSIONS (SUBSCRIPTIONS)
-- =====================================================

-- Grant necessary permissions to authenticated role
GRANT SELECT, INSERT, UPDATE ON subscriptions TO authenticated;
GRANT SELECT, INSERT ON subscription_events TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute on subscription functions
GRANT EXECUTE ON FUNCTION log_subscription_event(UUID, UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_expiring_trials(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_expiring_grace_periods(INTEGER) TO authenticated;

-- =====================================================
-- 17. COMMENTS (SUBSCRIPTIONS)
-- =====================================================

COMMENT ON TABLE subscriptions IS 'Subscription metadata (treated as sensitive wellness data due to correlation with mental health activity, per state privacy laws). IAP-only (Apple/Google).';
COMMENT ON TABLE subscription_events IS 'Audit log for subscription lifecycle events.';

COMMENT ON COLUMN subscriptions.platform_subscription_id IS 'Opaque reference to Apple/Google subscription. No payment data stored.';
COMMENT ON COLUMN subscriptions.receipt_data_encrypted IS 'Encrypted receipt for server-side re-verification via Edge Functions.';
COMMENT ON COLUMN subscriptions.crisis_access_enabled IS 'ALWAYS TRUE - crisis features never gated by subscription (legal requirement).';

-- =====================================================
-- SCHEMA COMPLETE (WITH SUBSCRIPTIONS)
-- =====================================================

-- This schema provides:
-- ✅ Anonymous user management
-- ✅ Encrypted backup storage
-- ✅ Privacy-preserving analytics
-- ✅ IAP subscription management (Apple/Google)
-- ✅ Subscription audit logging
-- ✅ Grace period automation
-- ✅ Crisis access guarantee (always accessible)
-- ✅ Free tier monitoring
-- ✅ Data retention policies
-- ✅ Performance optimization
-- ✅ Row Level Security
-- ✅ Sensitive wellness data protections (subscription metadata treated as sensitive data per state privacy laws)
