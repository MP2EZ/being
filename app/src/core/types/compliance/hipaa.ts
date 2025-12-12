/**
 * HIPAA Compliance Types - Enhanced Privacy Protection
 * Comprehensive type definitions for HIPAA-compliant data handling
 * 
 * REGULATORY REQUIREMENTS:
 * - PHI (Protected Health Information) encryption at rest and in transit
 * - Audit logging for all PHI access and modifications
 * - User consent management with granular permissions
 * - Data retention and deletion policies
 * - Access control and authorization tracking
 * - Breach notification and incident response
 * 
 * PERFORMANCE CONSTRAINTS:
 * - Encryption/decryption: <50ms for clinical data
 * - Audit log writes: <10ms (non-blocking)
 * - Consent validation: <5ms
 * - PHI access control: <20ms
 */

/**
 * Protected Health Information (PHI) Classification
 */
export type PHIClassification =
  | 'assessment_scores'     // PHQ-9/GAD-7 scores and responses
  | 'crisis_data'           // Crisis detection and intervention records
  | 'personal_identifiers'  // Name, DOB, contact information
  | 'biometric_data'        // Health metrics, vitals
  | 'behavioral_data'       // App usage patterns, engagement metrics
  | 'communication_data'    // Messages, chat logs, support interactions
  | 'location_data'         // GPS coordinates for crisis services
  | 'device_identifiers'    // Device IDs, tokens, session data
  | 'treatment_records'     // Therapy notes, clinical observations
  | 'emergency_contacts'    // Crisis support contact information
  | 'therapeutic_preference'; // User preferences for therapeutic modalities, mindfulness practices

/**
 * HIPAA Consent Types
 */
export type HIPAAConsentType = 
  | 'data_collection'       // Basic data collection consent
  | 'data_processing'       // Data analysis and processing
  | 'data_sharing'          // Sharing with healthcare providers
  | 'research_participation' // Optional research data contribution
  | 'marketing_communications' // Marketing and promotional content
  | 'emergency_disclosure'  // Crisis intervention data sharing
  | 'analytics_tracking'    // Anonymous usage analytics
  | 'third_party_services'  // Integration with external services
  | 'data_retention'        // Long-term data storage policies
  | 'account_deletion';     // Data deletion and account termination

/**
 * Consent Status
 */
export type ConsentStatus = 
  | 'granted'               // User has provided explicit consent
  | 'denied'                // User has explicitly denied consent
  | 'withdrawn'             // Previously granted, now withdrawn
  | 'expired'               // Consent has expired and needs renewal
  | 'pending'               // Awaiting user response
  | 'not_applicable';       // Not required for this user/context

/**
 * Data Processing Purpose
 */
export type DataProcessingPurpose = 
  | 'therapeutic_assessment' // Primary app functionality
  | 'crisis_intervention'   // Emergency safety protocols
  | 'clinical_validation'   // Ensuring clinical accuracy
  | 'performance_monitoring' // App performance and reliability
  | 'security_protection'   // Fraud prevention and security
  | 'regulatory_compliance' // Legal and regulatory requirements
  | 'research_advancement'  // Optional research contributions
  | 'service_improvement'   // Product development and enhancement
  | 'communication_delivery' // User notifications and updates
  | 'support_provision';    // Customer service and technical support

/**
 * HIPAA Consent Record
 */
export interface HIPAAConsent {
  /** Unique consent record ID */
  consentId: string;
  /** User identifier (encrypted) */
  userId: string;
  /** Type of consent */
  type: HIPAAConsentType;
  /** Current consent status */
  status: ConsentStatus;
  /** Data processing purposes covered by this consent */
  purposes: DataProcessingPurpose[];
  /** PHI classifications covered by this consent */
  phiTypes: PHIClassification[];
  /** When consent was granted */
  grantedAt?: number;
  /** When consent was last modified */
  modifiedAt: number;
  /** When consent expires (if applicable) */
  expiresAt?: number;
  /** When consent was withdrawn (if applicable) */
  withdrawnAt?: number;
  /** Reason for withdrawal */
  withdrawalReason?: string;
  /** Version of consent form/agreement */
  consentVersion: string;
  /** IP address when consent was given */
  ipAddress: string;
  /** User agent when consent was given */
  userAgent: string;
  /** Digital signature or confirmation method */
  signature: ConsentSignature;
  /** Granular permissions within this consent type */
  permissions: ConsentPermission[];
  /** Legal basis for processing (GDPR compliance) */
  legalBasis: LegalBasis;
  /** Audit trail for consent changes */
  auditTrail: ConsentAuditEntry[];
}

/**
 * Consent Signature Methods
 */
export interface ConsentSignature {
  /** Signature method used */
  method: 'digital_checkbox' | 'biometric' | 'voice_confirmation' | 'electronic_signature';
  /** Signature data (encrypted) */
  signatureData: string;
  /** Timestamp when signature was captured */
  timestamp: number;
  /** Device information for signature validation */
  deviceInfo: {
    deviceId: string;
    platform: 'ios' | 'android';
    appVersion: string;
    osVersion: string;
  };
}

/**
 * Granular Consent Permissions
 */
export interface ConsentPermission {
  /** Permission identifier */
  permissionId: string;
  /** Human-readable permission name */
  name: string;
  /** Detailed description of what this permission allows */
  description: string;
  /** Whether this permission is granted */
  granted: boolean;
  /** Whether this permission is required for core functionality */
  required: boolean;
  /** Data types this permission covers */
  dataTypes: PHIClassification[];
  /** Processing activities this permission enables */
  activities: DataProcessingPurpose[];
  /** When this permission was last modified */
  lastModified: number;
}

/**
 * Legal Basis for Data Processing (GDPR)
 */
export type LegalBasis = 
  | 'consent'               // User consent (Article 6(1)(a))
  | 'contract'              // Contract performance (Article 6(1)(b))
  | 'legal_obligation'      // Legal compliance (Article 6(1)(c))
  | 'vital_interests'       // Vital interests protection (Article 6(1)(d))
  | 'public_task'           // Public task performance (Article 6(1)(e))
  | 'legitimate_interests'; // Legitimate interests (Article 6(1)(f))

/**
 * Consent Audit Trail
 */
export interface ConsentAuditEntry {
  /** Audit entry ID */
  entryId: string;
  /** Action performed */
  action: 'granted' | 'modified' | 'withdrawn' | 'expired' | 'renewed' | 'viewed';
  /** Timestamp of action */
  timestamp: number;
  /** User who performed action (system for automated actions) */
  actor: string;
  /** Previous consent state */
  previousState?: Partial<HIPAAConsent>;
  /** New consent state */
  newState: Partial<HIPAAConsent>;
  /** Reason for change */
  reason?: string;
  /** System context (app version, session ID, etc.) */
  context: Record<string, unknown>;
}

/**
 * Data Retention Policy
 */
export interface DataRetentionPolicy {
  /** Policy ID */
  policyId: string;
  /** Data type this policy applies to */
  dataType: PHIClassification;
  /** Retention period in milliseconds */
  retentionPeriodMs: number;
  /** Deletion schedule */
  deletionSchedule: 'immediate' | 'scheduled' | 'on_request' | 'regulatory_hold';
  /** Grace period before deletion (for user recovery) */
  gracePeriodMs?: number;
  /** Whether user can extend retention */
  userExtendable: boolean;
  /** Maximum retention period allowed */
  maxRetentionMs?: number;
  /** Backup retention policy */
  backupRetentionMs?: number;
  /** Compliance requirements driving this policy */
  complianceRequirements: string[];
}

/**
 * PHI Access Control
 */
export interface PHIAccessControl {
  /** Access control ID */
  accessId: string;
  /** User requesting access */
  userId: string;
  /** PHI classification being accessed */
  phiType: PHIClassification;
  /** Purpose of access */
  accessPurpose: DataProcessingPurpose;
  /** Access level granted */
  accessLevel: 'read' | 'write' | 'delete' | 'export' | 'share';
  /** Whether access is granted */
  granted: boolean;
  /** Reason for denial (if applicable) */
  denialReason?: string;
  /** Access granted timestamp */
  grantedAt?: number;
  /** Access expires at */
  expiresAt?: number;
  /** Conditions for access */
  conditions: AccessCondition[];
  /** Audit requirements for this access */
  auditRequired: boolean;
}

/**
 * Access Conditions
 */
export interface AccessCondition {
  /** Condition type */
  type: 'time_window' | 'location_restriction' | 'device_verification' | 'consent_verification' | 'purpose_limitation';
  /** Condition parameters */
  parameters: Record<string, unknown>;
  /** Whether condition is met */
  satisfied: boolean;
  /** When condition was last checked */
  lastChecked: number;
}

/**
 * HIPAA Audit Log Entry
 */
export interface HIPAAAuditLog {
  /** Unique audit log entry ID */
  logId: string;
  /** Timestamp of logged event */
  timestamp: number;
  /** User who performed the action (system for automated) */
  actor: string;
  /** Type of action performed */
  action: HIPAAAuditAction;
  /** Resource type that was accessed/modified */
  resourceType: PHIClassification;
  /** Unique identifier of the accessed resource */
  resourceId: string;
  /** Result of the action */
  result: 'success' | 'failure' | 'partial';
  /** Error details if action failed */
  errorDetails?: string;
  /** IP address of the request */
  ipAddress: string;
  /** User agent information */
  userAgent: string;
  /** Session identifier */
  sessionId: string;
  /** Request details */
  requestDetails: {
    method: string;
    endpoint: string;
    parameters?: Record<string, unknown>;
  };
  /** Data classification level */
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
  /** Compliance context */
  complianceContext: {
    consentRequired: boolean;
    consentStatus?: ConsentStatus;
    legalBasis: LegalBasis;
    retentionPolicyId?: string;
  };
  /** Performance metrics */
  performanceMetrics: {
    responseTimeMs: number;
    dataVolumeBytes?: number;
    encryptionTimeMs?: number;
  };
}

/**
 * HIPAA Audit Actions
 */
export type HIPAAAuditAction = 
  | 'data_created'          // New PHI record created
  | 'data_accessed'         // PHI data viewed/retrieved
  | 'data_modified'         // PHI data updated
  | 'data_deleted'          // PHI data removed
  | 'data_exported'         // PHI data downloaded/exported
  | 'data_shared'           // PHI data shared with third party
  | 'consent_granted'       // User provided consent
  | 'consent_withdrawn'     // User withdrew consent
  | 'consent_expired'       // Consent automatically expired
  | 'access_granted'        // Access permission granted
  | 'access_denied'         // Access permission denied
  | 'authentication_success' // User successfully authenticated
  | 'authentication_failure' // Authentication attempt failed
  | 'encryption_performed'  // Data encryption operation
  | 'decryption_performed'  // Data decryption operation
  | 'backup_created'        // Data backup operation
  | 'backup_restored'       // Data restore operation
  | 'security_incident'     // Security breach or incident
  | 'compliance_violation'; // HIPAA compliance violation detected

/**
 * Data Breach Incident
 */
export interface DataBreachIncident {
  /** Incident ID */
  incidentId: string;
  /** When incident was detected */
  detectedAt: number;
  /** When incident actually occurred (if known) */
  occurredAt?: number;
  /** Incident severity */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Type of breach */
  breachType: 'unauthorized_access' | 'data_theft' | 'system_compromise' | 'human_error' | 'vendor_breach';
  /** PHI types potentially affected */
  affectedPHITypes: PHIClassification[];
  /** Number of users potentially affected */
  affectedUserCount: number;
  /** Estimated number of records compromised */
  affectedRecordCount: number;
  /** Description of the incident */
  description: string;
  /** Current investigation status */
  status: 'detected' | 'investigating' | 'contained' | 'resolved' | 'reported';
  /** Containment actions taken */
  containmentActions: string[];
  /** Remediation steps completed */
  remediationSteps: string[];
  /** Whether breach notification is required */
  notificationRequired: boolean;
  /** When breach was reported to authorities */
  reportedAt?: number;
  /** When users were notified */
  userNotificationAt?: number;
  /** Incident response team members */
  responseTeam: string[];
  /** Root cause analysis */
  rootCause?: string;
  /** Lessons learned and preventive measures */
  preventiveMeasures: string[];
}

/**
 * HIPAA Compliance Validator
 */
export interface HIPAAComplianceValidator {
  validateConsent: (userId: string, dataType: PHIClassification, purpose: DataProcessingPurpose) => Promise<boolean>;
  validateAccess: (userId: string, resourceId: string, accessLevel: string) => Promise<PHIAccessControl>;
  auditDataAccess: (userId: string, action: HIPAAAuditAction, resourceId: string) => Promise<void>;
  checkRetentionPolicy: (dataType: PHIClassification, createdAt: number) => Promise<boolean>;
  validateEncryption: (data: string) => Promise<boolean>;
  reportSecurityIncident: (incident: Partial<DataBreachIncident>) => Promise<string>;
}

/**
 * Consent Management Service Types
 */
export interface ConsentManagementService {
  requestConsent: (userId: string, consentType: HIPAAConsentType, purposes: DataProcessingPurpose[]) => Promise<string>;
  grantConsent: (consentId: string, signature: ConsentSignature) => Promise<HIPAAConsent>;
  withdrawConsent: (consentId: string, reason: string) => Promise<HIPAAConsent>;
  renewConsent: (consentId: string) => Promise<HIPAAConsent>;
  getConsentStatus: (userId: string, consentType: HIPAAConsentType) => Promise<ConsentStatus>;
  getUserConsents: (userId: string) => Promise<HIPAAConsent[]>;
  updatePermissions: (consentId: string, permissions: ConsentPermission[]) => Promise<HIPAAConsent>;
}

/**
 * Performance-Constrained Compliance Operations
 */
export interface CompliancePerformanceConstraints {
  /** Maximum time for consent validation (ms) */
  MAX_CONSENT_VALIDATION_TIME: 5;
  /** Maximum time for PHI access control check (ms) */
  MAX_ACCESS_CONTROL_TIME: 20;
  /** Maximum time for audit log write (ms) - non-blocking */
  MAX_AUDIT_LOG_TIME: 10;
  /** Maximum time for encryption operation (ms) */
  MAX_ENCRYPTION_TIME: 50;
  /** Maximum time for compliance validation (ms) */
  MAX_COMPLIANCE_CHECK_TIME: 30;
}

/**
 * Crisis-Specific HIPAA Considerations
 */
export interface CrisisHIPAAContext {
  /** Emergency disclosure permissions */
  emergencyDisclosure: {
    /** Whether emergency disclosure is permitted */
    permitted: boolean;
    /** Conditions under which disclosure is allowed */
    conditions: string[];
    /** Who can be notified in emergency */
    notificationContacts: string[];
    /** Data types that can be disclosed */
    disclosableData: PHIClassification[];
  };
  /** Crisis intervention data handling */
  crisisDataHandling: {
    /** Retention period for crisis records */
    retentionPeriodMs: number;
    /** Whether crisis data requires special encryption */
    enhancedEncryption: boolean;
    /** Audit requirements for crisis data */
    auditLevel: 'standard' | 'enhanced' | 'real_time';
  };
}

/**
 * Utility Types for Type Safety
 */
export type ConsentValidationResult = {
  valid: boolean;
  consentId?: string;
  grantedAt?: number;
  expiresAt?: number;
  limitations?: string[];
};

export type AccessControlResult = {
  granted: boolean;
  accessId?: string;
  restrictions?: AccessCondition[];
  auditRequired: boolean;
};

export type ComplianceCheckResult = {
  compliant: boolean;
  violations?: string[];
  requiredActions?: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
};

/**
 * Type Guards and Validation Functions
 */
export function isValidConsent(consent: HIPAAConsent, currentTime: number): boolean {
  return consent.status === 'granted' && 
         (!consent.expiresAt || consent.expiresAt > currentTime);
}

export function requiresEmergencyDisclosure(
  crisisLevel: 'moderate' | 'high' | 'critical' | 'emergency'
): boolean {
  return crisisLevel === 'critical' || crisisLevel === 'emergency';
}

export function isHighRiskPHI(phiType: PHIClassification): boolean {
  return ['crisis_data', 'assessment_scores', 'treatment_records', 'emergency_contacts'].includes(phiType);
}

export function calculateRetentionExpiry(
  createdAt: number, 
  policy: DataRetentionPolicy
): number {
  return createdAt + policy.retentionPeriodMs;
}

/**
 * Default Compliance Constants
 */
export const DEFAULT_COMPLIANCE_SETTINGS = {
  /** Default consent expiry period (2 years) */
  DEFAULT_CONSENT_EXPIRY_MS: 2 * 365 * 24 * 60 * 60 * 1000,
  /** Default audit log retention (7 years) */
  DEFAULT_AUDIT_RETENTION_MS: 7 * 365 * 24 * 60 * 60 * 1000,
  /** Default PHI retention period (6 years) */
  DEFAULT_PHI_RETENTION_MS: 6 * 365 * 24 * 60 * 60 * 1000,
  /** Default grace period for data deletion (30 days) */
  DEFAULT_DELETION_GRACE_PERIOD_MS: 30 * 24 * 60 * 60 * 1000,
  /** Required consent types for core functionality */
  REQUIRED_CONSENTS: [
    'data_collection',
    'data_processing',
    'emergency_disclosure'
  ] as HIPAAConsentType[],
  /** Performance constraints */
  PERFORMANCE_LIMITS: {
    MAX_CONSENT_VALIDATION_TIME: 5,
    MAX_ACCESS_CONTROL_TIME: 20,
    MAX_AUDIT_LOG_TIME: 10,
    MAX_ENCRYPTION_TIME: 50,
    MAX_COMPLIANCE_CHECK_TIME: 30
  } as CompliancePerformanceConstraints
} as const;

export default HIPAAConsent;