-- FullMind MBCT Authentication Setup - Week 2 Implementation
-- HIPAA-compliant authentication with 15-minute sessions, device binding, and emergency access

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===========================================
-- ENHANCED USERS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  email_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_sign_in TIMESTAMPTZ,
  sign_in_count INTEGER DEFAULT 0 NOT NULL,
  confirmed_at TIMESTAMPTZ,
  confirmation_sent_at TIMESTAMPTZ,
  recovery_sent_at TIMESTAMPTZ,
  email_change_sent_at TIMESTAMPTZ,
  new_email TEXT,
  invited_at TIMESTAMPTZ,
  action_link TEXT,
  encrypted_metadata TEXT,
  hipaa_consent BOOLEAN DEFAULT false NOT NULL,
  hipaa_consent_date TIMESTAMPTZ,
  data_retention_preference INTEGER DEFAULT 2555 NOT NULL, -- 7 years
  emergency_contact_encrypted TEXT,
  crisis_plan_enabled BOOLEAN DEFAULT false NOT NULL,
  account_status TEXT DEFAULT 'pending_verification' CHECK (account_status IN ('active', 'suspended', 'deleted', 'pending_verification')) NOT NULL,
  suspension_reason TEXT,
  deleted_at TIMESTAMPTZ,
  timezone TEXT DEFAULT 'UTC' NOT NULL,
  locale TEXT DEFAULT 'en-US' NOT NULL,
  UNIQUE(email_hash)
);

-- ===========================================
-- AUTHENTICATION SESSIONS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  device_id TEXT NOT NULL,
  session_token_hash TEXT NOT NULL,
  refresh_token_hash TEXT NOT NULL,
  session_type TEXT DEFAULT 'normal' CHECK (session_type IN ('normal', 'emergency', 'crisis', 'recovery')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '15 minutes' NOT NULL,
  last_activity TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  ip_address INET,
  user_agent TEXT,
  device_fingerprint TEXT NOT NULL,
  biometric_verified BOOLEAN DEFAULT false NOT NULL,
  mfa_verified BOOLEAN DEFAULT false NOT NULL,
  crisis_override BOOLEAN DEFAULT false NOT NULL,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  security_context JSONB,
  performance_metrics JSONB,
  UNIQUE(session_token_hash)
);

-- ===========================================
-- USER CONSENT TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS user_consent (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  device_id TEXT NOT NULL,
  consent_type TEXT CHECK (consent_type IN ('data_processing', 'analytics', 'communications', 'emergency_access', 'clinical_data', 'cloud_sync', 'biometric_auth')) NOT NULL,
  consent_version TEXT NOT NULL,
  granted BOOLEAN NOT NULL,
  granted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  ip_address INET,
  user_agent TEXT,
  legal_basis TEXT CHECK (legal_basis IN ('consent', 'legitimate_interest', 'vital_interests', 'legal_obligation')) NOT NULL,
  purpose TEXT NOT NULL,
  data_categories TEXT[] NOT NULL,
  retention_period INTEGER,
  third_party_sharing BOOLEAN DEFAULT false NOT NULL,
  automated_processing BOOLEAN DEFAULT false NOT NULL,
  expires_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  withdrawal_reason TEXT,
  parent_consent_id UUID REFERENCES user_consent(id) ON DELETE SET NULL,
  consent_evidence JSONB,
  UNIQUE(user_id, consent_type, consent_version)
);

-- ===========================================
-- INDEXES FOR PERFORMANCE
-- ===========================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email_hash ON users(email_hash);
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);
CREATE INDEX IF NOT EXISTS idx_users_hipaa_consent ON users(hipaa_consent, hipaa_consent_date);
CREATE INDEX IF NOT EXISTS idx_users_last_sign_in ON users(last_sign_in);

-- Auth sessions indexes
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_active ON auth_sessions(user_id, expires_at) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_auth_sessions_device ON auth_sessions(device_id, last_activity);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_token_hash ON auth_sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_type ON auth_sessions(session_type, created_at);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expired ON auth_sessions(expires_at) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_auth_sessions_crisis ON auth_sessions(crisis_override, session_type) WHERE crisis_override = true;

-- User consent indexes
CREATE INDEX IF NOT EXISTS idx_user_consent_user_type ON user_consent(user_id, consent_type);
CREATE INDEX IF NOT EXISTS idx_user_consent_granted ON user_consent(granted, granted_at);
CREATE INDEX IF NOT EXISTS idx_user_consent_expires ON user_consent(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_consent_withdrawn ON user_consent(withdrawn_at) WHERE withdrawn_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_consent_legal_basis ON user_consent(legal_basis, consent_type);

-- ===========================================
-- ROW LEVEL SECURITY POLICIES
-- ===========================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_consent ENABLE ROW LEVEL SECURITY;

-- Users policies
DROP POLICY IF EXISTS "Users can only access their own user data" ON users;
CREATE POLICY "Users can only access their own user data" ON users
  FOR ALL USING (auth.uid() = id);

-- Auth sessions policies
DROP POLICY IF EXISTS "Users can only access their own sessions" ON auth_sessions;
CREATE POLICY "Users can only access their own sessions" ON auth_sessions
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Emergency access for crisis sessions" ON auth_sessions;
CREATE POLICY "Emergency access for crisis sessions" ON auth_sessions
  FOR SELECT USING (
    session_type IN ('emergency', 'crisis') AND
    crisis_override = true AND
    expires_at > NOW()
  );

-- User consent policies
DROP POLICY IF EXISTS "Users can only access their own consent" ON user_consent;
CREATE POLICY "Users can only access their own consent" ON user_consent
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Consent must be current and valid" ON user_consent;
CREATE POLICY "Consent must be current and valid" ON user_consent
  FOR SELECT USING (
    auth.uid() = user_id AND
    granted = true AND
    (expires_at IS NULL OR expires_at > NOW()) AND
    withdrawn_at IS NULL
  );

-- ===========================================
-- FUNCTIONS FOR AUTHENTICATION MANAGEMENT
-- ===========================================

-- Function to create user profile automatically
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Create enhanced user record
  INSERT INTO users (
    id, email, email_hash, created_at, updated_at,
    hipaa_consent, account_status, timezone, locale
  ) VALUES (
    NEW.id,
    NEW.email,
    encode(digest(NEW.email, 'sha256'), 'hex'),
    NOW(),
    NOW(),
    false,
    'pending_verification',
    'UTC',
    'en-US'
  ) ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired sessions (HIPAA compliance)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  cleanup_count INTEGER;
BEGIN
  -- Update expired sessions as revoked
  UPDATE auth_sessions
  SET
    revoked_at = NOW(),
    revoked_reason = 'expired'
  WHERE
    expires_at < NOW()
    AND revoked_at IS NULL;

  GET DIAGNOSTICS cleanup_count = ROW_COUNT;

  RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate user consent
CREATE OR REPLACE FUNCTION validate_user_consent(
  user_uuid UUID,
  consent_types TEXT[]
)
RETURNS BOOLEAN AS $$
DECLARE
  consent_type TEXT;
  consent_valid BOOLEAN;
BEGIN
  -- Check each required consent type
  FOREACH consent_type IN ARRAY consent_types
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM user_consent
      WHERE user_id = user_uuid
      AND consent_type = validate_user_consent.consent_type
      AND granted = true
      AND (expires_at IS NULL OR expires_at > NOW())
      AND withdrawn_at IS NULL
    ) INTO consent_valid;

    -- If any consent is missing or invalid, return false
    IF NOT consent_valid THEN
      RETURN false;
    END IF;
  END LOOP;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create emergency session for crisis scenarios
CREATE OR REPLACE FUNCTION create_emergency_session(
  user_uuid UUID,
  device_id_param TEXT,
  crisis_type TEXT,
  severity TEXT
)
RETURNS UUID AS $$
DECLARE
  session_id UUID;
  emergency_duration INTERVAL;
BEGIN
  -- Determine emergency session duration based on severity
  emergency_duration := CASE severity
    WHEN 'severe' THEN INTERVAL '2 hours'
    WHEN 'high' THEN INTERVAL '1 hour'
    WHEN 'medium' THEN INTERVAL '30 minutes'
    ELSE INTERVAL '15 minutes'
  END;

  -- Create emergency session
  INSERT INTO auth_sessions (
    user_id, device_id, session_token_hash, refresh_token_hash,
    session_type, created_at, expires_at, last_activity,
    device_fingerprint, crisis_override, security_context
  ) VALUES (
    user_uuid,
    device_id_param,
    encode(digest(gen_random_uuid()::TEXT, 'sha256'), 'hex'),
    encode(digest(gen_random_uuid()::TEXT, 'sha256'), 'hex'),
    'emergency',
    NOW(),
    NOW() + emergency_duration,
    NOW(),
    encode(digest(device_id_param || NOW()::TEXT, 'sha256'), 'hex'),
    true,
    jsonb_build_object(
      'crisis_type', crisis_type,
      'severity', severity,
      'emergency_access', true,
      'auto_created', true
    )
  ) RETURNING id INTO session_id;

  RETURN session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user sign-in stats
CREATE OR REPLACE FUNCTION update_user_signin_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update last sign-in and increment count
  UPDATE users
  SET
    last_sign_in = NOW(),
    sign_in_count = sign_in_count + 1,
    updated_at = NOW()
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to enforce session timeout for HIPAA compliance
CREATE OR REPLACE FUNCTION enforce_session_timeout()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if session would exceed 15-minute limit
  IF NEW.expires_at > NEW.created_at + INTERVAL '15 minutes' THEN
    NEW.expires_at := NEW.created_at + INTERVAL '15 minutes';
  END IF;

  -- Update last activity
  NEW.last_activity := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to revoke user sessions (for security incidents)
CREATE OR REPLACE FUNCTION revoke_user_sessions(
  user_uuid UUID,
  reason TEXT DEFAULT 'security_incident'
)
RETURNS INTEGER AS $$
DECLARE
  revoked_count INTEGER;
BEGIN
  -- Revoke all active sessions for user
  UPDATE auth_sessions
  SET
    revoked_at = NOW(),
    revoked_reason = reason
  WHERE
    user_id = user_uuid
    AND revoked_at IS NULL;

  GET DIAGNOSTICS revoked_count = ROW_COUNT;

  RETURN revoked_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- TRIGGERS
-- ===========================================

-- Trigger to create user profile when auth.users record is created
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;
CREATE TRIGGER create_user_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- Trigger to update user stats on new session
DROP TRIGGER IF EXISTS update_signin_stats_trigger ON auth_sessions;
CREATE TRIGGER update_signin_stats_trigger
  AFTER INSERT ON auth_sessions
  FOR EACH ROW EXECUTE FUNCTION update_user_signin_stats();

-- Trigger to enforce session timeout
DROP TRIGGER IF EXISTS enforce_timeout_trigger ON auth_sessions;
CREATE TRIGGER enforce_timeout_trigger
  BEFORE INSERT OR UPDATE ON auth_sessions
  FOR EACH ROW EXECUTE FUNCTION enforce_session_timeout();

-- ===========================================
-- INITIAL CONSENT TYPES SETUP
-- ===========================================

-- Insert default consent types for new users
CREATE OR REPLACE FUNCTION setup_default_consents(user_uuid UUID, device_id_param TEXT)
RETURNS VOID AS $$
BEGIN
  -- Data processing consent (required for app functionality)
  INSERT INTO user_consent (
    user_id, device_id, consent_type, consent_version, granted,
    legal_basis, purpose, data_categories, retention_period
  ) VALUES (
    user_uuid, device_id_param, 'data_processing', '1.0', true,
    'consent', 'Core app functionality and MBCT practice data',
    ARRAY['check_ins', 'assessments', 'preferences'], 2555
  ) ON CONFLICT (user_id, consent_type, consent_version) DO NOTHING;

  -- Emergency access consent (for crisis scenarios)
  INSERT INTO user_consent (
    user_id, device_id, consent_type, consent_version, granted,
    legal_basis, purpose, data_categories, retention_period
  ) VALUES (
    user_uuid, device_id_param, 'emergency_access', '1.0', true,
    'vital_interests', 'Emergency access during mental health crises',
    ARRAY['crisis_plan', 'emergency_contacts'], 2555
  ) ON CONFLICT (user_id, consent_type, consent_version) DO NOTHING;

  -- Clinical data consent
  INSERT INTO user_consent (
    user_id, device_id, consent_type, consent_version, granted,
    legal_basis, purpose, data_categories, retention_period
  ) VALUES (
    user_uuid, device_id_param, 'clinical_data', '1.0', true,
    'consent', 'Storage and processing of clinical assessment data',
    ARRAY['phq9_scores', 'gad7_scores', 'clinical_notes'], 2555
  ) ON CONFLICT (user_id, consent_type, consent_version) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- SCHEDULED FUNCTIONS (to be run via cron)
-- ===========================================

-- Schedule session cleanup every 5 minutes
-- This would be set up in your deployment environment:
-- SELECT cron.schedule('cleanup-expired-sessions', '*/5 * * * *', 'SELECT cleanup_expired_sessions();');

-- ===========================================
-- PERMISSIONS AND SECURITY
-- ===========================================

-- Grant necessary permissions for Supabase auth
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON users TO authenticated;
GRANT SELECT ON auth_sessions TO authenticated;
GRANT SELECT ON user_consent TO authenticated;

-- Grant insert/update permissions for user data
GRANT INSERT, UPDATE ON users TO authenticated;
GRANT INSERT, UPDATE ON auth_sessions TO authenticated;
GRANT INSERT, UPDATE ON user_consent TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION validate_user_consent(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION create_emergency_session(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION setup_default_consents(UUID, TEXT) TO authenticated;

-- ===========================================
-- COMMENT DOCUMENTATION
-- ===========================================

COMMENT ON TABLE users IS 'Enhanced user data with HIPAA compliance and authentication tracking';
COMMENT ON TABLE auth_sessions IS 'Session management with 15-minute timeout, device binding, and crisis override';
COMMENT ON TABLE user_consent IS 'Granular consent management for HIPAA compliance and data processing';

COMMENT ON FUNCTION cleanup_expired_sessions() IS 'Cleans up expired sessions for HIPAA compliance';
COMMENT ON FUNCTION validate_user_consent(UUID, TEXT[]) IS 'Validates user consent for specific data processing operations';
COMMENT ON FUNCTION create_emergency_session(UUID, TEXT, TEXT, TEXT) IS 'Creates emergency session for crisis scenarios with extended timeout';
COMMENT ON FUNCTION setup_default_consents(UUID, TEXT) IS 'Sets up default required consents for new users';

-- ===========================================
-- VERIFICATION QUERIES
-- ===========================================

-- Verify tables exist
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('users', 'auth_sessions', 'user_consent');

    IF table_count != 3 THEN
        RAISE EXCEPTION 'Authentication tables not created properly. Expected 3, found %', table_count;
    END IF;

    RAISE NOTICE 'Authentication setup completed successfully. Created % tables.', table_count;
END $$;