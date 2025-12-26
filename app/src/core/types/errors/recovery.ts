/**
 * Error Handling and Recovery Types - Comprehensive Safety Framework
 * Type definitions for robust error handling, recovery strategies, and fallback mechanisms
 * 
 * ERROR HANDLING REQUIREMENTS:
 * - Crisis-safe error handling (maintain crisis functionality during errors)
 * - HIPAA-compliant error logging (no PHI in error messages)
 * - Graceful degradation with user-friendly fallbacks
 * - Automatic recovery mechanisms with escalation paths
 * - Performance-aware error handling (no blocking error processing)
 * - Security-conscious error responses (no information leakage)
 * 
 * SAFETY REQUIREMENTS:
 * - Crisis functionality MUST be maintained during any error
 * - 988 contact capability MUST remain available
 * - Emergency contacts MUST be accessible
 * - Assessment data MUST be preserved during errors
 * - User safety MUST NOT be compromised by error states
 */

import { PerformanceMetric, PerformanceViolation } from '../performance/constraints';
import { CrisisDetection, CrisisIntervention } from '@/features/crisis/types/safety';
import { HIPAAAuditLog, PHIClassification } from '../compliance/data-protection';
import { SecurityEvent } from '../security/encryption';

/**
 * Error Severity Levels
 */
export type ErrorSeverity = 
  | 'info'                 // Informational, no user impact
  | 'warning'              // Minor issue, functionality continues
  | 'error'                // Error condition, some functionality impaired
  | 'critical'             // Critical error, major functionality impaired
  | 'emergency'            // Emergency error, crisis functionality threatened
  | 'catastrophic';        // System failure, immediate intervention required

/**
 * Error Categories
 */
export type ErrorCategory = 
  | 'network'              // Network connectivity issues
  | 'authentication'       // Authentication/authorization failures
  | 'authorization'        // Permission/access control errors
  | 'validation'           // Data validation failures
  | 'encryption'           // Encryption/decryption errors
  | 'storage'              // Data storage/retrieval errors
  | 'calculation'          // Clinical calculation errors
  | 'rendering'            // UI rendering errors
  | 'navigation'           // Navigation/routing errors
  | 'performance'          // Performance constraint violations
  | 'memory'               // Memory management errors
  | 'security'             // Security-related errors
  | 'compliance'           // Compliance violation errors
  | 'crisis'               // Crisis detection/intervention errors
  | 'system'               // System-level errors
  | 'external'             // External service errors
  | 'unknown';             // Unclassified errors

/**
 * Error Context
 */
export interface ErrorContext {
  /** User ID (encrypted for PHI protection) */
  userId?: string;
  /** Session ID */
  sessionId?: string;
  /** Component name where error occurred */
  componentName?: string;
  /** Operation being performed */
  operation: string;
  /** Timestamp when error occurred */
  timestamp: number;
  /** Crisis context */
  crisisContext?: CrisisErrorContext;
  /** Performance context */
  performanceContext?: PerformanceErrorContext;
  /** Compliance context */
  complianceContext?: ComplianceErrorContext;
  /** Security context */
  securityContext?: SecurityErrorContext;
  /** User context */
  userContext: UserErrorContext;
  /** Device context */
  deviceContext: DeviceErrorContext;
  /** Network context */
  networkContext?: NetworkErrorContext;
}

/**
 * Crisis Error Context
 */
export interface CrisisErrorContext {
  /** Crisis is currently active */
  crisisActive: boolean;
  /** Active crisis detection */
  activeCrisis?: CrisisDetection;
  /** Active intervention */
  activeIntervention?: CrisisIntervention;
  /** Crisis functionality impacted */
  crisisFunctionalityImpacted: boolean;
  /** Emergency contacts accessible */
  emergencyContactsAccessible: boolean;
  /** 988 contact capability available */
  contact988Available: boolean;
}

/**
 * Performance Error Context
 */
export interface PerformanceErrorContext {
  /** Current performance metrics */
  currentMetrics: PerformanceMetric[];
  /** Active performance violations */
  activeViolations: PerformanceViolation[];
  /** Memory pressure level */
  memoryPressure: 'low' | 'medium' | 'high' | 'critical';
  /** CPU usage level */
  cpuUsage: 'low' | 'medium' | 'high' | 'critical';
  /** Network performance */
  networkPerformance: 'good' | 'fair' | 'poor' | 'offline';
}

/**
 * Compliance Error Context
 */
export interface ComplianceErrorContext {
  /** PHI data types involved */
  phiTypesInvolved: PHIClassification[];
  /** Consent status */
  consentStatus: 'valid' | 'expired' | 'missing' | 'withdrawn';
  /** Audit requirements */
  auditRequired: boolean;
  /** Data retention impact */
  dataRetentionImpact: boolean;
  /** Regulatory implications */
  regulatoryImplications: string[];
}

/**
 * Security Error Context
 */
export interface SecurityErrorContext {
  /** Authentication status */
  authenticationStatus: 'authenticated' | 'unauthenticated' | 'expired' | 'invalid';
  /** Encryption status */
  encryptionStatus: 'encrypted' | 'unencrypted' | 'failed' | 'unknown';
  /** Security threats detected */
  securityThreats: string[];
  /** Security events triggered */
  securityEvents: SecurityEvent[];
  /** Device trust level */
  deviceTrustLevel: 'trusted' | 'untrusted' | 'compromised' | 'unknown';
}

/**
 * User Error Context
 */
export interface UserErrorContext {
  /** User experience level */
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  /** User's current emotional state (if known) */
  emotionalState?: 'stable' | 'distressed' | 'crisis' | 'unknown';
  /** Accessibility needs */
  accessibilityNeeds: string[];
  /** Language preference */
  languagePreference: string;
  /** User's previous error encounters */
  previousErrorCount: number;
  /** User's error recovery success rate */
  errorRecoverySuccessRate: number;
}

/**
 * Device Error Context
 */
export interface DeviceErrorContext {
  /** Device platform */
  platform: 'ios' | 'android';
  /** Device type */
  deviceType: 'phone' | 'tablet';
  /** OS version */
  osVersion: string;
  /** App version */
  appVersion: string;
  /** Available storage (MB) */
  availableStorageMB: number;
  /** Battery level (if available) */
  batteryLevel?: number;
  /** Device orientation */
  orientation: 'portrait' | 'landscape';
  /** Accessibility settings enabled */
  accessibilityEnabled: boolean;
}

/**
 * Network Error Context
 */
export interface NetworkErrorContext {
  /** Connection type */
  connectionType: 'wifi' | 'cellular' | 'offline' | 'unknown';
  /** Connection quality */
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  /** Network latency (ms) */
  latencyMs?: number;
  /** Bandwidth estimate (kbps) */
  bandwidthKbps?: number;
  /** VPN/proxy detected */
  proxyDetected: boolean;
}

/**
 * Enhanced Error Interface
 */
export interface EnhancedError extends Error {
  /** Error ID for tracking */
  id: string;
  /** Error severity */
  severity: ErrorSeverity;
  /** Error category */
  category: ErrorCategory;
  /** Error code */
  code: string;
  /** User-friendly error message */
  userMessage: string;
  /** Technical error message */
  technicalMessage: string;
  /** Error context */
  context: ErrorContext;
  /** Original error (if wrapped) */
  originalError?: Error;
  /** Recovery strategies available */
  recoveryStrategies: ErrorRecoveryStrategy[];
  /** Automatic recovery attempted */
  autoRecoveryAttempted: boolean;
  /** Recovery success */
  recoverySuccessful?: boolean;
  /** Error metrics */
  metrics: ErrorMetrics;
  /** Compliance considerations */
  compliance: ErrorComplianceInfo;
  /** Security implications */
  security: ErrorSecurityInfo;
}

/**
 * Error Recovery Strategy
 */
export interface ErrorRecoveryStrategy {
  /** Strategy name */
  name: string;
  /** Strategy type */
  type: ErrorRecoveryType;
  /** Strategy description */
  description: string;
  /** Estimated success rate */
  successRate: number;
  /** Estimated recovery time (ms) */
  estimatedTimeMs: number;
  /** User action required */
  userActionRequired: boolean;
  /** User instructions */
  userInstructions?: string;
  /** Automatic execution possible */
  canAutoExecute: boolean;
  /** Prerequisites for strategy */
  prerequisites: string[];
  /** Strategy implementation */
  execute: () => Promise<RecoveryResult>;
  /** Strategy validation */
  validate: () => Promise<boolean>;
}

/**
 * Error Recovery Types
 */
export type ErrorRecoveryType = 
  | 'retry'                // Retry the failed operation
  | 'fallback'             // Use alternative implementation
  | 'cache'                // Use cached data
  | 'offline'              // Switch to offline mode
  | 'degraded'             // Reduce functionality
  | 'reset'                // Reset component/state
  | 'restart'              // Restart application
  | 'escalate'             // Escalate to human support
  | 'emergency'            // Activate emergency procedures
  | 'safe_mode'            // Switch to safe mode
  | 'crisis_mode'          // Maintain crisis functionality only
  | 'manual'               // Require manual intervention
  | 'ignore';              // Ignore error and continue

/**
 * Recovery Result
 */
export interface RecoveryResult {
  /** Recovery success */
  success: boolean;
  /** Recovery strategy used */
  strategy: ErrorRecoveryType;
  /** Recovery time (ms) */
  recoveryTimeMs: number;
  /** Error resolved */
  errorResolved: boolean;
  /** Functionality restored */
  functionalityRestored: string[];
  /** Remaining issues */
  remainingIssues: string[];
  /** Follow-up actions required */
  followUpRequired: boolean;
  /** User notification needed */
  userNotificationNeeded: boolean;
  /** Recovery notes */
  notes?: string;
}

/**
 * Error Metrics
 */
export interface ErrorMetrics {
  /** Error occurrence count */
  occurrenceCount: number;
  /** First occurrence timestamp */
  firstOccurrence: number;
  /** Last occurrence timestamp */
  lastOccurrence: number;
  /** Average time between occurrences */
  averageTimeBetweenMs: number;
  /** Recovery success rate */
  recoverySuccessRate: number;
  /** Average recovery time */
  averageRecoveryTimeMs: number;
  /** User impact score (0-100) */
  userImpactScore: number;
  /** System impact score (0-100) */
  systemImpactScore: number;
  /** Business impact score (0-100) */
  businessImpactScore: number;
}

/**
 * Error Compliance Information
 */
export interface ErrorComplianceInfo {
  /** PHI potentially exposed */
  phiExposed: boolean;
  /** PHI types involved */
  phiTypes: PHIClassification[];
  /** Audit logging required */
  auditRequired: boolean;
  /** Notification requirements */
  notificationRequired: boolean;
  /** Regulatory reporting needed */
  regulatoryReportingNeeded: boolean;
  /** Data breach potential */
  dataBreachPotential: 'none' | 'low' | 'medium' | 'high' | 'confirmed';
  /** Compliance violations */
  complianceViolations: string[];
}

/**
 * Error Security Information
 */
export interface ErrorSecurityInfo {
  /** Security threat level */
  threatLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  /** Potential attack vector */
  attackVector?: string;
  /** Security events triggered */
  securityEventsTriggered: SecurityEvent[];
  /** Session compromise risk */
  sessionCompromiseRisk: 'none' | 'low' | 'medium' | 'high';
  /** Data exposure risk */
  dataExposureRisk: 'none' | 'low' | 'medium' | 'high';
  /** Security response required */
  securityResponseRequired: boolean;
}

/**
 * Error Handler Interface
 */
export interface ErrorHandler {
  /** Handle error with recovery */
  handleError: (error: Error, context: Partial<ErrorContext>) => Promise<EnhancedError>;
  
  /** Register error recovery strategy */
  registerRecoveryStrategy: (
    errorCode: string, 
    strategy: ErrorRecoveryStrategy
  ) => void;
  
  /** Attempt automatic recovery */
  attemptRecovery: (error: EnhancedError) => Promise<RecoveryResult>;
  
  /** Escalate error to human support */
  escalateError: (error: EnhancedError, reason: string) => Promise<void>;
  
  /** Report error for analysis */
  reportError: (error: EnhancedError) => Promise<void>;
  
  /** Get error statistics */
  getErrorStatistics: (timeRangeMs: number) => ErrorStatistics;
}

/**
 * Error Statistics
 */
export interface ErrorStatistics {
  /** Time range covered */
  timeRangeMs: number;
  /** Total errors */
  totalErrors: number;
  /** Errors by severity */
  errorsBySeverity: Record<ErrorSeverity, number>;
  /** Errors by category */
  errorsByCategory: Record<ErrorCategory, number>;
  /** Most common errors */
  mostCommonErrors: Array<{
    code: string;
    count: number;
    description: string;
  }>;
  /** Recovery success rates */
  recoverySuccessRates: Record<ErrorRecoveryType, number>;
  /** Average recovery times */
  averageRecoveryTimes: Record<ErrorRecoveryType, number>;
  /** Crisis impact analysis */
  crisisImpactAnalysis: {
    errorsAffectingCrisis: number;
    crisisFunctionalityMaintained: number;
    emergencyContactsAffected: number;
  };
  /** Compliance impact */
  complianceImpact: {
    phiExposureIncidents: number;
    auditViolations: number;
    regulatoryReports: number;
  };
  /** Trends */
  trends: {
    errorRateChange: number;
    recoveryRateChange: number;
    severityTrend: 'improving' | 'stable' | 'worsening';
  };
}

/**
 * Crisis-Safe Error Handling
 */
export interface CrisisSafeErrorHandler {
  /** Ensure crisis functionality during error */
  maintainCrisisFunctionality: (error: EnhancedError) => Promise<boolean>;
  
  /** Preserve emergency contact access */
  preserveEmergencyAccess: (error: EnhancedError) => Promise<boolean>;
  
  /** Maintain 988 contact capability */
  maintain988Access: (error: EnhancedError) => Promise<boolean>;
  
  /** Safe error logging (no PHI) */
  safeErrorLogging: (error: EnhancedError) => Promise<void>;
  
  /** Crisis-aware user notification */
  notifyUserSafely: (error: EnhancedError, userContext: UserErrorContext) => Promise<void>;
}

/**
 * Error Boundary Props
 */
export interface ErrorBoundaryProps {
  /** Fallback component */
  fallback: React.ComponentType<ErrorFallbackProps>;
  
  /** Error handler */
  onError?: (error: EnhancedError, errorInfo: any) => void;
  
  /** Recovery strategies */
  recoveryStrategies?: ErrorRecoveryStrategy[];
  
  /** Crisis safety requirements */
  crisisSafety: {
    maintainCrisisAccess: boolean;
    preserveEmergencyContacts: boolean;
    enable988Fallback: boolean;
  };
  
  /** Compliance requirements */
  compliance: {
    preventPHIExposure: boolean;
    auditErrorOccurrence: boolean;
    reportSecurityEvents: boolean;
  };
  
  /** Performance requirements */
  performance: {
    maxRecoveryTimeMs: number;
    fallbackPerformanceBudget: number;
    maintainAccessibility: boolean;
  };
}

/**
 * Error Fallback Component Props
 */
export interface ErrorFallbackProps {
  /** Error that occurred */
  error: EnhancedError;
  
  /** Error information */
  errorInfo: any;
  
  /** Retry handler */
  onRetry: () => void;
  
  /** Report error handler */
  onReportError?: () => void;
  
  /** Emergency access handler */
  onEmergencyAccess?: () => void;
  
  /** Safe mode handler */
  onSafeMode?: () => void;
  
  /** Recovery strategies available */
  recoveryStrategies: ErrorRecoveryStrategy[];
  
  /** Crisis context */
  crisisContext?: CrisisErrorContext;
  
  /** User context */
  userContext: UserErrorContext;
}

/**
 * Predefined Error Recovery Strategies
 */
export const ERROR_RECOVERY_STRATEGIES: Record<string, ErrorRecoveryStrategy> = {
  NETWORK_RETRY: {
    name: 'Network Retry',
    type: 'retry',
    description: 'Retry network operation with exponential backoff',
    successRate: 0.85,
    estimatedTimeMs: 3000,
    userActionRequired: false,
    canAutoExecute: true,
    prerequisites: ['network_available'],
    execute: async () => ({ 
      success: true, 
      strategy: 'retry', 
      recoveryTimeMs: 2500,
      errorResolved: true,
      functionalityRestored: ['network_access'],
      remainingIssues: [],
      followUpRequired: false,
      userNotificationNeeded: false
    }),
    validate: async () => true
  },
  
  OFFLINE_FALLBACK: {
    name: 'Offline Fallback',
    type: 'offline',
    description: 'Switch to offline mode using cached data',
    successRate: 0.95,
    estimatedTimeMs: 500,
    userActionRequired: false,
    canAutoExecute: true,
    prerequisites: ['cache_available'],
    execute: async () => ({ 
      success: true, 
      strategy: 'offline', 
      recoveryTimeMs: 450,
      errorResolved: false,
      functionalityRestored: ['basic_functionality'],
      remainingIssues: ['limited_features'],
      followUpRequired: true,
      userNotificationNeeded: true
    }),
    validate: async () => true
  },
  
  CRISIS_SAFE_MODE: {
    name: 'Crisis Safe Mode',
    type: 'crisis_mode',
    description: 'Maintain only crisis-essential functionality',
    successRate: 0.99,
    estimatedTimeMs: 200,
    userActionRequired: false,
    canAutoExecute: true,
    prerequisites: [],
    execute: async () => ({ 
      success: true, 
      strategy: 'crisis_mode', 
      recoveryTimeMs: 150,
      errorResolved: false,
      functionalityRestored: ['crisis_detection', 'emergency_contacts', '988_access'],
      remainingIssues: ['limited_app_features'],
      followUpRequired: true,
      userNotificationNeeded: true
    }),
    validate: async () => true
  },
  
  COMPONENT_RESET: {
    name: 'Component Reset',
    type: 'reset',
    description: 'Reset component to initial state',
    successRate: 0.80,
    estimatedTimeMs: 100,
    userActionRequired: false,
    canAutoExecute: true,
    prerequisites: [],
    execute: async () => ({ 
      success: true, 
      strategy: 'reset', 
      recoveryTimeMs: 75,
      errorResolved: true,
      functionalityRestored: ['component_functionality'],
      remainingIssues: [],
      followUpRequired: false,
      userNotificationNeeded: false
    }),
    validate: async () => true
  }
} as const;

/**
 * Error Codes
 */
export const ERROR_CODES = {
  // Network Errors
  NETWORK_TIMEOUT: 'NET_001',
  NETWORK_UNAVAILABLE: 'NET_002',
  NETWORK_AUTH_FAILED: 'NET_003',
  NETWORK_SERVER_ERROR: 'NET_004',
  
  // Authentication Errors
  AUTH_INVALID_CREDENTIALS: 'AUTH_001',
  AUTH_SESSION_EXPIRED: 'AUTH_002',
  AUTH_BIOMETRIC_FAILED: 'AUTH_003',
  AUTH_LOCKED_OUT: 'AUTH_004',
  
  // Encryption Errors
  ENCRYPT_KEY_NOT_FOUND: 'ENC_001',
  ENCRYPT_OPERATION_FAILED: 'ENC_002',
  ENCRYPT_INVALID_DATA: 'ENC_003',
  
  // Storage Errors
  STORAGE_QUOTA_EXCEEDED: 'STOR_001',
  STORAGE_ACCESS_DENIED: 'STOR_002',
  STORAGE_CORRUPTION: 'STOR_003',
  
  // Clinical Errors
  CLINICAL_CALCULATION_ERROR: 'CLIN_001',
  CLINICAL_INVALID_RESPONSE: 'CLIN_002',
  CLINICAL_THRESHOLD_ERROR: 'CLIN_003',
  
  // Crisis Errors
  CRISIS_DETECTION_FAILED: 'CRIS_001',
  CRISIS_INTERVENTION_ERROR: 'CRIS_002',
  CRISIS_CONTACT_FAILED: 'CRIS_003',
  
  // Performance Errors
  PERF_TIMEOUT_VIOLATION: 'PERF_001',
  PERF_MEMORY_EXCEEDED: 'PERF_002',
  PERF_RENDER_FAILED: 'PERF_003',
  
  // Compliance Errors
  COMP_CONSENT_REQUIRED: 'COMP_001',
  COMP_PHI_EXPOSURE: 'COMP_002',
  COMP_AUDIT_FAILED: 'COMP_003',
  
  // Security Errors
  SEC_THREAT_DETECTED: 'SEC_001',
  SEC_DEVICE_COMPROMISED: 'SEC_002',
  SEC_UNAUTHORIZED_ACCESS: 'SEC_003'
} as const;

/**
 * Default Error Messages
 */
export const DEFAULT_ERROR_MESSAGES: Record<string, { user: string; technical: string }> = {
  [ERROR_CODES.NETWORK_TIMEOUT]: {
    user: 'Connection timed out. Please check your internet connection and try again.',
    technical: 'Network request timed out after configured timeout period'
  },
  [ERROR_CODES.CRISIS_DETECTION_FAILED]: {
    user: 'We\'re having trouble processing your assessment. Your safety is our priority - emergency contacts remain available.',
    technical: 'Crisis detection algorithm failed during assessment processing'
  },
  [ERROR_CODES.AUTH_SESSION_EXPIRED]: {
    user: 'Your session has expired for your security. Please sign in again.',
    technical: 'Authentication session exceeded maximum lifetime'
  },
  [ERROR_CODES.STORAGE_QUOTA_EXCEEDED]: {
    user: 'Your device is running low on storage space. Please free up some space to continue.',
    technical: 'Device storage quota exceeded, unable to persist data'
  }
} as const;