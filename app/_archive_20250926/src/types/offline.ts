/**
 * Enhanced Offline Types - Comprehensive TypeScript definitions for offline operations
 * Clinical-grade type safety for mental health data handling
 */

import { CheckIn, Assessment, UserProfile } from './index';
import { AssetPriority, AssetType } from '../services/AssetCacheService';

/**
 * Enhanced offline operation priorities for clinical safety
 */
export enum OfflinePriority {
  CRITICAL = 'critical',        // Crisis data, emergency contacts, PHQ-9/GAD-7 ≥ thresholds
  HIGH = 'high',               // Completed assessments, therapeutic sessions
  MEDIUM = 'medium',           // Check-in data, progress tracking
  LOW = 'low',                 // User preferences, non-critical updates
  DEFERRED = 'deferred'        // Analytics, optional features
}

/**
 * Network connection quality indicators
 */
export enum NetworkQuality {
  EXCELLENT = 'excellent',     // WiFi, stable, high bandwidth
  GOOD = 'good',              // Cellular, stable
  POOR = 'poor',              // Unstable, limited bandwidth
  OFFLINE = 'offline'         // No connectivity
}

/**
 * Enhanced network state with quality metrics
 */
export interface EnhancedNetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
  quality: NetworkQuality;
  bandwidth?: number;          // Estimated bandwidth in Mbps
  latency?: number;            // Network latency in ms
  lastConnected?: string;      // ISO timestamp of last connection
  connectionStability: number; // 0-1 stability score
}

/**
 * Conflict resolution strategies for data synchronization
 */
export enum ConflictResolutionStrategy {
  CLIENT_WINS = 'client_wins',           // Local data takes precedence
  SERVER_WINS = 'server_wins',           // Remote data takes precedence
  MERGE_TIMESTAMP = 'merge_timestamp',   // Most recent timestamp wins
  MERGE_CLINICAL = 'merge_clinical',     // Clinical data specific merging
  MANUAL_RESOLVE = 'manual_resolve',     // Requires user intervention
  PRESERVE_BOTH = 'preserve_both'        // Keep both versions
}

/**
 * Enhanced queued action with clinical safety features
 */
export interface EnhancedQueuedAction {
  id: string;
  timestamp: string;
  action: OfflineActionType;
  data: OfflineActionData;
  priority: OfflinePriority;
  retryCount: number;
  maxRetries: number;
  lastAttempt?: string;
  errorHistory: OfflineError[];
  dependencies?: string[];         // Other action IDs this depends on
  conflictResolution: ConflictResolutionStrategy;
  clinicalValidation?: ClinicalValidation;
  metadata: OfflineActionMetadata;
}

/**
 * Offline action types with clinical categorization
 */
export type OfflineActionType = 
  // Critical actions (must succeed)
  | 'save_crisis_data'
  | 'save_assessment_critical'
  | 'update_crisis_plan'
  | 'save_emergency_contact'
  
  // High priority actions
  | 'save_assessment'
  | 'save_checkin_complete'
  | 'update_clinical_profile'
  
  // Standard actions
  | 'save_checkin'
  | 'save_checkin_partial'
  | 'update_user'
  | 'save_session_progress'
  
  // Low priority actions
  | 'update_preferences'
  | 'save_analytics'
  | 'update_notification_settings';

/**
 * Offline action data union type
 */
export type OfflineActionData = 
  | CheckIn
  | Assessment
  | UserProfile
  | CrisisData
  | SessionProgress
  | UserPreferences
  | AnalyticsData;

/**
 * Clinical validation for offline operations
 */
export interface ClinicalValidation {
  isAssessment: boolean;
  isCrisisRelated: boolean;
  phq9Score?: number;
  gad7Score?: number;
  riskLevel?: 'minimal' | 'mild' | 'moderate' | 'severe';
  requiresImmediateSync: boolean;
  clinicalThresholdMet: boolean;
  validationTimestamp: string;
}

/**
 * Crisis-related data structure
 */
export interface CrisisData {
  type: 'assessment_crisis' | 'manual_crisis' | 'crisis_plan_update';
  assessmentId?: string;
  score?: number;
  severity: 'moderate' | 'moderately severe' | 'severe';
  timestamp: string;
  interventionTriggered: boolean;
  emergencyContactsNotified?: boolean;
  data: any;
}

/**
 * Session progress tracking for offline sessions
 */
export interface SessionProgress {
  sessionId: string;
  sessionType: 'checkin' | 'assessment' | 'breathing' | 'crisis';
  currentStep: number;
  totalSteps: number;
  completedSteps: string[];
  percentComplete: number;
  estimatedTimeRemaining: number;
  startTime: string;
  lastActivity: string;
  isOffline: boolean;
}

/**
 * Resumable Session for interrupted workflows
 * Handles session state persistence across app interruptions
 */
export interface ResumableSession {
  sessionId: string;
  sessionType: 'assessment' | 'checkin' | 'breathing' | 'crisis' | 'onboarding';
  progress: SessionProgress;
  data: Record<string, any>;
  metadata: {
    version: string;
    created: string;
    lastModified: string;
    expiresAt: string;
  };
  isValid: boolean;
  requiresValidation: boolean;
}

/**
 * Session validation result
 */
export interface SessionValidationResult {
  valid: boolean;
  session: ResumableSession | null;
  requiresReAuthentication: boolean;
  errors?: string[];
}

/**
 * Session storage keys for organizing session data
 */
export interface SessionStorageKeys {
  ACTIVE_SESSION: 'active_session';
  SESSION_DATA: 'session_data_';
  SESSION_METADATA: 'session_metadata_';
  SESSION_VALIDATION: 'session_validation_';
}

/**
 * Session management constants
 */
export const SESSION_CONSTANTS = {
  DEFAULT_EXPIRY_HOURS: 24,
  MAX_SESSION_DATA_SIZE: 1024 * 1024, // 1MB
  VALIDATION_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
  AUTO_CLEANUP_INTERVAL_MS: 60 * 60 * 1000, // 1 hour
} as const;

/**
 * User preferences for offline handling
 */
export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  haptics: boolean;
  notifications: boolean;
  offlineMode: boolean;
  autoSync: boolean;
  dataUsageOptimization: boolean;
}

/**
 * Analytics data structure
 */
export interface AnalyticsData {
  event: string;
  timestamp: string;
  sessionId?: string;
  userId: string;
  properties: Record<string, any>;
  offline: boolean;
}

/**
 * Offline action metadata
 */
export interface OfflineActionMetadata {
  deviceId: string;
  appVersion: string;
  userId: string;
  sessionId?: string;
  networkQuality: NetworkQuality;
  batteryLevel?: number;
  storageAvailable?: number;
  encryptionEnabled: boolean;
  dataSize: number;
  compressionUsed: boolean;
  clinicalSafety: {
    dataType: 'clinical' | 'personal' | 'system';
    sensitivityLevel: 'low' | 'medium' | 'high' | 'critical';
    encryptionRequired: boolean;
    auditRequired: boolean;
  };
}

/**
 * Enhanced offline error with clinical context
 */
export interface OfflineError {
  code: OfflineErrorCode;
  message: string;
  timestamp: string;
  context?: string;
  recoverable: boolean;
  clinicalImpact: 'none' | 'low' | 'medium' | 'high' | 'critical';
  retryStrategy: RetryStrategy;
  userMessage?: string;
}

/**
 * Offline error codes
 */
export enum OfflineErrorCode {
  // Network errors
  NETWORK_UNAVAILABLE = 'NETWORK_UNAVAILABLE',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  NETWORK_QUALITY_POOR = 'NETWORK_QUALITY_POOR',
  
  // Storage errors
  STORAGE_FULL = 'STORAGE_FULL',
  STORAGE_CORRUPTION = 'STORAGE_CORRUPTION',
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
  
  // Data errors
  DATA_VALIDATION_FAILED = 'DATA_VALIDATION_FAILED',
  DATA_CONFLICT = 'DATA_CONFLICT',
  DATA_TOO_LARGE = 'DATA_TOO_LARGE',
  
  // Clinical errors
  CLINICAL_VALIDATION_FAILED = 'CLINICAL_VALIDATION_FAILED',
  CRISIS_THRESHOLD_DETECTION_FAILED = 'CRISIS_THRESHOLD_DETECTION_FAILED',
  ASSESSMENT_INTEGRITY_ERROR = 'ASSESSMENT_INTEGRITY_ERROR',
  
  // System errors
  DEVICE_STORAGE_CRITICAL = 'DEVICE_STORAGE_CRITICAL',
  BATTERY_CRITICAL = 'BATTERY_CRITICAL',
  APP_VERSION_MISMATCH = 'APP_VERSION_MISMATCH',
  
  // Unknown
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Retry strategy configuration
 */
export interface RetryStrategy {
  type: 'exponential' | 'linear' | 'immediate' | 'manual';
  baseDelay: number;
  maxDelay: number;
  maxRetries: number;
  backoffMultiplier: number;
  jitter: boolean;
  clinicalPriority: boolean;
}

/**
 * Sync configuration for different data types
 */
export interface SyncConfiguration {
  enabled: boolean;
  batchSize: number;
  timeout: number;
  retryStrategy: RetryStrategy;
  conflictResolution: ConflictResolutionStrategy;
  requiresEncryption: boolean;
  clinicalValidation: boolean;
  priorityBoosting: {
    crisisData: boolean;
    assessmentData: boolean;
    incompleteChains: boolean;
  };
}

/**
 * Comprehensive offline queue statistics
 */
export interface OfflineQueueStatistics {
  totalActions: number;
  actionsByPriority: Record<OfflinePriority, number>;
  actionsByType: Record<OfflineActionType, number>;
  oldestActionAge: number;        // Minutes since oldest action
  averageRetryCount: number;
  totalDataSize: number;          // Bytes
  criticalActionsCount: number;
  failureRate: number;           // 0-1
  estimatedSyncTime: number;     // Minutes
  lastProcessingAttempt?: string;
  lastSuccessfulSync?: string;
  clinicalDataPending: boolean;
  crisisDataPending: boolean;
  storage: {
    used: number;                // Bytes
    available: number;           // Bytes
    encrypted: number;           // Bytes of encrypted data
  };
  performance: {
    averageProcessingTime: number;   // ms per action
    p95ProcessingTime: number;       // ms
    p99ProcessingTime: number;       // ms
    throughput: number;              // actions per minute
  };
}

/**
 * Network monitoring configuration
 */
export interface NetworkMonitoringConfig {
  pollingInterval: number;        // ms
  qualityAssessmentInterval: number; // ms
  bandwidthTestEnabled: boolean;
  latencyTestEnabled: boolean;
  backgroundSyncEnabled: boolean;
  adaptiveQualityEnabled: boolean;
  clinicalDataPriority: boolean;
}

/**
 * Background sync scheduler configuration
 */
export interface BackgroundSyncConfig {
  enabled: boolean;
  interval: number;               // minutes
  wifiOnly: boolean;
  batteryThreshold: number;       // 0-100
  storageThreshold: number;       // bytes available
  priorityQueuesOnly: boolean;
  clinicalDataFirst: boolean;
  maxSyncDuration: number;        // minutes
  quietHours: {
    enabled: boolean;
    start: string;                // "22:00"
    end: string;                  // "07:00"
  };
}

/**
 * Data integrity validation result
 */
export interface DataIntegrityResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  clinicalConsistency: boolean;
  assessmentIntegrity: boolean;
  crisisDataIntegrity: boolean;
  timestamp: string;
  checkedItems: number;
  repairedItems: number;
}

/**
 * Offline operation result
 */
export interface OfflineOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: OfflineError;
  queuedForLater: boolean;
  clinicalValidation?: ClinicalValidation;
  metadata: {
    operationId: string;
    timestamp: string;
    executionTime: number;        // ms
    networkQuality: NetworkQuality;
    offline: boolean;
  };
}

/**
 * Batch operation result for multiple actions
 */
export interface BatchOperationResult {
  successful: number;
  failed: number;
  queued: number;
  results: OfflineOperationResult[];
  criticalFailures: OfflineError[];
  estimatedRetryTime?: number;    // minutes
  clinicalDataAffected: boolean;
}

/**
 * Offline service health status
 */
export interface OfflineServiceHealth {
  status: 'healthy' | 'degraded' | 'critical' | 'offline';
  services: {
    queue: 'operational' | 'degraded' | 'failed';
    network: 'operational' | 'degraded' | 'failed';
    storage: 'operational' | 'degraded' | 'failed';
    sync: 'operational' | 'degraded' | 'failed';
    clinical: 'operational' | 'degraded' | 'failed';
  };
  lastHealthCheck: string;
  criticalIssues: string[];
  clinicalSafetyStatus: 'secure' | 'at_risk' | 'compromised';
  recommendedActions: string[];
}

/**
 * Type guards for offline operations
 */
export const isOfflineActionData = {
  isCheckIn: (data: any): data is CheckIn => {
    return data && typeof data === 'object' && 'type' in data && 'startedAt' in data;
  },
  
  isAssessment: (data: any): data is Assessment => {
    return data && typeof data === 'object' && 'type' in data && 'answers' in data;
  },
  
  isCrisisData: (data: any): data is CrisisData => {
    return data && typeof data === 'object' && 'type' in data && data.type.includes('crisis');
  },
  
  isUserProfile: (data: any): data is UserProfile => {
    return data && typeof data === 'object' && 'id' in data && 'createdAt' in data;
  }
};

/**
 * Clinical safety helper functions
 */
export const ClinicalSafetyHelpers = {
  /**
   * Determine if action requires immediate processing
   */
  requiresImmediateProcessing: (action: EnhancedQueuedAction): boolean => {
    return action.priority === OfflinePriority.CRITICAL ||
           action.clinicalValidation?.requiresImmediateSync ||
           action.clinicalValidation?.clinicalThresholdMet ||
           false;
  },
  
  /**
   * Check if data contains crisis-level information
   */
  containsCrisisData: (data: OfflineActionData): boolean => {
    if (isOfflineActionData.isAssessment(data)) {
      return data.score >= 20 && data.type === 'phq9' || 
             data.score >= 15 && data.type === 'gad7';
    }
    return isOfflineActionData.isCrisisData(data);
  },
  
  /**
   * Get clinical priority for action type
   */
  getClinicalPriority: (actionType: OfflineActionType): OfflinePriority => {
    const criticalActions: OfflineActionType[] = [
      'save_crisis_data',
      'save_assessment_critical',
      'update_crisis_plan',
      'save_emergency_contact'
    ];
    
    if (criticalActions.includes(actionType)) {
      return OfflinePriority.CRITICAL;
    }
    
    const highActions: OfflineActionType[] = [
      'save_assessment',
      'save_checkin_complete',
      'update_clinical_profile'
    ];
    
    if (highActions.includes(actionType)) {
      return OfflinePriority.HIGH;
    }
    
    return OfflinePriority.MEDIUM;
  }
};

/**
 * Export all types for easy importing
 */
export type {
  EnhancedQueuedAction as QueuedAction,
  OfflineActionType as ActionType,
  OfflineActionData as ActionData,
  OfflineError as ErrorType,
  OfflineOperationResult as OperationResult,
  BatchOperationResult as BatchResult
};