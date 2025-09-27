/**
 * Data Synchronization Types - Comprehensive sync state management for FullMind
 * Clinical-grade data integrity and conflict resolution for mental health data
 */

import { CheckIn, Assessment, UserProfile, CrisisPlan } from './index';
import { OfflinePriority, ConflictResolutionStrategy, NetworkQuality } from './offline';

// Re-export essential types for sync operations
export { ConflictResolutionStrategy } from './offline';

/**
 * Sync operation status tracking
 */
export enum SyncStatus {
  IDLE = 'idle',
  SYNCING = 'syncing',
  CONFLICT = 'conflict', 
  ERROR = 'error',
  SUCCESS = 'success',
  PAUSED = 'paused'
}

/**
 * Sync operation types for different data entities
 */
export enum SyncOperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  MERGE = 'merge',
  RESTORE = 'restore'
}

/**
 * Data entity types that can be synchronized
 */
export enum SyncEntityType {
  CHECK_IN = 'check_in',
  ASSESSMENT = 'assessment',
  USER_PROFILE = 'user_profile',
  CRISIS_PLAN = 'crisis_plan',
  WIDGET_DATA = 'widget_data',
  SESSION_DATA = 'session_data'
}

/**
 * Sync metadata for tracking changes and versions
 */
export interface SyncMetadata {
  readonly entityId: string;
  readonly entityType: SyncEntityType;
  readonly version: number;
  readonly lastModified: string;
  readonly lastSynced?: string;
  readonly checksum: string;
  readonly deviceId: string;
  readonly userId?: string;
}

/**
 * Sync operation details
 */
export interface SyncOperation {
  readonly id: string;
  readonly type: SyncOperationType;
  readonly entityType: SyncEntityType;
  readonly entityId: string;
  readonly priority: OfflinePriority;
  readonly data: SyncableData;
  readonly metadata: SyncMetadata;
  readonly conflictResolution: ConflictResolutionStrategy;
  readonly createdAt: string;
  readonly scheduledFor?: string;
  readonly retryCount: number;
  readonly maxRetries: number;
  readonly dependencies?: string[];
  readonly clinicalSafety: boolean;
}

/**
 * Union type for all syncable data entities
 */
export type SyncableData = 
  | CheckIn
  | Assessment
  | UserProfile
  | CrisisPlan
  | WidgetSyncData
  | SessionSyncData;

/**
 * Widget-specific sync data
 */
export interface WidgetSyncData {
  readonly widgetId: string;
  readonly lastCheckIn?: Partial<CheckIn>;
  readonly quickMoodData?: {
    readonly mood: number;
    readonly energy: number;
    readonly timestamp: string;
  };
  readonly preferences: {
    readonly enabledFlows: readonly string[];
    readonly reminderTimes: readonly string[];
  };
}

/**
 * Session-specific sync data
 */
export interface SessionSyncData {
  readonly sessionId: string;
  readonly type: 'morning' | 'midday' | 'evening' | 'assessment';
  readonly progress: {
    readonly currentStep: number;
    readonly totalSteps: number;
    readonly completedSteps: readonly string[];
    readonly data: Record<string, unknown>;
  };
  readonly timing: {
    readonly startedAt: string;
    readonly lastActivityAt: string;
    readonly estimatedCompletion?: string;
  };
}

/**
 * Conflict detection and resolution
 */
export interface SyncConflict {
  readonly id: string;
  readonly entityType: SyncEntityType;
  readonly entityId: string;
  readonly conflictType: ConflictType;
  readonly localData: SyncableData;
  readonly remoteData: SyncableData;
  readonly localMetadata: SyncMetadata;
  readonly remoteMetadata: SyncMetadata;
  readonly suggestedResolution: ConflictResolutionStrategy;
  readonly resolutionRequired: boolean;
  readonly clinicalImplications?: string[];
  readonly detectedAt: string;
}

/**
 * Types of data conflicts
 */
export enum ConflictType {
  VERSION_MISMATCH = 'version_mismatch',
  CONCURRENT_EDIT = 'concurrent_edit',
  CHECKSUM_MISMATCH = 'checksum_mismatch',
  CLINICAL_DATA_DIVERGENCE = 'clinical_data_divergence',
  TIMESTAMP_ANOMALY = 'timestamp_anomaly',
  SCHEMA_INCOMPATIBILITY = 'schema_incompatibility'
}

/**
 * Conflict resolution result
 */
export interface ConflictResolution {
  readonly conflictId: string;
  readonly strategy: ConflictResolutionStrategy;
  readonly resolvedData: SyncableData;
  readonly resolvedMetadata: SyncMetadata;
  readonly resolutionReason: string;
  readonly clinicalValidation: boolean;
  readonly auditTrail: readonly ConflictResolutionStep[];
  readonly resolvedAt: string;
  readonly resolvedBy: 'system' | 'user';
}

/**
 * Step in conflict resolution process
 */
export interface ConflictResolutionStep {
  readonly step: number;
  readonly action: string;
  readonly result: string;
  readonly timestamp: string;
  readonly validation?: ClinicalValidationResult;
}

/**
 * Clinical validation for sync operations
 */
export interface ClinicalValidationResult {
  readonly isValid: boolean;
  readonly assessmentScoresValid: boolean;
  readonly crisisThresholdsValid: boolean;
  readonly therapeuticContinuityPreserved: boolean;
  readonly dataIntegrityIssues: readonly string[];
  readonly recommendations: readonly string[];
  readonly validatedAt: string;
}

/**
 * Sync status for individual stores
 */
export interface StoreSyncStatus {
  readonly storeType: SyncEntityType;
  readonly status: SyncStatus;
  readonly lastSync: string | null;
  readonly pendingOperations: number;
  readonly conflicts: readonly SyncConflict[];
  readonly errors: readonly SyncError[];
  readonly networkQuality: NetworkQuality;
  readonly syncProgress?: SyncProgress;
}

/**
 * Sync progress tracking
 */
export interface SyncProgress {
  readonly total: number;
  readonly completed: number;
  readonly failed: number;
  readonly skipped: number;
  readonly percentage: number;
  readonly estimatedTimeRemaining?: number;
  readonly currentOperation?: string;
  readonly startedAt: string;
}

/**
 * Sync error details
 */
export interface SyncError {
  readonly id: string;
  readonly type: SyncErrorType;
  readonly entityType: SyncEntityType;
  readonly entityId: string;
  readonly message: string;
  readonly cause?: string;
  readonly retryable: boolean;
  readonly clinicalImpact: ClinicalImpactLevel;
  readonly occurredAt: string;
  readonly context?: Record<string, unknown>;
}

/**
 * Types of sync errors
 */
export enum SyncErrorType {
  NETWORK_ERROR = 'network_error',
  DATA_VALIDATION_ERROR = 'data_validation_error',
  CLINICAL_VALIDATION_ERROR = 'clinical_validation_error',
  ENCRYPTION_ERROR = 'encryption_error',
  STORAGE_ERROR = 'storage_error',
  TIMEOUT_ERROR = 'timeout_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  CONFLICT_RESOLUTION_ERROR = 'conflict_resolution_error'
}

/**
 * Clinical impact levels for sync issues
 */
export enum ClinicalImpactLevel {
  NONE = 'none',
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Overall sync state for the application
 */
export interface AppSyncState {
  readonly globalStatus: SyncStatus;
  readonly storeStatuses: readonly StoreSyncStatus[];
  readonly conflicts: readonly SyncConflict[];
  readonly pendingOperations: number;
  readonly networkQuality: NetworkQuality;
  readonly lastGlobalSync: string | null;
  readonly syncHealth: SyncHealthStatus;
  readonly emergencyMode: boolean;
  readonly clinicalDataIntegrity: boolean;
}

/**
 * Sync health monitoring
 */
export interface SyncHealthStatus {
  readonly overall: 'healthy' | 'warning' | 'critical';
  readonly networkHealth: number; // 0-1 score
  readonly dataIntegrityHealth: number; // 0-1 score
  readonly conflictResolutionHealth: number; // 0-1 score
  readonly performanceHealth: number; // 0-1 score
  readonly clinicalSafetyHealth: number; // 0-1 score
  readonly lastHealthCheck: string;
  readonly issues: readonly SyncHealthIssue[];
}

/**
 * Sync health issues
 */
export interface SyncHealthIssue {
  readonly type: string;
  readonly severity: 'info' | 'warning' | 'error' | 'critical';
  readonly message: string;
  readonly recommendation?: string;
  readonly affectedEntities?: readonly string[];
  readonly detectedAt: string;
}

/**
 * Sync configuration for stores
 */
export interface SyncConfiguration {
  readonly enabled: boolean;
  readonly autoSync: boolean;
  readonly syncInterval: number; // milliseconds
  readonly batchSize: number;
  readonly maxRetries: number;
  readonly timeoutMs: number;
  readonly priorityOrder: readonly OfflinePriority[];
  readonly conflictResolution: {
    readonly defaultStrategy: ConflictResolutionStrategy;
    readonly entityStrategies: Record<SyncEntityType, ConflictResolutionStrategy>;
    readonly requireUserApproval: readonly ConflictType[];
  };
  readonly clinicalSafety: {
    readonly validateAssessmentScores: boolean;
    readonly validateCrisisThresholds: boolean;
    readonly preserveTherapeuticContinuity: boolean;
    readonly auditAllOperations: boolean;
  };
  readonly network: {
    readonly minQualityForSync: NetworkQuality;
    readonly pauseOnPoorConnection: boolean;
    readonly adaptiveBatching: boolean;
    readonly emergencyOverride: boolean;
  };
}

/**
 * Sync performance metrics
 */
export interface SyncPerformanceMetrics {
  readonly operationsPerSecond: number;
  readonly averageOperationTime: number;
  readonly networkLatency: number;
  readonly dataTransferRate: number; // bytes per second
  readonly conflictResolutionTime: number;
  readonly clinicalValidationTime: number;
  readonly memoryUsage: number; // bytes
  readonly batteryImpact: number; // 0-1 score
  readonly lastMeasurement: string;
}

/**
 * Sync audit trail entry
 */
export interface SyncAuditEntry {
  readonly id: string;
  readonly timestamp: string;
  readonly operationType: SyncOperationType;
  readonly entityType: SyncEntityType;
  readonly entityId: string;
  readonly userId?: string;
  readonly deviceId: string;
  readonly operation: string;
  readonly result: 'success' | 'failure' | 'conflict';
  readonly details: Record<string, unknown>;
  readonly clinicalData: boolean;
  readonly dataIntegrityHash: string;
}

/**
 * Type guards for sync data validation
 */
export const isSyncableData = (data: unknown): data is SyncableData => {
  return data !== null && typeof data === 'object' && 'id' in data;
};

export const isSyncConflict = (item: unknown): item is SyncConflict => {
  return (
    typeof item === 'object' &&
    item !== null &&
    'id' in item &&
    'conflictType' in item &&
    'localData' in item &&
    'remoteData' in item
  );
};

export const isStoreSyncStatus = (status: unknown): status is StoreSyncStatus => {
  return (
    typeof status === 'object' &&
    status !== null &&
    'storeType' in status &&
    'status' in status &&
    'pendingOperations' in status
  );
};

/**
 * Sync constants and configurations
 */
export const SYNC_CONSTANTS = {
  // Timing configurations
  DEFAULT_SYNC_INTERVAL: 30000, // 30 seconds
  FAST_SYNC_INTERVAL: 5000, // 5 seconds for critical data
  SLOW_SYNC_INTERVAL: 300000, // 5 minutes for low priority
  
  // Batch sizes
  DEFAULT_BATCH_SIZE: 50,
  CRITICAL_BATCH_SIZE: 10,
  LARGE_BATCH_SIZE: 100,
  
  // Timeouts
  DEFAULT_TIMEOUT: 30000, // 30 seconds
  CRITICAL_TIMEOUT: 10000, // 10 seconds
  LARGE_OPERATION_TIMEOUT: 120000, // 2 minutes
  
  // Retry configurations
  DEFAULT_MAX_RETRIES: 3,
  CRITICAL_MAX_RETRIES: 5,
  LOW_PRIORITY_MAX_RETRIES: 1,
  
  // Performance thresholds
  MAX_SYNC_OPERATIONS_PER_MINUTE: 120,
  MAX_MEMORY_USAGE_MB: 50,
  MIN_BATTERY_FOR_BACKGROUND_SYNC: 0.15, // 15%
  
  // Clinical safety
  ASSESSMENT_SCORE_TOLERANCE: 0, // Zero tolerance for score errors
  CRISIS_THRESHOLD_CHECK_INTERVAL: 5000, // 5 seconds
  THERAPEUTIC_CONTINUITY_WINDOW: 86400000, // 24 hours
  
  // Data integrity
  CHECKSUM_ALGORITHM: 'SHA-256',
  VERSION_INCREMENT: 1,
  MAX_CONFLICT_AGE_HOURS: 72,
  
  // Network quality thresholds
  EXCELLENT_LATENCY_MS: 50,
  GOOD_LATENCY_MS: 200,
  POOR_LATENCY_MS: 1000,
  
  // Emergency protocols
  EMERGENCY_SYNC_TIMEOUT: 5000, // 5 seconds
  CRISIS_DATA_PRIORITY_BOOST: true,
  EMERGENCY_RETRY_ATTEMPTS: 10
} as const;