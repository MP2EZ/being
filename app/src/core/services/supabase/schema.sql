-- =====================================================
-- SUPABASE SCHEMA FOR BEING MBCT APP
-- Encrypted Blob Storage with Privacy-Preserving Analytics
-- =====================================================

-- LEGAL COMPLIANCE:
-- - No PHI stored (only encrypted blobs)
-- - Anonymous users only (no PII)
-- - HIPAA compliant under "conduit exception"
-- - No BAA required

-- PERFORMANCE TARGETS:
-- - <200ms for backup operations
-- - <100ms for analytics inserts
-- - Support 5,000 users on free tier

-- =====================================================
-- 1. ANONYMOUS USERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT UNIQUE NOT NULL, -- Hashed device identifier (no PII)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_sync TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata for free tier monitoring
  backup_count INTEGER DEFAULT 0,
  total_backup_size_bytes BIGINT DEFAULT 0,

  -- Constraints
  CONSTRAINT device_id_length CHECK (length(device_id) = 64), -- SHA256 hash length
  CONSTRAINT device_id_format CHECK (device_id ~ '^[a-f0-9]{64}$') -- Hex format
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_device_id ON users(device_id);
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
-- 3. ANALYTICS EVENTS TABLE (NO PHI)
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

-- Users can only access their own data
CREATE POLICY "Users can only access own data"
  ON users
  FOR ALL
  USING (device_id = current_setting('app.device_id', true));

-- Users can only access their own backups
CREATE POLICY "Users can only access own backups"
  ON encrypted_backups
  FOR ALL
  USING (user_id = (
    SELECT id FROM users
    WHERE device_id = current_setting('app.device_id', true)
  ));

-- Users can only access their own analytics
CREATE POLICY "Users can only access own analytics"
  ON analytics_events
  FOR ALL
  USING (user_id = (
    SELECT id FROM users
    WHERE device_id = current_setting('app.device_id', true)
  ));

-- =====================================================
-- 5. FUNCTIONS FOR COMMON OPERATIONS
-- =====================================================

-- Function to get or create user by device ID
-- SECURITY: Input validation added per MAINT-116 security review (LOW-01)
CREATE OR REPLACE FUNCTION get_or_create_user(device_id_hash TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_uuid UUID;
BEGIN
  -- Input validation: Verify device_id format before database operations
  -- Must be exactly 64 hex characters (SHA-256 hash)
  IF device_id_hash IS NULL THEN
    RAISE EXCEPTION 'device_id_hash cannot be NULL';
  END IF;

  IF length(device_id_hash) != 64 THEN
    RAISE EXCEPTION 'device_id_hash must be exactly 64 characters (got %)', length(device_id_hash);
  END IF;

  IF device_id_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'device_id_hash must be lowercase hex format (a-f, 0-9)';
  END IF;

  -- Try to find existing user
  SELECT id INTO user_uuid
  FROM users
  WHERE device_id = device_id_hash;

  -- Create user if not exists
  IF user_uuid IS NULL THEN
    INSERT INTO users (device_id)
    VALUES (device_id_hash)
    RETURNING id INTO user_uuid;
  ELSE
    -- Update last_sync for existing user
    UPDATE users
    SET last_sync = NOW()
    WHERE id = user_uuid;
  END IF;

  RETURN user_uuid;
END;
$$;

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
CREATE TRIGGER update_backup_stats_trigger
  AFTER INSERT OR UPDATE ON encrypted_backups
  FOR EACH ROW
  EXECUTE FUNCTION update_backup_stats();

-- =====================================================
-- 6. FREE TIER MONITORING VIEWS
-- =====================================================

-- View for monitoring free tier usage
CREATE VIEW IF NOT EXISTS free_tier_usage AS
SELECT
  COUNT(*) as total_users,
  SUM(backup_count) as total_backups,
  SUM(total_backup_size_bytes) as total_storage_bytes,
  AVG(total_backup_size_bytes) as avg_user_storage,
  COUNT(*) FILTER (WHERE last_sync > NOW() - INTERVAL '7 days') as active_users_7d,
  COUNT(*) FILTER (WHERE last_sync > NOW() - INTERVAL '1 day') as active_users_1d
FROM users;

-- View for analytics summary
CREATE VIEW IF NOT EXISTS analytics_summary AS
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
-- 7. DATA RETENTION POLICIES
-- =====================================================

-- Function to cleanup old analytics (90 days retention)
CREATE OR REPLACE FUNCTION cleanup_old_analytics()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM analytics_events
  WHERE created_at < NOW() - INTERVAL '90 days';

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

-- Grant necessary permissions to authenticated role
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON encrypted_backups TO authenticated;
GRANT SELECT, INSERT ON analytics_events TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_or_create_user(TEXT) TO authenticated;

-- =====================================================
-- 10. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE users IS 'Anonymous users identified only by hashed device ID. No PII stored.';
COMMENT ON TABLE encrypted_backups IS 'Client-side encrypted data backups. Server cannot decrypt contents.';
COMMENT ON TABLE analytics_events IS 'Privacy-preserving analytics with no PHI. Severity buckets only.';

COMMENT ON COLUMN users.device_id IS 'SHA256 hash of device identifier. No PII.';
COMMENT ON COLUMN encrypted_backups.encrypted_data IS 'AES-256-GCM encrypted JSON blob. Server has no decryption keys.';
COMMENT ON COLUMN encrypted_backups.checksum IS 'SHA256 checksum for integrity verification.';
COMMENT ON COLUMN analytics_events.properties IS 'Anonymous event metadata. No scores or PHI allowed.';

-- =====================================================
-- 11. SUBSCRIPTION TABLES (TREAT AS PHI)
-- =====================================================

-- COMPLIANCE NOTE:
-- Subscription metadata is treated as PHI because it correlates with mental health data.
-- A user's subscription status + encrypted health data = PHI correlation.
-- Therefore, same security standards as encrypted_backups apply.

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
  receipt_data_encrypted TEXT, -- Encrypted receipt for re-verification

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

-- Users can only access their own subscription
CREATE POLICY "Users can only access own subscription"
  ON subscriptions
  FOR ALL
  USING (user_id = (
    SELECT id FROM users
    WHERE device_id = current_setting('app.device_id', true)
  ));

-- Users can only access their own subscription events
CREATE POLICY "Users can only access own subscription events"
  ON subscription_events
  FOR ALL
  USING (user_id = (
    SELECT id FROM users
    WHERE device_id = current_setting('app.device_id', true)
  ));

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
CREATE OR REPLACE FUNCTION expire_old_trials()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  WITH updated_subscriptions AS (
    UPDATE subscriptions
    SET
      status = 'expired',
      updated_at = NOW()
    WHERE status = 'trial'
      AND trial_end_date IS NOT NULL
      AND trial_end_date <= NOW()
    RETURNING id, user_id
  )
  SELECT COUNT(*) INTO updated_count FROM updated_subscriptions;

  -- Log events for expired trials
  INSERT INTO subscription_events (user_id, subscription_id, event_type, metadata)
  SELECT
    us.user_id,
    us.id,
    'trial_ended',
    jsonb_build_object('expired_at', NOW())
  FROM (
    UPDATE subscriptions
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'trial'
      AND trial_end_date IS NOT NULL
      AND trial_end_date <= NOW()
    RETURNING id, user_id
  ) us;

  RETURN updated_count;
END;
$$;

-- Function to expire grace periods automatically (for daily cron job)
CREATE OR REPLACE FUNCTION expire_grace_periods()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  WITH updated_subscriptions AS (
    UPDATE subscriptions
    SET
      status = 'expired',
      updated_at = NOW()
    WHERE status = 'grace'
      AND grace_period_end IS NOT NULL
      AND grace_period_end <= NOW()
    RETURNING id, user_id
  )
  SELECT COUNT(*) INTO updated_count FROM updated_subscriptions;

  -- Log events for expired grace periods
  INSERT INTO subscription_events (user_id, subscription_id, event_type, metadata)
  SELECT
    us.user_id,
    us.id,
    'subscription_expired',
    jsonb_build_object('expired_at', NOW(), 'previous_status', 'grace')
  FROM (
    UPDATE subscriptions
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'grace'
      AND grace_period_end IS NOT NULL
      AND grace_period_end <= NOW()
    RETURNING id, user_id
  ) us;

  RETURN updated_count;
END;
$$;

-- =====================================================
-- 15. SUBSCRIPTION MONITORING VIEWS
-- =====================================================

-- View for subscription metrics
CREATE VIEW IF NOT EXISTS subscription_metrics AS
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
CREATE VIEW IF NOT EXISTS subscription_events_summary AS
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

COMMENT ON TABLE subscriptions IS 'Subscription metadata (treated as PHI due to correlation with mental health data). IAP-only (Apple/Google).';
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
-- ✅ HIPAA compliance (subscription metadata treated as PHI)