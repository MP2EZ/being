/**
 * Error Handling Types - Clinical Safety and Recovery
 *
 * Comprehensive error handling system for the Being. MBCT app with
 * crisis-aware error recovery and clinical data protection.
 *
 * CRITICAL: Error handling must never compromise user safety or clinical data
 */

import type {
  UserID,
  SessionID,
  ISODateString,
  CrisisSeverity,
  DurationMs,
  DeepReadonly,
} from './core';
import type { AssessmentID } from './clinical';

// === ERROR SEVERITY LEVELS ===

/**
 * Error severity with clinical context
 */
export type ErrorSeverity =
  | 'trace'      // Debug information only
  | 'debug'      // Development debugging
  | 'info'       // Informational messages
  | 'warn'       // Warning conditions
  | 'error'      // Error conditions
  | 'critical'   // Critical errors requiring immediate attention
  | 'emergency'; // Emergency errors affecting user safety

/**
 * Error category classification
 */
export type ErrorCategory =
  | 'validation'           // Data validation errors
  | 'network'             // Network connectivity issues
  | 'storage'             // Data storage/retrieval errors
  | 'authentication'      // Authentication/authorization errors
  | 'permission'          // Permission/access errors
  | 'performance'         // Performance degradation
  | 'clinical'            // Clinical data integrity errors
  | 'crisis'              // Crisis detection/intervention errors
  | 'security'            // Security violations
  | 'system'              // System-level errors
  | 'user_input'          // User input validation errors
  | 'therapeutic'         // Therapeutic process errors
  | 'assessment'          // Assessment calculation/validation errors
  | 'encryption'          // Data encryption/decryption errors
  | 'synchronization';    // Data sync errors

/**
 * Error recovery strategies
 */
export type ErrorRecoveryStrategy =
  | 'retry'               // Automatic retry with backoff
  | 'fallback'            // Use fallback mechanism
  | 'user_intervention'   // Require user action
  | 'escalate'            // Escalate to higher authority
  | 'fail_safe'           // Enter safe mode
  | 'crisis_mode'         // Enter crisis intervention mode
  | 'data_recovery'       // Attempt data recovery
  | 'manual_override'     // Allow manual override
  | 'system_restart'      // Restart system component
  | 'graceful_degradation'; // Reduce functionality gracefully

// === BASE ERROR TYPES ===

/**
 * Base error interface with clinical context
 */
export interface BaseError {
  readonly id: string;
  readonly name: string;
  readonly message: string;
  readonly code?: string;
  readonly severity: ErrorSeverity;
  readonly category: ErrorCategory;
  readonly timestamp: ISODateString;
  readonly userId?: UserID;
  readonly sessionId?: SessionID;
  readonly context?: Record<string, unknown>;
  readonly stack?: string;
  readonly cause?: Error | BaseError;
}

/**
 * Recoverable error with recovery information
 */
export interface RecoverableError extends BaseError {
  readonly recoverable: true;
  readonly recoveryStrategy: ErrorRecoveryStrategy;
  readonly maxRetries?: number;
  readonly retryCount?: number;
  readonly retryDelay?: DurationMs;
  readonly fallbackData?: unknown;
  readonly recoveryCallback?: () => Promise<void>;
}

/**
 * Non-recoverable error requiring intervention
 */
export interface NonRecoverableError extends BaseError {
  readonly recoverable: false;
  readonly interventionRequired: boolean;
  readonly escalationLevel: 'support' | 'clinical' | 'emergency';
  readonly userImpact: 'none' | 'minor' | 'moderate' | 'major' | 'critical';
  readonly dataIntegrityAffected: boolean;
  readonly emergencyProtocol?: string;
}

/**
 * Union type for all errors
 */
export type AppError = RecoverableError | NonRecoverableError;

// === CLINICAL ERROR TYPES ===

/**
 * Clinical data validation error
 */
export interface ClinicalValidationError extends BaseError {
  readonly category: 'clinical';
  readonly severity: 'critical' | 'emergency';
  readonly assessmentId?: AssessmentID;
  readonly fieldName: string;
  readonly expectedValue?: unknown;
  readonly actualValue?: unknown;
  readonly clinicalImpact: 'score_calculation' | 'crisis_detection' | 'data_integrity';
  readonly requiresManualReview: boolean;
}

/**
 * Crisis detection error
 */
export interface CrisisDetectionError extends BaseError {
  readonly category: 'crisis';
  readonly severity: 'emergency';
  readonly crisisSeverity: CrisisSeverity;
  readonly detectionFailure: 'threshold_error' | 'calculation_error' | 'response_timeout';
  readonly assessmentId?: AssessmentID;
  readonly emergencyProtocol: 'immediate_intervention' | 'clinical_review' | 'system_override';
  readonly safetyImpact: 'none' | 'potential' | 'confirmed';
}

/**
 * Assessment calculation error
 */
export interface AssessmentCalculationError extends BaseError {
  readonly category: 'assessment';
  readonly severity: 'critical';
  readonly assessmentType: 'phq9' | 'gad7';
  readonly calculationStep: 'score_sum' | 'severity_mapping' | 'crisis_threshold';
  readonly inputData: readonly number[];
  readonly expectedResult?: number;
  readonly actualResult?: number;
  readonly validationRequired: true;
}

/**
 * Therapeutic timing error
 */
export interface TherapeuticTimingError extends BaseError {
  readonly category: 'therapeutic';
  readonly severity: 'error' | 'critical';
  readonly exerciseType: 'breathing' | 'body_scan' | 'mindful_movement';
  readonly timingIssue: 'duration_error' | 'frame_drops' | 'timing_drift';
  readonly expectedDuration: DurationMs;
  readonly actualDuration: DurationMs;
  readonly therapeuticImpact: 'minimal' | 'moderate' | 'significant';
}

// === SECURITY ERROR TYPES ===

/**
 * Data encryption error
 */
export interface EncryptionError extends BaseError {
  readonly category: 'encryption';
  readonly severity: 'critical' | 'emergency';
  readonly encryptionType: 'storage' | 'transmission' | 'backup';
  readonly dataType: 'pii' | 'phi' | 'assessment_data' | 'crisis_plan';
  readonly encryptionFailure: 'key_error' | 'algorithm_error' | 'corruption';
  readonly dataCompromised: boolean;
  readonly complianceImpact: 'none' | 'hipaa_violation' | 'data_breach';
}

/**
 * Authentication error
 */
export interface AuthenticationError extends BaseError {
  readonly category: 'authentication';
  readonly severity: 'warn' | 'error' | 'critical';
  readonly authMethod: 'password' | 'biometric' | 'token' | 'emergency';
  readonly failureReason: 'invalid_credentials' | 'token_expired' | 'biometric_failure' | 'account_locked';
  readonly attemptCount: number;
  readonly maxAttempts: number;
  readonly lockoutDuration?: DurationMs;
  readonly emergencyAccess: boolean;
}

/**
 * Permission violation error
 */
export interface PermissionError extends BaseError {
  readonly category: 'permission';
  readonly severity: 'error' | 'critical';
  readonly permissionType: 'data_access' | 'feature_access' | 'system_access';
  readonly requestedAction: string;
  readonly requiredPermission: string;
  readonly currentPermissions: readonly string[];
  readonly securityLevel: 'low' | 'medium' | 'high' | 'critical';
}

// === PERFORMANCE ERROR TYPES ===

/**
 * Performance degradation error
 */
export interface PerformanceError extends BaseError {
  readonly category: 'performance';
  readonly severity: 'warn' | 'error';
  readonly performanceMetric: 'response_time' | 'frame_rate' | 'memory_usage' | 'network_latency';
  readonly currentValue: number;
  readonly thresholdValue: number;
  readonly degradationLevel: 'minor' | 'moderate' | 'severe';
  readonly userImpact: 'none' | 'perceived' | 'functional';
  readonly therapeuticImpact?: 'none' | 'quality_reduction' | 'timing_compromise';
}

/**
 * Memory usage error
 */
export interface MemoryError extends BaseError {
  readonly category: 'performance';
  readonly severity: 'warn' | 'error' | 'critical';
  readonly memoryType: 'heap' | 'stack' | 'native';
  readonly currentUsage: number; // bytes
  readonly maxUsage: number; // bytes
  readonly memoryLeak: boolean;
  readonly componentCause?: string;
  readonly recoveryAction: 'garbage_collect' | 'restart_component' | 'app_restart';
}

// === NETWORK ERROR TYPES ===

/**
 * Network connectivity error
 */
export interface NetworkError extends BaseError {
  readonly category: 'network';
  readonly severity: 'warn' | 'error';
  readonly networkType: 'wifi' | 'cellular' | 'offline';
  readonly errorType: 'connection_lost' | 'timeout' | 'server_error' | 'dns_failure';
  readonly endpoint?: string;
  readonly statusCode?: number;
  readonly retryable: boolean;
  readonly offlineMode: boolean;
  readonly dataLoss: boolean;
}

/**
 * Synchronization error
 */
export interface SyncError extends BaseError {
  readonly category: 'synchronization';
  readonly severity: 'warn' | 'error' | 'critical';
  readonly syncType: 'assessment_data' | 'check_in_data' | 'crisis_plan' | 'user_preferences';
  readonly direction: 'upload' | 'download' | 'bidirectional';
  readonly conflictResolution: 'client_wins' | 'server_wins' | 'manual_resolve';
  readonly dataIntegrity: boolean;
  readonly lastSuccessfulSync?: ISODateString;
}

// === STORAGE ERROR TYPES ===

/**
 * Data storage error
 */
export interface StorageError extends BaseError {
  readonly category: 'storage';
  readonly severity: 'error' | 'critical';
  readonly storageType: 'async_storage' | 'secure_storage' | 'file_system' | 'database';
  readonly operation: 'read' | 'write' | 'delete' | 'clear';
  readonly dataType: 'assessment' | 'check_in' | 'crisis_plan' | 'user_data' | 'preferences';
  readonly dataKey: string;
  readonly storageSize?: number; // bytes
  readonly storageCapacity?: number; // bytes
  readonly corruption: boolean;
  readonly dataRecoverable: boolean;
}

/**
 * Data corruption error
 */
export interface DataCorruptionError extends BaseError {
  readonly category: 'storage';
  readonly severity: 'critical' | 'emergency';
  readonly corruptionType: 'partial' | 'complete' | 'metadata';
  readonly affectedData: readonly string[];
  readonly corruptionCause: 'encryption_failure' | 'storage_failure' | 'write_interruption';
  readonly backupAvailable: boolean;
  readonly recoveryPossible: boolean;
  readonly clinicalDataAffected: boolean;
}

// === ERROR COLLECTION AND REPORTING ===

/**
 * Error collection configuration
 */
export interface ErrorCollectionConfig {
  readonly enabled: boolean;
  readonly collectStackTraces: boolean;
  readonly collectUserData: boolean;
  readonly collectSystemInfo: boolean;
  readonly anonymizeData: boolean;
  readonly maxErrorsPerSession: number;
  readonly excludeCategories: readonly ErrorCategory[];
  readonly severityThreshold: ErrorSeverity;
}

/**
 * Error report for external services
 */
export interface ErrorReport {
  readonly errorId: string;
  readonly appVersion: string;
  readonly platform: 'ios' | 'android';
  readonly osVersion: string;
  readonly deviceModel?: string;
  readonly error: AppError;
  readonly breadcrumbs: readonly ErrorBreadcrumb[];
  readonly userContext?: {
    readonly userId?: string; // Anonymized
    readonly sessionDuration: DurationMs;
    readonly lastAction?: string;
  };
  readonly systemContext: {
    readonly memoryUsage: number;
    readonly diskSpace: number;
    readonly networkStatus: 'online' | 'offline' | 'poor';
  };
}

/**
 * Error breadcrumb for debugging
 */
export interface ErrorBreadcrumb {
  readonly timestamp: ISODateString;
  readonly level: 'debug' | 'info' | 'warn' | 'error';
  readonly category: string;
  readonly message: string;
  readonly data?: Record<string, unknown>;
}

// === ERROR HANDLING STRATEGIES ===

/**
 * Error handler configuration
 */
export interface ErrorHandlerConfig {
  readonly retryAttempts: number;
  readonly retryDelay: DurationMs;
  readonly exponentialBackoff: boolean;
  readonly fallbackEnabled: boolean;
  readonly userNotification: boolean;
  readonly automaticRecovery: boolean;
  readonly escalationRules: readonly ErrorEscalationRule[];
}

/**
 * Error escalation rule
 */
export interface ErrorEscalationRule {
  readonly condition: (error: AppError) => boolean;
  readonly action: 'notify_user' | 'log_only' | 'escalate_support' | 'emergency_protocol';
  readonly delay?: DurationMs;
  readonly maxOccurrences?: number;
  readonly timeWindow?: DurationMs;
}

/**
 * Error recovery result
 */
export interface ErrorRecoveryResult {
  readonly success: boolean;
  readonly strategy: ErrorRecoveryStrategy;
  readonly attemptCount: number;
  readonly recoveryTime: DurationMs;
  readonly fallbackUsed: boolean;
  readonly dataIntegrityMaintained: boolean;
  readonly userImpact: 'none' | 'minimal' | 'moderate' | 'significant';
  readonly additionalErrors?: readonly AppError[];
}

// === ERROR CONTEXT TYPES ===

/**
 * Clinical error context
 */
export interface ClinicalErrorContext {
  readonly assessmentInProgress: boolean;
  readonly assessmentType?: 'phq9' | 'gad7';
  readonly questionNumber?: number;
  readonly crisisDetected: boolean;
  readonly crisisSeverity?: CrisisSeverity;
  readonly therapeuticSessionActive: boolean;
  readonly emergencyContactsAvailable: boolean;
}

/**
 * User safety context
 */
export interface UserSafetyContext {
  readonly userInCrisis: boolean;
  readonly emergencyMode: boolean;
  readonly safetyPlanActive: boolean;
  readonly emergencyContactsNotified: boolean;
  readonly lastCrisisEvent?: ISODateString;
  readonly riskLevel: 'none' | 'low' | 'moderate' | 'high' | 'critical';
}

/**
 * System context for error handling
 */
export interface SystemErrorContext {
  readonly offlineMode: boolean;
  readonly lowMemory: boolean;
  readonly lowBattery: boolean;
  readonly networkQuality: 'excellent' | 'good' | 'poor' | 'offline';
  readonly storageSpace: number; // bytes available
  readonly lastBackup?: ISODateString;
  readonly systemIntegrity: boolean;
}

// === ERROR HANDLER INTERFACE ===

/**
 * Error handler service interface
 */
export interface ErrorHandlerService {
  // Error handling
  readonly handleError: (error: AppError, context?: Record<string, unknown>) => Promise<ErrorRecoveryResult>;
  readonly handleCriticalError: (error: AppError, context: ClinicalErrorContext) => Promise<ErrorRecoveryResult>;
  readonly handleRecoverableError: (error: RecoverableError) => Promise<ErrorRecoveryResult>;

  // Error reporting
  readonly reportError: (error: AppError, report?: Partial<ErrorReport>) => Promise<void>;
  readonly logError: (error: AppError, level?: ErrorSeverity) => void;
  readonly addBreadcrumb: (breadcrumb: ErrorBreadcrumb) => void;

  // Error recovery
  readonly attemptRecovery: (error: AppError, strategy: ErrorRecoveryStrategy) => Promise<ErrorRecoveryResult>;
  readonly fallbackToSafeMode: (error: AppError) => Promise<void>;
  readonly escalateError: (error: AppError, level: 'support' | 'clinical' | 'emergency') => Promise<void>;

  // Error monitoring
  readonly getErrorMetrics: () => ErrorMetrics;
  readonly clearErrors: (olderThan?: ISODateString) => void;
  readonly getErrorHistory: (category?: ErrorCategory) => readonly AppError[];
}

/**
 * Error metrics for monitoring
 */
export interface ErrorMetrics {
  readonly totalErrors: number;
  readonly criticalErrors: number;
  readonly emergencyErrors: number;
  readonly errorsByCategory: Record<ErrorCategory, number>;
  readonly errorsBySeverity: Record<ErrorSeverity, number>;
  readonly averageRecoveryTime: DurationMs;
  readonly recoverySuccessRate: number; // percentage
  readonly lastErrorTime?: ISODateString;
  readonly errorTrends: {
    readonly increasingCategories: readonly ErrorCategory[];
    readonly criticalComponents: readonly string[];
  };
}

// === TYPE GUARDS ===

/**
 * Type guard for recoverable error
 */
export const isRecoverableError = (error: AppError): error is RecoverableError => {
  return 'recoverable' in error && error.recoverable === true;
};

/**
 * Type guard for non-recoverable error
 */
export const isNonRecoverableError = (error: AppError): error is NonRecoverableError => {
  return 'recoverable' in error && error.recoverable === false;
};

/**
 * Type guard for clinical error
 */
export const isClinicalError = (error: AppError): error is ClinicalValidationError => {
  return error.category === 'clinical';
};

/**
 * Type guard for crisis error
 */
export const isCrisisError = (error: AppError): error is CrisisDetectionError => {
  return error.category === 'crisis';
};

/**
 * Type guard for emergency error
 */
export const isEmergencyError = (error: AppError): boolean => {
  return error.severity === 'emergency' || error.category === 'crisis';
};

// === ERROR CREATION UTILITIES ===

/**
 * Create a clinical validation error
 */
export const createClinicalValidationError = (
  message: string,
  fieldName: string,
  context?: {
    assessmentId?: AssessmentID;
    expectedValue?: unknown;
    actualValue?: unknown;
    clinicalImpact?: ClinicalValidationError['clinicalImpact'];
  }
): ClinicalValidationError => ({
  id: `clinical_error_${Date.now()}_${Math.random().toString(36).substring(2)}`,
  name: 'ClinicalValidationError',
  message,
  code: 'CLINICAL_VALIDATION_ERROR',
  severity: 'critical',
  category: 'clinical',
  timestamp: new Date().toISOString() as ISODateString,
  fieldName,
  assessmentId: context?.assessmentId,
  expectedValue: context?.expectedValue,
  actualValue: context?.actualValue,
  clinicalImpact: context?.clinicalImpact || 'data_integrity',
  requiresManualReview: true,
});

/**
 * Create a crisis detection error
 */
export const createCrisisDetectionError = (
  message: string,
  crisisSeverity: CrisisSeverity,
  detectionFailure: CrisisDetectionError['detectionFailure'],
  context?: {
    assessmentId?: AssessmentID;
    emergencyProtocol?: CrisisDetectionError['emergencyProtocol'];
  }
): CrisisDetectionError => ({
  id: `crisis_error_${Date.now()}_${Math.random().toString(36).substring(2)}`,
  name: 'CrisisDetectionError',
  message,
  code: 'CRISIS_DETECTION_ERROR',
  severity: 'emergency',
  category: 'crisis',
  timestamp: new Date().toISOString() as ISODateString,
  crisisSeverity,
  detectionFailure,
  assessmentId: context?.assessmentId,
  emergencyProtocol: context?.emergencyProtocol || 'immediate_intervention',
  safetyImpact: 'potential',
});

// === CONSTANTS ===

/**
 * Error handling constants
 */
export const ERROR_CONSTANTS = {
  // Retry configuration
  RETRY: {
    MAX_ATTEMPTS: 3,
    BASE_DELAY_MS: 1000 as DurationMs,
    MAX_DELAY_MS: 10000 as DurationMs,
    EXPONENTIAL_BASE: 2,
    JITTER_MAX_MS: 100 as DurationMs,
  },

  // Severity thresholds
  SEVERITY: {
    ESCALATION_THRESHOLD: 'critical' as ErrorSeverity,
    USER_NOTIFICATION_THRESHOLD: 'error' as ErrorSeverity,
    AUTOMATIC_RECOVERY_THRESHOLD: 'warn' as ErrorSeverity,
  },

  // Clinical error thresholds
  CLINICAL: {
    MAX_CALCULATION_ERRORS: 0, // Zero tolerance
    CRISIS_DETECTION_TIMEOUT_MS: 200 as DurationMs,
    EMERGENCY_ESCALATION_TIMEOUT_MS: 1000 as DurationMs,
  },

  // Performance error thresholds
  PERFORMANCE: {
    RESPONSE_TIME_ERROR_MS: 1000 as DurationMs,
    FRAME_RATE_ERROR_THRESHOLD: 30, // fps
    MEMORY_ERROR_THRESHOLD_MB: 150,
    THERAPEUTIC_TIMING_ERROR_MS: 500 as DurationMs,
  },

  // Error collection limits
  COLLECTION: {
    MAX_ERRORS_PER_SESSION: 100,
    MAX_BREADCRUMBS: 50,
    ERROR_RETENTION_DAYS: 7,
    CRITICAL_ERROR_RETENTION_DAYS: 30,
  },
} as const;

export type ErrorConstants = typeof ERROR_CONSTANTS;