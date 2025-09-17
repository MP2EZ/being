/**
 * P0-CLOUD Phase 1 Types - Zero-Knowledge Cloud Infrastructure
 *
 * HIPAA-compliant cloud integration with Supabase for FullMind MBCT
 * All stored data is encrypted client-side for zero-knowledge architecture
 */

import { z } from 'zod';
import { CheckIn, Assessment, UserProfile, CrisisPlan } from './index';
import { SyncMetadata, SyncStatus, ConflictType } from './sync';

/**
 * Cloud sync configuration and feature flags
 */
export interface CloudFeatureFlags {
  readonly enabled: boolean;
  readonly supabaseSync: boolean;
  readonly encryptedBackup: boolean;
  readonly crossDeviceSync: boolean;
  readonly conflictResolution: boolean;
  readonly auditLogging: boolean;
  readonly emergencySync: boolean;
}

/**
 * Encrypted data container for cloud storage
 * All data is encrypted client-side before transmission
 */
export interface EncryptedDataContainer {
  readonly id: string;
  readonly entityType: 'check_in' | 'assessment' | 'user_profile' | 'crisis_plan';
  readonly userId: string;
  readonly deviceId: string;
  readonly encryptedData: string; // Base64 encoded encrypted JSON
  readonly encryptionVersion: string;
  readonly checksum: string;
  readonly metadata: CloudSyncMetadata;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Cloud-specific sync metadata
 */
export interface CloudSyncMetadata extends SyncMetadata {
  readonly cloudId?: string;
  readonly cloudVersion: number;
  readonly lastCloudSync?: string;
  readonly conflictResolved?: boolean;
  readonly auditId?: string;
}

/**
 * Supabase authentication configuration
 */
export interface SupabaseAuthConfig {
  readonly url: string;
  readonly anonKey: string;
  readonly region: 'us-east-1' | 'us-west-1';
  readonly enableRLS: true;
  readonly sessionTimeout: number;
  readonly maxRetries: number;
}

/**
 * Cloud sync operation for batch processing
 */
export interface CloudSyncOperation {
  readonly id: string;
  readonly type: 'upload' | 'download' | 'delete' | 'resolve_conflict';
  readonly entityType: string;
  readonly priority: 'critical' | 'high' | 'normal' | 'low';
  readonly encryptedPayload?: string;
  readonly metadata: CloudSyncMetadata;
  readonly retryCount: number;
  readonly scheduledAt: string;
  readonly completedAt?: string;
  readonly error?: CloudSyncError;
}

/**
 * Cloud sync error with HIPAA compliance considerations
 */
export interface CloudSyncError {
  readonly code: string;
  readonly message: string;
  readonly category: 'network' | 'authentication' | 'encryption' | 'validation' | 'storage';
  readonly retryable: boolean;
  readonly hipaaRelevant: boolean;
  readonly occurredAt: string;
  readonly context?: Record<string, unknown>;
}

/**
 * Cloud backup configuration
 */
export interface CloudBackupConfig {
  readonly enabled: boolean;
  readonly frequency: 'daily' | 'weekly' | 'manual';
  readonly retentionDays: number;
  readonly encryptionEnabled: true; // Always true for HIPAA
  readonly compressionEnabled: boolean;
  readonly includeCrisisData: boolean;
  readonly includeAssessments: boolean;
  readonly maxBackupSize: number; // bytes
}

/**
 * Cloud audit entry for compliance tracking
 */
export interface CloudAuditEntry {
  readonly id: string;
  readonly userId: string;
  readonly deviceId: string;
  readonly operation: string;
  readonly entityType: string;
  readonly entityId?: string;
  readonly result: 'success' | 'failure' | 'partial';
  readonly ipAddress?: string; // Anonymized for privacy
  readonly userAgent?: string;
  readonly timestamp: string;
  readonly duration: number; // milliseconds
  readonly dataSize?: number; // bytes
  readonly errorCode?: string;
  readonly hipaaCompliant: boolean;
}

/**
 * Cross-device sync status
 */
export interface CrossDeviceSyncStatus {
  readonly enabled: boolean;
  readonly devices: readonly DeviceInfo[];
  readonly lastSync: string | null;
  readonly conflicts: readonly CloudConflict[];
  readonly syncHealth: 'healthy' | 'warning' | 'error';
  readonly totalDevices: number;
  readonly activeDevices: number;
}

/**
 * Device information for cross-device sync
 */
export interface DeviceInfo {
  readonly deviceId: string;
  readonly deviceName: string;
  readonly platform: 'ios' | 'android';
  readonly appVersion: string;
  readonly lastSeen: string;
  readonly syncEnabled: boolean;
  readonly encryptionKey: string; // Encrypted device key
}

/**
 * Cloud conflict resolution
 */
export interface CloudConflict {
  readonly id: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly conflictType: ConflictType;
  readonly localVersion: number;
  readonly cloudVersion: number;
  readonly localData: EncryptedDataContainer;
  readonly cloudData: EncryptedDataContainer;
  readonly detectedAt: string;
  readonly autoResolvable: boolean;
  readonly clinicalRelevant: boolean;
}

/**
 * Cloud sync statistics for monitoring
 */
export interface CloudSyncStats {
  readonly totalOperations: number;
  readonly successfulOperations: number;
  readonly failedOperations: number;
  readonly averageLatency: number; // milliseconds
  readonly dataTransferred: number; // bytes
  readonly conflictsResolved: number;
  readonly lastStatsReset: string;
  readonly syncEfficiency: number; // 0-1 score
}

/**
 * Emergency sync configuration for crisis situations
 */
export interface EmergencySyncConfig {
  readonly enabled: boolean;
  readonly triggers: readonly ('phq9_threshold' | 'gad7_threshold' | 'crisis_button' | 'manual')[];
  readonly priorityData: readonly ('crisis_plan' | 'assessments' | 'recent_checkins')[];
  readonly timeoutMs: number;
  readonly maxRetries: number;
  readonly forceSync: boolean; // Override offline mode
}

/**
 * HIPAA compliance status for cloud operations
 */
export interface HIPAAComplianceStatus {
  readonly compliant: boolean;
  readonly lastAudit: string;
  readonly encryptionValidated: boolean;
  readonly accessLogsEnabled: boolean;
  readonly dataMinimization: boolean;
  readonly userConsent: boolean;
  readonly breachProtocols: boolean;
  readonly issues: readonly string[];
  readonly certifications: readonly string[];
}

/**
 * Cloud service health monitoring
 */
export interface CloudServiceHealth {
  readonly status: 'operational' | 'degraded' | 'outage';
  readonly latency: number; // milliseconds
  readonly uptime: number; // percentage
  readonly errorRate: number; // percentage
  readonly lastCheck: string;
  readonly regions: Record<string, 'healthy' | 'warning' | 'critical'>;
  readonly maintenanceScheduled?: {
    readonly start: string;
    readonly end: string;
    readonly description: string;
  };
}

/**
 * Zod schemas for runtime validation
 */
export const CloudFeatureFlagsSchema = z.object({
  enabled: z.boolean(),
  supabaseSync: z.boolean(),
  encryptedBackup: z.boolean(),
  crossDeviceSync: z.boolean(),
  conflictResolution: z.boolean(),
  auditLogging: z.boolean(),
  emergencySync: z.boolean()
}).readonly();

export const EncryptedDataContainerSchema = z.object({
  id: z.string().uuid(),
  entityType: z.enum(['check_in', 'assessment', 'user_profile', 'crisis_plan']),
  userId: z.string().uuid(),
  deviceId: z.string().min(1),
  encryptedData: z.string().min(1),
  encryptionVersion: z.string(),
  checksum: z.string().min(64), // SHA-256 minimum
  metadata: z.object({
    entityId: z.string(),
    entityType: z.string(),
    version: z.number().int().positive(),
    lastModified: z.string().datetime(),
    lastSynced: z.string().datetime().optional(),
    checksum: z.string(),
    deviceId: z.string(),
    userId: z.string().optional(),
    cloudId: z.string().optional(),
    cloudVersion: z.number().int().nonnegative(),
    lastCloudSync: z.string().datetime().optional(),
    conflictResolved: z.boolean().optional(),
    auditId: z.string().optional()
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
}).readonly();

export const CloudSyncOperationSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['upload', 'download', 'delete', 'resolve_conflict']),
  entityType: z.string(),
  priority: z.enum(['critical', 'high', 'normal', 'low']),
  encryptedPayload: z.string().optional(),
  metadata: z.object({}).passthrough(), // CloudSyncMetadata validation
  retryCount: z.number().int().nonnegative(),
  scheduledAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    category: z.enum(['network', 'authentication', 'encryption', 'validation', 'storage']),
    retryable: z.boolean(),
    hipaaRelevant: z.boolean(),
    occurredAt: z.string().datetime(),
    context: z.record(z.unknown()).optional()
  }).optional()
}).readonly();

/**
 * Type guards for cloud data validation
 */
export const isEncryptedDataContainer = (data: unknown): data is EncryptedDataContainer => {
  try {
    EncryptedDataContainerSchema.parse(data);
    return true;
  } catch {
    return false;
  }
};

export const isCloudSyncOperation = (operation: unknown): operation is CloudSyncOperation => {
  try {
    CloudSyncOperationSchema.parse(operation);
    return true;
  } catch {
    return false;
  }
};

/**
 * Cloud configuration constants
 */
export const CLOUD_CONSTANTS = {
  // Feature flags default values
  DEFAULT_FEATURE_FLAGS: {
    enabled: false, // Default OFF as per requirements
    supabaseSync: false,
    encryptedBackup: false,
    crossDeviceSync: false,
    conflictResolution: true,
    auditLogging: true,
    emergencySync: false
  } as CloudFeatureFlags,

  // Encryption and security
  ENCRYPTION_VERSION: '1.0.0',
  CHECKSUM_ALGORITHM: 'SHA-256',
  ENCRYPTION_ALGORITHM: 'AES-256-GCM',
  KEY_ROTATION_DAYS: 90,

  // Sync timing
  SYNC_INTERVAL_MS: 30000, // 30 seconds
  EMERGENCY_SYNC_TIMEOUT_MS: 5000, // 5 seconds
  BATCH_SIZE: 50,
  MAX_RETRIES: 3,

  // HIPAA compliance
  AUDIT_RETENTION_DAYS: 365 * 6, // 6 years
  SESSION_TIMEOUT_MINUTES: 30,
  DATA_RETENTION_DAYS: 365 * 7, // 7 years
  BREACH_NOTIFICATION_HOURS: 72,

  // Network and performance
  MAX_UPLOAD_SIZE_MB: 10,
  MAX_BATCH_OPERATIONS: 100,
  CONNECTION_TIMEOUT_MS: 10000,
  REQUEST_TIMEOUT_MS: 30000,

  // Regional compliance
  ALLOWED_REGIONS: ['us-east-1', 'us-west-1'] as const,
  HIPAA_REGIONS: ['us-east-1', 'us-west-1'] as const,

  // Clinical safety
  EMERGENCY_ENTITIES: ['crisis_plan', 'assessment'] as const,
  PRIORITY_THRESHOLDS: {
    PHQ9_CRISIS: 20,
    GAD7_CRISIS: 15
  },

  // Monitoring and health
  HEALTH_CHECK_INTERVAL_MS: 60000, // 1 minute
  UPTIME_THRESHOLD: 0.999, // 99.9%
  LATENCY_THRESHOLD_MS: 200,
  ERROR_RATE_THRESHOLD: 0.01 // 1%
} as const;