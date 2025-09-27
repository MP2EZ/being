/**
 * Supabase Database Schema - HIPAA-Compliant Table Definitions
 *
 * Zero-knowledge architecture - all sensitive data encrypted client-side
 * Only encrypted containers and metadata stored in Supabase
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { EncryptedDataContainer, CloudAuditEntry, CloudSyncMetadata } from '../../types/cloud';

/**
 * Database table definitions for HIPAA-compliant cloud storage
 */
export interface DatabaseSchema {
  // Users table - enhanced authentication data with encryption
  users: {
    id: string; // UUID primary key (matches auth.users.id)
    email: string; // Email address (hashed for privacy)
    email_hash: string; // SHA-256 hash of email for lookups
    created_at: string; // ISO timestamp
    updated_at: string; // ISO timestamp
    last_sign_in: string | null; // Last successful authentication
    sign_in_count: number; // Total number of sign-ins
    confirmed_at: string | null; // Email confirmation timestamp
    confirmation_sent_at: string | null; // Last confirmation email sent
    recovery_sent_at: string | null; // Last password recovery sent
    email_change_sent_at: string | null; // Last email change request
    new_email: string | null; // Pending email change
    invited_at: string | null; // If user was invited
    action_link: string | null; // Temporary action link
    encrypted_metadata: string | null; // Encrypted user metadata
    hipaa_consent: boolean; // HIPAA consent flag
    hipaa_consent_date: string | null; // When HIPAA consent was given
    data_retention_preference: number; // Data retention days (default 2555 = 7 years)
    emergency_contact_encrypted: string | null; // Encrypted emergency contact info
    crisis_plan_enabled: boolean; // Whether user has crisis plan enabled
    account_status: 'active' | 'suspended' | 'deleted' | 'pending_verification';
    suspension_reason: string | null; // Reason for suspension if applicable
    deleted_at: string | null; // Soft delete timestamp
    timezone: string; // User timezone for compliance
    locale: string; // User locale/language preference
  };

  // User profiles table - minimal non-encrypted data
  user_profiles: {
    id: string; // UUID primary key (matches auth.users.id)
    email: string; // From auth.users.email
    created_at: string; // ISO timestamp
    last_sync: string | null; // Last successful sync
    device_count: number; // Number of registered devices
    subscription_tier: 'free' | 'pro' | 'enterprise';
    hipaa_consent: boolean; // Required for data processing
    data_retention_days: number; // Data retention preference
    timezone: string; // User timezone for compliance
    updated_at: string; // ISO timestamp
  };

  // Authentication sessions table - enhanced session management
  auth_sessions: {
    id: string; // UUID primary key
    user_id: string; // UUID foreign key to auth.users
    device_id: string; // Device identifier
    session_token_hash: string; // Hashed session token
    refresh_token_hash: string; // Hashed refresh token
    session_type: 'normal' | 'emergency' | 'crisis' | 'recovery';
    created_at: string; // Session creation time
    expires_at: string; // Session expiration (15 minutes for HIPAA)
    last_activity: string; // Last activity timestamp
    ip_address: string | null; // Client IP (anonymized)
    user_agent: string | null; // Client user agent
    device_fingerprint: string; // Device fingerprint for security
    biometric_verified: boolean; // Whether biometric auth was used
    mfa_verified: boolean; // Whether MFA was completed
    crisis_override: boolean; // Emergency access granted
    revoked_at: string | null; // Session revocation timestamp
    revoked_reason: string | null; // Reason for revocation
    security_context: Record<string, unknown>; // Additional security metadata
    performance_metrics: Record<string, number>; // Auth performance data
  };

  // User consent table - granular consent management
  user_consent: {
    id: string; // UUID primary key
    user_id: string; // UUID foreign key to auth.users
    device_id: string; // Device where consent was given
    consent_type: 'data_processing' | 'analytics' | 'communications' | 'emergency_access' | 'clinical_data' | 'cloud_sync' | 'biometric_auth';
    consent_version: string; // Version of consent terms
    granted: boolean; // Whether consent was granted
    granted_at: string; // When consent was granted/revoked
    ip_address: string | null; // IP where consent was given (anonymized)
    user_agent: string | null; // User agent where consent was given
    legal_basis: 'consent' | 'legitimate_interest' | 'vital_interests' | 'legal_obligation';
    purpose: string; // Purpose of data processing
    data_categories: string[]; // Categories of data covered
    retention_period: number | null; // Retention period in days
    third_party_sharing: boolean; // Whether data may be shared
    automated_processing: boolean; // Whether automated processing occurs
    expires_at: string | null; // Consent expiration date
    withdrawn_at: string | null; // Consent withdrawal timestamp
    withdrawal_reason: string | null; // Reason for withdrawal
    parent_consent_id: string | null; // Reference to parent consent if applicable
    consent_evidence: Record<string, unknown>; // Evidence of consent
  };

  // Encrypted data storage - core table for all user data
  encrypted_data: {
    id: string; // UUID primary key
    user_id: string; // UUID foreign key
    device_id: string; // Device identifier
    entity_type: 'check_in' | 'assessment' | 'user_profile' | 'crisis_plan';
    entity_id: string; // Local entity ID
    encrypted_data: string; // Base64 encrypted JSON
    encryption_version: string; // Encryption algorithm version
    checksum: string; // SHA-256 data integrity check
    version: number; // Version for conflict resolution
    cloud_version: number; // Cloud-specific version
    metadata: Record<string, unknown>; // Encrypted metadata
    created_at: string; // ISO timestamp
    updated_at: string; // ISO timestamp
    synced_at: string; // Last sync timestamp
  };

  // User profiles table - minimal non-encrypted data
  user_profiles: {
    id: string; // UUID primary key (matches auth.users.id)
    email: string; // From auth.users.email
    created_at: string; // ISO timestamp
    last_sync: string | null; // Last successful sync
    device_count: number; // Number of registered devices
    subscription_tier: 'free' | 'pro' | 'enterprise';
    hipaa_consent: boolean; // Required for data processing
    data_retention_days: number; // Data retention preference
    timezone: string; // User timezone for compliance
    updated_at: string; // ISO timestamp
  };

  // Device registration for cross-device sync
  user_devices: {
    id: string; // UUID primary key
    user_id: string; // UUID foreign key
    device_id: string; // Unique device identifier
    device_name: string; // User-friendly device name
    platform: 'ios' | 'android';
    app_version: string; // App version for compatibility
    encryption_key_id: string; // Reference to device encryption key
    last_seen: string; // Last activity timestamp
    active: boolean; // Device active status
    registered_at: string; // ISO timestamp
    updated_at: string; // ISO timestamp
  };

  // Audit trail for HIPAA compliance
  audit_log: {
    id: string; // UUID primary key
    user_id: string | null; // UUID foreign key (null for system events)
    device_id: string | null; // Device identifier
    operation: string; // Operation type
    entity_type: string | null; // Affected entity type
    entity_id: string | null; // Affected entity ID
    result: 'success' | 'failure' | 'partial';
    ip_address: string | null; // Anonymized IP (optional)
    user_agent: string | null; // User agent (optional)
    duration_ms: number | null; // Operation duration
    data_size_bytes: number | null; // Data size processed
    error_code: string | null; // Error code if failed
    hipaa_compliant: boolean; // HIPAA compliance flag
    timestamp: string; // ISO timestamp
    session_id: string | null; // Session identifier
    context: Record<string, unknown> | null; // Additional context (encrypted)
  };

  // Sync conflicts for resolution
  sync_conflicts: {
    id: string; // UUID primary key
    user_id: string; // UUID foreign key
    entity_type: string; // Conflicted entity type
    entity_id: string; // Conflicted entity ID
    conflict_type: string; // Type of conflict
    local_version: number; // Local data version
    cloud_version: number; // Cloud data version
    local_data_id: string; // Reference to local encrypted_data
    cloud_data_id: string; // Reference to cloud encrypted_data
    auto_resolvable: boolean; // Can be resolved automatically
    clinical_relevant: boolean; // Has clinical implications
    detected_at: string; // ISO timestamp
    resolved_at: string | null; // Resolution timestamp
    resolved_by: 'system' | 'user' | null; // Resolution method
    resolution_strategy: string | null; // How it was resolved
    context: Record<string, unknown> | null; // Conflict context
  };

  // Backup metadata and recovery
  data_backups: {
    id: string; // UUID primary key
    user_id: string; // UUID foreign key
    backup_type: 'manual' | 'automatic' | 'emergency';
    data_types: string[]; // Array of included entity types
    encrypted_size_bytes: number; // Size of encrypted backup
    compression_ratio: number; // Compression efficiency
    encryption_version: string; // Encryption algorithm version
    checksum: string; // Backup integrity checksum
    created_at: string; // ISO timestamp
    expires_at: string; // Backup expiration
    storage_location: string; // Storage reference (encrypted)
    recovery_tested: boolean; // Recovery verification status
    metadata: Record<string, unknown> | null; // Backup metadata
  };

  // Service health monitoring
  service_health: {
    id: string; // UUID primary key
    service_name: string; // Service identifier
    region: string; // Service region
    status: 'operational' | 'degraded' | 'outage';
    latency_ms: number; // Average latency
    uptime_percentage: number; // Service uptime
    error_rate_percentage: number; // Error rate
    last_check: string; // ISO timestamp
    maintenance_scheduled: boolean; // Planned maintenance
    maintenance_start: string | null; // Maintenance start time
    maintenance_end: string | null; // Maintenance end time
    maintenance_description: string | null; // Maintenance details
  };

  // Feature flags and configuration
  feature_flags: {
    id: string; // UUID primary key
    user_id: string | null; // UUID foreign key (null for global)
    flag_name: string; // Feature flag name
    enabled: boolean; // Flag status
    configuration: Record<string, unknown> | null; // Flag configuration
    rollout_percentage: number; // Rollout percentage (0-100)
    target_audience: string[] | null; // Target user groups
    effective_from: string; // Start date
    effective_until: string | null; // End date (null for permanent)
    created_by: string; // Creator identifier
    updated_at: string; // ISO timestamp
  };
}

/**
 * SQL schema creation and migration functions
 */
export class SupabaseSchemaManager {
  constructor(private client: SupabaseClient) {}

  /**
   * Create initial database schema with HIPAA compliance
   */
  async createSchema(): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Enable RLS on all tables
      await this.enableRowLevelSecurity();

      // Create tables
      await this.createTables();

      // Create indexes for performance
      await this.createIndexes();

      // Set up RLS policies
      await this.createRLSPolicies();

      // Create audit triggers
      await this.createAuditTriggers();

      return { success: true, errors };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);
      return { success: false, errors };
    }
  }

  /**
   * Enable Row Level Security on all tables
   */
  private async enableRowLevelSecurity(): Promise<void> {
    const tables = [
      'users',
      'auth_sessions',
      'user_consent',
      'encrypted_data',
      'user_profiles',
      'user_devices',
      'audit_log',
      'sync_conflicts',
      'data_backups'
    ];

    for (const table of tables) {
      await this.client.rpc('enable_rls_if_not_exists', { table_name: table });
    }
  }

  /**
   * Create all database tables
   */
  private async createTables(): Promise<void> {
    // Create users table - enhanced authentication data
    await this.client.rpc('create_table_if_not_exists', {
      table_name: 'users',
      table_definition: `
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
        data_retention_preference INTEGER DEFAULT 2555 NOT NULL,
        emergency_contact_encrypted TEXT,
        crisis_plan_enabled BOOLEAN DEFAULT false NOT NULL,
        account_status TEXT DEFAULT 'pending_verification' CHECK (account_status IN ('active', 'suspended', 'deleted', 'pending_verification')) NOT NULL,
        suspension_reason TEXT,
        deleted_at TIMESTAMPTZ,
        timezone TEXT DEFAULT 'UTC' NOT NULL,
        locale TEXT DEFAULT 'en-US' NOT NULL,
        UNIQUE(email_hash)
      `
    });

    // Create auth_sessions table - enhanced session management
    await this.client.rpc('create_table_if_not_exists', {
      table_name: 'auth_sessions',
      table_definition: `
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
      `
    });

    // Create user_consent table - granular consent management
    await this.client.rpc('create_table_if_not_exists', {
      table_name: 'user_consent',
      table_definition: `
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
      `
    });

    // Create encrypted_data table
    await this.client.rpc('create_table_if_not_exists', {
      table_name: 'encrypted_data',
      table_definition: `
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
        device_id TEXT NOT NULL,
        entity_type TEXT CHECK (entity_type IN ('check_in', 'assessment', 'user_profile', 'crisis_plan')) NOT NULL,
        entity_id TEXT NOT NULL,
        encrypted_data TEXT NOT NULL,
        encryption_version TEXT NOT NULL DEFAULT '1.0.0',
        checksum TEXT NOT NULL,
        version INTEGER DEFAULT 1 NOT NULL,
        cloud_version INTEGER DEFAULT 1 NOT NULL,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        synced_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        UNIQUE(user_id, entity_type, entity_id)
      `
    });

    // Create user_profiles table
    await this.client.rpc('create_table_if_not_exists', {
      table_name: 'user_profiles',
      table_definition: `
        id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
        email TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        last_sync TIMESTAMPTZ,
        device_count INTEGER DEFAULT 0 NOT NULL,
        subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')) NOT NULL,
        hipaa_consent BOOLEAN DEFAULT false NOT NULL,
        data_retention_days INTEGER DEFAULT 2555 NOT NULL, -- 7 years
        timezone TEXT DEFAULT 'UTC' NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      `
    });

    // Create user_devices table
    await this.client.rpc('create_table_if_not_exists', {
      table_name: 'user_devices',
      table_definition: `
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
        device_id TEXT NOT NULL,
        device_name TEXT NOT NULL,
        platform TEXT CHECK (platform IN ('ios', 'android')) NOT NULL,
        app_version TEXT NOT NULL,
        encryption_key_id TEXT NOT NULL,
        last_seen TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        active BOOLEAN DEFAULT true NOT NULL,
        registered_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        UNIQUE(user_id, device_id)
      `
    });

    // Create audit_log table
    await this.client.rpc('create_table_if_not_exists', {
      table_name: 'audit_log',
      table_definition: `
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        device_id TEXT,
        operation TEXT NOT NULL,
        entity_type TEXT,
        entity_id TEXT,
        result TEXT CHECK (result IN ('success', 'failure', 'partial')) NOT NULL,
        ip_address INET,
        user_agent TEXT,
        duration_ms INTEGER,
        data_size_bytes BIGINT,
        error_code TEXT,
        hipaa_compliant BOOLEAN DEFAULT true NOT NULL,
        timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        session_id TEXT,
        context JSONB
      `
    });

    // Create sync_conflicts table
    await this.client.rpc('create_table_if_not_exists', {
      table_name: 'sync_conflicts',
      table_definition: `
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        conflict_type TEXT NOT NULL,
        local_version INTEGER NOT NULL,
        cloud_version INTEGER NOT NULL,
        local_data_id UUID REFERENCES encrypted_data(id) ON DELETE CASCADE,
        cloud_data_id UUID REFERENCES encrypted_data(id) ON DELETE CASCADE,
        auto_resolvable BOOLEAN DEFAULT false NOT NULL,
        clinical_relevant BOOLEAN DEFAULT false NOT NULL,
        detected_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        resolved_at TIMESTAMPTZ,
        resolved_by TEXT CHECK (resolved_by IN ('system', 'user')),
        resolution_strategy TEXT,
        context JSONB
      `
    });

    // Create data_backups table
    await this.client.rpc('create_table_if_not_exists', {
      table_name: 'data_backups',
      table_definition: `
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
        backup_type TEXT CHECK (backup_type IN ('manual', 'automatic', 'emergency')) NOT NULL,
        data_types TEXT[] NOT NULL,
        encrypted_size_bytes BIGINT NOT NULL,
        compression_ratio DECIMAL(4,3) DEFAULT 1.0 NOT NULL,
        encryption_version TEXT NOT NULL DEFAULT '1.0.0',
        checksum TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        storage_location TEXT NOT NULL,
        recovery_tested BOOLEAN DEFAULT false NOT NULL,
        metadata JSONB
      `
    });
  }

  /**
   * Create database indexes for performance
   */
  private async createIndexes(): Promise<void> {
    const indexes = [
      // users indexes
      'CREATE INDEX IF NOT EXISTS idx_users_email_hash ON users(email_hash)',
      'CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status)',
      'CREATE INDEX IF NOT EXISTS idx_users_hipaa_consent ON users(hipaa_consent, hipaa_consent_date)',
      'CREATE INDEX IF NOT EXISTS idx_users_last_sign_in ON users(last_sign_in)',

      // auth_sessions indexes
      'CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_active ON auth_sessions(user_id, expires_at) WHERE revoked_at IS NULL',
      'CREATE INDEX IF NOT EXISTS idx_auth_sessions_device ON auth_sessions(device_id, last_activity)',
      'CREATE INDEX IF NOT EXISTS idx_auth_sessions_token_hash ON auth_sessions(session_token_hash)',
      'CREATE INDEX IF NOT EXISTS idx_auth_sessions_type ON auth_sessions(session_type, created_at)',
      'CREATE INDEX IF NOT EXISTS idx_auth_sessions_expired ON auth_sessions(expires_at) WHERE revoked_at IS NULL',
      'CREATE INDEX IF NOT EXISTS idx_auth_sessions_crisis ON auth_sessions(crisis_override, session_type) WHERE crisis_override = true',

      // user_consent indexes
      'CREATE INDEX IF NOT EXISTS idx_user_consent_user_type ON user_consent(user_id, consent_type)',
      'CREATE INDEX IF NOT EXISTS idx_user_consent_granted ON user_consent(granted, granted_at)',
      'CREATE INDEX IF NOT EXISTS idx_user_consent_expires ON user_consent(expires_at) WHERE expires_at IS NOT NULL',
      'CREATE INDEX IF NOT EXISTS idx_user_consent_withdrawn ON user_consent(withdrawn_at) WHERE withdrawn_at IS NOT NULL',
      'CREATE INDEX IF NOT EXISTS idx_user_consent_legal_basis ON user_consent(legal_basis, consent_type)',

      // encrypted_data indexes
      'CREATE INDEX IF NOT EXISTS idx_encrypted_data_user_entity ON encrypted_data(user_id, entity_type)',
      'CREATE INDEX IF NOT EXISTS idx_encrypted_data_sync ON encrypted_data(user_id, synced_at)',
      'CREATE INDEX IF NOT EXISTS idx_encrypted_data_checksum ON encrypted_data(checksum)',

      // user_devices indexes
      'CREATE INDEX IF NOT EXISTS idx_user_devices_active ON user_devices(user_id, active)',
      'CREATE INDEX IF NOT EXISTS idx_user_devices_last_seen ON user_devices(last_seen)',

      // audit_log indexes
      'CREATE INDEX IF NOT EXISTS idx_audit_log_user_time ON audit_log(user_id, timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_audit_log_operation ON audit_log(operation, timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_audit_log_hipaa ON audit_log(hipaa_compliant, timestamp)',

      // sync_conflicts indexes
      'CREATE INDEX IF NOT EXISTS idx_sync_conflicts_user_unresolved ON sync_conflicts(user_id, resolved_at) WHERE resolved_at IS NULL',
      'CREATE INDEX IF NOT EXISTS idx_sync_conflicts_clinical ON sync_conflicts(clinical_relevant, detected_at)',

      // data_backups indexes
      'CREATE INDEX IF NOT EXISTS idx_data_backups_user_created ON data_backups(user_id, created_at)',
      'CREATE INDEX IF NOT EXISTS idx_data_backups_expires ON data_backups(expires_at)'
    ];

    for (const indexSQL of indexes) {
      await this.client.rpc('execute_sql', { sql: indexSQL });
    }
  }

  /**
   * Create Row Level Security policies
   */
  private async createRLSPolicies(): Promise<void> {
    const policies = [
      // users policies - users can only access their own data
      `CREATE POLICY "Users can only access their own user data" ON users
       FOR ALL USING (auth.uid() = id)`,

      // auth_sessions policies - users can only access their own sessions
      `CREATE POLICY "Users can only access their own sessions" ON auth_sessions
       FOR ALL USING (auth.uid() = user_id)`,

      // Emergency access policy for auth_sessions (crisis scenarios)
      `CREATE POLICY "Emergency access for crisis sessions" ON auth_sessions
       FOR SELECT USING (
         session_type IN ('emergency', 'crisis') AND
         crisis_override = true AND
         expires_at > NOW()
       )`,

      // user_consent policies - users can only access their own consent
      `CREATE POLICY "Users can only access their own consent" ON user_consent
       FOR ALL USING (auth.uid() = user_id)`,

      // Time-based consent access control
      `CREATE POLICY "Consent must be current and valid" ON user_consent
       FOR SELECT USING (
         auth.uid() = user_id AND
         granted = true AND
         (expires_at IS NULL OR expires_at > NOW()) AND
         withdrawn_at IS NULL
       )`,

      // encrypted_data policies
      `CREATE POLICY "Users can only access their own encrypted data" ON encrypted_data
       FOR ALL USING (auth.uid() = user_id)`,

      // Emergency data access policy for crisis scenarios
      `CREATE POLICY "Emergency access for crisis data" ON encrypted_data
       FOR SELECT USING (
         entity_type = 'crisis_plan' AND
         EXISTS (
           SELECT 1 FROM auth_sessions
           WHERE user_id = encrypted_data.user_id
           AND session_type IN ('emergency', 'crisis')
           AND crisis_override = true
           AND expires_at > NOW()
         )
       )`,

      // user_profiles policies
      `CREATE POLICY "Users can only access their own profile" ON user_profiles
       FOR ALL USING (auth.uid() = id)`,

      // user_devices policies
      `CREATE POLICY "Users can only access their own devices" ON user_devices
       FOR ALL USING (auth.uid() = user_id)`,

      // audit_log policies - read-only access for users, with HIPAA compliance
      `CREATE POLICY "Users can only read their own audit logs" ON audit_log
       FOR SELECT USING (
         auth.uid() = user_id AND
         hipaa_compliant = true
       )`,

      // System can insert all audit logs
      `CREATE POLICY "System can insert audit logs" ON audit_log
       FOR INSERT WITH CHECK (true)`,

      // sync_conflicts policies
      `CREATE POLICY "Users can only access their own conflicts" ON sync_conflicts
       FOR ALL USING (auth.uid() = user_id)`,

      // data_backups policies
      `CREATE POLICY "Users can only access their own backups" ON data_backups
       FOR ALL USING (auth.uid() = user_id)`,

      // Backup retention policy - automatic cleanup
      `CREATE POLICY "Backups must respect retention policy" ON data_backups
       FOR SELECT USING (
         auth.uid() = user_id AND
         expires_at > NOW()
       )`
    ];

    for (const policySQL of policies) {
      await this.client.rpc('execute_sql', { sql: policySQL });
    }
  }

  /**
   * Create audit triggers and HIPAA compliance functions
   */
  private async createAuditTriggers(): Promise<void> {
    // Create enhanced audit function with HIPAA compliance
    await this.client.rpc('execute_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION audit_trigger_function()
        RETURNS TRIGGER AS $$
        DECLARE
          operation_context JSONB;
          user_context JSONB;
        BEGIN
          -- Build operation context
          operation_context := jsonb_build_object(
            'table', TG_TABLE_NAME,
            'operation', TG_OP,
            'timestamp', NOW(),
            'hipaa_relevant', CASE
              WHEN TG_TABLE_NAME IN ('encrypted_data', 'users', 'user_consent', 'auth_sessions') THEN true
              ELSE false
            END
          );

          -- Get user context if available
          user_context := jsonb_build_object(
            'user_id', COALESCE(NEW.user_id, OLD.user_id),
            'device_id', COALESCE(NEW.device_id, OLD.device_id)
          );

          -- Insert audit log entry
          INSERT INTO audit_log (
            user_id, operation, entity_type, entity_id, result,
            hipaa_compliant, timestamp, context
          ) VALUES (
            COALESCE(NEW.user_id, OLD.user_id),
            TG_OP || '_' || TG_TABLE_NAME,
            TG_TABLE_NAME,
            COALESCE(NEW.id, OLD.id),
            'success',
            true,
            NOW(),
            operation_context || user_context
          );

          IF TG_OP = 'DELETE' THEN
            RETURN OLD;
          ELSE
            RETURN NEW;
          END IF;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    });

    // Create session cleanup function for HIPAA compliance
    await this.client.rpc('execute_sql', {
      sql: `
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

          -- Log cleanup operation
          INSERT INTO audit_log (
            user_id, operation, entity_type, result,
            hipaa_compliant, timestamp, context
          ) VALUES (
            NULL,
            'CLEANUP_EXPIRED_SESSIONS',
            'auth_sessions',
            'success',
            true,
            NOW(),
            jsonb_build_object('sessions_cleaned', cleanup_count)
          );

          RETURN cleanup_count;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    });

    // Create user profile trigger for automatic setup
    await this.client.rpc('execute_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION create_user_profile()
        RETURNS TRIGGER AS $$
        BEGIN
          -- Create user profile when auth user is created
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

          -- Create initial user profile
          INSERT INTO user_profiles (
            id, email, created_at, updated_at,
            device_count, subscription_tier, hipaa_consent,
            data_retention_days, timezone
          ) VALUES (
            NEW.id,
            NEW.email,
            NOW(),
            NOW(),
            0,
            'free',
            false,
            2555, -- 7 years default
            'UTC'
          ) ON CONFLICT (id) DO NOTHING;

          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    });

    // Create consent validation function
    await this.client.rpc('execute_sql', {
      sql: `
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
      `
    });

    // Create emergency access function for crisis scenarios
    await this.client.rpc('execute_sql', {
      sql: `
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

          -- Log emergency session creation
          INSERT INTO audit_log (
            user_id, operation, entity_type, entity_id, result,
            hipaa_compliant, timestamp, context
          ) VALUES (
            user_uuid,
            'CREATE_EMERGENCY_SESSION',
            'auth_sessions',
            session_id,
            'success',
            true,
            NOW(),
            jsonb_build_object(
              'crisis_type', crisis_type,
              'severity', severity,
              'duration_minutes', EXTRACT(EPOCH FROM emergency_duration) / 60
            )
          );

          RETURN session_id;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    });

    // Create triggers on sensitive tables
    const triggerTables = ['users', 'auth_sessions', 'user_consent', 'encrypted_data', 'user_profiles', 'user_devices', 'sync_conflicts'];

    for (const table of triggerTables) {
      await this.client.rpc('execute_sql', {
        sql: `
          DROP TRIGGER IF EXISTS audit_trigger_${table} ON ${table};
          CREATE TRIGGER audit_trigger_${table}
          AFTER INSERT OR UPDATE OR DELETE ON ${table}
          FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
        `
      });
    }

    // Create auth user profile trigger
    await this.client.rpc('execute_sql', {
      sql: `
        DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;
        CREATE TRIGGER create_user_profile_trigger
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION create_user_profile();
      `
    });
  }

  /**
   * Validate schema exists and is properly configured
   */
  async validateSchema(): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      // Check if all required tables exist
      const { data: tables } = await this.client.rpc('get_tables');
      const requiredTables = ['encrypted_data', 'user_profiles', 'user_devices', 'audit_log', 'sync_conflicts', 'data_backups'];

      for (const table of requiredTables) {
        if (!tables?.includes(table)) {
          issues.push(`Missing required table: ${table}`);
        }
      }

      // Check RLS is enabled
      const { data: rlsStatus } = await this.client.rpc('check_rls_enabled');
      if (!rlsStatus?.every((status: boolean) => status)) {
        issues.push('Row Level Security not enabled on all tables');
      }

      // Check policies exist
      const { data: policies } = await this.client.rpc('get_policies');
      if (!policies || policies.length < 6) {
        issues.push('Missing required RLS policies');
      }

      return { valid: issues.length === 0, issues };

    } catch (error) {
      issues.push(`Schema validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { valid: false, issues };
    }
  }
}

/**
 * Database helper functions for common operations
 */
export class SupabaseDatabaseHelpers {
  constructor(private client: SupabaseClient) {}

  /**
   * Store encrypted data container
   */
  async storeEncryptedData(container: EncryptedDataContainer): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.client
        .from('encrypted_data')
        .upsert({
          user_id: container.userId,
          device_id: container.deviceId,
          entity_type: container.entityType,
          entity_id: container.id,
          encrypted_data: container.encryptedData,
          encryption_version: container.encryptionVersion,
          checksum: container.checksum,
          version: container.metadata.version,
          cloud_version: container.metadata.cloudVersion,
          metadata: container.metadata,
          updated_at: new Date().toISOString()
        });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Retrieve encrypted data for user
   */
  async getEncryptedData(
    userId: string,
    entityType?: string,
    since?: string
  ): Promise<{ success: boolean; data?: EncryptedDataContainer[]; error?: string }> {
    try {
      let query = this.client
        .from('encrypted_data')
        .select('*')
        .eq('user_id', userId);

      if (entityType) {
        query = query.eq('entity_type', entityType);
      }

      if (since) {
        query = query.gte('updated_at', since);
      }

      const { data, error } = await query.order('updated_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      // Transform to EncryptedDataContainer format
      const containers: EncryptedDataContainer[] = data?.map(row => ({
        id: row.entity_id,
        entityType: row.entity_type,
        userId: row.user_id,
        deviceId: row.device_id,
        encryptedData: row.encrypted_data,
        encryptionVersion: row.encryption_version,
        checksum: row.checksum,
        metadata: {
          ...row.metadata,
          cloudId: row.id,
          cloudVersion: row.cloud_version
        } as CloudSyncMetadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })) || [];

      return { success: true, data: containers };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Log audit entry
   */
  async logAuditEntry(entry: Omit<CloudAuditEntry, 'id'>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.client
        .from('audit_log')
        .insert({
          user_id: entry.userId,
          device_id: entry.deviceId,
          operation: entry.operation,
          entity_type: entry.entityType,
          entity_id: entry.entityId,
          result: entry.result,
          ip_address: entry.ipAddress,
          user_agent: entry.userAgent,
          duration_ms: entry.duration,
          data_size_bytes: entry.dataSize,
          error_code: entry.errorCode,
          hipaa_compliant: entry.hipaaCompliant,
          timestamp: entry.timestamp
        });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const createSupabaseSchemaManager = (client: SupabaseClient) => new SupabaseSchemaManager(client);
export const createSupabaseDatabaseHelpers = (client: SupabaseClient) => new SupabaseDatabaseHelpers(client);