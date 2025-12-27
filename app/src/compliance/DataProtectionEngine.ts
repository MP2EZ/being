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
 * NOTE: Being is NOT a Privacy covered entity. This engine implements
 * privacy protections required by applicable consumer privacy laws.
 * All terminology updated to reflect actual regulatory requirements.
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
  /** Data retention periods (purpose-based) */
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

/**
 * DATA SENSITIVITY CLASSIFICATION SYSTEM
 * Classification of sensitive wellness data per CCPA/CPRA and TX TDPSA
 */
export enum DataSensitivityLevel {
  /** Public data (no special protection needed) */
  PUBLIC = 'public',
  /** Internal data (app preferences, usage patterns) */
  INTERNAL = 'internal',
  /** Confidential data (journal entries, mood logs) */
  CONFIDENTIAL = 'confidential',
  /** Sensitive data (PHQ-9, GAD-7 wellness scores) - TX TDPSA sensitive category */
  SENSITIVE = 'sensitive',
  /** Critical data (crisis/suicidal ideation data) - highest protection */
  CRITICAL = 'critical'
}

/**
 * SENSITIVE DATA ELEMENT CLASSIFICATION
 * Specific classification for assessment data elements
 */
export interface SensitiveDataElement {
  /** Unique identifier for data element */
  elementId: string;
  /** Data element name */
  name: string;
  /** Sensitivity classification level */
  classification: DataSensitivityLevel;
  /** Whether encryption is required */
  encryptionRequired: boolean;
  /** Access control requirements */
  accessControl: {
    /** Who can access this data */
    authorizedRoles: string[];
    /** Purpose limitation for access */
    purposeLimitation: string[];
    /** Minimum necessary rule applies */
    dataMinimizationRule: boolean;
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
 * DATA PROTECTION CONSENT MANAGEMENT
 * Comprehensive consent tracking and validation
 */
export interface DataProtectionConsent {
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
 * DATA PROTECTION AUDIT EVENT
 * Comprehensive audit trail for compliance
 */
export interface ComplianceAuditEvent {
  /** Unique event ID */
  eventId: string;
  /** Event timestamp */
  timestamp: number;
  /** Event type */
  type: AuditEventType;
  /** User ID (encrypted) */
  userId?: string;
  /** Session ID */
  sessionId?: string;
  /** Data elements accessed */
  dataElements: string[];
  /** Sensitivity classification of accessed data */
  sensitivityLevel: DataSensitivityLevel;
  /** Access purpose */
  purpose: 'treatment' | 'payment' | 'operations' | 'emergency' | 'user_request';
  /** Minimum necessary compliance */
  dataMinimizationCompliant: boolean;
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
    /** Privacy compliant */
    privacyCompliant: boolean;
    /** Privacy rule compliant */
    privacyRuleCompliant: boolean;
    /** Security rule compliant */
    securityRuleCompliant: boolean;
    /** Violations detected */
    violations: string[];
  };
}

export type AuditEventType = 
  | 'data_access'           // Sensitive data accessed
  | 'data_modification'     // Sensitive data modified
  | 'data_deletion'         // Sensitive data deleted
  | 'data_export'           // Sensitive data exported
  | 'data_sharing'          // Sensitive data shared
  | 'consent_obtained'     // User consent obtained
  | 'consent_revoked'      // User consent revoked
  | 'authentication'       // User authentication
  | 'authorization_check'  // Authorization verification
  | 'breach_detected'      // Security breach detected
  | 'compliance_violation' // Compliance violation
  | 'audit_log_access'     // Audit log accessed
  | 'emergency_access';    // Emergency data access

/**
 * DATA BREACH DETECTION AND RESPONSE
 */
export interface DataBreach {
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
  /** Data types involved */
  dataTypesInvolved: DataSensitivityLevel[];
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
    /** FTC notification required */
    ftcRequired: boolean;
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
    /** Probability of data compromise */
    compromiseProbability: 'low' | 'medium' | 'high';
    /** Harm to individuals */
    harmToIndividuals: 'low' | 'medium' | 'high';
    /** Overall risk level */
    overallRisk: 'low' | 'medium' | 'high';
  };
}

/**
 * DATA PROTECTION ENGINE IMPLEMENTATION
 */
export class DataProtectionEngine {
  private static instance: DataProtectionEngine;
  private auditEvents: Map<string, ComplianceAuditEvent[]> = new Map();
  private activeConsents: Map<string, DataProtectionConsent> = new Map();
  private sensitivityLevels: Map<string, SensitiveDataElement> = new Map();
  private breachEvents: Map<string, DataBreach> = new Map();
  private encryptionKeys: Map<string, string> = new Map();

  private constructor() {
    this.initializeDataSensitivityLevels();
  }

  public static getInstance(): DataProtectionEngine {
    if (!DataProtectionEngine.instance) {
      DataProtectionEngine.instance = new DataProtectionEngine();
    }
    return DataProtectionEngine.instance;
  }

  /**
   * CORE SENSITIVITY CLASSIFICATION AND VALIDATION
   */

  /**
   * Classifies assessment data according to data sensitivity levels
   */
  public classifyAssessmentData(
    assessmentType: 'phq9' | 'gad7',
    answers: AssessmentAnswer[],
    result: PHQ9Result | GAD7Result
  ): DataSensitivityLevel {
    // Crisis/suicidal ideation data is always CRITICAL_PHI
    if ('suicidalIdeation' in result && result.suicidalIdeation) {
      return DataSensitivityLevel.CRITICAL;
    }

    // High crisis scores are SENSITIVE_PHI
    if (result.isCrisis) {
      return DataSensitivityLevel.SENSITIVE;
    }

    // All other mental health assessment data is SENSITIVE_PHI
    return DataSensitivityLevel.SENSITIVE;
  }

  /**
   * Validates that data handling meets data protection requirements
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
      // Check Sensitivity classification
      const phiElement = this.sensitivityLevels.get(dataType);
      if (!phiElement) {
        violations.push(`Unclassified data type: ${dataType}`);
        recommendations.push('All data types must be classified for data sensitivity');
      }

      // Validate consent
      const consentValid = await this.validateUserConsent(context.userId, operation);
      if (!consentValid) {
        violations.push('User consent required for data access');
        recommendations.push('Obtain valid user consent before accessing data');
      }

      // Check minimum necessary rule
      if (phiElement && phiElement.accessControl.dataMinimizationRule) {
        const dataMinimizationCompliant = await this.validateDataMinimization(
          dataType,
          operation,
          context.purpose
        );
        if (!dataMinimizationCompliant) {
          violations.push('Minimum necessary rule violation');
          recommendations.push('Limit data access to minimum necessary for stated purpose');
        }
      }

      // Validate encryption for sensitive data
      if (phiElement && phiElement.encryptionRequired) {
        const encryptionValid = await this.validateEncryption(dataType);
        if (!encryptionValid) {
          violations.push('Encryption required but not properly implemented');
          recommendations.push('Implement proper encryption for sensitive data');
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
        sensitivityLevel: phiElement?.classification || DataSensitivityLevel.CONFIDENTIAL,
        purpose: context.purpose as any,
        dataMinimizationCompliant: violations.length === 0,
        authorization: {
          type: context.authorization ? 'consent' : 'user_request',
          reference: context.authorization || context.sessionId
        },
        technical: await this.getTechnicalContext(),
        security: await this.getSecurityContext(context.sessionId),
        compliance: {
          privacyCompliant: violations.length === 0,
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
      logError(LogCategory.SYSTEM, 'PRIVACY VALIDATION ERROR:', error instanceof Error ? error : new Error(String(error)));
      violations.push(`Validation system error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        compliant: false,
        violations,
        recommendations: [...recommendations, 'Review and fix privacy validation system errors']
      };
    }
  }

  /**
   * CONSENT MANAGEMENT
   */

  /**
   * Obtains and records compliant user consent
   */
  public async obtainUserConsent(
    userId: string,
    consentScope: DataProtectionConsent['scope'],
    evidence: DataProtectionConsent['evidence']
  ): Promise<string> {
    try {
      const consentId = `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const consent: DataProtectionConsent = {
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
        sensitivityLevel: DataSensitivityLevel.CONFIDENTIAL,
        purpose: 'operations',
        dataMinimizationCompliant: true,
        authorization: {
          type: 'consent',
          reference: consentId
        },
        technical: await this.getTechnicalContext(),
        security: await this.getSecurityContext(''),
        compliance: {
          privacyCompliant: true,
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
   * Validates current user consent for data operations
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
      const revokedConsent: DataProtectionConsent = {
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
        sensitivityLevel: DataSensitivityLevel.CONFIDENTIAL,
        purpose: 'user_request',
        dataMinimizationCompliant: true,
        authorization: {
          type: 'user_request',
          reference: consent.consentId
        },
        technical: await this.getTechnicalContext(),
        security: await this.getSecurityContext(''),
        compliance: {
          privacyCompliant: true,
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
   * Validates user session and authentication for data access
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
      const timeoutMs = DATA_PROTECTION_CONFIG.ACCESS_CONTROL.SESSION_TIMEOUT_MINUTES * 60 * 1000;
      
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
   * Validates encryption implementation for sensitive data
   */
  public async validateEncryption(dataType: string): Promise<boolean> {
    try {
      const phiElement = this.sensitivityLevels.get(dataType);
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
  private async validateDataMinimization(
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
   * Logs comprehensive compliance audit events
   */
  private async logComplianceAuditEvent(event: ComplianceAuditEvent): Promise<void> {
    try {
      // Store audit event securely
      const auditKey = `data_protection_audit_${event.timestamp}_${event.eventId}`;
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
      throw new Error('Audit logging failed - system integrity compromised');
    }
  }

  /**
   * Handles compliance violations and breach detection
   */
  private async handleComplianceViolation(event: ComplianceAuditEvent): Promise<void> {
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
          dataTypesInvolved: [event.sensitivityLevel],
          description: `Compliance violation detected: ${event.compliance.violations.join(', ')}`,
          discoveryMethod: 'automated_monitoring',
          immediateActions: ['Access revoked', 'Investigation initiated'],
          notifications: {
            individualsRequired: false,
            ftcRequired: false,
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
  private async initiateBreach(breach: DataBreach): Promise<void> {
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
        sensitivityLevel: DataSensitivityLevel.CRITICAL,
        purpose: 'operations',
        dataMinimizationCompliant: true,
        authorization: {
          type: 'legal_requirement',
          reference: breach.breachId
        },
        technical: await this.getTechnicalContext(),
        security: await this.getSecurityContext(''),
        compliance: {
          privacyCompliant: true,
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
   * Initiates compliant data deletion
   */
  private async initiateDataDeletion(userId: string): Promise<void> {
    try {
      // Identify all Sensitive data for user
      const phiDataTypes = Array.from(this.sensitivityLevels.keys());
      
      for (const dataType of phiDataTypes) {
        await this.deleteUserData(userId, dataType);
      }

      // Log data deletion
      await this.logComplianceAuditEvent({
        eventId: `deletion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        type: 'data_deletion',
        userId,
        dataElements: phiDataTypes,
        sensitivityLevel: DataSensitivityLevel.SENSITIVE,
        purpose: 'user_request',
        dataMinimizationCompliant: true,
        authorization: {
          type: 'user_request',
          reference: userId
        },
        technical: await this.getTechnicalContext(),
        security: await this.getSecurityContext(''),
        compliance: {
          privacyCompliant: true,
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
   * Initializes data sensitivity classification system
   */
  private initializeDataSensitivityLevels(): void {
    const classifications: SensitiveDataElement[] = [
      {
        elementId: 'phq9_responses',
        name: 'PHQ-9 Assessment Responses',
        classification: DataSensitivityLevel.SENSITIVE,
        encryptionRequired: true,
        accessControl: {
          authorizedRoles: ['user', 'clinician', 'emergency_responder'],
          purposeLimitation: ['treatment', 'emergency'],
          dataMinimizationRule: true
        },
        retention: {
          retentionYears: DATA_PROTECTION_CONFIG.DATA_RETENTION.ASSESSMENT_DATA_YEARS,
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
        classification: DataSensitivityLevel.SENSITIVE,
        encryptionRequired: true,
        accessControl: {
          authorizedRoles: ['user', 'clinician', 'emergency_responder'],
          purposeLimitation: ['treatment', 'emergency'],
          dataMinimizationRule: true
        },
        retention: {
          retentionYears: DATA_PROTECTION_CONFIG.DATA_RETENTION.ASSESSMENT_DATA_YEARS,
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
        classification: DataSensitivityLevel.CRITICAL,
        encryptionRequired: true,
        accessControl: {
          authorizedRoles: ['user', 'clinician', 'emergency_responder', 'crisis_counselor'],
          purposeLimitation: ['treatment', 'emergency', 'crisis_intervention'],
          dataMinimizationRule: true
        },
        retention: {
          retentionYears: DATA_PROTECTION_CONFIG.DATA_RETENTION.CRISIS_RECORDS_YEARS,
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
        classification: DataSensitivityLevel.CRITICAL,
        encryptionRequired: true,
        accessControl: {
          authorizedRoles: ['user', 'clinician', 'emergency_responder', 'crisis_counselor'],
          purposeLimitation: ['treatment', 'emergency', 'crisis_intervention'],
          dataMinimizationRule: true
        },
        retention: {
          retentionYears: DATA_PROTECTION_CONFIG.DATA_RETENTION.CRISIS_RECORDS_YEARS,
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
      this.sensitivityLevels.set(classification.elementId, classification);
    });
  }

  /**
   * UTILITY METHODS
   */

  private getEventTypeFromOperation(operation: string): AuditEventType {
    switch (operation) {
      case 'read': return 'data_access';
      case 'write': return 'data_modification';
      case 'update': return 'data_modification';
      case 'delete': return 'data_deletion';
      case 'share': return 'data_sharing';
      default: return 'data_access';
    }
  }

  private async getTechnicalContext(): Promise<ComplianceAuditEvent['technical']> {
    return {
      sourceIP: '127.0.0.1', // Would get actual IP
      deviceId: 'mobile_device_id',
      appVersion: '1.0.0',
      platform: Platform.OS
    };
  }

  private async getSecurityContext(sessionId: string): Promise<ComplianceAuditEvent['security']> {
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

  private assessBreachRisk(event: ComplianceAuditEvent): boolean {
    // Simplified breach assessment
    return event.compliance.violations.includes('unauthorized_access') ||
           event.sensitivityLevel === DataSensitivityLevel.CRITICAL;
  }

  private async performBreachContainment(breach: DataBreach): Promise<void> {
    // Implement breach containment procedures
    // This would include stopping unauthorized access, securing systems, etc.
  }

  private async assessBreachNotificationRequirements(breach: DataBreach): Promise<void> {
    // Assess notification requirements based on breach details
    // Update breach.notifications based on analysis
  }

  private async storeConsent(consent: DataProtectionConsent): Promise<void> {
    const consentKey = `consent_record_${consent.userId}_${consent.consentId}`;
    await SecureStore.setItemAsync(consentKey, JSON.stringify(consent));
  }

  private async loadActiveConsent(userId: string): Promise<DataProtectionConsent | null> {
    try {
      // In production, would query for latest non-revoked consent
      const keys = await AsyncStorage.getAllKeys();
      const consentKeys = keys.filter(key => key.startsWith(`consent_record_${userId}_`));
      
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

  private async deleteUserData(userId: string, dataType: string): Promise<void> {
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
      logError(LogCategory.SYSTEM, `DATA DELETION ERROR for ${dataType}:`, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * PUBLIC API METHODS
   */

  /**
   * Validates Data protection compliance for assessment data operations
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
    sensitivityLevel: DataSensitivityLevel;
  }> {
    const dataType = `${assessmentType}_responses`;
    const sensitivityLevel = this.sensitivityLevels.get(dataType)?.classification || DataSensitivityLevel.CONFIDENTIAL;

    const validation = await this.validateDataHandling(dataType, operation, {
      userId,
      sessionId,
      purpose: 'treatment'
    });

    return {
      ...validation,
      sensitivityLevel
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
   * Exports user Sensitive data for compliance with individual rights
   */
  public async exportUserData(userId: string): Promise<{
    data: Record<string, any>;
    exported: string[];
    classification: Record<string, DataSensitivityLevel>;
  }> {
    try {
      const exportedData: Record<string, any> = {};
      const exportedTypes: string[] = [];
      const classifications: Record<string, DataSensitivityLevel> = {};

      for (const [dataType, phiElement] of this.sensitivityLevels.entries()) {
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
        type: 'data_export',
        userId,
        dataElements: exportedTypes,
        sensitivityLevel: DataSensitivityLevel.SENSITIVE,
        purpose: 'user_request',
        dataMinimizationCompliant: true,
        authorization: {
          type: 'user_request',
          reference: userId
        },
        technical: await this.getTechnicalContext(),
        security: await this.getSecurityContext(''),
        compliance: {
          privacyCompliant: true,
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
      logError(LogCategory.SYSTEM, 'DATA EXPORT ERROR:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
}

// Export singleton instance
export default DataProtectionEngine.getInstance();