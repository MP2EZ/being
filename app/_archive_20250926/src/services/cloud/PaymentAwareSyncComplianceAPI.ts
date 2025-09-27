/**
 * Payment-Aware Sync Compliance API - Day 19 Phase 1
 *
 * HIPAA-compliant audit trail management and regulatory compliance
 * for payment-aware sync operations with crisis safety preservation.
 *
 * COMPLIANCE REQUIREMENTS:
 * - HIPAA audit trails for all mental health data sync operations
 * - Zero-PII design with encrypted audit payloads
 * - Crisis safety compliance with <200ms emergency response
 * - Subscription tier compliance tracking and validation
 * - Real-time compliance monitoring and violation detection
 */

import { SyncOperation, SyncEntityType } from '../../types/sync';
import { SubscriptionTier } from '../../types/subscription';
import { CrisisPaymentOverride } from '../../types/payment';

// ============================================================================
// HIPAA COMPLIANCE AUDIT TYPES
// ============================================================================

/**
 * HIPAA-compliant audit log entry for sync operations
 */
export interface HIPAAAuditLogEntry {
  readonly auditId: string;
  readonly timestamp: string;
  readonly eventType: HIPAAAuditEventType;
  readonly userId: string;                    // Encrypted user identifier
  readonly deviceId: string;                  // Encrypted device identifier
  readonly sessionId?: string;                // Encrypted session identifier
  readonly operationDetails: {
    readonly operationType: 'sync_request' | 'sync_response' | 'crisis_override' | 'tier_change';
    readonly entityType: SyncEntityType;
    readonly entityId: string;                // Encrypted entity identifier
    readonly dataClassification: DataClassification;
    readonly syncDirection: 'upload' | 'download' | 'bidirectional';
  };
  readonly subscriptionContext: {
    readonly tier: SubscriptionTier;
    readonly tierValidated: boolean;
    readonly paymentStatusCurrent: boolean;
    readonly gracePeriodActive: boolean;
  };
  readonly complianceMetadata: {
    readonly dataEncrypted: boolean;
    readonly auditTrailComplete: boolean;
    readonly consentVerified: boolean;
    readonly retentionPolicyApplied: boolean;
    readonly crossBorderDataTransfer: boolean;
  };
  readonly accessControl: {
    readonly authenticationMethod: string;
    readonly authorizationVerified: boolean;
    readonly accessLevel: 'read' | 'write' | 'admin' | 'emergency';
    readonly mfaRequired: boolean;
    readonly mfaCompleted: boolean;
  };
  readonly crisisContext: {
    readonly crisisMode: boolean;
    readonly emergencyOverride: boolean;
    readonly crisisResponseTime?: number;     // ms, must be <200ms
    readonly safetyProtocolsActivated: readonly string[];
  };
  readonly dataIntegrity: {
    readonly checksumVerified: boolean;
    readonly encryptionVerified: boolean;
    readonly transmissionSecure: boolean;
    readonly storageCompliant: boolean;
  };
  readonly geoLocation?: {
    readonly country: string;
    readonly state?: string;
    readonly dataResidencyCompliant: boolean;
  };
}

/**
 * HIPAA audit event types
 */
export enum HIPAAAuditEventType {
  SYNC_INITIATED = 'sync_initiated',
  SYNC_COMPLETED = 'sync_completed',
  SYNC_FAILED = 'sync_failed',
  CRISIS_OVERRIDE_ACTIVATED = 'crisis_override_activated',
  EMERGENCY_ACCESS = 'emergency_access',
  SUBSCRIPTION_TIER_CHANGED = 'subscription_tier_changed',
  PAYMENT_STATUS_CHANGED = 'payment_status_changed',
  DATA_ACCESS = 'data_access',
  DATA_EXPORT = 'data_export',
  CONSENT_UPDATED = 'consent_updated',
  RETENTION_POLICY_APPLIED = 'retention_policy_applied',
  SECURITY_VIOLATION = 'security_violation',
  COMPLIANCE_VIOLATION = 'compliance_violation'
}

/**
 * Data classification for HIPAA compliance
 */
export enum DataClassification {
  PHI = 'phi',                              // Protected Health Information
  PII = 'pii',                              // Personally Identifiable Information
  CLINICAL = 'clinical',                    // Clinical data (assessments, scores)
  THERAPEUTIC = 'therapeutic',              // Therapeutic content and progress
  CRISIS = 'crisis',                        // Crisis-related data (always priority)
  METADATA = 'metadata',                    // Non-sensitive metadata
  SYSTEM = 'system'                         // System/operational data
}

/**
 * Compliance violation details
 */
export interface ComplianceViolation {
  readonly violationId: string;
  readonly timestamp: string;
  readonly violationType: ComplianceViolationType;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly description: string;
  readonly affectedData: {
    readonly entityType: SyncEntityType;
    readonly dataClassification: DataClassification;
    readonly recordCount: number;
    readonly usersAffected: number;
  };
  readonly rootCause: {
    readonly category: 'technical' | 'procedural' | 'human_error' | 'system_failure';
    readonly details: string;
    readonly systemComponent?: string;
  };
  readonly impact: {
    readonly dataExposure: boolean;
    readonly unauthorizedAccess: boolean;
    readonly dataIntegrityCompromised: boolean;
    readonly serviceDisruption: boolean;
    readonly crisisSafetyRisk: boolean;
  };
  readonly remediation: {
    readonly immediateActions: readonly string[];
    readonly longTermActions: readonly string[];
    readonly completedAt?: string;
    readonly verifiedBy?: string;
  };
  readonly reportingRequirements: {
    readonly hipaaReportingRequired: boolean;
    readonly regulatoryNotificationRequired: boolean;
    readonly userNotificationRequired: boolean;
    readonly timelineForReporting: number;   // hours
  };
}

/**
 * Types of compliance violations
 */
export enum ComplianceViolationType {
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  DATA_BREACH = 'data_breach',
  ENCRYPTION_FAILURE = 'encryption_failure',
  AUDIT_TRAIL_INCOMPLETE = 'audit_trail_incomplete',
  CONSENT_VIOLATION = 'consent_violation',
  RETENTION_VIOLATION = 'retention_violation',
  CROSS_BORDER_VIOLATION = 'cross_border_violation',
  CRISIS_RESPONSE_DELAY = 'crisis_response_delay',
  PAYMENT_COMPLIANCE_VIOLATION = 'payment_compliance_violation',
  DATA_INTEGRITY_VIOLATION = 'data_integrity_violation'
}

// ============================================================================
// SUBSCRIPTION COMPLIANCE TRACKING
// ============================================================================

/**
 * Subscription tier compliance validation
 */
export interface SubscriptionComplianceValidation {
  readonly validationId: string;
  readonly timestamp: string;
  readonly userId: string;
  readonly subscriptionTier: SubscriptionTier;
  readonly requestedOperation: {
    readonly operationType: string;
    readonly entityType: SyncEntityType;
    readonly dataSize: number;
    readonly priority: number;
  };
  readonly compliance: {
    readonly tierEntitlementValid: boolean;
    readonly paymentStatusCurrent: boolean;
    readonly operationWithinLimits: boolean;
    readonly dataClassificationAllowed: boolean;
    readonly crisisOverrideJustified: boolean;
  };
  readonly violations: readonly {
    readonly type: string;
    readonly description: string;
    readonly severity: 'low' | 'medium' | 'high';
    readonly actionRequired: string;
  }[];
  readonly recommendations: readonly string[];
}

/**
 * Payment compliance audit trail
 */
export interface PaymentComplianceAudit {
  readonly auditId: string;
  readonly timestamp: string;
  readonly userId: string;
  readonly paymentEvent: {
    readonly eventType: 'payment_success' | 'payment_failure' | 'subscription_change' | 'tier_upgrade' | 'tier_downgrade';
    readonly amount?: number;
    readonly currency?: string;
    readonly paymentProvider: string;
    readonly transactionId?: string;
  };
  readonly syncImpact: {
    readonly tierChanged: boolean;
    readonly entitlementsModified: readonly string[];
    readonly activeOperationsAffected: number;
    readonly queueAdjustmentsRequired: boolean;
  };
  readonly complianceChecks: {
    readonly paymentDataHandling: boolean;
    readonly subscriptionDataPrivacy: boolean;
    readonly financialDataEncryption: boolean;
    readonly auditTrailComplete: boolean;
  };
  readonly crisisConsiderations: {
    readonly crisisOverridePreserved: boolean;
    readonly emergencyAccessMaintained: boolean;
    readonly safetyImpactAssessed: boolean;
  };
}

// ============================================================================
// CRISIS SAFETY COMPLIANCE
// ============================================================================

/**
 * Crisis safety compliance validation
 */
export interface CrisisSafetyCompliance {
  readonly complianceId: string;
  readonly timestamp: string;
  readonly emergencyId?: string;
  readonly userId?: string;
  readonly crisisType: 'assessment_threshold' | 'manual_emergency' | 'system_detected' | 'payment_override';
  readonly responseMetrics: {
    readonly detectionTime: number;          // ms
    readonly responseTime: number;           // ms, must be <200ms
    readonly totalProcessingTime: number;    // ms
    readonly slaCompliant: boolean;
  };
  readonly safetyProtocols: {
    readonly crisisResourcesProvided: boolean;
    readonly emergencyContactsActivated: boolean;
    readonly hotlineAccessProvided: boolean;  // 988
    readonly crisisPlanActivated: boolean;
    readonly therapeuticContinuityPreserved: boolean;
  };
  readonly paymentOverride: {
    readonly overrideActivated: boolean;
    readonly subscriptionLimitsBypassed: readonly string[];
    readonly justification: string;
    readonly duration?: number;              // seconds
    readonly auditTrailMaintained: boolean;
  };
  readonly dataHandling: {
    readonly crisisDataEncrypted: boolean;
    readonly emergencyBackupCreated: boolean;
    readonly auditLogComplete: boolean;
    readonly complianceValidated: boolean;
  };
  readonly outcome: {
    readonly crisisResolved: boolean;
    readonly followUpRequired: boolean;
    readonly complianceViolations: readonly ComplianceViolation[];
    readonly lessonsLearned: readonly string[];
  };
}

// ============================================================================
// DATA RETENTION AND LIFECYCLE COMPLIANCE
// ============================================================================

/**
 * Data retention policy for sync operations
 */
export interface DataRetentionPolicy {
  readonly policyId: string;
  readonly effectiveDate: string;
  readonly dataType: DataClassification;
  readonly retentionPeriod: {
    readonly duration: number;               // days
    readonly justification: string;
    readonly regulatoryRequirement?: string;
  };
  readonly disposalMethod: {
    readonly deletionMethod: 'secure_delete' | 'cryptographic_erasure' | 'physical_destruction';
    readonly verificationRequired: boolean;
    readonly auditTrailRequired: boolean;
  };
  readonly exceptions: {
    readonly crisisDataExtension: number;    // additional days for crisis data
    readonly legalHoldOverride: boolean;
    readonly userRequestOverride: boolean;
  };
  readonly compliance: {
    readonly hipaaCompliant: boolean;
    readonly gdprCompliant: boolean;
    readonly stateRegulationsCompliant: boolean;
  };
}

/**
 * Data lifecycle audit entry
 */
export interface DataLifecycleAudit {
  readonly auditId: string;
  readonly timestamp: string;
  readonly entityId: string;
  readonly entityType: SyncEntityType;
  readonly dataClassification: DataClassification;
  readonly lifecycleEvent: {
    readonly eventType: 'created' | 'accessed' | 'modified' | 'synced' | 'archived' | 'deleted';
    readonly eventTimestamp: string;
    readonly triggeredBy: 'user' | 'system' | 'retention_policy' | 'compliance_requirement';
  };
  readonly retentionStatus: {
    readonly withinRetentionPeriod: boolean;
    readonly daysUntilExpiry: number;
    readonly retentionPolicyApplied: string;
    readonly deletionScheduled: boolean;
  };
  readonly complianceValidation: {
    readonly auditTrailComplete: boolean;
    readonly encryptionVerified: boolean;
    readonly accessControlsApplied: boolean;
    readonly backupCompliant: boolean;
  };
}

// ============================================================================
// COMPLIANCE API INTERFACES
// ============================================================================

/**
 * HIPAA Compliance API for sync operations
 */
export interface IHIPAAComplianceAPI {
  /**
   * Create HIPAA audit log entry for sync operation
   */
  createAuditLogEntry(
    operation: SyncOperation,
    subscriptionTier: SubscriptionTier,
    crisisOverride?: CrisisPaymentOverride
  ): Promise<HIPAAAuditLogEntry>;

  /**
   * Validate operation for HIPAA compliance
   */
  validateHIPAACompliance(
    operation: SyncOperation,
    userId: string,
    dataClassification: DataClassification
  ): Promise<{
    compliant: boolean;
    violations: readonly ComplianceViolation[];
    recommendations: readonly string[];
  }>;

  /**
   * Generate HIPAA compliance report
   */
  generateHIPAAComplianceReport(
    startDate: string,
    endDate: string,
    includeViolations: boolean
  ): Promise<{
    reportId: string;
    period: { start: string; end: string };
    totalOperations: number;
    compliantOperations: number;
    violations: readonly ComplianceViolation[];
    recommendations: readonly string[];
  }>;

  /**
   * Handle compliance violation
   */
  handleComplianceViolation(violation: ComplianceViolation): Promise<{
    reported: boolean;
    immediateActions: readonly string[];
    notificationsSent: readonly string[];
  }>;

  /**
   * Verify audit trail integrity
   */
  verifyAuditTrailIntegrity(
    startDate: string,
    endDate: string
  ): Promise<{
    intact: boolean;
    missingEntries: number;
    corruptedEntries: number;
    verificationHash: string;
  }>;
}

/**
 * Subscription Compliance API
 */
export interface ISubscriptionComplianceAPI {
  /**
   * Validate subscription tier compliance for operation
   */
  validateSubscriptionCompliance(
    userId: string,
    operation: SyncOperation,
    subscriptionTier: SubscriptionTier
  ): Promise<SubscriptionComplianceValidation>;

  /**
   * Create payment compliance audit entry
   */
  createPaymentComplianceAudit(
    userId: string,
    paymentEvent: PaymentComplianceAudit['paymentEvent'],
    syncImpact: PaymentComplianceAudit['syncImpact']
  ): Promise<PaymentComplianceAudit>;

  /**
   * Monitor subscription compliance violations
   */
  monitorSubscriptionCompliance(): Promise<{
    violations: readonly ComplianceViolation[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    recommendations: readonly string[];
  }>;

  /**
   * Generate subscription compliance report
   */
  generateSubscriptionComplianceReport(
    subscriptionTier: SubscriptionTier,
    period: { start: string; end: string }
  ): Promise<{
    reportId: string;
    tier: SubscriptionTier;
    totalOperations: number;
    compliantOperations: number;
    tierViolations: number;
    paymentViolations: number;
    recommendations: readonly string[];
  }>;
}

/**
 * Crisis Safety Compliance API
 */
export interface ICrisisSafetyComplianceAPI {
  /**
   * Validate crisis safety compliance
   */
  validateCrisisSafetyCompliance(
    emergencyId: string,
    responseMetrics: CrisisSafetyCompliance['responseMetrics']
  ): Promise<CrisisSafetyCompliance>;

  /**
   * Monitor crisis response compliance
   */
  monitorCrisisResponseCompliance(): Promise<{
    activeCrises: number;
    averageResponseTime: number;
    slaCompliance: number;           // percentage
    violationsLast24h: number;
    criticalViolations: readonly ComplianceViolation[];
  }>;

  /**
   * Generate crisis safety compliance report
   */
  generateCrisisSafetyReport(
    period: { start: string; end: string }
  ): Promise<{
    reportId: string;
    totalCrisisEvents: number;
    averageResponseTime: number;
    slaCompliantEvents: number;
    violations: readonly ComplianceViolation[];
    improvements: readonly string[];
  }>;

  /**
   * Validate crisis override justification
   */
  validateCrisisOverrideJustification(
    override: CrisisPaymentOverride,
    context: string
  ): Promise<{
    justified: boolean;
    reason: string;
    auditRequired: boolean;
    followUpActions: readonly string[];
  }>;
}

/**
 * Data Retention Compliance API
 */
export interface IDataRetentionComplianceAPI {
  /**
   * Apply data retention policy
   */
  applyDataRetentionPolicy(
    entityId: string,
    entityType: SyncEntityType,
    dataClassification: DataClassification
  ): Promise<{
    policyApplied: string;
    retentionPeriod: number;
    scheduledDeletion?: string;
    auditTrailCreated: boolean;
  }>;

  /**
   * Create data lifecycle audit entry
   */
  createDataLifecycleAudit(
    entityId: string,
    entityType: SyncEntityType,
    lifecycleEvent: DataLifecycleAudit['lifecycleEvent']
  ): Promise<DataLifecycleAudit>;

  /**
   * Monitor data retention compliance
   */
  monitorDataRetentionCompliance(): Promise<{
    itemsNearingExpiry: number;
    itemsOverdue: number;
    scheduledDeletions: number;
    violations: readonly ComplianceViolation[];
  }>;

  /**
   * Execute compliant data deletion
   */
  executeCompliantDataDeletion(
    entityIds: readonly string[],
    deletionMethod: DataRetentionPolicy['disposalMethod']['deletionMethod']
  ): Promise<{
    deletedCount: number;
    failedDeletions: readonly string[];
    verificationHashes: readonly string[];
    auditTrailUpdated: boolean;
  }>;
}

// ============================================================================
// UNIFIED COMPLIANCE API
// ============================================================================

/**
 * Main Payment-Aware Sync Compliance API
 */
export interface IPaymentAwareSyncComplianceAPI extends
  IHIPAAComplianceAPI,
  ISubscriptionComplianceAPI,
  ICrisisSafetyComplianceAPI,
  IDataRetentionComplianceAPI {

  /**
   * Initialize compliance monitoring
   */
  initializeCompliance(config: {
    hipaaEnabled: boolean;
    auditLogRetention: number;      // days
    realTimeMonitoring: boolean;
    alertThresholds: {
      crisisResponseTime: number;   // ms
      complianceViolationRate: number; // percentage
      auditFailureRate: number;     // percentage
    };
  }): Promise<void>;

  /**
   * Perform comprehensive compliance check
   */
  performComplianceCheck(
    operation: SyncOperation,
    userId: string,
    subscriptionTier: SubscriptionTier,
    crisisMode: boolean
  ): Promise<{
    overallCompliant: boolean;
    hipaaCompliant: boolean;
    subscriptionCompliant: boolean;
    crisisSafetyCompliant: boolean;
    dataRetentionCompliant: boolean;
    violations: readonly ComplianceViolation[];
    auditLogCreated: boolean;
  }>;

  /**
   * Generate comprehensive compliance dashboard
   */
  generateComplianceDashboard(period: { start: string; end: string }): Promise<{
    dashboardId: string;
    period: { start: string; end: string };
    overallComplianceScore: number;   // 0-100
    hipaaCompliance: {
      score: number;
      violations: number;
      auditTrailIntegrity: number;
    };
    subscriptionCompliance: {
      score: number;
      tierViolations: number;
      paymentViolations: number;
    };
    crisisSafetyCompliance: {
      score: number;
      averageResponseTime: number;
      slaCompliance: number;
    };
    dataRetentionCompliance: {
      score: number;
      retentionViolations: number;
      scheduledDeletions: number;
    };
    recommendations: readonly string[];
    criticalIssues: readonly ComplianceViolation[];
  }>;

  /**
   * Health check for compliance systems
   */
  complianceHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'critical';
    components: {
      hipaaAuditing: boolean;
      subscriptionValidation: boolean;
      crisisMonitoring: boolean;
      dataRetentionPolicies: boolean;
      auditTrailIntegrity: boolean;
    };
    lastComplianceCheck: string;
    nextScheduledCheck: string;
  }>;
}

/**
 * Compliance service configuration
 */
export interface PaymentAwareSyncComplianceConfig {
  readonly hipaa: {
    readonly enabled: boolean;
    readonly auditLogRetention: number;      // days
    readonly realTimeMonitoring: boolean;
    readonly encryptionRequired: boolean;
    readonly crossBorderRestrictions: boolean;
  };
  readonly subscription: {
    readonly tierValidationRequired: boolean;
    readonly paymentStatusChecking: boolean;
    readonly gracePeriodMonitoring: boolean;
    readonly violationAlerts: boolean;
  };
  readonly crisisSafety: {
    readonly responseTimeMonitoring: boolean;
    readonly maxResponseTime: number;        // ms
    readonly overrideJustificationRequired: boolean;
    readonly continuousMonitoring: boolean;
  };
  readonly dataRetention: {
    readonly policiesEnabled: boolean;
    readonly automatedDeletion: boolean;
    readonly verificationRequired: boolean;
    readonly auditTrailRequired: boolean;
  };
  readonly alerts: {
    readonly realTimeAlerts: boolean;
    readonly escalationEnabled: boolean;
    readonly notificationTargets: readonly string[];
    readonly severityThresholds: {
      readonly low: number;
      readonly medium: number;
      readonly high: number;
      readonly critical: number;
    };
  };
}

// Export default compliance configuration for FullMind
export const DEFAULT_COMPLIANCE_CONFIG: PaymentAwareSyncComplianceConfig = {
  hipaa: {
    enabled: true,
    auditLogRetention: 2555,                 // 7 years for HIPAA
    realTimeMonitoring: true,
    encryptionRequired: true,
    crossBorderRestrictions: true,
  },
  subscription: {
    tierValidationRequired: true,
    paymentStatusChecking: true,
    gracePeriodMonitoring: true,
    violationAlerts: true,
  },
  crisisSafety: {
    responseTimeMonitoring: true,
    maxResponseTime: 200,                    // 200ms requirement
    overrideJustificationRequired: true,
    continuousMonitoring: true,
  },
  dataRetention: {
    policiesEnabled: true,
    automatedDeletion: false,                // Manual approval for mental health data
    verificationRequired: true,
    auditTrailRequired: true,
  },
  alerts: {
    realTimeAlerts: true,
    escalationEnabled: true,
    notificationTargets: ['compliance-team', 'security-team', 'clinical-team'],
    severityThresholds: {
      low: 5,                                // 5% violation rate
      medium: 10,                            // 10% violation rate
      high: 15,                              // 15% violation rate
      critical: 20,                          // 20% violation rate
    },
  },
} as const;