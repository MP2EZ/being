/**
 * Authentication & Session Types - Multi-Device Support
 *
 * Type-safe authentication with biometric support, JWT validation,
 * session management, and user migration (anonymous → authenticated).
 */

import { z } from 'zod';
import { UserProfile } from './index';

/**
 * Authentication session with enhanced security
 */
export interface AuthSession {
  readonly id: string;
  readonly userId: string;
  readonly deviceId: string;
  readonly sessionType: 'anonymous' | 'authenticated' | 'emergency';
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly lastActivity: string;
  readonly tokens: SessionTokens;
  readonly security: SessionSecurity;
  readonly device: DeviceInfo;
  readonly permissions: SessionPermissions;
  readonly compliance: SessionCompliance;
}

/**
 * Session tokens with rotation support
 */
export interface SessionTokens {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly idToken?: string; // OIDC compliance
  readonly deviceToken: string; // Device-specific token
  readonly emergencyToken?: string; // Crisis access token
  readonly tokenType: 'Bearer';
  readonly expiresIn: number; // seconds
  readonly scope: readonly string[];
  readonly issuedAt: string;
  readonly issuer: string;
  readonly audience: string;
}

/**
 * Session security metadata
 */
export interface SessionSecurity {
  readonly authMethod: 'anonymous' | 'biometric' | 'password' | 'emergency';
  readonly mfaEnabled: boolean;
  readonly mfaVerified: boolean;
  readonly biometricVerified: boolean;
  readonly deviceTrusted: boolean;
  readonly ipAddress?: string; // Anonymized for privacy
  readonly userAgent?: string;
  readonly geoLocation?: string; // Region only for compliance
  readonly riskScore: number; // 0-1, higher = more risky
  readonly securityFlags: readonly SecurityFlag[];
}

export interface SecurityFlag {
  readonly type: 'new_device' | 'location_change' | 'unusual_activity' | 'failed_attempts';
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly description: string;
  readonly detectedAt: string;
  readonly resolved: boolean;
}

/**
 * Enhanced device information for multi-device sync
 */
export interface DeviceInfo {
  readonly deviceId: string;
  readonly deviceName: string;
  readonly platform: 'ios' | 'android' | 'web' | 'unknown';
  readonly osVersion: string;
  readonly appVersion: string;
  readonly deviceModel?: string;
  readonly screenSize?: string;
  readonly locale: string;
  readonly timezone: string;
  readonly lastSeen: string;
  readonly firstSeen: string;
  readonly syncEnabled: boolean;
  readonly encryptionCapabilities: DeviceEncryptionCapabilities;
  readonly biometricCapabilities: BiometricCapabilities;
  readonly networkInfo: DeviceNetworkInfo;
}

export interface DeviceEncryptionCapabilities {
  readonly hardwareEncryption: boolean;
  readonly keychainAccess: boolean;
  readonly biometricKeyDerivation: boolean;
  readonly secureEnclave: boolean;
  readonly webCryptoSupport: boolean;
  readonly encryptionAlgorithms: readonly string[];
}

export interface BiometricCapabilities {
  readonly available: boolean;
  readonly types: readonly ('face' | 'fingerprint' | 'voice' | 'iris')[];
  readonly enrolled: boolean;
  readonly hardwareBacked: boolean;
  readonly fallbackAvailable: boolean;
}

export interface DeviceNetworkInfo {
  readonly connectionType: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  readonly carrier?: string;
  readonly country?: string; // For compliance verification
  readonly isVPN: boolean;
  readonly isProxy: boolean;
  readonly bandwidthEstimate?: number; // Mbps
}

/**
 * Session permissions for granular access control
 */
export interface SessionPermissions {
  readonly dataAccess: {
    readonly read: readonly ('checkins' | 'assessments' | 'profile' | 'crisis_plan')[];
    readonly write: readonly ('checkins' | 'assessments' | 'profile' | 'crisis_plan')[];
    readonly delete: readonly ('checkins' | 'assessments' | 'profile' | 'crisis_plan')[];
  };
  readonly features: {
    readonly cloudSync: boolean;
    readonly crossDeviceSync: boolean;
    readonly exportData: boolean;
    readonly emergencyFeatures: boolean;
    readonly adminFeatures: boolean;
  };
  readonly restrictions: {
    readonly dataRetentionDays?: number;
    readonly maxDevices?: number;
    readonly geographicRestrictions?: readonly string[];
    readonly timeBasedAccess?: TimeBasedAccess;
  };
}

export interface TimeBasedAccess {
  readonly allowedHours: {
    readonly start: string; // HH:mm format
    readonly end: string;   // HH:mm format
  };
  readonly allowedDays: readonly (0 | 1 | 2 | 3 | 4 | 5 | 6)[]; // 0 = Sunday
  readonly timezone: string;
  readonly emergencyOverride: boolean;
}

/**
 * Session compliance tracking
 */
export interface SessionCompliance {
  readonly hipaaCompliant: boolean;
  readonly consentGiven: boolean;
  readonly consentVersion: string;
  readonly consentTimestamp: string;
  readonly dataProcessingAgreement: boolean;
  readonly auditingEnabled: boolean;
  readonly retentionPolicyAccepted: boolean;
  readonly privacyPolicyVersion: string;
  readonly complianceFlags: readonly ComplianceFlag[];
}

export interface ComplianceFlag {
  readonly requirement: 'HIPAA' | 'GDPR' | 'CCPA' | 'SOC2';
  readonly status: 'compliant' | 'non-compliant' | 'pending' | 'unknown';
  readonly details: string;
  readonly lastChecked: string;
}

/**
 * Biometric authentication data
 */
export interface BiometricAuthData {
  readonly biometricId: string;
  readonly biometricType: 'face' | 'fingerprint' | 'voice' | 'iris';
  readonly publicKey: string; // Base64 encoded public key
  readonly encryptedPrivateKey: string; // Encrypted with device key
  readonly deviceBinding: string; // Device-specific binding
  readonly enrollmentData: BiometricEnrollmentData;
  readonly challenge: string;
  readonly signature: string;
  readonly timestamp: string;
}

export interface BiometricEnrollmentData {
  readonly enrolledAt: string;
  readonly algorithm: string;
  readonly version: string;
  readonly quality: number; // 0-1
  readonly templateSize: number; // bytes
  readonly multipleEnrollments: boolean;
  readonly livenessTested: boolean;
  readonly antiSpoofingEnabled: boolean;
}

/**
 * JWT token validation and claims
 */
export interface JWTValidationResult {
  readonly valid: boolean;
  readonly expired: boolean;
  readonly claims: JWTClaims;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly trustLevel: number; // 0-1
}

export interface JWTClaims {
  readonly iss: string; // Issuer
  readonly sub: string; // Subject (user ID)
  readonly aud: string; // Audience
  readonly exp: number; // Expiration time
  readonly iat: number; // Issued at
  readonly nbf?: number; // Not before
  readonly jti: string; // JWT ID
  readonly scope: readonly string[];
  readonly deviceId: string;
  readonly sessionType: 'anonymous' | 'authenticated' | 'emergency';
  readonly authMethod: string;
  readonly mfaVerified: boolean;
  readonly customClaims: Record<string, unknown>;
}

/**
 * User migration from anonymous to authenticated
 */
export interface UserMigration {
  readonly migrationId: string;
  readonly anonymousUserId: string;
  readonly authenticatedUserId: string;
  readonly initiatedAt: string;
  readonly completedAt?: string;
  readonly status: 'initiated' | 'in-progress' | 'completed' | 'failed' | 'rolled-back';
  readonly migrationPlan: MigrationPlan;
  readonly dataTransfer: DataTransferStatus;
  readonly verification: MigrationVerification;
  readonly rollbackPlan?: RollbackPlan;
}

export interface MigrationPlan {
  readonly strategy: 'merge' | 'replace' | 'selective';
  readonly dataTypes: readonly ('checkins' | 'assessments' | 'profile' | 'crisis_plan')[];
  readonly preserveHistory: boolean;
  readonly encryptionUpgrade: boolean;
  readonly notifyUser: boolean;
  readonly backupRequired: boolean;
  readonly estimatedDuration: number; // milliseconds
}

export interface DataTransferStatus {
  readonly checkIns: TransferItemStatus;
  readonly assessments: TransferItemStatus;
  readonly userProfile: TransferItemStatus;
  readonly crisisPlan: TransferItemStatus;
  readonly totalItems: number;
  readonly transferredItems: number;
  readonly failedItems: number;
  readonly bytesTransferred: number;
}

export interface TransferItemStatus {
  readonly total: number;
  readonly transferred: number;
  readonly failed: number;
  readonly errors: readonly string[];
  readonly lastTransferred?: string;
}

export interface MigrationVerification {
  readonly dataIntegrityVerified: boolean;
  readonly encryptionVerified: boolean;
  readonly accessVerified: boolean;
  readonly complianceVerified: boolean;
  readonly verificationResults: readonly VerificationResult[];
  readonly confidence: number; // 0-1
}

export interface VerificationResult {
  readonly category: 'data' | 'encryption' | 'access' | 'compliance';
  readonly passed: boolean;
  readonly details: string;
  readonly criticalIssues: readonly string[];
  readonly warnings: readonly string[];
}

export interface RollbackPlan {
  readonly enabled: boolean;
  readonly automaticTriggers: readonly string[];
  readonly rollbackSteps: readonly RollbackStep[];
  readonly dataBackup: string; // Backup location/identifier
  readonly timeoutMinutes: number;
}

export interface RollbackStep {
  readonly step: number;
  readonly action: string;
  readonly description: string;
  readonly critical: boolean;
  readonly estimatedDuration: number; // milliseconds
}

/**
 * Multi-device session management
 */
export interface MultiDeviceSession {
  readonly primaryDeviceId: string;
  readonly sessions: readonly AuthSession[];
  readonly syncStatus: DeviceSyncStatus;
  readonly conflictResolution: DeviceConflictResolution;
  readonly securityPolicy: MultiDeviceSecurityPolicy;
  readonly limitations: MultiDeviceLimitations;
}

export interface DeviceSyncStatus {
  readonly lastSync: string;
  readonly syncHealth: 'healthy' | 'warning' | 'error';
  readonly conflictCount: number;
  readonly pendingOperations: number;
  readonly bandwidthUsage: number; // bytes
  readonly devices: readonly DeviceSyncInfo[];
}

export interface DeviceSyncInfo {
  readonly deviceId: string;
  readonly lastSeen: string;
  readonly syncEnabled: boolean;
  readonly healthStatus: 'online' | 'offline' | 'error';
  readonly pendingOperations: number;
  readonly lastError?: string;
}

export interface DeviceConflictResolution {
  readonly strategy: 'latest-wins' | 'device-priority' | 'manual' | 'merge';
  readonly devicePriority: readonly string[]; // Device IDs in priority order
  readonly conflictHistory: readonly DeviceConflict[];
  readonly automaticResolution: boolean;
}

export interface DeviceConflict {
  readonly conflictId: string;
  readonly deviceIds: readonly string[];
  readonly dataType: string;
  readonly detectedAt: string;
  readonly resolvedAt?: string;
  readonly resolution?: string;
  readonly manual: boolean;
}

export interface MultiDeviceSecurityPolicy {
  readonly maxDevices: number;
  readonly deviceTrustRequired: boolean;
  readonly crossDeviceEncryption: boolean;
  readonly deviceRevocation: DeviceRevocationPolicy;
  readonly suspiciousActivityDetection: boolean;
}

export interface DeviceRevocationPolicy {
  readonly automaticRevocation: boolean;
  readonly inactivityDays: number;
  readonly suspiciousActivityThreshold: number;
  readonly manualRevocationAllowed: boolean;
  readonly revocationNotification: boolean;
}

export interface MultiDeviceLimitations {
  readonly dataTypesShared: readonly string[];
  readonly featureRestrictions: Record<string, boolean>;
  readonly bandwidthLimits?: BandwidthLimits;
  readonly regionRestrictions?: readonly string[];
}

export interface BandwidthLimits {
  readonly dailyLimit: number; // bytes
  readonly monthlyLimit: number; // bytes
  readonly throttleThreshold: number; // bytes
  readonly emergencyBypass: boolean;
}

/**
 * Session activity tracking
 */
export interface SessionActivity {
  readonly sessionId: string;
  readonly activities: readonly ActivityEntry[];
  readonly aggregatedMetrics: ActivityMetrics;
  readonly anomalies: readonly ActivityAnomaly[];
  readonly complianceEvents: readonly ComplianceEvent[];
}

export interface ActivityEntry {
  readonly id: string;
  readonly timestamp: string;
  readonly type: 'login' | 'logout' | 'data_access' | 'sync' | 'error' | 'security_event';
  readonly details: Record<string, unknown>;
  readonly deviceId: string;
  readonly ipAddress?: string; // Anonymized
  readonly duration?: number; // milliseconds
  readonly success: boolean;
}

export interface ActivityMetrics {
  readonly totalSessions: number;
  readonly averageSessionDuration: number; // milliseconds
  readonly dataTransferred: number; // bytes
  readonly errorsEncountered: number;
  readonly securityEvents: number;
  readonly uniqueDevices: number;
  readonly timeRange: {
    readonly start: string;
    readonly end: string;
  };
}

export interface ActivityAnomaly {
  readonly id: string;
  readonly type: 'unusual_location' | 'multiple_devices' | 'high_activity' | 'failed_auth';
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly description: string;
  readonly detectedAt: string;
  readonly resolved: boolean;
  readonly actionTaken?: string;
}

export interface ComplianceEvent {
  readonly id: string;
  readonly type: 'data_access' | 'consent_change' | 'retention_action' | 'audit_log';
  readonly timestamp: string;
  readonly details: Record<string, unknown>;
  readonly complianceStatus: 'compliant' | 'violation' | 'warning';
  readonly actionRequired: boolean;
}

/**
 * Zod schemas for runtime validation
 */
export const AuthSessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  deviceId: z.string().min(1),
  sessionType: z.enum(['anonymous', 'authenticated', 'emergency']),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  lastActivity: z.string().datetime(),
  tokens: z.object({
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1),
    idToken: z.string().optional(),
    deviceToken: z.string().min(1),
    emergencyToken: z.string().optional(),
    tokenType: z.literal('Bearer'),
    expiresIn: z.number().int().positive(),
    scope: z.array(z.string()),
    issuedAt: z.string().datetime(),
    issuer: z.string().url(),
    audience: z.string()
  }),
  security: z.object({
    authMethod: z.enum(['anonymous', 'biometric', 'password', 'emergency']),
    mfaEnabled: z.boolean(),
    mfaVerified: z.boolean(),
    biometricVerified: z.boolean(),
    deviceTrusted: z.boolean(),
    ipAddress: z.string().optional(),
    userAgent: z.string().optional(),
    geoLocation: z.string().optional(),
    riskScore: z.number().min(0).max(1),
    securityFlags: z.array(z.object({
      type: z.enum(['new_device', 'location_change', 'unusual_activity', 'failed_attempts']),
      severity: z.enum(['low', 'medium', 'high', 'critical']),
      description: z.string(),
      detectedAt: z.string().datetime(),
      resolved: z.boolean()
    }))
  }).passthrough(),
  device: z.object({
    deviceId: z.string().min(1),
    deviceName: z.string(),
    platform: z.enum(['ios', 'android', 'web', 'unknown']),
    osVersion: z.string(),
    appVersion: z.string(),
    deviceModel: z.string().optional(),
    screenSize: z.string().optional(),
    locale: z.string(),
    timezone: z.string(),
    lastSeen: z.string().datetime(),
    firstSeen: z.string().datetime(),
    syncEnabled: z.boolean()
  }).passthrough(),
  permissions: z.object({
    dataAccess: z.object({
      read: z.array(z.enum(['checkins', 'assessments', 'profile', 'crisis_plan'])),
      write: z.array(z.enum(['checkins', 'assessments', 'profile', 'crisis_plan'])),
      delete: z.array(z.enum(['checkins', 'assessments', 'profile', 'crisis_plan']))
    }),
    features: z.object({
      cloudSync: z.boolean(),
      crossDeviceSync: z.boolean(),
      exportData: z.boolean(),
      emergencyFeatures: z.boolean(),
      adminFeatures: z.boolean()
    }),
    restrictions: z.object({
      dataRetentionDays: z.number().int().positive().optional(),
      maxDevices: z.number().int().positive().optional(),
      geographicRestrictions: z.array(z.string()).optional(),
      timeBasedAccess: z.object({
        allowedHours: z.object({
          start: z.string().regex(/^\d{2}:\d{2}$/),
          end: z.string().regex(/^\d{2}:\d{2}$/)
        }),
        allowedDays: z.array(z.number().int().min(0).max(6)),
        timezone: z.string(),
        emergencyOverride: z.boolean()
      }).optional()
    })
  }),
  compliance: z.object({
    hipaaCompliant: z.boolean(),
    consentGiven: z.boolean(),
    consentVersion: z.string(),
    consentTimestamp: z.string().datetime(),
    dataProcessingAgreement: z.boolean(),
    auditingEnabled: z.boolean(),
    retentionPolicyAccepted: z.boolean(),
    privacyPolicyVersion: z.string(),
    complianceFlags: z.array(z.object({
      requirement: z.enum(['HIPAA', 'GDPR', 'CCPA', 'SOC2']),
      status: z.enum(['compliant', 'non-compliant', 'pending', 'unknown']),
      details: z.string(),
      lastChecked: z.string().datetime()
    }))
  })
}).readonly();

export const BiometricAuthDataSchema = z.object({
  biometricId: z.string().uuid(),
  biometricType: z.enum(['face', 'fingerprint', 'voice', 'iris']),
  publicKey: z.string().min(1),
  encryptedPrivateKey: z.string().min(1),
  deviceBinding: z.string().min(1),
  enrollmentData: z.object({
    enrolledAt: z.string().datetime(),
    algorithm: z.string(),
    version: z.string(),
    quality: z.number().min(0).max(1),
    templateSize: z.number().int().positive(),
    multipleEnrollments: z.boolean(),
    livenessTested: z.boolean(),
    antiSpoofingEnabled: z.boolean()
  }),
  challenge: z.string().min(32),
  signature: z.string().min(1),
  timestamp: z.string().datetime()
}).readonly();

export const UserMigrationSchema = z.object({
  migrationId: z.string().uuid(),
  anonymousUserId: z.string().uuid(),
  authenticatedUserId: z.string().uuid(),
  initiatedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  status: z.enum(['initiated', 'in-progress', 'completed', 'failed', 'rolled-back']),
  migrationPlan: z.object({
    strategy: z.enum(['merge', 'replace', 'selective']),
    dataTypes: z.array(z.enum(['checkins', 'assessments', 'profile', 'crisis_plan'])),
    preserveHistory: z.boolean(),
    encryptionUpgrade: z.boolean(),
    notifyUser: z.boolean(),
    backupRequired: z.boolean(),
    estimatedDuration: z.number().int().positive()
  }),
  dataTransfer: z.object({
    checkIns: z.object({
      total: z.number().int().nonnegative(),
      transferred: z.number().int().nonnegative(),
      failed: z.number().int().nonnegative(),
      errors: z.array(z.string()),
      lastTransferred: z.string().datetime().optional()
    }),
    assessments: z.object({
      total: z.number().int().nonnegative(),
      transferred: z.number().int().nonnegative(),
      failed: z.number().int().nonnegative(),
      errors: z.array(z.string()),
      lastTransferred: z.string().datetime().optional()
    }),
    userProfile: z.object({
      total: z.number().int().nonnegative(),
      transferred: z.number().int().nonnegative(),
      failed: z.number().int().nonnegative(),
      errors: z.array(z.string()),
      lastTransferred: z.string().datetime().optional()
    }),
    crisisPlan: z.object({
      total: z.number().int().nonnegative(),
      transferred: z.number().int().nonnegative(),
      failed: z.number().int().nonnegative(),
      errors: z.array(z.string()),
      lastTransferred: z.string().datetime().optional()
    }),
    totalItems: z.number().int().nonnegative(),
    transferredItems: z.number().int().nonnegative(),
    failedItems: z.number().int().nonnegative(),
    bytesTransferred: z.number().int().nonnegative()
  }).passthrough()
}).readonly();

/**
 * Type guards for authentication types
 */
export const isAuthSession = (session: unknown): session is AuthSession => {
  try {
    AuthSessionSchema.parse(session);
    return true;
  } catch {
    return false;
  }
};

export const isBiometricAuthData = (data: unknown): data is BiometricAuthData => {
  try {
    BiometricAuthDataSchema.parse(data);
    return true;
  } catch {
    return false;
  }
};

export const isUserMigration = (migration: unknown): migration is UserMigration => {
  try {
    UserMigrationSchema.parse(migration);
    return true;
  } catch {
    return false;
  }
};

/**
 * Constants for authentication and session management
 */
export const AUTH_CONSTANTS = {
  // Session timeouts
  SESSION: {
    ANONYMOUS_TIMEOUT_MINUTES: 60,
    AUTHENTICATED_TIMEOUT_MINUTES: 30,
    EMERGENCY_TIMEOUT_MINUTES: 15,
    IDLE_TIMEOUT_MINUTES: 15,
    ABSOLUTE_TIMEOUT_HOURS: 8
  },

  // Security thresholds
  SECURITY: {
    MAX_FAILED_ATTEMPTS: 3,
    LOCKOUT_DURATION_MINUTES: 15,
    RISK_SCORE_THRESHOLD: 0.7,
    BIOMETRIC_QUALITY_THRESHOLD: 0.8,
    DEVICE_TRUST_PERIOD_DAYS: 30
  },

  // Multi-device limits
  MULTI_DEVICE: {
    MAX_DEVICES_ANONYMOUS: 1,
    MAX_DEVICES_AUTHENTICATED: 3,
    MAX_DEVICES_PREMIUM: 5,
    SYNC_CONFLICT_TIMEOUT_MINUTES: 10,
    DEVICE_INACTIVITY_DAYS: 90
  },

  // Migration parameters
  MIGRATION: {
    MAX_MIGRATION_TIME_MINUTES: 30,
    BACKUP_RETENTION_DAYS: 30,
    VERIFICATION_ATTEMPTS: 3,
    ROLLBACK_TIMEOUT_MINUTES: 10
  },

  // Compliance requirements
  COMPLIANCE: {
    CONSENT_VERSION_CURRENT: '2024.1',
    PRIVACY_POLICY_VERSION_CURRENT: '2024.1',
    AUDIT_LOG_RETENTION_DAYS: 2555, // 7 years
    DATA_RETENTION_DAYS_DEFAULT: 2555
  }
} as const;