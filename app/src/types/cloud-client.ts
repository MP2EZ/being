/**
 * P0-CLOUD Phase 1 - Type-Safe Client Integration
 *
 * Comprehensive TypeScript types for connecting security and API infrastructure
 * with type-safe client implementations for zero-knowledge cloud sync.
 */

import { z } from 'zod';
import {
  CloudFeatureFlags,
  EncryptedDataContainer,
  CloudSyncMetadata,
  CloudSyncOperation,
  CloudSyncError,
  CloudConflict,
  CloudAuditEntry,
  EmergencySyncConfig,
  HIPAAComplianceStatus
} from './cloud';
import { Assessment } from './clinical';
import { CheckIn, UserProfile, CrisisPlan } from './index';
import { DataSensitivity } from './security';

/**
 * Type-safe feature flag configurations with progressive enablement
 */
export interface TypeSafeFeatureFlags extends CloudFeatureFlags {
  readonly profile: 'development' | 'staging' | 'production';
  readonly validatedAt: string;
  readonly enabledFeatures: readonly (keyof CloudFeatureFlags)[];
  readonly emergencyOverrides: {
    readonly crisisThresholdBypass: boolean;
    readonly offlineToCloudForced: boolean;
    readonly emergencySyncEnabled: boolean;
  };
}

/**
 * Progressive feature enablement configuration
 */
export interface FeatureFlagConfiguration {
  readonly environment: 'development' | 'staging' | 'production';
  readonly userTier: 'anonymous' | 'authenticated' | 'premium';
  readonly rolloutPercentage: number; // 0-100
  readonly dependencies: readonly (keyof CloudFeatureFlags)[];
  readonly safeguards: {
    readonly requiresUserConsent: boolean;
    readonly requiresBackup: boolean;
    readonly allowsOfflineRevert: boolean;
    readonly maxDataSize: number; // bytes
  };
}

/**
 * Type-safe client SDK configuration
 */
export interface CloudClientConfig {
  readonly encryption: {
    readonly algorithm: 'AES-256-GCM';
    readonly keyVersion: number;
    readonly rotationDays: number;
    readonly deriveFromBiometric: boolean;
  };
  readonly sync: {
    readonly batchSize: number;
    readonly retryAttempts: number;
    readonly timeoutMs: number;
    readonly conflictResolution: 'client' | 'server' | 'manual';
  };
  readonly privacy: {
    readonly zeroKnowledge: true;
    readonly auditLevel: 'minimal' | 'standard' | 'comprehensive';
    readonly dataRetentionDays: number;
    readonly allowAnalytics: boolean;
  };
  readonly emergency: EmergencySyncConfig;
  readonly featureFlags: TypeSafeFeatureFlags;
}

/**
 * Unified cloud client SDK interface
 */
export interface CloudClientSDK {
  // Initialization and status
  readonly initialize: (config: CloudClientConfig) => Promise<ClientSDKResult<void>>;
  readonly getStatus: () => Promise<ClientSDKResult<CloudClientStatus>>;
  readonly destroy: () => Promise<void>;

  // Authentication and session management
  readonly auth: CloudAuthClient;

  // Encrypted data operations
  readonly data: CloudDataClient;

  // Sync operations
  readonly sync: CloudSyncClient;

  // Feature flag management
  readonly features: CloudFeatureClient;

  // Emergency operations
  readonly emergency: CloudEmergencyClient;

  // Monitoring and compliance
  readonly monitor: CloudMonitorClient;
}

/**
 * Authentication client with multi-device support
 */
export interface CloudAuthClient {
  readonly signInAnonymous: () => Promise<ClientSDKResult<AuthSession>>;
  readonly signUpWithBiometric: (
    biometricData: BiometricAuthData
  ) => Promise<ClientSDKResult<AuthSession>>;
  readonly signInWithBiometric: (
    biometricData: BiometricAuthData
  ) => Promise<ClientSDKResult<AuthSession>>;
  readonly signOut: () => Promise<ClientSDKResult<void>>;
  readonly refreshSession: () => Promise<ClientSDKResult<AuthSession>>;
  readonly migrateAnonymousUser: (
    biometricData: BiometricAuthData
  ) => Promise<ClientSDKResult<UserMigrationResult>>;
  readonly getSession: () => AuthSession | null;
  readonly validateJWT: (token: string) => Promise<ClientSDKResult<JWTValidationResult>>;
  readonly revokeDevice: (deviceId: string) => Promise<ClientSDKResult<void>>;
  readonly listDevices: () => Promise<ClientSDKResult<readonly DeviceSession[]>>;
}

/**
 * Encrypted data client with type-safe operations
 */
export interface CloudDataClient {
  readonly store: <T extends EncryptableEntity>(
    entity: T,
    options?: StoreOptions
  ) => Promise<ClientSDKResult<EncryptedStorageResult<T>>>;

  readonly retrieve: <T extends EncryptableEntity>(
    id: string,
    entityType: T['entityType'],
    options?: RetrieveOptions
  ) => Promise<ClientSDKResult<T | null>>;

  readonly update: <T extends EncryptableEntity>(
    entity: T,
    options?: UpdateOptions
  ) => Promise<ClientSDKResult<EncryptedStorageResult<T>>>;

  readonly delete: (
    id: string,
    entityType: string,
    options?: DeleteOptions
  ) => Promise<ClientSDKResult<void>>;

  readonly batchStore: <T extends EncryptableEntity>(
    entities: readonly T[],
    options?: BatchStoreOptions
  ) => Promise<ClientSDKResult<BatchStorageResult<T>>>;

  readonly query: <T extends EncryptableEntity>(
    query: CloudDataQuery<T>,
    options?: QueryOptions
  ) => Promise<ClientSDKResult<CloudQueryResult<T>>>;
}

/**
 * Type-safe sync client with conflict resolution
 */
export interface CloudSyncClient {
  readonly syncEntity: <T extends EncryptableEntity>(
    entity: T,
    options?: any
  ) => Promise<ClientSDKResult<SyncResult<T>>>;

  readonly syncAll: (
    options?: any
  ) => Promise<ClientSDKResult<BatchSyncResult>>;

  readonly resolveConflict: <T extends EncryptableEntity>(
    conflict: CloudConflict,
    resolution: ConflictResolution<T>
  ) => Promise<ClientSDKResult<T>>;

  readonly getSyncStatus: () => Promise<ClientSDKResult<DetailedSyncStatus>>;

  readonly pauseSync: () => Promise<ClientSDKResult<void>>;
  readonly resumeSync: () => Promise<ClientSDKResult<void>>;

  readonly forcePush: (
    entityIds?: readonly string[]
  ) => Promise<ClientSDKResult<BatchSyncResult>>;

  readonly forcePull: (
    entityTypes?: readonly string[]
  ) => Promise<ClientSDKResult<BatchSyncResult>>;
}

/**
 * Feature flag client with type-safe configuration
 */
export interface CloudFeatureClient {
  readonly getFlags: () => Promise<ClientSDKResult<TypeSafeFeatureFlags>>;
  readonly updateFlags: (
    updates: Partial<TypeSafeFeatureFlags>
  ) => Promise<ClientSDKResult<TypeSafeFeatureFlags>>;
  readonly validateFlags: (
    flags: TypeSafeFeatureFlags
  ) => Promise<ClientSDKResult<FeatureFlagValidation>>;
  readonly resetToDefaults: () => Promise<ClientSDKResult<TypeSafeFeatureFlags>>;
  readonly getConfiguration: () => Promise<ClientSDKResult<FeatureFlagConfiguration>>;
}

/**
 * Emergency client with crisis-safe operations
 */
export interface CloudEmergencyClient {
  readonly triggerEmergencySync: (
    trigger: EmergencyTrigger
  ) => Promise<ClientSDKResult<EmergencySyncResult>>;

  readonly forceCloudBackup: (
    priorityData: readonly string[]
  ) => Promise<ClientSDKResult<EmergencyBackupResult>>;

  readonly validateCrisisData: (
    assessment: Assessment
  ) => Promise<ClientSDKResult<CrisisValidationResult>>;

  readonly emergencyRestore: (
    deviceId: string
  ) => Promise<ClientSDKResult<EmergencyRestoreResult>>;
}

/**
 * Monitoring and compliance client
 */
export interface CloudMonitorClient {
  readonly getAuditLogs: (
    filter?: AuditLogFilter
  ) => Promise<ClientSDKResult<readonly CloudAuditEntry[]>>;

  readonly getComplianceStatus: () => Promise<ClientSDKResult<HIPAAComplianceStatus>>;

  readonly reportSecurityEvent: (
    event: SecurityEvent
  ) => Promise<ClientSDKResult<void>>;

  readonly getPerformanceMetrics: () => Promise<ClientSDKResult<CloudPerformanceMetrics>>;

  readonly validateDataIntegrity: (
    entityIds?: readonly string[]
  ) => Promise<ClientSDKResult<DataIntegrityReport>>;
}

/**
 * Encryptable entity types for type-safe operations
 */
export type EncryptableEntity =
  | EncryptableCheckIn
  | EncryptableAssessment
  | EncryptableUserProfile
  | EncryptableCrisisPlan;

export interface EncryptableCheckIn extends CheckIn {
  readonly entityType: 'check_in';
  readonly sensitivity: DataSensitivity.PERSONAL;
  readonly encryptionRequired: true;
}

export interface EncryptableAssessment extends Assessment {
  readonly entityType: 'assessment';
  readonly sensitivity: DataSensitivity.CLINICAL;
  readonly encryptionRequired: true;
  readonly auditRequired: true;
}

export interface EncryptableUserProfile extends UserProfile {
  readonly entityType: 'user_profile';
  readonly sensitivity: DataSensitivity.THERAPEUTIC;
  readonly encryptionRequired: true;
}

export interface EncryptableCrisisPlan extends CrisisPlan {
  readonly entityType: 'crisis_plan';
  readonly sensitivity: DataSensitivity.CLINICAL;
  readonly encryptionRequired: true;
  readonly emergencyPriority: true;
}

/**
 * Authentication and session types
 */
export interface AuthSession {
  readonly id: string;
  readonly userId: string;
  readonly deviceId: string;
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: string;
  readonly scopes: readonly string[];
  readonly mfaVerified: boolean;
  readonly biometricVerified: boolean;
  readonly sessionType: 'anonymous' | 'authenticated';
}

export interface BiometricAuthData {
  readonly biometricId: string;
  readonly encryptedPublicKey: string;
  readonly biometricType: 'face' | 'fingerprint' | 'voice';
  readonly deviceBinding: string;
  readonly challenge: string;
  readonly signature: string;
}

export interface JWTValidationResult {
  readonly valid: boolean;
  readonly claims: Record<string, unknown>;
  readonly expiresAt: string;
  readonly issuer: string;
  readonly audience: string;
  readonly scope: readonly string[];
}

export interface DeviceSession {
  readonly deviceId: string;
  readonly deviceName: string;
  readonly platform: 'ios' | 'android';
  readonly appVersion: string;
  readonly lastActive: string;
  readonly location?: string; // Anonymized region
  readonly ipAddress?: string; // Anonymized
  readonly trusted: boolean;
}

export interface UserMigrationResult {
  readonly success: boolean;
  readonly newUserId: string;
  readonly migratedData: {
    readonly checkIns: number;
    readonly assessments: number;
    readonly userProfile: boolean;
    readonly crisisPlan: boolean;
  };
  readonly warnings: readonly string[];
  readonly duration: number; // milliseconds
}

/**
 * Data operation types
 */
export interface StoreOptions {
  readonly encrypt?: boolean;
  readonly audit?: boolean;
  readonly priority?: 'low' | 'normal' | 'high' | 'critical';
  readonly ttl?: number; // Time to live in seconds
  readonly tags?: readonly string[];
}

export interface RetrieveOptions {
  readonly decrypt?: boolean;
  readonly validateIntegrity?: boolean;
  readonly maxAge?: number; // seconds
  readonly allowCached?: boolean;
}

export interface UpdateOptions extends StoreOptions {
  readonly ifMatch?: string; // ETag for conditional updates
  readonly createIfNotExists?: boolean;
}

export interface DeleteOptions {
  readonly audit?: boolean;
  readonly reason?: string;
  readonly secureWipe?: boolean;
}

export interface BatchStoreOptions extends StoreOptions {
  readonly continueOnError?: boolean;
  readonly maxConcurrency?: number;
}

export interface QueryOptions {
  readonly limit?: number;
  readonly offset?: number;
  readonly orderBy?: string;
  readonly orderDirection?: 'asc' | 'desc';
  readonly includeTags?: readonly string[];
  readonly excludeTags?: readonly string[];
}

/**
 * Result types
 */
export interface ClientSDKResult<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: CloudSyncError;
  readonly metadata?: {
    readonly requestId: string;
    readonly timestamp: string;
    readonly latency: number;
    readonly retryCount: number;
  };
}

export interface EncryptedStorageResult<T extends EncryptableEntity> {
  readonly entity: T;
  readonly cloudId: string;
  readonly version: number;
  readonly checksum: string;
  readonly encryptedSize: number;
  readonly storedAt: string;
}

export interface BatchStorageResult<T extends EncryptableEntity> {
  readonly successful: readonly EncryptedStorageResult<T>[];
  readonly failed: readonly {
    readonly entity: T;
    readonly error: CloudSyncError;
  }[];
  readonly summary: {
    readonly total: number;
    readonly successful: number;
    readonly failed: number;
    readonly duration: number;
  };
}

export interface SyncResult<T extends EncryptableEntity> {
  readonly entity: T;
  readonly action: 'created' | 'updated' | 'deleted' | 'no-change';
  readonly conflicts: readonly CloudConflict[];
  readonly version: number;
  readonly syncedAt: string;
}

export interface BatchSyncResult {
  readonly results: readonly SyncResult<EncryptableEntity>[];
  readonly conflicts: readonly CloudConflict[];
  readonly summary: {
    readonly total: number;
    readonly created: number;
    readonly updated: number;
    readonly deleted: number;
    readonly conflicts: number;
    readonly duration: number;
  };
}

export interface ConflictResolution<T extends EncryptableEntity> {
  readonly strategy: 'keep-local' | 'keep-remote' | 'merge' | 'manual';
  readonly mergedEntity?: T;
  readonly reason: string;
  readonly preserveHistory: boolean;
}

/**
 * Status and monitoring types
 */
export interface CloudClientStatus {
  readonly connected: boolean;
  readonly authenticated: boolean;
  readonly lastSync: string | null;
  readonly syncHealth: 'healthy' | 'warning' | 'error';
  readonly featureFlags: TypeSafeFeatureFlags;
  readonly performance: {
    readonly averageLatency: number;
    readonly errorRate: number;
    readonly throughput: number;
  };
  readonly storage: {
    readonly totalEntities: number;
    readonly encryptedSize: number;
    readonly lastBackup: string | null;
  };
}

export interface DetailedSyncStatus {
  readonly enabled: boolean;
  readonly paused: boolean;
  readonly inProgress: boolean;
  readonly pendingOperations: number;
  readonly lastSyncAttempt: string | null;
  readonly lastSuccessfulSync: string | null;
  readonly conflicts: readonly CloudConflict[];
  readonly errorCount: number;
  readonly successRate: number; // 0-1
  readonly bandwidth: {
    readonly uploaded: number; // bytes
    readonly downloaded: number; // bytes
    readonly quota: number; // bytes
  };
}

export interface FeatureFlagValidation {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly recommendations: readonly string[];
  readonly safeToApply: boolean;
}

/**
 * Emergency and crisis types
 */
export interface EmergencyTrigger {
  readonly type: 'phq9_threshold' | 'gad7_threshold' | 'crisis_button' | 'manual';
  readonly assessmentId?: string;
  readonly score?: number;
  readonly reason?: string;
  readonly timestamp: string;
}

export interface EmergencySyncResult {
  readonly triggered: boolean;
  readonly syncedEntities: readonly string[];
  readonly duration: number;
  readonly emergencyContactsNotified: boolean;
  readonly crisisDataBackedUp: boolean;
}

export interface EmergencyBackupResult {
  readonly backupId: string;
  readonly entityCount: number;
  readonly encryptedSize: number;
  readonly duration: number;
  readonly verificationHash: string;
}

export interface CrisisValidationResult {
  readonly requiresIntervention: boolean;
  readonly riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  readonly triggers: readonly string[];
  readonly recommendedActions: readonly string[];
  readonly emergencyContactRequired: boolean;
  readonly professionalReferralRequired: boolean;
}

export interface EmergencyRestoreResult {
  readonly restored: boolean;
  readonly entityCount: number;
  readonly duration: number;
  readonly warnings: readonly string[];
  readonly integrityVerified: boolean;
}

/**
 * Query and search types
 */
export interface CloudDataQuery<T extends EncryptableEntity> {
  readonly entityType: T['entityType'];
  readonly filters: {
    readonly userId?: string;
    readonly dateRange?: {
      readonly start: string;
      readonly end: string;
    };
    readonly sensitivity?: DataSensitivity;
    readonly tags?: readonly string[];
  };
  readonly search?: {
    readonly query: string;
    readonly fields: readonly (keyof T)[];
    readonly encrypted: boolean;
  };
}

export interface CloudQueryResult<T extends EncryptableEntity> {
  readonly entities: readonly T[];
  readonly totalCount: number;
  readonly hasMore: boolean;
  readonly nextCursor?: string;
  readonly searchRelevance?: readonly number[];
}

/**
 * Monitoring and compliance types
 */
export interface AuditLogFilter {
  readonly userId?: string;
  readonly entityType?: string;
  readonly operation?: string;
  readonly dateRange?: {
    readonly start: string;
    readonly end: string;
  };
  readonly result?: 'success' | 'failure' | 'partial';
  readonly limit?: number;
}

export interface SecurityEvent {
  readonly type: 'authentication_failure' | 'unauthorized_access' | 'data_breach' | 'encryption_failure';
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly description: string;
  readonly metadata: Record<string, unknown>;
  readonly timestamp: string;
}

export interface CloudPerformanceMetrics {
  readonly latency: {
    readonly p50: number;
    readonly p95: number;
    readonly p99: number;
  };
  readonly throughput: {
    readonly requestsPerSecond: number;
    readonly bytesPerSecond: number;
  };
  readonly errors: {
    readonly rate: number;
    readonly types: Record<string, number>;
  };
  readonly sync: {
    readonly averageTime: number;
    readonly successRate: number;
    readonly conflictRate: number;
  };
}

export interface DataIntegrityReport {
  readonly checked: number;
  readonly verified: number;
  readonly corrupted: readonly string[];
  readonly missing: readonly string[];
  readonly mismatched: readonly string[];
  readonly recommendations: readonly string[];
}

/**
 * Zod schemas for runtime validation
 */
export const TypeSafeFeatureFlagsSchema = z.object({
  enabled: z.boolean(),
  supabaseSync: z.boolean(),
  encryptedBackup: z.boolean(),
  crossDeviceSync: z.boolean(),
  conflictResolution: z.boolean(),
  auditLogging: z.boolean(),
  emergencySync: z.boolean(),
  profile: z.enum(['development', 'staging', 'production']),
  validatedAt: z.string().datetime(),
  enabledFeatures: z.array(z.string()),
  emergencyOverrides: z.object({
    crisisThresholdBypass: z.boolean(),
    offlineToCloudForced: z.boolean(),
    emergencySyncEnabled: z.boolean()
  })
}).readonly();

export const CloudClientConfigSchema = z.object({
  encryption: z.object({
    algorithm: z.literal('AES-256-GCM'),
    keyVersion: z.number().int().positive(),
    rotationDays: z.number().int().positive(),
    deriveFromBiometric: z.boolean()
  }),
  sync: z.object({
    batchSize: z.number().int().positive().max(100),
    retryAttempts: z.number().int().min(0).max(10),
    timeoutMs: z.number().int().positive(),
    conflictResolution: z.enum(['client', 'server', 'manual'])
  }),
  privacy: z.object({
    zeroKnowledge: z.literal(true),
    auditLevel: z.enum(['minimal', 'standard', 'comprehensive']),
    dataRetentionDays: z.number().int().positive(),
    allowAnalytics: z.boolean()
  }),
  emergency: z.object({
    enabled: z.boolean(),
    triggers: z.array(z.enum(['phq9_threshold', 'gad7_threshold', 'crisis_button', 'manual'])),
    priorityData: z.array(z.enum(['crisis_plan', 'assessments', 'recent_checkins'])),
    timeoutMs: z.number().int().positive(),
    maxRetries: z.number().int().min(0),
    forceSync: z.boolean()
  }),
  featureFlags: TypeSafeFeatureFlagsSchema
}).readonly();

export const AuthSessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  deviceId: z.string().min(1),
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresAt: z.string().datetime(),
  scopes: z.array(z.string()),
  mfaVerified: z.boolean(),
  biometricVerified: z.boolean(),
  sessionType: z.enum(['anonymous', 'authenticated'])
}).readonly();

export const EncryptableEntitySchema = z.discriminatedUnion('entityType', [
  z.object({
    entityType: z.literal('check_in'),
    sensitivity: z.literal(DataSensitivity.PERSONAL),
    encryptionRequired: z.literal(true)
  }).passthrough(),
  z.object({
    entityType: z.literal('assessment'),
    sensitivity: z.literal(DataSensitivity.CLINICAL),
    encryptionRequired: z.literal(true),
    auditRequired: z.literal(true)
  }).passthrough(),
  z.object({
    entityType: z.literal('user_profile'),
    sensitivity: z.literal(DataSensitivity.THERAPEUTIC),
    encryptionRequired: z.literal(true)
  }).passthrough(),
  z.object({
    entityType: z.literal('crisis_plan'),
    sensitivity: z.literal(DataSensitivity.CLINICAL),
    encryptionRequired: z.literal(true),
    emergencyPriority: z.literal(true)
  }).passthrough()
]);

/**
 * Type guards for cloud client types
 */
export const isCloudClientConfig = (config: unknown): config is CloudClientConfig => {
  try {
    CloudClientConfigSchema.parse(config);
    return true;
  } catch {
    return false;
  }
};

export const isAuthSession = (session: unknown): session is AuthSession => {
  try {
    AuthSessionSchema.parse(session);
    return true;
  } catch {
    return false;
  }
};

export const isEncryptableEntity = (entity: unknown): entity is EncryptableEntity => {
  try {
    EncryptableEntitySchema.parse(entity);
    return true;
  } catch {
    return false;
  }
};

/**
 * Constants for cloud client configuration
 */
export const CLOUD_CLIENT_CONSTANTS = {
  // Default configuration values
  DEFAULT_CONFIG: {
    encryption: {
      algorithm: 'AES-256-GCM' as const,
      keyVersion: 1,
      rotationDays: 90,
      deriveFromBiometric: true
    },
    sync: {
      batchSize: 50,
      retryAttempts: 3,
      timeoutMs: 30000,
      conflictResolution: 'manual' as const
    },
    privacy: {
      zeroKnowledge: true as const,
      auditLevel: 'comprehensive' as const,
      dataRetentionDays: 2555, // 7 years
      allowAnalytics: false
    }
  },

  // Performance thresholds
  PERFORMANCE: {
    MAX_LATENCY_MS: 200,
    MAX_ERROR_RATE: 0.01,
    MIN_SUCCESS_RATE: 0.99,
    MAX_SYNC_TIME_MS: 10000
  },

  // Security limits
  SECURITY: {
    MAX_SESSION_DURATION_MS: 1800000, // 30 minutes
    MAX_DEVICES_PER_USER: 5,
    MIN_PASSWORD_STRENGTH: 8,
    MAX_LOGIN_ATTEMPTS: 3
  },

  // Data limits
  DATA: {
    MAX_ENTITY_SIZE_MB: 10,
    MAX_BATCH_SIZE: 100,
    MAX_QUERY_RESULTS: 1000,
    MAX_AUDIT_LOGS: 10000
  }
} as const;