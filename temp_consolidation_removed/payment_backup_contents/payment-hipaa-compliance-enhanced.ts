/**
 * Payment HIPAA Compliance Enhancement Types - Financial + Mental Health Data Intersection
 *
 * Comprehensive type safety for HIPAA compliance at the intersection of financial
 * and mental health data, ensuring secure handling of payment information combined
 * with therapeutic data while maintaining regulatory compliance.
 *
 * CRITICAL: All payment + mental health data intersections require enhanced
 * HIPAA compliance with strict separation and audit trails.
 */

import type { z } from 'zod';

import type {
  DataSensitivity,
  HIPAACompliance,
  CrisisSeverity,
  RiskLevel,
  EncryptedData
} from './core';

import type {
  PaymentDataSensitivity,
  PaymentCrisisSafetyLevel
} from './payment-pressable-enhanced';

import type {
  PaymentAnxietySeverity,
  FinancialStressIndicators,
  PaymentAnxietyEvent
} from './payment-crisis-detection-enhanced';

import type {
  ValidatedCrisisResponse,
  ClinicalTypeValidationError
} from './clinical-type-safety';

// === HIPAA DATA CLASSIFICATION ===

/**
 * Enhanced Data Sensitivity for Payment + Mental Health Intersection
 * Specialized classification for combined financial and therapeutic data
 */
export type PaymentHIPAADataClassification =
  | 'public_financial'           // Public pricing, plan information
  | 'financial_pci'             // Payment methods, billing (PCI DSS only)
  | 'therapeutic_financial'     // Payment anxiety, financial stress data
  | 'clinical_financial'        // Crisis events triggered by payment issues
  | 'emergency_financial'       // Emergency bypass data, crisis payment overrides
  | 'protected_health_payment'; // Combined PHI + financial data requiring max protection

/**
 * HIPAA Compliance Level for Payment Data
 * Graduated compliance requirements based on data sensitivity
 */
export type PaymentHIPAAComplianceLevel =
  | 'basic'        // Standard encryption, basic audit trail
  | 'enhanced'     // Enhanced encryption, detailed audit trail
  | 'clinical'     // Clinical-grade protection, full audit trail
  | 'emergency'    // Emergency protocols, real-time monitoring
  | 'maximum';     // Maximum protection for combined PHI + financial

/**
 * Data Handling Permissions for Payment + Mental Health
 * Granular permissions for different types of payment-related health data
 */
export interface PaymentHIPAADataPermissions {
  readonly canViewFinancialData: boolean;
  readonly canViewAnxietyData: boolean;
  readonly canViewCrisisData: boolean;
  readonly canViewCombinedData: boolean;
  readonly canProcessPayments: boolean;
  readonly canAccessEmergencyOverride: boolean;
  readonly canViewAuditTrail: boolean;
  readonly canExportData: boolean;

  readonly restrictions: {
    readonly timeBasedAccess: boolean;
    readonly purposeLimitation: boolean;
    readonly minimumNecessary: boolean;
    readonly supervisorApprovalRequired: boolean;
  };

  readonly auditRequirements: {
    readonly logAllAccess: boolean;
    readonly logDataCombination: boolean;
    readonly logExports: boolean;
    readonly realTimeMonitoring: boolean;
  };
}

// === PROTECTED HEALTH INFORMATION TYPES ===

/**
 * Payment-Related Protected Health Information (PHI)
 * PHI that intersects with payment processing and financial data
 */
export interface PaymentRelatedPHI {
  readonly patientId: EncryptedData; // User ID encrypted
  readonly paymentAnxietyHistory: EncryptedData; // Anxiety episodes related to payment
  readonly financialStressIndicators: EncryptedData; // Financial stress measurements
  readonly crisisPaymentTriggers: EncryptedData; // Crisis events triggered by payment issues
  readonly therapeuticPaymentData: EncryptedData; // Therapeutic interventions during payment

  readonly metadata: {
    readonly dataClassification: PaymentHIPAADataClassification;
    readonly complianceLevel: PaymentHIPAAComplianceLevel;
    readonly encryptionStandard: 'AES-256' | 'ChaCha20-Poly1305';
    readonly createdAt: string; // ISO timestamp
    readonly lastAccessed: string; // ISO timestamp
    readonly accessCount: number;
  };

  readonly separation: {
    readonly financialDataSeparated: boolean;
    readonly phiDataSeparated: boolean;
    readonly combinationJustified: boolean;
    readonly minimumNecessaryMet: boolean;
  };
}

/**
 * Financial Information Combined with Mental Health Data
 * Structured approach to handling combined financial and mental health information
 */
export interface FinancialMentalHealthData {
  readonly dataId: string;
  readonly combinationType: 'anxiety_payment' | 'crisis_financial' | 'therapeutic_billing' | 'emergency_override';
  readonly justification: string; // Business justification for combining data

  readonly financialComponent: {
    readonly type: 'payment_method' | 'subscription' | 'billing' | 'transaction';
    readonly data: EncryptedData;
    readonly pciCompliant: boolean;
    readonly encryptionLevel: 'standard' | 'enhanced';
  };

  readonly mentalHealthComponent: {
    readonly type: 'anxiety_data' | 'crisis_event' | 'therapeutic_intervention' | 'assessment_score';
    readonly data: EncryptedData;
    readonly hipaaProtected: true;
    readonly clinicalRelevance: 'diagnostic' | 'therapeutic' | 'monitoring' | 'emergency';
  };

  readonly compliance: {
    readonly hipaaCompliant: boolean;
    readonly pciCompliant: boolean;
    readonly dataMinimization: boolean;
    readonly purposeLimitation: boolean;
    readonly consentObtained: boolean;
    readonly auditTrailComplete: boolean;
  };

  readonly access: {
    readonly accessLog: readonly PaymentHIPAAAuditEntry[];
    readonly lastReview: string; // ISO timestamp
    readonly retentionExpiry: string; // ISO timestamp
    readonly destructionScheduled: boolean;
  };
}

// === CONSENT AND AUTHORIZATION ===

/**
 * Enhanced Consent for Payment + Mental Health Data
 * Specialized consent framework for combined data processing
 */
export interface PaymentMentalHealthConsent {
  readonly consentId: string;
  readonly userId: string;
  readonly consentVersion: string;
  readonly consentDate: string; // ISO timestamp

  readonly paymentDataConsent: {
    readonly processPayments: boolean;
    readonly storePaymentMethods: boolean;
    readonly analyzeBillingPatterns: boolean;
    readonly shareWithProcessors: boolean;
  };

  readonly mentalHealthDataConsent: {
    readonly processTherapeuticData: boolean;
    readonly detectPaymentAnxiety: boolean;
    readonly provideInterventions: boolean;
    readonly emergencyOverride: boolean;
  };

  readonly combinedDataConsent: {
    readonly combineForAnxietyDetection: boolean;
    readonly combineForCrisisIntervention: boolean;
    readonly combineForTherapeuticPurposes: boolean;
    readonly combineForEmergencyResponse: boolean;
  };

  readonly limitations: {
    readonly dataRetentionPeriod: number; // days
    readonly purposeLimitations: readonly string[];
    readonly sharingRestrictions: readonly string[];
    readonly revocationRights: readonly string[];
  };

  readonly rights: {
    readonly accessRights: boolean;
    readonly correctionRights: boolean;
    readonly deletionRights: boolean;
    readonly portabilityRights: boolean;
    readonly restrictionRights: boolean;
  };
}

/**
 * Authorization for Emergency Payment Override
 * Special authorization for crisis situations requiring payment bypass
 */
export interface EmergencyPaymentOverrideAuthorization {
  readonly authorizationId: string;
  readonly userId: string;
  readonly crisisLevel: CrisisSeverity;
  readonly authorizationTimestamp: string;

  readonly emergencyContext: {
    readonly crisisType: 'suicidal_ideation' | 'severe_anxiety' | 'panic_disorder' | 'financial_crisis';
    readonly severityLevel: PaymentAnxietySeverity;
    readonly immediateRisk: boolean;
    readonly therapeuticNecessity: string;
  };

  readonly overrideDetails: {
    readonly overrideType: 'full_access' | 'therapeutic_features' | 'crisis_tools' | 'emergency_contacts';
    readonly duration: number; // hours
    readonly expirationTime: string; // ISO timestamp
    readonly autoRenewal: boolean;
  };

  readonly compliance: {
    readonly emergencyJustification: string;
    readonly clinicalSupervision: boolean;
    readonly documentationComplete: boolean;
    readonly reviewRequired: boolean;
    readonly auditFlagged: boolean;
  };

  readonly safeguards: {
    readonly minimumNecessary: boolean;
    readonly temporaryAccess: boolean;
    readonly monitoringActive: boolean;
    readonly reviewScheduled: string; // ISO timestamp
  };
}

// === AUDIT AND MONITORING ===

/**
 * HIPAA Audit Entry for Payment + Mental Health Data
 * Comprehensive audit logging for combined data access and processing
 */
export interface PaymentHIPAAAuditEntry {
  readonly auditId: string;
  readonly timestamp: string; // ISO timestamp
  readonly userId: string;
  readonly sessionId: string;
  readonly accessorId: string; // Who accessed the data

  readonly dataAccessed: {
    readonly dataType: PaymentHIPAADataClassification;
    readonly dataElements: readonly string[];
    readonly combinedData: boolean;
    readonly financialData: boolean;
    readonly mentalHealthData: boolean;
  };

  readonly accessContext: {
    readonly purpose: string;
    readonly justification: string;
    readonly emergencyAccess: boolean;
    readonly crisisOverride: boolean;
    readonly therapeuticNecessity: boolean;
  };

  readonly actions: {
    readonly actionType: 'view' | 'edit' | 'combine' | 'export' | 'delete' | 'emergency_override';
    readonly actionDescription: string;
    readonly dataModified: boolean;
    readonly consentVerified: boolean;
  };

  readonly compliance: {
    readonly hipaaCompliant: boolean;
    readonly pciCompliant: boolean;
    readonly consentValid: boolean;
    readonly authorizationValid: boolean;
    readonly minimumNecessary: boolean;
  };

  readonly performance: {
    readonly responseTime: number; // milliseconds
    readonly encryptionTime: number;
    readonly auditLogTime: number;
    readonly complianceCheckTime: number;
  };

  readonly flags: {
    readonly suspiciousActivity: boolean;
    readonly unauthorizedAccess: boolean;
    readonly complianceViolation: boolean;
    readonly emergencyOverride: boolean;
    readonly requiresReview: boolean;
  };
}

/**
 * Real-Time HIPAA Compliance Monitoring
 * Continuous monitoring of compliance for payment + mental health data
 */
export interface PaymentHIPAAComplianceMonitor {
  readonly monitoringId: string;
  readonly isActive: boolean;
  readonly lastCheck: string; // ISO timestamp

  readonly complianceStatus: {
    readonly overallCompliant: boolean;
    readonly hipaaCompliant: boolean;
    readonly pciCompliant: boolean;
    readonly consentValid: boolean;
    readonly auditComplete: boolean;
  };

  readonly violations: readonly PaymentHIPAAViolation[];
  readonly warnings: readonly PaymentHIPAAWarning[];
  readonly recommendations: readonly PaymentHIPAARecommendation[];

  readonly metrics: {
    readonly accessViolations: number;
    readonly consentViolations: number;
    readonly encryptionFailures: number;
    readonly auditGaps: number;
    readonly emergencyOverrides: number;
  };

  readonly alerting: {
    readonly realTimeAlerts: boolean;
    readonly alertThreshold: number;
    readonly escalationEnabled: boolean;
    readonly supervisorNotification: boolean;
  };
}

/**
 * HIPAA Compliance Violation
 * Structured reporting of compliance violations
 */
export interface PaymentHIPAAViolation {
  readonly violationId: string;
  readonly timestamp: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly violationType: PaymentHIPAAViolationType;

  readonly description: string;
  readonly affectedData: PaymentHIPAADataClassification;
  readonly potentialImpact: string;
  readonly immediateAction: string;

  readonly context: {
    readonly userId: string;
    readonly sessionId: string;
    readonly actionAttempted: string;
    readonly dataInvolved: readonly string[];
  };

  readonly resolution: {
    readonly resolved: boolean;
    readonly resolutionTime: string; // ISO timestamp
    readonly resolutionAction: string;
    readonly preventiveMeasures: readonly string[];
  };
}

/**
 * HIPAA Violation Types for Payment + Mental Health Data
 */
export type PaymentHIPAAViolationType =
  | 'unauthorized_access'
  | 'insufficient_consent'
  | 'encryption_failure'
  | 'audit_gap'
  | 'data_minimization_violation'
  | 'purpose_limitation_violation'
  | 'retention_violation'
  | 'sharing_violation'
  | 'emergency_override_abuse';

/**
 * HIPAA Warning
 * Early warning system for potential compliance issues
 */
export interface PaymentHIPAAWarning {
  readonly warningId: string;
  readonly timestamp: string;
  readonly warningType: 'consent_expiring' | 'retention_approaching' | 'access_pattern_unusual' | 'encryption_weak';
  readonly description: string;
  readonly recommendedAction: string;
  readonly escalationTime: string; // When this becomes a violation
}

/**
 * HIPAA Compliance Recommendation
 * Proactive recommendations for maintaining compliance
 */
export interface PaymentHIPAARecommendation {
  readonly recommendationId: string;
  readonly category: 'security' | 'privacy' | 'access_control' | 'audit' | 'training';
  readonly priority: 'low' | 'medium' | 'high' | 'urgent';
  readonly description: string;
  readonly implementation: string;
  readonly timeline: string;
  readonly complianceBenefit: string;
}

// === VALIDATION SCHEMAS ===

export const PaymentHIPAADataClassificationSchema = z.enum([
  'public_financial',
  'financial_pci',
  'therapeutic_financial',
  'clinical_financial',
  'emergency_financial',
  'protected_health_payment'
]);

export const PaymentHIPAAComplianceLevelSchema = z.enum(['basic', 'enhanced', 'clinical', 'emergency', 'maximum']);

export const PaymentMentalHealthConsentSchema = z.object({
  consentId: z.string(),
  userId: z.string(),
  consentVersion: z.string(),
  consentDate: z.string(),
  paymentDataConsent: z.object({
    processPayments: z.boolean(),
    storePaymentMethods: z.boolean(),
    analyzeBillingPatterns: z.boolean(),
    shareWithProcessors: z.boolean()
  }),
  mentalHealthDataConsent: z.object({
    processTherapeuticData: z.boolean(),
    detectPaymentAnxiety: z.boolean(),
    provideInterventions: z.boolean(),
    emergencyOverride: z.boolean()
  }),
  combinedDataConsent: z.object({
    combineForAnxietyDetection: z.boolean(),
    combineForCrisisIntervention: z.boolean(),
    combineForTherapeuticPurposes: z.boolean(),
    combineForEmergencyResponse: z.boolean()
  })
});

export const PaymentHIPAAAuditEntrySchema = z.object({
  auditId: z.string(),
  timestamp: z.string(),
  userId: z.string(),
  sessionId: z.string(),
  accessorId: z.string(),
  dataAccessed: z.object({
    dataType: PaymentHIPAADataClassificationSchema,
    dataElements: z.array(z.string()),
    combinedData: z.boolean(),
    financialData: z.boolean(),
    mentalHealthData: z.boolean()
  }),
  compliance: z.object({
    hipaaCompliant: z.boolean(),
    pciCompliant: z.boolean(),
    consentValid: z.boolean(),
    authorizationValid: z.boolean(),
    minimumNecessary: z.boolean()
  })
});

// === TYPE GUARDS ===

export function isPaymentHIPAADataClassification(obj: unknown): obj is PaymentHIPAADataClassification {
  return PaymentHIPAADataClassificationSchema.safeParse(obj).success;
}

export function isPaymentMentalHealthConsent(obj: unknown): obj is PaymentMentalHealthConsent {
  return PaymentMentalHealthConsentSchema.safeParse(obj).success;
}

export function isPaymentHIPAAAuditEntry(obj: unknown): obj is PaymentHIPAAAuditEntry {
  return PaymentHIPAAAuditEntrySchema.safeParse(obj).success;
}

/**
 * Validate HIPAA compliance for combined payment + mental health data
 */
export function validatePaymentMentalHealthHIPAACompliance(
  data: FinancialMentalHealthData,
  consent: PaymentMentalHealthConsent,
  permissions: PaymentHIPAADataPermissions
): boolean {
  // Check basic compliance requirements
  const basicCompliance = data.compliance.hipaaCompliant &&
                         data.compliance.pciCompliant &&
                         data.compliance.consentObtained;

  // Check consent coverage
  const consentValid = consent.combinedDataConsent.combineForAnxietyDetection ||
                      consent.combinedDataConsent.combineForCrisisIntervention ||
                      consent.combinedDataConsent.combineForTherapeuticPurposes;

  // Check data minimization
  const dataMinimized = data.compliance.dataMinimization &&
                       data.compliance.purposeLimitation;

  // Check permissions
  const permissionsValid = permissions.canViewCombinedData &&
                          permissions.auditRequirements.logDataCombination;

  return basicCompliance && consentValid && dataMinimized && permissionsValid;
}

/**
 * Validate emergency override authorization
 */
export function validateEmergencyOverrideAuthorization(
  authorization: EmergencyPaymentOverrideAuthorization,
  crisisLevel: CrisisSeverity
): boolean {
  // Check crisis severity justifies override
  const severityJustified = crisisLevel === 'severe' || crisisLevel === 'critical';

  // Check authorization is current
  const currentTime = new Date().getTime();
  const expirationTime = new Date(authorization.overrideDetails.expirationTime).getTime();
  const notExpired = currentTime < expirationTime;

  // Check compliance requirements
  const complianceValid = authorization.compliance.emergencyJustification &&
                         authorization.compliance.documentationComplete &&
                         authorization.safeguards.minimumNecessary;

  return severityJustified && notExpired && complianceValid;
}

// === FACTORY FUNCTIONS ===

/**
 * Create HIPAA-compliant payment + mental health data container
 */
export function createFinancialMentalHealthData(config: {
  readonly combinationType: 'anxiety_payment' | 'crisis_financial' | 'therapeutic_billing' | 'emergency_override';
  readonly financialData: EncryptedData;
  readonly mentalHealthData: EncryptedData;
  readonly justification: string;
}): FinancialMentalHealthData {
  return {
    dataId: `fmh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    combinationType: config.combinationType,
    justification: config.justification,
    financialComponent: {
      type: 'payment_method',
      data: config.financialData,
      pciCompliant: true,
      encryptionLevel: 'enhanced'
    },
    mentalHealthComponent: {
      type: 'anxiety_data',
      data: config.mentalHealthData,
      hipaaProtected: true,
      clinicalRelevance: 'therapeutic'
    },
    compliance: {
      hipaaCompliant: true,
      pciCompliant: true,
      dataMinimization: true,
      purposeLimitation: true,
      consentObtained: true,
      auditTrailComplete: true
    },
    access: {
      accessLog: [],
      lastReview: new Date().toISOString(),
      retentionExpiry: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 7 years
      destructionScheduled: false
    }
  };
}

/**
 * Create emergency payment override authorization
 */
export function createEmergencyPaymentOverrideAuthorization(config: {
  readonly userId: string;
  readonly crisisType: 'suicidal_ideation' | 'severe_anxiety' | 'panic_disorder' | 'financial_crisis';
  readonly overrideType: 'full_access' | 'therapeutic_features' | 'crisis_tools' | 'emergency_contacts';
  readonly duration: number; // hours
}): EmergencyPaymentOverrideAuthorization {
  return {
    authorizationId: `epo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId: config.userId,
    crisisLevel: 'severe',
    authorizationTimestamp: new Date().toISOString(),
    emergencyContext: {
      crisisType: config.crisisType,
      severityLevel: 'crisis',
      immediateRisk: true,
      therapeuticNecessity: 'Emergency access required for crisis intervention and therapeutic continuity'
    },
    overrideDetails: {
      overrideType: config.overrideType,
      duration: config.duration,
      expirationTime: new Date(Date.now() + config.duration * 60 * 60 * 1000).toISOString(),
      autoRenewal: false
    },
    compliance: {
      emergencyJustification: `Crisis-level ${config.crisisType} requiring immediate therapeutic access`,
      clinicalSupervision: true,
      documentationComplete: true,
      reviewRequired: true,
      auditFlagged: true
    },
    safeguards: {
      minimumNecessary: true,
      temporaryAccess: true,
      monitoringActive: true,
      reviewScheduled: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    }
  };
}

// === CONSTANTS ===

export const PAYMENT_HIPAA_CONSTANTS = {
  ENCRYPTION: {
    FINANCIAL_MENTAL_HEALTH: 'AES-256-GCM',
    KEY_ROTATION_DAYS: 90,
    EMERGENCY_ENCRYPTION: 'ChaCha20-Poly1305',
  },
  RETENTION: {
    COMBINED_DATA_YEARS: 7,
    AUDIT_LOG_YEARS: 10,
    CONSENT_YEARS: 7,
    EMERGENCY_OVERRIDE_DAYS: 30,
  },
  AUDIT: {
    REAL_TIME_MONITORING: true,
    AUDIT_ALL_ACCESS: true,
    ALERT_THRESHOLD_MINUTES: 5,
    VIOLATION_ESCALATION_HOURS: 2,
  },
  COMPLIANCE: {
    MINIMUM_ENCRYPTION_BITS: 256,
    AUDIT_COMPLETENESS_REQUIRED: 100, // percent
    CONSENT_REFRESH_DAYS: 365,
    EMERGENCY_OVERRIDE_MAX_HOURS: 24,
  },
  PERFORMANCE: {
    COMPLIANCE_CHECK_MAX_MS: 100,
    ENCRYPTION_OVERHEAD_MAX_MS: 50,
    AUDIT_LOG_MAX_MS: 25,
    MONITORING_INTERVAL_MS: 1000,
  },
} as const;

export type {
  PaymentHIPAADataClassification,
  PaymentHIPAAComplianceLevel,
  PaymentHIPAADataPermissions,
  PaymentRelatedPHI,
  FinancialMentalHealthData,
  PaymentMentalHealthConsent,
  EmergencyPaymentOverrideAuthorization,
  PaymentHIPAAAuditEntry,
  PaymentHIPAAComplianceMonitor,
  PaymentHIPAAViolation,
  PaymentHIPAAViolationType,
  PaymentHIPAAWarning,
  PaymentHIPAARecommendation,
};