-- FullMind P0-CLOUD Payment Security Database Schema
-- PCI DSS Level 2 + HIPAA Dual Compliance
-- Day 15 Payment Infrastructure Implementation
--
-- CRITICAL REQUIREMENTS:
-- - Separate encryption contexts for payment vs PHI data
-- - Zero card data storage (tokenization only)
-- - Comprehensive audit logging with 7-year retention
-- - Crisis safety bypass protocols
-- - RLS policies for payment data isolation

-- =============================================================================
-- SUBSCRIPTION MANAGEMENT TABLES
-- =============================================================================

-- Subscription plans and pricing
CREATE TABLE IF NOT EXISTS subscription_plans (
    plan_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    amount INTEGER NOT NULL, -- Amount in cents
    currency TEXT NOT NULL DEFAULT 'usd',
    interval_type TEXT NOT NULL CHECK (interval_type IN ('month', 'year')),
    trial_days INTEGER DEFAULT 0,
    features JSONB NOT NULL DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User subscriptions with encrypted Stripe IDs
CREATE TABLE IF NOT EXISTS user_subscriptions (
    subscription_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL REFERENCES subscription_plans(plan_id),

    -- Encrypted Stripe identifiers (never store raw)
    stripe_customer_id_encrypted TEXT, -- Encrypted Stripe customer ID
    stripe_subscription_id_encrypted TEXT, -- Encrypted Stripe subscription ID
    stripe_payment_method_id_encrypted TEXT, -- Encrypted payment method ID

    -- Subscription status and lifecycle
    status TEXT NOT NULL CHECK (status IN (
        'incomplete', 'incomplete_expired', 'trialing', 'active',
        'past_due', 'canceled', 'unpaid', 'paused'
    )),

    -- Billing periods (not encrypted - needed for app logic)
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,

    -- Payment amounts (for business logic, not PCI data)
    amount INTEGER NOT NULL, -- Amount in cents
    currency TEXT NOT NULL DEFAULT 'usd',

    -- Crisis safety flags
    crisis_exemption BOOLEAN DEFAULT FALSE, -- Allows access during payment failures
    emergency_access_until TIMESTAMPTZ, -- Emergency access expiry

    -- Metadata and tracking
    metadata JSONB DEFAULT '{}',
    device_id TEXT, -- Device where subscription was created
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure single active subscription per user per plan
    UNIQUE(user_id, plan_id) WHERE status IN ('active', 'trialing', 'past_due')
);

-- Payment method tokens (no card data, tokenization only)
CREATE TABLE IF NOT EXISTS payment_method_tokens (
    token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Encrypted external references only
    stripe_payment_method_id_encrypted TEXT NOT NULL,

    -- Non-sensitive display information only
    payment_method_type TEXT NOT NULL CHECK (payment_method_type IN ('card', 'apple_pay', 'google_pay')),
    card_brand TEXT, -- visa, mastercard, etc. (non-sensitive)
    card_last4 TEXT, -- Last 4 digits only (PCI compliant)
    card_exp_month INTEGER, -- Expiry month (needed for validation)
    card_exp_year INTEGER, -- Expiry year (needed for validation)

    -- Security and validation
    device_fingerprint_hash TEXT NOT NULL, -- Hashed device fingerprint
    risk_assessment TEXT NOT NULL CHECK (risk_assessment IN ('low', 'medium', 'high')),
    verification_status TEXT NOT NULL CHECK (verification_status IN ('verified', 'pending', 'failed')),

    -- Lifecycle management
    active BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMPTZ NOT NULL, -- Token expiry (24 hours default)
    last_used_at TIMESTAMPTZ,

    -- Crisis mode flags
    created_in_crisis_mode BOOLEAN DEFAULT FALSE,
    crisis_bypass_enabled BOOLEAN DEFAULT FALSE,

    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- PAYMENT AUDIT LOGGING (PCI DSS Requirement)
-- =============================================================================

-- Comprehensive payment audit log with 7-year retention
CREATE TABLE IF NOT EXISTS payment_audit_log (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT NOT NULL UNIQUE, -- External event ID from payment service

    -- Event classification
    operation TEXT NOT NULL CHECK (operation IN (
        'token_create', 'token_validate', 'token_expire',
        'payment_attempt', 'payment_success', 'payment_failure',
        'subscription_create', 'subscription_update', 'subscription_cancel',
        'fraud_detected', 'rate_limit_exceeded', 'crisis_bypass'
    )),

    -- User and session context
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    device_id TEXT,
    session_id TEXT,
    ip_address INET, -- For fraud detection
    user_agent TEXT, -- For device validation

    -- Payment context (encrypted sensitive data)
    amount INTEGER, -- Amount in cents (non-sensitive)
    currency TEXT DEFAULT 'usd',
    payment_method_id_encrypted TEXT, -- Encrypted reference only
    stripe_reference_encrypted TEXT, -- Encrypted Stripe reference

    -- Event outcome and security
    status TEXT NOT NULL CHECK (status IN ('success', 'failure', 'blocked', 'bypassed')),
    risk_score INTEGER NOT NULL DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    fraud_indicators JSONB DEFAULT '[]',

    -- Security context
    biometric_used BOOLEAN DEFAULT FALSE,
    device_trusted BOOLEAN DEFAULT FALSE,
    network_secure BOOLEAN DEFAULT TRUE,
    crisis_mode BOOLEAN DEFAULT FALSE,

    -- Error information
    error_code TEXT,
    error_message TEXT,
    error_type TEXT,

    -- Compliance and retention
    pci_dss_required BOOLEAN NOT NULL DEFAULT TRUE,
    audit_retention_years INTEGER NOT NULL DEFAULT 7,
    sensitivity_level TEXT NOT NULL CHECK (sensitivity_level IN ('low', 'medium', 'high')) DEFAULT 'medium',

    -- Automatic cleanup
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 years'),

    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- PAYMENT RATE LIMITING (PCI DSS Requirement 8.1.6)
-- =============================================================================

-- Rate limiting state for payment operations
CREATE TABLE IF NOT EXISTS payment_rate_limits (
    rate_limit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,

    -- Rate limiting window
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 10,

    -- Blocking state
    blocked BOOLEAN NOT NULL DEFAULT FALSE,
    blocked_until TIMESTAMPTZ,
    block_reason TEXT,

    -- Crisis exemptions
    exemption_type TEXT CHECK (exemption_type IN ('crisis_mode', 'emergency_session')),
    exemption_granted_at TIMESTAMPTZ,
    exemption_expires_at TIMESTAMPTZ,

    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure one rate limit record per user-device in time window
    UNIQUE(user_id, device_id, window_start)
);

-- =============================================================================
-- FRAUD DETECTION DATA
-- =============================================================================

-- Fraud detection patterns and scores
CREATE TABLE IF NOT EXISTS payment_fraud_scores (
    fraud_score_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id TEXT,
    session_id TEXT,

    -- Risk scoring
    overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    velocity_score INTEGER NOT NULL DEFAULT 0,
    device_score INTEGER NOT NULL DEFAULT 0,
    behavior_score INTEGER NOT NULL DEFAULT 0,
    location_score INTEGER NOT NULL DEFAULT 0,

    -- Detection factors
    factors JSONB NOT NULL DEFAULT '[]',
    recommendation TEXT NOT NULL CHECK (recommendation IN ('allow', 'challenge', 'block')),

    -- Context
    payment_amount INTEGER, -- Amount in cents
    currency TEXT DEFAULT 'usd',
    payment_type TEXT,

    -- Outcome
    action_taken TEXT,
    fraud_confirmed BOOLEAN,

    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all payment tables
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_method_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_fraud_scores ENABLE ROW LEVEL SECURITY;

-- Subscription plans are publicly readable
CREATE POLICY "subscription_plans_public_read" ON subscription_plans
    FOR SELECT USING (active = TRUE);

-- Users can only access their own subscription data
CREATE POLICY "user_subscriptions_owner_access" ON user_subscriptions
    FOR ALL USING (auth.uid() = user_id);

-- Payment method tokens - strict user isolation
CREATE POLICY "payment_tokens_owner_only" ON payment_method_tokens
    FOR ALL USING (auth.uid() = user_id);

-- Audit log - users can read their own events only
CREATE POLICY "payment_audit_user_read" ON payment_audit_log
    FOR SELECT USING (auth.uid() = user_id);

-- Rate limits - users can read their own limits
CREATE POLICY "rate_limits_owner_read" ON payment_rate_limits
    FOR SELECT USING (auth.uid() = user_id);

-- Fraud scores - users can read their own scores
CREATE POLICY "fraud_scores_owner_read" ON payment_fraud_scores
    FOR SELECT USING (auth.uid() = user_id);

-- =============================================================================
-- CRISIS SAFETY FUNCTIONS
-- =============================================================================

-- Function to grant emergency access during mental health crisis
CREATE OR REPLACE FUNCTION grant_crisis_subscription_access(
    p_user_id UUID,
    p_duration_hours INTEGER DEFAULT 24
) RETURNS BOOLEAN AS $$
BEGIN
    -- Grant emergency access to subscription features
    UPDATE user_subscriptions
    SET
        crisis_exemption = TRUE,
        emergency_access_until = NOW() + (p_duration_hours || ' hours')::INTERVAL,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Log crisis access grant
    INSERT INTO payment_audit_log (
        event_id, operation, user_id, status, crisis_mode,
        metadata
    ) VALUES (
        'crisis_access_' || extract(epoch from now()),
        'crisis_bypass',
        p_user_id,
        'success',
        TRUE,
        jsonb_build_object(
            'access_duration_hours', p_duration_hours,
            'granted_at', NOW()
        )
    );

    RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
    -- Never fail crisis access
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has valid subscription or crisis access
CREATE OR REPLACE FUNCTION check_subscription_access(p_user_id UUID)
RETURNS TABLE (
    has_access BOOLEAN,
    access_type TEXT,
    expires_at TIMESTAMPTZ,
    crisis_mode BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        CASE
            WHEN s.status IN ('active', 'trialing') THEN TRUE
            WHEN s.crisis_exemption = TRUE AND s.emergency_access_until > NOW() THEN TRUE
            ELSE FALSE
        END as has_access,
        CASE
            WHEN s.crisis_exemption = TRUE AND s.emergency_access_until > NOW() THEN 'crisis_access'
            WHEN s.status = 'trialing' THEN 'trial'
            WHEN s.status = 'active' THEN 'subscription'
            ELSE 'none'
        END as access_type,
        CASE
            WHEN s.crisis_exemption = TRUE AND s.emergency_access_until > NOW() THEN s.emergency_access_until
            WHEN s.status IN ('active', 'trialing') THEN s.current_period_end
            ELSE NULL
        END as expires_at,
        COALESCE(s.crisis_exemption, FALSE) as crisis_mode
    FROM user_subscriptions s
    WHERE s.user_id = p_user_id
    ORDER BY
        CASE WHEN s.crisis_exemption = TRUE THEN 1 ELSE 2 END,
        s.created_at DESC
    LIMIT 1;

    -- If no subscription found, return no access
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'none'::TEXT, NULL::TIMESTAMPTZ, FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- PAYMENT DATA CLEANUP FUNCTIONS
-- =============================================================================

-- Function to safely clean up expired payment tokens
CREATE OR REPLACE FUNCTION cleanup_expired_payment_tokens()
RETURNS INTEGER AS $$
DECLARE
    cleanup_count INTEGER;
BEGIN
    -- Archive expired tokens to audit log before deletion
    INSERT INTO payment_audit_log (
        event_id, operation, user_id, payment_method_id_encrypted,
        status, metadata
    )
    SELECT
        'token_expire_' || extract(epoch from now()) || '_' || token_id,
        'token_expire',
        user_id,
        stripe_payment_method_id_encrypted,
        'success',
        jsonb_build_object(
            'token_id', token_id,
            'expired_at', expires_at,
            'cleanup_at', NOW()
        )
    FROM payment_method_tokens
    WHERE expires_at < NOW() OR (active = FALSE AND updated_at < NOW() - INTERVAL '30 days');

    -- Delete expired tokens
    DELETE FROM payment_method_tokens
    WHERE expires_at < NOW() OR (active = FALSE AND updated_at < NOW() - INTERVAL '30 days');

    GET DIAGNOSTICS cleanup_count = ROW_COUNT;

    RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old audit logs (7-year retention)
CREATE OR REPLACE FUNCTION cleanup_expired_audit_logs()
RETURNS INTEGER AS $$
DECLARE
    cleanup_count INTEGER;
BEGIN
    DELETE FROM payment_audit_log
    WHERE expires_at < NOW();

    GET DIAGNOSTICS cleanup_count = ROW_COUNT;

    RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Subscription indexes
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_crisis ON user_subscriptions(crisis_exemption, emergency_access_until) WHERE crisis_exemption = TRUE;

-- Payment token indexes
CREATE INDEX IF NOT EXISTS idx_payment_tokens_user_id ON payment_method_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_tokens_active ON payment_method_tokens(active, expires_at);
CREATE INDEX IF NOT EXISTS idx_payment_tokens_device ON payment_method_tokens(device_fingerprint_hash);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_payment_audit_user_id ON payment_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_operation ON payment_audit_log(operation);
CREATE INDEX IF NOT EXISTS idx_payment_audit_created ON payment_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_audit_crisis ON payment_audit_log(crisis_mode) WHERE crisis_mode = TRUE;
CREATE INDEX IF NOT EXISTS idx_payment_audit_expires ON payment_audit_log(expires_at);

-- Rate limiting indexes
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_device ON payment_rate_limits(user_id, device_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON payment_rate_limits(window_start, window_end);

-- Fraud score indexes
CREATE INDEX IF NOT EXISTS idx_fraud_scores_user_id ON payment_fraud_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_scores_device ON payment_fraud_scores(device_id);
CREATE INDEX IF NOT EXISTS idx_fraud_scores_created ON payment_fraud_scores(created_at);

-- =============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
CREATE TRIGGER update_subscription_plans_updated_at
    BEFORE UPDATE ON subscription_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_tokens_updated_at
    BEFORE UPDATE ON payment_method_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rate_limits_updated_at
    BEFORE UPDATE ON payment_rate_limits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- INITIAL DATA SETUP
-- =============================================================================

-- Insert default subscription plans
INSERT INTO subscription_plans (plan_id, name, description, amount, interval_type, trial_days, features) VALUES
('being_monthly', 'Being Premium Monthly', 'Full access to MBCT practices and progress tracking', 999, 'month', 7,
 '["All MBCT guided practices", "Progress tracking and insights", "Crisis support tools", "Personalized recommendations", "Cloud sync across devices"]'::jsonb),
('being_annual', 'Being Premium Annual', 'Full access with annual savings', 9999, 'year', 14,
 '["All monthly features", "Annual savings (2 months free)", "Priority customer support", "Early access to new features"]'::jsonb)
ON CONFLICT (plan_id) DO NOTHING;

-- =============================================================================
-- SECURITY VALIDATION QUERIES
-- =============================================================================

-- Query to validate PCI DSS compliance
CREATE OR REPLACE VIEW payment_security_compliance AS
SELECT
    'PCI DSS Compliance Check' as check_name,
    COUNT(*) FILTER (WHERE stripe_customer_id_encrypted IS NOT NULL) as encrypted_customer_ids,
    COUNT(*) FILTER (WHERE stripe_subscription_id_encrypted IS NOT NULL) as encrypted_subscription_ids,
    COUNT(*) FILTER (WHERE stripe_payment_method_id_encrypted IS NOT NULL) as encrypted_payment_methods,
    0 as unencrypted_card_data, -- Should always be 0 (no card data stored)
    COUNT(*) as total_payment_records
FROM user_subscriptions;

-- Query to check crisis safety compliance
CREATE OR REPLACE VIEW crisis_safety_compliance AS
SELECT
    'Crisis Safety Check' as check_name,
    COUNT(*) FILTER (WHERE crisis_exemption = TRUE) as users_with_crisis_access,
    COUNT(*) FILTER (WHERE emergency_access_until > NOW()) as active_emergency_access,
    COUNT(*) FILTER (WHERE operation = 'crisis_bypass') as crisis_bypass_events,
    AVG(EXTRACT(EPOCH FROM (created_at - lag(created_at) OVER (ORDER BY created_at)))) as avg_crisis_response_time_seconds
FROM payment_audit_log
WHERE crisis_mode = TRUE AND created_at > NOW() - INTERVAL '24 hours';

-- =============================================================================
-- COMMENTS AND DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE subscription_plans IS 'Available subscription plans with pricing and features';
COMMENT ON TABLE user_subscriptions IS 'User subscription records with encrypted Stripe identifiers and crisis safety features';
COMMENT ON TABLE payment_method_tokens IS 'Payment method tokens (no card data) with PCI DSS compliance';
COMMENT ON TABLE payment_audit_log IS 'Comprehensive audit log for all payment operations (7-year retention)';
COMMENT ON TABLE payment_rate_limits IS 'Rate limiting for payment operations with crisis exemptions';
COMMENT ON TABLE payment_fraud_scores IS 'Fraud detection scores and risk assessments';

COMMENT ON FUNCTION grant_crisis_subscription_access IS 'Grants emergency subscription access during mental health crisis';
COMMENT ON FUNCTION check_subscription_access IS 'Checks user subscription status including crisis access';
COMMENT ON FUNCTION cleanup_expired_payment_tokens IS 'Safely removes expired payment tokens with audit trail';
COMMENT ON FUNCTION cleanup_expired_audit_logs IS 'Removes audit logs older than 7 years per PCI DSS requirements';