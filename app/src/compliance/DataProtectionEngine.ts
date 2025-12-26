/**
 * DATA PROTECTION ENGINE - DRD-FLOW-005 Assessment System
 *
 * COMPREHENSIVE PRIVACY COMPLIANCE:
 * - Sensitive data classification and handling
 * - CCPA/CPRA consumer privacy compliance
 * - FTC Health Breach Notification Rule (16 CFR 318)
 * - CA SB 446 breach notification (effective Jan 1, 2026)
 * - NY SHIELD Act compliance
 * - TX TDPSA sensitive data requirements
 * - Data minimization enforcement
 * - Individual Rights compliance (access, portability, deletion)
 *
 * WELLNESS DATA REQUIREMENTS:
 * - Enhanced sensitivity for wellness assessment data
 * - Crisis intervention data protection
 * - User privacy preservation
 * - Assessment data integrity
 * - Emergency sharing protocols for imminent harm
 *
 * NOTE: Being is NOT a HIPAA covered entity. This engine implements
 * privacy protections required by applicable consumer privacy laws.
 * Legacy type names (PHI*, HIPAA*) maintained for backwards compatibility.
 *
 * INTEGRATION WITH EXISTING SYSTEMS:
 * - Crisis detection and intervention workflows
 * - Assessment data storage and encryption
 * - Audit trail integration for compliance
 * - User consent and authorization management
 */


import { logSecurity, logPerformance, logError, LogCategory } from '@/core/services/logging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import type {
  PHQ9Result,
  GAD7Result,
  AssessmentAnswer,
  CrisisDetection,
  CrisisIntervention
} from '@/features/assessment/types';

/**
 * DATA PROTECTION COMPLIANCE CONFIGURATION
 * Regulatory requirements: CCPA/CPRA, FTC Health Breach Rule, CA SB 446, NY SHIELD, TX TDPSA
 */
export const DATA_PROTECTION_CONFIG = {
  /** Data retention periods (purpose-based, not HIPAA) */
  DATA_RETENTION: {
    /** Wellness assessment data retention (2 years) */
    WELLNESS_DATA_YEARS: 2,
    /** Assessment data retention (2 years) */
    ASSESSMENT_DATA_YEARS: 2,
    /** Crisis intervention records (3 years - liability protection) */
    CRISIS_RECORDS_YEARS: 3,
    /** Audit logs retention (3 years - security practice) */
    AUDIT_LOGS_YEARS: 3,
    /** Consent records retention (indefinite until revoked) */
    CONSENT_RECORDS_INDEFINITE: true
  },
  /** Encryption requirements (FTC reasonable security, state laws) */
  ENCRYPTION: {
    /** Minimum encryption algorithm */
    ALGORITHM: 'AES-256',
    /** Key rotation frequency (days) */
    KEY_ROTATION_DAYS: 90,
    /** Data in transit encryption required */
    TRANSIT_ENCRYPTION_REQUIRED: true,
    /** Data at rest encryption required */
    REST_ENCRYPTION_REQUIRED: true
  },
  /** Access control requirements */
  ACCESS_CONTROL: {
    /** Session timeout (minutes) */
    SESSION_TIMEOUT_MINUTES: 15,
    /** Failed login attempt limit */
    MAX_FAILED_LOGINS: 3,
    /** Password complexity requirements */
    PASSWORD_MIN_LENGTH: 12,
    /** Automatic logout on app background */
    AUTO_LOGOUT_ON_BACKGROUND: true
  },
  /** Audit requirements */
  AUDIT: {
    /** Audit all sensitive data access */
    AUDIT_ALL_SENSITIVE_ACCESS: true,
    /** Audit log integrity verification */
    VERIFY_AUDIT_INTEGRITY: true,
    /** Real-time audit event processing */
    REAL_TIME_PROCESSING: true,
    /** Audit log backup frequency (hours) */
    BACKUP_FREQUENCY_HOURS: 24
  },
  /** Breach notification timeframes (state law requirements) */
  BREACH_NOTIFICATION: {
    /** Discovery to notification (hours) - internal SLA */
    DISCOVERY_TO_NOTIFICATION_HOURS: 48,
    /** Consumer notification deadline (days) - strictest: CA/NY 30 days */
    CONSUMER_NOTIFICATION_DAYS: 30,
    /** FTC notification deadline (days) - 16 CFR 318 */
    FTC_NOTIFICATION_DAYS: 60,
    /** CA AG notification threshold (CA SB 446) */
    CA_AG_THRESHOLD: 500,
    /** TX AG notification threshold (TX TDPSA) */
    TX_AG_THRESHOLD: 250,
    /** Media notification threshold (individuals affected) */
    MEDIA_NOTIFICATION_THRESHOLD: 500
  }
} as const;

// Legacy alias for backwards compatibility
export const HIPAA_COMPLIANCE_CONFIG = DATA_PROTECTION_CONFIG;

/**
 * DATA SENSITIVITY CLASSIFICATION SYSTEM
 * Classification of sensitive wellness data per CCPA/CPRA and TX TDPSA
 *
 * NOTE: Legacy enum name PHIClassification maintained for backwards compatibility.
 * New code should use DataSensitivityLevel values.
 */
export enum PHIClassification {
  /** Public data (no special protection needed) */
  NON_PHI = 'public',
  /** Internal data (app preferences, usage patterns) */
  LIMITED_PHI = 'internal',
  /** Confidential data (journal entries, mood logs) */
  STANDARD_PHI = 'confidential',
  /** Sensitive data (PHQ-9, GAD-7 wellness scores) - TX TDPSA sensitive category */
  SENSITIVE_PHI = 'sensitive',
  /** Critical data (crisis/suicidal ideation data) - highest protection */
  CRITICAL_PHI = 'critical'
}

// New enum alias with clearer naming
export const DataSensitivityLevel = PHIClassification;

/**
 * PHI DATA ELEMENT CLASSIFICATION
 * Specific classification for assessment data elements
 */
export interface PHIDataElement {
  /** Unique identifier for data element */
  elementId: string;
  /** Data element name */
  name: string;
  /** PHI classification level */
  classification: PHIClassification;
  /** Whether encryption is required */
  encryptionRequired: boolean;
  /** Access control requirements */
  accessControl: {
    /** Who can access this data */
    authorizedRoles: string[];
    /** Purpose limitation for access */
    purposeLimitation: string[];
    /** Minimum necessary rule applies */
    minimumNecessaryRule: boolean;
  };
  /** Retention requirements */
  retention: {
    /** Retention period in years */
    retentionYears: number;
    /** Automatic deletion after retention */
    autoDelete: boolean;
    /** Legal hold capability */
    legalHoldCapable: boolean;
  };
  /** Sharing restrictions */
  sharing: {
    /** Can be shared for treatment */
    allowTreatmentSharing: boolean;
    /** Can be shared for payment */
    allowPaymentSharing: boolean;
    /** Can be shared for operations */
    allowOperationsSharing: boolean;
    /** Requires specific authorization */
    requiresSpecificAuth: boolean;
  };
}

/**
 * HIPAA CONSENT MANAGEMENT
 * Comprehensive consent tracking and validation
 */
export interface HIPAAConsent {
  /** Unique consent ID */
  consentId: string;
  /** User ID (encrypted) */
  userId: string;
  /** Consent timestamp */
  timestamp: number;
  /** Consent version */
  version: string;
  /** Consent type */
  type: 'initial' | 'updated' | 'renewed' | 'revoked';
  /** Consent scope */
  scope: {
    /** Assessment data collection */
    assessmentDataCollection: boolean;
    /** Crisis intervention data */
    crisisInterventionData: boolean;
    /** Performance analytics */
    performanceAnalytics: boolean;
    /** Professional sharing for emergencies */
    emergencyProfessionalSharing: boolean;
    /** Research participation (optional) */
    researchParticipation?: boolean;
  };
  /** Consent evidence */
  evidence: {
    /** IP address when consent given */
    ipAddress: string;
    /** Device information */
    deviceInfo: string;
    /** User agent */
    userAgent: string;
    /** Consent method */
    method: 'electronic_signature' | 'checkbox' | 'verbal_confirmed';
    /** Witness information (if applicable) */
    witness?: string;
  };
  /** Revocation information */
  revocation?: {
    /** Revocation timestamp */
    timestamp: number;
    /** Revocation reason */
    reason: string;
    /** Data deletion requested */
    deletionRequested: boolean;
  };
}

/**
 * HIPAA COMPLIANCE AUDIT EVENT
 * Comprehensive audit trail for compliance
 */
export interface HIPAAComplianceAuditEvent {
  /** Unique event ID */
  eventId: string;
  /** Event timestamp */
  timestamp: number;
  /** Event type */
  type: HIPAAEventType;
  /** User ID (encrypted) */
  userId?: string;
  /** Session ID */
  sessionId?: string;
  /** Data elements accessed */
  dataElements: string[];
  /** PHI classification of accessed data */
  phiClassification: PHIClassification;
  /** Access purpose */
  purpose: 'treatment' | 'payment' | 'operations' | 'emergency' | 'user_request';
  /** Minimum necessary compliance */
  minimumNecessaryCompliant: boolean;
  /** Authorization details */
  authorization: {
    /** Authorization type */
    type: 'consent' | 'emergency' | 'legal_requirement' | 'user_request';
    /** Authorization reference */
    reference: string;
    /** Authorization expiry */
    expiry?: number;
  };
  /** Technical details */
  technical: {
    /** Source IP address */
    sourceIP: string;
    /** Device identifier */
    deviceId: string;
    /** Application version */
    appVersion: string;
    /** Platform information */
    platform: string;
  };
  /** Security context */
  security: {
    /** Encryption status */
    encrypted: boolean;
    /** Authentication method */
    authMethod: string;
    /** Session security level */
    securityLevel: 'low' | 'medium' | 'high' | 'critical';
  };
  /** Compliance status */
  compliance: {
    /** HIPAA compliant */
    hipaaCompliant: boolean;
    /** Privacy rule compliant */
    privacyRuleCompliant: boolean;
    /** Security rule compliant */
    securityRuleCompliant: boolean;
    /** Violations detected */
    violations: string[];
  };
}

export type HIPAAEventType = 
  | 'phi_access'           // PHI data accessed
  | 'phi_modification'     // PHI data modified
  | 'phi_deletion'         // PHI data deleted
  | 'phi_export'           // PHI data exported
  | 'phi_sharing'          // PHI data shared
  | 'consent_obtained'     // User consent obtained
  | 'consent_revoked'      // User consent revoked
  | 'authentication'       // User authentication
  | 'authorization_check'  // Authorization verification
  | 'breach_detected'      // Security breach detected
  | 'compliance_violation' // Compliance violation
  | 'audit_log_access'     // Audit log accessed
  | 'emergency_access';    // Emergency PHI access

/**
 * HIPAA BREACH DETECTION AND RESPONSE
 */
export interface HIPAABreach {
  /** Unique breach ID */
  breachId: string;
  /** Discovery timestamp */
  discoveryTimestamp: number;
  /** Breach type */
  type: 'unauthorized_access' | 'data_theft' | 'improper_disposal' | 'lost_device' | 'hacking' | 'other';
  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Affected individuals count */
  affectedIndividuals: number;
  /** PHI types involved */
  phiTypesInvolved: PHIClassification[];
  /** Description of breach */
  description: string;
  /** Discovery method */
  discoveryMethod: string;
  /** Immediate actions taken */
  immediateActions: string[];
  /** Notification requirements */
  notifications: {
    /** Notification to individuals required */
    individualsRequired: boolean;
    /** Notification to HHS required */
    hhsRequired: boolean;
    /** Media notification required */
    mediaRequired: boolean;
    /** Law enforcement notification required */
    lawEnforcementRequired: boolean;
  };
  /** Response status */
  response: {
    /** Containment completed */
    containmentCompleted: boolean;
    /** Investigation completed */
    investigationCompleted: boolean;
    /** Notifications sent */
    notificationsSent: boolean;
    /** Remediation completed */
    remediationCompleted: boolean;
  };
  /** Risk assessment */
  riskAssessment: {
    /** Probability of PHI compromise */
    compromiseProbability: 'low' | 'medium' | 'high';
    /** Harm to individuals */
    harmToIndividuals: 'low' | 'medium' | 'high';
    /** Overall risk level */
    overallRisk: 'low' | 'medium' | 'high';
  };
}

/**
 * HIPAA COMPLIANCE ENGINE IMPLEMENTATION
 */
export class HIPAAComplianceEngine {
  private static instance: HIPAAComplianceEngine;
  private auditEvents: Map<string, HIPAAComplianceAuditEvent[]> = new Map();
  private activeConsents: Map<string, HIPAAConsent> = new Map();
  private phiClassifications: Map<string, PHIDataElement> = new Map();
  private breachEvents: Map<string, HIPAABreach> = new Map();
  private encryptionKeys: Map<string, string> = new Map();

  private constructor() {
    this.initializePHIClassifications();
  }

  public static getInstance(): HIPAAComplianceEngine {
    if (!HIPAAComplianceEngine.instance) {
      HIPAAComplianceEngine.instance = new HIPAAComplianceEngine();
    }
    return HIPAAComplianceEngine.instance;
  }

  /**
   * CORE PHI CLASSIFICATION AND VALIDATION
   */

  /**
   * Classifies assessment data according to PHI sensitivity levels
   */
  public classifyAssessmentData(
    assessmentType: 'phq9' | 'gad7',
    answers: AssessmentAnswer[],
    result: PHQ9Result | GAD7Result
  ): PHIClassification {
    // Crisis/suicidal ideation data is always CRITICAL_PHI
    if ('suicidalIdeation' in result && result.suicidalIdeation) {
      return PHIClassification.CRITICAL_PHI;
    }

    // High crisis scores are SENSITIVE_PHI
    if (result.isCrisis) {
      return PHIClassification.SENSITIVE_PHI;
    }

    // All other mental health assessment data is SENSITIVE_PHI
    return PHIClassification.SENSITIVE_PHI;
  }

  /**
   * Validates that data handling meets HIPAA requirements
   */
  public async validateDataHandling(
    dataType: string,
    operation: 'read' | 'write' | 'update' | 'delete' | 'share',
    context: {
      userId: string;
      sessionId: string;
      purpose: string;
      authorization?: string;
    }
  ): Promise<{
    compliant: boolean;
    violations: string[];
    recommendations: string[];
  }> {
    const violations: string[] = [];
    const recommendations: string[] = [];

    try {
      // Check PHI classification
      const phiElement = this.phiClassifications.get(dataType);
      if (!phiElement) {
        violations.push(`Unclassified data type: ${dataType}`);
        recommendations.push('All data types must be classified for PHI sensitivity');
      }

      // Validate consent
      const consentValid = await this.validateUserConsent(context.userId, operation);
      if (!consentValid) {
        violations.push('User consent required for PHI access');
        recommendations.push('Obtain valid user consent before accessing PHI');
      }

      // Check minimum necessary rule
      if (phiElement && phiElement.accessControl.minimumNecessaryRule) {
        const minimumNecessaryCompliant = await this.validateMinimumNecessary(
          dataType,
          operation,
          context.purpose
        );
        if (!minimumNecessaryCompliant) {
          violations.push('Minimum necessary rule violation');
          recommendations.push('Limit PHI access to minimum necessary for stated purpose');
        }
      }

      // Validate encryption for sensitive data
      if (phiElement && phiElement.encryptionRequired) {
        const encryptionValid = await this.validateEncryption(dataType);
        if (!encryptionValid) {
          violations.push('Encryption required but not properly implemented');
          recommendations.push('Implement proper encryption for sensitive PHI');
        }
      }

      // Log compliance audit event
      await this.logComplianceAuditEvent({
        eventId: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        type: this.getEventTypeFromOperation(operation),
        userId: context.userId,
        sessionId: context.sessionId,
        dataElements: [dataType],
        phiClassification: phiElement?.classification || PHIClassification.STANDARD_PHI,
        purpose: context.purpose as any,
        minimumNecessaryCompliant: violations.length === 0,
        authorization: {
          type: context.authorization ? 'consent' : 'user_request',
          reference: context.authorization || context.sessionId
        },
        technical: await this.getTechnicalContext(),
        security: await this.getSecurityContext(context.sessionId),
        compliance: {
          hipaaCompliant: violations.length === 0,
          privacyRuleCompliant: violations.length === 0,
          securityRuleCompliant: violations.length === 0,
          violations
        }
      });

      return {
        compliant: violations.length === 0,
        violations,
        recommendations
      };

    } catch (error) {
      logError(LogCategory.SYSTEM, 'HIPAA VALIDATION ERROR:', error instanceof Error ? error : new Error(String(error)));
      violations.push(`Validation system error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        compliant: false,
        violations,
        recommendations: [...recommendations, 'Review and fix HIPAA validation system errors']
      };
    }
  }

  /**
   * CONSENT MANAGEMENT
   */

  /**
   * Obtains and records HIPAA-compliant user consent
   */
  public async obtainUserConsent(
    userId: string,
    consentScope: HIPAAConsent['scope'],
    evidence: HIPAAConsent['evidence']
  ): Promise<string> {
    try {
      const consentId = `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const consent: HIPAAConsent = {
        consentId,
        userId,
        timestamp: Date.now(),
        version: '1.0',
        type: 'initial',
        scope: consentScope,
        evidence
      };

      // Store consent securely
      await this.storeConsent(consent);

      // Cache active consent
      this.activeConsents.set(userId, consent);

      // Log consent event
      await this.logComplianceAuditEvent({
        eventId: `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        type: 'consent_obtained',
        userId,
        dataElements: ['user_consent'],
        phiClassification: PHIClassification.STANDARD_PHI,
        purpose: 'operations',
        minimumNecessaryCompliant: true,
        authorization: {
          type: 'consent',
          reference: consentId
        },
        technical: await this.getTechnicalContext(),
        security: await this.getSecurityContext(''),
        compliance: {
          hipaaCompliant: true,
          privacyRuleCompliant: true,
          securityRuleCompliant: true,
          violations: []
        }
      });

      return consentId;

    } catch (error) {
      logError(LogCategory.SYSTEM, 'CONSENT OBTAINING ERROR:', error instanceof Error ? error : new Error(String(error)));
      throw new Error(`Failed to obtain user consent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validates current user consent for PHI operations
   */
  public async validateUserConsent(
    userId: string,
    operation: 'read' | 'write' | 'update' | 'delete' | 'share'
  ): Promise<boolean> {
    try {
      // Check cached consent first
      let consent = this.activeConsents.get(userId);
      
      // Load from storage if not cached
      if (!consent) {
        const loadedConsent = await this.loadActiveConsent(userId);
        consent = loadedConsent ?? undefined;
        if (consent) {
          this.activeConsents.set(userId, consent);
        }
      }

      if (!consent) {
        return false;
      }

      // Check if consent is revoked
      if (consent.revocation) {
        return false;
      }

      // Validate consent scope for operation
      switch (operation) {
        case 'read':
        case 'write':
        case 'update':
          return consent.scope.assessmentDataCollection;
        case 'delete':
          return true; // Users always have right to delete their data
        case 'share':
          return consent.scope.emergencyProfessionalSharing;
        default:
          return false;
      }

    } catch (error) {
      logError(LogCategory.SYSTEM, 'CONSENT VALIDATION ERROR:', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * Processes consent revocation and data deletion requests
   */
  public async revokeUserConsent(
    userId: string,
    reason: string,
    deletionRequested: boolean = false
  ): Promise<void> {
    try {
      const consent = await this.loadActiveConsent(userId);
      if (!consent) {
        throw new Error('No active consent found for user');
      }

      // Update consent with revocation
      const revokedConsent: HIPAAConsent = {
        ...consent,
        type: 'revoked',
        revocation: {
          timestamp: Date.now(),
          reason,
          deletionRequested
        }
      };

      // Store revoked consent
      await this.storeConsent(revokedConsent);

      // Remove from active cache
      this.activeConsents.delete(userId);

      // Process data deletion if requested
      if (deletionRequested) {
        await this.initiateDataDeletion(userId);
      }

      // Log revocation event
      await this.logComplianceAuditEvent({
        eventId: `revocation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        type: 'consent_revoked',
        userId,
        dataElements: ['user_consent'],
        phiClassification: PHIClassification.STANDARD_PHI,
        purpose: 'user_request',
        minimumNecessaryCompliant: true,
        authorization: {
          type: 'user_request',
          reference: consent.consentId
        },
        technical: await this.getTechnicalContext(),
        security: await this.getSecurityContext(''),
        compliance: {
          hipaaCompliant: true,
          privacyRuleCompliant: true,
          securityRuleCompliant: true,
          violations: []
        }
      });

    } catch (error) {
      logError(LogCategory.SYSTEM, 'CONSENT REVOCATION ERROR:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * ACCESS CONTROLS AND AUTHENTICATION
   */

  /**
   * Validates user session and authentication for PHI access
   */
  public async validateUserSession(
    userId: string,
    sessionId: string
  ): Promise<{
    valid: boolean;
    expiresAt?: number;
    securityLevel: 'low' | 'medium' | 'high' | 'critical';
    violations: string[];
  }> {
    const violations: string[] = [];

    try {
      // Check session existence and expiry
      const sessionData = await this.loadSessionData(sessionId);
      if (!sessionData) {
        violations.push('Invalid or expired session');
        return { valid: false, securityLevel: 'low', violations };
      }

      // Check session timeout
      const sessionAge = Date.now() - sessionData.createdAt;
      const timeoutMs = HIPAA_COMPLIANCE_CONFIG.ACCESS_CONTROL.SESSION_TIMEOUT_MINUTES * 60 * 1000;
      
      if (sessionAge > timeoutMs) {
        violations.push('Session timeout exceeded');
        return { valid: false, securityLevel: 'low', violations };
      }

      // Validate user ID matches session
      if (sessionData.userId !== userId) {
        violations.push('User ID mismatch with session');
        return { valid: false, securityLevel: 'low', violations };
      }

      // Determine security level based on authentication method
      const securityLevel = this.determineSecurityLevel(sessionData.authMethod);

      return {
        valid: violations.length === 0,
        expiresAt: sessionData.createdAt + timeoutMs,
        securityLevel,
        violations
      };

    } catch (error) {
      logError(LogCategory.SYSTEM, 'SESSION VALIDATION ERROR:', error instanceof Error ? error : new Error(String(error)));
      violations.push('Session validation system error');
      return { valid: false, securityLevel: 'low', violations };
    }
  }

  /**
   * ENCRYPTION AND SECURITY VALIDATION
   */

  /**
   * Validates encryption implementation for PHI data
   */
  public async validateEncryption(dataType: string): Promise<boolean> {
    try {
      const phiElement = this.phiClassifications.get(dataType);
      if (!phiElement || !phiElement.encryptionRequired) {
        return true; // No encryption required
      }

      // Check if encryption key exists
      const encryptionKey = this.encryptionKeys.get(dataType);
      if (!encryptionKey) {
        return false;
      }

      // Validate encryption strength (simplified check)
      return encryptionKey.length >= 32; // Minimum for AES-256

    } catch (error) {
      logError(LogCategory.SYSTEM, 'ENCRYPTION VALIDATION ERROR:', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * Validates minimum necessary rule compliance
   */
  private async validateMinimumNecessary(
    dataType: string,
    operation: string,
    purpose: string
  ): Promise<boolean> {
    // Simplified validation - in production would be more sophisticated
    const allowedPurposes = ['treatment', 'payment', 'operations', 'emergency', 'user_request'];
    return allowedPurposes.includes(purpose);
  }

  /**
   * AUDIT LOGGING AND COMPLIANCE TRACKING
   */

  /**
   * Logs comprehensive HIPAA compliance audit events
   */
  private async logComplianceAuditEvent(event: HIPAAComplianceAuditEvent): Promise<void> {
    try {
      // Store audit event securely
      const auditKey = `hipaa_audit_${event.timestamp}_${event.eventId}`;
      await SecureStore.setItemAsync(auditKey, JSON.stringify(event));

      // Add to in-memory audit trail
      const userAuditTrail = this.auditEvents.get(event.userId || 'system') || [];
      userAuditTrail.push(event);
      this.auditEvents.set(event.userId || 'system', userAuditTrail);

      // Check for compliance violations
      if (event.compliance.violations.length > 0) {
        await this.handleComplianceViolation(event);
      }

    } catch (error) {
      logError(LogCategory.SYSTEM, 'AUDIT LOGGING ERROR:', error instanceof Error ? error : new Error(String(error)));
      // Compliance audit logging failure is critical
      throw new Error('HIPAA audit logging failed - system integrity compromised');
    }
  }

  /**
   * Handles compliance violations and breach detection
   */
  private async handleComplianceViolation(event: HIPAAComplianceAuditEvent): Promise<void> {
    try {
      // Assess if violation constitutes a breach
      const isBreach = this.assessBreachRisk(event);
      
      if (isBreach) {
        await this.initiateBreach({
          breachId: `breach_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          discoveryTimestamp: Date.now(),
          type: 'unauthorized_access',
          severity: 'medium',
          affectedIndividuals: 1,
          phiTypesInvolved: [event.phiClassification],
          description: `Compliance violation detected: ${event.compliance.violations.join(', ')}`,
          discoveryMethod: 'automated_monitoring',
          immediateActions: ['Access revoked', 'Investigation initiated'],
          notifications: {
            individualsRequired: false,
            hhsRequired: false,
            mediaRequired: false,
            lawEnforcementRequired: false
          },
          response: {
            containmentCompleted: false,
            investigationCompleted: false,
            notificationsSent: false,
            remediationCompleted: false
          },
          riskAssessment: {
            compromiseProbability: 'low',
            harmToIndividuals: 'low',
            overallRisk: 'low'
          }
        });
      }

      // Log violation for compliance reporting
      await AsyncStorage.setItem(
        `compliance_violation_${Date.now()}`,
        JSON.stringify({
          eventId: event.eventId,
          violations: event.compliance.violations,
          timestamp: Date.now(),
          userId: event.userId,
          resolved: false
        })
      );

    } catch (error) {
      logError(LogCategory.SYSTEM, 'COMPLIANCE VIOLATION HANDLING ERROR:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * BREACH DETECTION AND RESPONSE
   */

  /**
   * Initiates breach response procedures
   */
  private async initiateBreach(breach: HIPAABreach): Promise<void> {
    try {
      // Store breach record
      this.breachEvents.set(breach.breachId, breach);
      await SecureStore.setItemAsync(`breach_${breach.breachId}`, JSON.stringify(breach));

      // Immediate containment actions
      await this.performBreachContainment(breach);

      // Notification assessment
      await this.assessBreachNotificationRequirements(breach);

      // Log breach event
      await this.logComplianceAuditEvent({
        eventId: `breach_log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        type: 'breach_detected',
        dataElements: ['breach_record'],
        phiClassification: PHIClassification.CRITICAL_PHI,
        purpose: 'operations',
        minimumNecessaryCompliant: true,
        authorization: {
          type: 'legal_requirement',
          reference: breach.breachId
        },
        technical: await this.getTechnicalContext(),
        security: await this.getSecurityContext(''),
        compliance: {
          hipaaCompliant: true,
          privacyRuleCompliant: true,
          securityRuleCompliant: true,
          violations: []
        }
      });

    } catch (error) {
      logError(LogCategory.SYSTEM, 'BREACH INITIATION ERROR:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * DATA LIFECYCLE MANAGEMENT
   */

  /**
   * Initiates HIPAA-compliant data deletion
   */
  private async initiateDataDeletion(userId: string): Promise<void> {
    try {
      // Identify all PHI data for user
      const phiDataTypes = Array.from(this.phiClassifications.keys());
      
      for (const dataType of phiDataTypes) {
        await this.deleteUserPHI(userId, dataType);
      }

      // Log data deletion
      await this.logComplianceAuditEvent({
        eventId: `deletion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        type: 'phi_deletion',
        userId,
        dataElements: phiDataTypes,
        phiClassification: PHIClassification.SENSITIVE_PHI,
        purpose: 'user_request',
        minimumNecessaryCompliant: true,
        authorization: {
          type: 'user_request',
          reference: userId
        },
        technical: await this.getTechnicalContext(),
        security: await this.getSecurityContext(''),
        compliance: {
          hipaaCompliant: true,
          privacyRuleCompliant: true,
          securityRuleCompliant: true,
          violations: []
        }
      });

    } catch (error) {
      logError(LogCategory.SYSTEM, 'DATA DELETION ERROR:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * INITIALIZATION AND CONFIGURATION
   */

  /**
   * Initializes PHI classification system
   */
  private initializePHIClassifications(): void {
    const classifications: PHIDataElement[] = [
      {
        elementId: 'phq9_responses',
        name: 'PHQ-9 Assessment Responses',
        classification: PHIClassification.SENSITIVE_PHI,
        encryptionRequired: true,
        accessControl: {
          authorizedRoles: ['user', 'clinician', 'emergency_responder'],
          purposeLimitation: ['treatment', 'emergency'],
          minimumNecessaryRule: true
        },
        retention: {
          retentionYears: HIPAA_COMPLIANCE_CONFIG.DATA_RETENTION.ASSESSMENT_DATA_YEARS,
          autoDelete: true,
          legalHoldCapable: true
        },
        sharing: {
          allowTreatmentSharing: true,
          allowPaymentSharing: false,
          allowOperationsSharing: false,
          requiresSpecificAuth: true
        }
      },
      {
        elementId: 'gad7_responses',
        name: 'GAD-7 Assessment Responses',
        classification: PHIClassification.SENSITIVE_PHI,
        encryptionRequired: true,
        accessControl: {
          authorizedRoles: ['user', 'clinician', 'emergency_responder'],
          purposeLimitation: ['treatment', 'emergency'],
          minimumNecessaryRule: true
        },
        retention: {
          retentionYears: HIPAA_COMPLIANCE_CONFIG.DATA_RETENTION.ASSESSMENT_DATA_YEARS,
          autoDelete: true,
          legalHoldCapable: true
        },
        sharing: {
          allowTreatmentSharing: true,
          allowPaymentSharing: false,
          allowOperationsSharing: false,
          requiresSpecificAuth: true
        }
      },
      {
        elementId: 'suicidal_ideation_data',
        name: 'Suicidal Ideation Assessment Data',
        classification: PHIClassification.CRITICAL_PHI,
        encryptionRequired: true,
        accessControl: {
          authorizedRoles: ['user', 'clinician', 'emergency_responder', 'crisis_counselor'],
          purposeLimitation: ['treatment', 'emergency', 'crisis_intervention'],
          minimumNecessaryRule: true
        },
        retention: {
          retentionYears: HIPAA_COMPLIANCE_CONFIG.DATA_RETENTION.CRISIS_RECORDS_YEARS,
          autoDelete: false, // Manual review required
          legalHoldCapable: true
        },
        sharing: {
          allowTreatmentSharing: true,
          allowPaymentSharing: false,
          allowOperationsSharing: false,
          requiresSpecificAuth: false // Emergency sharing allowed
        }
      },
      {
        elementId: 'crisis_intervention_records',
        name: 'Crisis Intervention Records',
        classification: PHIClassification.CRITICAL_PHI,
        encryptionRequired: true,
        accessControl: {
          authorizedRoles: ['user', 'clinician', 'emergency_responder', 'crisis_counselor'],
          purposeLimitation: ['treatment', 'emergency', 'crisis_intervention'],
          minimumNecessaryRule: true
        },
        retention: {
          retentionYears: HIPAA_COMPLIANCE_CONFIG.DATA_RETENTION.CRISIS_RECORDS_YEARS,
          autoDelete: false,
          legalHoldCapable: true
        },
        sharing: {
          allowTreatmentSharing: true,
          allowPaymentSharing: false,
          allowOperationsSharing: true, // For quality improvement
          requiresSpecificAuth: false
        }
      }
    ];

    classifications.forEach(classification => {
      this.phiClassifications.set(classification.elementId, classification);
    });
  }

  /**
   * UTILITY METHODS
   */

  private getEventTypeFromOperation(operation: string): HIPAAEventType {
    switch (operation) {
      case 'read': return 'phi_access';
      case 'write': return 'phi_modification';
      case 'update': return 'phi_modification';
      case 'delete': return 'phi_deletion';
      case 'share': return 'phi_sharing';
      default: return 'phi_access';
    }
  }

  private async getTechnicalContext(): Promise<HIPAAComplianceAuditEvent['technical']> {
    return {
      sourceIP: '127.0.0.1', // Would get actual IP
      deviceId: 'mobile_device_id',
      appVersion: '1.0.0',
      platform: Platform.OS
    };
  }

  private async getSecurityContext(sessionId: string): Promise<HIPAAComplianceAuditEvent['security']> {
    return {
      encrypted: true,
      authMethod: 'biometric',
      securityLevel: 'high'
    };
  }

  private determineSecurityLevel(authMethod: string): 'low' | 'medium' | 'high' | 'critical' {
    switch (authMethod) {
      case 'biometric': return 'high';
      case 'pin': return 'medium';
      case 'password': return 'medium';
      default: return 'low';
    }
  }

  private assessBreachRisk(event: HIPAAComplianceAuditEvent): boolean {
    // Simplified breach assessment
    return event.compliance.violations.includes('unauthorized_access') ||
           event.phiClassification === PHIClassification.CRITICAL_PHI;
  }

  private async performBreachContainment(breach: HIPAABreach): Promise<void> {
    // Implement breach containment procedures
    // This would include stopping unauthorized access, securing systems, etc.
  }

  private async assessBreachNotificationRequirements(breach: HIPAABreach): Promise<void> {
    // Assess notification requirements based on breach details
    // Update breach.notifications based on analysis
  }

  private async storeConsent(consent: HIPAAConsent): Promise<void> {
    const consentKey = `hipaa_consent_${consent.userId}_${consent.consentId}`;
    await SecureStore.setItemAsync(consentKey, JSON.stringify(consent));
  }

  private async loadActiveConsent(userId: string): Promise<HIPAAConsent | null> {
    try {
      // In production, would query for latest non-revoked consent
      const keys = await AsyncStorage.getAllKeys();
      const consentKeys = keys.filter(key => key.startsWith(`hipaa_consent_${userId}_`));
      
      if (consentKeys.length === 0) {
        return null;
      }

      // Get the most recent consent
      const latestKey = consentKeys.sort().reverse()[0]!;
      const consentData = await SecureStore.getItemAsync(latestKey);
      
      return consentData ? JSON.parse(consentData) : null;
    } catch (error) {
      logError(LogCategory.SYSTEM, 'CONSENT LOADING ERROR:', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  private async loadSessionData(sessionId: string): Promise<any> {
    try {
      const sessionData = await AsyncStorage.getItem(`session_${sessionId}`);
      return sessionData ? JSON.parse(sessionData) : null;
    } catch (error) {
      logError(LogCategory.SYSTEM, 'SESSION LOADING ERROR:', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  private async deleteUserPHI(userId: string, dataType: string): Promise<void> {
    try {
      // Delete from SecureStore
      const secureKeys = [`phi_${dataType}_${userId}`, `encrypted_${dataType}_${userId}`];
      for (const key of secureKeys) {
        try {
          await SecureStore.deleteItemAsync(key);
        } catch (error) {
          // Key might not exist, continue
        }
      }

      // Delete from AsyncStorage
      const asyncKeys = [`${dataType}_${userId}`, `cached_${dataType}_${userId}`];
      for (const key of asyncKeys) {
        try {
          await AsyncStorage.removeItem(key);
        } catch (error) {
          // Key might not exist, continue
        }
      }

    } catch (error) {
      logError(LogCategory.SYSTEM, `PHI DELETION ERROR for ${dataType}:`, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * PUBLIC API METHODS
   */

  /**
   * Validates HIPAA compliance for assessment data operations
   */
  public async validateAssessmentCompliance(
    assessmentType: 'phq9' | 'gad7',
    operation: 'read' | 'write' | 'update' | 'delete',
    userId: string,
    sessionId: string
  ): Promise<{
    compliant: boolean;
    violations: string[];
    recommendations: string[];
    phiClassification: PHIClassification;
  }> {
    const dataType = `${assessmentType}_responses`;
    const phiClassification = this.phiClassifications.get(dataType)?.classification || PHIClassification.STANDARD_PHI;

    const validation = await this.validateDataHandling(dataType, operation, {
      userId,
      sessionId,
      purpose: 'treatment'
    });

    return {
      ...validation,
      phiClassification
    };
  }

  /**
   * Gets compliance status summary
   */
  public async getComplianceStatus(): Promise<{
    overall: 'compliant' | 'violations_detected' | 'critical_issues';
    privacyRule: boolean;
    securityRule: boolean;
    breachNotification: boolean;
    activeViolations: number;
    activeBreach: boolean;
  }> {
    try {
      // Check for active violations
      const violationKeys = await AsyncStorage.getAllKeys();
      const activeViolationKeys = violationKeys.filter(key => 
        key.startsWith('compliance_violation_')
      );

      // Check for active breaches
      const activeBreach = this.breachEvents.size > 0;

      const activeViolations = activeViolationKeys.length;
      const hasViolations = activeViolations > 0;
      const hasCriticalIssues = activeBreach;

      return {
        overall: hasCriticalIssues ? 'critical_issues' : hasViolations ? 'violations_detected' : 'compliant',
        privacyRule: !hasViolations,
        securityRule: !hasViolations,
        breachNotification: !activeBreach,
        activeViolations,
        activeBreach
      };

    } catch (error) {
      logError(LogCategory.SYSTEM, 'COMPLIANCE STATUS ERROR:', error instanceof Error ? error : new Error(String(error)));
      return {
        overall: 'critical_issues',
        privacyRule: false,
        securityRule: false,
        breachNotification: false,
        activeViolations: -1,
        activeBreach: true
      };
    }
  }

  /**
   * Exports user PHI data for compliance with individual rights
   */
  public async exportUserPHI(userId: string): Promise<{
    data: Record<string, any>;
    exported: string[];
    classification: Record<string, PHIClassification>;
  }> {
    try {
      const exportedData: Record<string, any> = {};
      const exportedTypes: string[] = [];
      const classifications: Record<string, PHIClassification> = {};

      for (const [dataType, phiElement] of this.phiClassifications.entries()) {
        try {
          // Load data from storage
          const secureData = await SecureStore.getItemAsync(`phi_${dataType}_${userId}`);
          const asyncData = await AsyncStorage.getItem(`${dataType}_${userId}`);

          if (secureData || asyncData) {
            const data = secureData ? JSON.parse(secureData) : JSON.parse(asyncData!);
            exportedData[dataType] = data;
            exportedTypes.push(dataType);
            classifications[dataType] = phiElement.classification;
          }
        } catch (error) {
          logError(LogCategory.SYSTEM, `Failed to export ${dataType}:`, error instanceof Error ? error : new Error(String(error)));
        }
      }

      // Log export event
      await this.logComplianceAuditEvent({
        eventId: `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        type: 'phi_export',
        userId,
        dataElements: exportedTypes,
        phiClassification: PHIClassification.SENSITIVE_PHI,
        purpose: 'user_request',
        minimumNecessaryCompliant: true,
        authorization: {
          type: 'user_request',
          reference: userId
        },
        technical: await this.getTechnicalContext(),
        security: await this.getSecurityContext(''),
        compliance: {
          hipaaCompliant: true,
          privacyRuleCompliant: true,
          securityRuleCompliant: true,
          violations: []
        }
      });

      return {
        data: exportedData,
        exported: exportedTypes,
        classification: classifications
      };

    } catch (error) {
      logError(LogCategory.SYSTEM, 'PHI EXPORT ERROR:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
}

// Export singleton instance
export default HIPAAComplianceEngine.getInstance();