/**
 * HIPAA-Compliant Audit & Compliance Types for FullMind MBCT App
 *
 * Comprehensive audit trail types ensuring:
 * - HIPAA compliance for healthcare data handling
 * - PCI DSS compliance for payment processing
 * - Crisis intervention audit trails
 * - Therapeutic session privacy protection
 * - Zero-knowledge audit patterns
 */

import { z } from 'zod';
import { CrisisLevel } from './crisis-safety-types';

/**
 * HIPAA Compliance Levels
 */
export const HIPAAComplianceLevelSchema = z.enum([
  'not_applicable',    // No PHI involved
  'basic',            // Basic PHI protection
  'standard',         // Standard HIPAA compliance
  'enhanced',         // Enhanced privacy protection
  'maximum',          // Maximum security for sensitive PHI
]);

export type HIPAAComplianceLevel = z.infer<typeof HIPAAComplianceLevelSchema>;

/**
 * Audit Event Categories
 */
export const AuditEventCategorySchema = z.enum([
  // System Events
  'system_access',
  'authentication',
  'authorization',
  'configuration_change',

  // Data Events
  'data_access',
  'data_modification',
  'data_transmission',
  'data_deletion',

  // Payment Events
  'payment_processing',
  'subscription_change',
  'billing_event',
  'fraud_detection',

  // Clinical Events
  'assessment_completion',
  'therapeutic_session',
  'crisis_intervention',
  'progress_tracking',

  // Security Events
  'security_violation',
  'encryption_operation',
  'key_management',
  'threat_detection',

  // Compliance Events
  'compliance_check',
  'audit_access',
  'privacy_policy_update',
  'consent_management',
]);

export type AuditEventCategory = z.infer<typeof AuditEventCategorySchema>;

/**
 * Data Classification for Audit Purposes
 */
export const DataClassificationSchema = z.object({
  level: z.enum([
    'public',           // Public information
    'internal',         // Internal use only
    'confidential',     // Confidential data
    'restricted',       // Restricted access required
    'phi',             // Protected Health Information
    'pii',             // Personally Identifiable Information
    'financial',       // Financial data
    'therapeutic',     // Therapeutic/clinical data
  ]),
  sensitivity: z.enum(['low', 'medium', 'high', 'critical']),
  hipaaProtected: z.boolean(),
  encryptionRequired: z.boolean(),
  auditRequired: z.boolean(),
  retentionPeriod: z.number(), // days
});

export type DataClassification = z.infer<typeof DataClassificationSchema>;

/**
 * Audit Trail Entry (HIPAA-Compliant)
 */
export const AuditTrailEntrySchema = z.object({
  // Entry Identification
  auditId: z.string(),
  timestamp: z.number(),
  sequenceNumber: z.number(),

  // Event Classification
  category: AuditEventCategorySchema,
  eventType: z.string(),
  severity: z.enum(['info', 'warning', 'error', 'critical', 'emergency']),

  // Subject Information (No PII)
  subject: z.object({
    type: z.enum(['user', 'system', 'service', 'admin', 'emergency_contact']),
    identifier: z.string(), // Hashed/anonymized identifier
    role: z.string().optional(),
    sessionId: z.string().optional(),
  }),

  // Resource Information (No PII)
  resource: z.object({
    type: z.string(),
    identifier: z.string(), // Hashed/anonymized identifier
    classification: DataClassificationSchema,
    location: z.string().optional(),
  }).optional(),

  // Action Details
  action: z.object({
    performed: z.string(),
    method: z.string().optional(),
    outcome: z.enum(['success', 'failure', 'partial', 'blocked', 'deferred']),
    details: z.record(z.string(), z.any()).optional(), // No PII allowed
  }),

  // Context Information
  context: z.object({
    crisisLevel: z.nativeEnum({
      none: 'none',
      watch: 'watch',
      low: 'low',
      medium: 'medium',
      high: 'high',
      critical: 'critical',
      emergency: 'emergency'
    } as const).optional(),
    therapeuticSession: z.boolean().optional(),
    emergencyProtocol: z.boolean().optional(),
    paymentRelated: z.boolean().optional(),
    complianceRequired: z.boolean().optional(),
  }),

  // Compliance Information
  compliance: z.object({
    hipaaLevel: HIPAAComplianceLevelSchema,
    pciDssRequired: z.boolean(),
    consentVerified: z.boolean(),
    dataMinimization: z.boolean(),
    encryptionApplied: z.boolean(),
    accessJustified: z.boolean(),
  }),

  // Technical Details (No Sensitive Data)
  technical: z.object({
    sourceIP: z.string().optional(),    // Hashed for privacy
    userAgent: z.string().optional(),   // Sanitized
    geolocation: z.string().optional(), // City/state only
    deviceType: z.string().optional(),
    appVersion: z.string().optional(),
    apiVersion: z.string().optional(),
  }).optional(),

  // Integrity Protection
  integrity: z.object({
    checksum: z.string(),
    previousEntryHash: z.string().optional(),
    signatureValid: z.boolean(),
    tamperDetected: z.boolean(),
  }),
});

export type AuditTrailEntry = z.infer<typeof AuditTrailEntrySchema>;

/**
 * Crisis Intervention Audit Trail
 */
export const CrisisInterventionAuditSchema = z.object({
  interventionId: z.string(),
  baseAudit: AuditTrailEntrySchema,

  crisisDetails: z.object({
    detectionTrigger: z.enum([
      'assessment_score',
      'emergency_button',
      'behavioral_pattern',
      'external_report',
      'system_algorithm',
      'manual_escalation'
    ]),
    severityLevel: z.nativeEnum({
      none: 'none',
      watch: 'watch',
      low: 'low',
      medium: 'medium',
      high: 'high',
      critical: 'critical',
      emergency: 'emergency'
    } as const),
    responseTime: z.number(), // milliseconds
    protocolsActivated: z.array(z.string()),
    resourcesProvided: z.array(z.string()),
  }),

  interventionOutcome: z.object({
    resolved: z.boolean(),
    escalated: z.boolean(),
    followUpRequired: z.boolean(),
    externalReferral: z.boolean(),
    therapeuticContinuity: z.boolean(),
  }),

  complianceNotes: z.object({
    consentObtained: z.boolean(),
    mandatoryReporting: z.boolean().optional(),
    documentationComplete: z.boolean(),
    supervisionNotified: z.boolean().optional(),
  }),
});

export type CrisisInterventionAudit = z.infer<typeof CrisisInterventionAuditSchema>;

/**
 * Payment Processing Audit Trail
 */
export const PaymentProcessingAuditSchema = z.object({
  transactionId: z.string(),
  baseAudit: AuditTrailEntrySchema,

  paymentDetails: z.object({
    action: z.enum([
      'payment_attempt',
      'payment_success',
      'payment_failure',
      'subscription_change',
      'refund_processing',
      'fraud_detection',
      'pci_validation'
    ]),
    amount: z.number().optional(), // Only for successful transactions
    currency: z.string().optional(),
    paymentMethod: z.string(), // Type only, no details
    processingTime: z.number(),
  }),

  securityValidation: z.object({
    pciCompliant: z.boolean(),
    fraudCheckPassed: z.boolean(),
    encryptionVerified: z.boolean(),
    tokenizationUsed: z.boolean(),
    sensitiveDataRedacted: z.boolean(),
  }),

  therapeuticImpact: z.object({
    accessAffected: z.boolean(),
    gracePeriodTriggered: z.boolean(),
    crisisProtectionActivated: z.boolean(),
    therapeuticContinuityMaintained: z.boolean(),
  }),
});

export type PaymentProcessingAudit = z.infer<typeof PaymentProcessingAuditSchema>;

/**
 * Therapeutic Session Audit Trail
 */
export const TherapeuticSessionAuditSchema = z.object({
  sessionId: z.string(),
  baseAudit: AuditTrailEntrySchema,

  sessionDetails: z.object({
    type: z.enum([
      'breathing_exercise',
      'body_scan',
      'mindful_movement',
      'meditation',
      'assessment',
      'check_in',
      'progress_review',
      'crisis_intervention'
    ]),
    duration: z.number(), // seconds
    completion: z.enum(['started', 'in_progress', 'completed', 'interrupted', 'abandoned']),
    qualityMetrics: z.object({
      engagementLevel: z.enum(['low', 'moderate', 'high']),
      technicalIssues: z.boolean(),
      userSatisfaction: z.enum(['unknown', 'poor', 'fair', 'good', 'excellent']).optional(),
    }),
  }),

  privacyProtection: z.object({
    dataMinimized: z.boolean(),
    consentVerified: z.boolean(),
    encryptionApplied: z.boolean(),
    noPersonalDataLogged: z.boolean(),
    hipaaCompliant: z.boolean(),
  }),

  clinicalSignificance: z.object({
    progressIndicators: z.boolean(),
    concerningPatterns: z.boolean(),
    interventionNeeded: z.boolean(),
    followUpRequired: z.boolean(),
  }),
});

export type TherapeuticSessionAudit = z.infer<typeof TherapeuticSessionAuditSchema>;

/**
 * Compliance Monitoring Dashboard
 */
export const ComplianceMonitoringDashboardSchema = z.object({
  timestamp: z.number(),
  periodStart: z.number(),
  periodEnd: z.number(),

  hipaaCompliance: z.object({
    overallScore: z.number().min(0).max(100),
    auditTrailIntegrity: z.number().min(0).max(100),
    dataProtectionScore: z.number().min(0).max(100),
    accessControlScore: z.number().min(0).max(100),
    encryptionScore: z.number().min(0).max(100),
    incidents: z.number(),
    breaches: z.number(),
  }),

  pciDssCompliance: z.object({
    overallScore: z.number().min(0).max(100),
    paymentSecurityScore: z.number().min(0).max(100),
    dataProtectionScore: z.number().min(0).max(100),
    networkSecurityScore: z.number().min(0).max(100),
    incidents: z.number(),
    violations: z.number(),
  }),

  crisisResponseCompliance: z.object({
    responseTimeCompliance: z.number().min(0).max(100),
    protocolAdherence: z.number().min(0).max(100),
    documentationCompleteness: z.number().min(0).max(100),
    escalationProtocolsFollowed: z.number().min(0).max(100),
    therapeuticContinuityMaintained: z.number().min(0).max(100),
  }),

  auditingEffectiveness: z.object({
    auditCoverage: z.number().min(0).max(100),
    auditTrailCompleteness: z.number().min(0).max(100),
    integrityVerification: z.number().min(0).max(100),
    retentionCompliance: z.number().min(0).max(100),
    accessibilityScore: z.number().min(0).max(100),
  }),
});

export type ComplianceMonitoringDashboard = z.infer<typeof ComplianceMonitoringDashboardSchema>;

/**
 * Audit Query Interface (HIPAA-Compliant)
 */
export const AuditQuerySchema = z.object({
  queryId: z.string(),
  requestedBy: z.string(), // Authorized personnel only
  timestamp: z.number(),

  searchCriteria: z.object({
    timeRange: z.object({
      start: z.number(),
      end: z.number(),
    }),
    categories: z.array(AuditEventCategorySchema).optional(),
    severity: z.array(z.enum(['info', 'warning', 'error', 'critical', 'emergency'])).optional(),
    subjectType: z.array(z.enum(['user', 'system', 'service', 'admin'])).optional(),
    crisisRelated: z.boolean().optional(),
    therapeuticSessions: z.boolean().optional(),
    paymentRelated: z.boolean().optional(),
  }),

  accessJustification: z.object({
    purpose: z.enum([
      'routine_audit',
      'compliance_check',
      'security_investigation',
      'performance_analysis',
      'crisis_review',
      'legal_requirement',
      'regulatory_request'
    ]),
    legalBasis: z.string(),
    approvalRequired: z.boolean(),
    approvedBy: z.string().optional(),
  }),

  privacyConstraints: z.object({
    dataMinimization: z.boolean().default(true),
    aggregatedDataOnly: z.boolean().default(false),
    noPersonalData: z.boolean().default(true),
    retentionLimit: z.number().optional(), // days
    accessExpiration: z.number().optional(), // timestamp
  }),
});

export type AuditQuery = z.infer<typeof AuditQuerySchema>;

/**
 * Audit Configuration
 */
export interface AuditConfiguration {
  enabled: boolean;
  realTimeAuditing: boolean;
  hipaaCompliance: boolean;
  pciDssCompliance: boolean;
  crisisEventAuditing: boolean;
  therapeuticSessionAuditing: boolean;
  paymentAuditing: boolean;

  retention: {
    standardEvents: number;      // days
    crisisEvents: number;        // days
    paymentEvents: number;       // days
    therapeuticEvents: number;   // days
    complianceEvents: number;    // days
  };

  integrity: {
    checksumValidation: boolean;
    hashChaining: boolean;
    digitalSignatures: boolean;
    tamperDetection: boolean;
  };

  privacy: {
    dataMinimization: boolean;
    anonymization: boolean;
    encryption: boolean;
    accessControl: boolean;
  };

  monitoring: {
    realTimeAlerts: boolean;
    complianceDashboard: boolean;
    automaticReporting: boolean;
    anomalyDetection: boolean;
  };
}

/**
 * Default Audit Configuration
 */
export const DEFAULT_AUDIT_CONFIG: AuditConfiguration = {
  enabled: true,
  realTimeAuditing: true,
  hipaaCompliance: true,
  pciDssCompliance: true,
  crisisEventAuditing: true,
  therapeuticSessionAuditing: true,
  paymentAuditing: true,

  retention: {
    standardEvents: 90,      // 3 months
    crisisEvents: 2555,      // 7 years (regulatory requirement)
    paymentEvents: 2555,     // 7 years (regulatory requirement)
    therapeuticEvents: 2555, // 7 years (clinical requirement)
    complianceEvents: 2555,  // 7 years (regulatory requirement)
  },

  integrity: {
    checksumValidation: true,
    hashChaining: true,
    digitalSignatures: true,
    tamperDetection: true,
  },

  privacy: {
    dataMinimization: true,
    anonymization: true,
    encryption: true,
    accessControl: true,
  },

  monitoring: {
    realTimeAlerts: true,
    complianceDashboard: true,
    automaticReporting: true,
    anomalyDetection: true,
  },
};

/**
 * Audit Utility Functions
 */
export const classifyDataSensitivity = (dataType: string): DataClassification => {
  const classifications: Record<string, DataClassification> = {
    'assessment_score': {
      level: 'phi',
      sensitivity: 'critical',
      hipaaProtected: true,
      encryptionRequired: true,
      auditRequired: true,
      retentionPeriod: 2555, // 7 years
    },
    'payment_info': {
      level: 'financial',
      sensitivity: 'critical',
      hipaaProtected: false,
      encryptionRequired: true,
      auditRequired: true,
      retentionPeriod: 2555, // 7 years
    },
    'therapeutic_session': {
      level: 'therapeutic',
      sensitivity: 'high',
      hipaaProtected: true,
      encryptionRequired: true,
      auditRequired: true,
      retentionPeriod: 2555, // 7 years
    },
    'crisis_intervention': {
      level: 'phi',
      sensitivity: 'critical',
      hipaaProtected: true,
      encryptionRequired: true,
      auditRequired: true,
      retentionPeriod: 2555, // 7 years
    },
    'user_preferences': {
      level: 'confidential',
      sensitivity: 'medium',
      hipaaProtected: false,
      encryptionRequired: true,
      auditRequired: false,
      retentionPeriod: 365, // 1 year
    },
  };

  return classifications[dataType] || {
    level: 'internal',
    sensitivity: 'low',
    hipaaProtected: false,
    encryptionRequired: false,
    auditRequired: false,
    retentionPeriod: 90,
  };
};